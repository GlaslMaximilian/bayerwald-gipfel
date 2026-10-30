import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import classes from './StatusNotices.module.css';
import { useOnline } from './useOnline';

/** Hinweise oben in der Mitte: offline und „Neue Version verfügbar“. */
export default function StatusNotices({ error }: { error: string | null }) {
  const online = useOnline();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [updateDismissed, setUpdateDismissed] = useState(false);

  return (
    <div className={classes.notices}>
      {error && (
        <p className={classes.notice} role="alert">
          {error}
        </p>
      )}
      {!online && (
        <p className={classes.notice} role="status">
          <span className={classes.dot} aria-hidden="true" />
          <span>Offline – nur bereits angesehene Kartenbereiche</span>
        </p>
      )}
      {needRefresh && !updateDismissed && (
        <div className={`${classes.notice} ${classes.update}`} role="status">
          <span>Neue Version verfügbar</span>
          <button
            type="button"
            className={classes.primary}
            onClick={() => void updateServiceWorker(true)}
          >
            Aktualisieren
          </button>
          <button
            type="button"
            className={classes.secondary}
            onClick={() => setUpdateDismissed(true)}
          >
            Später
          </button>
        </div>
      )}
    </div>
  );
}
