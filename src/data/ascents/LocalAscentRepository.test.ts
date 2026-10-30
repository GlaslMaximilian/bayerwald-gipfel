import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOCAL_STORAGE_KEY, LocalAscentRepository } from './LocalAscentRepository';

afterEach(() => {
  localStorage.clear();
});

describe('LocalAscentRepository', () => {
  it('ist anfangs leer', async () => {
    expect(await new LocalAscentRepository().list()).toEqual([]);
  });

  it('legt Besteigungen mit id und createdAt an', async () => {
    const repo = new LocalAscentRepository();
    const ascent = await repo.add({ peakId: 'osm:node/1', date: '2026-10-30', note: ' Nebel ' });

    expect(ascent).toMatchObject({ peakId: 'osm:node/1', date: '2026-10-30', note: 'Nebel' });
    expect(ascent.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(ascent.createdAt).toISOString()).toBe(ascent.createdAt);
    expect(await repo.list()).toEqual([ascent]);
  });

  it('speichert leere Notizen nicht', async () => {
    const ascent = await new LocalAscentRepository().add({
      peakId: 'osm:node/1',
      date: '2026-10-30',
      note: '   ',
    });
    expect(ascent).not.toHaveProperty('note');
  });

  it('bleibt über eine neue Instanz (Neuladen) erhalten', async () => {
    await new LocalAscentRepository().add({ peakId: 'osm:node/1', date: '2026-10-30' });
    expect(await new LocalAscentRepository().list()).toHaveLength(1);
  });

  it('löscht einzelne Besteigungen', async () => {
    const repo = new LocalAscentRepository();
    const a = await repo.add({ peakId: 'osm:node/1', date: '2026-10-01' });
    const b = await repo.add({ peakId: 'osm:node/1', date: '2026-10-02' });
    await repo.remove(a.id);
    expect(await repo.list()).toEqual([b]);
  });

  it('meldet den Stand beim Abonnieren und jede Änderung', async () => {
    const repo = new LocalAscentRepository();
    const listener = vi.fn();
    const unsubscribe = repo.subscribe(listener);
    expect(listener).toHaveBeenLastCalledWith([]);

    const ascent = await repo.add({ peakId: 'osm:node/1', date: '2026-10-30' });
    expect(listener).toHaveBeenLastCalledWith([ascent]);

    unsubscribe();
    await repo.remove(ascent.id);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('übernimmt Änderungen aus anderen Tabs', () => {
    const repo = new LocalAscentRepository();
    const listener = vi.fn();
    repo.subscribe(listener);

    const fromOtherTab = [
      { id: 'x', peakId: 'osm:node/2', date: '2026-09-01', createdAt: '2026-09-01T10:00:00.000Z' },
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fromOtherTab));
    window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_STORAGE_KEY }));

    expect(listener).toHaveBeenLastCalledWith(fromOtherTab);
  });

  it('ignoriert beschädigte Daten statt abzustürzen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(LOCAL_STORAGE_KEY, '{kaputt');
    expect(await new LocalAscentRepository().list()).toEqual([]);
  });
});
