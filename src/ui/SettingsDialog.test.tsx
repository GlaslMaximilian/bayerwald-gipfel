import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Ascent } from '../data/types';
import { createBackup } from '../domain/backup';
import SettingsDialog from './SettingsDialog';

const ascent = (id: string): Ascent => ({
  id,
  peakId: 'osm:node/26863050',
  date: '2026-08-15',
  createdAt: '2026-08-15T12:00:00.000Z',
});

function renderDialog(current: Ascent[] = []) {
  const onImport = vi.fn(async () => {});
  const onClose = vi.fn();
  render(<SettingsDialog open onClose={onClose} ascents={current} onImport={onImport} />);
  return { onImport, onClose };
}

const chooseFile = (content: string) =>
  fireEvent.change(screen.getByLabelText('Backup-Datei wählen'), {
    target: { files: [new File([content], 'backup.json', { type: 'application/json' })] },
  });

describe('SettingsDialog', () => {
  it('zeigt die Anzahl der Besteigungen', () => {
    renderDialog([ascent('a'), ascent('b')]);
    expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument();
    expect(screen.getByText(/Sichere deine 2 Besteigungen/)).toBeInTheDocument();
  });

  it('zeigt eine Vorschau und importiert nur Neues', async () => {
    const { onImport } = renderDialog([ascent('a')]);
    chooseFile(JSON.stringify(createBackup([ascent('a'), ascent('b')])));

    expect(await screen.findByTestId('import-preview')).toHaveTextContent(
      '1 neu, 1 schon vorhanden',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Importieren' }));

    await waitFor(() => expect(onImport).toHaveBeenCalledWith([ascent('b')]));
    expect(await screen.findByRole('status')).toHaveTextContent('1 Besteigung importiert.');
  });

  it('lässt nichts importieren, wenn alles schon da ist', async () => {
    renderDialog([ascent('a')]);
    chooseFile(JSON.stringify(createBackup([ascent('a')])));
    expect(await screen.findByTestId('import-preview')).toHaveTextContent(
      '0 neu, 1 schon vorhanden',
    );
    expect(screen.getByRole('button', { name: 'Importieren' })).toBeDisabled();
  });

  it('meldet eine ungültige Datei und ändert nichts', async () => {
    const { onImport } = renderDialog();
    chooseFile('kaputt');
    expect(await screen.findByRole('alert')).toHaveTextContent(/keine gültige JSON-Datei/);
    expect(screen.queryByTestId('import-preview')).not.toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('schließt per Knopf', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(onClose).toHaveBeenCalled();
  });
});
