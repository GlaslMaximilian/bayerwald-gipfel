import { describe, expect, it } from 'vitest';
import { parseEle } from './ele.ts';

describe('parseEle', () => {
  it.each([
    ['1456', 1456],
    ['  1456 ', 1456],
    ['1456 m', 1456],
    ['1456m', 1456],
    ['1456 m ü. NHN', 1456],
    ['1.456', 1456],
    ['1,456', 1456],
    ['1456,2', 1456],
    ['1456.2', 1456],
    ['1456.5', 1457],
    ['1055.75', 1056],
    ['998', 998],
  ])('%j → %d', (raw, expected) => {
    expect(parseEle(raw)).toBe(expected);
  });

  it.each([undefined, '', 'ca. 1400', '1456;1450', '1456 ft', 'unbekannt', '-'])(
    '%j ist unlesbar',
    (raw) => {
      expect(parseEle(raw)).toBeNull();
    },
  );
});
