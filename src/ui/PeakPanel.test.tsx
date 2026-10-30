import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PeakPanel from './PeakPanel';

const arber = {
  id: 'osm:node/26863050',
  name: 'Großer Arber',
  ele: 1456,
  lat: 49.112472,
  lon: 13.13619,
  region: 'bayerwald-de',
};

describe('PeakPanel', () => {
  it('zeigt Name, Höhe und Region', () => {
    render(<PeakPanel peak={arber} regionName="Bayerischer Wald" onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Großer Arber' })).toBeInTheDocument();
    expect(screen.getByText('1.456 m')).toBeInTheDocument();
    expect(screen.getByText(/Bayerischer Wald/)).toBeInTheDocument();
  });

  it('schließt per Knopf und per Escape', () => {
    const onClose = vi.fn();
    render(<PeakPanel peak={arber} regionName={undefined} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
