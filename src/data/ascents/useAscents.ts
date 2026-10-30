import { useEffect, useState } from 'react';
import type { Ascent } from '../types';
import type { AscentRepository } from './AscentRepository';

/** Aktuelle Besteigungen aus dem Repository; aktualisiert sich bei jeder Änderung. */
export function useAscents(repository: AscentRepository): Ascent[] {
  const [ascents, setAscents] = useState<Ascent[]>([]);
  useEffect(() => repository.subscribe(setAscents), [repository]);
  return ascents;
}
