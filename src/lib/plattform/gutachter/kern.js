// src/lib/plattform/gutachter/kern.js
//
// Gutachter-/Planeraufträge der Projektentwicklung – reine Logik (client- und serverseitig, ohne Node-Importe, ohne „@/“,
// damit auch scripts/*.mjs sie direkt laden). Spiegel in Python: Backend-Import/…/plattform/gutachter_kern.py (gleiche Regeln,
// Abgleich über tests/test_gutachter_bank_kern.py).
//
// Ablauf (Zustandsautomat AUFTRAG_UEBERGAENGE):
//   angefragt ──Angebot (Gutachter)──▶ angebot ──Annahme (Projektleitung)──▶ beauftragt ──Bestätigung (Gutachter)──▶ in_arbeit
//   in_arbeit ──Lieferung──▶ in_pruefung ──Mängel──▶ nachbesserung ──Lieferung──▶ in_pruefung ──Freigabe──▶ in_arbeit | abnahmebereit
//   abnahmebereit ──Abnahme──▶ abgenommen ──Schlussrechnung──▶ abgerechnet ──Zahlung vollständig──▶ abgeschlossen
//   Nebenwege: angefragt → abgelehnt (Gutachter lehnt ab) · angefragt|angebot → nicht_beauftragt (anderes Angebot angenommen
//   bzw. Angebot abgelehnt) · alles vor „abgenommen“ → storniert (Projektleitung, mit Begründung)
//
// Honorar: pauschal oder nach Stunden (Stundensatz × geschätzte Stunden), Nebenkosten in % des Honorars, Umsatzsteuer je Land
// (DE 19 %, AT 20 %, CH 8,1 %; 0 % bei Reverse Charge bzw. Kleinunternehmerregelung – Hinweis auf der Rechnung Pflicht).
// Rechnungen: Abschlag nur bis zum vereinbarten Abschlagsanteil, Summe aller Rechnungen nie über der Auftragssumme,
// Schlussrechnung erst nach Abnahme. Pflichtangaben (DE § 14 Abs. 4 UStG, AT § 11 UStG, CH Art. 26 MWSTG) werden abgefragt:
// Rechnungsnummer, Rechnungsdatum, Leistungszeitraum; die vollständige Prüfung bleibt bei der Buchhaltung.

export const AUFTRAG_STATUS = {
  angefragt: { label: "Angebot angefragt", ton: "info", schritt: 0 },
  angebot: { label: "Angebot abgegeben", ton: "info", schritt: 0 },
  beauftragt: { label: "Beauftragt – Bestätigung offen", ton: "warn", schritt: 1 },
  in_arbeit: { label: "In Bearbeitung", ton: "info", schritt: 2 },
  in_pruefung: { label: "Lieferung in Prüfung", ton: "info", schritt: 3 },
  nachbesserung: { label: "Nachbesserung erforderlich", ton: "warn", schritt: 3 },
  abnahmebereit: { label: "Endfassung freigegeben – Abnahme offen", ton: "ok", schritt: 4 },
  abgenommen: { label: "Abgenommen", ton: "ok", schritt: 5 },
  abgerechnet: { label: "Schlussrechnung gestellt", ton: "ok", schritt: 6 },
  abgeschlossen: { label: "Abgeschlossen (bezahlt)", ton: "ok", schritt: 7 },
  abgelehnt: { label: "Vom Gutachter abgelehnt", ton: "neutral", schritt: -1 },
  nicht_beauftragt: { label: "Nicht beauftragt", ton: "neutral", schritt: -1 },
  storniert: { label: "Storniert", ton: "neutral", schritt: -1 },
};
export const AUFTRAG_STATUS_IDS = Object.keys(AUFTRAG_STATUS);
/** Schritte für die Fortschrittsanzeige */
export const AUFTRAG_SCHRITTE = ["Angebot", "Beauftragung", "Bearbeitung", "Prüfung", "Freigabe", "Abnahme", "Rechnung", "Bezahlt"];
export const AUFTRAG_OFFEN = ["angefragt", "angebot", "beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit", "abgenommen", "abgerechnet"];
export const AUFTRAG_ENDE = ["abgeschlossen", "abgelehnt", "nicht_beauftragt", "storniert"];

/** Aktion → { von: [Status], nach, wer: gutachter|bo } */
export const AUFTRAG_UEBERGAENGE = {
  angebot_abgeben: { von: ["angefragt", "angebot"], nach: "angebot", wer: "gutachter" },
  anfrage_ablehnen: { von: ["angefragt", "angebot"], nach: "abgelehnt", wer: "gutachter" },
  beauftragen: { von: ["angebot"], nach: "beauftragt", wer: "bo" },
  angebot_ablehnen: { von: ["angebot", "angefragt"], nach: "nicht_beauftragt", wer: "bo" },
  auftrag_bestaetigen: { von: ["beauftragt"], nach: "in_arbeit", wer: "gutachter" },
  liefern: { von: ["in_arbeit", "nachbesserung", "in_pruefung", "abnahmebereit"], nach: "in_pruefung", wer: "gutachter" },
  maengel: { von: ["in_pruefung"], nach: "nachbesserung", wer: "bo" },
  freigeben: { von: ["in_pruefung"], nach: null, wer: "bo" }, // nach: abnahmebereit (Endfassung) bzw. in_arbeit (Entwurf)
  abnehmen: { von: ["abnahmebereit"], nach: "abgenommen", wer: "bo" },
  stornieren: { von: ["angefragt", "angebot", "beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit"], nach: "storniert", wer: "bo" },
};

export const HONORAR_ARTEN = { pauschal: "Pauschalhonorar", stunden: "Nach Aufwand (Stundensatz)" };
export const LIEFER_ARTEN = { entwurf: "Entwurf / Zwischenstand", endfassung: "Endfassung" };
export const LIEFER_STATUS = {
  zur_pruefung: { label: "In Prüfung", ton: "info" },
  freigegeben: { label: "Freigegeben", ton: "ok" },
  maengel: { label: "Mängel gemeldet", ton: "warn" },
  ersetzt: { label: "Ersetzt", ton: "neutral" },
};
export const TERMIN_ARTEN = { begehung: "Ortsbegehung / Kartierung", besprechung: "Besprechung", behoerde: "Termin mit Behörde", abgabe: "Abgabetermin", sonstiges: "Sonstiger Termin" };
export const TERMIN_STATUS = { vorgeschlagen: { label: "Vorgeschlagen", ton: "info" }, bestaetigt: { label: "Bestätigt", ton: "ok" }, erledigt: { label: "Erledigt", ton: "neutral" }, abgesagt: { label: "Abgesagt", ton: "neutral" } };
export const RECHNUNG_ARTEN = { abschlag: "Abschlagsrechnung", schluss: "Schlussrechnung" };
export const RECHNUNG_STATUS = {
  eingereicht: { label: "Eingereicht – Prüfung", ton: "info" },
  geprueft: { label: "Sachlich geprüft – zur Zahlung", ton: "ok" },
  zurueckgewiesen: { label: "Zurückgewiesen", ton: "warn" },
  bezahlt: { label: "Bezahlt", ton: "ok" },
};
/** Zulässige Umsatzsteuersätze in % (DE 19/7, AT 20/13/10, CH 8,1/2,6; 0 = Reverse Charge bzw. Kleinunternehmer) */
export const UST_SAETZE = [0, 2.6, 7, 8.1, 10, 13, 19, 20];
export const UST_STANDARD = { DE: 19, AT: 20, CH: 8.1 };
export const BEWERTUNG_KRITERIEN = { qualitaet: "Fachliche Qualität", termintreue: "Termintreue", kommunikation: "Kommunikation", preisLeistung: "Preis-Leistung" };
export const ZAHLUNGSZIEL_STANDARD = 30;

class GutachterFehler extends Error {
  constructor(m, status = 422) {
    super(m);
    this.status = status;
  }
}
export { GutachterFehler };

const pflicht = (b, m, status = 422) => {
  if (!b) throw new GutachterFehler(m, status);
};
const zahl = (v, min, max, stellen = 2) => {
  if (v === null || v === undefined || v === "" || typeof v === "object") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  const f = 10 ** stellen;
  return Math.round(n * f) / f;
};
const txt = (v, max = 500) => (v === undefined || v === null || typeof v === "object" ? "" : String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max));
const datum = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? String(v) : "");
/** Zulässiger USt-Satz oder Standard (leer/ungültig → Standard) */
const ustSatz = (v, standard) => {
  const n = zahl(v, 0, 30);
  return n !== null && UST_SAETZE.includes(n) ? n : standard;
};
export const rund2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
export const plusTage = (iso, tage) => new Date(Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`) + tage * 86400e3).toISOString().slice(0, 10);
export const tageBis = (heute, iso) => Math.round((Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(heute).slice(0, 10)}T00:00:00Z`)) / 86400e3);

/** Übergang prüfen: { ok, nach } oder GutachterFehler (409 falscher Status, 403 falsche Seite) */
export function uebergang(aktion, { status, wer }) {
  const u = AUFTRAG_UEBERGAENGE[aktion];
  pflicht(u, "Unbekannte Aktion.");
  pflicht(u.wer === wer, u.wer === "bo" ? "Das entscheidet die Projektleitung von ÖkoInvest." : "Diesen Schritt erledigt der beauftragte Gutachter.", 403);
  pflicht(u.von.includes(status), `Im Status „${AUFTRAG_STATUS[status]?.label || status}“ ist das nicht möglich.`, 409);
  return { ok: true, nach: u.nach };
}

/** Anfrage (Leistungsanfrage an einen oder mehrere Gutachter) bereinigen */
export function anfrageBereinigen(d = {}, { heute, fachgebiete = null } = {}) {
  const a = {
    titel: txt(d.titel, 160),
    fachgebiet: txt(d.fachgebiet, 40),
    leistung: txt(d.leistung, 4000),
    angebotsfrist: datum(d.angebotsfrist),
    wunschtermin: datum(d.wunschtermin),
    hinweise: txt(d.hinweise, 1500),
  };
  pflicht(a.titel.length >= 3, "Bitte einen Titel für die Leistung angeben.");
  pflicht(!fachgebiete || fachgebiete.includes(a.fachgebiet), "Bitte ein Fachgebiet wählen.");
  pflicht(a.leistung.length >= 20, "Bitte die Leistung beschreiben (mind. 20 Zeichen): Umfang, Methodik, Ergebnisform.");
  pflicht(a.angebotsfrist, "Bitte eine Angebotsfrist angeben.");
  if (heute) pflicht(a.angebotsfrist > String(heute).slice(0, 10), "Die Angebotsfrist muss in der Zukunft liegen.");
  if (a.wunschtermin) pflicht(a.wunschtermin > a.angebotsfrist, "Der gewünschte Abgabetermin muss nach der Angebotsfrist liegen.");
  return a;
}

/** Angebot bereinigen und rechnen (Summen netto/brutto) */
export function angebotBereinigen(d = {}, { heute, land = "DE" } = {}) {
  const art = HONORAR_ARTEN[d.honorarArt] ? d.honorarArt : "pauschal";
  const a = {
    honorarArt: art,
    honorarNetto: art === "pauschal" ? zahl(d.honorarNetto, 0, 5e6) : null,
    stundensatz: art === "stunden" ? zahl(d.stundensatz, 0, 1000) : null,
    stunden: art === "stunden" ? zahl(d.stunden, 0, 20000, 1) : null,
    nebenkostenPct: zahl(d.nebenkostenPct, 0, 30) ?? 0,
    ustPct: ustSatz(d.ustPct, UST_STANDARD[land] ?? 19),
    liefertermin: datum(d.liefertermin),
    gueltigBis: datum(d.gueltigBis),
    abschlagPct: zahl(d.abschlagPct, 0, 50, 0) ?? 0,
    zahlungszielTage: zahl(d.zahlungszielTage, 7, 90, 0) ?? ZAHLUNGSZIEL_STANDARD,
    termineVorschlag: txt(d.termineVorschlag, 500),
    bemerkung: txt(d.bemerkung, 2000),
    ustHinweis: txt(d.ustHinweis, 200),
  };
  if (art === "pauschal") pflicht(a.honorarNetto > 0, "Bitte das Pauschalhonorar (netto) angeben.");
  else {
    pflicht(a.stundensatz > 0, "Bitte den Stundensatz (netto) angeben.");
    pflicht(a.stunden > 0, "Bitte den geschätzten Aufwand in Stunden angeben.");
  }
  pflicht(a.liefertermin, "Bitte den Liefertermin angeben.");
  if (heute) pflicht(a.liefertermin > String(heute).slice(0, 10), "Der Liefertermin muss in der Zukunft liegen.");
  if (a.gueltigBis && heute) pflicht(a.gueltigBis >= String(heute).slice(0, 10), "Die Bindefrist des Angebots darf nicht in der Vergangenheit liegen.");
  if (a.ustPct === 0) pflicht(a.ustHinweis.length >= 5, "Bei 0 % Umsatzsteuer bitte den Grund angeben (z. B. Reverse Charge, Kleinunternehmerregelung).");
  return { ...a, ...angebotSummen(a) };
}

/** Summen eines Angebots: Honorar, Nebenkosten, Auftragssumme netto, USt, brutto */
export function angebotSummen(a) {
  const honorar = a.honorarArt === "stunden" ? rund2((a.stundensatz || 0) * (a.stunden || 0)) : rund2(a.honorarNetto || 0);
  const nebenkosten = rund2((honorar * (a.nebenkostenPct || 0)) / 100);
  const netto = rund2(honorar + nebenkosten);
  const ust = rund2((netto * (a.ustPct || 0)) / 100);
  return { honorar, nebenkosten, summeNetto: netto, summeUst: ust, summeBrutto: rund2(netto + ust) };
}

/** Angebotsvergleich einer Anfragegruppe: Rang nach Preis, Termin und Bewertung (Durchschnitt 1–5, fehlend = 3) */
export function angebotVergleich(liste = []) {
  const mit = liste.filter((x) => x.angebot);
  if (!mit.length) return [];
  const minPreis = Math.min(...mit.map((x) => x.angebot.summeNetto || Infinity));
  const minTermin = mit.map((x) => x.angebot.liefertermin).sort()[0];
  return mit
    .map((x) => {
      const preis = minPreis > 0 ? minPreis / Math.max(x.angebot.summeNetto, 1) : 1; // 1 = günstigstes
      const verzug = Math.max(0, tageBis(minTermin, x.angebot.liefertermin));
      const termin = Math.max(0, 1 - verzug / 120); // 120 Tage später = 0
      const bew = Number.isFinite(x.bewertung) ? x.bewertung : 3;
      const punkte = Math.round((preis * 50 + termin * 25 + (bew / 5) * 25) * 10) / 10;
      return { id: x.id, gutachter: x.gutachter, summeNetto: x.angebot.summeNetto, liefertermin: x.angebot.liefertermin, bewertung: Number.isFinite(x.bewertung) ? x.bewertung : null, punkte, guenstigstes: x.angebot.summeNetto === minPreis };
    })
    .sort((a, b) => b.punkte - a.punkte)
    .map((z, i) => ({ ...z, rang: i + 1 }));
}

/** Termin bereinigen */
export function terminBereinigen(d = {}, { heute } = {}) {
  const t = {
    art: TERMIN_ARTEN[d.art] ? d.art : "begehung",
    datum: datum(d.datum),
    uhrzeit: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(d.uhrzeit || "")) ? d.uhrzeit : "",
    ort: txt(d.ort, 200),
    notiz: txt(d.notiz, 1000),
  };
  pflicht(t.datum, "Bitte das Datum des Termins angeben.");
  if (heute) pflicht(t.datum >= String(heute).slice(0, 10), "Der Termin darf nicht in der Vergangenheit liegen.");
  return t;
}

/** Zwischenstand bereinigen (Fortschritt in %, nie rückwärts gegenüber dem letzten Stand) */
export function berichtBereinigen(d = {}, { letzter = 0 } = {}) {
  const b = { text: txt(d.text, 3000), fortschritt: zahl(d.fortschritt, 0, 100, 0) };
  pflicht(b.text.length >= 10, "Bitte den Zwischenstand kurz beschreiben (mind. 10 Zeichen).");
  pflicht(b.fortschritt !== null, "Bitte den Fortschritt in Prozent angeben.");
  pflicht(b.fortschritt >= (letzter || 0), `Der Fortschritt kann nicht kleiner als der letzte Stand (${letzter} %) sein.`);
  return b;
}

/** Mängelliste bereinigen (mind. ein Punkt) */
export function maengelBereinigen(liste) {
  const m = (Array.isArray(liste) ? liste : String(liste || "").split(/\n+/)).map((x) => txt(x, 300)).filter((x) => x.length >= 3).slice(0, 30);
  pflicht(m.length >= 1, "Bitte mindestens einen Mangel konkret benennen.");
  return m;
}

/** Bewertung (1–5 je Kriterium) bereinigen; Durchschnitt auf eine Nachkommastelle */
export function bewertungBereinigen(d = {}) {
  const b = {};
  for (const k of Object.keys(BEWERTUNG_KRITERIEN)) {
    const w = zahl(d[k], 1, 5, 0);
    pflicht(w !== null, `Bitte „${BEWERTUNG_KRITERIEN[k]}“ mit 1 bis 5 bewerten.`);
    b[k] = w;
  }
  b.kommentar = txt(d.kommentar, 1500);
  b.schnitt = Math.round((Object.keys(BEWERTUNG_KRITERIEN).reduce((s, k) => s + b[k], 0) / 4) * 10) / 10;
  return b;
}

/** Durchschnitt der Bewertungen eines Gutachters (null, wenn keine) */
export function bewertungSchnitt(bewertungen = []) {
  const l = bewertungen.filter((b) => b && Number.isFinite(b.schnitt));
  return l.length ? { schnitt: Math.round((l.reduce((s, b) => s + b.schnitt, 0) / l.length) * 10) / 10, anzahl: l.length } : null;
}

/**
 * Rechnung bereinigen und gegen den Auftrag prüfen.
 * auftrag: { status, angebot: {summeNetto, abschlagPct, zahlungszielTage, ustPct}, rechnungen: [...] }
 */
export function rechnungBereinigen(d = {}, auftrag, { heute } = {}) {
  const ang = auftrag?.angebot;
  pflicht(ang, "Ohne angenommenes Angebot keine Rechnung.", 409);
  const art = RECHNUNG_ARTEN[d.art] ? d.art : "schluss";
  const r = {
    art,
    nummer: txt(d.nummer, 40),
    datum: datum(d.datum),
    leistungVon: datum(d.leistungVon),
    leistungBis: datum(d.leistungBis),
    netto: zahl(d.netto, 0.01, 5e6),
    ustPct: ustSatz(d.ustPct, ang.ustPct),
    ustHinweis: txt(d.ustHinweis, 200),
    iban: txt(d.iban, 40).replace(/\s/g, "").toUpperCase(),
    bemerkung: txt(d.bemerkung, 1000),
  };
  pflicht(r.nummer.length >= 1, "Bitte die Rechnungsnummer angeben.");
  pflicht(r.datum, "Bitte das Rechnungsdatum angeben.");
  if (heute) pflicht(r.datum <= String(heute).slice(0, 10), "Das Rechnungsdatum darf nicht in der Zukunft liegen.");
  pflicht(r.leistungVon && r.leistungBis && r.leistungVon <= r.leistungBis, "Bitte den Leistungszeitraum angeben (von ≤ bis).");
  pflicht(r.netto > 0, "Bitte den Nettobetrag angeben.");
  if (r.ustPct === 0) pflicht(r.ustHinweis.length >= 5, "Bei 0 % Umsatzsteuer bitte den Hinweis angeben (z. B. „Steuerschuldnerschaft des Leistungsempfängers“).");
  if (r.iban) pflicht(/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(r.iban) && ibanPruefen(r.iban), "Die IBAN ist ungültig.");
  const bisher = (auftrag.rechnungen || []).filter((x) => x.status !== "zurueckgewiesen");
  pflicht(!bisher.some((x) => x.nummer === r.nummer), "Diese Rechnungsnummer wurde für den Auftrag bereits verwendet.", 409);
  pflicht(!bisher.some((x) => x.art === "schluss"), "Die Schlussrechnung liegt bereits vor.", 409);
  const summeBisher = rund2(bisher.reduce((s, x) => s + (x.netto || 0), 0));
  if (art === "abschlag") {
    pflicht(["beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit"].includes(auftrag.status), "Abschlagsrechnungen sind nur während der Bearbeitung möglich.", 409);
    pflicht((ang.abschlagPct || 0) > 0, "Im Angebot ist kein Abschlag vereinbart.", 409);
    const grenze = rund2((ang.summeNetto * ang.abschlagPct) / 100);
    pflicht(rund2(summeBisher + r.netto) <= grenze + 0.005, `Abschläge sind auf ${ang.abschlagPct} % der Auftragssumme begrenzt (${grenze.toFixed(2).replace(".", ",")} € netto).`);
  } else {
    pflicht(auftrag.status === "abgenommen", "Die Schlussrechnung ist erst nach der Abnahme möglich.", 409);
  }
  pflicht(rund2(summeBisher + r.netto) <= rund2(ang.summeNetto) + 0.005, `Die Rechnungen übersteigen die Auftragssumme (${rund2(ang.summeNetto).toFixed(2).replace(".", ",")} € netto) – Mehrleistungen bitte vorher als Nachtrag vereinbaren.`);
  r.ust = rund2((r.netto * r.ustPct) / 100);
  r.brutto = rund2(r.netto + r.ust);
  r.faelligAm = plusTage(r.datum, ang.zahlungszielTage || ZAHLUNGSZIEL_STANDARD);
  return r;
}

/** IBAN-Prüfsumme (ISO 13616, Modulo 97) */
export function ibanPruefen(iban) {
  const s = String(iban || "").replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const umgestellt = s.slice(4) + s.slice(0, 4);
  let rest = 0;
  for (const c of umgestellt) {
    const z = /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c;
    for (const ziffer of z) rest = (rest * 10 + Number(ziffer)) % 97;
  }
  return rest === 1;
}

/** Summen und offene Posten der Rechnungen eines Auftrags */
export function rechnungsStand(auftrag, heute) {
  const r = (auftrag?.rechnungen || []).filter((x) => x.status !== "zurueckgewiesen");
  const summe = auftrag?.angebot?.summeNetto || 0;
  const berechnet = rund2(r.reduce((s, x) => s + x.netto, 0));
  const bezahlt = rund2(r.filter((x) => x.status === "bezahlt").reduce((s, x) => s + x.brutto, 0));
  const offen = rund2(r.filter((x) => x.status !== "bezahlt").reduce((s, x) => s + x.brutto, 0));
  const ueberfaellig = heute ? r.filter((x) => x.status !== "bezahlt" && x.faelligAm && x.faelligAm < String(heute).slice(0, 10)).length : 0;
  return { auftragssumme: summe, berechnetNetto: berechnet, restNetto: rund2(summe - berechnet), bezahltBrutto: bezahlt, offenBrutto: offen, ueberfaellig, schlussVorhanden: r.some((x) => x.art === "schluss") };
}

/**
 * Fristen eines Auftrags zum Stichtag: Angebotsfrist (angefragt), Liefertermin (beauftragt … nachbesserung), Rechnungen fällig.
 * Liefert [{ art, datum, tage, ueberfaellig, text }] – Grundlage für Erinnerungen und die Fristenliste.
 */
export function auftragFristen(a, heute) {
  const h = String(heute).slice(0, 10);
  const f = [];
  if (["angefragt"].includes(a.status) && a.angebotsfrist) f.push({ art: "angebotsfrist", datum: a.angebotsfrist, text: "Angebotsfrist" });
  if (a.status === "angebot" && a.angebot?.gueltigBis) f.push({ art: "bindefrist", datum: a.angebot.gueltigBis, text: "Bindefrist des Angebots" });
  if (["beauftragt", "in_arbeit", "nachbesserung", "in_pruefung"].includes(a.status)) {
    const lt = a.beauftragung?.liefertermin || a.angebot?.liefertermin;
    if (lt) f.push({ art: "liefertermin", datum: lt, text: "Liefertermin" });
  }
  for (const t of a.termine || []) if (["vorgeschlagen", "bestaetigt"].includes(t.status) && t.datum >= h) f.push({ art: "termin", datum: t.datum, text: TERMIN_ARTEN[t.art] || "Termin", id: t.id });
  for (const r of a.rechnungen || []) if (["eingereicht", "geprueft"].includes(r.status) && r.faelligAm) f.push({ art: "zahlung", datum: r.faelligAm, text: `Zahlung ${r.nummer}`, id: r.id });
  return f.map((x) => ({ ...x, tage: tageBis(h, x.datum), ueberfaellig: x.datum < h })).sort((x, y) => x.datum.localeCompare(y.datum));
}

/** Nächste Versionsnummer einer Lieferung (1, 2, 3 …) */
export const naechsteVersion = (lieferungen = []) => (lieferungen.length ? Math.max(...lieferungen.map((l) => l.version || 0)) + 1 : 1);
