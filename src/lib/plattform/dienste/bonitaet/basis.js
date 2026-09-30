// src/lib/plattform/dienste/bonitaet/basis.js
//
// Bonitätsauskünfte – gemeinsame Regeln (client- und serverseitig): Anbieter, Skalen, Ampel, Pflicht vor LOI/Gebot.
// Frappe-Gegenstück: plattform/dienste_kern.py (bonitaet_ampel, bonitaet_pflicht).
//
// Rechtsrahmen (Kurzfassung, Details docs/DIENSTE-EXTERN.md): Bonitätsabfrage zu Unternehmen vor Eintritt in
// Kaufverhandlungen (LOI) auf Grundlage des berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO) bzw. vorvertraglicher
// Maßnahmen (lit. b); bei Einzelunternehmern/Personen Informationspflicht nach Art. 14 DSGVO. Keine automatisierte
// Einzelentscheidung (Art. 22 DSGVO): Die Ampel ist ein Hinweis; über die Zulassung zum LOI entscheidet ein Mensch.

export const BONITAET_ANBIETER = {
  demo: { label: "Demo-Simulator", laender: ["AT", "DE", "CH"], skala: "Demo-Index 100–600 (niedrig = gut)" },
  ksv1870: { label: "KSV1870", laender: ["AT"], skala: "KSV1870 Rating 1–699 (niedrig = gut)" },
  creditreform: { label: "Creditreform", laender: ["DE", "AT", "CH"], skala: "Bonitätsindex 100–600 (niedrig = gut)" },
  crif: { label: "CRIF", laender: ["AT", "DE", "CH"], skala: "CRIF-Score / Ampel (anbieterabhängig)" },
  dnb: { label: "Dun & Bradstreet", laender: ["AT", "DE", "CH"], skala: "Failure Score 1–100 (hoch = gut) bzw. D&B Rating" },
};
export const BONITAET_ANBIETER_IDS = Object.keys(BONITAET_ANBIETER);

export const BONITAET_AMPEL = {
  gruen: { label: "Gute Bonität", ton: "ok" },
  gelb: { label: "Mittlere Bonität – genauer prüfen", ton: "warn" },
  rot: { label: "Erhöhtes Ausfallrisiko", ton: "warn" },
  unbekannt: { label: "Keine Bewertung", ton: "neutral" },
};

export const BONITAET_STATUS = {
  angefragt: { label: "Angefragt", ton: "info" },
  abgeschlossen: { label: "Liegt vor", ton: "ok" },
  fehler: { label: "Fehler beim Abruf", ton: "warn" },
  keine_daten: { label: "Keine Daten beim Anbieter", ton: "neutral" },
};

export const BONITAET_ANLAESSE = {
  loi: "Vor Absichtserklärung (LOI)",
  bieter: "Vor Teilnahme am Bieterverfahren",
  vertrag: "Vor Vertragsabschluss",
  pruefung: "Laufende Prüfung",
};

export const BONITAET_RECHTSGRUNDLAGEN = {
  berechtigtes_interesse: "Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) – Prüfung der Zahlungsfähigkeit vor Kaufverhandlungen",
  vorvertraglich: "Vorvertragliche Maßnahmen auf Anfrage der Person (Art. 6 Abs. 1 lit. b DSGVO)",
  einwilligung: "Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)",
};

/**
 * Anbieterwert → Ampel. Richtwerte (anbieterübliche Klassen, vor Einsatz mit dem Vertrag abstimmen):
 *   Creditreform-Index / Demo: ≤ 250 grün, ≤ 350 gelb, sonst rot (≥ 500 = massive Zahlungsstörungen)
 *   KSV1870-Rating:            ≤ 299 grün, ≤ 399 gelb, sonst rot
 *   D&B Failure Score (1–100): ≥ 51 grün, ≥ 21 gelb, sonst rot
 */
export function bonitaetAmpel(anbieter, score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return "unbekannt";
  if (anbieter === "ksv1870") return s <= 299 ? "gruen" : s <= 399 ? "gelb" : "rot";
  if (anbieter === "dnb") return s >= 51 ? "gruen" : s >= 21 ? "gelb" : "rot";
  if (anbieter === "crif") return s >= 600 ? "gruen" : s >= 450 ? "gelb" : "rot"; // CRIF-Scores: hoch = gut (produktabhängig)
  return s <= 250 ? "gruen" : s <= 350 ? "gelb" : "rot";
}

export function bonitaetEinstellungenStandard() {
  return {
    geltung: null, // null = aus Umgebung (PLATTFORM_BONITAET_VOR_LOI); "alle" | "firmen" | "pilot" | "aus"
    pilotKonten: [],
    gueltigTage: 180, // so lange gilt eine Auskunft für LOI/Gebot
    rotSperrt: true, // rote Ampel sperrt bis zur manuellen Freigabe
    schritte: { loi: true, gebot: true },
  };
}

/** Geltung: Einstellung > Umgebung > Standard (Produktion „firmen“, Entwicklung „pilot“) */
export function bonitaetGeltung(einstellungen = {}, env = {}) {
  const e = einstellungen?.geltung;
  if (["alle", "firmen", "pilot", "aus"].includes(e)) return e;
  const u = String(env.PLATTFORM_BONITAET_VOR_LOI || "").toLowerCase();
  if (["alle", "firmen", "pilot", "aus"].includes(u)) return u;
  return env.NODE_ENV === "production" ? "firmen" : "pilot";
}

/** Ist die Bonitätsprüfung für dieses Subjekt Pflicht? (firma = Investor handelt als Unternehmen) */
export function bonitaetPflichtAktiv(schritt, { kontoId, firma }, einstellungen = bonitaetEinstellungenStandard(), env = {}) {
  const e = { ...bonitaetEinstellungenStandard(), ...(einstellungen || {}) };
  if (e.schritte?.[schritt] === false) return false;
  const g = bonitaetGeltung(e, env);
  if (g === "aus") return false;
  if (g === "alle") return true;
  if (g === "firmen") return !!firma;
  return !!firma && (e.pilotKonten || []).includes(kontoId); // pilot
}

/** Gültige Auskunft? a: Auskunft oder null. Liefert { ok, grund } */
export function bonitaetGueltig(a, einstellungen = bonitaetEinstellungenStandard(), jetzt = new Date()) {
  const e = { ...bonitaetEinstellungenStandard(), ...(einstellungen || {}) };
  if (!a) return { ok: false, grund: "fehlt" };
  if (a.status !== "abgeschlossen" && a.status !== "keine_daten") return { ok: false, grund: "offen" };
  const alter = (jetzt.getTime() - new Date(a.auskunftAm || a.am).getTime()) / 86400000;
  if (!(alter <= e.gueltigTage)) return { ok: false, grund: "veraltet" };
  if (a.status === "keine_daten" && !a.freigabe) return { ok: false, grund: "keine_daten" };
  if (a.ampel === "rot" && e.rotSperrt && !a.freigabe) return { ok: false, grund: "rot" };
  return { ok: true, grund: "" };
}

export const BONITAET_HINWEIS_NUTZER =
  "Vor Abgabe einer Absichtserklärung bzw. eines Gebots prüfen wir die Zahlungsfähigkeit des erwerbenden Unternehmens (Bonitätsauskunft). Das Backoffice ist informiert und meldet sich bei Ihnen – das dauert in der Regel nicht länger als einen Werktag.";

/** Text der Information des Betroffenen (Art. 13/14 DSGVO) – ohne Ergebnis */
export function bonitaetInformation({ anbieterLabel, subjekt, rechtsgrundlage }) {
  return [
    `Wir haben zur Prüfung der Zahlungsfähigkeit von „${subjekt}“ eine Bonitätsauskunft bei ${anbieterLabel} eingeholt.`,
    `Zweck: Prüfung vor Eintritt in Kaufverhandlungen über Projektrechte bzw. Projektgesellschaften auf der ÖkoInvest-Plattform. Rechtsgrundlage: ${BONITAET_RECHTSGRUNDLAGEN[rechtsgrundlage] || BONITAET_RECHTSGRUNDLAGEN.berechtigtes_interesse}.`,
    "Das Ergebnis wird nur einem kleinen, berechtigten Personenkreis angezeigt und nach Ablauf der Aufbewahrungsfrist gelöscht. Eine automatisierte Entscheidung findet nicht statt – ein Mensch bewertet die Auskunft.",
    "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung und Widerspruch (Art. 15–21 DSGVO) sowie auf Beschwerde bei der Aufsichtsbehörde. Auskunft über die gespeicherten Daten erteilt auch die Auskunftei selbst.",
  ].join(" ");
}
