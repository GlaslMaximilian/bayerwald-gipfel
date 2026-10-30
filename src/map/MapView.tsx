import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type LngLatBoundsLike,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useRef } from 'react';
import type { Peak } from '../data/types';
import { adjustBaseStyle } from './baseStyle';
import { addPeakLayers, PEAK_LAYER_IDS, setSelectedPeak, updatePeakData } from './peakLayers';
import { styleUrl, type MapStyleId } from './styles';
import classes from './MapView.module.css';

// MapLibre findet seinen Worker im Vite-Bundle nicht selbst; Vite kopiert ihn über `?url` mit.
setWorkerUrl(workerUrl);

/** Startansicht: alle Gipfel des deutschen Bayerischen Walds mit etwas Rand. */
const START_BOUNDS: LngLatBoundsLike = [
  [12.75, 48.7],
  [13.9, 49.3],
];
/** Fingerbreite Toleranz beim Antippen eines Gipfels (Pixel). */
const HIT_TOLERANCE_PX = 14;

type Props = {
  apiKey: string;
  styleId: MapStyleId;
  peaks: Peak[];
  selectedId: string | null;
  onSelect: (peakId: string | null) => void;
};

declare global {
  interface Window {
    /** Nur im Build-Modus „e2e“ gesetzt, damit Playwright Gipfel anklicken kann. */
    __map?: MapLibreMap;
  }
}

export default function MapView({ apiKey, styleId, peaks, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // Aktuelle Werte für Event-Handler, die nur einmal registriert werden.
  const latest = useRef({ peaks, selectedId, onSelect });
  useEffect(() => {
    latest.current = { peaks, selectedId, onSelect };
  });

  // Karte einmalig anlegen.
  useEffect(() => {
    const map = new MapLibreMap({
      container: containerRef.current!,
      style: styleUrl(styleId, apiKey),
      bounds: START_BOUNDS,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('style.load', () => {
      adjustBaseStyle(map);
      addPeakLayers(map, latest.current.peaks, latest.current.selectedId);
    });

    map.on('click', (e) => {
      const { x, y } = e.point;
      const t = HIT_TOLERANCE_PX;
      const features = map.getLayer(PEAK_LAYER_IDS.circle)
        ? map.queryRenderedFeatures(
            [
              [x - t, y - t],
              [x + t, y + t],
            ],
            { layers: [PEAK_LAYER_IDS.circle] },
          )
        : [];
      // Bei dicht liegenden Gipfeln den nächstgelegenen nehmen, nicht den obersten.
      let nearest: { id: string; distance: number } | null = null;
      for (const feature of features) {
        if (feature.geometry.type !== 'Point') continue;
        const [lon, lat] = feature.geometry.coordinates as [number, number];
        const p = map.project([lon, lat]);
        const distance = Math.hypot(p.x - x, p.y - y);
        if (!nearest || distance < nearest.distance) {
          nearest = { id: feature.properties.id as string, distance };
        }
      }
      latest.current.onSelect(nearest?.id ?? null);
    });

    map.on('mousemove', (e) => {
      const hit =
        map.getLayer(PEAK_LAYER_IDS.circle) &&
        map.queryRenderedFeatures(e.point, { layers: [PEAK_LAYER_IDS.circle] }).length > 0;
      map.getCanvas().style.cursor = hit ? 'pointer' : '';
    });

    mapRef.current = map;
    if (import.meta.env.MODE === 'e2e') window.__map = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Stil und Schlüssel werden unten per setStyle nachgeführt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stilwechsel.
  const appliedStyle = useRef(styleId);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedStyle.current === styleId) return;
    appliedStyle.current = styleId;
    map.setStyle(styleUrl(styleId, apiKey));
  }, [styleId, apiKey]);

  // Gipfeldaten nachführen.
  useEffect(() => {
    const map = mapRef.current;
    if (map) updatePeakData(map, peaks);
  }, [peaks]);

  // Auswahl hervorheben.
  useEffect(() => {
    const map = mapRef.current;
    if (map) setSelectedPeak(map, selectedId);
  }, [selectedId]);

  return <div ref={containerRef} className={classes.map} data-testid="map" />;
}
