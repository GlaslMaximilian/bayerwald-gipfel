import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalAscentRepository } from './data/ascents/LocalAscentRepository';
import { useAscents } from './data/ascents/useAscents';
import { loadPeaks } from './data/peaks';
import type { Peak, Region } from './data/types';
import MapView, { type MapViewHandle } from './map/MapView';
import StyleSwitch from './map/StyleSwitch';
import { loadStyleChoice, saveStyleChoice, type MapStyleId } from './map/styles';
import { ascentsOfPeak, countByPeak } from './domain/ascents';
import { peakListEntries, progress, type ListFilter, type ListSort } from './domain/peakList';
import PeakList from './ui/PeakList';
import PeakPanel from './ui/PeakPanel';
import ProgressPill from './ui/ProgressPill';
import { DESKTOP_QUERY, useMediaQuery } from './ui/useMediaQuery';

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
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const mapRef = useRef<MapViewHandle>(null);
  // Mobil: Liste als Bottom Sheet geöffnet. Am Desktop ist die Liste immer da.
  const [listOpen, setListOpen] = useState(false);
  const [filter, setFilter] = useState<ListFilter>('all');
  const [sort, setSort] = useState<ListSort>('ele');
  const entries = useMemo(
    () => peakListEntries(peaks, ascents, filter, sort),
    [peaks, ascents, filter, sort],
  );
  const { climbed, total } = useMemo(() => progress(peaks, ascents), [peaks, ascents]);

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
  const closeList = useCallback(() => setListOpen(false), []);
  const selectOnMap = (peakId: string | null) => {
    setListOpen(false);
    setSelectedId(peakId);
  };
  const selectFromList = (peakId: string) => {
    const peak = peaks.find((p) => p.id === peakId);
    if (!peak) return;
    setListOpen(false);
    setSelectedId(peakId);
    mapRef.current?.flyToPeak(peak);
  };
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
        onSelect={selectOnMap}
        isDesktop={isDesktop}
        ref={mapRef}
      />
      <StyleSwitch value={styleId} onChange={changeStyle} />
      {!isDesktop && (
        <ProgressPill climbed={climbed} total={total} onClick={() => setListOpen(true)} />
      )}
      {(isDesktop || listOpen) && (
        <PeakList
          entries={entries}
          climbed={climbed}
          total={total}
          filter={filter}
          sort={sort}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onSelect={selectFromList}
          onClose={isDesktop ? undefined : closeList}
          // Am Desktop bleibt die Liste hinter den Details erhalten (Scrollposition).
          hidden={!!selectedPeak}
        />
      )}
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
          closeAs={isDesktop ? 'back' : 'close'}
        />
      )}
    </main>
  );
}
