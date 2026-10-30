export type LatLon = { lat: number; lon: number };

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Großkreisabstand in Metern. */
export function distanceMeters(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Abstand eines Punkts zu einer Strecke in Metern.
 * Rechnet in einer lokalen ebenen Projektion um `p` – für Abstände bis einige Kilometer genau genug.
 */
export function distanceToSegmentMeters(p: LatLon, a: LatLon, b: LatLon): number {
  const metersPerDegLat = (Math.PI * EARTH_RADIUS_M) / 180;
  const metersPerDegLon = metersPerDegLat * Math.cos(toRad(p.lat));
  const ax = (a.lon - p.lon) * metersPerDegLon;
  const ay = (a.lat - p.lat) * metersPerDegLat;
  const bx = (b.lon - p.lon) * metersPerDegLon;
  const by = (b.lat - p.lat) * metersPerDegLat;

  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  // Projektion des Ursprungs (= p) auf die Strecke, auf [0, 1] begrenzt.
  const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSq));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** Kleinster Abstand eines Punkts zu einer der Linien (jeweils Folge von Punkten) in Metern. */
export function distanceToLinesMeters(p: LatLon, lines: LatLon[][]): number {
  let min = Infinity;
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      min = Math.min(min, distanceToSegmentMeters(p, line[i - 1]!, line[i]!));
    }
  }
  return min;
}
