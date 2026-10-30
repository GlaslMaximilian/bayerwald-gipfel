import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('zeigt den Titel', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Bayerwald-Gipfel' })).toBeInTheDocument();
  });
});
