import type { DataDrivenPropertyValueSpecification, Map as MapLibreMap } from 'maplibre-gl';

type TextField = DataDrivenPropertyValueSpecification<string>;

const GERMAN_NAME: TextField = ['coalesce', ['get', 'name:de'], ['get', 'name']];

/**
 * Stellt eine `text-field`-Angabe der MapTiler-Stile auf Deutsch um:
 * `name:en` → `name:de` (Rückfall `name`), Höhen in Metern statt Fuß.
 * Gibt `null` zurück, wenn nichts zu ändern ist.
 */
export function localizeTextField(textField: unknown): TextField | null {
  if (textField === '{name:en}') return GERMAN_NAME;
  if (!Array.isArray(textField)) return null;

  const json = JSON.stringify(textField);
  const localized = json
    .replaceAll('["get","name:en"]', '["get","name:de"]')
    .replaceAll('["get","ele_ft"]," ft"', '["get","ele"]," m"');
  return localized === json ? null : (JSON.parse(localized) as TextField);
}

/**
 * Ebenen des Grundstils, die ausgeblendet werden: POIs sowie dessen eigene Gipfel
 * (sonst doppelt zu unseren Gipfeln). Felslinien bleiben sichtbar.
 */
export function isHiddenBaseLayer(layer: { id: string; type: string; 'source-layer'?: string }) {
  if (layer.type !== 'symbol') return false;
  if (layer['source-layer'] === 'poi') return true;
  return layer['source-layer'] === 'mountain_peak' && /peak|volcano/i.test(layer.id);
}

/** Passt den MapTiler-Grundstil an: deutsche Beschriftung, keine POIs, keine fremden Gipfel. */
export function adjustBaseStyle(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    if (isHiddenBaseLayer(layer)) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
      continue;
    }
    if (layer.type !== 'symbol') continue;
    const localized = localizeTextField(map.getLayoutProperty(layer.id, 'text-field'));
    if (localized !== null) map.setLayoutProperty(layer.id, 'text-field', localized);
  }
}
