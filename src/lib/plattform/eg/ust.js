// src/lib/plattform/eg/ust.js
//
// Steuer-Engine der Energiegemeinschaften (WP4) – Entscheidungstabelle nach Fachkonzept 4.5 mit Prüfpfad je Belegzeile.
// Reine Funktionen (client- und serverseitig, Node-Tests ohne Server). Python-Spiegel: plattform/eg_abrechnung_kern.py
// (ust_fall, ku_monitor). Gemeinsame Testvektoren: eg/testdaten/abrechnung/ust_faelle.json (Tabellentests).
//
// Quellen: UStG 1994 §§ 6 Abs. 1 Z 27 (Kleinunternehmer, ab 2025 55.000 € brutto, Toleranz 10 %), 11 (Rechnung, Abs. 7
// Gutschrift), 19 Abs. 1c (Übergang der Steuerschuld bei Strom an Wiederverkäufer), 22 (pauschalierte Land- und
// Forstwirte, 13 %); EEG-Ratgeber Steuern und Abgaben (Koordinationsstelle, 2024); BMF-Anfragebeantwortung 03.11.2023;
// USP „Kleinunternehmerregelung ab 2025“. Keine Steuerberatung – die Fallregeln vor dem Livegang von einer
// Steuerberatung freigeben lassen (Fachkonzept 9 Punkt 9). Unsicheres ist mit „(zu bestätigen)“ markiert.

import { rund2 } from "../mitglied/basis.js";

/** Ordnung nach Codepunkten (gleiches Ergebnis in JS und Python) */
const vgl = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const UST_STAND = "2026-10-01";
export const UST_QUELLEN = {
  ku: "§ 6 Abs. 1 Z 27 UStG 1994 (Kleinunternehmer, ab 01.01.2025)",
  normal: "§ 10 Abs. 1 UStG 1994 (Normalsteuersatz 20 %)",
  rc: "§ 19 Abs. 1c UStG 1994 (Strom an Wiederverkäufer); BMF-Anfragebeantwortung 03.11.2023",
  lw: "§ 22 UStG 1994 (Durchschnittssatz 13 %); EEG-Ratgeber Steuern 2024",
  gutschrift: "§ 11 Abs. 7 und 8 UStG 1994 (Gutschrift als Rechnung)",
  nichtSteuerbar: "§§ 1, 2 UStG 1994 (keine unternehmerische Tätigkeit)",
  beitrag: "VereinsR 2001 Rz 339 ff.; EEG-Ratgeber Steuern 2024 (echter/unechter Mitgliedsbeitrag)",
};
export const UST_URL = "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10004873";

/** Regeln (Ergebnis der Entscheidungstabelle). `art`: ust | befreit | rc | nicht_steuerbar */
export const UST_REGELN = {
  EG_KU: { label: "Gemeinschaft Kleinunternehmer", satz: 0, art: "befreit", hinweis: "Umsatzsteuerbefreit – Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG.", quelle: UST_QUELLEN.ku },
  EG_REGEL: { label: "Gemeinschaft regelbesteuert", satz: 20, art: "ust", hinweis: "", quelle: UST_QUELLEN.normal },
  ERZ_NICHT_UNTERNEHMERISCH: { label: "Erzeuger nicht unternehmerisch", satz: 0, art: "nicht_steuerbar", hinweis: "Unentgeltliche Einbringung durch eine Nichtunternehmerin bzw. einen Nichtunternehmer – umsatzsteuerlich nicht relevant.", quelle: UST_QUELLEN.nichtSteuerbar },
  ERZ_KU: { label: "Erzeuger Kleinunternehmer", satz: 0, art: "befreit", hinweis: "Umsatzsteuerbefreit – Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG (Gutschrift gem. § 11 Abs. 7 UStG).", quelle: `${UST_QUELLEN.ku}; ${UST_QUELLEN.gutschrift}` },
  ERZ_LW: { label: "Erzeuger pauschalierter Landwirt", satz: 13, art: "ust", hinweis: "Durchschnittssteuersatz für pauschalierte Land- und Forstwirte gem. § 22 UStG (13 %) – Gutschrift gem. § 11 Abs. 7 UStG. Zuordnung der Stromlieferung zum land- und forstwirtschaftlichen Betrieb (zu bestätigen).", quelle: `${UST_QUELLEN.lw}; ${UST_QUELLEN.gutschrift}` },
  ERZ_RC: { label: "Erzeuger regelbesteuert – Reverse Charge", satz: 0, art: "rc", rcSatz: 20, hinweis: "Übergang der Steuerschuld auf den Leistungsempfänger gem. § 19 Abs. 1c UStG (Gutschrift gem. § 11 Abs. 7 UStG).", quelle: `${UST_QUELLEN.rc}; ${UST_QUELLEN.gutschrift}` },
  BEITRAG_ECHT: { label: "Echter Mitgliedsbeitrag", satz: 0, art: "nicht_steuerbar", hinweis: "Echter Mitgliedsbeitrag – nicht steuerbar (zu bestätigen).", quelle: UST_QUELLEN.beitrag },
};

/** Positionsarten, die die Gemeinschaft an Mitglieder verrechnet (Ausgangsumsatz) */
export const AUSGANG_ARTEN = ["bezug", "grundgebuehr", "zp_gebuehr", "beitrittsgebuehr", "mitgliedsbeitrag", "rabatt"];
export const MITGLIEDSBEITRAG_ARTEN = { unecht: "unecht (Leistungsaustausch, USt wie die Lieferung)", echt: "echt (nicht steuerbar)" };

const schritt = (frage, antwort, quelle = "") => ({ frage, antwort, quelle });

/**
 * USt-Fall einer Belegzeile bestimmen (Entscheidungstabelle Fachkonzept 4.5).
 * @param {{art:string, gemeinschaft:{ustStatus?:string, uid?:string}, mitglied:{steuerstatusErzeuger?:string, uid?:string}, mitgliedsbeitragArt?:string}} e
 * @returns {{regel:string, label:string, satz:number, art:string, rcSatz:number, hinweis:string, quelle:string, steuerschuldEg:boolean, vorsteuerEg:boolean, pruefpfad:object[], fehler:string[], warnungen:string[]}}
 */
export function ustFall({ art = "bezug", gemeinschaft = {}, mitglied = {}, mitgliedsbeitragArt = "unecht" } = {}) {
  const egRegel = gemeinschaft.ustStatus === "regelbesteuert";
  const pfad = [];
  const fehler = [];
  const warnungen = [];
  let regel;
  pfad.push(schritt("Umsatzsteuerstatus der Gemeinschaft", egRegel ? "regelbesteuert (Option U 12)" : "Kleinunternehmer", egRegel ? UST_QUELLEN.normal : UST_QUELLEN.ku));
  if (art === "einspeisung") {
    const st = mitglied.steuerstatusErzeuger || "kleinunternehmer";
    pfad.push(schritt("Steuerstatus des Erzeugers", st, "Fachkonzept 3.6 / 4.5"));
    if (st === "nicht_unternehmerisch") regel = "ERZ_NICHT_UNTERNEHMERISCH";
    else if (st === "pauschalierter_landwirt") regel = "ERZ_LW";
    else if (st === "regelbesteuert" || st === "gemeinde_bga") regel = "ERZ_RC";
    else regel = "ERZ_KU";
    if (regel === "ERZ_RC") {
      pfad.push(schritt("Lieferung von Strom an einen Wiederverkäufer (Gemeinschaft)?", "ja – Steuerschuld geht auf die Gemeinschaft über", UST_QUELLEN.rc));
      if (!mitglied.uid) fehler.push("Reverse Charge: UID des Erzeugers fehlt (Pflichtangabe bei Übergang der Steuerschuld).");
      pfad.push(schritt("UID des Erzeugers", mitglied.uid || "fehlt", "§ 11 Abs. 1a UStG 1994"));
      if (!gemeinschaft.uid) warnungen.push("Reverse Charge: UID der Gemeinschaft fehlt – beim Finanzamt beantragen (auch als Kleinunternehmer) (zu bestätigen).");
      pfad.push(schritt("UID der Gemeinschaft", gemeinschaft.uid || "fehlt", "§ 11 Abs. 1a UStG 1994"));
      pfad.push(schritt("Steuerschuld der Gemeinschaft", "20 % auf das Entgelt – auch als Kleinunternehmer (UVA bzw. Erklärung)", UST_QUELLEN.rc));
      pfad.push(schritt("Vorsteuerabzug der Gemeinschaft", egRegel ? "ja (regelbesteuert)" : "nein – die Steuer ist Aufwand der Gemeinschaft", egRegel ? "§ 12 Abs. 1 Z 3 UStG 1994" : UST_QUELLEN.ku));
      if (st === "gemeinde_bga") pfad.push(schritt("Gemeinde mit Betrieb gewerblicher Art", "Reverse Charge wie Unternehmer (zu bestätigen)", "Fachkonzept 9 Punkt 9"));
    } else if (regel === "ERZ_LW") {
      pfad.push(schritt("Durchschnittssatz", "13 % auf der Gutschrift, kein Reverse Charge", UST_QUELLEN.lw));
      pfad.push(schritt("Vorsteuerabzug der Gemeinschaft", egRegel ? "ja (regelbesteuert)" : "nein (Kleinunternehmer)", "§ 12 UStG 1994"));
    } else if (regel === "ERZ_KU") {
      pfad.push(schritt("Kleinunternehmer-Erzeuger", "Gutschrift ohne USt, kein Reverse Charge", UST_QUELLEN.ku));
    } else {
      pfad.push(schritt("Unternehmerische Tätigkeit?", "nein – keine Gutschrift mit Entgelt", UST_QUELLEN.nichtSteuerbar));
    }
    pfad.push(schritt("Gutschriftverfahren", "Gutschrift gilt als Rechnung, wenn vereinbart und nicht widersprochen", UST_QUELLEN.gutschrift));
  } else if (art === "mitgliedsbeitrag" && mitgliedsbeitragArt === "echt") {
    regel = "BEITRAG_ECHT";
    pfad.push(schritt("Mitgliedsbeitrag", "echt (keine Gegenleistung) – nicht steuerbar (zu bestätigen)", UST_QUELLEN.beitrag));
  } else {
    regel = egRegel ? "EG_REGEL" : "EG_KU";
    if (art === "mitgliedsbeitrag") pfad.push(schritt("Mitgliedsbeitrag", "unecht (Leistungsaustausch) – wie die Lieferung", UST_QUELLEN.beitrag));
    else if (art !== "bezug") pfad.push(schritt("Gebühr", "unselbständige Nebenleistung zur Stromlieferung – Steuersatz wie die Lieferung", "UStR 2000 Rz 347 (Nebenleistung)"));
    pfad.push(schritt("Ergebnis", egRegel ? "20 % USt" : "0 % – Hinweis Kleinunternehmer, kein Vorsteuerabzug", egRegel ? UST_QUELLEN.normal : UST_QUELLEN.ku));
  }
  const r = UST_REGELN[regel];
  return {
    regel, label: r.label, satz: r.satz, art: r.art, rcSatz: r.rcSatz || 0, hinweis: r.hinweis, quelle: r.quelle,
    steuerschuldEg: regel === "ERZ_RC", vorsteuerEg: egRegel && (regel === "ERZ_RC" || regel === "ERZ_LW"),
    pruefpfad: pfad, fehler, warnungen,
  };
}

/**
 * USt eines Belegs: Netto je (Art, Satz) summieren, Steuer auf die Summe je Satz (Fachkonzept 4.4).
 * @param {{netto:number, ust:{art:string, satz:number, rcSatz?:number, regel:string, hinweis:string}}[]} positionen
 */
export function ustSummen(positionen = []) {
  const gruppen = new Map();
  for (const p of positionen) {
    const k = `${p.ust.art}|${p.ust.satz}|${p.ust.regel}`;
    const g = gruppen.get(k) || { art: p.ust.art, satz: p.ust.satz, rcSatz: p.ust.rcSatz || 0, regel: p.ust.regel, hinweis: p.ust.hinweis, basis: 0 };
    g.basis += Number(p.netto) || 0;
    gruppen.set(k, g);
  }
  const zeilen = [...gruppen.values()].map((g) => {
    const basis = rund2(g.basis);
    return { art: g.art, satz: g.satz, regel: g.regel, hinweis: g.hinweis, basis, betrag: g.art === "ust" ? rund2((basis * g.satz) / 100) : 0, rcBetrag: g.art === "rc" ? rund2((basis * g.rcSatz) / 100) : 0 };
  }).sort((a, b) => vgl(a.regel, b.regel));
  const netto = rund2(zeilen.reduce((s, z) => s + z.basis, 0));
  const ust = rund2(zeilen.reduce((s, z) => s + z.betrag, 0));
  return { zeilen, netto, ust, brutto: rund2(netto + ust), rcSteuer: rund2(zeilen.reduce((s, z) => s + z.rcBetrag, 0)), hinweise: [...new Set(zeilen.map((z) => z.hinweis).filter(Boolean))] };
}

// ---------------------------------------------------------------- Kleinunternehmer-Monitor (Fachkonzept 4.5, Kür 10)

export const KU_GRENZE = 55000; // € brutto, ab 01.01.2025 (§ 6 Abs. 1 Z 27 UStG; USP)
export const KU_TOLERANZ = 60500; // + 10 % im laufenden Jahr
export const KU_WARNUNG_PCT = 80;
export const KU_QUELLE = "https://www.usp.gv.at/aktuelles/newsliste/kleinunternehmerregelung-ab-2025.html";

/**
 * Laufender Umsatz der Gemeinschaft gegen die Kleinunternehmergrenze, mit Hochrechnung und Vergleich „Option U 12“.
 * umsatzBrutto: Ausgangsumsätze des Jahres (Rechnungen an Mitglieder, ohne Reverse-Charge-Bezüge);
 * rcSteuer: Steuerschuld aus Reverse Charge; vorsteuer: Vorsteuern (13 % Landwirte, Eingangsrechnungen), die bei
 * Regelbesteuerung abziehbar wären; umsatzNetto: steuerpflichtiger Ausgangsumsatz (Basis für 20 % bei Option).
 */
export function kuMonitor({ ustStatus = "kleinunternehmer", jahr, monateErfasst = 12, umsatzBrutto = 0, vorjahrBrutto = 0, rcSteuer = 0, vorsteuer = 0, umsatzNetto = null } = {}) {
  const bisher = rund2(umsatzBrutto);
  const monate = Math.min(12, Math.max(1, Number(monateErfasst) || 1));
  const prognose = rund2((bisher / monate) * 12);
  const quote = Math.round((bisher / KU_GRENZE) * 1000) / 10;
  const quotePrognose = Math.round((prognose / KU_GRENZE) * 1000) / 10;
  let status = "ok";
  let text = `Umsatz ${jahr}: ${quote.toLocaleString("de-DE")} % der Kleinunternehmergrenze (55.000 € brutto).`;
  if (ustStatus === "regelbesteuert") {
    status = "regelbesteuert";
    text = "Die Gemeinschaft ist regelbesteuert (Option U 12, 5 Jahre bindend) – die Grenze ist nicht maßgeblich.";
  } else if (Number(vorjahrBrutto) > KU_GRENZE) {
    status = "ueberschritten";
    text = "Der Vorjahresumsatz lag über 55.000 € – die Kleinunternehmerbefreiung gilt in diesem Jahr nicht. Steuerberatung einbinden.";
  } else if (bisher > KU_TOLERANZ) {
    status = "ueberschritten";
    text = "Umsatz über 60.500 € – ab dem Umsatz, der die Toleranzgrenze überschreitet, entfällt die Befreiung. Rechnungen ab sofort mit 20 % USt (Steuerberatung einbinden).";
  } else if (bisher > KU_GRENZE) {
    status = "toleranz";
    text = "Umsatz über 55.000 €, aber innerhalb der Toleranz bis 60.500 € – die Befreiung gilt bis Jahresende; im Folgejahr entfällt sie.";
  } else if (quote >= KU_WARNUNG_PCT || quotePrognose >= 100) {
    status = "warnung";
    text = `Frühwarnung: ${quote.toLocaleString("de-DE")} % der Grenze erreicht, hochgerechnet ${quotePrognose.toLocaleString("de-DE")} %. Tarif und Option U 12 prüfen.`;
  }
  const basis = umsatzNetto === null ? bisher : rund2(umsatzNetto);
  const ustBeiOption = rund2(basis * 0.2);
  const entlastung = rund2(Number(rcSteuer) + Number(vorsteuer));
  return {
    status, jahr, grenze: KU_GRENZE, toleranz: KU_TOLERANZ, umsatzBrutto: bisher, prognoseBrutto: prognose, quote, quotePrognose, text, quelle: KU_QUELLE,
    option: {
      rcSteuerNichtAbziehbar: ustStatus === "regelbesteuert" ? 0 : rund2(rcSteuer),
      vorsteuerNichtAbziehbar: ustStatus === "regelbesteuert" ? 0 : rund2(vorsteuer),
      entlastungGemeinschaft: entlastung,
      ustAufMitglieder: ustBeiOption,
      empfehlung: ustStatus !== "regelbesteuert" && entlastung > ustBeiOption ? "Option U 12 prüfen: Die abziehbaren Steuern übersteigen die zusätzliche USt auf die Mitglieder." : "Kleinunternehmerregelung bleibt nach diesen Zahlen günstiger (Mitglieder ohne Vorsteuerabzug zahlen keine USt).",
      hinweis: "Vergleich ohne Investitions-Vorsteuern und ohne Bindungswirkung (5 Jahre) – keine Steuerberatung.",
    },
  };
}
