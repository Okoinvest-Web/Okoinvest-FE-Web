// src/lib/plattform/anbieter/regeln.js
//
// Anbieter / Verkäufer – reine Regeln (ohne Datenbank, Node- und Browser-tauglich). Python-Gegenstück:
// Backend-Import/oekoinvest_app/oekoinvest_app/plattform/anbieter_kern.py (gleiche Konstanten und Ergebnisse).
//
//  1. Vermittlungsauftrag (Provisionsvereinbarung) je Projekt: einfacher Auftrag oder Alleinvermittlung (Exklusivität)
//     mit Mindestlaufzeit, Erklärung per getipptem Namen (einfache elektronische Signatur), Gegenbestätigung der
//     Exklusivität durch ÖkoInvest, Kündigung. Rahmen: Besondere Bedingungen Projektbörse (/bedingungen/projektboerse).
//  2. Prüfpunkte (Rückfragen/Nachbesserung) des Backoffice mit Frist, Antwort des Anbieters, Abschluss durch das Backoffice.
//  3. Anonymisierungsprüfung des öffentlichen Teasers (Titel, Region, Beschreibung, Highlights).
//  4. Stellungnahme des Verkäufers zu LOIs (Zustimmung / Verhandeln / Ablehnung).
//  5. Vorkenntnis-Meldung nach § 4 Abs. 2 der Besonderen Bedingungen (zehn Werktage ab Anzeige des Interessenten).
//  6. Sperren für Statusübergänge (Einreichen, Veröffentlichen, LOI annehmen).
//
// Alle Vertragstexte sind MUSTER/ENTWURF zur anwaltlichen Prüfung – keine Rechtsberatung.

export const ANB_SCHEMA = 1;

export class AnbieterFehler extends Error {
  constructor(status, message, code = "") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const pflicht = (b, msg, status = 422, code = "") => {
  if (!b) throw new AnbieterFehler(status, msg, code);
};

// ---------------------------------------------------------------- Hilfen

const STEUER = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export const mehrzeilig = (v, max) => (v === undefined || v === null || typeof v === "object" ? "" : String(v).replace(STEUER, "").replace(/\r\n?/g, "\n").trim().slice(0, max));
export const text = (v, max) => mehrzeilig(v, max).replace(/\s+/g, " ");
export const auswahl = (v, erlaubt, std = "") => (Object.prototype.hasOwnProperty.call(erlaubt, v) ? v : std);
export function zahl(v, min, max, stellen = 2) {
  if (v === undefined || v === null || v === "" || typeof v === "object" || typeof v === "boolean") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10 ** stellen) / 10 ** stellen;
}
export const istDatum = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const datumOder = (s) => (istDatum(s) ? String(s) : "");
/** Kalenderdatum (YYYY-MM-DD) eines ISO-Zeitpunkts in Europe/Vienna */
export const tagVon = (iso) => (iso ? new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" }) : "");

function utc(d) {
  const [y, m, t] = String(d).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, t));
}
const alsTag = (dt) => dt.toISOString().slice(0, 10);

export function tagePlus(datum, tage) {
  const d = utc(datum);
  d.setUTCDate(d.getUTCDate() + tage);
  return alsTag(d);
}

/** n Werktage (Mo–Fr) nach `datum` – gesetzliche Feiertage werden nicht berücksichtigt (Hinweis in der Oberfläche) */
export function werktagePlus(datum, n) {
  const d = utc(datum);
  let rest = Math.max(0, n | 0);
  while (rest > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wt = d.getUTCDay();
    if (wt !== 0 && wt !== 6) rest--;
  }
  return alsTag(d);
}

/** Monate addieren (Monatsende bleibt Monatsende, z. B. 31.01. + 1 → 28./29.02.) */
export function monatePlus(datum, monate) {
  const [y, m, t] = String(datum).split("-").map(Number);
  const ziel = new Date(Date.UTC(y, m - 1 + monate, 1));
  const letzter = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0)).getUTCDate();
  ziel.setUTCDate(Math.min(t, letzter));
  return alsTag(ziel);
}
export function monatsende(datum) {
  const [y, m] = String(datum).split("-").map(Number);
  return alsTag(new Date(Date.UTC(y, m, 0)));
}

// ---------------------------------------------------------------- 1. Vermittlungsauftrag

export const MANDAT_VERSION = "2026-09-entwurf";
export const MANDAT_ARTEN = {
  einfach: { label: "Einfacher Vermittlungsauftrag", text: "Sie dürfen das Projekt parallel selbst oder über andere Wege anbieten. Provision nur bei Abschluss mit einem von ÖkoInvest nachgewiesenen Investor." },
  exklusiv: { label: "Alleinvermittlungsauftrag (Exklusivität)", text: "Nur ÖkoInvest vermarktet das Projekt; eigene Interessenten leiten Sie weiter. Im Gegenzug aktive Ansprache passender Investoren und regelmäßige Berichte. Wirksam erst nach Gegenbestätigung durch ÖkoInvest." },
};
export const MANDAT_DAUER = [3, 6, 9, 12]; // Mindestlaufzeit der Exklusivität in Monaten
export const MANDAT_STATUS = {
  keiner: { label: "Kein Auftrag", ton: "neutral" },
  wirksam: { label: "Wirksam", ton: "ok" },
  wartet: { label: "Exklusivität wartet auf Gegenbestätigung", ton: "warn" },
  // „wirksam“ mit beendeter Exklusivität gilt als einfacher Auftrag (Anzeige: exklusivAktiv = false)
  gekuendigt: { label: "Gekündigt", ton: "neutral" },
};
export const MANDAT_HINWEIS =
  "Muster/Entwurf – der Wortlaut wird vor dem Livegang anwaltlich geprüft. Maßgeblich sind die Besonderen Bedingungen der Projektbörse und die Nutzungsbedingungen.";

/** Eingabe des Anbieters prüfen: { art, dauerMonate, vorbehalte[], name, zustimmung } */
export function mandatEingabe(d = {}, { kontoName = "" } = {}) {
  const art = auswahl(d.art, MANDAT_ARTEN, "");
  pflicht(art, "Bitte wählen Sie die Art des Vermittlungsauftrags.");
  const dauer = Number(d.dauerMonate);
  const dauerMonate = art === "exklusiv" ? (MANDAT_DAUER.includes(dauer) ? dauer : null) : null;
  pflicht(art !== "exklusiv" || dauerMonate, `Bitte wählen Sie die Mindestlaufzeit der Exklusivität (${MANDAT_DAUER.join(", ")} Monate).`);
  const vorbehalte = (Array.isArray(d.vorbehalte) ? d.vorbehalte : String(d.vorbehalte || "").split(/\n/))
    .map((x) => text(x, 120))
    .filter(Boolean)
    .slice(0, 20);
  const name = text(d.name, 80);
  pflicht(name.length >= 2 && /^[\p{L}][\p{L} .'’-]*$/u.test(name), "Bitte geben Sie Ihren vollständigen Namen als Unterschrift ein.");
  if (kontoName) {
    const norm = (s) => String(s).toLowerCase().replace(/\(demo\)/g, "").replace(/[^\p{L}]/gu, "");
    const nachname = norm(String(kontoName).replace(/\(demo\)/gi, "").trim().split(/\s+/).slice(-1)[0] || "");
    pflicht(!nachname || norm(name).includes(nachname), "Der getippte Name muss Ihren Nachnamen laut Konto enthalten.");
  }
  pflicht(d.zustimmung === true, "Bitte bestätigen Sie, dass Sie den Vermittlungsauftrag erteilen.");
  return { art, dauerMonate, vorbehalte, name };
}

/** Wortlaut des Vermittlungsauftrags (Absätze) – Grundlage für PDF und Prüfsumme */
export function mandatText({ projekt = {}, mandat = {}, anbieter = {}, provision = { min: 0.015, max: 0.03 } } = {}) {
  const von = (provision.min * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const bis = (provision.max * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const satz = projekt.provisionSatz != null ? `${(projekt.provisionSatz * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %` : `zwischen ${von} und ${bis} % (Festlegung bei der Freigabe)`;
  const wer = [anbieter.firma, [anbieter.vorname, anbieter.nachname].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Anbieter";
  const a = [
    `Auftraggeber: ${wer}. Auftragnehmer: ÖkoInvest GmbH, Gewerbegebiet 10, 5121 Ostermiething (AT). Gegenstand: Nachweis und Vermittlung von Investoren für das Projekt ${projekt.id || ""} „${projekt.titel || ""}“ über die Projektbörse.`,
    `Art des Auftrags: ${MANDAT_ARTEN[mandat.art]?.label || "–"}. ${mandat.art === "exklusiv" ? `Mindestlaufzeit der Exklusivität: ${mandat.dauerMonate} Monate ab Gegenbestätigung durch ÖkoInvest; danach endet sie mit Kündigung durch eine Seite zum Ende des laufenden Monats. Während der Exklusivität bietet der Auftraggeber das Projekt nicht über andere Vermittler oder Plattformen an und leitet eigene Interessenten an ÖkoInvest weiter; ÖkoInvest spricht passende Investoren aktiv an und berichtet regelmäßig über Zugriffe und Interessenten.` : "Der Auftraggeber bleibt frei, das Projekt selbst oder über andere Wege anzubieten."}`,
    `Provision: ${satz} der Bemessungsgrundlage nach § 3 der Besonderen Bedingungen der Projektbörse, zuzüglich Umsatzsteuer, soweit diese anfällt. Die Provision entsteht nur bei wirksamem Abschluss eines Vertrags über das Projekt mit einem von ÖkoInvest nachgewiesenen oder vermittelten Investor; ohne Abschluss entstehen keine Kosten.`,
    "Nachweis und Vorkenntnis: Als nachgewiesen gilt ein Investor, dem die Projektdetails über die Plattform freigeschaltet wurden. War er dem Auftraggeber für genau dieses Projekt bereits als Interessent bekannt, meldet der Auftraggeber dies unter Nachweis innerhalb von zehn Werktagen, nachdem ihm der Interessent (auch pseudonym) angezeigt wurde (§ 4 der Besonderen Bedingungen).",
    mandat.vorbehalte?.length
      ? `Bereits bekannte Interessenten (Vorbehaltsliste, nur für ÖkoInvest einsehbar): ${mandat.vorbehalte.join("; ")}.`
      : "Bereits bekannte Interessenten (Vorbehaltsliste): keine angegeben.",
    "Umgehungsschutz: Der Provisionsanspruch besteht auch bei Abschluss unter Umgehung der Plattform innerhalb von 24 Monaten nach Freischaltung der Projektdetails (§ 5 der Besonderen Bedingungen). Er besteht nach Rückzug oder Kündigung für bereits nachgewiesene Investoren fort.",
    "Pflichten des Auftraggebers: richtige und vollständige Angaben, Verfügungsbefugnis über das Projekt, aktueller Datenraum, fristgerechte Antworten auf moderierte Fragen und gleiche Information aller zugelassenen Interessenten (§ 7 der Besonderen Bedingungen, § 5 der Nutzungsbedingungen).",
    "Laufzeit und Kündigung: Der Auftrag ist jederzeit mit Wirkung für die Zukunft kündbar, sofern das Projekt nicht veröffentlicht oder reserviert ist. Eine Exklusivität kann frühestens zum Ende der Mindestlaufzeit, danach zum Ende eines Monats beendet werden; der Auftrag gilt dann als einfacher Vermittlungsauftrag weiter.",
    `Erklärung: Der Auftraggeber erteilt den Auftrag durch Eingabe seines Namens im Portal (einfache elektronische Signatur); Zeitpunkt, IP-Adresse und die SHA-256-Prüfsumme dieses Wortlauts (Version ${MANDAT_VERSION}) werden protokolliert.`,
  ];
  return a;
}

/** Wirksamkeit des Auftrags zu einem Tag: { status, exklusivAktiv, mindestBis, exklusivEndetAm, endetAm } */
export function mandatStand(mandat, heute) {
  const leer = { status: "keiner", exklusivAktiv: false, mindestBis: "", exklusivEndetAm: "", endetAm: "" };
  if (!mandat || !mandat.erteiltAm) return leer;
  const basis = { mindestBis: mandat.mindestBis || "", exklusivEndetAm: mandat.exklusivEndetAm || "", endetAm: mandat.endetAm || "" };
  if (mandat.gekuendigtAm && (!mandat.endetAm || mandat.endetAm <= heute)) return { ...basis, status: "gekuendigt", exklusivAktiv: false };
  if (mandat.art === "exklusiv" && !mandat.bestaetigtAm) return { ...basis, status: "wartet", exklusivAktiv: false };
  const exklusivAktiv = mandat.art === "exklusiv" && !(mandat.exklusivEndetAm && mandat.exklusivEndetAm < heute);
  return { ...basis, status: "wirksam", exklusivAktiv };
}

/**
 * Exklusivität beenden (nur bestätigte Alleinvermittlung): Wirkung zum Ende des laufenden Monats, frühestens zum Ende
 * der Mindestlaufzeit. Danach gilt der Auftrag als einfacher Vermittlungsauftrag weiter.
 */
export function exklusivitaetEnde(mandat, { heute }) {
  pflicht(mandat?.erteiltAm && !mandat.gekuendigtAm && mandat.art === "exklusiv" && mandat.bestaetigtAm, "Es besteht keine bestätigte Exklusivität.", 409);
  pflicht(!mandat.exklusivEndetAm, "Die Exklusivität ist bereits beendet bzw. gekündigt.", 409);
  const ende = monatsende(heute);
  return mandat.mindestBis && mandat.mindestBis > ende ? mandat.mindestBis : ende;
}

/** Kündigung des ganzen Auftrags (sofort wirksam): nicht bei veröffentlichtem/reserviertem Projekt, nicht in laufender Exklusivität */
export function mandatKuendigung(mandat, { heute, projektStatus }) {
  pflicht(mandat?.erteiltAm && !mandat.gekuendigtAm, "Es besteht kein kündbarer Vermittlungsauftrag.", 409);
  pflicht(!["veroeffentlicht", "reserviert"].includes(projektStatus), "Nehmen Sie das Projekt zuerst von der Börse, bevor Sie den Auftrag kündigen.", 409);
  const st = mandatStand(mandat, heute);
  if (st.exklusivAktiv) {
    const bis = st.exklusivEndetAm || st.mindestBis;
    pflicht(bis && bis < heute, `Die Exklusivität läuft noch bis ${bis ? bis.split("-").reverse().join(".") : "zur Beendigung"} – beenden Sie zuerst die Exklusivität.`, 409);
  }
  return heute;
}

// ---------------------------------------------------------------- 2. Prüfpunkte (Rückfragen / Nachbesserung)

export const PRUEFPUNKT_BEREICHE = {
  datenblatt: "Datenblatt",
  unterlagen: "Unterlagen / Datenraum",
  anonymitaet: "Anonymisierung Teaser",
  recht: "Rechte & Verfügungsbefugnis",
  wirtschaft: "Preis & Wirtschaftlichkeit",
  sonstiges: "Sonstiges",
};
export const PRUEFPUNKT_STATUS = {
  offen: { label: "Offen bei Ihnen", labelBo: "Offen beim Anbieter", ton: "warn" },
  beantwortet: { label: "Beantwortet – in Prüfung", labelBo: "Beantwortet – bitte prüfen", ton: "info" },
  erledigt: { label: "Erledigt", labelBo: "Erledigt", ton: "ok" },
  verworfen: { label: "Entfällt", labelBo: "Entfällt", ton: "neutral" },
};
export const PRUEFPUNKT_FRIST = { standard: 7, min: 1, max: 30 };
export const PRUEFPUNKTE_MAX = 60;

export function pruefpunktEingabe(d = {}, { heute }) {
  const bereich = auswahl(d.bereich, PRUEFPUNKT_BEREICHE, "");
  pflicht(bereich, "Bitte wählen Sie einen Bereich.");
  const t = mehrzeilig(d.text, 1500);
  pflicht(t.length >= 10, "Bitte beschreiben Sie die Rückfrage (mind. 10 Zeichen).");
  const tage = zahl(d.fristTage, PRUEFPUNKT_FRIST.min, PRUEFPUNKT_FRIST.max, 0) ?? PRUEFPUNKT_FRIST.standard;
  return { bereich, text: t, pflicht: d.pflicht !== false, fristAm: tagePlus(heute, tage) };
}

/** Übergang eines Prüfpunkts: wer = anbieter | backoffice; aktion = antworten | erledigt | erneut | verwerfen */
export function pruefpunktAktion(punkt, { aktion, wer, antwort, kommentar }) {
  const erlaubt = {
    antworten: { wer: "anbieter", von: ["offen"], nach: "beantwortet" },
    erledigt: { wer: "backoffice", von: ["offen", "beantwortet"], nach: "erledigt" },
    erneut: { wer: "backoffice", von: ["beantwortet", "erledigt"], nach: "offen" },
    verwerfen: { wer: "backoffice", von: ["offen", "beantwortet"], nach: "verworfen" },
  }[aktion];
  pflicht(erlaubt, "Unbekannte Aktion.", 400);
  pflicht(erlaubt.wer === wer, "Diesen Schritt dürfen Sie nicht auslösen.", 403);
  pflicht(erlaubt.von.includes(punkt.status), `Der Prüfpunkt ist „${PRUEFPUNKT_STATUS[punkt.status]?.labelBo || punkt.status}“ – dieser Schritt ist nicht möglich.`, 409);
  const out = { status: erlaubt.nach };
  if (aktion === "antworten") {
    const a = mehrzeilig(antwort, 3000);
    pflicht(a.length >= 5, "Bitte geben Sie eine Antwort ein (mind. 5 Zeichen).");
    out.antwort = a;
  }
  if (aktion === "erneut") {
    const k = mehrzeilig(kommentar, 1000);
    pflicht(k.length >= 5, "Bitte begründen Sie, was noch fehlt (mind. 5 Zeichen).");
    out.kommentar = k;
  }
  if (aktion === "erledigt" || aktion === "verwerfen") out.kommentar = mehrzeilig(kommentar, 1000);
  return out;
}

export const pruefpunkteOffen = (punkte = []) => punkte.filter((p) => p.status === "offen");
export const pruefpunkteUngeklaert = (punkte = []) => punkte.filter((p) => p.pflicht && !["erledigt", "verworfen"].includes(p.status));

// ---------------------------------------------------------------- 3. Anonymisierung Teaser

const KONTAKT = [
  [/[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,120}\.[A-Z]{2,24}/i, "E-Mail-Adresse"],
  [/\b(?:https?:\/\/|www\.)\S+/i, "Link / Webadresse"],
  [/(?<![\d.,])(?<!\d[ .,])(?:\+|00)\d[\d ()/.-]{6,20}\d/, "Telefonnummer"],
  [/(?<![\d.,])(?<!\d[ .,])\b0\d{2,5}(?:[ /.-]?\d){4,14}\b/, "Telefonnummer"],
];
const MUSTER_KRITISCH = [
  [/\b(?:flurst(?:ü|ue)cks?|fl\.?\s?-?\s?nr\.?|parzellen?|grundst(?:ü|ue)cks?-?\s?nr\.?|gst\.?\s?-?\s?nr\.?|einlagezahl|ez)\s*[:.]?\s*\d/i, "Flurstücks-/Grundstücksnummer"],
  [/\b\d{1,2}[.,]\d{4,}\s*[,;/]?\s*°?\s*[NS]?\s*[,;/ ]\s*\d{1,3}[.,]\d{4,}/i, "Koordinaten"],
  [/\b[A-ZÄÖÜ][a-zäöüß]+(?:straße|strasse|str\.|gasse|weg|platz|allee)\s+\d+/, "Straßenadresse"],
];
const MUSTER_WARNUNG = [[/\b(?:D-|A-|CH-)\d{4,5}\b|\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]{2,}/, "mögliche Postleitzahl mit Ort"]];

const norm = (s) => ` ${String(s || "").toLowerCase().replace(/[^\p{L}\p{N}/]+/gu, " ").trim()} `;
const enthaeltPhrase = (heuhaufen, phrase) => {
  const p = norm(phrase).trim();
  return p.length >= 4 && heuhaufen.includes(` ${p} `);
};

/** Öffentliche Felder des Teasers als [feld, label, text] */
function oeffentlicheTexte(p) {
  return [
    ["titel", "Titel", p?.titel],
    ["region", "Region", p?.region],
    ["beschreibung", "Beschreibung", p?.beschreibung],
    ["highlights", "Highlights", (Array.isArray(p?.highlights) ? p.highlights : []).join(" · ")],
  ].filter(([, , t]) => t);
}

/**
 * Prüft den öffentlichen Teaser auf identifizierende Angaben.
 * kritisch: vertrauliche Standortangaben (Gemeinde, Gemarkung, Flurstücke), Kontaktdaten, Flurstücksnummern, Koordinaten, Adressen
 * warnung: Netzbetreiber/Umspannwerk, Name bzw. Firma des Anbieters, mögliche PLZ
 * Liefert { ok, kritisch, warnungen, treffer: [{ stufe, feld, text }] }
 */
export function anonymitaetPruefen(p = {}, { anbieter = null } = {}) {
  const treffer = [];
  const vt = p.vertraulich && typeof p.vertraulich === "object" ? p.vertraulich : {};
  const add = (stufe, feld, t) => {
    if (!treffer.some((x) => x.feld === feld && x.text === t)) treffer.push({ stufe, feld, text: t });
  };
  for (const [feld, label, roh] of oeffentlicheTexte(p)) {
    const s = String(roh);
    const n = norm(s);
    for (const [k, l] of [["gemeinde", "Gemeinde"], ["gemarkung", "Gemarkung / Katastralgemeinde"]]) {
      for (const teil of String(vt[k] || "").split(/[,;/]| und /)) {
        if (enthaeltPhrase(n, teil)) add("kritisch", feld, `${label} nennt die vertrauliche Angabe „${l}“ (${text(teil, 60)}).`);
      }
    }
    for (const fs of String(vt.flurstuecke || "").split(/[,;\s]+/)) {
      if (!/\d/.test(fs) || fs.length < 3 || !new RegExp(`(^|[^\\d/])${fs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\d/])`).test(s)) continue;
      // „123/4“ ist eindeutig ein Flurstück; eine reine Zahl kann auch eine Kennzahl sein (z. B. „123 ha“) → nur Warnung
      add(fs.includes("/") ? "kritisch" : "warnung", feld, `${label} nennt ${fs.includes("/") ? "ein vertrauliches Flurstück" : "eine Zahl, die einem vertraulichen Flurstück entspricht"} (${fs}).`);
    }
    for (const [k, l] of [["netzbetreiber", "Netzbetreiber"], ["einspeisepunkt", "Einspeisepunkt / Umspannwerk"]]) {
      if (enthaeltPhrase(n, vt[k])) add("warnung", feld, `${label} nennt den ${l} – das kann den Standort eingrenzen.`);
    }
    for (const [re, l] of KONTAKT) if (re.test(s)) add("kritisch", feld, `${label} enthält eine ${l} (Umgehungsschutz).`);
    for (const [re, l] of MUSTER_KRITISCH) if (re.test(s)) add("kritisch", feld, `${label} enthält eine ${l}.`);
    for (const [re, l] of MUSTER_WARNUNG) if (re.test(s)) add("warnung", feld, `${label} enthält eine ${l}.`);
    if (anbieter) {
      const name = [anbieter.vorname, anbieter.nachname].filter(Boolean).join(" ").replace(/\(demo\)/i, "").trim();
      if (enthaeltPhrase(n, anbieter.firma)) add("warnung", feld, `${label} nennt Ihre Firma – Investoren sehen den Anbieter erst nach der Kontaktfreigabe.`);
      if (name.split(" ").length >= 2 && enthaeltPhrase(n, name)) add("warnung", feld, `${label} nennt Ihren Namen.`);
    }
  }
  const kritisch = treffer.filter((t) => t.stufe === "kritisch").length;
  return { ok: kritisch === 0, kritisch, warnungen: treffer.length - kritisch, treffer };
}

// ---------------------------------------------------------------- 4. Stellungnahme zu LOIs

export const VOTUM_ARTEN = {
  zustimmung: { label: "Zustimmung", text: "Ich bin mit der Annahme dieser LOI einverstanden.", ton: "ok" },
  verhandeln: { label: "Verhandeln", text: "Grundsätzlich interessiert – mit Gegenvorschlag bzw. Rückfragen.", ton: "info" },
  ablehnung: { label: "Ablehnung", text: "Diese LOI soll nicht angenommen werden.", ton: "neutral" },
};
export function votumEingabe(d = {}) {
  const art = auswahl(d.art, VOTUM_ARTEN, "");
  pflicht(art, "Bitte wählen Sie Ihre Stellungnahme.");
  const kommentar = mehrzeilig(d.kommentar, 1500);
  pflicht(art === "zustimmung" || kommentar.length >= 10, "Bitte begründen Sie Ihre Stellungnahme (mind. 10 Zeichen).");
  const gegenvorschlag = art === "verhandeln" ? zahl(d.gegenvorschlag, 1, 1e11, 0) : null;
  return { art, kommentar, gegenvorschlag };
}
/** Maßgebliche Stellungnahme zur aktuellen LOI (ältere LOI-Fassungen gelten nicht) */
export function aktuellesVotum(voten = [], interesseId, loiAm) {
  const liste = voten.filter((x) => !x.gebotId && x.interesseId === interesseId && (!loiAm || x.loiAm === loiAm));
  return liste.length ? liste[liste.length - 1] : null;
}
/** Maßgebliche Stellungnahme zu einem Gebot im Bieterverfahren (je Gebotsversion – ein überarbeitetes Gebot braucht eine neue) */
export function gebotVotum(voten = [], gebotId, version) {
  const liste = voten.filter((x) => x.gebotId && x.gebotId === gebotId && (!version || x.gebotVersion === version));
  return liste.length ? liste[liste.length - 1] : null;
}
/** Zuschlag im Bieterverfahren: vom Verkäufer abgelehntes Gebot → 409 „votum“ */
export function zuschlagSperre({ akte, gebotId, version }) {
  const vt = gebotVotum(akte?.voten || [], gebotId, version);
  pflicht(vt?.art !== "ablehnung", "Der Verkäufer hat dieses Gebot abgelehnt. Ein Zuschlag ist gesperrt – bitte klären Sie das weitere Vorgehen mit dem Anbieter.", 409, "votum");
  return true;
}

// ---------------------------------------------------------------- 5. Vorkenntnis (§ 4 Abs. 2 Besondere Bedingungen)

export const VORKENNTNIS_WERKTAGE = 10;
export const VORKENNTNIS_NACHWEIS = {
  korrespondenz: "E-Mail- oder Briefwechsel",
  termin: "Gesprächs- oder Besuchstermin",
  vertrag: "NDA, LOI oder Vertrag mit dem Interessenten",
  sonstiges: "Sonstiger Nachweis",
};
export const VORKENNTNIS_STATUS = {
  gemeldet: { label: "Gemeldet – in Prüfung", ton: "warn" },
  anerkannt: { label: "Anerkannt", ton: "ok" },
  abgelehnt: { label: "Nicht anerkannt", ton: "neutral" },
};
export const vorkenntnisFrist = (angezeigtAm) => (angezeigtAm ? werktagePlus(tagVon(angezeigtAm), VORKENNTNIS_WERKTAGE) : "");

export function vorkenntnisEingabe(d = {}, { angezeigtAm, heute }) {
  const begruendung = mehrzeilig(d.begruendung, 2000);
  pflicht(begruendung.length >= 20, "Bitte beschreiben Sie, woher Sie den Interessenten für dieses Projekt kennen (mind. 20 Zeichen).");
  const nachweisArt = auswahl(d.nachweisArt, VORKENNTNIS_NACHWEIS, "");
  pflicht(nachweisArt, "Bitte wählen Sie die Art des Nachweises.");
  const nachweisDatum = datumOder(d.nachweisDatum);
  pflicht(nachweisDatum, "Bitte geben Sie das Datum des Nachweises an.");
  pflicht(nachweisDatum <= heute, "Das Datum des Nachweises liegt in der Zukunft.");
  pflicht(!angezeigtAm || nachweisDatum <= tagVon(angezeigtAm), "Vorkenntnis setzt einen Kontakt vor der Anzeige über die Plattform voraus.");
  const frist = vorkenntnisFrist(angezeigtAm);
  return { begruendung, nachweisArt, nachweisDatum, dokumentId: text(d.dokumentId, 40) || null, frist, verspaetet: !!frist && heute > frist };
}

/** Vermerk, wenn wegen anerkannter Vorkenntnis keine Provision entsteht (Verkauf/Closing, Provisionsstorno) */
export const VORKENNTNIS_VERMERK = "Vorkenntnis anerkannt";
/** Anerkannte Vorkenntnis-Meldung zum Käufer-Interesse → keine Provision aus diesem Projekt (§ 4 Abs. 2) – sonst null */
export function vorkenntnisAnerkannt(akte, interesseId) {
  if (!interesseId) return null;
  return (akte?.vorkenntnis || []).find((x) => x.interesseId === interesseId && x.status === "anerkannt") || null;
}

// ---------------------------------------------------------------- 6. Sperren für Statusübergänge

/**
 * Prüft Übergänge gegen die Anbieter-Akte. Wirft AnbieterFehler (409/422) oder liefert true.
 * ctx: { art, nach, von, akte, projekt, anbieter, loiAm, interesseId }
 */
export function uebergangSperre({ art, nach, von, akte, projekt, anbieter, interesseId, loiAm }) {
  const punkte = akte?.pruefpunkte || [];
  if (art === "projekt" && nach === "pruefung") {
    const offen = pruefpunkteOffen(punkte).length;
    pflicht(!offen, `Bitte beantworten Sie zuerst ${offen === 1 ? "die offene Rückfrage" : `die ${offen} offenen Rückfragen`} des Backoffice.`, 422, "pruefpunkte");
  }
  if (art === "projekt" && nach === "veroeffentlicht" && von === "pruefung") {
    const u = pruefpunkteUngeklaert(punkte).length;
    pflicht(!u, `Vor der Veröffentlichung ${u === 1 ? "ist ein Pflicht-Prüfpunkt" : `sind ${u} Pflicht-Prüfpunkte`} zu erledigen.`, 409, "pruefpunkte");
    const an = anonymitaetPruefen(projekt, { anbieter });
    pflicht(an.ok, `Der öffentliche Teaser enthält identifizierende Angaben: ${an.treffer.filter((t) => t.stufe === "kritisch").map((t) => t.text).join(" ")}`, 409, "anonymitaet");
  }
  if (art === "interesse" && nach === "loi_angenommen") {
    const vt = aktuellesVotum(akte?.voten || [], interesseId, loiAm);
    pflicht(vt?.art !== "ablehnung", "Der Verkäufer hat diese LOI abgelehnt. Bitte klären Sie das weitere Vorgehen mit dem Anbieter.", 409, "votum");
  }
  return true;
}
