import { DateTime } from 'luxon';
import { nextArrivalTime } from './time.js';

test('headway 3 → +3 minutes', () => {
  const fixed = DateTime.fromISO('2025-09-17T10:01:00');
  expect(nextArrivalTime(fixed, 3)).toBe('10:03');
});

test('valeur par défaut = 3', () => {
  const fixed = DateTime.fromISO('2025-09-17T10:01:00');
  expect(nextArrivalTime(fixed)).toBe('10:03');
});

test('headway invalide → erreur', () => {
  const fixed = DateTime.fromISO('2025-09-17T10:01:00');
  expect(() => nextArrivalTime(fixed, 0)).toThrow('Invalid headway');
});
