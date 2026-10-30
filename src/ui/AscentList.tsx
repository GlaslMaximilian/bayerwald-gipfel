import { useState } from 'react';
import type { Ascent } from '../data/types';
import { formatDate } from '../domain/ascents';
import classes from './PeakPanel.module.css';

type Props = {
  /** Neueste zuerst. */
  ascents: Ascent[];
  onRemove: (id: string) => Promise<void>;
};

/** Liste der Besteigungen eines Gipfels; Löschen mit Bestätigung im Eintrag. */
export default function AscentList({ ascents, onRemove }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <section className={classes.ascents} aria-label="Besteigungen">
      <ul>
        {ascents.map((ascent) => {
          const date = formatDate(ascent.date);
          return (
            <li key={ascent.id} className={classes.ascent}>
              {confirmId === ascent.id ? (
                <div className={classes.confirm}>
                  <span>Besteigung vom {date} wirklich löschen?</span>
                  <div className={classes.actions}>
                    <button
                      type="button"
                      className={classes.danger}
                      onClick={async () => {
                        await onRemove(ascent.id);
                        setConfirmId(null);
                      }}
                    >
                      Löschen
                    </button>
                    <button
                      type="button"
                      className={classes.secondary}
                      onClick={() => setConfirmId(null)}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={classes.ascentText}>
                    <span className={classes.ascentDate}>{date}</span>
                    {ascent.note && <span className={classes.ascentNote}>{ascent.note}</span>}
                  </div>
                  <button
                    type="button"
                    className={classes.iconButton}
                    aria-label={`Besteigung vom ${date} löschen`}
                    onClick={() => setConfirmId(ascent.id)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                    </svg>
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
