# Ratgeber-Artikel (inhaltsgetrieben)

Jede Datei in diesem Ordner ist ein Artikel unter `/ratgeber/<slug>`. Die Seite rendert `src/app/ratgeber/[slug]/page.js`. Übersicht, Sitemap, „Weiterlesen“, Inhaltsverzeichnis, Lesezeit und JSON-LD (Article, FAQPage, HowTo, BreadcrumbList) entstehen automatisch.

**Referenz:** `photovoltaik-lohnt-sich.js`

## Neuen Artikel anlegen

1. Datei `src/content/ratgeber/<slug>.js` nach dem Muster unten anlegen. Der Dateiname entspricht dem Slug.
2. `node scripts/ratgeber-index.mjs` ausführen, damit der Artikel registriert wird.
3. Seite im Browser prüfen (Desktop und Handy).

Dateien, die mit `_` beginnen, werden ignoriert (Entwürfe).

## Aufbau

```js
import { ANNAHMEN } from "@/data/solarrechner";   // optional: zentrale Zahlen verwenden

const artikel = {
  slug: "stromspeicher-kosten",                    // = Dateiname, nur a–z, 0–9, Bindestrich
  title: "Stromspeicher Kosten 2026: Preise pro kWh im Überblick",   // H1, 50–70 Zeichen
  seoTitle: "Stromspeicher Kosten 2026: Preise pro kWh | Ökovolt",   // <title>, max. 60 Zeichen
  kurzTitel: "Stromspeicher Kosten",               // Breadcrumb, Karten
  description: "…",                                // 140–160 Zeichen, Hauptkeyword vorn, Nutzen + Anreiz
  excerpt: "…",                                    // 1–2 Sätze für Karten und Hero
  hauptKeyword: "stromspeicher kosten",
  keywords: ["…", "…"],                            // 5–8 Varianten und Nebenkeywords
  veroeffentlicht: "2026-09-13",
  aktualisiert: "2026-09-13",
  kategorie: "Speicher & Eigenverbrauch",          // exakt einer der 5 Werte unten
  bild: "/Images/…",                                // aus /public
  bildAlt: "Beschreibung des Bildinhalts",
  badge: { wert: "~450 €", text: "je kWh, gemeinsam installiert" },  // optional, schwebende Kennzahl im Hero

  kurzFazit: ["3–5 zitierfähige Kernaussagen mit Zahlen"],

  abschnitte: [
    { id: "preise", titel: "H2 als Frage oder klare Aussage", tocLabel: "kurz fürs Inhaltsverzeichnis (optional)", bloecke: [ /* siehe Blocktypen */ ] },
  ],

  faq: [{ q: "Frage wie gesucht?", a: "Antwort, 2–4 Sätze, darf [Links](/pfad) enthalten." }],
  howTo: { name: "…", schritte: [{ name: "…", text: "…" }] },       // optional, nur bei echten Anleitungen
  passend: [{ href: "/…", titel: "…", text: "…" }],                   // 2–4 interne Verweise
  quellen: [{ titel: "Institution – Titel", url: "https://…", stand: "09/2026" }],  // 3–8 belastbare Quellen
  seitenCta: { titel: "…", text: "…", href: "/rechner/…", label: "…" },
  cta: { title: "…", text: "…", primary: { label: "Angebot anfragen", href: "/angebot" }, secondary: { label: "…", href: "/…" } },
};

export default artikel;
```

### Kategorien (feste Werte)

- `Kosten & Wirtschaftlichkeit`
- `Technik & Planung`
- `Speicher & Eigenverbrauch`
- `Wärmepumpe & E-Mobilität`
- `Förderung, Steuern & Recht`

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
  - `@/data/solarrechner`: `ANNAHMEN`, `preisProKwp`
  - `@/data/einspeiseverguetung`: `VERGUETUNG`, `ct`, `satzFuer`
  - `@/data/wallbox`: `WALLBOX`, `spanne`
  - `@/lib/solarrechner`: `berechne`
  - `@/lib/rechner/*`: Speicher, Wärmepumpe, Wallbox, dynamischer Tarif
- **Keine Aussagen über Ökovolt**, die nicht belegt sind (Garantien, Preise, Auszeichnungen). Belegt sind: Fachbetrieb in Türkheim, über 15 Jahre Erfahrung, Planung/Montage/Anmeldung aus einer Hand, Partner von Sigenergy, Fronius, Huawei, Solis, meteocontrol und BYD (Freigabe für deren Marketing- und Produktfotos; Bildquellen in `public/Images/Ratgeber/QUELLEN.md` dokumentieren).
- **Interne Links:** mindestens 5 im Fließtext, zu passenden Ratgebern, Produkt-/Serviceseiten, Rechnern, Lexikon (`/wissen/lexikon#<id>`, IDs siehe `src/data/lexikon.js`, z. B. `#lfp`, `#paragraf-14a-enwg`), Förder-Check.
- **Umfang:** 1.500–3.000 Wörter Inhalt. Tiefe vor Länge – nichts aufblähen.
- **Aufbau:** Suchintention zuerst beantworten (Kurzfazit + erster Abschnitt), dann Details, Tabellen, Praxisbeispiele, Fehler/Grenzen, Vorgehen, FAQ.
