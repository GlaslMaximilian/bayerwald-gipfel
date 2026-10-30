import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const ARBER = {
  id: 'osm:node/26863050',
  name: 'Großer Arber',
  lon: 13.13619,
  lat: 49.112472,
};

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
  test.setTimeout(90_000); // Kartenkacheln laden je nach Rechner und Netz langsam
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

/** Tippt auf den Großen Arber. */
async function clickArber(page: Page) {
  const point = await page.evaluate(({ lon, lat }) => window.__map!.project([lon, lat]), ARBER);
  const box = (await page.getByTestId('map').boundingBox())!;
  await page.mouse.click(box.x + point.x, box.y + point.y);
}

/** Anzahl der Besteigungen, mit der der Arber-Marker gerendert wird. */
async function arberMarkerCount(page: Page) {
  return page.evaluate(
    (id) =>
      window
        .__map!.queryRenderedFeatures({ layers: ['peaks-marker'] })
        .find((f) => f.properties.id === id)?.properties.count as number | undefined,
    ARBER.id,
  );
}

test('Tippen auf einen Gipfel öffnet das Detail-Panel', async ({ page }, testInfo) => {
  await page.goto('./');
  await waitForPeaks(page);
  await clickArber(page);

  const panel = page.getByRole('complementary', { name: ARBER.name });
  await expect(panel.getByRole('heading', { name: ARBER.name })).toBeVisible();
  await expect(panel.getByText('1.456 m')).toBeVisible();
  await page.waitForTimeout(300); // Einblend-Animation
  await screenshot(page, 'panel', testInfo.project.name);

  await panel.getByRole('button', { name: /^(Schließen|Zurück zur Liste)$/ }).click();
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

test('Abhaken, Mehrfachbesteigung und Löschen bleiben nach dem Neuladen erhalten', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await waitForPeaks(page);
  await page.evaluate(
    ({ lon, lat }) => window.__map!.jumpTo({ center: [lon, lat], zoom: 12 }),
    ARBER,
  );
  await waitForPeaks(page);
  await clickArber(page);

  const panel = page.getByRole('complementary', { name: ARBER.name });
  const status = panel.getByTestId('ascent-status');
  await expect(status).toHaveText('Noch nicht bestiegen');
  expect(await arberMarkerCount(page)).toBe(0);

  // Abhaken mit Notiz
  await panel.getByRole('button', { name: 'Bestiegen', exact: true }).click();
  await panel.getByLabel('Notiz (optional)').fill('Sonnenaufgang');
  await panel.getByRole('button', { name: 'Speichern' }).click();
  await expect(status).toHaveText('1× bestiegen');
  await expect.poll(() => arberMarkerCount(page)).toBe(1);
  await screenshot(page, 'abgehakt', testInfo.project.name);

  // Neu laden: Besteigung und Marker sind noch da
  await page.reload();
  await waitForPeaks(page);
  await page.evaluate(
    ({ lon, lat }) => window.__map!.jumpTo({ center: [lon, lat], zoom: 12 }),
    ARBER,
  );
  await waitForPeaks(page);
  await expect.poll(() => arberMarkerCount(page)).toBe(1);
  await clickArber(page);
  await expect(status).toHaveText('1× bestiegen');
  await expect(panel.getByText('Sonnenaufgang')).toBeVisible();

  // Zweite Besteigung an einem früheren Tag
  await panel.getByRole('button', { name: 'Erneut bestiegen' }).click();
  await panel.getByLabel('Datum').fill('2025-07-01');
  await panel.getByRole('button', { name: 'Speichern' }).click();
  await expect(status).toHaveText('2× bestiegen');
  await expect(panel.getByRole('listitem')).toHaveCount(2);
  await screenshot(page, 'mehrfach', testInfo.project.name);

  // Löschen mit Bestätigung
  await panel.getByRole('button', { name: 'Besteigung vom 01.07.2025 löschen' }).click();
  await panel.getByRole('button', { name: 'Löschen', exact: true }).click();
  await expect(status).toHaveText('1× bestiegen');
  await expect(panel.getByRole('listitem')).toHaveCount(1);
  await expect.poll(() => arberMarkerCount(page)).toBe(1);
});

/** Öffnet mobil die Liste über die Pille; am Desktop ist sie immer sichtbar. */
async function openList(page: Page) {
  const list = page.getByRole('complementary', { name: 'Gipfelliste' });
  const pill = page.getByRole('button', { name: /^Gipfelliste öffnen/ });
  if (await pill.isVisible()) await pill.click();
  await expect(list).toBeVisible();
  return list;
}

/** Namen der Listeneinträge in Anzeigereihenfolge. */
function entryNames(list: ReturnType<Page['getByRole']>) {
  return list
    .getByRole('listitem')
    .evaluateAll((items) =>
      items.map((li) => li.querySelector('button > span > span')?.textContent ?? ''),
    );
}

test('Liste: Fortschritt, Sortierung, Filter und Sprung zur Karte', async ({ page }, testInfo) => {
  await page.goto('./');
  await waitForPeaks(page);

  let list = await openList(page);
  await expect(list.getByTestId('progress')).toHaveText('0 / 129 Gipfel');
  await expect(list.getByRole('listitem')).toHaveCount(129);
  expect((await entryNames(list))[0]).toBe(ARBER.name);
  await page.waitForTimeout(300); // Einblend-Animation
  await screenshot(page, 'liste', testInfo.project.name);

  // Sortierung nach Name
  await list.getByLabel('Sortieren nach').selectOption('name');
  const names = await entryNames(list);
  expect(names).toEqual([...names].sort(new Intl.Collator('de').compare));

  // Tippen auf einen Eintrag: Karte fliegt hin, Details öffnen sich
  await list.getByRole('button', { name: /^Großer Arber\b/ }).click();
  const panel = page.getByRole('complementary', { name: ARBER.name });
  await expect(panel.getByRole('heading', { name: ARBER.name })).toBeVisible();
  await page.waitForFunction(() => !window.__map!.isMoving());
  const point = await page.evaluate(({ lon, lat }) => window.__map!.project([lon, lat]), ARBER);
  const box = (await panel.boundingBox())!;
  const covered =
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height;
  expect(covered).toBe(false);
  expect(point.y).toBeGreaterThan(0);
  await screenshot(page, 'liste-sprung', testInfo.project.name);

  // Abhaken: Fortschritt und Filter passen sich an
  await panel.getByRole('button', { name: 'Bestiegen', exact: true }).click();
  await panel.getByRole('button', { name: 'Speichern' }).click();
  await expect(panel.getByTestId('ascent-status')).toHaveText('1× bestiegen');
  await panel.getByRole('button', { name: /^(Schließen|Zurück zur Liste)$/ }).click();

  list = await openList(page);
  await expect(list.getByTestId('progress')).toHaveText('1 / 129 Gipfel');
  await list.getByRole('radio', { name: 'Bestiegen' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list.getByRole('listitem')).toContainText(/1× · zuletzt \d{2}\.\d{2}\.\d{4}/);
  await list.getByRole('radio', { name: 'Offen' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(128);
  await list.getByRole('radio', { name: 'Bestiegen' }).click();
  await page.waitForTimeout(300);
  await screenshot(page, 'liste-bestiegen', testInfo.project.name);
});

/** Prüft den Fortschritt: mobil an der Pille, am Desktop in der Seitenleiste. */
async function expectProgress(page: Page, climbed: number, project: string) {
  if (project === 'desktop') {
    await expect(page.getByTestId('progress')).toHaveText(`${climbed} / 129 Gipfel`);
  } else {
    await expect(
      page.getByRole('button', { name: `Gipfelliste öffnen, ${climbed} von 129 bestiegen` }),
    ).toBeVisible();
  }
}

test('Export → Daten löschen → Import stellt alles wieder her', async ({ page }, testInfo) => {
  const project = testInfo.project.name;
  await page.goto('./');
  await waitForPeaks(page);
  await page.evaluate(
    ({ lon, lat }) => window.__map!.jumpTo({ center: [lon, lat], zoom: 12 }),
    ARBER,
  );
  await waitForPeaks(page);
  await clickArber(page);

  const panel = page.getByRole('complementary', { name: ARBER.name });
  await panel.getByRole('button', { name: 'Bestiegen', exact: true }).click();
  await panel.getByLabel('Notiz (optional)').fill('Sonnenaufgang');
  await panel.getByRole('button', { name: 'Speichern' }).click();
  await expect(panel.getByTestId('ascent-status')).toHaveText('1× bestiegen');
  await panel.getByRole('button', { name: /^(Schließen|Zurück zur Liste)$/ }).click();
  await expectProgress(page, 1, project);

  // Exportieren
  await page.getByRole('button', { name: 'Einstellungen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Einstellungen' });
  await expect(dialog.getByText(/Sichere deine 1 Besteigung /)).toBeVisible();
  await screenshot(page, 'einstellungen', project);
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Exportieren' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^bayerwald-gipfel-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();
  const backup = JSON.parse(await readFile(file, 'utf8')) as {
    app: string;
    version: number;
    ascents: { note?: string }[];
  };
  expect(backup).toMatchObject({ app: 'bayerwald-gipfel', version: 1 });
  expect(backup.ascents).toHaveLength(1);
  expect(backup.ascents[0]!.note).toBe('Sonnenaufgang');

  // Daten löschen
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForPeaks(page);
  await expectProgress(page, 0, project);

  // Importieren
  await page.getByRole('button', { name: 'Einstellungen' }).click();
  await dialog.locator('input[type=file]').setInputFiles(file);
  await expect(dialog.getByTestId('import-preview')).toHaveText('1 neu, 0 schon vorhanden');
  await screenshot(page, 'import-vorschau', project);
  await dialog.getByRole('button', { name: 'Importieren', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('1 Besteigung importiert.');

  // Ein zweiter Import bringt keine Duplikate
  await dialog.locator('input[type=file]').setInputFiles(file);
  await expect(dialog.getByTestId('import-preview')).toHaveText('0 neu, 1 schon vorhanden');
  await expect(dialog.getByRole('button', { name: 'Importieren', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Schließen' }).click();
  await expect(dialog).toBeHidden();

  // Alles wieder da
  await expectProgress(page, 1, project);
  await page.evaluate(
    ({ lon, lat }) => window.__map!.jumpTo({ center: [lon, lat], zoom: 12 }),
    ARBER,
  );
  await waitForPeaks(page);
  await expect.poll(() => arberMarkerCount(page)).toBe(1);
  await clickArber(page);
  await expect(panel.getByTestId('ascent-status')).toHaveText('1× bestiegen');
  await expect(panel.getByText('Sonnenaufgang')).toBeVisible();
});
