import type { Candidate } from './types.ts';

export type Rejected = {
  id: string;
  name: string;
  eleRaw: string;
  reason: string;
};

const osmLink = (id: string) => {
  const nodeId = id.replace('osm:node/', '');
  return `[${nodeId}](https://www.openstreetmap.org/node/${nodeId})`;
};

const cell = (text: string) => text.replaceAll('|', '\\|');

/** Erzeugt `docs/peaks-review.md` zum manuellen Prüfen der Gipfelliste. */
export function renderReview(opts: {
  regionName: string;
  regionId: string;
  minEle: number;
  generatedAt: string;
  peaks: Candidate[];
  rejected: Rejected[];
  warnings: string[];
}): string {
  const { regionName, regionId, minEle, generatedAt, peaks, rejected, warnings } = opts;
  const lines = [
    `# Gipfel-Review: ${regionName} (\`${regionId}\`)`,
    '',
    `Erzeugt am ${generatedAt} mit \`npm run fetch-peaks\` aus OpenStreetMap (Overpass). ` +
      `**${peaks.length} Gipfel** ab ${minEle} m.`,
    '',
    'Korrekturen gehören nach `scripts/peaks-overrides.json` (`exclude`, `include`, `rename`), ' +
      'damit sie beim nächsten Abruf erhalten bleiben.',
    '',
  ];

  if (warnings.length > 0) {
    lines.push('## Warnungen', '', ...warnings.map((w) => `- ${w}`), '');
  }

  lines.push(
    '## Gipfelliste',
    '',
    '| # | Name | Höhe | Landkreis | OSM-Link | Auffälligkeiten |',
    '|--:|---|--:|---|---|---|',
    ...peaks.map(
      (p, i) =>
        `| ${i + 1} | ${cell(p.name)} | ${p.ele} m | ${p.landkreis ?? '–'} | ${osmLink(p.id)} | ${cell(p.notes.join('; '))} |`,
    ),
    '',
    '## Nicht aufgenommen',
    '',
  );

  if (rejected.length === 0) {
    lines.push('Keine.', '');
  } else {
    lines.push(
      '| Name | ele (OSM) | OSM-Link | Grund |',
      '|---|---|---|---|',
      ...rejected.map(
        (r) => `| ${cell(r.name)} | ${cell(r.eleRaw)} | ${osmLink(r.id)} | ${cell(r.reason)} |`,
      ),
      '',
    );
  }

  return lines.join('\n');
}
