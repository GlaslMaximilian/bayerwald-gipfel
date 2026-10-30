import type { Candidate } from './types.ts';

/** Manuelle Korrekturen aus `scripts/peaks-overrides.json`. */
export type Overrides = {
  /** Gipfel-IDs, die nicht in die Liste sollen. */
  exclude: string[];
  /** Zusätzliche Gipfel (OSM-Knoten). `ele`/`name` ersetzen die OSM-Werte. */
  include: { id: string; ele?: number; name?: string }[];
  /** Neue Namen pro Gipfel-ID. */
  rename: Record<string, string>;
};

const ID_PATTERN = /^osm:node\/\d+$/;

/** Prüft den Inhalt der Overrides-Datei und gibt verständliche Fehler aus. */
export function parseOverrides(json: unknown): Overrides {
  const fail = (msg: string): never => {
    throw new Error(`peaks-overrides.json: ${msg}`);
  };
  if (typeof json !== 'object' || json === null) fail('muss ein Objekt sein');
  const { exclude = [], include = [], rename = {} } = json as Record<string, unknown>;

  if (
    !Array.isArray(exclude) ||
    !exclude.every((id) => typeof id === 'string' && ID_PATTERN.test(id))
  )
    fail('"exclude" muss eine Liste von IDs wie "osm:node/123" sein');

  if (!Array.isArray(include)) fail('"include" muss eine Liste sein');
  for (const entry of include as unknown[]) {
    const e = entry as Record<string, unknown>;
    if (typeof e !== 'object' || e === null || typeof e.id !== 'string' || !ID_PATTERN.test(e.id))
      fail('jeder "include"-Eintrag braucht eine "id" wie "osm:node/123"');
    if (e.ele !== undefined && (typeof e.ele !== 'number' || !Number.isInteger(e.ele)))
      fail(`"ele" bei ${String(e.id)} muss eine ganze Zahl sein`);
    if (e.name !== undefined && typeof e.name !== 'string')
      fail(`"name" bei ${String(e.id)} muss ein Text sein`);
  }

  if (typeof rename !== 'object' || rename === null || Array.isArray(rename))
    fail('"rename" muss ein Objekt { "osm:node/123": "Name" } sein');
  for (const [id, name] of Object.entries(rename as object)) {
    if (!ID_PATTERN.test(id) || typeof name !== 'string' || name.trim() === '')
      fail(`"rename"-Eintrag ${id} ist ungültig`);
  }

  return {
    exclude: exclude as string[],
    include: include as Overrides['include'],
    rename: rename as Record<string, string>,
  };
}

/**
 * Wendet die Korrekturen an.
 * `included` enthält die bereits abgerufenen Gipfel zu `overrides.include` (ohne ele/name-Ersatz).
 * Gibt Warnungen für IDs zurück, die nicht gefunden wurden.
 */
export function applyOverrides(
  peaks: Candidate[],
  overrides: Overrides,
  included: Candidate[],
): { peaks: Candidate[]; warnings: string[] } {
  const warnings: string[] = [];
  const result = peaks.map((p) => ({ ...p, notes: [...p.notes] }));
  const byId = new Map(result.map((p) => [p.id, p]));

  for (const entry of overrides.include) {
    const fetched = included.find((c) => c.id === entry.id);
    const existing = byId.get(entry.id);
    const peak = existing ?? (fetched && { ...fetched, notes: [...fetched.notes] });
    if (!peak) {
      warnings.push(`include: ${entry.id} wurde in OSM nicht gefunden`);
      continue;
    }
    if (entry.name !== undefined) peak.name = entry.name;
    if (entry.ele !== undefined) peak.ele = entry.ele;
    peak.notes.push('manuell aufgenommen (Overrides)');
    if (!existing) {
      result.push(peak);
      byId.set(peak.id, peak);
    }
  }

  for (const [id, name] of Object.entries(overrides.rename)) {
    const peak = byId.get(id);
    if (!peak) {
      warnings.push(`rename: ${id} ist nicht in der Liste`);
      continue;
    }
    peak.notes.push(`umbenannt (OSM: „${peak.name}“)`);
    peak.name = name;
  }

  const excluded = new Set(overrides.exclude);
  for (const id of excluded) {
    if (!byId.has(id)) warnings.push(`exclude: ${id} ist nicht in der Liste`);
  }

  return { peaks: result.filter((p) => !excluded.has(p.id)), warnings };
}
