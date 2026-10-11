export const meta = {
  name: 'eg-software-massiv',
  description: 'Seite /energiegemeinschaften/software massiv verbessern – 10 Agenten mit visueller Browser-Prüfung',
  phases: [
    { title: 'Zerlegen', detail: 'page.js in Abschnittsdateien aufteilen' },
    { title: 'Gestalten', detail: '7 Designer, je eigene Dateien, mit Screenshot-Schleife' },
    { title: 'Gesamtbild', detail: 'Art Director prüft Rhythmus und Konsistenz der ganzen Seite' },
    { title: 'QA', detail: 'Abschlussprüfung in 3 Breiten' },
  ],
}

const ROOT = 'C:/Users/SALEADMIN/Downloads/Oekoinvest-Web'
const SHOTS = 'C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/wf2'
const URL = 'http://localhost:3100/energiegemeinschaften/software'
const SEITE = 'src/components/Portal/EG/Produkt/Seite'

const SHOT = (name) => `Visuelle Prüfung (PFLICHT, mehrfach – vorher UND nach jeder größeren Änderung):
  cd ~/claude-browser && node shot.mjs ${URL} ${SHOTS}/${name}/<runde> 1440,768,390 --el=<css-selektor>
  - Für deine Abschnitte: --el=[data-abschnitt=<name>] (Abschnitte tragen data-abschnitt-Attribute).
  - Ganze Seite beim Scrollen: --tiles statt --el.
  - Die PNGs dann mit dem Read-Tool ANSEHEN und kritisch wie ein Art Director beurteilen (Hierarchie, Abstände, Ausrichtung, Überlappungen, abgeschnittene Texte, Zeilenumbrüche, Kontrast, Leere, Monotonie).
  - Das Skript meldet Konsolenfehler und horizontalen Überlauf – beides muss 0 sein.
  - Der Dev-Server (Turbopack, HMR) läuft schon; andere Agenten ändern gleichzeitig andere Dateien. Zeigt die Seite kurzzeitig einen Fehler aus einer fremden Datei, 20 s warten und erneut aufnehmen. NICHT next build ausführen, Server NICHT neu starten.`

const REGELN = `Projekt: Next.js 15 App Router, React 19, Tailwind v4 unter ${ROOT}. Seite: ${URL}.
Design-System: Tokens und ov-*-Klassen in src/app/globals.css (Farben ov-*, ink-*, sand-*, sun-*, navy; Schatten shadow-e1..e4; ov-h1/ov-h2/ov-h3/ov-lead/ov-text/ov-lift/ov-glass/ov-noise/ov-verlauf-nacht/ov-text-gradient usw.), Bausteine in src/components/ui (NICHT ändern, nur nutzen), Illustrationen in src/components/illustrationen (nutzen erlaubt, nicht ändern), Styleguide src/app/design.
Feste Regeln:
- Keine neuen npm-Abhängigkeiten. Eigene Grafiken als Inline-SVG/CSS sind ausdrücklich erwünscht.
- Texte deutsch, korrekte Umlaute, Sie-Form. KEINE erfundenen Zahlen, Kundenstimmen, Logos, Zertifikate, Auszeichnungen oder Unternehmenskennzahlen. Fachaussagen (ElWG §§, Netzentgelt-Prozente, Fristen, DSGVO) inhaltlich unverändert. Marktvergleich fair, ohne Herabsetzung. Beispielwerte in Mockups als Beispiel gekennzeichnet lassen.
- WCAG 2.1 AA, Fokus sichtbar, prefers-reduced-motion respektieren, keine endlosen Animationen ohne Grund.
- Server-/Client-Grenzen beachten ("use client" nur wo Hooks/Events nötig).
- Keine git-Commits. Nur die dir zugewiesenen Dateien ändern.`

phase('Zerlegen')
const zerlegt = await agent(`${REGELN}

Aufgabe: Zerlege ${ROOT}/src/app/energiegemeinschaften/software/page.js (523 Zeilen) rein mechanisch in Abschnitts-Komponenten unter ${ROOT}/${SEITE}/, damit danach mehrere Designer parallel an getrennten Dateien arbeiten können. KEINE gestalterischen Änderungen – das Ergebnis muss identisch aussehen.
Genau diese Dateien anlegen (Daten-Arrays wandern mit in die Datei, die sie nutzt; gemeinsame Helfer wie Haken in ${SEITE}/teile.js):
- Hero.js (Hero-Section)  → äußeres Element bekommt data-abschnitt="hero"
- Fakten.js (Faktenleiste) → data-abschnitt="fakten"
- Wegweiser.js ("Für wen"/Direkt zu Ihrem Thema) → data-abschnitt="wegweiser"
- Tour.js (Produkt-Tour inkl. TourBild) → data-abschnitt="tour"
- Kassa.js (Für Kassa und Vorstand) → data-abschnitt="kassa"
- Mitglieder.js (Was Mitglieder bekommen) → data-abschnitt="mitglieder"
- RechnerSektion.js (Ersparnis-Rechner-Abschnitt) → data-abschnitt="rechner"
- Elwg.js → data-abschnitt="elwg"
- Vergleich.js → data-abschnitt="vergleich"
- Pakete.js → data-abschnitt="pakete"
- Wechsel.js → data-abschnitt="wechsel"
- Faq.js (FAQ-Abschnitt; Datei-Name kollidiert nicht mit ui/Faq, importiere den ui-Baustein mit Alias) → data-abschnitt="faq"
- Anfrage.js (Anfrage-Abschnitt) → data-abschnitt="anfrage"
- Abschluss.js (Querverweise + CtaBand) → Wrapper mit data-abschnitt="abschluss"
Falls ein ui-Baustein (Section) kein beliebiges Attribut durchreicht, prüfe im Code von src/components/ui/Section.js, ob ...rest weitergegeben wird; sonst umschließe mit einem <div data-abschnitt="..."> (ohne Layout-Wirkung, ggf. className="contents" vermeiden wenn screenshot nötig – lieber normales div).
page.js behält metadata, Schema-JSON-LD, PFAD und setzt nur noch die Abschnitte zusammen. FAQ-Daten werden auch fürs Schema? Prüfe – falls ja, exportiere sie aus Faq.js.
Prüfen: npx eslint auf alle Dateien; dann ${SHOT('zerlegen')}
Mit --el=[data-abschnitt] (alle Abschnitte) bei 1440 aufnehmen und sicherstellen, dass jeder der 14 Abschnitte gefunden wird und gerendert ist, Fehler=0.
Rückgabe: Liste der angelegten Dateien mit Verantwortungsbereich und Bestätigung, dass alles rendert.`, { label: 'zerlegen', phase: 'Zerlegen' })

const GRUPPEN = [
  { key: 'hero', titel: 'Hero, Faktenleiste und Wegweiser', dateien: [`${SEITE}/Hero.js`, `${SEITE}/Fakten.js`, `${SEITE}/Wegweiser.js`], abschnitte: ['hero', 'fakten', 'wegweiser'],
    fokus: 'Der erste Eindruck muss Weltklasse sein (Linear/Stripe/Vercel-Niveau, aber in der ÖkoInvest-Marke). Bekannte Fehler: Faktenleiste mobil – „Neuanmeldungen“ stößt an den Kartenrand; Hero-Text/Buttons/Chips auf dem Handy zu lang und dicht. Die HeroKomposition (Mockups) gehört dem Mockup-Designer – du verantwortest Raster, Spaltenbreiten und Platz für sie im Hero. Wegweiser: klare, schöne Zielgruppen-Karten.' },
  { key: 'mockups', titel: 'Produkt-Mockups und Hero-Komposition', dateien: ['src/components/Portal/EG/Produkt/Mockups.js'], abschnitte: ['hero', 'tour'],
    fokus: 'Du bist der Grafikdesigner. Bekannter Fehler: Im Hero bei 1440 px verdeckt das Handy das Abrechnungsfenster („Vier-Auge…“, „Vorteil Mitglie…“ abgeschnitten) – Komposition so bauen, dass nichts Wichtiges abgeschnitten ist, mit echter Tiefe (Ebenen, Licht, Schatten, Perspektive dezent). Alle Mockups sollen wie echte, hochwertige Produkt-Screenshots wirken: perfekte Ausrichtung, Pixel-Präzision, glaubwürdige Daten-Viz. Export-Namen und Props (className, beschreibung, beispiel, bewegt) bleiben kompatibel; Beispielwerte bleiben (71,40 €, 38 %, 6 von 10 Werktagen, 72 Belege, Versendet Schritt 5 von 6, Vergleich zum September).' },
  { key: 'tour', titel: 'Produkt-Tour und Kassa & Vorstand', dateien: [`${SEITE}/Tour.js`, `${SEITE}/Kassa.js`], abschnitte: ['tour', 'kassa'],
    fokus: 'Tour als erzählerischer Höhepunkt: Bühnen für die Mockups, Text-Bild-Rhythmus, klare Nummerierung. Kassa-Block (6 Karten) ist aktuell ein generisches Karten-Raster – mach daraus etwas Eigenständiges (z. B. Bento mit Mini-Visualisierungen in Inline-SVG, Ablauf-Darstellung), ohne neue Fakten.' },
  { key: 'mitglieder', titel: 'Mitglieder-Nutzen und Rechner', dateien: [`${SEITE}/Mitglieder.js`, `${SEITE}/RechnerSektion.js`, 'src/components/Portal/EG/Mitglied/ErsparnisRechner.js'], abschnitte: ['mitglieder', 'rechner'],
    fokus: 'Der Rechner wird auch auf /energiegemeinschaften/rechner genutzt – Schnittstelle kompatibel halten, Rechenlogik unverändert, dort ebenfalls per Screenshot prüfen. Rechner soll sich wie ein Premium-Werkzeug anfühlen (Hauptzahl, Regler, Ergebnis-Hierarchie, mobil einhändig bedienbar). Mitglieder-Bento ohne Löcher, mit Illustration EnergiegemeinschaftDorf prominent.' },
  { key: 'elwg', titel: 'ElWG und Marktvergleich', dateien: [`${SEITE}/Elwg.js`, `${SEITE}/Vergleich.js`], abschnitte: ['elwg', 'vergleich'],
    fokus: 'ElWG-Block (dunkel) als souveräne, gut lesbare Informationsgrafik (z. B. Zeitleiste/Regel-Karten mit Paragraphen-Badges). Vergleichstabelle: Desktop elegant (hervorgehobene eigene Spalte), Mobil als gut scanbare Liste. Fakten und Quellenhinweise wörtlich beibehalten.' },
  { key: 'pakete', titel: 'Pakete und Wechsel', dateien: [`${SEITE}/Pakete.js`, `${SEITE}/Wechsel.js`], abschnitte: ['pakete', 'wechsel'],
    fokus: 'Pakete als klare Entscheidungshilfe (für wen, was enthalten, nächster Schritt; mittleres Paket hervorgehoben; gleiche Höhen, Ausrichtung der Listen). Preise bleiben „auf Anfrage“ – keine Preise erfinden. Wechsel als visueller Ablauf in 4 Schritten (Zeitstrahl), der Sicherheit ausstrahlt.' },
  { key: 'abschluss', titel: 'FAQ, Anfrage und Seitenabschluss', dateien: [`${SEITE}/Faq.js`, `${SEITE}/Anfrage.js`, `${SEITE}/Abschluss.js`], abschnitte: ['faq', 'anfrage', 'abschluss'],
    fokus: 'Anfrage-Abschnitt soll zum Abschluss motivieren: was passiert nach dem Absenden (Ablauf), Zusagen, ansprechendes Formular-Umfeld. AnfrageMitDaten-Props/Felder funktional unverändert lassen. FAQ gut scanbar. Abschluss ohne Redundanz.' },
]

phase('Gestalten')
const gestaltet = await parallel(GRUPPEN.map(g => () => agent(`${REGELN}

Du bist ein Weltklasse-UX/UI-Designer und Frontend-Entwickler (Niveau der besten Produktseiten der Welt) und verantwortest auf der Seite: ${g.titel}.
Du darfst NUR diese Dateien ändern: ${g.dateien.join(', ')} (neue Hilfsdateien nur mit Präfix in ${SEITE}/ und nur von dir genutzt). Andere Designer arbeiten gleichzeitig an den übrigen Abschnitten.
Ergebnis der Zerlegung (Kontext):
${zerlegt}

Ziel: deine Abschnitte MASSIV verbessern – visuell, in Nutzerführung und in Details. ${g.fokus}

${SHOT(g.key)}
Deine Abschnitte: ${g.abschnitte.map(a => `[data-abschnitt=${a}]`).join(', ')} – data-abschnitt-Attribute müssen erhalten bleiben.

Arbeitsweise:
1. Ist-Zustand in 1440/768/390 aufnehmen und ansehen; schreibe dir eine harte Kritik (mind. 8 Punkte).
2. Umsetzen.
3. Neu aufnehmen, ansehen, nachbessern. Mindestens 3 Runden, bis du in allen drei Breiten nichts mehr findest, das ein Top-Art-Director bemängeln würde.
4. npx eslint auf deine Dateien.
Rückgabe: knappe Liste der Änderungen, Pfade der finalen Screenshots je Breite, offene Punkte.`, { label: `gestalten:${g.key}`, phase: 'Gestalten' })))

phase('Gesamtbild')
const gesamt = await agent(`${REGELN}

Du bist Art Director. Sieben Designer haben gerade parallel die Abschnitte der Seite überarbeitet (Dateien unter ${SEITE}/, Mockups.js, ErsparnisRechner.js). Ihre Berichte:
${gestaltet.map((r, i) => `### ${GRUPPEN[i].key}\n${r || '(fehlgeschlagen)'}`).join('\n\n')}

Aufgabe: Die Seite als GANZES zu einem Meisterwerk machen. Nimm sie mit --tiles in 1440, 768 und 390 auf und sieh JEDES Bild an. Prüfe: Abschnittsrhythmus (Hintergrundtöne, Abstände zwischen Abschnitten), einheitliche Überschriften-, Eyebrow- und Kartensprache, keine doppelten Inhalte, Übergänge, Konsistenz von Icons, Radien, Schatten, Buttons; mobile Lesbarkeit; nichts abgeschnitten oder überlappend.
Du darfst alle Dateien unter ${SEITE}/, page.js, Mockups.js und ErsparnisRechner.js ändern. Korrigiere direkt, nimm neu auf, wiederhole bis es stimmt (mind. 2 Runden).
${SHOT('gesamt')}
Rückgabe: was du vereinheitlicht/korrigiert hast, offene Punkte.`, { label: 'art-director', phase: 'Gesamtbild' })

phase('QA')
const qa = await agent(`${REGELN}

Du bist QA-Lead. Prüfe die überarbeitete Seite abschließend:
- npx eslint src/app/energiegemeinschaften/software ${SEITE} src/components/Portal/EG/Produkt/Mockups.js src/components/Portal/EG/Mitglied/ErsparnisRechner.js
- ${SHOT('qa')} – --tiles in 1440, 768, 390 UND http://localhost:3100/energiegemeinschaften/rechner in 1440, 390. Fehler=0, kein Überlauf, alle Bilder ansehen.
- Tastatur: mit Playwright (eigenes kurzes Skript in ~/claude-browser, z. B. qa-tab.mjs) 25× Tab drücken und prüfen, dass der Fokus sichtbar ist und nichts Unsichtbares fokussiert wird.
- Überschriftenhierarchie (genau eine h1, keine Sprünge), Bild-/aria-Texte passen zu den sichtbaren Mockup-Werten, keine erfundenen Fakten (git diff gegen HEAD lesen: neue Zahlen/Behauptungen prüfen), Umlaute korrekt.
- Gefundene Fehler direkt beheben.
Bericht des Art Directors:
${gesamt}
Rückgabe: Status, behobene Probleme, verbleibende Risiken, Pfade der finalen Screenshots (je eine Auswahl der besten 6).`, { label: 'qa', phase: 'QA' })

return { zerlegt, gestaltet, gesamt, qa }
