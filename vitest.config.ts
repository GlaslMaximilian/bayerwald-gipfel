import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Das virtuelle Modul gibt es nur im Vite-Build mit vite-plugin-pwa.
    alias: { 'virtual:pwa-register/react': '/src/pwa/registerStub.ts' },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
});
