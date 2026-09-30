// src/lib/plattform/buchhaltung/op.js
//
// Offene-Posten-Liste, Storno-/Korrekturbeleg und Nummernkreise – reine Funktionen.
// Python-Gegenstück: plattform/buchhaltung_kern.py

import { rund2, tageZwischen, istDatum } from "../finanzen/basis.js";
import { gezahlt, mahnkosten, offenerBetrag } from "./mahnwesen.js";

export const ALTERSKLASSEN = [
  { id: "nicht_faellig", label: "nicht fällig", bis: 0 },
  { id: "t1_30", label: "1–30 Tage", bis: 30 },
  { id: "t31_60", label: "31–60 Tage", bis: 60 },
  { id: "t61_90", label: "61–90 Tage", bis: 90 },
  { id: "t90", label: "über 90 Tage", bis: Infinity },
];

export function altersklasse(tage) {
  if (!(tage > 0)) return ALTERSKLASSEN[0];
  return ALTERSKLASSEN.find((k) => tage <= k.bis) || ALTERSKLASSEN[ALTERSKLASSEN.length - 1];
}

/**
 * OP-Liste aus Belegen (Forderungen = Rechnungen offen; Verbindlichkeiten = Gutschriften offen/angewiesen).
 * Rückgabe { posten[], summen: { forderungen, verbindlichkeiten, ueberfaellig, jeKlasse{} } }
 */
export function opListe(belege, heute, { art = "", richtung = "" } = {}) {
  const posten = [];
  for (const b of belege) {
    const forderung = b.beleg === "rechnung";
    if (forderung ? b.status !== "offen" : !["offen", "angewiesen"].includes(b.status)) continue;
    if (art && b.art !== art) continue;
    if (richtung && (richtung === "forderung") !== forderung) continue;
    const offen = forderung ? offenerBetrag(b) : rund2(b.brutto);
    if (offen <= 0) continue;
    const tage = istDatum(b.faelligAm) ? tageZwischen(b.faelligAm, heute) : 0;
    const kl = altersklasse(tage);
    const stufe = Math.max(0, ...(b.mahnungen || []).filter((m) => !m.storniert).map((m) => Number(m.stufe) || 0));
    posten.push({
      id: b.id, nummer: b.nummer, art: b.art, beleg: b.beleg, richtung: forderung ? "forderung" : "verbindlichkeit",
      empfaenger: b.partei?.name || b.empfaenger || "", gesellschaftId: b.gesellschaftId || null, gesellschaft: b.aussteller?.name || b.gesellschaft || "",
      rechnungsdatum: b.rechnungsdatum, faelligAm: b.faelligAm, tageUeberfaellig: Math.max(0, tage), altersklasse: kl.id, altersklasseLabel: kl.label,
      brutto: rund2(b.brutto), gezahlt: gezahlt(b), offen, mahnstufe: stufe, mahnkosten: mahnkosten(b), status: b.status,
    });
  }
  posten.sort((a, b) => b.tageUeberfaellig - a.tageUeberfaellig || String(a.faelligAm).localeCompare(String(b.faelligAm)));
  const jeKlasse = Object.fromEntries(ALTERSKLASSEN.map((k) => [k.id, 0]));
  for (const p of posten.filter((x) => x.richtung === "forderung")) jeKlasse[p.altersklasse] = rund2(jeKlasse[p.altersklasse] + p.offen);
  return {
    posten,
    summen: {
      forderungen: rund2(posten.filter((p) => p.richtung === "forderung").reduce((s, p) => s + p.offen, 0)),
      verbindlichkeiten: rund2(posten.filter((p) => p.richtung === "verbindlichkeit").reduce((s, p) => s + p.offen, 0)),
      ueberfaellig: rund2(posten.filter((p) => p.richtung === "forderung" && p.tageUeberfaellig > 0).reduce((s, p) => s + p.offen, 0)),
      mahnkosten: rund2(posten.reduce((s, p) => s + p.mahnkosten, 0)),
      jeKlasse,
    },
  };
}

// ------------------------------------------------------------------ Storno

export const STORNO_KREIS = "ST";
export const MAHN_KREIS = "MA";

/**
 * Stornobeleg (Rechnungskorrektur/Stornorechnung bzw. Storno-Gutschrift) zu einem Ursprungsbeleg: eigene
 * fortlaufende Nummer, Verweis auf Nummer und Datum des Ursprungs (§ 14 Abs. 4 UStG / § 11 UStG 1994 sinngemäß),
 * Positionen und Steuer mit umgekehrtem Vorzeichen.
 */
export function stornoBeleg(b, { nummer, datum, grund }) {
  const neg = (x) => rund2(-Number(x || 0));
  const gutschrift = b.beleg === "gutschrift";
  return {
    nummer,
    ursprungId: b.id,
    ursprungNummer: b.nummer,
    ursprungDatum: b.rechnungsdatum,
    ursprung: b.beleg,
    art: b.art,
    titel: gutschrift ? "Storno-Gutschrift" : "Stornorechnung (Rechnungskorrektur)",
    datum,
    grund,
    partei: b.partei,
    aussteller: b.aussteller,
    gesellschaftId: b.gesellschaftId || null,
    zeitraum: b.zeitraum,
    positionen: (b.positionen || []).map((p) => ({ ...p, preis: neg(p.preis), betrag: neg(p.betrag) })),
    netto: neg(b.netto),
    steuer: { ...(b.steuer || {}), betrag: neg(b.steuer?.betrag) },
    brutto: neg(b.brutto),
    bereitsGezahlt: b.status === "bezahlt" ? rund2(b.brutto) : gezahlt(b),
    text: `${gutschrift ? "Storno der Gutschrift" : "Storno der Rechnung"} ${b.nummer} vom ${String(b.rechnungsdatum).split("-").reverse().join(".")}. Grund: ${grund}`,
  };
}

/** Ob ein Beleg storniert werden darf – { ok, grund } */
export function stornoErlaubt(b) {
  if (!b) return { ok: false, grund: "Beleg nicht gefunden." };
  if (b.status === "storniert") return { ok: false, grund: "Der Beleg ist bereits storniert." };
  if (b.status === "angewiesen") return { ok: false, grund: "Die Gutschrift ist zur Zahlung angewiesen – zuerst den Zahlungslauf verwerfen bzw. den Beleg zurücksetzen." };
  return { ok: true, grund: "" };
}

/** Nummernkreise → Übersicht { kreis, label, jahr, letzte, naechste } */
export function nummernkreise(kreise, labels, jahr) {
  const aus = [];
  for (const [kreis, jahre] of Object.entries(kreise || {})) {
    for (const [j, n] of Object.entries(jahre || {})) {
      aus.push({ kreis, label: labels[kreis] || kreis, jahr: Number(j), letzte: n ? `${kreis}-${j}-${String(n).padStart(5, "0")}` : "–", anzahl: Number(n) || 0, naechste: `${kreis}-${j}-${String((Number(n) || 0) + 1).padStart(5, "0")}` });
    }
  }
  for (const kreis of Object.keys(labels)) if (!aus.some((x) => x.kreis === kreis && x.jahr === jahr)) aus.push({ kreis, label: labels[kreis], jahr, letzte: "–", anzahl: 0, naechste: `${kreis}-${jahr}-00001` });
  return aus.sort((a, b) => b.jahr - a.jahr || a.kreis.localeCompare(b.kreis));
}

/** Lücken in einer Nummernfolge (Prüfhinweis: fortlaufende Nummerierung) */
export function nummernLuecken(nummern) {
  const je = {};
  for (const n of nummern) {
    const m = /^([A-Z]{2})-(\d{4})-(\d{5})$/.exec(String(n));
    if (m) (je[`${m[1]}-${m[2]}`] ||= []).push(Number(m[3]));
  }
  const aus = [];
  for (const [k, liste] of Object.entries(je)) {
    const s = new Set(liste);
    const max = Math.max(...liste);
    const fehlt = [];
    for (let i = 1; i <= max && fehlt.length < 20; i++) if (!s.has(i)) fehlt.push(`${k}-${String(i).padStart(5, "0")}`);
    if (fehlt.length) aus.push({ kreis: k, fehlt });
  }
  return aus;
}
