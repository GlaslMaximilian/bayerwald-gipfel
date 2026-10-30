import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StatusNotices from './StatusNotices';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StatusNotices', () => {
  it('zeigt online nichts an', () => {
    render(<StatusNotices error={null} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('meldet offline und wieder online', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<StatusNotices error={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      /^Offline – nur bereits angesehene Kartenbereiche$/,
    );

    onLine.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('zeigt Ladefehler an', () => {
    render(<StatusNotices error="Die Gipfel konnten nicht geladen werden." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Die Gipfel konnten nicht geladen werden.');
  });
});
