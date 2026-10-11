ABNAHMEPROTOKOLL – SEO-Finale (Qualitätsmanager): **ABGENOMMEN, verify GRÜN**

**1. Testläufe**
- `npm test`: 974/974 grün. `npm run test:charakterisierung`: 195/195 grün. Snapshot-Diff: keine Abweichungen.
- `npx eslint` auf allen 46 geänderten Quelldateien (alle außer public/llms.txt): ohne Befund – zweimal gelaufen, auch nach meiner eigenen Korrektur.

**2. HTTP/SEO-Stichprobe (24 Seiten über alle Fassungen: gemeinsam, /de, /at, /ch, /en, /en/…)**
- Alle 24: Status 200, genau eine H1, Title und Description vorhanden, Canonical je Fassung korrekt, hreflang-Cluster vorhanden, sämtliches JSON-LD valide geparst (WebSite mit SearchAction auf `/quellen?q={search_term_string}`, Organization mit vatID ATU76000505/Telefon/E-Mail/contactPoint im gerenderten HTML bestätigt; `/quellen?q=Pacht` füllt das Suchfeld – SearchAction ehrlich funktionsfähig).
- noindex-Register unverändert: lokale robots.txt weiter `Disallow: /`, Dev-noindex-Meta überall; `src/lib/indexsteuerung.js`-Diff ist reiner Kommentar (E5-Inhaberpunkt), WISSENSSEITEN-Liste unangetastet.
- **Eine Lücke gefunden und behoben:** `/en/solarcarport` Description hatte 175 Zeichen (>160). Gekürzt auf 159 („…solar obligation by federal state, designs, GEIG charging points…“), nur `BESCHREIBUNG_EN` in `src/app/(stamm)/solarcarport/page.js`; im gerenderten HTML nachgemessen, eslint sauber.

**3. Design-Screenshots (check.mjs, 1440+390, 8 Seiten = 17 Aufnahmen, alle mit Read angesehen)**
/quellen, /kommunen/widmungskit, /de/marktdaten, /de/solarcarport, /en/solarcarport, /projektboerse, /gebaeudestrom, /ratgeber/solarpark-pacht-pro-hektar: alle 200, 0 Konsolenfehler, kein horizontaler Überlauf, keine sichtbaren Layoutänderungen (Widmungskit-Überschriften optisch identisch, neue Verweise im Bestandsstil). Ein Timeout auf /gebaeudestrom w1440 war ein Dev-Server-Flake, Wiederholung OK. Ablage: `C:\Users\SALEAD~1\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekoinvest-Web\3140c08a-2721-4ee9-a47f-9fce6660cd23\scratchpad\qm-shots\`

**4. CLS-Stichprobe (film.mjs, 4 Seiten)**
/dachflaeche-verpachten 1440: 0,000–0,001 · /energiegemeinschaften 390: 0,000 (Wiederholungen; Einzelläufe 0,027/0,029 = Compile-Rauschen) · /de 1440: 0,000–0,007 · /de/marktdaten 1440: 0,000 (Erstlauf 0,12 war Erst-Compile, 3 Wiederholungen 0). Nicht schlechter als die TEMPO-Berichte (vorher bis 0,111). Vereinzelte Konsolenfehler unter Playwright-Last (Hydration-Warnung) waren in sauberen Einzelläufen nicht reproduzierbar.

**5. Gemeinsame Dateien / Sitemap**
- `Wurzel.js` trägt TECHNIK- (Schema) und TEMPO-Änderung (Schrift-Fallbacks) konfliktfrei; `solarcarport/page.js` TECHNIK-Karte + meine Meta-Korrektur konfliktfrei; Fakten-Bausteine nur GEOKI. Keine Überschneidungskonflikte.
- Sitemap: 204 URLs, keine noindex-Seiten (quellen/newsroom/newsletter/muster-nda/glaeserner-solarpark nicht enthalten) – unverändert.

**6. Gesamtlauf `npm run verify`**
- Lauf 1 (11:34): ROT – einzig Schritt 5 (E2E, lead.e2e.mjs Newsletter-Checkbox) nach 799 s unter Volllast. Einzelnachprüfung `npm run qa:e2e`: 7/7 grün in 86 s → Flake (Dev-Server-Last), kein Codefehler.
- **Lauf 2 (12:00): GRÜN** – alle 7 Schritte ok (Tests, Selbsttest, Claim-Lint als Bericht wie Baseline, Faktenregister GRÜN 163 Fakten/0 ohne Quelle, Ländermodell, axe-Ratsche identisch zur grünen Vormittags-Baseline, E2E grün). Dauer 21:44 min (Budgetüberschreitung dev-bedingt, auch die grüne Vormittags-Baseline lag bei 23 min). Protokoll: `qa/out/verify-2026-10-11T12-00-51.json`.

**Von mir geänderte Datei:** `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web\src\app\(stamm)\solarcarport\page.js` (nur EN-Meta-Description).

**Offene Inhaberpunkte (gesammelt, bestätigt):**
1. E5-Erweiterung: /quellen für GPTBot/Google-Extended freigeben? (dokumentiert in indexsteuerung.js, Standard unverändert)
2. 4 bewusst verwaiste Seiten bis Freigabe: /newsroom, /newsletter, /partner/widgets, /projekte/glaeserner-solarpark
3. `Organization.sameAs` erst mit Social-Profilen; SearchAction-Ziel /quellen bis E6 noindex
4. AVIF (next.config.mjs) greift erst nach Server-Neustart/Build; vor Livegang `next build` + Lighthouse auf dem Hosting
5. Totes CSS `ov-hero-fortschritt` (globals.css 373–381) löschen oder auf transform umstellen
6. AT-Artikel freiflaechen-pv-oesterreich: DACH-Pachtspanne auf AT-Fakt umstellen (sichtbare Zahlenänderung → E6-Freigabe)
7. /projektboerse/muster-nda rendert zwei robots-Metas (beide noindex; kosmetisch)
8. CH/AT-eigene Titles erst nach geprüften CH/AT-Zahlen (E6); Meta-Zusätze („ohne Renditeversprechen“) ggf. auf Wunsch der Rechtsabteilung zurück ins Snippet
9. Dev-Server unter Playwright-Last instabil/langsam (E2E-Flake, Timeouts) – produktionsirrelevant, beobachten
10. Alles wirkt erst ab Livegang (NEXT_PUBLIC_SITE_ENV=production auf www.oekoinvest.com; Mechanik unverändert)

**Commit-Vorschlag** (jede der 47 geänderten Dateien in genau einem Commit; uebergabe/ und *.tmp.js nicht enthalten):

```json
[
  {"titel":"Technisches SEO: Suchfeld liest ?q=, Überschriften-Hierarchie repariert, verwaiste Seiten verlinkt","pfade":["src/components/Quellen/FaktenSuche.js","src/components/Kommune/Widmungskit/Widmungskit.js","src/app/(stamm)/marktdaten/page.js","src/app/(stamm)/solarcarport/page.js"]},
  {"titel":"Wurzel: Organisation und SearchAction im Schema vervollständigt, metrische Schrift-Fallbacks, AVIF aktiviert","pfade":["src/components/Wurzel/Wurzel.js","next.config.mjs"]},
  {"titel":"Snippets: Titles und Descriptions auf Zielkorridor gekürzt (DE und EN)","pfade":["src/app/(stamm)/page.js","src/app/(stamm)/projektboerse/page.js","src/app/(stamm)/projektboerse/neutralitaet/page.js","src/app/(stamm)/projektboerse/muster-nda/page.js","src/app/(stamm)/gebaeudestrom/page.js","src/app/(stamm)/parkplatz/page.js","src/app/(stamm)/freiflaeche/page.js","src/app/(stamm)/energiegemeinschaften/page.js","src/app/(stamm)/energiegemeinschaften/software/preise/page.js","src/app/(stamm)/energiegemeinschaften/software/wechsel-check/page.js","src/app/(stamm)/energiegemeinschaften/software/white-label/page.js","src/app/(stamm)/rechner/flaechenpass/page.js","src/app/(stamm)/rechner/gebaeudestrom/page.js","src/app/(stamm)/rechner/gewerbestrom-check/page.js","src/app/(stamm)/newsletter/page.js","src/app/(stamm)/quellen/page.js","src/app/(stamm)/marktdaten/ausschreibungen/page.js","src/app/(stamm)/kommunen/ratsvorlage/page.js","src/app/(stamm)/kommunen/widmungskit/page.js"]},
  {"titel":"KI-Zitierfähigkeit: llms.txt vervollständigt, Fakten-Anker in Ratgebern und Fakten-Bausteinen","pfade":["public/llms.txt","src/lib/indexsteuerung.js","src/components/Fakten/FaktWert.js","src/components/Fakten/FristenListe.js","src/components/Fakten/Quellenzeile.js","src/components/Ratgeber/ArtikelInhalt.js","src/content/ratgeber/agri-pv-foerderung-gap.js","src/content/ratgeber/agri-pv-wirtschaftlichkeit.js","src/content/ratgeber/benachteiligte-gebiete-pv-freiflaeche.js","src/content/ratgeber/dienstbarkeit-grundbuch-pv-pacht.js","src/content/ratgeber/direktvermarktung-solarpark.js","src/content/ratgeber/eeg-ausschreibung-freiflaeche.js","src/content/ratgeber/freiflaechen-pv-oesterreich.js","src/content/ratgeber/kommunale-beteiligung-6-eeg.js","src/content/ratgeber/negative-strompreise-solarspitzengesetz.js","src/content/ratgeber/pachtvertrag-solarpark.js","src/content/ratgeber/photovoltaik-landwirt-steuern.js","src/content/ratgeber/ppa-fuer-unternehmen.js","src/content/ratgeber/solarpark-bestandsanlage-wert.js","src/content/ratgeber/solarpark-genehmigung-bebauungsplan.js","src/content/ratgeber/solarpark-investment-rendite.js","src/content/ratgeber/solarpark-pacht-pro-hektar.js"]}
]
```

Hinweis zum Commit 1: `solarcarport/page.js` enthält neben der TECHNIK-Karte auch meine EN-Description-Kürzung; Commit 2 bündelt Wurzel.js, weil TECHNIK- und TEMPO-Änderung in derselben Datei liegen. Keine Commits ausgeführt, keine neuen Abhängigkeiten, Dev-Server läuft weiter.