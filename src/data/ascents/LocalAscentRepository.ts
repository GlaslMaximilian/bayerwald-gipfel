import type { Ascent } from '../types';
import type { AscentRepository, NewAscent } from './AscentRepository';

export const LOCAL_STORAGE_KEY = 'bayerwald-gipfel.ascents.v1';

/** Speichert Besteigungen im localStorage dieses Browsers. */
export class LocalAscentRepository implements AscentRepository {
  private listeners = new Set<(ascents: Ascent[]) => void>();
  private storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  async list(): Promise<Ascent[]> {
    return this.read();
  }

  async add({ peakId, date, note }: NewAscent): Promise<Ascent> {
    const trimmedNote = note?.trim();
    const ascent: Ascent = {
      id: crypto.randomUUID(),
      peakId,
      date,
      ...(trimmedNote ? { note: trimmedNote } : {}),
      createdAt: new Date().toISOString(),
    };
    this.write([...this.read(), ascent]);
    return ascent;
  }

  async remove(id: string): Promise<void> {
    this.write(this.read().filter((a) => a.id !== id));
  }

  async importAscents(ascents: Ascent[]): Promise<void> {
    if (ascents.length > 0) this.write([...this.read(), ...ascents]);
  }

  subscribe(listener: (ascents: Ascent[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.read());

    // Änderungen aus anderen Tabs desselben Browsers übernehmen.
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY) listener(this.read());
    };
    window.addEventListener('storage', onStorage);

    return () => {
      this.listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  private read(): Ascent[] {
    const raw = this.storage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Ascent[]) : [];
    } catch {
      console.error('Gespeicherte Besteigungen sind beschädigt und werden ignoriert.');
      return [];
    }
  }

  private write(ascents: Ascent[]) {
    this.storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ascents));
    for (const listener of this.listeners) listener(ascents);
  }
}
