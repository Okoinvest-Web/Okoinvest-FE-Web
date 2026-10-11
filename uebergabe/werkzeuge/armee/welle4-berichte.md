# Welle 4 – Prüfberichte

## NETZ2

**PRÜFBERICHT PAKET NETZ2 (Netzanschluss 2.0) – BESTANDEN, keine Behebungen nötig.**

**1. Funktion – bestanden**
- Alle 7 Fassungen laden mit HTTP 200 und enthalten den Begleiter (`na-begleiter-titel`): `/rechner/netzanschluss`, `/de/…`, `/at/…`, `/ch/…`, `/en/…`, `/en/at/…`, `/en/ch/…`.
- Lead-Kette end-to-end gegen das Demo-Backend geprüft: `POST /api/rechner/bericht` mit `rechner: "netzanschluss"`, Land AT → 200, Double-Opt-in-Hinweis („Bestätigungslink … 48 Stunden"). Fremde Herkunft → 403; fehlender Name → 422; Schritt-ID eines anderen Landes (de-Schritt bei Land CH) → 422 „Schritt und Land passen nicht zusammen" – Validierung greift serverseitig.
- Eigene Playwright-Interaktionsprobe (unabhängig vom Bau-Agenten): Start „0 von 6", nach 2 Haken „2 von 6" und `aria-valuenow=2`, Landwechsel auf Österreich setzt auf „0 von 6" zurück und zeigt das AT-Verfahren (Netzzugangsantrag). Guard für `r.naechster.titel` bei „fertig" ist vorhanden (Ternary in `zusammenfassungNetzanschlussAblauf`).
- Tests: NETZ2-Tests 17/17 grün (inkl. Positivlisten-Test `neuRechnen.test.mjs` 7/7), **npm test gesamt: 929/929 grün**, **test:charakterisierung: 195/195 grün** (an `rechneNetzanschluss()` wurde nichts geändert – bestätigt per Diff).

**2. Zahlen und Recht – bestanden**
- Einzige konkrete Zahl ist die DE-Prüffrist „8 Wochen": zur Laufzeit aus `FREIFLAECHE.netz.pruefWochen` gezogen, belegt im Faktenregister (`src/lib/fakten/daten/de.js`, `freiflaeche.netz.pruefWochen`, Quelle § 8 Abs. 6 EEG). AT/CH nennen keinerlei Fristen oder Kosten, stattdessen offener Hinweis „kein geprüfter Wert"; Selbsttest und Testdatei erzwingen das dauerhaft (`AT/CH: keine Fristangaben je Schritt`).
- Keine Geldwerte im Bericht (`geldwerte: false`), keine Umweltclaims, keine Fremdmarken-Ranglisten – genannte Stellen (E-Control, ElCom, Pronovo, VSE, Clearingstelle EEG|KWKG) sind Behörden/Institutionen als sachliche Verfahrenshinweise. Externe Links (gesetze-im-internet.de, e-control.at, strom.ch) sind reine Verweise mit `rel="noopener noreferrer"`, keine Datenübernahme → keine Lizenzfrage. Kein Tracking/Cookies im Baustein.
- Länder strikt getrennt (eigene Verfahren je Land, Landwechsel setzt den Stand zurück); keine neuen Routen, daher keine noindex-/Sitemap-Änderung nötig.

**3. Design – bestanden**
- Screenshots 1440/390 für `/rechner/netzanschluss`, `/at/…`, `/en/ch/…` plus Element-Aufnahmen des Begleiters (Scratchpad `…\scratchpad\netz2-pruef\`), mit Read gesichtet: bestehende Optik (Rechner-Karten-Stil, ov/sun/navy-Token), Fortschrittsbalken, Status-Plaketten, Ablehnungs-Panel. `scrollWidth=390` bei 390 px → kein Überlauf; 0 Konsolenfehler.

**4. Englisch – bestanden**
- `/en/at/…` SSR-Ausgabe durchsucht: 0 deutsche Reste im Begleiter („Process companion", „Documents for this step", „Grid access application"); EN/CH-Screenshot vollständig englisch, Land Schweiz korrekt vorbelegt. Sprachregister: keine neuen Seiten, bestehender Eintrag genügt.

**5. Lint – bestanden**
- `npx eslint` auf alle 8 geänderten/neuen Dateien: 0 Meldungen.

**Offen (Inhaberpunkte, unverändert aus dem Baubericht, bestätigt):**
1. E6/Rechtsprüfung der Verfahrenstexte DE/AT/CH (vorsichtig formuliert, ungeprüft); das Faktenregister vermerkt zur 8-Wochen-Frist selbst „nicht am Gesetzestext nachgeprüft".
2. AT/CH-Fristen bzw. Kostenspannen erst nach geprüften Fakten-IDs nachziehen.

**Geprüfte Dateien:**
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\rechner\netzanschlussAblauf.js` (+ `.test.mjs`)
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\bericht\netzanschlussAblauf.js` (+ `.test.mjs`)
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\components\Rechner\NetzanschlussBegleiter.js`
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\rechner\netzanschluss\page.js`
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\bericht\neuRechnen.js`, `neuRechnen.test.mjs`, `annahmenbuch.js` (nur eigene Einträge ergänzt)
- Screenshots: `C:\Users\SALEAD~1\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekoinvest-Web\3140c08a-2721-4ee9-a47f-9fce6660cd23\scratchpad\netz2-pruef\`

## GEBAEUDE

Prüfung abgeschlossen. Prüfbericht:

PRÜFBERICHT PAKET GEBAEUDE (Gebäudestrom) – Ergebnis: BESTANDEN mit 1 behobenem Fund

**1. Funktion – bestanden**
- Alle 12 Fassungen laden mit 200: /gebaeudestrom und /rechner/gebaeudestrom jeweils gemeinsam, /de, /at, /ch, /en, /en/at, /en/ch (erster 000-Treffer war nur Kaltkompilierung, Wiederholung 200).
- Gegenrechnung von Hand korrekt: 120 m² ÷ 6 m²/kWp = 20 kWp; 20 × 1 100 × 0,95 = 20 900 kWh; Verbrauch 12 × 2 500 × 0,7 = 21 000 kWh; genutzt 6 922 kWh ≤ a·Verbrauch (7 350); Bilanz genutzt + Überschuss = Erzeugung exakt. Grenzfälle (Dach = 0, Einheiten = 0) liefern Passung „offen“ ohne Absturz; negative Werte sind über UI-Regler und die Grenzen des teilbaren Zustands/der Bericht-Feldregeln nicht erreichbar.
- Lead-Kette end-to-end getestet: POST /api/rechner/bericht mit `rechner: gebaeudestrom`, Land AT → ok, Double-Opt-in-Hinweis; Modell „zev“ auf Land AT → sauber 422 „Modell und Land passen nicht zusammen“; CSRF-Herkunftsprüfung aktiv. Lead-Typ `dach` existiert im Demo-Backend, /kontakt?anliegen=dach lädt.
- Tests: npm test 929/929 grün, npm run test:charakterisierung 195/195 grün, gezielte Tests (rechner-, bericht-, neuRechnen-Positivlisten-Test) 21/21 grün, Selbsttest grün.

**2. Zahlen und Recht – bestanden**
- Keine Geldwerte im gesamten Paket; alle Rechenannahmen kommen aus dem Faktenregister (`gebaeudestrom.*` Klasse C, status zu_pruefen) bzw. bestehenden geprüften Quellen (dach.dacharten, REGIONEN, MIXE/SPEICHER_PLUS). qa/fakten-check.mjs grün.
- Gesetzeszitate plausibel und mit korrekten Original-URLs: § 21 Abs. 3 EEG (gesetze-im-internet eeg_2014/__21), § 42b EnWG, § 16a ElWOG (RIS 20007045), Art. 17–18 EnG (Fedlex cc/2017/762). Alle als zu_pruefen/E6 markiert – korrektes Vorgehen.
- lint:claims: keine Funde in Paketdateien (die 3 Funde liegen in unverändertem Altbestand `src/data/regionen/hessen.js` u. a., nicht dieses Paket). Keine Umweltclaims, keine Fremdmarken, keine externen Datenquellen, keine Cookies/Tracking im Rechner.
- noindex auf allen Fassungen im gerenderten HTML bestätigt, 0 Sitemap-Einträge, nicht in der Navigation (Inhaberpunkt, korrekt).
- „Ihr Land“-Markierung: auf /at sichtbar, auf der gemeinsamen Seite nur im RSC-Payload (aktiv:false), nicht gerendert – korrekt.

**3. Design – bestanden**
- Screenshots 1440/390 aller 6 Fassungen angesehen (Bilder: `…\scratchpad\pruef-gebaeude\` und `…\pruef-gebaeude-fix\`): identische Optik zu Bestandsseiten (Hero, Bühnen, Rechner-Layout, CtaBand), check.mjs fehler=0, keine Überläufe bei 390.

**4. Englisch – 1 Fehler BEHOBEN**
- Fund: Die Ergebnis-Plakette im Rechner zeigte auf EN-Fassungen deutschen Text („Gemeinschaftliche Erzeugungsanlage · § 16a ElWOG“), weil `r.modell.label/sub` (deutsche Lib-Konstanten) statt der übersetzten `t.modelle` genutzt wurden.
- Behoben in `src/components/Rechner/GebaeudestromRechner.js` (modellText aus t.modelle, Fallback auf Lib-Werte). Per Screenshot verifiziert: jetzt „Jointly operated generation plant · § 16a ElWOG“. ESLint sauber, Tests unberührt (Client-Komponente).
- Sonst keine deutschen Reste in den EN-Seiten gefunden; Sprachregister (`src/lib/sprache/seiten.js`) korrekt mit stand/grundlage/pruefer TODO-E6, index:false.

**5. Lint/Register – bestanden**
- ESLint über alle 16 Paketdateien (Seiten, Länder-/EN-Routen, Komponente, Lib, Fakten, Register): 0 Funde.
- Registereinträge konsistent (land/seiten.js, sprache/seiten.js, tools.js TOOLS+TOOLS_EN, neuRechnen.js Positivliste mit geldwerte:false, neuRechnen.test.mjs). `node scripts/landfassungen.mjs --pruefen` grün (78 × 3). Erzeugte Routen folgen exakt dem landSeite()/englisch()-Muster.

**Offen (bestätige die Inhaberpunkte des Bau-Agenten, nichts Neues):**
1. E6-Prüfung aller 7 Fakten (4 Rechtsrahmen, 3 Klasse-C-Annahmen), danach ggf. Geldwerte beziffern und Indexierung/Sitemap/Navigation freischalten.
2. Lead-Typ bleibt `dach` (Flächen-Desk) – eigener Typ „gebaeudestrom“ wäre Eingriff in Routing-Matrix, bewusst offen.
3. Keine Lizenzfragen (keine externen Datenquellen, nur Gesetzes-Fundstellen; Hero-Bild gewerbedach.jpg aus Bestand).
4. Kein Commit (Vorgabe, macht der QM).

**Geänderte Datei (durch Prüfung):** `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\components\Rechner\GebaeudestromRechner.js` (EN-Plakette). Alle übrigen Paketdateien unverändert geprüft.

## PARKPLATZ

**PRÜFBERICHT PAKET PARKPLATZ – bestanden mit 1 behobenem Fehler**

**1. Funktion – bestanden**
- Alle 8 Fassungen liefern 200: `/parkplatz`, `/de`, `/at`, `/ch`, `/en`, `/en/de`, `/en/at`, `/en/ch`.
- Gegenrechnung der Pflicht-Logik (15 Fälle, eigener Durchlauf): NRW 35→nein/36→ja („mehr als“), RLP 49→nein/50→ja („ab“), Saarland öffentlich ohne Schwelle→ja, NI Sanierung 26→ja (§ 32a), SH Sanierung 71→ja, BW Erweiterung→unklar, HH Erweiterung→ja, Brandenburg→aufgehoben, Bayern Bestand→nein, AT/CH→unklar, GEIG § 7/8/10 korrekt (Neubau >6 jeder 3., Sanierung >10 jeder 5., Bestand >20 ein Ladepunkt). Potenzial 100 Stellplätze = 260 kWp = 100 × CARPORT.kwpProStellplatz (2,6) ✓.
- Lead-Kette: `parkplatz` in der Positivliste (`neuRechnen.js`), Vorgangstyp `carport`, `geldwerte: false` (keine Geldwerte in keinem Land bestätigt – grep ohne Fund), Annahmenbuch-Zeilen vorhanden, `BerichtAnfordern` eingebunden.
- Tests: `npm test` **929/929 grün**, `npm run test:charakterisierung` **195/195 grün**, gezielte Läufe parkplatz/bericht/neuRechnen 22/22 grün. (Hinweis: Die Bericht-Tests brauchen den Projekt-Loader `--import ./test/hilfen/registrieren.mjs`; bare `node --test` schlägt am `@/`-Alias fehl – kein Fehler des Pakets.)

**2. Zahlen und Recht – bestanden**
- Alle 16 Bundesland-Regeln (Schwelle, Art ab/mehr als, Umfang, Stichtag, Rechtsgrundlage, Erweiterung/Sanierung) gegen den geprüften Ratgeber `src/content/ratgeber/parkplatz-solarpflicht-bundeslaender.js` abgeglichen: deckungsgleich, inkl. Brandenburg „aufgehoben“, Hessen-Hinweis landeseigen >35, NRW Laubbaum-Alternative. Quellen-URLs identisch mit dem Ratgeber (amtliche Quellen, Stand 09/2026).
- CARPORT-Werte (2,6 kWp/Stellplatz, 25 m²) aus `src/lib/invest/markt.js` – bestehende, im Annahmenbuch als „zu prüfen“ geführte Annahme; Hero-Beispiel (260 kWp / 266 MWh) kommt aus dem bestehenden, charakterisierungsgetesteten `rechneCarport`, als „Beispiel, Süd-DE“ gekennzeichnet.
- Kein Frankreich, keine Fremdmarken, keine Umweltclaims (grep ohne Fund), AT/CH ehrlich „unklar“, keine Geldwerte. `noindex` im HTML aller Fassungen bestätigt; Sitemap enthält nur den bestehenden Ratgeber, nicht `/parkplatz`. Keine externen Datenquellen/Lizenzen, keine neuen Abhängigkeiten, keine Commits.

**3. Design – bestanden**
- Screenshots 1440/390 für `/parkplatz`, `/at/parkplatz`, `/en/parkplatz` angesehen (`…\scratchpad\pruef-parkplatz*`): gleiche Optik wie bestehende Hub-Seiten, kein Überlauf bei 390, AT-Fassung sauber ohne Pflicht-Versprechen (nur Potenzial) – gute Ländertrennung.

**4. Englisch – 1 Fehler gefunden und BEHOBEN**
- **Fehler:** Auf `/en/parkplatz` wurde der „Outlook 2030“-Block im Schnell-Check mit dem deutschen `GMODG_2030.text` gerendert; das verursachte zusätzlich einen React-Hydration-Fehler (von Playwright in jedem Lauf gemeldet).
- **Fix:** `src/components/Parkplatz/SchnellCheck.js` – englische Übersetzung `ausblickText` ins EN-Wörterbuch (inhaltsgleich mit der vom Bau-Agenten geprüften EN-FAQ-Formulierung) und Render `{en ? w.ausblickText : r.gmodg2030.text}`. Danach: 0 Konsolenfehler bei 1440 und 390, DOM-Prüfung bestätigt EN-Text auf `/en/parkplatz` und DE-Text auf `/parkplatz`. `npx eslint` auf die Datei: keine Funde.
- Sonst keine deutschen Reste im sichtbaren EN-Text (programmatischer Abgleich des gerenderten HTML ohne Script-Payloads).

**5. Lint – bestanden:** `npx eslint` auf page.js, SchnellCheck.js, rechner/parkplatz.js, bericht/parkplatz.js: keine Funde.

**Offen (unverändert gültige Inhaberpunkte des Bau-Agenten):** Fachprüfung E6 (dann index/Sitemap), Rechtsabteilung Pflicht-Texte, Menüaufnahme (Sammelpunkt Welle 3), AT/CH-Regeln nachtragen (der geprüfte Ratgeber kennt bereits Kanton Bern Art. 39a–39e KEnG ab 80 Plätzen – Kandidat für die vorbereitete `PFLICHT_REGELN`-Struktur), Flächenannahme 2,6 kWp/Stellplatz im Annahmenbuch.

**Geänderte Datei (durch Prüfung):** `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\components\Parkplatz\SchnellCheck.js`
**Screenshots:** `C:\Users\SALEAD~1\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekoinvest-Web\3140c08a-2721-4ee9-a47f-9fce6660cd23\scratchpad\pruef-parkplatz`, `…\pruef-parkplatz3`

## WIDGETS

**PRÜFBERICHT – Paket WIDGETS (Partner-Widgets): BESTANDEN mit 2 behobenen Funden**

**1. Funktion – bestanden**
- Embed-Routen liefern 200: `/widgets/eg-sparrechner`, `/widgets/fristen` (alle Land/Sprach-Kombinationen geprüft). `?land=de|ch` am Kurzrechner zeigt den ehrlichen Länderhinweis statt Zahlen (DE und EN verifiziert).
- Doku-Seite lädt in allen 6 Fassungen mit 200: `/partner/widgets`, `/de`, `/at`, `/ch`, `/en`, `/en/at`.
- Gegenrechnung Kurzrechner (eigener Node-Lauf): `egKurzRechnen({4500 kWh, haushalt, eeg_lokal})` liefert exakt dieselben Werte wie `rechnerOeffentlich` des großen Rechners (netto 93,96 €, Vorteil 113,96 €, Gebühren 20 €, Quote 37,2 %) – Fassade ohne eigene Rechenlogik bestätigt; Anzeige „≈ € 94" rechnerisch stimmig (33+67+14−20=94).
- Fristen-Ticker AT: Einträge (8.–22.10.2026 Fördercall, 10.12.2026 Gebotstermin, erwartet 31.12.2026) identisch mit `/at/marktdaten/fristen` – gleiche Quelle `fristenFuer`, mit Quelle und Stand, keine Countdowns.
- Lead-Kette: utm-Nachweis live geprüft (`utm_source=stw-muster`, `utm_medium=partner`, `utm_campaign=widget-eg-sparrechner` an allen Links); `herkunftBereinigen` in `src/lib/gruppe/kanal.js` ordnet wirksame Kennungen dem Kanal „Partner" zu, unbekannte fallen auf „Kampagne" – wie behauptet.
- Tests: **npm test 959/959 grün** (zweimal, auch nach meinen Fixes), `npm run test:charakterisierung` 195/195 grün, Widget-Suite isoliert 15/15 grün.

**2. Zahlen, Recht, Datenschutz – bestanden**
- Keine Umweltclaims, keine Fremdmarken, keine erfundenen Zahlen; alle Ticker-Werte aus dem Faktenregister mit Quelle und Stand.
- DSGVO: Widget-HTML enthält **0 `<script>`**, kein `Set-Cookie`, eigene CSP `default-src 'none'; … frame-ancestors *` live bestätigt; `X-Robots-Tag: noindex` auf Widget-Routen; übrige Seiten unverändert (`X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`).
- Doku-Seite: `<meta name="robots" content="noindex">`, nicht in sitemap.xml (0 Treffer), Register `index: false` in beiden Registern.
- Partner-Parameter wird escaped bzw. nur als geprüfter Slug durchgereicht – kein Reflected-XSS-Vektor.

**3. Design – bestanden**
- Eigene Screenshots 1440+390 (7 Pfade, `…\scratchpad\pruef-widgets\`): 0 Konsolenfehler, keine Überläufe bei 390; Doku-Seite nutzt die bestehende Optik (Section/SectionHeading/Reveal/CtaBand), Widgets mit Marken-Tokens.

**4. Englisch – 1 Fehler gefunden und behoben**
- **Behoben (Fund 1):** `/en/partner/widgets` lieferte deutsche `og:title`/`og:description`, weil `metadataEn` keinen `openGraph`-Block hatte (Konvention vgl. `rechnerMetadataEn`). Fix in `src/app/(stamm)/partner/widgets/page.js`; live verifiziert: og-Texte jetzt englisch.
- Sonst keine deutschen Reste im EN-Body; „Regelstand"-Text bewusst deutsch (amtliche Begriffe, dokumentiert) – akzeptiert.

**5. Behoben (Fund 2, Funktion/UX):** Auf den Länderfassungen der Doku-Seite (`/at`, `/ch`) zeigten Live-Vorschau und Embed-Snippet des Fristen-Tickers immer `land=de`. Fix: Seite nutzt jetzt das Land der Fassung, wenn das Widget es kann (`/at` → `land=at`, `/ch` → `land=ch`, `/en/at` → `land=at&sprache=en` – live verifiziert); gemeinsame Seite weiterhin `de`. eslint auf der Datei: 0 Funde.

**eslint** auf allen Paket-Dateien (lib/widgets, app/widgets, PartnerWidgets, next.config.mjs, beide Register, alle page.js-Fassungen): 0 Funde.

**Geänderte Datei (meine Fixes):** `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\partner\widgets\page.js` (EN-openGraph; länderbewusste Vorschau/Snippet)

**Offen (bestätigte Inhaberpunkte des Bau-Agenten, korrekt dokumentiert):**
1. `frame-ancestors`-Standard `*` – vor Go-live ggf. Positivliste über `WIDGET_FRAME_ANCESTORS` (auf /partner/widgets dokumentiert, TODO-Inhaber im Code).
2. Partner-Register enthält nur Entwurfs-Kennungen; echte Kennungen nach E9.
3. Rechtsabteilung: Einbettungsbedingungen; Seite bleibt noindex bis E6 (Register-Eintrag `pruefer: "TODO-E6"` vorhanden).
4. Kurzrechner nur AT – korrekt umgesetzt (ehrlicher Hinweis statt Zahlen für DE/CH).

Keine Commits, keine neuen Abhängigkeiten, Dev-Server läuft weiter.

## GLAESERN

**Prüfbericht Paket GLAESERN (Gläserner Solarpark) – BESTANDEN, 1 Fehler behoben**

**1. Funktion – bestanden**
- Alle Fassungen laden mit 200: `/projekte/glaeserner-solarpark`, `/de/…`, `/at/…`, `/ch/…`, `/en/…`, `/en/at/…`, `/en/ch/…`.
- Routen-Wrapper exakt nach Muster (`landSeite()`, `englisch()`, generiert per landfassungen.mjs); Registereinträge in `src/lib/land/seiten.js` und `src/lib/sprache/seiten.js` vorhanden, beide `index: false`.
- Lead-Kette: `AuswahlAnfrage typ="kontakt"` → Smoke-POST an `/api/anfrage` erreicht Herkunftsprüfung und Validierung; `kontakt` ist gültiger `LEAD_TYPEN`-Typ (Fallback in `src/lib/anfrage/routing.js:29`). Telefon optional, nur bei Rückrufwunsch.
- Tests: Paket-Tests 6/6 grün, `npm test` komplett **959/959 grün**, `npm run test:charakterisierung` **195/195 grün** (Rechenlogik bestehender Rechner unangetastet).

**2. Zahlen und Recht – bestanden (eigene Gegenrechnung)**
- Alle Beispielwerte gegen das Faktenregister nachgerechnet: Ertrag 1.100 kWh/kWp·a (`region.de-sued.ertrag`, de.js:394), 1,1 ha/MWp, Pacht {1500/2800/4500} €/ha·a, Laufzeit 30 a, Indexierung 1,5 %, § 6 EEG 0,2 ct/kWh (Status „geprueft“, Klasse A). Abgeleitet: 10,8 ha ✓, 10.780 MWh/a ✓, Pacht ≈ 30.240 €/a ✓, Gemeinde ≈ 21.560 €/a ✓ – alle auf der Seite korrekt gerendert.
- § 6-EEG-Formulierung korrekt („bis zu 0,2 ct … kann zahlen“, freiwillig). Keine Umweltclaims (claim-lint auf alle 3 Kerndateien: 0 Fehler, 0 Hinweise), Maßnahmenliste neutral, keine Fremdmarken, kein Social Proof, Demo überall gekennzeichnet („Demo-Modell“, Entwurfs-Badge), FAQ ohne Schema.
- Ländertrennung: /at und /en/at zeigen statt DE-Pacht/Gemeinde-Zahlen den LandHinweis („Pachtwerte für Österreich werden geprüft…“, englisch „Lease rates for Austria are being reviewed…“); DE-Eurobeträge auf /at nicht vorhanden (grep = 0). noindex auf gemeinsamer und EN-Fassung bestätigt, Seite nicht in sitemap.xml. Keine externen Datenquellen/Lizenzen im Paket, keine Cookies/Tracking in der Demo-Ansicht (reines deterministisches Client-Modell, kein Fetch).
- Demo-Modell geprüft: deterministisch, nachts 0, nie über kWp (Testabdeckung vorhanden).

**3. Design – bestanden**
- Screenshots 1440/390 für DE, AT, EN plus /at#pacht bei 390 angesehen: gleiche Optik wie Bestand (SeitenHero, Faktenleiste, Zeitleiste, Karten), Entwurfs-Badge und Demo-Panel sichtbar, kein Überlauf bei 390, 0 Konsolenfehler.

**4. Englisch – 1 Fehler gefunden und BEHOBEN**
- Defekt: EN-Metadaten hatten 5 Keywords, DE 6 – beim Merge blieb das sechste deutsche Keyword „Solarpark Anwohner Fragen“ in der EN-Seite stehen. Fix: sechstes EN-Keyword „open-book solar park“ ergänzt in `src/app/(stamm)/projekte/glaeserner-solarpark/page.js` (Zeile 61). Nachgeprüft: EN-Keywords jetzt rein englisch, sichtbarer EN-Text ohne deutsche Reste (Wortscan „EN sauber“).

**5. Lint – bestanden**
- `npx eslint` auf alle 8 Paketdateien (lib, Komponente, 4 Seiten, beide Register): 0 Funde, auch nach dem Fix.

**Offen (bestätigte Inhaberpunkte des Bau-Agenten, nichts Neues):** echte Parkdaten/erster echter Park, Fachprüfung E6 vor Indexierung/Menüaufnahme, ggf. Lead-Routing Eigentümer als `flaeche`, AT/CH-Pacht- und Gemeindewerte erst nach Prüfung, Fotos/Bildlizenzen fürs echte Bautagebuch.

**Geänderte Datei (Prüfer-Fix):**
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\projekte\glaeserner-solarpark\page.js` (EN-Keyword ergänzt)

**Geprüfte Paketdateien:** `src/lib/projekte/glaesernerPark.js`, `src/lib/projekte/glaesernerPark.test.mjs`, `src/components/Projekte/ParkLiveDemo.js`, `src/app/(stamm)/projekte/glaeserner-solarpark/page.js`, `src/app/(laender)/[land]/projekte/glaeserner-solarpark/page.js`, `src/app/(en)/en/projekte/glaeserner-solarpark/page.js`, `src/app/(en)/en/[land]/projekte/glaeserner-solarpark/page.js`, `src/lib/land/seiten.js`, `src/lib/sprache/seiten.js`.

## FAKTEN

**PRÜFBERICHT – Paket FAKTEN (Fakten-Suche /quellen): BESTANDEN, keine Behebungen nötig.**

**Funktion (bestanden)**
- Alle Fassungen live geprüft: /quellen, /de, /at, /ch, /en, /en/at/quellen sowie /quellen/fakten.csv und /quellen/fakten.json → alle 200.
- Gegenrechnung am echten Register (eigener Node-Lauf): 156 Karten aus 159 Fakten (Versionen je id+land korrekt zusammengefasst), Länder DE/AT/CH/DACH vorhanden, 0 Einträge ohne Quelle/Abruf/Prüfer, alle Themen haben Anzeigenamen (kein roher Schlüssel im Filter), 0 abgelaufene Werte am Stichtag – Kopfzeile „159 Fakten · 43 geprüft · 116 in Prüfung“ stimmt rechnerisch (43+116=159).
- Anker im gerenderten HTML vorhanden und stabil (`id="fakt-de-pacht…"`), Karten ungefiltert gerendert → Browser-Sprung auf #fakt-… funktioniert.
- Keine Leads nötig (reine Dokumentations-/Zitierseite, auftragskonform), keine Rechenlogik.
- Tests: `npm test` 959 grün, `npm run test:charakterisierung` 195 grün, `npx eslint` auf alle Paketdateien sauber.

**Zahlen und Recht (bestanden)**
- Keine eigenen Zahlen: jede Zahl kommt unverändert aus `src/lib/fakten` mit Quelle, Abrufdatum, Prüfer, Klasse, Gültigkeit. Entwürfe nachweislich ausgeschlossen (Test + Live).
- Börsendaten im Export geprüft: `boerse.dayAhead.*` stammen aus SMARD/Bundesnetzagentur (CC BY 4.0 laut Notiz, Filter 4169) – **keine EEX/EPEX-Daten**, Regel eingehalten; die SMARD-Namensnennung reist in der Notiz-Spalte des CSV mit.
- noindex bestätigt: `<meta name="robots" content="noindex, follow">` auf DE und EN; `index: false` in `src/lib/land/seiten.js` und `src/lib/sprache/seiten.js`; Sitemap schließt über `indexierbar()` aus. Keine Umweltclaims, keine Fremdmarken-Rankings, Länder getrennt (Land-Filter + Land-Badge je Karte).
- CSV: BOM + Semikolon + RFC-4180-Quoting live verifiziert; Lizenzspalte und `Link: rel="license"`-Header vorhanden. JSON mit Lizenzblock, Stand, Zitier-URL je Fakt.

**Design (bestanden)**
- Screenshots 1440/390 für /quellen, /en/quellen, /at/quellen aufgenommen und angesehen (`…\scratchpad\pruef-quellen\`): gleiche Optik wie Bestandsseiten (Sand-Hero, Eyebrow, Breadcrumbs), keine Überläufe bei 390, check.mjs meldet 0 Konsolenfehler.

**Englisch (bestanden)**
- EN-Fassung vollständig (Kopf, Filter, Karten-Labels „Reviewer“, Badges); kein „Prüfer:“-Rest im EN-HTML. EN-Hinweis, dass die Fakten selbst deutsch bleiben, steht auf der Seite. Sprachregister-Eintrag vorhanden.
- Breadcrumbs/Links land- und sprachbewusst (Land-Link); die Export-Links zeigen bewusst auf die einzige Export-Route /quellen/fakten.{csv,json} – korrekt.

**Offen (Inhaberpunkte, bestätigt, nicht behebbar durch mich)**
1. Indexierung erst nach E6-Prüfung (116/159 „Prüfung ausstehend“) – noindex korrekt gesetzt.
2. Lizenzentscheidung CC BY 4.0 für die Zusammenstellung durch Rechtsabteilung bestätigen; SMARD-Weitergabe ist CC-BY-kompatibel, Hinweis auf fortgeltende Primärquellen-Bedingungen steht auf Seite und in beiden Exporten.
3. Prüfer-Feld „TODO-E6“ bis zur Benennung der Zweitprüfperson.

**Geprüfte Dateien:** `src/app/(stamm)/quellen/page.js`, `src/app/(stamm)/quellen/fakten.csv/route.js`, `src/app/(stamm)/quellen/fakten.json/route.js`, `src/app/(laender)/[land]/quellen/page.js`, `src/app/(en)/en/quellen/page.js`, `src/app/(en)/en/[land]/quellen/page.js`, `src/components/Quellen/FaktenSuche.js`, `src/lib/quellen/fakten.js`, `src/lib/quellen/filter.js`, `src/lib/quellen/fakten.test.mjs`, `src/lib/land/seiten.js`, `src/lib/sprache/seiten.js`, `public/llms.txt`. Keine Commits, keine neuen Abhängigkeiten, Dev-Server läuft weiter.

## CHATLAS

Alle Prüfungen abgeschlossen. Prüfbericht:

## Prüfbericht Paket CHATLAS – bestanden, keine Fehler gefunden

### 1. Lizenz (selbst am Original nachgeprüft, 11.10.2026)
- **CKAN-Metadaten beider Datensätze** (median-strompreis-per-kanton, strompreis-per-stromnetzbetreiber) über ckan.opendata.swiss abgerufen: Feld `rights = "https://opendata.swiss/terms-of-use#terms_open"` – **bestätigt** für beide.
- **Wortlaut** der Kategorie „Open use" auf https://opendata.swiss/en/terms-of-use selbst gelesen: stimmt **Zeichen für Zeichen** mit dem Zitat in `src/data/strompreisatlasCh.js` und auf der Seite überein. Kommerzielle Nutzung erlaubt, Quellenangabe nur empfohlen (wird trotzdem durchgängig gemacht). Wichtig: Es ist die uneingeschränkte „Open use"-Variante, **nicht** eine der Varianten mit Genehmigungspflicht – korrekt zitiert, keine Verwechslung.

### 2. Zahlen (unabhängige Stichproben gegen LINDAS-SPARQL, amtlicher Endpunkt)
Vier unabhängige Abfragen gegen lindas.admin.ch, alle **exakt** identisch mit der Datendatei:
- Kanton ZH H4 2026: 24.758 / 12.112 / 9.397 / 0.16 / 2.3 ✓
- Kanton BS C3 2026: 32.427 / 9.393 / 13.571 / 6.977 / 2.3 ✓
- Kanton JU H4 2027: 25.791 / 7.967 / 11.913 / 1.7 / 2.3 ✓
- Stadt Bern (ewb) H4 2027: 31.113 / 10.75 / 13.45 / 2.8 / 2.3 ✓
- Eigene Gegenrechnung der Seitendarstellung: Spannweiten 2027 (H4: ZG 21.146 → BS 33.42; C3: NW 18.914 → BS 32.597) und Vorjahres-Delta (AG H4: 26.883−27.73 = −0.85) stimmen mit der gerenderten Seite überein.

### 3. Funktion
- Alle Fassungen laden mit 200: gemeinsam, /de, /at, /ch, /en, /en/at, /en/ch, plus daten.csv und daten.json.
- CSV: 139 Zeilen (Kopf + 104 Kantone + 34 Städte), BOM, CC-BY-License-Header; JSON enthält Lizenz, Quellen, Abrufdatum.
- Lead-Formular: exakt das Bestandsmuster der Seite /marktdaten/ausschreibungen (AnfrageFormular typ="kontakt", Telefon nur bei Rückrufwunsch) – kein Bericht-Baustein nötig, Positivliste nicht betroffen.
- `npm test`: **974 Tests grün** (inkl. 8 Atlas-Tests mit Lizenz-Absicherung); `npm run test:charakterisierung`: **195 grün**; `npx eslint` auf allen 12 Paket-Dateien: **0 Befunde**.

### 4. Recht und Vorgaben
- noindex aktiv (`<meta name="robots" content="noindex, follow">`), **nicht in der Sitemap** (0 Treffer), Register-Einträge mit `index: false`.
- Keine Anbieter-Rangliste (Tabellen alphabetisch), keine Umweltclaims, keine Fremdmarken-Vergleiche (Netzbetreibernamen sind amtliche Datenbestandteile, zulässig), CH-Daten klar als nur-CH gekennzeichnet, Disclaimer vorhanden. Keine Cookies/kein Tracking auf der Seite.

### 5. Design und Englisch
- Screenshots 1440/390 (Hero + Atlas-Abschnitt, DE + EN) angesehen: Optik identisch mit Bestandsseiten (Section/Eyebrow/Reveal-Bausteine), **keine Überläufe bei 390** (breite=390, 0 Konsolenfehler), Tabellen scrollbar mit aria-Hinweis.
- EN-Fassung: automatische Textprüfung auf 11 deutsche Signalwörter im Seitentext – **keine deutschen Reste**; Sprachregister-Eintrag korrekt.

### Behoben
Nichts – keine Fehler gefunden.

### Offen (vom Bau-Agenten korrekt dokumentiert, bestätigt)
1. Zweitprüfung E6 vor Indexfreigabe (`index: false` in `src/lib/land/seiten.js` Z. 108 und `src/lib/sprache/seiten.js` Z. 166 dann entfernen).
2. CKW Luzern 2027 fehlt in LINDAS (Quelle hat ihn tatsächlich nicht veröffentlicht – korrekt nicht geschätzt).
3. Jährlicher Datenauszug ab Ende August (Anleitung im Datei-Kopf).

### Geprüfte Dateien
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\data\strompreisatlasCh.js`
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\lib\marktdaten\strompreisatlasCh.js` + `.test.mjs`
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\components\Marktdaten\StrompreisAtlasCh.js`
- `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\marktdaten\strompreise-schweiz\page.js` + `daten.csv\route.js` + `daten.json\route.js`
- Landes-/EN-Wrapper unter `src\app\(laender)\[land]\…`, `src\app\(en)\en\…`, `src\app\(en)\en\[land]\…`
- Register `src\lib\land\seiten.js`, `src\lib\sprache\seiten.js`
- Screenshots: `C:\Users\SALEAD~1\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekoinvest-Web\3140c08a-2721-4ee9-a47f-9fce6660cd23\scratchpad\chatlas` und `…\chatlas2`

## ATSNE

PRÜFBERICHT Paket ATSNE (AT-Gewerbestrom, Vorbereitung SNE-VO 2027) – **bestanden mit einer Behebung**

**1. Funktion – bestanden**
- Alle Fassungen laden mit 200: `/rechner/gewerbestrom-check`, `/de/...`, `/at/...`, `/ch/...`, `/en/...`, `/en/at/...`
- AT zeigt die Vorbereitungs-Maske (Netzebene, Jahresverbrauch, Leistung) und den LandHinweis mit Zeitplan „erwartet Q1 2027“; CH bleibt korrekt beim Hinweis; DE rechnet unverändert.
- Gegenrechnung der Logik (`src/lib/rechner/gewerbestromAt.js`): 250.000 kWh ÷ 100 kW = 2.500 h korrekt; > 8.760 h → unplausibel; Leistung 0 → keine Kennzahl. Klammerung und Standardwerte sauber.
- Lead-Kette: Erinnerung läuft über den bestehenden `NewsletterAnmeldung`-Baustein (Double-Opt-in, Quelle `gewerbestrom-at` in der Positivliste von `src/lib/newsletter/dienst.js`).
- Tests: `npm test` grün (974/974, inkl. 7 ATSNE-Tests), `npm run test:charakterisierung` grün (195/195), `node qa/fakten-check.mjs` GRÜN (163 Fakten, 0 Vertragsfehler).

**2. Zahlen und Recht – bestanden**
- Einziger Zahlenwert: Elektrizitätsabgabe 1,5 ct/kWh = Regelsatz § 4 Abs. 2 ElAbgG („0,015 Euro je kWh“) – deckt sich mit der Rechtslage; Sondersätze bewusst nicht erfasst (dokumentiert). EAG-Förderbeitrag korrekt `wert: null`/`zu_pruefen`. Keine geschätzten Entgelte, nirgends. Netzebenen 1–7 (§ 63 ElWOG 2010) und Entgeltstruktur §§ 5–10 SNE-V 2018 stimmen. Nur RIS-/amtliche Quellen, keine Lizenzfragen, keine Umweltclaims, keine Fremddaten. noindex aktiv (`land/seiten.js` und `sprache/seiten.js` je `index: false`).

**3. BEHOBEN (von mir):** Auf `/at` und `/en/at` beschrieben Hero-Lead, Chips und die JSON-LD-Funktionsliste noch den DE-Rechner (SMARD, Stromsteuer, Konzessionsabgabe) – Verstoß gegen die Ländertrennung. Fix in `src/app/(stamm)/rechner/gewerbestrom-check/page.js`: neuer Block `AT_KOPF` (de/en) mit AT-eigenem Lead, Chips und App-Beschreibung; auf AT werden diese statt der DE-Texte gerendert. Nachgeprüft: 0 SMARD/Stromsteuer-Treffer im AT-HTML, DE-Fassung unverändert, ESLint sauber, erneute Screenshots 1440/390 ohne Überlauf, 0 Konsolenfehler.

**4. Design – bestanden:** Screenshots 1440/390 für `/at/...` und `/en/at/...` angesehen (Scratchpad `atsne-pruef`, `atsne-pruef2`): gleiche Optik wie bestehende Rechnerseiten, keine Überläufe bei 390.

**5. Englisch – bestanden:** Keine deutschen Reste in `/en/at/...` (geprüft auf Netzebene/Jahresverbrauch/etc. – 0 Treffer); Paragraphen-Zitate („§ 5 SNE-V 2018“) bleiben als Rechtszitat bewusst stehen. Sprachregister-Eintrag vorhanden.

**Offen (Inhaberpunkte, unverändert bzw. neu):**
- EAG-Jahressatz und befristete ElAbgG-Sondersätze: erst nach RIS-Prüfung erfassen (so dokumentiert, `scripts/at-sne-nachtrag.md`).
- Zweitprüfung E6 für die neuen Klasse-A-Fakten (`TODO-E6`).
- NEU, klein: Meta-Description auf `/at` trägt noch die DE-Rechner-Beschreibung (`seitenMetadata` kennt kein land-abhängiges EN-Wörterbuch; Seite ist noindex, daher nicht kritisch – bei Indexfreigabe mit beheben).
- E-Control-Konsultations-PDF in `QUELLEN_AT` (Zeitplan-Quelle) konnte ich offline nicht am Original nachprüfen.

**Geänderte Datei (durch Prüfung):** `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\rechner\gewerbestrom-check\page.js`
**Geprüfte Paketdateien:** `src/lib/fakten/daten/gewerbestrom-at.js`, `src/lib/rechner/gewerbestromAt.js(+.test.mjs)`, `src/components/Rechner/GewerbestromCheckAT.js`, `src/components/Rechner/tools.js`, `src/lib/newsletter/dienst.js`, `src/lib/fakten/index.js`, `scripts/at-sne-nachtrag.md`

