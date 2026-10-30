import { describe, expect, it } from 'vitest';
import type { Ascent } from '../data/types';
import { backupFileName, createBackup, parseBackup, previewMerge } from './backup';

const ascent = (id: string, date = '2026-08-15', note?: string): Ascent => ({
  id,
  peakId: 'osm:node/26863050',
  date,
  ...(note ? { note } : {}),
  createdAt: `${date}T12:00:00.000Z`,
});

const now = new Date(2026, 9, 30, 21, 0);

describe('createBackup / parseBackup', () => {
  it('liest einen eigenen Export unverändert wieder ein', () => {
    const ascents = [ascent('a', '2026-08-15', 'Sonnenaufgang'), ascent('b', '2025-01-01')];
    const text = JSON.stringify(createBackup(ascents, now));
    expect(parseBackup(text)).toEqual({ ok: true, ascents });
  });

  it('enthält App, Version und Exportdatum', () => {
    expect(createBackup([], now)).toEqual({
      app: 'bayerwald-gipfel',
      version: 1,
      exportedAt: now.toISOString(),
      ascents: [],
    });
  });

  it('benennt die Datei nach dem Tag', () => {
    expect(backupFileName(now)).toBe('bayerwald-gipfel-backup-2026-10-30.json');
  });

  it('lässt unbekannte Felder weg', () => {
    const text = JSON.stringify({
      ...createBackup([], now),
      ascents: [{ ...ascent('a'), extra: 1 }],
    });
    expect(parseBackup(text)).toEqual({ ok: true, ascents: [ascent('a')] });
  });

  it.each([
    ['kein JSON', 'nicht json', /keine gültige JSON-Datei/],
    ['fremde Datei', JSON.stringify({ foo: 1 }), /kein Backup/],
    ['Liste statt Objekt', JSON.stringify([]), /kein Backup/],
    [
      'falsche Version',
      JSON.stringify({ app: 'bayerwald-gipfel', version: 2, ascents: [] }),
      /Version 2/,
    ],
    [
      'ungültiges Datum',
      JSON.stringify({
        ...createBackup([], now),
        ascents: [ascent('a'), ascent('b', '2026-02-30')],
      }),
      /Nr\. 2 ist ungültig/,
    ],
    [
      'fehlende ID',
      JSON.stringify({ ...createBackup([], now), ascents: [{ ...ascent('a'), id: '' }] }),
      /Nr\. 1 ist ungültig/,
    ],
  ])('lehnt ab: %s', (_, text, error) => {
    const result = parseBackup(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(error);
  });
});

describe('previewMerge', () => {
  it('übernimmt alles in einen leeren Speicher', () => {
    const incoming = [ascent('a'), ascent('b')];
    expect(previewMerge([], incoming)).toEqual({ added: incoming, existing: 0 });
  });

  it('übernimmt nichts, wenn alles schon da ist', () => {
    expect(previewMerge([ascent('a'), ascent('b')], [ascent('a'), ascent('b')])).toEqual({
      added: [],
      existing: 2,
    });
  });

  it('überschreibt Vorhandenes nicht und fügt nur Neues hinzu', () => {
    const current = [ascent('a', '2026-08-15', 'lokal')];
    const incoming = [ascent('a', '2020-01-01', 'aus Datei'), ascent('c')];
    expect(previewMerge(current, incoming)).toEqual({ added: [ascent('c')], existing: 1 });
  });

  it('zählt doppelte IDs in der Datei nur einmal', () => {
    expect(previewMerge([], [ascent('a'), ascent('a', '2020-01-01')])).toEqual({
      added: [ascent('a')],
      existing: 0,
    });
  });
});
