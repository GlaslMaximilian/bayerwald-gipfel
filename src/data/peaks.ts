import type { Peak, Region } from './types';

const DATA_URL = `${import.meta.env.BASE_URL}data/`;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} konnte nicht geladen werden (HTTP ${res.status})`);
  return (await res.json()) as T;
}

/** Lädt alle Regionen aus `regions.json` und deren Gipfel. */
export async function loadPeaks(): Promise<{ regions: Region[]; peaks: Peak[] }> {
  const regions = await fetchJson<Region[]>(`${DATA_URL}regions.json`);
  const packages = await Promise.all(
    regions.map((region) => fetchJson<Peak[]>(`${DATA_URL}${region.file}`)),
  );
  return { regions, peaks: packages.flat() };
}
