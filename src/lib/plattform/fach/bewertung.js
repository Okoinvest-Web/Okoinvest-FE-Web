// src/lib/plattform/fach/bewertung.js
//
// Bewertungswerkzeug im Portal: Projekt aus der Börse direkt in die Renditerechnung übernehmen – vorbelegt aus
// Datenblatt und Exposé, jede Annahme überschreibbar, Szenarien speicherbar (Backend: fach.szenario*).
//  - Entwicklungsprojekte (Phase bis RTB): Solarpark-Renditerechnung (rechner/solarpark.js) mit Kaufpreis der
//    Projektrechte + Restentwicklungskosten als Entwicklungskosten; P50- und P90-Fall; maximaler Kaufpreis für
//    ein Ziel-Eigenkapital-IRR (Bisektion).
//  - Bestandsanlagen (COD): Ertragswert/DCF (rechner/bestandsanlage.js) mit Ist-Ertrag; IRR zum Kaufpreis;
//    Wert beim Ziel-Diskontsatz.
// Reine Funktionen; Ergebnisse sind Orientierung vor Due Diligence, keine Anlageberatung.

import { ERLOESE, FINANZIERUNG, FREIFLAECHE, PACHT, PHASEN, BAUART, BESTAND, regionById } from "../../invest/markt.js";
import { rechneSolarpark } from "../../rechner/solarpark.js";
import { rechneBestand, verguetungRichtwert } from "../../rechner/bestandsanlage.js";
import { bauartFuer, regionFuerProjekt } from "./datenblatt.js";

/** Restliche Entwicklungskosten bis RTB je Phase (€/kWp) – Orientierung aus FREIFLAECHE.entwicklungProKwp */
const REST_ENTWICKLUNG = (() => {
  const { min, max } = FREIFLAECHE.entwicklungProKwp;
  const mitte = (min + max) / 2;
  return { flaeche: Math.round(mitte * 0.9), netz: Math.round(mitte * 0.75), aufstellung: Math.round(mitte * 0.5), satzung: Math.round(mitte * 0.2), rtb: 0, cod: 0 };
})();

/** Felder des Werkzeugs: id, label, einheit, min, max, schritt; modus: entwicklung | bestand | beide */
export const BEWERTUNG_FELDER = [
  { id: "kaufpreisKwp", label: "Kaufpreis Projektrechte", einheit: "€/kWp", min: 0, max: 2000, schritt: 1, modus: "entwicklung" },
  { id: "restentwicklungKwp", label: "Restliche Entwicklungskosten bis RTB", einheit: "€/kWp", min: 0, max: 200, schritt: 1, modus: "entwicklung" },
  { id: "capexKwp", label: "Capex (EPC)", einheit: "€/kWp", min: 200, max: 2500, schritt: 5, modus: "entwicklung" },
  { id: "netzKm", label: "Kabeltrasse zum Netzverknüpfungspunkt", einheit: "km", min: 0, max: 50, schritt: 0.1, modus: "entwicklung" },
  { id: "p50", label: "Spezifischer Ertrag P50", einheit: "kWh/kWp", min: 500, max: 2000, schritt: 1, modus: "entwicklung" },
  { id: "p90", label: "Spezifischer Ertrag P90", einheit: "kWh/kWp", min: 400, max: 2000, schritt: 1, modus: "entwicklung" },
  { id: "modell", label: "Erlösmodell", typ: "auswahl", optionen: [["eeg", "Förderung/Zuschlag (EEG, EAG)"], ["ppa", "PPA"], ["merchant", "Merchant"]], modus: "entwicklung" },
  { id: "preisCt", label: "Zuschlag bzw. PPA-Preis", einheit: "ct/kWh", min: 0, max: 30, schritt: 0.01, modus: "entwicklung" },
  { id: "vertragJahre", label: "Vertragslaufzeit", einheit: "Jahre", min: 0, max: 30, schritt: 1, modus: "entwicklung" },
  { id: "merchantCt", label: "Marktwert Solar (nach Vertrag)", einheit: "ct/kWh", min: 0, max: 20, schritt: 0.1, modus: "beide" },
  { id: "pachtHa", label: "Pacht", einheit: "€/ha·a", min: 0, max: 20000, schritt: 10, modus: "entwicklung" },
  { id: "opexKwp", label: "Opex ohne Pacht", einheit: "€/kWp·a", min: 0, max: 60, schritt: 0.5, modus: "beide" },
  { id: "fkQuote", label: "Fremdkapitalquote", einheit: "%", min: 0, max: 90, schritt: 1, prozent: true, modus: "entwicklung" },
  { id: "zins", label: "Zins Fremdkapital", einheit: "%", min: 0, max: 12, schritt: 0.05, prozent: true, modus: "entwicklung" },
  { id: "tilgungJahre", label: "Tilgungsdauer", einheit: "Jahre", min: 5, max: 30, schritt: 1, modus: "entwicklung" },
  { id: "ertragKwhKwp", label: "Ist-Ertrag (Mittel)", einheit: "kWh/kWp", min: 300, max: 2000, schritt: 1, modus: "bestand" },
  { id: "verguetungCt", label: "Vergütung / anzulegender Wert", einheit: "ct/kWh", min: 0, max: 60, schritt: 0.01, modus: "bestand" },
  { id: "pachtJahr", label: "Pacht gesamt", einheit: "€/a", min: 0, max: 5000000, schritt: 100, modus: "bestand" },
  { id: "pachtEndeJahr", label: "Pacht bis", einheit: "Jahr", min: 2025, max: 2080, schritt: 1, modus: "bestand" },
  { id: "kaufpreis", label: "Kaufpreis", einheit: "€", min: 0, max: 1e10, schritt: 1000, modus: "bestand" },
  { id: "zielRenditePct", label: "Ziel-Rendite (EK-IRR bzw. Diskontsatz)", einheit: "%", min: 1, max: 20, schritt: 0.1, modus: "beide" },
];
export const BEWERTUNG_IDS = BEWERTUNG_FELDER.map((f) => f.id);

const r2 = (x) => Math.round(x * 100) / 100;

/**
 * Vorbelegung aus Projekt (öffentliche Felder), vertraulichen Angaben und Datenblatt.
 * @returns {{modus, eingaben, quellen: {id: "Datenblatt"|"Exposé"|"Markt"}, hinweise: string[]}}
 */
export function bewertungVorbelegung(p, vertraulich = {}, datenblatt = {}, { zielRenditePct } = {}) {
  const db = datenblatt || {};
  const vt = vertraulich || {};
  const quellen = {};
  const hinweise = [];
  const setze = (id, wert, quelle) => {
    quellen[id] = quelle;
    return wert;
  };
  const mwp = Number(p?.mwp) || 0;
  const kwp = mwp * 1000;
  const phase = PHASEN.find((x) => x.id === p?.phase) || PHASEN[0];
  const bestand = phase.id === "cod";
  const region = regionById(regionFuerProjekt(p));
  const bauartId = bauartFuer(db.aufstaenderung, p?.typ);
  const bauart = BAUART[bauartId];
  const eingaben = { mwp, regionId: region.id, bauart: bauartId };

  const preisGesamt = p?.preisModus === "gesamt" && p?.preis ? Number(p.preis) : p?.preisModus === "proKwp" && p?.preisProKwp ? Number(p.preisProKwp) * kwp : null;
  const ziel = zielRenditePct ?? FINANZIERUNG.diskont * 100; // Eigenkapitalrendite-Erwartung aus markt.js
  eingaben.zielRenditePct = setze("zielRenditePct", r2(ziel), zielRenditePct ? "Suchprofil" : "Markt");
  eingaben.merchantCt = setze("merchantCt", ERLOESE.merchantCt, "Markt");
  eingaben.opexKwp = db.opexEurKwp ? setze("opexKwp", db.opexEurKwp, "Datenblatt") : setze("opexKwp", bestand ? BESTAND.opexProKwp : FREIFLAECHE.opexProKwp, "Markt");

  if (bestand) {
    const ibnJahr = db.codDatum ? Number(db.codDatum.slice(0, 4)) : new Date().getUTCFullYear() - 5;
    eingaben.ibnJahr = ibnJahr;
    eingaben.kwp = kwp;
    const ist = (db.ertraege || []).filter((z) => z.istMwh > 0);
    if (ist.length && kwp) eingaben.ertragKwhKwp = setze("ertragKwhKwp", Math.round((ist.reduce((s, z) => s + z.istMwh, 0) / ist.length / kwp) * 1000), "Datenblatt");
    else if (vt.ertragKwhKwp) eingaben.ertragKwhKwp = setze("ertragKwhKwp", Number(vt.ertragKwhKwp), "Exposé");
    else eingaben.ertragKwhKwp = setze("ertragKwhKwp", Math.round(region.ertrag * bauart.faktor * 0.97), "Markt");
    eingaben.verguetungCt = db.eegZuschlagCt ? setze("verguetungCt", db.eegZuschlagCt, "Datenblatt") : setze("verguetungCt", verguetungRichtwert(ibnJahr), "Markt");
    eingaben.modell = ibnJahr >= 2014 ? "marktpraemie" : "fest";
    const ha = Number(p?.flaecheHa) || mwp * bauart.haProMwp;
    eingaben.pachtJahr = db.pachtEurHa ? setze("pachtJahr", Math.round(db.pachtEurHa * ha), "Datenblatt") : setze("pachtJahr", Math.round(PACHT.freiflaecheProHa.mittel * ha), "Markt");
    eingaben.pachtEndeJahr = db.pachtEnde ? setze("pachtEndeJahr", Number(db.pachtEnde.slice(0, 4)), "Datenblatt") : setze("pachtEndeJahr", ibnJahr + 30, "Markt");
    eingaben.pachtVerlaengerbar = false;
    eingaben.wrTausch = db.wrTausch !== "erfolgt";
    eingaben.kaufpreis = preisGesamt ? setze("kaufpreis", Math.round(preisGesamt), "Exposé") : setze("kaufpreis", Math.round(((phase.preisProKwp.min + phase.preisProKwp.max) / 2) * kwp), "Markt");
    eingaben.typ = p?.typ === "dach" ? "dach" : "freiflaeche";
    if (!ist.length) hinweise.push("Keine Ist-Erträge im Datenblatt – Bewertung mit Gutachten- bzw. Regionswert.");
    return { modus: "bestand", eingaben, quellen, hinweise };
  }

  // Entwicklungsprojekt
  eingaben.kaufpreisKwp = preisGesamt && kwp ? setze("kaufpreisKwp", r2(preisGesamt / kwp), "Exposé") : setze("kaufpreisKwp", Math.round((phase.preisProKwp.min + phase.preisProKwp.max) / 2), "Markt");
  if (!preisGesamt) hinweise.push("Kaufpreis „auf Anfrage“ – vorbelegt mit der Mitte der Marktspanne der Phase.");
  eingaben.restentwicklungKwp = setze("restentwicklungKwp", REST_ENTWICKLUNG[phase.id] ?? 0, "Markt");
  eingaben.capexKwp = db.capexEurKwp ? setze("capexKwp", db.capexEurKwp, "Datenblatt") : setze("capexKwp", FREIFLAECHE.capexProKwp.mittel, "Markt");
  eingaben.netzKm = vt.entfernungNetzKm !== undefined && vt.entfernungNetzKm !== "" && vt.entfernungNetzKm !== null ? setze("netzKm", Number(vt.entfernungNetzKm), "Exposé") : setze("netzKm", 1, "Markt");
  const p50 = Number(vt.ertragKwhKwp) || null;
  eingaben.p50 = p50 ? setze("p50", p50, "Exposé") : setze("p50", Math.round(region.ertrag * bauart.faktor), "Markt");
  eingaben.p90 = db.ertragP90 ? setze("p90", db.ertragP90, "Datenblatt") : setze("p90", Math.round(eingaben.p50 * 0.92), "Markt");
  if (!db.ertragP90) hinweise.push("Kein P90 im Datenblatt – angesetzt mit 92 % von P50 (typische 1-Jahres-Unsicherheit).");
  const vm = db.vermarktung;
  if ((vm === "eeg" || vm === "eag") && db.eegZuschlagCt) {
    eingaben.modell = setze("modell", "eeg", "Datenblatt");
    eingaben.preisCt = setze("preisCt", db.eegZuschlagCt, "Datenblatt");
    eingaben.vertragJahre = setze("vertragJahre", 20, "Markt");
  } else if (vm === "ppa" && db.ppaPreisCt) {
    eingaben.modell = setze("modell", "ppa", "Datenblatt");
    eingaben.preisCt = setze("preisCt", db.ppaPreisCt, "Datenblatt");
    eingaben.vertragJahre = db.ppaLaufzeitJahre ? setze("vertragJahre", db.ppaLaufzeitJahre, "Datenblatt") : setze("vertragJahre", 10, "Markt");
  } else if (vm === "merchant") {
    eingaben.modell = setze("modell", "merchant", "Datenblatt");
    eingaben.preisCt = setze("preisCt", ERLOESE.merchantCt, "Markt");
    eingaben.vertragJahre = 0;
  } else {
    eingaben.modell = setze("modell", "eeg", "Markt");
    eingaben.preisCt = setze("preisCt", ERLOESE.eegFreiflaecheCt, "Markt");
    eingaben.vertragJahre = setze("vertragJahre", 20, "Markt");
    hinweise.push("Vermarktung noch offen – angesetzt mit dem durchschnittlichen EEG-Zuschlagswert.");
  }
  // Pacht: Rechenkern setzt Fläche = MWp × ha/MWp der Bauart – auf die tatsächliche Fläche umrechnen
  const pachtBasis = db.pachtEurHa || (p?.typ === "agri" ? PACHT.agriProHa.mittel : PACHT.freiflaecheProHa.mittel);
  const haIst = Number(p?.flaecheHa) || 0;
  const haModell = mwp * bauart.haProMwp;
  eingaben.pachtHa = setze("pachtHa", Math.round(haIst && haModell ? (pachtBasis * haIst) / haModell : pachtBasis), db.pachtEurHa ? "Datenblatt" : "Markt");
  if (["dach", "carport", "speicher"].includes(p?.typ)) hinweise.push("Der Rechenkern ist für Freiflächenanlagen ausgelegt – für Dach, Carport und Speicher nur grobe Orientierung.");
  eingaben.fkQuote = setze("fkQuote", FINANZIERUNG.fremdkapitalQuote * 100, "Markt");
  eingaben.zins = setze("zins", FINANZIERUNG.zins * 100, "Markt");
  eingaben.tilgungJahre = setze("tilgungJahre", FINANZIERUNG.tilgungJahre, "Markt");
  return { modus: "entwicklung", eingaben, quellen, hinweise };
}

/** Eingaben begrenzen (Server: gespeicherte Szenarien; Client: Formular) */
export function bewertungBereinigen(e = {}) {
  const out = {};
  for (const f of BEWERTUNG_FELDER) {
    const v = e[f.id];
    if (f.typ === "auswahl") {
      if (f.optionen.some(([id]) => id === v)) out[f.id] = v;
      continue;
    }
    const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
    if (v !== "" && v !== null && v !== undefined && Number.isFinite(n)) out[f.id] = Math.min(f.max, Math.max(f.min, n));
  }
  // Leistung/Jahr nur plausibel übernehmen: "" bzw. null ergäben Number() = 0 → Division durch 0 (€/kWp = Infinity)
  const GRENZEN = { mwp: [0.001, 5000], kwp: [1, 5e6], ibnJahr: [1990, 2100] };
  for (const k of ["mwp", "kwp", "ibnJahr"]) {
    const x = e[k] === "" || e[k] === null || e[k] === undefined ? NaN : Number(e[k]);
    if (Number.isFinite(x) && x >= GRENZEN[k][0] && x <= GRENZEN[k][1]) out[k] = x;
  }
  for (const k of ["regionId", "bauart", "typ"]) if (typeof e[k] === "string" && /^[a-zA-Z-]{2,20}$/.test(e[k])) out[k] = e[k];
  if (e.modus === "bestand" || e.modus === "entwicklung") out.modus = e.modus;
  return out;
}

function entwicklungRechnen(e, spezErtrag, { fkQuote, begrenzen = true } = {}) {
  return rechneSolarpark({
    mwp: e.mwp,
    regionId: e.regionId,
    bauart: e.bauart,
    spezErtrag,
    capexKwp: e.capexKwp,
    entwicklungKwp: (e.kaufpreisKwp || 0) + (e.restentwicklungKwp || 0),
    netzKm: e.netzKm,
    modell: e.modell,
    preisCt: e.modell === "merchant" ? e.merchantCt : e.preisCt,
    vertragJahre: e.vertragJahre,
    merchantCt: e.merchantCt,
    pachtHa: e.pachtHa,
    opexKwp: e.opexKwp,
    fkQuote: fkQuote ?? (e.fkQuote ?? 75) / 100,
    zins: (e.zins ?? 4.5) / 100,
    tilgungJahre: e.tilgungJahre,
    dscrBegrenzen: begrenzen,
  });
}

/** Bankpraxis: Darlehen auf P90 bemessen (Mindest-DSCR), Eigenkapitalrendite im P50-Fall mit diesem Darlehen */
function entwicklungPaar(e) {
  const r90 = entwicklungRechnen(e, e.p90);
  const r50 = entwicklungRechnen(e, e.p50, { fkQuote: r90.fkQuoteEff, begrenzen: false });
  return { r50, r90 };
}

/**
 * Rechnen. Entwicklung: P50/P90, max. Kaufpreis für Ziel-EK-IRR (P50). Bestand: Wert zum Ziel-Diskont, IRR zum Kaufpreis.
 */
export function bewertungRechnen(modus, eingaben) {
  const e = { ...eingaben };
  const ziel = (e.zielRenditePct ?? 7.5) / 100;
  if (modus === "bestand") {
    const r = rechneBestand({ ...e, diskont: ziel, merchantCt: e.merchantCt, opexKwp: e.opexKwp });
    return {
      modus,
      wert: Math.round(r.wert),
      wertProKwp: Math.round(r.wertProKwp),
      spanne: { min: Math.round(r.spanne.min), max: Math.round(r.spanne.max) },
      kaufIrr: r.kaufIrr,
      restJahre: r.restJahre,
      foerderRest: r.foerderRest,
      performance: r.performance,
      einordnung: r.einordnung,
      cfJahr1: Math.round(r.cfJahr1),
      maxKaufpreis: Math.round(r.wert),
    };
  }
  const { r50: p50, r90: p90 } = entwicklungPaar(e);
  // Max. Kaufpreis (€/kWp), bei dem der EK-IRR im P50-Fall (Darlehen nach P90) das Ziel erreicht
  let maxKwp = null;
  const irrBei = (preis) => entwicklungPaar({ ...e, kaufpreisKwp: preis }).r50.ekIrr;
  const lo0 = irrBei(0);
  if (lo0 !== null && lo0 >= ziel) {
    let lo = 0;
    let hi = 1500;
    if ((irrBei(hi) ?? -1) >= ziel) maxKwp = hi;
    else {
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if ((irrBei(mid) ?? -1) >= ziel) lo = mid;
        else hi = mid;
      }
      maxKwp = Math.floor(lo);
    }
  }
  const zusammen = (r) => ({
    projektIrr: r.projektIrr,
    ekIrr: r.ekIrr,
    dscrMin: r.dscrMin,
    lcoeCt: r.lcoeCt,
    kapitalwert: Math.round(r.kapitalwert),
    investition: Math.round(r.investition.summe),
    investProKwp: Math.round(r.investProKwp),
    fk: Math.round(r.fk),
    ek: Math.round(r.ek),
    fkBegrenzt: r.fkBegrenzt,
    ertragJahr1Mwh: Math.round(r.ertragJahr1 / 1000),
    amortisation: r.amortisation,
  });
  return {
    modus,
    p50: zusammen(p50),
    p90: zusammen(p90),
    maxKaufpreisKwp: maxKwp,
    maxKaufpreis: maxKwp !== null ? Math.round(maxKwp * e.mwp * 1000) : null,
    kaufpreis: Math.round((e.kaufpreisKwp || 0) * e.mwp * 1000),
    // Darlehen nach P90 bemessen: effektive Fremdkapitalquote und ob die Wunschquote gekürzt wurde
    fkQuoteEff: Math.round(p90.fkQuoteEff * 1000) / 10,
    fkGekuerzt: p90.fkBegrenzt,
  };
}
