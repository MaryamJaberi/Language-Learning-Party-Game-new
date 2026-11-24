import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  deleteUser,
  reauthenticateWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { GameHistoryEntry, GameSettings, Language } from './types';
import { isAdminUser } from './constants';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth & Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with specific databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Mobile and Environment Detection Helpers
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|SamsungBrowser|Mobile/i.test(ua);
  const isTouchScreen = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isNarrow = window.innerWidth <= 768;
  return isMobileUA || (isTouchScreen && isNarrow);
};

export const isSamsungBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /SamsungBrowser/i.test(navigator.userAgent || '');
};

export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    Boolean((navigator as any)?.standalone);
};

export const isInAppBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  return /fban|fbav|instagram|telegram|whatsapp|line|twitter|micromessenger|snapchat|kakaotalk|eitaa|rubika|bale|wv/.test(ua);
};

export const isInIframe = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

// Safe Firestore profile sync (never writes privileged role/isAdmin fields from client)
export const syncUserProfileToCloud = async (user: User): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || 'Player',
      email: user.email || '',
      photoURL: user.photoURL || '',
      lastLoginAt: new Date().toISOString()
    }, { merge: true });
  } catch (dbErr) {
    console.warn('Firestore user profile sync deferred:', dbErr);
  }
};

// Handle returning from signInWithRedirect
export const initAuthRedirectHandler = async (): Promise<User | null> => {
  if (typeof window === 'undefined') return null;
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      await syncUserProfileToCloud(result.user);
      try {
        sessionStorage.removeItem('dour_auth_redirect_pending');
      } catch {}
      return result.user;
    }
  } catch (err: any) {
    console.warn('Redirect sign-in resolution notice:', err?.code, err?.message);
  } finally {
    try {
      sessionStorage.removeItem('dour_auth_redirect_pending');
    } catch {}
  }
  return null;
};

export interface SignInOptions {
  mode?: 'auto' | 'popup' | 'redirect';
}

// Sign In with Google - Supports both Desktop Popup & Mobile/Samsung Redirect Flow
export const signInWithGoogle = async (options: SignInOptions = {}): Promise<User | null> => {
  const mode = options.mode || 'auto';
  const inIframe = isInIframe();
  const mobile = isMobileDevice();
  const samsung = isSamsungBrowser();
  const standalone = isStandalonePWA();

  // Redirect mode is preferred on Samsung Internet, standalone PWAs, or when explicitly requested,
  // provided we are not trapped inside a sandboxed iframe.
  const preferRedirect = (mode === 'redirect') || (mode === 'auto' && (standalone || (samsung && !inIframe) || (mobile && !inIframe)));

  if (preferRedirect && !inIframe) {
    try {
      sessionStorage.setItem('dour_auth_redirect_pending', '1');
    } catch {}
    await signInWithRedirect(auth, googleProvider);
    return null; // Browser will navigate to accounts.google.com
  }

  // Otherwise, attempt standard popup flow
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (user) {
      await syncUserProfileToCloud(user);
    }
    return user;
  } catch (error: any) {
    console.warn('signInWithPopup error:', error?.code, error?.message);

    // If popup was blocked or closed on mobile, seamlessly fallback to redirect (if not in iframe)
    const isPopupIssue = error?.code === 'auth/popup-blocked' || 
                         error?.code === 'auth/cancelled-popup-request' ||
                         error?.code === 'auth/popup-closed-by-user';

    if (isPopupIssue && !inIframe) {
      console.info('Falling back to signInWithRedirect for mobile device...');
      try {
        sessionStorage.setItem('dour_auth_redirect_pending', '1');
      } catch {}
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      return null;
    }

    throw error;
  }
};

// Local Player Profile for 100% device compatibility (without Google dependency)
export interface LocalPlayerProfile {
  name: string;
  avatarId: string;
}

export const getLocalPlayerProfile = (): LocalPlayerProfile => {
  if (typeof localStorage === 'undefined') {
    return { name: 'بازیکن ۱', avatarId: 'cat_cyber' };
  }
  try {
    const saved = localStorage.getItem('dour_local_profile');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return { name: 'بازیکن ۱', avatarId: 'cat_cyber' };
};

export const saveLocalPlayerProfile = (profile: LocalPlayerProfile): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('dour_local_profile', JSON.stringify(profile));
  } catch {}
};

// ورود با ایمیل و رمز — بدون نیاز به حساب گوگل
// (در کنسول Firebase باید Authentication → Sign-in method → Email/Password روشن باشد)
export const signUpWithEmail = async (email: string, password: string, displayName?: string): Promise<User> => {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && displayName.trim()) {
    try { await updateProfile(cred.user, { displayName: displayName.trim() }); } catch {}
  }
  await syncUserProfileToCloud(cred.user);
  return cred.user;
};

export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await syncUserProfileToCloud(cred.user);
  return cred.user;
};

export const resetPasswordByEmail = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email.trim());
};

// Sign Out
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Save Match History to Firestore
export const saveMatchToCloud = async (userId: string, match: GameHistoryEntry, settings?: GameSettings) => {
  try {
    const matchRef = doc(db, 'users', userId, 'matches', match.id);
    await setDoc(matchRef, {
      ...match,
      userId,
      difficulty: settings?.difficulty || 'easy',
      language: settings?.language || 'fa',
      roundsCount: settings?.roundsCount || 3,
      createdAt: serverTimestamp()
    });

    // Update user stats
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentCount = userDoc.exists() ? (userDoc.data()?.totalGamesPlayed || 0) : 0;
    await setDoc(userRef, {
      totalGamesPlayed: currentCount + 1,
      lastPlayedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving match to cloud:', error);
  }
};

// Fetch User's Cloud Match History
export const fetchUserMatchHistory = async (userId: string): Promise<GameHistoryEntry[]> => {
  try {
    const matchesCol = collection(db, 'users', userId, 'matches');
    const q = query(matchesCol, orderBy('createdAt', 'desc'), limit(30));
    const snapshot = await getDocs(q);
    const results: GameHistoryEntry[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      results.push({
        id: data.id || docSnap.id,
        date: data.date,
        winnerNames: data.winnerNames || [],
        winnerColor: data.winnerColor || 'BLUE',
        players: data.players || [],
        language: (data.language as Language) || 'fa'
      });
    });
    return results;
  } catch (error) {
    console.error('Error fetching cloud match history:', error);
    return [];
  }
};

// Sync Settings with Cloud
export const syncSettingsToCloud = async (userId: string, settings: GameSettings) => {
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    // Only attempt write when authenticated user matches userId
    return;
  }
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { settings }, { merge: true });
  } catch (error: any) {
    // Handle offline or pending permission issues gracefully without crashing or throwing
    if (error?.code === 'permission-denied') {
      console.warn('Settings cloud sync pending authentication verification.');
    } else {
      console.warn('Settings cloud sync notice:', error?.message || error);
    }
  }
};

export const fetchSettingsFromCloud = async (userId: string): Promise<GameSettings | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists() && snapshot.data()?.settings) {
      return snapshot.data().settings as GameSettings;
    }
    return null;
  } catch (error) {
    console.error('Error fetching settings from cloud:', error);
    return null;
  }
};

// Permanently delete user account and cloud data (Google Play Policy Compliance)
export const deleteUserAccountAndData = async (userId?: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    const uid = userId || currentUser?.uid;
    if (!uid) return true;

    // 1. Delete user subcollections (matches, weak_cards, mistakes) before revoking Auth
    const subcollections = ['matches', 'weak_cards', 'mistakes'];
    for (const sub of subcollections) {
      try {
        const snap = await getDocs(collection(db, 'users', uid, sub));
        await Promise.all(snap.docs.map(docSnap => deleteDoc(doc(db, 'users', uid, sub, docSnap.id))));
      } catch (subErr) {
        console.warn(`Cleanup notice for ${sub}:`, subErr);
      }
    }

    // 2. Delete user profile document
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (docErr) {
      console.warn('User profile doc cleanup notice:', docErr);
    }

    // 3. Delete the Firebase Auth User (re-authenticate via Google popup if session is stale)
    if (currentUser && currentUser.uid === uid) {
      try {
        await deleteUser(currentUser);
      } catch (authErr: any) {
        if (authErr?.code === 'auth/requires-recent-login') {
          const isGoogle = currentUser.providerData?.some(p => p.providerId === 'google.com');
          if (isGoogle) {
            await reauthenticateWithPopup(currentUser, googleProvider);
            await deleteUser(currentUser);
          } else {
            throw authErr;
          }
        } else {
          throw authErr;
        }
      }
    }

    // 4. Clear all local storage records (both current dor_* and legacy dour_* keys)
    try {
      const keysToClear = [
        'dor_history',
        'dor_game_history',
        'dor_personal_records',
        'dor_settings',
        'dor_weak_cards',
        'dor_mistakes_bank',
        'dor_seen_cards',
        'dor_local_leaderboard',
        'dor_device_id',
        'dor_leitner_state',
        'dor_training_wheels_config_v1',
        'dour_local_profile',
        'dour_match_history',
        'dour_personal_records',
        'dour_game_settings'
      ];
      keysToClear.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Local storage clear notice:', e);
    }

    return true;
  } catch (error) {
    console.error('Error deleting account and data:', error);
    throw error;
  }
};
