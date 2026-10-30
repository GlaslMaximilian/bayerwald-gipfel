import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { Ascent } from '../data/types';
import {
  backupFileName,
  createBackup,
  parseBackup,
  previewMerge,
  type MergePreview,
} from '../domain/backup';
import classes from './SettingsDialog.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  ascents: Ascent[];
  onImport: (ascents: Ascent[]) => Promise<void>;
};

/** "1 Besteigung", "3 Besteigungen" */
const ascentsLabel = (n: number) => `${n} ${n === 1 ? 'Besteigung' : 'Besteigungen'}`;

function download(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Einstellungen: Datensicherung per Export/Import einer JSON-Datei. */
export default function SettingsDialog({ open, onClose, ascents, onImport }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const reset = () => {
    setPreview(null);
    setError(null);
    setMessage(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const exportAscents = () => {
    reset();
    download(backupFileName(), JSON.stringify(createBackup(ascents), null, 2));
  };

  const chooseFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // dieselbe Datei darf noch einmal gewählt werden
    if (!file) return;
    reset();
    const result = parseBackup(await file.text());
    if (result.ok) setPreview(previewMerge(ascents, result.ascents));
    else setError(result.error);
  };

  const confirmImport = async () => {
    if (!preview) return;
    await onImport(preview.added);
    setPreview(null);
    setMessage(`${ascentsLabel(preview.added.length)} importiert.`);
  };

  return (
    <dialog
      ref={dialogRef}
      className={classes.dialog}
      aria-labelledby="settings-title"
      onClose={close}
    >
      <header className={classes.header}>
        <h2 id="settings-title" className={classes.title}>
          Einstellungen
        </h2>
        <button type="button" className={classes.close} onClick={close} aria-label="Schließen">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <section className={classes.section} aria-labelledby="backup-title">
        <h3 id="backup-title" className={classes.sectionTitle}>
          Datensicherung
        </h3>
        <p className={classes.text}>
          Sichere deine {ascentsLabel(ascents.length)} als Datei oder stelle sie aus einer Datei
          wieder her. Vorhandene Einträge bleiben beim Import unverändert.
        </p>

        <div className={classes.actions}>
          <button type="button" className={classes.button} onClick={exportAscents}>
            Exportieren
          </button>
          <button type="button" className={classes.button} onClick={() => fileRef.current?.click()}>
            Importieren …
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className={classes.file}
            aria-label="Backup-Datei wählen"
            onChange={chooseFile}
          />
        </div>

        {error && (
          <p className={classes.error} role="alert">
            {error}
          </p>
        )}

        {preview && (
          <div className={classes.preview}>
            <p className={classes.text} data-testid="import-preview">
              {preview.added.length} neu, {preview.existing} schon vorhanden
            </p>
            <div className={classes.actions}>
              <button
                type="button"
                className={classes.primary}
                onClick={confirmImport}
                disabled={preview.added.length === 0}
              >
                Importieren
              </button>
              <button type="button" className={classes.button} onClick={() => setPreview(null)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {message && (
          <p className={classes.success} role="status">
            {message}
          </p>
        )}
      </section>
    </dialog>
  );
}
