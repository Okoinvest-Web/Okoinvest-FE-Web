// src/lib/plattform/closing/grundbuch.js
//
// Grundbuch & Dienstbarkeiten (Team B0b/B4): Schrittfolgen je Land (DE/AT/CH), Regeln für Statuswechsel der Schritte,
// Fristen, Kostenschätzer mit Quelle, Erklärungen für das Eigentümerportal („Was bedeutet das für Sie?“).
//
// Reine Funktionen, client- und serverseitig nutzbar (keine Node-Importe). Frappe: plattform/closing_kern.py (gleiche Regeln).
// Fachliche Einordnung und Kosten sind Orientierung – KEINE Rechtsberatung. Recherche und Quellen: docs/GRUNDBUCH-CLOSING.md.

export const GB_STAND = "30.09.2026";

export const GB_LAENDER = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };

/** Objektart der Akte */
export const GB_OBJEKTARTEN = {
  freiflaeche: { label: "Grundstück (Freifläche / Agri-PV)", kurz: "Freifläche" },
  dach: { label: "Dach bzw. Gebäude (Dach-PV, Carport)", kurz: "Dach" },
};

/** Art des Rechts je Land (Standard zuerst) */
export const GB_RECHTE = {
  DE: {
    bpd: { label: "Beschränkte persönliche Dienstbarkeit (§§ 1090 ff. BGB)", kurz: "bpD" },
    grunddienstbarkeit: { label: "Grunddienstbarkeit (§§ 1018 ff. BGB)", kurz: "Grunddienstbarkeit" },
  },
  AT: {
    servitut: { label: "Dienstbarkeit / Servitut (§§ 472 ff. ABGB)", kurz: "Servitut" },
    superaedifikat: { label: "Servitut + Superädifikat (§ 435 ABGB, Urkundenhinterlegung)", kurz: "Superädifikat" },
  },
  CH: {
    dienstbarkeit: { label: "Dienstbarkeit (Art. 730 ff. bzw. 781 ZGB)", kurz: "Dienstbarkeit" },
    baurecht: { label: "Baurecht (Art. 675, 779 ff. ZGB)", kurz: "Baurecht" },
  },
};

export const GB_SCHRITT_STATUS = {
  offen: { label: "Offen", ton: "neutral" },
  in_arbeit: { label: "In Arbeit", ton: "info" },
  erledigt: { label: "Erledigt", ton: "ok" },
  entfaellt: { label: "Entfällt", ton: "neutral" },
};
export const GB_SCHRITT_STATUS_IDS = Object.keys(GB_SCHRITT_STATUS);

/** Gesamtstatus der Akte (abgeleitet aus den Schritten) */
export const GB_STATUS = {
  vorbereitung: { label: "Vertrag in Vorbereitung", ton: "warn" },
  unterschrift: { label: "Zur Unterschrift", ton: "info" },
  beglaubigung: { label: "Beglaubigung / Notar", ton: "info" },
  eingereicht: { label: "Beim Grundbuch eingereicht", ton: "info" },
  eingetragen: { label: "Im Grundbuch eingetragen", ton: "ok" },
  abgebrochen: { label: "Abgebrochen", ton: "neutral" },
};
export const GB_OFFEN = ["vorbereitung", "unterschrift", "beglaubigung", "eingereicht"];

/**
 * Schrittfolgen je Land. Felder: schluessel, label, phase (→ Gesamtstatus), nach (Voraussetzungen), fristTage (ab Erledigung
 * der letzten Voraussetzung bzw. Anlage der Akte), nachweis (Pflichtnachweis beim Erledigen: "wert" = Aktenzeichen/TZ,
 * "dok" = Dokument, "wert_oder_dok"), optional (darf „entfällt“ sein), signatur (Signatur-Modul möglich), text (Backoffice),
 * portal (Eigentümer: „Was bedeutet das für Sie?“), nachweisLabel.
 */
const S = (o) => ({ optional: false, signatur: false, nachweis: "", nachweisLabel: "", ...o });

export const GB_SCHRITTE = {
  DE: [
    S({
      schluessel: "vertrag", label: "Vertrag mit Dienstbarkeitsbestellung erstellt", phase: "vorbereitung", nach: [], fristTage: 14,
      text: "Nutzungsvertrag (Pacht- bzw. Dachnutzungsvertrag) enthält die Pflicht zur Bestellung einer beschränkten persönlichen Dienstbarkeit (§§ 1090 ff. BGB) samt Entwurf der Eintragungsbewilligung. Vorlage: Druckformat „Dienstbarkeitsvertrag“ (Muster).",
      portal: "Wir bereiten den Vertrag vor. Er regelt, dass die Anlage auf Ihrem Grundstück bzw. Dach stehen darf – und dass dieses Recht im Grundbuch gesichert wird. Sie erhalten den Entwurf vorab zum Lesen.",
    }),
    S({
      schluessel: "unterschrift", label: "Vertrag unterschrieben", phase: "unterschrift", nach: ["vertrag"], fristTage: 21, signatur: true,
      text: "Schuldrechtlicher Vertrag unterzeichnet – elektronisch über das Signatur-Modul oder als Upload. Für das Grundbuch genügt das NICHT: Die Bewilligung braucht eine öffentlich beglaubigte Unterschrift (§ 29 GBO).",
      portal: "Sie unterschreiben den Vertrag – bequem elektronisch im Portal oder auf Papier. Das Grundbuch verlangt zusätzlich eine beglaubigte Unterschrift beim Notar (nächster Schritt).",
    }),
    S({
      schluessel: "beglaubigung", label: "Notartermin: Bewilligung beglaubigt", phase: "beglaubigung", nach: ["unterschrift"], fristTage: 30,
      text: "Eintragungsbewilligung des Eigentümers (§ 19 GBO) mit öffentlich beglaubigter Unterschrift (§ 29 GBO, § 129 BGB). Üblich: Notar entwirft die Bewilligung, beglaubigt und übernimmt den Vollzug. Alle Miteigentümer bzw. Verfügungsberechtigten unterschreiben.",
      portal: "Kurzer Termin beim Notar: Der Notar bestätigt Ihre Unterschrift unter der Eintragungsbewilligung. Bitte Ausweis mitnehmen. Die Kosten trägt in der Regel der Betreiber – das steht im Vertrag.",
    }),
    S({
      schluessel: "rang", label: "Rangrücktritt der Grundpfandgläubiger", phase: "beglaubigung", nach: ["vertrag"], fristTage: 45, optional: true,
      text: "Stehen Grundschulden/Hypotheken in Abteilung III, treten die Gläubiger mit ihrem Recht im Rang hinter die Dienstbarkeit zurück (Rangänderung § 880 BGB; Bewilligung der Bank in Form des § 29 GBO, bei Grundpfandrechten mit Zustimmung des Eigentümers). Ohne Rangrücktritt kann die Dienstbarkeit in einer Zwangsversteigerung erlöschen. Entfällt ohne Grundpfandrechte.",
      portal: "Hat Ihre Bank eine Grundschuld auf dem Grundstück, bitten wir sie, der Dienstbarkeit den Vorrang zu geben. Für Sie ändert sich an Ihrem Kredit nichts – die Bank bestätigt nur die Reihenfolge im Grundbuch. Wir übernehmen die Korrespondenz, brauchen aber Ihre Zustimmung.",
      nachweis: "wert_oder_dok", nachweisLabel: "Erklärung der Bank (Datum/Aktenzeichen) oder Dokument",
    }),
    S({
      schluessel: "antrag", label: "Antrag beim Grundbuchamt gestellt", phase: "eingereicht", nach: ["beglaubigung"], fristTage: 14,
      text: "Notar reicht Bewilligung und Antrag (§ 13 GBO) beim Grundbuchamt ein. Die Reihenfolge des Eingangs bestimmt den Rang (§§ 17, 45 GBO, § 879 BGB).",
      portal: "Der Notar hat die Eintragung beim Grundbuchamt beantragt. Das Amt bearbeitet den Antrag – das dauert je nach Amt einige Wochen.",
      nachweis: "wert", nachweisLabel: "Aktenzeichen / Eingangsbestätigung",
    }),
    S({
      schluessel: "eintragung", label: "Eintragung bestätigt (Grundbuchauszug)", phase: "eingereicht", nach: ["antrag", "rang"], fristTage: 60,
      text: "Eintragungsnachricht bzw. aktueller Grundbuchauszug (Abteilung II) liegt vor und ist auf Inhalt und Rang geprüft (vor Grundpfandrechten, soweit Rangrücktritt vereinbart).",
      portal: "Geschafft: Die Dienstbarkeit steht im Grundbuch. Sie erhalten eine Kopie des Auszugs. Ihr Eigentum bleibt unverändert – eingetragen ist nur das Nutzungsrecht für die Anlage.",
      nachweis: "wert_oder_dok", nachweisLabel: "Lfd. Nr. Abt. II / Eintragungsnachricht oder Grundbuchauszug",
    }),
  ],
  AT: [
    S({
      schluessel: "vertrag", label: "Dienstbarkeitsvertrag (Servitutsvertrag) erstellt", phase: "vorbereitung", nach: [], fristTage: 14,
      text: "Vertrag über die Einräumung einer Dienstbarkeit (§§ 472 ff. ABGB) mit ausdrücklicher Aufsandungserklärung (§ 32 Abs. 1 lit. b GBG) – ohne sie wird nicht einverleibt. Bei Dach-PV: Eigentum an der Anlage absichern (Superädifikat § 435 ABGB bzw. Zugehör-Regelung).",
      portal: "Wir bereiten den Servitutsvertrag vor. Er erlaubt, die Anlage auf Ihrem Grund bzw. Dach zu errichten und zu betreiben, und enthält die Erklärung, dass das Recht ins Grundbuch eingetragen werden darf.",
    }),
    S({
      schluessel: "unterschrift", label: "Vertrag unterschrieben", phase: "unterschrift", nach: ["vertrag"], fristTage: 21, signatur: true,
      text: "Vertrag unterzeichnet (Signatur-Modul oder Upload). Für die Einverleibung ist eine beglaubigte Unterschrift nötig (§ 31 GBG) – elektronische Unterschrift ersetzt sie nicht.",
      portal: "Sie unterschreiben den Vertrag. Für das Grundbuch lassen Sie Ihre Unterschrift danach beim Notar oder Bezirksgericht beglaubigen.",
    }),
    S({
      schluessel: "beglaubigung", label: "Unterschrift beglaubigt (Notar/Gericht)", phase: "beglaubigung", nach: ["unterschrift"], fristTage: 30,
      text: "Gerichtliche oder notarielle Beglaubigung der Unterschriften aller Verfügungsberechtigten (§ 31 GBG). Gebührenpflicht nach § 33 TP 9 GebG bei entgeltlicher Einräumung beachten (Selbstberechnung durch den Parteienvertreter).",
      portal: "Kurzer Termin beim Notar oder Bezirksgericht: Ihre Unterschrift wird beglaubigt. Bitte Lichtbildausweis mitnehmen.",
    }),
    S({
      schluessel: "rang", label: "Vorrangseinräumung der Pfandgläubiger", phase: "beglaubigung", nach: ["vertrag"], fristTage: 45, optional: true,
      text: "Pfandgläubiger aus dem C-Blatt räumen der Dienstbarkeit den Vorrang ein (Rangeinräumung, § 30 GBG); Erklärung mit beglaubigter Unterschrift. Entfällt ohne Pfandrechte.",
      portal: "Ist Ihr Grundstück mit einem Pfandrecht (z. B. für einen Kredit) belastet, bitten wir die Bank, der Dienstbarkeit den Vorrang einzuräumen. An Ihrem Kredit ändert sich nichts.",
      nachweis: "wert_oder_dok", nachweisLabel: "Vorrangseinräumungserklärung (Datum) oder Dokument",
    }),
    S({
      schluessel: "antrag", label: "Grundbuchsgesuch eingebracht", phase: "eingereicht", nach: ["beglaubigung"], fristTage: 14,
      text: "Grundbuchsgesuch beim zuständigen Bezirksgericht (Grundbuchsgericht), in der Regel elektronisch durch Notar oder Rechtsanwalt. Die Tagebuchzahl (TZ) des Eingangs bestimmt den Rang (§ 29 GBG). Eingaben- und Eintragungsgebühr nach TP 9 GGG.",
      portal: "Der Antrag auf Eintragung liegt beim Grundbuchsgericht. Die sogenannte Tagebuchzahl sichert den Rang ab dem Eingang.",
      nachweis: "wert", nachweisLabel: "Tagebuchzahl (TZ) des Gesuchs",
    }),
    S({
      schluessel: "eintragung", label: "Einverleibung bestätigt (Grundbuchsbeschluss)", phase: "eingereicht", nach: ["antrag", "rang"], fristTage: 60,
      text: "Grundbuchsbeschluss bzw. aktueller Grundbuchsauszug (C-Blatt) mit der Dienstbarkeit liegt vor und ist auf Inhalt und Rang geprüft.",
      portal: "Die Dienstbarkeit ist im Grundbuch einverleibt. Sie erhalten den Beschluss bzw. Auszug. Ihr Eigentum bleibt unverändert.",
      nachweis: "wert_oder_dok", nachweisLabel: "TZ der Einverleibung oder Grundbuchsauszug",
    }),
  ],
  CH: [
    S({
      schluessel: "vertrag", label: "Dienstbarkeits- bzw. Baurechtsvertrag (Entwurf)", phase: "vorbereitung", nach: [], fristTage: 21,
      text: "Vertragsentwurf (Dienstbarkeit Art. 730 ff. bzw. 781 ZGB, Baurecht Art. 779 ff. ZGB), abgestimmt mit der Urkundsperson. Bei Dach-PV: Eigentum an der Anlage trotz Akzessionsprinzip (Art. 667, 671 ZGB) über Baurecht bzw. Dienstbarkeit sichern.",
      portal: "Wir stimmen den Vertrag mit dem Notariat ab. Er sichert das Recht, die Anlage auf Ihrem Grundstück bzw. Dach zu betreiben.",
    }),
    S({
      schluessel: "beurkundung", label: "Öffentliche Beurkundung (Notariat)", phase: "beglaubigung", nach: ["vertrag"], fristTage: 30,
      text: "Rechtsgeschäfte über Grunddienstbarkeiten und Baurechte bedürfen der öffentlichen Beurkundung (Art. 732, 779a ZGB); die Unterzeichnung erfolgt vor der Urkundsperson. Verfahren und Gebühren sind kantonal geregelt.",
      portal: "Termin beim Notariat: Der Vertrag wird öffentlich beurkundet und dort unterschrieben. Bitte amtlichen Ausweis mitnehmen.",
    }),
    S({
      schluessel: "rang", label: "Rangrücktritt der Grundpfandgläubiger", phase: "beglaubigung", nach: ["vertrag"], fristTage: 45, optional: true,
      text: "Grundpfandgläubiger (Schuldbrief, Grundpfandverschreibung) erklären den Rangrücktritt. Sonst kann eine nachrangige Dienstbarkeit bei einer Pfandverwertung gelöscht werden, wenn sie den Gläubiger schädigt (Art. 812 Abs. 2 ZGB). Entfällt ohne Grundpfandrechte.",
      portal: "Ist Ihr Grundstück mit einem Grundpfand belastet, bitten wir die Bank um einen Rangrücktritt. An Ihrer Hypothek ändert sich nichts.",
      nachweis: "wert_oder_dok", nachweisLabel: "Rangrücktrittserklärung (Datum) oder Dokument",
    }),
    S({
      schluessel: "antrag", label: "Grundbuchanmeldung eingereicht", phase: "eingereicht", nach: ["beurkundung"], fristTage: 14,
      text: "Die Urkundsperson meldet das Recht beim Grundbuchamt an; der Tagebucheintrag bestimmt den Rang (Art. 948, 972 ZGB).",
      portal: "Das Notariat hat die Eintragung beim Grundbuchamt angemeldet.",
      nachweis: "wert", nachweisLabel: "Tagebuchnummer / Beleg-Nr.",
    }),
    S({
      schluessel: "eintragung", label: "Eintragung bestätigt (Grundbuchauszug)", phase: "eingereicht", nach: ["antrag", "rang"], fristTage: 60,
      text: "Grundbuchauszug mit der Dienstbarkeit bzw. dem Baurecht liegt vor; die Eintragung ist konstitutiv (Art. 731 Abs. 1 ZGB).",
      portal: "Das Recht ist im Grundbuch eingetragen. Sie erhalten eine Kopie des Auszugs. Ihr Eigentum bleibt unverändert.",
      nachweis: "wert_oder_dok", nachweisLabel: "Beleg-Nr. oder Grundbuchauszug",
    }),
  ],
};

/** Dokumentvorlagen (Muster) – Ausgabe siehe closing/muster.js bzw. Frappe-Druckformate */
export const GB_VORLAGEN = {
  dienstbarkeit_freiflaeche: { label: "Dienstbarkeitsvertrag Freifläche (Muster)", objektarten: ["freiflaeche"], frappe: "Dienstbarkeitsvertrag Freiflaeche Muster" },
  dachnutzung_servitut: { label: "Dachnutzungs- und Servitutsvertrag (Muster)", objektarten: ["dach"], frappe: "Dachnutzungsvertrag Servitut Muster" },
  rangruecktritt: { label: "Ersuchen um Rangrücktritt / Vorrangseinräumung an die Bank (Muster)", objektarten: ["freiflaeche", "dach"], frappe: "Rangruecktritt Ersuchen Muster" },
  loeschung_hinweis: { label: "Hinweisblatt Löschungsbewilligung bei Vertragsende (Muster)", objektarten: ["freiflaeche", "dach"], frappe: "Loeschungsbewilligung Hinweis Muster" },
};
export const GB_VORLAGE_IDS = Object.keys(GB_VORLAGEN);

export const GB_HINWEIS = "Muster und Kostenschätzung dienen der Orientierung und ersetzen keine Rechtsberatung. Vor Verwendung durch Rechtsanwalt bzw. Notar prüfen lassen und an das Recht des Belegenheitslandes anpassen.";

// ================================================================ Schritte & Regeln

export const schritteFuer = (land) => GB_SCHRITTE[land] || GB_SCHRITTE.DE;
export const rechtFuer = (land, recht) => (GB_RECHTE[land]?.[recht] ? recht : Object.keys(GB_RECHTE[land] || GB_RECHTE.DE)[0]);

/** Neue Schrittliste für eine Akte. `ohnePfandrecht` markiert den Rang-Schritt als „entfällt“. */
export function schritteAnlegen(land, { ohnePfandrecht = false } = {}) {
  return schritteFuer(land).map((d, i) => ({
    schluessel: d.schluessel, reihenfolge: i + 1, status: d.schluessel === "rang" && ohnePfandrecht ? "entfaellt" : "offen",
    datum: "", frist: "", notiz: d.schluessel === "rang" && ohnePfandrecht ? "Keine Grundpfandrechte angegeben." : "", nachweisWert: "", dokumentId: null, signaturId: null, vonId: null, geaendertAm: null,
  }));
}

const fertig = (s) => s && (s.status === "erledigt" || s.status === "entfaellt");

export class GrundbuchFehler extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

/**
 * Prüft einen Statuswechsel eines Schritts. Wirft GrundbuchFehler (422 Pflichtangabe, 409 Reihenfolge).
 * akte: { land, schritte[] }; aenderung: { schluessel, status, datum?, nachweisWert?, dokumentId?, notiz? }
 * Liefert den neuen Schritt (ohne Seiteneffekte).
 */
export function schrittPruefen(akte, aenderung, { heute = new Date().toISOString().slice(0, 10) } = {}) {
  const defs = schritteFuer(akte.land);
  const def = defs.find((d) => d.schluessel === aenderung.schluessel);
  if (!def) throw new GrundbuchFehler("Unbekannter Schritt.");
  const alt = (akte.schritte || []).find((s) => s.schluessel === def.schluessel);
  if (!alt) throw new GrundbuchFehler("Schritt fehlt in der Akte.");
  const status = GB_SCHRITT_STATUS[aenderung.status] ? aenderung.status : alt.status;
  if (status === "entfaellt" && !def.optional) throw new GrundbuchFehler(`„${def.label}“ ist Pflicht und kann nicht entfallen.`);
  if (status === "erledigt" || status === "in_arbeit") {
    const fehlt = def.nach.map((k) => (akte.schritte || []).find((s) => s.schluessel === k)).filter((s) => s && !fertig(s));
    if (status === "erledigt" && fehlt.length) {
      const labels = fehlt.map((s) => defs.find((d) => d.schluessel === s.schluessel)?.label || s.schluessel);
      throw new GrundbuchFehler(`Zuerst erledigen: ${labels.join(", ")}.`, 409);
    }
  }
  const datum = /^20\d\d-\d\d-\d\d$/.test(String(aenderung.datum || "")) ? aenderung.datum : status === "erledigt" ? alt.datum || heute : alt.datum || "";
  if (status === "erledigt" && datum > heute) throw new GrundbuchFehler("Das Datum der Erledigung darf nicht in der Zukunft liegen.");
  const nachweisWert = aenderung.nachweisWert !== undefined ? String(aenderung.nachweisWert || "").trim().slice(0, 120) : alt.nachweisWert || "";
  const dokumentId = aenderung.dokumentId !== undefined ? aenderung.dokumentId || null : alt.dokumentId || null;
  if (status === "erledigt" && def.nachweis) {
    const hatWert = nachweisWert.length >= 3;
    const ok = def.nachweis === "wert" ? hatWert : def.nachweis === "dok" ? !!dokumentId : hatWert || !!dokumentId;
    if (!ok) throw new GrundbuchFehler(`Bitte Nachweis angeben: ${def.nachweisLabel}.`);
  }
  return { ...alt, status, datum: status === "offen" ? "" : datum, nachweisWert, dokumentId, notiz: aenderung.notiz !== undefined ? String(aenderung.notiz || "").slice(0, 500) : alt.notiz || "" };
}

/** Rückwärts: Ein erledigter Schritt darf nicht zurückgesetzt werden, solange ein nachfolgender Schritt erledigt ist. */
export function zuruecksetzenErlaubt(akte, schluessel) {
  const defs = schritteFuer(akte.land);
  const nachfolger = defs.filter((d) => d.nach.includes(schluessel)).map((d) => (akte.schritte || []).find((s) => s.schluessel === d.schluessel));
  return !nachfolger.some((s) => s?.status === "erledigt");
}

const plusTage = (tag, n) => {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Fristen je Schritt: ab Erledigung der letzten Voraussetzung (sonst ab Anlage), manuelle Frist hat Vorrang */
export function fristenBerechnen(akte, { heute = new Date().toISOString().slice(0, 10) } = {}) {
  const defs = schritteFuer(akte.land);
  const start = String(akte.erstelltAm || heute).slice(0, 10);
  return (akte.schritte || []).map((s) => {
    const d = defs.find((x) => x.schluessel === s.schluessel);
    if (!d) return { ...s, fristBerechnet: "", ueberfaellig: false };
    const basis = d.nach.map((k) => (akte.schritte || []).find((x) => x.schluessel === k)).filter((x) => x?.status === "erledigt" && x.datum).map((x) => x.datum).sort().pop();
    const bereit = d.nach.every((k) => fertig((akte.schritte || []).find((x) => x.schluessel === k)));
    const fristBerechnet = s.frist || (bereit ? plusTage(basis || start, d.fristTage) : "");
    return { ...s, fristBerechnet, ueberfaellig: !fertig(s) && !!fristBerechnet && fristBerechnet < heute };
  });
}

/** Gesamtstatus aus den Schritten (abgebrochen bleibt) */
export function akteStatus(akte) {
  if (akte.abgebrochen) return "abgebrochen";
  const defs = schritteFuer(akte.land);
  const offen = defs.map((d) => ({ d, s: (akte.schritte || []).find((x) => x.schluessel === d.schluessel) })).filter(({ s }) => !fertig(s));
  if (!offen.length) return "eingetragen";
  // Phase des ersten offenen Pflicht-Schritts in Reihenfolge (Rang läuft parallel)
  const erster = offen.find(({ d }) => d.schluessel !== "rang") || offen[0];
  if (erster.d.schluessel === "vertrag") return "vorbereitung";
  return erster.d.phase;
}

/** Nächster offener Schritt (für Listen und Portal) */
export function naechsterSchritt(akte) {
  const defs = schritteFuer(akte.land);
  for (const d of defs) {
    const s = (akte.schritte || []).find((x) => x.schluessel === d.schluessel);
    if (!fertig(s) && d.nach.every((k) => fertig((akte.schritte || []).find((x) => x.schluessel === k)))) return { ...d, status: s?.status || "offen" };
  }
  return null;
}

/** Fortschritt { erledigt, gesamt, quote } (entfällt zählt nicht mit) */
export function fortschritt(akte) {
  const rel = (akte.schritte || []).filter((s) => s.status !== "entfaellt");
  const erledigt = rel.filter((s) => s.status === "erledigt").length;
  return { erledigt, gesamt: rel.length, quote: rel.length ? erledigt / rel.length : 0 };
}

/** Dienstbarkeitsstatus der Anlage (anlagen.js DIENSTBARKEIT_STATUS) aus der Akte */
export function anlagenDienstbarkeitStatus(akte) {
  const st = akteStatus(akte);
  if (st === "eingetragen") return "eingetragen";
  const antrag = (akte.schritte || []).find((s) => s.schluessel === "antrag");
  if (antrag?.status === "erledigt") return "beantragt";
  return "vorbereitung";
}

// ================================================================ Kostenschätzer

/**
 * Gebühr nach Tabelle B GNotKG (§ 34 Abs. 2) – Näherung auf Basis der Tabellenstufen in der Fassung 2013.
 * Die Tabellen wurden durch das Kostenrechtsänderungsgesetz 2025 angehoben – daher Aufschlag KOSTEN_AUFSCHLAG_2025
 * als grobe Annäherung. Vor Verwendung mit einem aktuellen GNotKG-Gebührenrechner abgleichen.
 */
const STUFEN_B = [
  [500, 500, 15], // bis 500 € → 15 €
  [2000, 500, 4],
  [10000, 1000, 6],
  [25000, 3000, 8],
  [50000, 5000, 10],
  [200000, 15000, 27],
  [500000, 30000, 50],
  [5000000, 50000, 80],
  [10000000, 200000, 130],
  [20000000, 250000, 150],
  [60000000, 500000, 280],
];
export const KOSTEN_AUFSCHLAG_2025 = 1.08;

export function gnotkgTabelleB(wert) {
  const w = Math.max(0, Number(wert) || 0);
  let geb = STUFEN_B[0][2];
  let bis = STUFEN_B[0][0];
  for (const [grenze, schritt, plus] of STUFEN_B.slice(1)) {
    if (w <= bis) break;
    const teil = Math.min(w, grenze) - bis;
    geb += Math.ceil(teil / schritt) * plus;
    bis = grenze;
  }
  return geb;
}

const rund = (x) => Math.round(x);

/**
 * Kostenschätzung Grundbuch (Orientierung). eingaben: { land, entgeltJahr (€/Jahr für das Nutzungsrecht bzw. Jahrespacht),
 * laufzeitJahre, rangruecktritt (Anzahl Gläubiger), eigentuemer (Anzahl Unterschriften) }.
 * Liefert { waehrung, geschaeftswert, positionen:[{label, betrag, von?, bis?, quelle}], summe, hinweis }
 */
export function grundbuchKosten({ land = "DE", entgeltJahr = 0, laufzeitJahre = 20, rangruecktritt = 0, eigentuemer = 1 } = {}) {
  const jahr = Math.max(0, Number(entgeltJahr) || 0);
  const jahre = Math.max(1, Math.min(99, Number(laufzeitJahre) || 20));
  const glaeubiger = Math.max(0, Math.min(9, Number(rangruecktritt) || 0));
  const personen = Math.max(1, Math.min(20, Number(eigentuemer) || 1));
  const positionen = [];
  if (land === "AT") {
    const wert = jahr * jahre;
    positionen.push(
      { label: "Rechtsgeschäftsgebühr Dienstbarkeit (2 % des Entgelts)", betrag: rund(wert * 0.02), quelle: "§ 33 TP 9 GebG – nur bei entgeltlicher Einräumung; Bemessung und Befreiungen im Einzelfall prüfen" },
      { label: "Eintragungsgebühr Grundbuch (wertabhängig)", betrag: rund(wert * 0.011), quelle: "TP 9 lit. b GGG – Satz und Bemessungsgrundlage für Dienstbarkeiten vom Parteienvertreter bestätigen lassen (hier 1,1 % angesetzt)" },
      { label: "Eingabengebühr Grundbuchsgesuch", betrag: 70, von: 50, bis: 90, quelle: "TP 9 lit. a GGG (elektronische Eingabe, Stand prüfen)" },
      { label: `Beglaubigung der Unterschrift(en) (${personen})`, betrag: 40 * personen, von: 25 * personen, bis: 80 * personen, quelle: "Notariatstarifgesetz bzw. GGG (gerichtliche Beglaubigung) – Richtwert" },
      { label: "Vertragserrichtung und Grundbuchsgesuch (Notar/Rechtsanwalt)", betrag: 1500, von: 800, bis: 3000, quelle: "Honorar nach Vereinbarung bzw. Tarif (NTG/RATG) – Richtwert" }
    );
    if (glaeubiger) positionen.push({ label: `Vorrangseinräumung (${glaeubiger} Gläubiger, Beglaubigung + Bearbeitung Bank)`, betrag: 250 * glaeubiger, von: 100 * glaeubiger, bis: 500 * glaeubiger, quelle: "Bankentgelt nach Konditionen + Beglaubigung – Richtwert" });
    const summe = positionen.reduce((s, p) => s + p.betrag, 0);
    return { waehrung: "EUR", geschaeftswert: wert, positionen, summe, hinweis: "Schätzung nach österreichischem Recht (GebG, GGG, NTG) – ohne Umsatzsteuer auf Honorare. Wert = Jahresentgelt × Laufzeit. Rechtsgeschäfts- und Eintragungsgebühr hängen von der konkreten Gestaltung ab (z. B. Dienstbarkeit als Teil eines Bestandvertrags). Stand " + GB_STAND + "." };
  }
  if (land === "CH") {
    positionen.push(
      { label: "Öffentliche Beurkundung (Notariat)", betrag: 1500, von: 800, bis: 3000, quelle: "Kantonale Notariatstarife – Richtwert" },
      { label: "Grundbuchgebühr Eintragung", betrag: 500, von: 200, bis: 1500, quelle: "Kantonale Grundbuchgebührenverordnung – Richtwert" }
    );
    if (glaeubiger) positionen.push({ label: `Rangrücktritt (${glaeubiger} Gläubiger)`, betrag: 300 * glaeubiger, von: 150 * glaeubiger, bis: 600 * glaeubiger, quelle: "Bankentgelt + Grundbuchgebühr – Richtwert" });
    const summe = positionen.reduce((s, p) => s + p.betrag, 0);
    return { waehrung: "CHF", geschaeftswert: jahr * jahre, positionen, summe, hinweis: "Kosten in der Schweiz sind kantonal sehr unterschiedlich (Promille des Werts oder Pauschalen); beim zuständigen Notariat/Grundbuchamt Offerte einholen. Stand " + GB_STAND + "." };
  }
  // DE – Geschäftswert § 52 GNotKG: auf bestimmte Zeit höchstens 20 Jahreswerte, unbestimmt 10 Jahreswerte
  const wert = Math.max(jahr * Math.min(jahre, 20), 5000);
  const b = gnotkgTabelleB(wert) * KOSTEN_AUFSCHLAG_2025;
  positionen.push(
    { label: "Notar: Entwurf und Beglaubigung der Eintragungsbewilligung (0,5 Gebühr)", betrag: rund(b * 0.5), quelle: "KV 24102/21201 GNotKG, Tabelle B – Näherung" },
    { label: "Notar: Vollzug, Auslagen, Grundbuchabruf (pauschal)", betrag: 80, von: 50, bis: 150, quelle: "KV 22110 ff., 32000 ff. GNotKG – Richtwert" },
    { label: "Grundbuchamt: Eintragung der Dienstbarkeit (1,0 Gebühr)", betrag: rund(b), quelle: "KV 14121 GNotKG, Tabelle B – Näherung" }
  );
  if (glaeubiger) {
    positionen.push(
      { label: `Grundbuchamt: Eintragung Rangänderung (${glaeubiger} × 0,5 Gebühr)`, betrag: rund(b * 0.5 * glaeubiger), quelle: "KV 14130 GNotKG, Tabelle B – Näherung" },
      { label: `Beglaubigung Rangrücktrittserklärung Bank (${glaeubiger})`, betrag: 50 * glaeubiger, von: 20 * glaeubiger, bis: 70 * glaeubiger, quelle: "KV 25100 GNotKG (0,2 Gebühr, mind. 20 €, höchstens 70 €) – Bankentgelte zusätzlich" }
    );
  }
  const summe = positionen.reduce((s, p) => s + p.betrag, 0);
  return { waehrung: "EUR", geschaeftswert: wert, positionen, summe, hinweis: "Näherung nach GNotKG (Tabelle B, Stufen der Fassung 2013 mit pauschalem Aufschlag für die Anpassung 2025), zzgl. Umsatzsteuer auf Notarkosten. Geschäftswert nach § 52 GNotKG (höchstens 20 Jahreswerte, mind. 5.000 € angesetzt). Stand " + GB_STAND + "." };
}

// ================================================================ Portal-Erklärungen

export const GB_PORTAL_EINLEITUNG = {
  DE: "Damit die Anlage auch bei einem Verkauf Ihres Grundstücks, einer Zwangsversteigerung oder einem Betreiberwechsel sicher weiterlaufen kann, wird das Nutzungsrecht als beschränkte persönliche Dienstbarkeit im Grundbuch (Abteilung II) eingetragen. Ihr Eigentum bleibt unverändert; Sie können das Grundstück weiterhin verkaufen oder vererben – das Recht geht mit.",
  AT: "Damit die Anlage auch bei einem Eigentümerwechsel oder einer Zwangsversteigerung sicher weiterlaufen kann, wird das Nutzungsrecht als Dienstbarkeit (Servitut) im Grundbuch (C-Blatt) einverleibt. Ihr Eigentum bleibt unverändert.",
  CH: "Damit die Anlage auch bei einem Eigentümerwechsel oder einer Pfandverwertung sicher weiterlaufen kann, wird das Nutzungsrecht als Dienstbarkeit bzw. Baurecht im Grundbuch eingetragen. Ihr Eigentum bleibt unverändert.",
};

/** Kurztext zur Löschung am Vertragsende (Anzeige und Muster) */
export const GB_LOESCHUNG = {
  DE: "Nach Vertragsende und Rückbau bewilligt der Berechtigte die Löschung der Dienstbarkeit (Löschungsbewilligung in Form des § 29 GBO); der Eigentümer beantragt die Löschung beim Grundbuchamt. Die Pflicht zur Löschungsbewilligung gehört in den Vertrag.",
  AT: "Nach Vertragsende und Rückbau stellt der Berechtigte eine Löschungserklärung (Aufsandung zur Löschung) mit beglaubigter Unterschrift aus; die Löschung wird mit Grundbuchsgesuch beantragt.",
  CH: "Nach Vertragsende und Rückbau erteilt der Berechtigte die Löschungsbewilligung; die Löschung wird beim Grundbuchamt angemeldet (Art. 964 ZGB).",
};
