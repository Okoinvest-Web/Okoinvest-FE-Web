// src/lib/plattform/fristErinnerung.js
//
// Fristerinnerungen per täglichem Lauf – reine Regeln (ohne Node-/React-Importe). Python-Gegenstück (1:1):
// Backend-Import/oekoinvest_app/oekoinvest_app/plattform/frist_erinnerung_kern.py.
//
//   Pachtakte       Späteste Frist bis Baubeginn, „Verlängerung oder Rückbau abstimmen“ (24 Monate vor Laufzeitende),
//                   Ende der Grundlaufzeit, Vertragsende laut Kündigung → Eigentümer + Backoffice (90/30/7/0 Tage vorher);
//                   Rückbausicherheit ab Baubeginn vereinbart, aber nicht hinterlegt → Backoffice (wöchentlich)
//   Genossenschaft  Einzahlungsfrist nach der Zulassung (7/0 Tage vorher) → Mitglied; überfällig → zusätzlich Backoffice
//   Gemeinde        Frist einer offenen Stellungnahme (7/2/0 Tage vorher) → die angefragte Seite; überfällig → beide
//
// Jede Erinnerung trägt einen Schlüssel (Objekt, Frist, Datum, Stufe) – das Backend merkt sich gesendete Schlüssel,
// damit jede Stufe genau einmal gemeldet wird (Demo: db.fristErinnerung.gesendet, Frappe: Plattform Aktivitaet).
// Überfällige Fristen werden bis UEBERFAELLIG_TAGE nach Ablauf einmal gemeldet, ältere nicht mehr.

export const ERINNERUNG_STUFEN = { pacht: [90, 30, 7, 0], einzahlung: [7, 0], stellungnahme: [7, 2, 0] };
export const UEBERFAELLIG_TAGE = 30;

const TAG = /^(\d{4})-(\d{2})-(\d{2})$/;
const istDatum = (s) => TAG.test(String(s || "").slice(0, 10));
const tagMs = (s) => {
  const [j, m, t] = String(s).slice(0, 10).split("-").map(Number);
  return Date.UTC(j, m - 1, t);
};
export const tageBis = (heute, frist) => Math.round((tagMs(frist) - tagMs(heute)) / 86400000);
const datumDe = (s) => String(s || "").slice(0, 10).split("-").reverse().join(".");
const kompakt = (s) => String(s || "").slice(0, 10).split("-").join("");
const eur = (x) => `${Math.round(Number(x) || 0).toLocaleString("de-DE")} €`;

/** Stufe einer Frist am Tag `heute`: { stufe: "t90"|…|"t0"|"ueberfaellig", tage } oder null (noch nicht / nicht mehr fällig) */
export function erinnerungsStufe(frist, heute, stufen = ERINNERUNG_STUFEN.pacht) {
  if (!istDatum(frist) || !istDatum(heute)) return null;
  const tage = tageBis(heute, frist);
  if (tage < 0) return tage >= -UEBERFAELLIG_TAGE ? { stufe: "ueberfaellig", tage } : null;
  const s = [...stufen].sort((a, b) => a - b).find((x) => tage <= x);
  return s === undefined ? null : { stufe: `t${s}`, tage };
}

/** Schlüssel für „bereits gemeldet“ (max. 60 Zeichen wie objekt_id der Aktivität) */
export const erinnerungsSchluessel = (...teile) => teile.filter((x) => x !== null && x !== undefined && x !== "").join(":").slice(0, 60);

const wann = (tage) => (tage > 1 ? `in ${tage} Tagen` : tage === 1 ? "morgen" : tage === 0 ? "heute" : `seit ${-tage} ${tage === -1 ? "Tag" : "Tagen"} überschritten`);

const PACHT_FRISTEN = ["baubeginn", "vorbereitung", "ende", "kuendigung"];

/**
 * Pachtakte. vertrag: { id, bezeichnung, status, beginn, ende, kuendigungZum }, fristen: vertragsFristen(…),
 * akte: { sicherheit: { status, ab } }. Rückgabe [{ schluessel, an: ["eigentuemer"|"backoffice"], titel, text, frist }]
 */
export function pachtErinnerungen({ vertrag, fristen = [], akte = null, heute }) {
  const out = [];
  if (!vertrag || !["aktiv", "gekuendigt"].includes(vertrag.status)) return out;
  const name = vertrag.bezeichnung || vertrag.id;
  for (const f of fristen) {
    if (!PACHT_FRISTEN.includes(f.id)) continue;
    if (vertrag.status === "gekuendigt" && f.id !== "kuendigung") continue; // nach Kündigung zählt nur das Vertragsende
    const st = erinnerungsStufe(f.datum, heute, ERINNERUNG_STUFEN.pacht);
    if (!st) continue;
    out.push({
      schluessel: erinnerungsSchluessel("PA", vertrag.id, f.id, kompakt(f.datum), st.stufe),
      an: ["eigentuemer", "backoffice"],
      titel: `Frist: ${f.titel}`,
      text: `„${name}“ – ${f.titel} am ${datumDe(f.datum)} (${wann(st.tage)}). ${f.text || ""}`.trim(),
      frist: f.datum,
      stufe: st.stufe,
    });
  }
  const s = akte?.sicherheit || {};
  if (s.status === "vorgesehen" && s.ab === "baubeginn" && istDatum(vertrag.beginn) && vertrag.beginn <= heute) {
    const tage = -tageBis(heute, vertrag.beginn);
    out.push({
      schluessel: erinnerungsSchluessel("PA", vertrag.id, "sicherheit", `w${Math.floor(tage / 7)}`),
      an: ["backoffice"],
      titel: "Rückbausicherheit fehlt",
      text: `„${name}“: Die Rückbausicherheit ist ab Baubeginn (${datumDe(vertrag.beginn)}) vereinbart, aber noch nicht als hinterlegt erfasst.`,
      frist: vertrag.beginn,
      stufe: `w${Math.floor(tage / 7)}`,
    });
  }
  return out;
}

/** Genossenschaft. mitglied: { id, status, nr, einzahlungFrist }, offenEur, genoName */
export function einzahlungErinnerungen({ mitglied, offenEur = 0, genoName = "", heute }) {
  if (!mitglied || mitglied.status !== "zugelassen" || !(Number(offenEur) > 0)) return [];
  const st = erinnerungsStufe(mitglied.einzahlungFrist, heute, ERINNERUNG_STUFEN.einzahlung);
  if (!st) return [];
  return [{
    schluessel: erinnerungsSchluessel("GM", mitglied.id, "einzahlung", kompakt(mitglied.einzahlungFrist), st.stufe),
    an: st.stufe === "ueberfaellig" ? ["mitglied", "backoffice"] : ["mitglied"],
    titel: st.stufe === "ueberfaellig" ? "Einzahlungsfrist überschritten" : "Erinnerung: Einzahlung auf Ihre Geschäftsanteile",
    text: `${genoName ? `${genoName}: ` : ""}Offen ${eur(offenEur)}, Einzahlungsfrist ${datumDe(mitglied.einzahlungFrist)} (${wann(st.tage)})${mitglied.nr ? ` – Mitgliedsnummer ${mitglied.nr}` : ""}.`,
    frist: mitglied.einzahlungFrist,
    stufe: st.stufe,
  }];
}

/** Gemeinde. stellungnahmen: [{ id, betreff, frist, status, von: oekoinvest|gemeinde }] der Akte `akteId` */
export function stellungnahmeErinnerungen({ akteId, gemeinde = "", stellungnahmen = [], heute }) {
  const out = [];
  for (const s of stellungnahmen || []) {
    if (s.status !== "offen" || !istDatum(s.frist)) continue;
    const st = erinnerungsStufe(s.frist, heute, ERINNERUNG_STUFEN.stellungnahme);
    if (!st) continue;
    const angefragt = s.von === "oekoinvest" ? "gemeinde" : "backoffice";
    out.push({
      schluessel: erinnerungsSchluessel("GS", akteId, s.id, kompakt(s.frist), st.stufe),
      an: st.stufe === "ueberfaellig" ? [...new Set([angefragt, "backoffice"])] : [angefragt],
      titel: st.stufe === "ueberfaellig" ? "Frist der Stellungnahme überschritten" : "Erinnerung: Frist der Stellungnahme",
      text: `${gemeinde ? `${gemeinde}: ` : ""}„${s.betreff}“ – Frist ${datumDe(s.frist)} (${wann(st.tage)}).`,
      frist: s.frist,
      stufe: st.stufe,
    });
  }
  return out;
}
