import type { FeatureCollection, Point } from 'geojson';
import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from 'maplibre-gl';
import type { Peak } from '../data/types';
import { drawClimbedMarker, drawOpenMarker } from './markerImages';

const SOURCE_ID = 'peaks';
export const PEAK_LAYER_IDS = {
  marker: 'peaks-marker',
  selected: 'peaks-selected',
  label: 'peaks-label',
} as const;

const IMAGE_OPEN = 'peak-open';
const IMAGE_CLIMBED = 'peak-climbed';
const SELECTED_COLOR = '#e8590c';

/** Anzahl der Besteigungen pro Gipfel-ID. */
export type AscentCounts = ReadonlyMap<string, number>;

function toGeoJson(peaks: Peak[], counts: AscentCounts): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: peaks.map((peak) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [peak.lon, peak.lat] },
      properties: {
        id: peak.id,
        label: `${peak.name}\n${peak.ele} m`,
        ele: peak.ele,
        count: counts.get(peak.id) ?? 0,
      },
    })),
  };
}

const isClimbed: ExpressionSpecification = ['>', ['get', 'count'], 0];

const selectedFilter = (selectedId: string | null): FilterSpecification => [
  '==',
  ['get', 'id'],
  selectedId ?? '',
];

/** Setzt die Gipfeldaten, sobald die Quelle existiert (sonst übernimmt das `addPeakLayers`). */
export function updatePeakData(map: MapLibreMap, peaks: Peak[], counts: AscentCounts) {
  map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(toGeoJson(peaks, counts));
}

/**
 * Fügt Marker-Bilder, Quelle und Ebenen der Gipfel hinzu.
 * Muss bei jedem `style.load` aufgerufen werden, weil `setStyle` alles Eigene entfernt.
 */
export function addPeakLayers(
  map: MapLibreMap,
  peaks: Peak[],
  counts: AscentCounts,
  selectedId: string | null,
) {
  if (map.getSource(SOURCE_ID)) return;

  const pixelRatio = Math.max(2, Math.ceil(window.devicePixelRatio));
  if (!map.hasImage(IMAGE_OPEN))
    map.addImage(IMAGE_OPEN, drawOpenMarker(pixelRatio), { pixelRatio });
  if (!map.hasImage(IMAGE_CLIMBED))
    map.addImage(IMAGE_CLIMBED, drawClimbedMarker(pixelRatio), { pixelRatio });

  map.addSource(SOURCE_ID, { type: 'geojson', data: toGeoJson(peaks, counts) });

  // Orangefarbener Hof unter dem ausgewählten Gipfel.
  map.addLayer({
    id: PEAK_LAYER_IDS.selected,
    type: 'circle',
    source: SOURCE_ID,
    filter: selectedFilter(selectedId),
    paint: {
      'circle-color': SELECTED_COLOR,
      'circle-opacity': 0.35,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 13, 13, 17],
      'circle-stroke-color': SELECTED_COLOR,
      'circle-stroke-width': 2.5,
    },
  });

  map.addLayer({
    id: PEAK_LAYER_IDS.marker,
    type: 'symbol',
    source: SOURCE_ID,
    layout: {
      'icon-image': ['case', isClimbed, IMAGE_CLIMBED, IMAGE_OPEN],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 13, 1.1],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      // Bestiegene Gipfel über offenen zeichnen.
      'symbol-sort-key': ['case', isClimbed, 1, 0],
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
      'text-offset': [0, 1],
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
