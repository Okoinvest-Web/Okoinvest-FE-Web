// Erzeugt roster.json (für Dashboard und Workflow) aus der Teamliste.
import { writeFileSync } from "node:fs";

const T = {
  "Team Österreich": [
    ["Marktanalyst AT", "Wettbewerber in AT (PV-Projektierer, Flächenvermittler, Agri-PV, EG-Plattformen, Energie-Crowdinvesting), deren Websites, Angebote, Lead-Mechaniken; Suchnachfrage; Lücken, die wir besetzen können."],
    ["Regulierung & Förderung AT", "EAG, ElWG, Förderungen (EAG-Investitionszuschuss, Marktprämie), Netzentgelte, Landesrecht; was davon als einzigartiger Mehrwert auf die Website gehört; prüfe unsere AT-Inhalte im Code auf Richtigkeit, Aktualität und Vermischung mit DE/CH."],
    ["Raumordnung, Netze & Landwirtschaft AT", "Widmung/Raumordnung je Bundesland (PV-Zonen, Grünland), Netzanschluss-Situation je Netzbetreiber, Landwirtschaftskammern, Pachtgepflogenheiten; welche Daten je Bundesland/Bezirk wir legal nutzen und zeigen können."],
    ["Energieversorger AT", "Websites von Verbund, Wien Energie, EVN, Energie AG, Kelag, Salzburg AG, TIWAG, illwerke vkw, Energie Steiermark: Inhalte, Rechner, Gewerbe-/PV-/Gemeinschafts-Angebote, Lücken; woher deren Traffic kommt und wie wir legitim davon profitieren."],
  ],
  "Team Deutschland": [
    ["Marktanalyst DE", "Wettbewerber in DE (Projektierer, Flächenportale, Pachtvermittler, Agri-PV, Speicher), Lead-Mechaniken der Marktführer, Suchnachfrage, Lücken."],
    ["Regulierung & Förderung DE", "EEG/Solarpaket, § 35 BauGB-Privilegierung, Flächenkulisse, § 6 EEG Kommunalbeteiligung, Energy Sharing § 42c EnWG; prüfe DE-Inhalte im Code auf Richtigkeit und Vermischung."],
    ["Netze & Flächenkulisse DE", "Netzanschluss-Engpässe, benachteiligte Gebiete je Bundesland, Ausschreibungen BNetzA; welche offenen Daten (Marktstammdatenregister, Destatis) wir für Seiten je Landkreis/Gemeinde nutzen können."],
    ["Energieversorger DE", "EnBW, E.ON, RWE, Stadtwerke: Inhalte, Rechner, Lead-Strecken, Gewerbe-Angebote, Lücken bei Mittelstand/Landwirten/Kommunen; legitime Hebel für uns."],
  ],
  "Team Schweiz": [
    ["Marktanalyst CH", "Markt für Freiflächen-/Alpin-PV, Wettbewerber, Suchnachfrage, Lücken; prüfe, ob unsere CH-Inhalte heute eigenständig genug sind."],
    ["Regulierung CH", "Mantelerlass/StromVG, LEG ab 2026, ZEV, Einmalvergütung, kantonale Unterschiede (Raumplanung, Bewilligungen); Richtigkeit unserer CH-Inhalte."],
    ["Sprache & Kultur CH", "Ansprache in der Schweiz (Helvetismen, Franken, Konsens-Kultur, Gemeindeautonomie), Bedarf an FR/IT-Inhalten, Vertrauenssignale, die in CH zählen."],
    ["Energieversorger CH", "Axpo, BKW, Alpiq, EKZ, CKW, Stadtwerke: Inhalte, Angebote, Lücken; ElCom-Tarifdaten als Chance; legitime Hebel."],
  ],
  "Technik & Ingenieurwesen": [
    ["Elektrotechnik & Netzanschluss", "Netzanschluss (Mittel-/Hochspannung, Trafo, Umspannwerk-Entfernung, Netzebenen AT/DE/CH), Einspeisebegrenzung, Netzverträglichkeit; prüfe den Netzanschluss-Rechner und die Aussagen dazu fachlich; welche Netz-Inhalte/Tools wären einzigartig?"],
    ["PV-Systemingenieur", "Ertrag (spezifischer Ertrag je Region, PVGIS), Auslegung (Modulreihen, Abstand, Ost-West vs. Süd, bifazial, Tracker), Flächenbedarf je MWp; prüfe die Rechenannahmen in src/lib/invest/markt.js und src/lib/rechner auf fachliche Richtigkeit je Land."],
    ["Speicher-Ingenieur", "Batteriegroßspeicher (Co-Location, Stand-alone, Netzdienstleistungen, Arbitrage, Brandschutz, Netzanschluss); prüfe Großspeicher-Seite und -Rechner fachlich; was fehlt Interessenten?"],
    ["Bau- & Statik-Ingenieur", "Dachflächen (Statik, Dachzustand, Brandschutz), Solarcarports (Fundamente, Ladeinfrastruktur), Freiflächen-Bau (Rammprofile, Zaun, Rückbau); prüfe Dach-/Carport-Inhalte und -Rechner fachlich."],
    ["Umwelt & Genehmigung", "Naturschutz, Biodiversität im Solarpark, UVP-Schwellen, Blendgutachten, Bodenschutz, Rückbau; Genehmigungswege je Land; welche Inhalte schaffen Vertrauen bei Eigentümern und Gemeinden?"],
  ],
  "Business & Prozesse": [
    ["Business-Analyst Vertrieb & Lead-Prozess", "End-to-end-Prozess vom Besucher bis zum Abschluss: welche Anfrage landet wann bei wem (Routing nach Land/Zielgruppe/Größe), Reaktionszeiten, Lead-Status, Übergabe ins CRM (src/lib/plattform/crm.js), Benachrichtigungen, Berichte für den Vertrieb; Lücken im heutigen Code."],
    ["Business-Analyst Marketing-Steuerung", "Marketing-Cockpit im Portal: Kampagnen, Inhalte, Newsletter, Presse, Landingpages, Kennzahlen zentral steuern, ohne Entwickler; was existiert (src/lib/plattform/akquise-kampagne.js, automation.js, Vorlagen) und was fehlt; Einsatz moderner Technologie (KI-Unterstützung für Texte mit Freigabe, Personalisierung, A/B-Tests)."],
    ["Newsletter & Marketing-Automation", "Newsletter je Land und Zielgruppe mit Double-Opt-in, Segmente, Nurturing-Strecken (Flächeneigentümer, Landwirte, Gemeinden, Investoren, Mittelstand), Abmeldung, Kennzahlen; Versandtechnik und Datenschutz; Anbindung an Rechner/PDF-Leads."],
    ["Presse & Newsroom", "Pressebereich: Newsroom, Pressemitteilungen, Pressekit (Logos, Fotos, Fakten nur echt), Ansprechpartner, Journalisten-Verteiler mit Einwilligung, Daten-Studien als PR-Anlass; Struktur, die Medien und KI-Suchmaschinen gern zitieren."],
    ["Compliance Officer", "Hinweisgebersystem (HinSchG DE, HSchG AT, Schweizer Praxis): Pflichten, Anonymität, sichere Meldekanäle, Fristen, Fallbearbeitung; Verhaltenskodex, Geldwäsche-Bezug, Interessenkonflikte; prüfe vorhandenen Code (src/lib/plattform/compliance) und empfehle, ob eigenes Portal oder zertifizierter Anbieter."],
    ["Rechtsabteilung", "AGB, Nutzungsbedingungen, Datenschutzerklärungen, Bedingungen je Zielgruppe und Land getrennt; Versionierung, Zustimmung mit Nachweis, Änderungsmitteilungen; prüfe src/app/bedingungen, /nutzungsbedingungen, /datenschutz und LegalShell auf Lücken (z. B. CH-Fassungen, Widerruf, Gerichtsstand)."],
    ["Besucher-Erlebnis & Engagement", "Verweildauer und Wiederkehr ethisch steigern: interaktive Wissens-Tools, Karten, Daten zum Entdecken, personalisierte Startseite für Wiederkehrer, Merklisten, Fortschritt im Ratgeber, Benachrichtigungen mit Einwilligung – Freude und Nutzen statt Manipulation."],
    ["Funnel-Architekt", "Anfrage-Funnels je Zielgruppe und Land Schritt für Schritt (Einstieg → Wert → Vertrauen → Mikro-Zusage → Anfrage/Registrierung), Abbruchpunkte im heutigen Code, A/B-Test-Plan, Kennzahlen je Stufe."],
    ["Interaktions- & Animationsdesigner", "Interaktionen, die Wissen vermitteln und zur Anfrage führen (z. B. Fläche auf der Karte einzeichnen, Pacht live sehen, Energiefluss erleben); was vom Motion-System (src/components/motion) noch ungenutzt ist; Ideen mit Wow, ohne Ladezeit zu opfern."],
    ["Prozessmanager Operations", "Interne Abläufe hinter der Website: Zuständigkeiten, Freigaben, Benachrichtigungen, Automatisierung (src/lib/plattform/automation.js), Dokumentenfluss, Qualitäts- und Reaktionszeiten; was muss die Website-Plattform dafür liefern?"],
  ],
  "Zukunft & Strategie": [
    ["Zukunftsforscher", "Trends 2027–2032 mit Belegen (Regulierung, Netzengpässe, Speicherboom, dynamische Tarife, PPA, Agri-PV, KI-Suche verändert Traffic). Was JETZT bauen, um 2028 vorne zu sein?"],
    ["Strategieberater", "Positionierung und Burggraben: Netzwerkeffekte (Flächen, Projekte, Investoren, Abnehmer), Datenvorsprung, Marke; ehrlich priorisiert. Lies docs/ und Projektbörse/Portal."],
    ["M&A-Berater", "Was brauchen Investoren/Fonds/Stadtwerke beim Kauf von Projektrechten/RTB/Bestand? Projektbörse als Dealflow-Magnet (Teaser, Datenraum-Vorschau, Bewertungsindikatoren, NDA-Flow); Verkäufer-Leads."],
    ["Partnerschafts-Stratege", "Reichweite großer Versorger LEGAL nutzen: Abnahme/PPA, Direktvermarktung, Co-Marketing, Versorger als Investoren in der Börse, Stadtwerke, Verbände (PV Austria, BSW, Swissolar), Gemeindebund, Landwirtschaftskammern; konkrete Partner-Pakete."],
    ["Finanz- & Business-Analyst", "Unit Economics: Wert eines Leads je Zielgruppe (Fläche, Projekt, Investor, Gewerbestrom), Abschlussquoten, Kosten je Kanal, Budget-Empfehlung, Business Case der Initiativen; realistische Zahlen mit Quellen."],
  ],
  "Mensch & Conversion": [
    ["Entscheidungspsychologe", "Ängste, Vertrauensanker, Verlustaversion je Zielgruppe (Eigentümer, Landwirte, Gemeinden, Investoren, Mittelstand); ethische Hebel; 3–4 Kernseiten ansehen."],
    ["UX- und Conversion-Forscher", "Lead-Magneten: freies Kernergebnis plus Mehrwert gegen Name/E-Mail/Telefon (PDF-Bericht, Pachtangebot-Check, Gemeinde-Report, Preisalarm), Progressive Profiling, Double-Opt-in; prüfe die 16 Rechner und Formulare; Trichter je Zielgruppe und Land."],
    ["Vertriebsexperte", "Lead-Scoring, Speed-to-Lead (Rückruf, /termin), CRM-Übergabe (src/lib/plattform/crm.js), Nachfass-Sequenzen, Qualifizierungsfragen, Vertriebsunterlagen."],
    ["Customer Success", "Von der Registrierung zur aktiven Nutzung des Portals: Onboarding, Aktivierung, Wiederkehr, Empfehlungen (echte, mit Einwilligung)."],
    ["Agrar-Experte", "Landwirte als Zielgruppe: Hofübergabe, Pachtverträge, Förderungen (GAP, Agri-PV-Anrechnung), Bewirtschaftung unter Modulen, Ansprache über Kammern/Maschinenringe/Fachpresse."],
    ["Kommunal-Experte", "Gemeinden: Gremienprozesse, Beteiligungsmodelle, Wertschöpfung, Bürgerbeteiligung, was Bürgermeister brauchen (z. B. Gemeinderats-Vorlage als PDF), DE/AT/CH getrennt."],
  ],
  "Marketing & Content": [
    ["Marktkommunikation", "Markenstory und Botschaften je Land/Zielgruppe, PR-Anlässe (Studien, Indizes), Newsletter, Events/Webinare; was macht uns zur Referenzquelle?"],
    ["Content-Redaktion & Copywriting", "Redaktionsplan 12 Monate je Land, Formate (Ratgeber, Daten-Reports, echte Fallstudien), Tonalität, Qualitätsregeln gegen KI-Einheitsbrei."],
    ["Video & Social Content", "Erklärvideos, Drohnen-/Baustellen-Content (nur echt), Shorts, YouTube-SEO, LinkedIn-Formate; Produktionsplan mit kleinem Budget."],
  ],
  "SEO & SEM": [
    ["SEO-Stratege", "Keyword-Universum DE/AT/CH getrennt (Begriffe unterscheiden sich), Content-Cluster, Lücken, Kannibalisierung, Länder-URL-Struktur und hreflang de-AT/de-DE/de-CH."],
    ["Programmatic & Local SEO", "Programmatische Seiten nur mit echtem Mehrwert und echten Daten je Bundesland/Bezirk/Gemeinde/Kanton/Netzbetreiber; Datenquellen, Qualitätsregeln gegen Thin Content, Google Business Profile."],
    ["KI-Suche (GEO)", "Sichtbarkeit in ChatGPT Search, Perplexity, Google AI Overviews, Copilot: wer wird heute zitiert (testen), welche Inhalte/Daten/Struktur führen zu Zitaten."],
    ["Linkaufbau & Digital PR", "White-Hat-Backlinks: Daten-Studien/Indizes, Verbände, Gemeinden, Kammern, Hochschulen, Fachmedien, einbettbare Widgets; konkrete Ziele und Ansprache."],
    ["Google-Ads-Experte", "Kampagnen je Land, Keyword-Cluster mit Intent, negative Keywords, Landingpages, Offline-Conversions aus CRM, realistische CPCs/Budgets (recherchieren); Grenzen bei Marken-Keywords."],
    ["B2B-Social & LinkedIn Ads", "LinkedIn (Investoren, Gemeinden, Mittelstand), Meta regional (Landwirte, Eigentümer), YouTube; Zielgruppen, Formate, Lead-Formulare vs. Landingpages."],
    ["Tracking & Attribution", "Consent Mode v2, serverseitiges Tagging, Conversion-Ereignisse, Lead-Wert, Offline-Import, Dashboards; DSGVO/TKG AT/revDSG CH; prüfe vorhandenes Setup im Code."],
  ],
  "Daten & Software": [
    ["Daten-Architekt Preisradar", "Gewerbestrompreis-Vergleich je Bundesland (AT), Netzgebiet/PLZ (DE), Gemeinde/Netzbetreiber (CH): legale Quellen (E-Control, ElCom Open Data, BNetzA/Monitoring, veröffentlichte Preisblätter, EPEX) mit Lizenz, Abdeckung, Aktualität; Grenzen (Gewerbetarife oft individuell); Architektur (Jobs, ISR, Kennzeichnung) und Verknüpfung mit dem Reststrom-Pool als Lead-Quelle. Datenquellen-Tabelle."],
    ["JavaScript-Architekt", "Strikte Ländertrennung: Routing (/at /de /ch oder Domains), Länderkontext, getrennte Inhalte/Rechenlogik (src/lib/invest/markt.js, src/lib/rechner), Migration ohne SEO-Verlust, hreflang, Geo-Hinweis ohne Zwang; Lead-Pipeline mit PDF (src/lib/plattform/server/pdf.js); Aufwand."],
    ["Performance-Engineer", "Core Web Vitals im Produktions-Szenario: Bundle-Größen, Client-Komponenten, Bilder, Schriften, Animationen; Budget und konkrete Maßnahmen (Code lesen, kein next build ausführen)."],
    ["Data Scientist", "Eigene Datenprodukte als Burggraben: Pachtpreis-Index, Netzanschluss-Index, Flächenpotenzial-Karte, Lead-Scoring-Modell; Datenquellen, Methodik, Veröffentlichung."],
    ["KI-Produkt", "Sinnvolle KI-Funktionen auf der Website (Flächen-Assistent, Fragen zum eigenen Ergebnis, Dokumenten-Check) – ehrlich, sicher, mit Kosten; was ist vorhanden (src/lib/plattform/ki)?"],
    ["IT-Security", "Nur lesend: API-Routen (Validierung, Rate-Limit, Bot-Schutz, Spam), Security-Header/CSP, Lead-Daten, npm audit lokal, Datenjobs (SSRF), Admin-Zugänge; priorisierte Befunde."],
  ],
  "Dokumentation & Normen": [
    ["ISO 9001 Qualitätsmanagement-Dokumentation", "Dokumentierte Informationen nach ISO 9001 für Entwicklung und Betrieb, Lückenliste, Dokumentenstruktur"],
    ["ISO/IEC 27001 Informationssicherheit", "ISMS-Dokumentation, Annex A, Abgleich mit dem Code, NIS2/DSGVO-Bezug"],
    ["Softwarequalität ISO/IEC 25010 & Code-Dokumentation", "JSDoc, Modul-READMEs, API-Doku, Qualitätsmerkmale, Automatisierung"],
    ["Architektur-Dokumentation arc42 & ADR", "arc42-Gliederung und Architekturentscheidungen für die großen Weichenstellungen"],
    ["Technische Redaktion & Betriebshandbuch", "Deployment, Notfall, Redaktion je Land, Anwenderdoku Portal"],
  ],
  "Recht & Qualität": [
    ["Recht & Compliance", "Vergleichswerbung (UWG/öUWG/CH-UWG) bei Preisradar und Versorger-Vergleichen, Markenrecht in Inhalten/Ads, Datenbankrecht beim Datenbezug, Haftung für Rechner/PDF-Berichte, KMG/AltFG bei Investor-Inhalten; je Initiative typische Risiken und saubere Lösung."],
    ["Datenschutz", "Lead-Gating, Telefon (Kaltakquise-Regeln je Land), Einwilligungen, Double-Opt-in, Auftragsverarbeiter, Speicherfristen, Betroffenenrechte; prüfe Formulare/Datenschutzerklärung im Code."],
    ["Qualitätsmanagement-Lead", "Qualitätssystem für alle Umsetzungswellen: Definition of Done, Prüfautomatik (check.mjs/film.mjs, ESLint, Lighthouse-Kriterien), Freigabe-Prozess, Fehlerkategorien; was fehlt heute?"],
    ["Faktencheck", "Prüfe stichprobenhaft Fachaussagen und Zahlen der Website (src/lib/invest/markt.js, Ratgeber, Länderseiten) gegen Primärquellen; Liste veralteter, falscher oder vermischter Aussagen je Land."],
    ["Barrierefreiheit", "WCAG 2.2 AA und European Accessibility Act: Prüfung der Kernseiten und Formulare, Befunde, Pflichtumfang."],
    ["Visuelle Kontrolle & UI", "Kernseiten in 1440/390 ansehen und mit Weltklasse vergleichen (Stripe, Linear, Vercel, Tesla Energy, Octopus Energy, Enpal, 1KOMMA5°): wo fehlen Wow, Klarheit, Vertrauen, Tempo?"],
  ],
};

const agenten = [];
for (const [team, rollen] of Object.entries(T)) {
  for (const [rolle, auftrag] of rollen) agenten.push({ label: `${team} · ${rolle}`, team, rolle, auftrag, art: "analyst" });
  agenten.push({ label: `${team} · Team-Lead`, team, rolle: "Team-Lead", auftrag: "Ergebnisse des Teams bündeln, Konflikte auflösen, Top-Initiativen priorisieren", art: "lead" });
}
for (const [rolle, auftrag] of [
  ["Masterplan", "Team-Ergebnisse zum Masterplan verdichten"],
  ["Red Team", "Plan angreifen: rechtlich, wirtschaftlich, technisch, Ehrlichkeit"],
  ["Masterplan final", "Plan nach Kritik überarbeiten, Umsetzungswellen festlegen"],
]) agenten.push({ label: `Strategie-Rat · ${rolle}`, team: "Strategie-Rat", rolle, auftrag, art: "rat" });

writeFileSync(new URL("./roster.json", import.meta.url), JSON.stringify({ titel: "ÖkoInvest Agenten-Armee · Masterplan DACH", agenten }, null, 2));
console.log(`${agenten.length} Agenten in ${Object.keys(T).length + 1} Teams`);
