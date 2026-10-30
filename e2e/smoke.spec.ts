import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`Startseite lädt (${colorScheme})`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('./');
    await expect(page).toHaveTitle('Bayerwald-Gipfel');
    await expect(page.getByRole('heading', { name: 'Bayerwald-Gipfel' })).toBeVisible();
    await page.screenshot({
      path: `e2e/screenshots/${testInfo.project.name}-${colorScheme}.png`,
      fullPage: true,
    });
  });
}
