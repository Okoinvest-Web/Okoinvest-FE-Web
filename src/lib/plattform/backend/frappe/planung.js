// src/lib/plattform/backend/frappe/planung.js
//
// Frappe-Adapter „Planungsdateien & Projektkosten“. Methoden in oekoinvest_app.plattform.api.planung – Vertrag: docs/API.md,
// Abschnitt „Planungsdateien & Projektkosten“. Signaturen identisch zu backend/demo/planung.js. Frappe prüft Rolle UND
// Eigentum selbst. Format-Erkennung und DXF-/Geo-Analyse laufen hier (JavaScript, gleicher Parser wie die Vorschau);
// Frappe prüft die Kennung der ersten Bytes zusätzlich und legt Datei, abgeleitete Datei und Analyse privat ab.
// DWG → DXF konvertiert Frappe selbst über den CAD-Konverter (site_config cad_konverter_url/cad_konverter_token, Hintergrundjob);
// die Kennzahlen der konvertierten DXF wertet die Website aus (Aktion „analysieren“ → Analyse an Frappe).
// Kalkulation: Frappe liefert die Rohdaten (gespeicherte Parameter/Positionen, Kostenstände, Quellen, Ist), die Aufbereitung
// (Berechnung, Benchmark, Soll/Ist) läuft hier mit derselben Logik wie im Demo-Backend (planung/ausgabe.js).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";
import { PlattformFehler } from "../../fehler";
import { formatErkennen } from "../../planung/regeln";
import { analyseDatei } from "../../planung/analyse";
import { kalkulationAusgabe } from "../../planung/ausgabe";

Object.assign(METHODEN, {
  planungListe: "planung.liste",
  planungMeine: "planung.meine",
  planungPlanSpeichern: "planung.plan_speichern",
  planungHochladen: "planung.hochladen",
  planungVersionAktion: "planung.version_aktion",
  planungDatei: "planung.datei",
  planungVersion: "planung.version",
  kalkulationHolen: "planung.kalkulation",
  kalkulationSpeichern: "planung.kalkulation_speichern",
  kalkulationAktion: "planung.kalkulation_aktion",
});

const b64 = (x) => Buffer.from(x).toString("base64");

export const planungListe = (n, projektId) => aufruf("planungListe", { projektId }, n);
export const planungMeine = (n) => aufruf("planungMeine", {}, n);
export const planungPlanSpeichern = (n, projektId, { id = null, daten = {} } = {}) => aufruf("planungPlanSpeichern", { projektId, id, daten }, n);
export async function planungHochladen(n, { daten, name = "", ...rest } = {}) {
  const erk = formatErkennen(daten, name);
  if (!erk.ok) throw new PlattformFehler(erk.status, erk.fehler);
  const { analyse, abgeleitet } = analyseDatei(erk.format, daten, erk.info);
  return aufruf("planungHochladen", {
    ...rest, name, format: erk.format, inhalt: b64(daten), analyse: { ...analyse, hinweis: erk.info.hinweis || undefined },
    abgeleitet: abgeleitet ? { name: abgeleitet.name, mime: abgeleitet.mime, art: abgeleitet.art, inhalt: b64(abgeleitet.daten) } : null,
  }, n);
}
export async function planungVersionAktion(n, versionId, daten = {}) {
  if (daten.aktion !== "analysieren") return aufruf("planungVersionAktion", { versionId, ...daten }, n);
  const meta = await planungVersion(n, versionId);
  const dwg = meta.version.format === "dwg";
  const d = await planungDatei(n, versionId, { abgeleitet: dwg });
  const { analyse } = analyseDatei(dwg ? "dxf" : meta.version.format, d.daten, {});
  return aufruf("planungVersionAktion", { versionId, aktion: "analysieren", analyse }, n);
}
export async function planungDatei(n, versionId, { abgeleitet = false } = {}) {
  const r = await aufruf("planungDatei", { versionId, abgeleitet: abgeleitet ? 1 : 0 }, n);
  return { name: r.name, mime: r.mime, format: r.format, daten: Buffer.from(r.inhalt || "", "base64") };
}
export const planungVersion = (n, versionId) => aufruf("planungVersion", { versionId }, n);
export const kalkulationHolen = async (n, projektId) => kalkulationAusgabe(await aufruf("kalkulationHolen", { projektId }, n));
export const kalkulationSpeichern = async (n, projektId, daten = {}) => kalkulationAusgabe(await aufruf("kalkulationSpeichern", { projektId, ...daten }, n));
export const kalkulationAktion = async (n, projektId, daten = {}) => kalkulationAusgabe(await aufruf("kalkulationAktion", { projektId, ...daten }, n));
export async function kalkulationKennzahlen(n, projektId) {
  const k = await kalkulationHolen(n, projektId);
  return { projektId: k.projekt.id, uebergeben: k.uebergabe, aktuell: { gesamt: k.summen.gesamt, capex: k.summen.capex, finanzierungsbedarf: k.summen.finanzierungsbedarf, eurProKwp: k.summen.eurProKwp, stand: k.kostenstand } };
}
