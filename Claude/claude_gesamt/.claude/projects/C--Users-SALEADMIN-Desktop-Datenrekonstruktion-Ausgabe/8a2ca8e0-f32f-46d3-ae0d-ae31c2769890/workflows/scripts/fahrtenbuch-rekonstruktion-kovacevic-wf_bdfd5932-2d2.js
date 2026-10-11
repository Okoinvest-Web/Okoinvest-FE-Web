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
LOCHAU / VORARLBERG (Angaben des Auftraggebers vom 01.10.2026, zusammengeführt und präzisiert): In Lochau gibt es ZWEI verschiedene Ziele: (1) die ZWEIGNIEDERLASSUNG der Firma in Lochau – dorthin fährt Ivan Kovacevic zu Projektbesprechungen, das kann auch öfter im Jahr vorkommen; (2) den KUNDEN "MW Immobilien", ebenfalls in Lochau – dieser wird maximal EINMAL PRO JAHR besucht. Fahrten Richtung Vorarlberg/Lochau daher grundsätzlich als "betrieblich – Projektbesprechung Zweigniederlassung Lochau (ANGABE, Nachweis ausstehend)" führen; höchstens eine Lochau-Fahrt je Jahr darf alternativ als "Kunde MW Immobilien (ANGABE)" geführt werden. Nachweis: Firmenbuchauszug der Zweigniederlassung, Besprechungseinladungen/Protokolle; für MW Immobilien Ausgangsrechnung/Auftrag. Die frühere Angabe "Kunden in Tirol und Vorarlberg nur einmal pro Jahr" bezieht sich auf KUNDEN, nicht auf die Zweigniederlassung – Vorarlberg-Fahrten zur Zweigniederlassung sind damit KEIN Widerspruch. Diese Präzisierung neutral dokumentieren (Angabe-Historie), nicht als Widerspruch werten.
HINWEIS AUS DER BELEGEXTRAKTION: Das Kennzeichen GM-718IW war lt. Mietrechnungen nacheinander auf zwei Fahrzeugen (BMW 318d Touring ca. 04-09/2023, BMW 320d Touring ab ca. 11/2023) – km-Ketten je Fahrzeug getrennt führen.
DIENSTORT (ANGABE Auftraggeber vom 01.10.2026, Nachweis = Dienstvertrag/Dienstzettel ausstehend): Dienstort von Ivan Kovacevic ist TIROL (Wohnort Hall), nicht Ostermiething. Er fährt von Hall zu Dienstbesprechungen in die Firma nach Ostermiething UND WIEDER ZURÜCK (Hin+Rück lt. Routenrecherche ca. 357,9 km), laut Auftraggeber IMMER EINMAL PRO WOCHE. Unter dieser Angabe sind solche Fahrten DIENSTREISEN (betrieblich), nicht Wohnung–Arbeitsstätte; Regel 4 gilt in diesem Szenario NICHT für Hall–Ostermiething.
AUFGABE DAZU (Berechnung anhand der Kilometer):
(1) Wochentest: Für JEDE Kalenderwoche (ISO-KW) des Zeitraums aus der km-Kette die in der Woche gefahrenen km bestimmen (bei Ankern über Wochengrenzen anteilig/als Spanne, klar ABGELEITET). Woche ist "vereinbar" mit einer Fahrt Hall–Ostermiething–Hall, wenn ≥ 357,9 km in der Woche gefahren wurden UND keine belegten Anker die Fahrt ausschließen (z. B. Tankungen in Kroatien/Ausland, nur Lokalverkehr Tirol mit kleinem km-Zuwachs, Urlaubswochen). Je Woche: KW, Datum von–bis, km der Woche, Anker-Orte, Ergebnis (vereinbar / nicht vereinbar mit Grund / nicht prüfbar mangels km).
(2) Abschnittstest: Abschnitte zwischen km-Ankern mit Start und Ende im Raum Hall/Mils/Wattens/Innsbruck: passt die Differenz zu n × 357,9 km plus plausiblem Lokalverkehr? n, Rest-km, Trefferqualität. Ehrlich ausweisen: Vorprüfung fand 17 von 51 Hall–Hall-Abschnitten mit ±60 km passend, was etwa der Zufallsrate entspricht – die km-Muster allein bestätigen das Szenario nicht; Bestätigung nur über Termine.
(3) Jede wochenweise vereinbare Fahrt als MODELL "Dienstreise Hall–Ostermiething–Hall (Dienstbesprechung), KW xx" mit 357,9 km führen, plus Prüflisten-Zeile für E-Mail-/Kalenderabgleich (Suchbegriffe: Besprechung, Termin, Ostermiething, KW/Datum-Fenster). Nicht vereinbare Wochen als WIDERSPRUCH zur Angabe "immer einmal pro Woche" mit Grund auflisten – NICHT wegrechnen.
(4) Für jedes Jahr zwei Ergebnisse: Szenario A (Dienstort Ostermiething: Hall–Ostermiething privat) und Szenario B (Dienstort Tirol: vereinbare Wochenfahrten = Dienstreise, MODELL). In B: betriebliche km = Anzahl vereinbarer Wochen × 357,9 + INDIZ-Fahrten + Brenner-Vertriebsfahrten (ANGABE); Privat-km = Gesamt-km minus betriebliche km; Vergleich mit 6.000 km/Jahr bzw. anteilig. Ergebnis nicht schönen; auch ausweisen, wie viele weitere betriebliche km für den halben Sachbezug fehlen würden.
(5) Prüferfragen: Dienstvertrag mit Dienstort Tirol, warum keine Reisekosten/Diäten für ca. 50 Dienstreisen/Jahr abgerechnet wurden, Anwesenheitsnachweise/Protokolle der Besprechungen, fehlende Tankungen im Raum Ostermiething/Innviertel.
BRENNER (ANGABE Auftraggeber vom 01.10.2026): Fahrten Richtung Brenner (Tankungen/Anker am Brenner bzw. Wipptal/Südtirol) sind VERTRIEBSMEETINGS mit dem freien Mitarbeiter Manuel Ultmar. Diese Fahrten als "betrieblich – Vertriebsmeeting M. Ultmar (ANGABE, Nachweis ausstehend)" mit Status ANGABE führen, Strecke Hall–Brenner–Hall lt. Routenplaner. Nachweis wäre: Honorarnoten/Rechnungen von Manuel Ultmar mit Leistungsdatum, Terminmails, Provisionsabrechnungen. Liste aller Brenner-Tage je Jahr ausgeben; Brenner-Tage an Wochenenden/Feiertagen (z. B. 23.07.2023 = Sonntag) gesondert kennzeichnen als Prüferfrage, nicht umdeuten. In die Prüfliste aufnehmen (Suchbegriffe: Ultmar, Brenner, Vertrieb, Datum ±2 Tage).
VORARLBERG (ANGABE Auftraggeber vom 01.10.2026): Fahrten Richtung Vorarlberg (Arlberg-Maut, Tankungen im Westen Tirols/Vorarlberg) sind Fahrten zur ZWEIGNIEDERLASSUNG der Firma in LOCHAU zu PROJEKTBESPRECHUNGEN. Als "betrieblich – Projektbesprechung Zweigniederlassung Lochau (ANGABE, Nachweis ausstehend)" mit Status ANGABE führen, Strecke Hall–Lochau–Hall lt. Routenplaner. Für jede dieser Fahrten per km-Anker prüfen, ob Lochau rechnerisch erreichbar war; wo die km-Anker Lochau ausschließen oder kaum zulassen, das als WIDERSPRUCH ausweisen (nicht umdeuten). Nachweis: Firmenbuchauszug Zweigniederlassung, Besprechungsprotokolle/Einladungen.
TIROL-TAGE (ANGABE Auftraggeber vom 01.10.2026): Der Auftraggeber meint, die Tirol-Tage mit Transaktionen (2023: 43 Tage u. a.) "müssen Tirol-Kunden sein". Das ist eine Vermutung ohne Kunden-/Datumsbezug und widerspricht der früheren Angabe "Tirol-Kunden ca. einmal pro Jahr"; zudem ist Tirol Wohnort, eine Tankung dort belegt keinen Kundenbesuch. Daher: diese Tage NICHT pauschal als betrieblich werten. Stattdessen je Tirol-Tag eine Prüflisten-Zeile mit leeren Feldern "Kunde / Ort / Zweck / Beleg" zum Ausfüllen durch den Auftraggeber anlegen; Status OFFEN bis zur Ausfüllung. In Szenario B zusätzlich ausweisen: wie viele km die Tirol-Abschnitte (außerhalb der Wochenfahrten Ostermiething) insgesamt ausmachen, damit sichtbar ist, welches Gewicht diese Frage für die 6.000-km-Grenze hat.
MENSCHLICHES BEWEGUNGSPROFIL (Plausibilitätsfilter, Auftrag vom 01.10.2026): Prüfe die gesamte Zeitleiste darauf, ob sie von EINEM Menschen realistisch gefahren werden konnte. (a) Zwischen je zwei Ankern mit Uhrzeit: Routen-km ÷ verfügbare Zeit = erforderliche Durchschnittsgeschwindigkeit; > 100 km/h Schnitt auf Autobahnmix = WIDERSPRUCH, 80–100 = knapp. (b) Tageslenkzeit: Summe der für einen Tag nötigen Fahrzeit (Anker + Modellfahrten); > 10 h = unplausibel, > 8 h = knapp; nächtliche Fahrten (22–5 Uhr) markieren. (c) Ruhezeiten: zwischen Ende eines Fahrtages und nächstem Start mind. ~9–11 h plausibel. (d) Arbeitsrhythmus: Dienstreisen/Besprechungen/Meetings nur Mo–Fr, nicht an österreichischen gesetzlichen Feiertagen (Tirol inkl. 19.03. Josef nur als Hinweis) – Modellfahrten an Wochenenden/Feiertagen nur, wenn ein Beleg sie stützt, sonst als WIDERSPRUCH zur Angabe ausweisen. (e) Hall–Ostermiething–Hall = ca. 2 h je Richtung + Besprechungsdauer: Modell-Dienstreise nur in Wochen mit einem Werktag, an dem die Tankanker (Ort/Uhrzeit) das zeitlich zulassen; den konkret möglichen Tag bzw. das Tagesfenster angeben. (f) Tageszeitmuster der Tankungen (früh in Hall = Abfahrt, abends = Rückkehr) als Indiz für Abfahrts-/Rückkehrtage nutzen, klar als ABGELEITET. (g) Gleichzeitigkeit: keine Person an zwei Orten zur selben Zeit (Tankungen an weit entfernten Orten in zu kurzer Zeit = Hinweis auf Fremdnutzung der Karte/des Fahrzeugs → WIDERSPRUCH, Prüferfrage). WICHTIG: Das Bewegungsprofil dient ausschließlich dazu, unmögliche oder unplausible Hypothesen AUSZUSCHLIESSEN und Widersprüche aufzudecken – es darf NICHT verwendet werden, um erfundene Fahrten realistischer erscheinen zu lassen oder Lücken aufzufüllen. Ergebnis: eigene Tabelle "Bewegungsprofil-Prüfung" (Datum, Anker, nötige km/h, Tageslenkzeit, Ergebnis) und Anpassung von Wochentest/Modellfahrten (ausgeschlossene Modellfahrten mit Grund auflisten).
RÜCKFAHRT-REGEL (Auftrag vom 01.10.2026): Jede Fahrt von Hall weg endet wieder in Hall – "wenn er wo hin fährt, dann auch wieder retour". Jede Modell-/Angabe-Fahrt daher als Hin- UND Rückfahrt rechnen (eigene Zeile für die Rückfahrt im Fahrtenbuch), außer die km-/Ortsanker zeigen eine Weiterfahrt zu einem weiteren Ziel (Rundreise) oder eine belegte Übernachtung (z. B. Aufwandsabrechnungen Frankfurt 08./09.04.2025, Wien 10./11.07.2025). Die Summe aus Hin- und Rückfahrten muss in die km-Kette passen; wo die Rückfahrt km-mäßig nicht mehr hineinpasst, ist die Hypothese auszuschließen.
KUNDENLISTE (INDIZ, Datei Kunden_Masterliste, Verantwortlich "IK" = Ivan Kovacevic): Ivan betreut 960 Kunden, davon u. a. Tirol 125, Vorarlberg 98, Bayern 310, Baden-Württemberg 180 – das ist ein INDIZ für eine Außendienst-/Gebietsrolle West (stützt die Dienstort-Angabe, belegt sie aber nicht). Die Liste enthält KEINE Besuchsdaten für 2023–2025. Ortsliste der IK-Kunden (PLZ/Ort/Bundesland/Anzahl) liegt unter C:/Users/SALEADMIN/Desktop/Datenrekonstruktion/.workflow/kundenorte_IK.json (mit Read lesen). Verwendung NUR so: Bei Tankankern/Abschnitten außerhalb Hall prüfen, ob IK-Kundenorte in der Nähe bzw. auf der Strecke liegen, und diese als "mögliche Kundenorte (INDIZ, Liste ohne Besuchsdatum)" in die Prüfliste schreiben. Eine Fahrt wird dadurch NICHT betrieblich; Status bleibt OFFEN/MODELL bis Bestätigung durch den Auftraggeber mit Beleg.
WKO-FAHRTENBUCH-MUSTER (Datei C:/Users/SALEADMIN/Desktop/Datenrekonstruktion/fahrtenbuch-muster.docx, WKO-Infoblatt Stand 01/2026): Die Rekonstruktion ist zusätzlich in genau diesem Spaltenformat auszugeben: Datum | Zeit der Abfahrt | Zeit der Ankunft | Reiseweg (von – über – nach) | Zweck der Fahrt | km-Stand bei Abfahrt | km-Stand bei Ankunft | gefahrene km betrieblich | gefahrene km privat – ergänzt um zwei Spalten "Status" und "Quelle", damit jede Zeile als BELEGT/ANGABE/MODELL/ABGELEITET/OFFEN erkennbar bleibt. Regeln: lückenlose km-Kette (km Ankunft = km Abfahrt der nächsten Zeile), ein Fahrzeug je Tabelle; Zeiten nur aus Tankbeleg-Uhrzeiten oder als ABGELEITET-Fenster, nie erfunden; km zwischen Ankern, die keiner Zweckangabe zugeordnet sind, als eigene Zeile "nicht zugeordnete Fahrten – Zweck OFFEN" mit diesen km in der Spalte PRIVAT (sachbezugsrechtlich bis zum Nachweis als privat zu werten). Das WKO-Infoblatt verlangt dokumentierte nachträgliche Änderungen – daher Kopfvermerk "Nachträglich rekonstruiert am 01.10.2026 nach Cyberangriff; Methodik und Quellen siehe Bericht".`

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
5. Je Monat: belegte Tankorte, Mindeststrecke (Routenplaner) zwischen aufeinanderfolgenden Ankern, gefahrene km (belegt oder Spanne), Anteil betrieblich BELEGT (nur wenn Zweck-Beleg existiert), Anteil Dienstreisen Hall–Ostermiething (MODELL, Szenario B), Anteil Brenner-Vertriebsfahrten (ANGABE), Rest.
6. Plausibilitätsauffälligkeiten (Tankorte fernab Wohnung/Firma, Wochenend-Tankungen, Doppeltankungen am selben Tag, Auslandstankungen usw.) neutral auflisten.
7. Liste der benötigten zusätzlichen Belege, um Fahrtzwecke zu belegen (Dienstvertrag Dienstort, Besprechungseinladungen/Protokolle, Honorarnoten M. Ultmar, Kundenaufträge/Montageprojekte, Kalender, Arbeitszeitaufzeichnungen, Urlaub/Krankenstand, Telematik vom Vermieter BR Mobility, GO-Maut/Vignette, Diäten-/Reisekostenabrechnungen).
8. MODELLREKONSTRUKTION (wie Tatort-Rekonstruktion): Leite aus den belegten Ankern (Ort, Datum, Uhrzeit, km, Liter) die mathematisch wahrscheinlichste Fahrtenfolge ab, insbesondere die wöchentlichen Dienstreisen Hall–Ostermiething–Hall gemäß Wochentest und die Brenner-Vertriebsfahrten, je Hypothese mit: Datum/KW, Von, Nach, km (Routenplaner), Wahrscheinlichkeit (hoch/mittel/niedrig) und Begründung (welche Anker sie stützen). Status jeder Modellfahrt = MODELL (violett) bzw. ANGABE bei Brenner – ausdrücklich "Hypothese, Bestätigung durch E-Mail/Kalender/Rechnung durch Auftraggeber ausstehend". Die Summe der Modell-km muss zur km-Kette bzw. Liter-Spanne passen (Rest = OFFEN). WICHTIG: Die 6.000-km-Grenze ist KEIN Eingabeparameter und darf die Modellbildung nicht steuern; das Privat-km-Ergebnis wird erst danach ausgerechnet und ehrlich ausgewiesen. Gib zusätzlich eine "Prüfliste für den Auftraggeber" aus: je Modellfahrt eine Zeile zum Abhaken (bestätigt / abweichend / privat) mit Suchbegriffen für den E-Mail-Abgleich (Ostermiething, Besprechung, Ultmar, Brenner, Kundenname, Datum ±2 Tage).
9. Vollständige Wochentabelle (alle KW) gemäß Wochentest.
10. Vollständiges Fahrtenbuch im WKO-Musterformat (siehe WKO-FAHRTENBUCH-MUSTER) je Fahrzeug, alle Zeilen, Szenario B, mit Hin- und Rückfahrt-Zeilen gemäß Rückfahrt-Regel; am Ende Summen betrieblich/privat je Monat und Jahr.
Gib einen vollständigen, strukturierten Bericht in Markdown zurück, inkl. vollständiger Tabelle aller Ereignisse (keine Zeilen weglassen), Wochentabelle und Monatsübersicht.`,
    { label: `Rekonstruktionsassistent ${y}`, phase: 'Rekonstruktion' }),
  (rek, y) => agent(`Du bist Steuerprüfer-Agent (Außenprüfung/GPLB, Österreich) für ${y}. Prüfe den folgenden Rekonstruktionsbericht ADVERSARIAL, wie ein kritischer Prüfer bei einer Lohnabgabenprüfung.
${RULES}
${KUNDEN}
Rechtslage (Recherche): ${legal}
Original-Transaktionen zur Gegenprüfung: ${JSON.stringify(yearTx(y))}

BERICHT:
${rek}

Prüfe: (a) Stimmen alle km-Stände/Liter mit den Transaktionsdaten überein? Stichprobe von mind. 5 Einträgen gegen die Original-PDFs (${PDF_HOWTO}). (b) Wurde irgendetwas erfunden, geglättet oder ohne Quelle als betrieblich ausgewiesen? Sind Modellfahrten klar als Hypothese markiert? (c) Wochentest und Verbrauchsabgleich rechnerisch korrekt? (d) Welche Fragen würde ein Prüfer stellen (Dienstort Tirol, wöchentliche Dienstreisen ohne Reisekosten/Diäten, fehlende Tankungen bei Ostermiething, Brenner-Meetings mit freiem Mitarbeiter inkl. Wochenendterminen, Wochenenden, Urlaube, Auslandsfahrten)? (e) Würde das Dokument als Nachweis anerkannt? Was fehlt dafür?
Gib zurück: 1) Liste konkreter Korrekturen (mit Fundstelle), 2) Prüferfragen-Katalog, 3) Gesamturteil zur Beweiskraft je Szenario A/B. Markdown.`,
    { label: `Steuerprüfer ${y}`, phase: 'Steuerpruefung' })
    .then(pruef => ({ jahr: y, rekonstruktion: rek, pruefung: pruef })),
)

// ---------- Phase 5: Finanzamt-Beurteilung über alle Jahre ----------
phase('Finanzamt')
const fa = await agent(`Du bist Finanzamt-Agent (Fachbereich Lohnsteuer/Sachbezüge). Beurteile auf Basis der Rekonstruktionen und Prüferberichte aller Jahre, ob der halbe Sachbezug für Ivan Kovacevic für 2023, 2024, 2025 (und Ausblick 1-9/2026, für das keine Belege vorliegen) nachweisbar ist – getrennt für Szenario A (Dienstort Ostermiething) und Szenario B (Dienstort Tirol, wöchentliche Dienstreisen nach Ostermiething lt. Angabe, Brenner-Vertriebsmeetings lt. Angabe).
${RULES}
${KUNDEN}
Rechtslage: ${legal}
Routen: ${routes}
${perYear.filter(Boolean).map(p => `=== ${p.jahr} REKONSTRUKTION ===\n${p.rekonstruktion}\n=== ${p.jahr} PRÜFUNG ===\n${p.pruefung}`).join('\n\n')}

Liefere: je Jahr gefahrene km (belegt/Spanne), in Szenario B die Zahl wochenweise vereinbarer Dienstreisen, Brenner-km, betriebliche Modell-/Angabe-km, verbleibende Privat-km und Abstand zur 6.000-km-Grenze; Ergebnis je Szenario "halber Sachbezug belegbar / nicht belegbar / nur mit weiteren Belegen"; welche Belege Szenario B tragen würden; klare Empfehlung (inkl. Abstimmung mit Steuerberatung und offenlegende Darstellung gegenüber dem Prüfer). Kein Ergebnis vortäuschen, das die Daten nicht tragen. Markdown, max. ~1.800 Wörter.`,
  { label: 'Finanzamt-Agent', phase: 'Finanzamt' })

// ---------- Phase 6: HTML ----------
phase('HTML')
const STYLE = KUNDEN + `
HTML-VORGABEN: Eine eigenständige .html-Datei (UTF-8, alles inline, keine externen Ressourcen), druckfreundlich (A4 quer, @media print), schlichtes seriöses Layout, Systemschrift. Ganz oben ein deutlich sichtbares Banner: "DATENREKONSTRUKTION nach Cyberangriff – kein Original-Fahrtenbuch. Erstellt am 01.10.2026 auf Basis von Tankkarten-, Miet- und Buchungsbelegen." Zusätzlich dezentes diagonales Wasserzeichen "REKONSTRUKTION" (CSS, auch im Druck). Statusspalte mit farbcodierten Badges: BELEGT (grün), ANGABE (blau), MODELL (violett, Hypothese), ABGELEITET (gelb), OFFEN (grau), WIDERSPRUCH (rot) – plus Text, nicht nur Farbe. Jede Zeile mit Quellenangabe (Datei + Seite). Abschnitte: 1 Stammdaten & Fahrzeuge (inkl. Dienstort-Angabe), 2 Methodik & Integritätsregeln, 3 Ereignisprotokoll (vollständige Tabelle), 4 km-Kette & Verbrauchsabgleich, 5 Wochentest Dienstreisen Hall–Ostermiething–Hall (vollständige KW-Tabelle), 6 Brenner-Vertriebsfahrten (M. Ultmar), 7 Monatsübersicht, 8 Auffälligkeiten, 9 Ergebnis Steuerprüfer-Agent, 10 Beurteilung Sachbezug Szenario A und B (Finanzamt-Agent, Auszug für dieses Jahr), 11 Modellrekonstruktion (Hypothesen) + Prüfliste für E-Mail-Abgleich zum Abhaken, 12 Bewegungsprofil-Prüfung (menschliche Fahrbarkeit, ausgeschlossene Hypothesen), 12a FAHRTENBUCH IM WKO-MUSTERFORMAT (vollständige Tabelle je Fahrzeug, Spalten wie WKO-Muster + Status + Quelle, Kopfzeile mit Name des Arbeitnehmers, Marke/Type, Pol. Kennz.; Monats- und Jahressummen), 13 Fehlende Belege / nächste Schritte, 14 Erklärung zur Erstellung (Unterschriftsfelder Fahrer und Geschäftsführung, Datum). Korrekturen des Steuerprüfers MÜSSEN eingearbeitet sein. Keine Zeilen weglassen, nichts hinzuerfinden.`

await parallel([
  ...perYear.filter(Boolean).map(p => () => agent(`Du bist HTML-Redakteur. Schreibe mit dem Write-Tool die Datei ${OUT}/Fahrtenbuch_Rekonstruktion_${p.jahr}_Kovacevic.html (eine vorhandene Datei dort ist eine Vorversion und wird vollständig ersetzt; lies sie vorher mit Read, damit Write erlaubt ist).
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
  ...perYear.filter(Boolean).map(p => () => agent(`Du bist Dokument-Redakteur (WKO-Fahrtenbuch DOCX). Erzeuge mit Python (python-docx ist installiert; Bash-Tool) aus der Vorlage C:/Users/SALEADMIN/Desktop/Datenrekonstruktion/fahrtenbuch-muster.docx die Datei ${OUT}/WKO_Fahrtenbuch_Rekonstruktion_${p.jahr}_Kovacevic.docx. Vorgehen: Vorlage kopieren (Original NICHT verändern); Tabelle 0 (Kopf) ausfüllen: Name des Arbeitnehmers "Ivan Kovacevic", Marke/Type und Pol. Kennz. je Fahrzeug; Tabelle 1: die Zeilen des WKO-Fahrtenbuchs aus dem Bericht unten übernehmen (Zeilen anhängen, Format der Vorlagenzeilen beibehalten), bei mehreren Fahrzeugen je Fahrzeug einen eigenen Tabellenblock mit Kopf. Spalte "Zweck der Fahrt" um den Status in eckigen Klammern ergänzen, z. B. "[MODELL] Dienstbesprechung Ostermiething" bzw. "[OFFEN] nicht zugeordnete Fahrten", und Quelle kurz anhängen. Vor der Tabelle einen fett gedruckten Absatz einfügen: "DATENREKONSTRUKTION nach Cyberangriff – nachträglich rekonstruiert am 01.10.2026, kein Original-Fahrtenbuch. Status: BELEGT/ANGABE/MODELL(Hypothese)/ABGELEITET/OFFEN. Methodik und Quellen: Fahrtenbuch_Rekonstruktion_${p.jahr}_Kovacevic.html". Kopf-/Fußzeile mit "REKONSTRUKTION" versehen. Am Ende Summenzeilen betrieblich/privat. Keine Zeile erfinden oder weglassen; Zahlen exakt aus dem Bericht.
${RULES}
${KUNDEN}
=== REKONSTRUKTION ${p.jahr} ===
${p.rekonstruktion}
=== STEUERPRÜFER-KORREKTUREN ${p.jahr} (einarbeiten) ===
${p.pruefung}
Gib den Dateipfad und die Zeilenanzahl zurück.`,
    { label: `WKO-DOCX ${p.jahr}`, phase: 'HTML' })),
  () => agent(`Du bist HTML-Redakteur. Schreibe mit dem Write-Tool die Übersichtsdatei ${OUT}/index.html (eine vorhandene Datei ist Vorversion und wird ersetzt; vorher mit Read lesen). Gleiche Gestaltung: Banner "DATENREKONSTRUKTION nach Cyberangriff – kein Original-Fahrtenbuch", Wasserzeichen, inline CSS, druckfreundlich.
${RULES}
${KUNDEN}
Inhalt: Zweck & Anlass (Cyberangriff), Fahrer/Fahrzeuge/Zeiträume, Dienstort-Angabe, Links auf Fahrtenbuch_Rekonstruktion_2023_Kovacevic.html, _2024_, _2025_, Jahresübersicht km (belegt/Spanne), Wochentest-Zusammenfassung je Jahr, Brenner-Vertriebsfahrten je Jahr, Gesamtergebnis Sachbezug je Szenario A/B, Hinweis dass für 01.01.–01.10.2026 keine Belege vorlagen, Routen-Referenztabelle, Methodik, Rechtsgrundlagen mit Links. Link auf Vorversion im Ordner _Version1_DienstortOstermiething/.
=== FINANZAMT ===
${fa}
=== ROUTEN ===
${routes}
=== RECHT ===
${legal}
Gib nur den Dateipfad zurück.`, { label: 'HTML Übersicht', phase: 'HTML' }),
])

return { transaktionen: allTx.length, mitKm: allTx.filter(t => t.km_stand).length, failed, finanzamt: fa, pruefer: perYear.filter(Boolean).map(p => ({ jahr: p.jahr, pruefung: p.pruefung })) }
