export const meta = {
  name: 'welle3',
  description: 'Welle 3 laut Masterplan: QM-Reste Ländermodell, B5 Rechnungs-Check, B6 Flächenpass, B7 EG-Preisblatt AT, B8 Kommunal 2.0, B9 Ausschreibungs-Monitor, B10 Börsen-Neutralität, Newsletter und Newsroom; je Paket Bau und Prüfung, am Ende QM',
  phases: [
    { title: 'Bau', detail: 'ein Bau-Agent je Paket, höchstens 3 gleichzeitig (8 GB RAM)' },
    { title: 'Prüfung', detail: 'unabhängiger Prüfer je Paket: Funktion, Recht/Claims, Länder/EN, Design' },
    { title: 'Abnahme', detail: 'Qualitätsmanager: verify, Gesamtprüfung, Commit-Vorschlag' },
  ],
}

// höchstens 3 Agenten gleichzeitig (Dev-Server auf 8 GB RAM)
let frei = 3
const warte = []
async function slot(fn) {
  if (frei > 0) frei--
  else await new Promise((r) => warte.push(r))
  try { return await fn() } finally { const n = warte.shift(); if (n) n(); else frei++ }
}

const REGELN = `BAUAUFTRAG (ausdrücklich erteilt vom Inhaber: „weiter“ = Welle 3 umsetzen). Du sollst BAUEN – Code ändern, prüfen, fertigstellen – nicht nur analysieren oder Rückfragen stellen. Wo etwas offen ist: die vorsichtige, rechtssichere Variante wählen, im Bericht als Inhaberpunkt vermerken und weiterbauen.

PROJEKT: ÖkoInvest-Web, Next.js 15 App Router, React 19, Tailwind v4. Zuerst uebergabe/UEBERGABE.md und docs/MASTERPLAN-DACH.md (Abschnitte 2, 5, 6, 7, 8) lesen. Experten-Berichte mit Ideen: ~/claude-browser/armee/experten/*.md und ~/claude-browser/armee/dossier-teams.md (nutzen, nicht abschreiben).

VERBINDLICHE VORGABEN DES INHABERS:
- LÄNDERMODELL: EINE Website mit identischem Design. Jede neue öffentliche Seite gehört unter src/app/(stamm)/… und muss automatisch auch unter /de, /at, /ch und /en, /en/<land> funktionieren – genauso wie die bestehenden Seiten. Schau dir an, wie das gelöst ist (src/lib/land/seiten.js, src/lib/land/inhalte.js, src/app/(laender)/[land]/…, src/lib/sprache/seiten.js, src/components/Land/Link.js) und halte dich exakt daran. Interne Links immer über die Land-Link-Komponente. Neue Seiten im Sprachregister eintragen: wenn du keine englische Fassung baust, als „nicht übersetzt“ (Hinweis + noindex), sonst mit englischen Texten.
- DE, AT, CH strikt getrennt: Zahlen, Recht, Rechner. Werte nur aus dem Faktenregister (src/lib/fakten) mit Quelle und Stand. Für ein Land ohne geprüfte Werte: LandHinweis statt Zahl (wie beim CH-Pachtrechner).
- Neue Seiten, deren Inhalte noch nicht fachlich geprüft sind: noindex über das bestehende Register (src/lib/indexsteuerung.js), nicht in die Sitemap.
- Design: bestehende Bausteine (src/components/Seite/*, Heroes, Bühnen, Animationssystem) wiederverwenden – neue Seiten müssen aussehen wie die bestehenden, keine neue Optik.
- Leads: jede Werkzeug-Seite führt in die bestehende Lead-Kette (Einwilligungsprotokoll, Routing je Land, Bericht-Baustein /api/rechner/bericht wo passend). Telefon nur bei Rückrufwunsch Pflicht.

HARTE REGELN:
- Keine git-Commits. Keine neuen npm-Abhängigkeiten ohne zwingenden Grund (vorher prüfen, ob etwas Vorhandenes reicht; falls doch: im Bericht begründen).
- Kein Scraping fremder Seiten, keine Versorgermarken/Ranglisten, keine EEX/EPEX-Daten, kein erfundener Social Proof, keine Fake-Zahlen, keine Dark Patterns, keine Umweltclaims („grün“, „klimaneutral“). Keine Geheimnisse, keine Produktivdaten; Backend nur Demo-Modus.
- Rechenlogik bestehender Rechner nur ändern, wenn npm run test:charakterisierung danach grün ist (Abweichungen begründen). Für neue Rechenlogik eigene Tests (*.test.mjs, laufen in npm test).
- Dev-Server http://localhost:3100 NICHT beenden, kein next build, KEIN vollständiges npm run verify (das macht nur der Qualitätsmanager am Ende – sonst stürzt der 8-GB-Rechner ab). Stattdessen: npm test, npm run test:charakterisierung, npx eslint auf geänderte Dateien. Antwortet der Server nicht: warten (ein Wächter startet ihn neu), nicht selbst neu starten.
- Visuell prüfen: cd ~/claude-browser && MSYS_NO_PATHCONV=1 node check.mjs http://localhost:3100 <ausgabeordner im scratchpad> 1440,390 /pfad /at/pfad /en/pfad … und die Bilder mit dem Read-Tool ansehen. Keine Überläufe bei 390.
- Andere Agenten arbeiten gleichzeitig an anderen Paketen. Nur die Dateien deines Pakets ändern; gemeinsame Dateien (src/data/navigation.js, Register, Sitemap) vor jeder Änderung frisch lesen und nur deine Einträge ergänzen.

RÜCKGABE: kurzer deutscher Bericht – was gebaut (Seiten, Dateien), wie geprüft (Tests, Screenshots), was offen ist (Inhaberpunkte, ungeprüfte Werte).`

const PAKETE = [
  { k: 'W3-0', name: 'Reste aus der Ländermodell-Abnahme', auftrag: `Erledige die offenen Punkte der QM-Abnahme des Ländermodells (siehe uebergabe/UEBERGABE.md Abschnitt 6):
1. Schweizer Schreibweise: auf /ch und /en/ch kein „ß“ in Navigation, Footer und allen gemeinsamen Texten – zentral lösen (z. B. Textfilter/Helfer für Land CH an der Stelle, wo Texte ausgegeben werden), nicht hunderte Dateien einzeln.
2. Deutsches Recht im Fließtext auf AT/CH-Seiten (Genossenschaft, Regionen-Rahmen, Due-Diligence-Liste Investoren, weitere Fundstellen per Suche nach „EEG“, „BauGB“, „§ 6 EEG“, „EnWG“): eigene AT/CH-Fassung mit geprüften Aussagen aus dem Faktenregister bzw. bestehenden AT/CH-Texten, sonst neutral formulieren oder als „in Deutschland:“ kennzeichnen.
3. „gilt für Deutschland“ auch im Fließtext der gemeinsamen Seite dort, wo deutsche Rechts- oder Zahlenaussagen stehen (dezent, wie bei den Zahlen-Bausteinen).
4. 404-Seiten: /at/<unbekannt> und /ch/<unbekannt> mit lang de-AT/de-CH und Land-Links; /en/at/<unbekannt> usw. englisch.
5. src/app/api/land/route.js (antwortet nur 410) entfernen, Verweise prüfen.
6. Beispielrechnungen mit deutschen Werten auf AT/CH-Seiten bleiben (Inhaberentscheidung: Kennzeichnung reicht) – nur prüfen, dass JEDE davon klar als „Beispiel mit Werten für Deutschland“ gekennzeichnet ist.` },
  { k: 'B5', name: 'Rechnungs-Check Gewerbestrom DE (Preisradar Schritt 1)', auftrag: `Baue den Rechnungs-Check Gewerbestrom für Deutschland (Masterplan B5 und Abschnitt 6, Schritt 1). Zuerst prüfen, was es schon gibt (Reststrom-Seiten, Energie-live, Rechner, src/lib/fakten, src/lib/invest/markt.js, SMARD-Anbindung).
- Seite /rechner/gewerbestrom-check (Name an bestehende Rechner-Routen anpassen) im Design der bestehenden Rechner.
- Eingaben: Arbeitspreis, Grundpreis, Jahresverbrauch, Leistung/Lastprofil optional, PLZ bzw. Bundesland. Optional Lastgang-CSV, die NUR lokal im Browser ausgewertet wird (nichts hochladen, im UI sagen).
- Zerlegung: amtliche Umlagen, Stromsteuer, Konzessionsabgabe (KAV), Börsenanteil (SMARD, CC BY 4.0 mit Nennung) – alles aus dem Faktenregister mit Quelle/Stand; fehlende Werte ins Register mit Quelle eintragen (Umlagen 2027, sofern veröffentlicht – sonst 2026 mit Stand). Netzentgelt: „aus Ihrer Rechnung übernehmen“ (Schritt 2 folgt später).
- Drei sichtbare Qualitätsstufen: amtlich, berechnet, Schätzung. Ehrliches Ergebnis, auch „Ihr Vertrag ist marktgerecht“. Keine Versorgermarken, keine Anbieterrangliste.
- Preisradar je Bundesland: Übersicht der amtlichen Bestandteile je Bundesland (wo sie sich unterscheiden: KAV-Stufen sind gemeindegrößenabhängig – ehrlich darstellen), ohne erfundene Endpreise.
- Lead: Bericht per Bericht-Baustein (Name, E-Mail, Telefon optional/Rückruf) mit Double-Opt-in im Demo-Modus; Lead-Routing DE.
- AT/CH: LandHinweis („für Österreich ab 2027 nach SNE-VO in Vorbereitung“, „für die Schweiz in Vorbereitung“).
- Tests für die Rechenlogik. Englische Fassung der Seite bauen.` },
  { k: 'B9', name: 'Ausschreibungs-Monitor im Datenzentrum /marktdaten', auftrag: `Baue den Ausschreibungs-Monitor DE/AT/CH im Datenzentrum /marktdaten (Masterplan B9). Bestehendes /marktdaten und /marktdaten/fristen zuerst lesen.
- Daten: Ausschreibungstermine und -ergebnisse (DE: BNetzA Solar erstes Segment, zweites Segment, Innovation; AT: EAG-Marktprämie Ausschreibungen PV; CH: Pronovo Auktionen/Einmalvergütung) – nur aus amtlichen Veröffentlichungen, manuell als Datensätze im Faktenregister bzw. einer Datendatei mit Quelle-URL, Abrufdatum, Stand. Wenn du einen Wert nicht sicher belegen kannst: weglassen und als offen vermerken – keine geschätzten Zuschlagswerte.
- Darstellung: Termine (kommend/vergangen), Höchstwerte, durchschnittliche Zuschlagswerte, Volumen, mit Länderfilter; Diagramm für Zeitreihen im bestehenden Stil (ohne neue Bibliothek, falls vorhanden welche nutzen).
- Download CSV/JSON unter CC BY 4.0 (eigene Zusammenstellung, Quellen genannt); Dataset-Schema (JSON-LD über das bestehende escapende JsonLd).
- Länderfassung: auf /at nur AT-Daten zuerst, /ch nur CH, gemeinsam alle mit Länderkennung.
- Newsletter-Anmeldung „Fristen-Erinnerung“ als Lead-Einstieg (über das Newsletter-Paket, falls schon da – sonst Platz vorsehen und auf bestehende Anfrage/Lead-Kette führen).
- noindex bis zur fachlichen Prüfung. Englische Fassung.` },
  { k: 'B6', name: 'Flächenpass Stufe 1', auftrag: `Baue den Flächenpass Stufe 1 (Masterplan B6). Zuerst den bestehenden Flächencheck (/flaechencheck, FlaechenWizard), die interne Scoring-Engine (suche scoring.js) und vorhandene Kartenkomponenten lesen.
- Nutzer zeichnet eine Fläche ein oder wählt einen Punkt/Flurstück-Näherung (vorhandene Kartenbibliothek nutzen; falls keine vorhanden: einfache Lösung ohne neue Abhängigkeit oder begründet eine schlanke, z. B. Leaflet mit OSM-Kacheln unter Einhaltung der Nutzungsbedingungen und Attribution).
- Ergebnis „Flächenpass“: Größe in ha, grobe Eignung aus scoring.js, länderspezifische Restriktionen als Checkliste (DE: EEG-Flächenkulisse, benachteiligte Gebiete je Bundesland, Schutzgebiete; AT: Widmung/Eignungszonen je Bundesland; CH: Art. 24ter RPG, Parzelle) – nur Aussagen, die im Faktenregister bzw. in bestehenden geprüften Texten belegt sind, sonst „wird im Gespräch geprüft“.
- Ertrag optional über den vorhandenen PVGIS-Proxy, falls vorhanden.
- Lead: Flächenpass als Bericht per Bericht-Baustein gegen Name/E-Mail (Telefon bei Rückruf), Geometrie und ha in den Lead.
- Datenschutz: Geometrie erst mit Absenden übertragen; keine Drittanbieter ohne Einwilligung (Kartenkacheln: Hinweis/Einwilligung wie im Projekt üblich prüfen).
- noindex bis zur Prüfung; englische Fassung.` },
  { k: 'B7', name: 'EG-Software AT: Preisblatt, Wechsel-Check, White-Label', auftrag: `Baue die AT-Speerspitze Energiegemeinschafts-Software (Masterplan B7). Zuerst /energiegemeinschaften, /energiegemeinschaften/software und /energiegemeinschaften/rechner lesen.
- Öffentliches Preisblatt (transparente Struktur: Grundgebühr, je Zählpunkt, Einrichtung) – KEINE erfundenen Preise: Preise aus vorhandenen Daten im Code übernehmen; wenn keine freigegeben sind, Preisblatt-Struktur mit „Preis auf Anfrage / Freigabe durch Inhaber ausstehend“ und Inhaberpunkt.
- Wechsel-Check: Fragen-Assistent für bestehende EGs, ob ein Wechsel des Software-Anbieters sinnvoll und möglich ist, mit ehrlichem Hinweis zur Netzbetreiber-Einschränkung bis ca. April 2027 (Wortlaut aus Masterplan/Faktenregister) – keine Fremdmarken.
- White-Label-Seite für Stadtwerke/Energieversorger (Nutzen, Ablauf, Anfrageformular in die Lead-Kette, Routing AT).
- Diese Inhalte gelten für AT: auf /at voll; gemeinsame Seite mit Kennzeichnung „Österreich“; /de und /ch: LandHinweis bzw. das, was für das Land fachlich stimmt (DE Energy Sharing ab 2026 nur, wenn im Register belegt).
- Englische Fassung. noindex bis zur Prüfung für neue Seiten.` },
  { k: 'B8', name: 'Kommunal 2.0 mit Ratsvorlage', auftrag: `Baue Kommunal 2.0 (Masterplan B8). Zuerst /kommunen, /rechner/kommune und die Kommunal-Bausteine lesen.
- Kommunal-Rechner 2.0: Landespflichten und Beteiligungsmodelle je Land (DE: § 6 EEG Gemeindebeteiligung, Landes-Beteiligungsgesetze, soweit im Faktenregister/bestehenden Texten belegt; AT: Widmung, Gemeinde-Energiegemeinschaft; CH: nur geprüfte Aussagen, sonst LandHinweis).
- Ratsvorlage: druckfertige HTML-Seite (Druck-CSS wie beim Bericht-Baustein) mit Sachverhalt, Zahlen aus dem Rechner, Beschlussvorschlag als Muster (klar als Muster ohne Rechtsberatung gekennzeichnet), Annahmen mit Quellen.
- AT-Widmungskit: Checkliste/Ablauf der Umwidmung je Bundesland, nur belegte Aussagen.
- Lead: Ratsvorlage gegen Name/E-Mail/Gemeinde per Bericht-Baustein bzw. Lead-Kette (Routing je Land).
- Rechenlogik nur mit Charakterisierungstests ändern. Englische Fassung. noindex für neue Seiten bis zur Prüfung.` },
  { k: 'B10', name: 'Neutrale Projektbörse', auftrag: `Baue die Neutralität der Projektbörse aus (Masterplan B10). Zuerst /projektboerse, /projektboerse/anbieten, src/lib/boerse und src/app/api/boerse lesen.
- Neutralitätsversprechen sichtbar: Informationsbarriere zwischen Börse und eigener Projektentwicklung (Seite „Neutralität & Regeln“), Hinweis „keine Börse im Sinne von BörsG/BörseG/FinfraG“, Badges (z. B. „Fremdinserat“, „Gruppenprojekt“, „geprüfte Unterlagen“) – Badges nur als Funktion mit Kriterien, keine erfundenen Inserate oder Zahlen.
- Ehrlicher Bestand: keine Testdaten öffentlich (bestehende Regeln aus Welle 1 beibehalten); leerer Zustand ansprechend mit Einladung zum Inserieren.
- Inserieren: Ablauf für Fremdentwickler mit NDA-Schritt (Muster-NDA nur als Entwurf, Rechtsabteilung prüft), Lead-Kette.
- Länder: Rechtshinweise je Land getrennt. Englische Fassung. noindex für neue Seiten bis zur Prüfung.` },
  { k: 'NL', name: 'Newsletter je Land und Newsroom', auftrag: `Baue Newsletter je Land und einen Newsroom (Masterplan Welle 3, Abschnitt 7).
- Newsletter-Anmeldung mit Double-Opt-in (im Demo-Modus Mail nur protokollieren), Einwilligungsprotokoll über die bestehende Lead-/Einwilligungskette, Themen wählbar (Fristen & Förderung, Marktdaten, Flächen & Pacht, Energiegemeinschaften), Land automatisch aus der Länderwahl, Abmeldung mit einem Klick, keine vorausgewählten Häkchen. Wiederverwendbarer Baustein (für /marktdaten, Footer, Ratgeber).
- Newsroom /newsroom: Pressemitteilungen und Fachbeiträge als Inhalte (Struktur wie Ratgeber), Pressekontakt aus site.js, Medienpaket-Bereich (nur vorhandene, lizenzierte Bilder/Logo). KEINE erfundenen Meldungen: lege höchstens Entwürfe an, die klar als Entwurf markiert und nicht öffentlich sind (Masterplan: keine Presse vor Namens-/Domainentscheidung – Domain oekoinvest.com ist entschieden, aber noch nicht gekauft → Newsroom noindex und nicht in Navigation, bis der Inhaber freigibt).
- Search Console und Bing: Verifizierung über Umgebungsvariablen (Meta-Tag nur, wenn gesetzt) vorbereiten, in .env.example dokumentieren; nichts Externes anmelden.
- Englische Fassung des Newsletter-Bausteins.` },
]

phase('Bau')
const ergebnisse = await Promise.all(PAKETE.map((p) => slot(async () => {
  const bau = await agent(`${REGELN}\n\nDEIN PAKET ${p.k}: ${p.name}\n${p.auftrag}`, { label: `Welle 3 · ${p.k} Bau · ${p.name}`, phase: 'Bau' })
  const pruef = await agent(`${REGELN}\n\nDu bist unabhängiger PRÜFER für Paket ${p.k} (${p.name}). Der Bau-Agent meldet:\n${bau}\n\nAUFTRAG des Pakets war:\n${p.auftrag}\n\nPrüfe kritisch und BEHEBE gefundene Fehler direkt:\n1. Funktion: Seiten laden (gemeinsam, /de, /at, /ch, /en, /en/at), Rechner rechnen plausibel (eigene Gegenrechnung), Formulare führen in die Lead-Kette, Tests vorhanden und grün.\n2. Recht/Claims: keine unbelegten Zahlen, keine Fremdmarken, keine Umweltclaims, keine Zusagen; Länder sauber getrennt; LandHinweis wo Werte fehlen; noindex für ungeprüfte Seiten.\n3. Design: gleiche Optik wie bestehende Seiten (Screenshots 1440 und 390 ansehen), keine Überläufe.\n4. Englisch: Sprachregister korrekt, keine deutschen Reste in Navigation und Hauptinhalt der EN-Fassung (oder sauber als nicht übersetzt markiert).\n5. npx eslint auf alle geänderten Dateien, npm test, npm run test:charakterisierung.\nRückgabe: Prüfbericht (bestanden/behoben/offen).`, { label: `Welle 3 · ${p.k} Prüfung`, phase: 'Prüfung' })
  return { k: p.k, name: p.name, bau, pruef }
})))

phase('Abnahme')
const berichte = ergebnisse.filter(Boolean).map((e) => `## ${e.k} ${e.name}\n### Bau\n${e.bau}\n### Prüfung\n${e.pruef}`).join('\n\n')
const qm = await agent(`${REGELN}\n\nDu bist der QUALITÄTSMANAGER für Welle 3. Jetzt (und nur du) darfst npm run verify vollständig laufen lassen – nacheinander, nicht parallel; bei Serverabsturz mitten im Lauf warten, bis der Wächter ihn neu gestartet hat, betroffene Schritte einzeln wiederholen, am Ende EIN grüner Gesamtlauf.\nPrüfe die Pakete gesamthaft:\n1. Alle neuen Seiten in allen Länder- und Sprachvarianten laden (HTTP-Prüfung), canonical/hreflang/noindex korrekt, Sitemap enthält keine noindex-Seiten.\n2. Design-Gleichheit mit bestehenden Seiten (Screenshots 1440/390 der neuen Seiten ansehen).\n3. Keine Konflikte zwischen Paketen (Navigation, Register, gemeinsame Dateien).\n4. Lead-Kette: jedes neue Formular kommt im Demo-Backend mit Land und Einwilligungsprotokoll an.\n5. Recht/Claims stichprobenartig, Länder-Trennung.\n6. Fehler direkt beheben, erneut prüfen.\nRückgabe: Abnahmeprotokoll, offene Inhaberpunkte, und Commit-Vorschlag als JSON-Liste [{"titel":"…","pfade":["…"]}] (deutsche Titel, ein Thema pro Commit, jede Datei in genau einem Commit).\n\nBerichte der Pakete:\n${berichte}`, { label: 'Welle 3 · Qualitätsmanager', phase: 'Abnahme' })
return { qm, pakete: ergebnisse.filter(Boolean).map((e) => ({ k: e.k, pruef: e.pruef })) }
