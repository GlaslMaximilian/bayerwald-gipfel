import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPeaks } from './peaks';
import type { Peak, Region } from './types';

const regions: Region[] = [
  { id: 'a', name: 'A', file: 'regions/a.json', minEle: 1000 },
  { id: 'b', name: 'B', file: 'regions/b.json', minEle: 1000 },
];
const peakA: Peak = {
  id: 'osm:node/1',
  name: 'Arber',
  ele: 1456,
  lat: 49.1,
  lon: 13.1,
  region: 'a',
};
const peakB: Peak = {
  id: 'osm:node/2',
  name: 'Plechý',
  ele: 1378,
  lat: 48.7,
  lon: 13.8,
  region: 'b',
};

function mockFetch(files: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string) => {
    const path = Object.keys(files).find((p) => url.endsWith(p));
    return path
      ? new Response(JSON.stringify(files[path]))
      : new Response('nicht gefunden', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadPeaks', () => {
  it('lädt alle Regionen aus regions.json ohne Codeänderung', async () => {
    const fetchMock = mockFetch({
      '/data/regions.json': regions,
      '/data/regions/a.json': [peakA],
      '/data/regions/b.json': [peakB],
    });

    const result = await loadPeaks();

    expect(result.regions).toEqual(regions);
    expect(result.peaks).toEqual([peakA, peakB]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('meldet einen Fehler, wenn ein Paket fehlt', async () => {
    mockFetch({ '/data/regions.json': regions, '/data/regions/a.json': [peakA] });
    await expect(loadPeaks()).rejects.toThrow(/regions\/b\.json/);
  });
});
