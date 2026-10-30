import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('App', () => {
  it('zeigt ohne MapTiler-Schlüssel einen Hinweis', () => {
    vi.stubEnv('VITE_MAPTILER_KEY', '');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Bayerwald-Gipfel' })).toBeInTheDocument();
    expect(screen.getByText(/MapTiler-Schlüssel fehlt/)).toBeInTheDocument();
  });
});
