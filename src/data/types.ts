/** Ein Gipfel aus einem Regionspaket (statische Daten). */
export type Peak = {
  id: string;
  name: string;
  ele: number;
  lat: number;
  lon: number;
  region: string;
};

/** Eintrag in `public/data/regions.json`. */
export type Region = {
  id: string;
  name: string;
  file: string;
  minEle: number;
};

/** Eine Besteigung (Nutzerdaten). Ein Gipfel gilt als bestiegen, sobald er mindestens eine hat. */
export type Ascent = {
  id: string;
  peakId: string;
  /** "YYYY-MM-DD" */
  date: string;
  note?: string;
  stravaActivityId?: string;
  /** ISO-Zeitstempel */
  createdAt: string;
};
