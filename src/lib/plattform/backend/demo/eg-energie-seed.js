// src/lib/plattform/backend/demo/eg-energie-seed.js
//
// Demo-Energiedaten WP3: realistische, SYNTHETISCHE 15-Minuten-Werte für die Demo-Gemeinschaften aus eg-stamm-seed.js
// (Bezug über seedSchluessel bzw. die Stammdaten in db.eg, nie über zufällige IDs). Alles fiktiv.
//
// Speicher sparsam: Es wird NICHTS gespeichert. Jeder Tag wird bei Bedarf deterministisch erzeugt (Hash aus
// Zählpunktnummer und Datum): Lastprofile H0/G0/G1/L0/Band je Mitgliedsart, PV je Anlage (Klarhimmel × gemeinsames Wetter
// der Gemeinschaft), Eigenverbrauch hinter dem Zähler bei Prosumern, Zuteilung nach dem Verteilmodell der Gemeinschaft mit
// den Teilnahmefaktoren der Teilnahmen (tfHistorie). Daraus entstehen die Größen, die der Netzbetreiber per CR_MSG
// liefern würde. Eingebaute Datenqualitäts-Fälle (relativ zu „heute“), damit der Leitstand etwas zu zeigen hat:
// fehlende Tage, L3-Werte (auch nach Ablauf der Frist), L2-Ersatzwerte, verspätete Lieferungen, eine Lücke und eine
// Abweichung NB ↔ eigene Zuteilung im Vormonat. Zeitraum: 13 volle Monate vor dem laufenden Monat bis gestern.

import { GROESSEN, QH_MS, hash32, monatPlus, monatVon, plusTag, tageZwischen, tagBeginnMs, werteJeTag, zufall } from "../../eg/messwerte.js";
import { lastprofil, pvJahr, spezErtragStandard, tageImJahr } from "../../eg/simulation.js";
import { verteilen } from "../../eg/verteilung.js";

export const EG_ENERGIE_SEED_VERSION = 1;
const AKTIV = ["aktiv", "abmeldung_angefragt", "beendet"];

const profilCache = new Map();
function profilJahr(profil, jahr) {
  const k = `${profil}|${jahr}`;
  if (!profilCache.has(k)) {
    if (profilCache.size > 24) profilCache.clear();
    profilCache.set(k, lastprofil(profil, jahr));
  }
  return profilCache.get(k);
}
const pvCache = new Map();
function pvReihe(jahr, a, saat) {
  const k = `${jahr}|${a.ausrichtung}|${a.neigung}|${a.lat}|${saat}`;
  if (!pvCache.has(k)) {
    if (pvCache.size > 24) pvCache.clear();
    pvCache.set(k, pvJahr({ jahr, lat: a.lat, lon: a.lon, ausrichtung: a.ausrichtung, neigung: a.neigung, spezErtrag: spezErtragStandard(a.lat), saat }));
  }
  return pvCache.get(k);
}
/** Index im Jahresprofil (MEZ, 96 je Tag) für die i-te lokale Viertelstunde eines Tages */
function jahresIndex(tag, i) {
  const ms = tagBeginnMs(tag) + i * QH_MS;
  const mez = ms + 3600000; // Profile laufen in Normalzeit
  const d = new Date(mez);
  const j = d.getUTCFullYear();
  const doy = Math.round((Date.UTC(j, d.getUTCMonth(), d.getUTCDate()) - Date.UTC(j, 0, 1)) / 864e5);
  return { jahr: j, idx: Math.min(tageImJahr(j) * 96 - 1, doy * 96 + d.getUTCHours() * 4 + Math.floor(d.getUTCMinutes() / 15)) };
}

/** Verbrauchsprofil eines Zählpunkts (Profil, Jahresverbrauch) – deterministisch aus Mitgliedsart und Bezeichnung */
function verbrauchsart(zp, mitglied, g) {
  const h = hash32(zp.zaehlpunktnummer);
  const b = String(zp.bezeichnung || zp.inhaberName || "").toLowerCase();
  if (/allgemein/.test(b)) return { profil: "BAND", kwh: 3200 };
  if (/kläranlage|klaeranlage|pumpe/.test(b)) return { profil: "BAND", kwh: 45000 };
  if (/schule/.test(b)) return { profil: "G1", kwh: 36000 };
  if (/amt|büro|buero/.test(b)) return { profil: "G1", kwh: 22000 };
  const art = mitglied?.art || "privat";
  if (art === "kmu") return { profil: "G0", kwh: 15000 + (h % 30000) };
  if (art === "landwirt") return { profil: "L0", kwh: 10000 + (h % 8000) };
  if (art === "gemeinde" || art === "oeffentlich") return { profil: "G1", kwh: 25000 };
  if (art === "verein") return { profil: "G0", kwh: 8000 };
  if (art === "grossunternehmen") return { profil: "G0", kwh: 900000 };
  return { profil: "H0", kwh: (g.modell === "gea" ? 1800 : 2600) + (h % 2800), wp: h % 5 === 0 ? 3000 : 0 };
}

/** TF einer Teilnahme an einem Tag (tfHistorie, sonst aktueller TF) */
function tfAm(t, tag) {
  const h = (t.tfHistorie || []).filter((x) => x.gueltigAb && x.gueltigAb <= tag).sort((a, b) => b.gueltigAb.localeCompare(a.gueltigAb))[0];
  return h ? Number(h.tf) : Number(t.teilnahmefaktor) || 100;
}
export const teilnahmeAktivAm = (t, tag) => AKTIV.includes(t.status) && !!t.gueltigAb && t.gueltigAb <= tag && (!t.gueltigBis || t.gueltigBis >= tag);

/** Signatur der Stammdaten (für Cache-Schlüssel) */
export function stammSignatur(eg, gid) {
  const tn = eg.teilnahmen.filter((t) => t.gemeinschaftId === gid).map((t) => `${t.id}:${t.status}:${t.teilnahmefaktor}:${t.gueltigAb}:${t.gueltigBis}:${(t.tfHistorie || []).length}:${t.aufteilungsschluesselPct ?? ""}`).join("|");
  return hash32(`${EG_ENERGIE_SEED_VERSION}|${tn}`);
}

/**
 * Kontext einer Gemeinschaft für die Erzeugung: Zählpunkte mit Teilnahmen, Profilen, PV-Kopplung.
 * @param {Object} eg db.eg · @param {string} gid · @param {string} heute
 */
export function synthKontext(eg, gid, heute) {
  const g = eg.gemeinschaften.find((x) => x.id === gid);
  if (!g) return null;
  const tns = eg.teilnahmen.filter((t) => t.gemeinschaftId === gid && t.gueltigAb && AKTIV.includes(t.status));
  const zps = [...new Set(tns.map((t) => t.zaehlpunktId))].map((id) => eg.zaehlpunkte.find((z) => z.id === id)).filter(Boolean).sort((a, b) => a.zaehlpunktnummer.localeCompare(b.zaehlpunktnummer));
  const saat = hash32(`wetter|${g.seedSchluessel || g.id}`) % 100000;
  const schluessel = new Map();
  const vsGueltig = (eg.verteilschluessel || []).filter((v) => v.gemeinschaftId === gid && v.status === "gueltig").sort((a, b) => b.gueltigAb.localeCompare(a.gueltigAb))[0];
  for (const p of vsGueltig?.positionen || []) schluessel.set(p.teilnahmeId, p.pct);
  const beschr = zps.map((z, i) => {
    const t = tns.filter((x) => x.zaehlpunktId === z.id);
    const m = eg.mitglieder.find((x) => x.id === t[0]?.mitgliedId);
    const anl = z.anlageId ? eg.anlagen.find((a) => a.id === z.anlageId) : null;
    return {
      index: i, zp: z, teilnahmen: t, mitglied: m, richtung: z.richtung,
      art: z.richtung === "verbrauch" ? verbrauchsart(z, m, g) : null,
      pv: z.richtung === "erzeugung" ? { kwp: anl?.kwp || anl?.engpassleistungKw || 10, ausrichtung: anl?.ausrichtung ?? 0, neigung: anl?.neigung ?? 30, lat: anl?.standort?.lat ?? 48.2, lon: anl?.standort?.lon ?? 13.5, volleinspeisung: anl?.nutzungsmodell === "volleinspeisung" || anl?.nutzungsmodell === "eigenanlage_eg", bezeichnung: String(anl?.bezeichnung || "").toLowerCase() } : null,
    };
  });
  // Prosumer: Erzeugungs-ZP mit Verbrauchs-ZP desselben Mitglieds koppeln (Eigenverbrauch hinter dem Zähler)
  for (const e of beschr.filter((x) => x.pv && !x.pv.volleinspeisung)) {
    const kand = beschr.filter((x) => x.richtung === "verbrauch" && x.mitglied && x.mitglied.id === e.mitglied?.id);
    const passend = kand.find((x) => x.zp.bezeichnung && e.pv.bezeichnung.includes(String(x.zp.bezeichnung).toLowerCase())) || kand[0];
    if (passend) {
      e.kopplung = passend.index;
      passend.pvVon = e.index;
    }
  }
  const verbraucher = beschr.filter((x) => x.richtung === "verbrauch");
  const fall = (n) => (verbraucher.length > n ? verbraucher[n].zp.id : null);
  const faelle = {
    fehltZp: fall(16), fehltVon: plusTag(heute, -5), fehltBis: plusTag(heute, -3),
    l3Zp: fall(4), l3Von: plusTag(heute, -4), l3Bis: plusTag(heute, -3),
    l3AltZp: fall(8), l3AltTag: plusTag(heute, -75),
    l2Zp: fall(11), l2Tage: [`${monatPlus(monatVon(heute), -2)}-10`, `${monatPlus(monatVon(heute), -2)}-11`],
    lueckeZp: fall(19), lueckeTag: plusTag(heute, -20),
    abweichungZp: fall(2), abweichungMonat: monatPlus(monatVon(heute), -1),
  };
  return { g, beschr, saat, schluessel, faelle, heute, beginn: `${monatPlus(monatVon(heute), -13)}-01` };
}

/** Rohmessung eines Zählpunkts (Last bzw. PV) für einen Tag */
function roh(ctx, b, tag) {
  const n = werteJeTag(tag);
  const out = new Array(n);
  const z = zufall(hash32(`${b.zp.zaehlpunktnummer}|${tag}`));
  const streu = b.art?.profil === "H0" ? 0.35 : 0.15;
  // Schneller Weg für normale Tage: Index linear ab der ersten Viertelstunde (Umstellungstage und Jahreswechsel exakt)
  const erst = jahresIndex(tag, 0);
  const schnell = n === 96 && erst.idx + 95 < tageImJahr(erst.jahr) * 96;
  for (let i = 0; i < n; i++) {
    const { jahr, idx } = schnell ? { jahr: erst.jahr, idx: erst.idx + i } : jahresIndex(tag, i);
    if (b.art) {
      let x = profilJahr(b.art.profil, jahr)[idx] * b.art.kwh;
      if (b.art.wp) x += profilJahr("WP", jahr)[idx] * b.art.wp;
      out[i] = x * (1 - streu / 2 + streu * z());
    } else {
      out[i] = pvReihe(jahr, b.pv, ctx.saat)[idx] * b.pv.kwp * (0.97 + 0.06 * z());
    }
  }
  return out;
}

/**
 * Alle Netzbetreiber-Größen eines Tages: Map "zpId|groesse" → Block (ohne Kennzahlen; Qualität/Lieferdatum gesetzt),
 * plus die eigene Zuteilung (für den Abweichungsbericht) und die gemessenen Reihen.
 */
export function synthTag(ctx, tag) {
  if (!ctx || tag < ctx.beginn || tag >= ctx.heute) return { bloecke: new Map(), eigen: new Map() };
  const n = werteJeTag(tag);
  const rohw = ctx.beschr.map((b) => roh(ctx, b, tag));
  const mess = rohw.map((x) => x.slice());
  for (const b of ctx.beschr) {
    if (b.kopplung === undefined) continue;
    const L = rohw[b.kopplung];
    const P = rohw[b.index];
    for (let i = 0; i < n; i++) {
      const ev = Math.min(L[i], P[i]);
      mess[b.kopplung][i] = L[i] - ev;
      mess[b.index][i] = P[i] - ev;
    }
  }
  const aktiv = ctx.beschr.map((b) => b.teilnahmen.find((t) => teilnahmeAktivAm(t, tag)) || null);
  const erz = [];
  const ver = [];
  ctx.beschr.forEach((b, k) => {
    const t = aktiv[k];
    if (!t) return;
    const x = { id: b.zp.id, werte: mess[k], tf: tfAm(t, tag), schluesselPct: ctx.schluessel.get(t.id) ?? t.aufteilungsschluesselPct ?? 0 };
    (b.richtung === "erzeugung" ? erz : ver).push(x);
  });
  const z = verteilen({ modell: ctx.g.verteilmodell, erzeuger: erz, verbraucher: ver });
  const f = ctx.faelle;
  const bloecke = new Map();
  const eigen = new Map();
  const empf = (zpId) => {
    const h = hash32(`lief|${zpId}|${tag}`) % 41;
    const verz = h === 0 ? 6 : h === 1 ? 4 : 1;
    return plusTag(tag, verz) > ctx.heute ? ctx.heute : plusTag(tag, verz);
  };
  const setze = (zpId, groesse, werte) => {
    if (zpId === f.fehltZp && tag >= f.fehltVon && tag <= f.fehltBis) return;
    const q = werte.map(() => "L1");
    const w = werte.slice();
    if (zpId === f.l3Zp && tag >= f.l3Von && tag <= f.l3Bis) q.fill("L3");
    if (zpId === f.l3AltZp && tag === f.l3AltTag) for (let i = 40; i < 56 && i < q.length; i++) q[i] = "L3";
    if (zpId === f.l2Zp && f.l2Tage.includes(tag)) q.fill("L2");
    if (zpId === f.lueckeZp && tag === f.lueckeTag) for (let i = 30; i < 38; i++) {
      w[i] = null;
      q[i] = "";
    }
    bloecke.set(`${zpId}|${groesse}`, { zaehlpunktId: zpId, gemeinschaftId: ctx.g.id, tag, groesse, werte: w, qualitaet: q, quelle: { art: "demo", nachrichtId: "", messageId: "" }, empfangenAm: empf(zpId), version: 1, historie: [], demo: true });
  };
  for (const v of z.verbraucher) {
    const k = ctx.beschr.findIndex((b) => b.zp.id === v.id);
    const nbFaktor = v.id === f.abweichungZp && monatVon(tag) === f.abweichungMonat ? 0.95 : 1;
    setze(v.id, "verbrauch_gemessen", mess[k]);
    setze(v.id, "verbrauch_tf", v.verbrauchTf);
    setze(v.id, "anteil_erzeugung", v.anteil);
    setze(v.id, "eigendeckung", nbFaktor === 1 ? v.eigendeckung : v.eigendeckung.map((x) => x * nbFaktor));
    if (ctx.g.modell === "beg") setze(v.id, "eigendeckung_ee", v.eigendeckung);
    eigen.set(v.id, { eigendeckung: v.eigendeckung });
  }
  for (const e of z.erzeuger) {
    const k = ctx.beschr.findIndex((b) => b.zp.id === e.id);
    setze(e.id, "erzeugung_gemessen", mess[k]);
    setze(e.id, "erzeugung_tf", e.erzeugungTf);
    setze(e.id, "restueberschuss", e.restueberschuss);
    eigen.set(e.id, { restueberschuss: e.restueberschuss, eingebracht: e.eingebracht });
  }
  return { bloecke, eigen };
}

/** Tage von bis (inkl.), begrenzt auf den Demo-Zeitraum */
export function demoTage(ctx, von, bis) {
  const out = [];
  if (!ctx) return out;
  let t = von < ctx.beginn ? ctx.beginn : von;
  const ende = bis >= ctx.heute ? plusTag(ctx.heute, -1) : bis;
  while (t <= ende && out.length < 800) {
    out.push(t);
    t = plusTag(t);
  }
  return out;
}

export const DEMO_GROESSEN = GROESSEN;
export const demoAlterTage = (ctx, tag) => tageZwischen(tag, ctx.heute);
