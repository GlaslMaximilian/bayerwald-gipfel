import { describe, expect, it } from 'vitest';
import { distanceMeters, distanceToLinesMeters, distanceToSegmentMeters } from './geo.ts';

// Großer Arber und Großer Rachel
const arber = { lat: 49.1128, lon: 13.1362 };
const rachel = { lat: 48.9784, lon: 13.3926 };

describe('distanceMeters', () => {
  it('ist 0 für denselben Punkt', () => {
    expect(distanceMeters(arber, arber)).toBe(0);
  });

  it('misst Arber–Rachel mit etwa 23,8 km', () => {
    expect(distanceMeters(arber, rachel)).toBeGreaterThan(23_500);
    expect(distanceMeters(arber, rachel)).toBeLessThan(24_100);
  });

  it('misst 0,001° Breite mit etwa 111 m', () => {
    expect(distanceMeters({ lat: 49, lon: 13 }, { lat: 49.001, lon: 13 })).toBeCloseTo(111.2, 0);
  });
});

describe('distanceToSegmentMeters', () => {
  const a = { lat: 49, lon: 13 };
  const b = { lat: 49, lon: 13.01 };

  it('misst den Lotabstand zur Strecke', () => {
    const p = { lat: 49.001, lon: 13.005 };
    expect(distanceToSegmentMeters(p, a, b)).toBeCloseTo(111.2, 0);
  });

  it('misst zum Endpunkt, wenn das Lot außerhalb liegt', () => {
    const p = { lat: 49, lon: 12.999 };
    expect(distanceToSegmentMeters(p, a, b)).toBeCloseTo(distanceMeters(p, a), 0);
  });

  it('kommt mit einer Strecke der Länge 0 zurecht', () => {
    const p = { lat: 49.001, lon: 13 };
    expect(distanceToSegmentMeters(p, a, a)).toBeCloseTo(111.2, 0);
  });
});

describe('distanceToLinesMeters', () => {
  it('nimmt das Minimum über alle Linien', () => {
    const p = { lat: 49.001, lon: 13.005 };
    const far = [
      { lat: 50, lon: 13 },
      { lat: 50, lon: 14 },
    ];
    const near = [
      { lat: 49, lon: 13 },
      { lat: 49, lon: 13.01 },
    ];
    expect(distanceToLinesMeters(p, [far, near])).toBeCloseTo(111.2, 0);
  });

  it('ist unendlich ohne Linien', () => {
    expect(distanceToLinesMeters({ lat: 49, lon: 13 }, [])).toBe(Infinity);
  });
});
