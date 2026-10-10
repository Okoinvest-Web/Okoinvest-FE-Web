// src/lib/bericht/neuRechnen.js
//
// Bericht-Baustein (Welle 2, Paket B4): serverseitige Neuberechnung.
//
//  - POSITIVLISTE: nur die vier Rechner pacht, pachtangebot, flaechencheck, kommune (sonst 422).
//  - Eingaben werden je Feld auf Typ und Bereich geprüft; unbekannte Felder → 422. Fehlende Felder nimmt der
//    Rechner aus seinen Standardwerten (wie im Browser).
//  - Der Server rechnet IMMER selbst mit den Funktionen aus src/lib/rechner (B1-Fassade, Faktenregister).
//    Ergebnisse aus dem Browser werden nie übernommen – die Route liest sie nicht einmal.
//  - Land: DE | AT | CH als Parameter. Es muss zur Region passen. Gesperrte Länder (laender/sperre.js) bekommen
//    keinen Bericht mit Geldwerten: pacht, pachtangebot und kommune → 422; flaechencheck ohne Pachtwerte.
//  - Prüf-ID: SHA-256 über Rechner, Land, normalisierte Eingaben und STAND_RECHENLOGIK (16 Hex-Zeichen).
//
// B4 ändert keine Rechenlogik: Hier wird nur aufgerufen, zusammengefasst und formatiert.

import { createHash } from "node:crypto";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { REGIONEN, BAUART, KOMMUNE, STAND, STAND_RECHENLOGIK, landVonRegion, laenderSperre } from "@/lib/invest/markt";
import { rechenbasisFuer, standardRegion } from "@/lib/invest/laender/marktFuer";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { pachtRechnung, PACHTMODELLE } from "@/lib/rechner/pacht";
import { pruefePachtangebot, FLAECHENARTEN, MODELLE, INDEXARTEN, OPTIONEN } from "@/lib/rechner/pachtangebot";
import { flaechencheck, NUTZUNGEN, BESONDERHEITEN, NETZ, EIGENTUM, regionenFuer } from "@/lib/rechner/flaechencheck";
import { rechneKommune } from "@/lib/rechner/kommune";
import { grundstueck } from "@/lib/anfrage/laender";
import { pfad as seitenPfad } from "../land/index.js";
import { regelnGewerbestrom, rechneGewerbestrom, zusammenfassungGewerbestrom } from "./gewerbestrom";
import { landPruefenFlaechenpass, normalisierenFlaechenpass, rechneFlaechenpass, regelnFlaechenpass, zusammenfassungFlaechenpass } from "./flaechenpass";
import { landPruefenRatsvorlage, normalisierenRatsvorlage, rechneRatsvorlage, regelnRatsvorlage, zusammenfassungRatsvorlage } from "./ratsvorlage";

export const LAENDER = Object.freeze(["DE", "AT", "CH"]);
export const LAND_NAME = Object.freeze({ DE: "Deutschland", AT: "Österreich", CH: "Schweiz" });

/* ------------------------------------------------------------------ */
/* Feldregeln                                                          */
/* ------------------------------------------------------------------ */

const zahl = (min, max, { ganz = false } = {}) => ({ art: "zahl", min, max, ganz });
const wahl = (liste) => ({ art: "wahl", liste });
const jaNein = () => ({ art: "bool" });
const mehrfach = (liste) => ({ art: "mehrfach", liste });
/** Eigene Prüfung (Paket B6: Fläche als Zeichenkette) – pruefe(wert) liefert den normalisierten Wert oder wirft 422 */
const eigen = (pruefe) => ({ art: "eigen", pruefe });
const ids = (liste) => liste.map((x) => x.id);
const REGION_IDS = REGIONEN.map((r) => r.id);

function feldPruefen(name, regel, wert) {
  const fehler = () => new PlattformFehler(422, `Ungültige Eingabe „${name}“.`, "eingabe");
  if (regel.art === "eigen") return regel.pruefe(wert);
  if (regel.art === "zahl") {
    if (typeof wert !== "number" || !Number.isFinite(wert) || wert < regel.min || wert > regel.max) throw fehler();
    if (regel.ganz && !Number.isInteger(wert)) throw fehler();
    return wert;
  }
  if (regel.art === "wahl") {
    if (typeof wert !== "string" || !regel.liste.includes(wert)) throw fehler();
    return wert;
  }
  if (regel.art === "bool") {
    if (typeof wert !== "boolean") throw fehler();
    return wert;
  }
  if (regel.art === "mehrfach") {
    if (!Array.isArray(wert) || wert.length > regel.liste.length || wert.some((x) => typeof x !== "string" || !regel.liste.includes(x))) throw fehler();
    return [...new Set(wert)];
  }
  throw fehler();
}

/** Prüft ein Eingabe-Objekt gegen die Feldregeln; unbekannte Felder → 422. Reihenfolge der Schlüssel wird normiert. */
function eingabenPruefen(regeln, eingaben) {
  if (!eingaben || typeof eingaben !== "object" || Array.isArray(eingaben)) throw new PlattformFehler(422, "Eingaben fehlen.", "eingabe");
  const unbekannt = Object.keys(eingaben).filter((k) => !Object.hasOwn(regeln, k));
  if (unbekannt.length) throw new PlattformFehler(422, `Unbekannte Eingabe „${unbekannt[0].slice(0, 40)}“.`, "eingabe");
  const out = {};
  for (const k of Object.keys(regeln).sort()) if (eingaben[k] !== undefined) out[k] = feldPruefen(k, regeln[k], eingaben[k]);
  return out;
}

/* ------------------------------------------------------------------ */
/* Zusammenfassungen (nur Formatierung der Rechnerergebnisse)          */
/* ------------------------------------------------------------------ */

const pct = (x, s = 1) => `${fmt(x * 100, s)} %`;
const regionLabel = (id) => REGIONEN.find((r) => r.id === id)?.label || id;
const kz = (label, wert, zusatz = "") => ({ label, wert, zusatz });
const AMPEL_LABEL = { gut: "marktüblich", pruefen: "prüfen", kritisch: "kritisch" };

function zusammenfassungPacht(r, e, land) {
  const { markt } = rechenbasisFuer({ land, regionId: e.regionId });
  const { PACHT, FREIFLAECHE, ERLOESE, erloesmodell } = markt;
  const ha = e.ha ?? 10;
  const modell = e.modell ?? "fest";
  const laufzeit = e.laufzeit ?? PACHT.laufzeit;
  const vorlauf = e.vorlaufJahre ?? 0;
  const proHa = e.proHa ?? PACHT.freiflaecheProHa.mittel;
  const modellText = {
    fest: `Festpacht: ${fmt(ha, 1)} ha × ${fmt(proHa)} €/ha = ${fmtEur(ha * proHa)} pro Jahr, gleichbleibend über ${laufzeit} Jahre.`,
    index: `Indexierte Pacht: Start ${fmt(ha, 1)} ha × ${fmt(proHa)} €/ha, danach jedes Jahr +${pct(PACHT.indexierung)} über ${laufzeit} Jahre.`,
    umsatz: `Umsatzbeteiligung: ${pct(e.umsatzAnteil ?? 0.06)} der Stromerlöse. Ertrag mit −${pct(FREIFLAECHE.degradation)} Degradation pro Jahr; in den ersten ${erloesmodell.werte.foerderJahre} Jahren EEG-Wert ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh ohne Zahlung in Zeiten negativer Preise (§ 51 EEG, Anteil ${pct(ERLOESE.paragraph51.anteilNegativ)}), danach Marktwert ab ${fmt(ERLOESE.merchantCt, 1)} ct/kWh (+${pct(ERLOESE.merchantSteigerung || 0)} pro Jahr). Mindestens ${fmt(e.mindestProHa ?? PACHT.freiflaecheProHa.min)} €/ha.`,
  }[modell];
  const schritt = Math.max(1, Math.round(r.jahre.length / 6 / 5) * 5) || 5;
  const zeilen = r.jahre.filter((j, i) => j.jahr === 1 || j.jahr % schritt === 0 || i === r.jahre.length - 1);
  return {
    kennzahlen: [
      kz("Pacht im 1. Betriebsjahr", fmtEur(r.ersteJahrespacht), `${fmt(r.proHaErstesJahr)} €/ha`),
      kz(`Summe ${r.jahre.length} Jahre`, fmtEur(r.summeSolar), `Ø ${fmtEur(r.durchschnitt)} pro Jahr`),
      kz("Gegenüber Ackerpacht", r.faktorAcker ? `${fmt(r.faktorAcker, 1)}×` : "–", `${r.mehrGgAcker >= 0 ? "+" : "−"}${fmtEur(Math.abs(r.mehrGgAcker))}`),
      kz("Gegenüber Ackerbau (Deckungsbeitrag)", r.faktorDb ? `${fmt(r.faktorDb, 1)}×` : "–", `${r.mehrGgDb >= 0 ? "+" : "−"}${fmtEur(Math.abs(r.mehrGgDb))}`),
      kz("Solarpark auf der Fläche", `${fmt(r.kwp / 1000, 1)} MWp`, `${fmt(r.kwh / 1e6, 1)} GWh Strom im ersten Jahr`),
    ],
    eingabenText: [
      ["Fläche", `${fmt(ha, ha % 1 ? 1 : 0)} ha`],
      ["Region", regionLabel(e.regionId)],
      ["Pachtmodell", PACHTMODELLE.find((m) => m.id === modell)?.label || modell],
      ...(modell === "umsatz" ? [["Umsatzanteil", pct(e.umsatzAnteil ?? 0.06)], ["Mindestpacht", `${fmt(e.mindestProHa ?? PACHT.freiflaecheProHa.min)} €/ha`]] : [["Pacht", `${fmt(proHa)} €/ha·a`]]),
      ["Laufzeit", `${laufzeit} Jahre`],
      ["Vorlauf bis Baubeginn", vorlauf ? `${vorlauf} Jahre` : "keiner"],
      ["Heutige Ackerpacht", `${fmt(e.ackerProHa ?? PACHT.ackerProHa)} €/ha·a`],
      ["Deckungsbeitrag Ackerbau", `${fmt(e.dbProHa ?? PACHT.deckungsbeitragAcker.mittel)} €/ha·a`],
    ],
    rechenweg: [
      `Leistung: ${fmt(ha, 1)} ha ÷ ${fmt(FREIFLAECHE.haProMwp, 2)} ha/MWp = ${fmt(r.kwp / 1000, 2)} MWp. Ertrag: × ${fmt(r.region.ertrag)} kWh/kWp (${r.region.label}) = ${fmt(r.kwh / 1e6, 2)} GWh im ersten Jahr.`,
      modellText,
      ...(vorlauf
        ? [`Vorlauf: ${vorlauf} Jahre Reservierungsprämie von ${fmt(e.reservierungProHa ?? PACHT.reservierungProHa.min)} €/ha; die Fläche wird weiter bewirtschaftet, der Deckungsbeitrag zählt in diesen Jahren hinzu.`]
        : []),
      `Vergleich: heutige Ackerpacht ${fmt(e.ackerProHa ?? PACHT.ackerProHa)} €/ha und Deckungsbeitrag ${fmt(e.dbProHa ?? PACHT.deckungsbeitragAcker.mittel)} €/ha, beide vereinfacht mit +${pct(PACHT.indexierung)} pro Jahr fortgeschrieben.`,
      "Alle Beträge nominal, ohne Abzinsung und vor Steuern.",
    ],
    tabelle: {
      titel: "Einnahmen im Zeitverlauf (kumuliert)",
      spalten: ["Jahr", "Solarpacht im Jahr", "Summe Solarpacht", "Summe Ackerpacht", "Summe Deckungsbeitrag"],
      zeilen: zeilen.map((j) => [`${j.jahr}${j.betrieb ? "" : " (Vorlauf)"}`, fmtEur(j.solar), fmtEur(j.sumSolar), fmtEur(j.sumAcker), fmtEur(j.sumDb)]),
    },
    listen: [],
    hinweise: ["Das konkrete Pachtangebot hängt von Netzanschluss, Flächenkulisse und Baurecht ab."],
  };
}

function zusammenfassungPachtangebot(r, e, land) {
  const { markt } = rechenbasisFuer({ land, regionId: e.regionId });
  const { PACHT } = markt;
  const opt = (liste, id) => OPTIONEN[liste]?.find((o) => o.id === id)?.label || id;
  return {
    urteil: { titel: r.urteil.titel, text: r.urteil.text, stufe: r.urteil.id },
    kennzahlen: [
      kz("Gesamturteil", r.urteil.titel, `${r.zaehler.gut} marktüblich · ${r.zaehler.pruefen} prüfen · ${r.zaehler.kritisch} kritisch`),
      kz(`Summe ${r.jahre.length} Jahre`, fmtEur(r.summe), `Ø ${fmt(r.durchschnittProHa)} €/ha·a, nominal`),
      kz("Barwert heute", fmtEur(r.barwert), `abgezinst mit ${pct(r.eingabe.diskont)}`),
      kz("Pacht im 1. Betriebsjahr", `${fmt(r.proHaErstesJahr)} €/ha`, fmtEur(r.proHaErstesJahr * r.eingabe.ha)),
      kz("Gegenüber Marktmitte", r.anteilMarktMittel != null ? `${fmt(r.anteilMarktMittel * 100)} %` : "–", "Barwert, gleicher Vorlauf"),
    ],
    eingabenText: [
      ["Fläche", `${fmt(r.eingabe.ha, r.eingabe.ha % 1 ? 1 : 0)} ha, ${FLAECHENARTEN.find((f) => f.id === r.eingabe.flaechenart)?.label}`],
      ["Region", regionLabel(r.eingabe.regionId)],
      ["Pachtmodell", MODELLE.find((m) => m.id === r.eingabe.modell)?.label],
      ...(r.eingabe.modell === "fest" ? [["Pacht", `${fmt(r.eingabe.proHa)} €/ha·a`]] : [["Umsatzbeteiligung", pct(r.eingabe.umsatzAnteil)]]),
      ...(r.eingabe.modell === "kombi" ? [["Mindestpacht", `${fmt(r.eingabe.mindestProHa)} €/ha·a`]] : []),
      ...(r.eingabe.modell !== "umsatz" ? [["Wertsicherung", INDEXARTEN.find((i) => i.id === r.eingabe.indexArt)?.label + (r.eingabe.indexArt === "fest" ? ` (${pct(r.eingabe.indexSatz, 2)} p. a.)` : "")]] : []),
      ["Laufzeit", `${r.eingabe.laufzeit} Jahre + ${r.eingabe.verlaengerungJahre} Jahre Verlängerungsoption`],
      ["Reservierungsprämie", `${fmt(r.eingabe.reservierungProHa)} €/ha·a, ${r.eingabe.vorlaufJahre} Jahre bis Baubeginn`],
      ["Rückbausicherheit", opt("rueckbau", r.eingabe.rueckbau)],
      ["Dienstbarkeit", opt("dienstbarkeit", r.eingabe.dienstbarkeit)],
      ["Kalkulationszins", pct(r.eingabe.diskont)],
    ],
    rechenweg: [
      `Zahlungsreihe: ${r.eingabe.vorlaufJahre} Jahre Reservierungsprämie (${fmt(r.eingabe.reservierungProHa)} €/ha), danach ${r.eingabe.laufzeit} Jahre Pacht laut Modell „${MODELLE.find((m) => m.id === r.eingabe.modell)?.label}“. Verlängerungsoptionen sind nicht eingerechnet.`,
      `Barwert: jede Zahlung abgezinst mit ${pct(r.eingabe.diskont)} pro Jahr.`,
      `Marktvergleich: Barwert eines marktüblichen Angebots bei gleichem Vorlauf – Festpacht ${fmt(r.spanne.min)} / ${fmt(r.spanne.mittel)} / ${fmt(r.spanne.max)} €/ha (untere/mittlere/obere Spanne), Wertsicherung +${pct(PACHT.indexierung)} pro Jahr, Reservierungsprämie ${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €/ha.`,
      `Klauseln: ${r.klauseln.length} Punkte nach festen Regeln bewertet (marktüblich / prüfen / kritisch). Das Gesamturteil folgt aus der Zahl kritischer Punkte und der Pachthöhe.`,
    ],
    tabelle: null,
    listen: [
      { titel: "Klauseln im Einzelnen", art: "klauseln", eintraege: r.klauseln.map((k) => ({ titel: k.titel, wert: k.wert, stufe: k.ampel, stufeText: AMPEL_LABEL[k.ampel], text: k.text })) },
      { titel: "Fragen an den Projektierer", art: "fragen", eintraege: r.fragen.map((f) => ({ titel: f.thema, text: f.frage })) },
    ],
    hinweise: ["Fachliche Orientierung, keine Rechtsberatung. Lassen Sie den Vertragstext vor der Unterschrift anwaltlich prüfen."],
  };
}

function zusammenfassungFlaechencheck(r, e, land) {
  const gs = grundstueck(land);
  const mitPacht = !r.sperre && r.pachtJahr && r.pacht30;
  const ersetze = (t) => (land === "DE" ? t : t.replace(/Flurstücke/g, gs.mehrzahl).replace(/Flurstück/g, gs.einzahl));
  const ampelText = { gruen: "Gut geeignet", gelb: "Bedingt geeignet", rot: "Eher schwierig" }[r.ampel];
  return {
    urteil: { titel: ampelText, text: `${r.score} von 100 Punkten (Heuristik)`, stufe: r.ampel === "gruen" ? "gut" : r.ampel === "gelb" ? "pruefen" : "kritisch" },
    kennzahlen: [
      kz("Einschätzung", ampelText, `${r.score} von 100 Punkten`),
      kz("Mögliche Leistung", `${fmt(r.kwp / 1000, 1)} MWp`, `auf ~${fmt(r.nutzbarHa, 1)} ha nutzbarer Fläche`),
      kz("Stromertrag", `${fmt(r.kwh / 1e6, 1)} GWh/Jahr`, r.region.label),
      ...(mitPacht
        ? [
            kz("Pacht pro Jahr", `${fmtEur(r.pachtJahr.min)} – ${fmtEur(r.pachtJahr.max)}`, `${fmt(r.pachtJahr.min / e.ha)}–${fmt(r.pachtJahr.max / e.ha)} €/ha`),
            kz("Pacht über 30 Jahre", `${fmtEur(r.pacht30.min)} – ${fmtEur(r.pacht30.max)}`, "indexiert, nominal"),
          ]
        : [kz("Pacht", "Rechenlogik in Vorbereitung", `Für ${LAND_NAME[land]} nennen wir keine Pachtspanne, bis die Länderlogik geprüft ist.`)]),
    ],
    eingabenText: [
      ["Land", LAND_NAME[land]],
      ["Region", r.region.label],
      ["Fläche", `${fmt(e.ha, e.ha % 1 ? 1 : 0)} ha`],
      ["Nutzung", NUTZUNGEN.find((n) => n.id === e.nutzung)?.label || "–"],
      ["Besonderheiten", (e.besonderheiten || []).map((id) => BESONDERHEITEN.find((b) => b.id === id)?.label).join(", ") || "keine"],
      ["Entfernung zum Netz", NETZ.find((n) => n.id === e.netz)?.label || "–"],
      ["Eigentum", EIGENTUM.find((x) => x.id === e.eigentum)?.label || "–"],
    ],
    rechenweg: [
      "Punktwertung: Start bei 50 Punkten, je Merkmal (Größe, Nutzung, Besonderheiten, Netzentfernung, Eigentum) Zu- oder Abschläge; harte Ausschlussgründe deckeln die Punktzahl. Ampel: ab 65 Punkten „gut geeignet“, ab 40 „bedingt geeignet“, darunter „eher schwierig“.",
      `Leistung: nutzbare Fläche ÷ Flächenbedarf je MWp; Ertrag mit dem regionalen Wert ${fmt(r.region.ertrag)} kWh/kWp (${r.region.label}).`,
      ...(mitPacht ? ["Pachtspanne: Je höher die Punktzahl, desto weiter oben in der marktüblichen Spanne; 30 Jahre mit jährlicher Indexierung, nominal."] : []),
    ],
    tabelle: null,
    listen: [
      { titel: "So kommt die Bewertung zustande", art: "gruende", eintraege: r.gruende.map((g) => ({ titel: g.punkte ? `${g.punkte > 0 ? "+" : "−"}${Math.abs(g.punkte)} Punkte` : "Hinweis", text: g.text, stufe: g.art === "plus" ? "gut" : g.art === "minus" ? "pruefen" : "info" })) },
      { titel: "Nächste Schritte", art: "schritte", eintraege: r.schritte.map((s) => ({ text: ersetze(s) })) },
    ],
    hinweise: [
      `Erste Einschätzung auf Basis Ihrer Angaben und typischer Marktwerte, Stand ${STAND} – kein Angebot und keine Zusage. Netzkapazität, Planungsrecht und Schutzgüter prüfen wir ${gs.genau}.`,
    ],
  };
}

function zusammenfassungKommune(r) {
  const e = r.eingabe;
  return {
    kennzahlen: [
      kz("Ø pro Jahr", fmtEur(r.proJahr), `in den ersten ${r.N} Jahren`),
      kz(`Summe ${r.N} Jahre`, fmtEur(r.gesamt.summe), "alle Quellen"),
      kz(`Summe ${r.L} Jahre`, fmtEur(r.gesamtLaufzeit.summe), "gesamte Laufzeit"),
      kz("§ 6 EEG-Beteiligung", fmtEur(r.gesamt.p6), `in ${r.N} Jahren`),
      kz("Gewerbesteuer", fmtEur(r.gesamt.gewSt), r.ersteGewSt ? `erstmals im Jahr ${r.ersteGewSt}` : `in ${r.L} Jahren keine`),
      kz("Pacht Gemeindeflächen", fmtEur(r.gesamt.pacht), `in ${r.N} Jahren`),
    ],
    eingabenText: [
      ["Leistung", `${fmt(e.mwp)} MWp (≈ ${fmt(r.flaecheHa, 1)} ha, ${fmt(r.ertragJahr1 / 1e6, 1)} GWh im ersten Jahr)`],
      ["Region", regionLabel(e.regionId)],
      ["Erlös des Parks", `${fmt(e.preisCt, 1)} ct/kWh`],
      ["Gewerbesteuer-Hebesatz", `${fmt(e.hebesatz * 100)} %`],
      ["§ 6 EEG-Beteiligung", e.paragraph6 ? "ja" : "nein"],
      ["Flächen der Gemeinde", e.gemeindeflaeche ? `${fmt(e.anteilGemeinde * 100)} % zu ${fmt(e.pachtHa)} €/ha` : "nein"],
      ["Betreiber mit Sitz in der Gemeinde", e.sitzInGemeinde ? "ja (100 % der Gewerbesteuer)" : `nein (${fmt(KOMMUNE.gewerbesteuerStandort * 100)} %)`],
    ],
    rechenweg: [
      `§ 6 EEG: ${fmt(KOMMUNE.beteiligungCt, 1)} ct je geförderter kWh, nur in der EEG-Förderphase und ohne Zeiten negativer Preise (§ 6 Abs. 5 und § 51 EEG).`,
      `Gewerbesteuer: Gewinn des Parks (EBITDA − Abschreibung über ${KOMMUNE.afaJahre} Jahre − Zinsen) + Hinzurechnung von ${pct(KOMMUNE.hinzurechnungZinsen, 0)} der Zinsen über ${fmtEur(KOMMUNE.hinzurechnungFreibetrag)}, Verlustvortrag verrechnet; × Messzahl ${pct(KOMMUNE.messzahl)} × Hebesatz ${fmt(e.hebesatz * 100)} % × Anteil der Standortgemeinde.`,
      ...(e.gemeindeflaeche ? [`Pacht: ${fmt(r.flaecheHa, 1)} ha × ${fmt(e.anteilGemeinde * 100)} % × ${fmt(e.pachtHa)} €/ha, jährlich indexiert.`] : []),
      `Investition des Parks ≈ ${fmtEur(r.investition)} (Solarpark-Rechenlogik, Bauart ${BAUART[e.bauart]?.label || e.bauart}).`,
    ],
    tabelle: {
      titel: "Einnahmen nach Jahren",
      spalten: ["Jahr", "§ 6 EEG", "Gewerbesteuer", "Pacht", "Summe"],
      zeilen: r.jahre.filter((j) => j.jahr === 1 || j.jahr % 5 === 0).map((j) => [String(j.jahr), fmtEur(j.p6), fmtEur(j.gewSt), fmtEur(j.pacht), fmtEur(j.summe)]),
    },
    listen: [],
    hinweise: [
      `Landesgesetze zur Beteiligung (${r.landesregeln.laender.join(", ")}; Stand ${r.landesregeln.stand}) sind nicht eingerechnet – dort kann die Gemeinde mehr erhalten.`,
      "Vereinfachte Modellrechnung für Deutschland, keine Steuerberatung.",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Positivliste                                                        */
/* ------------------------------------------------------------------ */

const regionLand = (e, land) => {
  if (e.regionId && landVonRegion(e.regionId) !== land) throw new PlattformFehler(422, "Region und Land passen nicht zusammen.", "eingabe");
};

export const RECHNER = Object.freeze({
  pacht: Object.freeze({
    titel: "Pachtrechner Solarpark",
    pfad: seitenPfad("/rechner/pacht"),
    vorgangTyp: "flaeche",
    regeln: {
      ha: zahl(0.1, 1000),
      regionId: wahl(REGION_IDS),
      modell: wahl(ids(PACHTMODELLE)),
      proHa: zahl(0, 10000),
      umsatzAnteil: zahl(0, 0.25),
      mindestProHa: zahl(0, 10000),
      laufzeit: zahl(10, 50, { ganz: true }),
      ackerProHa: zahl(0, 3000),
      dbProHa: zahl(0, 3000),
      vorlaufJahre: zahl(0, 10, { ganz: true }),
      reservierungProHa: zahl(0, 2000),
    },
    landPruefen: regionLand,
    rechne: (e, land) => pachtRechnung({ ...e, land }),
    zusammenfassen: zusammenfassungPacht,
    geldwerte: true,
  }),
  pachtangebot: Object.freeze({
    titel: "Pachtangebot-Check",
    pfad: seitenPfad("/rechner/pachtangebot-check"),
    vorgangTyp: "flaeche",
    regeln: {
      ha: zahl(0.1, 1000),
      regionId: wahl(REGION_IDS),
      flaechenart: wahl(ids(FLAECHENARTEN)),
      modell: wahl(ids(MODELLE)),
      proHa: zahl(0, 20000),
      umsatzAnteil: zahl(0, 0.25),
      mindestProHa: zahl(0, 20000),
      laufzeit: zahl(5, 60, { ganz: true }),
      verlaengerungJahre: zahl(0, 40, { ganz: true }),
      indexArt: wahl(ids(INDEXARTEN)),
      indexSatz: zahl(0, 0.1),
      reservierungProHa: zahl(0, 2000),
      vorlaufJahre: zahl(0, 15, { ganz: true }),
      optionsfrist: zahl(0, 20, { ganz: true }),
      ...Object.fromEntries(Object.entries(OPTIONEN).map(([k, liste]) => [k, wahl(ids(liste))])),
      rangruecktritt: jaNein(),
      anwaltBetrag: zahl(0, 50000),
      diskont: zahl(0, 0.15),
    },
    landPruefen: regionLand,
    rechne: (e, land) => pruefePachtangebot({ ...e, land }),
    zusammenfassen: zusammenfassungPachtangebot,
    geldwerte: true,
  }),
  flaechencheck: Object.freeze({
    titel: "Flächencheck",
    pfad: seitenPfad("/flaechencheck"),
    vorgangTyp: "flaeche",
    regeln: {
      land: wahl(LAENDER),
      regionId: wahl(REGION_IDS),
      ha: zahl(0.1, 2000),
      nutzung: wahl(ids(NUTZUNGEN)),
      besonderheiten: mehrfach(ids(BESONDERHEITEN)),
      netz: wahl(ids(NETZ)),
      eigentum: wahl(ids(EIGENTUM)),
    },
    landPruefen: (e, land) => {
      if (e.land && e.land !== land) throw new PlattformFehler(422, "Region und Land passen nicht zusammen.", "eingabe");
      if (e.regionId && !regionenFuer(land).some((r) => r.id === e.regionId)) throw new PlattformFehler(422, "Region und Land passen nicht zusammen.", "eingabe");
    },
    rechne: (e, land) => flaechencheck({ ...e, land }),
    zusammenfassen: zusammenfassungFlaechencheck,
    geldwerte: false, // gesperrte Länder: Ergebnis ohne Pachtwerte (wie im Browser)
  }),
  kommune: Object.freeze({
    titel: "Kommunalrechner Solarpark",
    pfad: seitenPfad("/rechner/kommune"),
    vorgangTyp: "kommune",
    regeln: {
      mwp: zahl(1, 500),
      regionId: wahl(REGIONEN.filter((r) => r.land === "DE").map((r) => r.id)),
      bauart: wahl(Object.keys(BAUART)),
      hebesatz: zahl(KOMMUNE.hebesatzSpanne.min, KOMMUNE.hebesatzSpanne.max),
      paragraph6: jaNein(),
      gemeindeflaeche: jaNein(),
      anteilGemeinde: zahl(0, 1),
      pachtHa: zahl(0, 10000),
      sitzInGemeinde: jaNein(),
      preisCt: zahl(1, 20),
    },
    landPruefen: regionLand,
    rechne: (e, land) => rechneKommune({ ...e, land }),
    zusammenfassen: zusammenfassungKommune,
    geldwerte: true,
  }),
  // Welle 3, Paket B5: Rechnungs-Check Gewerbestrom – nur Deutschland, ohne Region (src/lib/bericht/gewerbestrom.js)
  gewerbestrom: Object.freeze({
    titel: "Rechnungs-Check Gewerbestrom",
    pfad: seitenPfad("/rechner/gewerbestrom-check"),
    vorgangTyp: "reststrom",
    regeln: regelnGewerbestrom({ zahl, wahl, jaNein }),
    landPruefen: (e, land) => {
      if (land !== "DE") throw new PlattformFehler(422, "Den Rechnungs-Check Gewerbestrom gibt es bisher nur für Deutschland.", "land_gesperrt");
    },
    rechne: (e) => rechneGewerbestrom(e),
    zusammenfassen: zusammenfassungGewerbestrom,
    geldwerte: true,
    ohneRegion: true,
  }),
  // Welle 3, Paket B6: Flächenpass Stufe 1 – DE, AT, CH, ohne Geldwerte; Fläche als Zeichenkette (src/lib/bericht/flaechenpass.js)
  flaechenpass: Object.freeze({
    titel: "Flächenpass",
    pfad: seitenPfad("/rechner/flaechenpass"),
    vorgangTyp: "flaeche",
    regeln: regelnFlaechenpass({ zahl, wahl, eigen }),
    landPruefen: landPruefenFlaechenpass,
    normalisieren: normalisierenFlaechenpass,
    rechne: rechneFlaechenpass,
    zusammenfassen: zusammenfassungFlaechenpass,
    geldwerte: false,
  }),
  // Welle 3, Paket B8: Ratsvorlage Solarpark (Muster) – DE mit Zahlen des Kommunal-Rechners und Landesregel,
  // AT ohne Geldwerte (Widmungskit), CH 422 (src/lib/bericht/ratsvorlage.js)
  ratsvorlage: Object.freeze({
    titel: "Ratsvorlage Solarpark (Muster)",
    pfad: seitenPfad("/kommunen/ratsvorlage"),
    vorgangTyp: "kommune",
    regeln: regelnRatsvorlage({ zahl, wahl, jaNein, eigen }),
    landPruefen: landPruefenRatsvorlage,
    normalisieren: normalisierenRatsvorlage,
    rechne: rechneRatsvorlage,
    zusammenfassen: zusammenfassungRatsvorlage,
    geldwerte: false, // Länder-Sperre selbst geregelt: AT ohne Geldwerte, CH 422
  }),
});

export const RECHNER_IDS = Object.freeze(Object.keys(RECHNER));

/** Rechner aus der Positivliste oder 422 */
export function rechnerVon(id) {
  if (typeof id !== "string" || !Object.hasOwn(RECHNER, id)) throw new PlattformFehler(422, "Für diesen Rechner gibt es keinen Bericht.", "rechner");
  return RECHNER[id];
}

/** Land DE | AT | CH oder 422 */
export function landPruefen(land) {
  const l = typeof land === "string" ? land.trim().toUpperCase() : "";
  if (!LAENDER.includes(l)) throw new PlattformFehler(422, "Bitte ein Land angeben (DE, AT oder CH).", "land");
  return l;
}

/** Stabile JSON-Darstellung (sortierte Schlüssel) – Grundlage der Prüf-ID */
export function stabil(x) {
  if (Array.isArray(x)) return `[${x.map(stabil).join(",")}]`;
  if (x && typeof x === "object") return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${stabil(x[k])}`).join(",")}}`;
  return JSON.stringify(x);
}

/** Prüf-ID: 16 Hex-Zeichen in Vierergruppen, z. B. „3F2A-91C0-…“ */
export function pruefIdFuer({ rechner, land, eingaben, stand = STAND_RECHENLOGIK }) {
  const h = createHash("sha256").update(stabil({ rechner, land, eingaben, stand }), "utf8").digest("hex").slice(0, 16).toUpperCase();
  return h.match(/.{4}/g).join("-");
}

/**
 * Neuberechnung auf dem Server.
 * @returns {{ rechner, titel, land, eingaben, roh, ergebnis, pruefId, stand, vorgangTyp }}
 *   roh: vollständiges Rechnerergebnis (nur für Tests/Vorgang, wird nicht gespeichert)
 *   ergebnis: Zusammenfassung für die Berichtsseite (Kennzahlen, Rechenweg, Tabellen, Hinweise)
 */
export function neuRechnen({ rechner, eingaben, land }) {
  const def = rechnerVon(rechner);
  const l = landPruefen(land);
  const e = eingabenPruefen(def.regeln, eingaben);
  def.landPruefen(e, l);
  const eingabenNorm = rechner === "flaechencheck" ? { ...e, land: l } : def.normalisieren ? def.normalisieren(e, l) : def.ohneRegion ? { ...e } : { ...e, regionId: e.regionId ?? standardRegion(l) };
  if (def.geldwerte && laenderSperre(l)) throw new PlattformFehler(422, `Für ${LAND_NAME[l]} ist dieser Bericht noch nicht verfügbar – die Rechenlogik wird gerade fachlich geprüft.`, "land_gesperrt");
  const roh = def.rechne(eingabenNorm, l);
  const zusammenfassung = def.zusammenfassen(roh, eingabenNorm, l);
  return {
    rechner,
    titel: def.titel,
    land: l,
    eingaben: eingabenNorm,
    roh,
    ergebnis: { ...zusammenfassung, sperre: roh.sperre ? { titel: roh.sperre.titel, text: roh.sperre.text } : null },
    pruefId: pruefIdFuer({ rechner, land: l, eingaben: eingabenNorm }),
    stand: STAND_RECHENLOGIK,
    vorgangTyp: def.vorgangTyp,
  };
}
