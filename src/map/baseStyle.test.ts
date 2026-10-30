import { describe, expect, it } from 'vitest';
import { isHiddenBaseLayer, localizeTextField } from './baseStyle';

const germanName = ['coalesce', ['get', 'name:de'], ['get', 'name']];

describe('localizeTextField', () => {
  it('ersetzt das Token {name:en}', () => {
    expect(localizeTextField('{name:en}')).toEqual(germanName);
  });

  it('ersetzt name:en in Ausdrücken', () => {
    expect(localizeTextField(['coalesce', ['get', 'name:en'], ['get', 'name']])).toEqual(
      germanName,
    );
    expect(
      localizeTextField(['match', ['get', 'class'], 'city', ['get', 'name:en'], ['get', 'name']]),
    ).toEqual(['match', ['get', 'class'], 'city', ['get', 'name:de'], ['get', 'name']]);
  });

  it('zeigt Höhen in Metern statt Fuß', () => {
    expect(
      localizeTextField([
        'concat',
        ['coalesce', ['get', 'name:en'], ['get', 'name']],
        '\n',
        ['get', 'ele_ft'],
        ' ft',
      ]),
    ).toEqual(['concat', germanName, '\n', ['get', 'ele'], ' m']);
  });

  it('lässt andere Angaben unverändert', () => {
    expect(localizeTextField('{name}')).toBeNull();
    expect(localizeTextField('{height}')).toBeNull();
    expect(localizeTextField(['get', 'ref'])).toBeNull();
    expect(localizeTextField(undefined)).toBeNull();
  });
});

describe('isHiddenBaseLayer', () => {
  it('blendet POIs und die Gipfel des Grundstils aus', () => {
    expect(isHiddenBaseLayer({ id: 'Food', type: 'symbol', 'source-layer': 'poi' })).toBe(true);
    expect(
      isHiddenBaseLayer({ id: 'Peak labels', type: 'symbol', 'source-layer': 'mountain_peak' }),
    ).toBe(true);
    expect(
      isHiddenBaseLayer({ id: 'Volcano labels', type: 'symbol', 'source-layer': 'mountain_peak' }),
    ).toBe(true);
  });

  it('lässt Felsen, Ortsnamen und Nicht-Symbol-Ebenen sichtbar', () => {
    expect(
      isHiddenBaseLayer({ id: 'Cliff', type: 'symbol', 'source-layer': 'mountain_peak' }),
    ).toBe(false);
    expect(isHiddenBaseLayer({ id: 'Place labels', type: 'symbol', 'source-layer': 'place' })).toBe(
      false,
    );
    expect(isHiddenBaseLayer({ id: 'Park', type: 'fill', 'source-layer': 'poi' })).toBe(false);
  });
});
