import { useEffect } from 'react';
import type { Peak } from '../data/types';
import classes from './PeakPanel.module.css';

type Props = {
  peak: Peak;
  regionName: string | undefined;
  onClose: () => void;
};

/** Details zu einem Gipfel: mobil als Bottom Sheet, am Desktop als Seitenpanel links. */
export default function PeakPanel({ peak, regionName, onClose }: Props) {
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
    </aside>
  );
}
