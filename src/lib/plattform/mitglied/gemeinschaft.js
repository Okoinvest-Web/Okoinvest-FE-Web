// src/lib/plattform/mitglied/gemeinschaft.js
//
// Energiegemeinschaften: AT Erneuerbare-Energie-Gemeinschaft (lokal/regional) und Bürgerenergiegemeinschaft (ElWG/EAG),
// DE Energy Sharing (§ 42c EnWG), CH lokale Elektrizitätsgemeinschaft LEG (StromVG/StromVV) bzw. (v)ZEV.
// Stammdaten der Gemeinschaft (Backoffice), Teilnahme eines Mitglieds (Zählpunkt aus fach/energie.js),
// Verteilschlüssel (dynamisch/statisch) und monatliche Abrechnung bzw. Gutschrift je Teilnehmer.
// Reine Funktionen; Frappe: plattform/mitglied_kern.py (1:1). Preise netto in ct/kWh (CH: Rp./kWh).
//
// Vereinfachung: Die Viertelstunden-Zuordnung übernimmt in AT der Netzbetreiber (EDA), in DE/CH der Messstellenbetreiber.
// Der Monatslauf verteilt Monatssummen – ohne echte Messwerte ist das Ergebnis eine Schätzung (so gekennzeichnet).

import { ALLGEMEIN, GEMEINSCHAFTEN } from "../../invest/markt.js";
import { EG_FORMEN } from "../fach/energie.js";
import { auswahl, datum, fehler, konfliktFehler, mehrzeilig, monat, rund2, text, zahl } from "./basis.js";

export { EG_FORMEN };
export const GEMEINSCHAFT_STATUS = { aufbau: { label: "In Gründung", ton: "warn" }, aktiv: { label: "Aktiv", ton: "ok" }, geschlossen: { label: "Keine neuen Teilnehmer", ton: "neutral" } };
export const TEILNAHME_STATUS = {
  beantragt: { label: "Beitritt beantragt", ton: "info" },
  angemeldet: { label: "Beim Netzbetreiber angemeldet", ton: "warn" },
  aktiv: { label: "Aktiv – Strom wird geteilt", ton: "ok" },
  beendet: { label: "Beendet", ton: "neutral" },
  abgelehnt: { label: "Nicht aufgenommen", ton: "neutral" },
};
export const VERTEILSCHLUESSEL = {
  dynamisch: { label: "Dynamisch", text: "Der geteilte Strom wird je Viertelstunde im Verhältnis zum Verbrauch der Teilnehmer aufgeteilt; nicht benötigte Mengen gehen an die anderen Teilnehmer." },
  statisch: { label: "Statisch", text: "Jeder Teilnehmer erhält einen festen Prozentanteil an der Erzeugung (höchstens seinen Verbrauch); nicht genutzte Mengen werden ins Netz eingespeist." },
};
/** Netzentgelt-Rabatt je Form (Anteil am Netz-Arbeitspreis, markt.js GEMEINSCHAFTEN.rechner) */
export function rabattFuer(land, form) {
  const r = GEMEINSCHAFTEN.rechner[String(land || "DE").toLowerCase()];
  if (!r) return { anteil: 0, label: "" };
  const id = land === "AT" ? (form === "eeg_lokal" ? "lokal" : form === "eeg_regional" ? "regional" : "beg") : land === "CH" ? (form === "leg" ? "leg40" : null) : "keiner";
  const x = r.rabatte.find((y) => y.id === id);
  return x ? { anteil: x.anteil, label: `${x.label} (${x.sub})` } : { anteil: 0, label: "kein Netzentgeltvorteil" };
}
export const waehrung = (land) => (land === "CH" ? { w: "CHF", ct: "Rp." } : { w: "€", ct: "ct" });

export function gemeinschaftBereinigen(d = {}) {
  const land = auswahl(d.land, EG_FORMEN, "AT");
  const g = {
    name: text(d.name, 120),
    land,
    form: auswahl(d.form, EG_FORMEN[land], ""),
    status: auswahl(d.status, GEMEINSCHAFT_STATUS, "aufbau"),
    rechtsform: text(d.rechtsform, 80),
    netzbetreiber: text(d.netzbetreiber, 120),
    gebiet: text(d.gebiet, 200),
    plzListe: [...new Set(String(Array.isArray(d.plzListe) ? d.plzListe.join(",") : d.plzListe || "").split(/[\s,;]+/).map((x) => x.trim()).filter((x) => /^\d{4,5}$/.test(x)))].slice(0, 200),
    tarifBezugCt: zahl(d.tarifBezugCt, 0, 100, 2),
    tarifEinspeisungCt: zahl(d.tarifEinspeisungCt, 0, 100, 2),
    grundgebuehrMonat: zahl(d.grundgebuehrMonat, 0, 100, 2) ?? 0,
    verteilschluessel: auswahl(d.verteilschluessel, VERTEILSCHLUESSEL, "dynamisch"),
    gemeinschaftsId: text(d.gemeinschaftsId, 40),
    info: mehrzeilig(d.info, 2000),
  };
  if (!g.name) throw fehler("Bitte geben Sie den Namen der Gemeinschaft an.", "name");
  if (!g.form) throw fehler("Bitte wählen Sie die Form der Gemeinschaft.", "form");
  if (!g.netzbetreiber) throw fehler("Bitte geben Sie den Netzbetreiber an.", "netzbetreiber");
  if (g.tarifBezugCt === null || g.tarifEinspeisungCt === null) throw fehler("Bitte geben Sie die Preise für Bezug und Einspeisung innerhalb der Gemeinschaft an.", "tarifBezugCt");
  if (g.tarifEinspeisungCt > g.tarifBezugCt) throw fehler("Der Einspeisepreis liegt über dem Bezugspreis – die Gemeinschaft könnte ihre Kosten nicht decken.", "tarifEinspeisungCt");
  if (g.land === "AT" && g.form === "eeg_lokal" && !g.gebiet) throw fehler("Bei einer lokalen EEG bitte die Trafostation bzw. das Netzgebiet angeben.", "gebiet");
  return g;
}

/** Passt die gespeicherte Teilnahme (Stammdaten) zur Gemeinschaft? Liefert Liste der Hinderungsgründe */
export function teilnahmeHindernisse(stamm, eg) {
  const h = [];
  if (!stamm) return ["Bitte speichern Sie zuerst Ihre Teilnahmedaten (Zählpunkt bzw. Marktlokation)."];
  if (!eg) return ["Gemeinschaft nicht gefunden."];
  if (eg.status === "geschlossen") h.push("Die Gemeinschaft nimmt derzeit keine neuen Teilnehmer auf.");
  if (stamm.land !== eg.land) h.push("Ihre Abnahmestelle liegt in einem anderen Land als die Gemeinschaft.");
  if (eg.plzListe?.length && stamm.plz && !eg.plzListe.includes(String(stamm.plz))) h.push(`Ihre Postleitzahl ${stamm.plz} liegt nicht im Gebiet der Gemeinschaft (${eg.gebiet || eg.plzListe.join(", ")}).`);
  if (eg.land === "AT" && stamm.smartMeter === false) h.push("Für die Teilnahme ist ein Smart Meter mit Viertelstundenwerten nötig.");
  if (eg.land === "DE" && stamm.smartMeter === false) h.push("Energy Sharing setzt ein intelligentes Messsystem voraus.");
  return h;
}

export function egBeitrittBereinigen(d = {}, stamm, eg) {
  const h = teilnahmeHindernisse(stamm, eg);
  if (h.length) throw konfliktFehler(h[0]);
  if (d.bestaetigt !== true) throw fehler(eg.land === "AT" ? "Bitte bestätigen Sie Beitritt, Datenfreigabe der Viertelstundenwerte und Preisblatt der Gemeinschaft." : "Bitte bestätigen Sie Beitritt, Datenverarbeitung der Messwerte und Preisblatt der Gemeinschaft.", "bestaetigt");
  return { anteilPct: eg.verteilschluessel === "statisch" ? zahl(d.anteilPct, 0.1, 100, 1) : null };
}

/** Wirksames Ende einer Teilnahme: Monatsende nach Kündigung (vereinfacht, Satzung/Vertrag können Fristen vorsehen) */
export function teilnahmeEnde(heute) {
  const [j, m] = String(heute).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(j, m, 0, 12)).toISOString().slice(0, 10);
}

/**
 * Verteilung einer Erzeugungsmenge auf Verbraucher.
 * teilnehmer: [{ id, verbrauchKwh, anteilPct? }] · schluessel dynamisch|statisch → { [id]: kWh }, ueberschussKwh
 * dynamisch: proportional zum Verbrauch, gedeckelt auf den Verbrauch, Rest iterativ an die übrigen.
 * statisch: fester Anteil der Erzeugung, gedeckelt auf den Verbrauch, Rest wird eingespeist.
 */
export function verteilen(erzeugungKwh, teilnehmer = [], schluessel = "dynamisch") {
  const zu = Object.fromEntries(teilnehmer.map((t) => [t.id, 0]));
  let rest = Math.max(0, Number(erzeugungKwh) || 0);
  if (schluessel === "statisch") {
    for (const t of teilnehmer) {
      const soll = (Math.max(0, Number(t.anteilPct) || 0) / 100) * rest;
      zu[t.id] = Math.min(soll, Math.max(0, Number(t.verbrauchKwh) || 0));
    }
    const verteilt = Object.values(zu).reduce((s, x) => s + x, 0);
    rest = Math.max(0, rest - verteilt);
  } else {
    let offen = teilnehmer.filter((t) => Number(t.verbrauchKwh) > 0);
    for (let runde = 0; runde < 20 && rest > 1e-9 && offen.length; runde++) {
      const bedarf = offen.reduce((s, t) => s + (Number(t.verbrauchKwh) - zu[t.id]), 0);
      if (bedarf <= 1e-9) break;
      const menge = Math.min(rest, bedarf);
      for (const t of offen) zu[t.id] += (menge * (Number(t.verbrauchKwh) - zu[t.id])) / bedarf;
      rest -= menge;
      offen = offen.filter((t) => Number(t.verbrauchKwh) - zu[t.id] > 1e-9);
    }
  }
  for (const k of Object.keys(zu)) zu[k] = Math.round(zu[k] * 10) / 10;
  return { zuteilung: zu, ueberschussKwh: Math.round(rest * 10) / 10 };
}

/** Schätzwerte eines Monats aus den Stammdaten (Jahresverbrauch gleichmäßig, Erzeugung nach PV-Monatsprofil) */
export function schaetzung(stamm, mon) {
  const m = Number(String(mon).slice(5, 7)) - 1;
  const verbrauch = stamm?.rolle === "einspeisung" ? 0 : ((Number(stamm?.jahresverbrauchKwh) || 3500) / 12);
  const ertrag = stamm?.land === "AT" ? 1120 : stamm?.land === "CH" ? 1050 : 1000; // kWh/kWp (markt.js REGIONEN, gerundet)
  const erzeugung = stamm?.rolle === "bezug" ? 0 : (Number(stamm?.anlageKwp) || 0) * ertrag * (ALLGEMEIN.pvMonatsanteile[m] || 0) * 0.6; // ca. 60 % Überschuss ins Netz
  return { verbrauchKwh: Math.round(verbrauch), erzeugungKwh: Math.round(erzeugung) };
}

/**
 * Monatsabrechnung einer Gemeinschaft. teilnehmer: [{ id, nutzerId, name, stamm, anteilPct, messwerte? { verbrauchKwh, erzeugungKwh } }]
 * → { positionen[], summe }. Je Teilnehmer: Bezug aus der Gemeinschaft (Rechnung zum Gemeinschaftspreis), eingespeiste
 * und in der Gemeinschaft verbrauchte Menge (Gutschrift zum Einspeisepreis), Grundgebühr, Saldo und geschätzte Ersparnis
 * gegenüber dem Lieferanten (Energiepreis + Netz-Arbeitspreis × Rabatt + entfallende Abgaben − Gemeinschaftspreis).
 */
export function monatsabrechnung(eg, mon, teilnehmer = []) {
  if (!monat(mon)) throw fehler("Bitte wählen Sie den Abrechnungsmonat (JJJJ-MM).", "monat");
  const werte = teilnehmer.map((t) => {
    const m = t.messwerte && (t.messwerte.verbrauchKwh !== undefined || t.messwerte.erzeugungKwh !== undefined) ? t.messwerte : null;
    const s = m ? { verbrauchKwh: Math.max(0, Number(m.verbrauchKwh) || 0), erzeugungKwh: Math.max(0, Number(m.erzeugungKwh) || 0) } : schaetzung(t.stamm, mon);
    return { ...t, ...s, geschaetzt: !m };
  });
  const erzeugung = werte.reduce((s, t) => s + t.erzeugungKwh, 0);
  const { zuteilung, ueberschussKwh } = verteilen(erzeugung, werte.map((t) => ({ id: t.id, verbrauchKwh: t.verbrauchKwh, anteilPct: t.anteilPct })), eg.verteilschluessel);
  const geteilt = Object.values(zuteilung).reduce((s, x) => s + x, 0);
  const r = GEMEINSCHAFTEN.rechner[String(eg.land).toLowerCase()] || GEMEINSCHAFTEN.rechner.de;
  const rabatt = rabattFuer(eg.land, eg.form).anteil;
  const vorteilCt = r.energiepreis + r.netzAp * rabatt + r.abgabenCt - eg.tarifBezugCt; // je geteilter kWh gegenüber Lieferant
  const positionen = werte.map((t) => {
    const bezug = zuteilung[t.id] || 0;
    const eingespeistGeteilt = erzeugung > 0 ? Math.round(((geteilt * t.erzeugungKwh) / erzeugung) * 10) / 10 : 0;
    const bezugEur = rund2((bezug * eg.tarifBezugCt) / 100);
    const gutschriftEur = rund2((eingespeistGeteilt * eg.tarifEinspeisungCt) / 100);
    const grundEur = rund2(eg.grundgebuehrMonat || 0);
    return {
      teilnahmeId: t.id, nutzerId: t.nutzerId || null, name: t.name || "", verbrauchKwh: t.verbrauchKwh, erzeugungKwh: t.erzeugungKwh,
      bezugGemeinschaftKwh: bezug, einspeisungGemeinschaftKwh: eingespeistGeteilt, deckungPct: t.verbrauchKwh ? Math.round((bezug / t.verbrauchKwh) * 1000) / 10 : 0,
      bezugEur, gutschriftEur, grundgebuehrEur: grundEur, saldoEur: rund2(gutschriftEur - bezugEur - grundEur),
      ersparnisEur: rund2((bezug * vorteilCt) / 100 + (eingespeistGeteilt * (eg.tarifEinspeisungCt - r.ueberschussCt)) / 100),
      geschaetzt: t.geschaetzt,
    };
  });
  const summe = positionen.reduce((s, p) => ({ bezugEur: rund2(s.bezugEur + p.bezugEur), gutschriftEur: rund2(s.gutschriftEur + p.gutschriftEur), grundgebuehrEur: rund2(s.grundgebuehrEur + p.grundgebuehrEur) }), { bezugEur: 0, gutschriftEur: 0, grundgebuehrEur: 0 });
  return { monat: mon, erzeugungKwh: Math.round(erzeugung), geteiltKwh: Math.round(geteilt), ueberschussKwh, rabattAnteil: rabatt, positionen, summe, geschaetzt: positionen.some((p) => p.geschaetzt) };
}

export function messwerteBereinigen(d = {}) {
  const out = {};
  if (!d || typeof d !== "object") return out;
  for (const [id, w] of Object.entries(d).slice(0, 500)) {
    if (!/^[A-Z]{1,3}-[0-9A-Z-]{4,40}$/.test(id) || !w || typeof w !== "object") continue;
    const v = zahl(w.verbrauchKwh, 0, 1e7, 1);
    const e = zahl(w.erzeugungKwh, 0, 1e7, 1);
    if (v === null && e === null) continue;
    out[id] = { verbrauchKwh: v ?? 0, erzeugungKwh: e ?? 0 };
  }
  return out;
}

export const aktivAb = (d = {}, heute) => {
  const ab = datum(d.ab) || heute;
  return ab;
};
