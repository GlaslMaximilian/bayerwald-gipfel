import { MAP_STYLES, type MapStyleId } from './styles';
import classes from './StyleSwitch.module.css';

type Props = {
  value: MapStyleId;
  onChange: (id: MapStyleId) => void;
};

/** Umschalter Topo / Satellit. */
export default function StyleSwitch({ value, onChange }: Props) {
  return (
    <div className={classes.switch} role="radiogroup" aria-label="Kartenstil">
      {(Object.keys(MAP_STYLES) as MapStyleId[]).map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          className={classes.option}
          onClick={() => onChange(id)}
        >
          {MAP_STYLES[id].label}
        </button>
      ))}
    </div>
  );
}
