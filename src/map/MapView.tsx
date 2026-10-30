import { Map as MapLibreMap, NavigationControl, type LngLatBoundsLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import type { Peak } from '../data/types';
import { PEAK_LAYER_IDS, setSelectedPeak, syncPeakLayers } from './peakLayers';
import { styleUrl, type MapStyleId } from './styles';
import classes from './MapView.module.css';

/** Startansicht: deutscher Bayerischer Wald inkl. Vorderem Bayerischen Wald. */
const START_BOUNDS: LngLatBoundsLike = [
  [12.55, 48.55],
  [13.95, 49.4],
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
      syncPeakLayers(map, latest.current.peaks, latest.current.selectedId);
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
      const id = features[0]?.properties.id as string | undefined;
      latest.current.onSelect(id ?? null);
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
    if (map?.isStyleLoaded()) syncPeakLayers(map, peaks, latest.current.selectedId);
  }, [peaks]);

  // Auswahl hervorheben.
  useEffect(() => {
    const map = mapRef.current;
    if (map) setSelectedPeak(map, selectedId);
  }, [selectedId]);

  return <div ref={containerRef} className={classes.map} data-testid="map" />;
}
