import { useCallback, useEffect, useMemo, useState } from 'react';
import { LocalAscentRepository } from './data/ascents/LocalAscentRepository';
import { useAscents } from './data/ascents/useAscents';
import { loadPeaks } from './data/peaks';
import type { Peak, Region } from './data/types';
import MapView from './map/MapView';
import StyleSwitch from './map/StyleSwitch';
import { loadStyleChoice, saveStyleChoice, type MapStyleId } from './map/styles';
import { ascentsOfPeak, countByPeak } from './domain/ascents';
import PeakPanel from './ui/PeakPanel';

const ascentRepository = new LocalAscentRepository();

export default function App() {
  const apiKey = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
  const [regions, setRegions] = useState<Region[]>([]);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<MapStyleId>(loadStyleChoice);
  const ascents = useAscents(ascentRepository);
  const ascentCounts = useMemo(() => countByPeak(ascents), [ascents]);

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
  const addAscent = async (peakId: string, date: string, note: string) => {
    await ascentRepository.add({ peakId, date, note });
  };
  const removeAscent = (id: string) => ascentRepository.remove(id);

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
        ascentCounts={ascentCounts}
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
          key={selectedPeak.id}
          peak={selectedPeak}
          regionName={regions.find((r) => r.id === selectedPeak.region)?.name}
          ascents={ascentsOfPeak(ascents, selectedPeak.id)}
          onAddAscent={(date, note) => addAscent(selectedPeak.id, date, note)}
          onRemoveAscent={removeAscent}
          onClose={closePanel}
        />
      )}
    </main>
  );
}
