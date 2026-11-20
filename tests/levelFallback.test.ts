import { it, expect, beforeEach } from 'vitest';
import { getUniqueCardsForSession, markCardsAsSeen } from '../contentEngine';

beforeEach(() => localStorage.clear());

it('a player who has seen every A1 card still only gets A1-or-lower cards', () => {
  for (let i = 0; i < 400; i++) {
    markCardsAsSeen(getUniqueCardsForSession('en' as any, 'fa' as any, 'A1' as any, [], 20, false).map(c => c.id));
  }
  const above = ['A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C1+', 'C2'];
  for (let i = 0; i < 30; i++) {
    const cards = getUniqueCardsForSession('en' as any, 'fa' as any, 'A1' as any, [], 10, true);
    expect(cards.length).toBe(10);
    for (const c of cards) expect(above).not.toContain(c.cefrLevel);
  }
});
