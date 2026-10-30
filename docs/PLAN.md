# Fahrplan

Regeln stehen in `CLAUDE.md`. Immer nur **einen** Meilenstein pro Durchgang. Jeder Meilenstein ist erst fertig, wenn alle „Fertig wenn“-Punkte erfüllt sind und Lint, Typecheck und Tests grün sind.

---

## Version 1 (MVP)

### [x] M0 – Projektgerüst & Deployment
**Ziel:** Leere App läuft lokal und ist auf GitHub Pages erreichbar.
- Vite + React + TypeScript (strict) aufsetzen
- ESLint, Prettier, Vitest, Playwright einrichten, npm-Skripte wie in `CLAUDE.md`
- `.env.example`, `.gitignore`
- GitHub-Actions-Workflow: Lint + Test + Build, Deploy auf GitHub Pages (`base: '/bayerwald-gipfel/'`)
- Platzhalterseite „Bayerwald-Gipfel“, hell/dunkel nach System

**Maxi-Aktion:** GitHub-Repo `bayerwald-gipfel` anlegen, Pages auf „GitHub Actions“ stellen.

**Fertig wenn:** `npm run dev` zeigt die Seite. Push auf `main` deployt automatisch. Die Seite ist unter `https://<user>.github.io/bayerwald-gipfel/` erreichbar.

---

### [x] M1 – Gipfeldaten
**Ziel:** Geprüfte Gipfelliste als Regionspaket.
- `scripts/fetch-peaks.ts`: Overpass-Abfrage `natural=peak` mit `name` und `ele` innerhalb der Landkreise Cham, Regen, Freyung-Grafenau, Deggendorf, Straubing-Bogen und Passau (deutsche Seite)
- `ele` robust parsen (z. B. `"1456"`, `"1456 m"`, `"1.456"`, `"1456,2"`), Werte < 1000 verwerfen
- Dubletten zusammenführen (gleicher Name und < 300 m Abstand → höchsten behalten)
- Grenzgipfel (Lusen, Dreisessel, Plöckenstein …) nicht verlieren: Punkte maximal 200 m jenseits der Grenze zulassen und im Review markieren
- Ausgabe `public/data/regions/bayerwald-de.json` (sortiert nach Höhe) + `public/data/regions.json`
- Zusätzlich `docs/peaks-review.md`: Tabelle Name | Höhe | Landkreis | OSM-Link | Auffälligkeiten
- Unit-Tests für das `ele`-Parsing und die Dublettenlogik

**Maxi-Aktion:** `docs/peaks-review.md` durchsehen und sagen, was raus soll oder fehlt. Korrekturen kommen in `scripts/peaks-overrides.json` (exclude/include/rename), damit sie bei einem neuen Abruf erhalten bleiben.

**Fertig wenn:** Ich habe die Liste freigegeben und die JSON-Dateien sind committet.

---

### [x] M2 – Karte
**Ziel:** Alle Gipfel auf einer Karte.
- MapLibre-Vollbildkarte, Startansicht auf den Bayerischen Wald
- Umschalter Topo (`outdoor-v2`) / Satellit, Auswahl wird gespeichert
- Gipfel als Marker-Layer (GeoJSON-Source, nicht hunderte DOM-Marker), Name ab passender Zoomstufe
- Tippen auf Gipfel öffnet Detail-Panel (Name, Höhe), mobil als Bottom Sheet, Desktop als Seitenpanel
- Peaks über `src/data/peaks.ts` aus `regions.json` laden (alle Regionen)

**Maxi-Aktion:** MapTiler-Konto anlegen, API-Key in `.env` und als GitHub Secret eintragen.

**Fertig wenn:** Karte und Gipfel erscheinen mobil und am Desktop (Playwright-Screenshots geprüft), der Stilwechsel funktioniert und das Panel öffnet sich.

---

### [x] M3 – Besteigungen (lokal)
**Ziel:** Gipfel abhaken, vorerst nur lokal gespeichert.
- `AscentRepository`-Interface (`list`, `add`, `remove`, `subscribe`), erste Implementierung `LocalAscentRepository` (IndexedDB oder localStorage)
- Detail-Panel: Button „Bestiegen“ → Datum (Standard: heute) + optionale Notiz
- Liste der Besteigungen im Panel, einzelne löschbar (mit Bestätigung)
- Counter „3× bestiegen“
- Marker-Stil hängt von bestiegen/offen ab (Farbe **und** Form)
- Domain-Logik in `src/domain/` mit Unit-Tests

**Fertig wenn:** Abhaken, Mehrfachbesteigung und Löschen funktionieren, alles bleibt nach einem Reload erhalten und die Marker aktualisieren sich sofort.

---

### [x] M4 – Fortschritt & Liste
**Ziel:** Überblick ohne Karte.
- Fortschrittsanzeige „X / Y Gipfel“ + Balken, immer sichtbar, aber dezent
- Listenansicht: sortierbar nach Höhe / Name / zuletzt bestiegen, Filter Alle / Offen / Bestiegen
- Tippen auf einen Listeneintrag → Karte fliegt zum Gipfel und öffnet die Details
- Übersichtlich halten: keine weiteren Statistiken

**Fertig wenn:** Fortschritt und Liste stimmen mit den Daten überein, die Navigation Liste → Karte funktioniert mobil und am Desktop.

---

### [x] M5 – Export/Import
**Ziel:** Backup unabhängig von der Cloud.
- Einstellungsmenü: „Exportieren“ lädt eine JSON-Datei mit allen Ascents (+ Version, Datum)
- „Importieren“ mit Vorschau (X neu, Y schon vorhanden), Zusammenführen über `id`, ohne Duplikate
- Unit-Tests für das Zusammenführen

**Fertig wenn:** Export → Daten löschen → Import stellt alles wieder her.

---

### [ ] M6 – PWA & Offline
**Ziel:** Installierbar und offline nutzbar.
- Manifest (Name, Icons, Theme-Farbe), installierbar auf Android
- Service Worker: App-Shell und `public/data/**` vorab cachen
- Kartenkacheln per Runtime-Cache (begrenzte Größe), bereits angesehene Bereiche funktionieren offline
- Hinweis „Offline“ in der UI, wenn kein Netz da ist
- Update-Hinweis bei neuer Version

**Fertig wenn:** Lighthouse-PWA-Check ok. Im Flugmodus starten die App, die Gipfel, das Abhaken und zuvor angesehene Karten.

---

### [ ] M7 – Cloud-Sync (Firebase)
**Ziel:** Gleiche Daten am Handy und PC.
- Firebase Auth mit Google-Login (Login-Button in den Einstellungen; ohne Login funktioniert die App weiter lokal)
- `FirestoreAscentRepository` mit `persistentLocalCache` (offline-fähig), Pfad `users/{uid}/ascents/{ascentId}`
- Beim ersten Login: lokale Ascents einmalig nach Firestore übernehmen (ohne Duplikate)
- Firestore-Regeln: Lesen/Schreiben nur für die eigene `uid`, zusätzlich nur meine `uid` erlaubt (Allowlist)
- Regeln als `firestore.rules` im Repo

**Maxi-Aktion:** Firebase-Projekt anlegen, Google-Login aktivieren, Firestore anlegen, GitHub-Pages-Domain als autorisierte Domain eintragen, Config-Werte in `.env` und als GitHub Secrets. Claude Code erklärt jeden Klick.

**Fertig wenn:** Eine Besteigung am Handy erscheint ohne Neuladen am PC. Offline erfasste Besteigungen synchronisieren sich, sobald wieder Netz da ist.

---

## Version 2 (später, erst nach Rücksprache starten)

### [ ] M8 – 3D-Ansicht
- MapTiler-Terrain als `raster-dem`, Toggle 2D/3D, Kamera kippbar, Hillshade
- **Fertig wenn:** 3D läuft auf dem Handy flüssig genug und lässt sich abschalten.

### [ ] M9 – Strava-Anbindung
- Kleiner Cloudflare Worker für Strava-OAuth (Client Secret nur dort)
- Nach dem Abhaken: Strava-Aktivitäten dieses Tages laden, passende vorschlagen (Route geht nahe am Gipfel vorbei), auswählen → `stravaActivityId` speichern
- Route (Polyline) auf der Karte anzeigen, ein-/ausblendbar
- **Maxi-Aktion:** Strava-API-App anlegen, Cloudflare-Konto.

### [ ] M10 – Weitere Region: Šumava (CZ)
- `fetch-peaks.ts` um eine Regionskonfiguration erweitern (Gebiet + `minEle`), neues Paket `sumava-cz.json`
- Review wie in M1
- **Fertig wenn:** Die neue Region erscheint ohne Codeänderung in App, Liste und Fortschritt (Fortschritt pro Region und gesamt).

---

## Log
<!-- Claude Code: nach jedem Meilenstein Datum, kurze Zusammenfassung, Entscheidungen, offene Punkte -->

### 2026-10-30 – M0 Projektgerüst & Deployment ✔
- Vite 8 + React 19 + TypeScript 6.0 (strict, `noUncheckedIndexedAccess`). TypeScript 7 bewusst nicht, weil typescript-eslint es noch nicht unterstützt.
- ESLint 10 (Flat Config, typescript-eslint, react-hooks) + Prettier; `CLAUDE.md` und `docs/` sind von Prettier ausgenommen. `.gitattributes` erzwingt LF.
- Vitest (jsdom, Testing Library) für Logik/Komponenten; Playwright-Smoke-Test gegen den Produktions-Build (`preview`), Projekte „mobil“ (390×844) und „desktop“ (1280×800), je hell/dunkel, Screenshots in `e2e/screenshots/` (nicht committet).
- Workflow `.github/workflows/deploy.yml`: Lint, Typecheck, Vitest, Build → Deploy auf Pages bei Push auf `main`. Playwright läuft nur lokal. MapTiler-/Firebase-Secrets werden schon an den Build durchgereicht (leer bis M2/M7).
- Repo: https://github.com/GlaslMaximilian/bayerwald-gipfel (public, wegen Pages im Free-Plan). Live: https://glaslmaximilian.github.io/bayerwald-gipfel/
- GitHub CLI (`gh`) lokal per winget installiert und angemeldet.
- Offen: `ubuntu-latest` wechselt auf Ubuntu 26, beobachten.

### 2026-10-30 – M1 Gipfeldaten ✔
- `npm run fetch-peaks` (Node 24 führt TypeScript direkt aus, keine neue Abhängigkeit). Eine Overpass-Abfrage: Grenzlinien der 6 Landkreise, Gipfel je Landkreis, Gipfel bis 1 km um die Grenze. Abstand zur Grenze wird lokal berechnet (≤ 200 m → aufgenommen und markiert, bis 1 km → im Review „nicht aufgenommen“).
- Reine Logik in `scripts/peaks/` mit Vitest-Tests: `ele.ts` („1.456“ gilt als Tausenderpunkt), `geo.ts`, `dedupe.ts` (gleicher Name, < 300 m), `overrides.ts`; `review.ts` erzeugt `docs/peaks-review.md`. Das Review zeigt zusätzlich abweichendes `name:de`.
- Overpass ist oft überlastet (502): Skript versucht 3× mit wachsender Pause, Ersatzserver `overpass.private.coffee`. Der Ersatzserver hatte einmal einen älteren Datenstand (Almberg 1139 statt 1142 m) – bei Abweichungen erneut über den Hauptserver abrufen.
- Review-Entscheidungen (in `scripts/peaks-overrides.json`): alle tschechischen Grenzgipfel raus, ebenso die tschechisch benannten V koutě und Malý Kokrháč. Bayerischer Plöckenstein (4 m jenseits der Grenze) bleibt, Hufberg/Plöckenstein-Hauptgipfel (CZ) nicht aufgenommen. Dreisessel und Hochstein bleiben beide.
- Ergebnis: **129 Gipfel** ab 1000 m, freigegeben.
- Bekannte Grenze: Gipfel ohne `ele`-Tag in OSM werden nicht erfasst; fehlende Gipfel ggf. per `include` mit `ele` nachtragen.

### 2026-10-30 – M2 Karte ✔
- MapLibre GL 6 (einzige neue Abhängigkeit). Der Worker wird über `maplibre-gl/dist/maplibre-gl-worker.mjs?url` + `setWorkerUrl` eingebunden – ohne das lädt die Karte im Vite-Build nicht.
- `src/data/peaks.ts` lädt `regions.json` und alle Pakete relativ zu `BASE_URL` (neue Region = nur Daten).
- Stile Topo (`outdoor-v2`) / Satellit (`satellite`), Wahl in `localStorage` (`bayerwald-gipfel.mapStyle`). Grundstil wird nach jedem `style.load` angepasst (`src/map/baseStyle.ts`): Beschriftung `name:de` statt `name:en`, Höhen in m, POIs und die Gipfel des Grundstils ausgeblendet (sonst doppelt und mit tschechischen Gipfeln).
- Gipfel als GeoJSON-Quelle + Kreis-Ebene, Namen/Höhe ab Zoom 11, Auswahl orange hervorgehoben. Antippen wählt den nächstgelegenen Gipfel im 14-px-Umkreis. Neutrale Marker – offen/bestiegen folgt in M3.
- Detail-Panel: < 768 px Bottom Sheet, sonst Seitenpanel links; schließen per ×, Escape oder Tippen auf leere Karte. Zoom-Knöpfe mobil ausgeblendet.
- Ohne `VITE_MAPTILER_KEY` zeigt die App einen Hinweis. Schlüssel liegt in `.env` und als GitHub-Secret; im MapTiler-Dashboard auf `glaslmaximilian.github.io` und `localhost` beschränkt (geprüft: ohne Origin 403).
- Playwright baut mit `--mode e2e`; nur dann hängt die Karte an `window.__map`. 2 Worker, Wartebedingung „Stil geladen + Gipfel gerendert“. Dabei gefunden und behoben: Beim Start mit Satellit blieb die Gipfel-Quelle leer.

### 2026-10-30 – M3 Besteigungen (lokal) ✔
- `AscentRepository` (async: `list`, `add`, `remove`, `subscribe`) + `LocalAscentRepository` auf localStorage, Schlüssel `bayerwald-gipfel.ascents.v1`. Änderungen aus anderen Tabs kommen über das `storage`-Ereignis. Beschädigte Daten werden ignoriert statt abzustürzen.
- Domain (`src/domain/ascents.ts`): Zählen pro Gipfel, Besteigungen eines Gipfels (neueste zuerst), heutiges Datum in Ortszeit, Datumsprüfung (gültig, nicht in der Zukunft), deutsches Datumsformat.
- Detail-Panel: Status „Noch nicht bestiegen“ / „3× bestiegen“, Knopf „Bestiegen“ bzw. „Erneut bestiegen“ → Datum (Standard heute) + Notiz. Liste neueste zuerst; Löschen mit Bestätigung direkt im Eintrag (kein Browser-Dialog).
- Marker (Canvas-Icons): offen = dunkelgrauer Ring, bestiegen = grüner Kreis mit Häkchen, größer und obenauf. Anzahl nur im Panel. Marker aktualisieren sich sofort über `count` im GeoJSON.
- E2E: Abhaken → Marker ändert sich → Neuladen → zweite Besteigung → Löschen, mobil und Desktop.
- Beobachtung (nicht im Plan): Mobil kann das Bottom Sheet den gewählten Gipfel verdecken. Ggf. in M4 beim „Liste → Karte fliegt zum Gipfel“ mit Padding lösen.

### 2026-10-30 – M4 Fortschritt & Liste ✔
- Domain (`src/domain/peakList.ts`): Fortschritt (Gipfel mit mind. einer Besteigung / alle), Filter Alle/Offen/Bestiegen, Sortierung Höhe (Standard), Name (deutsche Sortierregel, Umlaute korrekt) und zuletzt bestiegen (nie bestiegene ans Ende, nach Höhe).
- Desktop: feste Seitenleiste links (360 px) mit Fortschritt, Filter, Sortierung und Liste. Ein gewählter Gipfel zeigt seine Details in derselben Leiste, „Zurück zur Liste“ führt zurück (Scrollposition bleibt erhalten).
- Mobil: dezente Pille oben links („0 / 129“, Mini-Balken, „Liste“) öffnet die Liste als Bottom Sheet. Tippen auf einen Eintrag schließt die Liste, die Karte fliegt hin, die Details öffnen sich.
- Karte: `flyTo` mit `offset`, so dass Seitenleiste bzw. Bottom Sheet den Gipfel nicht verdecken. Beim Antippen auf der Karte wird nur verschoben, wenn der Gipfel sonst verdeckt wäre (löst die Beobachtung aus M3). Startansicht berücksichtigt am Desktop die Seitenleiste.
- Filter und Sortierung werden bewusst nicht gespeichert (nach dem Neuladen: Alle, nach Höhe).
- E2E: Fortschritt 0 → 1, Sortierung nach Name, Filter Bestiegen/Offen, Liste → Karte (Gipfel nicht verdeckt), mobil und Desktop.

### 2026-10-30 – M5 Export/Import ✔
- Format (`src/domain/backup.ts`): `{ app: "bayerwald-gipfel", version: 1, exportedAt, ascents }`, Dateiname `bayerwald-gipfel-backup-JJJJ-MM-TT.json`. Beim Einlesen wird jede Besteigung geprüft (id, peakId, gültiges Datum, createdAt); unbekannte Felder fallen weg. Fehler → deutsche Meldung, nichts wird geändert.
- Zusammenführen über `id`: Vorhandenes wird nie überschrieben, nur Neues kommt dazu, doppelte IDs in der Datei zählen einmal. Vorschau „X neu, Y schon vorhanden“; bei 0 neu ist „Importieren“ deaktiviert.
- Besteigungen zu Gipfeln, die die App nicht kennt, werden trotzdem übernommen (Nutzerdaten; Region kann später dazukommen).
- `AscentRepository.importAscents()` übernimmt Besteigungen mit Original-`id`/`createdAt` in einem Schritt (später auch für Firestore).
- Oberfläche: Zahnrad oben rechts neben dem Stil-Umschalter öffnet einen nativen `<dialog>` „Einstellungen“ mit Abschnitt „Datensicherung“. jsdom kennt `showModal` nicht → kleiner Ersatz in `test-setup.ts`.
- E2E: Abhaken → Export → localStorage leeren → Import → Fortschritt und Notiz wieder da; zweiter Import zeigt „0 neu, 1 schon vorhanden“. Zeitlimit pro E2E-Test auf 90 s erhöht, weil die Karte bei ausgelastetem Rechner deutlich langsamer lädt.
