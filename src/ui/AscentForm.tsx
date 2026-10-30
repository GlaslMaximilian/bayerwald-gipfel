import { useId, useState, type FormEvent } from 'react';
import { isValidAscentDate, todayIso } from '../domain/ascents';
import classes from './PeakPanel.module.css';

type Props = {
  onSave: (date: string, note: string) => Promise<void>;
  onCancel: () => void;
};

/** Formular „Bestiegen“: Datum (Standard heute) und optionale Notiz. */
export default function AscentForm({ onSave, onCancel }: Props) {
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const id = useId();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidAscentDate(date, today)) {
      setError('Bitte ein gültiges Datum wählen, das nicht in der Zukunft liegt.');
      return;
    }
    setSaving(true);
    try {
      await onSave(date, note);
    } catch (err) {
      console.error(err);
      setError('Speichern hat nicht geklappt. Bitte erneut versuchen.');
      setSaving(false);
    }
  };

  return (
    <form className={classes.form} onSubmit={submit} noValidate>
      <label className={classes.field} htmlFor={`${id}-date`}>
        Datum
        <input
          id={`${id}-date`}
          type="date"
          value={date}
          max={today}
          required
          onChange={(e) => {
            setDate(e.target.value);
            setError(null);
          }}
        />
      </label>
      <label className={classes.field} htmlFor={`${id}-note`}>
        Notiz (optional)
        <textarea
          id={`${id}-note`}
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error && (
        <p className={classes.error} role="alert">
          {error}
        </p>
      )}
      <div className={classes.actions}>
        <button type="submit" className={classes.primary} disabled={saving}>
          Speichern
        </button>
        <button type="button" className={classes.secondary} onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
