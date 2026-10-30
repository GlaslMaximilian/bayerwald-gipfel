import { useEffect, useState } from 'react';
import type { Ascent, Peak } from '../data/types';
import { ascentCountLabel } from '../domain/ascents';
import AscentForm from './AscentForm';
import AscentList from './AscentList';
import classes from './PeakPanel.module.css';

type Props = {
  peak: Peak;
  regionName: string | undefined;
  /** Besteigungen dieses Gipfels, neueste zuerst. */
  ascents: Ascent[];
  onAddAscent: (date: string, note: string) => Promise<void>;
  onRemoveAscent: (id: string) => Promise<void>;
  onClose: () => void;
};

/** Details zu einem Gipfel: mobil als Bottom Sheet, am Desktop als Seitenpanel links. */
export default function PeakPanel({
  peak,
  regionName,
  ascents,
  onAddAscent,
  onRemoveAscent,
  onClose,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const climbed = ascents.length > 0;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <aside className={classes.panel} aria-labelledby="peak-panel-title">
      <div className={classes.handle} aria-hidden="true" />
      <header className={classes.header}>
        <div>
          <h2 id="peak-panel-title" className={classes.title}>
            {peak.name}
          </h2>
          <p className={classes.meta}>
            <span className={classes.ele}>{peak.ele.toLocaleString('de-DE')} m</span>
            {regionName && <span> · {regionName}</span>}
          </p>
        </div>
        <button type="button" className={classes.close} onClick={onClose} aria-label="Schließen">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <p className={climbed ? classes.statusClimbed : classes.status} data-testid="ascent-status">
        {climbed ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="m7.5 12.5 3 3 6-6.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
          </svg>
        )}
        {ascentCountLabel(ascents.length)}
      </p>

      {formOpen ? (
        <AscentForm
          onSave={async (date, note) => {
            await onAddAscent(date, note);
            setFormOpen(false);
          }}
          onCancel={() => setFormOpen(false)}
        />
      ) : (
        <button type="button" className={classes.primary} onClick={() => setFormOpen(true)}>
          {climbed ? 'Erneut bestiegen' : 'Bestiegen'}
        </button>
      )}

      {climbed && <AscentList ascents={ascents} onRemove={onRemoveAscent} />}
    </aside>
  );
}
