// src/lib/plattform/kundenenergie.js
//
// Kundenseite Energie (Team 4) – reine Logik, client- und servertauglich (keine Node-Importe).
// Gegenstück in Frappe: Backend-Import/…/plattform/kundenenergie_kern.py (gleiche Regeln, Test auf Gleichheit).
//
//   1. Kundenanliegen des Contracting-Kunden (Zustandsautomat je Art):
//        einspruch      Einspruch gegen eine Contracting-Rechnung  → stattgegeben | teilweise | abgelehnt
//        kuendigung     Kündigung des Stromliefervertrags zum Laufzeitende (Fristprüfung) → bestaetigt | abgelehnt
//        verlaengerung  Verlängerung anfragen  → Angebot (Preis, Laufzeit, Gültigkeit) → angenommen | ausgeschlagen
//        kaufoption     Übernahme der Anlage anfragen → Angebot (Kaufpreis, Stichtag) → angenommen | ausgeschlagen
//      Wer darf was: „kunde“ (Konto bzw. Team mit Schreibrecht) reicht ein, zieht zurück, nimmt Angebote an/aus;
//      „bo“ (Backoffice, Bereich „finanzen“ schreiben) prüft, entscheidet, unterbreitet Angebote.
//   2. Lieferantenwechsel nach Zuschlag (Reststrom-Kunde): Schritte mit Rolle, Voraussetzung und Frist.
//   3. Energiekostenbericht (Netzbezug × Energiepreis + Contracting-Solarstrom je Monat).
//
// Fehler: Error mit `status` (403 Rolle, 409 Zustand/Frist, 422 Eingabe) – das Backend übersetzt in PlattformFehler.

// ================================================================ Hilfen

function fehler(status, text) {
  const e = new Error(text);
  e.status = status;
  return e;
}
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const tagIso = (d) => d.toISOString().slice(0, 10);
const utc = (iso) => new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
const rund = (x, s = 2) => (Number.isFinite(x) ? Math.round(x * 10 ** s) / 10 ** s : null);
const text = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);

export function plusTage(iso, tage) {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + tage);
  return tagIso(d);
}
export function tageZwischen(von, bis) {
  return Math.round((utc(bis) - utc(von)) / 86400e3);
}
/** Datum minus Monate mit Monatsende-Kappung (31.12. − 3 Monate = 30.09.; 31.03. − 1 Monat = 28./29.02.) */
export function monateZurueck(iso, monate) {
  const [j, m, t] = String(iso).slice(0, 10).split("-").map(Number);
  const ziel = new Date(Date.UTC(j, m - 1 - monate, 1));
  const letzter = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0)).getUTCDate();
  ziel.setUTCDate(Math.min(t, letzter));
  return tagIso(ziel);
}

// ================================================================ 1. Kundenanliegen

export const ANLIEGEN_ARTEN = {
  einspruch: { label: "Einspruch gegen eine Abrechnung", kurz: "Einspruch", zielTage: 14, bezug: "beleg" },
  kuendigung: { label: "Kündigung zum Laufzeitende", kurz: "Kündigung", zielTage: 14, bezug: "anlage" },
  verlaengerung: { label: "Verlängerung des Liefervertrags anfragen", kurz: "Verlängerung", zielTage: 30, bezug: "anlage" },
  kaufoption: { label: "Übernahme der Anlage (Kaufoption) anfragen", kurz: "Übernahme", zielTage: 30, bezug: "anlage" },
};
export const ANLIEGEN_ART_IDS = Object.keys(ANLIEGEN_ARTEN);

export const EINSPRUCH_GRUENDE = {
  menge: "Menge bzw. Zählerstand nicht nachvollziehbar",
  preis: "Arbeitspreis oder Preisgleitung (Indexierung) falsch",
  grundgebuehr: "Grundgebühr falsch",
  zeitraum: "Abrechnungszeitraum falsch",
  doppelt: "Doppelt abgerechnet",
  ausfall: "Anlagenausfall bzw. Störung nicht berücksichtigt",
  sonstiges: "Sonstiges",
};

export const ANLIEGEN_STATUS = {
  eingereicht: { label: "Eingereicht", ton: "neutral", offen: true },
  in_pruefung: { label: "In Prüfung", ton: "info", offen: true },
  angebot: { label: "Angebot liegt vor", ton: "info", offen: true },
  stattgegeben: { label: "Stattgegeben", ton: "ok" },
  teilweise: { label: "Teilweise stattgegeben", ton: "ok" },
  bestaetigt: { label: "Bestätigt", ton: "ok" },
  angenommen: { label: "Angenommen", ton: "ok" },
  abgelehnt: { label: "Abgelehnt", ton: "warn" },
  ausgeschlagen: { label: "Angebot nicht angenommen", ton: "neutral" },
  zurueckgezogen: { label: "Zurückgezogen", ton: "neutral" },
};
export const ANLIEGEN_OFFEN = Object.keys(ANLIEGEN_STATUS).filter((k) => ANLIEGEN_STATUS[k].offen);

export const AKTION_LABEL = {
  pruefen: "In Prüfung nehmen",
  stattgeben: "Stattgeben",
  teilweise: "Teilweise stattgeben",
  ablehnen: "Ablehnen",
  bestaetigen: "Kündigung bestätigen",
  angebot: "Angebot unterbreiten",
  annehmen: "Angebot annehmen",
  ausschlagen: "Angebot nicht annehmen",
  zurueckziehen: "Zurückziehen",
};

// [Zielstatus, wer]
const P = ["in_pruefung", "bo"];
const Z = ["zurueckgezogen", "kunde"];
const ABL = ["abgelehnt", "bo"];
const ANG = ["angebot", "bo"];
const UEBERGAENGE = {
  einspruch: {
    eingereicht: { pruefen: P, stattgeben: ["stattgegeben", "bo"], teilweise: ["teilweise", "bo"], ablehnen: ABL, zurueckziehen: Z },
    in_pruefung: { stattgeben: ["stattgegeben", "bo"], teilweise: ["teilweise", "bo"], ablehnen: ABL, zurueckziehen: Z },
  },
  kuendigung: {
    eingereicht: { pruefen: P, bestaetigen: ["bestaetigt", "bo"], ablehnen: ABL, zurueckziehen: Z },
    in_pruefung: { bestaetigen: ["bestaetigt", "bo"], ablehnen: ABL, zurueckziehen: Z },
  },
  verlaengerung: {
    eingereicht: { pruefen: P, angebot: ANG, ablehnen: ABL, zurueckziehen: Z },
    in_pruefung: { angebot: ANG, ablehnen: ABL, zurueckziehen: Z },
    angebot: { annehmen: ["angenommen", "kunde"], ausschlagen: ["ausgeschlagen", "kunde"], angebot: ANG },
  },
};
UEBERGAENGE.kaufoption = UEBERGAENGE.verlaengerung;

/** Zielstatus eines Übergangs – sonst Fehler (409 unzulässig im Status, 403 falsche Rolle) */
export function uebergang(art, status, aktion, wer) {
  const t = UEBERGAENGE[art]?.[status]?.[aktion];
  if (!t) throw fehler(409, `„${AKTION_LABEL[aktion] || aktion}“ ist im Status „${ANLIEGEN_STATUS[status]?.label || status}“ nicht möglich.`);
  if (t[1] !== wer) throw fehler(403, t[1] === "bo" ? "Das entscheidet ÖkoInvest (Backoffice)." : "Diese Aktion führt der Kunde aus.");
  return t[0];
}

/** Aktionen, die `wer` im aktuellen Status ausführen darf */
export function erlaubteAktionen(art, status, wer) {
  return Object.entries(UEBERGAENGE[art]?.[status] || {}).filter(([, t]) => t[1] === wer).map(([a]) => a);
}

/** Bearbeitungsziel (Service-Ziel, keine Rechtsfrist) */
export function zielDatum(art, eingereichtAm) {
  return plusTage(String(eingereichtAm).slice(0, 10), ANLIEGEN_ARTEN[art]?.zielTage || 14);
}

/**
 * Fristprüfung Kündigung Contracting (ordentlich zum Laufzeitende): Zugang spätestens `kuendigungsfristMonate` vor dem
 * Vertragsende. Rückgabe { ende, stichtag, tage, fristgerecht }.
 */
export function kuendigungContracting(vertrag, heute) {
  const ende = vertrag?.ende || "";
  if (!DATUM.test(ende)) return { ende: "", stichtag: "", tage: null, fristgerecht: false };
  const monate = Math.max(0, Number(vertrag.kuendigungsfristMonate) || 0);
  const stichtag = monateZurueck(ende, monate);
  const tage = tageZwischen(heute, stichtag);
  return { ende, stichtag, tage, fristgerecht: tage >= 0 };
}

const zahl = (v, { min = -Infinity, max = Infinity, stellen = 2 } = {}) => {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(String(v).replace(",", "."));
  if (!Number.isFinite(x) || x < min || x > max) return NaN;
  return rund(x, stellen);
};

/**
 * Neues Anliegen prüfen. kontext: { beleg? (Contracting-Rechnung), vertrag? (Contracting-Vertrag mit ende), heute }
 * Rückgabe: bereinigte Felder { art, grund, text, betragStrittigEur, wunschJahre, wunschTermin, wirksamZum, stichtag }
 */
export function anliegenPruefen(art, d = {}, { beleg = null, vertrag = null, heute } = {}) {
  if (!ANLIEGEN_ARTEN[art]) throw fehler(422, "Bitte wählen Sie die Art des Anliegens.");
  const t = text(d.text, 3000);
  const aus = { art, grund: "", text: t, betragStrittigEur: null, wunschJahre: null, wunschTermin: "", wirksamZum: "", stichtag: "" };
  if (art === "einspruch") {
    if (!beleg) throw fehler(422, "Bitte wählen Sie die Rechnung, gegen die Sie Einspruch erheben.");
    if (beleg.art !== "contracting" || beleg.beleg !== "rechnung") throw fehler(422, "Einspruch ist hier nur gegen Contracting-Rechnungen möglich.");
    if (beleg.status === "storniert") throw fehler(409, "Die Rechnung ist storniert.");
    aus.grund = EINSPRUCH_GRUENDE[d.grund] ? d.grund : "";
    if (!aus.grund) throw fehler(422, "Bitte wählen Sie den Grund des Einspruchs.");
    if (t.length < 20) throw fehler(422, "Bitte begründen Sie den Einspruch nachvollziehbar (mindestens 20 Zeichen, z. B. abweichender Zählerstand).");
    const b = zahl(d.betragStrittigEur, { min: 0.01, max: Number(beleg.brutto) || 1e9 });
    if (Number.isNaN(b)) throw fehler(422, "Der strittige Betrag muss größer als 0 und höchstens der Rechnungsbetrag sein.");
    aus.betragStrittigEur = b;
    return aus;
  }
  if (!vertrag) throw fehler(422, "Für diese Anlage ist kein Stromliefervertrag hinterlegt.");
  if (vertrag.status !== "aktiv") throw fehler(409, vertrag.status === "gekuendigt" ? "Der Vertrag ist bereits gekündigt." : "Der Vertrag ist nicht mehr aktiv.");
  if (art === "kuendigung") {
    if (d.bestaetigt !== true) throw fehler(422, "Bitte bestätigen Sie die Kündigungserklärung ausdrücklich.");
    const k = kuendigungContracting(vertrag, heute);
    if (!k.ende) throw fehler(422, "Vertragsbeginn und Laufzeit fehlen – bitte wenden Sie sich an ÖkoInvest.");
    if (!k.fristgerecht) throw fehler(409, `Die Kündigungsfrist zum Laufzeitende (${k.ende.split("-").reverse().join(".")}) ist am ${k.stichtag.split("-").reverse().join(".")} abgelaufen. Bitte klären Sie die Verlängerungsregelung Ihres Vertrags mit ÖkoInvest (Anfrage „Verlängerung“ oder Nachricht).`);
    return { ...aus, wirksamZum: k.ende, stichtag: k.stichtag };
  }
  if (art === "verlaengerung") {
    const j = zahl(d.wunschJahre, { min: 1, max: 20, stellen: 0 });
    if (j === null || Number.isNaN(j)) throw fehler(422, "Bitte geben Sie die gewünschte Verlängerung in Jahren an (1–20).");
    return { ...aus, wunschJahre: j };
  }
  // kaufoption
  const w = String(d.wunschTermin || "");
  if (w && (!DATUM.test(w) || w < heute)) throw fehler(422, "Der Wunschtermin muss ein Datum in der Zukunft sein.");
  return { ...aus, wunschTermin: w || vertrag.ende || "" };
}

/**
 * Daten eines Übergangs prüfen (Backoffice-Entscheidung bzw. Angebot).
 * Rückgabe { begruendung, korrekturEur, angebot }
 */
export function aktionPruefen(art, aktion, d = {}, { anliegen = {}, heute } = {}) {
  const begruendung = text(d.begruendung, 3000);
  const aus = { begruendung, korrekturEur: null, angebot: null };
  if (["ablehnen", "stattgeben", "teilweise", "bestaetigen"].includes(aktion) && begruendung.length < 10) {
    throw fehler(422, aktion === "bestaetigen" ? "Bitte ergänzen Sie einen kurzen Bestätigungstext (mind. 10 Zeichen, z. B. Rückbau- oder Übergaberegelung)." : "Bitte begründen Sie die Entscheidung (mindestens 10 Zeichen) – der Kunde erhält sie schriftlich.");
  }
  if (aktion === "teilweise" || aktion === "stattgeben") {
    const k = zahl(d.korrekturEur, { min: 0.01, max: 1e9 });
    if (Number.isNaN(k)) throw fehler(422, "Der Korrekturbetrag muss größer als 0 sein.");
    if (aktion === "teilweise" && k === null) throw fehler(422, "Bitte geben Sie den Korrekturbetrag (Gutschrift) an.");
    if (anliegen.betragStrittigEur && k !== null && aktion === "teilweise" && k >= anliegen.betragStrittigEur) throw fehler(422, "Bei teilweiser Stattgabe liegt die Korrektur unter dem strittigen Betrag – sonst bitte „Stattgeben“.");
    aus.korrekturEur = k ?? anliegen.betragStrittigEur ?? null;
  }
  if (aktion === "angebot") {
    const gueltigBis = String(d.gueltigBis || "");
    if (!DATUM.test(gueltigBis) || gueltigBis <= heute) throw fehler(422, "Bitte geben Sie an, bis wann das Angebot gilt (Datum in der Zukunft).");
    const angebotText = text(d.text, 2000);
    if (art === "kaufoption") {
      const betrag = zahl(d.betragEur, { min: 1, max: 1e9 });
      if (betrag === null || Number.isNaN(betrag)) throw fehler(422, "Bitte geben Sie den Kaufpreis (netto) an.");
      const stichtag = String(d.stichtag || anliegen.wunschTermin || "");
      if (!DATUM.test(stichtag)) throw fehler(422, "Bitte geben Sie den Übergabestichtag an.");
      aus.angebot = { betragEur: betrag, stichtag, gueltigBis, text: angebotText };
    } else {
      const jahre = zahl(d.jahre, { min: 1, max: 20, stellen: 0 });
      const preisCt = zahl(d.preisCt, { min: 0, max: 100, stellen: 3 });
      if (jahre === null || Number.isNaN(jahre)) throw fehler(422, "Bitte geben Sie die Verlängerung in Jahren an (1–20).");
      if (preisCt === null || Number.isNaN(preisCt)) throw fehler(422, "Bitte geben Sie den Arbeitspreis der Verlängerung in ct/kWh an.");
      const grund = zahl(d.grundgebuehrMonat, { min: 0, max: 1e6 });
      if (Number.isNaN(grund)) throw fehler(422, "Die Grundgebühr ist ungültig.");
      aus.angebot = { jahre, preisCt, grundgebuehrMonat: grund, gueltigBis, text: angebotText };
    }
  }
  if (aktion === "annehmen") {
    const a = anliegen.angebot;
    if (!a) throw fehler(409, "Es liegt kein Angebot vor.");
    if (a.gueltigBis < heute) throw fehler(409, `Das Angebot war nur bis ${a.gueltigBis.split("-").reverse().join(".")} gültig – bitte fordern Sie ein neues an.`);
    if (d.bestaetigt !== true) throw fehler(422, "Bitte bestätigen Sie die Annahme ausdrücklich.");
  }
  return aus;
}

// ================================================================ 2. Lieferantenwechsel (Reststrom)

export const WECHSEL_SCHRITTE = [
  { id: "zuschlag", label: "Zuschlag erteilt", text: "Sie haben den Vorschlag freigegeben; der Versorger hat den Zuschlag erhalten.", wer: [] },
  { id: "vertrag_versorger", label: "Liefervertrag vom Versorger bereitgestellt", text: "Der Versorger stellt den Liefervertrag zu den Konditionen des Angebots bereit.", wer: ["lieferant", "bo"], nach: ["zuschlag"] },
  { id: "vertrag_kunde", label: "Liefervertrag gegengezeichnet", text: "Sie unterschreiben den Liefervertrag und senden ihn zurück.", wer: ["kunde", "bo"], nach: ["vertrag_versorger"] },
  { id: "kuendigung_alt", label: "Bisheriger Vertrag gekündigt", text: "Kündigung beim bisherigen Lieferanten fristgerecht erklärt (durch ÖkoInvest mit Vollmacht oder durch Sie).", wer: ["bo", "kunde"], nach: ["zuschlag"], vorvertrag: true },
  { id: "kuendigung_bestaetigt", label: "Kündigungsbestätigung liegt vor", text: "Der bisherige Lieferant hat die Kündigung zum Vertragsende bestätigt.", wer: ["kunde", "bo"], nach: ["kuendigung_alt"], vorvertrag: true },
  { id: "anmeldung_netz", label: "Anmeldung beim Netzbetreiber bestätigt", text: "Der neue Versorger hat die Belieferung zum Lieferbeginn beim Netzbetreiber angemeldet (DE: Lieferantenwechselprozess, AT: Wechselprozess).", wer: ["lieferant", "bo"], nach: ["vertrag_kunde"] },
  { id: "lieferbeginn", label: "Belieferung begonnen", text: "Der neue Versorger beliefert Ihre Abnahmestellen.", wer: ["lieferant", "bo"], nach: ["anmeldung_netz"] },
  { id: "erste_rechnung", label: "Erste Rechnung geprüft", text: "Die erste Rechnung des neuen Versorgers entspricht den vereinbarten Preisen.", wer: ["kunde", "bo"], nach: ["lieferbeginn"] },
];
export const WECHSEL_SCHRITT_IDS = WECHSEL_SCHRITTE.map((s) => s.id);
export const WECHSEL_ROLLE = { kunde: "Kunde", lieferant: "Versorger", bo: "ÖkoInvest", system: "System" };

/**
 * Wechsel anlegen: zuschlagAm (ISO), lieferbeginn "JJJJ-MM", stichtagAlt (Kündigungsstichtag des Vorvertrags) oder null.
 * Fristen: Liefervertrag bereitstellen 10 Tage bzw. gegenzeichnen 21 Tage nach Zuschlag (Ziel), Kündigung bis Stichtag,
 * Bestätigung 14 Tage danach, Anmeldung spätestens am Vortag des Lieferbeginns, erste Rechnung 45 Tage nach Lieferbeginn.
 */
export function wechselAnlegen({ zuschlagAm, lieferbeginn, stichtagAlt = null, mitVorvertrag = false }) {
  const z = String(zuschlagAm || "").slice(0, 10);
  const lb = `${lieferbeginn}-01`;
  const frist = {
    zuschlag: z,
    vertrag_versorger: plusTage(z, 10),
    vertrag_kunde: plusTage(z, 21),
    kuendigung_alt: stichtagAlt || null,
    kuendigung_bestaetigt: stichtagAlt ? plusTage(stichtagAlt, 14) : null,
    anmeldung_netz: plusTage(lb, -1),
    lieferbeginn: lb,
    erste_rechnung: plusTage(lb, 45),
  };
  return WECHSEL_SCHRITTE.map((s) => ({
    id: s.id,
    status: s.id === "zuschlag" ? "erledigt" : s.vorvertrag && !mitVorvertrag ? "entfaellt" : "offen",
    frist: frist[s.id],
    am: s.id === "zuschlag" ? String(zuschlagAm || "") : null,
    von: s.id === "zuschlag" ? "system" : null,
    bemerkung: "",
  }));
}

/** Schritt erledigen: Rolle zulässig, Voraussetzungen erledigt (oder entfallen), nicht doppelt */
export function wechselSchrittErledigen(schritte, schrittId, wer, { am, bemerkung = "" } = {}) {
  const def = WECHSEL_SCHRITTE.find((s) => s.id === schrittId);
  const s = schritte.find((x) => x.id === schrittId);
  if (!def || !s) throw fehler(422, "Unbekannter Schritt.");
  if (s.status === "erledigt") throw fehler(409, "Dieser Schritt ist bereits erledigt.");
  if (s.status === "entfaellt") throw fehler(409, "Dieser Schritt entfällt (kein bisheriger Vertrag).");
  if (!def.wer.includes(wer)) throw fehler(403, `Diesen Schritt bestätigt ${def.wer.map((w) => WECHSEL_ROLLE[w]).join(" oder ")}.`);
  const fehlt = (def.nach || []).filter((id) => !["erledigt", "entfaellt"].includes(schritte.find((x) => x.id === id)?.status));
  if (fehlt.length) throw fehler(409, `Zuerst: ${fehlt.map((id) => WECHSEL_SCHRITTE.find((x) => x.id === id).label).join(", ")}.`);
  return schritte.map((x) => (x.id === schrittId ? { ...x, status: "erledigt", am, von: wer, bemerkung: text(bemerkung, 300) } : x));
}

/** Fortschritt, überfällige Schritte, nächster Schritt und Ampel */
export function wechselStand(schritte, heute) {
  const relevant = schritte.filter((s) => s.status !== "entfaellt");
  const erledigt = relevant.filter((s) => s.status === "erledigt").length;
  const ueberfaellig = relevant.filter((s) => s.status === "offen" && s.frist && s.frist < heute).map((s) => s.id);
  const naechster = relevant.find((s) => s.status === "offen") || null;
  const kritisch = ueberfaellig.some((id) => ["kuendigung_alt", "anmeldung_netz"].includes(id));
  return {
    erledigt,
    gesamt: relevant.length,
    prozent: relevant.length ? Math.round((erledigt / relevant.length) * 100) : 0,
    abgeschlossen: erledigt === relevant.length,
    ueberfaellig,
    naechster: naechster ? naechster.id : null,
    ampel: erledigt === relevant.length ? "gruen" : kritisch ? "rot" : ueberfaellig.length ? "gelb" : "gruen",
  };
}

// ================================================================ 3. Energiekostenbericht

/**
 * Energiekostenbericht eines Jahres (nur Energiekomponente; Netzentgelte, Umlagen, Abgaben und Steuern sind nicht enthalten).
 * eingabe:
 *   jahr         Zahl
 *   vertraege    [{ id, lieferant, beginn, vertragEnde, energiepreisCt|null, struktur, jahresKwh, status }]
 *   netzMonate   12 Werte kWh (Monat 1–12) aus dem Lastgang oder null (dann Jahresmenge des Vertrags / 12, „geschätzt“)
 *   pvMonate     [{ monat: "JJJJ-MM", kwh, netto }] aus den Contracting-Rechnungen (geeichte Zähler)
 * Rückgabe { jahr, monate[12], summe, hinweise[] }
 */
export function kostenreport({ jahr, vertraege = [], netzMonate = null, pvMonate = [] }) {
  const j = Number(jahr);
  const monate = [];
  const hinweise = [];
  let geschaetzt = false;
  let ohnePreis = false;
  for (let m = 1; m <= 12; m++) {
    const monat = `${j}-${String(m).padStart(2, "0")}`;
    const anfang = `${monat}-01`;
    const ende = tagIso(new Date(Date.UTC(j, m, 0)));
    const vt = vertraege
      .filter((x) => x.status !== "entwurf" && (!x.beginn || x.beginn <= ende) && (!x.vertragEnde || x.vertragEnde >= anfang))
      .sort((a, b) => String(b.beginn || "").localeCompare(String(a.beginn || "")))[0] || null;
    let netzKwh = Array.isArray(netzMonate) && Number.isFinite(netzMonate[m - 1]) ? netzMonate[m - 1] : null;
    let netzGeschaetzt = false;
    if (netzKwh === null && vt?.jahresKwh) {
      netzKwh = Math.round(vt.jahresKwh / 12);
      netzGeschaetzt = true;
      geschaetzt = true;
    }
    const netzCt = vt && Number.isFinite(vt.energiepreisCt) ? vt.energiepreisCt : null;
    if (vt && netzCt === null) ohnePreis = true;
    const netzEur = netzKwh !== null && netzCt !== null ? rund((netzKwh * netzCt) / 100) : null;
    const pv = pvMonate.filter((x) => x.monat === monat);
    const pvKwh = pv.length ? pv.reduce((s, x) => s + (Number(x.kwh) || 0), 0) : 0;
    const pvEur = pv.length ? rund(pv.reduce((s, x) => s + (Number(x.netto) || 0), 0)) : 0;
    const pvCt = pvKwh > 0 ? rund((pvEur / pvKwh) * 100, 3) : null;
    const gesamtKwh = (netzKwh || 0) + pvKwh;
    const gesamtEur = rund((netzEur || 0) + pvEur);
    const pvErsparnisEur = pvKwh > 0 && netzCt !== null ? rund((pvKwh * netzCt) / 100 - pvEur) : null;
    monate.push({
      monat, lieferant: vt?.lieferant || "", struktur: vt?.struktur || "", netzKwh, netzGeschaetzt, netzCt, netzEur, pvKwh, pvEur, pvCt,
      gesamtKwh, gesamtEur, mischpreisCt: gesamtKwh > 0 && (netzEur !== null || !netzKwh) ? rund((gesamtEur / gesamtKwh) * 100, 3) : null, pvErsparnisEur,
    });
  }
  const s = (k) => rund(monate.reduce((a, x) => a + (Number(x[k]) || 0), 0));
  const summe = { netzKwh: s("netzKwh"), netzEur: s("netzEur"), pvKwh: s("pvKwh"), pvEur: s("pvEur"), gesamtKwh: s("gesamtKwh"), gesamtEur: s("gesamtEur"), pvErsparnisEur: s("pvErsparnisEur") };
  summe.mischpreisCt = summe.gesamtKwh > 0 ? rund((summe.gesamtEur / summe.gesamtKwh) * 100, 3) : null;
  summe.pvAnteil = summe.gesamtKwh > 0 ? rund(summe.pvKwh / summe.gesamtKwh, 4) : null;
  hinweise.push("Nur Energiekomponente: Netzentgelte, Umlagen, Abgaben und Steuern sind nicht enthalten. Die tatsächliche Ersparnis durch Solarstrom vor Ort ist deshalb in der Regel höher.");
  if (geschaetzt) hinweise.push("Netzbezug teilweise geschätzt (Jahresmenge des Vertrags ÷ 12) – für genaue Werte bitte den Lastgang hochladen.");
  if (ohnePreis) hinweise.push("Für Verträge mit Tranchen- oder Spotpreis steht der Energiepreis erst mit der Lieferantenrechnung fest – diese Monate sind ohne Betrag.");
  if (!summe.pvKwh) hinweise.push("Keine Contracting-Rechnungen im Jahr – Solarstrom ist nicht enthalten.");
  return { jahr: j, monate, summe, hinweise };
}
