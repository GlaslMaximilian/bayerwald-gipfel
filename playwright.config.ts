import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:4173/bayerwald-gipfel/';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // Karte mit Software-WebGL ist rechenintensiv; schont auch das MapTiler-Kontingent.
  workers: 2,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL },
  projects: [
    {
      name: 'mobil',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'npm run build -- --mode e2e && npm run preview -- --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
