import { distanceMeters } from './geo.ts';
import type { Candidate } from './types.ts';

export const DUPLICATE_RADIUS_M = 300;

export type MergedDuplicate = { kept: Candidate; dropped: Candidate; distance: number };

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('de');

/**
 * Führt Gipfel mit gleichem Namen zusammen, die weniger als 300 m auseinander liegen.
 * Behalten wird jeweils der höchste; bei gleicher Höhe der zuerst gelistete.
 */
export function mergeDuplicates(candidates: Candidate[]): {
  peaks: Candidate[];
  merged: MergedDuplicate[];
} {
  const byHeight = [...candidates].sort((a, b) => b.ele - a.ele);
  const kept: Candidate[] = [];
  const merged: MergedDuplicate[] = [];

  for (const candidate of byHeight) {
    const name = normalizeName(candidate.name);
    const twin = kept.find(
      (k) => normalizeName(k.name) === name && distanceMeters(k, candidate) < DUPLICATE_RADIUS_M,
    );
    if (twin) {
      const distance = distanceMeters(twin, candidate);
      merged.push({ kept: twin, dropped: candidate, distance });
      twin.notes.push(
        `Dublette zusammengeführt mit ${candidate.id} (${candidate.ele} m, ${Math.round(distance)} m entfernt)`,
      );
    } else {
      kept.push({ ...candidate, notes: [...candidate.notes] });
    }
  }

  // Ursprüngliche Reihenfolge beibehalten.
  const order = new Map(candidates.map((c, i) => [c.id, i]));
  kept.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return { peaks: kept, merged };
}
