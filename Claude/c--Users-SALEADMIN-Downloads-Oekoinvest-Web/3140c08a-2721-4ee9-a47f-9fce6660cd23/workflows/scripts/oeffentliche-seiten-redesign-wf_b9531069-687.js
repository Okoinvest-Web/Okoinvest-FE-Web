export const meta = {
  name: 'oeffentliche-seiten-redesign',
  description: 'Alle öffentlichen Seiten (~70) massiv verbessern – 13 Designer-Pakete mit Browser-Prüfung, max. 3 parallel, dann Gesamt-QA',
  phases: [
    { title: 'Gestalten', detail: '13 Pakete, je ein Designer mit eigenen Dateien, höchstens 3 gleichzeitig' },
    { title: 'Gesamt-QA', detail: 'alle Seiten in 1440/390 prüfen, Fehler beheben' },
  ],
}

const ROOT = 'C:/Users/SALEADMIN/Downloads/Oekoinvest-Web'
const SHOTS = 'C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/wf3'
const BASE = 'http://localhost:3100'

const REGELN = `Projekt: Next.js 15 App Router, React 19, Tailwind v4 unter ${ROOT}. Dev-Server läuft unter ${BASE} (NICHT neu starten, NICHT next build ausführen).
Design-System: Tokens und ov-*-Klassen in src/app/globals.css (ov-*, ink-*, sand-*, sun-*, navy; shadow-e1..e4; ov-h1/ov-h2/ov-h3/ov-lead/ov-text/ov-lift/ov-glass/ov-noise/ov-verlauf-nacht/ov-text-gradient …), Styleguide src/app/design.
REFERENZ für das Qualitätsniveau: Die Seite ${BASE}/energiegemeinschaften/software wurde gerade von einem Team auf Weltklasse-Niveau gebracht (Code: src/components/Portal/EG/Produkt/Seite/*, Mockups.js). Schau sie dir zu Beginn kurz an (1 Screenshot-Runde) und erreiche dasselbe Niveau in derselben Markensprache.
Feste Regeln:
- NUR die dir zugewiesenen Dateien/Ordner ändern. Gemeinsam genutzte Bausteine sind TABU (nur nutzen): src/components/ui/*, src/components/Reusable/*, src/components/Landing/*, src/components/illustrationen/*, src/components/Plattform/AnfrageFormular*, src/app/globals.css, src/app/layout.js, Header/Footer/Navigation, src/components/Rechner/RechnerSeite* (außer Paket „rechner“), src/components/Portal/EG/* (gehört zur Referenzseite), src/components/Gemeinschaft/AnfrageMitDaten*.
- Bevor du eine Komponente in deinen Ordnern änderst: mit grep prüfen, wo sie noch genutzt wird; Schnittstellen rückwärtskompatibel halten und betroffene Seiten mitprüfen.
- Keine neuen npm-Abhängigkeiten. Eigene Grafiken als Inline-SVG/CSS erwünscht.
- Texte deutsch (en/* englisch), korrekte Umlaute, Sie-Form. KEINE erfundenen Zahlen, Kundenstimmen, Logos, Referenzen, Zertifikate, Auszeichnungen, Unternehmenskennzahlen. Fachliche/rechtliche Aussagen, Rechenlogik, Formularfelder und API-Aufrufe inhaltlich unverändert. Metadata/SEO/JSON-LD erhalten.
- WCAG 2.1 AA, sichtbarer Fokus, prefers-reduced-motion, keine Endlos-Animationen ohne Grund.
- Server-/Client-Grenzen beachten. Keine git-Commits.
RESSOURCEN (wichtig, der Rechner hat nur 8 GB RAM): Screenshots nur bei 1440 und 390 (768 nur einmal am Ende), immer nur eine Seite pro Aufruf, keine eigenen langlebigen Browser-Prozesse, kein --full.`

const SHOT = (key) => `Visuelle Prüfung (PFLICHT): cd ~/claude-browser && node shot.mjs ${BASE}<pfad> ${SHOTS}/${key}/<runde> 1440,390 --tiles
(--el=<css> für einzelne Bereiche). PNGs mit dem Read-Tool ANSEHEN und kritisch wie ein Art Director beurteilen. Fehler und horizontaler Überlauf müssen 0 sein. Zeigt eine Seite kurz einen Fehler aus fremden Dateien (andere Designer arbeiten parallel), 20 s warten und erneut aufnehmen.`

const PAKETE = [
  { key: 'start', titel: 'Startseite', seiten: ['/'], dateien: ['src/app/page.js', 'src/components/Home/'] },
  { key: 'flaeche', titel: 'Freifläche & Flächenverpachtung', seiten: ['/freiflaeche', '/flaeche-verpachten', '/flaechencheck', '/rechner/pacht', '/angebot'], dateien: ['src/app/freiflaeche/', 'src/app/flaeche-verpachten/', 'src/app/flaechencheck/', 'src/app/rechner/pacht/', 'src/app/angebot/', 'src/components/Flaeche/', 'src/components/Angebot/'] },
  { key: 'dach', titel: 'Dach & Bestandsanlagen', seiten: ['/dachflaeche-verpachten', '/bestandsanlagen', '/rechner/dachpacht', '/rechner/bestandsanlage'], dateien: ['src/app/dachflaeche-verpachten/', 'src/app/bestandsanlagen/', 'src/app/rechner/dachpacht/', 'src/app/rechner/bestandsanlage/', 'src/components/Dach/', 'src/components/Bestand/'] },
  { key: 'agri', titel: 'Agri-PV & Landwirte', seiten: ['/agri-pv', '/landwirte', '/rechner/agri-pv'], dateien: ['src/app/agri-pv/', 'src/app/landwirte/', 'src/app/rechner/agri-pv/', 'src/components/Agri/'] },
  { key: 'speicher', titel: 'Großspeicher, Solarcarport, Virtuelles Kraftwerk', seiten: ['/grossspeicher', '/solarcarport', '/virtuelles-kraftwerk'], dateien: ['src/app/grossspeicher/', 'src/app/solarcarport/', 'src/app/virtuelles-kraftwerk/', 'src/components/Speicher/', 'src/components/Carport/', 'src/components/Energie/'] },
  { key: 'kommune', titel: 'Kommunen, Genossenschaft, Energiegemeinschaften-Übersicht', seiten: ['/kommunen', '/genossenschaft', '/energiegemeinschaften', '/energiegemeinschaften/rechner'], dateien: ['src/app/kommunen/', 'src/app/genossenschaft/', 'src/app/energiegemeinschaften/page.js', 'src/app/energiegemeinschaften/rechner/', 'src/components/Kommune/', 'src/components/Gemeinschaft/ (außer AnfrageMitDaten*)'] },
  { key: 'markt', titel: 'Investoren, Marktdaten, Energie live, Reststrom', seiten: ['/investoren', '/marktdaten', '/energie-live', '/reststrom', '/rechner/reststrom'], dateien: ['src/app/investoren/', 'src/app/marktdaten/', 'src/app/energie-live/', 'src/app/reststrom/', 'src/app/rechner/reststrom/', 'src/components/Investoren/', 'src/components/Marktdaten/', 'src/components/EnergieLive/', 'src/components/Reststrom/'] },
  { key: 'boerse', titel: 'Projektbörse & Regionen', seiten: ['/projektboerse', '/projektboerse/karte', '/projektboerse/anbieten', '/regionen', '(eine Projektdetailseite und eine Regionsseite: Slugs aus Daten/Links der Übersicht ermitteln)'], dateien: ['src/app/projektboerse/', 'src/app/regionen/', 'src/components/Boerse/', 'src/components/Region/'] },
  { key: 'vertrauen', titel: 'Unternehmen, Warum ÖkoInvest, Referenzen, Prozess, Kontakt, FAQ', seiten: ['/unternehmen', '/warum-oekoinvest', '/referenzen', '/prozess', '/kontakt', '/faq'], dateien: ['src/app/unternehmen/', 'src/app/warum-oekoinvest/', 'src/app/referenzen/', 'src/app/prozess/', 'src/app/kontakt/', 'src/app/faq/', 'src/components/Unternehmen/', 'src/components/Vergleich/', 'src/components/Referenzen/', 'src/components/Prozess/', 'src/components/Kontakt/', 'src/components/Faq/'] },
  { key: 'rechner', titel: 'Rechner-Übersicht und alle Rechner aus src/components/Rechner', seiten: ['/rechner', '/rechner/beteiligung', '/rechner/energy-sharing', '/rechner/grossspeicher', '/rechner/kommune', '/rechner/netzanschluss', '/rechner/pachtangebot-check', '/rechner/ppa', '/rechner/projektbewertung', '/rechner/solarcarport', '/rechner/solarpark'], dateien: ['src/app/rechner/page.js', 'src/app/rechner/{beteiligung,energy-sharing,grossspeicher,kommune,netzanschluss,pachtangebot-check,ppa,projektbewertung,solarcarport,solarpark}/', 'src/components/Rechner/ (inkl. RechnerSeite – wird von vielen Seiten genutzt: nur rückwärtskompatibel, Rechenlogik unverändert)'] },
  { key: 'wissen', titel: 'Ratgeber & Lexikon', seiten: ['/ratgeber', '(ein Ratgeber-Artikel: Slug aus der Übersicht)', '/wissen/lexikon'], dateien: ['src/app/ratgeber/', 'src/app/wissen/', 'src/components/Ratgeber/', 'src/components/Lexikon/'] },
  { key: 'en', titel: 'Englische Seiten', seiten: ['/en', '/en/investors', '/en/project-exchange', '/en/sell-your-project', '/en/contact'], dateien: ['src/app/en/', 'src/components/En/'] },
  { key: 'recht-konto', titel: 'Rechtstexte und Konto-/Einladungsseiten (Gestaltung, Inhalt unverändert)', seiten: ['/impressum', '/datenschutz', '/nutzungsbedingungen', '/barrierefreiheit', '/bedingungen/banken', '/login', '/registrieren', '/passwort-vergessen', '/termin'], dateien: ['src/app/{impressum,datenschutz,nutzungsbedingungen,barrierefreiheit,bedingungen}/', 'src/components/Reusable/LegalShell* (Ausnahme: gehört diesem Paket)', 'src/app/{login,registrieren,passwort-vergessen,termin,einladung}/', 'src/components/Plattform/AuthRahmen*'],
    extra: 'Rechtstexte: Wortlaut NICHT ändern – nur Lesbarkeit, Typografie, Inhaltsverzeichnis/Navigation, Layout. Login/Registrierung/Einladung: Funktion und Felder unverändert, nur Gestaltung.' },
]

// einfacher Begrenzer: höchstens N Agenten gleichzeitig (RAM)
const LIMIT = 3
const ergebnisse = new Array(PAKETE.length)
let next = 0
async function worker() {
  while (next < PAKETE.length) {
    const i = next++
    const p = PAKETE[i]
    log(`Start Paket ${i + 1}/${PAKETE.length}: ${p.titel}`)
    ergebnisse[i] = await agent(`${REGELN}

Du bist ein Weltklasse-UX/UI-Designer, Grafiker und Frontend-Entwickler. Dein Paket: ${p.titel}.
Seiten: ${p.seiten.join(', ')}
Du darfst NUR ändern: ${p.dateien.join(', ')} (neue Dateien nur innerhalb dieser Ordner).
${p.extra || ''}

Ziel: Diese Seiten MASSIV verbessern – visuelle Hierarchie, Rhythmus der Abschnitte, Hero mit Wow-Effekt, hochwertige Karten/Grafiken/Datenvisualisierungen, Nutzerführung zu einer klaren nächsten Aktion, mobile Exzellenz, Konsistenz mit der Referenzseite.

${SHOT(p.key)}

Arbeitsweise je Seite:
1. Ist-Zustand aufnehmen (1440 + 390), ansehen, harte Kritik notieren (mind. 6 Punkte).
2. Umsetzen.
3. Neu aufnehmen, ansehen, nachbessern – mindestens 2 Runden, bis ein Top-Art-Director nichts mehr bemängelt. Am Ende einmal auch 768.
4. npx eslint auf deine geänderten Dateien.
Arbeite die Seiten nach Wichtigkeit ab; wenn die Zeit knapp wird, lieber die wichtigsten Seiten exzellent als alle halb.
Rückgabe (knapp): je Seite die wichtigsten Änderungen, nicht bearbeitete Seiten mit Grund, geänderte Dateien, Pfad je eines finalen Screenshots (1440) pro Seite, offene Punkte.`, { label: `gestalten:${p.key}`, phase: 'Gestalten' })
    log(`Fertig: ${p.titel}`)
  }
}
phase('Gestalten')
await Promise.all(Array.from({ length: LIMIT }, () => worker()))

phase('Gesamt-QA')
const qa = await agent(`${REGELN}

Du bist QA-Lead. 13 Designer haben die öffentlichen Seiten überarbeitet. Berichte:
${PAKETE.map((p, i) => `### ${p.key} – ${p.titel}\n${ergebnisse[i] || '(fehlgeschlagen/leer)'}`).join('\n\n')}

Prüfe:
1. git status / git diff --stat: Hat jemand Dateien außerhalb seines Pakets oder tabu-Dateien geändert? Wenn ja, prüfen ob schädlich und ggf. korrigieren.
2. npx eslint auf alle geänderten Dateien.
3. Jede öffentliche Seite aus allen Paketen nacheinander mit shot.mjs (1440,390 --tiles) laden: Fehler=0, kein Überlauf. Bei jeder Seite mindestens das erste und ein mittleres Kachelbild ansehen.
4. Stichprobe gegen erfundene Fakten: im git diff nach neuen Zahlen, Prozenten, Euro-Beträgen, Kundennamen, Zitaten suchen und mit dem alten Stand vergleichen.
5. Gefundene Fehler direkt beheben (Speicher schonen: Seiten nacheinander).
Rückgabe: Status je Paket (ok / behoben / Problem), Liste behobener Fehler, verbleibende Risiken, 8 Pfade zu den eindrucksvollsten Vorher/Nachher-Screenshots.`, { label: 'gesamt-qa', phase: 'Gesamt-QA' })

return { pakete: PAKETE.map((p, i) => ({ key: p.key, titel: p.titel, bericht: ergebnisse[i] })), qa }
