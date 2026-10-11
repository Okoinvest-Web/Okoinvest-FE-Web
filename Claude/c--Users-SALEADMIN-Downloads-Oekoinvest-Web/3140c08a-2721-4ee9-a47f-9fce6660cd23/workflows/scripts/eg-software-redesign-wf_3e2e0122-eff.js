export const meta = {
  name: 'eg-software-redesign',
  description: '10 Agenten verbessern UX/UI/Grafik der Seite /energiegemeinschaften/software',
  phases: [
    { title: 'Analyse', detail: '6 Spezialisten prüfen die Seite (nur lesen)' },
    { title: 'Umsetzung', detail: '3 Umsetzer mit getrennten Dateien' },
    { title: 'QA', detail: 'Lint, Seitenprüfung, Korrekturen' },
  ],
}

const CTX = `Projekt: Next.js 15 (App Router, Tailwind v4, React 19) unter C:/Users/SALEADMIN/Downloads/Oekoinvest-Web.
Zielseite: src/app/energiegemeinschaften/software/page.js (läuft im Dev-Server unter http://localhost:3100/energiegemeinschaften/software – du kannst mit curl HTML abrufen).
Wichtige Bausteine: src/components/Portal/EG/Produkt/Mockups.js (Produkt-Mockups, nur auf dieser Seite genutzt), src/components/Portal/EG/Mitglied/ErsparnisRechner.js, src/components/ui/* (gemeinsame UI-Bausteine, seitenweit genutzt), src/components/illustrationen, Design-Tokens und ov-*-Klassen in src/app/globals.css, Styleguide unter src/app/design.
Feste Regeln:
- Keine neuen npm-Abhängigkeiten. Vorhandene Tokens/Klassen/Bausteine des Design-Systems nutzen (Farben ov-*, ink-*, sand-*, Schatten shadow-e1..e3, Klassen ov-h1/ov-h3/ov-lead/ov-text/ov-lift/ov-glass usw.).
- Texte deutsch mit korrekten Umlauten, Sie-Form. Keine erfundenen Zahlen, Kundenstimmen, Logos, Auszeichnungen oder Unternehmenskennzahlen; fachliche Aussagen (ElWG, Netzentgelte, Fristen) inhaltlich nicht verändern. Vergleich mit dem Markt bleibt fair und ohne Herabsetzung.
- Barrierefreiheit WCAG 2.1 AA (Kontrast, Fokus, Semantik, prefers-reduced-motion).
- Keine git-Commits.`

const PROPOSALS = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    proposals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          target: { type: 'string', enum: ['page', 'mockups', 'rechner'] },
          section: { type: 'string' },
          priority: { type: 'string', enum: ['hoch', 'mittel', 'niedrig'] },
          problem: { type: 'string' },
          change: { type: 'string', description: 'konkrete Änderung, gern mit Code-Skizze' },
        },
        required: ['target', 'section', 'priority', 'problem', 'change'],
      },
    },
  },
  required: ['summary', 'proposals'],
}

const EXPERTS = [
  { key: 'ux-strategie', role: 'Weltklasse UX-Strategin (Informationsarchitektur, Nutzerführung, Abschnittsreihenfolge, Scanbarkeit, Zielgruppen Vorstand/Kassa/Gemeinde/Mitglied)' },
  { key: 'ui-design', role: 'Weltklasse UI-Designer (visuelle Hierarchie, Rhythmus, Abstände, Typografie, Raster, Konsistenz mit dem Design-System, Abwechslung zwischen Abschnitten, Premium-Anmutung)' },
  { key: 'grafik', role: 'Weltklasse Grafikdesigner und Illustrator (Produkt-Mockups in Mockups.js, Hero-Komposition, Illustrationen, Icons, Datenvisualisierung, Tiefe, Licht, Details)' },
  { key: 'conversion-copy', role: 'Weltklasse Conversion- und UX-Texter (Headlines, Nutzenversprechen, CTAs, Mikrotexte, Pakete, Vertrauen, Einwände, Anfrageformular-Kontext) – nur ehrliche Aussagen' },
  { key: 'a11y', role: 'Weltklasse Accessibility-Expertin (WCAG 2.1 AA: Kontraste, Landmarken, Überschriftenhierarchie, Tabelle, Fokus, Screenreader-Texte der Mockups, Bewegung)' },
  { key: 'mobile-motion', role: 'Weltklasse Mobile-, Interaction- und Motion-Designer (Darstellung 360–430 px, Touch-Ziele, Tabelle mobil, Animationen/Reveal, Performance, Mikrointeraktionen)' },
]

phase('Analyse')
const analyses = await parallel(EXPERTS.map(e => () => agent(
  `${CTX}\n\nDu bist ${e.role}. Analysiere die Zielseite gründlich (Code lesen, HTML per curl ansehen, referenzierte Bausteine und Tokens prüfen). NUR LESEN, keine Dateien ändern.\nLiefere 6–12 konkrete, umsetzbare Verbesserungen aus deiner Disziplin, priorisiert. Ordne jede einem Ziel zu: 'page' (page.js), 'mockups' (Mockups.js) oder 'rechner' (ErsparnisRechner.js). Gemeinsame Bausteine in src/components/ui dürfen NICHT geändert werden – schlage stattdessen Lösungen in den drei Zieldateien vor. Sei spezifisch (Klassen, Struktur, Texte).`,
  { label: `analyse:${e.key}`, phase: 'Analyse', schema: PROPOSALS }
).then(r => r && { expert: e.key, ...r })))

const all = analyses.filter(Boolean)
log(`${all.length}/6 Analysen, ${all.reduce((n, a) => n + a.proposals.length, 0)} Vorschläge`)
const forTarget = t => all.map(a => {
  const ps = a.proposals.filter(p => p.target === t)
  if (!ps.length) return ''
  return `## ${a.expert}\n` + ps.map(p => `- [${p.priority}] ${p.section}: ${p.problem}\n  → ${p.change}`).join('\n')
}).filter(Boolean).join('\n\n')

const IMPL = [
  { key: 'page', files: 'src/app/energiegemeinschaften/software/page.js (und bei Bedarf NEUE Dateien unter src/components/Portal/EG/Produkt/, z. B. für Client-Komponenten)', note: 'Du verantwortest Aufbau, Abschnitte, Texte, Layout der Seite. Mockups.js und ErsparnisRechner.js bearbeiten andere Agenten gleichzeitig – NICHT anfassen; deren Export-Namen (HeroKomposition, MockEnergieHeute, MockZustimmung, MockKassier, MockAbschluss, ErsparnisRechner default) bleiben gleich.' },
  { key: 'mockups', files: 'src/components/Portal/EG/Produkt/Mockups.js', note: 'Du verantwortest die Produkt-Mockups und die Hero-Komposition grafisch. Export-Namen und Props (className) beibehalten. page.js bearbeitet ein anderer Agent – NICHT anfassen. Werte bleiben Beispiele, passend zu den aria-labels in page.js (71,40 € Ersparnis, 38 % aus der Gemeinschaft, noch 6 Tage, Vergleich zum September).' },
  { key: 'rechner', files: 'src/components/Portal/EG/Mitglied/ErsparnisRechner.js', note: 'Du verantwortest UX/UI des Ersparnis-Rechners. Rechenlogik und fachliche Werte nicht verfälschen. Vorher mit grep prüfen, wo der Baustein sonst genutzt wird, und die Schnittstelle kompatibel halten. Andere Dateien NICHT anfassen.' },
]

phase('Umsetzung')
const impl = await parallel(IMPL.map(t => () => agent(
  `${CTX}\n\nDu bist Weltklasse Frontend-Designer/Entwickler und setzt die Verbesserungen um. Du darfst NUR diese Dateien ändern: ${t.files}.\n${t.note}\n\nVorschläge der sechs Spezialisten für deinen Bereich:\n\n${forTarget(t.key) || '(keine expliziten Vorschläge – verbessere nach eigenem Urteil im Sinne der Gesamtanalyse)'}\n\nZusammenfassungen aller Analysen (Kontext):\n${all.map(a => `- ${a.expert}: ${a.summary}`).join('\n')}\n\nSetze die Vorschläge mit hoher und mittlerer Priorität um, wo sie sich widersprechen entscheide begründet. Ergebnis muss fehlerfrei kompilieren (Server- vs. Client-Komponenten beachten: Hooks/Events nur mit "use client"). Prüfe am Ende mit: npx eslint <deine Dateien> und curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/energiegemeinschaften/software (NICHT next build ausführen, der Dev-Server läuft). Gib eine kurze Liste der umgesetzten Änderungen zurück, plus bewusst nicht umgesetzte Punkte mit Grund.`,
  { label: `umsetzung:${t.key}`, phase: 'Umsetzung' }
)))

phase('QA')
const qa = await agent(
  `${CTX}\n\nDu bist QA-Lead und Design-Reviewer. Drei Agenten haben gerade parallel page.js, Mockups.js und ErsparnisRechner.js überarbeitet. Berichte der Umsetzer:\n\n${impl.map((r, i) => `### ${IMPL[i].key}\n${r || '(fehlgeschlagen)'}`).join('\n\n')}\n\nPrüfe: git diff ansehen; npx eslint auf geänderte/neue Dateien; curl der Seite (HTTP 200, keine Next-Fehlerseite/Fehler-Overlay im HTML); Konsistenz zwischen page.js und Mockups (Exporte, aria-labels passen zu den gezeigten Beispielwerten); Server/Client-Grenzen; Barrierefreiheit; keine erfundenen Fakten; korrekte Umlaute. Behebe gefundene Fehler direkt (NICHT next build ausführen, keine Commits). Gib einen knappen Bericht zurück: Status, gefundene und behobene Probleme, verbleibende Risiken.`,
  { label: 'qa', phase: 'QA' }
)

return { analysen: all.map(a => ({ expert: a.expert, summary: a.summary, n: a.proposals.length })), umsetzung: impl, qa }
