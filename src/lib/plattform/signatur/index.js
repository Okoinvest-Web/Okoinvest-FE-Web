// src/lib/plattform/signatur/index.js
//
// Elektronische Unterschrift im Portal – Konstanten und reine Helfer (Client und Server).
//
// Rechtlicher Rahmen: EINFACHE elektronische Signatur (EES) im Sinne von Art. 3 Nr. 10 eIDAS-Verordnung
// (EU) Nr. 910/2014. Ausdrücklich KEINE fortgeschrittene (Art. 3 Nr. 11) und KEINE qualifizierte
// elektronische Signatur (Art. 3 Nr. 12). Kennzeichnung im Portal, in E-Mails und auf der Prüfseite.
//
// Ablauf: Backoffice stellt ein PDF bereit → Unterzeichner (Portal-Konten) in fester Reihenfolge →
// je Unterschrift: Anmeldung + Bestätigungscode per E-Mail + Zustimmung + gezeichnete (Canvas → PNG) oder
// getippte Signatur → Protokoll (Zeit, IP, User-Agent, SHA-256 des Dokuments) → nach der letzten Unterschrift
// signiertes PDF = Original + angehängte Prüfseite (inkrementelles PDF-Update, Originalbytes bleiben unverändert).
// Vertrag: docs/API.md, Abschnitt „Dokumente, Signatur, Termine, Service & HR“.

export const SIGNATUR_ARTEN = {
  nda: { label: "Vertraulichkeitsvereinbarung (NDA)", kurz: "NDA" },
  provision: { label: "Provisionsvereinbarung", kurz: "Provision" },
  pacht_loi: { label: "Pacht-Absichtserklärung", kurz: "Pacht-LOI" },
  gutachter: { label: "Auftrag Gutachter", kurz: "Gutachterauftrag" },
  sonstiges: { label: "Sonstiges Dokument", kurz: "Dokument" },
};
export const SIGNATUR_ART_IDS = Object.keys(SIGNATUR_ARTEN);

export const SIGNATUR_STATUS = {
  laufend: { label: "Zur Unterschrift", ton: "info" },
  abgeschlossen: { label: "Vollständig unterschrieben", ton: "ok" },
  abgelehnt: { label: "Abgelehnt", ton: "warn" },
  widerrufen: { label: "Widerrufen", ton: "neutral" },
  abgelaufen: { label: "Frist abgelaufen", ton: "neutral" },
};
export const SIGNATUR_OFFEN = ["laufend"];

export const UNTERZEICHNER_STATUS = {
  wartet: { label: "Wartet auf Vorgänger", ton: "neutral" },
  offen: { label: "Zur Unterschrift", ton: "info" },
  unterschrieben: { label: "Unterschrieben", ton: "ok" },
  abgelehnt: { label: "Abgelehnt", ton: "warn" },
};

export const SIGNATUR_ARTEN_UNTERSCHRIFT = { gezeichnet: "Gezeichnete Unterschrift", getippt: "Getippter Name" };

/** Grenzen */
export const SIGNATUR_GRENZEN = {
  maxUnterzeichner: 6,
  codeMinuten: 10,
  codeVersuche: 5,
  bildMaxBytes: 200 * 1024, // PNG der gezeichneten Unterschrift
  pdfMaxBytes: 10 * 1024 * 1024,
  fristTageStandard: 14,
  fristTageMax: 90,
  erinnerungNachTagen: 3,
};

export const SIGNATUR_KENNZEICHNUNG =
  "Einfache elektronische Signatur (EES) nach Art. 3 Nr. 10 eIDAS-Verordnung (EU) Nr. 910/2014 – keine fortgeschrittene und keine qualifizierte elektronische Signatur.";

export const SIGNATUR_RECHTSHINWEIS =
  "Die einfache elektronische Signatur erfüllt keine gesetzliche Schriftform (in Deutschland z. B. § 126 BGB, in Österreich in der Regel nur mit qualifizierter Signatur, in der Schweiz Art. 14 OR) und ersetzt keine notarielle Beurkundung. Sie eignet sich für formfreie Erklärungen wie Vertraulichkeitsvereinbarungen, Absichtserklärungen oder Aufträge; ihre Beweiskraft unterliegt der freien Beweiswürdigung des Gerichts. Formbedürftige Verträge (z. B. langfristige Pacht- oder Grundstücksverträge) werden gesondert in der vorgeschriebenen Form geschlossen.";

export const SIGNATUR_ZUSTIMMUNG =
  "Ich habe das Dokument vollständig gelesen und unterzeichne es elektronisch. Mir ist bekannt, dass es sich um eine einfache elektronische Signatur handelt und dass Zeitpunkt, IP-Adresse, Browser und Prüfsumme des Dokuments protokolliert werden.";

/** Einstellung „Klick oder Signatur“ für die bestehenden Standard-Erklärungen (Standard: Klick bleibt) */
export const SIGNATUR_MODI = { klick: "Klick-Bestätigung (bisher)", signatur: "Elektronische Unterschrift (EES)" };

export const signaturStatusLabel = (s) => SIGNATUR_STATUS[s]?.label || s;
export const signaturArtLabel = (a) => SIGNATUR_ARTEN[a]?.label || a;

/** Nächste Unterzeichnerin/nächster Unterzeichner (Reihenfolge) oder null */
export function aktuellerUnterzeichner(vorgang) {
  if (!vorgang || vorgang.status !== "laufend") return null;
  const liste = [...(vorgang.unterzeichner || [])].sort((a, b) => a.position - b.position);
  if (vorgang.reihenfolge === false) return liste.find((u) => u.status !== "unterschrieben") || null;
  return liste.find((u) => u.status !== "unterschrieben") || null;
}

/** Status je Unterzeichner aus Reihenfolge ableiten (wartet | offen | unterschrieben | abgelehnt) */
export function unterzeichnerStatus(vorgang, u) {
  if (u.status === "unterschrieben" || u.status === "abgelehnt") return u.status;
  if (vorgang.status !== "laufend") return "wartet";
  if (vorgang.reihenfolge === false) return "offen";
  const vorher = (vorgang.unterzeichner || []).filter((x) => x.position < u.position);
  return vorher.every((x) => x.status === "unterschrieben") ? "offen" : "wartet";
}

/** Darf u jetzt unterschreiben? */
export const darfJetztUnterschreiben = (vorgang, u) => !!u && unterzeichnerStatus(vorgang, u) === "offen";

/** data:image/png;base64,… → Base64-Teil (oder "") */
export function pngBase64AusDataUrl(wert) {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(wert || "").trim());
  return m ? m[1] : "";
}

/** Getippter Name: 2–80 Zeichen, Buchstaben, Leer-, Binde-, Punkt, Apostroph */
export function getippterNameGueltig(name) {
  const t = String(name || "").trim();
  return t.length >= 2 && t.length <= 80 && /^[\p{L}][\p{L} .'’-]*$/u.test(t);
}

/** Kurzer, lesbarer Hash-Auszug für die Anzeige (volle Prüfsumme steht im Protokoll) */
export const hashKurz = (h) => (h ? `${String(h).slice(0, 12)}…${String(h).slice(-8)}` : "–");

/** Maskierte IP für Anzeigen gegenüber anderen Unterzeichnern (volle IP nur Backoffice/Protokoll) */
export function ipMaskiert(ip) {
  const s = String(ip || "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) return s.replace(/\.\d+$/, ".x");
  if (s.includes(":")) return `${s.split(":").slice(0, 3).join(":")}:…`;
  return s || "–";
}
