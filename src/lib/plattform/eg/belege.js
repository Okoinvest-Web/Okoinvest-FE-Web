// src/lib/plattform/eg/belege.js
//
// Belege der Energiegemeinschaft (WP4): Typen, Zustände, Nummernkreise (fortlaufend je Gemeinschaft und Jahr, lückenlos),
// Pflichtangaben nach UStG und ElWG, Storno, Prüfsumme und Mitgliedssicht. Reine Funktionen; Python-Spiegel:
// plattform/eg_abrechnung_kern.py.
//
// Pflichtangaben: § 11 Abs. 1 Z 3 UStG 1994 (Rechnung; Kleinbetragsrechnung bis 400 € brutto § 11 Abs. 6; UID des
// Empfängers über 10.000 € brutto), § 11 Abs. 7–8 (Gutschrift, Bezeichnung „Gutschrift“), § 11 Abs. 1a (Reverse Charge:
// UID beider Seiten, Hinweis), ElWG § 69 Abs. 1 Z 4–6 und Abs. 3 bei Lieferantenpflichten (Rechnungsbetrag, Fälligkeit,
// Energiewerte, Vertragspartner mit Kontaktadresse, Zählpunktbezeichnungen, Erläuterung auf Verlangen, mind. jährlich).

import { rund2 } from "../mitglied/basis.js";
import { nummernLuecken } from "../buchhaltung/op.js";

/** Ordnung nach Codepunkten (gleiches Ergebnis in JS und Python) */
const vgl = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const BELEG_TYPEN = {
  rechnung: { label: "Rechnung", kreis: "RE", titel: "Rechnung Gemeinschaftsstrom" },
  gutschrift: { label: "Gutschrift", kreis: "GU", titel: "Gutschrift Einspeisung in die Gemeinschaft" },
  storno: { label: "Stornobeleg", kreis: "ST", titel: "Stornobeleg" },
  schlussrechnung: { label: "Schlussrechnung", kreis: "RE", titel: "Schlussrechnung" },
};
export const BELEG_STATUS = {
  entwurf: { label: "Entwurf", ton: "neutral" },
  final: { label: "Freigegeben", ton: "info" },
  versendet: { label: "Versendet", ton: "info" },
  teilbezahlt: { label: "Teilbezahlt", ton: "warn" },
  bezahlt: { label: "Bezahlt", ton: "ok" },
  gemahnt: { label: "Gemahnt", ton: "warn" },
  storniert: { label: "Storniert", ton: "neutral" },
};
export const BELEG_OFFEN = ["final", "versendet", "teilbezahlt", "gemahnt"];
export const KLEINBETRAG_BRUTTO = 400; // § 11 Abs. 6 UStG 1994
export const UID_EMPFAENGER_AB = 10000; // § 11 Abs. 1 Z 3 lit. i UStG 1994

/** Nächste Nummer im Kreis (Zähler { "RE-2026": 12 } → „RE-2026-00013“) – ohne Seiteneffekt */
export function naechsteNummer(zaehler = {}, typ, jahr) {
  const kreis = (BELEG_TYPEN[typ] || BELEG_TYPEN.rechnung).kreis;
  const schluessel = `${kreis}-${jahr}`;
  const n = (Number(zaehler[schluessel]) || 0) + 1;
  return { nummer: `${schluessel}-${String(n).padStart(5, "0")}`, schluessel, n };
}

/** Nummern für alle Entwürfe einer Freigabe vergeben (Reihenfolge: Mitgliedsnummer, Rechnungen vor Gutschriften) */
export function nummernVergeben(belege, zaehler = {}, jahr) {
  const z = { ...zaehler };
  const sortiert = [...belege].sort((a, b) => (a.typ === b.typ ? 0 : a.typ === "rechnung" ? -1 : 1) || (a.mitgliedsnummer || 0) - (b.mitgliedsnummer || 0) || vgl(String(a.mitgliedId), String(b.mitgliedId)));
  const nummern = {};
  for (const b of sortiert) {
    const x = naechsteNummer(z, b.typ, jahr);
    z[x.schluessel] = x.n;
    nummern[b.id] = x.nummer;
  }
  return { nummern, zaehler: z };
}

/** Lücken je Kreis (Prüfhinweis für Rechnungsprüfung) */
export const belegLuecken = (belege = []) => nummernLuecken(belege.map((b) => b.nummer).filter(Boolean));

/**
 * Pflichtangaben prüfen. Rückgabe [{feld, text, quelle, stufe: "fehler"|"warnung"}] – leer = vollständig.
 * @param {object} b Beleg (Entwurf oder final)
 */
export function pflichtangabenPruefen(b, { lieferantenpflichten = false } = {}) {
  const f = [];
  const fehlt = (feld, text, quelle, stufe = "fehler") => f.push({ feld, text, quelle, stufe });
  const brutto = Math.abs(Number(b.summen?.brutto) || 0);
  const klein = brutto <= KLEINBETRAG_BRUTTO;
  const a = b.aussteller || {};
  const e = b.empfaenger || {};
  if (!a.name || !a.strasse || !a.plz || !a.ort) fehlt("aussteller", "Name und Anschrift der Gemeinschaft", "§ 11 Abs. 1 Z 3 lit. a UStG");
  if (!klein && (!e.name || !e.strasse || !e.plz || !e.ort)) fehlt("empfaenger", "Name und Anschrift des Mitglieds", "§ 11 Abs. 1 Z 3 lit. b UStG");
  if (!b.von || !b.bis) fehlt("zeitraum", "Leistungszeitraum", "§ 11 Abs. 1 Z 3 lit. d UStG");
  if (!(b.positionen || []).length) fehlt("positionen", "Menge und Art der Lieferung", "§ 11 Abs. 1 Z 3 lit. c UStG");
  if (!b.nummer && b.status !== "entwurf") fehlt("nummer", "fortlaufende Belegnummer", "§ 11 Abs. 1 Z 3 lit. h UStG");
  if (!b.datum && b.status !== "entwurf") fehlt("datum", "Ausstellungsdatum", "§ 11 Abs. 1 Z 3 lit. g UStG");
  const ustArten = new Set((b.summen?.zeilen || []).map((z) => z.art));
  if (ustArten.has("ust") && !a.uid && !klein) fehlt("aussteller.uid", "UID der Gemeinschaft (regelbesteuert)", "§ 11 Abs. 1 Z 3 lit. j UStG");
  if (brutto > UID_EMPFAENGER_AB && b.typ === "rechnung" && !e.uid && e.unternehmer) fehlt("empfaenger.uid", "UID des Empfängers (über 10.000 € brutto)", "§ 11 Abs. 1 Z 3 lit. i UStG", "warnung");
  if ((ustArten.has("befreit") || ustArten.has("rc")) && !(b.summen?.hinweise || []).length) fehlt("hinweis", "Hinweis auf Steuerbefreiung bzw. Übergang der Steuerschuld", "§ 11 Abs. 1a UStG");
  if (b.typ === "gutschrift") {
    if (!b.gutschriftZustimmung) fehlt("gutschriftverfahren", "Vereinbarung des Gutschriftverfahrens mit dem Erzeuger (sonst muss der Erzeuger selbst Rechnung legen)", "§ 11 Abs. 7 UStG");
    if (ustArten.has("rc")) {
      if (!e.uid) fehlt("empfaenger.uid", "UID des Erzeugers (Reverse Charge)", "§ 11 Abs. 1a UStG");
      if (!a.uid) fehlt("aussteller.uid", "UID der Gemeinschaft (Reverse Charge) (zu bestätigen)", "§ 11 Abs. 1a UStG", "warnung");
    }
  }
  if (lieferantenpflichten && b.typ === "rechnung") {
    if (!b.faelligAm) fehlt("faelligAm", "Fälligkeit", "ElWG § 69 Abs. 1 Z 4");
    if (!(b.zaehlpunkte || []).length) fehlt("zaehlpunkte", "Zählpunktbezeichnungen", "ElWG § 69 Abs. 1 Z 4");
    if (!a.email && !a.telefon) fehlt("aussteller.kontakt", "Kontaktadresse des Vertragspartners", "ElWG § 69 Abs. 1 Z 4");
    if (!b.energie) fehlt("energie", "Energiewerte", "ElWG § 69 Abs. 1 Z 4");
  }
  return f;
}

/** Stornobeleg zu einem finalen Beleg (eigene Nummer, Verweis, Beträge negativ) */
export function belegStornieren(b, { nummer, datum, grund }) {
  if (!b || !["final", "versendet", "teilbezahlt", "bezahlt", "gemahnt"].includes(b.status)) throw new Error("Nur freigegebene Belege können storniert werden.");
  if (!String(grund || "").trim()) throw new Error("Bitte einen Grund für das Storno angeben.");
  const neg = (x) => rund2(-Number(x || 0));
  return {
    ...b,
    id: undefined, typ: "storno", ursprungTyp: b.typ, nummer, datum, status: "final", stornoVon: b.id, stornoVonNummer: b.nummer, grund: String(grund).trim().slice(0, 300),
    positionen: (b.positionen || []).map((p) => ({ ...p, netto: neg(p.netto), menge: p.menge })),
    summen: { ...b.summen, zeilen: (b.summen?.zeilen || []).map((z) => ({ ...z, basis: neg(z.basis), betrag: neg(z.betrag), rcBetrag: neg(z.rcBetrag) })), netto: neg(b.summen?.netto), ust: neg(b.summen?.ust), brutto: neg(b.summen?.brutto), rcSteuer: neg(b.summen?.rcSteuer) },
    zahlungen: [], mahnungen: [],
    text: `Storno ${b.typ === "gutschrift" ? "der Gutschrift" : "der Rechnung"} ${b.nummer} vom ${String(b.datum || "").split("-").reverse().join(".")}. Grund: ${String(grund).trim()}`,
  };
}

/** Kanonischer Inhalt für die Prüfsumme (SHA-256 im Backend): Nummer, Datum, Empfänger, Positionen, Summen */
export function belegInhalt(b) {
  const pos = (b.positionen || []).map((p) => [p.art, p.zaehlpunkt || "", Number(p.menge || 0).toFixed(3), Number(p.preis || 0).toFixed(4), Number(p.netto || 0).toFixed(2), p.ust?.regel || ""].join("|"));
  return [b.gemeinschaftId, b.typ, b.nummer || "", b.datum || "", b.mitgliedId, b.von, b.bis, Number(b.summen?.netto || 0).toFixed(2), Number(b.summen?.ust || 0).toFixed(2), Number(b.summen?.brutto || 0).toFixed(2), ...pos].join("\n");
}

/** Offener Betrag (Rechnung: brutto − Zahlungen; Gutschrift: auszuzahlen) */
export const belegGezahlt = (b) => rund2((b.zahlungen || []).reduce((s, z) => s + (Number(z.betrag) || 0), 0));
export const belegOffen = (b) => (BELEG_OFFEN.includes(b.status) ? Math.max(0, rund2(Math.abs(Number(b.summen?.brutto) || 0) - belegGezahlt(b))) : 0);

/** Zahlungsstatus nach einer Zahlung */
export function statusNachZahlung(b) {
  if (b.status === "storniert") return "storniert";
  const offen = rund2(Math.abs(Number(b.summen?.brutto) || 0) - belegGezahlt(b));
  if (offen <= 0) return "bezahlt";
  return belegGezahlt(b) > 0 ? "teilbezahlt" : b.status;
}

/** Sicht des Mitglieds (WP6): keine internen Prüfpfade, IBAN maskiert */
export function belegFuerMitglied(b) {
  const intern = ["pruefpfadIntern", "fehler", "warnungen"];
  const rest = Object.fromEntries(Object.entries(b).filter(([k]) => !intern.includes(k)));
  return { ...rest, positionen: (b.positionen || []).map((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== "pruefpfad"))) };
}
