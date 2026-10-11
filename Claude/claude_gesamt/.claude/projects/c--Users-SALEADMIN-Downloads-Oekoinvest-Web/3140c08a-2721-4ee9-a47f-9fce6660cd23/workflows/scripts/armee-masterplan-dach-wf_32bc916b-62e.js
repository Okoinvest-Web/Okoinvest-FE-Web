export const meta = {
  name: 'armee-masterplan-dach',
  description: 'Agenten-Armee (24 Fachbereiche + Strategie-Rat) analysiert und recherchiert, Ergebnis: Masterplan für die stärkste Website im DACH-Raum',
  phases: [
    { title: 'Analyse', detail: '24 Fachbereiche recherchieren und analysieren parallel (nur lesen)' },
    { title: 'Strategie-Rat', detail: 'Masterplan → Red Team → finaler Masterplan mit Umsetzungswellen' },
  ],
}

const ROOT = 'C:/Users/SALEADMIN/Downloads/Oekoinvest-Web'
const SHOTS = 'C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/wf5'

const KONTEXT = `UNTERNEHMEN: ÖkoInvest GmbH, Projektgesellschaft der ÖKOVOLT Gruppe, aktiv in Deutschland, Österreich und der Schweiz. Projektentwicklung für Freiflächen-PV, Agri-PV, Solarcarports, Großspeicher; Flächenverpachtung (Eigentümer, Landwirte, Gemeinden), Projektbörse (Projektrechte für Investoren), Reststrom-Pool (Strombeschaffung für den Mittelstand), Software und Betriebsführung für Energiegemeinschaften (AT, ElWG), Genossenschaft, Portal mit ~177 Seiten (CRM, KYC, Finanzierung, Closing, Dealroom, EG-Abrechnung).
WEBSITE: Next.js 15 unter ${ROOT} (src/app = Seiten, src/components, src/lib/invest/markt.js = alle Marktannahmen, src/lib/rechner = Rechenlogik, src/data/regionen = 26 Regionsseiten, src/content/ratgeber, docs/ = Briefings). Läuft lokal unter http://localhost:3100. ~70 öffentliche Seiten, 16 Rechner, Ratgeber, Lexikon, englische Seiten. Gerade frisch überarbeitet (Design, Animation, Conversion, technisches SEO).
GESCHÄFTSZIEL DES INHABERS: die stärkste Website im DACH-Raum für dieses Feld – meiste Leads, Anfragen, Registrierungen, Traffic; ein Vorsprung, den Wettbewerber nicht aufholen können; Rechner sollen Leads erzeugen (z. B. PDF-Bericht gegen Name, E-Mail, Telefon); ein laufend aktualisierter Vergleich der Gewerbestrompreise je Bundesland/Region; Reichweite der großen Energieversorger intelligent für sich nutzen; DE, AT und CH strikt getrennt (eigene Inhalte, eigene Rechenlogik, eigene Rechtslage), nichts vermischen.
LEITPLANKEN (verbindlich, auch für Ideen):
- Nur legale und ehrliche Wege: keine Dark Patterns, kein erfundener Social Proof, keine Fake-Zahlen; kein Scraping gegen Nutzungsbedingungen oder Datenbankrechte; keine Markenrechtsverletzungen, keine Nachahmung fremder Marken; Vergleichswerbung nur objektiv, nachprüfbar, aktuell (UWG); DSGVO bei Leads (Einwilligung, Zweckbindung, Double-Opt-in für Marketing).
- „Die Power der Energieversorger nutzen“ heißt: legitime Hebel (Partnerschaften, Kooperationen, Vergleichs- und Ratgeberinhalte mit Mehrwert, Suchnachfrage nach Versorger-Themen bedienen, öffentliche Daten, Verbände) – NICHT Inhalte kopieren, Marken missbrauchen oder Kunden täuschen.
- Ehrlich bewerten: was wirklich wirkt, was Aufwand/Kosten hat, was rechtlich geprüft werden muss.
ARBEITSWEISE: NUR LESEN – keine Dateien im Projekt ändern. Recherchiere aktiv im Web (WebSearch/WebFetch; die Werkzeuge ggf. per ToolSearch laden) und im Code. Nenne Quellen (URL) für Marktfakten. Rechner hat nur 8 GB RAM: Browser-Screenshots nur wenn deine Rolle es braucht, dann mit cd ~/claude-browser && node shot.mjs <url> ${SHOTS}/<kürzel> 1440,390 --tiles (eine Seite pro Aufruf). Dev-Server nicht anfassen. Umfang: gründlich, aber zielgerichtet (etwa 30–60 Werkzeugaufrufe).`

const ERGEBNIS = {
  type: 'object',
  properties: {
    kernbefunde: { type: 'array', items: { type: 'string' }, description: 'die 5–10 wichtigsten Erkenntnisse mit Quelle/Beleg' },
    initiativen: {
      type: 'array',
      description: '5–12 konkrete Maßnahmen',
      items: {
        type: 'object',
        properties: {
          titel: { type: 'string' },
          beschreibung: { type: 'string', description: 'was genau, für wen, wie umgesetzt (Seiten, Komponenten, Daten)' },
          land: { type: 'string', enum: ['DE', 'AT', 'CH', 'DACH'] },
          wirkung: { type: 'string', enum: ['sehr hoch', 'hoch', 'mittel', 'niedrig'] },
          aufwand: { type: 'string', enum: ['klein', 'mittel', 'groß'] },
          alleinstellung: { type: 'string', description: 'warum das kaum jemand hat bzw. schwer kopierbar ist' },
          risiko: { type: 'string', description: 'rechtlich/technisch/wirtschaftlich, inkl. was geprüft werden muss' },
          messgroesse: { type: 'string', description: 'woran Erfolg gemessen wird' },
        },
        required: ['titel', 'beschreibung', 'land', 'wirkung', 'aufwand', 'alleinstellung', 'risiko', 'messgroesse'],
      },
    },
    quick_wins: { type: 'array', items: { type: 'string' } },
    warnungen: { type: 'array', items: { type: 'string' }, description: 'was man NICHT tun sollte und warum' },
    quellen: { type: 'array', items: { type: 'string' } },
  },
  required: ['kernbefunde', 'initiativen', 'quick_wins', 'warnungen', 'quellen'],
}

const AUFTRAG = {
  'Markt & Recherche · Marktanalyst Österreich': 'Analysiere den österreichischen Markt: Wettbewerber (PV-Projektentwickler, Flächenvermittler, Agri-PV-Anbieter, Energiegemeinschafts-Plattformen, Crowdinvesting im Energiebereich), ihre Websites, Angebote, Lead-Mechaniken, Inhalte; Suchnachfrage (Begriffe, Saison); regulatorische Besonderheiten (EAG, ElWG, Landes-Raumordnung, Widmung); Lücken, die wir besetzen können. Prüfe unsere AT-Inhalte im Code auf Vermischung mit DE/CH.',
  'Markt & Recherche · Marktanalyst Deutschland': 'Wie für Deutschland: Wettbewerber (Projektierer, Flächenportale, Pachtvermittler, Agri-PV, Speicher), EEG/Flächenkulisse, Privilegierung § 35 BauGB, Suchnachfrage, Lead-Mechaniken der Marktführer, Lücken. Prüfe unsere DE-Inhalte im Code auf Vermischung.',
  'Markt & Recherche · Marktanalyst Schweiz': 'Wie für die Schweiz: Markt für Freiflächen-/Alpin-PV, ZEV/LEG (lokale Elektrizitätsgemeinschaften ab 2026), Mantelerlass/StromVG, kantonale Unterschiede, Wettbewerber, Suchnachfrage, Sprachen (DE/FR/IT), Lücken. Prüfe, ob CH-Inhalte heute ausreichend eigenständig sind.',
  'Markt & Recherche · Analyst Energieversorger': 'Analysiere die Websites großer Versorger in AT (z. B. Verbund, Wien Energie, EVN, Energie AG, Kelag, Salzburg AG, TIWAG, illwerke vkw, Energie Steiermark), DE (EnBW, E.ON, RWE, Stadtwerke) und CH (Axpo, BKW, Alpiq, EKZ): Inhalte, Rechner, Lead-Strecken, PV-/Speicher-/Gemeinschafts-Angebote, Gewerbe-Angebote, was ihnen fehlt, wo Mittelstand/Landwirte/Gemeinden unterversorgt sind. Woher deren Traffic kommt (Themen, Suchanfragen) und wie wir legitim davon profitieren.',
  'Zukunft & Strategie · Zukunftsforscher': 'Trends 2027–2032 mit Belegen: Regulierung DACH (ElWG, EU-Strommarktdesign, Energy Sharing DE § 42c EnWG, CH LEG), Netzengpässe/Netzanschluss als Flaschenhals, Speicherboom, dynamische Tarife, PPA-Markt, Agri-PV, KI-Suche verändert Traffic, Datenplattformen. Welche Angebote/Inhalte/Daten sollten wir JETZT bauen, um 2028 vorne zu sein?',
  'Zukunft & Strategie · Strategieberater': 'Entwickle die Positionierung und den Burggraben: Netzwerkeffekte (Flächen ↔ Projekte ↔ Investoren ↔ Abnehmer), Datenvorsprung (eigene Datensätze, Indizes), Plattform-Lock-in fair, Marke. Was macht die Website so stark, dass Wettbewerber nicht gleichziehen können? Priorisiere ehrlich nach Wirkung/Aufwand. Lies dazu docs/ und die Projektbörse/Portal-Struktur.',
  'Zukunft & Strategie · M&A-Berater': 'Aus Sicht M&A/Projekthandel: Was brauchen Investoren, Fonds, Stadtwerke beim Kauf von Projektrechten/RTB/Bestand? Wie wird die Projektbörse zum Magneten für Dealflow in DACH (Datenraum-Vorschau, Teaser, Bewertungsindikatoren, NDA-Flow, Transaktionsdaten-Indizes)? Wie generieren wir Verkäufer-Leads (Projektierer, Landwirte mit Genehmigung)? Prüfe src/app/projektboerse, src/app/investoren, Portal-Dealroom.',
  'Zukunft & Strategie · Partnerschafts-Stratege': 'Wie nutzen wir die Reichweite großer Energieversorger LEGAL: Partnerprogramme (Abnahme/PPA, Direktvermarktung, Netzanschluss-Kooperationen), Co-Marketing, Versorger als Investoren in der Börse, Stadtwerke-Kooperationen, Verbände (PV Austria, BSW, Swissolar), Gemeindebund, Landwirtschaftskammern, Vergleichs-/Ratgeberinhalte, die Versorger-Suchnachfrage bedienen. Konkrete Partner-Pakete und Ansprache.',
  'Mensch & Conversion · Psychologe': 'Entscheidungspsychologie je Zielgruppe (Flächeneigentümer, Landwirte oft älter und vorsichtig, Gemeinden mit Gremien, Investoren, Mittelstand Strom): Ängste, Vertrauensanker, Verlustaversion, Status quo, soziale Bewährtheit (nur echt), Familienentscheidung bei Hofübergabe. Welche Inhalte, Formulierungen, Ablaufgestaltung erhöhen Anfragen ethisch? Sieh dir 3–4 Kernseiten an.',
  'Mensch & Conversion · UX-Forscher': 'Lead-Magneten und Trichter: Welche Rechner/Checks liefern frei ein Kernergebnis und welchen Mehrwert (PDF-Bericht, Pachtangebot-Check, Gemeinde-Report, Standort-Dossier, Preisalarm) gibt es gegen Name/E-Mail/Telefon? Ausgestaltung mit Progressive Profiling, Double-Opt-in, ohne SEO und Vertrauen zu schaden. Prüfe die vorhandenen 16 Rechner (src/components/Rechner, src/lib/rechner) und Formulare (Plattform/AnfrageFormular, Registrierung). Konkrete Trichter je Zielgruppe und Land.',
  'Mensch & Conversion · Vertriebsexperte': 'Vom Lead zum Abschluss: Lead-Scoring (Fläche, Größe, Netzanschluss, Widmung), Speed-to-Lead (Rückruf, Terminbuchung – vorhanden: /termin), Übergabe ins CRM (src/lib/plattform/crm.js), Nachfass-Sequenzen, Qualifizierungsfragen in Formularen, Vertriebsunterlagen als PDF. Wie wird aus Traffic messbar Umsatz?',
  'Marketing & Reichweite · Marktkommunikation': 'Markenstory und Botschaften je Land/Zielgruppe, Content-Engine (Ratgeber, Daten-Reports, Fallstudien – nur echte), PR-Anlässe (Studien, Indizes), Newsletter, Events/Webinare für Gemeinden und Landwirte, Video. Redaktionsplan-Skizze für 12 Monate. Was macht uns zur Referenzquelle?',
  'SEO & SEM · SEO-Stratege': 'Keyword-Universum DE/AT/CH getrennt (Begriffe unterscheiden sich: z. B. Widmung vs. Flächennutzungsplan), Suchintentionen, Content-Cluster mit Pillar-Seiten, Lücken gegenüber Wettbewerbern, Kannibalisierung, interne Verlinkung, Länder-URL-Struktur (/at/, /de/, /ch/ oder Subdomains? hreflang de-AT/de-DE/de-CH). Prüfe sitemap und Inhalte im Code.',
  'SEO & SEM · Programmatic & Local SEO': 'Programmatische Seiten nur mit echtem Mehrwert und echten Daten: z. B. je Bundesland/Bezirk/Gemeinde (Einstrahlung, Flächenkulisse, Netzbetreiber, Pachtspannen, Regeln), je Netzbetreiber, je Kanton. Datenquellen (offene Daten: Statistik Austria, Destatis, BFS, PVGIS, Netzbetreiber-Listen), Qualitätsregeln gegen Thin Content, Google Business Profile, lokale Signale. Prüfe src/data/regionen.',
  'SEO & SEM · KI-Suche (GEO)': 'Sichtbarkeit in KI-Antworten (ChatGPT Search, Perplexity, Google AI Overviews, Copilot): welche Inhalte werden zitiert (Daten, klare Antworten, Tabellen, Primärquellen), llms.txt, strukturierte Daten, Erwähnungen auf Drittseiten, Aktualität. Teste beispielhaft relevante Fragen per Websuche und beschreibe, wer heute zitiert wird.',
  'SEO & SEM · Linkaufbau & Digital PR': 'Backlink-Strategie DACH: Daten-Studien/Indizes (z. B. Pachtpreis-Index, Gewerbestrompreis-Radar, Netzanschluss-Wartezeiten), Verbände, Gemeinden, Landwirtschaftskammern, Hochschulen, Fachmedien, Gastbeiträge, Tools zum Einbetten (Widgets). Nur White-Hat. Konkrete Zielseiten und Ansprache.',
  'SEO & SEM · Google Ads': 'Google-Ads-Struktur je Land (getrennte Kampagnen, Sprache/Standort), Keyword-Cluster mit Intent (Fläche verpachten, Solarpark Pacht, Agri-PV, Gewerbestrom, Speicher), negative Keywords, Landingpage-Zuordnung, Anzeigenerweiterungen, Lead-Formular vs. Website, Gebotsstrategie mit Offline-Conversions aus CRM, realistische Budgets/CPCs (recherchieren). Marken-Keywords von Wettbewerbern: rechtliche Grenzen beachten.',
  'SEO & SEM · B2B-Social & LinkedIn': 'Paid und organisch: LinkedIn (Investoren, Gemeinden, Mittelstand), Meta (Landwirte, Eigentümer – regional), YouTube (Erklärvideos), Fachportale. Zielgruppen, Formate, Lead-Gen-Formulare vs. Landingpages, Retargeting consent-konform.',
  'SEO & SEM · Tracking & Attribution': 'Consent-konformes Tracking (DSGVO/TTDSG/TKG AT, revDSG CH): Consent Mode v2, serverseitiges Tagging, Conversion-Ereignisse (Anfrage, Registrierung, Rechner-Ergebnis, PDF-Download), Lead-Wert, Offline-Conversion-Import aus CRM, Dashboards. Prüfe das vorhandene Analytics-/Consent-Setup im Code.',
  'Daten & Technik · Daten-Architekt Preisradar': 'Machbarkeit eines laufend aktualisierten Gewerbestrompreis-Vergleichs je Bundesland (AT), Netzgebiet/PLZ (DE), Gemeinde/Netzbetreiber (CH): legale Datenquellen recherchieren (z. B. E-Control Tarifkalkulator/Open Data und Nutzungsbedingungen, ElCom Strompreise CH mit offenen Daten, Bundesnetzagentur/Monitoringbericht DE, veröffentlichte Preisblätter, Börsenpreise EPEX), Lizenzen und Grenzen (Gewerbetarife oft individuell), Aktualisierung (Cron/ISR), Kennzeichnung (Stand, Quelle, inkl./exkl. Netz, Abgaben), Verknüpfung mit unserem Reststrom-Pool als Lead-Quelle. Liefere eine konkrete Architektur mit Datenquellen-Tabelle (Quelle, Abdeckung, Aktualität, Lizenz, Risiko).',
  'Daten & Technik · JavaScript-Architekt': 'Architektur für strikte Ländertrennung DE/AT/CH: Routing (/at, /de, /ch oder Domains), Länderkontext, getrennte Inhalte/Rechenlogik (src/lib/invest/markt.js, src/lib/rechner), Migration ohne SEO-Verlust (Redirects), hreflang, Geo-Hinweis ohne Zwangsweiterleitung. Dazu: Performance-Budget, ISR/Caching für Daten, Lead-Pipeline (PDF-Erzeugung vorhanden: src/lib/plattform/server/pdf.js), Datenjobs. Analysiere den Code konkret und gib Aufwand an.',
  'Daten & Technik · IT-Security': 'Sicherheitsprüfung der öffentlichen Seite (nur lesend, keine Angriffe/Scans gegen Dritte): Formular-/API-Routen unter src/app/api (Validierung, Rate-Limit, Bot-Schutz, Spam), Security-Header/CSP (next.config.mjs, middleware), Umgang mit Lead-Daten, Abhängigkeiten (npm audit lokal), Preisradar-Datenjobs (SSRF, Fremddaten), Admin-Zugänge. Liefere priorisierte Befunde.',
  'Recht & Qualität · Recht & Compliance': 'Rechtliche Leitplanken DACH (keine Rechtsberatung, aber konkret): Vergleichswerbung UWG/öUWG/CH-UWG beim Preisradar und Versorger-Vergleichen, Markenrecht (Versorgernamen in Inhalten/Ads), Datenbankherstellerrecht beim Datenbezug, DSGVO/revDSG bei Lead-Gating und Telefon (Kaltakquise-Verbote), Impressum/Preisangaben, Haftung für Rechnerergebnisse und PDF-Berichte (Disclaimer), KMG/AltFG-Bezug bei Investor-Inhalten. Liste je Initiative der anderen Teams typische Risiken und wie man sie sauber macht.',
  'Recht & Qualität · Visuelle Kontrolle': 'Sieh dir die wichtigsten Seiten (/, /flaeche-verpachten, /flaechencheck, /investoren, /projektboerse, /rechner, /energiegemeinschaften/software, /kontakt) in 1440 und 390 an und vergleiche mit Weltklasse-Websites (Stripe, Linear, Vercel, Tesla Energy, Octopus Energy, Enpal, 1KOMMA5°). Wo fehlen noch Wow, Klarheit, Vertrauen, Tempo? Konkrete Gestaltungsmaßnahmen.',
}

const ANALYSTEN = Object.keys(AUFTRAG)

phase('Analyse')
const ergebnisse = await parallel(ANALYSTEN.map(label => () =>
  agent(`${KONTEXT}\n\nDEINE ROLLE: ${label.split(' · ')[1]} (Team ${label.split(' · ')[0]}) – du gehörst zu den Besten der Welt in deinem Fach.\nAUFTRAG: ${AUFTRAG[label]}\n\nLiefere strukturiert: Kernbefunde mit Belegen, 5–12 konkrete Initiativen (mit Land, Wirkung, Aufwand, Alleinstellung, Risiko, Messgröße), Quick Wins, Warnungen, Quellen.`,
    { label, phase: 'Analyse', schema: ERGEBNIS }).then(r => r && { label, ...r })
))
const ok = ergebnisse.filter(Boolean)
log(`${ok.length}/${ANALYSTEN.length} Analysen fertig, ${ok.reduce((n, r) => n + r.initiativen.length, 0)} Initiativen`)

const dossier = ok.map(r => `## ${r.label}
Kernbefunde:\n${r.kernbefunde.map(x => '- ' + x).join('\n')}
Initiativen:\n${r.initiativen.map(i => `- [${i.land}|Wirkung ${i.wirkung}|Aufwand ${i.aufwand}] ${i.titel}: ${i.beschreibung} | Alleinstellung: ${i.alleinstellung} | Risiko: ${i.risiko} | Messung: ${i.messgroesse}`).join('\n')}
Quick Wins:\n${r.quick_wins.map(x => '- ' + x).join('\n')}
Warnungen:\n${r.warnungen.map(x => '- ' + x).join('\n')}
Quellen: ${r.quellen.slice(0, 12).join(' ; ')}`).join('\n\n')

phase('Strategie-Rat')
const entwurf = await agent(`${KONTEXT}

Du bist Vorsitz des Strategie-Rats (Weltklasse-Strategieberatung). Hier sind die Dossiers von ${ok.length} Fachbereichen:

${dossier}

Verdichte zu einem MASTERPLAN (deutsch, klar, entscheidungsreif):
1. Strategische Leitidee in 3 Sätzen + Positionierung je Land (DE/AT/CH getrennt).
2. Die 7–10 „Burggraben“-Initiativen, die zusammen einen schwer einholbaren Vorsprung erzeugen (z. B. Datenprodukte/Indizes, Preisradar, Lead-Rechner mit PDF, programmatische Regionsseiten mit echten Daten, Projektbörse als Dealflow-Magnet, Partnerschaften mit Versorgern) – je mit Begründung, Abhängigkeiten, Aufwand, Messgröße.
3. Architekturentscheidung Ländertrennung (Empfehlung + Migrationsweg).
4. Lead-System end-to-end (Magneten → Formular → CRM → Vertrieb), konsent- und rechtskonform.
5. Reichweite: SEO/GEO/SEM/Social/PR-Plan je Land mit Prioritäten.
6. Umsetzungswellen (Welle 1: 1–2 Wochen mit Agenten, Welle 2, Welle 3) mit konkreten Arbeitspaketen (Dateien/Bereiche), die Agenten-Teams parallel bauen können.
7. Was ausdrücklich NICHT gemacht wird (rechtlich/ethisch/wirtschaftlich) und offene Entscheidungen für den Inhaber.
8. Realistische Erwartung: was in 3/12/24 Monaten messbar sein kann – ehrlich, ohne Versprechen von Platz 1 oder Umsatzgarantien.
Konflikte zwischen Fachbereichen explizit auflösen.`, { label: 'Strategie-Rat · Masterplan', phase: 'Strategie-Rat' })

const kritik = await agent(`${KONTEXT}

Du bist das Red Team (ehemalige Wettbewerber, Anwälte, CFO, CTO, skeptischer Investor). Greife diesen Masterplan schonungslos an:

${entwurf}

Prüfe: rechtliche Risiken (UWG, Marken, DSGVO, Datenbankrecht, KMG/AltFG), Datenquellen wirklich verfügbar/lizenziert? Machbarkeit mit dem vorhandenen Code (prüfe stichprobenhaft im Repo ${ROOT}) und 8-GB-Entwicklungsrechner, Thin-Content-/Spam-Risiko bei programmatischem SEO, Abhängigkeit von Versorgern, Kosten (Ads, Daten, Pflege), Wartbarkeit, Ehrlichkeit der Versprechen, Priorisierung (was bringt am schnellsten echte Leads?). Nutze Websuche für Gegenbelege.
Rückgabe: nummerierte Liste der Schwachstellen (kritisch/hoch/mittel) mit konkretem Verbesserungsvorschlag je Punkt, plus die 3 Initiativen, die du streichen oder verschieben würdest, und die 3, die unterschätzt sind.`, { label: 'Strategie-Rat · Red Team', phase: 'Strategie-Rat' })

const final = await agent(`${KONTEXT}

Du bist Vorsitz des Strategie-Rats. Überarbeite den Masterplan mit der Kritik des Red Teams. Übernimm berechtigte Kritik, begründe kurz, wo du widersprichst.

MASTERPLAN-ENTWURF:
${entwurf}

RED-TEAM-KRITIK:
${kritik}

Ergebnis:
(a) Schreibe den finalen Masterplan als Markdown-Datei nach ${ROOT}/docs/MASTERPLAN-DACH.md (einzige Datei, die du anlegen darfst). Gliederung wie im Entwurf, plus Abschnitt „Entscheidungen für den Inhaber“ (Ja/Nein-Fragen mit Empfehlung) und „Welle 1 – Arbeitspakete für die Agenten-Teams“ (je Paket: Ziel, Seiten/Dateien, Abnahmekriterien, Abhängigkeiten, rechtliche Prüfpunkte), Arbeitspakete so geschnitten, dass sie parallel ohne Dateikonflikte gebaut werden können.
(b) Gib als Antwort eine kompakte Zusammenfassung (max. 60 Zeilen): Leitidee, Top-Burggräben, Welle 1, Entscheidungen für den Inhaber, größte Risiken.`, { label: 'Strategie-Rat · Masterplan final', phase: 'Strategie-Rat' })

return { analysen: ok.length, final }
