// src/lib/plattform/backend/demo/fristErinnerung.js
//
// Täglicher Lauf „Fristerinnerungen“ im Demo-Backend (Frappe: plattform/api/frist_erinnerung.erinnerungen_taeglich,
// Scheduler daily). Regeln: src/lib/plattform/fristErinnerung.js.
//
//   Pachtakte       Fristen aus Vertrag + Pachtangebot (Baubeginn, Verlängerung/Rückbau abstimmen, Laufzeitende, Kündigung),
//                   Rückbausicherheit fehlt → Eigentümer bzw. Backoffice (Bereich „pachtakte“)
//   Genossenschaft  Einzahlungsfrist nach Zulassung → Mitglied (überfällig: auch Backoffice, Bereich „genossenschaft“)
//   Gemeinde        Frist offener Stellungnahmen → angefragte Seite (Gemeinde-Konto des geprüften Anliegens bzw. Backoffice „kommunen“)
//
// Demo ersetzt den Scheduler: einmal täglich automatisch (fristErinnerungBeiBedarf, eingehängt in den Fristen-Lauf der
// Automationen) und auf Knopfdruck (POST /api/admin/fristen/erinnerungen). Gesendete Schlüssel: db.fristErinnerung.gesendet.

import { PlattformFehler, verboten } from "../../fehler";
import { darfSchreiben } from "../../rechte";
import * as R from "../../fristErinnerung.js";
import * as P from "../../pachtakte.js";
import * as F from "../../finanzen/index.js";
import { offenerBetrag } from "../../mitglied/genossenschaft";
import { KOMMUNE_GEPRUEFT } from "../../kommune";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { akteSchluessel } from "./gemeinde";

const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
const MAX_GESENDET = 5000;

const backofficeZiele = (db, bereich) => (db.nutzer || []).filter((u) => u.aktiv && u.rollen?.includes("admin") && darfSchreiben(u, bereich)).slice(0, 5);
const gemeindeVon = (vg) => ({ name: vg.daten?.gemeinde || vg.kontakt?.firma || "", land: vg.kontakt?.land || vg.daten?.land || "DE", schluessel: vg.daten?.gemeindeSchluessel || "" });

/** Alle fälligen Erinnerungen ermitteln (ohne Schreiben) – [{ …regel, ziele: [{ nutzer, link, art }] }] */
export function erinnerungenErmitteln(db, h = heute()) {
  const { nutzerById } = intern;
  const out = [];
  // Pachtakte
  for (const pt of db.finanzen?.pachtvertraege || []) {
    const flaeche = pt.flaecheId ? (db.flaechen || []).find((f) => f.id === pt.flaecheId) : null;
    const angebot = flaeche?.pachtangebot || null;
    const akte = db.pachtakte?.akten?.[pt.id] || P.akteStart(angebot);
    const vertrag = { id: pt.id, bezeichnung: pt.bezeichnung, status: pt.status, vertragsdatum: pt.vertragsdatum || "", beginn: pt.beginn || "", laufzeitJahre: pt.laufzeitJahre, ende: F.laufzeitEnde(pt.beginn, pt.laufzeitJahre) || "", kuendigungZum: pt.kuendigungZum || "" };
    const fristen = P.vertragsFristen(vertrag, angebot, { heute: h });
    for (const e of R.pachtErinnerungen({ vertrag, fristen, akte, heute: h })) {
      const ziele = [];
      if (e.an.includes("eigentuemer")) ziele.push({ nutzer: nutzerById(db, pt.eigentuemerId), link: "/portal/pachtvertraege", art: "status" });
      if (e.an.includes("backoffice")) for (const u of backofficeZiele(db, "pachtakte")) ziele.push({ nutzer: u, link: `/portal/admin/pachtakten/${pt.id}`, art: "aufgabe" });
      out.push({ ...e, objektArt: "pachtvertrag", objektId: pt.id, ziele });
    }
  }
  // Genossenschaft
  const M = db.mitglied;
  for (const m of M?.mitglieder || []) {
    const g = (M.genos || []).find((x) => x.id === m.genoId);
    if (!g) continue;
    for (const e of R.einzahlungErinnerungen({ mitglied: m, offenEur: offenerBetrag(m, g), genoName: g.name, heute: h })) {
      const ziele = [];
      if (e.an.includes("mitglied")) ziele.push({ nutzer: nutzerById(db, m.nutzerId), link: "/portal/beteiligung/genossenschaft", art: "status" });
      if (e.an.includes("backoffice")) for (const u of backofficeZiele(db, "genossenschaft")) ziele.push({ nutzer: u, link: "/portal/admin/genossenschaft", art: "aufgabe" });
      out.push({ ...e, objektArt: "mitglied", objektId: m.id, ziele });
    }
  }
  // Gemeinde
  const vorgaenge = (db.vorgaenge || []).filter((vg) => vg.typ === "kommune" && KOMMUNE_GEPRUEFT.includes(vg.status));
  for (const a of db.gemeinde?.akten || []) {
    const vgs = vorgaenge.filter((vg) => akteSchluessel(gemeindeVon(vg)) === a.schluessel);
    for (const e of R.stellungnahmeErinnerungen({ akteId: a.id, gemeinde: a.gemeinde, stellungnahmen: a.stellungnahmen, heute: h })) {
      const ziele = [];
      if (e.an.includes("gemeinde")) for (const vg of vgs) ziele.push({ nutzer: nutzerById(db, vg.nutzerId), link: "/portal/kommune", art: "status" });
      if (e.an.includes("backoffice")) for (const u of backofficeZiele(db, "kommunen")) ziele.push({ nutzer: u, link: vgs[0] ? `/portal/kommune?vorgang=${vgs[0].id}` : "/portal/admin/vorgaenge", art: "aufgabe" });
      out.push({ ...e, objektArt: "gemeinde", objektId: a.id, ziele });
    }
  }
  return out;
}

/** Lauf innerhalb einer Schreibtransaktion: jede Erinnerung (Schlüssel) genau einmal melden */
export function fristErinnerungIntern(db, h = heute()) {
  const { benachrichtigen, protokoll } = intern;
  db.fristErinnerung ||= { v: 1, gesendet: {}, geprueftAm: "" };
  const gesendet = db.fristErinnerung.gesendet;
  const erg = { erinnerungen: 0, benachrichtigungen: 0, pacht: 0, genossenschaft: 0, gemeinde: 0 };
  for (const e of erinnerungenErmitteln(db, h)) {
    if (gesendet[e.schluessel]) continue;
    gesendet[e.schluessel] = h;
    erg.erinnerungen++;
    erg[e.objektArt === "pachtvertrag" ? "pacht" : e.objektArt === "mitglied" ? "genossenschaft" : "gemeinde"]++;
    const gesehen = new Set();
    for (const z of e.ziele) {
      if (!z.nutzer || gesehen.has(z.nutzer.id)) continue;
      gesehen.add(z.nutzer.id);
      if (benachrichtigen(db, z.nutzer, { art: z.art, titel: e.titel, text: e.text, link: z.link, objektArt: e.objektArt, objektId: e.objektId }, { mailBetreff: `${e.titel} – ÖkoInvest`, mailText: "Eine Frist läuft bald ab bzw. ist überschritten. Details finden Sie im Portal." })) erg.benachrichtigungen++;
    }
    protokoll(db, null, "frist_erinnerung", "frist", e.schluessel, `${e.titel}: ${e.text}`.slice(0, 280));
  }
  const schluessel = Object.keys(gesendet);
  if (schluessel.length > MAX_GESENDET) for (const k of schluessel.sort((a, b) => String(gesendet[a]).localeCompare(String(gesendet[b]))).slice(0, schluessel.length - MAX_GESENDET)) delete gesendet[k];
  db.fristErinnerung.geprueftAm = h;
  return erg;
}

/** Einmal täglich (Demo ersetzt den Scheduler) – liefert null, wenn heute schon gelaufen */
export async function fristErinnerungBeiBedarf() {
  const db = await lesen();
  if (db.fristErinnerung?.geprueftAm === heute()) return null;
  return aendern((d) => (d.fristErinnerung?.geprueftAm === heute() ? null : fristErinnerungIntern(d)));
}

/** Backoffice-Knopf „Fristerinnerungen jetzt senden“ (Frappe: frist_erinnerung.lauf) */
export async function fristErinnerungLauf(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!n.rollen?.includes("admin")) throw verboten("Nur für das Backoffice.");
  if (!["pachtakte", "genossenschaft", "kommunen"].some((b) => darfSchreiben(n, b))) throw verboten("Ihre Backoffice-Rolle erlaubt den Fristenlauf nicht.");
  return aendern((db) => ({ ok: true, ...fristErinnerungIntern(db), am: new Date().toISOString() }));
}
