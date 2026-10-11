export const meta = {
  name: 'unicorn-website',
  description: 'Gesamte Website auf Weltklasse heben: Motion-System, Conversion (Anfragen/Registrierung), Seiten-Animationen, Qualitätsmanagement, SEO',
  phases: [
    { title: 'Fundament', detail: 'Motion-Architekt baut das Animationssystem; Qualitätsmanager + Conversion-Stratege legen Kriterien und Plan fest' },
    { title: 'Umsetzung', detail: 'Conversion-Kern (Formulare, Registrierung, CTAs) + 6 Seitenpakete, max. 3 gleichzeitig' },
    { title: 'Qualität', detail: 'Qualitätsmanager prüft alle Seiten gegen die Kriterien und behebt Fehler' },
    { title: 'SEO', detail: 'Technisches SEO, danach Content-SEO' },
  ],
}

const ROOT = 'C:/Users/SALEADMIN/Downloads/Oekoinvest-Web'
const SHOTS = 'C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/wf4'
const BASE = 'http://localhost:3100'

const REGELN = `Projekt: Next.js 15 App Router, React 19, Tailwind v4 unter ${ROOT}. Dev-Server läuft unter ${BASE} in einem eigenen Fenster – NICHT neu starten, NICHT beenden, NICHT next build ausführen. Antwortet er nicht, 60 s warten und erneut versuchen.
Design-System: Tokens/ov-*-Klassen in src/app/globals.css, Bausteine in src/components/ui, Styleguide src/app/design. Qualitätsreferenz: ${BASE}/energiegemeinschaften/software.
HARTE REGELN:
- Keine neuen npm-Abhängigkeiten (keine GSAP/Framer/Lottie). Animationen mit CSS, Web Animations API, IntersectionObserver, requestAnimationFrame, View Transitions API, scroll-driven CSS (mit Fallback).
- Performance: nur transform/opacity/filter animieren, kein Layout-Thrashing, CLS < 0.1, Hauptüberschrift und Hero-Inhalt dürfen NICHT länger als ~500 ms unsichtbar sein (LCP), keine schweren Endlos-Animationen, Animationen außerhalb des Viewports pausieren.
- prefers-reduced-motion: alles sofort sichtbar, keine Bewegung. Ohne JavaScript muss aller Inhalt sichtbar sein.
- Barrierefreiheit WCAG 2.1 AA, sichtbarer Fokus, Tastatur bedienbar, Animationen dürfen nichts verdecken.
- KEINE Dark Patterns und KEIN erfundener Social Proof: keine gefälschten Live-Zähler („gerade 12 Besucher“), keine erfundenen Anfrage-Ticker, keine künstliche Verknappung, keine erfundenen Zahlen/Kundenstimmen/Logos. Countups nur mit Werten, die schon auf der Seite stehen.
- Texte deutsch (en/* englisch), Umlaute korrekt; Fachaussagen, Rechenlogik, Formularfelder, API-Aufrufe und Rechtstexte inhaltlich unverändert.
- Server-/Client-Grenzen beachten. Keine git-Commits. Nur die dir zugewiesenen Dateien ändern.
- RAM ist knapp (8 GB): immer nur ein Browser-Skript gleichzeitig, eine Seite pro Aufruf, keine dauerhaft laufenden Browser.
WERKZEUGE (in ~/claude-browser, Ausgaben nach ${SHOTS}/<dein-kürzel>/...; Git-Bash: Pfade mit führendem / brauchen MSYS_NO_PATHCONV=1):
- Standbilder: node shot.mjs <url> <ordner> 1440,390 --tiles   bzw. --el=<css>
- Animation als Filmstreifen: node film.mjs <url> <ordner> 1440 [--el=<css>] [--hover=<css>] [--reduced]  → 7 Bilder (0–2000 ms) + CLS + lange Tasks
- Schnellprüfung vieler Seiten: MSYS_NO_PATHCONV=1 node check.mjs ${BASE} <ordner> 1440,390 /pfad1 /pfad2 ...
Bilder IMMER mit dem Read-Tool ansehen und wie ein Art Director beurteilen.`

phase('Fundament')
const [motion, plan] = await parallel([
  () => agent(`${REGELN}

Du bist der beste JavaScript-Entwickler und Motion-Architekt der Welt (Niveau Linear, Stripe, Vercel, Apple). Baue das gemeinsame Animations- und Interaktionssystem der Website, auf dem danach alle Seiten aufsetzen.
Du besitzt exklusiv: src/app/globals.css (Motion-Teil), src/components/ui/* (AUSSER CtaBand*), src/components/Landing/*, src/components/Reusable/* (außer LegalShell*), src/components/Navbar/*, Footer, LayoutWrapper/BackToTop und mobile Bottom-Leiste, sowie den neuen Ordner src/components/motion/.
Aufgaben:
1. Bestandsaufnahme: vorhandene Motion-Tokens, Reveal, ov-hero-in, ov-lift usw. – nichts doppelt bauen, vorhandene APIs rückwärtskompatibel halten (sie werden auf ~70 Seiten genutzt).
2. Primitive in src/components/motion/ (klein, SSR-sicher, reduced-motion-fähig, dokumentiert per JSDoc): z. B. Zaehler (Count-up nur für übergebene Werte), PfadZeichnen (SVG-Linien zeichnen beim Eintritt), Stagger/Gruppen-Reveal, TextEnthuellung (Wort-/Zeilenweise für Headlines), Magnetisch/Spotlight für Primär-CTAs und Karten (nur Zeigergeräte), Parallax leicht, ScrollFortschritt, Laufband, Kipp-Karte dezent. Nur bauen, was wirklich hochwertig wirkt.
3. Globale Erlebnisse: Seitenübergänge (View Transitions, Fallback ohne), Navbar (Mega-Menü-Choreografie, Scroll-Zustand), Buttons (Press-/Hover-Feedback, Pfeil-Bewegung), Karten-Hover, Fokus-Animationen, Scroll-Fortschritt auf Langseiten.
4. Bekanntes Problem beheben: feste Leisten unten auf Handy/Tablet (Bottom-Leiste „Börse/Fläche prüfen“, Nach-oben-Knopf) verdecken Inhalte und Buttons – Abstand am Seitenende/sichere Bereiche, Ausblenden in Formular-/Fokus-Situationen, keine Überdeckung von CTAs.
5. Mit film.mjs (auch --reduced und --hover) auf / , /freiflaeche und /energiegemeinschaften/software prüfen, mindestens 3 Runden, CLS < 0.1, Fehler 0. npx eslint auf alle geänderten Dateien.
Rückgabe: eine präzise API-Referenz deiner Primitive und globalen Klassen (Import-Pfad, Props, Beispiel-Snippet, wann einsetzen, wann nicht), plus Liste der globalen Änderungen. Diese Referenz bekommen danach alle Seiten-Designer.`, { label: 'motion-architekt', phase: 'Fundament' }),
  () => agent(`${REGELN}

Ihr seid zu zweit in einer Rolle: der beste Qualitätsmanager und der beste Conversion-Stratege der Welt. NUR LESEN, keine Dateien ändern.
Geschäftsziel: deutlich mehr qualifizierte ANFRAGEN (Flächen-Anfragen, Flächencheck, Kontakt, Angebotsanfragen, Rechner→Anfrage) und REGISTRIERUNGEN im Portal (/registrieren mit Rollen).
1. Erfasse den Conversion-Trichter: alle Formulare und Registrierungswege (grep nach AnfrageFormular, AnfrageMitDaten, FlaechenWizard, RegistrierFormular, /registrieren, CtaBand, href="#anfrage" usw.), wie Nutzer von den Seiten dorthin kommen und wo sie abspringen dürften. Sieh dir / , /flaeche-verpachten, /flaechencheck, /registrieren, /kontakt, /rechner/pacht mit shot.mjs an.
2. Conversion-Plan: konkrete Maßnahmen je Seitenpaket (start, flaeche, energie, markt, vertrauen, rechner) und für den Conversion-Kern (Formulare/Registrierung/CTA-Bänder): z. B. Mikro-Zusagen, Fortschrittsanzeige in mehrstufigen Formularen, Inline-Validierung mit freundlicher Animation, Erfolgs-Choreografie nach Absenden, Rechner-Ergebnis → vorausgefüllte Anfrage, wiederkehrende aber nicht aufdringliche CTAs, Vertrauenssignale NUR aus vorhandenen echten Inhalten. Ehrlich, ohne Dark Patterns.
3. Qualitätshandbuch: messbare Abnahmekriterien, die der Qualitätsmanager am Ende prüft (z. B. CLS < 0.1, 0 Konsolenfehler, kein Überlauf 1440/768/390, reduced-motion: Inhalt sofort sichtbar, Fokus sichtbar, Kontrast AA, jede Seite hat genau eine h1 und eine klare primäre Aktion, keine CTA von festen Leisten verdeckt, keine erfundenen Fakten, Formulare funktionieren mit Tastatur, Lade-/Fehler-/Erfolgszustände vorhanden).
Rückgabe: (a) Trichter-Befund kurz, (b) Maßnahmen je Paket als Liste, (c) Qualitätshandbuch als Checkliste.`, { label: 'qualitaet+conversion-plan', phase: 'Fundament' }),
])

const KONTEXT = `API des Animationssystems (vom Motion-Architekten):\n${motion}\n\nConversion-Plan und Qualitätshandbuch (Qualitätsmanager):\n${plan}`

const PAKETE = [
  { key: 'conversion-kern', titel: 'Conversion-Kern: Formulare, Registrierung, CTA-Bänder', seiten: ['/registrieren', '/login', '/kontakt', '/flaechencheck', '/flaeche-verpachten (#anfrage)', '/energiegemeinschaften/software (#anfrage)'],
    dateien: ['src/components/Plattform/AnfrageFormular*', 'src/components/Plattform/RegistrierFormular*', 'src/components/Plattform/LoginFormular*', 'src/components/Plattform/AuthRahmen*', 'src/app/registrieren/', 'src/app/login/', 'src/components/Gemeinschaft/AnfrageMitDaten*', 'src/components/Flaeche/FlaechenWizard*', 'src/components/ui/CtaBand*', 'src/components/formular/'],
    ziel: 'Formulare und Registrierung zum Erlebnis machen, das zum Abschließen motiviert: Fortschritt, Inline-Validierung, Mikro-Feedback, Erfolgs-Choreografie, Lade- und Fehlerzustände, CTA-Bänder mit starker aber ruhiger Bewegung. Felder, Validierungsregeln, API-Aufrufe und Props funktional UNVERÄNDERT (Schnittstellen rückwärtskompatibel). Formulare testweise mit Playwright ausfüllen bis kurz vor dem Absenden (NICHT absenden, keine Testdaten erzeugen) und Zustände filmen.' },
  { key: 'start', titel: 'Startseite', seiten: ['/'], dateien: ['src/app/page.js', 'src/components/Home/'],
    ziel: 'Die Startseite wird das Aushängeschild: Hero-Choreografie, Storytelling beim Scrollen, Datenvisualisierungen, die sich aufbauen, klare Wege zu Anfrage und Registrierung je Zielgruppe.' },
  { key: 'flaeche', titel: 'Fläche, Agri, Dach, Bestand', seiten: ['/flaeche-verpachten', '/freiflaeche', '/agri-pv', '/landwirte', '/dachflaeche-verpachten', '/bestandsanlagen', '/angebot'],
    dateien: ['src/app/{flaeche-verpachten,freiflaeche,flaechencheck,agri-pv,landwirte,dachflaeche-verpachten,bestandsanlagen,angebot}/', 'src/components/{Flaeche (außer FlaechenWizard*),Agri,Dach,Bestand,Angebot}/'],
    ziel: 'Diese Seiten bringen die meisten Flächen-Anfragen: Grafiken (Parkplan, Pachtsäulen, Hallenschnitt) animiert aufbauen, Weg zur Anfrage unwiderstehlich machen.' },
  { key: 'energie', titel: 'Speicher, Carport, VK, Kommunen, Genossenschaft, Energiegemeinschaften', seiten: ['/grossspeicher', '/solarcarport', '/virtuelles-kraftwerk', '/kommunen', '/genossenschaft', '/energiegemeinschaften', '/energiegemeinschaften/software', '/energiegemeinschaften/rechner'],
    dateien: ['src/app/{grossspeicher,solarcarport,virtuelles-kraftwerk,kommunen,genossenschaft,energiegemeinschaften}/', 'src/components/{Speicher,Carport,Energie,Kommune}/', 'src/components/Gemeinschaft/ (außer AnfrageMitDaten*)', 'src/components/Portal/EG/Produkt/'],
    ziel: 'Energieflüsse, Tagesprofile und Produkt-Mockups zum Leben erwecken (Fluss-Linien, Ladezustände), ohne Dauer-Unruhe.' },
  { key: 'markt', titel: 'Investoren, Marktdaten, Energie live, Reststrom, Projektbörse, Regionen', seiten: ['/investoren', '/marktdaten', '/energie-live', '/reststrom', '/projektboerse', '/projektboerse/karte', '/regionen'],
    dateien: ['src/app/{investoren,marktdaten,energie-live,reststrom,projektboerse,regionen}/', 'src/components/{Investoren,Marktdaten,EnergieLive,Reststrom,Boerse,Region}/'],
    ziel: 'Charts zeichnen sich beim Eintritt, Börsenkarten mit hochwertigen Hover-/Filter-Übergängen, Registrierung für Investoren als klares Ziel.' },
  { key: 'vertrauen', titel: 'Unternehmen, Warum, Referenzen, Prozess, Kontakt, FAQ, Ratgeber, Lexikon, EN', seiten: ['/unternehmen', '/warum-oekoinvest', '/referenzen', '/prozess', '/kontakt', '/faq', '/ratgeber', '/wissen/lexikon', '/en', '/en/investors'],
    dateien: ['src/app/{unternehmen,warum-oekoinvest,referenzen,prozess,faq,ratgeber,wissen,en}/', 'src/app/kontakt/page.js', 'src/components/{Unternehmen,Vergleich,Referenzen,Prozess,Kontakt,Faq,Ratgeber,Lexikon,En}/'],
    ziel: 'Vertrauen durch ruhige, präzise Bewegung (Zeitleisten zeichnen, Gruppengrafik, Prozess-Schritte), Wissensseiten führen sanft zu Anfrage/Registrierung.' },
  { key: 'rechner', titel: 'Rechner-Übersicht und alle Rechner', seiten: ['/rechner', '/rechner/pacht', '/rechner/solarpark', '/rechner/grossspeicher', '/rechner/ppa', '/rechner/beteiligung'],
    dateien: ['src/app/rechner/', 'src/components/Rechner/'],
    ziel: 'Ergebnisse animiert und begeisternd (Zahlen-Übergänge bei Reglerbewegung, Balken wachsen), jedes Ergebnis führt zu einer passenden Anfrage. Rechenlogik unverändert; RechnerSeite rückwärtskompatibel. Übrige Rechner per check.mjs mitprüfen.' },
]

phase('Umsetzung')
const LIMIT = 3
const berichte = new Array(PAKETE.length)
let next = 0
async function worker() {
  while (next < PAKETE.length) {
    const i = next++
    const p = PAKETE[i]
    log(`Start ${i + 1}/${PAKETE.length}: ${p.titel}`)
    berichte[i] = await agent(`${REGELN}

${KONTEXT}

Du bist ein Weltklasse UX/UI-Designer und Animations-Designer (Team mit dem besten JavaScript-Entwickler der Welt). Paket: ${p.titel}.
Seiten: ${p.seiten.join(', ')}
Du darfst NUR ändern: ${p.dateien.join(', ')}. Gemeinsame Bausteine (ui, motion, Landing, Reusable, Navbar, globals.css) nur NUTZEN – fehlt dir ein Primitiv, baue eine lokale Variante in deinen Ordnern.
Ziel: ${p.ziel}
Setze die Maßnahmen aus dem Conversion-Plan für dein Paket um und halte das Qualitätshandbuch ein. Bewegung muss Bedeutung haben (Aufmerksamkeit lenken, Zusammenhänge zeigen, Feedback geben) – lieber wenige meisterhafte Momente pro Seite als überall Gewackel.
Arbeitsweise je Seite: Ist-Zustand filmen (film.mjs ohne und mit --el für Kernabschnitte) und ansehen → umsetzen → erneut filmen inkl. --reduced und 390 px → nachbessern, mindestens 2 Runden. npx eslint auf geänderte Dateien.
Rückgabe (knapp): je Seite die Animations-/Conversion-Momente, geänderte Dateien, CLS-Werte, offene Punkte.`, { label: `umsetzung:${p.key}`, phase: 'Umsetzung' })
    log(`Fertig: ${p.titel}`)
  }
}
await Promise.all(Array.from({ length: LIMIT }, () => worker()))

phase('Qualität')
const qm = await agent(`${REGELN}

Du bist der beste Qualitätsmanager der Welt. Prüfe die gesamte Website gegen dieses Qualitätshandbuch:
${plan}

Berichte der Umsetzer:
${PAKETE.map((p, i) => `### ${p.key}\n${berichte[i] || '(fehlgeschlagen/leer)'}`).join('\n\n')}

Vorgehen:
1. git status/diff --stat: Dateien außerhalb der Zuständigkeiten? Schädlich → korrigieren.
2. npx eslint auf alle geänderten/neuen Dateien.
3. check.mjs über ALLE öffentlichen Seiten (/, /freiflaeche, /flaeche-verpachten, /flaechencheck, /agri-pv, /landwirte, /dachflaeche-verpachten, /bestandsanlagen, /grossspeicher, /solarcarport, /virtuelles-kraftwerk, /kommunen, /genossenschaft, /energiegemeinschaften, /energiegemeinschaften/software, /energiegemeinschaften/rechner, /investoren, /marktdaten, /energie-live, /reststrom, /projektboerse, /regionen, /unternehmen, /warum-oekoinvest, /referenzen, /prozess, /kontakt, /faq, /ratgeber, /wissen/lexikon, /rechner und alle /rechner/*, /registrieren, /login, /impressum, /datenschutz, /en, /en/investors) in 1440 und 390 – in Blöcken von höchstens 12 Seiten pro Aufruf.
4. film.mjs auf mind. 8 Schlüsselseiten mit und ohne --reduced: CLS < 0.1, Inhalt bei reduced sofort sichtbar, Hero nicht länger als ~500 ms leer.
5. Conversion-Wege durchklicken (Playwright): Startseite → Anfrage, Rechner → Anfrage, Startseite → Registrierung; nichts absenden.
6. Stichprobe erfundene Fakten / Dark Patterns im diff (Zähler, Ticker, Verknappung).
7. Alle Fehler DIREKT beheben (du darfst dafür jede betroffene Datei ändern), danach erneut prüfen.
Rückgabe: Abnahmeprotokoll je Kriterium (bestanden/behoben/offen), Liste der Korrekturen, verbleibende Risiken, 8 Pfade zu den eindrucksvollsten Filmstreifen-Bildern.`, { label: 'qualitaetsmanager', phase: 'Qualität' })

phase('SEO')
const seoTech = await agent(`${REGELN}

Du bist der beste technische SEO-Experte der Welt (Google, Bing, und KI-Suchmaschinen wie ChatGPT/Perplexity/Google AI Overviews).
Prüfe und verbessere technisch (du darfst ändern: src/app/sitemap.js, src/app/robots.*, src/app/layout.js (nur Metadaten/Head), src/app/manifest*, src/data/site.js (nur SEO-Felder), JSON-LD-Blöcke und export const metadata in allen öffentlichen Seiten, src/components/Rechner/RechnerSeite* nur rechnerMetadata, neue Datei public/llms.txt):
- Sitemap vollständig und korrekt (alle öffentlichen Seiten, keine Portal-/Login-Seiten), robots.txt, kanonische URLs, hreflang de/en wo Sprachpaare existieren (En/sprachpaare).
- Strukturierte Daten valide und ehrlich: Organization, WebSite, BreadcrumbList, Service, FAQPage nur wo echte sichtbare FAQs stehen, Article im Ratgeber, keine Review-/Rating-Schemas ohne echte Bewertungen.
- Open Graph/Twitter-Karten, Titel-/Description-Länge, eine h1 je Seite, Bild-alt, interne Links ohne 404 (alle internen hrefs der öffentlichen Seiten per Skript prüfen), noindex wo nötig (Portal, Login, Einladungen, Angebot mit Code).
- Core Web Vitals: LCP-Bild priorisiert (next/image priority), Schriften, keine render-blockierenden Skripte; mit film.mjs CLS gegenprüfen.
- public/llms.txt mit sachlicher Zusammenfassung des Angebots und Links.
Prüfe Ergebnis per curl/HTML-Auslese. Keine erfundenen Inhalte. npx eslint auf geänderte Dateien.
Rückgabe: Liste der technischen Maßnahmen und Befunde, offene Punkte (z. B. Produktivdomain, Search Console).`, { label: 'seo-technik', phase: 'SEO' })

const seoContent = await agent(`${REGELN}

Du bist der beste Content-SEO-Experte der Welt für den DACH-Markt (Solar, PV-Projektentwicklung, Flächenverpachtung, Agri-PV, Großspeicher, Energiegemeinschaften).
Vorarbeit technisches SEO:
${seoTech}

Aufgabe (du darfst Titel, Descriptions, Keywords in metadata sowie Überschriften, Einleitungen und interne Links in den öffentlichen Seiten und deren Seitenkomponenten ändern):
1. Keyword-Landkarte: je Seite EIN Hauptthema mit Suchintention (z. B. „Fläche für Solarpark verpachten“, „Pacht Freiflächen-PV pro Hektar“, „Agri-PV Landwirt“, „Dachfläche verpachten Photovoltaik“, „Energiegemeinschaft Software Österreich“), Kannibalisierung zwischen Seiten auflösen.
2. Title (≤ 60 Zeichen) und Description (≤ 155 Zeichen) je Seite mit Nutzen und Handlungsaufforderung; h1/h2 natürlich mit Suchbegriffen; Einleitung beantwortet die Suchfrage in den ersten 2 Sätzen (gut für KI-Antworten).
3. Interne Verlinkung: thematische Cluster (Fläche, Speicher, Gemeinschaft, Investoren, Wissen) mit beschreibenden Ankertexten; Ratgeber/Lexikon verlinken auf die Geld-Seiten.
4. KEIN Keyword-Stuffing, keine erfundenen Fakten, Fachaussagen unverändert, Lesbarkeit hat Vorrang, Design nicht zerstören (nach Änderungen mit check.mjs prüfen).
5. npx eslint auf geänderte Dateien.
Rückgabe: Keyword-Landkarte (Seite → Hauptbegriff → Title), Liste der Änderungen, Empfehlungen für Off-Page (Backlinks, Google Business Profile, Branchenverzeichnisse, Search Console) – ehrlich, was davon Platzierungen wirklich beeinflusst.`, { label: 'seo-content', phase: 'SEO' })

return { motion, plan, umsetzung: PAKETE.map((p, i) => ({ key: p.key, bericht: berichte[i] })), qm, seoTech, seoContent }
