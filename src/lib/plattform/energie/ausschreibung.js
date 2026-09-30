// src/lib/plattform/energie/ausschreibung.js
//
// Ausschreibung / Bieterwettbewerb unter Energieversorgern – reine Regeln (Browser, Server, Node-Tests):
//  - Status, Produktvarianten (Festpreis, Tranchenmodell, Spot-Index + Aufschlag, Grünstrom mit Herkunftsnachweisen),
//    Pflichtangaben des Preisblatts, Regeln für den Bestpreis-Hinweis in Runde 2 (ohne Namensnennung)
//  - Preisblatt prüfen, Angebote auf das Kundenprofil normieren (Gesamtkosten €/Jahr), Ranking, Sensitivität
//  - Anonymisierung der Lastgänge: Lieferanten erhalten nur ein Los-Kennzeichen und gerundete Kennzahlen – nie
//    Kundennamen, Adressen, Marktlokations-/Zählpunkt-IDs oder Rohdaten mit Zeitstempeln einzelner Kunden
//
// Rechtlicher Rahmen (Stand 2026, vorsichtig): Für private Auftraggeber ist die Angebotsanfrage eine freie
// Verhandlung – ÖkoInvest legt Spielregeln (Fristen, Runden, Gleichbehandlung) selbst fest und macht sie allen
// Bietern vorab bekannt. Öffentliche Auftraggeber (Kommunen, kommunale Unternehmen) unterliegen dem Vergaberecht
// (DE: GWB/VgV bzw. UVgO/Landesrecht; AT: BVergG 2018); ab dem EU-Schwellenwert für Liefer-/Dienstleistungsaufträge
// (216.000 € netto für 2026/2027, subzentrale Auftraggeber) ist ein EU-weites Verfahren nötig. Diese Plattform
// ersetzt kein förmliches Vergabeverfahren. Frappe: plattform/energie_kern.py.

import { mittel } from "./markt.js";

export const AUSSCHREIBUNG_STATUS = {
  entwurf: { label: "Entwurf", ton: "neutral" },
  laufend: { label: "Angebotsphase", ton: "info" },
  auswertung: { label: "Auswertung", ton: "info" },
  freigabe: { label: "Wartet auf Kundenfreigabe", ton: "warn" },
  zuschlag: { label: "Zuschlag erteilt", ton: "ok" },
  abgebrochen: { label: "Abgebrochen", ton: "neutral" },
};
export const AUSSCHREIBUNG_OFFEN = ["laufend", "auswertung", "freigabe"];

export const PRODUKT_ARTEN = {
  fix: { label: "Festpreis", text: "Arbeitspreis fix über die Laufzeit (Vollversorgung inkl. Profil und Mengentoleranz)." },
  tranchen: { label: "Tranchenmodell", text: "Beschaffung in n Tranchen zu Terminmarktpreisen (Base), Restmenge und Profil über den Spot; Aufschlag je kWh." },
  spot: { label: "Spot-Index + Aufschlag", text: "Abrechnung zum stündlichen bzw. viertelstündlichen Day-Ahead-Preis der Zone plus fester Aufschlag je kWh." },
};

export const SICHERHEITEN = {
  keine: "Keine Sicherheit",
  vorauszahlung: "Vorauszahlung / Abschläge",
  buergschaft: "Bankbürgschaft",
  garantie: "Konzerngarantie",
  kaution: "Kaution",
};

export const BESTPREIS_REGELN = {
  aus: { label: "Kein Hinweis", text: "Bieter erfahren in Runde 2 nichts über die anderen Angebote." },
  rang: { label: "Eigener Rang", text: "Jeder Bieter erfährt nur seinen Rang (z. B. „2 von 5“)." },
  abstand: { label: "Abstand zum Bestpreis", text: "Jeder Bieter erfährt den prozentualen Abstand seines Angebots zum besten Angebot." },
  bestpreis: { label: "Bestpreis nennen", text: "Der beste normierte Preis (ct/kWh) wird allen genannt – ohne Namen des Bieters." },
};

/** Pflichtangaben je Position des Preisblatts */
export const PREISBLATT_FELDER = {
  arbeitspreisCt: "Arbeitspreis Energie (ct/kWh, netto)",
  aufschlagCt: "Aufschlag auf Spot/Terminpreis (ct/kWh, netto)",
  grundpreisEurMonat: "Grundpreis (€/Monat je Los)",
  hknCt: "Aufschlag Herkunftsnachweise (ct/kWh)",
  bindefristBis: "Bindefrist des Angebots",
  zahlungszielTage: "Zahlungsziel (Tage)",
  sicherheit: "Geforderte Sicherheit",
  mengentoleranzProzent: "Mengentoleranz (± %)",
};

export const LAUFZEITEN = [1, 2, 3];

const rund = (x, s = 2) => (Number.isFinite(x) ? Math.round(x * 10 ** s) / 10 ** s : null);
const zahl = (v, min, max, stellen = 3) => {
  if (v === undefined || v === null || v === "" || typeof v === "object" || typeof v === "boolean") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10 ** stellen) / 10 ** stellen;
};
const text = (v, max = 300) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max) : "");

class Ungueltig extends Error {
  constructor(msg) {
    super(msg);
    this.status = 422;
  }
}

/**
 * Produktvarianten einer Ausschreibung bereinigen: [{id, art, laufzeitJahre, tranchen?, gruen}]
 * Mindestens eine Variante; je Kombination eine eindeutige id (P1, P2 …).
 */
export function produkteBereinigen(liste = []) {
  const out = [];
  for (const p of Array.isArray(liste) ? liste.slice(0, 8) : []) {
    const art = Object.prototype.hasOwnProperty.call(PRODUKT_ARTEN, p?.art) ? p.art : null;
    if (!art) continue;
    const laufzeitJahre = LAUFZEITEN.includes(Number(p.laufzeitJahre)) ? Number(p.laufzeitJahre) : 1;
    const tranchen = art === "tranchen" ? Math.min(24, Math.max(2, Math.round(Number(p.tranchen) || 4))) : null;
    out.push({ id: `P${out.length + 1}`, art, laufzeitJahre, tranchen, gruen: p.gruen === true || p.gruen === "ja" });
  }
  if (!out.length) throw new Ungueltig("Bitte mindestens eine Produktvariante wählen (Festpreis, Tranchen oder Spot-Index).");
  return out;
}

export function produktLabel(p) {
  if (!p) return "";
  const a = PRODUKT_ARTEN[p.art]?.label || p.art;
  return `${a}${p.art === "tranchen" && p.tranchen ? ` (${p.tranchen} Tranchen)` : ""}, ${p.laufzeitJahre} ${p.laufzeitJahre === 1 ? "Jahr" : "Jahre"}${p.gruen ? ", Grünstrom (HKN)" : ""}`;
}

/**
 * Preisblatt eines Lieferanten prüfen. Pflicht je angebotener Position: Arbeitspreis (Festpreis) bzw. Aufschlag
 * (Tranchen/Spot), Grundpreis, bei Grünstrom HKN-Aufschlag; für das ganze Angebot: Bindefrist (nach Angebotsfrist),
 * Zahlungsziel, Sicherheit. Mindestens eine Position.
 * @param {object} eingabe {positionen: [{produktId, arbeitspreisCt?, aufschlagCt?, grundpreisEurMonat, hknCt?, mengentoleranzProzent?}], bindefristBis, zahlungszielTage, sicherheit, bemerkung}
 * @param {object[]} produkte bereinigte Produktvarianten der Ausschreibung
 * @param {{frist: ISO}} runde aktuelle Runde (Bindefrist muss danach liegen)
 */
export function preisblattPruefen(eingabe = {}, produkte = [], { frist } = {}) {
  const positionen = [];
  const gesehen = new Set();
  for (const x of Array.isArray(eingabe.positionen) ? eingabe.positionen.slice(0, 8) : []) {
    const p = produkte.find((y) => y.id === x?.produktId);
    if (!p || gesehen.has(p.id)) continue;
    gesehen.add(p.id);
    const pos = { produktId: p.id, art: p.art, arbeitspreisCt: null, aufschlagCt: null, grundpreisEurMonat: zahl(x.grundpreisEurMonat, 0, 100000, 2), hknCt: null, mengentoleranzProzent: zahl(x.mengentoleranzProzent, 0, 100, 1) };
    if (p.art === "fix") {
      pos.arbeitspreisCt = zahl(x.arbeitspreisCt, 0.5, 100);
      if (pos.arbeitspreisCt === null) throw new Ungueltig(`${produktLabel(p)}: Arbeitspreis in ct/kWh fehlt oder ist unplausibel (0,5–100).`);
    } else {
      pos.aufschlagCt = zahl(x.aufschlagCt, -5, 20);
      if (pos.aufschlagCt === null) throw new Ungueltig(`${produktLabel(p)}: Aufschlag in ct/kWh fehlt oder ist unplausibel (−5 bis 20).`);
    }
    if (pos.grundpreisEurMonat === null) throw new Ungueltig(`${produktLabel(p)}: Grundpreis in €/Monat fehlt (0 ist zulässig).`);
    if (p.gruen) {
      pos.hknCt = zahl(x.hknCt, 0, 10);
      if (pos.hknCt === null) throw new Ungueltig(`${produktLabel(p)}: Aufschlag für Herkunftsnachweise fehlt (0 ist zulässig).`);
    }
    positionen.push(pos);
  }
  if (!positionen.length) throw new Ungueltig("Bitte mindestens eine Produktvariante bepreisen.");
  const bindefristBis = text(eingabe.bindefristBis, 30);
  const bf = Date.parse(bindefristBis);
  if (!bindefristBis || !Number.isFinite(bf)) throw new Ungueltig("Bitte eine Bindefrist (Datum und Uhrzeit) angeben.");
  if (frist && bf < Date.parse(frist) + 3600e3) throw new Ungueltig("Die Bindefrist muss mindestens eine Stunde nach der Angebotsfrist liegen (Zeit für Auswertung und Kundenfreigabe).");
  const zahlungszielTage = zahl(eingabe.zahlungszielTage, 0, 90, 0);
  if (zahlungszielTage === null) throw new Ungueltig("Bitte ein Zahlungsziel in Tagen angeben (0–90).");
  const sicherheit = Object.prototype.hasOwnProperty.call(SICHERHEITEN, eingabe.sicherheit) ? eingabe.sicherheit : null;
  if (!sicherheit) throw new Ungueltig("Bitte die geforderte Sicherheit angeben.");
  return { positionen, bindefristBis: new Date(bf).toISOString(), zahlungszielTage, sicherheit, bemerkung: text(eingabe.bemerkung, 1500) };
}

// ---------------------------------------------------------------- Normierung & Vergleich

/**
 * Kontext der Normierung: Referenz-Stundenreihe des Loses (kWh je Stunde, Lieferjahr 1) und Stundenpreiskurve
 * (HPFC, €/MWh) des Lieferzeitraums. Aus beiden: lastgewichteter Marktpreis (Spot-Erwartung) und Base-Preis.
 */
export function normierungKontext(reihe, hpfc) {
  let kwh = 0;
  let last = 0;
  let base = 0;
  let n = 0;
  for (let i = 0; i < reihe.werte.length; i++) {
    const j = Math.round((reihe.startMs + i * 3600000 - hpfc.startMs) / 3600000);
    const p = j >= 0 && j < hpfc.werte.length ? hpfc.werte[j] : null;
    if (p === null) continue;
    kwh += reihe.werte[i];
    last += reihe.werte[i] * p;
    base += p;
    n++;
  }
  return { kwh, lastgewichtetEurMwh: kwh ? last / kwh : null, baseEurMwh: n ? base / n : null };
}

/**
 * Position auf das Kundenprofil normieren → erwartete Kosten Energie €/Jahr und ct/kWh.
 *  Festpreis:  Menge × Arbeitspreis
 *  Spot-Index: Menge × (lastgewichteter Stundenpreis der HPFC + Aufschlag)
 *  Tranchen:   Menge × (Base-Terminpreis × Profilfaktor + Aufschlag) – Profilkosten trägt der Kunde
 *  jeweils + Grundpreis × 12 + HKN × Menge
 */
export function positionNormieren(pos, ctx, { marktFaktor = 1 } = {}) {
  const kwh = ctx.kwh;
  if (!kwh) return null;
  let ct;
  if (pos.art === "fix") ct = pos.arbeitspreisCt;
  else if (pos.art === "spot") ct = (ctx.lastgewichtetEurMwh * marktFaktor) / 10 + pos.aufschlagCt;
  else ct = (ctx.lastgewichtetEurMwh * marktFaktor) / 10 + pos.aufschlagCt; // Tranchen: Erwartungswert über die Beschaffung
  const eur = (kwh * (ct + (pos.hknCt || 0))) / 100 + (pos.grundpreisEurMonat || 0) * 12;
  return { eurJahr: Math.round(eur), ctKwh: rund((eur / kwh) * 100, 3) };
}

/** Preisrisiko je Struktur (Anteil der Marktbewegung, der beim Kunden ankommt) */
export const MARKT_EXPOSITION = { fix: 0, tranchen: 0.5, spot: 1 };

/**
 * Angebote vergleichen: alle Positionen aller (gültigen) Angebote normieren, Ranking nach €/Jahr,
 * Abstand zum Besten, Sensitivität bei Marktbewegungen (±%).
 * angebote: [{id, lieferantId, positionen, …}], produkte: Varianten der Ausschreibung
 * @returns {{zeilen: [{angebotId, lieferantId, produktId, produkt, art, eurJahr, ctKwh, rang, abstandProzent, sensitivitaet: {"-20": eur, …}}], bester}}
 */
export function angeboteVergleichen(angebote = [], produkte = [], ctx, { szenarien = [-30, -15, 15, 30] } = {}) {
  const zeilen = [];
  for (const a of angebote) {
    for (const pos of a.positionen || []) {
      const p = produkte.find((x) => x.id === pos.produktId);
      if (!p) continue;
      const norm = positionNormieren(pos, ctx);
      if (!norm) continue;
      const sens = {};
      for (const s of szenarien) {
        const f = 1 + (s / 100) * MARKT_EXPOSITION[p.art];
        sens[s] = positionNormieren(pos, ctx, { marktFaktor: f }).eurJahr;
      }
      zeilen.push({ angebotId: a.id, lieferantId: a.lieferantId, runde: a.runde, produktId: p.id, produkt: produktLabel(p), art: p.art, laufzeitJahre: p.laufzeitJahre, ...norm, sensitivitaet: sens, positionen: pos });
    }
  }
  zeilen.sort((x, y) => x.eurJahr - y.eurJahr);
  const best = zeilen[0]?.eurJahr ?? null;
  zeilen.forEach((z, i) => {
    z.rang = i + 1;
    z.abstandProzent = best ? rund(((z.eurJahr - best) / best) * 100, 2) : 0;
  });
  return { zeilen, bester: zeilen[0] || null, szenarien };
}

/** Bestes Angebot je Lieferant (günstigste Position) – Grundlage für Rang/Abstand in Runde 2 */
export function besteJeLieferant(vergleich) {
  const je = new Map();
  for (const z of vergleich.zeilen) if (!je.has(z.lieferantId)) je.set(z.lieferantId, z);
  return [...je.values()];
}

/**
 * Hinweis für einen Lieferanten in der Folgerunde nach der konfigurierten Regel – NIE mit Namen anderer Bieter.
 * @returns {null | {regel, text, rang?, von?, abstandProzent?, bestpreisCt?}}
 */
export function bestpreisHinweis(regel, lieferantId, vergleichVorrunde) {
  if (!vergleichVorrunde || regel === "aus" || !BESTPREIS_REGELN[regel]) return null;
  const liste = besteJeLieferant(vergleichVorrunde);
  const eigen = liste.find((z) => z.lieferantId === lieferantId);
  const best = liste[0];
  if (!best) return null;
  const fmt = (x, s = 2) => Number(x).toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s });
  if (regel === "bestpreis") return { regel, bestpreisCt: best.ctKwh, text: `Bestes normiertes Angebot der Vorrunde: ${fmt(best.ctKwh, 3)} ct/kWh (auf das Profil des Loses, inkl. Grundpreis).` };
  if (!eigen) return { regel, text: "Sie haben in der Vorrunde kein Angebot abgegeben." };
  const rang = liste.indexOf(eigen) + 1;
  if (regel === "rang") return { regel, rang, von: liste.length, text: `Ihr bestes Angebot lag in der Vorrunde auf Rang ${rang} von ${liste.length}.` };
  const abstand = rund(((eigen.eurJahr - best.eurJahr) / best.eurJahr) * 100, 2);
  return { regel, abstandProzent: abstand, text: abstand <= 0 ? "Ihr Angebot war in der Vorrunde das günstigste." : `Ihr bestes Angebot lag in der Vorrunde ${fmt(abstand)} % über dem besten Angebot.` };
}

// ---------------------------------------------------------------- Anonymisierung

/** Los-Kennzeichen aus der Ausschreibungs-ID (ohne Kundenbezug), z. B. „Los EA-7KQ2“ */
export function losKennzeichen(ausschreibungId) {
  const s = String(ausschreibungId || "").split("-").pop() || "";
  return `Los ${s.slice(0, 4).toUpperCase()}`;
}

const r10 = (x, schritt) => (Number.isFinite(x) ? Math.round(x / schritt) * schritt : null);

/**
 * Anonymisiertes Profil eines Loses (ein Kunde oder Pool) für Lieferanten.
 * Eingabe: Kundenprofile [{reihe, kennzahlen, land, spannungsebene, messart, abnahmestellen}]
 * Ausgabe NUR: Summen/gerundete Kennzahlen, normiertes Wochenprofil (Anteile, 7×24), Monatsanteile, Anzahl Stellen,
 * Länder, Spannungsebenen/Messarten (Häufigkeit). Keine Namen, Orte, PLZ, IDs, keine Rohzeitreihe.
 */
export function profilAnonymisieren(kunden = [], { ortszeitFn } = {}) {
  const summe = { kwh: 0, spitze: 0 };
  const woche = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const wocheN = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const monate = new Array(12).fill(0);
  let stellen = 0;
  const laender = {};
  const ebenen = {};
  const messarten = {};
  let gesamtSpitze = 0;
  let peakKwh = 0;
  // Pool-Spitze aus der Summenreihe (gleichzeitige Last), nicht Summe der Einzelspitzen
  const n = Math.max(0, ...kunden.map((k) => k.reihe?.werte?.length || 0));
  const summenReihe = new Float64Array(n);
  const start = kunden[0]?.reihe?.startMs ?? 0;
  for (const k of kunden) {
    const w = k.reihe?.werte || [];
    for (let i = 0; i < w.length; i++) summenReihe[i] += w[i];
    stellen += Math.max(1, k.abnahmestellen || 1);
    if (k.land) laender[k.land] = (laender[k.land] || 0) + 1;
    if (k.spannungsebene) ebenen[k.spannungsebene] = (ebenen[k.spannungsebene] || 0) + 1;
    if (k.messart) messarten[k.messart] = (messarten[k.messart] || 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    const x = summenReihe[i];
    summe.kwh += x;
    gesamtSpitze = Math.max(gesamtSpitze, x);
    if (ortszeitFn) {
      const o = ortszeitFn(start + i * 3600000);
      woche[o.wochentag][o.stunde] += x;
      wocheN[o.wochentag][o.stunde]++;
      monate[o.monat] += x;
      if (o.wochentag < 5 && o.stunde >= 8 && o.stunde < 20) peakKwh += x;
    }
  }
  const mw = woche.map((r, t) => r.map((s, h) => (wocheN[t][h] ? s / wocheN[t][h] : 0)));
  const mwMittel = mittel(mw.flat()) || 1;
  const jahresMwh = summe.kwh / 1000;
  return {
    anzahlKunden: kunden.length > 1 ? `${kunden.length} Kunden (Pool)` : "1 Kunde",
    abnahmestellen: stellen,
    jahresMengeMwh: r10(jahresMwh, jahresMwh >= 1000 ? 50 : 10),
    spitzeKw: r10(gesamtSpitze, 10),
    benutzungsstunden: gesamtSpitze > 0 ? r10(summe.kwh / gesamtSpitze, 50) : null,
    peakAnteilProzent: summe.kwh ? Math.round((peakKwh / summe.kwh) * 100) : null,
    wochenprofil: mw.map((r) => r.map((x) => rund(x / mwMittel, 2))), // Faktor zum Mittel, ohne Absolutwerte
    monatsanteileProzent: monate.map((m) => (summe.kwh ? rund((m / summe.kwh) * 100, 1) : 0)),
    laender,
    spannungsebenen: ebenen,
    messarten,
  };
}

/** Felder, die in einer Lieferanten-Antwort NIE vorkommen dürfen (Prüfung in Tests und Ausgabe) */
export const VERBOTENE_LIEFERANTEN_FELDER = ["kundeId", "kundenIds", "nutzerId", "firma", "maloId", "meloId", "zaehlpunkt", "plz", "ort", "email", "kundenname", "abnahmestelleId"];

export { Ungueltig as AusschreibungUngueltig };
