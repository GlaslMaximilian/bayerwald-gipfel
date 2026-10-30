import { useEffect } from 'react';
import { formatDate } from '../domain/ascents';
import {
  LIST_FILTERS,
  LIST_SORTS,
  type ListFilter,
  type ListSort,
  type PeakListEntry,
} from '../domain/peakList';
import classes from './PeakList.module.css';
import panelClasses from './PeakPanel.module.css';
import PeakStatusIcon from './PeakStatusIcon';
import Progress from './Progress';

type Props = {
  entries: PeakListEntry[];
  climbed: number;
  total: number;
  filter: ListFilter;
  sort: ListSort;
  onFilterChange: (filter: ListFilter) => void;
  onSortChange: (sort: ListSort) => void;
  onSelect: (peakId: string) => void;
  /** Nur mobil: Liste schließen (Knopf und Escape). */
  onClose?: () => void;
  hidden?: boolean;
};

const EMPTY_TEXT: Record<ListFilter, string> = {
  all: 'Keine Gipfel geladen.',
  open: 'Alle Gipfel bestiegen!',
  climbed: 'Noch kein Gipfel bestiegen.',
};

/** Gipfelliste mit Fortschritt, Filter und Sortierung. */
export default function PeakList({
  entries,
  climbed,
  total,
  filter,
  sort,
  onFilterChange,
  onSortChange,
  onSelect,
  onClose,
  hidden = false,
}: Props) {
  useEffect(() => {
    if (!onClose || hidden) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, hidden]);

  return (
    <aside
      className={`${panelClasses.panel} ${classes.list}`}
      aria-label="Gipfelliste"
      hidden={hidden}
    >
      <div className={panelClasses.handle} aria-hidden="true" />
      <header className={classes.header}>
        <Progress climbed={climbed} total={total} />
        {onClose && (
          <button
            type="button"
            className={panelClasses.close}
            onClick={onClose}
            aria-label="Liste schließen"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </header>

      <div className={classes.controls}>
        <div className={classes.segmented} role="radiogroup" aria-label="Filter">
          {(Object.keys(LIST_FILTERS) as ListFilter[]).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={filter === id}
              className={classes.segment}
              onClick={() => onFilterChange(id)}
            >
              {LIST_FILTERS[id]}
            </button>
          ))}
        </div>
        <label className={classes.sort}>
          <span>Sortieren nach</span>
          <select value={sort} onChange={(e) => onSortChange(e.target.value as ListSort)}>
            {(Object.keys(LIST_SORTS) as ListSort[]).map((id) => (
              <option key={id} value={id}>
                {LIST_SORTS[id]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {entries.length === 0 ? (
        <p className={classes.empty}>{EMPTY_TEXT[filter]}</p>
      ) : (
        <ul className={classes.entries}>
          {entries.map(({ peak, count, lastDate }) => (
            <li key={peak.id}>
              <button
                type="button"
                className={count > 0 ? classes.entryClimbed : classes.entry}
                onClick={() => onSelect(peak.id)}
              >
                <PeakStatusIcon climbed={count > 0} />
                <span className={classes.entryText}>
                  <span className={classes.entryName}>{peak.name}</span>
                  {lastDate && (
                    <span className={classes.entryMeta}>
                      {count}× · zuletzt {formatDate(lastDate)}
                    </span>
                  )}
                </span>
                <span className={classes.entryEle}>{peak.ele.toLocaleString('de-DE')} m</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
