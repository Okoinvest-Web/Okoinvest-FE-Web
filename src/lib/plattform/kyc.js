// src/lib/plattform/kyc.js
//
// KYC/KYB – Identitäts- und Firmenprüfung: gemeinsame Regeln (client- und serverseitig, keine Node-Importe).
// Frappe-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/kyc_kern.py (gleiche Tabellen/Regeln).
//
// Inhalt: Kontotypen, Dokumentarten, Status-Automat, Anforderungen je Fall (Fortschritt, fehlende Unterlagen),
// IBAN-Prüfziffer (ISO 13616, mod 97), Kontoinhaber-Abgleich, Risikoeinstufung, Freigabe-Schritte (Gating) mit Hinweisen.
//
// Rechtlicher Rahmen (Kurzfassung, siehe docs/PLATTFORM.md „KYC/KYB“): Die Plattform ist so gebaut, dass die vollen
// allgemeinen und verstärkten Sorgfaltspflichten (DE: §§ 10–15 GwG, AT: §§ 365m1 ff. GewO bzw. FM-GwG, CH: GwG) erfüllbar
// sind. Ob ÖkoInvest für die Vermittlung von PV-Projektrechten/-gesellschaften Verpflichtete ist (z. B. Immobilienmakler
// i. S. v. § 1 Abs. 11 / § 2 Abs. 1 Nr. 14 GwG), ist eine Auslegungsfrage und rechtlich zu klären. Die Plattform
// behauptet keine Video- oder Online-Identifizierung – diese erfolgt nur über zugelassene Anbieter (Schnittstelle vorgesehen).

import { INVESTOR_TYPEN } from "./fach/suchprofil";
import { heuteLokal } from "./format";

// ================================================================ Grundbegriffe

export const KYC_KONTOTYPEN = {
  privat: { label: "Privatperson", text: "Sie handeln als natürliche Person (z. B. Flächeneigentümer, Landwirt als Einzelunternehmer, Privatinvestor)." },
  unternehmen: { label: "Unternehmen", text: "Sie handeln für eine Gesellschaft (GmbH, AG, KG, Genossenschaft, Verein …) – Prüfung der Firma (KYB)." },
};

export const KYC_STATUS = {
  offen: { label: "Nicht abgeschlossen", ton: "neutral" },
  eingereicht: { label: "Eingereicht", ton: "info" },
  in_pruefung: { label: "In Prüfung", ton: "info" },
  zweitpruefung: { label: "In Prüfung", ton: "info", intern: "Zweitprüfung (Vier-Augen)" },
  nachgefordert: { label: "Unterlagen nachgefordert", ton: "warn" },
  verifiziert: { label: "Verifiziert", ton: "ok" },
  abgelehnt: { label: "Abgelehnt", ton: "warn" },
  abgelaufen: { label: "Erneute Prüfung nötig", ton: "warn" },
};
export const KYC_STATUS_IDS = Object.keys(KYC_STATUS);
/** Status, in denen der Nutzer Angaben/Unterlagen ändern darf */
export const KYC_BEARBEITBAR = ["offen", "nachgefordert", "abgelaufen"];
/** Status der Warteschlange im Backoffice */
export const KYC_WARTESCHLANGE = ["eingereicht", "in_pruefung", "zweitpruefung"];

/** Erlaubte Übergänge: [von[], nach, wer] – wer: nutzer | compliance | system */
export const KYC_UEBERGAENGE = [
  { von: ["offen", "nachgefordert", "abgelaufen"], nach: "eingereicht", wer: "nutzer" },
  { von: ["eingereicht"], nach: "in_pruefung", wer: "compliance" },
  { von: ["eingereicht", "in_pruefung"], nach: "verifiziert", wer: "compliance" },
  { von: ["eingereicht", "in_pruefung"], nach: "zweitpruefung", wer: "compliance" },
  { von: ["eingereicht", "in_pruefung", "zweitpruefung"], nach: "nachgefordert", wer: "compliance" },
  { von: ["eingereicht", "in_pruefung", "zweitpruefung"], nach: "abgelehnt", wer: "compliance" },
  { von: ["zweitpruefung"], nach: "verifiziert", wer: "compliance" },
  { von: ["verifiziert"], nach: "abgelaufen", wer: "system" },
  { von: ["verifiziert", "abgelehnt"], nach: "offen", wer: "nutzer" }, // erneute Prüfung (z. B. neue Angaben)
];

export function kycUebergangErlaubt(von, nach, wer) {
  return KYC_UEBERGAENGE.some((u) => u.nach === nach && u.von.includes(von) && u.wer === wer);
}

export const kycStatusLabel = (s, { intern = false } = {}) => (intern && KYC_STATUS[s]?.intern) || KYC_STATUS[s]?.label || s;

// ================================================================ Dokumente

/**
 * Dokumentarten. `pruefpunkte`: Prüfliste im Backoffice (Schlüssel aus KYC_PRUEFPUNKTE).
 * `bezug`: person (Hauptperson) | vertreter | ubo | flaeche | fall
 */
export const KYC_DOKUMENTE = {
  ausweis_vorne: { label: "Personalausweis – Vorderseite", bezug: "person", pruefpunkte: ["lesbar", "gueltig", "datenStimmen"] },
  ausweis_hinten: { label: "Personalausweis – Rückseite", bezug: "person", pruefpunkte: ["lesbar", "gueltig"] },
  pass_datenseite: { label: "Reisepass – Datenseite", bezug: "person", pruefpunkte: ["lesbar", "gueltig", "datenStimmen"] },
  selfie: { label: "Foto von Ihnen (optional)", bezug: "person", pruefpunkte: ["lesbar", "datenStimmen"] },
  adressnachweis: { label: "Adressnachweis (optional)", bezug: "person", pruefpunkte: ["lesbar", "aktuell", "datenStimmen"] },
  registerauszug: { label: "Registerauszug (Handelsregister / Firmenbuch / Zefix)", bezug: "fall", pruefpunkte: ["lesbar", "aktuell", "datenStimmen"] },
  gesellschafterliste: { label: "Gesellschafterliste (optional)", bezug: "fall", pruefpunkte: ["lesbar", "aktuell", "uboPlausibel"] },
  satzung: { label: "Gesellschaftsvertrag / Satzung (optional)", bezug: "fall", pruefpunkte: ["lesbar"] },
  transparenzregister: { label: "Auszug Transparenzregister / WiEReG-Register / Erklärung wirtschaftlich Berechtigte", bezug: "fall", pruefpunkte: ["lesbar", "aktuell", "uboPlausibel"] },
  vertreter_ausweis: { label: "Ausweis einer vertretungsberechtigten Person", bezug: "vertreter", pruefpunkte: ["lesbar", "gueltig", "datenStimmen"] },
  vollmacht: { label: "Vollmacht", bezug: "fall", pruefpunkte: ["lesbar", "gueltig", "datenStimmen"] },
  eigentumsnachweis: { label: "Eigentumsnachweis (Grundbuchauszug)", bezug: "flaeche", pruefpunkte: ["lesbar", "aktuell", "datenStimmen"] },
  mittelherkunft: { label: "Nachweis zur Herkunft der Mittel", bezug: "fall", pruefpunkte: ["lesbar", "datenStimmen"] },
  bank_nachweis: { label: "Kontonachweis (optional, z. B. Kopf eines Kontoauszugs)", bezug: "fall", pruefpunkte: ["lesbar", "datenStimmen"] },
};
export const KYC_DOKUMENT_IDS = Object.keys(KYC_DOKUMENTE);

export const KYC_PRUEFPUNKTE = {
  lesbar: "Vollständig lesbar, keine Manipulationsspuren",
  gueltig: "Gültig (nicht abgelaufen, echt, unterschrieben)",
  datenStimmen: "Name / Geburtsdatum bzw. Firma stimmen mit den Angaben überein",
  aktuell: "Aktuell (Registerauszug nicht älter als 3 Monate)",
  uboPlausibel: "Wirtschaftlich Berechtigte plausibel (≥ 25 % bzw. Kontrolle)",
};

/** Hinweis zum Schwärzen – vorsichtig formuliert (GwG verlangt Art, Nummer und Behörde des Ausweises) */
export const KYC_SCHWAERZEN_HINWEIS =
  "Bitte schwärzen Sie vor dem Hochladen die Zugangsnummer (CAN, sechsstellig auf der Vorderseite des Personalausweises) sowie Angaben, die für die Identifizierung nicht benötigt werden (z. B. Körpergröße, Augenfarbe). Name, Geburtsdatum, Geburtsort, Staatsangehörigkeit, Anschrift, Foto, Ausweisnummer, ausstellende Behörde und Gültigkeit müssen lesbar bleiben – diese Angaben sind nach dem Geldwäschegesetz aufzuzeichnen. Kennzeichnen Sie die Kopie gern als „Kopie“.";

export const KYC_UPLOAD = { maxBytes: 10 * 1024 * 1024, typen: { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" } };
export const KYC_REGISTERAUSZUG_MAX_TAGE = 92; // „nicht älter als 3 Monate“

// ================================================================ Register je Land

export const KYC_REGISTER = {
  DE: { firma: "Handelsregister (HRA/HRB), Genossenschafts- oder Vereinsregister", nummer: "z. B. HRB 12345, Amtsgericht München", ubo: "Transparenzregister (Auszug über transparenzregister.de)", grundbuch: "Grundbuchauszug (Grundbuchamt)" },
  AT: { firma: "Firmenbuch", nummer: "z. B. FN 123456a, LG Ried im Innkreis", ubo: "Register der wirtschaftlichen Eigentümer (WiEReG-Auszug)", grundbuch: "Grundbuchauszug (Bezirksgericht)" },
  CH: { firma: "Handelsregister (Zefix)", nummer: "z. B. CHE-123.456.789", ubo: "Erklärung zu den wirtschaftlich Berechtigten bzw. Auszug Transparenzregister (sobald verfügbar)", grundbuch: "Grundbuchauszug (Grundbuchamt des Kantons)" },
};

export const KYC_KONTROLLE_ARTEN = {
  anteil: "Kapitalanteil ≥ 25 %",
  stimmrechte: "Stimmrechte ≥ 25 %",
  kontrolle: "Kontrolle auf andere Weise",
  fiktiv: "Fiktiver wirtschaftlich Berechtigter (gesetzlicher Vertreter)",
};

export const KYC_MITTEL_QUELLEN = {
  eigenkapital: "Eigenkapital / Gewinnrücklagen",
  einkommen: "Einkommen / Ersparnisse",
  verkauf: "Veräußerungserlös (Immobilie, Beteiligung)",
  erbe: "Erbschaft / Schenkung",
  fonds: "Fonds- / Investorenmittel",
  finanzierung: "Bankfinanzierung",
  sonstiges: "Sonstiges",
};

export const KYC_TICKETS = {
  bis250k: { label: "bis 250.000 €", betrag: 250000 },
  bis1m: { label: "250.000 € – 1 Mio. €", betrag: 1000000 },
  bis5m: { label: "1 – 5 Mio. €", betrag: 5000000 },
  ueber5m: { label: "über 5 Mio. €", betrag: 50000000 },
};

// ================================================================ Freigabe-Schritte (Gating)

export const KYC_SCHRITTE = {
  nda: { label: "NDA-Freigabe / Datenraum", hinweis: "Um den Datenraum zu öffnen, bitte Verifizierung abschließen.", wer: "Investor" },
  loi: { label: "Absichtserklärung (LOI)", hinweis: "Um eine Absichtserklärung abzugeben, bitte Verifizierung abschließen.", wer: "Investor" },
  gebot: { label: "Gebot im Bieterverfahren", hinweis: "Um ein Gebot abzugeben, bitte Verifizierung abschließen.", wer: "Investor" },
  zuschlag: { label: "Zuschlag", hinweis: "Ein Zuschlag ist erst nach abgeschlossener Verifizierung des Bieters möglich.", wer: "Investor" },
  veroeffentlichung: { label: "Projekt-Veröffentlichung", hinweis: "Projekte werden erst nach abgeschlossener Verifizierung des Anbieters (KYB) veröffentlicht.", wer: "Anbieter" },
  auszahlung: { label: "Pachtauszahlung / Gutschrift", hinweis: "Auszahlungen setzen eine abgeschlossene Verifizierung, eine geprüfte Bankverbindung und einen Eigentumsnachweis voraus.", wer: "Eigentümer" },
  contracting: { label: "Contracting-Vertrag", hinweis: "Contracting-Verträge setzen eine abgeschlossene Verifizierung des Kunden (KYB) voraus.", wer: "Kunde" },
  codevelopment: { label: "Co-Development (Projektentwicklung)", hinweis: "Die Co-Development-Freigabe eines Entwicklungsprojekts setzt eine abgeschlossene Verifizierung voraus.", wer: "Investor" },
};
export const KYC_SCHRITT_IDS = Object.keys(KYC_SCHRITTE);

export function kycEinstellungenStandard() {
  return {
    gating: Object.fromEntries(KYC_SCHRITT_IDS.map((s) => [s, true])), // Standard: an
    geltung: null, // null = aus Umgebung (PLATTFORM_KYC_GATING); "alle" | "pilot" | "aus"
    pilotKonten: [],
    vierAugenBeiHoch: true,
    vierAugenImmer: false,
    trefferSchwelle: 0.88,
    // FATF „Call for Action“ (DPRK, Iran, Myanmar) – vollständige EU-Liste (Delegierte VO (EU) 2016/1675 i. d. j. g. F.) hier pflegen
    hochrisikoLaender: ["KP", "IR", "MM"],
    wiederholungMonate: { niedrig: 36, mittel: 24, hoch: 12 },
    mittelherkunftNachweisAb: 1000000,
    aufbewahrungJahre: 5,
    erinnerungAusweisTage: 30,
  };
}

// ================================================================ IBAN

const IBAN_LAENGE = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GI: 23, GR: 27, HR: 21,
  HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19,
  SK: 24, SM: 27, VA: 22,
};
export const SEPA_LAENDER = Object.keys(IBAN_LAENGE);

export function ibanNormalisieren(s) {
  return String(s || "").toUpperCase().replace(/[\s-]/g, "");
}

/** Prüfziffer nach ISO 13616 (mod 97 = 1) und Länge je Land. Liefert { ok, iban, land, fehler } */
export function ibanPruefen(eingabe) {
  const iban = ibanNormalisieren(eingabe);
  if (!iban) return { ok: false, iban: "", land: "", fehler: "Bitte geben Sie eine IBAN an." };
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{8,30}$/.test(iban)) return { ok: false, iban, land: iban.slice(0, 2), fehler: "Die IBAN hat ein ungültiges Format." };
  const land = iban.slice(0, 2);
  if (IBAN_LAENGE[land] && iban.length !== IBAN_LAENGE[land]) return { ok: false, iban, land, fehler: `Eine IBAN aus ${land} hat ${IBAN_LAENGE[land]} Zeichen.` };
  const umgestellt = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of umgestellt) {
    const wert = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const z of wert) rest = (rest * 10 + Number(z)) % 97;
  }
  if (rest !== 1) return { ok: false, iban, land, fehler: "Die Prüfziffer der IBAN stimmt nicht – bitte Eingabe prüfen." };
  return { ok: true, iban, land, fehler: "" };
}

export function ibanFormatiert(iban) {
  return ibanNormalisieren(iban).replace(/(.{4})/g, "$1 ").trim();
}

/** Für Anzeigen außerhalb der Compliance: nur Land + letzte 4 Stellen */
export function ibanMaskiert(iban) {
  const i = ibanNormalisieren(iban);
  return i ? `${i.slice(0, 2)}•• •••• ${i.slice(-4)}` : "";
}

// ================================================================ Namen (Kontoinhaber, Sanktionsabgleich)

const RECHTSFORMEN = /\b(gmbh|ag|kg|og|ohg|gbr|ug|haftungsbeschrankt|mbh|co|eg|ev|se|sa|sarl|ltd|llc|inc|kgaa|stiftung|verein|genossenschaft|e\.?\s?u|eu)\b/g;

export function nameNormalisieren(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/\(demo\)|\(fiktiv\)|\(test\)/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const nameTokens = (s, { firma = false } = {}) => {
  let n = nameNormalisieren(s);
  if (firma) n = n.replace(RECHTSFORMEN, " ").replace(/\s+/g, " ").trim();
  return n.split(" ").filter((t) => t.length > 1 && !["und", "the", "von", "van", "der", "de", "dr", "mag", "ing", "prof"].includes(t));
};

/** Stimmt der Kontoinhaber mit der geprüften Person bzw. Firma überein? */
export function kontoinhaberPasst(inhaber, { vorname = "", nachname = "", firma = "" } = {}) {
  const t = new Set(nameTokens(inhaber, { firma: !!firma }));
  if (!t.size) return false;
  if (firma) {
    const f = nameTokens(firma, { firma: true });
    return f.length > 0 && f.every((x) => t.has(x));
  }
  const soll = [...nameTokens(vorname), ...nameTokens(nachname)];
  const nach = nameTokens(nachname);
  if (!nach.length) return false;
  // Nachname vollständig, Vorname mindestens der erste Vorname (oder Initiale)
  const vor = nameTokens(vorname);
  const vornameOk = !vor.length || t.has(vor[0]) || [...t].some((x) => x.length === 1 && x === vor[0][0]);
  return soll.length > 0 && nach.every((x) => t.has(x)) && vornameOk;
}

// ================================================================ Datum

export const heuteIso = (d = new Date()) => heuteLokal(d); // Europe/Vienna (Fristen: Ausweis, Wiederholungsprüfung, Löschung)
export function tageBis(datumIso, jetzt = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datumIso || ""))) return null;
  return Math.floor((new Date(`${datumIso}T00:00:00Z`).getTime() - new Date(`${heuteIso(jetzt)}T00:00:00Z`).getTime()) / 86400000);
}
export function monateSpaeter(datumIso, monate) {
  const d = new Date(`${String(datumIso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCMonth(d.getUTCMonth() + monate);
  return d.toISOString().slice(0, 10);
}
/** Aufbewahrung: 5 Jahre ab Schluss des Kalenderjahres, in dem die Geschäftsbeziehung endete (§ 8 Abs. 4 GwG) */
export function loeschenAb(endeIso, jahre = 5) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(endeIso || ""))) return null;
  const jahr = Number(String(endeIso).slice(0, 4));
  return `${jahr + jahre + 1}-01-01`;
}

// ================================================================ Anforderungen je Fall

/**
 * Investorentyp aus dem Suchprofil (fach/suchprofil.js INVESTOR_TYPEN) → Vorgaben für den KYC-Fall:
 * vorgeschlagener Kontotyp, zusätzliche Pflichtunterlagen (nur KYB) und Hinweis für Nutzer und Compliance.
 * Der Typ wird beim Anlegen des Falls übernommen (fall.investorTyp) und beim Einreichen aktualisiert.
 * Über vereinfachte Sorgfaltspflichten (beaufsichtigte Einrichtungen) entscheidet immer die Compliance im Einzelfall.
 */
export const KYC_INVESTOR_TYPEN = {
  family_office: { kontotyp: "unternehmen", pflichtDokumente: ["gesellschafterliste"], hinweis: "Family Office: Häufig mehrstufige Holding- oder Stiftungsstrukturen – bitte die wirtschaftlich Berechtigten bis zur natürlichen Person angeben und die Gesellschafterliste beifügen." },
  fonds: { kontotyp: "unternehmen", pflichtDokumente: ["satzung"], reguliert: true, hinweis: "Fonds / Asset Manager: Angaben zur Kapitalverwaltungsgesellschaft bzw. zum Fonds (Register, Aufsicht) und Gesellschaftsvertrag bzw. Anlagebedingungen beifügen. Bei beaufsichtigten Einrichtungen können vereinfachte Sorgfaltspflichten in Betracht kommen – darüber entscheidet die Compliance." },
  stadtwerk: { kontotyp: "unternehmen", pflichtDokumente: ["gesellschafterliste"], hinweis: "Stadtwerk / kommunales Unternehmen: Gesellschafterliste (Beteiligung der Kommune) beifügen. Ist keine natürliche Person wirtschaftlich berechtigt, sind in der Regel die gesetzlichen Vertreter als fiktive wirtschaftlich Berechtigte anzugeben." },
  evu: { kontotyp: "unternehmen", pflichtDokumente: ["gesellschafterliste"], hinweis: "Energieversorger: Konzern- bzw. Beteiligungsstruktur mit der Gesellschafterliste offenlegen." },
  ipp: { kontotyp: "unternehmen", pflichtDokumente: ["gesellschafterliste"], hinweis: "Unabhängiger Stromerzeuger (IPP): Konzern- bzw. Beteiligungsstruktur mit der Gesellschafterliste offenlegen." },
  versicherung: { kontotyp: "unternehmen", pflichtDokumente: ["satzung"], reguliert: true, hinweis: "Versicherung / Pensionskasse: Satzung beifügen und die zuständige Aufsicht angeben. Bei beaufsichtigten Einrichtungen können vereinfachte Sorgfaltspflichten in Betracht kommen – darüber entscheidet die Compliance." },
  unternehmen: { kontotyp: "unternehmen", pflichtDokumente: [], hinweis: "Unternehmen: Prüfung der Firma (KYB) mit wirtschaftlich Berechtigten und vertretungsberechtigten Personen." },
  privat: { kontotyp: "privat", pflichtDokumente: [], hinweis: "Privatinvestor: Prüfung als natürliche Person; bitte die Herkunft der Mittel angeben." },
  genossenschaft: { kontotyp: "unternehmen", pflichtDokumente: ["satzung"], hinweis: "Energiegenossenschaft: Satzung beifügen. Bei breiter Mitgliederstruktur sind in der Regel die Vorstandsmitglieder als fiktive wirtschaftlich Berechtigte anzugeben." },
};

/** Vorgaben für einen Investorentyp (oder null) – { typ, label, kontotyp, pflichtDokumente, reguliert, hinweis } */
export function kycInvestorVorgaben(investorTyp) {
  const x = KYC_INVESTOR_TYPEN[investorTyp];
  return x ? { typ: investorTyp, label: INVESTOR_TYPEN[investorTyp], reguliert: false, ...x } : null;
}

const gefuellt = (...w) => w.every((x) => x !== undefined && x !== null && String(x).trim() !== "");

/**
 * Anforderungen (Checkliste für Nutzer und Compliance). `kontext`:
 *   rollen[]      Rollen des Kontos (investor → Mittelherkunft; flaeche/landwirt → Eigentum + Auszahlung)
 *   flaechen[]    eigene Flächen [{ id, bezeichnung, land }]
 *   einstellungen KYC-Einstellungen
 * Liefert [{ id, gruppe, label, pflicht, erfuellt, hinweis, dokumentArt?, flaecheId?, personId? }]
 */
export function kycAnforderungen(fall, { rollen = [], flaechen = [], einstellungen = kycEinstellungenStandard() } = {}) {
  const f = fall || {};
  const docs = (f.dokumente || []).filter((d) => !d.geloescht && d.status !== "abgelehnt");
  const hat = (art, pred = () => true) => docs.some((d) => d.art === art && pred(d));
  const a = [];
  const add = (x) => a.push({ pflicht: true, ...x });
  const typ = f.kontotyp || "";
  add({ id: "kontotyp", gruppe: "Start", label: "Kontotyp gewählt", erfuellt: !!KYC_KONTOTYPEN[typ] });
  const it = KYC_INVESTOR_TYPEN[f.investorTyp];
  if (it) add({ id: "investortyp", gruppe: "Start", label: `Investorentyp (aus Ihrem Suchprofil): ${INVESTOR_TYPEN[f.investorTyp]}`, pflicht: false, erfuellt: true, hinweis: it.hinweis });
  if (!typ) return a;

  const p = f.person || {};
  const adr = p.adresse || {};
  add({ id: "person", gruppe: "Angaben", label: typ === "unternehmen" ? "Angaben zu Ihrer Person (handelnde Person)" : "Angaben zur Person", erfuellt: gefuellt(p.vorname, p.nachname, p.geburtsdatum, p.geburtsort, p.staatsangehoerigkeit, adr.strasse, adr.plz, adr.ort, adr.land) });
  const ausweis = p.ausweis || {};
  const ausweisTage = tageBis(ausweis.gueltigBis);
  add({
    id: "ausweis_angaben", gruppe: "Angaben", label: "Ausweisdaten (Art, Nummer, Behörde, gültig bis)",
    erfuellt: gefuellt(ausweis.art, ausweis.nummer, ausweis.behoerde, ausweis.gueltigBis) && ausweisTage !== null && ausweisTage >= 0,
    hinweis: ausweisTage !== null && ausweisTage < 0 ? "Der Ausweis ist abgelaufen – bitte ein gültiges Dokument verwenden." : "",
  });
  const pass = ausweis.art === "reisepass";
  if (pass) add({ id: "doc_pass", gruppe: "Unterlagen", label: KYC_DOKUMENTE.pass_datenseite.label, dokumentArt: "pass_datenseite", erfuellt: hat("pass_datenseite") });
  else {
    add({ id: "doc_ausweis_vorne", gruppe: "Unterlagen", label: KYC_DOKUMENTE.ausweis_vorne.label, dokumentArt: "ausweis_vorne", erfuellt: hat("ausweis_vorne") });
    add({ id: "doc_ausweis_hinten", gruppe: "Unterlagen", label: KYC_DOKUMENTE.ausweis_hinten.label, dokumentArt: "ausweis_hinten", erfuellt: hat("ausweis_hinten") });
  }
  add({ id: "doc_selfie", gruppe: "Unterlagen", label: KYC_DOKUMENTE.selfie.label, dokumentArt: "selfie", pflicht: false, erfuellt: hat("selfie") });

  if (typ === "unternehmen") {
    const fi = f.firma || {};
    const reg = KYC_REGISTER[fi.land] || KYC_REGISTER.DE;
    add({ id: "firma", gruppe: "Unternehmen", label: "Angaben zum Unternehmen (Firma, Rechtsform, Register, Sitz)", erfuellt: gefuellt(fi.name, fi.rechtsform, fi.registernummer, fi.land, fi.sitz) });
    add({
      id: "doc_registerauszug", gruppe: "Unternehmen", label: `${reg.firma} – Auszug nicht älter als 3 Monate`, dokumentArt: "registerauszug",
      erfuellt: hat("registerauszug", (d) => !d.ausgestelltAm || (tageBis(d.ausgestelltAm) ?? 0) >= -KYC_REGISTERAUSZUG_MAX_TAGE),
      hinweis: hat("registerauszug") && !hat("registerauszug", (d) => !d.ausgestelltAm || (tageBis(d.ausgestelltAm) ?? 0) >= -KYC_REGISTERAUSZUG_MAX_TAGE) ? "Der Auszug ist älter als 3 Monate." : "",
    });
    add({ id: "doc_transparenzregister", gruppe: "Unternehmen", label: reg.ubo, dokumentArt: "transparenzregister", erfuellt: hat("transparenzregister") });
    // Investorentyp aus dem Suchprofil: je Typ zusätzliche Pflichtunterlagen (KYC_INVESTOR_TYPEN)
    const extra = KYC_INVESTOR_TYPEN[f.investorTyp]?.pflichtDokumente || [];
    const optional = (art) => !extra.includes(art);
    const dokLabel = (art) => (optional(art) ? KYC_DOKUMENTE[art].label : KYC_DOKUMENTE[art].label.replace(" (optional)", ""));
    add({ id: "doc_gesellschafterliste", gruppe: "Unternehmen", label: dokLabel("gesellschafterliste"), dokumentArt: "gesellschafterliste", pflicht: !optional("gesellschafterliste"), erfuellt: hat("gesellschafterliste") });
    add({ id: "doc_satzung", gruppe: "Unternehmen", label: dokLabel("satzung"), dokumentArt: "satzung", pflicht: !optional("satzung"), erfuellt: hat("satzung") });
    const ubos = f.ubos || [];
    const uboOk = ubos.length > 0 && ubos.every((u) => gefuellt(u.vorname, u.nachname, u.geburtsdatum, u.wohnsitzland, u.kontrolleArt) && (u.kontrolleArt === "kontrolle" || u.kontrolleArt === "fiktiv" || Number(u.anteil) >= 25));
    add({ id: "ubos", gruppe: "Wirtschaftlich Berechtigte", label: "Wirtschaftlich Berechtigte (Anteil ≥ 25 % bzw. Kontrolle) erfasst", erfuellt: uboOk, hinweis: "Wer mehr als 25 % der Kapitalanteile oder Stimmrechte hält oder auf andere Weise Kontrolle ausübt. Gibt es keine solche Person, gilt der gesetzliche Vertreter als fiktiver wirtschaftlich Berechtigter." });
    const vertreter = f.vertreter || [];
    add({ id: "vertreter", gruppe: "Vertretung", label: "Vertretungsberechtigte Person(en) erfasst", erfuellt: vertreter.length > 0 && vertreter.every((x) => gefuellt(x.vorname, x.nachname, x.geburtsdatum, x.funktion)) });
    for (const x of vertreter) {
      add({ id: `doc_vertreter_${x.id}`, gruppe: "Vertretung", label: `Ausweis ${[x.vorname, x.nachname].filter(Boolean).join(" ") || "Vertreter"}`, dokumentArt: "vertreter_ausweis", personId: x.id, erfuellt: hat("vertreter_ausweis", (d) => d.personId === x.id) || !!x.istEinreicher });
    }
    if (f.einreicherVertretungsberechtigt === false) add({ id: "doc_vollmacht", gruppe: "Vertretung", label: "Vollmacht (Sie sind nicht selbst vertretungsberechtigt)", dokumentArt: "vollmacht", erfuellt: hat("vollmacht") });
  }

  const pep = f.pep || {};
  add({ id: "pep", gruppe: "Erklärungen", label: "Selbstauskunft politisch exponierte Person (PEP)", erfuellt: typeof pep.istPep === "boolean" && typeof pep.naheStehend === "boolean" && (!(pep.istPep || pep.naheStehend) || gefuellt(pep.funktion)) });

  if (rollen.includes("investor")) {
    const m = f.mittelherkunft || {};
    add({ id: "mittelherkunft", gruppe: "Erklärungen", label: "Herkunft der Mittel und geplante Ticketgröße", erfuellt: !!KYC_TICKETS[m.ticket] && (m.quellen || []).length > 0 });
    const betrag = KYC_TICKETS[m.ticket]?.betrag || 0;
    if (betrag >= (einstellungen.mittelherkunftNachweisAb || 1000000) || (f.risiko?.stufe === "hoch")) {
      add({ id: "doc_mittelherkunft", gruppe: "Erklärungen", label: "Nachweis zur Herkunft der Mittel (ab 1 Mio. € bzw. bei hohem Risiko)", dokumentArt: "mittelherkunft", erfuellt: hat("mittelherkunft") });
    }
  }
  add({ id: "steuer", gruppe: "Erklärungen", label: "Steuerliche Ansässigkeit (optional)", pflicht: false, erfuellt: gefuellt(f.steuer?.land) });

  if (rollen.includes("flaeche") || rollen.includes("landwirt")) {
    const b = f.bank || {};
    const ib = ibanPruefen(b.iban);
    const inhaberOk = kontoinhaberPasst(b.kontoinhaber, typ === "unternehmen" ? { firma: f.firma?.name } : { vorname: p.vorname, nachname: p.nachname });
    add({ id: "bank", gruppe: "Auszahlung", label: "Bankverbindung für Pachtzahlungen (IBAN + Kontoinhaber)", pflicht: false, erfuellt: ib.ok && inhaberOk, hinweis: b.iban && !ib.ok ? ib.fehler : b.iban && !inhaberOk ? "Der Kontoinhaber muss mit der geprüften Person bzw. Firma übereinstimmen." : "Für Pachtauszahlungen erforderlich." });
    for (const fl of flaechen) {
      add({ id: `doc_eigentum_${fl.id}`, gruppe: "Eigentum", label: `Eigentumsnachweis: ${fl.bezeichnung}`, dokumentArt: "eigentumsnachweis", flaecheId: fl.id, pflicht: false, erfuellt: hat("eigentumsnachweis", (d) => d.flaecheId === fl.id), hinweis: `${(KYC_REGISTER[fl.land] || KYC_REGISTER.DE).grundbuch} – für Auszahlungen erforderlich.` });
    }
  }
  return a;
}

export function kycFortschritt(anforderungen = []) {
  const pflicht = anforderungen.filter((x) => x.pflicht);
  const erfuellt = pflicht.filter((x) => x.erfuellt).length;
  return { erfuellt, gesamt: pflicht.length, quote: pflicht.length ? Math.round((erfuellt / pflicht.length) * 100) : 0, fehlend: pflicht.filter((x) => !x.erfuellt) };
}

// ================================================================ Risiko

/**
 * Risikoeinstufung nach Regeln (Land, PEP, Struktur, Ticketgröße, Sanktionstreffer).
 * Liefert { stufe: niedrig|mittel|hoch, punkte, gruende[] }. Compliance kann manuell höher/niedriger einstufen (mit Begründung).
 */
export function kycRisiko(fall, einstellungen = kycEinstellungenStandard()) {
  const f = fall || {};
  const hoch = new Set((einstellungen.hochrisikoLaender || []).map((x) => String(x).toUpperCase()));
  const gruende = [];
  let punkte = 0;
  const plus = (n, g) => {
    punkte += n;
    gruende.push(g);
  };
  const dach = ["DE", "AT", "CH", "LI"];
  const eu = ["BE", "BG", "CY", "CZ", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "IS", "NO"];
  const laender = [f.person?.adresse?.land, f.person?.staatsangehoerigkeit, f.firma?.land, ...(f.ubos || []).map((u) => u.wohnsitzland)].filter(Boolean).map((x) => String(x).toUpperCase());
  if (laender.some((l) => hoch.has(l))) plus(4, "Bezug zu einem Drittland mit hohem Risiko");
  else if (laender.some((l) => !dach.includes(l) && !eu.includes(l))) plus(2, "Bezug außerhalb EU/EWR/Schweiz");
  else if (laender.some((l) => !dach.includes(l))) plus(1, "Bezug zu einem EU/EWR-Land außerhalb DACH");
  if (f.pep?.istPep) plus(4, "Politisch exponierte Person (verstärkte Sorgfaltspflichten)");
  else if (f.pep?.naheStehend) plus(4, "Familienangehöriger/nahestehende Person einer PEP");
  if ((f.ubos || []).some((u) => u.pep)) plus(4, "Wirtschaftlich Berechtigter ist PEP");
  if (f.kontotyp === "unternehmen") {
    const ubos = f.ubos || [];
    if (!ubos.length || ubos.every((u) => u.kontrolleArt === "fiktiv")) plus(2, "Kein wirtschaftlich Berechtigter über Anteile ermittelbar (fiktiver wB)");
    if (f.firma?.mehrstufig) plus(2, "Mehrstufige Beteiligungsstruktur");
    if (f.firma?.treuhand) plus(2, "Treuhand-/Stiftungsstruktur");
  }
  const betrag = KYC_TICKETS[f.mittelherkunft?.ticket]?.betrag || 0;
  if (betrag > 5000000) plus(2, "Ticketgröße über 5 Mio. €");
  else if (betrag > 1000000) plus(1, "Ticketgröße über 1 Mio. €");
  if (f.sanktionen?.status === "treffer_pruefen" || f.sanktionen?.status === "bestaetigt") plus(4, "Möglicher Treffer im Sanktionslisten-Abgleich");
  const stufe = punkte >= 4 ? "hoch" : punkte >= 2 ? "mittel" : "niedrig";
  return { stufe, punkte, gruende };
}

export const KYC_RISIKO = { niedrig: { label: "Niedrig", ton: "ok" }, mittel: { label: "Mittel", ton: "info" }, hoch: { label: "Hoch", ton: "warn" } };

// ================================================================ Gating

/** Geltung der Freigabe-Sperren: Einstellung > Umgebung > Standard (Produktion „alle“, Entwicklung „pilot“) */
export function kycGeltung(einstellungen = {}, env = {}) {
  const e = einstellungen?.geltung;
  if (["alle", "pilot", "aus"].includes(e)) return e;
  const u = String(env.PLATTFORM_KYC_GATING || "").toLowerCase();
  if (["alle", "pilot", "aus"].includes(u)) return u;
  if (u === "an" || u === "1") return "alle";
  return env.NODE_ENV === "production" ? "alle" : "pilot";
}

/** Ist der Schritt für dieses Konto gesperrt, solange es nicht verifiziert ist? */
export function kycSchrittAktiv(schritt, kontoId, einstellungen = kycEinstellungenStandard(), env = {}) {
  const e = { ...kycEinstellungenStandard(), ...(einstellungen || {}) };
  if (!KYC_SCHRITTE[schritt] || e.gating?.[schritt] === false) return false;
  const g = kycGeltung(e, env);
  if (g === "aus") return false;
  if (g === "pilot") return (e.pilotKonten || []).includes(kontoId);
  return true;
}

/**
 * Freigabe-Entscheidung aus einem (bereits ermittelten) KYC-Status.
 * status: Ergebnis von kycStatus(); extra: { flaecheId } für Auszahlungen.
 */
export function kycFreigabe(schritt, status, { aktiv = true, flaecheId = null } = {}) {
  const def = KYC_SCHRITTE[schritt];
  if (!def) return { ok: false, aktiv: true, gruende: ["Unbekannter Schritt."], hinweis: "" };
  if (!aktiv) return { ok: true, aktiv: false, gruende: [], hinweis: "" };
  const gruende = [];
  if (!status?.verifiziert) gruende.push(status?.status === "abgelaufen" ? "Die Verifizierung muss erneuert werden." : "Die Verifizierung ist nicht abgeschlossen.");
  if (schritt === "auszahlung") {
    if (!status?.bank?.geprueft) gruende.push("Es fehlt eine geprüfte Bankverbindung (IBAN, Kontoinhaber = verifizierte Person/Firma).");
    if (flaecheId && !(status?.eigentum || []).includes(flaecheId)) gruende.push("Für diese Fläche liegt kein geprüfter Eigentumsnachweis vor.");
  }
  return { ok: gruende.length === 0, aktiv: true, gruende, hinweis: gruende.length ? def.hinweis : "" };
}

// ================================================================ Länder (Auswahl; weitere per ISO-Code)

export const KYC_LAENDER = {
  DE: "Deutschland", AT: "Österreich", CH: "Schweiz", LI: "Liechtenstein", IT: "Italien", FR: "Frankreich", NL: "Niederlande", BE: "Belgien",
  LU: "Luxemburg", DK: "Dänemark", PL: "Polen", CZ: "Tschechien", SK: "Slowakei", HU: "Ungarn", SI: "Slowenien", HR: "Kroatien", ES: "Spanien",
  PT: "Portugal", IE: "Irland", SE: "Schweden", FI: "Finnland", NO: "Norwegen", GB: "Vereinigtes Königreich", US: "Vereinigte Staaten",
  RO: "Rumänien", BG: "Bulgarien", GR: "Griechenland", TR: "Türkei", UA: "Ukraine", AE: "Vereinigte Arabische Emirate",
};
export const kycLand = (c) => KYC_LAENDER[c] || c || "–";
