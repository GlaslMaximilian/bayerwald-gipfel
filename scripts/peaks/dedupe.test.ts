import { describe, expect, it } from 'vitest';
import { mergeDuplicates } from './dedupe.ts';
import type { Candidate } from './types.ts';

function candidate(id: string, name: string, ele: number, lat: number, lon: number): Candidate {
  return { id, name, ele, lat, lon, landkreis: 'Regen', notes: [] };
}

describe('mergeDuplicates', () => {
  it('behält den höchsten von zwei nahen Gipfeln mit gleichem Namen', () => {
    const low = candidate('osm:node/1', 'Großer Arber', 1450, 49.1128, 13.1362);
    const high = candidate('osm:node/2', 'Großer Arber', 1456, 49.113, 13.1365); // ~30 m
    const { peaks, merged } = mergeDuplicates([low, high]);

    expect(peaks.map((p) => p.id)).toEqual(['osm:node/2']);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.dropped.id).toBe('osm:node/1');
    expect(peaks[0]!.notes[0]).toContain('osm:node/1');
  });

  it('vergleicht Namen ohne Groß-/Kleinschreibung und Leerzeichen am Rand', () => {
    const a = candidate('osm:node/1', 'Lusen', 1373, 48.9395, 13.5065);
    const b = candidate('osm:node/2', ' lusen', 1370, 48.9396, 13.5066);
    expect(mergeDuplicates([a, b]).peaks).toHaveLength(1);
  });

  it('lässt gleichnamige Gipfel ab 300 m Abstand getrennt', () => {
    const a = candidate('osm:node/1', 'Steinberg', 1100, 49.0, 13.0);
    const b = candidate('osm:node/2', 'Steinberg', 1050, 49.003, 13.0); // ~334 m
    const { peaks, merged } = mergeDuplicates([a, b]);
    expect(peaks).toHaveLength(2);
    expect(merged).toHaveLength(0);
  });

  it('lässt nahe Gipfel mit verschiedenen Namen getrennt', () => {
    const a = candidate('osm:node/1', 'Großer Falkenstein', 1315, 49.0856, 13.2789);
    const b = candidate('osm:node/2', 'Kleiner Falkenstein', 1190, 49.0858, 13.279);
    expect(mergeDuplicates([a, b]).peaks).toHaveLength(2);
  });

  it('behält bei gleicher Höhe den zuerst gelisteten und die Reihenfolge', () => {
    const other = candidate('osm:node/9', 'Rachel', 1453, 48.97, 13.39);
    const a = candidate('osm:node/1', 'Hochstein', 1332, 48.9, 13.4);
    const b = candidate('osm:node/2', 'Hochstein', 1332, 48.9001, 13.4);
    const { peaks } = mergeDuplicates([other, a, b]);
    expect(peaks.map((p) => p.id)).toEqual(['osm:node/9', 'osm:node/1']);
  });

  it('verändert die Eingabe nicht', () => {
    const a = candidate('osm:node/1', 'Arber', 1456, 49.1128, 13.1362);
    const b = candidate('osm:node/2', 'Arber', 1450, 49.1129, 13.1362);
    mergeDuplicates([a, b]);
    expect(a.notes).toEqual([]);
  });
});
