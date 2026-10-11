export const meta = {
  name: 'kundenbesuche-abgleich-kovacevic',
  description: 'Abgleich der angegebenen Kundenbesuche (140 Kunden, ohne Lochau) mit Tankankern, km-Kette und Bewegungsprofil 2023-2025',
  phases: [
    { title: 'Routen', detail: 'Distanzen Hall -> Kundenorte' },
    { title: 'Abgleich', detail: 'Kundenorte vs. Tankanker je Jahr' },
    { title: 'Pruefung', detail: 'Steuerprüfer-Gegencheck je Jahr' },
    { title: 'Bericht', detail: 'Ergänzungsbericht HTML' },
  ],
}

const ROOT = 'C:/Users/SALEADMIN/Desktop/Datenrekonstruktion'
const TSV = ROOT + '/.workflow/besuchte_kunden_angabe.tsv'
const JOURNAL = 'C:/Users/SALEADMIN/.claude/projects/c--Users-SALEADMIN-Desktop-Datenrekonstruktion/8a2ca8e0-f32f-46d3-ae0d-ae31c2769890/subagents/workflows/wf_bdfd5932-2d2/journal.jsonl'
const OUT = ROOT + '/Ausgabe/Ergaenzung_Kundenbesuche_Kovacevic.html'

const RULES = `
KONTEXT: Datenrekonstruktion Fahrtenbuch nach Cyberangriff für Ivan Kovacevic (Wohnort Kreinzstraße 3b, 6060 Hall in Tirol; Dienstort lt. Angabe Tirol; Firma ÖKOVOLT, Gewerbegebiet 10, 5121 Ostermiething). Fahrzeuge: BMW 318d GM-718IW (04–11/2023), BMW 320d GM-718IW (11/2023–17.01.2025), BMW 320XD GM-297IW (ab 20.01.2025).
NEUE ANGABE des Auftraggebers (01.10.2026): Ivan hat die Kunden in ${TSV} (Spalten Kd, PLZ, Ort, Bundesland_lt_Liste, Art) im Zeitraum 2023–2026 besucht – OHNE Datum. (4 weitere Kunden in Lochau sind hier nicht enthalten; Lochau ist bereits über "Zweigniederlassung Lochau" und "MW Immobilien max. 1×/Jahr" als ANGABE erfasst.)
INTEGRITÄTSREGELN: Keine Daten/Besuche erfinden. Ein Kundenbesuch bekommt nur dann ein Datum, wenn ein belegter Tankanker (Ort+Datum+Uhrzeit, Karte …0161/…0302) zeitlich und räumlich dazu passt → Status MODELL ("Kandidat, Bestätigung durch Rechnung/Termin ausstehend"). Alle übrigen Besuche bleiben UNDATIERT (Status ANGABE ohne Datum) und werden NICHT auf Tage verteilt. Die 6.000-km-Grenze ist kein Zielwert. Rückfahrt-Regel: jede Fahrt Hall→Ziel→Hall, außer belegte Weiterfahrt/Übernachtung. Bewegungsprofil: max. ~100 km/h Schnitt, ≤10 h Lenkzeit/Tag, Besuche Mo–Fr außer belegt. Keine Doppelzählung mit bereits angesetzten Modell-/Angabe-Fahrten (Ostermiething-Wochenfahrten, Brenner, Lochau) – liegt ein Kundenort auf einer bereits angesetzten Fahrt, entstehen nur Umweg-km. Kundendaten nur mit Kd-Nr/Ort verwenden, keine Personennamen ausgeben.
AUFFÄLLIGKEITEN DER LISTE (als Prüferfragen führen, nicht korrigieren): PLZ 06xxx (Köthen, Roßleben, Heldrungen, Osternienburgerland, Mönchpfiffel) liegen in Sachsen-Anhalt/Thüringen, nicht Hessen; Sarnen, Altishofen, Richenthal, Unterägeri liegen in der Schweiz; Vorarlberger Orte (Bludenz…Lustenau) sind als "Tirol" eingetragen; Oberalm liegt in Salzburg. Für DE-Ost und CH ohne passende Auslands-Tankanker: nur Prüferfrage, keine km ansetzen.
Sprache Deutsch.`

const ROUTE_SCHEMA = { type: 'object', properties: {
  orte: { type: 'array', items: { type: 'object', properties: {
    plz: { type: 'string' }, ort: { type: 'string' }, land_bundesland_korrekt: { type: 'string' },
    km_einfach: { type: ['number', 'null'] }, fahrzeit_min: { type: ['number', 'null'] }, quelle: { type: 'string' },
    region_tour: { type: 'string', description: 'Cluster für Sammeltouren, z.B. Unterinntal, Zillertal, Kaiserwinkl, Kitzbühel, Außerfern, Oberland, Vbg-Oberland, Vbg-Rheintal, Bregenzerwald, Salzburg, DE-Ost, CH' } },
    required: ['plz', 'ort', 'km_einfach', 'quelle', 'region_tour'] } },
  hinweise: { type: 'array', items: { type: 'string' } } }, required: ['orte', 'hinweise'] }

phase('Routen')
const routes = await agent(`Du bist Recherche-Agent Routen.
${RULES}
Lies ${TSV}. Ermittle für JEDEN eindeutigen Ort (PLZ+Ort) die Straßendistanz einfach und Fahrzeit ab Kreinzstraße 3b, 6060 Hall in Tirol (schnellste Route). Methode: Geocoding via Nominatim und Routing via OSRM (router.project-osrm.org) mit curl/Python im Bash-Tool; falls nicht erreichbar, Luftlinie×1,25 als SCHÄTZUNG. Korrigiere Land/Bundesland nach Geografie (Spalte land_bundesland_korrekt) und weise Abweichungen zur Liste aus. Ordne jeden Ort einem Tour-Cluster zu.`,
  { label: 'Recherche Kundenorte', phase: 'Routen', schema: ROUTE_SCHEMA })

const YEARS = [2023, 2024, 2025]
const perYear = await pipeline(YEARS,
  y => agent(`Du bist Datenrekonstruktionsassistent "Kundenbesuche ${y}".
${RULES}
DATEN:
- Kundenorte mit Distanzen/Clustern: ${JSON.stringify(routes)}
- Tankanker: In ${JOURNAL} enthalten die Zeilen {"type":"result"} der Agenten "Rekonstruktion 20xx-n" das Feld transaktionen (JSON oder Python-Dict-String; mit Python ast.literal_eval/json parsen). Nutze nur Transaktionen des Jahres ${y} (plus Anschluss-Anker der Nachbarjahre).
- Bisherige Rekonstruktion ${y}: das jüngste {"type":"result"} des Agenten mit label "Rekonstruktionsassistent ${y}" (zugehörige agentId über die "started"-Zeilen mit label ermitteln; die LETZTE started-Zeile mit diesem Label zählt). Darin: km-Kette, Wochentest, Modellfahrten Szenario B, Privat-km Szenario B.
AUFGABE:
1. Für jeden Tankanker ${y} außerhalb Hall/Mils/Absam/Rum/Innsbruck: liegen Kundenorte im Umkreis von ca. 15 km oder auf der Strecke Hall→Anker? Prüfe mit km-Kette (Abschnitt muss Hin+Rück inkl. Umweg tragen), Uhrzeit und Bewegungsprofil. Treffer = MODELL-Kandidat "Kundenbesuch Kd ... (Ort), Datum, Hall–Ort–Hall, km". Mehrere Kunden derselben Tour am selben Tag zusammenfassen.
2. Prüfe, welche Kandidaten bereits in Szenario-B-Fahrten enthalten sind (z. B. Ostermiething-Fahrt über Kufstein/Wörgl, Lochau-Fahrt über Vorarlberg) → nur Umweg-km zusätzlich, sonst Kunden-km als Zweck der bereits angesetzten Fahrt (keine Doppelzählung).
3. Undatierte Kunden: je Tour-Cluster die Mindest-km einer Sammeltour Hall–Cluster–Hall berechnen (eine Tour je Cluster im Gesamtzeitraum 2023–2026 = untere Grenze; Aufteilung auf Jahre nur als Spanne 0..Maximum, NICHT als datierte Zeilen).
4. Neue Jahreszahlen: Szenario C = Szenario B + zusätzliche MODELL-Kundenkm aus Schritt 1/2 (ohne Doppelzählung). Gib Privat-km C aus und zusätzlich eine Spanne C+ unter Einrechnung der maximal auf ${y} entfallenden undatierten Mindest-km. Abstand zur Grenze (2023: 4.500; 2024/2025: 6.000).
5. Prüfliste je Kunde (nur Kd-Nr, Ort): Kandidatendatum(e) oder "undatiert", km, Felder "Beleg (Rechnung/Protokoll/Termin)" und "bestätigt ja/nein" zum Ausfüllen.
Ausgabe: vollständiger Markdown-Bericht mit Tabellen (Kandidaten, Cluster-Mindesttouren, Jahresrechnung B→C→C+, Prüfliste).`,
    { label: `Kundenabgleich ${y}`, phase: 'Abgleich' }),
  (rep, y) => agent(`Du bist Steuerprüfer-Agent (GPLB Österreich) für ${y}. Prüfe den Kundenabgleich ADVERSARIAL.
${RULES}
BERICHT:
${rep}
Prüfe: Wurden Besuche ohne passenden Anker datiert? Doppelzählungen mit Szenario-B-Fahrten? Rückfahrt/Bewegungsprofil eingehalten? Rechenwege korrekt (Stichproben, Tankanker im Journal ${JOURNAL} gegenprüfen)? Ist "besucht 2023–2026 ohne Datum" als Nachweis tauglich? Welche Fragen stellt die Prüferin zu den Listenfehlern (DE-Ost als Hessen, CH ohne Land, Vbg als Tirol)? Gib: Korrekturen mit Fundstelle, korrigierte Jahreszahlen B/C/C+, Prüferfragen, Urteil. Markdown.`,
    { label: `Steuerprüfer Kunden ${y}`, phase: 'Pruefung' }).then(p => ({ jahr: y, bericht: rep, pruefung: p })),
)

phase('Bericht')
const done = perYear.filter(Boolean)
await agent(`Du bist HTML-Redakteur. Schreibe mit dem Write-Tool ${OUT} (eigenständiges HTML, UTF-8, inline CSS, druckfreundlich A4 quer, Systemschrift). Oben Banner "DATENREKONSTRUKTION nach Cyberangriff – Ergänzung Kundenbesuche (Angabe Auftraggeber vom 01.10.2026), kein Original-Fahrtenbuch", diagonales Wasserzeichen "REKONSTRUKTION". Status-Badges mit Text: BELEGT grün, ANGABE blau, MODELL violett (Hypothese), ABGELEITET gelb, OFFEN grau, WIDERSPRUCH rot.
${RULES}
Abschnitte: 1 Anlass und Angabe (140 Kunden, ohne Datum; Lochau separat), 2 Methodik und Regeln, 3 Kundenorte mit Distanz und Cluster (inkl. Listenauffälligkeiten), 4 je Jahr: datierte MODELL-Kandidaten, Abgrenzung zu Szenario B, undatierte Cluster-Mindesttouren, Jahresrechnung B → C → C+ (mit Prüferkorrekturen), 5 Steuerprüfer-Ergebnis je Jahr, 6 Prüfliste je Kunde zum Ausfüllen (Kd-Nr, Ort, Kandidatendatum/undatiert, km, Beleg, bestätigt), 7 Fazit ohne Schönung, 8 nächste Schritte (welche Belege je Kunde die Zeilen auf BELEGT heben). Verlinke ../Ausgabe/index.html. Keine Personennamen, nur Kd-Nr und Ort. Prüferkorrekturen MÜSSEN eingearbeitet sein.
${done.map(p => `=== ${p.jahr} ABGLEICH ===\n${p.bericht}\n=== ${p.jahr} PRÜFUNG ===\n${p.pruefung}`).join('\n\n')}
=== ROUTEN ===
${JSON.stringify(routes)}
Gib am Ende NUR eine kompakte Tabelle zurück: Jahr | Privat-km B | Privat-km C | Spanne C+ | Grenze | Anzahl datierte Kandidaten (jeweils nach Prüferkorrektur).`,
  { label: 'HTML Ergänzung', phase: 'Bericht' })
  .then(r => { log(r); return r })
return 'fertig'
