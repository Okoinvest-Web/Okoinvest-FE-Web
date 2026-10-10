// src/lib/eg-angebot/wechselCheck.js – Wechsel-Check für bestehende Energiegemeinschaften in Österreich
// (Welle 3, Paket B7; Masterplan Abschnitt 5 „ElWG-Wechsel-Check“).
//
// Beantwortet zwei getrennte Fragen ehrlich:
//   1. Ist ein Wechsel des Software- bzw. Betriebsanbieters SINNVOLL? (aus den genannten Schmerzpunkten;
//      wer zufrieden ist, bekommt „eher nicht“ – kein Druck, keine Dringlichkeit ohne Anlass)
//   2. Ist er MÖGLICH, und was ist vorher zu klären? (Vertrag, EDA-Zugang, Vorhaben)
// Dazu Hinweise, die für ALLE Anbieter gelten (Netzbetreiber-Einschränkung bis voraussichtlich April 2027,
// Modellwechsel mit Neuanmeldung) – Wortlaut aus dem Faktenregister (src/lib/fakten/daten/eg-at.js),
// die Seite setzt ihn ein. Keine Fremdmarken, keine Preise, keine Zahlen ohne Quelle.
// Reine Funktion, liefert nur Codes; Texte (DE/EN) stehen in der Komponente.

export const FRAGEN = Object.freeze({
  modell: Object.freeze(["eeg_lokal", "eeg_regional", "beg", "gea", "unbekannt"]),
  zaehlpunkte: Object.freeze(["bis20", "bis100", "bis500", "ueber500"]),
  verwaltung: Object.freeze(["tabellen", "software_selbst", "dienstleister"]),
  probleme: Object.freeze(["aufwand", "abrechnung", "elwg", "zustimmungen", "datenluecken", "support", "kosten"]),
  vertrag: Object.freeze(["kurzfristig", "laufzeit", "unbekannt", "keiner"]),
  eda: Object.freeze(["gemeinschaft", "anbieter", "unbekannt"]),
  vorhaben: Object.freeze(["netzgebiet", "modellwechsel", "mehrfach", "wachsen"]),
});

/** Gewicht je Schmerzpunkt für die Frage „sinnvoll?“ (Begründung je Code in der Komponente). */
export const GEWICHT = Object.freeze({
  aufwand: 2, // Ehrenamt überlastet – Betriebsführung entlastet direkt
  abrechnung: 2, // Fehler/Verzug bei Rechnungen – Kern der Plattform
  elwg: 2, // Verträge noch nicht an das ElWG angepasst – Anpassungspaket
  zustimmungen: 1, // gescheiterte Zustimmungen im Netzbetreiber-Portal – geführte Zustimmung hilft, ersetzt sie aber nicht
  datenluecken: 1, // Datenlücken entstehen oft beim Netzbetreiber – ein Wechsel hilft nur beim Erkennen und Nachfordern
  support: 1,
  kosten: 1, // Preis allein ist selten ein guter Wechselgrund
});

export const STANDARD = Object.freeze({
  modell: "unbekannt",
  zaehlpunkte: "bis100",
  verwaltung: "software_selbst",
  probleme: Object.freeze([]),
  vertrag: "unbekannt",
  eda: "unbekannt",
  vorhaben: Object.freeze([]),
});

const eins = (wert, liste, standard) => (liste.includes(wert) ? wert : standard);
const mehrere = (werte, liste) => (Array.isArray(werte) ? [...new Set(werte.filter((w) => liste.includes(w)))] : []);

/** Eingaben bereinigen (unbekannte Werte → Standard; Mehrfachauswahl ohne Dubletten). */
export function normalisieren(e = {}) {
  return {
    modell: eins(e.modell, FRAGEN.modell, STANDARD.modell),
    zaehlpunkte: eins(e.zaehlpunkte, FRAGEN.zaehlpunkte, STANDARD.zaehlpunkte),
    verwaltung: eins(e.verwaltung, FRAGEN.verwaltung, STANDARD.verwaltung),
    probleme: mehrere(e.probleme, FRAGEN.probleme),
    vertrag: eins(e.vertrag, FRAGEN.vertrag, STANDARD.vertrag),
    eda: eins(e.eda, FRAGEN.eda, STANDARD.eda),
    vorhaben: mehrere(e.vorhaben, FRAGEN.vorhaben),
  };
}

/**
 * Wechsel-Check.
 * @returns {{
 *   eingaben: object,
 *   sinnvoll: { stufe: "hoch"|"mittel"|"gering", punkte: number, gruende: string[] },
 *   moeglich: { stufe: "jetzt"|"vorbereiten", schritte: string[] },
 *   hinweise: string[],      // gelten für alle Anbieter (Netzbetreiber, Modellwechsel …)
 *   ablauf: string[],        // empfohlene Reihenfolge
 *   anliegen: "wechsel"|"betrieb"
 * }}
 */
export function wechselCheck(roh) {
  const e = normalisieren(roh);

  // 1. Sinnvoll?
  const gruende = [...e.probleme].sort((a, b) => GEWICHT[b] - GEWICHT[a] || FRAGEN.probleme.indexOf(a) - FRAGEN.probleme.indexOf(b));
  let punkte = e.probleme.reduce((s, p) => s + GEWICHT[p], 0);
  // Mit Tabellen und vielen Zählpunkten wird Selbstverwaltung zur Daueraufgabe
  if (e.verwaltung === "tabellen" && e.zaehlpunkte !== "bis20") {
    punkte += 2;
    gruende.push("tabellen_gross");
  }
  // Wachstum oder Mehrfachteilnahme verlangen mehr Verwaltung
  if (e.vorhaben.includes("wachsen") || e.vorhaben.includes("mehrfach")) {
    punkte += 1;
    gruende.push("wachstum");
  }
  const stufe = punkte >= 4 ? "hoch" : punkte >= 2 ? "mittel" : "gering";
  if (!e.probleme.length && stufe === "gering") gruende.push("zufrieden");
  if (e.probleme.length === 1 && e.probleme[0] === "kosten") gruende.push("nur_kosten");

  // 2. Möglich – was ist vorher zu klären?
  const schritte = [];
  if (e.vertrag === "laufzeit") schritte.push("vertrag_laufzeit");
  if (e.vertrag === "unbekannt") schritte.push("vertrag_pruefen");
  if (e.eda === "anbieter") schritte.push("eda_anbieter");
  if (e.eda === "unbekannt") schritte.push("eda_klaeren");
  if (e.modell === "unbekannt") schritte.push("modell_klaeren");
  const moeglich = { stufe: schritte.length ? "vorbereiten" : "jetzt", schritte };

  // 3. Hinweise, die für alle Anbieter gelten
  const hinweise = [];
  if (e.vorhaben.includes("modellwechsel")) hinweise.push("modellwechsel");
  else hinweise.push("ohne_neuanmeldung");
  if (e.vorhaben.includes("netzgebiet")) hinweise.push("netzgebiet");
  if (e.probleme.includes("elwg")) hinweise.push("elwg_vertraege");
  if (e.probleme.includes("datenluecken")) hinweise.push("datenluecken_netzbetreiber");
  if (e.modell === "gea") hinweise.push("gea");

  // 4. Ablauf: Vertrag/EDA klären → Mandat → Daten → Parallellauf → Stichtag; Modellwechsel getrennt danach
  const ablauf = ["mandat", "eda_zugang", "daten", "parallellauf", "stichtag"];
  if (e.vorhaben.includes("modellwechsel")) ablauf.push("modellwechsel_danach");

  // Anliegen für die Anfrage (gleiche ids wie im Formular der Software-Seite)
  const anliegen = e.probleme.includes("aufwand") || e.verwaltung === "tabellen" ? "betrieb" : "wechsel";

  return { eingaben: e, sinnvoll: { stufe, punkte, gruende }, moeglich, hinweise, ablauf, anliegen };
}
