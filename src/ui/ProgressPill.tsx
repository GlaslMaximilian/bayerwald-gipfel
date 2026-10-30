import classes from './PeakList.module.css';

type Props = {
  climbed: number;
  total: number;
  onClick: () => void;
};

/** Mobil: kleiner Fortschritt oben links, öffnet die Gipfelliste. */
export default function ProgressPill({ climbed, total, onClick }: Props) {
  const percent = total > 0 ? (climbed / total) * 100 : 0;
  return (
    <button
      type="button"
      className={classes.pill}
      onClick={onClick}
      aria-label={`Gipfelliste öffnen, ${climbed} von ${total} bestiegen`}
    >
      <span>
        {climbed} / {total}
      </span>
      <span className={classes.pillBar} aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </span>
      <span className={classes.pillLabel}>Liste</span>
    </button>
  );
}
