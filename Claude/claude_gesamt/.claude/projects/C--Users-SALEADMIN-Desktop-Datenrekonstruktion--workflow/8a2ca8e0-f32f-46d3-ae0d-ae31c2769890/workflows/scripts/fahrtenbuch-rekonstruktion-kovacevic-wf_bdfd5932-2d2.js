export const meta = {
  name: 'fahrtenbuch-rekonstruktion-kovacevic',
  description: 'Belegbasierte Fahrtenbuch-Rekonstruktion 2023-2025 (Kovacevic, GM-718IW/GM-297IW) mit Prüfung und HTML-Ausgabe',
  phases: [
    { title: 'Belegextraktion', detail: 'Rekonstruktionsagenten lesen Tankkarten-, Miet- und Buchungsbelege' },
    { title: 'Recherche', detail: 'Routen, Fahrzeugdaten, Rechtslage' },
    { title: 'Rekonstruktion', detail: 'Datenrekonstruktionsassistent je Jahr' },
    { title: 'Steuerpruefung', detail: 'Steuerprüfer-Agent je Jahr (adversarial)' },
    { title: 'Finanzamt', detail: 'Sachbezugs-Beurteilung' },
    { title: 'HTML', detail: 'Ausgabe je Jahr + Übersicht' },
  ],
}

const ROOT = 'C:/Users/SALEADMIN/Desktop/Datenrekonstruktion'
const TXT = 'C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Desktop-Datenrekonstruktion/8a2ca8e0-f32f-46d3-ae0d-ae31c2769890/scratchpad/txt'
const OUT = ROOT + '/Ausgabe'

const RULES = `
STAMMDATEN:
- Fahrer: Ivan Kovacevic, Wohnsitz Kreinzstraße 3b, 6060 Hall in Tirol.
- Arbeitgeber/Firmenstandort: ÖKOVOLT Solartechnik GmbH, Gewerbegebiet 10, 5121 Ostermiething.
- Kennzeichen GM-718IW (BMW 320d Touring, Miete BR Mobility) vom 01.04.2023 bis 17.01.2025; GM-297IW vom 17.01.2025 bis 01.10.2026.
- Tankkarte GM 718IW: 710207034918000161 (eni Multicard); GM 297IW: 710207034918000302. Weitere Karten anderer Fahrzeuge/Fahrer in den Sammelrechnungen sind NICHT relevant.
- Ziel des Auftraggebers: Prüfung, ob halber Sachbezug (§ 4 Abs 2 Sachbezugswerte-VO, max. 6.000 km privat/Jahr bzw. 500 km/Monat) belegbar ist.

VERBINDLICHE INTEGRITÄTSREGELN (nicht verhandelbar):
1. Es werden KEINE Fahrten, Ziele, Zwecke oder Kilometerstände erfunden. Jede Angabe braucht eine Quelle (Datei + Seite) oder ist ausdrücklich als ABGELEITET (mit Rechenweg) oder OFFEN gekennzeichnet.
2. Kilometerstände aus Tankbelegen sind zwingend und dürfen nicht verändert werden. Steht dort 0 oder nichts, gilt "km-Stand nicht erfasst" – nicht schätzen und als Ist-Wert ausgeben.
3. Strecken zwischen belegten Tankorten dürfen als "plausible Mindeststrecke" (Routenplaner) ausgewiesen werden, aber NIE als betriebliche Fahrt deklariert werden, solange kein Zweck-Beleg vorliegt.
4. Fahrten Wohnung (Hall in Tirol) – Arbeitsstätte (Ostermiething) sind beim Sachbezug PRIVATFAHRTEN.
5. Nicht zuordenbare Kilometer bleiben als "nicht zugeordnet / OFFEN" stehen – keine Auffüllung, um ein Steuerergebnis zu erreichen.
6. Alles ist als DATENREKONSTRUKTION nach Cyberangriff zu kennzeichnen, nicht als Original-Fahrtenbuch.
Sprache: Deutsch.`


const KUNDEN = `
KUNDENINFO (Angabe des Auftraggebers vom 01.10.2026): Tankort Lochau (Vorarlberg) = Kundenstandort "MW Immobilien". Lochau-Aufenthalte daher als "betrieblich – Kunde MW Immobilien (ANGABE Auftraggeber, Nachweis ausstehend)" führen, eigener Status ANGABE (blau). Erst mit Ausgangsrechnungen/Aufträgen/Montageberichten an MW Immobilien für die jeweiligen Daten wird daraus BELEGT. Die Anfahrt Hall/Ostermiething→Lochau ist dann als Dienstreise (Szenario) zu rechnen; Fahrten Wohnung–Arbeitsstätte bleiben privat. In der Liste fehlender Belege: Projektunterlagen/Rechnungen MW Immobilien je Einsatztag.
WEITERE ANGABE des Auftraggebers: Kunden in Tirol und Vorarlberg werden in der Regel nur EINMAL PRO JAHR besucht. Diese Angabe ist gegen die Anzahl belegter Tankungen in Lochau/Vorarlberg und Tirol je Jahr abzugleichen. Liegen deutlich mehr Tage mit Tankungen in Vorarlberg/Tirol vor als ein Besuch pro Jahr, ist das als WIDERSPRUCH zwischen Angabe und Beleglage offen auszuweisen (mit Datumsliste) – NICHT durch Annahmen auflösen. Nur Lochau-Tage, die einem belegten Kundenbesuch zugeordnet werden können, dürfen als betrieblich (ANGABE) geführt werden; alle übrigen bleiben OFFEN. Prüfer- und Finanzamt-Agent müssen diesen Punkt ausdrücklich würdigen.
HINWEIS AUS DER BELEGEXTRAKTION: Das Kennzeichen GM-718IW war lt. Mietrechnungen nacheinander auf zwei Fahrzeugen (BMW 318d Touring ca. 04-09/2023, BMW 320d Touring ab ca. 11/2023) – km-Ketten je Fahrzeug getrennt führen.
DIENSTORT (ANGABE Auftraggeber vom 01.10.2026, Nachweis = Dienstvertrag/Dienstzettel ausstehend): Dienstort von Ivan Kovacevic ist TIROL (Wohnort Hall), nicht Ostermiething. Er fährt regelmäßig von Hall zu Dienstbesprechungen in die Firma nach Ostermiething UND WIEDER ZURÜCK (Hin+Rück lt. Routenrecherche ca. 357,9 km). Unter dieser Angabe sind solche Fahrten DIENSTREISEN (betrieblich), nicht Wohnung–Arbeitsstätte. Regel 4 gilt in diesem Szenario NICHT für Hall–Ostermiething; Fahrten innerhalb Tirols vom Wohnort zu Kunden/Einsatzorten sind ebenfalls nach Zweckbeleg zu beurteilen.
AUFGABE DAZU: (1) Prüfe jeden Abschnitt zwischen zwei km-Ankern mit Start und Ende im Raum Hall/Mils/Wattens/Innsbruck: passt die Differenz zu n × 357,9 km (n=1..k) plus plausiblem Lokalverkehr? Gib je Abschnitt n, Rest-km und Trefferqualität an. (2) Weise ehrlich aus, dass eine Vorprüfung 17 von 51 Hall–Hall-Abschnitten mit ±60 km passend fand, was etwa der Zufallsrate entspricht – die km-Muster allein BESTÄTIGEN das Szenario also nicht; Bestätigung nur über Termine. (3) Passende Abschnitte als MODELL "Dienstreise Hall–Ostermiething–Hall (Dienstbesprechung), Datum innerhalb Abschnitt X–Y" führen, mit Prüflisten-Zeile (Suchbegriffe: Besprechung, Termin, Ostermiething, Datum-Fenster) für den E-Mail-/Kalenderabgleich durch den Auftraggeber. (4) Rechne für jedes Jahr zwei Ergebnisse: Szenario A (Dienstort Ostermiething: Hall–Ostermiething privat) und Szenario B (Dienstort Tirol: diese Fahrten Dienstreise). In Szenario B: betriebliche km = Summe der zuordenbaren Dienstreise-Abschnitte (MODELL) + INDIZ-Fahrten; Privat-km = Gesamt-km minus betriebliche km; Vergleich mit 6.000 km/Jahr (bzw. anteilig). Ergebnis nicht schönen. (5) Prüferfragen dazu: Dienstvertrag, warum keine Reisekosten/Diäten für ca. 100 Dienstreisen/Jahr abgerechnet wurden, Anwesenheitsnachweise der Besprechungen.`

const PDF_HOWTO = `Textauszüge (pdftotext -layout) liegen unter ${TXT}/<JAHR>/<dateiname>.txt (Unterordner-Dateien als "Mietrechnungen__<datei>.txt"). Ist ein Auszug leer oder sehr kurz (<200 Zeichen) oder unklar (OCR-Fehler wie "7181W" statt "718IW"), lies das Original-PDF visuell mit dem Read-Tool (Parameter pages, max 20 Seiten pro Aufruf). Original-PDFs: ${ROOT}/Fahrtenbuch <JAHR>/Fahrtenbuch <JAHR>/<datei>. XML/MSG-Dateien direkt lesen.`

const TX_SCHEMA = {
  type: 'object',
  properties: {
    transaktionen: { type: 'array', items: { type: 'object', properties: {
      datum: { type: 'string', description: 'ISO YYYY-MM-DD' },
      uhrzeit: { type: 'string' },
      kennzeichen: { type: 'string', enum: ['GM-718IW', 'GM-297IW', 'unklar'] },
      ort: { type: 'string' }, land: { type: 'string' },
      produkt: { type: 'string' },
      menge: { type: ['number', 'null'] },
      betrag_brutto: { type: ['number', 'null'] },
      km_stand: { type: ['number', 'null'], description: 'nur wenn auf Beleg >0 angegeben, sonst null' },
      quelle: { type: 'string', description: 'Dateiname + Seite' },
      lesesicherheit: { type: 'string', enum: ['hoch', 'mittel', 'niedrig'] },
      bemerkung: { type: 'string' },
    }, required: ['datum', 'kennzeichen', 'ort', 'produkt', 'km_stand', 'quelle', 'lesesicherheit'] } },
    dateien_ohne_treffer: { type: 'array', items: { type: 'string' } },
    unlesbar: { type: 'array', items: { type: 'string' } },
    hinweise: { type: 'array', items: { type: 'string' } },
  },
  required: ['transaktionen', 'dateien_ohne_treffer', 'unlesbar', 'hinweise'],
}

const MISC_SCHEMA = {
  type: 'object',
  properties: {
    fahrzeuge: { type: 'array', items: { type: 'object', properties: {
      kennzeichen: { type: 'string' }, modell: { type: 'string' },
      zeitraum: { type: 'string' }, monatsmiete_netto: { type: ['number', 'null'] },
      quelle: { type: 'string' }, bemerkung: { type: 'string' } }, required: ['kennzeichen', 'quelle'] } },
    sonstige_belege: { type: 'array', items: { type: 'object', properties: {
      datei: { type: 'string' }, inhalt: { type: 'string' }, relevanz_fahrtenbuch: { type: 'string' },
      km_staende: { type: 'array', items: { type: 'string' } } }, required: ['datei', 'inhalt', 'relevanz_fahrtenbuch'] } },
    hinweise: { type: 'array', items: { type: 'string' } },
  },
  required: ['fahrzeuge', 'sonstige_belege', 'hinweise'],
}

const BATCHES = [
  { jahr: 2023, files: ['ER_00015821_30.04.2023_9164.pdf','ER_00020242_31.05.2023_12416.pdf','ER_00024704_30.06.2023_13649.pdf','ER_00029148_31.07.2023_16120.pdf','ER_13157925_31.07.2023_16129.pdf'] },
  { jahr: 2023, files: ['ER_00033589_31.08.2023_17935.pdf','ER_00038053_30.09.2023_20042.pdf','ER_00042528_31.10.2023_23689.pdf','ER_00047013_30.11.2023_25405.pdf','ER_00051462_31.12.2023_26886.pdf'] },
  { jahr: 2024, files: ['ER_00002482_31.01.2024_1941.pdf','ER_13165734_31.01.2024_1954.pdf','ER_00006925_29.02.2024_4974.pdf','ER_00011412_31.03.2024_7671.pdf','ER_07014473_31.03.2024_7680.pdf','ER_00015919_30.04.2024_9192.pdf','ER_00020421_31.05.2024_10944.pdf'] },
  { jahr: 2024, files: ['ER_13171012_31.05.2024_10957.pdf','ER_00024917_30.06.2024_13001.pdf','ER_001012653_30.06.2024_13013.pdf','ER_00029396_31.07.2024_15430.pdf','ER_07015103_31.07.2024_15423.pdf','ER_710207034918INTERN_31.08.2024_16962.pdf'] },
  { jahr: 2024, files: ['ER_00038351_30.09.2024_19195.pdf','ER_00042799_31.10.2024_20387.pdf','ER_13177326_31.10.2024_20401.pdf','ER_00047257_30.11.2024_22277.pdf','ER_217686218_30.11.2024_21997.pdf','ER_202403216_05.12.2024_21986.pdf','ER_00051685_31.12.2024_23601.pdf'] },
  { jahr: 2025, files: ['ER_00002357_31.01.2025_1127.pdf','ER_217686218_31.01.2025_1121.pdf','ER_00006771_28.02.2025_2347.pdf','ER_001012653_28.02.2025_2363.pdf','ER_00011190_31.03.2025_3986_1.pdf','ER_00011190_31.03.2025_3986_2.xml'] },
  { jahr: 2025, files: ['ER_00015623_30.04.2025_5496_1.pdf','ER_00015623_30.04.2025_5496_2.xml','ER_00020064_31.05.2025_8008.pdf','ER_99180457_21.05.2025_8555.pdf','ER_00024517_30.06.2025_9227_1.pdf','ER_00024517_30.06.2025_9227_2.xml','ER_00028953_31.07.2025_12679.pdf'] },
  { jahr: 2025, files: ['ER_00033372_31.08.2025_13158.pdf','ER_00576824_30.09.2025_15812.pdf','ER_00042254_31.10.2025_17150.pdf','ER_3951_31.10.2025_17143.pdf','ER_00046666_29.11.2025_18095.pdf','ER_00051079_31.12.2025_19357.pdf'] },
]

const MISC_FILES = {
  2023: ['BU_242023_31.05.2023_12719.pdf','BU_492023_15.12.2023_25626.pdf','BU_542023_31.12.2023_27006.pdf','Mietrechnungen/BB_RE23275BR_31.12.2023_27245.pdf','Mietrechnungen/BB_RE23276BR_31.12.2023_27248.pdf','Mietrechnungen/ER_RE23074BR_28.04.2023_8229.pdf','Mietrechnungen/ER_RE23074BR_28.05.2023_10343.pdf','Mietrechnungen/ER_RE23074BR_28.06.2023_12218.pdf','Mietrechnungen/ER_RE23074BR_28.07.2023_14830.pdf','Mietrechnungen/ER_RE23074BR_28.08.2023_16596.pdf','Mietrechnungen/ER_RE23074BR_28.09.2023_19241.pdf','Mietrechnungen/ER_RE23075BR_28.04.2023_8232.pdf'],
  2024: ['BU_412024_30.09.2024_18803.pdf','Mietrechnungen/ER_RE24028BR_30.01.2024_1570.pdf','Mietrechnungen/ER_RE24058BR_01.02.2024_1655.pdf','Mietrechnungen/ER_RE24103BR_04.03.2024_7048.pdf','Mietrechnungen/ER_RE24142BR_02.04.2024_7055.pdf','Mietrechnungen/ER_RE24210BR_31.05.2024_11416.pdf','Mietrechnungen/ER_RE24246BR_14.06.2024_11419.pdf','Mietrechnungen/ER_RE24293BR_01.07.2024_12917.pdf','Mietrechnungen/ER_RE24357BR_06.08.2024_15408.pdf'],
  2025: ['BU_092025_30.04.2025_4857.pdf','BU_342025_22.09.2025_14250.pdf','BU_462025_18.12.2025_19426.pdf','ER_RE-251625_02.12.2025_17878_2.xml','ER_RE-251625_02.12.2025_17878_3.msg','Mietrechnungen/ER_RE-251364_31.07.2025_10973.pdf','Mietrechnungen/ER_RE-251483_30.09.2025_15034.pdf','Mietrechnungen/ER_RE-251522_08.10.2025_15037.pdf','Mietrechnungen/ER_RE-251576_13.11.2025_17173.pdf','Mietrechnungen/ER_RE-251625_02.12.2025_17878_1.pdf'],
}

// ---------- Phase 1+2: Extraktion und unabhängige Recherche parallel ----------
phase('Belegextraktion')
log('Rekonstruktionsagenten lesen ' + BATCHES.reduce((n, b) => n + b.files.length, 0) + ' Tankbelege + Miet-/Buchungsbelege; Recherche zu Recht und Fahrzeug läuft parallel.')

const extractThunks = BATCHES.map((b, i) => () => agent(`Du bist Rekonstruktionsagent #${i + 1} (Belegextraktion Tankkarten).
${RULES}
${PDF_HOWTO}
JAHR: ${b.jahr}. Deine Dateien (Ordner ${ROOT}/Fahrtenbuch ${b.jahr}/Fahrtenbuch ${b.jahr}/):
${b.files.map(f => '- ' + f).join('\n')}

Aufgabe: Extrahiere JEDE Transaktion (Diesel, AdBlue, Wäsche, Vignette, Maut, E-Charging, Shop usw.), die der Tankkarte/dem Kennzeichen GM 718IW oder GM 297IW zugeordnet ist (Kartenabschnitt "Kartennumm ... GM 718IW/GM 297IW", OCR-Varianten wie 7181W beachten). Ignoriere andere Karten/Fahrzeuge. km_stand nur übernehmen, wenn eine echte Zahl >0 in der km-Spalte steht (Achtung: Spalten im Layout verrutschen oft – im Zweifel das PDF visuell prüfen und lesesicherheit entsprechend setzen). Datum ins ISO-Format. Ort möglichst mit Bundesland/Land (z. B. "Lochau (Vbg), AT", "S-Bergheim" = Salzburg). Lies alle Seiten jeder Datei.`,
  { label: `Rekonstruktion ${b.jahr}-${i + 1}`, phase: 'Belegextraktion', schema: TX_SCHEMA }))

const miscThunk = () => agent(`Du bist Rekonstruktionsagent für Miet- und Buchungsbelege.
${RULES}
${PDF_HOWTO}
Dateien:
${Object.entries(MISC_FILES).map(([y, fs]) => fs.map(f => `- ${y}: ${ROOT}/Fahrtenbuch ${y}/Fahrtenbuch ${y}/${f}`).join('\n')).join('\n')}

Aufgabe: Ermittle je Mietrechnung Kennzeichen, Fahrzeugmodell, Leistungszeitraum, Miete. Kläre was die BU-Belege (Buchungsbelege) und BB-Belege sind (z. B. Werkstatt, Schaden, Service mit km-Stand, Zwischenabrechnung). Halte JEDEN km-Stand fest, der irgendwo genannt ist (Werkstatt, Übergabe, Rückgabe). Fahrzeug GM-297IW: Modell/Kraftstoff ermitteln.`,
  { label: 'Rekonstruktion Miet-/Buchungsbelege', phase: 'Belegextraktion', schema: MISC_SCHEMA })

const legalThunk = () => agent(`Du bist Recherche-Agent (Recht, Österreich).
${RULES}
Recherchiere mit WebSearch/WebFetch (bevorzugt findok.bmf.gv.at, ris.bka.gv.at, bmf.gv.at, LStR 2002 Rz 168ff, 174ff):
1. Voraussetzungen halber Sachbezug für KFZ-Privatnutzung (Sachbezugswerte-VO § 4 Abs 2), Zeitraum 2023-2026, inkl. Durchschnittsbetrachtung und Nachweis.
2. Anforderungen der Finanzverwaltung/VwGH an ein ordnungsgemäßes Fahrtenbuch; Zulässigkeit und Beweiswert nachträglich erstellter/rekonstruierter Aufzeichnungen; andere Beweismittel (z. B. VwGH-Judikatur, "andere Beweismittel als Fahrtenbuch").
3. Einordnung Fahrten Wohnung–Arbeitsstätte als Privatfahrten; Sonderfälle (Dienstreise direkt von Wohnung, Familienheimfahrt, Baustellen/Montage als wechselnde Einsatzorte).
4. Sachbezugswerte für gemietete KFZ (Basis Anschaffungskosten / Listenpreis bei Miete/Leasing), CO2-Grenzwerte 2023-2026.
5. Folgen bei Verwerfung des Fahrtenbuchs.
Gib eine strukturierte Zusammenfassung mit Fundstellen-URLs zurück (Fließtext, max. ~1.200 Wörter).`,
  { label: 'Recherche Recht/Sachbezug', phase: 'Recherche' })

const vehicleThunk = () => agent(`Du bist Recherche-Agent (Fahrzeugdaten).
${RULES}
Recherchiere per WebSearch: realistischer Dieselverbrauch BMW 320d Touring (G21, ca. 2019-2023) – WLTP und Praxiswerte (z. B. spritmonitor.de Durchschnitt), Tankvolumen, AdBlue-Verbrauch. Für GM-297IW ist das Modell noch unbekannt – liefere zusätzlich typische Spannen für Mittelklasse-Diesel-Kombis. Gib eine Verbrauchs-Bandbreite (min/typisch/max l/100km) für den Abgleich Tankmenge ↔ gefahrene km zurück, mit Quellen-URLs. Fließtext, max. 500 Wörter.`,
  { label: 'Recherche Fahrzeug/Verbrauch', phase: 'Recherche' })

const [ex1, ex2, ex3, ex4, ex5, ex6, ex7, ex8, misc, legal, vehicle] = await parallel([...extractThunks, miscThunk, legalThunk, vehicleThunk])
const extracts = [ex1, ex2, ex3, ex4, ex5, ex6, ex7, ex8]
const failed = extracts.map((e, i) => e ? null : i + 1).filter(Boolean)
if (failed.length) log('ACHTUNG: Extraktions-Batches ohne Ergebnis: ' + failed.join(', '))

const allTx = extracts.filter(Boolean).flatMap(e => e.transaktionen)
  .sort((a, b) => (a.datum + (a.uhrzeit || '')).localeCompare(b.datum + (b.uhrzeit || '')))
const extractNotes = extracts.filter(Boolean).flatMap(e => [...e.hinweise, ...e.unlesbar.map(u => 'UNLESBAR: ' + u)])
log(`${allTx.length} Transaktionen extrahiert, davon ${allTx.filter(t => t.km_stand).length} mit km-Stand.`)

// ---------- Recherche Routen (braucht Ortsliste) ----------
phase('Recherche')
const orte = [...new Set(allTx.map(t => t.ort))]
const routes = await agent(`Du bist Recherche-Agent (Routen/Distanzen).
${RULES}
Ermittle per WebSearch/WebFetch (Google Maps bzw. Routenplaner wie ViaMichelin/ADAC/ÖAMTC; Google-Maps-Direkt-API ist nicht verfügbar) die Straßendistanz (schnellste Route, km) und Fahrzeit für:
A) Wohnung Kreinzstraße 3b, 6060 Hall in Tirol ↔ Gewerbegebiet 10, 5121 Ostermiething (Route via Deutsches Eck A8 und via Inntal/Pass Thurn angeben).
B) Wohnung Hall in Tirol ↔ jeder Tankort, Firmenstandort Ostermiething ↔ jeder Tankort.
Tankorte: ${orte.join('; ')}
Kennzeichne jeden Wert als "Routenplaner (Quelle)" oder als "SCHÄTZUNG Luftlinie×1,25", falls kein Routenwert abrufbar. Weise auf auffällige Orte hin, die weder auf der Strecke Hall–Ostermiething liegen noch nahe einem der beiden Punkte (z. B. Lochau/Vorarlberg, Wien, Enns). Liefere eine Tabelle als Markdown.`,
  { label: 'Recherche Routen', phase: 'Recherche' })

// ---------- Phase 3+4: je Jahr Rekonstruktion -> Steuerprüfer ----------
const YEARS = [2023, 2024, 2025]
const yearTx = y => allTx.filter(t => t.datum.startsWith(String(y)))
const context = y => {
  const prev = allTx.filter(t => t.datum < `${y}-01-01` && t.km_stand).slice(-3)
  const next = allTx.filter(t => t.datum > `${y}-12-31` && t.km_stand).slice(0, 3)
  return { prev, next }
}

const perYear = await pipeline(YEARS,
  y => agent(`Du bist Datenrekonstruktionsassistent für das Jahr ${y}.
${RULES}
${KUNDEN}
Zeitraum: ${y === 2023 ? '01.04.2023–31.12.2023' : y === 2024 ? '01.01.2024–31.12.2024' : '01.01.2025–31.12.2025 (Kennzeichenwechsel am 17.01.2025)'}.

DATEN:
Transaktionen ${y} (JSON): ${JSON.stringify(yearTx(y))}
km-Stände angrenzender Jahre (Anschluss): ${JSON.stringify(context(y))}
Miet-/Buchungsbelege: ${JSON.stringify(misc)}
Routen-Recherche: ${routes}
Verbrauchs-Recherche: ${vehicle}
Extraktions-Hinweise: ${JSON.stringify(extractNotes)}

AUFGABE – erstelle die belegbasierte Rekonstruktion:
1. Chronologisches Ereignisprotokoll (jede Transaktion = belegter Standort-/Zeitpunkt-Anker) mit km-Stand falls belegt.
2. km-Kette: zwischen je zwei belegten km-Ständen gefahrene km; Monotonie prüfen (km-Stand darf nie sinken; Widersprüche ausweisen, NICHT glätten). Bei Kennzeichen- oder Fahrzeugwechsel getrennte Ketten.
3. Verbrauchsabgleich: Liter zwischen km-Ankern vs. gefahrene km → l/100km; gegen Recherche-Bandbreite prüfen; Ausreißer markieren (mögliche Fremdbetankung/Kanister/Fehlbuchung).
4. Für Zeiträume ohne km-Stand: aus Literabsatz und Verbrauchsbandbreite eine Kilometer-SPANNE ableiten (min/max), klar als ABGELEITET.
5. Je Monat: belegte Tankorte, Mindeststrecke (Routenplaner) zwischen aufeinanderfolgenden Ankern, gefahrene km (belegt oder Spanne), Anteil betrieblich BELEGT (nur wenn Zweck-Beleg existiert – aktuell liegen keine Zweckbelege vor, also 0 bzw. OFFEN), Anteil Wohnung–Arbeitsstätte nur als Szenario.
6. Plausibilitätsauffälligkeiten (Tankorte fernab Wohnung/Firma, Wochenend-Tankungen, Doppeltankungen am selben Tag, Tankungen in Lochau usw.) neutral auflisten.
7. Liste der benötigten zusätzlichen Belege, um Fahrtzwecke zu belegen (Kundenaufträge/Montageprojekte, Kalender, Arbeitszeitaufzeichnungen, Urlaub/Krankenstand, Telematik vom Vermieter BR Mobility, GO-Maut/Vignette, Diäten-/Reisekostenabrechnungen).
8. MODELLREKONSTRUKTION (wie Tatort-Rekonstruktion): Leite aus den belegten Ankern (Ort, Datum, Uhrzeit, km, Liter) die mathematisch wahrscheinlichste Fahrtenfolge ab (z. B. Ausgangspunkt Hall bzw. Ostermiething → Tankort/Kunde → Rückfahrt), je Hypothese mit: Datum, Von, Nach, km (Routenplaner), Wahrscheinlichkeit (hoch/mittel/niedrig) und Begründung (welche Anker sie stützen). Status jeder Modellfahrt = MODELL (violett) – ausdrücklich "Hypothese, Bestätigung durch E-Mail/Kalender/Rechnung durch Auftraggeber ausstehend". Die Summe der Modell-km muss zur km-Kette bzw. Liter-Spanne passen (Rest = OFFEN). WICHTIG: Die 6.000-km-Grenze ist KEIN Eingabeparameter und darf die Modellbildung nicht steuern; das Privat-km-Ergebnis wird erst danach ausgerechnet und ehrlich ausgewiesen, inkl. Fahrten Wohnung–Arbeitsstätte als privat. Gib zusätzlich eine "Prüfliste für den Auftraggeber" aus: je Modellfahrt eine Zeile zum Abhaken (bestätigt / abweichend / privat) mit Suchbegriffen für den E-Mail-Abgleich (Kundenname, Ort, Datum ±2 Tage).
Gib einen vollständigen, strukturierten Bericht in Markdown zurück, inkl. vollständiger Tabelle aller Ereignisse (keine Zeilen weglassen) und Monatsübersicht.`,
    { label: `Rekonstruktionsassistent ${y}`, phase: 'Rekonstruktion' }),
  (rek, y) => agent(`Du bist Steuerprüfer-Agent (Außenprüfung/GPLB, Österreich) für ${y}. Prüfe den folgenden Rekonstruktionsbericht ADVERSARIAL, wie ein kritischer Prüfer bei einer Lohnabgabenprüfung.
${RULES}
${KUNDEN}
Rechtslage (Recherche): ${legal}
Original-Transaktionen zur Gegenprüfung: ${JSON.stringify(yearTx(y))}

BERICHT:
${rek}

Prüfe: (a) Stimmen alle km-Stände/Liter mit den Transaktionsdaten überein? Stichprobe von mind. 5 Einträgen gegen die Original-PDFs (${PDF_HOWTO}). (b) Wurde irgendetwas erfunden, geglättet oder ohne Quelle als betrieblich ausgewiesen? Sind Modellfahrten klar als Hypothese markiert? (c) Verbrauchsabgleich rechnerisch korrekt? (d) Welche Fragen würde ein Prüfer stellen (z. B. Tankungen in Lochau, Wohnsitz Hall vs. Firmensitz Ostermiething, Wochenenden, Urlaube)? (e) Würde das Dokument als Fahrtenbuch anerkannt? Was fehlt dafür?
Gib zurück: 1) Liste konkreter Korrekturen (mit Fundstelle), 2) Prüferfragen-Katalog, 3) Gesamturteil zur Beweiskraft. Markdown.`,
    { label: `Steuerprüfer ${y}`, phase: 'Steuerpruefung' })
    .then(pruef => ({ jahr: y, rekonstruktion: rek, pruefung: pruef })),
)

// ---------- Phase 5: Finanzamt-Beurteilung über alle Jahre ----------
phase('Finanzamt')
const fa = await agent(`Du bist Finanzamt-Agent (Fachbereich Lohnsteuer/Sachbezüge). Beurteile auf Basis der Rekonstruktionen und Prüferberichte aller Jahre, ob der halbe Sachbezug für Ivan Kovacevic für 2023, 2024, 2025 (und Ausblick 1-9/2026, für das keine Belege vorliegen) nachweisbar ist.
${RULES}
${KUNDEN}
Rechtslage: ${legal}
Routen: ${routes}
${perYear.filter(Boolean).map(p => `=== ${p.jahr} REKONSTRUKTION ===\n${p.rekonstruktion}\n=== ${p.jahr} PRÜFUNG ===\n${p.pruefung}`).join('\n\n')}

Liefere: je Jahr gefahrene km (belegt/Spanne), Szenario-Rechnung Privat-km bei 1, 2, 4 und 0 Heimfahrten Hall–Ostermiething pro Monat gegen Grenze 6.000 km/Jahr, Ergebnis "halber Sachbezug belegbar / nicht belegbar / nur mit weiteren Belegen", und eine klare Empfehlung (inkl. Hinweis auf Abstimmung mit Steuerberatung und offenlegende Darstellung gegenüber dem Prüfer). Kein Ergebnis vortäuschen, das die Daten nicht tragen. Markdown, max. ~1.500 Wörter.`,
  { label: 'Finanzamt-Agent', phase: 'Finanzamt' })

// ---------- Phase 6: HTML ----------
phase('HTML')
const STYLE = KUNDEN + `
HTML-VORGABEN: Eine eigenständige .html-Datei (UTF-8, alles inline, keine externen Ressourcen), druckfreundlich (A4 quer, @media print), schlichtes seriöses Layout, Systemschrift. Ganz oben ein deutlich sichtbares Banner: "DATENREKONSTRUKTION nach Cyberangriff – kein Original-Fahrtenbuch. Erstellt am 01.10.2026 auf Basis von Tankkarten-, Miet- und Buchungsbelegen." Zusätzlich dezentes diagonales Wasserzeichen "REKONSTRUKTION" (CSS, auch im Druck). Statusspalte mit farbcodierten Badges: BELEGT (grün), ANGABE (blau), MODELL (violett, Hypothese), ABGELEITET (gelb), OFFEN (grau), WIDERSPRUCH (rot) – plus Text, nicht nur Farbe. Jede Zeile mit Quellenangabe (Datei + Seite). Abschnitte: 1 Stammdaten & Fahrzeuge, 2 Methodik & Integritätsregeln, 3 Ereignisprotokoll (vollständige Tabelle), 4 km-Kette & Verbrauchsabgleich, 5 Monatsübersicht, 6 Auffälligkeiten, 7 Ergebnis Steuerprüfer-Agent, 8 Beurteilung Sachbezug (Finanzamt-Agent, Auszug für dieses Jahr), 9 Modellrekonstruktion (Hypothesen) + Prüfliste für E-Mail-Abgleich zum Abhaken, 10 Fehlende Belege / nächste Schritte, 11 Erklärung zur Erstellung (Unterschriftsfelder Fahrer und Geschäftsführung, Datum). Korrekturen des Steuerprüfers MÜSSEN eingearbeitet sein. Keine Zeilen weglassen, nichts hinzuerfinden.`

await parallel([
  ...perYear.filter(Boolean).map(p => () => agent(`Du bist HTML-Redakteur. Schreibe mit dem Write-Tool die Datei ${OUT}/Fahrtenbuch_Rekonstruktion_${p.jahr}_Kovacevic.html.
${RULES}
${STYLE}
=== REKONSTRUKTION ${p.jahr} ===
${p.rekonstruktion}
=== STEUERPRÜFER ${p.jahr} ===
${p.pruefung}
=== FINANZAMT-BEURTEILUNG (alle Jahre) ===
${fa}
Gib am Ende nur den Dateipfad und die Anzahl der Ereigniszeilen zurück.`,
    { label: `HTML ${p.jahr}`, phase: 'HTML' })),
  () => agent(`Du bist HTML-Redakteur. Schreibe mit dem Write-Tool die Übersichtsdatei ${OUT}/index.html (gleiche Gestaltung: Banner "DATENREKONSTRUKTION nach Cyberangriff – kein Original-Fahrtenbuch", Wasserzeichen, inline CSS, druckfreundlich).
${RULES}
${KUNDEN}
Inhalt: Zweck & Anlass (Cyberangriff), Fahrer/Fahrzeuge/Zeiträume, Links auf Fahrtenbuch_Rekonstruktion_2023_Kovacevic.html, _2024_, _2025_, Jahresübersicht km (belegt/Spanne), Gesamtergebnis Sachbezug, Hinweis dass für 01.01.–01.10.2026 keine Belege vorlagen, Routen-Referenztabelle, Methodik, Rechtsgrundlagen mit Links.
=== FINANZAMT ===
${fa}
=== ROUTEN ===
${routes}
=== RECHT ===
${legal}
Gib nur den Dateipfad zurück.`, { label: 'HTML Übersicht', phase: 'HTML' }),
])

return { transaktionen: allTx.length, mitKm: allTx.filter(t => t.km_stand).length, failed, finanzamt: fa, pruefer: perYear.filter(Boolean).map(p => ({ jahr: p.jahr, pruefung: p.pruefung })) }
