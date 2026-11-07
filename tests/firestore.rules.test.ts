import { describe, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import fs from 'fs';

/**
 * Firestore Security Rules Unit Tests
 * Run locally with the Firestore Emulator:
 *   firebase emulators:exec "npm run test:rules"
 */
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hasEmulator)('Firestore Security Rules Unit Tests (Emulator)', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-dour-rules-test',
      firestore: {
        rules,
        host: process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] || '127.0.0.1',
        port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] || 8080)
      }
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  // 1. Role / isAdmin self-escalation
  test('self-escalation: regular user cannot create or update profile with isAdmin: true or role: admin', async () => {
    const userContext = testEnv.authenticatedContext('user_123', { email: 'user@example.com' });
    const db = userContext.firestore();

    // Create with isAdmin: true -> FAILS
    await assertFails(
      db.doc('users/user_123').set({
        uid: 'user_123',
        displayName: 'Attacker',
        role: 'admin',
        isAdmin: true
      })
    );

    // Create normal profile -> SUCCEEDS
    await assertSucceeds(
      db.doc('users/user_123').set({
        uid: 'user_123',
        displayName: 'Player One',
        role: 'user',
        isAdmin: false
      })
    );

    // Update attempting to self-escalate -> FAILS
    await assertFails(
      db.doc('users/user_123').update({
        isAdmin: true
      })
    );
  });

  // 2. Non-member overwriting a room
  test('rooms: non-member cannot overwrite or delete a room', async () => {
    // Setup room as host_100
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('rooms/room_active').set({
        id: 'room_active',
        code: 'ROOM01',
        status: 'playing',
        hostUid: 'host_100',
        participantUids: ['host_100', 'player_200']
      });
    });

    const nonMemberContext = testEnv.authenticatedContext('attacker_999');
    const attackerDb = nonMemberContext.firestore();

    // Overwrite room -> FAILS
    await assertFails(
      attackerDb.doc('rooms/room_active').update({
        status: 'hijacked'
      })
    );

    // Delete room -> FAILS
    await assertFails(
      attackerDb.doc('rooms/room_active').delete()
    );

    // Host updating room -> SUCCEEDS
    const hostContext = testEnv.authenticatedContext('host_100');
    await assertSucceeds(
      hostContext.firestore().doc('rooms/room_active').update({
        status: 'round_ended'
      })
    );
  });

  // 3. Rooms read access
  test('rooms: read access is public for room discovery', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('rooms/room_public').set({
        id: 'room_public',
        code: 'PUB123',
        status: 'lobby'
      });
    });

    const anonContext = testEnv.unauthenticatedContext();
    await assertSucceeds(
      anonContext.firestore().doc('rooms/room_public').get()
    );
  });

  // 4. Matrix per collection: anon/regular/unverified/admin
  test('cards and settings: public read, admin-only write', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    const regular = testEnv.authenticatedContext('reg_user').firestore();
    const admin = testEnv.authenticatedContext('admin_user', { admin: true }).firestore();

    await assertSucceeds(anon.doc('cards/c1').get());
    await assertFails(anon.doc('cards/c1').set({ targetText: 'hack' }));
    await assertFails(regular.doc('cards/c1').set({ targetText: 'hack' }));
    await assertSucceeds(admin.doc('cards/c1').set({ targetText: 'valid' }));

    await assertSucceeds(anon.doc('settings/cfg').get());
    await assertFails(regular.doc('settings/cfg').set({ key: 'val' }));
    await assertSucceeds(admin.doc('settings/cfg').set({ key: 'val' }));
  });

  test('logs and reports: strictly admin-only access', async () => {
    const regular = testEnv.authenticatedContext('reg_user').firestore();
    const admin = testEnv.authenticatedContext('admin_user', { admin: true }).firestore();

    await assertFails(regular.doc('logs/log1').get());
    await assertFails(regular.doc('logs/log1').set({ msg: 'test' }));
    await assertSucceeds(admin.doc('logs/log1').set({ msg: 'test' }));
    await assertSucceeds(admin.doc('logs/log1').get());
  });

  test('leaderboard: create requires signed-in, matching uid, and valid score', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    const user = testEnv.authenticatedContext('player_555').firestore();

    await assertFails(anon.doc('leaderboard/entry1').set({ uid: 'anon', score: 100 }));
    await assertFails(user.doc('leaderboard/entry1').set({ uid: 'other_user', score: 100 }));
    await assertFails(user.doc('leaderboard/entry1').set({ uid: 'player_555', score: -1 }));
    await assertSucceeds(user.doc('leaderboard/entry1').set({ uid: 'player_555', score: 450 }));
  });

  // 5. Matchmaking queue security
  test('matchmaking: create/read/delete (owner vs other user vs signed-out)', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    const userA = testEnv.authenticatedContext('player_aaa').firestore();
    const userB = testEnv.authenticatedContext('player_bbb').firestore();
    const admin = testEnv.authenticatedContext('admin_user', { admin: true }).firestore();

    // Setup a ticket for player_aaa
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('matchmaking/ticket_aaa').set({
        uid: 'player_aaa',
        status: 'searching',
        createdAt: Date.now()
      });
    });

    // 1. Signed-out (anonymous unauthenticated)
    await assertFails(anon.doc('matchmaking/ticket_aaa').get());
    await assertFails(anon.doc('matchmaking/ticket_anon').set({ uid: 'anon', status: 'searching' }));
    await assertFails(anon.doc('matchmaking/ticket_aaa').delete());

    // 2. Other signed-in user (player_bbb)
    // - Can read active matchmaking queue tickets
    await assertSucceeds(userB.doc('matchmaking/ticket_aaa').get());
    // - Cannot create ticket with another user's uid
    await assertFails(userB.doc('matchmaking/ticket_fake').set({ uid: 'player_aaa', status: 'searching' }));
    // - Cannot delete another user's ticket
    await assertFails(userB.doc('matchmaking/ticket_aaa').delete());

    // 3. Ticket owner (player_aaa)
    // - Can create their own ticket
    await assertSucceeds(userA.doc('matchmaking/ticket_new').set({ uid: 'player_aaa', status: 'searching' }));
    // - Can read their own ticket
    await assertSucceeds(userA.doc('matchmaking/ticket_aaa').get());
    // - Can delete their own ticket
    await assertSucceeds(userA.doc('matchmaking/ticket_aaa').delete());

    // 4. Admin can delete any ticket
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('matchmaking/ticket_to_cleanup').set({ uid: 'player_xyz' });
    });
    await assertSucceeds(admin.doc('matchmaking/ticket_to_cleanup').delete());
  });

  // 6. Room deletion permissions
  test('rooms: delete by host vs non-host vs signed-out vs admin', async () => {
    const setupRoom = async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('rooms/room_test_del').set({
          id: 'room_test_del',
          code: 'DEL999',
          status: 'finished',
          hostUid: 'host_actual'
        });
      });
    };

    const anon = testEnv.unauthenticatedContext().firestore();
    const nonHost = testEnv.authenticatedContext('intruder_user').firestore();
    const host = testEnv.authenticatedContext('host_actual').firestore();
    const admin = testEnv.authenticatedContext('admin_user', { admin: true }).firestore();

    // 1. Signed-out cannot delete
    await setupRoom();
    await assertFails(anon.doc('rooms/room_test_del').delete());

    // 2. Non-host cannot delete
    await setupRoom();
    await assertFails(nonHost.doc('rooms/room_test_del').delete());

    // 3. Host can delete
    await setupRoom();
    await assertSucceeds(host.doc('rooms/room_test_del').delete());

    // 4. Admin can delete
    await setupRoom();
    await assertSucceeds(admin.doc('rooms/room_test_del').delete());
  });
});
