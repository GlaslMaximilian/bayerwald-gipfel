export type MapStyleId = 'topo' | 'satellite';

export const MAP_STYLES: Record<MapStyleId, { label: string; maptilerId: string }> = {
  topo: { label: 'Topo', maptilerId: 'outdoor-v2' },
  satellite: { label: 'Satellit', maptilerId: 'satellite' },
};

const STORAGE_KEY = 'bayerwald-gipfel.mapStyle';

export function styleUrl(id: MapStyleId, apiKey: string): string {
  return `https://api.maptiler.com/maps/${MAP_STYLES[id].maptilerId}/style.json?key=${encodeURIComponent(apiKey)}`;
}

const isMapStyleId = (value: unknown): value is MapStyleId =>
  typeof value === 'string' && value in MAP_STYLES;

/** Gespeicherte Stilwahl; Standard ist Topo. */
export function loadStyleChoice(): MapStyleId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isMapStyleId(stored) ? stored : 'topo';
  } catch {
    return 'topo';
  }
}

export function saveStyleChoice(id: MapStyleId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ohne Speicher (z. B. privater Modus) gilt die Wahl nur bis zum Neuladen.
  }
}
