import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadStyleChoice, saveStyleChoice, styleUrl } from './styles';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('styleUrl', () => {
  it('baut die MapTiler-URL für Topo und Satellit', () => {
    expect(styleUrl('topo', 'abc')).toBe(
      'https://api.maptiler.com/maps/outdoor-v2/style.json?key=abc',
    );
    expect(styleUrl('satellite', 'abc')).toBe(
      'https://api.maptiler.com/maps/satellite/style.json?key=abc',
    );
  });
});

describe('Stilwahl speichern', () => {
  it('ist ohne gespeicherte Wahl Topo', () => {
    expect(loadStyleChoice()).toBe('topo');
  });

  it('merkt sich die Wahl', () => {
    saveStyleChoice('satellite');
    expect(loadStyleChoice()).toBe('satellite');
  });

  it('ignoriert ungültige gespeicherte Werte', () => {
    localStorage.setItem('bayerwald-gipfel.mapStyle', 'hybrid');
    expect(loadStyleChoice()).toBe('topo');
  });

  it('funktioniert auch, wenn localStorage nicht verfügbar ist', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blockiert');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blockiert');
    });
    expect(() => saveStyleChoice('satellite')).not.toThrow();
    expect(loadStyleChoice()).toBe('topo');
  });
});
