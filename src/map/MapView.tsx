import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type LngLatBoundsLike,
  type LngLatLike,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { Peak } from '../data/types';
import { adjustBaseStyle } from './baseStyle';
import {
  addPeakLayers,
  PEAK_LAYER_IDS,
  setSelectedPeak,
  updatePeakData,
  type AscentCounts,
} from './peakLayers';
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
/** Zoomstufe beim Springen aus der Liste. */
const FOCUS_ZOOM = 13;
/** Desktop: Breite der Seitenleiste inkl. Rand. */
const SIDEBAR_PX = 384;
/** Mobil: Höhe von Pille und Stil-Umschalter oben. */
const TOP_BAR_PX = 64;
/** Mobil: Anteil der Höhe, den das Bottom Sheet ungefähr verdeckt. */
const SHEET_SHARE = 0.45;
/** Abstand zum Rand des sichtbaren Bereichs, bevor die Karte verschoben wird. */
const REVEAL_MARGIN_PX = 24;

export type MapViewHandle = {
  /** Fliegt zum Gipfel, so dass ihn Seitenleiste bzw. Bottom Sheet nicht verdecken. */
  flyToPeak: (peak: Peak) => void;
};

/** Bereich der Karte, den Seitenleiste bzw. Bottom Sheet frei lassen. */
function visibleArea(map: MapLibreMap, isDesktop: boolean) {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const area = isDesktop
    ? { left: SIDEBAR_PX, top: 0, right: width, bottom: height }
    : { left: 0, top: TOP_BAR_PX, right: width, bottom: height * (1 - SHEET_SHARE) };
  // Versatz der Mitte des freien Bereichs gegenüber der Kartenmitte.
  const offset: [number, number] = [
    (area.left + area.right - width) / 2,
    (area.top + area.bottom - height) / 2,
  ];
  return { ...area, offset };
}

/** Verschiebt die Karte nur, wenn der Gipfel sonst verdeckt wäre. */
function revealPoint(map: MapLibreMap, lngLat: LngLatLike, isDesktop: boolean) {
  const area = visibleArea(map, isDesktop);
  const { x, y } = map.project(lngLat);
  const m = REVEAL_MARGIN_PX;
  const visible =
    x >= area.left + m && x <= area.right - m && y >= area.top + m && y <= area.bottom - m;
  if (!visible) map.easeTo({ center: lngLat, offset: area.offset });
}

type Props = {
  apiKey: string;
  styleId: MapStyleId;
  peaks: Peak[];
  ascentCounts: AscentCounts;
  selectedId: string | null;
  onSelect: (peakId: string | null) => void;
  /** Seitenleiste links (Desktop) oder Bottom Sheet (mobil). */
  isDesktop: boolean;
  ref?: Ref<MapViewHandle>;
};

declare global {
  interface Window {
    /** Nur im Build-Modus „e2e“ gesetzt, damit Playwright Gipfel anklicken kann. */
    __map?: MapLibreMap;
  }
}

export default function MapView({
  apiKey,
  styleId,
  peaks,
  ascentCounts,
  selectedId,
  onSelect,
  isDesktop,
  ref,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // Aktuelle Werte für Event-Handler, die nur einmal registriert werden.
  const latest = useRef({ peaks, ascentCounts, selectedId, onSelect, isDesktop });
  useEffect(() => {
    latest.current = { peaks, ascentCounts, selectedId, onSelect, isDesktop };
  });

  useImperativeHandle(
    ref,
    () => ({
      flyToPeak(peak) {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo({
          center: [peak.lon, peak.lat],
          zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
          offset: visibleArea(map, latest.current.isDesktop).offset,
        });
      },
    }),
    [],
  );

  // Karte einmalig anlegen.
  useEffect(() => {
    const map = new MapLibreMap({
      container: containerRef.current!,
      style: styleUrl(styleId, apiKey),
      bounds: START_BOUNDS,
      fitBoundsOptions: {
        padding: isDesktop ? { left: SIDEBAR_PX, top: 0, right: 0, bottom: 0 } : 0,
      },
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('style.load', () => {
      adjustBaseStyle(map);
      const { peaks, ascentCounts, selectedId } = latest.current;
      addPeakLayers(map, peaks, ascentCounts, selectedId);
    });

    map.on('click', (e) => {
      const { x, y } = e.point;
      const t = HIT_TOLERANCE_PX;
      const features = map.getLayer(PEAK_LAYER_IDS.marker)
        ? map.queryRenderedFeatures(
            [
              [x - t, y - t],
              [x + t, y + t],
            ],
            { layers: [PEAK_LAYER_IDS.marker] },
          )
        : [];
      // Bei dicht liegenden Gipfeln den nächstgelegenen nehmen, nicht den obersten.
      let nearest: { id: string; lngLat: [number, number]; distance: number } | null = null;
      for (const feature of features) {
        if (feature.geometry.type !== 'Point') continue;
        const [lon, lat] = feature.geometry.coordinates as [number, number];
        const p = map.project([lon, lat]);
        const distance = Math.hypot(p.x - x, p.y - y);
        if (!nearest || distance < nearest.distance) {
          nearest = { id: feature.properties.id as string, lngLat: [lon, lat], distance };
        }
      }
      latest.current.onSelect(nearest?.id ?? null);
      if (nearest) revealPoint(map, nearest.lngLat, latest.current.isDesktop);
    });

    map.on('mousemove', (e) => {
      const hit =
        map.getLayer(PEAK_LAYER_IDS.marker) &&
        map.queryRenderedFeatures(e.point, { layers: [PEAK_LAYER_IDS.marker] }).length > 0;
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

  // Gipfeldaten und Besteigungen nachführen (Marker ändern sich sofort).
  useEffect(() => {
    const map = mapRef.current;
    if (map) updatePeakData(map, peaks, ascentCounts);
  }, [peaks, ascentCounts]);

  // Auswahl hervorheben.
  useEffect(() => {
    const map = mapRef.current;
    if (map) setSelectedPeak(map, selectedId);
  }, [selectedId]);

  return <div ref={containerRef} className={classes.map} data-testid="map" />;
}
