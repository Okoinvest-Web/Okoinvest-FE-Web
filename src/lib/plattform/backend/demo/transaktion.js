// src/lib/plattform/backend/demo/transaktion.js
//
// Verkaufs-Pipeline des Backoffice (Transaktion) im Demo-Backend – Referenz für Frappe plattform/api/transaktion.py.
// Liest Projekte, Interessen, Bieterverfahren/Gebote (Deal-Room) und Closing-Räume tolerant; eigene Daten nur die
// Prognose je Projekt (Wahrscheinlichkeit, erwartetes Closing, Begründung) unter db.transaktion.prognosen.
//
// Rechte: lesen Bereich „projekte“ ≥ 1 (Leitung, Transaktion, Buchhaltung, Nur lesen, Projektleitung, Akquise);
// Prognose ändern Bereich „projekte“ = 2 (Leitung, Transaktion).

import { PlattformFehler, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import * as T from "../../transaktion/pipeline.js";
import { darfLesen, darfSchreiben } from "../../rechte";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt } from "./hilfen";

const { protokoll, nameVon } = intern;
const istAdmin = (n) => !!n?.rollen?.includes("admin");
function leseNoetig(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!istAdmin(n) || !darfLesen(n, "projekte")) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Projekte“ kein Lesen.");
}
const heute = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vienna" }).format(new Date());

function karten(db) {
  const h = heute();
  const prognosen = db.transaktion?.prognosen || {};
  const verfahren = db.dealroom?.verfahren || [];
  const gebote = db.dealroom?.gebote || [];
  const closings = db.closing?.closings || [];
  const aus = [];
  for (const p of db.projekte || []) {
    const interessen = (db.interessen || []).filter((i) => i.projektId === p.id);
    const vf = verfahren.filter((x) => x.projektId === p.id && x.status !== "abgebrochen").sort((a, b) => String(b.erstelltAm).localeCompare(String(a.erstelltAm)))[0] || null;
    const cl = closings.filter((x) => x.projektId === p.id && x.status !== "abgebrochen").sort((a, b) => String(b.erstelltAm).localeCompare(String(a.erstelltAm)))[0] || null;
    const k = T.dealKarte(p, { interessen, verfahren: vf, closing: cl, gebote: gebote.filter((g) => g.projektId === p.id) }, prognosen[p.id] || null, h);
    if (k) aus.push({ ...k, zustaendig: p.zustaendigId ? nameVon(db, p.zustaendigId) : "" });
  }
  return aus;
}

export async function dealPipeline(n, { land = "", phase = "" } = {}) {
  leseNoetig(n);
  const db = await lesen();
  const alle = karten(db).filter((k) => (!land || k.land === land) && (!phase || k.phase === phase));
  return { heute: heute(), darfSchreiben: darfSchreiben(n, "projekte"), phasen: T.PHASEN, ...T.pipelineAuswerten(alle), karten: alle };
}

/** Prognose je Projekt: { wahrscheinlichkeit (0–100 | null = Standard), closingErwartet (JJJJ-MM | ""), notiz } */
export async function dealPrognose(n, projektId, d = {}) {
  leseNoetig(n);
  if (!darfSchreiben(n, "projekte")) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Projekte“ kein Schreiben.");
  let o;
  try {
    o = T.overridePruefen(d);
  } catch (e) {
    throw ungueltig(e.message);
  }
  return aendern((db) => {
    const p = (db.projekte || []).find((x) => x.id === v.kennung(projektId));
    if (!p) throw nichtGefunden("Projekt nicht gefunden.");
    db.transaktion ||= { prognosen: {} };
    const leer = o.wahrscheinlichkeit === null && !o.closingErwartet && !o.notiz;
    if (leer) delete db.transaktion.prognosen[p.id];
    else db.transaktion.prognosen[p.id] = { ...o, vonId: n.id, vonName: nameVon(db, n.id), am: jetzt() };
    protokoll(db, n, "deal_prognose", "projekt", p.id, leer ? "Prognose auf Standard zurückgesetzt" : `Prognose: ${o.wahrscheinlichkeit ?? "Standard"} %, Closing ${o.closingErwartet || "Standard"}${o.notiz ? ` – ${v.text(o.notiz, 120)}` : ""}`);
    return karten(db).find((k) => k.projektId === p.id) || null;
  });
}

export async function dealBericht(n, filter = {}) {
  const d = await dealPipeline(n, filter);
  await aendern((db) => protokoll(db, n, "export", "projekt", "PIPELINE", `Deal-Bericht exportiert (${d.karten.length} Projekte)`)).catch(() => {});
  return { ...d, csv: T.dealBerichtCsv(d.karten) };
}
