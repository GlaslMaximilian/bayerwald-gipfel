/**
 * Erzeugt das Regionspaket „bayerwald-de“ aus OpenStreetMap (Overpass).
 * Aufruf: `npm run fetch-peaks`
 *
 * Ausgabe:
 *   public/data/regions/bayerwald-de.json  – Gipfel, absteigend nach Höhe
 *   public/data/regions.json               – Liste der Regionspakete
 *   docs/peaks-review.md                   – Tabelle zum manuellen Prüfen
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeDuplicates } from './peaks/dedupe.ts';
import { parseEle } from './peaks/ele.ts';
import { distanceToLinesMeters, type LatLon } from './peaks/geo.ts';
import { applyOverrides, parseOverrides } from './peaks/overrides.ts';
import { renderReview, type Rejected } from './peaks/review.ts';
import type { Candidate, Peak } from './peaks/types.ts';

const REGION = {
  id: 'bayerwald-de',
  name: 'Bayerischer Wald',
  file: 'regions/bayerwald-de.json',
  minEle: 1000,
};
const LANDKREISE = ['Cham', 'Regen', 'Freyung-Grafenau', 'Deggendorf', 'Straubing-Bogen', 'Passau'];
/** Gipfel bis zu diesem Abstand jenseits der Landkreisgrenze werden aufgenommen. */
const BORDER_TOLERANCE_M = 200;
/** Gipfel bis zu diesem Abstand jenseits der Grenze erscheinen im Review als „nicht aufgenommen“. */
const NEARBY_REPORT_M = 1000;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const USER_AGENT = 'bayerwald-gipfel/1.0 (https://github.com/GlaslMaximilian/bayerwald-gipfel)';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

type OsmNode = { type: 'node'; id: number; lat: number; lon: number; tags: Record<string, string> };
type OsmElement =
  | OsmNode
  | { type: 'way'; id: number; geometry: LatLon[] }
  | { type: 'area' | 'relation' | 'marker'; id: number; tags?: Record<string, string> };

/** Fragt Overpass ab; überlastete Server (429/502/504) werden mit wachsender Pause erneut versucht. */
async function overpass(query: string): Promise<OsmElement[]> {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    for (const endpoint of OVERPASS_ENDPOINTS) {
      console.log(`Overpass: ${endpoint} (Versuch ${attempt}/${attempts}) …`);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'User-Agent': USER_AGENT },
          body: new URLSearchParams({ data: query }),
        });
        if (res.ok) return ((await res.json()) as { elements: OsmElement[] }).elements;
        console.warn(`  HTTP ${res.status}`);
      } catch (error) {
        console.warn(`  ${String(error)}`);
      }
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 30_000));
  }
  throw new Error('Kein Overpass-Server hat geantwortet. Später erneut versuchen.');
}

/**
 * Eine Abfrage für alles:
 * 1. Grenzlinien der Landkreise (mit Geometrie)
 * 2. je Landkreis: Fläche (als Trenner) + Gipfel darin
 * 3. Trenner „nahe Grenze“ + Gipfel bis 1 km um die Grenzlinien
 */
function buildQuery(): string {
  const names = LANDKREISE.join('|');
  return `
[out:json][timeout:300];
rel["boundary"="administrative"]["admin_level"="6"]["name"~"^Landkreis (${names})$"]->.lk;
way(r.lk)->.w;
.w out geom;
foreach.lk->.r(
  .r map_to_area->.a;
  .a out tags;
  node(area.a)["natural"="peak"]["name"]["ele"];
  out;
);
make marker name="nahe Grenze";
out;
node(around.w:${NEARBY_REPORT_M})["natural"="peak"]["name"]["ele"];
out;
`;
}

function toCandidate(node: OsmNode, ele: number, landkreis: string | null): Candidate {
  const notes: string[] = [];
  if (node.tags.ele !== undefined && node.tags.ele !== String(ele))
    notes.push(`ele in OSM: „${node.tags.ele}“`);
  const nameDe = node.tags['name:de'];
  if (nameDe !== undefined && nameDe !== node.tags.name) notes.push(`name:de: „${nameDe}“`);
  return {
    id: `osm:node/${node.id}`,
    name: (node.tags.name ?? `Knoten ${node.id}`).trim(),
    ele,
    lat: node.lat,
    lon: node.lon,
    landkreis,
    notes,
  };
}

async function main() {
  const overrides = parseOverrides(
    JSON.parse(await readFile(join(ROOT, 'scripts/peaks-overrides.json'), 'utf8')),
  );

  const elements = await overpass(buildQuery());

  const borderLines: LatLon[][] = [];
  const inside = new Map<number, { node: OsmNode; landkreis: string }>();
  const nearby: OsmNode[] = [];
  const foundLandkreise = new Set<string>();
  let landkreis: string | null = null;
  let afterMarker = false;

  for (const el of elements) {
    if (el.type === 'way') {
      borderLines.push(el.geometry);
    } else if (el.type === 'area') {
      landkreis = (el.tags?.name ?? '').replace(/^Landkreis /, '');
      foundLandkreise.add(landkreis);
    } else if (el.type === 'marker') {
      afterMarker = true;
    } else if (el.type === 'node') {
      if (!afterMarker && landkreis) inside.set(el.id, { node: el, landkreis });
      else if (afterMarker && !inside.has(el.id)) nearby.push(el);
    }
  }

  const missing = LANDKREISE.filter((lk) => !foundLandkreise.has(lk));
  if (missing.length > 0) throw new Error(`Landkreise nicht gefunden: ${missing.join(', ')}`);
  console.log(
    `${inside.size} Gipfel in den Landkreisen, ${nearby.length} bis ${NEARBY_REPORT_M} m außerhalb, ` +
      `${borderLines.length} Grenzlinien.`,
  );

  const candidates: Candidate[] = [];
  const rejected: Rejected[] = [];
  const reject = (node: OsmNode, reason: string) =>
    rejected.push({
      id: `osm:node/${node.id}`,
      name: node.tags.name ?? '',
      eleRaw: node.tags.ele ?? '',
      reason,
    });

  for (const { node, landkreis: lk } of inside.values()) {
    const ele = parseEle(node.tags.ele);
    if (ele === null) reject(node, `Höhe unlesbar (Landkreis ${lk})`);
    else if (ele >= REGION.minEle) candidates.push(toCandidate(node, ele, lk));
  }

  for (const node of nearby) {
    const ele = parseEle(node.tags.ele);
    if (ele !== null && ele < REGION.minEle) continue;
    const distance = Math.round(distanceToLinesMeters(node, borderLines));
    if (distance > NEARBY_REPORT_M) continue;
    if (ele === null) {
      reject(node, `Höhe unlesbar (${distance} m außerhalb)`);
    } else if (distance > BORDER_TOLERANCE_M) {
      reject(node, `${distance} m außerhalb der Landkreise (Grenze: ${BORDER_TOLERANCE_M} m)`);
    } else {
      const candidate = toCandidate(node, ele, null);
      candidate.notes.unshift(`Grenzgipfel, ${distance} m außerhalb`);
      candidates.push(candidate);
    }
  }

  const { peaks: deduped, merged } = mergeDuplicates(candidates);
  for (const { kept, dropped, distance } of merged) {
    rejected.push({
      id: dropped.id,
      name: dropped.name,
      eleRaw: String(dropped.ele),
      reason: `Dublette von ${kept.id} (${Math.round(distance)} m entfernt)`,
    });
  }

  const included = await fetchIncluded(overrides.include.map((i) => i.id));
  const { peaks: final, warnings } = applyOverrides(deduped, overrides, included);
  for (const id of overrides.exclude) {
    const peak = deduped.find((p) => p.id === id);
    if (peak) {
      rejected.push({
        id,
        name: peak.name,
        eleRaw: String(peak.ele),
        reason: 'ausgeschlossen (Overrides)',
      });
    }
  }
  for (const w of warnings) console.warn(`Warnung: ${w}`);

  final.sort((a, b) => b.ele - a.ele || a.name.localeCompare(b.name, 'de'));
  rejected.sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const peaks: Peak[] = final.map(({ id, name, ele, lat, lon }) => ({
    id,
    name,
    ele,
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
    region: REGION.id,
  }));

  await writeJson('public/data/regions.json', [REGION]);
  await writeJson(`public/data/${REGION.file}`, peaks);
  await writeText(
    'docs/peaks-review.md',
    renderReview({
      regionName: REGION.name,
      regionId: REGION.id,
      minEle: REGION.minEle,
      generatedAt: new Date().toISOString().slice(0, 10),
      peaks: final,
      rejected,
      warnings,
    }),
  );
  console.log(`Fertig: ${peaks.length} Gipfel, ${rejected.length} nicht aufgenommen.`);
}

/** Holt die per Overrides zusätzlich aufgenommenen Knoten (ohne Filter auf Tags). */
async function fetchIncluded(ids: string[]): Promise<Candidate[]> {
  if (ids.length === 0) return [];
  const nodeIds = ids.map((id) => id.replace('osm:node/', ''));
  const elements = await overpass(`[out:json];node(id:${nodeIds.join(',')});out;`);
  return elements
    .filter((el): el is OsmNode => el.type === 'node')
    .map((node) => toCandidate(node, parseEle(node.tags.ele) ?? 0, null));
}

async function writeJson(path: string, data: unknown) {
  await writeText(path, JSON.stringify(data, null, 2) + '\n');
}

async function writeText(path: string, text: string) {
  const full = join(ROOT, path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, text);
  console.log(`geschrieben: ${path}`);
}

await main();
