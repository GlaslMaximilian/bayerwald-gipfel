import classes from './PeakList.module.css';

type Props = {
  climbed: number;
  total: number;
};

/** „37 / 129 Gipfel“ mit dünnem Balken. */
export default function Progress({ climbed, total }: Props) {
  const percent = total > 0 ? (climbed / total) * 100 : 0;
  return (
    <div className={classes.progress}>
      <p className={classes.progressText} data-testid="progress">
        <strong>{climbed}</strong> / {total} Gipfel
      </p>
      <div
        className={classes.bar}
        role="progressbar"
        aria-label="Fortschritt"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={climbed}
      >
        <div className={classes.barFill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
