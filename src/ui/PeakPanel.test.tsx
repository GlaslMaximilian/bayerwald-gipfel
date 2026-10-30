import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Ascent } from '../data/types';
import { todayIso } from '../domain/ascents';
import PeakPanel from './PeakPanel';

const arber = {
  id: 'osm:node/26863050',
  name: 'Großer Arber',
  ele: 1456,
  lat: 49.112472,
  lon: 13.13619,
  region: 'bayerwald-de',
};

const ascent = (id: string, date: string, note?: string): Ascent => ({
  id,
  peakId: arber.id,
  date,
  ...(note ? { note } : {}),
  createdAt: `${date}T12:00:00.000Z`,
});

function renderPanel(props: Partial<Parameters<typeof PeakPanel>[0]> = {}) {
  const handlers = {
    onAddAscent: vi.fn(async () => {}),
    onRemoveAscent: vi.fn(async () => {}),
    onClose: vi.fn(),
  };
  render(
    <PeakPanel peak={arber} regionName="Bayerischer Wald" ascents={[]} {...handlers} {...props} />,
  );
  return handlers;
}

describe('PeakPanel', () => {
  it('zeigt Name, Höhe, Region und „Noch nicht bestiegen“', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Großer Arber' })).toBeInTheDocument();
    expect(screen.getByText('1.456 m')).toBeInTheDocument();
    expect(screen.getByText(/Bayerischer Wald/)).toBeInTheDocument();
    expect(screen.getByTestId('ascent-status')).toHaveTextContent('Noch nicht bestiegen');
  });

  it('schließt per Knopf und per Escape', () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('hakt mit heutigem Datum und Notiz ab', async () => {
    const { onAddAscent } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Bestiegen' }));

    expect(screen.getByLabelText('Datum')).toHaveValue(todayIso());
    fireEvent.change(screen.getByLabelText('Notiz (optional)'), {
      target: { value: 'Sonnenaufgang' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(onAddAscent).toHaveBeenCalledWith(todayIso(), 'Sonnenaufgang'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Speichern' })).not.toBeInTheDocument(),
    );
  });

  it('lehnt ein Datum in der Zukunft ab', () => {
    const { onAddAscent } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Bestiegen' }));
    fireEvent.change(screen.getByLabelText('Datum'), { target: { value: '2999-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/nicht in der Zukunft/);
    expect(onAddAscent).not.toHaveBeenCalled();
  });

  it('zeigt Zähler und Liste bei Mehrfachbesteigung', () => {
    renderPanel({
      ascents: [ascent('b', '2026-08-15', 'Mit Lena'), ascent('a', '2025-06-01')],
    });
    expect(screen.getByTestId('ascent-status')).toHaveTextContent('2× bestiegen');
    expect(screen.getByRole('button', { name: 'Erneut bestiegen' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('15.08.2026');
    expect(items[0]).toHaveTextContent('Mit Lena');
    expect(items[1]).toHaveTextContent('01.06.2025');
  });

  it('löscht erst nach Bestätigung', async () => {
    const { onRemoveAscent } = renderPanel({ ascents: [ascent('a', '2025-06-01')] });

    fireEvent.click(screen.getByRole('button', { name: 'Besteigung vom 01.06.2025 löschen' }));
    expect(screen.getByText(/wirklich löschen/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(onRemoveAscent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Besteigung vom 01.06.2025 löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    await waitFor(() => expect(onRemoveAscent).toHaveBeenCalledWith('a'));
  });
});
