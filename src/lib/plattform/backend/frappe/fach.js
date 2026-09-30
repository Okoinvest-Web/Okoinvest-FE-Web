// src/lib/plattform/backend/frappe/fach.js
//
// Frappe-Adapter „Fachprüfung Kapitalseite“. Methoden in oekoinvest_app.plattform.api.fach – Vertrag: docs/API.md,
// Abschnitt 11. Signaturen identisch zu backend/demo/fach.js. Frappe prüft Rolle UND Eigentum selbst.
//
// Lastgang: Das Parsen und Analysieren der CSV (reine Logik, fach/lastgang.js) übernimmt der Website-Server – an
// Frappe gehen nur die Viertelstundenreihe (kW) und die Analyse; Frappe prüft Rechte, Grenzen und speichert
// (Reihe als private Datei). So bleibt eine einzige Implementierung des Parsers.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";
import { PlattformFehler } from "../../fehler";
import { lastgangAnalyse, lastgangParsen } from "../../fach/lastgang";
import { regionFuerProjekt } from "../../fach/datenblatt";
import { abnahmestelleHinweise, egHinweise } from "../../fach/energie";
import { bewertungBereinigen, bewertungRechnen, bewertungVorbelegung } from "../../fach/bewertung";

Object.assign(METHODEN, {
  energieDaten: "fach.energie_daten",
  abnahmestelleSpeichern: "fach.abnahmestelle_speichern",
  abnahmestelleLoeschen: "fach.abnahmestelle_loeschen",
  lastgangSpeichern: "fach.lastgang_speichern",
  lastgangReihe: "fach.lastgang_reihe",
  lastgangAnalyseSpeichern: "fach.lastgang_analyse_speichern",
  lastgangLoeschen: "fach.lastgang_loeschen",
  lastgangAnfrage: "fach.lastgang_anfrage",
  egTeilnahmeSpeichern: "fach.eg_speichern",
  genoInteresseSpeichern: "fach.geno_speichern",
  bewertung: "fach.bewertung",
  szenarioSpeichern: "fach.szenario_speichern",
  szenarioLoeschen: "fach.szenario_loeschen",
});

const LASTGANG_MAX_BYTES = 4 * 1024 * 1024;

/** Frappe liefert die Stammdaten; fachliche Hinweise (Fristen, § 19, Stromsteuer, AT-Voraussetzungen) ergänzt die Website */
export async function energieDaten(n, { nutzerId } = {}) {
  const d = await aufruf("energieDaten", { nutzerId: nutzerId || null }, n);
  const bh = (s) => d.lastgaenge.filter((l) => l.abnahmestelleId === s.id)[0]?.analyse?.benutzungsstunden;
  return {
    ...d,
    abnahmestellen: (d.abnahmestellen || []).map((s) => ({ ...s, hinweise: abnahmestelleHinweise(s, { benutzungsstunden: bh(s) }) })),
    eg: d.eg ? { ...d.eg, hinweise: egHinweise(d.eg) } : null,
  };
}
export const abnahmestelleSpeichern = (n, { id = null, daten = {} } = {}) => aufruf("abnahmestelleSpeichern", { id, daten }, n);
export const abnahmestelleLoeschen = (n, id) => aufruf("abnahmestelleLoeschen", { id }, n);

function parameterFuer(parameter = {}, stelle = null) {
  return {
    pvKwp: Number(parameter.pvKwp) > 0 ? Math.min(100000, Math.round(Number(parameter.pvKwp))) : null,
    preisCt: Number(parameter.preisCt) >= 5 && Number(parameter.preisCt) <= 80 ? Number(parameter.preisCt) : stelle?.arbeitspreisCt ?? 20,
    produzierend: parameter.produzierend === undefined ? !!stelle?.stromsteuerEntlastung : !!parameter.produzierend,
    regionId: regionFuerProjekt({ land: stelle?.land || "DE", bundesland: "" }),
  };
}

export async function lastgangHochladen(n, { name, inhalt, einheit, abnahmestelleId, parameter } = {}) {
  const text = typeof inhalt === "string" ? inhalt : "";
  if (!text || text.length > LASTGANG_MAX_BYTES) throw new PlattformFehler(422, "Die Datei ist leer oder zu groß (höchstens 4 MB).");
  const g = lastgangParsen(text, { einheit: ["W", "kW", "MW", "Wh", "kWh", "MWh"].includes(einheit) ? einheit : null });
  if (!g.ok) throw new PlattformFehler(422, g.fehler);
  const daten = await energieDaten(n); // Rechte + Abnahmestelle des Kontos
  const stelle = abnahmestelleId ? daten.abnahmestellen.find((s) => s.id === abnahmestelleId) : null;
  if (abnahmestelleId && !stelle) throw new PlattformFehler(403, "Abnahmestelle gehört nicht zu Ihrem Konto.");
  const par = parameterFuer(parameter, stelle);
  const analyse = lastgangAnalyse(g, { ...par, bestandPvKwp: stelle?.eigenerzeugungKwp || 0 });
  return aufruf(
    "lastgangSpeichern",
    {
      name: String(name || "Lastgang.csv").slice(0, 120),
      abnahmestelleId: stelle?.id || null,
      reihe: { startMs: g.startMs, n: g.n, kw: g.kw.map((x) => (Number.isNaN(x) ? null : Math.round(x * 100) / 100)) },
      meta: { einheit: g.einheit, einheitQuelle: g.einheitQuelle, zeitbasis: g.zeitbasis, hinweise: g.hinweise, statistik: g.statistik },
      parameter: par,
      analyse,
    },
    n,
  );
}

export async function lastgangNeuRechnen(n, id, parameter = {}) {
  const r = await aufruf("lastgangReihe", { id }, n); // Rechte in Frappe
  const par = parameterFuer(parameter, r.abnahmestelle || null);
  const g = { ok: true, startMs: r.reihe.startMs, n: r.reihe.n, kw: r.reihe.kw.map((x) => (x === null ? NaN : x)) };
  const analyse = lastgangAnalyse(g, { ...par, bestandPvKwp: r.abnahmestelle?.eigenerzeugungKwp || 0 });
  return aufruf("lastgangAnalyseSpeichern", { id, parameter: par, analyse }, n);
}

export const lastgangLoeschen = (n, id) => aufruf("lastgangLoeschen", { id }, n);
export const lastgangAnfrage = (n, id, { nachricht = "", ip = "" } = {}) => aufruf("lastgangAnfrage", { id, nachricht, ip }, n);
export const egTeilnahmeSpeichern = (n, daten = {}) => aufruf("egTeilnahmeSpeichern", { daten }, n);
export const genoInteresseSpeichern = (n, daten = {}, { ip = "" } = {}) => aufruf("genoInteresseSpeichern", { daten, ip }, n);
/** Frappe prüft Rechte und liefert Daten + Szenarien; Vorbelegung und Rechnung macht die Website (fach/bewertung.js) */
export async function bewertung(n, projektId) {
  const d = await aufruf("bewertung", { projektId }, n);
  const vb = bewertungVorbelegung(d.projekt, d.vertraulich || {}, d.datenblatt || {}, { zielRenditePct: typeof d.renditeZielPct === "number" ? d.renditeZielPct : undefined });
  return { projekt: d.projekt, zugriff: d.zugriff, vorbelegung: vb, ergebnis: bewertungRechnen(vb.modus, vb.eingaben), szenarien: d.szenarien || [] };
}
export async function szenarioSpeichern(n, projektId, { name, eingaben } = {}) {
  const d = await aufruf("bewertung", { projektId }, n); // Rechte + aktuelle Projektdaten
  const vb = bewertungVorbelegung(d.projekt, d.vertraulich || {}, d.datenblatt || {});
  const e = { ...vb.eingaben, ...bewertungBereinigen(eingaben || {}) };
  return aufruf("szenarioSpeichern", { projektId, name, modus: vb.modus, eingaben: e, ergebnis: bewertungRechnen(vb.modus, e) }, n);
}
export const szenarioLoeschen = (n, id) => aufruf("szenarioLoeschen", { id }, n);
