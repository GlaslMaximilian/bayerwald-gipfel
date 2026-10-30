import { expect, test, type Page } from '@playwright/test';

const ARBER = { id: 'osm:node/26863050', name: 'Großer Arber', lon: 13.13619, lat: 49.112472 };

test.beforeEach(() => {
  test.setTimeout(120_000); // mehrere Ladevorgänge der Karte
});

/** Wartet, bis Stil und Gipfel gerendert sind und keine Kacheln mehr laden. */
async function waitForMap(page: Page) {
  await page.waitForFunction(
    () => {
      const map = window.__map;
      return (
        !!map &&
        map.isStyleLoaded() &&
        !!map.getLayer('peaks-marker') &&
        map.queryRenderedFeatures({ layers: ['peaks-marker'] }).length > 0
      );
    },
    undefined,
    { timeout: 30_000 },
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const map = window.__map!;
        if (map.loaded()) return resolve();
        map.once('idle', () => resolve());
        setTimeout(resolve, 20_000);
      }),
  );
}

async function showArber(page: Page) {
  await page.evaluate(
    ({ lon, lat }) => window.__map!.jumpTo({ center: [lon, lat], zoom: 12 }),
    ARBER,
  );
  await waitForMap(page);
}

/** Anzahl gerenderter Objekte der Grundkarte (alles außer den eigenen Gipfel-Ebenen). */
function baseMapFeatureCount(page: Page) {
  return page.evaluate(
    () =>
      window.__map!.queryRenderedFeatures().filter((f) => !f.layer.id.startsWith('peaks-')).length,
  );
}

test('Manifest ist installierbar und der Service Worker steuert die Seite', async ({ page }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = (await (await page.request.get(href!)).json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };
  expect(manifest).toMatchObject({
    name: 'Bayerwald-Gipfel',
    start_url: '/bayerwald-gipfel/',
    display: 'standalone',
  });
  expect(manifest.icons.map((i) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const response = await page.request.get(icon.src);
    expect(response.ok(), icon.src).toBe(true);
    expect(response.headers()['content-type']).toBe('image/png');
  }

  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
});

test('Im Flugmodus starten App, Gipfel, Abhaken und zuvor angesehene Karte', async ({
  page,
  context,
}, testInfo) => {
  // Online: Service Worker installieren, dann mit ihm die Karte am Arber ansehen.
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await waitForMap(page);
  await showArber(page);
  const onlineFeatures = await baseMapFeatureCount(page);
  expect(onlineFeatures).toBeGreaterThan(0);
  const cachedTiles = await page.evaluate(
    async () => (await (await caches.open('maptiler-tiles')).keys()).length,
  );
  expect(cachedTiles).toBeGreaterThan(0);

  // Offline neu starten
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Offline – nur bereits angesehene Kartenbereiche')).toBeVisible();
  await waitForMap(page);
  await showArber(page);
  expect(await baseMapFeatureCount(page)).toBeGreaterThan(0);

  // Gegenprobe: ein nie angesehener Bereich (Passau, Zoom 13) bleibt offline leer.
  // Erst nach dem „idle“ dieser Bewegung zählen, sonst wäre die Ansicht nur noch nicht gezeichnet.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const map = window.__map!;
        map.once('idle', () => resolve());
        map.jumpTo({ center: [13.4613, 48.5667], zoom: 13 });
      }),
  );
  expect(await baseMapFeatureCount(page)).toBe(0);

  // Alle Gipfel sind da
  const pill = page.getByRole('button', { name: /^Gipfelliste öffnen/ });
  if (await pill.isVisible()) await pill.click();
  const list = page.getByRole('complementary', { name: 'Gipfelliste' });
  await expect(list.getByTestId('progress')).toHaveText('0 / 129 Gipfel');
  await expect(list.getByRole('listitem')).toHaveCount(129);

  // Abhaken offline
  await list.getByRole('button', { name: /^Großer Arber\b/ }).click();
  const panel = page.getByRole('complementary', { name: ARBER.name });
  await panel.getByRole('button', { name: 'Bestiegen', exact: true }).click();
  await panel.getByRole('button', { name: 'Speichern' }).click();
  await expect(panel.getByTestId('ascent-status')).toHaveText('1× bestiegen');
  await waitForMap(page);
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-offline.png` });
});
