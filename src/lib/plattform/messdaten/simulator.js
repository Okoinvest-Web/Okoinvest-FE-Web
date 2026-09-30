// src/lib/plattform/messdaten/simulator.js
//
// Messdaten-Simulator für den Demo-Betrieb (kein MQTT, keine Datenbank). Deterministisch: Jeder Wert ergibt sich
// allein aus Anlage (Kennung, kWp, Region, Typ, Speicher, Lastprofil, Inbetriebnahme, Szenario) und Zeitpunkt –
// derselbe Aufruf liefert immer dieselbe Kurve, auch über Serverneustarts hinweg.
//
//  - PV: Tagesenergie = Jahresprognose (Region × kWp × Bauart, markt.js) × Monatsanteil × Wetter des Tages
//    (gleiches Wetter für Anlagen derselben Region), verteilt nach Sonnenstand (Breitengrad, Deklination),
//    Wolkenrauschen je Viertelstunde, Abregelung bei 90 % der Nennleistung.
//  - Last: Gewerbe/Industrie/Landwirtschaft nach Ortszeit (Sommerzeit), Wochentag und Jahreszeit.
//  - Speicher: Eigenverbrauchsoptimierung (Überschuss laden, Defizit entladen, SOC 8–95 %, Wirkungsgrad) bzw.
//    Lastspitzenkappung für reine Speicher (nachts aus dem Netz laden).
//  - Zähler: kumulierte Tagessummen seit Inbetriebnahme – streng monoton.
//  - Störungen: gelegentliche Wechselrichterabschaltungen (≈ 1 % der Tage, 2–4 h, ein Wechselrichter) sowie
//    Szenarien je Anlage (`simulation.szenario`: offline | wr_teilausfall | minderleistung, ab `simulation.seit`).
//
// Schnittstelle identisch zu dienst.js (siehe messdaten/index.js).

import { ALLGEMEIN } from "@/lib/invest/markt";
import { GRENZWERTE, prognoseJahrKwh } from "../anlagen";

export const name = "simulator";

const TAG_MS = 86400000;
const SLOTS = 96;
const SLOT_MS = 900000;
const DT_H = 0.25;

const REGION_GEO = { "de-nord": [53.6, 10], "de-ost": [51.8, 12.5], "de-west": [50.7, 7.5], "de-sued": [48.4, 10.9], at: [47.9, 13.8], ch: [47.2, 8.0] };
const FEHLERCODES = ["E-1107 Isolationswiderstand zu gering", "E-2031 Netzüberspannung", "E-3302 Übertemperatur Leistungsteil", "E-4410 Kommunikation DC-Strang"];

// ---------------------------------------------------------------- deterministischer Zufall

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function zufall(s) {
  let t = (hash(s) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- Zeit

const tagNr = (ms) => Math.floor(ms / TAG_MS);
const tagDatum = (t) => new Date(t * TAG_MS);

function letzterSonntag(jahr, monat) {
  const d = new Date(Date.UTC(jahr, monat + 1, 0));
  return d.getUTCDate() - d.getUTCDay();
}
/** Ortszeit-Versatz Mitteleuropa (MEZ/MESZ) in Stunden */
function versatz(ms) {
  const d = new Date(ms);
  const j = d.getUTCFullYear();
  const beginn = Date.UTC(j, 2, letzterSonntag(j, 2), 1);
  const ende = Date.UTC(j, 9, letzterSonntag(j, 9), 1);
  return ms >= beginn && ms < ende ? 2 : 1;
}
const tagDesJahres = (d) => Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / TAG_MS) + 1;
const tageImMonat = (j, m) => new Date(Date.UTC(j, m + 1, 0)).getUTCDate();

// ---------------------------------------------------------------- Parameter der Anlage

function parameter(a) {
  const kwp = Math.max(0, Number(a.kwp) || 0);
  const speicherKwh = Math.max(0, Number(a.speicherKwh) || 0);
  return {
    id: String(a.id || "anlage"),
    kwp,
    regionId: REGION_GEO[a.regionId] ? a.regionId : "de-sued",
    typ: a.typ || "dach",
    speicherKwh,
    speicherKw: Math.max(0, Number(a.speicherKw) || speicherKwh * 0.5),
    lastprofil: a.lastprofil || "gewerbe",
    lastJahrKwh: Math.max(0, Number(a.lastJahrKwh) || 0),
    wr: Math.max(1, Math.round(Number(a.wechselrichterAnzahl) || 1)),
    ibnTag: a.inbetriebnahme ? tagNr(new Date(`${String(a.inbetriebnahme).slice(0, 10)}T00:00:00Z`).getTime()) : tagNr(Date.now()) - 365,
    szenario: a.simulation?.szenario || null,
    keine: !!a.simulation?.keineDaten, // noch kein Gerät verbunden → keine Messwerte
    seit: a.simulation?.seit ? new Date(a.simulation.seit).getTime() : null,
    betrieb: (a.status || "betrieb") === "betrieb",
    jahr: prognoseJahrKwh({ ...a, inbetriebnahme: a.inbetriebnahme }, new Date().getFullYear()),
    prognose: (jahr) => prognoseJahrKwh(a, jahr),
  };
}
const schluessel = (p) => [p.id, p.kwp, p.regionId, p.typ, p.speicherKwh, p.speicherKw, p.lastprofil, p.lastJahrKwh, p.wr, p.ibnTag, p.szenario, p.seit, p.betrieb, p.keine].join("|");

// ---------------------------------------------------------------- Bausteine

/** Sonnenprofil eines Tages (96 Gewichte, Summe 1) */
const profilCache = new Map();
function sonnenprofil(regionId, typ, t) {
  const d = tagDatum(t);
  const doy = tagDesJahres(d);
  const k = `${regionId}|${typ}|${doy}`;
  if (profilCache.has(k)) return profilCache.get(k);
  const [lat, lon] = REGION_GEO[regionId];
  const phi = (lat * Math.PI) / 180;
  const dekl = ((23.44 * Math.PI) / 180) * Math.sin((2 * Math.PI * (284 + doy)) / 365);
  const exponent = typ === "freiflaeche" || typ === "agri" ? 1.25 : 1.0; // Ost/West-Dächer: breiteres Profil
  const w = new Float64Array(SLOTS);
  let summe = 0;
  for (let s = 0; s < SLOTS; s++) {
    const utcH = (s + 0.5) * DT_H;
    const sonnenzeit = utcH + lon / 15;
    const h = ((sonnenzeit - 12) * 15 * Math.PI) / 180;
    const sinEl = Math.sin(phi) * Math.sin(dekl) + Math.cos(phi) * Math.cos(dekl) * Math.cos(h);
    w[s] = sinEl > 0.02 ? sinEl ** exponent : 0;
    summe += w[s];
  }
  if (summe > 0) for (let s = 0; s < SLOTS; s++) w[s] /= summe;
  profilCache.set(k, w);
  return w;
}

/** Wetter des Tages je Region: Faktor auf die mittlere Tagesenergie (Mittel ≈ 1) und Unruhe */
function wetter(regionId, t) {
  const r = zufall(`w|${regionId}|${t}`);
  const r2 = zufall(`w2|${regionId}|${t}`);
  let faktor;
  let unruhe;
  if (r < 0.28) [faktor, unruhe] = [0.25 + 0.3 * r2, 0.25];
  else if (r < 0.72) [faktor, unruhe] = [0.75 + 0.45 * r2, 0.55];
  else [faktor, unruhe] = [1.25 + 0.2 * r2, 0.08];
  return { faktor: faktor / 0.919, unruhe, art: r < 0.28 ? "bedeckt" : r < 0.72 ? "wechselhaft" : "sonnig" };
}

const LAST_FORM = {
  gewerbe(h, wt) {
    if (wt === 0) return 0.42;
    if (wt === 6) return h >= 7 && h < 13 ? 0.9 : 0.45;
    if (h < 6) return 0.45;
    if (h < 7) return 0.9;
    if (h < 17) return 1.55;
    if (h < 19) return 1.0;
    if (h < 22) return 0.6;
    return 0.45;
  },
  industrie(h, wt) {
    if (wt === 0) return 0.55;
    if (wt === 6) return 0.8;
    return h >= 6 && h < 22 ? 1.12 : 0.9;
  },
  landwirtschaft(h) {
    if (h >= 5 && h < 8) return 1.6;
    if (h >= 17 && h < 20) return 1.6;
    if (h >= 8 && h < 17) return 1.0;
    return 0.5;
  },
  keins: () => 0,
};
const formMittel = {};
function lastMittel(profil) {
  if (formMittel[profil] !== undefined) return formMittel[profil];
  const f = LAST_FORM[profil] || LAST_FORM.gewerbe;
  let s = 0;
  for (let wt = 0; wt < 7; wt++) for (let q = 0; q < SLOTS; q++) s += f(q / 4, wt);
  formMittel[profil] = s / (7 * SLOTS) || 1;
  return formMittel[profil];
}

// ---------------------------------------------------------------- Tagessimulation

const tagCache = new Map();
const TAG_CACHE_MAX = 6000;

function socStart(p, t) {
  if (!p.speicherKwh) return 0;
  const vortag = simulieren(p, t - 1, p.speicherKwh * 0.12, false);
  return vortag.socEnde;
}

/**
 * Simuliert einen UTC-Tag. Ergebnis je Viertelstunde (kW): pv, last, speicher (+ laden / − entladen), netz (+ Bezug / − Einspeisung),
 * soc (%), fehler (Code|null), da (Messwert vorhanden). Summen in kWh.
 */
function simulieren(p, t, startKwh, mitCache = true) {
  const k = mitCache ? `${schluessel(p)}|${t}` : null;
  if (k && tagCache.has(k)) return tagCache.get(k);
  const beginn = t * TAG_MS;
  const d = tagDatum(t);
  const monat = d.getUTCMonth();
  const jahr = d.getUTCFullYear();
  const doy = tagDesJahres(d);
  const wochentagUtc = d.getUTCDay();
  const off = versatz(beginn + 12 * 3600e3);
  const vorIbn = t < p.ibnTag;
  const aktiv = p.betrieb && !vorIbn;

  const pv = new Float64Array(SLOTS);
  const last = new Float64Array(SLOTS);
  const speicher = new Float64Array(SLOTS);
  const netz = new Float64Array(SLOTS);
  const soc = new Float64Array(SLOTS);
  const fehler = new Array(SLOTS).fill(null);
  const da = new Array(SLOTS).fill(aktiv);

  // PV
  if (aktiv && p.kwp > 0) {
    const jahrKwh = p.prognose(jahr) || p.jahr;
    const anteil = (ALLGEMEIN.pvMonatsanteile?.[monat] ?? 1 / 12) / tageImMonat(jahr, monat);
    const w = wetter(p.regionId, t);
    const tagKwh = jahrKwh * anteil * w.faktor;
    const form = sonnenprofil(p.regionId, p.typ, t);
    let wolke = 1;
    for (let s = 0; s < SLOTS; s++) {
      // geglättetes Wolkenrauschen (Zufallsweg)
      wolke = 0.6 * wolke + 0.4 * (1 + w.unruhe * (zufall(`c|${p.regionId}|${t}|${s}`) * 2 - 1) * 1.4);
      const lokal = 1 + 0.04 * (zufall(`l|${p.id}|${t}|${s}`) * 2 - 1);
      pv[s] = Math.max(0, Math.min(p.kwp * 0.9, (tagKwh * form[s] * Math.max(0.05, wolke) * lokal) / DT_H));
    }
    // gelegentliche Abschaltung eines Wechselrichters
    const rf = zufall(`f|${p.id}|${t}`);
    if (rf < 0.012) {
      const s0 = 36 + Math.floor(zufall(`f0|${p.id}|${t}`) * 16);
      const laenge = 8 + Math.floor(zufall(`fl|${p.id}|${t}`) * 9);
      const code = FEHLERCODES[Math.floor(zufall(`fc|${p.id}|${t}`) * FEHLERCODES.length)];
      for (let s = s0; s < Math.min(SLOTS, s0 + laenge); s++) {
        pv[s] *= 1 - 1 / p.wr;
        fehler[s] = code;
      }
    }
  }

  // Last
  if (aktiv && p.lastJahrKwh > 0 && p.lastprofil !== "keins") {
    const f = LAST_FORM[p.lastprofil] || LAST_FORM.gewerbe;
    const basis = p.lastJahrKwh / 8760 / lastMittel(p.lastprofil);
    const saison = 1 + 0.12 * Math.cos((2 * Math.PI * (doy - 15)) / 365);
    for (let s = 0; s < SLOTS; s++) {
      const ortH = (s * DT_H + off) % 24;
      const wt = (s * DT_H + off >= 24 ? wochentagUtc + 1 : wochentagUtc) % 7;
      const rausch = 1 + 0.08 * (zufall(`v|${p.id}|${t}|${s}`) * 2 - 1);
      last[s] = basis * f(ortH, wt) * saison * rausch;
    }
  }

  // Szenarien
  if (aktiv && p.szenario && p.seit) {
    for (let s = 0; s < SLOTS; s++) {
      const ts = beginn + s * SLOT_MS;
      if (ts < p.seit) continue;
      if (p.szenario === "wr_teilausfall") {
        pv[s] *= 1 - 1 / p.wr;
        fehler[s] = FEHLERCODES[0];
      } else if (p.szenario === "minderleistung") pv[s] *= 0.52;
      else if (p.szenario === "offline") da[s] = false;
    }
  }

  // Speicher
  let e = startKwh ?? (p.speicherKwh ? p.speicherKwh * 0.12 : 0);
  const min = p.speicherKwh * 0.08;
  const max = p.speicherKwh * 0.95;
  const eta = 0.96;
  const spitze = p.lastJahrKwh ? (p.lastJahrKwh / 8760) * 1.35 : 0;
  const summen = { erzeugungKwh: 0, verbrauchKwh: 0, netzbezugKwh: 0, einspeisungKwh: 0, ladenKwh: 0, entladenKwh: 0, eigenverbrauchKwh: 0 };
  for (let s = 0; s < SLOTS; s++) {
    let ladung = 0; // + laden, − entladen (kW, AC-seitig)
    if (aktiv && p.speicherKwh > 0) {
      if (p.kwp > 0) {
        const ueber = pv[s] - last[s];
        if (ueber > 0) ladung = Math.min(ueber, p.speicherKw, Math.max(0, (max - e) / (DT_H * eta)));
        else ladung = -Math.min(-ueber, p.speicherKw, Math.max(0, ((e - min) * eta) / DT_H));
      } else {
        // reiner Speicher: nachts (Ortszeit 0–5 Uhr) laden, Lastspitzen kappen
        const ortH = (s * DT_H + off) % 24;
        if (ortH < 5) ladung = Math.min(p.speicherKw * 0.6, Math.max(0, (max - e) / (DT_H * eta)));
        else if (last[s] > spitze) ladung = -Math.min(last[s] - spitze, p.speicherKw, Math.max(0, ((e - min) * eta) / DT_H));
      }
      e += ladung > 0 ? ladung * DT_H * eta : (ladung * DT_H) / eta;
    }
    speicher[s] = ladung;
    soc[s] = p.speicherKwh ? (e / p.speicherKwh) * 100 : 0;
    netz[s] = last[s] + ladung - pv[s];
    if (!da[s]) continue;
    const pvDirekt = Math.min(pv[s], last[s]);
    summen.erzeugungKwh += pv[s] * DT_H;
    summen.verbrauchKwh += last[s] * DT_H;
    summen.netzbezugKwh += Math.max(0, netz[s]) * DT_H;
    summen.einspeisungKwh += Math.max(0, -netz[s]) * DT_H;
    summen.ladenKwh += Math.max(0, ladung) * DT_H;
    summen.entladenKwh += Math.max(0, -ladung) * DT_H;
    summen.eigenverbrauchKwh += (pvDirekt + (p.kwp > 0 ? Math.max(0, -ladung) : 0)) * DT_H;
  }
  const erg = { t, beginn, mitPv: p.kwp > 0, pv, last, speicher, netz, soc, fehler, da, summen, socEnde: e, wetter: p.kwp ? wetter(p.regionId, t).art : null };
  if (k) {
    if (tagCache.size > TAG_CACHE_MAX) tagCache.delete(tagCache.keys().next().value);
    tagCache.set(k, erg);
  }
  return erg;
}

function tag(p, t) {
  const k = `${schluessel(p)}|${t}`;
  if (tagCache.has(k)) return tagCache.get(k);
  return simulieren(p, t, socStart(p, t));
}

/** Teilsummen eines Tages bis ausschließlich Viertelstunde `bisSlot` (+ Bruchteil) */
function teilsumme(sim, bisSlot, bruch = 0) {
  const s = { erzeugungKwh: 0, verbrauchKwh: 0, netzbezugKwh: 0, einspeisungKwh: 0, ladenKwh: 0, entladenKwh: 0, eigenverbrauchKwh: 0 };
  const add = (i, f) => {
    if (!sim.da[i]) return;
    const pvDirekt = Math.min(sim.pv[i], sim.last[i]);
    s.erzeugungKwh += sim.pv[i] * DT_H * f;
    s.verbrauchKwh += sim.last[i] * DT_H * f;
    s.netzbezugKwh += Math.max(0, sim.netz[i]) * DT_H * f;
    s.einspeisungKwh += Math.max(0, -sim.netz[i]) * DT_H * f;
    s.ladenKwh += Math.max(0, sim.speicher[i]) * DT_H * f;
    s.entladenKwh += Math.max(0, -sim.speicher[i]) * DT_H * f;
    s.eigenverbrauchKwh += (pvDirekt + (sim.mitPv ? Math.max(0, -sim.speicher[i]) : 0)) * DT_H * f;
  };
  for (let i = 0; i < Math.min(SLOTS, bisSlot); i++) add(i, 1);
  if (bruch > 0 && bisSlot < SLOTS) add(bisSlot, bruch);
  return s;
}

const plus = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] || 0)]));
const NULL_SUMME = () => ({ erzeugungKwh: 0, verbrauchKwh: 0, netzbezugKwh: 0, einspeisungKwh: 0, ladenKwh: 0, entladenKwh: 0, eigenverbrauchKwh: 0 });

/** Kumulierte Tagessummen seit Inbetriebnahme (Zählerstände), zwischengespeichert je Anlage */
const kumCache = new Map();
function kumuliertBis(p, t) {
  const k = schluessel(p);
  let c = kumCache.get(k);
  if (!c) {
    // Startwerte: fiktive Zählerstände bei Inbetriebnahme (Zähler sind nie genau null – Tausch, Prüfung)
    c = { tage: [], start: { erzeugungKwh: Math.round(zufall(`z|${p.id}`) * 40), netzbezugKwh: Math.round(zufall(`zb|${p.id}`) * 900), einspeisungKwh: 0 } };
    kumCache.set(k, c);
    if (kumCache.size > 200) kumCache.delete(kumCache.keys().next().value);
  }
  const n = Math.max(0, t - p.ibnTag);
  while (c.tage.length < n) {
    const tt = p.ibnTag + c.tage.length;
    const s = tag(p, tt).summen;
    const vor = c.tage.length ? c.tage[c.tage.length - 1] : { erzeugungKwh: c.start.erzeugungKwh, netzbezugKwh: c.start.netzbezugKwh, einspeisungKwh: c.start.einspeisungKwh };
    c.tage.push({ erzeugungKwh: vor.erzeugungKwh + s.erzeugungKwh, netzbezugKwh: vor.netzbezugKwh + s.netzbezugKwh, einspeisungKwh: vor.einspeisungKwh + s.einspeisungKwh });
  }
  return n ? c.tage[n - 1] : { ...c.start };
}

function zaehlerBei(p, ms) {
  const t = tagNr(ms);
  const basis = kumuliertBis(p, t);
  if (t < p.ibnTag) return { erzeugungKwh: 0, netzbezugKwh: 0, einspeisungKwh: 0 };
  const sim = tag(p, t);
  const pos = (ms - t * TAG_MS) / SLOT_MS;
  const teil = teilsumme(sim, Math.floor(pos), pos - Math.floor(pos));
  return { erzeugungKwh: basis.erzeugungKwh + teil.erzeugungKwh, netzbezugKwh: basis.netzbezugKwh + teil.netzbezugKwh, einspeisungKwh: basis.einspeisungKwh + teil.einspeisungKwh };
}

/** Letzter Zeitpunkt mit Messwert (Szenario „offline“: Beginn des Ausfalls) */
function letzterTs(p, jetzt) {
  if (!p.betrieb || p.keine) return null;
  if (jetzt < p.ibnTag * TAG_MS) return null;
  if (p.szenario === "offline" && p.seit && p.seit <= jetzt) return p.seit;
  return Math.floor(jetzt / 10000) * 10000 - 3000; // Telegramm alle 10 s, 3 s Laufzeit
}

// ---------------------------------------------------------------- Schnittstelle

const rund = (v, s = 2) => (Number.isFinite(v) ? Math.round(v * 10 ** s) / 10 ** s : null);

/** Aktueller Messwert (wie letztes Telegramm) */
export async function aktuell(a, { jetzt = Date.now() } = {}) {
  return aktuellSync(a, jetzt);
}

function aktuellSync(a, jetzt) {
  const p = parameter(a);
  const ts = letzterTs(p, jetzt);
  if (ts == null) return null;
  const t = tagNr(ts);
  const sim = tag(p, t);
  const s = Math.min(SLOTS - 1, Math.floor((ts - t * TAG_MS) / SLOT_MS));
  const m = 1 + 0.03 * (zufall(`m|${p.id}|${Math.floor(ts / 10000)}`) * 2 - 1);
  const pvKw = sim.pv[s] * m;
  const verbrauchKw = sim.last[s] * (1 + 0.02 * (zufall(`mv|${p.id}|${Math.floor(ts / 10000)}`) * 2 - 1));
  // Speicher regelt auf den tatsächlichen (verrauschten) Überschuss bzw. Bedarf – kein Scheinexport beim Entladen
  const roh = sim.speicher[s];
  const speicherKw = roh < 0 ? -Math.min(-roh, Math.max(0, verbrauchKw - pvKw)) : roh > 0 && p.kwp > 0 ? Math.min(roh, Math.max(0, pvKw - verbrauchKw)) : roh;
  const netzKw = verbrauchKw + speicherKw - pvKw;
  const z = zaehlerBei(p, ts);
  const heute = teilsumme(sim, s, (ts - t * TAG_MS - s * SLOT_MS) / SLOT_MS);
  const fehler = sim.fehler[s];
  return {
    ts: new Date(ts).toISOString(),
    pvKw: rund(pvKw),
    verbrauchKw: rund(verbrauchKw),
    netzKw: rund(netzKw),
    speicherKw: p.speicherKwh ? rund(speicherKw) : null,
    speicherSocPct: p.speicherKwh ? rund(sim.soc[s], 1) : null,
    wechselrichterStatus: p.kwp ? (fehler ? "stoerung" : pvKw > 0.01 ? "ok" : "aus") : null,
    fehlercode: fehler,
    zaehler: { erzeugungKwh: rund(z.erzeugungKwh, 1), netzbezugKwh: rund(z.netzbezugKwh, 1), einspeisungKwh: rund(z.einspeisungKwh, 1) },
    heute: Object.fromEntries(Object.entries(heute).map(([k, v]) => [k, rund(v, 1)])),
    erwartetKw: rund(erwartungKw(a, ts), 1),
    wetter: sim.wetter,
    quelle: "simulator",
  };
}

/** Erwartete PV-Leistung zum Zeitpunkt bei klarem bis wechselhaftem Himmel (für die Minderleistungsregel) */
export function erwartungKw(a, ms = Date.now()) {
  const p = parameter(a);
  if (!p.kwp || !p.betrieb) return 0;
  const t = tagNr(ms);
  const d = tagDatum(t);
  const monat = d.getUTCMonth();
  const tagKwh = (p.prognose(d.getUTCFullYear()) || p.jahr) * ((ALLGEMEIN.pvMonatsanteile?.[monat] ?? 1 / 12) / tageImMonat(d.getUTCFullYear(), monat)) * wetter(p.regionId, t).faktor;
  const s = Math.min(SLOTS - 1, Math.floor((ms - t * TAG_MS) / SLOT_MS));
  return Math.min(p.kwp * 0.9, (tagKwh * sonnenprofil(p.regionId, p.typ, t)[s]) / DT_H);
}

/** Summen über einen Zeitraum [von, bis) in kWh */
export async function summen(a, { von, bis, jetzt = Date.now() } = {}) {
  return summenSync(parameter(a), new Date(von).getTime(), Math.min(new Date(bis).getTime(), jetzt), jetzt);
}

function summenSync(p, von, bis, jetzt) {
  let s = NULL_SUMME();
  if (!(bis > von)) return s;
  const letzte = letzterTs(p, jetzt);
  const ende = letzte == null ? von : Math.min(bis, letzte);
  for (let t = tagNr(von); t <= tagNr(ende - 1); t++) {
    if (t < p.ibnTag) continue;
    const sim = tag(p, t);
    const a0 = Math.max(von, t * TAG_MS);
    const a1 = Math.min(ende, (t + 1) * TAG_MS);
    if (a0 === t * TAG_MS && a1 === (t + 1) * TAG_MS) s = plus(s, sim.summen);
    else {
      const bis1 = (a1 - t * TAG_MS) / SLOT_MS;
      const von1 = (a0 - t * TAG_MS) / SLOT_MS;
      const oben = teilsumme(sim, Math.floor(bis1), bis1 - Math.floor(bis1));
      const unten = teilsumme(sim, Math.floor(von1), von1 - Math.floor(von1));
      s = plus(s, Object.fromEntries(Object.keys(oben).map((k) => [k, oben[k] - unten[k]])));
    }
  }
  return s;
}

/** Zeitreihe: aufloesung 15min | 1h | 1d | 1mon (höchstens 3000 Punkte) */
export async function reihe(a, { von, bis, aufloesung = "1h", jetzt = Date.now() } = {}) {
  const p = parameter(a);
  const v = new Date(von).getTime();
  const letzte = letzterTs(p, jetzt);
  const b = Math.min(new Date(bis).getTime(), letzte ?? v);
  const punkte = [];
  if (!(b > v)) return { aufloesung, punkte };
  if (aufloesung === "15min" || aufloesung === "1h") {
    const schritt = aufloesung === "15min" ? 1 : 4;
    for (let t = tagNr(v); t <= tagNr(b - 1) && punkte.length < 3000; t++) {
      if (t < p.ibnTag) continue;
      const sim = tag(p, t);
      for (let s = 0; s < SLOTS; s += schritt) {
        const ts = t * TAG_MS + s * SLOT_MS;
        if (ts < v || ts >= b) continue;
        let pv = 0, last = 0, sp = 0, netzB = 0, netzE = 0, soc = 0, n = 0, fehler = null;
        for (let i = s; i < s + schritt; i++) {
          if (!sim.da[i] || t * TAG_MS + i * SLOT_MS >= b) continue;
          n++;
          pv += sim.pv[i]; last += sim.last[i]; sp += sim.speicher[i]; soc = sim.soc[i];
          netzB += Math.max(0, sim.netz[i]); netzE += Math.max(0, -sim.netz[i]);
          fehler ||= sim.fehler[i];
        }
        if (!n) continue;
        punkte.push({
          ts: new Date(ts).toISOString(),
          pvKw: rund(pv / n), verbrauchKw: rund(last / n), speicherKw: p.speicherKwh ? rund(sp / n) : null, speicherSocPct: p.speicherKwh ? rund(soc, 1) : null,
          netzbezugKw: rund(netzB / n), einspeisungKw: rund(netzE / n),
          erzeugungKwh: rund(pv * DT_H), verbrauchKwh: rund(last * DT_H), netzbezugKwh: rund(netzB * DT_H), einspeisungKwh: rund(netzE * DT_H),
          fehlercode: fehler,
        });
      }
    }
    return { aufloesung, punkte };
  }
  // Tage bzw. Monate aus Tagessummen
  const eintrag = (ts, s, tage) => ({
    ts: new Date(ts).toISOString(),
    erzeugungKwh: rund(s.erzeugungKwh, 1), verbrauchKwh: rund(s.verbrauchKwh, 1), netzbezugKwh: rund(s.netzbezugKwh, 1), einspeisungKwh: rund(s.einspeisungKwh, 1),
    eigenverbrauchKwh: rund(s.eigenverbrauchKwh, 1), ladenKwh: rund(s.ladenKwh, 1), entladenKwh: rund(s.entladenKwh, 1),
    pvKw: rund(s.erzeugungKwh / (24 * tage)), verbrauchKw: rund(s.verbrauchKwh / (24 * tage)),
  });
  if (aufloesung === "1d") {
    for (let t = tagNr(v); t <= tagNr(b - 1) && punkte.length < 3000; t++) {
      if (t < p.ibnTag) continue;
      const s = summenSync(p, Math.max(v, t * TAG_MS), Math.min(b, (t + 1) * TAG_MS), jetzt);
      punkte.push(eintrag(t * TAG_MS, s, 1));
    }
    return { aufloesung, punkte };
  }
  // 1mon
  let d = new Date(v);
  d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  while (d.getTime() < b && punkte.length < 600) {
    const n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    const s = summenSync(p, Math.max(v, d.getTime()), Math.min(b, n.getTime()), jetzt);
    if (n.getTime() > p.ibnTag * TAG_MS) punkte.push(eintrag(d.getTime(), s, tageImMonat(d.getUTCFullYear(), d.getUTCMonth())));
    d = n;
  }
  return { aufloesung: "1mon", punkte };
}

/** Zählerstände zum Monatsbeginn (Monitoring) der letzten `monate` Monate */
export async function zaehlerMonat(a, { monate = 13, jetzt = Date.now() } = {}) {
  const p = parameter(a);
  const liste = [];
  const heute = new Date(jetzt);
  for (let i = monate - 1; i >= 0; i--) {
    const beginn = Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth() - i, 1);
    const ende = Math.min(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth() - i + 1, 1), letzterTs(p, jetzt) ?? 0);
    if (ende <= p.ibnTag * TAG_MS || ende <= beginn) continue;
    const z0 = zaehlerBei(p, Math.max(beginn, p.ibnTag * TAG_MS));
    const z1 = zaehlerBei(p, ende);
    const m = new Date(beginn);
    liste.push({
      monat: `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}`,
      vollstaendig: ende === Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth() - i + 1, 1),
      beginn: { erzeugungKwh: rund(z0.erzeugungKwh, 1), netzbezugKwh: rund(z0.netzbezugKwh, 1), einspeisungKwh: rund(z0.einspeisungKwh, 1) },
      ende: { erzeugungKwh: rund(z1.erzeugungKwh, 1), netzbezugKwh: rund(z1.netzbezugKwh, 1), einspeisungKwh: rund(z1.einspeisungKwh, 1) },
      erzeugungKwh: rund(z1.erzeugungKwh - z0.erzeugungKwh, 1),
      netzbezugKwh: rund(z1.netzbezugKwh - z0.netzbezugKwh, 1),
      einspeisungKwh: rund(z1.einspeisungKwh - z0.einspeisungKwh, 1),
    });
  }
  return liste;
}

/** Übersicht vieler Anlagen: aktuell + Summen heute/Monat/Jahr (Ortszeit-Grenzen näherungsweise UTC+Versatz) */
export async function uebersicht(anlagen, { jetzt = Date.now() } = {}) {
  const off = versatz(jetzt) * 3600e3;
  const lokal = new Date(jetzt + off);
  const tagBeginn = Date.UTC(lokal.getUTCFullYear(), lokal.getUTCMonth(), lokal.getUTCDate()) - off;
  const monatBeginn = Date.UTC(lokal.getUTCFullYear(), lokal.getUTCMonth(), 1) - off;
  const jahrBeginn = Date.UTC(lokal.getUTCFullYear(), 0, 1) - off;
  const erg = {};
  for (const a of anlagen) {
    const p = parameter(a);
    erg[a.id] = {
      aktuell: aktuellSync(a, jetzt),
      heute: summenSync(p, tagBeginn, jetzt, jetzt),
      monat: summenSync(p, monatBeginn, jetzt, jetzt),
      jahr: summenSync(p, jahrBeginn, jetzt, jetzt),
    };
  }
  return erg;
}

/** Live-Strom (Server-Sent Events): alle `intervallMs` ein Messwert, alle 15 s ein Kommentar als Lebenszeichen */
export function live(a, { signal, intervallMs = 5000 } = {}) {
  const enc = new TextEncoder();
  let timer = null;
  let ping = null;
  return new ReadableStream({
    start(ctrl) {
      const senden = () => {
        try {
          const w = aktuellSync(a, Date.now());
          ctrl.enqueue(enc.encode(`event: messwert\ndata: ${JSON.stringify(w)}\n\n`));
        } catch {
          /* Strom geschlossen */
        }
      };
      ctrl.enqueue(enc.encode(`retry: 5000\n\n`));
      senden();
      timer = setInterval(senden, intervallMs);
      ping = setInterval(() => {
        try {
          ctrl.enqueue(enc.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          /* geschlossen */
        }
      }, 15000);
      const ende = () => {
        clearInterval(timer);
        clearInterval(ping);
        try {
          ctrl.close();
        } catch {
          /* bereits zu */
        }
      };
      if (signal) signal.addEventListener("abort", ende, { once: true });
      // Sicherheitsnetz: spätestens nach 30 min schließen (Browser verbindet neu)
      setTimeout(ende, 30 * 60e3);
    },
    cancel() {
      clearInterval(timer);
      clearInterval(ping);
    },
  });
}

export const GRENZ = GRENZWERTE;
