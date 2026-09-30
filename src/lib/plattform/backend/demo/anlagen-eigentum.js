// src/lib/plattform/backend/demo/anlagen-eigentum.js
//
// Demo: Eigentum und Betrieb der Contracting-Anlagen einmalig ergänzen (ALLES FIKTIV). Die Anlagen gehören
// ÖkoInvest bzw. einer ÖkoInvest-Projektgesellschaft (SPV); ÖkoInvest verkauft den Strom an den Kunden.
// Der Kunde ist Stromabnehmer und – bei Dach und Carport – Dachgeber. Aufgerufen aus demo/anlagen.js (lesenBereit).
// Bestehende Werte werden nie überschrieben.

import { BETRIEBSFUEHRER_STANDARD, EIGENTUEMER_STANDARD } from "../../anlagen";

const SPV = {
  freiflaeche: { name: "Demo Solarpark Nord GmbH & Co. KG (fiktiv)", bank: "Projektfinanzierung Demo-Bank AG (fiktiv)" },
  agri: { name: "Demo Agri-PV Bodensee GmbH & Co. KG (fiktiv)", bank: "Projektfinanzierung Demo-Förderbank (fiktiv)" },
  at: { name: "Demo Solar Österreich GmbH (fiktiv)", bank: "" },
};

export function eigentumErgaenzen(db) {
  const A = db.anlagen;
  for (const a of A.anlagen || []) {
    if (!a.eigentuemer) {
      const spv = a.land === "AT" && a.typ !== "speicher" ? SPV.at : SPV[a.typ];
      a.eigentuemer = spv ? spv.name : EIGENTUEMER_STANDARD;
      const oi = (db.dienste?.gesellschaften || []).find((g) => g.name === EIGENTUEMER_STANDARD);
      if (!spv && oi && !a.eigentuemerId) a.eigentuemerId = oi.id; // Gesellschaftsverzeichnis (falls schon angelegt)
      if (spv?.bank && !a.finanziertDurch) a.finanziertDurch = spv.bank;
    }
    if (!a.betriebsfuehrer) a.betriebsfuehrer = BETRIEBSFUEHRER_STANDARD;
    if (a.dachgeberIstKunde === undefined && !a.dachgeber) {
      if (["dach", "carport", "speicher"].includes(a.typ)) a.dachgeberIstKunde = true;
      else a.dachgeber = "Grundstückseigentümer (Demo, fiktiv)";
    }
    if (!a.dienstbarkeitStatus) {
      const s = { dach: "eingetragen", freiflaeche: "eingetragen", carport: "beantragt", agri: "vorbereitung", speicher: "nicht_erforderlich" }[a.typ] || "vorbereitung";
      a.dienstbarkeitStatus = s;
      if (s === "eingetragen" || s === "beantragt") a.dienstbarkeitDatum = a.inbetriebnahme || "2024-01-15";
      a.dienstbarkeitHinweis = s === "eingetragen" ? (a.land === "AT" ? "Servitut im Grundbuch (Demo)" : "Beschränkte persönliche Dienstbarkeit, Abt. II (Demo)") : "";
    }
  }
  for (const c of A.vertraege || []) {
    const a = (A.anlagen || []).find((x) => x.id === c.anlageId);
    if (!a || c.endschaft) continue;
    c.indexBasis = Number(c.indexierungPct) > 0 ? "prozent" : "fest";
    if (a.kwp > 0 && Number(c.strompreisCt) > 0) c.mindestabnahmeKwhJahr = Math.round((a.kwp * 950 * 0.5) / 1000) * 1000; // Beispiel: rund 50 % der erwarteten Erzeugung
    c.endschaft = "kaufoption";
    c.kaufoptionEur = Math.round(((a.kwp || 0) * 90 + (a.speicherKwh || 0) * 60) / 1000) * 1000;
    c.endschaftText = "Kaufoption zum Restwert laut Vertrag, alternativ Verlängerung um 5 Jahre (Demo).";
  }
}
