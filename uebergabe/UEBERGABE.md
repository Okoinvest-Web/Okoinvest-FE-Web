# Übergabe: Stand der Arbeit (für Claude auf dem neuen Rechner)

Stand: 04.10.2026. Erstellt auf dem alten Rechner (8 GB RAM) für den Umzug auf den neuen Rechner (96 GB RAM).
Diese Datei ist das Gedächtnis der bisherigen Sitzung. Vor jeder Arbeit vollständig lesen.

## 1. Was liegt wo

| Pfad | Inhalt |
|---|---|
| `uebergabe/chatverlauf/CHATVERLAUF.md` | Lesbarer Chatverlauf (Inhaber ↔ Claude), ohne Werkzeug-Interna |
| `uebergabe/chatverlauf/sitzung-roh.jsonl` | Rohes Sitzungsprotokoll (nicht in Git, reist nur mit, wenn der ganze Ordner kopiert wird) |
| `uebergabe/gedaechtnis/` | Gedächtnis-Dateien (Auftragsbuch, Recht am Ende, Browser-Screenshots) |
| `uebergabe/werkzeuge/` | Playwright-Prüfwerkzeuge (`shot.mjs`, `film.mjs`, `check.mjs`, `txt.mjs` …), lagen auf dem alten Rechner unter `~/claude-browser/` |
| `uebergabe/werkzeuge/armee/` | Agenten-Armee: Dashboard, Dev-Server-Wächter, Roster, Posteingang des Inhabers, Auftragsbuch, Dossiers, Expertenberichte |
| `uebergabe/workflows/laendermodell.workflow.js` | Workflow-Skript für den Umbau des Ländermodells (zuletzt laufend) |
| `docs/MASTERPLAN-DACH.md` | Masterplan: Burggräben, Wellen 0–4, Pakete, Ländermodell (Abschnitt 4), Lead-System (Abschnitt 5) |
| `docs/strang-r/` | Rechtstext-Entwürfe (nicht freigegeben, noindex) |

## 2. Einrichtung auf dem neuen Rechner

1. Projekt `npm install`, Dev-Server `npm run dev` (Port 3100).
2. Werkzeuge: `uebergabe/werkzeuge/` nach `~/claude-browser/` kopieren, dort `npm install` und `npx playwright install chromium`.
3. In `armee/waechter.mjs`, `armee/dashboard.mjs`, `armee/sichere-ergebnisse.mjs` und `commits-welle1.mjs` die fest eingetragenen Pfade (`C:\Users\SALEADMIN\…`) an den neuen Rechner anpassen.
4. Gedächtnis: Dateien aus `uebergabe/gedaechtnis/` in den Memory-Ordner von Claude Code kopieren (`~/.claude/projects/<projektordner>/memory/`).
5. Mit 96 GB RAM: Parallelität in Workflows von LIMIT 3 auf etwa 10–12 erhöhen; `next build` ist dort erlaubt.
6. In Git Bash bei Pfad-Argumenten `MSYS_NO_PATHCONV=1` setzen; bei `tar` mit Laufwerksbuchstaben `--force-local`.

## 3. Projekt in Kürze

- ÖkoInvest GmbH, Gewerbegebiet 10, 5121 Ostermiething (AT). FN 541505g, LG Ried im Innkreis, UID ATU76000505.
- Geschäftsführer Andreas Wegscheider und Manuel Thaler, beide alleinvertretungsberechtigt.
- Gesellschafter: AW Holding GmbH 25,80 %, PV GmbH 25,80 %, Photonos GmbH 25,80 %, Ökovolt Solartechnik GmbH 22,60 %.
- Kontakt +43 6278 71030, office@oekoinvest.com. Alles zentral in `src/data/site.js`.
- Stack: Next.js 15 (App Router), React 19, Tailwind v4, Turbopack. Backend Frappe/ERPNext unter `Backend-Import/oekoinvest_app`, Demo-Backend `src/lib/plattform/backend/demo`.
- Ziel des Inhabers: die stärkste Energie-/PV-Plattform im DACH-Raum („Unicorn“). Leads und Registrierungen sind das Kernziel.
- Hinweis: Die `CLAUDE.md` im Ordner `Downloads` (ÖKOVOLT NetOps) betrifft ein anderes Projekt und gilt hier nicht.

## 4. Verbindliche Entscheidungen des Inhabers

- **Domain:** oekoinvest.com (der Inhaber muss sie noch kaufen; sie ist bei HugeDomains gelistet).
- **Ländermodell (wichtigste Vorgabe, Zitat: „sonst machst mir alles kaputt was wir gemacht haben“):**
  - EINE Website: eine Hauptseite und dieselben Unterseiten in IDENTISCHEM Design wie vor Welle 2 (Design-Referenz: Commit `9377811`).
  - Das Land wird in der Top-Bar (DE · AT · CH) gewählt oder kommt aus der URL (`/de`, `/at`, `/ch` …). Dann zeigt die ganze Seite die Inhalte dieses Landes (Recht, Zahlen, Rechner, Begriffe, Währung), sieht aber gleich aus.
  - Die Wahl bleibt gespeichert (Cookie erst nach aktiver Wahl). Ohne Wahl gilt die gemeinsame Seite wie bisher. Keine Zwangsweiterleitung per Geo.
  - Sprache genauso: einmal EN gewählt → alle Seiten englisch.
  - Keine eigenen Länder-Übersichtsseiten, keine 404 auf AT/CH-Unterseiten.
  - URLs: `/de/…`, `/at/…`, `/ch/…`, englisch `/en/…`, `/en/at/…` usw. mit denselben Seitenpfaden; alte Adressen per 308 ohne Ketten.
  - Nicht übersetzte Seiten: deutscher Text mit Hinweis „not yet available in English“ und noindex.
  - Gemeinsame Seite ohne Länderwahl: deutsche Werte dezent mit „gilt für Deutschland“ markieren.
  - Ungeprüfte AT/CH-Zahlen nicht anzeigen, stattdessen ein Länderhinweis.
  - SEO: hreflang de-DE/de-AT/de-CH/en plus x-default, kanonische URLs je Land.
- **DE, AT und CH strikt getrennt** in Zahlen, Recht und Rechnern.
- **Recht:** Rechtliche Angaben direkt einarbeiten; die Rechtsabteilung prüft die fertige Website gesamthaft.
- **Commits** darf Claude anlegen (deutsche Titel, Trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). Push und Remote macht der Inhaber.
- **Reihenfolge (Auftragsbuch):** Masterplan → Website-Wellen 1–4 → danach SOFORT die Plattform-Armee (siehe `werkzeuge/armee/auftragsbuch.md`).
- **Rechner sollen Leads erzeugen:** PDF-Bericht gegen Name, E-Mail und Telefon (mit Einwilligungsprotokoll). Gewerbestrom-Preisradar je Bundesland.
- **Finanzierung/FMA:** Beteiligungsfunktion (Nachrangdarlehen/Tokenisierung) muss abschaltbar sein; ausgeschaltet nirgends sichtbar. Rechtssicherer Weg über lizenzierten ECSP-Partner; keine eigenen Anlageangebote ohne Prüfung.

## 5. Feste Regeln

- Keine Geheimnisse ins Repo, keine Produktivdaten. Restore- und Angriffstests nur lokal gegen das Demo-Backend.
- Kein Scraping gegen Nutzungsbedingungen, keine Markenrechtsverstöße, kein erfundener Social Proof, keine Dark Patterns.
- Agenten beenden den Dev-Server nicht. Nach größeren Umbauten `npm run verify` (Tests, Selbsttest, Claim-Lint, axe, Funnel-E2E) ausführen; das muss grün sein.
- Visuelle Prüfung jeder Änderung mit Playwright-Screenshots (Desktop und Mobil).
- Turbopack-Fehler „Module not found … turbopack/internal/font/google“ → Server beenden, `.next` löschen, neu starten.

## 6. Git-Stand

- Welle 1 abgeschlossen und committet (`2147552` … `9377811`). **`9377811` = Design-Referenz.**
- `f4ae38a` = Zwischenstand Welle 2 (Faktenregister, Länder-Engine, Lead-Kette, Bericht-Baustein, Fristen 2027, erste Fassung Länderrouting mit bekannten Fehlern).
- **Ländermodell fertig und committet (09.10.2026):** `721c220` (Ländermodell), `408b6b0` (Sprachmodell EN), `47886d0` (Länderinhalte AT/CH und Übersetzungen). QM-Abnahme bestanden, `npm run verify` grün.
- Offene QM-Punkte für den Inhaber: Beispielrechnungen mit DE-Werten auf AT/CH (gekennzeichnet; reicht das oder ausblenden?), vier AT-Seiten noch nicht zur Indexierung freigegeben (zweite Prüfperson E6), Schweizer Schreibweise ohne „ß“ in gemeinsamen Teilen, DE-Recht im Fließtext einiger AT/CH-Seiten, „gilt für Deutschland“ im Fließtext, 404-Seiten unter /en/at und /at, `src/app/api/land/route.js` (nur 410) kann weg.

## 7. Abgeschlossener Arbeitsschritt (zur Einordnung)

Workflow „Ländermodell“ (`uebergabe/workflows/laendermodell.workflow.js`), Phasen:
1. Länder-Architekt: Rückbau der falschen Länder-Hubs aus Welle 2, einheitliche Seiten, Land über Top-Bar/URL/Cookie. **Lief zum Zeitpunkt der Übergabe.**
2. Drei Inhaltsteams: AT-1, CH-1, AT/CH-2 tragen Länderinhalte in dieselben Seiten ein.
3. Sprach-Architekt EN plus drei Übersetzer.
4. QM inkl. Abnahme von Welle 2, Commit-Vorschlag als JSON.

Alle vier Phasen sind abgeschlossen und committet (siehe Abschnitt 6).

**Welle 3 ABGESCHLOSSEN und committet am 10.10.2026** (11 Commits `c801fea` … `bf12ce4`): QM-Abnahme grün (`qa/out/verify-2026-10-10T16-43-29.json`, 834 Tests, 195 Charakterisierung, 27 E2E). 12 neue Seiten, alle noindex bis zur fachlichen Freigabe (E6): /rechner/gewerbestrom-check, /rechner/flaechenpass, /marktdaten/ausschreibungen, /energiegemeinschaften/software/preise + /wechsel-check + /white-label, /kommunen/ratsvorlage + /widmungskit, /projektboerse/neutralitaet + /muster-nda, /newsletter, /newsroom. Offene Inhaberpunkte: siehe Abnahmeprotokoll `werkzeuge/armee/welle3-abnahme.md` (A: E6 benennen, Rechtsabteilung NDA/Beschlussmuster/Newsletter-Texte/Karten-Datenschutz, B7-Preise eintragen, Newsletter-Versanddienst; B: B5-Aufschlag, Sachsen-Wert, BNetzA-Rückfrage, CH-Ertragswert; C: Berichtsseite ohne CH-Schreibweise, Menüaufnahme, Pressekontakt, Demo-Testdaten). **Nächster Schritt laut Auftragsbuch: Plattform-Armee, danach Welle 4.** Plattform-Armee ABGESCHLOSSEN am 11.10.2026 (23 Agenten, alle 11 Pakete + Prüfer + QM): Abnahme GRÜN (`qa/out/verify-2026-10-11T00-33-16.json`, 888 Tests, Sicherheitssuiten 118+20, Python-Stubs 369, Rechte-Parität JS=Python über 40 Bereiche). 8 Commits `aeabd99` … `a015529` (Sicherheit/Kontosperre, Rechte, API-Register, Datenqualität+Indizes, Backup+Notfallkonzept, Closing/Bieterverfahren, Barrierefreiheit Portal mit axe-Gate je Rolle, Newsletter-Backoffice mit DSGVO-Export). Abnahmeprotokoll: `werkzeuge/armee/plattform-abnahme.md`, Paketberichte: `plattform-berichte.md`. Wichtigste Inhaberpunkte: 1. privates Git-Remote (dringend – Code nur lokal!), 2. E6 benennen, 3. Rechtsabteilung (SPA/NDA/Newsletter/Art. 33), 4. Go-live-Secrets (SESSION_SECRET, 2FA-Schlüssel, TRUSTED_PROXY_HOPS), 5. Steuerberatung (Kontenrahmen, CH-MWST), 6. Hosting + Backup-Verantwortliche. **Welle 4 ABGESCHLOSSEN und committet am 11.10.2026** (9 Commits `e4137fc` … `0734274`, 17 Agenten, QM GRÜN `qa/out/verify-2026-10-11T07-10-43.json`, 974 Tests): Netzanschluss 2.0, Gebäudestrom (Seite + Rechner), Parkplatz-Hub, Partner-Widgets (Embed ohne Cookies/Skripte), Gläserner Solarpark (Demo-Daten gekennzeichnet), Fakten-Suche /quellen mit CSV/JSON-Export, CH-Strompreis-Atlas (Lizenz opendata.swiss „Open use“ am Original geprüft und zitiert), AT-SNE-VO-Vorbereitung (Nachtrag-Anleitung `scripts/at-sne-nachtrag.md`). Alle neuen Seiten noindex bis E6. Abnahme: `werkzeuge/armee/welle4-abnahme.md`, Berichte: `welle4-berichte.md`. **Damit sind die Masterplan-Wellen 0–4 und die Plattform-Armee ABGESCHLOSSEN.** **Rechtsabteilungs-Gesamtprüfung ABGESCHLOSSEN am 11.10.2026** (5 Agenten, QM GRÜN `qa/out/verify-2026-10-11T08-14-40.json`; 6 Commits `c365eab` … `114023a`): Datenschutzerklärung um Bericht/Newsletter/Karten/Widgets ergänzt, Barrierefreiheit erweitert, Rechner-Disclaimer, Anwaltsdossiers + fertiges Kanzlei-Briefing unter `docs/strang-r/pruefung-2026-10/` (56 Punkte: 14 hoch, 25 mittel, 17 niedrig; Top-Blocker: Registrierung nimmt Entwurfs-AGB ohne Fassungs-Protokoll an, Dienstleister-Platzhalter in der Datenschutzerklärung, Erlaubnisfrage Projektbörsen-Provision KWG/§34c/WAG/FIDLEG). Abnahme: `werkzeuge/armee/recht-abnahme.md`.
**SEO-Finale GESTARTET am 11.10.2026** (letzter angeordneter Einsatz, Skript `uebergabe/workflows/seo-finale.workflow.js`): TECHNIK, INHALT/Snippets, TEMPO/Core Web Vitals, GEOKI (KI-Suche); je Bau + Prüfung, dann QM. Bei Unterbrechung: resumeFromRunId 'wf_4a2e0af2-0b9'.

**Ursprünglicher Welle-3-Start am 09.10.2026** (Skript `uebergabe/workflows/welle3.workflow.js`): Pakete W3-0 (QM-Reste Ländermodell), B5 Rechnungs-Check Gewerbestrom DE, B9 Ausschreibungs-Monitor, B6 Flächenpass, B7 EG-Software AT, B8 Kommunal 2.0, B10 neutrale Börse, NL Newsletter/Newsroom; je Paket Bau + Prüfung, dann QM mit Commit-Vorschlag. Inhaberentscheidung dazu: deutsche Beispielwerte auf AT/CH-Seiten bleiben, aber gekennzeichnet. Falls beim Rechnerwechsel unterbrochen: `git status` prüfen, fertige Pakete stehen im Code; Skript mit einem Hinweis auf den Stand neu starten.

**Nächste Schritte:**
- Die offenen QM-Punkte mit dem Inhaber klären (Abschnitt 6).
- Welle 3 und 4 laut Masterplan (`docs/MASTERPLAN-DACH.md`), danach sofort die Plattform-Armee (`werkzeuge/armee/auftragsbuch.md`).
- Workflow-Läufe sind an eine Sitzung gebunden; neue Wellen als neuen Workflow starten (Skript als `*.tmp.js` ins Projekt, `*.tmp.js` ist in `.gitignore`).

## 8. Offene Punkte beim Inhaber

- Zweite Prüfperson (E6); Information an den Vertrieb über sinkende Renditen.
- Beleg für die Reststrom-Aussage „Strom aus Parks der Gruppe“.
- Mindestbetrag für die Entwicklungsbeteiligung.
- Team-Postfächer je Land.
- Lizenznachweise für 18 Bilder.
- Domain oekoinvest.com kaufen; privates Git-Remote anlegen; Hosting wählen.
- Kanzleien für Strang R (Rechtstexte); Kammer und Behörde im Impressum bestätigen; Verbraucherschlichtung (AStG) klären.
