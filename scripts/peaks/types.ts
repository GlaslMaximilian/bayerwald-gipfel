/** Ein Gipfel, wie er in den Regionspaketen landet (siehe CLAUDE.md). */
export type Peak = {
  id: string;
  name: string;
  ele: number;
  lat: number;
  lon: number;
  region: string;
};

/** Ein Gipfel während der Aufbereitung, mit Zusatzinfos für das Review. */
export type Candidate = Omit<Peak, 'region'> & {
  /** Landkreis, in dem der Gipfel liegt; `null` bei Grenzgipfeln außerhalb. */
  landkreis: string | null;
  /** Hinweise für die Spalte „Auffälligkeiten“. */
  notes: string[];
};
