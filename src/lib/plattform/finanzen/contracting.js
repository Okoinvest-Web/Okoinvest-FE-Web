// src/lib/plattform/finanzen/contracting.js
//
// Contracting-Abrechnung je Anlage und Monat aus den Zählerstand-Monatswerten der ABRECHNUNGSRELEVANTEN (geeichten)
// Messpunkte – reine Funktionen. MQTT-/Monitoring-Werte werden nie abgerechnet.
//
// Gelieferter PV-Strom = Erzeugung (Erzeugungszähler, Register 2.8.0) − Einspeisung ins Netz (Zweirichtungszähler am
// Netzverknüpfungspunkt, Register 2.8.0). Ohne Erzeugungszähler, aber mit Verbrauchszähler: Verbrauch (1.8.0).
// Rechnung = geliefert × Arbeitspreis (ggf. indexiert) + Grundgebühr.
//
// Plausibilität (sonst KLÄRFALL statt Rechnung):
//   - Monatswert fehlt für einen abrechnungsrelevanten Messpunkt/Register
//   - Menge fehlt (kein Vormonatsstand – z. B. erster Monat oder Zählertausch)
//   - geliefert < 0 oder Erzeugung > 270 kWh je kWp im Monat (physikalisch unplausibel)

import { datumDe, jahrVon, monatVon, monatsZeitraum, rund, rund2, summe, zahlDe } from "./basis.js";
import { indexiertePacht } from "./indexierung.js";

const REIHE_LAND = { DE: "VPI-DE-2020", AT: "VPI-AT-2020", CH: "LIK-CH-2020" };

export const MAX_KWH_JE_KWP_MONAT = 270;

/**
 * Arbeitspreis in ct/kWh nach der Preisgleitung des Vertrags (`indexBasis`, Anlagen-Modul):
 *   fest        kein Gleitung
 *   prozent     + indexierungPct % p. a. je volles Vertragsjahr
 *   vpi         wie die Pacht-Wertsicherung: jährlich zum 1.1. mit dem VPI-Jahresdurchschnitt des Vorjahres (Basis: Jahr vor Beginn)
 *   strompreis  Strompreisindex – nicht hinterlegt → `fehlt` (Klärfall statt falscher Rechnung)
 * Ohne indexBasis gilt „prozent“, wenn indexierungPct > 0, sonst „fest“.
 */
export function arbeitspreis(vertrag, monat, { indexTabelle = [], land = "DE" } = {}) {
  const basis = Number(vertrag.strompreisCt) || 0;
  const pct = Number(vertrag.indexierungPct) || 0;
  const art = vertrag.indexBasis || (pct ? "prozent" : "fest");
  const [j, m] = String(monat).split("-").map(Number);
  if (art === "fest" || !vertrag.beginn) return { ct: rund(basis, 3), jahre: 0, art };
  if (art === "strompreis") return { ct: rund(basis, 3), jahre: 0, art, fehlt: "Preisgleitung nach Strompreisindex vereinbart – Indexwerte sind nicht hinterlegt. Arbeitspreis bitte manuell festlegen." };
  if (art === "vpi") {
    const reihe = REIHE_LAND[land] || "VPI-AT-2020";
    const r = indexiertePacht({ basisBetrag: basis * 1000, basisJahr: jahrVon(vertrag.beginn) - 1, reihe, tabelle: indexTabelle }, j);
    return { ct: rund(r.betrag / 1000, 3), jahre: 0, art, reihe, fehlt: r.fehlt?.length ? `Indexwert fehlt (${reihe}, ${r.fehlt.join(", ")}) – bitte unter „Index (VPI)“ nachtragen.` : null };
  }
  let jahre = j - jahrVon(vertrag.beginn);
  if (m < monatVon(vertrag.beginn)) jahre -= 1;
  jahre = Math.max(0, jahre);
  return { ct: rund(basis * (1 + pct / 100) ** jahre, 3), jahre, art };
}

/**
 * Abrechnung eines Monats.
 * eingabe: { vertrag {strompreisCt, grundgebuehrMonat, indexierungPct, beginn, status}, anlage {id, name, kwp}, monat "JJJJ-MM",
 *            messpunkte [{id, art, abrechnungsrelevant, zaehlernummer, bezeichnung}], zeilen [Monatswerte: {monat, messpunktId, register, stand, menge, geprueft, quelle}] }
 * Rückgabe { ok, klaerung[], positionen[], netto, gelieferteKwh, zaehlerstaende[], hinweise[] }
 */
export function contractingAbrechnen({ vertrag, anlage, monat, messpunkte = [], zeilen = [], indexTabelle = [] }) {
  const klaerung = [];
  const hinweise = [];
  const zaehlerstaende = [];
  if (!vertrag) return { ok: false, klaerung: ["Kein Contracting-Vertrag hinterlegt."], positionen: [], netto: 0 };
  const relevant = messpunkte.filter((m) => m.abrechnungsrelevant);
  const preis = arbeitspreis(vertrag, monat, { indexTabelle, land: anlage?.land });
  const mitArbeit = preis.ct > 0;
  if (mitArbeit && preis.fehlt) klaerung.push(preis.fehlt);
  if (Number(vertrag.mindestabnahmeKwhJahr) > 0) hinweise.push(`Mindestabnahme ${zahlDe(vertrag.mindestabnahmeKwhJahr)} kWh/Jahr vereinbart – ein Ausgleich (Take-or-Pay) erfolgt in der Jahresabrechnung, nicht monatlich.`);
  const wert = (mp, reg) => zeilen.find((z) => z.monat === monat && z.messpunktId === mp.id && z.register === reg);
  const menge = (art, reg) => {
    let s = 0;
    let gefunden = false;
    for (const mp of relevant.filter((m) => m.art === art)) {
      const w = wert(mp, reg);
      if (!w) {
        klaerung.push(`Monatswert ${monat} fehlt: Zähler ${mp.zaehlernummer} (${mp.bezeichnung || art}), Register ${reg}.`);
        continue;
      }
      if (w.menge === null || w.menge === undefined) {
        klaerung.push(`Menge ${monat} nicht berechenbar (Vormonatsstand fehlt): Zähler ${mp.zaehlernummer}, Register ${reg}.`);
        continue;
      }
      gefunden = true;
      if (!w.geprueft) hinweise.push(`Zählerstand ${mp.zaehlernummer}/${reg} noch nicht als geprüft markiert (${w.quelle || "Quelle unbekannt"}).`);
      zaehlerstaende.push({ zaehlernummer: mp.zaehlernummer, bezeichnung: mp.bezeichnung || "", register: reg, anfang: rund(Number(w.stand) - Number(w.menge), 3), ende: Number(w.stand), menge: Number(w.menge) });
      s += Number(w.menge);
    }
    return gefunden ? s : null;
  };

  let gelieferteKwh = 0;
  if (mitArbeit) {
    const hatErz = relevant.some((m) => m.art === "erzeugung");
    const hatVerbrauch = relevant.some((m) => m.art === "verbrauch");
    if (hatErz) {
      const erz = menge("erzeugung", "2.8.0");
      const einsp = relevant.some((m) => m.art === "zweirichtung") ? menge("zweirichtung", "2.8.0") : 0;
      if (erz !== null && einsp !== null) {
        gelieferteKwh = Math.round(erz - einsp);
        if (gelieferteKwh < 0) klaerung.push(`Einspeisung (${zahlDe(einsp)} kWh) größer als Erzeugung (${zahlDe(erz)} kWh) – Zählerzuordnung prüfen.`);
        if (Number(anlage?.kwp) > 0 && erz > Number(anlage.kwp) * MAX_KWH_JE_KWP_MONAT) klaerung.push(`Erzeugung ${zahlDe(erz)} kWh unplausibel hoch für ${zahlDe(anlage.kwp)} kWp (> ${MAX_KWH_JE_KWP_MONAT} kWh/kWp im Monat).`);
      }
    } else if (hatVerbrauch) {
      const v = menge("verbrauch", "1.8.0");
      if (v !== null) gelieferteKwh = Math.round(v);
    } else {
      klaerung.push("Kein abrechnungsrelevanter Erzeugungs- oder Verbrauchszähler – Arbeitspreis kann nicht abgerechnet werden.");
    }
  }
  if (klaerung.length) return { ok: false, klaerung, positionen: [], netto: 0, gelieferteKwh: null, zaehlerstaende, hinweise };

  const z = monatsZeitraum(monat);
  const positionen = [];
  if (mitArbeit) {
    positionen.push({
      art: "arbeit", artikel: "CONTRACTING-STROM",
      text: `PV-Strom ${datumDe(z.von)} – ${datumDe(z.bis)}: ${zahlDe(gelieferteKwh)} kWh × ${zahlDe(preis.ct, 3)} ct/kWh${preis.jahre ? ` (indexiert, ${preis.jahre}. Vertragsjahr +${zahlDe(vertrag.indexierungPct, 2)} % p. a.)` : preis.art === "vpi" && preis.ct !== rund(vertrag.strompreisCt, 3) ? ` (wertgesichert nach ${preis.reihe}, Ausgangspreis ${zahlDe(vertrag.strompreisCt, 3)} ct)` : ""}`,
      menge: gelieferteKwh, einheit: "kWh", preis: rund(preis.ct / 100, 5), betrag: rund2((gelieferteKwh * preis.ct) / 100),
    });
  }
  if (Number(vertrag.grundgebuehrMonat) > 0) {
    positionen.push({ art: "grund", artikel: "CONTRACTING-GRUND", text: `Grundgebühr ${monat.slice(5)}/${monat.slice(0, 4)}`, menge: 1, einheit: "Monat", preis: rund2(vertrag.grundgebuehrMonat), betrag: rund2(vertrag.grundgebuehrMonat) });
  }
  if (!positionen.length) return { ok: false, klaerung: ["Weder Arbeitspreis noch Grundgebühr vereinbart – nichts abzurechnen."], positionen: [], netto: 0, zaehlerstaende, hinweise };
  return { ok: true, klaerung: [], positionen, netto: summe(positionen, "betrag"), gelieferteKwh: mitArbeit ? gelieferteKwh : null, arbeitspreisCt: preis.ct, zaehlerstaende, hinweise };
}
