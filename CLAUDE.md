# Bayerwald-Gipfel-App

Persönliche Web-App (PWA), mit der ich festhalte, welche Gipfel im Bayerischen Wald ich bestiegen habe. Karte mit offenen und bestiegenen Gipfeln, Liste, Fortschritt, Counter pro Gipfel. Nur ein Nutzer (ich). Keine Planung, kein Teilen, kein Standort.

Den detaillierten Fahrplan findest du in `docs/PLAN.md`. **Arbeite immer genau einen Meilenstein nach dem anderen ab.**

## Arbeitsweise (wichtig)
1. Lies zu Beginn jeder Session `docs/PLAN.md` und finde den ersten Meilenstein, der nicht erledigt ist.
2. Bevor du Code schreibst, stellst du einen kurzen Plan für diesen Meilenstein vor und wartest auf mein OK.
3. Arbeite in kleinen Schritten. Nach jedem Schritt: `npm run lint`, `npm run typecheck`, `npm test`. Alles muss grün sein.
4. Prüfe UI-Änderungen selbst mit Playwright (Screenshot in Mobil- 390×844 und Desktop-Größe 1280×800) und sieh dir die Screenshots an.
5. Nach jedem fertigen Teilschritt committest du mit einer aussagekräftigen Nachricht (Deutsch oder Englisch, Präsens, z. B. `Karte: Gipfelmarker anzeigen`).
6. Wenn ein Meilenstein fertig ist, hakst du ihn in `docs/PLAN.md` ab, trägst kurz Notizen/Entscheidungen im Abschnitt „Log“ ein und hörst auf. Fang nicht ungefragt den nächsten an.
7. Steht bei einem Meilenstein **„Maxi-Aktion“**, dann halte an und sag mir genau, was ich tun muss (Schritt für Schritt, ich habe z. B. mit Firebase noch keine Erfahrung).
8. Neue Abhängigkeiten außerhalb des Stacks unten nur nach Rückfrage.
9. Lieber einfach und lesbar als clever. Keine Features, die nicht im Plan stehen.

## Stack
| Bereich | Wahl |
|---|---|
| Build | Vite + TypeScript (strict) |
| UI | React, CSS Modules oder schlichtes CSS mit CSS-Variablen (kein UI-Framework) |
| Karte | MapLibre GL JS |
| Kacheln | MapTiler (Stile: `outdoor-v2` für Topo, `satellite`, später Terrain für 3D) |
| PWA | vite-plugin-pwa |
| Sync/Login | Firebase Auth (Google) + Firestore mit `persistentLocalCache` (Offline) |
| Tests | Vitest (Logik), Playwright (Smoke-Tests, Screenshots) |
| Lint/Format | ESLint + Prettier |
| Hosting | GitHub Pages via GitHub Actions (Vite `base` = `/bayerwald-gipfel/`) |

## Projektstruktur (Ziel)
```
scripts/fetch-peaks.ts        # Gipfeldaten aus OSM (Overpass) erzeugen
public/data/regions.json      # Liste der Regionspakete
public/data/regions/*.json    # ein Paket pro Region
src/
  data/peaks.ts               # Regionspakete laden
  data/ascents/               # AscentRepository-Interface + Implementierungen (local, firestore)
  domain/                     # reine Logik: Fortschritt, Zähler, Sortierung (gut testbar)
  map/                        # MapLibre-Komponenten, Stile, Marker-Layer
  ui/                         # Liste, Detail-Panel, Fortschritt, Einstellungen
docs/PLAN.md
```

## Datenmodell
```ts
type Peak = {
  id: string;        // "osm:node/123456"
  name: string;
  ele: number;       // Meter, ganzzahlig
  lat: number;
  lon: number;
  region: string;    // z. B. "bayerwald-de"
};

type Ascent = {
  id: string;        // uuid
  peakId: string;
  date: string;      // "YYYY-MM-DD"
  note?: string;
  stravaActivityId?: string; // erst ab Strava-Meilenstein
  createdAt: string; // ISO
};
```
- Ein Gipfel gilt als bestiegen, wenn er mindestens einen Ascent hat. Der Counter ist die Anzahl der Ascents.
- Gipfel sind statische Daten, nur Ascents sind Nutzerdaten.
- `regions.json`: `[{ "id": "bayerwald-de", "name": "Bayerischer Wald", "file": "regions/bayerwald-de.json", "minEle": 1000 }]`
- Eine neue Region kommt nur als neues Paket + Eintrag in `regions.json` dazu, **ohne Codeänderung**.
- Gipfel werden nie vom Nutzer in der App eingegeben oder gesucht.

## Gipfel-Kriterien (Region bayerwald-de)
- OSM `natural=peak` mit `name` und `ele >= 1000`
- Gebiet: deutscher Bayerischer Wald inkl. Vorderem Bayerischen Wald (Hoher Bogen, Hirschenstein, Pröller, Einödriegel …)
- Kein Prominenz-Filter
- Ergebnis wird von mir manuell geprüft, bevor es verwendet wird

## UI/Design
- Modern, minimalistisch, übersichtlich. Hell/dunkel automatisch nach `prefers-color-scheme`
- Mobile first (Android-Chrome), muss am Desktop genauso gut funktionieren
- Mobil: Vollbildkarte, Liste/Details als Bottom Sheet. Desktop: Seitenpanel links
- Offen vs. bestiegen auf einen Blick erkennbar (Farbe **und** Form/Icon, nicht nur Farbe). Bei Mehrfachbesteigung Zahl am Marker oder im Panel
- Alle Texte auf Deutsch
- Kein Standort, keine POIs

## Konfiguration & Geheimnisse
- Schlüssel nur über `.env` (`VITE_MAPTILER_KEY`, `VITE_FIREBASE_*`), `.env` ist in `.gitignore`, `.env.example` liegt im Repo
- Für GitHub Pages kommen die Werte aus GitHub Actions Secrets
- MapTiler-Key im MapTiler-Dashboard auf die eigene Domain beschränken (Hinweis an mich)

## Befehle
```
npm run dev          # Dev-Server
npm run build        # Produktions-Build
npm run preview      # Build lokal ansehen
npm run lint
npm run typecheck
npm test             # Vitest
npm run test:e2e     # Playwright
npm run fetch-peaks  # Gipfeldaten neu erzeugen
```
