// src/lib/plattform/fach/loi.js
//
// Absichtserklärung (Letter of Intent) des Investors – fachlich strukturiert nach Marktpraxis bei PV-Transaktionen:
// Preisbasis (Gesamtpreis für Projektrechte, €/kWp oder Enterprise Value mit Überleitung zum Eigenkapitalwert),
// Transaktionsstruktur, Zahlungsstruktur, Bedingungen (Due Diligence, Gremien, Finanzierung …), Exklusivität, Gültigkeit.
// Reine Funktionen; Demo-Backend und Frappe (plattform/fach/loi.py) wenden dieselben Regeln an.
//
// Pflicht immer: Text (≥ 10 Zeichen) und ein Preis > 0 (Gesamtbetrag, €/kWp oder Enterprise Value).
// Pflicht bei strukturierter LOI (`struktur: true`, Formular im Portal): zusätzlich Transaktionsstruktur,
// Zahlungsstruktur, Gültigkeit (Datum in der Zukunft, höchstens 12 Monate) und mindestens eine Bedingung
// bzw. ausdrücklich „keine Bedingungen“.

export const LOI_PREISBASIS = {
  gesamt: "Kaufpreis gesamt (€)",
  proKwp: "Preis je kWp (€/kWp)",
  ev: "Enterprise Value (€, cash-/debt-free)",
};
export const LOI_STRUKTUR = { asset: "Asset Deal", share: "Share Deal (Anteile Projektgesellschaft)", offen: "Nach Due Diligence" };
export const LOI_ZAHLUNG = {
  einmal: "Einmalzahlung bei Closing",
  meilensteine: "Meilensteinzahlungen (z. B. Baurecht, RTB, COD)",
  earnout: "Fixbetrag plus Earn-out",
};
export const LOI_BEDINGUNGEN = {
  dd: "Zufriedenstellende Due Diligence (technisch, rechtlich, steuerlich)",
  gremien: "Zustimmung der Gremien (Investment Committee, Aufsichtsrat)",
  finanzierung: "Finanzierungszusage der Bank",
  netz: "Bestätigung Netzanschluss / Übertragung der Zusage",
  genehmigung: "Rechtskraft bzw. Bestandskraft der Genehmigung",
  kartell: "Fusionskontrolle bzw. Investitionsprüfung, falls erforderlich",
  keine: "Keine aufschiebenden Bedingungen",
};
export const LOI_FINANZIERUNG = { ek: "Vollständig aus Eigenmitteln", fk: "Mit Projektfinanzierung (Bank)", fonds: "Aus Fonds-/Mandatsmitteln" };
export const LOI_MAX_MONATE = 12;

const TXT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const mehrzeilig = (v, max) => (v === undefined || v === null || typeof v === "object" ? "" : String(v).replace(TXT, "").replace(/\r\n?/g, "\n").trim().slice(0, max));
const text = (v, max) => mehrzeilig(v, max).replace(/\s+/g, " ");
function zahl(v, min, max, stellen = 2) {
  if (v === undefined || v === null || v === "" || typeof v === "object" || typeof v === "boolean") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10 ** stellen) / 10 ** stellen;
}
const auswahl = (v, erlaubt, std = "") => (Object.prototype.hasOwnProperty.call(erlaubt, v) ? v : std);

class LoiFehler extends Error {
  constructor(msg) {
    super(msg);
    this.status = 422;
  }
}
const pflicht = (b, msg) => {
  if (!b) throw new LoiFehler(msg);
};

/**
 * LOI bereinigen und prüfen.
 * @param {object} l Eingabe
 * @param {{mwp?: number, jetzt?: string|Date}} kontext Projektleistung für die Umrechnung €/kWp ↔ Gesamt
 * @returns {object} gespeicherte LOI (ohne `am`)
 */
export function loiBereinigen(l = {}, { mwp = 0, jetzt } = {}) {
  const heute = (jetzt ? new Date(jetzt) : new Date()).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" }); // lokales Datum (nicht UTC)
  const strukturiert = l?.struktur === true || l?.struktur === "true";
  const t = mehrzeilig(l?.text, 3000);
  pflicht(t.length >= 10, "Bitte beschreiben Sie Ihre Absichtserklärung (mind. 10 Zeichen).");

  const preisbasis = auswahl(l?.preisbasis, LOI_PREISBASIS, l?.preisProKwp ? "proKwp" : l?.enterpriseValue ? "ev" : "gesamt");
  const kwp = (Number(mwp) || 0) * 1000;
  let betrag = zahl(l?.betrag, 0, 1e10, 0);
  const preisProKwp = zahl(l?.preisProKwp, 0, 10000, 2);
  const ev = zahl(l?.enterpriseValue, 0, 1e11, 0);
  const nettoschulden = zahl(l?.nettoschulden, -1e10, 1e11, 0);
  if (preisbasis === "proKwp") {
    pflicht(preisProKwp > 0, "Bitte geben Sie den Preis je kWp an.");
    if (kwp > 0) betrag = Math.round(preisProKwp * kwp);
  } else if (preisbasis === "ev") {
    pflicht(ev > 0, "Bitte geben Sie den Enterprise Value an.");
    betrag = Math.round(ev - (nettoschulden || 0)); // Eigenkapitalwert = EV − Nettofinanzverbindlichkeiten
    pflicht(betrag > 0, "Enterprise Value abzüglich Nettofinanzverbindlichkeiten muss positiv sein (Eigenkapitalwert).");
  } else pflicht(betrag > 0, "Bitte geben Sie einen indikativen Kaufpreis an.");

  const bedingungen = Array.isArray(l?.bedingungenListe) ? [...new Set(l.bedingungenListe.filter((b) => LOI_BEDINGUNGEN[b]))] : [];
  if (bedingungen.includes("keine")) pflicht(bedingungen.length === 1, "„Keine aufschiebenden Bedingungen“ schließt weitere Bedingungen aus.");
  const gueltigBis = /^20\d\d-\d\d-\d\d$/.test(String(l?.gueltigBis || "")) ? String(l.gueltigBis) : "";
  const exklusivitaetWochen = zahl(l?.exklusivitaetWochen, 0, 52, 0);
  const struktur = auswahl(l?.transaktion, LOI_STRUKTUR, "");
  const zahlung = auswahl(l?.zahlung, LOI_ZAHLUNG, "");
  const finanzierung = auswahl(l?.finanzierung, LOI_FINANZIERUNG, "");

  if (gueltigBis) {
    pflicht(gueltigBis >= heute, "Die Gültigkeit der LOI muss in der Zukunft liegen.");
    const max = new Date(`${heute}T00:00:00Z`);
    max.setUTCMonth(max.getUTCMonth() + LOI_MAX_MONATE);
    pflicht(gueltigBis <= max.toISOString().slice(0, 10), `Die Gültigkeit darf höchstens ${LOI_MAX_MONATE} Monate betragen.`);
  }
  if (strukturiert) {
    pflicht(struktur, "Bitte wählen Sie die Transaktionsstruktur (Asset Deal, Share Deal oder nach Due Diligence).");
    pflicht(zahlung, "Bitte wählen Sie die Zahlungsstruktur.");
    pflicht(gueltigBis, "Bitte geben Sie an, bis wann die LOI gilt.");
    pflicht(bedingungen.length > 0, "Bitte wählen Sie die Bedingungen – oder ausdrücklich „keine aufschiebenden Bedingungen“.");
    pflicht(finanzierung, "Bitte geben Sie an, wie der Kauf finanziert wird.");
    if (zahlung !== "einmal") pflicht(mehrzeilig(l?.zahlungDetails, 1000).length >= 10, "Bitte beschreiben Sie Meilensteine bzw. Earn-out (mind. 10 Zeichen).");
  }
  const bedingungenText = mehrzeilig(l?.bedingungen, 2000);
  return {
    version: strukturiert ? 2 : 1,
    preisbasis,
    betrag,
    preisProKwp: preisbasis === "proKwp" ? preisProKwp : kwp > 0 && betrag ? Math.round((betrag / kwp) * 100) / 100 : null,
    enterpriseValue: preisbasis === "ev" ? ev : null,
    nettoschulden: preisbasis === "ev" ? nettoschulden || 0 : null,
    transaktion: struktur,
    zahlung,
    zahlungDetails: mehrzeilig(l?.zahlungDetails, 1000),
    bedingungenListe: bedingungen,
    bedingungen: bedingungenText || bedingungen.map((b) => LOI_BEDINGUNGEN[b]).join("; "),
    finanzierung,
    exklusivitaetWochen,
    gueltigBis,
    text: t,
    ansprechpartner: text(l?.ansprechpartner, 120),
  };
}

/** Zeilen für die Anzeige (Investor, Backoffice, Anbieter nach Freigabe) */
export function loiZeilen(loi) {
  if (!loi) return [];
  const eur = (x) => (x || x === 0 ? `${Math.round(x).toLocaleString("de-DE")} €` : "");
  return [
    { label: "Preisbasis", wert: LOI_PREISBASIS[loi.preisbasis] || "" },
    { label: "Indikativer Kaufpreis (Eigenkapital)", wert: eur(loi.betrag) },
    { label: "Preis je kWp", wert: loi.preisProKwp ? `${loi.preisProKwp.toLocaleString("de-DE")} €/kWp` : "" },
    { label: "Enterprise Value", wert: loi.enterpriseValue ? eur(loi.enterpriseValue) : "" },
    { label: "Nettofinanzverbindlichkeiten", wert: loi.enterpriseValue ? eur(loi.nettoschulden) : "" },
    { label: "Transaktionsstruktur", wert: LOI_STRUKTUR[loi.transaktion] || "" },
    { label: "Zahlungsstruktur", wert: [LOI_ZAHLUNG[loi.zahlung], loi.zahlungDetails].filter(Boolean).join(" – ") },
    { label: "Finanzierung", wert: LOI_FINANZIERUNG[loi.finanzierung] || "" },
    { label: "Bedingungen", wert: loi.bedingungen || "" },
    { label: "Exklusivität", wert: loi.exklusivitaetWochen ? `${loi.exklusivitaetWochen} Wochen ab Annahme` : "" },
    { label: "Gültig bis", wert: loi.gueltigBis ? loi.gueltigBis.split("-").reverse().join(".") : "" },
    { label: "Inhalt", wert: loi.text || "" },
  ].filter((z) => z.wert);
}

export { LoiFehler };
