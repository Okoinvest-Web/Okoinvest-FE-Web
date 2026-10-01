// src/lib/plattform/eg/eda/simulator.js
//
// Simulator-Netzbetreiber für Tests und Demo (WP2): beantwortet ausgehende EDA-Nachrichten realistisch – mit
// Verzögerungen, Kundenverhalten (Zustimmung, Ablehnung, Fristablauf), Ablehnungen mit Responsecodes (Zählpunkt
// unbekannt, Σ TF > 100, 5 Teilnahmen), Smart-Meter-Wartezeit, Zählpunktliste mit gelegentlicher Abweichung,
// Energiedaten (Viertelstunden, L1/L2/L3, gelegentliche Lieferlücken). Deterministisch über einen Seed
// (gleiche Ergebnisse in JS und Python, Testvektoren eg/testdaten/eda/simulator.json).
// Python-Spiegel: plattform/eg_eda_kern.py; der Gateway-Dienst nutzt ihn im Modus „simulator“.
// Die Wahrscheinlichkeiten sind Annahmen für Vorführung und Tests, keine Marktstatistik.

import { GROESSE_METER_CODE, GROESSEN_JE_RICHTUNG } from "./codes.js";
import { plusTage, qhAnzahl, tagBeginnUtc, wienOffsetMinuten } from "./zeit.js";

export const SIMULATOR_ANNAHMEN = { zustimmung: 0.72, ablehnungKunde: 0.1, tfAnnahme: 0.95, nachforderungAnnahme: 0.9, podlistAbweichung: 0.5, lieferluecke: 0.04 };

/** FNV-1a (32 Bit) über die UTF-16-Codeeinheiten → Startwert */
export function seedVon(text) {
  let h = 0x811c9dc5;
  const s = String(text ?? "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 – deterministischer Zufall in 0 … 1 */
export function zufall(seed) {
  let a = seedVon(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t = (t ^ (t + (Math.imul(t ^ (t >>> 7), t | 61) >>> 0))) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r3 = (x) => Math.floor(x * 1000 + 0.5) / 1000;
const hex = (r, n) => {
  let s = "";
  for (let i = 0; i < n; i++) s += "0123456789ABCDEF"[Math.floor(r() * 16)];
  return s;
};

/**
 * Antworten des Simulators auf eine ausgehende Nachricht.
 * @param {{kopf:object, daten:object}} n gelesene ausgehende Nachricht
 * @param {{zaehlpunkte?:Object<string,{bekannt?:boolean, smartMeter?:string, fremdTf?:number, fremdAnzahl?:number}>, gemeinschaftsIds?:string[], liste?:object[]}} nb Sicht des Netzbetreibers
 * @param {{seed:string, heute:string}} o
 * @returns {{nachTagen:number, code:string, prozesscode:string, daten:object}[]}
 */
export function simulatorAntworten(n, nb = {}, { seed, heute }) {
  const r = zufall(`${seed}|${n.kopf.messageId}`);
  const pc = n.kopf.prozesscode;
  const d = n.daten || {};
  const zp = d.MeteringPoint || "";
  const info = (nb.zaehlpunkte || {})[zp] || {};
  const aus = [];
  const a = (nachTagen, code, daten) => aus.push({ nachTagen, code, prozesscode: pc, daten });
  if (pc === "EC_REQ_ONL" || pc === "EC_REQ_OFF") {
    const basis = { MeteringPoint: zp, CMRequestId: d.CMRequestId };
    if (info.bekannt === false) return a(0.01, "ABLEHNUNG_ECON", { ...basis, ResponseCode: "56" }), aus;
    if (nb.gemeinschaftsIds && !nb.gemeinschaftsIds.includes(d.ECID)) return a(0.01, "ABLEHNUNG_ECON", { ...basis, ResponseCode: "181" }), aus;
    if ((info.fremdAnzahl || 0) >= 5) return a(0.01, "ABLEHNUNG_ECON", { ...basis, ResponseCode: "185" }), aus;
    if ((info.fremdTf || 0) + Number(d.ECPartFact) > 100) return a(0.01, "ABLEHNUNG_ECON", { ...basis, ResponseCode: "183" }), aus;
    a(0.01, "ANTWORT_ECON", { ...basis, ResponseCode: "99" });
    const u = r();
    if (u < SIMULATOR_ANNAHMEN.zustimmung) {
      const tz = 1 + Math.floor(r() * 14);
      const consent = `SIM${hex(r, 12)}`;
      a(tz, "ZUSTIMMUNG_ECON", { ...basis, ResponseCode: "175", ConsentId: consent });
      let tAbschluss;
      if (info.smartMeter === "nein") {
        a(tz + 0.5, "ANTWORT_ECON", { ...basis, ResponseCode: "182" });
        tAbschluss = tz + 35 + Math.floor(r() * 25);
      } else tAbschluss = tz + 1 + Math.floor(r() * 2);
      a(tAbschluss, "ABSCHLUSS_ECON", { MeteringPoint: zp, ECID: d.ECID, ConsentId: consent, DateActivate: plusTage(heute, Math.ceil(tAbschluss)), ECPartFact: d.ECPartFact, EnergyDirection: d.EnergyDirection });
    } else if (u < SIMULATOR_ANNAHMEN.zustimmung + SIMULATOR_ANNAHMEN.ablehnungKunde) {
      a(1 + Math.floor(r() * 10), "ABLEHNUNG_ECON", { ...basis, ResponseCode: "172" });
    } else {
      a(30, "ABLEHNUNG_ECON", { ...basis, ResponseCode: "173" });
    }
    return aus;
  }
  if (pc === "EC_PRTFACT_CHG" || pc === "EC_PRT_CHANGE") {
    if (r() < SIMULATOR_ANNAHMEN.tfAnnahme) a(0.01, "ANTWORT_CPF", { MeteringPoint: zp, ResponseCode: "99", DateFrom: d.DateFrom });
    else a(0.01, "ABLEHNUNG_CPF", { MeteringPoint: zp, ResponseCode: "86" });
    return aus;
  }
  if (pc === "CM_REV_SP") {
    a(0.01, "ANTWORT_CCMS", { MeteringPoint: zp, ResponseCode: "99", ConsentEnd: d.ConsentEnd });
    return aus;
  }
  if (pc === "CR_REQ_PT") {
    if (r() < SIMULATOR_ANNAHMEN.nachforderungAnnahme) {
      a(0.01, "ANTWORT_PT", { MeteringPoint: zp, ResponseCode: "99" });
      const von = String(d.DateTimeFrom).slice(0, 10);
      const bis = String(d.DateTimeTo).slice(0, 10);
      let t = von;
      for (let i = 0; i < 7 && t <= bis; i++, t = plusTage(t, 1)) a(0.5, "DATEN_CRMSG", { MeteringPoint: zp, ECID: d.ECID, tag: t });
    } else a(0.01, "ABLEHNUNG_PT", { MeteringPoint: zp, ResponseCode: "94" });
    return aus;
  }
  if (pc === "EC_PODLIST") {
    const liste = (nb.liste || []).map((x) => ({ ...x }));
    if (liste.length && r() < SIMULATOR_ANNAHMEN.podlistAbweichung) {
      const i = Math.floor(r() * liste.length);
      const tf = Number(liste[i].ECPartFact || 100);
      liste[i].ECPartFact = String(tf > 50 ? tf - 10 : tf + 10);
    }
    a(0.01, "SENDEN_ECP", { ECID: d.ECID, ECDisModel: nb.modell || "DYNAMIC", MPListData: liste });
    return aus;
  }
  return aus;
}

/** Liefert der simulierte Netzbetreiber für diesen Zählpunkt und Tag Energiedaten? (gelegentliche Lücken) */
export function simulatorLiefertTag(zaehlpunktnummer, tag, seed) {
  return zufall(`${seed}|liefer|${zaehlpunktnummer}|${tag}`)() >= SIMULATOR_ANNAHMEN.lieferluecke;
}

/**
 * Energiedaten (CR_MSG) eines Zählpunkts für einen Lokaltag: Profile für PV-Erzeugung und Haushaltsverbrauch,
 * Gemeinschaftsanteile nach dem dynamischen Modell (Fachkonzept 4.2) mit simuliertem Verhältnis Erzeugung/Verbrauch.
 * @returns {{start:string, ende:string, reihen:{meterCode:string, werte:number[], qualitaet:string[]}[]}}
 */
export function simulatorEnergiedaten({ zaehlpunktnummer, tag, richtung, teilnahmefaktor = 100, kwp = 10, jahresverbrauchKwh = 3500, seed }) {
  const r = zufall(`${seed}|daten|${zaehlpunktnummer}|${tag}`);
  const anzahl = qhAnzahl(tag);
  const start = tagBeginnUtc(tag);
  const startMs = Date.parse(start);
  const monat = Number(tag.slice(5, 7));
  const saison = 0.35 + 0.65 * Math.sin((Math.PI * (monat - 0.5)) / 12); // Winter schwach, Sommer stark
  const tageslaenge = 8.5 + 7 * Math.sin((Math.PI * (monat - 0.5)) / 12);
  const wolken = 0.3 + 0.7 * r();
  const tf = Number(teilnahmefaktor) / 100;
  const qBlockL2 = r() < 0.05 ? Math.floor(r() * anzahl) : -1;
  const qBlockL3 = r() < 0.02 ? Math.floor(r() * anzahl) : -1;
  const reihen = Object.fromEntries(GROESSEN_JE_RICHTUNG[richtung].map((g) => [g, []]));
  const qualitaet = [];
  for (let i = 0; i < anzahl; i++) {
    const ms = startMs + i * 9e5;
    const off = wienOffsetMinuten(ms);
    const d = new Date(ms + off * 60000);
    const h = d.getUTCHours() + d.getUTCMinutes() / 60 + 0.125;
    const mittag = 12.1 + (off === 120 ? 1 : 0);
    const x = (h - (mittag - tageslaenge / 2)) / tageslaenge;
    const pv = x > 0 && x < 1 ? Math.sin(Math.PI * x) : 0;
    const verhaeltnis = pv * 2.2 * wolken * saison; // E'/V' der Gemeinschaft
    const q = i >= qBlockL3 && qBlockL3 >= 0 && i < qBlockL3 + 4 ? "L3" : i >= qBlockL2 && qBlockL2 >= 0 && i < qBlockL2 + 8 ? "L2" : "L1";
    qualitaet.push(q);
    if (richtung === "erzeugung") {
      const e = r3(kwp * 0.25 * pv * saison * wolken * (0.92 + 0.08 * r()));
      const etf = r3(e * tf);
      reihen.erzeugung_gemessen.push(e);
      reihen.erzeugung_tf.push(etf);
      reihen.restueberschuss.push(r3(verhaeltnis > 1 ? etf * (1 - 1 / verhaeltnis) : 0));
    } else {
      const profil = 0.55 + 0.7 * Math.exp(-((h - 7.5) ** 2) / 2) + 1.0 * Math.exp(-((h - 19) ** 2) / 4) + 0.25 * Math.exp(-((h - 12.5) ** 2) / 3);
      const v = r3(((jahresverbrauchKwh / 365) * profil * (0.85 + 0.3 * r())) / 96 / 1.05);
      const vtf = r3(v * tf);
      const anteil = r3(vtf * verhaeltnis);
      reihen.verbrauch_gemessen.push(v);
      reihen.verbrauch_tf.push(vtf);
      reihen.anteil_erzeugung.push(anteil);
      reihen.eigendeckung.push(anteil < vtf ? anteil : vtf);
    }
  }
  return {
    start,
    ende: tagBeginnUtc(plusTage(tag, 1)),
    reihen: Object.entries(reihen).map(([g, werte]) => ({ meterCode: GROESSE_METER_CODE[g], werte, qualitaet: [...qualitaet] })),
  };
}
