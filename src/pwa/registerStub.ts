/** Ersatz für `virtual:pwa-register/react` in Vitest: kein Service Worker, kein Update. */
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}] as const,
    offlineReady: [false, () => {}] as const,
    updateServiceWorker: async () => {},
  };
}
