/** Symbol wie auf der Karte: Ring für offen, Kreis mit Häkchen für bestiegen. */
export default function PeakStatusIcon({ climbed }: { climbed: boolean }) {
  return climbed ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-climbed="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m7.5 12.5 3 3 6-6.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-climbed="false">
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  );
}
