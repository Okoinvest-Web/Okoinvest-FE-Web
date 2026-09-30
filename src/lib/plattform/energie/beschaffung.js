// src/lib/plattform/energie/beschaffung.js
//
// Energiebeschaffung für Gewerbe-/Industriekunden (Reststrom-Pool) – reine Funktionen (Browser, Server, Node-Tests):
//  - Kundenprofil als Stundenreihe: aus dem Lastgang-Upload (Wochenprofil + Monatsmengen der Analyse von
//    fach/lastgang.js) oder – ohne Lastgang – synthetisch aus Jahresmenge und Lastprofil; PV/Speicher-Einfluss
//  - Profilkennzahlen (Benutzungsstunden, Peak-Anteil, Profilfaktor, Solaranteil)
//  - Kosten nach Beschaffungsstruktur: Festpreis, Tranchenmodell (n Tranchen), Spot-Index + Aufschlag –
//    rückwirkend (Spot-Historie) und prognostisch (Stundenpreiskurve aus dem Terminmarkt)
//  - Laufende Wechselanalyse (Vertrag vs. Forward + Aufschlagsannahme → ausschreiben | abwarten | verlängern)
//  - Fristen (Kündigungsstichtag, Alarmstufen), Pool-Portfolio (Beschaffungsstand, Hedge-Quote, Mark-to-Market,
//    Risiko), Vergütung ÖkoInvest (Servicefee je MWh oder Erfolgshonorar – nur Parameter, nichts festgelegt)
//
// Preise: „Energiepreis“ = Beschaffungs-/Lieferanteil ohne Netzentgelte, Umlagen, Abgaben und Steuern (die ändert
// ein Lieferantenwechsel nicht). Alle Beträge netto. Frappe: plattform/energie_kern.py.

import { LASTPROFILE } from "../../rechner/reststrom.js";
import { STROM } from "../../invest/markt.js";
import { istPeak, mittel, monateZwischen, monatsBeginnMs, naechsterMonat, ortszeit, solarGewicht } from "./markt.js";

const H = 3600000;
const TAG = 86400000;
const rund = (x, s = 2) => (Number.isFinite(x) ? Math.round(x * 10 ** s) / 10 ** s : null);

/**
 * Annahmen der Wechselanalyse und Vergütung – Standardwerte, im Backoffice je Mandant änderbar (Einstellungen).
 * Bewusst vorsichtig und als Parameter geführt; KEINE Festlegung der Vergütung.
 */
export const ANNAHMEN_STANDARD = {
  lieferantAufschlagCt: 1.2, // Vertriebsmarge, Bilanzkreis, Profil-/Mengenrisiko eines Vollversorgers auf den Terminpreis (Orientierung)
  profilAufschlagCt: 0.4, // Strukturierung Profil vs. Base, wenn kein Lastgang vorliegt
  hknCt: 0.1, // Herkunftsnachweise Grünstrom (Orientierung, stark marktabhängig)
  schwelleProzent: 5, // Mindest-Vorteil des Marktes gegenüber dem Vertrag, ab dem sofort ausgeschrieben wird
  vorlaufTage: 120, // Ausschreibung spätestens so viele Tage vor dem Kündigungsstichtag starten
  beobachtenTage: 240, // früher als das: bei fallendem Markt abwarten
  fristAlarmTage: [90, 60, 30, 14, 7], // Aufgabe + Benachrichtigung bei diesen Resttagen bis zum Stichtag
  verguetungModell: "fee", // fee | erfolg | kombi
  serviceFeeEurMwh: 0, // Servicefee je MWh – bitte im Backoffice festlegen (Standard 0 = nicht festgelegt)
  erfolgsAnteil: 0, // Anteil an der nachgewiesenen Ersparnis (0–1) – bitte im Backoffice festlegen
  risikoSchockProzent: 20, // Preisbewegung für die Risikokennzahl „offene Position × Preisbewegung“
};

export const EMPFEHLUNGEN = {
  ausschreiben: { label: "Jetzt ausschreiben", ton: "ok" },
  abwarten: { label: "Abwarten und beobachten", ton: "info" },
  verlaengern: { label: "Verlängern / bestehenden Vertrag halten", ton: "warn" },
  pruefen: { label: "Daten ergänzen", ton: "neutral" },
};

export const STRUKTUREN = {
  fix: { label: "Festpreis (Vollversorgung)", kurz: "Festpreis" },
  tranchen: { label: "Tranchenmodell (strukturierte Beschaffung)", kurz: "Tranchen" },
  spot: { label: "Spot-Index + Aufschlag", kurz: "Spot-Index" },
};

// ---------------------------------------------------------------- Kundenprofil (Stundenreihe)

/** Wochenform (7 × 24, Mittelwert 1) je Lastprofil aus rechner/reststrom.js – Orientierung für Gewerbe */
function wochenform(profilId) {
  const f = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (let wt = 0; wt < 7; wt++) {
    for (let h = 0; h < 24; h++) {
      let x;
      if (profilId === "dreischicht") x = wt < 5 ? 1 : wt === 5 ? 0.75 : 0.55;
      else if (profilId === "zweischicht") x = wt < 5 ? (h >= 6 && h < 22 ? 1.35 : 0.35) : wt === 5 ? (h >= 7 && h < 14 ? 0.7 : 0.3) : 0.25;
      else if (profilId === "handel") x = wt < 6 ? (h >= 7 && h < 20 ? 1.3 : 0.45) : 0.35;
      else x = wt < 5 ? (h >= 6 && h < 16 ? 1.6 : 0.3) : 0.22; // einschicht
      f[wt][h] = x;
    }
  }
  const m = mittel(f.flat());
  return f.map((r) => r.map((x) => x / m));
}

/**
 * Stundenreihe (kW = kWh je Stunde) für die Monate von–bis („JJJJ-MM“, Standard: 12 Monate ab `von` bzw. Kalenderjahr `jahr`).
 * Quelle „lastgang“: analyse.wochenprofil (7×24 kW) und analyse.monate[{monat,kwh,vollstaendig}] aus fach/lastgang.js;
 * Quelle „synthetisch“: Jahresmenge × Wochenform × Saison (Winter +10 %, Sommer −10 %).
 * pvKwp > 0 zieht eine (zusätzliche) Eigenerzeugung ab; speicherKwh verschiebt Überschuss in die Abendstunden.
 * @returns {{startMs, werte: Float64Array, quelle, jahresKwh, pv: {erzeugtKwh, eigenverbrauchKwh}}}
 */
export function kundenReihe({ jahr, von, bis, jahresKwh = 0, profilId = "einschicht", analyse = null, pvKwp = 0, speicherKwh = 0, spezErtrag = 1000, zone = "DE" } = {}) {
  von = von || `${jahr}-01`;
  bis = bis || `${Number(von.slice(0, 4)) + (von.slice(5) === "01" ? 0 : 1)}-${String(((Number(von.slice(5)) + 10) % 12) + 1).padStart(2, "0")}`;
  const startMs = monatsBeginnMs(von);
  const endeMs = monatsBeginnMs(naechsterMonat(bis));
  const n = Math.round((endeMs - startMs) / H);
  const werte = new Float64Array(n);
  const hatLastgang = !!(analyse?.wochenprofil?.length === 7 && analyse?.monate?.length === 12);
  const form = hatLastgang ? analyse.wochenprofil : wochenform(profilId);
  const saison = [1.1, 1.08, 1.03, 0.98, 0.94, 0.9, 0.9, 0.92, 0.97, 1.02, 1.07, 1.1];
  // Monatsmengen: Lastgang (fehlende Monate aus dem Mittel), sonst Jahresmenge × Saison
  const monatKwh = new Array(12).fill(0);
  if (hatLastgang) {
    const voll = analyse.monate.filter((m) => m.kwh > 0);
    const mittelKwh = voll.length ? mittel(voll.map((m) => m.kwh)) : (analyse.jahresverbrauchKwh || jahresKwh) / 12;
    for (let m = 0; m < 12; m++) monatKwh[m] = analyse.monate[m]?.kwh > 0 && analyse.monate[m]?.vollstaendig !== false ? analyse.monate[m].kwh : mittelKwh;
    const ziel = jahresKwh > 0 ? jahresKwh : analyse.jahresverbrauchKwh;
    const s = monatKwh.reduce((a, b) => a + b, 0);
    if (ziel > 0 && s > 0) for (let m = 0; m < 12; m++) monatKwh[m] *= ziel / s;
  } else {
    const s = saison.reduce((a, b) => a + b, 0);
    for (let m = 0; m < 12; m++) monatKwh[m] = (jahresKwh * saison[m]) / s;
  }
  // je Monat: Form skalieren, sodass die Monatsmenge exakt stimmt
  for (const mm of monateZwischen(von, bis)) {
    const m = Number(mm.slice(5)) - 1;
    const a = monatsBeginnMs(mm);
    const b = monatsBeginnMs(naechsterMonat(mm));
    let s = 0;
    for (let t = a; t < b; t += H) {
      const o = ortszeit(t);
      s += Math.max(0, form[o.wochentag][o.stunde]);
    }
    const k = s > 0 ? monatKwh[m] / s : 0;
    for (let t = a; t < b; t += H) {
      const o = ortszeit(t);
      werte[Math.round((t - startMs) / H)] = Math.max(0, form[o.wochentag][o.stunde]) * k;
    }
  }
  // Zusätzliche PV (geplant bzw. im Bau durch ÖKOVOLT) und Speicher
  const pv = { erzeugtKwh: 0, eigenverbrauchKwh: 0, speicherKwh: 0 };
  if (pvKwp > 0) {
    const z = zone === "AT" ? { lat: 47.8, lon: 14 } : { lat: 50.9, lon: 10.2 };
    let wSum = 0;
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      w[i] = solarGewicht(startMs + i * H, z.lat, z.lon);
      wSum += w[i];
    }
    const jahrKwh = pvKwp * spezErtrag;
    let soc = 0;
    const kap = Math.max(0, speicherKwh);
    for (let i = 0; i < n; i++) {
      const erz = wSum > 0 ? Math.min(pvKwp * 0.85, (jahrKwh * w[i]) / wSum) : 0;
      pv.erzeugtKwh += erz;
      const direkt = Math.min(erz, werte[i]);
      let rest = werte[i] - direkt;
      let ueber = erz - direkt;
      if (kap > 0) {
        const laden = Math.min(ueber, kap - soc, kap * 0.5);
        soc += laden * 0.95;
        ueber -= laden;
        const entladen = Math.min(rest, soc, kap * 0.5);
        soc -= entladen;
        rest -= entladen;
        pv.speicherKwh += entladen;
      }
      pv.eigenverbrauchKwh += werte[i] - rest;
      werte[i] = rest;
    }
  }
  const summe = werte.reduce((a, b) => a + b, 0);
  return { startMs, werte, quelle: hatLastgang ? "lastgang" : "synthetisch", jahresKwh: rund(summe, 0), pv: { erzeugtKwh: rund(pv.erzeugtKwh, 0), eigenverbrauchKwh: rund(pv.eigenverbrauchKwh, 0), speicherKwh: rund(pv.speicherKwh, 0) } };
}

/** Summe mehrerer Stundenreihen gleichen Jahres (Pool) */
export function reihenSumme(reihen = []) {
  if (!reihen.length) return null;
  const n = Math.max(...reihen.map((r) => r.werte.length));
  const werte = new Float64Array(n);
  for (const r of reihen) for (let i = 0; i < r.werte.length; i++) werte[i] += r.werte[i];
  return { startMs: reihen[0].startMs, werte, quelle: "pool", jahresKwh: rund(werte.reduce((a, b) => a + b, 0), 0) };
}

/** Profilkennzahlen einer Stundenreihe; mit Preisen zusätzlich Profilfaktor (lastgewichteter Preis / Base) */
export function profilKennzahlen(reihe, preise = null) {
  const { werte, startMs } = reihe;
  let summe = 0;
  let spitze = 0;
  let peak = 0;
  let tag = 0;
  let we = 0;
  let pSum = 0;
  let pLast = 0;
  let pn = 0;
  const sortiert = [];
  for (let i = 0; i < werte.length; i++) {
    const t = startMs + i * H;
    const x = werte[i];
    summe += x;
    spitze = Math.max(spitze, x);
    sortiert.push(x);
    if (istPeak(t)) peak += x;
    const o = ortszeit(t);
    if (o.stunde >= 8 && o.stunde < 17) tag += x;
    if (o.wochentag >= 5) we += x;
    const p = preise ? preisBei(preise, t) : null;
    if (p !== null) {
      pSum += p;
      pn++;
      pLast += p * x;
    }
  }
  sortiert.sort((a, b) => a - b);
  const base = pn ? pSum / pn : null;
  const lastPreis = summe > 0 && pn ? pLast / summe : null;
  return {
    jahresKwh: rund(summe, 0),
    spitzeKw: rund(spitze, 1),
    grundlastKw: rund(sortiert[Math.floor(sortiert.length * 0.05)] || 0, 1),
    benutzungsstunden: spitze > 0 ? Math.round(summe / spitze) : 0,
    peakAnteil: summe > 0 ? rund(peak / summe, 3) : 0,
    tagAnteil: summe > 0 ? rund(tag / summe, 3) : 0,
    wochenendeAnteil: summe > 0 ? rund(we / summe, 3) : 0,
    lastgewichteterPreis: rund(lastPreis),
    basePreis: rund(base),
    profilfaktor: base && lastPreis !== null && base > 0 ? rund(lastPreis / base, 3) : null,
  };
}

/** Preis (€/MWh) zu einem Zeitpunkt aus {startMs, werte} (HPFC) oder Stundenliste [{t,eurMwh}] (über Map) */
function preisBei(preise, t) {
  if (preise.werte) {
    const i = Math.round((t - preise.startMs) / H);
    return i >= 0 && i < preise.werte.length ? preise.werte[i] : null;
  }
  if (!preise._map) Object.defineProperty(preise, "_map", { value: new Map(preise.map((p) => [p.t, p.eurMwh])), enumerable: false });
  const p = preise._map.get(t);
  return p === undefined ? null : p;
}

// ---------------------------------------------------------------- Kosten nach Struktur

/** Kosten Spot-Index: Σ Last × (Preis + Aufschlag) → {eur, ctKwh, mwh} */
export function kostenSpot(reihe, preise, aufschlagCt = 0) {
  let eur = 0;
  let kwh = 0;
  for (let i = 0; i < reihe.werte.length; i++) {
    const p = preisBei(preise, reihe.startMs + i * H);
    if (p === null) continue;
    const x = reihe.werte[i];
    kwh += x;
    eur += (x * (p / 10 + aufschlagCt)) / 100;
  }
  return { eur: rund(eur, 0), ctKwh: kwh ? rund((eur / kwh) * 100, 3) : null, mwh: rund(kwh / 1000, 1) };
}

/** Festpreis: Menge × Arbeitspreis (+ Grundpreis) */
export function kostenFix(reihe, ctKwh, grundEurMonat = 0) {
  const kwh = reihe.werte.reduce((a, b) => a + b, 0);
  const eur = (kwh * ctKwh) / 100 + grundEurMonat * 12;
  return { eur: rund(eur, 0), ctKwh: kwh ? rund((eur / kwh) * 100, 3) : null, mwh: rund(kwh / 1000, 1) };
}

/**
 * Tranchenmodell: `anteil` der Menge wird in n Tranchen zu Terminpreisen (tranchenPreise €/MWh Base) gesichert,
 * das Profil (Last − Base-Band) und der Rest laufen über den Spot; Aufschlag des Lieferanten (Strukturierung) je kWh.
 */
export function kostenTranchen(reihe, preise, { tranchenPreise = [], anteil = 0.8, aufschlagCt = 0.6 } = {}) {
  const kwh = reihe.werte.reduce((a, b) => a + b, 0);
  const n = reihe.werte.length;
  const bandKw = (kwh / n) * anteil; // Base-Band
  const tranche = tranchenPreise.length ? mittel(tranchenPreise) : null;
  let eur = 0;
  for (let i = 0; i < n; i++) {
    const p = preisBei(preise, reihe.startMs + i * H);
    if (p === null) continue;
    const x = reihe.werte[i];
    const band = tranche !== null ? bandKw : 0;
    // Band zum Tranchenpreis; Differenz (auch Überschuss) zum Spot glattstellen
    eur += (band * (tranche ?? 0)) / 1000 + ((x - band) * p) / 1000;
    eur += (x * aufschlagCt) / 100;
  }
  return { eur: rund(eur, 0), ctKwh: kwh ? rund((eur / kwh) * 100, 3) : null, mwh: rund(kwh / 1000, 1), tranchePreis: rund(tranche), anteil };
}

/**
 * Strukturvergleich für einen Kunden: Festpreis vs. Tranchen vs. Spot-Index, jeweils auf dieselbe Stundenreihe.
 * preise: Spot-Historie (rückwirkend) oder HPFC (prognostisch). fixCt = Festpreisangebot/-annahme (Energiepreis).
 */
export function strukturVergleich(reihe, preise, { fixCt, spotAufschlagCt = 0.5, tranchenPreise = [], tranchenAnteil = 0.8, tranchenAufschlagCt = 0.6 } = {}) {
  const spot = kostenSpot(reihe, preise, spotAufschlagCt);
  const tr = kostenTranchen(reihe, preise, { tranchenPreise, anteil: tranchenAnteil, aufschlagCt: tranchenAufschlagCt });
  const fix = Number.isFinite(fixCt) ? kostenFix(reihe, fixCt) : null;
  const liste = [fix && { id: "fix", ...STRUKTUREN.fix, ...fix }, { id: "tranchen", ...STRUKTUREN.tranchen, ...tr }, { id: "spot", ...STRUKTUREN.spot, ...spot }].filter(Boolean);
  const best = liste.reduce((a, b) => (b.eur < a.eur ? b : a), liste[0]);
  return { liste, guenstigste: best?.id || null };
}

// ---------------------------------------------------------------- Fristen & Wechselanalyse

const iso = (d) => d.toISOString().slice(0, 10);
export const tageZwischen = (von, bis) => Math.round((Date.parse(`${bis}T00:00:00Z`) - Date.parse(`${von}T00:00:00Z`)) / TAG);

/** Kündigungsstichtag = Vertragsende − Kündigungsfrist (Monate bzw. Wochen) → „JJJJ-MM-TT“ oder null */
export function kuendigungsStichtag({ vertragEnde, kuendigungsfristMonate = null, kuendigungsfristWochen = null } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(vertragEnde || ""))) return null;
  const d = new Date(`${vertragEnde}T00:00:00Z`);
  if (Number.isFinite(kuendigungsfristWochen) && kuendigungsfristWochen > 0) d.setUTCDate(d.getUTCDate() - kuendigungsfristWochen * 7);
  else {
    const m = Number.isFinite(kuendigungsfristMonate) ? kuendigungsfristMonate : 3;
    const tag = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - m);
    const max = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(tag, max));
  }
  return iso(d);
}

/** Alarmstufe (größte Schwelle ≥ Resttage) oder null; abgelaufen → 0 */
export function fristAlarmStufe(tage, schwellen = ANNAHMEN_STANDARD.fristAlarmTage) {
  if (tage === null || tage === undefined) return null;
  if (tage < 0) return 0;
  const passend = [...schwellen].sort((a, b) => a - b).find((s) => tage <= s);
  return passend ?? null;
}

/** Energiepreis eines Vertrags in ct/kWh (bei „Gesamtpreis“ ohne die nicht beeinflussbaren Bestandteile aus markt.js) */
export function vertragEnergiepreisCt(v) {
  if (!v || !Number.isFinite(v.preisCt)) return null;
  if (v.preisArt === "gesamt") {
    const fix = STROM.bestandteile.filter((b) => !b.beeinflussbar).reduce((s, b) => s + b.ct, 0);
    return rund(Math.max(0, v.preisCt - fix), 3);
  }
  return v.preisCt;
}

/**
 * Laufende Wechselanalyse eines Vertrags.
 * @param {object} p
 *   vertrag {preisCt, preisArt: energie|gesamt, vertragEnde, kuendigungsfristMonate|Wochen, verlaengerungMonate,
 *            verlaengerungPreisCt?, jahresKwh}
 *   markt   {forwardEurMwh (Base des Folgezeitraums), profilfaktor?, trend {richtung, prozent}, quelleDemo?}
 *   annahmen ANNAHMEN_STANDARD (überschreibbar), stichtag „JJJJ-MM-TT“
 * @returns {{empfehlung, label, ton, begruendung[], vertragCt, marktCt, deltaCt, deltaProzent, deltaEurJahr,
 *            stichtag, tageBisStichtag, alarm, fristVerpasst}}
 */
export function wechselanalyse({ vertrag = {}, markt = {}, annahmen = {}, stichtag = iso(new Date()) } = {}) {
  const a = { ...ANNAHMEN_STANDARD, ...annahmen };
  const begruendung = [];
  const vertragCt = vertragEnergiepreisCt(vertrag);
  const kStichtag = kuendigungsStichtag(vertrag);
  const tage = kStichtag ? tageZwischen(stichtag, kStichtag) : null;
  const fwd = Number.isFinite(markt.forwardEurMwh) ? markt.forwardEurMwh : null;
  const pf = Number.isFinite(markt.profilfaktor) && markt.profilfaktor > 0 ? markt.profilfaktor : null;
  const marktCt = fwd !== null ? rund((fwd * (pf || 1)) / 10 + (pf ? 0 : a.profilAufschlagCt) + a.lieferantAufschlagCt + (a.serviceFeeEurMwh || 0) / 10, 3) : null;
  const out = { stichtag: kStichtag, tageBisStichtag: tage, alarm: fristAlarmStufe(tage, a.fristAlarmTage), vertragCt, marktCt, deltaCt: null, deltaProzent: null, deltaEurJahr: null, fristVerpasst: tage !== null && tage < 0, begruendung };
  const fertig = (id) => ({ ...out, empfehlung: id, label: EMPFEHLUNGEN[id].label, ton: EMPFEHLUNGEN[id].ton });

  if (vertragCt === null || marktCt === null || !kStichtag) {
    if (vertragCt === null) begruendung.push("Preis des laufenden Vertrags fehlt.");
    if (!kStichtag) begruendung.push("Vertragsende bzw. Kündigungsfrist fehlt.");
    if (marktCt === null) begruendung.push("Kein Terminpreis für den Folgezeitraum verfügbar (Terminkurve einspielen).");
    return fertig("pruefen");
  }
  out.deltaCt = rund(vertragCt - marktCt, 3);
  out.deltaProzent = rund((vertragCt - marktCt) / vertragCt, 4);
  out.deltaEurJahr = Number.isFinite(vertrag.jahresKwh) ? rund(((vertragCt - marktCt) / 100) * vertrag.jahresKwh, 0) : null;
  const vorteil = out.deltaProzent * 100; // > 0: Markt günstiger als der Vertrag
  const fmt = (x) => x.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  begruendung.push(`Vertrag ${fmt(vertragCt)} ct/kWh (Energiepreis) gegenüber Markt ${fmt(marktCt)} ct/kWh (Terminpreis ${fmt(fwd)} €/MWh${pf ? ` × Profilfaktor ${pf.toLocaleString("de-DE")}` : ` + Profilaufschlag ${fmt(a.profilAufschlagCt)} ct`} + Lieferantenaufschlag ${fmt(a.lieferantAufschlagCt)} ct${a.serviceFeeEurMwh ? ` + Servicefee ${fmt(a.serviceFeeEurMwh / 10)} ct` : ""}).`);
  if (markt.quelleDemo) begruendung.push("Achtung: Die Terminkurve enthält Demo-Werte – vor einer Entscheidung aktuelle, lizenzierte Kurse einspielen.");

  if (out.fristVerpasst) {
    const verl = vertrag.verlaengerungMonate ? ` um ${vertrag.verlaengerungMonate} Monate` : "";
    begruendung.push(`Kündigungsstichtag ${kStichtag.split("-").reverse().join(".")} ist verstrichen – der Vertrag verlängert sich in der Regel${verl} (Vertrag prüfen). Nächstes Kündigungsfenster vormerken.`);
    return fertig("verlaengern");
  }
  begruendung.push(`Kündigung spätestens am ${kStichtag.split("-").reverse().join(".")} (${tage} Tage).`);
  if (vorteil >= a.schwelleProzent) {
    begruendung.push(`Der Markt liegt ${fmt(vorteil)} % unter dem Vertrag (Schwelle ${a.schwelleProzent} %) – Angebote jetzt einholen und Preis sichern.`);
    if (out.deltaEurJahr) begruendung.push(`Rechnerischer Vorteil rund ${Math.round(out.deltaEurJahr).toLocaleString("de-DE")} € pro Jahr (vor Angeboten der Versorger).`);
    return fertig("ausschreiben");
  }
  if (tage <= a.vorlaufTage) {
    begruendung.push(`Weniger als ${a.vorlaufTage} Tage bis zum Stichtag – Ausschreibung (Angebotsfrist, Runde 2, Kundenfreigabe) braucht Vorlauf.`);
    if (vorteil < 0 && Number.isFinite(vertrag.verlaengerungPreisCt) && vertrag.verlaengerungPreisCt <= marktCt) {
      begruendung.push("Das Verlängerungsangebot des bisherigen Lieferanten liegt unter dem Marktniveau – Verlängerung ist eine gute Option, parallel Vergleichsangebote einholen.");
      return fertig("verlaengern");
    }
    return fertig("ausschreiben");
  }
  if (vorteil < 0 && Number.isFinite(vertrag.verlaengerungPreisCt) && vertrag.verlaengerungPreisCt <= marktCt) {
    begruendung.push("Der Vertrag ist günstiger als der Markt und das Verlängerungsangebot liegt unter dem Marktniveau – verlängern prüfen.");
    return fertig("verlaengern");
  }
  if (markt.trend?.richtung === "fallend" && tage > a.vorlaufTage) {
    begruendung.push(`Terminpreise fallen (${fmt((markt.trend.prozent || 0) * 100)} % in den letzten Wochen) und es bleibt Zeit bis zum Stichtag – beobachten, Ausschreibung spätestens ${a.vorlaufTage} Tage vor dem Stichtag starten.`);
    return fertig("abwarten");
  }
  if (tage > a.beobachtenTage) {
    begruendung.push(`Mehr als ${a.beobachtenTage} Tage bis zum Stichtag – Markt beobachten; Tranchen können bereits jetzt gesichert werden.`);
    return fertig("abwarten");
  }
  if (markt.trend?.richtung === "steigend") begruendung.push("Terminpreise steigen – Abwarten erhöht das Risiko.");
  begruendung.push("Kein deutlicher Marktvorteil, aber das Zeitfenster für eine geordnete Ausschreibung ist offen.");
  return fertig("ausschreiben");
}

// ---------------------------------------------------------------- Portfolio (Pool)

/**
 * Beschaffungsstand des Pools je Periode.
 * bedarf: [{periode "JJJJ-MM" | "Qn-JJ" | "Cal-JJ", mwh}] – Summe der Kundenmengen je Periode
 * tranchen: [{periode, mwh, preisEurMwh, typ, status}] (nur status ≠ storniert)
 * marktpreis(periode) → aktueller Terminpreis €/MWh (für Mark-to-Market) oder null
 * @returns {{perioden: [{periode, bedarfMwh, gesichertMwh, offenMwh, hedgeQuote, mittelpreis, marktpreis, mtmEur, risikoEur}], summe}}
 */
export function portfolio({ bedarf = [], tranchen = [], marktpreis = () => null, schockProzent = ANNAHMEN_STANDARD.risikoSchockProzent } = {}) {
  const je = new Map();
  for (const b of bedarf) je.set(b.periode, { periode: b.periode, bedarfMwh: b.mwh || 0, gesichertMwh: 0, kostenGesichert: 0 });
  for (const t of tranchen) {
    if (t.status === "storniert") continue;
    const e = je.get(t.periode) || { periode: t.periode, bedarfMwh: 0, gesichertMwh: 0, kostenGesichert: 0 };
    e.gesichertMwh += t.mwh;
    e.kostenGesichert += t.mwh * t.preisEurMwh;
    je.set(t.periode, e);
  }
  const perioden = [...je.values()].map((e) => {
    const mp = marktpreis(e.periode);
    const mittelpreis = e.gesichertMwh ? e.kostenGesichert / e.gesichertMwh : null;
    const offen = Math.max(0, e.bedarfMwh - e.gesichertMwh);
    return {
      periode: e.periode,
      bedarfMwh: rund(e.bedarfMwh, 1),
      gesichertMwh: rund(e.gesichertMwh, 1),
      offenMwh: rund(offen, 1),
      ueberdeckungMwh: rund(Math.max(0, e.gesichertMwh - e.bedarfMwh), 1),
      hedgeQuote: e.bedarfMwh > 0 ? rund(Math.min(1, e.gesichertMwh / e.bedarfMwh), 3) : null,
      mittelpreis: rund(mittelpreis),
      marktpreis: mp,
      // Mark-to-Market der gesicherten Mengen: (Markt − Einstand) × Menge (positiv = Tranchen günstiger als heute)
      mtmEur: mp !== null && mittelpreis !== null ? rund((mp - mittelpreis) * e.gesichertMwh, 0) : null,
      // Risiko der offenen Position: offene Menge × Preisbewegung (Schock in % des Marktpreises)
      risikoEur: mp !== null ? rund(offen * mp * (schockProzent / 100), 0) : null,
      offeneKostenEur: mp !== null ? rund(offen * mp, 0) : null,
    };
  });
  const s = (k) => perioden.reduce((a, p) => a + (p[k] || 0), 0);
  const bedarfMwh = s("bedarfMwh");
  const gesichertMwh = perioden.reduce((a, p) => a + Math.min(p.gesichertMwh, p.bedarfMwh || p.gesichertMwh), 0);
  return {
    perioden,
    summe: { bedarfMwh: rund(bedarfMwh, 1), gesichertMwh: rund(gesichertMwh, 1), offenMwh: rund(s("offenMwh"), 1), hedgeQuote: bedarfMwh ? rund(gesichertMwh / bedarfMwh, 3) : null, mtmEur: rund(s("mtmEur"), 0), risikoEur: rund(s("risikoEur"), 0), schockProzent },
  };
}

/** Bedarf einer Stundenreihe je Quartal: [{periode "Qn-JJ", mwh}] */
export function bedarfJeQuartal(reihe) {
  const je = {};
  for (let i = 0; i < reihe.werte.length; i++) {
    const o = ortszeit(reihe.startMs + i * H);
    const k = `Q${Math.floor(o.monat / 3) + 1}-${String(o.jahr).slice(2)}`;
    je[k] = (je[k] || 0) + reihe.werte[i] / 1000;
  }
  return Object.entries(je).map(([periode, mwh]) => ({ periode, mwh: rund(mwh, 1) }));
}

// ---------------------------------------------------------------- Vergütung ÖkoInvest (Parameter)

export const VERGUETUNG_MODELLE = {
  fee: "Servicefee je MWh",
  erfolg: "Erfolgshonorar (Anteil an der Ersparnis)",
  kombi: "Servicefee + Erfolgshonorar",
};

/** Vergütung für eine Beschaffung – nur Rechenhilfe mit den im Backoffice hinterlegten Parametern */
export function verguetung({ mengeMwh = 0, ersparnisEur = 0, modell = "fee", serviceFeeEurMwh = 0, erfolgsAnteil = 0 } = {}) {
  const fee = ["fee", "kombi"].includes(modell) ? mengeMwh * serviceFeeEurMwh : 0;
  const erfolg = ["erfolg", "kombi"].includes(modell) ? Math.max(0, ersparnisEur) * erfolgsAnteil : 0;
  return { modell, feeEur: rund(fee, 0), erfolgEur: rund(erfolg, 0), gesamtEur: rund(fee + erfolg, 0), festgelegt: serviceFeeEurMwh > 0 || erfolgsAnteil > 0 };
}

export { LASTPROFILE };
