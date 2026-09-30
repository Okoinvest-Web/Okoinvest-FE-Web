// src/lib/plattform/energie/markt.js
//
// Energiebeschaffung – Marktdaten als reine Funktionen (Browser, Server, Node-Tests; keine Node-Importe):
//  - Spotmarkt (Day-Ahead DE-LU und AT): Stundenmittel aus 15-min-Werten, Base/Peak/Offpeak je Monat und Jahr,
//    Solar-Capture-Preis und -Rate, Volatilität, negative Stunden
//  - Terminmarkt (Cal/Q/M, Base/Peak): Produktcodes, Lieferzeiträume, CSV-Einspielung mit Quelle/Datum,
//    aktuelle Kurve, Kaskadierung Monat → Quartal → Jahr
//  - Stundenpreiskurve (HPFC) für einen Lieferzeitraum aus Terminpreisen und historischer Stundenform
//  - Simulation (NUR Demo/Ausfall): deterministische Spot- und Terminwerte, immer als „simuliert“ gekennzeichnet
//
// Frappe: plattform/energie_kern.py (gleiche Regeln). Getestet in scripts/plattform-test-energie.mjs.
//
// Definitionen (EEX-Konvention, nach aktuellem Stand): Base = alle Stunden; Peak = Montag bis Freitag 08:00–20:00
// Ortszeit (MEZ/MESZ, auch an Feiertagen); Offpeak = übrige Stunden. DE-LU und AT sind seit 01.10.2018 getrennte
// Gebotszonen – österreichische Preise liegen meist über den deutschen (Engpass an der Grenze).

import { ortszeit as ortszeitRoh } from "../fach/lastgang.js";

// Ortszeit je Stunde zwischengespeichert (Stundenreihen rechnen dieselben Zeitpunkte vielfach)
const OZ = new Map();
export function ortszeit(ms) {
  let o = OZ.get(ms);
  if (!o) {
    o = ortszeitRoh(ms);
    if (OZ.size > 150000) OZ.clear();
    OZ.set(ms, o);
  }
  return o;
}

export const ZONEN = {
  DE: { id: "DE", bzn: "DE-LU", label: "Deutschland (DE-LU)", lat: 50.9, lon: 10.2 },
  AT: { id: "AT", bzn: "AT", label: "Österreich (AT)", lat: 47.8, lon: 14.0 },
};
export const ZONEN_IDS = Object.keys(ZONEN);

/** Datenquellen und Lizenzen – Anzeige am Diagramm, im Export und in der Doku */
export const QUELLEN = {
  energycharts: {
    label: "Energy-Charts (Fraunhofer ISE), Day-Ahead",
    lizenz: "CC BY 4.0 – Daten der Gebotszonen DE-LU und AT: Bundesnetzagentur | SMARD.de, abgerufen über api.energy-charts.info",
    url: "https://api.energy-charts.info",
  },
  simulation: {
    label: "Simulation (Demo)",
    lizenz: "Keine Marktdaten – deterministisch erzeugte Vorführwerte, nicht für Entscheidungen verwenden.",
    url: "",
  },
  manuell: { label: "Manuelle Einspielung", lizenz: "Quelle und Nutzungsrecht je Eintrag", url: "" },
  demo_termin: {
    label: "Demo-Terminkurve",
    lizenz: "Keine EEX-Daten – Vorführwerte. Terminmarktdaten der EEX sind lizenzpflichtig (EEX Group DataSource); Einspielung nur mit Lizenz oder als öffentlich zitierter Wert mit Quelle.",
    url: "",
  },
};

const H = 3600000;
const TAG = 86400000;
const rund = (x, s = 2) => (Number.isFinite(x) ? Math.round(x * 10 ** s) / 10 ** s : null);
export const mittel = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
function stdAbw(a) {
  if (a.length < 2) return null;
  const m = mittel(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

// ---------------------------------------------------------------- Zeit

/** Peak-Stunde (Mo–Fr, 08–20 Uhr Ortszeit)? */
export function istPeak(ms) {
  const o = ortszeit(ms);
  return o.wochentag < 5 && o.stunde >= 8 && o.stunde < 20;
}
export const monatVon = (ms) => {
  const o = ortszeit(ms);
  return `${o.jahr}-${String(o.monat + 1).padStart(2, "0")}`;
};
export const tagVon = (ms) => ortszeit(ms).datum;

/** Beginn eines Ortszeit-Monats „JJJJ-MM“ in UTC-ms (Mitternacht MEZ/MESZ) */
export function monatsBeginnMs(monat) {
  const [j, m] = monat.split("-").map(Number);
  // Mitternacht Ortszeit = 22 Uhr (MESZ) bzw. 23 Uhr (MEZ) UTC des Vortags
  const sommer = Date.UTC(j, m - 1, 1) - 2 * H;
  return ortszeit(sommer).stunde === 0 ? sommer : sommer + H;
}
export function naechsterMonat(monat) {
  const [j, m] = monat.split("-").map(Number);
  return m === 12 ? `${j + 1}-01` : `${j}-${String(m + 1).padStart(2, "0")}`;
}
export function monateZwischen(von, bis) {
  const out = [];
  for (let m = von; m <= bis && out.length < 240; m = naechsterMonat(m)) out.push(m);
  return out;
}

// ---------------------------------------------------------------- Spotmarkt

/**
 * Viertelstunden- oder Stundenwerte → Stundenmittel. punkte: [{t (ms), eurMwh}] aufsteigend.
 * @returns {[{t, eurMwh, n}]} t = Stundenbeginn (UTC-ms)
 */
export function stundenwerte(punkte = []) {
  const m = new Map();
  for (const p of punkte) {
    if (!Number.isFinite(p?.eurMwh) || !Number.isFinite(p?.t)) continue;
    const t = Math.floor(p.t / H) * H;
    const e = m.get(t) || { t, s: 0, n: 0 };
    e.s += p.eurMwh;
    e.n++;
    m.set(t, e);
  }
  return [...m.values()].sort((a, b) => a.t - b.t).map((e) => ({ t: e.t, eurMwh: e.s / e.n, n: e.n }));
}

/** Auflösung einer Reihe in Minuten (Median der Abstände) */
export function aufloesungMin(punkte = []) {
  const d = [];
  for (let i = 1; i < Math.min(punkte.length, 500); i++) d.push(punkte[i].t - punkte[i - 1].t);
  d.sort((a, b) => a - b);
  return d.length ? Math.round(d[Math.floor(d.length / 2)] / 60000) : 60;
}

/** Relative Solar-Einspeisung einer Stunde (0–1, Sonnenhöhe mit Jahresgang) – für Capture-Preise */
export function solarGewicht(ms, lat = 50.9, lon = 10.2) {
  const d = new Date(ms + H / 2);
  const doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / TAG) + 1;
  const phi = (lat * Math.PI) / 180;
  const dekl = ((23.44 * Math.PI) / 180) * Math.sin((2 * Math.PI * (284 + doy)) / 365);
  const utcH = d.getUTCHours() + d.getUTCMinutes() / 60;
  const ha = ((utcH + lon / 15 - 12) * 15 * Math.PI) / 180;
  const sinEl = Math.sin(phi) * Math.sin(dekl) + Math.cos(phi) * Math.cos(dekl) * Math.cos(ha);
  return sinEl > 0.02 ? sinEl : 0;
}

/**
 * Kennzahlen einer Menge von Stundenwerten.
 * @returns {base, peak, offpeak, min, max, negativ, stunden, capture, captureRate, stdAbw}
 */
export function kennzahlen(stunden = [], zone = "DE") {
  const z = ZONEN[zone] || ZONEN.DE;
  const alle = [];
  const peak = [];
  const off = [];
  let negativ = 0;
  let min = null;
  let max = null;
  let sw = 0;
  let swp = 0;
  for (const s of stunden) {
    const p = s.eurMwh;
    alle.push(p);
    (istPeak(s.t) ? peak : off).push(p);
    if (p < 0) negativ++;
    if (!min || p < min.eurMwh) min = { t: s.t, eurMwh: p };
    if (!max || p > max.eurMwh) max = { t: s.t, eurMwh: p };
    const w = solarGewicht(s.t, z.lat, z.lon);
    sw += w;
    swp += w * p;
  }
  const base = mittel(alle);
  const capture = sw > 0 ? swp / sw : null;
  return {
    stunden: alle.length,
    base: rund(base),
    peak: rund(mittel(peak)),
    offpeak: rund(mittel(off)),
    min,
    max,
    negativ,
    capture: rund(capture),
    captureRate: base && capture !== null && base > 0 ? rund(capture / base, 3) : null,
    stdAbw: rund(stdAbw(alle)),
  };
}

/** Kennzahlen je Monat: [{monat, …kennzahlen}] */
export function monatsKennzahlen(stunden = [], zone = "DE") {
  const je = new Map();
  for (const s of stunden) {
    const m = monatVon(s.t);
    if (!je.has(m)) je.set(m, []);
    je.get(m).push(s);
  }
  return [...je.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([monat, liste]) => ({ monat, ...kennzahlen(liste, zone) }));
}

/** Kennzahlen je Kalenderjahr: [{jahr, vollstaendig, …}] */
export function jahresKennzahlen(stunden = [], zone = "DE") {
  const je = new Map();
  for (const s of stunden) {
    const j = ortszeit(s.t).jahr;
    if (!je.has(j)) je.set(j, []);
    je.get(j).push(s);
  }
  return [...je.entries()].sort(([a], [b]) => a - b).map(([jahr, liste]) => ({ jahr, vollstaendig: liste.length >= 8700, ...kennzahlen(liste, zone) }));
}

/** Tagesmittel (Base) je Tag: [{tag, base, peak, min, max, negativ}] */
export function tageswerte(stunden = []) {
  const je = new Map();
  for (const s of stunden) {
    const t = tagVon(s.t);
    if (!je.has(t)) je.set(t, []);
    je.get(t).push(s);
  }
  return [...je.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([tag, liste]) => {
    const p = liste.map((x) => x.eurMwh);
    const pk = liste.filter((x) => istPeak(x.t)).map((x) => x.eurMwh);
    return { tag, base: rund(mittel(p)), peak: pk.length ? rund(mittel(pk)) : null, min: rund(Math.min(...p)), max: rund(Math.max(...p)), negativ: p.filter((x) => x < 0).length };
  });
}

/**
 * Volatilität: Standardabweichung der Stundenpreise, der Tagesbase-Änderungen (€/MWh) und
 * mittlere Tagesspanne (Max − Min). Log-Renditen sind wegen negativer Preise nicht sinnvoll.
 */
export function volatilitaet(stunden = []) {
  const tage = tageswerte(stunden);
  const diff = [];
  for (let i = 1; i < tage.length; i++) diff.push(tage[i].base - tage[i - 1].base);
  return {
    stundenStd: rund(stdAbw(stunden.map((s) => s.eurMwh))),
    tagesAenderungStd: rund(stdAbw(diff)),
    tagesSpanne: rund(mittel(tage.map((t) => t.max - t.min))),
    tage: tage.length,
  };
}

/** Negative Stunden je Monat und längste Folge */
export function negativeStunden(stunden = []) {
  let laengste = 0;
  let lauf = 0;
  const jeMonat = {};
  for (const s of stunden) {
    if (s.eurMwh < 0) {
      lauf++;
      laengste = Math.max(laengste, lauf);
      const m = monatVon(s.t);
      jeMonat[m] = (jeMonat[m] || 0) + 1;
    } else lauf = 0;
  }
  return { gesamt: Object.values(jeMonat).reduce((a, b) => a + b, 0), laengsteFolge: laengste, jeMonat };
}

/** Durchschnittliches Tagesprofil (24 Werte, Ortszeit) getrennt nach Werktag/Wochenende */
export function tagesprofil(stunden = []) {
  const s = { werktag: new Array(24).fill(0), wochenende: new Array(24).fill(0) };
  const n = { werktag: new Array(24).fill(0), wochenende: new Array(24).fill(0) };
  for (const x of stunden) {
    const o = ortszeit(x.t);
    const k = o.wochentag < 5 ? "werktag" : "wochenende";
    s[k][o.stunde] += x.eurMwh;
    n[k][o.stunde]++;
  }
  return { werktag: s.werktag.map((v, i) => rund(n.werktag[i] ? v / n.werktag[i] : null)), wochenende: s.wochenende.map((v, i) => rund(n.wochenende[i] ? v / n.wochenende[i] : null)) };
}

// ---------------------------------------------------------------- Terminmarkt: Produkte

export const TERMIN_TYPEN = { base: "Base", peak: "Peak" };
const RE_PRODUKT = /^(Cal|Q[1-4]|M(0[1-9]|1[0-2]))-(\d{2})$/;

/** Produktcode prüfen und Lieferzeitraum ermitteln: „Cal-27“, „Q1-27“, „M11-26“ → {art, von:"JJJJ-MM", bis:"JJJJ-MM", monate} */
export function produktZeitraum(code) {
  const m = RE_PRODUKT.exec(String(code || "").trim());
  if (!m) return null;
  const jahr = 2000 + Number(m[3]);
  if (m[1] === "Cal") return { code: m[0], art: "cal", jahr, von: `${jahr}-01`, bis: `${jahr}-12`, monate: 12 };
  if (m[1][0] === "Q") {
    const q = Number(m[1][1]);
    const v = (q - 1) * 3 + 1;
    return { code: m[0], art: "quartal", jahr, von: `${jahr}-${String(v).padStart(2, "0")}`, bis: `${jahr}-${String(v + 2).padStart(2, "0")}`, monate: 3 };
  }
  const mo = String(Number(m[1].slice(1))).padStart(2, "0");
  return { code: m[0], art: "monat", jahr, von: `${jahr}-${mo}`, bis: `${jahr}-${mo}`, monate: 1 };
}

/** Handelbare Standardprodukte ab Stichtag: nächste 6 Monate, 6 Quartale, 3 Kalenderjahre */
export function standardProdukte(stichtag = new Date().toISOString().slice(0, 10)) {
  const [j, mo] = stichtag.split("-").map(Number);
  const out = [];
  let mj = j;
  let mm = mo;
  for (let i = 0; i < 6; i++) {
    mm++;
    if (mm > 12) {
      mm = 1;
      mj++;
    }
    out.push(`M${String(mm).padStart(2, "0")}-${String(mj).slice(2)}`);
  }
  let qj = j;
  let q = Math.ceil(mo / 3);
  for (let i = 0; i < 6; i++) {
    q++;
    if (q > 4) {
      q = 1;
      qj++;
    }
    out.push(`Q${q}-${String(qj).slice(2)}`);
  }
  for (let i = 1; i <= 3; i++) out.push(`Cal-${String(j + i).slice(2)}`);
  return out;
}

const datumOk = (s) => /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(s || ""));
function datumLesen(s) {
  const x = String(s || "").trim();
  if (datumOk(x)) return x;
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(x);
  if (m) {
    const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return datumOk(iso) ? iso : "";
  }
  return "";
}
const preisLesen = (s) => {
  const x = String(s ?? "").trim().replace(/\s/g, "");
  if (!/^-?\d{1,4}([.,]\d{1,4})?$/.test(x)) return null;
  const n = Number(x.replace(",", "."));
  return Number.isFinite(n) && n > -500 && n < 3000 ? n : null;
};

/**
 * Terminpreis-Eintrag prüfen (manuelle Eingabe oder CSV-Zeile).
 * Pflicht: Handelstag, Zone DE|AT, Produkt (Cal/Q/M), Typ base|peak, Preis €/MWh, Quelle (Herkunft der Zahl).
 * @returns {{ok, eintrag?, fehler?}}
 */
export function terminEintragPruefen(d = {}) {
  const handelstag = datumLesen(d.handelstag);
  const zone = String(d.zone || "").toUpperCase().replace("DE-LU", "DE");
  const p = produktZeitraum(d.produkt);
  const typ = String(d.typ || "").toLowerCase();
  const preis = typeof d.preisEurMwh === "number" ? d.preisEurMwh : preisLesen(d.preisEurMwh);
  const quelle = String(d.quelle ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 160);
  if (!handelstag) return { ok: false, fehler: "Handelstag fehlt oder ist ungültig (TT.MM.JJJJ oder JJJJ-MM-TT)." };
  if (!ZONEN[zone]) return { ok: false, fehler: "Zone muss DE oder AT sein." };
  if (!p) return { ok: false, fehler: "Produkt ungültig – erwartet z. B. Cal-27, Q1-27 oder M11-26." };
  if (!TERMIN_TYPEN[typ]) return { ok: false, fehler: "Typ muss base oder peak sein." };
  if (preis === null || !Number.isFinite(preis)) return { ok: false, fehler: "Preis in €/MWh fehlt oder ist ungültig." };
  if (quelle.length < 3) return { ok: false, fehler: "Bitte die Quelle angeben (z. B. „EEX-Settlement lt. Lizenzfeed“ oder „Marktbericht XY vom …“)." };
  if (`${p.jahr}-12` < handelstag.slice(0, 7)) return { ok: false, fehler: "Der Lieferzeitraum liegt vor dem Handelstag." };
  return { ok: true, eintrag: { handelstag, zone, produkt: p.code, typ, preisEurMwh: Math.round(preis * 100) / 100, quelle } };
}

/**
 * CSV-Einspielung Terminmarkt. Spalten (Kopfzeile, Reihenfolge egal, ; oder , oder Tab):
 *   Handelstag; Zone; Produkt; Typ; Preis; Quelle
 * Quelle darf je Zeile fehlen, wenn `quelleStandard` gesetzt ist.
 * @returns {{eintraege: [], fehler: [{zeile, text}]}}
 */
export function terminCsvParsen(text, { quelleStandard = "" } = {}) {
  const zeilen = String(text || "").replace(/^﻿/, "").split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
  const fehler = [];
  const eintraege = [];
  if (zeilen.length < 2) return { eintraege, fehler: [{ zeile: 1, text: "Kopfzeile und mindestens eine Datenzeile erwartet." }] };
  const sep = zeilen[0].includes(";") ? ";" : zeilen[0].includes("\t") ? "\t" : ",";
  const kopf = zeilen[0].split(sep).map((k) => k.trim().toLowerCase().replace(/^"|"$/g, ""));
  const idx = (...namen) => kopf.findIndex((k) => namen.some((n) => k.startsWith(n)));
  const sp = { handelstag: idx("handelstag", "datum", "trading", "tag"), zone: idx("zone", "markt", "gebiet"), produkt: idx("produkt", "product", "kontrakt"), typ: idx("typ", "type", "last"), preis: idx("preis", "price", "settlement"), quelle: idx("quelle", "source") };
  for (const [k, i] of Object.entries(sp)) if (i < 0 && k !== "quelle") return { eintraege, fehler: [{ zeile: 1, text: `Spalte „${k}“ fehlt in der Kopfzeile.` }] };
  if (zeilen.length > 5001) return { eintraege, fehler: [{ zeile: 1, text: "Höchstens 5.000 Zeilen je Einspielung." }] };
  for (let i = 1; i < zeilen.length; i++) {
    const f = zeilen[i].split(sep).map((x) => x.trim().replace(/^"|"$/g, ""));
    const r = terminEintragPruefen({ handelstag: f[sp.handelstag], zone: f[sp.zone], produkt: f[sp.produkt], typ: f[sp.typ], preisEurMwh: f[sp.preis], quelle: (sp.quelle >= 0 && f[sp.quelle]) || quelleStandard });
    if (r.ok) eintraege.push(r.eintrag);
    else fehler.push({ zeile: i + 1, text: r.fehler });
  }
  return { eintraege, fehler };
}

/** Aktuelle Kurve: jüngster Eintrag je Zone/Produkt/Typ bis zum Stichtag → {`${zone}|${produkt}|${typ}`: eintrag} */
export function aktuelleKurve(eintraege = [], { stichtag = "9999-12-31" } = {}) {
  const k = {};
  for (const e of eintraege) {
    if (e.handelstag > stichtag) continue;
    const key = `${e.zone}|${e.produkt}|${e.typ}`;
    if (!k[key] || e.handelstag > k[key].handelstag || (e.handelstag === k[key].handelstag && String(e.am || "") > String(k[key].am || ""))) k[key] = e;
  }
  return k;
}

/** Kurve als Tabelle: [{produkt, zeitraum, base, peak, handelstag, quelle, demo}] je Zone, nach Lieferbeginn sortiert */
export function kurveTabelle(kurve, zone) {
  const je = new Map();
  for (const e of Object.values(kurve)) {
    if (e.zone !== zone) continue;
    const z = produktZeitraum(e.produkt);
    if (!z) continue;
    const r = je.get(e.produkt) || { produkt: e.produkt, art: z.art, von: z.von, bis: z.bis, base: null, peak: null, handelstag: e.handelstag, quelle: e.quelle, demo: !!e.demo };
    r[e.typ] = e.preisEurMwh;
    if (e.handelstag > r.handelstag) r.handelstag = e.handelstag;
    r.demo = r.demo || !!e.demo;
    je.set(e.produkt, r);
  }
  const rang = { monat: 0, quartal: 1, cal: 2 };
  return [...je.values()].sort((a, b) => rang[a.art] - rang[b.art] || a.von.localeCompare(b.von));
}

/** Terminpreis für einen Liefermonat (Kaskade Monat → Quartal → Jahr) oder null */
export function terminPreisMonat(kurve, zone, monat, typ = "base") {
  const [j, m] = monat.split("-").map(Number);
  const jj = String(j).slice(2);
  const kandidaten = [`M${String(m).padStart(2, "0")}-${jj}`, `Q${Math.ceil(m / 3)}-${jj}`, `Cal-${jj}`];
  for (const p of kandidaten) {
    const e = kurve[`${zone}|${p}|${typ}`];
    if (e) return { preis: e.preisEurMwh, produkt: p, handelstag: e.handelstag, demo: !!e.demo };
  }
  return null;
}

/** Terminpreis für einen Zeitraum (von/bis „JJJJ-MM“), mengengewichtet mit Stunden je Monat → €/MWh oder null */
export function terminPreisZeitraum(kurve, zone, von, bis, typ = "base") {
  let s = 0;
  let n = 0;
  for (const m of monateZwischen(von, bis)) {
    const p = terminPreisMonat(kurve, zone, m, typ);
    if (!p) return null;
    const stunden = (monatsBeginnMs(naechsterMonat(m)) - monatsBeginnMs(m)) / H;
    s += p.preis * stunden;
    n += stunden;
  }
  return n ? rund(s / n) : null;
}

/** Verlauf eines Produkts: [{handelstag, preis}] aufsteigend */
export function produktVerlauf(eintraege, zone, produkt, typ = "base") {
  const je = new Map();
  for (const e of eintraege) if (e.zone === zone && e.produkt === produkt && e.typ === typ) je.set(e.handelstag, e.preisEurMwh);
  return [...je.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([handelstag, preis]) => ({ handelstag, preis }));
}

/** Trend eines Produkts über `tage` Handelstage: {aenderung €/MWh, prozent, richtung} */
export function trend(verlauf, tage = 20) {
  if (verlauf.length < 2) return { aenderung: 0, prozent: 0, richtung: "seitwaerts" };
  const ende = verlauf[verlauf.length - 1].preis;
  const start = verlauf[Math.max(0, verlauf.length - 1 - tage)].preis;
  const d = ende - start;
  const p = start ? d / start : 0;
  return { aenderung: rund(d), prozent: rund(p, 4), richtung: p > 0.03 ? "steigend" : p < -0.03 ? "fallend" : "seitwaerts" };
}

// ---------------------------------------------------------------- Stundenpreiskurve (HPFC)

/**
 * Stundenform aus der Historie: Faktor je (Monat, Werktag/Wochenende, Stunde) relativ zum Mittel der Peak- bzw.
 * Offpeak-Stunden des Monats. Liefert {peak: m→[7][24], off: m→[7][24]}; fehlende Werte = 1.
 */
export function stundenform(stunden = []) {
  const summe = Array.from({ length: 12 }, () => Array.from({ length: 7 }, () => new Array(24).fill(0)));
  const anz = Array.from({ length: 12 }, () => Array.from({ length: 7 }, () => new Array(24).fill(0)));
  const mSum = Array.from({ length: 12 }, () => ({ p: 0, pn: 0, o: 0, on: 0 }));
  for (const s of stunden) {
    const o = ortszeit(s.t);
    summe[o.monat][o.wochentag][o.stunde] += s.eurMwh;
    anz[o.monat][o.wochentag][o.stunde]++;
    if (istPeak(s.t)) {
      mSum[o.monat].p += s.eurMwh;
      mSum[o.monat].pn++;
    } else {
      mSum[o.monat].o += s.eurMwh;
      mSum[o.monat].on++;
    }
  }
  return summe.map((mon, m) => {
    const pm = mSum[m].pn ? mSum[m].p / mSum[m].pn : null;
    const om = mSum[m].on ? mSum[m].o / mSum[m].on : null;
    return mon.map((tag, wt) =>
      tag.map((s, h) => {
        const n = anz[m][wt][h];
        if (!n) return 1;
        const peak = wt < 5 && h >= 8 && h < 20;
        const bezug = peak ? pm : om;
        // Bezug nahe 0 (viele negative Stunden) → keine Form, sonst übertriebene Faktoren
        if (!bezug || Math.abs(bezug) < 15) return 1;
        return Math.max(-1.5, Math.min(3, s / n / bezug));
      })
    );
  });
}

/**
 * Stundenpreise (€/MWh) für einen Lieferzeitraum aus der Terminkurve und der historischen Stundenform.
 * Offpeak-Preis aus Base und Peak: (Base × Stunden − Peak × Peakstunden) / Offpeakstunden.
 * @returns {{startMs, werte: Float64Array, fehlend: string[]}} fehlend = Monate ohne Terminpreis (dort Base der Historie)
 */
export function stundenpreiskurve({ kurve, zone = "DE", von, bis, form, ersatzBase = 90 }) {
  const startMs = monatsBeginnMs(von);
  const endeMs = monatsBeginnMs(naechsterMonat(bis));
  const n = Math.round((endeMs - startMs) / H);
  const werte = new Float64Array(n);
  const fehlend = [];
  for (const m of monateZwischen(von, bis)) {
    const a = monatsBeginnMs(m);
    const b = monatsBeginnMs(naechsterMonat(m));
    const baseE = terminPreisMonat(kurve, zone, m, "base");
    const peakE = terminPreisMonat(kurve, zone, m, "peak");
    if (!baseE) fehlend.push(m);
    const base = baseE?.preis ?? ersatzBase;
    let np = 0;
    let na = 0;
    for (let t = a; t < b; t += H) {
      na++;
      if (istPeak(t)) np++;
    }
    const peak = peakE?.preis ?? base * 1.08;
    const off = na - np > 0 ? (base * na - peak * np) / (na - np) : base;
    const mi = Number(m.slice(5)) - 1;
    // Form so skalieren, dass die Mittel je Klasse exakt Peak bzw. Offpeak treffen
    let fp = 0;
    let fo = 0;
    for (let t = a; t < b; t += H) {
      const o = ortszeit(t);
      const f = form ? form[mi][o.wochentag][o.stunde] : 1;
      if (istPeak(t)) fp += f;
      else fo += f;
    }
    const kp = np && fp ? np / fp : 1;
    const ko = na - np && fo ? (na - np) / fo : 1;
    for (let t = a; t < b; t += H) {
      const o = ortszeit(t);
      const f = form ? form[mi][o.wochentag][o.stunde] : 1;
      const i = Math.round((t - startMs) / H);
      werte[i] = istPeak(t) ? peak * f * kp : off * f * ko;
    }
  }
  return { startMs, werte, fehlend };
}

// ---------------------------------------------------------------- Simulation (nur Demo/Ausfall)

function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const MONATS_BASE = [118, 108, 94, 80, 70, 72, 84, 88, 98, 106, 118, 120];

/**
 * Deterministische Stundenpreise (Demo): Jahresgang, Tagesgang (Morgen-/Abendspitze), Solardelle mittags mit
 * negativen Stunden an sonnigen Wochenenden im Frühjahr/Sommer, Zufallsanteil je Tag. AT ≈ DE + Aufschlag.
 * @returns {[{t, eurMwh}]} stündlich
 */
export function simulierteSpotpreise({ zone = "DE", vonMs, bisMs }) {
  const out = [];
  const z = ZONEN[zone] || ZONEN.DE;
  let tagSeed = null;
  let tagFaktor = 1;
  let sonne = 0.5;
  for (let t = Math.floor(vonMs / H) * H; t < bisMs; t += H) {
    const o = ortszeit(t);
    const key = o.jahr * 1000 + o.monat * 40 + o.tag;
    if (key !== tagSeed) {
      tagSeed = key;
      const r = prng(key * 7 + (zone === "AT" ? 13 : 0));
      tagFaktor = 0.75 + r() * 0.5;
      sonne = r();
    }
    const r = prng(Math.floor(t / H));
    const base = MONATS_BASE[o.monat] * tagFaktor;
    const tagesgang = [0.82, 0.78, 0.76, 0.76, 0.8, 0.9, 1.08, 1.22, 1.2, 1.08, 0.98, 0.9, 0.86, 0.88, 0.95, 1.05, 1.15, 1.3, 1.38, 1.32, 1.18, 1.05, 0.95, 0.88][o.stunde];
    const we = o.wochentag >= 5 ? 0.85 : 1;
    const solar = solarGewicht(t, z.lat, z.lon) * (0.4 + sonne) * (o.monat >= 3 && o.monat <= 8 ? 1.25 : 0.6);
    let p = base * tagesgang * we - solar * base * (o.wochentag >= 5 ? 1.05 : 0.62) + (r() - 0.5) * 12;
    if (zone === "AT") p = p + 6 + Math.max(0, -p) * 0.6; // AT: meist höher, seltener negativ
    out.push({ t, eurMwh: Math.round(p * 100) / 100 });
  }
  return out;
}

/**
 * Demo-Terminkurve: Handelstage (Mo–Fr) der letzten `tage` Kalendertage bis Stichtag für die Standardprodukte,
 * Zufallspfad je Produkt um ein Ausgangsniveau. Einträge tragen demo: true und Quelle „Demo-Terminkurve“.
 */
export function demoTerminkurve({ stichtag = new Date().toISOString().slice(0, 10), tage = 120 } = {}) {
  const produkte = standardProdukte(stichtag);
  const ende = Date.parse(`${stichtag}T12:00:00Z`);
  const out = [];
  for (const zone of ZONEN_IDS) {
    for (const produkt of produkte) {
      const z = produktZeitraum(produkt);
      const monate = monateZwischen(z.von, z.bis).map((m) => Number(m.slice(5)) - 1);
      const saison = mittel(monate.map((m) => MONATS_BASE[m])) / mittel(MONATS_BASE);
      const niveau = (zone === "AT" ? 116 : 106) * (z.art === "cal" ? 1 : saison) * (1 - (z.jahr - Number(stichtag.slice(0, 4)) - 1) * 0.05);
      const r = prng(produkt.split("").reduce((s, c) => s * 31 + c.charCodeAt(0), 7) + (zone === "AT" ? 99 : 0));
      let x = niveau * (0.94 + r() * 0.12);
      for (let t = ende - tage * TAG; t <= ende; t += TAG) {
        const wd = new Date(t).getUTCDay();
        x += (r() - 0.5) * 2.4 + (niveau - x) * 0.03;
        if (wd === 0 || wd === 6) continue;
        const handelstag = new Date(t).toISOString().slice(0, 10);
        const base = Math.round(x * 100) / 100;
        const peakAuf = z.art === "monat" && [4, 5, 6, 7].includes(monate[0]) ? 0.97 : 1.07; // Sommer: Solar drückt Peak
        out.push({ handelstag, zone, produkt, typ: "base", preisEurMwh: base, quelle: QUELLEN.demo_termin.label, demo: true });
        out.push({ handelstag, zone, produkt, typ: "peak", preisEurMwh: Math.round(base * peakAuf * 100) / 100, quelle: QUELLEN.demo_termin.label, demo: true });
      }
    }
  }
  return out;
}
