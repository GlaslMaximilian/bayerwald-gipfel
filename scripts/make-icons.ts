/**
 * Erzeugt die App-Icons aus `assets/icon.svg` (einmalig, Ergebnis liegt im Repo).
 * Aufruf: node scripts/make-icons.ts
 */
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const source = await readFile('assets/icon.svg', 'utf8');

/** radius: abgerundete Ecken (0 = randlos, für maskable und Apple). */
const icons = [
  { file: 'public/favicon.svg', size: 0, radius: 96 },
  { file: 'public/icons/icon-192.png', size: 192, radius: 96 },
  { file: 'public/icons/icon-512.png', size: 512, radius: 96 },
  { file: 'public/icons/maskable-512.png', size: 512, radius: 0 },
  { file: 'public/icons/apple-touch-icon.png', size: 180, radius: 0 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, radius } of icons) {
  const svg = source.replace('{{radius}}', String(radius)).replace(/<!--.*?-->\n\s*/s, '');
  if (size === 0) {
    await writeFile(file, svg);
  } else {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    await page.screenshot({ path: file, omitBackground: true });
  }
  console.log(`${file} geschrieben`);
}
await browser.close();
