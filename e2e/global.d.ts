import type { Map } from 'maplibre-gl';

declare global {
  interface Window {
    /** Im Build-Modus „e2e“ von MapView gesetzt. */
    __map?: Map;
  }
}

export {};
