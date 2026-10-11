# SEO-Finale – Prüfberichte

## TECHNIK

PAKET TECHNIK – Unabhängige Prüfung: **BESTANDEN** (keine Nachbesserungen nötig)

**1. Behauptungen im gerenderten HTML nachvollzogen (curl + Playwright gegen :3100):**
- **WebSite-Schema mit SearchAction:** auf `/de` und `/en` im JSON-LD vorhanden (`urlTemplate: https://www.oekoinvest.com/quellen?q={search_term_string}`, korrektes `inLanguage` je Fassung). Live-Verhalten geprüft: `/quellen?q=Pacht` füllt das Suchfeld nach dem Hydrieren („Pacht“ im Input, Playwright). Die SearchAction ist damit ehrlich funktionsfähig.
- **Organization-Schema:** `vatID: ATU76000505`, `telephone: +43 6278 71030`, `email: office@oekoinvest.com`, `contactPoint` (de/en, DE/AT/CH) im gerenderten JSON-LD – alle Werte gegen `src/data/site.js` und UEBERGABE.md (Abschnitt 3) geprüft, wahr und freigegeben. Ausgabe über das escapende `JsonLd` (Escaping in `src/components/JsonLd.js` verifiziert).
- **Überschriften:** `/quellen` und `/kommunen/widmungskit` haben jetzt genau 1 H1 und keine Gliederungssprünge mehr (eigene Prüfung über alle h1–h6 im HTML); die sr-only-h2 „Suchergebnisse“ ist im DOM vorhanden. Auch `/de/solarcarport`, `/de/marktdaten`, `/de/parkplatz` ohne Sprünge.
- **Verwaiste Seiten:** eigenes Linkgraph-Skript über alle 81 Seiten des Registers (`src/lib/land/seiten.js`) geschrieben und laufen lassen. Ergebnis: `/parkplatz` (Karte auf `/solarcarport`, DE+EN+gemeinsam), `/quellen` und `/marktdaten/strompreise-schweiz` (Verweissatz auf `/marktdaten`, DE+EN+gemeinsam) sind nicht mehr verwaist. Verwaist bleiben exakt die 4 dokumentierten Inhaberseiten: `/newsroom`, `/newsletter`, `/partner/widgets`, `/projekte/glaeserner-solarpark` – deckt sich mit dem Bericht.
- **Hygiene-Stichproben:** `/wissen/ratgeber/*`, `/en/investors`, `/ch/marktzugang-check` → 308 ohne Ketten; Sitemap 204 URLs ohne quellen/newsroom/newsletter; robots.txt dev = Disallow all (gewollt); canonical je Fassung korrekt; hreflang-Cluster konsistent mit `src/lib/land/pfad.js` (gemeinsame Seite = x-default; Länderfassung ohne eigenen Inhalt bekommt korrekt nur canonical + noindex, z. B. `/de/solarcarport`); title/description je Seite einzigartig (die generischen `<title>`-Duplikate im Dev-HTML sind Next-Streaming, der echte Titel steht am Ende und ist einzigartig).

**2. Nichts kaputt:**
- `npm test`: **974/974 grün**. `npm run test:charakterisierung`: **195/195 grün**. `npx eslint` auf allen 5 Dateien: **ohne Befund**.
- Screenshots 1440/390 (eigene Aufnahmen): `/quellen`, `/kommunen/widmungskit` (inkl. Element-Screenshot der umgestellten h2/h3-Blöcke „Ablauf“/„Beteiligte Stellen“ – optisch identisch, Klassen unverändert), `/de/marktdaten`, `/de/solarcarport`, `/en/solarcarport`: kein Überlauf, 0 Konsolenfehler, Design unverändert. Neue „Parkplatz-PV“-Karte und der Verweissatz im Quellen-&-Methodik-Block fügen sich in den Bestandsstil ein.
- Länderfassungen konsistent: neue Links in gemeinsamer, /de- und /en-Fassung vorhanden (`/parkplatz`, `/de/parkplatz`, `/en/parkplatz`; `/quellen`-Verweise analog).

**3. Kein Spam:** Kein Keyword-Stuffing (Kartentexte beschreibend, GEIG/kWp sachlich), die einzige unsichtbare Ergänzung ist die sr-only-h2 (legitimes Gliederungs-/Screenreader-Muster, kein versteckter Keyword-Text), alle Schema-Angaben wahr, kein AggregateRating.

**4. Abweichungen/Anmerkungen (kein Handlungsbedarf):**
- Builder nennt „103 Register-Seiten“, das Register `SEITEN` hat 81 statische Schlüssel; die Differenz sind dynamische Routen (`[slug]`) und Fassungen – Befund dadurch unverändert.
- Dev-Server war während der Parallel-Läufe zeitweise sehr langsam (Screenshot-Timeouts); kein Codeproblem, läuft weiter.

**Offen (Inhaberpunkte, unverändert gültig):** 4 bewusst verwaiste Seiten bis Freigabe; `Organization.sameAs` erst mit Social-Profilen (`SOCIAL = []`); SearchAction-Ziel `/quellen` bis E6 noindex; Wirkung insgesamt erst ab Livegang (NEXT_PUBLIC_SITE_ENV=production).

**Geprüfte/bestätigte Dateien (keine eigenen Änderungen nötig):**
- C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\components\Wurzel\Wurzel.js
- C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\components\Quellen\FaktenSuche.js
- C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\components\Kommune\Widmungskit\Widmungskit.js
- C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\marktdaten\page.js
- C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\solarcarport\page.js

Keine Commits, keine neuen Abhängigkeiten, Dev-Server läuft.

## INHALT

PRÜFBERICHT – Paket INHALT: Snippets und Suchintention (SEO-Finale)

**Ergebnis: BESTANDEN mit 1 behobener Lücke.**

**1. Behauptungen nachgemessen (gerendertes HTML, 127.0.0.1:3100, eigenes Mess-Skript mit Retry):**
- 30+ Fassungen geprüft (DE-Kernseiten, /at, /ch, /en, /en/…): alle Titles ≤ 60, alle Descriptions 138–160 Zeichen. Stichproben deckungsgleich mit dem Bericht, z. B. /quellen T=49/D=151 („Faktenregister: PV-Zahlen mit Quellen | ÖkoInvest"), /projektboerse D=155, /rechner/flaechenpass T=52/D=151, /gebaeudestrom T=53/D=160, /ch/freiflaeche T=60 mit „Jetzt Parzelle prüfen", /at/energiegemeinschaften T=56, EN-Startseite T=56, /en/rechner/flaechenpass „Land passport: is your land suitable?".
- Messhinweis (kein Fehler): Der Next-Dev-Server streamt mehrere `<title>`-Tags; der zuletzt gestreamte ist der gültige. Erste Messungen zeigten deshalb scheinbar den Site-Default auf /quellen, /marktdaten, /projektboerse – im HTML-Payload steht jeweils der korrekte Title als letztes Tag, Quellcode korrekt verdrahtet (`seitenMetadata`). Im Produktions-Build existiert nur ein Title.
- Nebenwerte je Fassung intakt: h1=1, canonical je Fassung korrekt, hreflang-Cluster vorhanden, JSON-LD parsebar, robots unverändert (noindex außerhalb Produktion).

**2. Nichts kaputt:**
- `npm test`: 974/974 grün. `npm run test:charakterisierung`: 195/195 grün.
- `npx eslint` auf allen 19 geänderten Seitendateien des Pakets: ohne Befund.
- `node qa/claim-lint.mjs`: Exit 0; die gelisteten Hinweise liegen ausschließlich in nicht vom Paket berührten Dateien (z. B. src/data/regionen/hessen.js) – keine neuen Funde durch das Paket.
- Diff-Kontrolle (Stichproben quellen/flaechenpass/freiflaeche): ausschließlich Meta-Zeilen geändert, DE und EN konsistent, kein Layout-Eingriff.
- Screenshots 1440/390 (check.mjs): /quellen, /projektboerse, /gebaeudestrom, /rechner/flaechenpass, /at/energiegemeinschaften – Status 200, 0 Konsolenfehler, kein horizontaler Überlauf; Bilder mit Read gesichtet, Design unverändert.

**3. Kein Spam:** Keine Keyword-Stopferei (natürliche Sätze mit Nutzen + Handlungsaufforderung), keine Schema-/Bewertungsdaten erfunden, Länderbegriffe korrekt (AT: Widmung, EEG/BEG; CH: Parzelle, „ausserhalb" ohne ß). Snippets enthalten keine ungedeckten Zahlen.

**4. Behobene Lücke (von mir):**
- `/en/newsletter` – Title war 66 Zeichen (>60): „Newsletter: deadlines and market data for your country | ÖkoInvest" → „Newsletter: PV deadlines & market data | ÖkoInvest" (50). Datei: `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\newsletter\page.js` (nur metadataEn.title). Im gerenderten HTML nachgemessen (T=50), eslint ohne Befund. Die Bericht-Behauptung „alle Titles ≤60" stimmte für diese eine EN-Fassung nicht – jetzt stimmt sie.

**Offen (Inhaberpunkte, bestätigt wie im Baubericht):**
1. Länderfassungen teilen den DE-Title (z. B. /ch/marktdaten mit „EEG-Zuschläge") – systembedingt; eigene CH/AT-Titles erst nach geprüften CH/AT-Zahlen (E6).
2. /investoren-Description 138 Zeichen – im Korridor, belassen.
3. Entfallene Meta-Zusätze („ohne Renditeversprechen" u. ä.) stehen weiter auf den Seiten; Rückmeldung der Rechtsabteilung abwarten, falls sie ins Snippet sollen.
4. Wirkung erst ab Produktion (noindex-Steuerung unverändert).

**Geprüfte/geänderte Dateien:** 21 Paketdateien unter `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\` verifiziert (Liste wie im Baubericht); 1 Datei von mir geändert: `src\app\(stamm)\newsletter\page.js`.

## TEMPO

## Prüfbericht Paket TEMPO (unabhängige Prüfung) – Ergebnis: **BESTANDEN**

### 1. Behauptungen nachvollzogen – bestätigt

**Schrift-Fallback-Fix (`src/components/Wurzel/Wurzel.js`)**
- Diff bestätigt: Die eigenen `fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"]`-Listen wurden aus beiden next/font-Aufrufen (Inter, Manrope) entfernt; sonst keine TEMPO-fremde Logikänderung an den Fonts. (Die JSON-LD-Ergänzungen in derselben Datei – vatID, contactPoint, SearchAction – stammen aus einem anderen Paket des SEO-Finales, sind faktenbasiert aus `GESELLSCHAFT`/`KONTAKT` und kein Spam.)
- Gerendertes CSS geprüft (`/_next/static/chunks/[root-of-the-server]__*.css`): **„Inter Fallback" mit `size-adjust: 107.12%` und „Manrope Fallback" mit `size-adjust: 103.19%` sind jetzt vorhanden**, inkl. `ascent-override` (90.44 % / 103.31 %) – exakt wie behauptet. `font-family: Inter, Inter Fallback` bzw. `Manrope, Manrope Fallback` greift.
- Letzte Rückfallebene bestätigt: `globals.css` Zeile 24–25 hält `--font-sans: var(--font-inter), system-ui, "Segoe UI", Arial, sans-serif` – nichts verloren.
- **CLS-Nachmessung** (eigenes Replikat mit `tempo-mess.mjs`, 3 Läufe, Median): /dachflaeche-verpachten 1440 → **0,0006**, /energiegemeinschaften 1440 → 0,0002, /de 1440 → 0,000, /dachflaeche-verpachten 390 → 0,000, /energiegemeinschaften 390 → 0,000 (ein Einzellauf zeigte 0,0265 – Compile-Rauschen, saubere 3-Lauf-Wiederholung: 0). Die „Nachher = 0"-Behauptung hält. Die Vorher-Werte sind ohne Revert nicht reproduzierbar, aber der Mechanismus (fehlendes size-adjust bei eigener fallback-Liste) ist belegt und dokumentiertes next/font-Verhalten.

**AVIF (`next.config.mjs`)**
- Diff bestätigt: nur `images: { formats: ["image/avif", "image/webp"] }` ergänzt, Syntax korrekt (Next 15). Wirkt erst nach Server-Neustart/Build – wie im Bericht korrekt als Inhaberpunkt ausgewiesen; Dev-Server wurde regelkonform nicht angefasst.

**Weitere Behauptungen stichprobengeprüft**
- Hero-Bild-Preload: `<link rel="preload" as="image" imageSrcSet=…>` auf /, /de, /ratgeber vorhanden (je 1, die Seiten ohne `<img>` wie /investoren, /energiegemeinschaften, /dachflaeche-verpachten nutzen CSS/SVG-Bühnen – stimmig). `sizes`-Attribute vorhanden (100vw Hero, 50vw/25vw Kacheln), Below-fold `loading="lazy"`.
- `prefers-reduced-motion`: 48 Regeln im gerenderten CSS.
- Totes CSS bestätigt: `@keyframes ov-hero-fortschritt` + Klasse `.ov-hero-fortschritt` (globals.css 373–381) werden in keiner JS-Datei referenziert (grep über src, 0 Treffer). Als Inhaberpunkt belassen (Löschung in gemeinsamer Datei während Parallelarbeit bewusst nicht vorgenommen; Regel „gemeinsame Dateien minimal ergänzen").

### 2. Nichts kaputt – bestätigt
- **`npm test`: 974/974 grün** (selbst ausgeführt).
- **`npm run test:charakterisierung`: 195/195 grün.**
- **`npx eslint src/components/Wurzel/Wurzel.js next.config.mjs`: sauber.**
- **Design unverändert**: Screenshots selbst erstellt und per Read angesehen – /de, /dachflaeche-verpachten, /investoren, /energiegemeinschaften, /ratgeber, jeweils 1440 und 390: Typografie (Inter/Manrope), Hero-Bühnen, Karten, Navigation intakt; kein horizontaler Überlauf (scrollWidth = Viewport), 0 Konsolenfehler auf allen 10 Aufnahmen. Ablage: `C:\Users\SALEAD~1\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekoinvest-Web\3140c08a-2721-4ee9-a47f-9fce6660cd23\scratchpad\tempo-pruef\<seite>\w1440.png / w390.png`
- **Länder-/Sprachfassungen konsistent**: Der Fix liegt in `Wurzel.js`, das von allen drei Root-Layouts ((stamm), (laender)/[land], (en)) genutzt wird; /en und /at gerendert geprüft – identische Font-Variable-Klassen am `<html>`-Tag (`lang="en"`, `lang="de-AT"`).

### 3. Kein Spam – bestätigt
Reine Technik-Änderungen (Fonts, Bildformate); keine Texte, Keywords oder Schema-Bewertungsdaten im TEMPO-Umfang. Keine Zahlenbehauptungen auf der Website geändert.

### Behoben durch den Prüfer
Nichts nachzuziehen – keine Lücken gefunden. (Einzige Kandidatin, das tote CSS, bleibt bewusst Inhaberpunkt, s. o.)

### Offen (Inhaberpunkte, bestätigt)
1. AVIF greift erst nach Neustart/Build; vor Livegang `next build` + Lighthouse auf dem Hosting messen (Dev-Absolutwerte verzerrt – auch bei meinen Läufen LCP 5–37 s durch Erst-Compile).
2. Totes CSS `ov-hero-fortschritt` (globals.css 373–381) löschen oder bei Wiederverwendung auf `transform: scaleX` umstellen.
3. Dev-Server-Instabilität unter Playwright-Last selbst erlebt (mehrfach ERR_CONNECTION_RESET/000, Wächter startete neu) – deckt sich mit dem Bericht, produktionsirrelevant.

### Geprüfte/betroffene Dateien
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\components\Wurzel\Wurzel.js` – Änderung korrekt, bestanden
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\next.config.mjs` – Änderung korrekt, bestanden
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\globals.css` – nur geprüft, nicht geändert

## GEOKI

ERGEBNIS PRÜFUNG PAKET GEOKI – bestanden mit einer behobenen Lücke

**BESTANDEN (Behauptungen nachvollzogen):**

1. **llms.txt** (`C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\public\llms.txt`): Alle behaupteten Welle-3/4-Einträge vorhanden (Gebäudestrom, Parkplatz, Projektkarte+Neutralität, EG-Software-Unterseiten, Ratsvorlage/Widmungskit, Gewerbestrom-Check, Flächenpass, Gebäudestrom-Rechner, Ausschreibungs-Monitor, Fristen, Strompreis-Atlas CH, Gläserner Solarpark mit Beispieldaten-Warnung, Newsroom, Newsletter, Partner-Widgets); Stand-Zeile „Oktober 2026“; /projektboerse/muster-nda wie behauptet NICHT enthalten (0 Treffer); muster-nda ist serverseitig noindex,nofollow bestätigt.
2. **Fakten-Anker in 16 Artikeln:** genau 16 Dateien unter `src/content/ratgeber/` enthalten `/quellen#fakt-…`; alle 9 verwendeten Anker gegen den Live-Export `/quellen/fakten.json` (160 Fakten) geprüft – **kein toter Anker**. Im gerenderten HTML: sichtbares DOM enthält echtes `<a href="/de/quellen#fakt-…">` (1 pro Artikel), 0 rohes Markdown sichtbar (die `](…`-Treffer liegen ausschließlich im Next-RSC-Payload in `<script>`, normal). Länderfassungen bleiben in der Fassung: `/at/quellen#…`, `/ch/quellen#…` bestätigt.
3. **Fakten-Bausteine:** `/de/marktdaten/fristen` 23 Anker-Links „im Faktenregister“, `/en/marktdaten/fristen` 23 × „in the fact register“ (zusammen die behaupteten 46). FaktWert/Quellenzeile-Diffs geprüft – Anker über `ankerFuer()`, keine Hardcodes.
4. **Faktenregister-Hinweis** unter Ratgeber-Quellen (DE+EN, ohne „ß“) rendert korrekt auf allen Stichproben.
5. **robots/indexsteuerung:** robots.txt lokal weiter `Disallow: /` (unangetastet); E5-Inhaberpunkt sauber in `src/lib/indexsteuerung.js` dokumentiert, WISSENSSEITEN unverändert; Dataset-Schema auf /quellen und /marktdaten vorhanden, nichts erfunden.
6. **Nichts kaputt:** `npm test` 974/974 grün; `npm run test:charakterisierung` 195/195 grün; `npx eslint` auf allen 21 Paket-Dateien 0 Fehler. Frische Screenshots 1440+390 von 5 Seiten (Pacht-Artikel, Fristen DE, Fristen EN, AT-Freiflächen-Artikel, PPA-Artikel) mit check.mjs: alle 200, 0 Konsolenfehler, kein horizontaler Überlauf, Design unverändert (mit Read angesehen); Ablage `C:\Users\SALEADMIN\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekoinvest-Web\3140c08a-2721-4ee9-a47f-9fce6660cd23\scratchpad\geoki-pruef\`.
7. **Kein Spam:** je Artikel genau 1 dezenter Anker-Link, Zahlen decken sich mit dem Faktenregister (z. B. 1.500–4.500 €/ha = fakt-de-pacht.freiflaecheProHa), keine Schema-Ergänzungen, kein Keyword-Stuffing.

**BEHOBEN (1 Lücke):**
- `public/llms.txt`, English-Zeile: vier EN-Links zeigten auf 308-Weiterleitungen (/en/contact, /en/investors, /en/project-exchange, /en/sell-your-project). Auf die kanonischen Ziele korrigiert (/en/kontakt, /en/investoren, /en/projektboerse, /en/projektboerse/anbieten) – Canonical-Tags und Umzugstabelle `src/lib/land/umzug.js` bestätigen die Ziele; alle vier liefern jetzt 200. Alle übrigen llms.txt-URLs vollständig durchgetestet: 200.

**OFFEN (Inhaberpunkte, zusätzlich zu den 4 gemeldeten – alle bestätigt):**
1. AT-Artikel `freiflaechen-pv-oesterreich.js` verlinkt die DACH-Spanne auf den DE-Fakt (fakt-de-pacht.freiflaecheProHa, 1.500–4.500) – zur angezeigten Zahl korrekt und ehrlich („im DACH-Raum“), aber im Register existiert ein eigener AT-Fakt (3.000–5.000 €/ha, LK Steiermark), dessen Hinweis „Für AT/CH NICHT verwenden“ für den DE-Fakt gilt. Empfehlung: Satz und Anker im AT-Artikel auf den AT-Fakt umstellen (sichtbare Zahlenänderung → Inhaber-/E6-Freigabe).
2. Kleinigkeit (vorbestehend, nicht GEOKI): /projektboerse/muster-nda rendert zwei robots-Metas („noindex, nofollow“ + „noindex, follow“) – beide noindex, Google nimmt das restriktivere, aber eine Quelle wäre sauberer.

Geänderte Datei dieser Prüfung: `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\public\llms.txt` (EN-Linkziele). Keine weiteren Änderungen; kein Commit (Regel).

