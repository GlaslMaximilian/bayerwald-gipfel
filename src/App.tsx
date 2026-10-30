import { useCallback, useEffect, useState } from 'react';
import { loadPeaks } from './data/peaks';
import type { Peak, Region } from './data/types';
import MapView from './map/MapView';
import StyleSwitch from './map/StyleSwitch';
import { loadStyleChoice, saveStyleChoice, type MapStyleId } from './map/styles';
import PeakPanel from './ui/PeakPanel';

export default function App() {
  const apiKey = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
  const [regions, setRegions] = useState<Region[]>([]);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<MapStyleId>(loadStyleChoice);

  useEffect(() => {
    loadPeaks()
      .then((data) => {
        setRegions(data.regions);
        setPeaks(data.peaks);
      })
      .catch((error: unknown) => {
        console.error(error);
        setLoadError('Die Gipfel konnten nicht geladen werden.');
      });
  }, []);

  const changeStyle = (id: MapStyleId) => {
    setStyleId(id);
    saveStyleChoice(id);
  };
  const closePanel = useCallback(() => setSelectedId(null), []);

  const selectedPeak = peaks.find((p) => p.id === selectedId);

  if (!apiKey) {
    return (
      <main className="notice">
        <h1>Bayerwald-Gipfel</h1>
        <p>
          Der MapTiler-Schlüssel fehlt. Trage <code>VITE_MAPTILER_KEY</code> in die Datei{' '}
          <code>.env</code> ein und starte die App neu.
        </p>
      </main>
    );
  }

  return (
    <main className="app">
      <h1 className="visually-hidden">Bayerwald-Gipfel</h1>
      <MapView
        apiKey={apiKey}
        styleId={styleId}
        peaks={peaks}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <StyleSwitch value={styleId} onChange={changeStyle} />
      {loadError && (
        <p className="toast" role="alert">
          {loadError}
        </p>
      )}
      {selectedPeak && (
        <PeakPanel
          peak={selectedPeak}
          regionName={regions.find((r) => r.id === selectedPeak.region)?.name}
          onClose={closePanel}
        />
      )}
    </main>
  );
}
