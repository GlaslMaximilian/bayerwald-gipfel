import { expect, test, type Page } from '@playwright/test';

const ARBER = { name: 'Großer Arber', lon: 13.13619, lat: 49.112472 };

/** Wartet, bis der Kartenstil geladen ist und Gipfel gerendert sind. */
async function waitForPeaks(page: Page) {
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
}

/** Screenshot, nachdem die Kacheln geladen sind (höchstens 15 s warten). */
async function screenshot(page: Page, name: string, project: string) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const map = window.__map!;
        if (map.loaded()) return resolve();
        map.once('idle', () => resolve());
        setTimeout(resolve, 15_000);
      }),
  );
  await page.screenshot({ path: `e2e/screenshots/${project}-${name}.png` });
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`Karte zeigt die Gipfel (${colorScheme})`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('./');
    await expect(page).toHaveTitle('Bayerwald-Gipfel');
    await waitForPeaks(page);

    const count = await page.evaluate(
      () => window.__map!.queryRenderedFeatures({ layers: ['peaks-marker'] }).length,
    );
    expect(count).toBeGreaterThan(100);
    await screenshot(page, `karte-${colorScheme}`, testInfo.project.name);
  });
}

test('Tippen auf einen Gipfel öffnet das Detail-Panel', async ({ page }, testInfo) => {
  await page.goto('./');
  await waitForPeaks(page);

  const point = await page.evaluate(({ lon, lat }) => window.__map!.project([lon, lat]), ARBER);
  const box = (await page.getByTestId('map').boundingBox())!;
  await page.mouse.click(box.x + point.x, box.y + point.y);

  const panel = page.getByRole('complementary');
  await expect(panel.getByRole('heading', { name: ARBER.name })).toBeVisible();
  await expect(panel.getByText('1.456 m')).toBeVisible();
  await page.waitForTimeout(300); // Einblend-Animation
  await screenshot(page, 'panel', testInfo.project.name);

  await panel.getByRole('button', { name: 'Schließen' }).click();
  await expect(panel).toBeHidden();
});

test('Stilwechsel auf Satellit bleibt nach dem Neuladen erhalten', async ({ page }, testInfo) => {
  await page.goto('./');
  await waitForPeaks(page);

  await page.getByRole('radio', { name: 'Satellit' }).click();
  await page.waitForFunction(
    () => window.__map!.getStyle().sources && 'satellite' in window.__map!.getStyle().sources,
  );
  await waitForPeaks(page);
  await screenshot(page, 'satellit', testInfo.project.name);

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Satellit' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await waitForPeaks(page);
});
