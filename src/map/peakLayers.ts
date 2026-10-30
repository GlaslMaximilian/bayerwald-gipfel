import type { FeatureCollection, Point } from 'geojson';
import type { FilterSpecification, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { Peak } from '../data/types';

const SOURCE_ID = 'peaks';
export const PEAK_LAYER_IDS = {
  circle: 'peaks-circle',
  selected: 'peaks-selected',
  label: 'peaks-label',
} as const;

const PEAK_COLOR = '#2f7d5b';
const SELECTED_COLOR = '#e8590c';

function toGeoJson(peaks: Peak[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: peaks.map((peak) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [peak.lon, peak.lat] },
      properties: { id: peak.id, label: `${peak.name}\n${peak.ele} m`, ele: peak.ele },
    })),
  };
}

const selectedFilter = (selectedId: string | null): FilterSpecification => [
  '==',
  ['get', 'id'],
  selectedId ?? '',
];

/** Setzt die Gipfeldaten, sobald die Quelle existiert (sonst übernimmt das `addPeakLayers`). */
export function updatePeakData(map: MapLibreMap, peaks: Peak[]) {
  map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(toGeoJson(peaks));
}

/**
 * Fügt Quelle und Ebenen der Gipfel hinzu.
 * Muss bei jedem `style.load` aufgerufen werden, weil `setStyle` alle eigenen Ebenen entfernt.
 */
export function addPeakLayers(map: MapLibreMap, peaks: Peak[], selectedId: string | null) {
  if (map.getSource(SOURCE_ID)) return;

  map.addSource(SOURCE_ID, { type: 'geojson', data: toGeoJson(peaks) });

  map.addLayer({
    id: PEAK_LAYER_IDS.circle,
    type: 'circle',
    source: SOURCE_ID,
    paint: {
      'circle-color': PEAK_COLOR,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 13, 7],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  });

  map.addLayer({
    id: PEAK_LAYER_IDS.selected,
    type: 'circle',
    source: SOURCE_ID,
    filter: selectedFilter(selectedId),
    paint: {
      'circle-color': SELECTED_COLOR,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 7, 13, 10],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2.5,
    },
  });

  map.addLayer({
    id: PEAK_LAYER_IDS.label,
    type: 'symbol',
    source: SOURCE_ID,
    minzoom: 11,
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 0.8],
      'symbol-sort-key': ['-', 0, ['get', 'ele']],
    },
    paint: {
      'text-color': '#1c2321',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5,
    },
  });
}

export function setSelectedPeak(map: MapLibreMap, selectedId: string | null) {
  if (!map.getLayer(PEAK_LAYER_IDS.selected)) return;
  map.setFilter(PEAK_LAYER_IDS.selected, selectedFilter(selectedId));
}
