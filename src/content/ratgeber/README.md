# Ratgeber-Artikel (inhaltsgetrieben)

Jede Datei in diesem Ordner ist ein Artikel unter `/ratgeber/<slug>`. Die Seite rendert `src/app/ratgeber/[slug]/page.js`. Übersicht, Sitemap, „Weiterlesen“, Inhaltsverzeichnis, Lesezeit und JSON-LD (Article, FAQPage, HowTo, BreadcrumbList) entstehen automatisch.

**Referenz:** `solarpark-pacht-pro-hektar.js`

## Neuen Artikel anlegen

1. Datei `src/content/ratgeber/<slug>.js` nach dem Muster unten anlegen. Der Dateiname entspricht dem Slug.
2. `node scripts/ratgeber-index.mjs` ausführen, damit der Artikel registriert wird.
3. Seite im Browser prüfen (Desktop und Handy).

Dateien, die mit `_` beginnen, werden ignoriert (Entwürfe).

## Aufbau

```js
import { PACHT, STAND } from "@/lib/invest/markt"; // zentrale Marktzahlen verwenden
import { fmt } from "@/lib/rechner/annahmen";      // deutsche Zahlenformatierung

const artikel = {
  slug: "solarpark-pacht-pro-hektar",              // = Dateiname, nur a–z, 0–9, Bindestrich
  title: "…",                                      // H1, 50–70 Zeichen
  seoTitle: "… | ÖkoInvest",                       // <title>, max. 60 Zeichen
  kurzTitel: "…",                                  // Breadcrumb, Karten
  description: "…",                                // 140–160 Zeichen, Hauptkeyword vorn, Nutzen + Anreiz
  excerpt: "…",                                    // 1–2 Sätze für Karten und Hero
  hauptKeyword: "solarpark pacht pro hektar",
  keywords: ["…", "…"],                            // 5–8 Varianten und Nebenkeywords
  veroeffentlicht: "2026-09-13",
  aktualisiert: "2026-09-13",
  kategorie: "Fläche & Pacht",                     // exakt einer der 5 Werte unten
  bild: "/img/…",                                   // nur aus /public/img
  bildAlt: "Beschreibung des Bildinhalts",
  badge: { wert: "…", text: "…" },                 // optional, schwebende Kennzahl im Hero

  kurzFazit: ["3–5 zitierfähige Kernaussagen mit Zahlen"],

  abschnitte: [
    { id: "preise", titel: "H2 als Frage oder klare Aussage", tocLabel: "kurz fürs Inhaltsverzeichnis (optional)", bloecke: [ /* siehe Blocktypen */ ] },
  ],

  faq: [{ q: "Frage wie gesucht?", a: "Antwort, 2–4 Sätze, darf [Links](/pfad) enthalten." }],
  howTo: { name: "…", schritte: [{ name: "…", text: "…" }] },       // optional, nur bei echten Anleitungen
  passend: [{ href: "/…", titel: "…", text: "…" }],                   // 2–4 interne Verweise
  quellen: [{ titel: "Institution – Titel", url: "https://…", stand: "09/2026" }],  // 3–8 belastbare Quellen
  seitenCta: { titel: "…", text: "…", href: "/rechner/…", label: "…" },
  cta: { title: "…", text: "…", primary: { label: "Fläche prüfen lassen", href: "/flaechencheck" }, secondary: { label: "…", href: "/…" } },
};

export default artikel;
```

### Kategorien (feste Werte)

- `Fläche & Pacht`
- `Agri-PV & Landwirtschaft`
- `Investieren & Projektbörse`
- `Recht & Genehmigung`
- `Strom, Markt & Gemeinschaft`

### Blocktypen

| typ | Felder | Zweck |
|---|---|---|
| `p` | `text` | Absatz. Erster Satz eines Abschnitts beantwortet die H2 direkt, gern **fett** (Featured Snippet / AI Overview). |
| `h3` | `text` | Zwischenüberschrift |
| `liste` | `punkte[]`, `nummeriert?` | Aufzählung |
| `checkliste` | `punkte[]` | Haken-Liste |
| `tabelle` | `caption`, `kopf[]`, `zeilen[][]`, `hervorheben?` (Spaltenindex), `markierteZeile?`, `fussnote?`, `minBreite?` | Echte Tabelle – wichtig für Snippets |
| `kasten` | `variant` (`info`/`tipp`/`wichtig`/`recht`), `titel?`, `text` | Merkkasten |
| `kennzahl` | `wert`, `titel`, `text` | Große Kennzahl (dunkel) |
| `karten` | `items[{titel,text}]`, `cols?` (2/3) | Karten-Raster |
| `ablauf` | `schritte[[titel, text]]` | Nummerierter Ablauf |
| `tool` | `href`, `titel`, `text`, `label` | Grüne Karte zu einem Rechner/Tool |

**Textformatierung** in allen Textfeldern: `**fett**`, `[Linktext](/interner/pfad)` oder `[Linktext](https://extern)`. Kein HTML.

## Redaktionelle Regeln

- **Sie-Form**, sachlich, verständlich, ohne Werbesprech. Stand-Datum nennen, wenn Zahlen sich ändern.
- **Fakten:** Jede Zahl muss belegbar sein; Quellen in `quellen`. Wo Zahlen der Website existieren, **diese importieren** statt abzutippen:
  - `@/lib/invest/markt`: `REGIONEN`, `BAUART`, `FREIFLAECHE`, `ERLOESE`, `FINANZIERUNG`, `PACHT`, `AGRI`, `CARPORT`, `SPEICHER`, `STROM`, `KOMMUNE`, `PHASEN`, `PROVISION`, `GEMEINSCHAFTEN`, `npv`, `irr`, `annuitaet`, `STAND`
  - `@/lib/rechner/annahmen`: `fmt`, `fmtEur`, `fmtMio`, `fmtPct`, `fmtCt`
- **Keine Aussagen über ÖkoInvest**, die nicht belegt sind (Referenzprojekte, Kunden, Garantien, Auszeichnungen, Kennzahlen). Belegt ist nur, was in `docs/BRIEFING.md` unter „Unternehmen“ steht (u. a. Sitz Ostermiething, Teil der ÖKOVOLT Gruppe, eigene Solarparks der Gruppe seit 2012, rund 50 MWp Neuentwicklung pro Jahr, Verkäuferprovision 1,5–3 % nur bei Abschluss).
- **Bilder** nur aus `/public/img` (Liste in `docs/BRIEFING.md`), Alt-Text muss zum Bild passen.
- **Interne Links:** mindestens 5 im Fließtext, zu passenden Ratgebern, Leistungs- und Zielgruppenseiten, Rechnern (`/rechner/...`), Flächencheck, Projektbörse und Lexikon (`/wissen/lexikon#<id>`, IDs siehe `src/data/lexikon.js`, z. B. `#aufstellungsbeschluss`, `#rtb`). Nur Routen aus der Seitenlandkarte im BRIEFING.
- **Umfang:** 1.500–3.000 Wörter Inhalt. Tiefe vor Länge – nichts aufblähen.
- **Aufbau:** Suchintention zuerst beantworten (Kurzfazit + erster Abschnitt), dann Details, Tabellen, Praxisbeispiele, Fehler/Grenzen, Vorgehen, FAQ.
