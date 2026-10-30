import { describe, expect, it } from 'vitest';
import type { Ascent, Peak } from '../data/types';
import { peakListEntries, progress } from './peakList';

const peak = (id: string, name: string, ele: number): Peak => ({
  id,
  name,
  ele,
  lat: 49,
  lon: 13,
  region: 'bayerwald-de',
});

const peaks = [
  peak('a', 'Großer Arber', 1456),
  peak('o', 'Ödriegel', 1150),
  peak('l', 'Lusen', 1373),
  peak('b', 'Brotjacklriegel', 1011),
];

const ascent = (peakId: string, date: string): Ascent => ({
  id: `${peakId}-${date}`,
  peakId,
  date,
  createdAt: `${date}T12:00:00.000Z`,
});

const ascents = [ascent('l', '2025-06-01'), ascent('l', '2026-08-15'), ascent('b', '2026-01-03')];

const names = (entries: { peak: Peak }[]) => entries.map((e) => e.peak.name);

describe('progress', () => {
  it('zählt jeden bestiegenen Gipfel einmal', () => {
    expect(progress(peaks, ascents)).toEqual({ climbed: 2, total: 4 });
  });

  it('ignoriert Besteigungen unbekannter Gipfel', () => {
    expect(progress(peaks, [ascent('x', '2026-01-01')])).toEqual({ climbed: 0, total: 4 });
  });
});

describe('peakListEntries', () => {
  it('liefert Anzahl und letztes Datum', () => {
    const lusen = peakListEntries(peaks, ascents, 'all', 'ele').find((e) => e.peak.id === 'l');
    expect(lusen).toMatchObject({ count: 2, lastDate: '2026-08-15' });
  });

  it('sortiert nach Höhe absteigend', () => {
    expect(names(peakListEntries(peaks, ascents, 'all', 'ele'))).toEqual([
      'Großer Arber',
      'Lusen',
      'Ödriegel',
      'Brotjacklriegel',
    ]);
  });

  it('sortiert nach Name mit Umlauten an der richtigen Stelle', () => {
    expect(names(peakListEntries(peaks, ascents, 'all', 'name'))).toEqual([
      'Brotjacklriegel',
      'Großer Arber',
      'Lusen',
      'Ödriegel',
    ]);
  });

  it('sortiert nach letzter Besteigung, offene Gipfel nach Höhe am Ende', () => {
    expect(names(peakListEntries(peaks, ascents, 'all', 'recent'))).toEqual([
      'Lusen',
      'Brotjacklriegel',
      'Großer Arber',
      'Ödriegel',
    ]);
  });

  it('filtert offene und bestiegene Gipfel', () => {
    expect(names(peakListEntries(peaks, ascents, 'open', 'ele'))).toEqual([
      'Großer Arber',
      'Ödriegel',
    ]);
    expect(names(peakListEntries(peaks, ascents, 'climbed', 'ele'))).toEqual([
      'Lusen',
      'Brotjacklriegel',
    ]);
  });
});
