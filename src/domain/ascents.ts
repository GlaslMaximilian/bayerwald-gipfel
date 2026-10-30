import type { Ascent } from '../data/types';

/** Anzahl der Besteigungen pro Gipfel-ID. Nicht bestiegene Gipfel fehlen in der Map. */
export function countByPeak(ascents: Ascent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { peakId } of ascents) counts.set(peakId, (counts.get(peakId) ?? 0) + 1);
  return counts;
}

/** Besteigungen eines Gipfels, neueste zuerst (bei gleichem Datum die zuletzt erfasste zuerst). */
export function ascentsOfPeak(ascents: Ascent[], peakId: string): Ascent[] {
  return ascents
    .filter((a) => a.peakId === peakId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

/** Heutiges Datum als "YYYY-MM-DD" in Ortszeit (nicht UTC). */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Gültiges Datum "YYYY-MM-DD", das nicht in der Zukunft liegt. */
export function isValidAscentDate(date: string, today: string = todayIso()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const parsed = new Date(y, m - 1, d);
  const exists =
    parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d;
  return exists && date <= today;
}

/** "2026-10-30" → "30.10.2026" */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}

/** "Noch nicht bestiegen", "1× bestiegen", "3× bestiegen" */
export function ascentCountLabel(count: number): string {
  return count === 0 ? 'Noch nicht bestiegen' : `${count}× bestiegen`;
}
