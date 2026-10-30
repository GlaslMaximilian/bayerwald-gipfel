import type { Ascent } from '../types';

export type NewAscent = Pick<Ascent, 'peakId' | 'date' | 'note'>;

/**
 * Speicher für Besteigungen. Async, damit lokale und Cloud-Implementierung
 * (Firestore, ab M7) austauschbar sind.
 */
export interface AscentRepository {
  list(): Promise<Ascent[]>;
  add(ascent: NewAscent): Promise<Ascent>;
  remove(id: string): Promise<void>;
  /** Meldet sofort den aktuellen Stand und danach jede Änderung. Gibt eine Abmeldefunktion zurück. */
  subscribe(listener: (ascents: Ascent[]) => void): () => void;
}
