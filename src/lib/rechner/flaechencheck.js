// src/lib/rechner/flaechencheck.js
//
// Flächencheck: erste Eignungseinschätzung einer Fläche für Freiflächen-PV.
// Reine Funktion ohne React – testbar mit Node. Marktwerte aus markt.js,
// die Punktelogik ist eine bewusst einfache, transparente Heuristik.

import { AGRI, BAUART, FREIFLAECHE, PACHT, REGIONEN, regionById, laenderSperre } from "../invest/markt.js";

export const LAENDER = [
  { id: "DE", label: "Deutschland" },
  { id: "AT", label: "Österreich" },
  { id: "CH", label: "Schweiz" },
];

export const regionenFuer = (land) => REGIONEN.filter((r) => r.land === land);

export const NUTZUNGEN = [
  { id: "acker", label: "Acker", text: "Ackerland in Bewirtschaftung" },
  { id: "gruenland", label: "Grünland", text: "Wiese, Weide, Dauergrünland" },
  { id: "konversion", label: "Konversion", text: "Ehem. Militär, Gewerbe, Bahn, Abbau" },
  { id: "deponie", label: "Deponie", text: "Abgedeckte Deponie, Halde" },
  { id: "parkplatz", label: "Parkplatz", text: "Versiegelte Stellfläche" },
  { id: "sonstige", label: "Sonstige", text: "Brache, Mischnutzung, unklar" },
];

export const BESONDERHEITEN = [
  { id: "randstreifen", label: "Randstreifen Autobahn/Schiene", text: "Bis 500 m neben Autobahn oder Schienenweg" },
  { id: "benachteiligt", label: "Benachteiligtes Gebiet", text: "Landwirtschaftlich benachteiligte Gebietskulisse" },
  { id: "schutzgebiet", label: "Schutzgebiet", text: "Naturschutz-, FFH-, Vogelschutz- oder Wasserschutzgebiet" },
  { id: "wald", label: "Wald angrenzend", text: "Waldrand direkt an der Fläche" },
  { id: "hang", label: "Hangneigung", text: "Deutlich geneigt, vor allem nach Norden" },
  { id: "ueberschwemmung", label: "Überschwemmungsgebiet", text: "Festgesetztes Überschwemmungsgebiet" },
];

export const NETZ = [
  { id: "lt1", label: "unter 1 km", km: 0.7 },
  { id: "1-3", label: "1–3 km", km: 2 },
  { id: "3-5", label: "3–5 km", km: 4 },
  { id: "5-10", label: "5–10 km", km: 7.5 },
  { id: "gt10", label: "über 10 km", km: 12 },
  { id: "unbekannt", label: "weiß ich nicht", km: null },
];

export const EIGENTUM = [
  { id: "allein", label: "Alleineigentum", text: "Ich entscheide allein" },
  { id: "gemeinschaft", label: "Mehrere Eigentümer", text: "Ehepaar, Erbengemeinschaft, GbR" },
  { id: "verpachtet", label: "Derzeit verpachtet", text: "Ein Landwirt bewirtschaftet die Fläche" },
  { id: "kommune", label: "Kommune / Kirche / Verband", text: "Gremienbeschluss nötig" },
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Bewertet eine Fläche.
 * eingaben: { land, regionId, ha, nutzung, besonderheiten: [], netz, eigentum }
 */
export function flaechencheck({ land = "DE", regionId, ha = 10, nutzung = "acker", besonderheiten = [], netz = "unbekannt", eigentum = "allein" } = {}) {
  const region = regionById(regionId || regionenFuer(land)[0]?.id);
  const hat = (id) => besonderheiten.includes(id);
  const gruende = []; // { punkte, text, art: plus|minus|info }
  const add = (punkte, text, art) => gruende.push({ punkte, text, art: art || (punkte > 0 ? "plus" : punkte < 0 ? "minus" : "info") });
  let punkte = 50;
  let deckel = 100;

  // --- Größe -------------------------------------------------------
  if (ha < 1) {
    add(-30, "Unter 1 ha ist ein eigener Solarpark kaum wirtschaftlich – eher Agri-PV am Hof, Carport oder Anschluss an eine Nachbarfläche.");
    deckel = 35;
  } else if (ha < FREIFLAECHE.mindestHa) {
    add(-10, `Unter ${FREIFLAECHE.mindestHa} ha wird es knapp; mit Nachbarflächen oder als Agri-PV kann es passen.`);
  } else if (ha < 5) {
    add(5, "Die Größe reicht für einen kleineren Solarpark.");
  } else if (ha <= 100) {
    add(ha >= 20 ? 20 : 15, "Gute Größe: Fixkosten für Planung und Netzanschluss verteilen sich auf viel Leistung.");
  } else {
    add(12, "Sehr große Fläche – attraktiv, aber Netzkapazität und Genehmigung werden zum Engpass; ggf. in Abschnitten.");
  }

  // --- Nutzung -----------------------------------------------------
  const nutzungText = {
    acker: [5, "Ackerland ist meist eben und gut erschlossen. Gemeinden achten auf Bodenqualität – Agri-PV kann eine Alternative sein."],
    gruenland: [0, "Grünland ist möglich; bei Dauergrünland gelten teils Umbruch- und Naturschutzauflagen."],
    konversion: [15, land === "DE" ? "Konversionsflächen sind politisch erwünscht und in Deutschland EEG-förderfähig." : "Konversionsflächen sind als vorbelastete Flächen politisch erwünscht."],
    deponie: [8, "Deponien sind geeignet, brauchen aber Ballast- statt Rammfundamente und Abstimmung mit der Abfallbehörde."],
    parkplatz: [0, "Auf Parkplätzen wird statt eines Solarparks ein Solarcarport gebaut – eigenes Modell, gern prüfen wir beides."],
    sonstige: [0, "Die Nutzung klären wir im Gespräch – Brachen sind oft gut geeignet."],
  }[nutzung] || [0, ""];
  if (nutzungText[1]) add(nutzungText[0], nutzungText[1]);

  // --- Besonderheiten ---------------------------------------------
  if (hat("randstreifen")) {
    add(15, land === "DE"
      ? "Randstreifen an Autobahn/Schiene: EEG-Flächenkulisse (bis 500 m). Baurechtlich privilegiert im Außenbereich ist die Anlage bis 200 m entlang von Autobahnen oder Schienenwegen des übergeordneten Netzes mit mindestens zwei Hauptgleisen (§ 35 Abs. 1 Nr. 8 b BauGB)."
      : "Flächen entlang von Verkehrswegen gelten auch in AT/CH als vorbelastet und sind raumplanerisch oft bevorzugt.");
  }
  if (hat("benachteiligt")) {
    if (land === "DE") add(8, "Benachteiligtes Gebiet: Acker- und Grünland ist dort grundsätzlich EEG-förderfähig, sofern das Land nicht ausgeschlossen hat.");
    else add(0, "Benachteiligte Gebiete spielen in AT/CH für die Förderung keine eigene Rolle.", "info");
  }
  if (hat("schutzgebiet")) {
    add(-30, "Schutzgebiet: Naturschutz-, FFH- und Wasserschutzgebiete schließen einen Solarpark meist aus; Landschaftsschutzgebiete im Einzelfall möglich.");
    deckel = Math.min(deckel, 45);
  }
  if (hat("wald")) add(-8, "Waldrand: Abstand, Verschattung und Brandschutz kosten nutzbare Fläche.");
  if (hat("hang")) add(-10, "Hangneigung: Süd- und leichte Ost/West-Hänge gehen gut, steile Nordhänge kaum.");
  if (hat("ueberschwemmung")) {
    add(-20, "Überschwemmungsgebiet: nur mit wasserrechtlicher Ausnahme und erhöhter Aufständerung.");
    deckel = Math.min(deckel, 55);
  }

  // --- Netzanschluss ----------------------------------------------
  const nutzbarHa = ha * (hat("wald") ? 0.92 : 1) * (hat("hang") ? 0.95 : 1);
  const kwp = (nutzbarHa / FREIFLAECHE.haProMwp) * 1000;
  const netzInfo = NETZ.find((n) => n.id === netz) || NETZ[NETZ.length - 1];
  let netzProKwp = null;
  if (netzInfo.km == null) {
    add(0, "Entfernung zum Netz unbekannt – wir fragen die Anschlusskapazität beim Netzbetreiber an.", "info");
  } else {
    netzProKwp = (netzInfo.km * 1000 * FREIFLAECHE.kabelProMeter + (kwp / 1000) * FREIFLAECHE.netzanschlussFixProMwp) / Math.max(kwp, 1);
    // Schweiz: keine €-Beträge (Kostenbasis DE, Währung CHF) – nur die Einordnung
    const ch = land === "CH";
    const betrag = `rund ${Math.round(netzProKwp)} €/kWp`;
    if (netzProKwp < 70) add(15, ch ? "Netzanschluss nah: geringe Kosten für Kabeltrasse und Übergabestation." : `Netzanschluss nah: ${betrag} für Kabeltrasse und Übergabestation.`);
    else if (netzProKwp < 110) add(5, ch ? "Netzanschluss tragbar." : `Netzanschluss tragbar: ${betrag}.`);
    else if (netzProKwp < 200) add(-8, ch ? "Netzanschluss teuer – erst ab mehr Fläche gut tragbar." : `Netzanschluss teuer: ${betrag} – erst ab mehr Fläche gut tragbar.`);
    else add(-20, ch ? "Netzanschluss sehr teuer. Mit Nachbarflächen oder Speicher neu rechnen." : `Netzanschluss sehr teuer: ${betrag}. Mit Nachbarflächen oder Speicher neu rechnen.`);
  }

  // --- Eigentum ----------------------------------------------------
  const eig = {
    allein: [5, "Alleineigentum: kurze Wege bis zur Unterschrift."],
    gemeinschaft: [0, "Mehrere Eigentümer: Alle müssen zustimmen – wir helfen bei der Abstimmung."],
    verpachtet: [-3, "Bestehender Landpachtvertrag: Kündigungsfristen und Ausgleich für den Pächter einplanen."],
    kommune: [0, "Kommunale oder kirchliche Fläche: Gremienbeschluss und ggf. Ausschreibung einplanen."],
  }[eigentum];
  if (eig) add(eig[0], eig[1]);

  // --- Länderhinweis ----------------------------------------------
  if (land === "AT") add(0, "Österreich: Nötig ist eine Widmung als Grünland-Photovoltaik bzw. eine Zonierung nach Landesrecht – die Regeln unterscheiden sich je Bundesland.", "info");
  if (land === "CH") add(0, "Schweiz: Ausserhalb der Bauzone braucht es Standortgebundenheit nach Raumplanungsrecht; grosse Freiflächenanlagen sind nur eingeschränkt möglich.", "info");

  const summe = gruende.reduce((s, g) => s + g.punkte, punkte);
  const score = Math.round(clamp(Math.min(summe, deckel), 0, 100));
  const ampel = score >= 65 ? "gruen" : score >= 40 ? "gelb" : "rot";

  // --- Kennzahlen --------------------------------------------------
  const kwh = kwp * region.ertrag;
  const p = PACHT.freiflaecheProHa;
  // Je besser die Fläche, desto weiter oben in der Spanne liegt die Pacht
  const lage = clamp((score - 30) / 60, 0, 1);
  const pachtMin = ha * (p.min + (p.mittel - p.min) * lage * 0.6);
  const pachtMax = ha * (p.mittel + (p.max - p.mittel) * lage);
  const faktor30 = summeIndex(PACHT.laufzeit, PACHT.indexierung);

  const agriMoeglich = ["acker", "gruenland"].includes(nutzung);
  const agriKwp = (ha / BAUART.agriVertikal.haProMwp) * 1000; // vertikal-bifazial, konservativ

  // Länder-Sperre (markt.js LAENDER_SPERRE): €-Pacht und GAP nur für DE, €-Netzkosten nicht für CH
  const sperre = laenderSperre(land);
  return {
    sperre,
    score,
    ampel,
    gruende: gruende.sort((a, b) => Math.abs(b.punkte) - Math.abs(a.punkte)),
    region,
    nutzbarHa,
    kwp,
    kwh,
    netzProKwp: land === "CH" ? null : netzProKwp,
    pachtJahr: sperre ? null : { min: pachtMin, max: pachtMax },
    pacht30: sperre ? null : { min: pachtMin * faktor30, max: pachtMax * faktor30 },
    agri: agriMoeglich
      ? { kwp: agriKwp, pachtJahr: sperre ? null : { min: ha * PACHT.agriProHa.min, max: ha * PACHT.agriProHa.max }, gapAnteil: sperre ? null : AGRI.gapFoerderfaehig }
      : null,
    carport: nutzung === "parkplatz",
    schritte: naechsteSchritte({ ampel, land, eigentum, netz, nutzung }),
  };
}

/** Summe einer mit `rate` indexierten Zahlungsreihe von 1 über n Jahre */
function summeIndex(n, rate) {
  let s = 0;
  for (let t = 0; t < n; t++) s += Math.pow(1 + rate, t);
  return s;
}

function naechsteSchritte({ ampel, land, eigentum, netz, nutzung }) {
  const s = [];
  s.push("Flurstücke nennen – wir prüfen Schutzgebiete, Regionalplan, Netz und Einstrahlung am Kartentisch (kostenfrei).");
  if (netz === "unbekannt" || ampel !== "rot") s.push("Netzanschlussanfrage beim Netzbetreiber – erst die Kapazität entscheidet über die Parkgröße.");
  if (eigentum === "gemeinschaft") s.push("Alle Miteigentümer frühzeitig einbinden – ein gemeinsames Gespräch spart Monate.");
  if (eigentum === "verpachtet") s.push("Laufenden Landpachtvertrag prüfen: Kündigungsfrist, Teilflächen, Ausgleich für den Pächter.");
  if (land === "DE") s.push("Frühes Gespräch mit der Gemeinde – ohne Bebauungsplan (Ausnahme: privilegierte Flächen) geht es in Deutschland nicht.");
  if (land === "AT") s.push("Abstimmung mit der Gemeinde zur Widmung Grünland-Photovoltaik und zur Landes-Zonierung.");
  if (land === "CH") s.push("Vorabklärung mit Gemeinde und kantonaler Fachstelle zur Standortgebundenheit.");
  if (nutzung === "parkplatz") s.push("Parkplatz: Solarcarport mit Ladepunkten als Alternative rechnen.");
  s.push("Pachtangebot mit Vertragsentwurf – Sie prüfen in Ruhe, gern mit Ihrer Beratung.");
  return s;
}
