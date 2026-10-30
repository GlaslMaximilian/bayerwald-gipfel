/**
 * Marker-Bilder für die Karte, per Canvas gezeichnet.
 * Offen und bestiegen unterscheiden sich in Farbe UND Form:
 *   offen     – dunkelgrauer Ring mit weißer Füllung
 *   bestiegen – gefüllter grüner Kreis mit weißem Häkchen, etwas größer
 */

const OPEN_COLOR = '#3f4a45';
const CLIMBED_COLOR = '#2f7d5b';

function canvas(size: number, pixelRatio: number) {
  const el = document.createElement('canvas');
  el.width = el.height = size * pixelRatio;
  const ctx = el.getContext('2d')!;
  ctx.scale(pixelRatio, pixelRatio);
  return { el, ctx };
}

function imageData(el: HTMLCanvasElement) {
  return el.getContext('2d')!.getImageData(0, 0, el.width, el.height);
}

export function drawOpenMarker(pixelRatio: number): ImageData {
  const size = 16;
  const { el, ctx } = canvas(size, pixelRatio);
  const c = size / 2;

  ctx.beginPath();
  ctx.arc(c, c, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OPEN_COLOR;
  ctx.stroke();

  return imageData(el);
}

export function drawClimbedMarker(pixelRatio: number): ImageData {
  const size = 22;
  const { el, ctx } = canvas(size, pixelRatio);
  const c = size / 2;

  ctx.beginPath();
  ctx.arc(c, c, 9.5, 0, Math.PI * 2);
  ctx.fillStyle = CLIMBED_COLOR;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // Häkchen
  ctx.beginPath();
  ctx.moveTo(c - 4.5, c + 0.5);
  ctx.lineTo(c - 1.5, c + 3.5);
  ctx.lineTo(c + 4.5, c - 3);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  return imageData(el);
}
