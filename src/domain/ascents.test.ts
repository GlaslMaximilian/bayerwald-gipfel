import { describe, expect, it } from 'vitest';
import type { Ascent } from '../data/types';
import {
  ascentCountLabel,
  ascentsOfPeak,
  countByPeak,
  formatDate,
  isValidAscentDate,
  todayIso,
} from './ascents';

function ascent(id: string, peakId: string, date: string, createdAt = `${date}T12:00:00.000Z`) {
  return { id, peakId, date, createdAt } satisfies Ascent;
}

describe('countByPeak', () => {
  it('zählt Besteigungen pro Gipfel', () => {
    const counts = countByPeak([
      ascent('1', 'arber', '2026-01-01'),
      ascent('2', 'arber', '2026-02-01'),
      ascent('3', 'rachel', '2026-03-01'),
    ]);
    expect(counts.get('arber')).toBe(2);
    expect(counts.get('rachel')).toBe(1);
    expect(counts.has('lusen')).toBe(false);
  });
});

describe('ascentsOfPeak', () => {
  it('liefert nur die Besteigungen des Gipfels, neueste zuerst', () => {
    const result = ascentsOfPeak(
      [
        ascent('1', 'arber', '2025-07-01'),
        ascent('2', 'rachel', '2026-01-01'),
        ascent('3', 'arber', '2026-05-01'),
        ascent('4', 'arber', '2026-05-01', '2026-05-02T08:00:00.000Z'),
      ],
      'arber',
    );
    expect(result.map((a) => a.id)).toEqual(['4', '3', '1']);
  });
});

describe('todayIso', () => {
  it('nutzt die Ortszeit', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(todayIso(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });
});

describe('isValidAscentDate', () => {
  const today = '2026-10-30';

  it.each(['2026-10-30', '2026-10-29', '1999-02-28', '2024-02-29'])('%s ist gültig', (date) => {
    expect(isValidAscentDate(date, today)).toBe(true);
  });

  it.each(['2026-10-31', '2027-01-01', '2026-02-30', '2025-02-29', '30.10.2026', ''])(
    '%j ist ungültig',
    (date) => {
      expect(isValidAscentDate(date, today)).toBe(false);
    },
  );
});

describe('formatDate', () => {
  it('formatiert deutsch', () => {
    expect(formatDate('2026-10-30')).toBe('30.10.2026');
  });
});

describe('ascentCountLabel', () => {
  it.each([
    [0, 'Noch nicht bestiegen'],
    [1, '1× bestiegen'],
    [3, '3× bestiegen'],
  ])('%d → %s', (count, label) => {
    expect(ascentCountLabel(count)).toBe(label);
  });
});
