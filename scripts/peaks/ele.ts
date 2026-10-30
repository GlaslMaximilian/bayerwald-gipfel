/**
 * Liest eine OSM-`ele`-Angabe robust als ganze Meter.
 * Erlaubt: "1456", "1456 m", "1456 m ü. NHN", "1.456" (Tausenderpunkt), "1456,2", "1456.2".
 * Gibt `null` zurück, wenn der Wert nicht eindeutig lesbar ist.
 */
export function parseEle(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const match = raw.trim().match(/^(\d+)(?:([.,])(\d+))?(.*)$/);
  if (!match) return null;

  const [, intPart = '', separator, fraction, rest = ''] = match;
  // Nach der Zahl ist nur noch eine Meterangabe erlaubt.
  if (!/^\s*(m\b.*)?$/i.test(rest)) return null;

  let value: number;
  if (separator && fraction) {
    const isThousands = fraction.length === 3 && intPart.length <= 2;
    value = isThousands ? Number(intPart + fraction) : Number(`${intPart}.${fraction}`);
  } else {
    value = Number(intPart);
  }

  return Number.isFinite(value) ? Math.round(value) : null;
}
