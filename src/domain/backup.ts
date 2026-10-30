import type { Ascent } from '../data/types';
import { isValidAscentDate, todayIso } from './ascents';

const APP = 'bayerwald-gipfel';
const VERSION = 1;

export type Backup = {
  app: typeof APP;
  version: typeof VERSION;
  /** ISO-Zeitstempel des Exports */
  exportedAt: string;
  ascents: Ascent[];
};

export function createBackup(ascents: Ascent[], now: Date = new Date()): Backup {
  return { app: APP, version: VERSION, exportedAt: now.toISOString(), ascents };
}

/** "bayerwald-gipfel-backup-2026-10-30.json" */
export function backupFileName(now: Date = new Date()): string {
  return `${APP}-backup-${todayIso(now)}.json`;
}

export type ParseResult = { ok: true; ascents: Ascent[] } | { ok: false; error: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/** Prüft eine Besteigung und übernimmt nur die bekannten Felder. */
function toAscent(value: unknown): Ascent | null {
  if (!isObject(value)) return null;
  const { id, peakId, date, note, stravaActivityId, createdAt } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(peakId) || !isNonEmptyString(createdAt)) {
    return null;
  }
  // Nur Format und Existenz prüfen; „Zukunft“ hängt von der Zeitzone beim Export ab.
  if (typeof date !== 'string' || !isValidAscentDate(date, '9999-12-31')) return null;
  if (note !== undefined && typeof note !== 'string') return null;
  if (stravaActivityId !== undefined && typeof stravaActivityId !== 'string') return null;
  return {
    id,
    peakId,
    date,
    ...(note ? { note } : {}),
    ...(stravaActivityId ? { stravaActivityId } : {}),
    createdAt,
  };
}

/** Liest eine Backup-Datei. Bei Fehlern gibt es eine Meldung für die Oberfläche. */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Die Datei ist keine gültige JSON-Datei.' };
  }
  if (!isObject(data) || data.app !== APP || !Array.isArray(data.ascents)) {
    return { ok: false, error: 'Die Datei ist kein Backup der Bayerwald-Gipfel-App.' };
  }
  if (data.version !== VERSION) {
    return { ok: false, error: `Backup-Version ${String(data.version)} wird nicht unterstützt.` };
  }
  const ascents: Ascent[] = [];
  for (const [index, value] of data.ascents.entries()) {
    const ascent = toAscent(value);
    if (!ascent) return { ok: false, error: `Besteigung Nr. ${index + 1} ist ungültig.` };
    ascents.push(ascent);
  }
  return { ok: true, ascents };
}

export type MergePreview = {
  /** Besteigungen, die noch fehlen und übernommen werden. */
  added: Ascent[];
  /** Anzahl der Besteigungen aus der Datei, die es schon gibt. */
  existing: number;
};

/** Vergleicht über die `id`. Vorhandenes wird nie überschrieben, doppelte IDs in der Datei zählen einmal. */
export function previewMerge(current: Ascent[], incoming: Ascent[]): MergePreview {
  const known = new Set(current.map((a) => a.id));
  const seen = new Set<string>();
  const added: Ascent[] = [];
  let existing = 0;
  for (const ascent of incoming) {
    if (seen.has(ascent.id)) continue;
    seen.add(ascent.id);
    if (known.has(ascent.id)) existing++;
    else added.push(ascent);
  }
  return { added, existing };
}
