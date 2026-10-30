import { useSyncExternalStore } from 'react';

/** Ab dieser Breite: Seitenleiste links statt Bottom Sheet (wie in den CSS-Modulen). */
export const DESKTOP_QUERY = '(min-width: 768px)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
