// src/lib/fakten/daten/gebaeudestrom.js
//
// Gebäudestrom (Welle 4, Paket GEBAEUDE): Rechtsrahmen je Land und die wenigen eigenen
// Rechenannahmen des Gebäudestrom-Rechners. Vertrag: ../schema.js. Eingebunden in ../index.js;
// NUR über src/lib/fakten/index.js importieren (Ausnahme: Tests in diesem Ordner).
// Genutzt von src/lib/rechner/gebaeudestrom.js und den Seiten /gebaeudestrom, /rechner/gebaeudestrom.
//
// WICHTIG (ehrlich): Alle Einträge stehen auf status "zu_pruefen", bis die zweite Prüfperson (E6)
// sie am Original geprüft hat. Der Rechner nutzt KEINE Geldwerte aus diesem Modul – er rechnet nur
// Energiemengen (kWh, Anteile). Höhe des Mieterstromzuschlags (§ 23b EEG), Netzentgelt-Folgen der
// GGV, GEA-Tarife und ZEV-Tarife werden bewusst NICHT beziffert (Inhaberpunkt / Fachprüfung E6).
//
// Technische Annahmen (Dachfläche je kWp, Ertragsfaktoren, Regionserträge, Gleichzeitigkeit,
// Speicher-Aufschlag) kommen aus den bestehenden, bereits dokumentierten Quellen:
// dach.dacharten (de.js), REGIONEN.ertrag (markt.js), MIXE/SPEICHER_PLUS (energySharing.js).

const ABRUF = "2026-10-11";
const PRUEFER = "Paket GEBAEUDE (Welle 4) · am Original zu prüfen · Zweitprüfung TODO-E6";

const Q = {
  eeg21: { titel: "EEG 2023, § 21 Abs. 3 (Anspruch auf den Mieterstromzuschlag)", url: "https://www.gesetze-im-internet.de/eeg_2014/__21.html" },
  enwg42b: { titel: "EnWG, § 42b Gemeinschaftliche Gebäudeversorgung", url: "https://www.gesetze-im-internet.de/enwg_2005/__42b.html" },
  elwog16a: { titel: "ElWOG 2010, § 16a Gemeinschaftliche Erzeugungsanlagen (RIS)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20007045" },
  engZev: { titel: "Energiegesetz (EnG, SR 730.0), Art. 17–18 Zusammenschluss zum Eigenverbrauch", url: "https://www.fedlex.admin.ch/eli/cc/2017/762/de" },
  eigen: { titel: "Eigene Einschätzung ÖkoInvest (Gebäudestrom-Rechner)", url: null, art: "eigen" },
};

/** Rechtsrahmen als Textfakt (Klasse A): beschreibt das Modell, beziffert nichts. */
const recht = (id, land, wert, quelle, notiz) => ({
  id,
  wert,
  einheit: "Text",
  land,
  quelle,
  abruf: ABRUF,
  gueltigAb: null,
  gueltigBis: null,
  status: "zu_pruefen",
  pruefer: PRUEFER,
  klasse: "A",
  notiz,
});

const eigen = (id, wert, einheit, notiz) => ({
  id,
  wert,
  einheit,
  land: "DACH",
  quelle: Q.eigen,
  abruf: ABRUF,
  gueltigAb: null,
  gueltigBis: null,
  status: "zu_pruefen",
  pruefer: PRUEFER,
  klasse: "C",
  notiz,
});

const MODUL = [
  /* Rechtsrahmen je Land – nur Modellbeschreibung, keine Beträge */
  recht(
    "recht.gebaeudestrom.mieterstrom",
    "DE",
    "Mieterstrom: Der Betreiber einer Solaranlage auf, an oder in einem Wohngebäude liefert Strom an Letztverbraucher innerhalb des Gebäudes bzw. Quartiers ohne Durchleitung durch das Netz der allgemeinen Versorgung und hat Anspruch auf den Mieterstromzuschlag (§ 21 Abs. 3 EEG 2023). Der Betreiber wird Stromlieferant mit den zugehörigen Pflichten; Reststrom liefert ein Versorger.",
    Q.eeg21,
    "Höhe des Zuschlags (§ 23b EEG) bewusst nicht beziffert – erst nach Prüfung am Original (E6) ergänzen."
  ),
  recht(
    "recht.gebaeudestrom.ggv",
    "DE",
    "Gemeinschaftliche Gebäudeversorgung: Betreiber und Teilnehmende verteilen den Strom aus einer Gebäudeanlage nach einem vereinbarten Aufteilungsschlüssel untereinander (§ 42b EnWG). Der Betreiber wird dabei nicht Stromlieferant im Sinne des EnWG; jeder Teilnehmende behält seinen eigenen Stromliefervertrag für den Reststrom.",
    Q.enwg42b,
    "Mess- und Abwicklungsdetails (Viertelstundenwerte, Pflichten des Messstellenbetreibers) vor Veröffentlichung von E6 prüfen."
  ),
  recht(
    "recht.gebaeudestrom.gea",
    "AT",
    "Gemeinschaftliche Erzeugungsanlage (GEA): Mehrere Teilnehmende an einem gemeinsamen Netzanschlusspunkt – typisch ein Mehrparteienhaus – betreiben gemeinsam eine Erzeugungsanlage und teilen den Strom nach einem vereinbarten Schlüssel (§ 16a ElWOG 2010). Die Teilnahme ist freiwillig; jeder Teilnehmende behält seinen Lieferanten für den Reststrom.",
    Q.elwog16a,
    "Zählpunkt- und Messdetails (Smart Meter, Viertelstundenwerte) vor Veröffentlichung von E6 prüfen."
  ),
  recht(
    "recht.gebaeudestrom.zev",
    "CH",
    "Zusammenschluss zum Eigenverbrauch (ZEV): Grundeigentümer und Mieter oder Pächter am Ort der Produktion verbrauchen den Solarstrom gemeinsam und treten gegenüber dem Netzbetreiber als ein Endverbraucher auf (Art. 17–18 EnG). Beim virtuellen ZEV (vZEV) übernimmt der Verteilnetzbetreiber die Messung über bestehende Zähler, ohne eigene Messinfrastruktur des Zusammenschlusses.",
    Q.engZev,
    "Details zum vZEV (Rechtsgrundlage der Verordnung, Inkrafttreten, Bedingungen des Netzbetreibers) vor Veröffentlichung von E6 am Original prüfen."
  ),

  /* Eigene Rechenannahmen des Rechners (Klasse C, konservativ, keine Geldwerte) */
  eigen(
    "gebaeudestrom.verbrauchWohneinheit",
    { min: 1500, standard: 2500, max: 5000 },
    "kWh/a",
    "Jahresstromverbrauch je Wohneinheit im Mehrparteienhaus (ohne elektrische Warmwasserbereitung/Heizung); Startwert bewusst unter dem Einfamilienhaus-Durchschnitt (ALLGEMEIN.haushaltKwh = 3.500 kWh) angesetzt."
  ),
  eigen(
    "gebaeudestrom.verbrauchGewerbeeinheit",
    { min: 3000, standard: 10000, max: 50000 },
    "kWh/a",
    "Jahresstromverbrauch je Gewerbeeinheit im Gebäude (Laden, Büro, Praxis); grobe, konservative Spanne – im Rechner frei einstellbar."
  ),
  eigen(
    "gebaeudestrom.teilnahme",
    { min: 0.3, standard: 0.7, max: 1 },
    "Anteil",
    "Anteil der Einheiten, die am Gebäudestrom teilnehmen. Konservativer Startwert 70 % – die Teilnahme ist in allen vier Modellen (Mieterstrom, GGV, GEA, ZEV) freiwillig."
  ),
];

export default MODUL;
