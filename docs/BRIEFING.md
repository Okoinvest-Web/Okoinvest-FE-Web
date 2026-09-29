# Briefing ÖkoInvest-Website (für alle Mitwirkenden)

Projekt: `C:\Users\SALEADMIN\Downloads\Oekoinvest-Web` – Next.js 15 (App Router, JavaScript, Tailwind 4).
Entstanden als Kopie der Website von Ökovolt Deutschland (`C:\Users\SALEADMIN\Downloads\Oekovolt-Web-DE\Oekovolt-Web-DE`, **nur lesen, nie ändern**). Qualitätsmaßstab ist genau diese Seite: Schau Dir dort bei Bedarf Seiten wie `src/app/page.js`, `src/app/landwirtschaft/page.js`, `src/components/Rechner/StromspeicherRechner.js`, `src/components/Foerdercheck/FoerderWizard.js` an.

Dev-Server läuft bereits auf http://localhost:3100 (NICHT neu starten, NICHT `next build` im Projektordner ausführen – das zerschießt den laufenden Server. Für einen Build: `NEXT_DIST_DIR=.next-verify npx next build`).

## Unternehmen

- **ÖkoInvest GmbH**, Gewerbegebiet 10, 5121 Ostermiething (AT), FN 541505g, LG Ried im Innkreis, eingetragen 10.09.2020. GF: Andreas Wegscheider, Manuel Thaler. Teil der **ÖKOVOLT Gruppe** (seit 2010, Muttergesellschaft ÖKOVOLT GmbH Solartechnik in Türkheim/Bayern; Schwester ÖKOVOLT Solartechnik GmbH in AT). Beteiligungen: GFL – PV-Kraftwerk GmbH (100 %), HIL PV Kraftwerk GmbH (50 %, mit Prime Energy Solutions GmbH). Die Gruppe betreibt eigene Solarparks seit 2012 (z. B. Irsingen, Artern, Tilleda) und hat eigene Rammtechnik (Deutsche Solar & Rammtechnik GmbH).
- Geschäft: Projektentwicklung **Freiflächen-PV, Agri-PV, Solarcarports/Parkplätze, Großspeicher**; Contracting & PPA. Entwickelt **rund 50 MWp pro Jahr neu** (Baureife erst Jahre später – ehrlich kommunizieren).
- Plattform-Ziel: führende Seite im DACH-Raum, Markt durch Digitalisierung erschließen. Einnahmen über **Provision** (Projektbörse: Verkäuferprovision 1,5–3 % nur bei Abschluss; für Investoren und Flächeneigentümer kostenfrei).
- Zielgruppen: Flächeneigentümer, Landwirte (Agri-PV: verpachten / selbst investieren / Investor betreibt + Landwirt ist Mitglied in der Genossenschaft), Investoren (Projekte kaufen, Suchprofil), Projektentwickler/Anbieter (Projekte in die Börse stellen), Unternehmen/Mittelstand (**Reststrom-Pool**: die Firmen, denen die Muttergesellschaft ÖKOVOLT PV + Speicher baut, beziehen den Strom, den sie trotzdem noch kaufen müssen, gebündelt über das virtuelle Kraftwerk von ÖkoInvest → Preise drücken), Kommunen, Bürger (Genossenschaft, Energiegemeinschaften).
- Kontakt: Telefon und E-Mail sind noch **nicht freigegeben** → `KONTAKT.telefon`/`email` sind `null`, nie eine Nummer oder Adresse erfinden. Kontaktwege sind Formulare und das Portal.

## Harte Regeln

1. **Corporate Design nicht zerstören.** Nur die vorhandenen Tokens/Klassen: Farben `ov-*` (Grün, 600 für Buttons), `navy-*`, `ink-*`, `sand-*`, `sun-*` (sparsam). Schriften: Überschriften Manrope (`font-display`, `ov-h1/ov-h2/ov-h3/ov-display`), Text Inter. Klassen `ov-container`, `ov-lead`, `ov-text-gradient(-light)`, `ov-glass`, `ov-noise`, `ov-grid-bg(-light)`, `ov-card-hover`, `ov-num`, `ov-range`, `ov-prose`. Radien groß (rounded-3xl / rounded-[2rem]). Keine neuen Farben, keine anderen Fonts, keine Emojis im UI.
2. **Bausteine wiederverwenden** (`src/components/ui`): `PageHero` (variant split | immersive | dark), `Section` (tone white|sand|ink|green|navy, space), `SectionHeading` (+ `Eyebrow`), `Button` (primary|navy|secondary|ghost|white|outlineLight|sun), `FeatureGrid`, `Steps`, `Faq` (liefert FAQPage-Schema), `CtaBand` (Props: eyebrow,title,text,primary,secondary), `Reveal`, `CountUp`, `Breadcrumbs`, `SplitMedia`, `Marquee`. Rechner: `src/components/Rechner/bausteine.js` (`Zahl`, `Regler`, `Auswahl`, `Schalter`, `Gruppe`, `Kennzahl`, `Tooltip`, `useBreite`) und `RechnerSeite.js` (Seitenrahmen jedes Rechners, Props siehe Datei, `querverweise=[{href,titel,text}]`). `Querverweise` nimmt `items`.
3. **Zahlen nur aus `src/lib/invest/markt.js`** importieren (REGIONEN, BAUART, FREIFLAECHE, ERLOESE, FINANZIERUNG, PACHT, AGRI, CARPORT, SPEICHER, STROM, KOMMUNE, PHASEN, PROVISION, GEMEINSCHAFTEN, npv, irr, annuitaet, STAND). Formatierung aus `src/lib/rechner/annahmen.js` (fmt, fmtEur, fmtMio, fmtPct, fmtCt). Fehlt ein Wert, ergänze ihn dort **am Ende der passenden Konstante** mit Quelle als Kommentar (nicht umbenennen/löschen – andere nutzen die Datei parallel).
4. **Fachlich tief und korrekt, DACH-weit.** Deutschland: EEG 2023 (Ausschreibungen, § 6 Kommunalbeteiligung 0,2 ct/kWh, § 48 Randstreifen 500 m an Autobahnen/Schienen, benachteiligte Gebiete/Länderöffnungsklausel), BauGB § 35 (Privilegierung 200-m-Korridor an Autobahnen/zweigleisigen Schienen; Agri-PV bis 2,5 ha mit Hofbezug), B-Plan-Verfahren (Aufstellungsbeschluss, frühzeitige Beteiligung, Satzungsbeschluss), DIN SPEC 91434, GAP (Agri-PV: 85 % bleiben förderfähig), Erbschaft-/Grundsteuer (Achtung: § 158 Abs. 2 BewG erfasst nach Wortlaut nur die Überlassung zur Pflanzen-/Tiererzeugung – für klassische Freiflächen-PV gibt es KEINE Sonderregel, verpachtete Flächen können aus dem land- und forstwirtschaftlichen Vermögen fallen; vorsichtig formulieren, Steuerberatung empfehlen), Energy Sharing § 42c EnWG, Stromsteuer 0,05 ct für produzierendes Gewerbe ab 2026. Österreich: EAG, Marktprämie/Investitionszuschüsse, Flächenwidmung „Grünland-Photovoltaik“ je Bundesland, EEG/BEG (Erneuerbare-Energie-Gemeinschaften), UVP ab bestimmter Größe. Schweiz: Solarexpress (alpine Anlagen), Einmalvergütung, ZEV/vZEV, LEG seit 2026. **Unsichere Details vorsichtig formulieren** („in der Regel“, „nach aktuellem Stand“) statt erfinden. Keine erfundenen Referenzprojekte, Kunden, Zitate, Auszeichnungen oder Kennzahlen über ÖkoInvest. Belegt nur: siehe „Unternehmen“.
5. **Sprache:** Deutsch, Sie-Form, sachlich-selbstbewusst, keine Werbefloskeln. Echte Umlaute (ä, ö, ü, ß) in allen Texten. Code-Bezeichner und Kommentare deutsch wie im Bestand.
6. **SEO/Barrierefreiheit wie im Bestand:** `export const metadata` mit title (≤ 60 Z., Muster „… | ÖkoInvest“), description (140–160 Z.), `alternates.canonical` via `abs(pfad)` aus `@/data/site`, openGraph (siteName „ÖkoInvest“, Bild z. B. `/img/solarpark-himmel.jpg`). JSON-LD wo sinnvoll (Service, WebApplication, FAQPage über `Faq`). Semantische Überschriften, `aria-*`, Tastaturbedienung, `prefers-reduced-motion` respektieren (globals.css tut das meist schon).
7. **Mobil zuerst prüfen:** Nichts darf bei 360–390 px horizontal überlaufen.
8. **Bilder:** nur aus `/public/img` (Liste: solarpark-himmel, solarpark-reihen, solarpark-baeume, freiflaeche-begehung, investoren-vor-ort, montage-freiflaeche, planer-tablet, pv-wind-abend, module-sonne, module-raster, floating-pv, floating-pv-montage, gewerbedach, dach-drohne, techniker, team-praesentation, firmensitz, speicher – alle `.jpg`). Für Agri-PV, Carports, Karten, Prozesse: **eigene Inline-SVG-Illustrationen** im Markenstil (Grün/Navy/Sand, flach, sauber) statt fremder Bilder.
9. **Server-Komponenten bevorzugen**, `"use client"` nur für interaktive Teile.
10. **Keine neuen npm-Pakete** ohne zwingenden Grund.

## Vertrag Formulare / Plattform (wird vom Plattform-Team gebaut)

- `POST /api/anfrage` – JSON `{ typ, kontakt: { anrede?, vorname, nachname, firma?, email, telefon?, plz?, ort?, land? }, daten: {…frei je typ…}, einwilligung: true, herkunft? }`.
  `typ` ∈ `flaeche | agri | investor | projekt | reststrom | energiegemeinschaft | genossenschaft | kommune | carport | speicher | kontakt`.
  Antwort `{ ok: true, id, vorgang }` oder `{ ok:false, error }`. Die Anfrage wird als Vorgang gespeichert und erscheint im Portal, wenn sich die Person mit derselben E-Mail registriert.
- Wiederverwendbare Client-Komponente: `@/components/Plattform/AnfrageFormular` – Props `{ typ, daten = {}, titel?, text?, felder?: ["firma","telefon","plz", …], button?, erfolgText? }`. Darf ab sofort importiert werden (wird parallel gebaut; bis dahin existiert ein funktionsfähiger Stub).
- Portal-Routen: `/login`, `/registrieren?rolle=flaeche|landwirt|investor|anbieter|unternehmen|mitglied`, `/portal` (Dashboard je Rolle), `/portal/flaechen`, `/portal/projekte`, `/portal/boerse`, `/portal/anfragen`, `/portal/nachrichten`, `/portal/dokumente`, `/portal/profil`, `/portal/admin`.
- Öffentliche Projektbörse: `/projektboerse` (Liste mit Filtern), `/projektboerse/[slug]` (Exposé-Teaser, Details nach Login+NDA), `/projektboerse/anbieten`.

## Seitenlandkarte (öffentlich)

`/` · `/freiflaeche` · `/agri-pv` · `/solarcarport` · `/grossspeicher` · `/prozess` · `/kommunen` · `/flaeche-verpachten` · `/landwirte` · `/investoren` · `/projektboerse` (+ `/anbieten`, `/[slug]`) · `/virtuelles-kraftwerk` · `/reststrom` · `/energiegemeinschaften` · `/genossenschaft` · `/energie-live` · `/rechner` · `/flaechencheck` · `/rechner/pacht` · `/rechner/agri-pv` · `/rechner/solarpark` · `/rechner/projektbewertung` · `/rechner/reststrom` · `/rechner/solarcarport` · `/rechner/kommune` · `/ratgeber` (+ `/[slug]`) · `/wissen/lexikon` · `/faq` · `/unternehmen` · `/kontakt` · `/impressum` · `/datenschutz` · `/nutzungsbedingungen` · `/barrierefreiheit`.

Nur auf existierende oder in dieser Liste geplante Routen verlinken.

## Visuelle Kontrolle

Screenshot-Werkzeug (Playwright, bereits installiert):
```
cd "C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekovolt-Web-DE-Oekovolt-Web-DE/6ac8640b-bab4-4de9-9c07-3a24f91b0e42/scratchpad/pw"
MSYS_NO_PATHCONV=1 node shot.mjs /pfad 1440 1 name   # Desktop, ganze Seite
MSYS_NO_PATHCONV=1 node shot.mjs /pfad 390 1 name    # Mobil
```
Bild liegt dann unter `shots/<name>_<breite>.png` (mit dem Read-Werkzeug ansehen). Ausgabe zeigt HTTP-Status und Konsolen-/Laufzeitfehler. **Jede Seite muss mit Status 200, ohne Laufzeitfehler, in beiden Breiten sauber aussehen**, bevor sie als fertig gilt. Sehr lange Seiten ggf. zusätzlich mit `0` (nur sichtbarer Bereich) prüfen.

## Ausbaustufe 2 – Ergänzungen

- Stand: Alle Seiten der Stufe 1 existieren (siehe `src/app/`). Vor dem Verlinken prüfen, dass die Route existiert.
- Gemeinsame Dateien `src/data/navigation.js`, `src/components/Rechner/tools.js`, `src/app/sitemap.js`, `src/components/Reusable/footer.js` pflegt der Koordinator. Neue Routen/Tools im Abschlussbericht melden (mit Titel, Kurztext, Icon-Vorschlag aus lucide-react).
- Metadaten für Nicht-Rechner-Seiten: `rechnerMetadata` aus `@/components/Rechner/RechnerSeite` funktioniert allgemein.
- Rechner-Layout mit fixierter Ergebnisspalte: `@/components/Rechner/InvestTeile` (RechnerRahmen, Hinweise, Legende).
- Formular mit Chips davor: `@/components/Carport/AuswahlAnfrage`.
- Qualitäts-Audit (alle Sitemap-Routen: Status, Laufzeitfehler, Überlauf 390 px, tote Links): `MSYS_NO_PATHCONV=1 node audit.mjs` im Scratchpad-Ordner `pw`. Eigene Skripte dort mit eigenem Präfix benennen, fremde nicht überschreiben.
- Dev-Server kann durch parallele Arbeit langsam sein (bis 30 s je Erstaufruf) – Timeouts großzügig setzen, nicht neu starten.
