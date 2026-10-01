// src/lib/plattform/eg/zaehlpunkt.js
//
// Kennungen Österreich: Zählpunktnummer, Gemeinschafts-ID, Marktpartner-ID (Fachkonzept 1.1, 3.4, 3.7; HA II 7).
// Reine Funktionen (Browser, Server, Node-Tests). Python-Spiegel: plattform/eg_stamm_kern.py (gleiche Testvektoren in
// src/lib/plattform/eg/testdaten/stamm/kennungen.json).
//
// Zählpunktnummer AT (33 Zeichen): „AT“ + 6-stellige Netzbetreibernummer + 5-stellige Postleitzahl + 20 Zeichen (Ziffern,
// Großbuchstaben). Die AT-Zählpunktnummer hat nach öffentlich zugänglichen Quellen KEINE Prüfziffer (anders als die
// DE-MaLo-ID) – geprüft werden daher Format, Plausibilität der PLZ (AT: „0“ + vierstellige PLZ oder „00000“) und die
// Netzbetreibernummer gegen die Stammdatenliste (unbekannt = Hinweis, kein Fehler). Tippfehler-Schutz zusätzlich über
// Dublettenprüfung je Gemeinschaft (eg/stamm.js).

import { zaehlpunktFormatiert } from "../fach/energie.js";

export { zaehlpunktFormatiert };

/** Leerzeichen, Bindestriche und Punkte entfernen, Großbuchstaben */
export const kennungNormalisieren = (v) => String(v ?? "").toUpperCase().replace(/\s|-|\./g, "");

const ZP_AT = /^AT(\d{6})(\d{5})([0-9A-Z]{20})$/;

/**
 * Zählpunktnummer prüfen.
 * @param {string} eingabe
 * @param {{netzbetreiber?: {id:string, nbNummer:string, name:string}[]}} [opt]
 * @returns {{ok:boolean, wert:string, fehler:string, nbNummer:string, plz:string, netzbetreiberId:string, hinweise:string[]}}
 */
export function zaehlpunktPruefen(eingabe, { netzbetreiber = [] } = {}) {
  const s = kennungNormalisieren(eingabe);
  const leer = { ok: false, wert: s, fehler: "", nbNummer: "", plz: "", netzbetreiberId: "", hinweise: [] };
  if (!s) return { ...leer, fehler: "Bitte geben Sie die Zählpunktnummer an." };
  if (s.length !== 33) return { ...leer, fehler: `Die Zählpunktnummer hat 33 Zeichen (derzeit ${s.length}).` };
  if (!s.startsWith("AT")) return { ...leer, fehler: "Die Zählpunktnummer beginnt mit „AT“." };
  const m = ZP_AT.exec(s);
  if (!m) return { ...leer, fehler: "Aufbau: AT + 6-stellige Netzbetreibernummer + 5-stellige Postleitzahl + 20 Zeichen (Ziffern und Großbuchstaben)." };
  const [, nbNummer, plz] = m;
  const hinweise = [];
  if (plz !== "00000" && (plz[0] !== "0" || Number(plz.slice(1)) < 1000)) hinweise.push(`Die Postleitzahl im Zählpunkt (${plz}) ist für Österreich ungewöhnlich (erwartet 0 + vierstellige PLZ). Bitte mit der Netzrechnung vergleichen.`);
  const nb = netzbetreiber.find((x) => x.nbNummer && x.nbNummer === nbNummer);
  if (netzbetreiber.length && !nb) hinweise.push(`Netzbetreibernummer ${nbNummer} ist in den Stammdaten nicht hinterlegt – bitte Netzbetreiber zuordnen.`);
  return { ok: true, wert: s, fehler: "", nbNummer, plz, netzbetreiberId: nb?.id || "", hinweise };
}

/** Postleitzahl aus dem Zählpunkt (vierstellig, AT) oder "" */
export const plzAusZaehlpunkt = (zp) => {
  const p = kennungNormalisieren(zp).slice(8, 13);
  return /^0\d{4}$/.test(p) && p !== "00000" ? p.slice(1) : "";
};

const MP = /^(RC|CC|GC)(\d{6})$/;
/**
 * Marktpartner-ID der Gemeinschaft (ebUtilities): EEG „RC“, BEG „CC“, GEA „GC“ + 6 Ziffern. P2P/Eigenversorgung: Präfix
 * noch offen (zu bestätigen) – dort ist jedes Format mit 2 Großbuchstaben + 6 Ziffern zulässig.
 */
export function marktpartnerIdPruefen(eingabe, modell) {
  const s = kennungNormalisieren(eingabe);
  if (!s) return { ok: true, wert: "", fehler: "" };
  const soll = { eeg: "RC", beg: "CC", gea: "GC" }[modell];
  if (!soll) return /^[A-Z]{2}\d{6}$/.test(s) ? { ok: true, wert: s, fehler: "" } : { ok: false, wert: s, fehler: "Marktpartner-ID: 2 Buchstaben + 6 Ziffern." };
  const m = MP.exec(s);
  if (!m || m[1] !== soll) return { ok: false, wert: s, fehler: `Die Marktpartner-ID einer ${modell.toUpperCase()} beginnt mit „${soll}“ und hat 6 Ziffern (z. B. ${soll}100015).` };
  return { ok: true, wert: s, fehler: "", nummer: m[2] };
}

const GID_ORT = /^AT(\d{6})(\d{5})(RC|GC)(\d{6})([0-9A-Z]{12})$/;
const GID_BEG = /^ATCC9999(DYNAM|STATI)CC(\d{6})([0-9A-Z]{12})$/;
/**
 * Gemeinschafts-ID (33 Zeichen, HA II 7.1): EEG „AT + NB(6) + PLZ(5, auch 00000) + RC + 6 Ziffern + 12 Zeichen“, GEA mit „GC“,
 * BEG „AT + CC9999 + DYNAM|STATI + CC + 6 Ziffern + 12 Zeichen“. P2P/Eigenversorgung: Format offen (zu bestätigen).
 * Optional Abgleich mit Marktpartner-ID (gleiche 6 Ziffern) und Verteilmodell (BEG: DYNAM/STATI).
 */
export function gemeinschaftsIdPruefen(eingabe, { modell, marktpartnerId = "", verteilmodell = "" } = {}) {
  const s = kennungNormalisieren(eingabe);
  const r = { ok: true, wert: s, fehler: "", hinweise: [], nbNummer: "" };
  if (!s) return r;
  if (s.length !== 33) return { ...r, ok: false, fehler: `Die Gemeinschafts-ID hat 33 Zeichen (derzeit ${s.length}).` };
  let nummer = "";
  if (modell === "beg") {
    const m = GID_BEG.exec(s);
    if (!m) return { ...r, ok: false, fehler: "Aufbau BEG: AT + CC9999 + DYNAM oder STATI + CC + 6 Ziffern + 12 Zeichen." };
    nummer = m[2];
    if (verteilmodell && (m[1] === "DYNAM") !== (verteilmodell === "dynamisch")) r.hinweise.push("Verteilmodell der Gemeinschafts-ID (DYNAM/STATI) passt nicht zum gespeicherten Verteilmodell.");
  } else if (modell === "eeg" || modell === "gea") {
    const m = GID_ORT.exec(s);
    const k = modell === "eeg" ? "RC" : "GC";
    if (!m || m[3] !== k) return { ...r, ok: false, fehler: `Aufbau ${modell.toUpperCase()}: AT + Netzbetreibernummer (6) + PLZ (5, auch 00000) + ${k} + 6 Ziffern + 12 Zeichen.` };
    nummer = m[4];
    r.nbNummer = m[1];
  } else if (!/^AT[0-9A-Z]{31}$/.test(s)) {
    return { ...r, ok: false, fehler: "Die Gemeinschafts-ID beginnt mit „AT“ und enthält 31 weitere Ziffern bzw. Großbuchstaben." };
  }
  const mp = marktpartnerId ? MP.exec(kennungNormalisieren(marktpartnerId)) : null;
  if (mp && nummer && mp[2] !== nummer) r.hinweise.push(`Die Nummer in der Gemeinschafts-ID (${nummer}) weicht von der Marktpartner-ID (${mp[2]}) ab.`);
  return r;
}
