import type { Ascent, Peak } from '../data/types';

export type ListFilter = 'all' | 'open' | 'climbed';
export type ListSort = 'ele' | 'name' | 'recent';

export const LIST_FILTERS: Record<ListFilter, string> = {
  all: 'Alle',
  open: 'Offen',
  climbed: 'Bestiegen',
};

export const LIST_SORTS: Record<ListSort, string> = {
  ele: 'Höhe',
  name: 'Name',
  recent: 'Zuletzt bestiegen',
};

export type PeakListEntry = {
  peak: Peak;
  /** Anzahl der Besteigungen. */
  count: number;
  /** Datum der letzten Besteigung ("YYYY-MM-DD") oder null. */
  lastDate: string | null;
};

/** Wie viele der Gipfel mindestens einmal bestiegen sind. */
export function progress(peaks: Peak[], ascents: Ascent[]): { climbed: number; total: number } {
  const climbedIds = new Set(ascents.map((a) => a.peakId));
  return { climbed: peaks.filter((p) => climbedIds.has(p.id)).length, total: peaks.length };
}

const collator = new Intl.Collator('de');
const byEle = (a: PeakListEntry, b: PeakListEntry) => b.peak.ele - a.peak.ele;
const byName = (a: PeakListEntry, b: PeakListEntry) => collator.compare(a.peak.name, b.peak.name);

const comparators: Record<ListSort, (a: PeakListEntry, b: PeakListEntry) => number> = {
  ele: (a, b) => byEle(a, b) || byName(a, b),
  name: (a, b) => byName(a, b) || byEle(a, b),
  // Neueste Besteigung zuerst, nie bestiegene Gipfel am Ende (nach Höhe).
  recent: (a, b) =>
    (b.lastDate ?? '').localeCompare(a.lastDate ?? '') || byEle(a, b) || byName(a, b),
};

/** Gipfel für die Liste, gefiltert und sortiert. */
export function peakListEntries(
  peaks: Peak[],
  ascents: Ascent[],
  filter: ListFilter,
  sort: ListSort,
): PeakListEntry[] {
  const stats = new Map<string, { count: number; lastDate: string }>();
  for (const { peakId, date } of ascents) {
    const s = stats.get(peakId);
    if (!s) stats.set(peakId, { count: 1, lastDate: date });
    else stats.set(peakId, { count: s.count + 1, lastDate: date > s.lastDate ? date : s.lastDate });
  }

  return peaks
    .map((peak) => {
      const s = stats.get(peak.id);
      return { peak, count: s?.count ?? 0, lastDate: s?.lastDate ?? null };
    })
    .filter((e) => filter === 'all' || (filter === 'climbed') === e.count > 0)
    .sort(comparators[sort]);
}
