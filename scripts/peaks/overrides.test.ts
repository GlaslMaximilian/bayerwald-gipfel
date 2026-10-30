import { describe, expect, it } from 'vitest';
import { applyOverrides, parseOverrides, type Overrides } from './overrides.ts';
import type { Candidate } from './types.ts';

function candidate(id: string, name: string, ele = 1100): Candidate {
  return { id, name, ele, lat: 49, lon: 13, landkreis: 'Regen', notes: [] };
}

const none: Overrides = { exclude: [], include: [], rename: {} };

describe('parseOverrides', () => {
  it('akzeptiert ein leeres Objekt', () => {
    expect(parseOverrides({})).toEqual(none);
  });

  it('akzeptiert gültige Einträge', () => {
    const json = {
      exclude: ['osm:node/1'],
      include: [{ id: 'osm:node/2', ele: 1010 }],
      rename: { 'osm:node/3': 'Neu' },
    };
    expect(parseOverrides(json)).toEqual(json);
  });

  it.each([
    [null],
    [{ exclude: ['node/1'] }],
    [{ include: [{ ele: 1000 }] }],
    [{ include: [{ id: 'osm:node/1', ele: '1000' }] }],
    [{ rename: { 'osm:node/1': '' } }],
    [{ rename: [] }],
  ])('lehnt %j ab', (json) => {
    expect(() => parseOverrides(json)).toThrow(/peaks-overrides\.json/);
  });
});

describe('applyOverrides', () => {
  it('ändert ohne Overrides nichts', () => {
    const peaks = [candidate('osm:node/1', 'A')];
    expect(applyOverrides(peaks, none, [])).toEqual({ peaks, warnings: [] });
  });

  it('entfernt ausgeschlossene Gipfel', () => {
    const peaks = [candidate('osm:node/1', 'A'), candidate('osm:node/2', 'B')];
    const { peaks: result } = applyOverrides(peaks, { ...none, exclude: ['osm:node/1'] }, []);
    expect(result.map((p) => p.id)).toEqual(['osm:node/2']);
  });

  it('benennt um und merkt sich den OSM-Namen', () => {
    const peaks = [candidate('osm:node/1', 'Alt')];
    const { peaks: result } = applyOverrides(
      peaks,
      { ...none, rename: { 'osm:node/1': 'Neu' } },
      [],
    );
    expect(result[0]!.name).toBe('Neu');
    expect(result[0]!.notes[0]).toContain('Alt');
    expect(peaks[0]!.name).toBe('Alt');
  });

  it('nimmt zusätzliche Gipfel auf und ersetzt ele/name', () => {
    const included = [candidate('osm:node/5', 'OSM-Name', 990)];
    const { peaks: result } = applyOverrides(
      [],
      { ...none, include: [{ id: 'osm:node/5', ele: 1005, name: 'Richtig' }] },
      included,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'osm:node/5', ele: 1005, name: 'Richtig' });
  });

  it('nimmt einen schon vorhandenen Gipfel nicht doppelt auf', () => {
    const peaks = [candidate('osm:node/1', 'A', 1100)];
    const { peaks: result } = applyOverrides(
      peaks,
      { ...none, include: [{ id: 'osm:node/1', ele: 1111 }] },
      [candidate('osm:node/1', 'A', 1100)],
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.ele).toBe(1111);
  });

  it('warnt bei unbekannten IDs', () => {
    const { warnings } = applyOverrides(
      [],
      {
        exclude: ['osm:node/1'],
        include: [{ id: 'osm:node/2' }],
        rename: { 'osm:node/3': 'X' },
      },
      [],
    );
    expect(warnings).toHaveLength(3);
  });
});
