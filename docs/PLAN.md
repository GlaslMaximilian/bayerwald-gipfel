# Fahrplan

Regeln stehen in `CLAUDE.md`. Immer nur **einen** Meilenstein pro Durchgang. Jeder Meilenstein ist erst fertig, wenn alle „Fertig wenn“-Punkte erfüllt sind und Lint, Typecheck und Tests grün sind.

---

## Version 1 (MVP)

### [ ] M0 – Projektgerüst & Deployment
**Ziel:** Leere App läuft lokal und ist auf GitHub Pages erreichbar.
- Vite + React + TypeScript (strict) aufsetzen
- ESLint, Prettier, Vitest, Playwright einrichten, npm-Skripte wie in `CLAUDE.md`
- `.env.example`, `.gitignore`
- GitHub-Actions-Workflow: Lint + Test + Build, Deploy auf GitHub Pages (`base: '/bayerwald-gipfel/'`)
- Platzhalterseite „Bayerwald-Gipfel“, hell/dunkel nach System

**Maxi-Aktion:** GitHub-Repo `bayerwald-gipfel` anlegen, Pages auf „GitHub Actions“ stellen.

**Fertig wenn:** `npm run dev` zeigt die Seite. Push auf `main` deployt automatisch. Die Seite ist unter `https://<user>.github.io/bayerwald-gipfel/` erreichbar.

---

### [ ] M1 – Gipfeldaten
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

### [ ] M2 – Karte
**Ziel:** Alle Gipfel auf einer Karte.
- MapLibre-Vollbildkarte, Startansicht auf den Bayerischen Wald
- Umschalter Topo (`outdoor-v2`) / Satellit, Auswahl wird gespeichert
- Gipfel als Marker-Layer (GeoJSON-Source, nicht hunderte DOM-Marker), Name ab passender Zoomstufe
- Tippen auf Gipfel öffnet Detail-Panel (Name, Höhe), mobil als Bottom Sheet, Desktop als Seitenpanel
- Peaks über `src/data/peaks.ts` aus `regions.json` laden (alle Regionen)

**Maxi-Aktion:** MapTiler-Konto anlegen, API-Key in `.env` und als GitHub Secret eintragen.

**Fertig wenn:** Karte und Gipfel erscheinen mobil und am Desktop (Playwright-Screenshots geprüft), der Stilwechsel funktioniert und das Panel öffnet sich.

---

### [ ] M3 – Besteigungen (lokal)
**Ziel:** Gipfel abhaken, vorerst nur lokal gespeichert.
- `AscentRepository`-Interface (`list`, `add`, `remove`, `subscribe`), erste Implementierung `LocalAscentRepository` (IndexedDB oder localStorage)
- Detail-Panel: Button „Bestiegen“ → Datum (Standard: heute) + optionale Notiz
- Liste der Besteigungen im Panel, einzelne löschbar (mit Bestätigung)
- Counter „3× bestiegen“
- Marker-Stil hängt von bestiegen/offen ab (Farbe **und** Form)
- Domain-Logik in `src/domain/` mit Unit-Tests

**Fertig wenn:** Abhaken, Mehrfachbesteigung und Löschen funktionieren, alles bleibt nach einem Reload erhalten und die Marker aktualisieren sich sofort.

---

### [ ] M4 – Fortschritt & Liste
**Ziel:** Überblick ohne Karte.
- Fortschrittsanzeige „X / Y Gipfel“ + Balken, immer sichtbar, aber dezent
- Listenansicht: sortierbar nach Höhe / Name / zuletzt bestiegen, Filter Alle / Offen / Bestiegen
- Tippen auf einen Listeneintrag → Karte fliegt zum Gipfel und öffnet die Details
- Übersichtlich halten: keine weiteren Statistiken

**Fertig wenn:** Fortschritt und Liste stimmen mit den Daten überein, die Navigation Liste → Karte funktioniert mobil und am Desktop.

---

### [ ] M5 – Export/Import
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
