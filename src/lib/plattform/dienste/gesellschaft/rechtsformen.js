// src/lib/plattform/dienste/gesellschaft/rechtsformen.js
//
// SPV-/GmbH-Gründungsassistent – Regeln je Land und Rechtsform (client- und serverseitig, keine Node-Importe):
// Mindestkapital, Mindesteinzahlung, Gründungsschritte (Checkliste), Status, Fristen (Meldungen, Jahresabschluss).
// Frappe-Gegenstück: plattform/dienste_kern.py (RECHTSFORMEN, schritte_fuer, status_aus_schritten, fristen_fuer).
//
// Quellen und Stand der Werte: docs/DIENSTE-EXTERN.md, Abschnitt „Gründung“. Werte vor jeder Gründung mit dem
// Notariat abstimmen – die Plattform erstellt MUSTER zur notariellen Prüfung, keine Rechtsberatung.

export const GESELLSCHAFT_LAENDER = { AT: "Österreich", DE: "Deutschland", CH: "Schweiz" };

/**
 * Rechtsformen. kapital = Mindest-Stammkapital, einzahlung = Mindesteinzahlung bei Gründung (bar), waehrung.
 * beurkundung: Form der Gründung; register: Register und Nummer; gegenstandPflicht: Unternehmensgegenstand im Vertrag.
 */
export const RECHTSFORMEN = {
  at_gmbh: {
    land: "AT", label: "GmbH (Österreich)", kurz: "GmbH", waehrung: "EUR", kapital: 10000, einzahlung: 5000,
    einzahlungText: "Mindeststammkapital 10.000 € (seit 01.01.2024, GesRÄG 2023); bar einzuzahlen sind mindestens die Hälfte des Mindeststammkapitals (5.000 €) bzw. je Bareinlage mindestens ein Viertel.",
    beurkundung: "Notariatsakt (Präsenz oder elektronisch per Video-Notar nach § 69b NO)",
    register: "Firmenbuch (FN)", nummerBeispiel: "FN 123456a",
    musterprotokoll: false,
    hinweis: "Die frühere Gründungsprivilegierung ist mit der Senkung des Mindeststammkapitals entfallen (nach aktuellem Stand; mit dem Notariat abstimmen).",
  },
  de_gmbh: {
    land: "DE", label: "GmbH (Deutschland)", kurz: "GmbH", waehrung: "EUR", kapital: 25000, einzahlung: 12500,
    einzahlungText: "Stammkapital mindestens 25.000 €; vor Anmeldung eingezahlt: je Geschäftsanteil mindestens ein Viertel, insgesamt mindestens 12.500 € (§§ 5, 7 GmbHG).",
    beurkundung: "Notarielle Beurkundung (Präsenz oder Online über das Videokommunikationssystem der Bundesnotarkammer)",
    register: "Handelsregister Abteilung B (HRB)", nummerBeispiel: "HRB 12345",
    musterprotokoll: true,
    hinweis: "Musterprotokoll (§ 2 Abs. 1a GmbHG) nur bei höchstens drei Gesellschaftern und einem Geschäftsführer.",
  },
  de_ug: {
    land: "DE", label: "UG (haftungsbeschränkt) (Deutschland)", kurz: "UG (haftungsbeschränkt)", waehrung: "EUR", kapital: 1, einzahlung: 1,
    einzahlungText: "Stammkapital ab 1 €, vor Anmeldung voll und in bar einzuzahlen, keine Sacheinlagen; ein Viertel des Jahresüberschusses in die gesetzliche Rücklage bis 25.000 € erreicht sind (§ 5a GmbHG).",
    beurkundung: "Notarielle Beurkundung (Präsenz oder Online über das Videokommunikationssystem der Bundesnotarkammer)",
    register: "Handelsregister Abteilung B (HRB)", nummerBeispiel: "HRB 12345",
    musterprotokoll: true,
    hinweis: "Für Projektgesellschaften mit Bankfinanzierung meist zu schwach kapitalisiert – eher als Komplementärin einer GmbH & Co. KG gebräuchlich.",
  },
  de_gmbh_co_kg: {
    land: "DE", label: "GmbH & Co. KG (Deutschland)", kurz: "GmbH & Co. KG", waehrung: "EUR", kapital: 0, einzahlung: 0,
    einzahlungText: "Keine gesetzliche Mindesteinlage der Kommanditisten – im Handelsregister wird die Haftsumme eingetragen. Die Komplementär-GmbH braucht selbst mindestens 25.000 € Stammkapital (bzw. UG).",
    beurkundung: "KG-Gesellschaftsvertrag privatschriftlich; Handelsregisteranmeldung mit notarieller Beglaubigung (auch per Video möglich)",
    register: "Handelsregister Abteilung A (HRA)", nummerBeispiel: "HRA 12345",
    musterprotokoll: false,
    komplementaer: true,
    hinweis: "Typische Struktur für Solarpark-Projektgesellschaften: Komplementär-GmbH (Verwaltungs-GmbH) + KG mit ÖkoInvest bzw. Investor als Kommanditist.",
  },
  ch_gmbh: {
    land: "CH", label: "GmbH (Schweiz)", kurz: "GmbH", waehrung: "CHF", kapital: 20000, einzahlung: 20000,
    einzahlungText: "Stammkapital mindestens CHF 20.000, bei Gründung voll zu liberieren (Art. 773, 777c OR); Einzahlung auf ein Kapitaleinzahlungskonto (Sperrkonto) einer Bank.",
    beurkundung: "Öffentliche Urkunde (Urkundsperson/Notariat nach kantonalem Recht)",
    register: "Handelsregister (CHE-Nummer, Zefix)", nummerBeispiel: "CHE-123.456.789",
    musterprotokoll: false,
    hinweis: "Mindestens eine zur Vertretung befugte Person mit Wohnsitz in der Schweiz (Art. 814 Abs. 3 OR).",
  },
};
export const RECHTSFORM_IDS = Object.keys(RECHTSFORMEN);
export const rechtsformenFuer = (land) => RECHTSFORM_IDS.filter((r) => RECHTSFORMEN[r].land === land);

/** Unternehmensgegenstand-Vorlage PV-Kraftwerk */
export function gegenstandVorlage({ land = "AT", typ = "freiflaeche", ort = "" } = {}) {
  const art = { agri: "Agri-Photovoltaik-Anlage", speicher: "Batteriespeicheranlage", carport: "Photovoltaik-Parkplatzüberdachung", hybrid: "Photovoltaik-Kraftwerks mit Batteriespeicher" }[typ] || "Photovoltaik-Freiflächenanlage";
  const standort = ort ? ` am Standort ${ort}` : "";
  const zusatz = land === "CH"
    ? "Die Gesellschaft kann Zweigniederlassungen errichten, sich an anderen Unternehmen beteiligen sowie Grundstücke erwerben, belasten und veräußern."
    : "Die Gesellschaft ist zu allen Geschäften und Maßnahmen berechtigt, die dem Gesellschaftszweck unmittelbar oder mittelbar dienen, insbesondere zum Abschluss von Nutzungs-, Netzanschluss- und Stromlieferverträgen (PPA) sowie zur Beteiligung an anderen Unternehmen, soweit dies keiner behördlichen Erlaubnis bedarf.";
  return `Gegenstand des Unternehmens ist die Planung, Errichtung, der Erwerb und der Betrieb einer ${art}${standort} sowie die Erzeugung, Speicherung und Vermarktung von elektrischer Energie aus erneuerbaren Quellen. ${zusatz}`;
}

// ---------------------------------------------------------------- Gründungsschritte

/**
 * Schritt-Katalog. nur: Rechtsformen (leer = alle), pflicht, frist: { nach: schluessel, tage } relativ zum Erledigungsdatum
 * eines anderen Schritts; feld: zusätzliche Eingabe beim Erledigen (registernummer, betrag, datum_notar, uid …).
 */
const S = [
  { s: "namenspruefung", gruppe: "Vorbereitung", label: "Firmenname geprüft (Registersuche)", pflicht: true, text: "Suche im Register des Sitzlandes; verbindlich prüft das Registergericht (DE: Abstimmung mit der IHK empfohlen)." },
  { s: "komplementaer", nur: ["de_gmbh_co_kg"], gruppe: "Vorbereitung", label: "Komplementär-GmbH vorhanden bzw. gegründet", pflicht: true, text: "Bestehende Verwaltungs-GmbH nutzen oder vorab gründen (eigener Gründungsvorgang)." },
  { s: "unterlagen", gruppe: "Vorbereitung", label: "Dokumentenpaket erstellt und an das Notariat übermittelt", pflicht: true, text: "Muster aus dem Assistenten – das Notariat erstellt die endgültigen Urkunden." },
  { s: "notartermin", gruppe: "Notariat", label: "Notartermin gebucht", pflicht: true, feld: "termin", text: "Präsenz oder Video-Beurkundung; Ausweise aller Beteiligten mitbringen bzw. Online-Identifizierung des Notariats." },
  { s: "beurkundet", gruppe: "Notariat", label: "Gründung beurkundet", pflicht: true, text: "AT: Notariatsakt · DE GmbH: notarielle Urkunde · DE KG: Vertrag unterzeichnet, Anmeldung beglaubigt · CH: öffentliche Urkunde." },
  { s: "bankkonto", gruppe: "Kapital", label: "Bankkonto eröffnet", pflicht: true, text: "CH: Kapitaleinzahlungskonto (Sperrkonto). Kontoeröffnung für eine Gesellschaft in Gründung mit Gründungsurkunde." },
  { s: "einzahlung", gruppe: "Kapital", label: "Stammeinlage eingezahlt, Bankbestätigung liegt vor", pflicht: true, feld: "betrag", text: "Bankbestätigung über die Einzahlung zur freien Verfügung der Geschäftsführung (für die Anmeldung erforderlich)." },
  { s: "anmeldung", gruppe: "Register", label: "Anmeldung zum Register eingereicht", pflicht: true, text: "Elektronisch durch das Notariat (AT Firmenbuch, DE Handelsregister, CH Handelsregisteramt)." },
  { s: "eingetragen", gruppe: "Register", label: "Eingetragen (FN / HRB / HRA / CHE)", pflicht: true, feld: "registernummer", text: "Mit der Eintragung entsteht die Gesellschaft als juristische Person (KG: Haftungsbeschränkung ab Eintragung)." },
  { s: "steuer", gruppe: "Behörden", label: "Steuerliche Erfassung (Steuernummer, UID)", pflicht: true, feld: "uid", frist: { nach: "eingetragen", tage: 30 }, text: "AT: Verf 15 / FinanzOnline, UID-Nummer · DE: Fragebogen zur steuerlichen Erfassung über ELSTER binnen eines Monats · CH: MWST-Pflicht ab CHF 100.000 Umsatz prüfen." },
  { s: "transparenz", gruppe: "Behörden", label: "Wirtschaftliche Eigentümer gemeldet", pflicht: true, frist: { nach: "eingetragen", tage: 28 }, text: "AT: WiEReG-Meldung binnen 4 Wochen nach Eintragung · DE: Transparenzregister (Pflichtmeldung) · CH: Verzeichnis der wirtschaftlich Berechtigten führen (Art. 790a OR)." },
  { s: "gewerbe", gruppe: "Behörden", label: "Gewerbe-/Kammerpflichten geprüft", pflicht: false, text: "DE: Gewerbeanmeldung, sofern der Anlagenbetrieb gewerblich ist · AT: Gewerbeberechtigung/WKO-Mitgliedschaft prüfen · CH: in der Regel keine Anmeldung." },
  { s: "projektrechte", gruppe: "Projekt", label: "Projektrechte übertragen (Einbringungs- bzw. Kaufvertrag)", pflicht: true, text: "Nutzungsverträge, Netzzusage, Genehmigungen, Gutachten auf die Projektgesellschaft übertragen; Zustimmungen der Vertragspartner einholen." },
  { s: "erp", gruppe: "Projekt", label: "Gesellschaft in der Buchhaltung angelegt (ERPNext-Company)", pflicht: false, text: "Nur wenn ERPNext installiert ist – automatisch per Aktion „In ERPNext anlegen“." },
];

export const GRUENDUNG_SCHRITT_STATUS = {
  offen: { label: "Offen", ton: "neutral" },
  in_arbeit: { label: "In Arbeit", ton: "info" },
  erledigt: { label: "Erledigt", ton: "ok" },
  entfaellt: { label: "Entfällt", ton: "neutral" },
};

/** Label je Land/Rechtsform verfeinern */
function schrittLabel(s, rechtsform) {
  const rf = RECHTSFORMEN[rechtsform];
  if (s.s === "beurkundet") return { at_gmbh: "Notariatsakt errichtet (Gesellschaftsvertrag bzw. Errichtungserklärung)", de_gmbh: "Gesellschaftsvertrag notariell beurkundet", de_ug: "Gesellschaftsvertrag bzw. Musterprotokoll notariell beurkundet", de_gmbh_co_kg: "KG-Vertrag unterzeichnet, Handelsregisteranmeldung notariell beglaubigt", ch_gmbh: "Gründung öffentlich beurkundet" }[rechtsform] || s.label;
  if (s.s === "eingetragen") return `Eingetragen im ${rf?.register || "Register"}`;
  if (s.s === "bankkonto" && rechtsform === "ch_gmbh") return "Kapitaleinzahlungskonto (Sperrkonto) eröffnet";
  if (s.s === "einzahlung" && rechtsform === "de_gmbh_co_kg") return "Kommanditeinlage (Haftsumme) eingezahlt";
  if (s.s === "transparenz") return { AT: "WiEReG-Meldung erstattet", DE: "Transparenzregister-Meldung erstattet", CH: "Verzeichnis der wirtschaftlich Berechtigten angelegt" }[rf?.land] || s.label;
  if (s.s === "steuer") return { AT: "Steuernummer und UID beantragt (FinanzOnline / Verf 15)", DE: "Steuerliche Erfassung (ELSTER) und USt-IdNr.", CH: "Steuerliche Anmeldung / MWST geprüft" }[rf?.land] || s.label;
  return s.label;
}

/** Checkliste für eine neue Gesellschaft (alle Schritte „offen“) */
export function schritteFuer(rechtsform) {
  return S.filter((s) => !s.nur || s.nur.includes(rechtsform)).map((s, i) => ({
    schluessel: s.s, reihenfolge: i + 1, gruppe: s.gruppe, label: schrittLabel(s, rechtsform), text: s.text, pflicht: s.pflicht, feld: s.feld || null,
    frist: s.frist || null, status: "offen", datum: null, notiz: "", wert: "", vonId: null,
  }));
}

export const GESELLSCHAFT_STATUS = {
  entwurf: { label: "Entwurf", ton: "neutral" },
  in_gruendung: { label: "In Gründung", ton: "info" },
  eingetragen: { label: "Eingetragen", ton: "info" },
  aktiv: { label: "Aktiv", ton: "ok" },
  bestand: { label: "Bestand", ton: "ok" },
  aufgeloest: { label: "Aufgelöst", ton: "neutral" },
};

/** Status aus der Checkliste (manuelle Status „bestand“/„aufgeloest“ bleiben) */
export function statusAusSchritten(g) {
  if (["bestand", "aufgeloest"].includes(g?.status)) return g.status;
  const sch = g?.schritte || [];
  const fertig = (k) => ["erledigt", "entfaellt"].includes(sch.find((x) => x.schluessel === k)?.status);
  if (sch.length && sch.filter((x) => x.pflicht).every((x) => ["erledigt", "entfaellt"].includes(x.status))) return "aktiv";
  if (fertig("eingetragen")) return "eingetragen";
  if (fertig("beurkundet") || fertig("notartermin") || fertig("anmeldung")) return "in_gruendung";
  return "entwurf";
}

export function fortschritt(g) {
  const p = (g?.schritte || []).filter((x) => x.pflicht);
  const f = p.filter((x) => ["erledigt", "entfaellt"].includes(x.status)).length;
  return { erledigt: f, gesamt: p.length, quote: p.length ? Math.round((f / p.length) * 100) : 0 };
}

const plusTage = (iso, t) => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + t);
  return d.toISOString().slice(0, 10);
};
/** Monate addieren, Tag auf das Monatsende begrenzt (31.12. + 9 Monate = 30.09.) */
const plusMonate = (iso, m) => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  const tag = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + m);
  const letzter = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(tag, letzter));
  return d.toISOString().slice(0, 10);
};

/** Frist Jahresabschluss je Land (Monate nach Bilanzstichtag) */
export const JAHRESABSCHLUSS = {
  AT: { monate: 9, label: "Jahresabschluss beim Firmenbuch einreichen (§ 277 UGB)" },
  DE: { monate: 12, label: "Jahresabschluss offenlegen (Unternehmensregister, § 325 HGB)" },
  CH: { monate: 6, label: "Ordentliche Gesellschafterversammlung – Genehmigung Jahresrechnung (Art. 805 OR)" },
};

/**
 * Fristen einer Gesellschaft: Meldungen nach Eintragung, nächster Jahresabschluss, WiEReG-Jahresprüfung (AT).
 * Liefert [{ art, label, faellig (ISO), erledigt, schritt? }], sortiert nach Fälligkeit.
 */
export function fristenFuer(g, heute = new Date().toISOString().slice(0, 10)) {
  const land = RECHTSFORMEN[g?.rechtsform]?.land || g?.land;
  const out = [];
  for (const s of g?.schritte || []) {
    if (!s.frist) continue;
    const basis = (g.schritte || []).find((x) => x.schluessel === s.frist.nach);
    if (basis?.status !== "erledigt" || !basis.datum) continue;
    out.push({ art: "meldung", schritt: s.schluessel, label: s.label, faellig: plusTage(basis.datum, s.frist.tage), erledigt: ["erledigt", "entfaellt"].includes(s.status) });
  }
  const aktiv = ["eingetragen", "aktiv", "bestand"].includes(statusAusSchritten(g)) || g?.status === "bestand";
  if (aktiv && JAHRESABSCHLUSS[land]) {
    const [mm, tt] = String(g.bilanzstichtag || "12-31").split("-");
    const jahr = Number(heute.slice(0, 4));
    // nächste noch offene Frist für ein Geschäftsjahr, das es schon gibt (Stichtag nach der Gründung)
    let stichtag = "";
    let faellig = "";
    for (const j of [jahr - 1, jahr, jahr + 1]) {
      stichtag = `${j}-${mm}-${tt}`;
      faellig = plusMonate(stichtag, JAHRESABSCHLUSS[land].monate);
      if ((!g.gegruendetAm || stichtag >= String(g.gegruendetAm).slice(0, 10)) && faellig >= heute) break;
    }
    out.push({ art: "abschluss", label: `${JAHRESABSCHLUSS[land].label} – Geschäftsjahr bis ${stichtag.split("-").reverse().join(".")}`, faellig, erledigt: false });
    if (land === "AT") out.push({ art: "wiereg", label: "WiEReG: jährliche Überprüfung und Bestätigung der wirtschaftlichen Eigentümer", faellig: plusTage(faellig, 28), erledigt: false });
  }
  return out.sort((a, b) => String(a.faellig).localeCompare(String(b.faellig)));
}

/**
 * Eingaben einer neuen Gesellschaft prüfen. Liefert Fehlerliste (leer = ok).
 * g: { rechtsform, name, sitz, stammkapital, einzahlung, gesellschafter[{name, anteil, einlage}], geschaeftsfuehrung[{name}] }
 */
export function gruendungPruefen(g) {
  const f = [];
  const rf = RECHTSFORMEN[g?.rechtsform];
  if (!rf) return ["Bitte wählen Sie Land und Rechtsform."];
  if (!String(g.name || "").trim()) f.push("Bitte geben Sie den Firmennamen an.");
  if (!String(g.sitz || "").trim()) f.push("Bitte geben Sie den Sitz (Gemeinde) an.");
  const kap = Number(g.stammkapital) || 0;
  if (rf.kapital && kap < rf.kapital) f.push(`Das Stammkapital muss mindestens ${rf.kapital.toLocaleString("de-DE")} ${rf.waehrung} betragen.`);
  if (rf.land === "DE" && rf.kapital && kap % 1 !== 0) f.push("Geschäftsanteile lauten auf volle Euro.");
  const einz = Number(g.einzahlung) || 0;
  if (rf.einzahlung && einz < rf.einzahlung) f.push(`Bei Gründung müssen mindestens ${rf.einzahlung.toLocaleString("de-DE")} ${rf.waehrung} eingezahlt werden.`);
  if (einz > kap && rf.kapital) f.push("Die Einzahlung kann das Stammkapital nicht übersteigen.");
  const ges = g.gesellschafter || [];
  if (!ges.length) f.push("Bitte erfassen Sie mindestens einen Gesellschafter.");
  const summe = ges.reduce((s, x) => s + (Number(x.anteil) || 0), 0);
  if (ges.length && Math.abs(summe - 100) > 0.01) f.push(`Die Anteile der Gesellschafter müssen zusammen 100 % ergeben (derzeit ${summe.toLocaleString("de-DE")} %).`);
  if (!(g.geschaeftsfuehrung || []).some((x) => String(x.name || "").trim())) f.push(rf.komplementaer ? "Bitte geben Sie die Geschäftsführung der Komplementär-GmbH an." : "Bitte geben Sie mindestens eine Geschäftsführerin bzw. einen Geschäftsführer an.");
  if (rf.komplementaer && !String(g.komplementaer?.name || "").trim()) f.push("Bitte geben Sie die Komplementär-GmbH an.");
  if (rf.land === "CH" && !(g.geschaeftsfuehrung || []).some((x) => String(x.wohnsitzLand || "").toUpperCase() === "CH")) f.push("Mindestens eine vertretungsbefugte Person muss Wohnsitz in der Schweiz haben.");
  return f;
}

/** Musterprotokoll möglich? (DE GmbH: ≤ 3 Gesellschafter, 1 Geschäftsführer, Bargründung) */
export const musterprotokollMoeglich = (g) => ["de_gmbh", "de_ug"].includes(g?.rechtsform) && (g.gesellschafter || []).length <= 3 && (g.geschaeftsfuehrung || []).length === 1;
