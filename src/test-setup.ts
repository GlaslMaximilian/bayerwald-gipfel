import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Ohne Vitest-„globals“ räumt Testing Library nicht selbst auf.
afterEach(() => {
  cleanup();
});
