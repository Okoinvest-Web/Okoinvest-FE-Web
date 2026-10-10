// src/lib/bericht/gewerbestrom.js – Bericht-Baustein für den Rechnungs-Check Gewerbestrom (Welle 3, Paket B5)
//
// Feldregeln (Positivliste der Eingaben) und Zusammenfassung für die Berichtsseite. Eingebunden in
// src/lib/bericht/neuRechnen.js (RECHNER.gewerbestrom). Rechnet nicht selbst – nur gewerbestromCheck().
// Nur Deutschland (AT nach SNE-VO 2027 und CH in Vorbereitung).
// Der Lastgang verlässt den Browser nie: übermittelt werden nur Jahresverbrauch, Spitzenleistung und der
// daraus im Browser berechnete Profilfaktor (eine Zahl zwischen 0,5 und 1,5).

import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { BUNDESLAENDER, KAV_GRUPPEN, LASTPROFILE, NETZ_MODI, PREISARTEN, SPANNUNGEN, STUFEN, gewerbestromCheck } from "@/lib/rechner/gewerbestrom";

const ct = (x, s = 2) => `${fmt(x, s)} ct/kWh`;
const monatText = (iso) => {
  if (!iso) return "–";
  const [j, m] = iso.split("-").map(Number);
  return `${["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."][m - 1]} ${j}`;
};
const label = (liste, id) => liste.find((x) => x.id === id)?.label || id;
const ids = (liste) => liste.map((x) => x.id);

/** Feldregeln im Format von neuRechnen.js (zahl/wahl/bool werden dort gebaut und übergeben). */
export function regelnGewerbestrom({ zahl, wahl, jaNein }) {
  return {
    verbrauchMwh: zahl(1, 200000),
    leistungKw: zahl(0, 100000),
    spannung: wahl(ids(SPANNUNGEN)),
    preisArt: wahl(ids(PREISARTEN)),
    arbeitspreisCt: zahl(0.5, 150),
    grundpreisEurMonat: zahl(0, 10000),
    netzModus: wahl(ids(NETZ_MODI)),
    netzCt: zahl(0, 50),
    netzFixEurJahr: zahl(0, 5e6),
    kav: wahl(ids(KAV_GRUPPEN)),
    gemeinde: wahl(["bis25", "bis100", "bis500", "ueber500"]),
    produzierend: jaNein(),
    gruppeC: jaNein(),
    lastprofil: wahl(ids(LASTPROFILE)),
    profilFaktor: zahl(0.5, 1.5),
    bundesland: wahl(ids(BUNDESLAENDER)),
  };
}

/** Urteil als Satz (deutsch, für Bericht und Rechner). */
export function urteilText(r) {
  const s = r.spanne;
  switch (r.urteil.id) {
    case "marktgerecht":
      return `Ihr Energieanteil von ${ct(r.energie.ct)} liegt in der üblichen Spanne von ${ct(s.min)} bis ${ct(s.max)} (Börsenwert plus üblicher Lieferantenaufschlag). Ein Wechsel lohnt sich allein wegen des Preises kaum – prüfen Sie Laufzeit und Kündigungsfrist.`;
    case "guenstig":
      return `Ihr Energieanteil von ${ct(r.energie.ct)} liegt unter der üblichen Spanne (ab ${ct(s.min)}). Das kann ein früh abgeschlossener Vertrag sein – prüfen Sie aber, ob alle Bestandteile richtig eingetragen sind und wann der Vertrag endet.`;
    case "etwas_ueber":
      return `Ihr Energieanteil von ${ct(r.energie.ct)} liegt etwas über der üblichen Spanne (bis ${ct(s.max)}). Ein Vergleichsangebot zum nächsten Kündigungstermin kann sich lohnen.`;
    case "deutlich_ueber":
      return `Ihr Energieanteil von ${ct(r.energie.ct)} liegt deutlich über der üblichen Spanne (bis ${ct(s.max)}). Rechnerisch sind das ${fmtEur(r.differenz.minEur)} bis ${fmtEur(r.differenz.maxEur)} pro Jahr über dem Marktniveau – mit Blick auf Ihren Kündigungstermin lohnt sich ein Vergleich.`;
    case "offen":
      return "Ihr Arbeitspreis enthält das Netzentgelt. Ohne den Wert aus Ihrer Rechnung lässt sich der Energieanteil nicht vom Netzentgelt trennen – tragen Sie Netz-Arbeitspreis und Fixkosten aus der Rechnung ein.";
    default:
      return "Nach Abzug der amtlichen Bestandteile und des Netzentgelts bleibt kein Energieanteil übrig. Bitte prüfen Sie, ob der Arbeitspreis netto und ohne Umsatzsteuer eingetragen ist.";
  }
}

const STUFE_URTEIL = { marktgerecht: "gut", guenstig: "gut", etwas_ueber: "pruefen", deutlich_ueber: "kritisch", offen: "info", pruefen: "info" };

/** Zusammenfassung für die Berichtsseite (nur Formatierung der Rechnerergebnisse). */
export function zusammenfassungGewerbestrom(r) {
  const e = r.eingabe;
  const b = r.boerse;
  return {
    urteil: { titel: r.urteil.titel, text: urteilText(r), stufe: STUFE_URTEIL[r.urteil.id] || "info" },
    kennzahlen: [
      ...(r.energie ? [{ label: "Ihr Energieanteil", wert: ct(r.energie.ct), zusatz: `${fmtEur(r.energie.eur)} pro Jahr · ${STUFEN.berechnet.label}` }] : []),
      { label: "Marktspanne Energie", wert: `${fmt(r.spanne.min, 2)}–${fmt(r.spanne.max, 2)} ct/kWh`, zusatz: `Börsenwert ${ct(b.ct)} + Aufschlag ${fmt(r.spanne.aufschlag.min, 1)}–${fmt(r.spanne.aufschlag.max, 1)} ct (Schätzung)` },
      { label: "Amtliche Bestandteile", wert: ct(r.amtlich.ct), zusatz: `${fmtEur(r.amtlich.eur)} pro Jahr · Umlagen, Konzessionsabgabe, Stromsteuer` },
      ...(r.netz ? [{ label: "Netzentgelt (Ihre Angabe)", wert: ct(r.netz.ct), zusatz: `${fmtEur(r.netz.eur)} pro Jahr` }] : []),
      ...(r.rechnung ? [{ label: "Rechnung netto", wert: fmtEur(r.rechnung.eur), zusatz: `${ct(r.rechnung.ct)} im Schnitt` }] : []),
      ...(r.entlastung.eur > 0 ? [{ label: "Stromsteuer-Entlastung möglich", wert: fmtEur(r.entlastung.eur), zusatz: "pro Jahr, Antrag beim Hauptzollamt (§ 9b StromStG)" }] : []),
    ],
    eingabenText: [
      ["Jahresverbrauch", `${fmt(r.kwh)} kWh`],
      ["Spitzenleistung", e.leistungKw > 0 ? `${fmt(e.leistungKw)} kW${r.benutzungsstunden ? ` (${fmt(r.benutzungsstunden)} Benutzungsstunden)` : ""}` : "nicht angegeben"],
      ["Spannungsebene", label(SPANNUNGEN, e.spannung)],
      ["Arbeitspreis laut Rechnung", `${ct(e.arbeitspreisCt)} netto (${label(PREISARTEN, e.preisArt)})`],
      ["Grundpreis", `${fmt(e.grundpreisEurMonat, 2)} € pro Monat`],
      ["Netzentgelt", e.netzModus === "angegeben" ? `${ct(e.netzCt)} + ${fmtEur(e.netzFixEurJahr)} pro Jahr (Leistungs-, Grundpreis, Messung)` : "nicht angegeben"],
      ["Konzessionsabgabe", r.kav.gruppe === "sonder" ? "Sondervertragskunde" : `Tarifkunde (${e.gemeinde === "bis25" ? "bis 25.000" : e.gemeinde === "bis100" ? "bis 100.000" : e.gemeinde === "bis500" ? "bis 500.000" : "über 500.000"} Einwohner)`],
      ["Produzierendes Gewerbe / Land- und Forstwirtschaft", e.produzierend ? (e.gruppeC ? "ja, Stromkosten über 4 % des Umsatzes" : "ja") : "nein"],
      ["Lastprofil", e.lastprofil === "lastgang" ? `eigener Lastgang (im Browser ausgewertet, Profilfaktor ${fmt(e.profilFaktor, 3)})` : label(LASTPROFILE, e.lastprofil)],
      ...(e.bundesland ? [["Bundesland", label(BUNDESLAENDER, e.bundesland)]] : []),
    ],
    rechenweg: [
      `Amtliche Bestandteile 2026 je kWh: KWKG-Umlage, Offshore-Netzumlage, Aufschlag für besondere Netznutzung (erste 1.000.000 kWh voll, darüber gestaffelt), Konzessionsabgabe nach KAV (${r.kav.gruppe === "sonder" ? "Sondervertrag" : "Tarifkunde"}) und Stromsteuer zum Regelsatz – zusammen ${ct(r.amtlich.ct)}.`,
      e.preisArt === "gesamt"
        ? "Energieanteil = Rechnungsbetrag (Arbeitspreis × Verbrauch + Grundpreis + separat berechnete Netz-Fixkosten) − amtliche Bestandteile − Netzentgelt laut Rechnung."
        : "Energieanteil = Arbeitspreis × Verbrauch + Grundpreis (Netzentgelt, Umlagen und Steuern stehen getrennt auf der Rechnung).",
      `Börsenwert: Mittel der Day-Ahead-Preise ${monatText(b.von)} bis ${monatText(b.bis)} (${ct(b.baseCt)}), gewichtet mit Ihrem Lastprofil (Faktor ${fmt(b.faktor, 3)}) = ${ct(b.ct)}. Daten: Bundesnetzagentur | SMARD.de, Lizenz CC BY 4.0.`,
      `Marktspanne: Börsenwert + üblicher Lieferantenaufschlag (Strukturierung, Bilanzkreis, Risiko, Vertrieb) von ${fmt(r.spanne.aufschlag.min, 1)} bis ${fmt(r.spanne.aufschlag.max, 1)} ct/kWh – eigene Einschätzung.`,
    ],
    tabelle: {
      titel: "Zerlegung Ihres Strompreises",
      spalten: ["Bestandteil", "ct/kWh", "€ pro Jahr", "Qualität"],
      zeilen: r.zeilen.map((z) => [z.label, z.ct === null ? "–" : fmt(z.ct, 3), z.eur === null ? "–" : fmtEur(z.eur), STUFEN[z.stufe]?.label || z.stufe]),
    },
    listen: [],
    hinweise: [
      "Alle Werte netto ohne Umsatzsteuer. Orientierung, kein Angebot und keine Rechts- oder Steuerberatung.",
      "Der Börsenwert bildet die vergangenen zwölf Monate ab. Ihr Vertragspreis hängt vom Terminmarkt zum Zeitpunkt des Abschlusses ab und kann deshalb auch bei fairer Beschaffung abweichen.",
      "Begrenzungen für stromkostenintensive Unternehmen (§§ 30 ff. EnFG) und der Wegfall der Konzessionsabgabe unter dem Grenzpreis (§ 2 Abs. 4 KAV) sind nicht eingerechnet.",
      ...(r.vorschau2027.offen ? [`Umlagen 2027: Die Übertragungsnetzbetreiber veröffentlichen sie bis 25.10.2026 – der Check rechnet bis dahin mit den Werten 2026.`] : []),
    ],
  };
}

/** Neuberechnung für den Bericht (Land nur DE). */
export const rechneGewerbestrom = (e) => gewerbestromCheck(e);
