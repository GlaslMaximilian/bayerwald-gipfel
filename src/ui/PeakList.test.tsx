import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PeakListEntry } from '../domain/peakList';
import PeakList from './PeakList';

const entry = (id: string, name: string, ele: number, count = 0, lastDate: string | null = null) =>
  ({
    peak: { id, name, ele, lat: 49, lon: 13, region: 'bayerwald-de' },
    count,
    lastDate,
  }) satisfies PeakListEntry;

const entries = [entry('a', 'Großer Arber', 1456), entry('l', 'Lusen', 1373, 2, '2026-08-15')];

function renderList(props: Partial<Parameters<typeof PeakList>[0]> = {}) {
  const handlers = {
    onFilterChange: vi.fn(),
    onSortChange: vi.fn(),
    onSelect: vi.fn(),
  };
  render(
    <PeakList
      entries={entries}
      climbed={1}
      total={129}
      filter="all"
      sort="ele"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('PeakList', () => {
  it('zeigt Fortschritt und Einträge mit Zähler und letztem Datum', () => {
    renderList();
    expect(screen.getByTestId('progress')).toHaveTextContent('1 / 129 Gipfel');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Großer Arber');
    expect(items[0]).toHaveTextContent('1.456 m');
    expect(items[1]).toHaveTextContent('2× · zuletzt 15.08.2026');
  });

  it('meldet Auswahl, Filter und Sortierung', () => {
    const { onSelect, onFilterChange, onSortChange } = renderList();
    fireEvent.click(screen.getByRole('button', { name: /Lusen/ }));
    expect(onSelect).toHaveBeenCalledWith('l');

    const filter = screen.getByRole('radiogroup', { name: 'Filter' });
    fireEvent.click(within(filter).getByRole('radio', { name: 'Bestiegen' }));
    expect(onFilterChange).toHaveBeenCalledWith('climbed');

    fireEvent.change(screen.getByLabelText('Sortieren nach'), { target: { value: 'name' } });
    expect(onSortChange).toHaveBeenCalledWith('name');
  });

  it('zeigt einen Hinweis, wenn der Filter nichts übrig lässt', () => {
    renderList({ entries: [], filter: 'climbed' });
    expect(screen.getByText('Noch kein Gipfel bestiegen.')).toBeInTheDocument();
  });

  it('schließt mobil per Knopf und Escape', () => {
    const onClose = vi.fn();
    renderList({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Liste schließen' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
