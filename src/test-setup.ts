import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom kennt kein matchMedia; in Tests gilt immer die Mobilansicht.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as MediaQueryList;

// Ohne Vitest-„globals“ räumt Testing Library nicht selbst auf.
afterEach(() => {
  cleanup();
});
