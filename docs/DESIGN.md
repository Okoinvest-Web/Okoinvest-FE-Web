# Design-System 2.0 – ÖkoInvest

Verbindlich für alle Teams. Lebender Styleguide: **`/design`** (noindex, nicht in der Sitemap).
Grundlage bleibt das Corporate Design der ÖKOVOLT Gruppe (ÖKO-Grün `#669933`, Navy `#003473`, Manrope/Inter, Logo `ui/Logo.js`). 2.0 **veredelt** – es ersetzt nichts. Alle bestehenden Props, Klassen und Tokens funktionieren weiter.

Ergänzend gilt `docs/BRIEFING.md` (Inhalte, Sprache, Ressourcen, Tailwind-Falle).

---

## 1. Gestaltungsprinzipien

1. **Ruhe vor Effekt.** Eine Seite hat genau *eine* laute Stelle (Hero, wichtigste Zahl, primäre Aktion). Alles andere ist leise: Weiß, Sand, Haarlinien, `shadow-e1`.
2. **Zahlen führen.** Kennzahlen sind die Helden der Plattform – groß, tabellarisch (`ov-kpi*`), mit Einheit klein daneben, mit Kontext (Trend, Verlauf, Vergleich). Nie eine nackte Zahl ohne Bezug.
3. **Tiefe zeigt Bedeutung.** Elevation ist eine Rangordnung, keine Dekoration: e1 = Fläche, e2 = schwebt leicht (Dropdown, Tab-Indikator), e3 = die wichtigste Karte der Ansicht, e4 = Hover/Toast, e5 = Dialog.
4. **Bewegung erklärt.** Jede Animation beantwortet „woher kommt das, wohin geht es, hat es geklappt?“. Nie Bewegung um ihrer selbst willen; nie länger als 700 ms (Ausnahme Zahlen 1,4 s); nur `transform` und `opacity`.
5. **Grün heißt handeln, Navy heißt vertrauen.** Grün (`ov-600`) für die primäre Aktion und Erfolg, Navy für Struktur, Daten, dunkle Flächen. Sonne nur für Live-Daten und Warnungen. Rot (`danger-*`) nur für Fehler und destruktive Aktionen.
6. **Einfach zu bedienen, brutal mächtig.** Klare Standardwege für alle; Tastatur, Filter, Massenaktionen für Profis. Kein Feature versteckt sich hinter Animation oder Hover.
7. **Barrierefrei ist der Normalfall.** WCAG 2.2 AA: Text ≥ 4.5:1, Grafik ≥ 3:1, Zielgröße ≥ 24 px (besser 40 px), sichtbarer Fokus, `prefers-reduced-motion`, Status nie nur über Farbe.
8. **Nichts springt.** Platzhalter in Endgröße (Skeleton), feste Seitenverhältnisse für Bilder/Illustrationen, Server-HTML enthält Endwerte (CountUp).

---

## 2. Tokens

Alle Tokens leben in `src/app/globals.css` (`@theme` für Tailwind-Utilities, `:root` für CSS-Variablen).

### 2.1 Farben

| Skala | Stufen | Verwendung |
|---|---|---|
| `ov-*` (Grün, 500 = #669933) | 50–900 | Marke, primäre Aktion (`ov-600`, 4.6:1 auf Weiß), Erfolg. Text in Grün: **mind. `ov-700`** (6.6:1). `ov-500` nur für Flächen/Icons/Grafik (3.4:1). |
| `navy-*` (700 = #003473) | 50–950 | Struktur, Überschriften auf Hell möglich, dunkle Flächen (`navy-950`), Info. |
| `ink-*` (kühles Grau) | 50–950, **350 (neu)** | Text (`ink-900` Überschrift, `ink-700` Fließtext, `ink-600` Lead, `ink-500` Meta, `ink-400` leisester Text). **2.0: `ink-400` = #687183 (4.9:1, vorher #97a0b0 = 2.6:1), `ink-500` = #5a6375 (6.0:1, vorher #6b7486).** `ink-350` (#8a93a4, 3.1:1) für Feldrahmen und Grafik-Grenzen; dekoratives Hellgrau = `ink-300`. |
| `sand-*` | 50, 100, **200 (neu)** | Ruhige Flächen, Illustrationsboden, Rahmenlinie auf Sand (`sand-200`). |
| `sun-*` | **50, 100, 200 (neu)**, 300–500, **600, 700 (neu)** | Live-Daten, Highlights, Warnung. Text in Sonne nur `sun-700` (5.9:1). `sun-400/500` nie als Text auf Weiß (2.0:1). |

**Semantische Farben** (Aliasse, als Utilities verfügbar: `bg-success-50`, `text-danger-700`, `ring-warn-200` …):

| Semantik | Basis | Fläche | Rand | Text | Icon/Punkt |
|---|---|---|---|---|---|
| `success` | = `ov` | `-50` | `-200` | `-800` | `-500` |
| `info` | = `navy` | `-50` | `-100/200` | `-700` | `-500` |
| `warn` | = `sun` | `-50` | `-200` | `-700` | `-500`/`-600` |
| `danger` (**neu**, gedämpftes Rot) | `#d6463a` … | `-50` | `-200` | `-700` (7.3:1) | `-500`/`-600` |

Tailwind-`red-*` im Bestand bitte bei Gelegenheit auf `danger-*` umstellen (gleiche Stufen: `red-50→danger-50`, `red-200→danger-200`, `red-700→danger-700`).

**Dunkle Flächen** (CSS-Variablen, von tief nach erhaben):

| Variable | Wert | Einsatz |
|---|---|---|
| `--ov-nacht-0` | #020b1c | Leitstand, Footer-Grund |
| `--ov-nacht-1` | #03122b (= navy-950) | Standard-Dunkelfläche, Portal-Seitenleiste, Hero „dark“ |
| `--ov-nacht-2` | #071c3d | Karte auf Dunkel (`.ov-flaeche-dunkel`) |
| `--ov-nacht-3` | #0c2650 | Hover/aktiv auf Dunkel |
| `--ov-nacht-linie` | weiß 10 % | Haarlinien auf Dunkel |

### 2.1a Kontrast-Sicherungen (zentral, UX-Audit P0)

Statt ~250 Einzelstellen zu ändern, sichert `globals.css` (Block „2.0 KONTRAST-SICHERUNGEN“, `@layer utilities`, niedrige Spezifität – `hover:`/`focus:` gewinnen weiter):

| Problem | Vorher | Lösung | Nachher |
|---|---|---|---|
| `text-ink-400` als Text (~190×) | 2.63:1 | Token `ink-400` abgedunkelt (#687183), `ink-500` rückt nach (#5a6375) | 4.9:1 (Weiß), 4.6:1 (ink-50), 4.7:1 (sand-50) |
| Weiße Schrift auf `bg-ov-500` (~56×) | 3.40:1 | `.text-white.bg-ov-500` → Fläche `ov-600` | 4.56:1 |
| Feldrahmen `ring-/border-ink-100/200/300` an `input`/`select`/`textarea` | 1.29:1 | automatisch `ink-350` (Checkbox/Radio/Range ausgenommen) | 3.09:1 |

Neue Arbeit: weiße Schrift nur auf `ov-600`+, Feldrahmen direkt `ring-ink-350`, keine Grautöne unter `ink-400` für Text. Inline-Stile mit `#669933`-Hintergrund erfasst die Sicherung nicht – dort `bg-ov-600` verwenden. Nachweis im Styleguide `/design` → „Kontrast-Sicherungen“.

Text auf Dunkel: `white` (Titel), `white/75` (Fließtext, ≥ 4.5:1), `white/60` nur ≥ 18 px. Grün auf Dunkel: `ov-300` (10.8:1). Verläufe: `.ov-verlauf-nacht` (Navy mit grünem und blauem Licht), `.ov-verlauf-gruen` (Marken-Kachel).

### 2.2 Elevation / Schatten

Mehrlagige, navy-getönte Schatten. Utilities `shadow-e1` … `shadow-e5`, Variablen `--ov-e1` … `--ov-e5`.

| Stufe | Einsatz |
|---|---|
| `shadow-e1` | Standardkarte (zusammen mit `ring-1 ring-ink-200/70`) |
| `shadow-e2` | Tab-Indikator, Dropdown, Sticky-Leisten |
| `shadow-e3` | wichtigste Karte der Ansicht (`Karte ton="erhaben"`), Tooltip |
| `shadow-e4` | Hover-Zustand (über `.ov-lift`), Toast, Popover |
| `shadow-e5` | Dialog, Bottom-Sheet |
| `shadow-gruen` / `shadow-navy` | nur primäre Buttons/Marken-Kacheln |
| `shadow-kante` | Lichtkante (inset) für Karten auf Dunkel |

Die alten `shadow-sm … shadow-2xl` bleiben gültig (bereits vereinheitlicht).

### 2.3 Radien

| Token | Wert | Einsatz |
|---|---|---|
| `rounded-lg` | 0.5rem | Checkbox, Mini-Chips |
| `rounded-xl` | 0.75rem | Icon-Kacheln 32–36 px, Eingabe klein, Tooltip |
| `rounded-2xl` | 1rem | Eingabefelder, Hinweisboxen, Icon-Kachel 48 px, Toast |
| `rounded-3xl` | 1.5rem | **Karten** (Standard), KPI-Kacheln, Dialog |
| `rounded-4xl` / `rounded-[2rem]` | 2rem | Hero-Bilder, Illustrationsrahmen, große Teaser |
| `rounded-5xl` / `rounded-6xl` | 2.5 / 3rem | Sektionen-Panels (CtaBand) |
| `rounded-full` | – | Buttons, Badges, Tabs (Pille), Avatare |

Regel: verschachtelte Radien = äußerer Radius − Innenabstand (Karte 24 px, Padding 8 px → innen 16 px).

### 2.4 Abstände & Raster

4-px-Raster. Abschnitte über `Section space="sm|md|lg"` (bleibt). Fluid-Variablen für eigene Layouts:
`--ov-abstand-abschnitt` (64–128 px), `--ov-abstand-block` (32–56 px), `--ov-abstand-karte` (20–32 px).
Karten-Innenabstand `p-5 md:p-6` (Portal), `p-7 md:p-8` (Website). Raster-Lücken `gap-4 md:gap-5` (Karten), `gap-3` (Kennzahlen dicht). Container `ov-container` (max 80rem). Lesbreite `ov-measure` (72ch).

### 2.5 Typografie

Überschriften Manrope (`font-display`), Text Inter. Fluide Skala (360 → 1440 px, keine Sprünge):

| Klasse | Größe (clamp) | Gewicht | Einsatz |
|---|---|---|---|
| `ov-display` | 37.6 → 76 px | 800 | Startseiten-Hero |
| `ov-h1` | 33.6 → 60 px | 800 | Seitentitel Website |
| `ov-h2` | 28 → 48 px | 800 | Abschnitt |
| `ov-h3` | 19.2 → 24 px | 700 | Kartentitel Website |
| `ov-h4` (**neu**) | 16.8 → 19.2 px | 700 | Untertitel, Dialogabschnitt |
| `ov-lead` | 16.8 → 20 px | 400 | Einleitung |
| `ov-text` (**neu**) | 15.2 → 17 px | 400 | Fließtext |
| `ov-klein` (**neu**) | 14 px | 400 | Sekundärtext, Tabellen |
| `ov-mikro` (**neu**) | 12.5 px | 400–600 | Meta, Achsen, Fußnoten (nie kleiner) |
| `ov-overline` (**neu**) | 12 px, +0.16em, versal | 700 | Überzeile (wie `Eyebrow`) |

Portal-Seitentitel (`SeitenKopf`): 26 → 36 px fluid. Kartentitel im Portal 17 px/700.

**Zahlen-Typo** (neu): `ov-kpi` (24–32 px), `ov-kpi-l` (32–48 px), `ov-kpi-xl` (42–72 px) – Manrope 800, tabellarische Ziffern, Laufweite −0.03em. Einheit als `<span className="ov-einheit">kWh</span>` (55 %, 70 % Deckkraft). Immer deutsches Format (`1.234,5`), Minus als „−“ (U+2212), Prozent mit schmalem Abstand („12 %“). In Tabellen `ov-num` und rechtsbündig.

---

## 3. Motion-System

### 3.1 Dauern & Kurven

| Token | Wert | Einsatz |
|---|---|---|
| `--ov-dauer-xs` | 120 ms | Farbe, Fokus |
| `--ov-dauer-s` | 180 ms | Hover, Press, Tooltip |
| `--ov-dauer-m` | 240 ms | Dialog, Toast, Tabs, Panels |
| `--ov-dauer-l` | 420 ms | Abschnittswechsel, Stagger-Element |
| `--ov-dauer-xl` | 700 ms | Reveal, Diagramm-Einlauf |
| `--ov-dauer-zahl` | 1400 ms | Zahlen hochzählen |

| Kurve | Utility | Wert | Einsatz |
|---|---|---|---|
| out (Standard) | `ease-ov-out` | cubic-bezier(.22,1,.36,1) | alles, was erscheint |
| in-out | `ease-ov-in-out` | (.65,0,.35,1) | Positionswechsel, Skeleton |
| feder | `ease-ov-feder` | (.34,1.56,.64,1) | Erfolg, kleine „Pops“ (sparsam) |
| in | `ease-ov-in` | (.4,0,1,1) | Verschwinden |

JS: `DAUER`, `KURVE` aus `@/components/ui/motion`.

### 3.2 Muster

| Muster | Umsetzung |
|---|---|
| **Reveal** beim Scrollen | `<Reveal dir="up|left|right|scale|ohne">` (Server). `ohne` = nur Auslöser für Kinder (Diagramme), ohne eigene Bewegung. 700 ms, 24 px. |
| **Stagger** | `<Stagger as="ul" className="grid …">` – Kinder nacheinander, 60 ms Versatz, ab dem 12. gemeinsam. Oder `className="ov-reveal ov-stagger"`. |
| **Hover-Lift** | Klasse `ov-lift`: −3 px + Schatten e4 über Pseudo-Element (nur opacity). Nicht mit `ov-noise` kombinieren, kein `overflow-hidden` am selben Element. Bestehend: `ov-card-hover`. |
| **Press** | `ov-press` (scale .975) – in `Button` eingebaut. |
| **Einstieg beim Mounten** | `ov-ein` (12 px + Fade, 420 ms, `--ov-delay`), `animate-ov-einblenden`, `animate-ov-skalieren`. Hero: `ov-hero-in` (bleibt). |
| **Page-/View-Transition** | Dokument-Navigation: automatisch (`@view-transition`). Zustandswechsel in einer Seite: `mitUebergang(() => setAnsicht("karte"))`. |
| **Zahlen hochzählen** | `<CountUp value={…} />` bzw. automatisch in `KpiKachel` bei numerischem `wert`. Server-HTML enthält Endwert. |
| **Skeleton-Shimmer** | `<Skeleton/>`, `<SkeletonText/>`, `<SkeletonKarte/>`, `<SkeletonTabelle/>`; `KpiKachel laedt`, `Kennzahl laedt`, `Karte laedt`. Bereich `aria-busy="true"`. |
| **Erfolgs-Feedback** | `<ErfolgsHaken/>` + Text; danach `toast.erfolg(…)` nur, wenn die Ansicht bleibt. |
| **Diagramm-Einlauf** | Balken `className="ov-balken-y"` (bzw. `-x`) mit `style={{"--i": index}}`; Linien `pathLength="1" className="ov-linie"`; Flächen `ov-flaeche-ein`; Ringe `ov-ring-wert`. Auslöser: umgebendes `<Reveal dir="ohne">` oder `ov-sofort`. |
| **Aufmerksamkeit** | `signal(el, "puls"|"schuetteln"|"hoch")` (Web Animations API), z. B. Fehlerfeld schütteln. |
| **Live** | `ov-live-punkt` bzw. `<Badge live>` – Ping per transform. |

### 3.3 Regeln

- Nur `transform` und `opacity` animieren (Ausnahme: `stroke-dashoffset` beim einmaligen Linien-Einlauf). Kein `filter: blur` (in 2.0 aus Reveal/Hero entfernt), kein `width/height/top`.
- `prefers-reduced-motion: reduce`: globaler Block setzt alle Dauern auf 0.01 ms; alle Muster haben gesicherte Endzustände. Eigene JS-Animationen: `bewegungReduziert()` / `useReduzierteBewegung()` prüfen.
- Endlos-Animationen nur für Live-Zustände und Ladeanzeigen, nie im Lesefluss.
- Max. 3 gleichzeitig animierende Gruppen im Viewport.
- **Ausnahme Seitenkopf (Navbar):** Die einmalige Höhenänderung beim Überschreiten der Scroll-Schwelle (84 → 68 px) und das Ein-/Ausklappen der Live-Leiste dürfen Höhe animieren, weil (a) der Kopf `fixed` ist und keinen Seiteninhalt verschiebt, (b) per Klassenwechsel an einer Schwelle ausgelöst wird, nie scroll-gekoppelt pro Frame, (c) Hintergründe/Schatten per `opacity` getrennter Ebenen wechseln. Bevorzugtes Muster für neue Leisten: feste Höhe + `translateY` (einfahren) statt `max-height`.
- `ov-card-hover` (2.0): Schatten über `::before` + `opacity`; Karten mit `overflow-hidden` bekommen den Schatten ohne Übergang.

---

## 4. Komponenten-Regeln

Bausteine: `src/components/ui/*` (Website + Portal) und `src/components/Portal/ui.js` (Portal-Basis). Neue Primitives 2.0:

| Datei | Export | Zweck |
|---|---|---|
| `ui/Badge.js` | `Badge`, `BADGE_TOENE` | Status-Chip: `ton` neutral/info/success/warn/danger/marke/navy/dunkel/glas, `punkt`, `live`, `icon`, `groesse` |
| `ui/KpiKachel.js` | `KpiKachel`, `Trend` | Kennzahl mit Zähler, Einheit, Trend, Sparkline, Ladezustand; `ton` hell/dunkel/marke |
| `ui/Sparkline.js` | `Sparkline` | Mini-Verlauf (SVG, läuft ein) |
| `ui/FortschrittsRing.js` | `FortschrittsRing` | Quote/Auslastung als Ring (`role=progressbar`) |
| `ui/Skeleton.js` | `Skeleton`, `SkeletonText`, `SkeletonKarte`, `SkeletonTabelle` | Ladezustände ohne Layout-Sprung |
| `ui/Toast.js` | `toast`, `toast.erfolg/info/warnung/fehler`, `Toaster` | Rückmeldungen, ohne Provider nutzbar |
| `ui/Tooltip.js` | `Tooltip` | Hover + Fokus, Esc (WCAG 1.4.13) |
| `ui/Dialog.js` | `Dialog` | natives `<dialog>`, mobil Bottom-Sheet, `ton="danger"` |
| `ui/Rueckfrage.js` | `bestaetigen`, `abfragen` | **Ersatz für `confirm()`/`prompt()`** – Promise, ohne Provider (siehe unten) |
| `ui/Tabs.js` | `Tabs` | WAI-ARIA-Tabs, gleitender Indikator, `variante` linie/pille |
| `ui/Stagger.js` | `Stagger` | gestaffeltes Einblenden |
| `ui/ErfolgsHaken.js` | `ErfolgsHaken` | Erfolgsanimation |
| `ui/IllustrationRahmen.js` | `IllustrationRahmen` | Fläche/Raster/Schein für Illustrationen |
| `ui/illustration.js` | `ILLU`, `iso`, `quader`, `punkte` | Illustrations-Palette + Isometrie-Helfer |
| `ui/datenfarben.js` | `KATEGORIE_HELL/DUNKEL`, `SEQUENZ_*`, `DIVERGIEREND`, `ENERGIE`, `STATUS`, `ACHSE`, `LINIENSTIL`, `kategorieFarbe`, `fmtZahl` | Diagrammfarben |
| `ui/motion.js` | `mitUebergang`, `useSichtbar`, `useReduzierteBewegung`, `bewegungReduziert`, `signal`, `DAUER`, `KURVE` | Motion-Helfer (Client) |

Erweitert (abwärtskompatibel): `PageHero` (+ `szene` für `variant="dark"`: Illustration rechts ab xl), `Button` (+ `variant` danger/dangerLeise/link, `size="xs"`, `laedt`, `block`), `Portal/ui`: `Karte` (+ `ton` hell/ruhig/erhaben, `icon`, `laedt`), `Kennzahl` (+ `trend`, `verlauf`, `einheit`, `laedt`, Hover-Lift), `Leer` (+ `illustration`, `sekundaer`), `Badge`/`Hinweis` (+ `danger`, `success`), `Tabelle` (Kopfzeile getönt, Zeilen-Hover), `SeitenKopf` (fluid Titel, Einstieg), `Stepper` (Kontrast künftiger Schritte).

### Karten
- Standard: `rounded-3xl bg-white ring-1 ring-ink-200/70 shadow-e1` bzw. Klassen `ov-flaeche`, `ov-flaeche-erhaben`, `ov-flaeche-ruhig`, `ov-flaeche-dunkel`.
- Pro Ansicht **höchstens eine** erhabene Karte (`e3`) oder dunkle Hero-Karte („Nächster Schritt“).
- Klickbare Karten: ganze Fläche ist der Link, `ov-lift`, Pfeil-Icon rechts oben, `hover:ring-ov-200`.
- Kopf: Titel 17 px/700, Untertitel 13.5 px `ink-500`, Aktion rechts (`PfeilLink`).

### KPI-Kacheln
- 4er-Reihe Desktop, 2er Tablet, 1–2er Handy (`grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4`).
- Reihenfolge: Label → Zahl (+Einheit) → Kontext (Trend + Hinweis). Sparkline rechts neben der Zahl.
- Trend-Farbe nach Bedeutung (`richtung: "runter-gut"` für Kosten, Fehler, Verzug), nie nach Vorzeichen.
- Höchstens eine `ton="dunkel"` oder `"marke"`-Kachel pro Reihe (die wichtigste bzw. Alarm).

### Tabellen
- `Tabelle` aus `Portal/ui` (horizontaler Scroll < 640 px). Zahlen rechtsbündig + `ov-num`, Status als `Badge`/`StatusBadge`, Aktionen rechts als Ghost-Buttons (`size="xs"`).
- Zeilenhöhe ≥ 48 px, Kopf versal 12 px `ink-500`, Zeilen-Hover `ink-50`.
- Lädt: `SkeletonTabelle`; leer: `Leer` in der Karte; Massenaktionen: Leiste über der Tabelle, erscheint mit `animate-ov-einblenden`.

### Formulare
- Label immer sichtbar über dem Feld (14 px/600 `ink-900`), Hilfetext darunter 13 px `ink-500`, Fehler darunter 13 px `danger-700` mit Icon, Feld `ring-danger-300`, `aria-invalid` + `aria-describedby`.
- Felder: `h-12 rounded-2xl bg-white ring-1 ring-inset ring-ink-200 px-4`, Fokus `ring-2 ring-ov-500`. Mobil ≥ 16 px Schrift (kein iOS-Zoom).
- Primäre Aktion rechts unten (mobil volle Breite, `block`), `Button laedt` während des Sendens, danach `ErfolgsHaken` + Text oder `toast.erfolg`.
- Fehler fokussieren: erstes fehlerhaftes Feld per `focus()` + `signal(el, "schuetteln")`.
- Assistenten: Schrittwechsel `ov-step-vor` / `ov-step-zurueck` (bleibt), Fortschritt `Stepper`/`FortschrittsRing`.

### Leerzustände
- `Leer` mit Illustration (T7) oder Icon, Titel = was fehlt, Text = warum/was es bringt, eine primäre Aktion, optional eine leise zweite.
- Ton: einladend, nie vorwurfsvoll („Noch keine Flächen – legen Sie die erste in 2 Minuten an.“).

### Toasts
- Nur Bestätigung/Hinweis zu einer gerade ausgeführten Aktion. Max. 4 gleichzeitig, 5 s (Fehler 8 s, Pause bei Hover/Fokus), Esc schließt.
- Mit Rückgängig, wo möglich (`aktion: { label: "Rückgängig", onClick }`). Nie für Formular-Feldfehler.

### Dialoge
- Nur für Entscheidungen und kurze Eingaben. Titel als Frage oder Handlung, Text mit Konsequenz, Aktionen: primär rechts, „Abbrechen“ links (mobil gestapelt, primär oben).
- Destruktiv: `Dialog ton="danger" icon={Trash2}` + `Button variant="danger"`; Aktion benennt das Objekt („Fläche löschen“).

### Rückfragen statt `confirm()` / `prompt()`

Browser-Dialoge sind tabu (keine Marke, kein Kontext, Sprache je Browser). Stattdessen:

```js
import { bestaetigen, abfragen } from "@/components/ui/Rueckfrage";

// confirm() → Promise<boolean>
const ok = await bestaetigen({
  titel: "Zuschlag an Bieter B erteilen?",            // Frage, Pflicht
  text: "Alle anderen Gebote werden abgelehnt.",       // Folge in einem Satz
  details: [{ label: "Gebot", wert: "4,2 Mio. €" }],   // Kontextzeilen (oder Strings)
  bestaetigenText: "Zuschlag erteilen",                // Verb + Objekt
  gefahr: false,                                       // true: rot, Warn-Icon, Startfokus „Abbrechen“
});
if (!ok) return;

// prompt() → Promise<string | null>   (null = abgebrochen, sonst getrimmter Text)
const grund = await abfragen({
  titel: "Gebot zurückziehen?",
  label: "Begründung",          // sichtbares Feldlabel
  pflicht: true, mindestlaenge: 10, maxlaenge: 2000,
  mehrzeilig: true,             // Textarea (Strg+Enter sendet)
  standard: "", platzhalter: "", hilfe: "Der Anbieter sieht diese Begründung.",
  typ: "text",                  // einzeilig: text | email | number | date | url
  pruefen: (v) => (v.includes("@") ? null : "Bitte E-Mail angeben"), // optional
  gefahr: true, bestaetigenText: "Gebot zurückziehen",
});
if (grund === null) return;
```

Kurzform: `bestaetigen("Entwurf verwerfen?")`. Mehrere Aufrufe werden nacheinander gezeigt. Esc/Hintergrund = Abbrechen; der Fokus kehrt zum Auslöser zurück. Microcopy: Titel als Frage, Knopf mit Verb, nie „OK“/„Ja“. Migration der 64 Aufrufstellen übernimmt das zuständige Team (Muster: `if (!confirm(x)) return;` → `if (!(await bestaetigen({ titel: x }))) return;` – Handler `async` machen).

### Tabs
- `linie` für Seiten-Unterbereiche, `pille` für Ansichtswechsel (Liste/Karte, Tag/Monat/Jahr). Max. 6 Tabs, Zähler optional. Wechsel animiert über `ov-tab-panel`.

### Badges
- Immer mit Text. Punkt für Status, Icon für Typ, `live` nur für Echtzeitdaten. Größe `sm` in Tabellen/Listen, `md` in Köpfen.

---

## 5. Illustrationsstil

- **Isometrie 30°** (Helfer `iso`, `quader` aus `ui/illustration.js`), klare Körper: Modulreihen, Gestelle, Speichercontainer, Trafostation, Hof/Stall, Carport, Windrad (nur als Kontext), Strommast, Gemeinde-Silhouette.
- **Flächen statt Verläufe:** drei Helligkeiten je Körper – oben hell, links mittel, rechts dunkel (`ILLU.gruenOben/Links/Rechts`, `modulOben/Links/Rechts`, `hellOben/Links/Rechts`). Verläufe nur für Himmel/Lichtschein.
- **Linien:** 1.5 px, `ILLU.kontur` (navy-800), runde Enden. Energiefluss als gestrichelte grüne Linie (`ILLU.strom`, `stroke-dasharray="4 6"`), optional animiert mit `ov-linie`.
- **Palette:** nur `ILLU` (Marken-Grün, Navy, Sand, Weiß, Sonne als Akzent). Max. ein Sonnen-Akzent pro Bild.
- **Rahmen:** `IllustrationRahmen ton="sand|gruen|navy|weiss" format="16/10"` – feste Seitenverhältnisse, kein Layout-Sprung.
- **Bibliothek (T7, fertig):** `src/components/illustrationen/index.js` – Import `import { SolarparkLandschaft, KeineDokumente, SpotAgriPv, MarkenMotiv } from "@/components/illustrationen"`. Der Katalog **`MOTIVE`** (gleiche Datei) listet jedes Motiv mit Kurzdoku und empfohlener Einsatzstelle; Galerie unter **`/design/illustrationen`**. Gemeinsame Props: `className`, `ton` (`hell` | `dunkel`), `animiert`, `titel` (gesetzt → `role="img"`, sonst dekorativ). Formate: Hero 16:10, Leerzustand 5:4 (für `Leer illustration={…}`), Spot 1:1, Marke 1:1. Vor einem neuen Motiv immer erst `MOTIVE` prüfen.
- Keine Personen mit Gesichtern, keine Fotomontagen, keine fremden Logos, keine Emojis. Dekorative SVG `aria-hidden`, inhaltstragende mit `role="img"` + `aria-label`.
- Bewegung in Illustrationen: höchstens Energiefluss (Linie) und sanftes Schweben (`animate-ov-float`) – unter reduced-motion still.

## 6. Icon-Regeln

- Nur `lucide-react`. Strichstärke 1.8–2 (Standard 2; in großen Icon-Kacheln 1.8).
- Größen: 14 px (in Badges), 16 px (Buttons klein, Tabellen), 18 px (Kacheln, Navigation), 20–24 px (Kartenköpfe, Leerzustände).
- Icon-Kachel: `rounded-xl bg-ov-50 text-ov-600` (36 px) bzw. `rounded-2xl` (48 px); auf Dunkel `bg-white/10 text-ov-300`.
- Icons immer `aria-hidden="true"`; reine Icon-Buttons brauchen `aria-label` und ≥ 40 px Zielgröße.
- Eine Bedeutung = ein Icon (Projekt `FolderKanban`, Fläche `LandPlot`, Börse `TrendingUp`, Energie `Zap`, Solar `SunMedium`, Speicher `BatteryCharging`, Dokument `FileText`, Nachricht `MessagesSquare`, Warnung `TriangleAlert`, Erfolg `CheckCircle2`).

## 7. Datenvisualisierung

Palette in `ui/datenfarben.js`. Regeln:
- **Kategorien hell:** navy-700 → ov-500 → sun-600 → navy-400 → ov-800 → ink-500 (alle ≥ 3:1 auf Weiß). Max. 4 Kategorien, Rest „Sonstige“ in `ink-300`.
- **Kategorien dunkel:** ov-300, navy-300, sun-300, danger-300, ink-300 (alle ≥ 6.9:1 auf navy-950).
- **Zweites Merkmal:** Linien zusätzlich per `LINIENSTIL` (gestrichelt/gepunktet) oder Marker unterscheiden; Balken direkt beschriften.
- **Sequenziell:** `SEQUENZ_GRUEN` (Menge, Erzeugung), `SEQUENZ_NAVY` (Dichte, Auslastung). **Divergierend:** `DIVERGIEREND` Navy ↔ Sonne (farbenblind-sicher, kein Rot-Grün).
- **Feste Energie-Bedeutungen (`ENERGIE`):** Erzeugung = Sonne, Verbrauch = Navy, Eigenverbrauch = Grün, Einspeisung = Hellgrün, Netzbezug = Grau, Speicher = Blau, Prognose/Plan = Grau gestrichelt. Überall gleich!
- Achsen/Raster: `ACHSE.hell|dunkel`; Raster nur horizontal, Achsenbeschriftung 12 px `ink-500`, keine 3D-Effekte, keine Tortendiagramme mit > 3 Segmenten (lieber Balken).
- Jedes Diagramm: Titel + Einheit, `role="img"` + `aria-label` mit Kernaussage, zusätzlich Datentabelle (z. B. `<details>`) oder Tooltip-Werte per Tastatur erreichbar.
- Einlauf: einmal beim Einscrollen (`Reveal dir="ohne"` + `ov-balken-y`/`ov-linie`), Datenaktualisierung ohne erneuten Einlauf (nur Übergang der Werte).

---

## 8. Teams (Dateizuständigkeit)

Jede Datei hat genau einen Eigentümer. Fremde Dateien nur lesen; gemeinsame Dateien (siehe BRIEFING „Spielregeln“) nur mit kleinen, gezielten Einfügungen. Bausteine aus `src/components/ui/**`, `src/components/Portal/ui.js` und `src/app/globals.css` gehören dem **Design-System (DS)** – Wünsche/Fehler an DS melden, nicht lokal überschreiben (lokale Klassen in eigener Datei sind okay).

| Team | Eigentum | Schwerpunkt mit 2.0 |
|---|---|---|
| **DS** Design-System | `src/app/globals.css`, `src/components/ui/**`, `src/components/Portal/ui.js`, `src/app/design/page.js` + `Demos.js`, `docs/DESIGN.md` | Tokens, Primitives, Styleguide |
| **T1** Website-Startseite & Landingpages | `src/app/**` **ohne** `portal/`, `api/`, `rechner/`, `energiegemeinschaften/`, `flaechencheck/`, `design/`; `src/components/**` **ohne** `ui/`, `Portal/`, `Rechner/`, `Plattform/`, EG-Komponenten, `illustrationen/` und die Diagrammdateien von T4 | Hero-Rhythmus, Stagger in Rastern, `KpiKachel`/`ov-kpi*` für Kennzahlenbänder, Illustrationen von T7 einsetzen |
| **T2** Rechner & Tools | `src/components/Rechner/**`, `src/app/rechner/**`, `src/app/flaechencheck/**` (+ Flächencheck-Komponenten) | Ergebnis-Kacheln mit `KpiKachel`, `Tabs variante="pille"` für Szenarien, `mitUebergang` bei Szenariowechsel; Diagramme in Rechner-Dateien nach T4-Regeln |
| **T3** Portal-Rahmen, Navigation, Dashboards | `src/components/Portal/PortalRahmen.js`, `src/components/Portal/Bedienung/**` (ohne `Bedienung/Onboarding/**`), `src/app/portal/page.js`, `src/app/portal/admin/page.js`, Cockpit-Seiten/-Komponenten (`*Cockpit*`, `Backoffice/` außer Diagrammen) | `SeitenKopf`, `KpiKachel`-Reihen, eine erhabene Karte je Dashboard, Skeletons, Toasts, Navigation mit `ov-nacht-*` |
| **T4** Datenvisualisierung | alle Diagramm-Komponenten: `EnergieLive/*Chart*.js`, `Marktdaten/*Chart*.js`, `Portal/Energie/Diagramme.js`, `Portal/Anlagen/Verlauf.js`, `Portal/Backoffice/Diagramme.js`, `Portal/Dealroom/Diagramme.js`, `Portal/Entwicklung/Gantt.js`, `Portal/Entwicklung/JahresChart.js`, `Portal/Fach/Energie/Lastgang.js`, Diagrammdateien unter `Portal/EG/Energie/**`; neue unter `src/components/diagramme/**` | `datenfarben.js`, Einlauf-Klassen, `Sparkline`/`FortschrittsRing`, zugängliche Tooltips + Datentabellen |
| **T5** Formulare, Assistenten, Onboarding, Login | `src/components/Plattform/**`, `src/components/Portal/Bedienung/Onboarding/**`, Wizard-Komponenten (`*Wizard*`, `*Assistent*`, `Portal/*Formular*.js`, `Portal/felder.js`), `src/app/login/**`, `registrieren/**`, `passwort-vergessen/**`, `einladung/**` | Formularregeln (§ 4), `Button laedt`, `ErfolgsHaken`, Fehler-`signal`, Schrittwechsel |
| **T6** Energiegemeinschaften-Oberflächen | `src/components/Portal/EG/**` (ohne T4-Diagrammdateien), `src/app/energiegemeinschaften/**`, `src/app/portal/eg*/**` bzw. EG-Portalrouten, `src/components/Gemeinschaft/**` | `Tabs`, `KpiKachel`, `Badge` für Mitglieds-/Abrechnungsstatus, Leerzustände mit T7-Illustrationen |
| **T7** Illustration & Grafik | `src/components/illustrationen/**`, `src/app/design/illustrationen/**` (Galerie) | Isometrische SVG-Motive nach § 5 als Komponenten (Props: `className`, `ton`, `animiert`), Leerzustands-Set, Hero-Grafiken; liefert an T1/T3/T6 (die setzen ein) |

Konfliktregel: Liegt eine Datei in zwei Bereichen, gilt die **spezifischere** Zeile (Diagrammdatei → T4; Onboarding unter Bedienung → T5). Unklar → beim Koordinator fragen, nicht beide bearbeiten.

## 9. Abnahme-Checkliste (jede Änderung)

- [ ] Nur Tokens aus diesem Dokument; keine neuen Hex-Werte im Markup (Ausnahme Illustrationen über `ILLU`, Diagramme über `datenfarben.js`).
- [ ] Kontrast geprüft (Text ≥ 4.5:1, Grafik ≥ 3:1), Fokus sichtbar, Tastatur komplett bedienbar.
- [ ] `prefers-reduced-motion` getestet (Endzustände korrekt).
- [ ] 390 px ohne horizontalen Überlauf, 1440 px ohne verlorene Leere.
- [ ] Keine Layout-Sprünge (Skeleton in Endgröße, feste Seitenverhältnisse).
- [ ] Nur `transform`/`opacity` animiert.
- [ ] ESLint grün, Seite 200 ohne Laufzeitfehler (Screenshot-Werkzeug laut BRIEFING).
