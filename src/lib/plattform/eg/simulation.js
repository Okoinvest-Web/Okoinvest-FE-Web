// src/lib/plattform/eg/simulation.js
//
// WP3: Simulation einer Energiegemeinschaft vor der Gründung (Fachkonzept 2.2 Schritt 4, 4.7) – reine Funktionen,
// client- und serverseitig, ohne Personendaten nutzbar (öffentlicher Rechner WP6: simulationRechnen mit oeffentlich: true).
// Python-Spiegel: plattform/eg_energie_kern.py.
//
// 1. Verbrauch: Standardlastprofile H0 (Haushalt), G0 (Gewerbe allgemein), G1 (Gewerbe werktags 8–18 Uhr), L0
//    (Landwirtschaft), Band (z. B. Kläranlage) – ANGENÄHERT an die Form der Standardlastprofile (APCS/E-Control, BDEW-
//    Systematik: Winter 01.11.–20.03., Sommer 15.05.–14.09., Übergang; Werktag/Samstag/Sonntag; H0 mit Dynamisierung).
//    Originalprofile: Lizenz und Bezug zu bestätigen (Fachkonzept 9 Nr. 10). Alternativ echter Lastgang (CSV aus dem
//    Netzbetreiber-Portal, plattform_lastgang). Wärmepumpe und E-Auto als Zusatzprofile.
// 2. Erzeugung: PV je Standort aus Sonnenstand (Klarhimmel-Modell, Ausrichtung/Neigung) × Monatsanteilen Österreich
//    (Bestandswerte ALLGEMEIN.pvMonatsanteile) × deterministischer Wettervariation je Tag; spezifischer Ertrag grob nach
//    Breitengrad (PVGIS-Anbindung folgt, Fachkonzept 4.7 Nr. 1).
// 3. Eigenverbrauch hinter dem Zähler zuerst (Überschusseinspeiser), dann TF (4.1), Zuteilung dynamisch bzw. statisch (4.2/4.3),
//    optional Gemeinschaftsspeicher (Greedy, speicher.js-Regeln).
// 4. Kennzahlen: Eigendeckungsquote Σ ED/Σ V', Nutzungsgrad Σ ED/Σ E', Autarkie, Restüberschuss, Ersparnis je Mitglied
//    (4.6: Energiepreisvorteil, reduzierter Netznutzungs-AP nach Regeltabelle von WP1, Abgabenbefreitung nur EEG),
//    Deckungsbeitrag der Gemeinschaft, Kleinunternehmer-Prognose (55.000 € brutto, § 6 Abs. 1 Z 27 UStG), § 69-Schwelle.
// Zeitachse: Normalzeit (MEZ), 96 Viertelstunden je Tag – üblich für Standardlastprofile; Sommerzeit und Feiertage
// bleiben unberücksichtigt (Schätzung, keine Abrechnung).

import { energieFehler, hash32, rund, zufall } from "./messwerte.js";

export const SIM_STAND = "2026-10-01";
const QH = 96;
const RAD = Math.PI / 180;

// ---------------------------------------------------------------- Annahmen (Orientierung, im Formular änderbar)

/** Standardpreise AT 2026, netto ct/kWh (Quellen: invest/markt.js GEMEINSCHAFTEN.rechner.at, Stromliste.at; zu bestätigen) */
export const SIM_STANDARD = {
  lieferantCt: 12, // Energieanteil des Lieferantenpreises
  netzApCt: 7, // Netznutzungs-Arbeitspreis NE 7 (Beispiel; je Netzbereich verschieden)
  bezugCt: 10, // Preis der Gemeinschaft an Verbraucher
  einspeisCt: 8, // Preis der Gemeinschaft an Erzeuger
  marktwertCt: 5, // Vergütung des Restüberschusses (OeMAG-Marktpreis bzw. Abnahmevertrag)
  elAbgHaushaltCt: 0.1, // Elektrizitätsabgabe 2026 Haushalt (Fachkonzept 4.6, zu bestätigen)
  elAbgSonstCt: 0.82, // Elektrizitätsabgabe 2026 sonst (zu bestätigen); ab 2027 1,5 ct (zu bestätigen)
  efbCt: 0, // Erneuerbaren-Förderbeitrag, arbeitsbezogener Teil (EAG § 75 Abs. 5) – je NB, Standard 0 (zu bestätigen)
  verwaltungEurJeTeilnehmer: 20, // Verwaltungskosten je Teilnehmer und Jahr
  mitgliedsbeitragEur: 0,
};
export const KLEINUNTERNEHMER_GRENZE_EUR = 55000; // brutto, Toleranz 60.500 € (§ 6 Abs. 1 Z 27 UStG ab 2025)
export const KLEINUNTERNEHMER_TOLERANZ_EUR = 60500;
/** Monatsanteile des PV-Jahresertrags Österreich (wie ALLGEMEIN.pvMonatsanteile im Bestand) */
export const PV_MONATSANTEILE = [0.025, 0.045, 0.08, 0.115, 0.13, 0.135, 0.135, 0.12, 0.09, 0.065, 0.035, 0.025];
/** Heizgradtag-Anteile je Monat für das Wärmepumpenprofil (Klimamittel Österreich, grob) */
export const WP_MONATSANTEILE = [0.19, 0.16, 0.13, 0.08, 0.035, 0.01, 0.005, 0.005, 0.02, 0.07, 0.12, 0.175];
export const SIM_GRENZEN = { teilnehmer: 250, teilnehmerOeffentlich: 30, anlagen: 60, kwp: 6000, verbrauchKwh: 5e7 };

/** Standardlastprofile: 24 Stundenwerte (relativ) je Jahreszeit (w/s/u) und Tagtyp (wt/sa/so) */
const H0 = {
  w: {
    wt: [70, 58, 52, 50, 50, 55, 80, 110, 125, 120, 118, 125, 140, 135, 120, 110, 115, 140, 185, 200, 190, 165, 135, 100],
    sa: [80, 65, 58, 54, 52, 54, 62, 85, 115, 140, 150, 155, 160, 150, 135, 125, 130, 150, 185, 195, 185, 165, 140, 110],
    so: [85, 70, 60, 55, 52, 52, 56, 70, 100, 135, 160, 175, 180, 155, 135, 125, 128, 145, 180, 190, 180, 160, 135, 105],
  },
  s: {
    wt: [75, 60, 54, 51, 51, 55, 75, 95, 105, 105, 105, 112, 125, 120, 105, 98, 100, 115, 140, 155, 160, 160, 140, 105],
    sa: [85, 68, 58, 54, 52, 53, 60, 78, 102, 120, 128, 135, 140, 128, 115, 108, 110, 122, 140, 150, 152, 150, 135, 110],
    so: [90, 72, 62, 56, 53, 52, 55, 65, 90, 120, 140, 152, 155, 135, 118, 108, 108, 118, 138, 148, 150, 148, 132, 108],
  },
};
const G0T = {
  wt: [60, 58, 57, 57, 58, 65, 85, 120, 150, 160, 162, 160, 150, 150, 155, 150, 140, 120, 100, 85, 75, 70, 65, 62],
  sa: [60, 58, 57, 57, 58, 60, 68, 85, 100, 108, 110, 108, 100, 92, 85, 80, 76, 72, 68, 65, 63, 62, 61, 60],
  so: [58, 56, 55, 55, 55, 56, 58, 60, 62, 64, 65, 65, 64, 62, 61, 60, 60, 60, 60, 59, 59, 58, 58, 58],
};
const G1T = {
  wt: [30, 28, 28, 28, 30, 40, 80, 150, 200, 210, 210, 205, 190, 195, 200, 195, 170, 110, 60, 45, 40, 36, 33, 31],
  sa: [30, 29, 28, 28, 28, 29, 30, 31, 32, 32, 32, 32, 32, 31, 31, 31, 31, 31, 31, 31, 31, 30, 30, 30],
  so: [30, 29, 28, 28, 28, 29, 30, 31, 32, 32, 32, 32, 32, 31, 31, 31, 31, 31, 31, 31, 31, 30, 30, 30],
};
const L0T = [55, 50, 48, 48, 60, 110, 150, 130, 100, 90, 88, 90, 95, 90, 88, 90, 110, 150, 155, 120, 95, 80, 70, 60];
const WP_T = [1.15, 1.15, 1.15, 1.15, 1.15, 1.15, 1.25, 1.2, 1.05, 0.95, 0.9, 0.85, 0.8, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.1, 1.1, 1.1, 1.1];
const EV_WT = [0.2, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.6, 1, 1, 1, 0.9, 0.7, 0.4];
const EV_WE = [0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.7, 0.8, 0.8, 0.7, 0.5, 0.3, 0.4, 0.6, 0.6, 0.5, 0.4, 0.3, 0.2];

export const LASTPROFILE = {
  H0: { label: "Haushalt (H0)", text: "Standardlastprofil Haushalt mit Dynamisierung" },
  G0: { label: "Gewerbe allgemein (G0)", text: "Gewerbe gewichtet, werktags tagsüber" },
  G1: { label: "Gewerbe werktags 8–18 Uhr (G1)", text: "Büro, Amt, Schule" },
  L0: { label: "Landwirtschaft (L0)", text: "Morgen- und Abendspitze (Melken, Kühlung)" },
  BAND: { label: "Bandlast", text: "gleichmäßig, z. B. Kläranlage, Pumpen" },
  lastgang: { label: "Eigener Lastgang", text: "Viertelstundenwerte aus dem Netzbetreiber-Portal" },
};

// ---------------------------------------------------------------- Kalender

const schalt = (j) => (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0;
export const tageImJahr = (j) => (schalt(j) ? 366 : 365);
const MONATSLAENGE = (j) => [31, schalt(j) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** {monat 0–11, tag 1–31, wochentag 0 = Mo} des Tages d (0-basiert) im Jahr j */
export function kalenderTag(j, d) {
  const ml = MONATSLAENGE(j);
  let m = 0;
  let r = d;
  while (r >= ml[m]) {
    r -= ml[m];
    m++;
  }
  const wt = (new Date(Date.UTC(j, 0, 1 + d)).getUTCDay() + 6) % 7;
  return { monat: m, tag: r + 1, wochentag: wt };
}
function jahreszeit(monat, tag) {
  const md = (monat + 1) * 100 + tag;
  if (md >= 1101 || md <= 320) return "w";
  if (md >= 515 && md <= 914) return "s";
  return "u";
}
const tagtyp = (wt) => (wt === 5 ? "sa" : wt === 6 ? "so" : "wt");

/** Stundenprofil eines Tages (24 Werte, relativ) */
function stundenProfil(profil, monat, tag, wt) {
  const tt = tagtyp(wt);
  const jz = jahreszeit(monat, tag);
  if (profil === "H0") {
    if (jz === "u") return H0.w[tt].map((x, i) => (x + H0.s[tt][i]) / 2);
    return H0[jz][tt];
  }
  const f = jz === "w" ? 1.08 : jz === "s" ? 0.92 : 1;
  if (profil === "G0") return G0T[tt].map((x) => x * f);
  if (profil === "G1") return G1T[tt].map((x) => x * f);
  if (profil === "L0") return L0T.map((x) => x * (jz === "w" ? 1.05 : jz === "s" ? 0.95 : 1));
  return new Array(24).fill(100);
}
/** Stundenwerte auf Viertelstunden (lineare Interpolation zwischen Stundenmitten) */
function viertelstunden(h24) {
  const out = new Array(QH);
  for (let q = 0; q < QH; q++) {
    const t = (q + 0.5) / 4 - 0.5;
    const a = Math.floor(t);
    const f = t - a;
    const x0 = h24[(a + 24) % 24];
    const x1 = h24[(a + 25) % 24];
    out[q] = x0 + (x1 - x0) * f;
  }
  return out;
}
/** H0-Dynamisierung (BDEW): F(t) = −3,92e−10 t⁴ + 3,2e−7 t³ − 7,02e−5 t² + 2,1e−3 t + 1,24, t = Tag im Jahr */
const dyn = (t) => -3.92e-10 * t ** 4 + 3.2e-7 * t ** 3 - 7.02e-5 * t ** 2 + 2.1e-3 * t + 1.24;

/**
 * Lastprofil eines Jahres, normiert auf Summe 1 (Länge Tage × 96).
 * profil: H0 | G0 | G1 | L0 | BAND | WP (Wärmepumpe) | EAUTO
 */
export function lastprofil(profil, jahr = 2025) {
  const n = tageImJahr(jahr);
  const out = new Array(n * QH);
  let s = 0;
  for (let d = 0; d < n; d++) {
    const k = kalenderTag(jahr, d);
    let qv;
    if (profil === "WP") {
      const tagesanteil = WP_MONATSANTEILE[k.monat] / MONATSLAENGE(jahr)[k.monat];
      const v = viertelstunden(WP_T);
      const vs = v.reduce((a, b) => a + b, 0);
      qv = v.map((x) => (x / vs) * tagesanteil);
    } else if (profil === "EAUTO") {
      const v = viertelstunden(k.wochentag >= 5 ? EV_WE : EV_WT).map((x) => Math.max(0, x));
      const vs = v.reduce((a, b) => a + b, 0);
      qv = v.map((x) => x / vs);
    } else {
      qv = viertelstunden(stundenProfil(profil, k.monat, k.tag, k.wochentag));
      if (profil === "H0") {
        const f = dyn(d + 1);
        qv = qv.map((x) => x * f);
      }
    }
    for (let q = 0; q < QH; q++) {
      out[d * QH + q] = qv[q];
      s += qv[q];
    }
  }
  for (let i = 0; i < out.length; i++) out[i] /= s;
  return out;
}

// ---------------------------------------------------------------- PV

/** Spezifischer Jahresertrag kWh/kWp (Süd, 30°) grob nach Breitengrad – Österreich ca. 1.000–1.200 (zu bestätigen, PVGIS) */
export const spezErtragStandard = (lat = 48) => Math.max(900, Math.min(1250, 1100 - 30 * ((Number(lat) || 48) - 47)));

/**
 * Klarhimmel-Einstrahlung auf die Modulebene (W/m², relativ) – Sonnenstand nach Duffie/Beckman, Direktstrahlung nach
 * Meinel (1000 · 0,7^(AM^0,678)), Diffusanteil 10 % isotrop. ausrichtung: 0 Süd, −90 Ost, 90 West; neigung in Grad.
 * stundeMez: Uhrzeit (MEZ, Dezimalstunden).
 */
export function pvKlarhimmel(tagImJahr, stundeMez, { lat = 48, lon = 14, ausrichtung = 0, neigung = 30 } = {}) {
  const n = tagImJahr;
  const B = ((360 / 365) * (n - 81)) * RAD;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const sonnenzeit = stundeMez + (4 * (lon - 15) + eot) / 60;
  const omega = 15 * (sonnenzeit - 12) * RAD;
  const delta = 23.45 * Math.sin(((360 / 365) * (284 + n)) * RAD) * RAD;
  const phi = lat * RAD;
  const beta = neigung * RAD;
  const gamma = ausrichtung * RAD;
  const cz = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(omega);
  if (cz <= 0.01) return 0;
  const am = 1 / cz;
  const dni = 1000 * 0.7 ** (am ** 0.678);
  const ct =
    Math.sin(delta) * Math.sin(phi) * Math.cos(beta) -
    Math.sin(delta) * Math.cos(phi) * Math.sin(beta) * Math.cos(gamma) +
    Math.cos(delta) * Math.cos(phi) * Math.cos(beta) * Math.cos(omega) +
    Math.cos(delta) * Math.sin(phi) * Math.sin(beta) * Math.cos(gamma) * Math.cos(omega) +
    Math.cos(delta) * Math.sin(beta) * Math.sin(gamma) * Math.sin(omega);
  const diffus = 0.1 * dni * cz * ((1 + Math.cos(beta)) / 2);
  return dni * Math.max(0, ct) + diffus;
}
/** Klarhimmel-Tagesprofil (96 Werte) in MEZ */
export function pvTagKlar(tagImJahr, opt) {
  const out = new Array(QH);
  for (let q = 0; q < QH; q++) out[q] = pvKlarhimmel(tagImJahr, (q + 0.5) / 4, opt);
  return out;
}
/** Verhältnis Jahresklarhimmel der Ausrichtung zu Süd 30° (Ertragskorrektur für Ost/West/Flach) */
export function ausrichtungsFaktor({ lat = 48, lon = 14, ausrichtung = 0, neigung = 30 } = {}) {
  let a = 0;
  let r = 0;
  for (let d = 1; d <= 365; d += 7) {
    for (let q = 0; q < QH; q += 2) {
      a += pvKlarhimmel(d, (q + 0.5) / 4, { lat, lon, ausrichtung, neigung });
      r += pvKlarhimmel(d, (q + 0.5) / 4, { lat, lon, ausrichtung: 0, neigung: 30 });
    }
  }
  return r > 0 ? a / r : 1;
}
/** Wetterfaktor je Tag (deterministisch, Mischung aus klaren und trüben Tagen) */
export function wetterfaktoren(anzahl, saat) {
  const z = zufall(saat);
  const out = new Array(anzahl);
  for (let d = 0; d < anzahl; d++) {
    const u = z();
    out[d] = 0.12 + 0.88 * u ** 0.7;
  }
  return out;
}
/**
 * PV-Jahresreihe in kWh je Viertelstunde für 1 kWp (Länge Tage × 96): Klarhimmel-Form × Wetter, monatlich auf
 * spezErtrag × Monatsanteil × Ausrichtungsfaktor skaliert.
 */
export function pvJahr({ jahr = 2025, lat = 48, lon = 14, ausrichtung = 0, neigung = 30, spezErtrag = null, saat = 1 } = {}) {
  const n = tageImJahr(jahr);
  const jahresertrag = (spezErtrag || spezErtragStandard(lat)) * ausrichtungsFaktor({ lat, lon, ausrichtung, neigung });
  const wetter = wetterfaktoren(n, saat);
  const out = new Array(n * QH);
  const ml = MONATSLAENGE(jahr);
  let d0 = 0;
  for (let m = 0; m < 12; m++) {
    let sm = 0;
    for (let d = d0; d < d0 + ml[m]; d++) {
      const p = pvTagKlar(d + 1, { lat, lon, ausrichtung, neigung });
      for (let q = 0; q < QH; q++) {
        const x = p[q] * wetter[d];
        out[d * QH + q] = x;
        sm += x;
      }
    }
    const ziel = jahresertrag * PV_MONATSANTEILE[m] * (n === 366 && m === 1 ? 29 / 28 : 1);
    const f = sm > 0 ? ziel / sm : 0;
    for (let i = d0 * QH; i < (d0 + ml[m]) * QH; i++) out[i] *= f;
    d0 += ml[m];
  }
  return out;
}

// ---------------------------------------------------------------- Eingabe

const zahlOder = (v, std, min = 0, max = 1e12) => {
  const x = typeof v === "number" ? v : v === undefined || v === null || v === "" ? NaN : Number(String(v).replace(",", "."));
  if (!Number.isFinite(x)) return std;
  return Math.min(max, Math.max(min, x));
};
const kurztext = (v, max = 80) => Array.from(String(v ?? "")).map((c) => (c.charCodeAt(0) < 32 ? " " : c)).join("").trim().slice(0, max);
const ART_PROFIL = { privat: "H0", landwirt: "L0", kmu: "G0", grossunternehmen: "G0", gemeinde: "G1", oeffentlich: "G1", verein: "G0" };
const ART_VERBRAUCH = { privat: 3500, landwirt: 12000, kmu: 25000, grossunternehmen: 500000, gemeinde: 30000, oeffentlich: 30000, verein: 8000 };

/**
 * Eingabe prüfen und mit Standardwerten auffüllen. `oeffentlich`: keine Namen, höchstens 30 Teilnehmer (WP6-Rechner).
 */
export function simulationBereinigen(d = {}, { oeffentlich = false } = {}) {
  const max = oeffentlich ? SIM_GRENZEN.teilnehmerOeffentlich : SIM_GRENZEN.teilnehmer;
  const tn = Array.isArray(d.teilnehmer) ? d.teilnehmer : [];
  const an = Array.isArray(d.anlagen) ? d.anlagen : [];
  if (!tn.length) throw energieFehler("Bitte mindestens einen Teilnehmer mit Verbrauch angeben.", "teilnehmer");
  if (tn.length > max) throw energieFehler(`Höchstens ${max} Teilnehmer je Simulation.`, "teilnehmer");
  if (an.length > SIM_GRENZEN.anlagen) throw energieFehler(`Höchstens ${SIM_GRENZEN.anlagen} Gemeinschaftsanlagen.`, "anlagen");
  const lat = zahlOder(d.standort?.lat, 48.2, 46, 49.1);
  const lon = zahlOder(d.standort?.lon, 13.5, 9.5, 17.2);
  const p = d.preise || {};
  const preise = Object.fromEntries(Object.entries(SIM_STANDARD).map(([k, v]) => [k, zahlOder(p[k], v, 0, k.endsWith("Eur") ? 100000 : 100)]));
  const modell = ["eeg", "beg", "gea", "p2p", "eigenversorgung"].includes(d.modell) ? d.modell : "eeg";
  const teilnehmer = tn.map((t, i) => {
    const art = ART_PROFIL[t.art] ? t.art : "privat";
    const profil = LASTPROFILE[t.profil] ? t.profil : ART_PROFIL[art];
    const lastgang = profil === "lastgang" && Array.isArray(t.lastgang) ? t.lastgang.map((x) => zahlOder(x, 0, 0, 1e6)) : null;
    if (profil === "lastgang" && (!lastgang || lastgang.length < 8760)) throw energieFehler(`Teilnehmer ${i + 1}: Lastgang mit mindestens einem Jahr Stundenwerten (bzw. Viertelstunden) angeben.`, `teilnehmer.${i}.lastgang`);
    return {
      id: kurztext(t.id, 40) || `T${i + 1}`,
      name: oeffentlich ? `Teilnehmer ${i + 1}` : kurztext(t.name, 80) || `Teilnehmer ${i + 1}`,
      art,
      profil,
      jahresverbrauchKwh: zahlOder(t.jahresverbrauchKwh, ART_VERBRAUCH[art], 0, SIM_GRENZEN.verbrauchKwh),
      waermepumpeKwh: zahlOder(t.waermepumpeKwh, 0, 0, 1e6),
      eautoKwh: zahlOder(t.eautoKwh, 0, 0, 1e6),
      lastgang,
      tf: Math.round(zahlOder(t.tf, 100, 1, 100)),
      tfErzeugung: Math.round(zahlOder(t.tfErzeugung ?? t.tf, 100, 1, 100)),
      pvKwp: zahlOder(t.pvKwp, 0, 0, SIM_GRENZEN.kwp),
      pvAusrichtung: zahlOder(t.pvAusrichtung, 0, -180, 180),
      pvNeigung: zahlOder(t.pvNeigung, 30, 0, 90),
      volleinspeisung: t.volleinspeisung === true,
      schutzbeduerftig: t.schutzbeduerftig === true,
      haushalt: t.haushalt === undefined ? art === "privat" : t.haushalt === true,
      schluesselPct: zahlOder(t.schluesselPct, 0, 0, 100),
      anzahl: Math.round(zahlOder(t.anzahl, 1, 1, 500)),
    };
  });
  const anlagen = an.map((a, i) => ({
    id: kurztext(a.id, 40) || `A${i + 1}`,
    name: oeffentlich ? `Anlage ${i + 1}` : kurztext(a.name, 80) || `Anlage ${i + 1}`,
    art: "pv",
    kwp: zahlOder(a.kwp, 0, 0, SIM_GRENZEN.kwp),
    ausrichtung: zahlOder(a.ausrichtung, 0, -180, 180),
    neigung: zahlOder(a.neigung, 30, 0, 90),
    spezErtrag: a.spezErtrag ? zahlOder(a.spezErtrag, null, 500, 1600) : null,
    tf: Math.round(zahlOder(a.tf, 100, 1, 100)),
    gemeinde: a.gemeinde === true,
    haushalt: a.haushalt === true,
  })).filter((a) => a.kwp > 0);
  if (!anlagen.length && !teilnehmer.some((t) => t.pvKwp > 0)) throw energieFehler("Bitte mindestens eine Erzeugungsanlage angeben (Gemeinschaftsanlage oder PV eines Teilnehmers).", "anlagen");
  const sp = d.speicher || {};
  const speicher = zahlOder(sp.kapazitaetKwh, 0, 0, 1e5) > 0 ? { kapazitaetKwh: zahlOder(sp.kapazitaetKwh, 0, 0, 1e5), leistungKw: zahlOder(sp.leistungKw, zahlOder(sp.kapazitaetKwh, 0) / 2, 0.1, 1e5), wirkungsgradPct: zahlOder(sp.wirkungsgradPct, 90, 50, 100), socMinPct: zahlOder(sp.socMinPct, 5, 0, 50) } : null;
  const netz = { reduktionPct: zahlOder(d.netz?.reduktionPct, modell === "eeg" ? 57 : 0, 0, 100), abgabenBefreit: d.netz?.abgabenBefreit === undefined ? modell === "eeg" || modell === "gea" : d.netz.abgabenBefreit === true, quelle: kurztext(d.netz?.quelle, 160), status: kurztext(d.netz?.status, 20) };
  const varianten = (Array.isArray(d.varianten) ? d.varianten : []).slice(0, 8).map((v, i) => ({ id: kurztext(v.id, 30) || `V${i + 1}`, label: kurztext(v.label, 80) || `Variante ${i + 1}`, reduktionPct: zahlOder(v.reduktionPct, 0, 0, 100), abgabenBefreit: v.abgabenBefreit === true, hinweis: kurztext(v.hinweis, 160) }));
  return {
    titel: kurztext(d.titel, 120) || "Simulation",
    jahr: Math.round(zahlOder(d.jahr, 2025, 2020, 2035)),
    modell,
    zonelevel: Math.round(zahlOder(d.zonelevel, modell === "eeg" ? 3 : modell === "gea" ? 1 : 6, 1, 7)),
    verteilmodell: d.verteilmodell === "statisch" ? "statisch" : "dynamisch",
    ustStatus: d.ustStatus === "regelbesteuert" ? "regelbesteuert" : "kleinunternehmer",
    standort: { lat, lon },
    preise,
    netz,
    varianten,
    teilnehmer,
    anlagen,
    speicher,
    saat: Math.round(zahlOder(d.saat, 2026, 0, 1e9)),
    sensitivitaet: { haushalte: (Array.isArray(d.sensitivitaet?.haushalte) ? d.sensitivitaet.haushalte : []).slice(0, 3).map((x) => Math.round(zahlOder(x, 0, 0, 200))).filter((x) => x > 0) },
  };
}

/** Viertelstunden-Lastgang (beliebige Länge ≥ 1 Jahr Stunden/Viertelstunden) auf das Simulationsjahr abbilden */
export function lastgangAufJahr(werte, jahr) {
  const n = tageImJahr(jahr) * QH;
  const stunden = werte.length < 34000;
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = stunden ? werte[Math.floor(i / 4) % werte.length] / 4 : werte[i % werte.length];
  return out;
}

// ---------------------------------------------------------------- Rechnung

/** Reduzierter Netznutzungs-AP, kaufmännisch auf 2 Kommastellen ct/kWh (SNE-V 2018 § 5 Abs. 1a letzter Satz) */
export const apReduziert = (apCt, pct) => rund((Number(apCt) || 0) * (1 - (Number(pct) || 0) / 100), 2);
const r2 = (x) => rund(x, 2);
const r3 = (x) => rund(x, 3);

function kern(e, zusatzHaushalte = 0) {
  const jahr = e.jahr;
  const n = tageImJahr(jahr) * QH;
  const profile = {};
  const prof = (p) => (profile[p] ||= lastprofil(p, jahr));
  const pvCache = {};
  const pv = (ausrichtung, neigung, spez) => {
    const k = `${ausrichtung}|${neigung}|${spez || ""}`;
    return (pvCache[k] ||= pvJahr({ jahr, lat: e.standort.lat, lon: e.standort.lon, ausrichtung, neigung, spezErtrag: spez, saat: e.saat }));
  };
  const tn = e.teilnehmer.map((t) => ({ ...t, last: t.lastgang ? lastgangAufJahr(t.lastgang, jahr) : null }));
  for (let k = 0; k < zusatzHaushalte; k++) tn.push({ id: `S${k + 1}`, name: `Zusatzhaushalt ${k + 1}`, art: "privat", profil: "H0", jahresverbrauchKwh: 3500, waermepumpeKwh: 0, eautoKwh: 0, last: null, tf: 100, tfErzeugung: 100, pvKwp: 0, pvAusrichtung: 0, pvNeigung: 30, volleinspeisung: false, schutzbeduerftig: false, haushalt: true, schluesselPct: 0, anzahl: 1, zusatz: true });
  const T = tn.length;
  const A = e.anlagen.length;
  const reihen = tn.map((t) => ({ p: t.last ? null : prof(t.profil), wp: t.waermepumpeKwh ? prof("WP") : null, ev: t.eautoKwh ? prof("EAUTO") : null, pv: t.pvKwp ? pv(t.pvAusrichtung, t.pvNeigung, null) : null }));
  const apv = e.anlagen.map((a) => pv(a.ausrichtung, a.neigung, a.spezErtrag));
  const statisch = e.verteilmodell === "statisch";
  const sSum = tn.reduce((s, t) => s + t.schluesselPct * t.anzahl, 0);
  const sStern = tn.map((t) => (sSum > 100 ? t.schluesselPct / sSum : t.schluesselPct / 100));
  const sp = e.speicher;
  const etaL = sp ? Math.sqrt(sp.wirkungsgradPct / 100) : 1;
  let soc = 0;
  const socMin = sp ? (sp.kapazitaetKwh * sp.socMinPct) / 100 : 0;
  if (sp) soc = socMin;
  const S = tn.map(() => ({ last: 0, eigen: 0, netzbezug: 0, vtf: 0, ed: 0, edSpeicher: 0, pv: 0, ueberschuss: 0, etf: 0, eingebracht: 0, rest: 0 }));
  const SA = e.anlagen.map(() => ({ erzeugung: 0, etf: 0, eingebracht: 0, rest: 0 }));
  const monate = Array.from({ length: 12 }, () => ({ erzeugungTf: 0, verbrauchTf: 0, eigendeckung: 0, restueberschuss: 0, speicher: 0 }));
  const typ = { 0: null, 6: null };
  for (const m of [0, 6]) typ[m] = { e: new Array(QH).fill(0), v: new Array(QH).fill(0), ed: new Array(QH).fill(0), tage: 0 };
  const vq = new Array(T);
  const eq = new Array(T);
  const aq = new Array(A);
  let spGeladen = 0;
  let spEntladen = 0;
  const ml = MONATSLAENGE(jahr);
  const monatVonTag = [];
  for (let m = 0; m < 12; m++) for (let d = 0; d < ml[m]; d++) monatVonTag.push(m);
  for (let i = 0; i < n; i++) {
    const tagI = Math.floor(i / QH);
    const m = monatVonTag[tagI];
    const q = i % QH;
    let Es = 0;
    let Vs = 0;
    for (let k = 0; k < T; k++) {
      const t = tn[k];
      const r = reihen[k];
      let last = t.last ? t.last[i] : r.p[i] * t.jahresverbrauchKwh;
      if (r.wp) last += r.wp[i] * t.waermepumpeKwh;
      if (r.ev) last += r.ev[i] * t.eautoKwh;
      last *= t.anzahl;
      const erz = r.pv ? r.pv[i] * t.pvKwp * t.anzahl : 0;
      const eigen = t.volleinspeisung ? 0 : Math.min(last, erz);
      const netzbezug = last - eigen;
      const ueb = erz - eigen;
      const v1 = (netzbezug * t.tf) / 100;
      const e1 = (ueb * t.tfErzeugung) / 100;
      const s = S[k];
      s.last += last;
      s.eigen += eigen;
      s.netzbezug += netzbezug;
      s.pv += erz;
      s.ueberschuss += ueb;
      s.vtf += v1;
      s.etf += e1;
      vq[k] = v1;
      eq[k] = e1;
      Vs += v1;
      Es += e1;
    }
    for (let j = 0; j < A; j++) {
      const a = e.anlagen[j];
      const x = apv[j][i] * a.kwp;
      const e1 = (x * a.tf) / 100;
      SA[j].erzeugung += x;
      SA[j].etf += e1;
      aq[j] = e1;
      Es += e1;
    }
    let EDs = 0;
    const edk = new Array(T);
    for (let k = 0; k < T; k++) {
      const a = statisch ? Es * sStern[k] * tn[k].anzahl : Vs > 0 ? (Es * vq[k]) / Vs : 0;
      const d = Math.min(a, vq[k]);
      edk[k] = d;
      EDs += d;
    }
    let R = Math.max(0, Es - EDs);
    // Gemeinschaftsspeicher: Laden aus dem Restüberschuss, Entladen in den Restbedarf (Greedy, proportional verteilt)
    let ausSpeicher = 0;
    if (sp) {
      const dtMax = sp.leistungKw * 0.25;
      if (R > 0) {
        const laden = Math.min(R, dtMax, (sp.kapazitaetKwh - soc) / etaL);
        if (laden > 0) {
          soc += laden * etaL;
          R -= laden;
          spGeladen += laden;
        }
      } else {
        const bedarf = Vs - EDs;
        if (bedarf > 0) {
          ausSpeicher = Math.min(bedarf, dtMax, (soc - socMin) * etaL);
          if (ausSpeicher > 0) {
            soc -= ausSpeicher / etaL;
            spEntladen += ausSpeicher;
            for (let k = 0; k < T; k++) {
              const x = (ausSpeicher * (vq[k] - edk[k])) / bedarf;
              S[k].edSpeicher += x;
            }
          } else ausSpeicher = 0;
        }
      }
    }
    for (let k = 0; k < T; k++) S[k].ed += edk[k];
    // Rückverteilung des Restüberschusses und eingebrachte Mengen je Erzeuger
    if (Es > 0) {
      const anteilGenutzt = (Es - R) / Es;
      for (let k = 0; k < T; k++) if (eq[k] > 0) {
        S[k].eingebracht += eq[k] * anteilGenutzt;
        S[k].rest += eq[k] * (1 - anteilGenutzt);
      }
      for (let j = 0; j < A; j++) if (aq[j] > 0) {
        SA[j].eingebracht += aq[j] * anteilGenutzt;
        SA[j].rest += aq[j] * (1 - anteilGenutzt);
      }
    }
    const mo = monate[m];
    mo.erzeugungTf += Es;
    mo.verbrauchTf += Vs;
    mo.eigendeckung += EDs + ausSpeicher;
    mo.restueberschuss += R;
    mo.speicher += ausSpeicher;
    if (typ[m]) {
      typ[m].e[q] += Es;
      typ[m].v[q] += Vs;
      typ[m].ed[q] += EDs + ausSpeicher;
      if (q === 0) typ[m].tage++;
    }
  }
  return { tn, S, SA, monate, typ, speicher: sp ? { geladenKwh: spGeladen, entladenKwh: spEntladen, socEndeKwh: soc, verlusteKwh: spGeladen - spEntladen - (soc - socMin) } : null };
}

function geld(e, r, netz) {
  const p = e.preise;
  const netzEurKwh = (p.netzApCt - apReduziert(p.netzApCt, netz.reduktionPct)) / 100;
  return r.tn.map((t, k) => {
    const s = r.S[k];
    const ed = s.ed + s.edSpeicher;
    const elAbg = t.haushalt ? p.elAbgHaushaltCt : p.elAbgSonstCt;
    const energie = r2((ed * (p.lieferantCt - p.bezugCt)) / 100);
    const netzE = r2(ed * netzEurKwh);
    const abgaben = netz.abgabenBefreit ? r2((ed * (elAbg + p.efbCt)) / 100) : 0;
    const erzeuger = r2((s.eingebracht * (p.einspeisCt - p.marktwertCt)) / 100);
    const beitrag = -r2(p.mitgliedsbeitragEur * t.anzahl);
    return { energie, netz: netzE, abgaben, erzeuger, beitrag, summe: r2(energie + netzE + abgaben + erzeuger + beitrag) };
  });
}

/**
 * Simulation rechnen. Eingabe wie simulationBereinigen (wird hier bereinigt). Ergebnis ohne Viertelstundenreihen
 * (Monatswerte, typische Tage Januar/Juli, je Teilnehmer und Anlage, Varianten, Hinweise).
 */
export function simulationRechnen(daten = {}, { oeffentlich = false } = {}) {
  const e = simulationBereinigen(daten, { oeffentlich });
  const r = kern(e);
  const p = e.preise;
  const g = geld(e, r, e.netz);
  const sum = (f) => r.S.reduce((s, x) => s + f(x), 0) + 0;
  const V = sum((x) => x.vtf);
  const ED = sum((x) => x.ed + x.edSpeicher);
  const Eges = sum((x) => x.etf) + r.SA.reduce((s, a) => s + a.etf, 0);
  const R = r.monate.reduce((s, m) => s + m.restueberschuss, 0);
  const last = sum((x) => x.last);
  const eigen = sum((x) => x.eigen);
  const teilnehmer = r.tn.map((t, k) => {
    const s = r.S[k];
    const ed = s.ed + s.edSpeicher;
    return {
      id: t.id, name: t.name, art: t.art, profil: t.profil, anzahl: t.anzahl, tf: t.tf, schutzbeduerftig: t.schutzbeduerftig,
      verbrauchKwh: r3(s.last), eigenverbrauchKwh: r3(s.eigen), netzbezugKwh: r3(s.netzbezug), verbrauchTfKwh: r3(s.vtf), eigendeckungKwh: r3(ed), ausSpeicherKwh: r3(s.edSpeicher), restbezugKwh: r3(s.netzbezug - ed),
      deckungPct: s.vtf > 0 ? rund((ed / s.vtf) * 100, 1) : 0, autarkiePct: s.last > 0 ? rund(((s.eigen + ed) / s.last) * 100, 1) : 0,
      erzeugungKwh: r3(s.pv), ueberschussKwh: r3(s.ueberschuss), eingebrachtKwh: r3(s.eingebracht), restueberschussKwh: r3(s.rest),
      kostenEgEur: r2((ed * p.bezugCt) / 100), gutschriftEur: r2((s.eingebracht * p.einspeisCt) / 100), vorteil: g[k],
    };
  });
  const anlagen = e.anlagen.map((a, j) => ({ id: a.id, name: a.name, kwp: a.kwp, tf: a.tf, gemeinde: a.gemeinde, erzeugungKwh: r3(r.SA[j].erzeugung), erzeugungTfKwh: r3(r.SA[j].etf), eingebrachtKwh: r3(r.SA[j].eingebracht), restueberschussKwh: r3(r.SA[j].rest), spezErtrag: a.kwp ? rund(r.SA[j].erzeugung / a.kwp, 0) : 0, gutschriftEur: r2((r.SA[j].eingebracht * p.einspeisCt) / 100) }));
  const eingebrachtGes = teilnehmer.reduce((s, t) => s + t.eingebrachtKwh, 0) + anlagen.reduce((s, a) => s + a.eingebrachtKwh, 0);
  const anzahl = r.tn.reduce((s, t) => s + t.anzahl, 0);
  const umsatzNetto = (ED * p.bezugCt) / 100 + p.mitgliedsbeitragEur * anzahl;
  const umsatzBrutto = e.ustStatus === "regelbesteuert" ? umsatzNetto * 1.2 : umsatzNetto;
  const db = (ED * p.bezugCt) / 100 - (eingebrachtGes * p.einspeisCt) / 100 + p.mitgliedsbeitragEur * anzahl - p.verwaltungEurJeTeilnehmer * anzahl;
  const kwGes = e.anlagen.reduce((s, a) => s + a.kwp, 0) + r.tn.reduce((s, t) => s + t.pvKwp * t.anzahl, 0);
  const alleHaushalt = e.anlagen.every((a) => a.haushalt) && r.tn.filter((t) => t.pvKwp > 0).every((t) => t.haushalt);
  const lieferantenpflichten = kwGes > 100 || (alleHaushalt && kwGes > 30);
  const vorteilSumme = r2(g.reduce((s, x) => s + x.summe, 0));
  const varianten = e.varianten.map((v) => {
    const gv = geld(e, r, v);
    const s = r2(gv.reduce((a, x) => a + x.summe, 0));
    return { ...v, vorteilEur: s, netzEur: r2(gv.reduce((a, x) => a + x.netz, 0)), abgabenEur: r2(gv.reduce((a, x) => a + x.abgaben, 0)), jeTeilnehmerEur: anzahl ? r2(s / anzahl) : 0 };
  });
  const sensitivitaet = {
    jeCtBezug: r2(-ED / 100), // je +1 ct Bezugspreis: Vorteil der Verbraucher sinkt, Erlös der Gemeinschaft steigt
    jeCtEinspeis: r2(eingebrachtGes / 100),
    haushalte: e.sensitivitaet.haushalte.map((h) => {
      const rr = kern(e, h);
      const v2 = rr.S.reduce((s, x) => s + x.vtf, 0);
      const ed2 = rr.S.reduce((s, x) => s + x.ed + x.edSpeicher, 0);
      return { zusaetzlich: h, eigendeckungKwh: r3(ed2), eigendeckungsquote: v2 > 0 ? rund(ed2 / v2, 4) : 0, nutzungsgrad: Eges > 0 ? rund(ed2 / Eges, 4) : 0 };
    }),
  };
  const hinweise = [];
  if (lieferantenpflichten) hinweise.push(`Erzeugungsleistung ${rund(kwGes, 1)} kW: Lieferantenpflichten nach ElWG § 69 (AGB, Informationsblatt, Rechnungen nach § 42, Wahl Monats-/Jahresrechnung) – übernehmbar durch einen Organisator.`);
  if (umsatzBrutto > KLEINUNTERNEHMER_GRENZE_EUR * 0.8) hinweise.push(`Umsatz der Gemeinschaft rund ${r2(umsatzBrutto)} € brutto – Kleinunternehmergrenze 55.000 € (Toleranz 60.500 €) im Blick behalten (§ 6 Abs. 1 Z 27 UStG).`);
  if (e.modell === "eeg" && r.tn.some((t) => t.art === "grossunternehmen")) hinweise.push("Großunternehmen dürfen nicht Mitglied einer EEG sein (ElWG § 6 Abs. 1 Z 61, EAG § 79 Abs. 2) – BEG prüfen.");
  if (Eges > 0 && ED / Eges < 0.5) hinweise.push("Weniger als die Hälfte der Erzeugung wird in der Gemeinschaft genutzt – weitere Verbraucher (Gewerbe, Gemeinde) oder ein Speicher erhöhen den Nutzungsgrad.");
  if (V > 0 && ED / V < 0.15) hinweise.push("Geringe Eigendeckung – zusätzliche Erzeugung lohnt sich.");
  if (db < 0) hinweise.push("Deckungsbeitrag negativ: Preisspanne Bezug/Einspeisung deckt die Verwaltungskosten nicht.");
  if (e.speicher) hinweise.push("Gemeinschaftsspeicher: Messkonzepte nach § 111 ElWG sind offen; derzeit nur Beladung aus einer Erzeugungstechnologie (Koordinationsstelle) – Wirkung als Schätzung (zu bestätigen).");
  if (e.netz.status === "platzhalter") hinweise.push("Netzentgelt-Reduktion ab 2027 ist ein Platzhalter bis zur neuen SNE-VO (zu bestätigen).");
  if (e.verteilmodell === "statisch") hinweise.push("Statisches Modell nur noch für Bestandsgemeinschaften; Neuaktivierungen ab 05.10.2026 voraussichtlich nur dynamisch (zu bestätigen).");
  hinweise.push("Schätzung auf Basis angenäherter Standardlastprofile und eines typischen PV-Jahres – maßgeblich sind später die Viertelstundenwerte des Netzbetreibers. Keine Steuer- oder Rechtsberatung.");
  const typisch = (m) => ({ erzeugungTf: r.typ[m].e.map((x) => r3(x / r.typ[m].tage)), verbrauchTf: r.typ[m].v.map((x) => r3(x / r.typ[m].tage)), eigendeckung: r.typ[m].ed.map((x) => r3(x / r.typ[m].tage)) });
  return {
    stand: SIM_STAND,
    eingabe: oeffentlich ? undefined : { ...e, teilnehmer: e.teilnehmer.map((t) => ({ ...t, lastgang: t.lastgang ? `(${t.lastgang.length} Werte)` : null })) },
    kennzahlen: {
      teilnehmer: anzahl,
      erzeugungsleistungKw: rund(kwGes, 1),
      verbrauchKwh: r3(last),
      eigenverbrauchKwh: r3(eigen),
      erzeugungTfKwh: r3(Eges),
      verbrauchTfKwh: r3(V),
      eigendeckungKwh: r3(ED),
      restueberschussKwh: r3(R),
      restbezugKwh: r3(V - ED),
      eigendeckungsquote: V > 0 ? rund(ED / V, 4) : 0,
      nutzungsgrad: Eges > 0 ? rund(ED / Eges, 4) : 0,
      autarkie: last > 0 ? rund((eigen + ED) / last, 4) : 0,
      vorteilEur: vorteilSumme,
      vorteilJeTeilnehmerEur: anzahl ? r2(vorteilSumme / anzahl) : 0,
      deckungsbeitragEur: r2(db),
      umsatzBruttoEur: r2(umsatzBrutto),
      kleinunternehmer: umsatzBrutto <= KLEINUNTERNEHMER_GRENZE_EUR ? "unter_grenze" : umsatzBrutto <= KLEINUNTERNEHMER_TOLERANZ_EUR ? "toleranz" : "ueber_grenze",
      lieferantenpflichten,
      netzReduktionPct: e.netz.reduktionPct,
      abgabenBefreit: e.netz.abgabenBefreit,
    },
    monate: r.monate.map((m, i) => ({ monat: i + 1, erzeugungTfKwh: r3(m.erzeugungTf), verbrauchTfKwh: r3(m.verbrauchTf), eigendeckungKwh: r3(m.eigendeckung), restueberschussKwh: r3(m.restueberschuss), ausSpeicherKwh: r3(m.speicher) })),
    typischerTag: { januar: typisch(0), juli: typisch(6) },
    teilnehmer,
    anlagen,
    speicher: r.speicher ? { ...e.speicher, geladenKwh: r3(r.speicher.geladenKwh), entladenKwh: r3(r.speicher.entladenKwh), verlusteKwh: r3(r.speicher.verlusteKwh), zyklen: e.speicher.kapazitaetKwh ? rund(r.speicher.entladenKwh / e.speicher.kapazitaetKwh, 1) : 0 } : null,
    varianten,
    sensitivitaet,
    hinweise,
  };
}

/** Öffentlicher Simulationskern für den Rechner (WP6): ohne Namen, höchstens 30 Teilnehmer, Ergebnis ohne Eingabe */
export const simulationOeffentlich = (daten) => simulationRechnen(daten, { oeffentlich: true });

/** Kennung der Wettersaat einer Gemeinschaft (stabil) */
export const simulationSaat = (s) => hash32(`sim|${s}`) % 1000000;
