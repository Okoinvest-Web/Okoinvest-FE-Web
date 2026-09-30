// src/lib/plattform/fach/energie.js
//
// Energie-Stammdaten für Unternehmen (Reststrom-Pool, Contracting) und Mitglieder (Energiegemeinschaften):
// Identifikatoren der Mess- und Marktlokationen DE/AT/CH mit Prüfung, Messart, Spannungsebene, Liefervertrag,
// Entlastungen. Reine Funktionen (Browser, Server, Node-Tests). Frappe: plattform/fach/energie.py (gleiche Regeln).
//
// Identifikatoren (Stand 2026, nach aktuellem Stand der Marktkommunikation):
//  - DE Marktlokations-ID (MaLo-ID): 11 Ziffern, 11. Stelle Prüfziffer (BDEW-Codenummernverfahren):
//      Summe der Ziffern an ungeraden Stellen (1,3,5,7,9) + 2 × Summe der Ziffern an geraden Stellen (2,4,6,8,10);
//      Prüfziffer = (10 − Summe mod 10) mod 10. Beispiel: 41373559241.
//  - DE Messlokations-ID (MeLo-ID, früher Zählpunktbezeichnung): 33 Zeichen, „DE“ + 6-stellige Netzbetreibernummer +
//      5-stellige Postleitzahl + 20 alphanumerische Zeichen. Keine Prüfziffer – nur Formatprüfung.
//  - AT Zählpunktnummer: 33 Zeichen, „AT“ + 6-stellige Netzbetreibernummer + 5-stellige Postleitzahl + 20 Zeichen
//      (Ziffern/Großbuchstaben). Keine Prüfziffer – Formatprüfung; Quelle: Netzbetreiber-Rechnung bzw. Smart-Meter-Portal.
//  - CH Messpunktbezeichnung: 33 Zeichen, „CH“ + 31 alphanumerische Zeichen (Metering Code Schweiz) – Formatprüfung.

export const MESSARTEN = {
  rlm: { label: "RLM – registrierende Leistungsmessung (Lastgang, 15 min)", kurz: "RLM" },
  slp: { label: "SLP – Standardlastprofil", kurz: "SLP" },
  imsys: { label: "Intelligentes Messsystem (Smart Meter, 15 min)", kurz: "iMSys" },
};

export const SPANNUNGSEBENEN = {
  ns: "Niederspannung",
  ms_ns: "Umspannung Mittel-/Niederspannung",
  ms: "Mittelspannung",
  hs_ms: "Umspannung Hoch-/Mittelspannung",
  hs: "Hochspannung",
};

/** AT: Netzebenen 1–7 (Netzebene 7 = Niederspannung Haushalt/Gewerbe) */
export const NETZEBENEN_AT = { 7: "Netzebene 7 (Niederspannung)", 6: "Netzebene 6 (Umspannung MS/NS)", 5: "Netzebene 5 (Mittelspannung)", 4: "Netzebene 4 (Umspannung HS/MS)", 3: "Netzebene 3 (Hochspannung)" };

export const PREISSTRUKTUREN = {
  fest: "Festpreis (Arbeitspreis fix für die Laufzeit)",
  tranchen: "Tranchenbeschaffung (strukturiert)",
  spot: "Spot-/Indexpreis (Day-Ahead)",
  mischung: "Mischung Fest- und Spotanteil",
  grundversorgung: "Grund-/Ersatzversorgung",
};

export const PAR19 = {
  keine: "Keine Sonderform",
  atypisch: "Atypische Netznutzung (§ 19 Abs. 2 S. 1 StromNEV)",
  intensiv: "Stromintensive Netznutzung (§ 19 Abs. 2 S. 2 StromNEV)",
  singulaer: "Singulär genutzte Betriebsmittel (§ 19 Abs. 3 StromNEV)",
  pruefung: "Prüfung gewünscht",
};

/** Messart-Grenze: In DE ist eine registrierende Leistungsmessung in der Regel ab 100.000 kWh/Jahr Pflicht */
export const RLM_GRENZE_KWH = 100000;
/** § 19 Abs. 2 S. 2 StromNEV: Benutzungsstunden ≥ 7.000 h und Verbrauch > 10 GWh an einer Abnahmestelle */
export const INTENSIV = { stunden: 7000, kwh: 10000000 };

// ---------------------------------------------------------------- Identifikatoren

const nurZeichen = (s) => String(s ?? "").toUpperCase().replace(/[\s.\-_/]/g, "");

/** Prüfziffer einer MaLo-ID aus den ersten 10 Ziffern */
export function maloPruefziffer(zehn) {
  const z = String(zehn);
  if (!/^\d{10}$/.test(z)) return null;
  let ungerade = 0;
  let gerade = 0;
  for (let i = 0; i < 10; i++) {
    const d = Number(z[i]);
    if (i % 2 === 0) ungerade += d; // Stellen 1, 3, 5, 7, 9
    else gerade += d; // Stellen 2, 4, 6, 8, 10
  }
  return (10 - ((ungerade + 2 * gerade) % 10)) % 10;
}

/** MaLo-ID prüfen → { ok, wert, fehler } */
export function maloPruefen(eingabe) {
  const s = nurZeichen(eingabe);
  if (!s) return { ok: false, wert: "", fehler: "Bitte geben Sie die Marktlokations-ID an." };
  if (!/^\d{11}$/.test(s)) return { ok: false, wert: s, fehler: "Die Marktlokations-ID hat genau 11 Ziffern." };
  if (s[0] === "0") return { ok: false, wert: s, fehler: "Eine Marktlokations-ID beginnt nicht mit 0." };
  const soll = maloPruefziffer(s.slice(0, 10));
  if (soll !== Number(s[10])) return { ok: false, wert: s, fehler: "Prüfziffer stimmt nicht – bitte Tippfehler prüfen (Angabe auf der Stromrechnung)." };
  return { ok: true, wert: s, fehler: "" };
}

/** 33-stellige Lokations-/Zählpunktbezeichnung DE/AT/CH (Formatprüfung) */
export function zaehlpunktPruefen(eingabe, land = "DE") {
  const s = nurZeichen(eingabe);
  const name = land === "AT" ? "Zählpunktnummer" : land === "CH" ? "Messpunktbezeichnung" : "Messlokations-ID";
  if (!s) return { ok: false, wert: "", fehler: `Bitte geben Sie die ${name} an.` };
  if (s.length !== 33) return { ok: false, wert: s, fehler: `Die ${name} hat 33 Zeichen (derzeit ${s.length}).` };
  if (!s.startsWith(land)) return { ok: false, wert: s, fehler: `Die ${name} beginnt mit „${land}“.` };
  if (land === "CH") {
    if (!/^CH[0-9A-Z]{31}$/.test(s)) return { ok: false, wert: s, fehler: `Die ${name} enthält nur Ziffern und Großbuchstaben.` };
  } else if (!/^(DE|AT)\d{11}[0-9A-Z]{20}$/.test(s)) {
    return { ok: false, wert: s, fehler: `Aufbau: ${land} + 6-stellige Netzbetreibernummer + 5-stellige Postleitzahl + 20 Zeichen.` };
  }
  return { ok: true, wert: s, fehler: "", netzbetreiberNr: land === "CH" ? null : s.slice(2, 8), plz: land === "CH" ? null : s.slice(8, 13) };
}

/** Lesbar gruppiert: DE 000562 66802 AO6G56M11SN51G21M24S */
export function zaehlpunktFormatiert(s) {
  const x = nurZeichen(s);
  if (x.length !== 33) return x;
  return `${x.slice(0, 2)} ${x.slice(2, 8)} ${x.slice(8, 13)} ${x.slice(13, 23)} ${x.slice(23)}`;
}

// ---------------------------------------------------------------- Stammdaten Energie (je Abnahmestelle)

const TXT = /[\u0000-\u001F\u007F]/g;
const text = (v, max = 160) => (v === undefined || v === null || typeof v === "object" ? "" : String(v).replace(TXT, " ").replace(/\s{2,}/g, " ").trim().slice(0, max));
function zahl(v, min, max, stellen = 0) {
  if (v === undefined || v === null || v === "" || typeof v === "object" || typeof v === "boolean") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10 ** stellen) / 10 ** stellen;
}
const auswahl = (v, erlaubt, std = "") => (Object.prototype.hasOwnProperty.call(erlaubt, v) ? v : std);
const datum = (v) => (/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(v || "")) ? String(v) : "");
const jaNein = (v) => (v === true || v === "ja" ? true : v === false || v === "nein" ? false : null);

class Ungueltig extends Error {
  constructor(msg, feld) {
    super(msg);
    this.status = 422;
    this.feld = feld;
  }
}

/**
 * Abnahmestelle bereinigen und prüfen. Wirft Fehler mit status 422 bei ungültigen Pflichtangaben.
 * Pflicht: Bezeichnung, Land, Identifikator je Land (DE: MaLo-ID; MeLo optional; AT: Zählpunkt; CH: Messpunkt),
 * Messart, Jahresverbrauch.
 */
export function abnahmestelleBereinigen(d = {}) {
  const land = auswahl(d.land, { DE: 1, AT: 1, CH: 1 }, "DE");
  const s = {
    bezeichnung: text(d.bezeichnung, 80),
    land,
    plz: text(d.plz, 10),
    ort: text(d.ort, 80),
    maloId: "",
    meloId: "",
    zaehlpunkt: "",
    messart: auswahl(d.messart, MESSARTEN, ""),
    netzbetreiber: text(d.netzbetreiber, 120),
    spannungsebene: land === "AT" ? "" : auswahl(d.spannungsebene, SPANNUNGSEBENEN, ""),
    netzebeneAt: land === "AT" ? auswahl(String(d.netzebeneAt ?? ""), NETZEBENEN_AT, "") : "",
    jahresverbrauchKwh: zahl(d.jahresverbrauchKwh, 0, 5e9),
    spitzeKw: zahl(d.spitzeKw, 0, 5e6, 1),
    lieferant: text(d.lieferant, 120),
    vertragEnde: datum(d.vertragEnde),
    kuendigungsfristMonate: zahl(d.kuendigungsfristMonate, 0, 36),
    preisstruktur: auswahl(d.preisstruktur, PREISSTRUKTUREN, ""),
    arbeitspreisCt: zahl(d.arbeitspreisCt, 0, 200, 3),
    leistungspreisEurKwJahr: zahl(d.leistungspreisEurKwJahr, 0, 1000, 2),
    grundpreisEurMonat: zahl(d.grundpreisEurMonat, 0, 100000, 2),
    netzentgeltCt: zahl(d.netzentgeltCt, 0, 100, 3),
    stromsteuerEntlastung: land === "DE" ? jaNein(d.stromsteuerEntlastung) : null,
    par19: land === "DE" ? auswahl(d.par19, PAR19, "keine") : "",
    eigenerzeugungKwp: zahl(d.eigenerzeugungKwp, 0, 1e6, 1),
    bemerkung: text(d.bemerkung, 300),
  };
  if (!s.bezeichnung) throw new Ungueltig("Bitte geben Sie eine Bezeichnung der Abnahmestelle an (z. B. „Werk Nord“).", "bezeichnung");
  if (land === "DE") {
    const m = maloPruefen(d.maloId);
    if (!m.ok) throw new Ungueltig(m.fehler, "maloId");
    s.maloId = m.wert;
    if (d.meloId) {
      const z = zaehlpunktPruefen(d.meloId, "DE");
      if (!z.ok) throw new Ungueltig(z.fehler, "meloId");
      s.meloId = z.wert;
    }
  } else {
    const z = zaehlpunktPruefen(d.zaehlpunkt, land);
    if (!z.ok) throw new Ungueltig(z.fehler, "zaehlpunkt");
    s.zaehlpunkt = z.wert;
  }
  if (!s.messart) throw new Ungueltig("Bitte wählen Sie die Messart (RLM, SLP oder intelligentes Messsystem).", "messart");
  if (s.jahresverbrauchKwh === null) throw new Ungueltig("Bitte geben Sie den Jahresverbrauch in kWh an.", "jahresverbrauchKwh");
  return s;
}

/**
 * Fachliche Hinweise zur Abnahmestelle (keine Fehler): Messart vs. Verbrauch, Kündigungsfenster, § 19, Stromsteuer.
 * @returns {[{stufe: "warnung"|"info", text}]}
 */
export function abnahmestelleHinweise(s, { jetzt, benutzungsstunden } = {}) {
  const h = [];
  if (!s) return h;
  const heute = (jetzt ? new Date(jetzt) : new Date()).toISOString().slice(0, 10);
  if (s.land === "DE" && s.messart === "slp" && s.jahresverbrauchKwh > RLM_GRENZE_KWH) h.push({ stufe: "warnung", text: `Über ${RLM_GRENZE_KWH.toLocaleString("de-DE")} kWh/Jahr ist in Deutschland in der Regel eine registrierende Leistungsmessung (RLM) vorgeschrieben – Messart beim Netzbetreiber prüfen.` });
  if (s.messart === "slp") h.push({ stufe: "info", text: "Bei SLP-Messung gibt es keinen echten Lastgang – für die Pool-Bewertung genügt die Jahresmenge, eine Lastgang-Analyse ist erst mit RLM oder Smart Meter möglich." });
  if (s.vertragEnde) {
    const ende = new Date(`${s.vertragEnde}T00:00:00Z`);
    const frist = new Date(ende);
    frist.setUTCMonth(frist.getUTCMonth() - (s.kuendigungsfristMonate ?? 3));
    const fristIso = frist.toISOString().slice(0, 10);
    if (s.vertragEnde < heute) h.push({ stufe: "warnung", text: "Vertragsende liegt in der Vergangenheit – ggf. Verlängerung oder Ersatzversorgung zu teuren Konditionen prüfen." });
    else if (fristIso < heute) h.push({ stufe: "warnung", text: `Kündigungsfrist abgelaufen (Stichtag ${fristIso.split("-").reverse().join(".")}) – prüfen Sie die automatische Verlängerung.` });
    else {
      const tage = Math.round((frist - new Date(`${heute}T00:00:00Z`)) / 864e5);
      h.push({ stufe: tage < 120 ? "warnung" : "info", text: `Kündigung spätestens am ${fristIso.split("-").reverse().join(".")} (${tage === 1 ? "1 Tag" : `${tage} Tage`}) – Beschaffung für den Pool rechtzeitig vorbereiten.` });
    }
  }
  if (s.land === "DE" && s.stromsteuerEntlastung === null) h.push({ stufe: "info", text: "Produzierendes Gewerbe sowie Land- und Forstwirtschaft können seit 2026 eine Stromsteuer-Entlastung auf 0,05 ct/kWh beantragen (§ 9b StromStG, Antrag beim Hauptzollamt)." });
  if (s.land === "DE" && benutzungsstunden && s.jahresverbrauchKwh) {
    if (benutzungsstunden >= INTENSIV.stunden && s.jahresverbrauchKwh > INTENSIV.kwh && s.par19 !== "intensiv") h.push({ stufe: "warnung", text: `Mit ${Math.round(benutzungsstunden).toLocaleString("de-DE")} Benutzungsstunden und über 10 GWh kommt ein individuelles Netzentgelt nach § 19 Abs. 2 S. 2 StromNEV in Betracht – Antrag bei der Regulierungsbehörde prüfen.` });
  }
  return h;
}

// ---------------------------------------------------------------- Energiegemeinschaften (Teilnahme)

export const EG_FORMEN = {
  DE: { energy_sharing: "Energy Sharing (§ 42c EnWG)", buergerenergie: "Bürgerenergiegesellschaft" },
  AT: { eeg_lokal: "Erneuerbare-Energie-Gemeinschaft – lokal", eeg_regional: "Erneuerbare-Energie-Gemeinschaft – regional", beg: "Bürgerenergiegemeinschaft (BEG)", gea: "Gemeinschaftliche Erzeugungsanlage (Mehrparteienhaus)" },
  CH: { leg: "Lokale Elektrizitätsgemeinschaft (LEG)", zev: "Zusammenschluss zum Eigenverbrauch (ZEV)", vzev: "Virtueller ZEV (vZEV)" },
};
export const EG_ROLLEN = { bezug: "Bezug (Verbraucher)", einspeisung: "Einspeisung (Erzeuger)", beides: "Bezug und Einspeisung (Prosumer)" };

/**
 * Teilnahme an einer Energiegemeinschaft bereinigen. Land-spezifische Pflichtangaben:
 * DE: MaLo-ID; AT: Zählpunktnummer (Bezug) bzw. zweite Zählpunktnummer für die Einspeisung, Netzbetreiber, Form lokal/regional/BEG;
 * CH: Messpunkt, Gemeinde (LEG nur innerhalb einer Gemeinde).
 */
export function egTeilnahmeBereinigen(d = {}) {
  const land = auswahl(d.land, { DE: 1, AT: 1, CH: 1 }, "DE");
  const t = {
    land,
    form: auswahl(d.form, EG_FORMEN[land], ""),
    rolle: auswahl(d.rolle, EG_ROLLEN, "bezug"),
    maloId: "",
    zaehlpunkt: "",
    zaehlpunktEinspeisung: "",
    netzbetreiber: text(d.netzbetreiber, 120),
    plz: text(d.plz, 10),
    ort: text(d.ort, 80),
    jahresverbrauchKwh: zahl(d.jahresverbrauchKwh, 0, 1e8),
    anlageKwp: zahl(d.anlageKwp, 0, 100000, 1),
    smartMeter: jaNein(d.smartMeter),
    datenfreigabe: jaNein(d.datenfreigabe),
  };
  if (!t.form) throw new Ungueltig("Bitte wählen Sie die Form der Energiegemeinschaft.", "form");
  if (land === "DE") {
    const m = maloPruefen(d.maloId);
    if (!m.ok) throw new Ungueltig(m.fehler, "maloId");
    t.maloId = m.wert;
  } else {
    const z = zaehlpunktPruefen(d.zaehlpunkt, land);
    if (!z.ok) throw new Ungueltig(z.fehler, "zaehlpunkt");
    t.zaehlpunkt = z.wert;
    if (t.rolle !== "bezug" && d.zaehlpunktEinspeisung) {
      const e = zaehlpunktPruefen(d.zaehlpunktEinspeisung, land);
      if (!e.ok) throw new Ungueltig(`Einspeisung: ${e.fehler}`, "zaehlpunktEinspeisung");
      if (e.wert === t.zaehlpunkt) throw new Ungueltig("Für Bezug und Einspeisung gibt es in der Regel zwei verschiedene Zählpunkte.", "zaehlpunktEinspeisung");
      t.zaehlpunktEinspeisung = e.wert;
    }
  }
  if (!t.netzbetreiber) throw new Ungueltig("Bitte geben Sie Ihren Netzbetreiber an.", "netzbetreiber");
  if (!t.plz) throw new Ungueltig("Bitte geben Sie die Postleitzahl der Abnahmestelle an.", "plz");
  return t;
}

/** Hinweise zur Teilnahme (Voraussetzungen je Land) */
export function egHinweise(t) {
  const h = [];
  if (!t) return h;
  if (t.land === "AT") {
    if (t.smartMeter === false) h.push({ stufe: "warnung", text: "Für die Teilnahme ist ein Smart Meter mit Viertelstundenwerten nötig – beim Netzbetreiber beantragen." });
    if (t.datenfreigabe !== true) h.push({ stufe: "info", text: "Die Viertelstundenwerte müssen im Webportal des Netzbetreibers für die Gemeinschaft freigegeben werden (Opt-in)." });
    if (t.form === "eeg_lokal") h.push({ stufe: "info", text: "Lokal heißt: alle Teilnehmer hängen am Niederspannungsnetz derselben Trafostation (Netzebenen 6–7) – höchster Netzentgelt-Rabatt." });
    if (t.form === "eeg_regional") h.push({ stufe: "info", text: "Regional heißt: Teilnehmer im Mittelspannungsnetz desselben Umspannwerks (zusätzlich Netzebenen 4–5) – geringerer Rabatt als lokal." });
    if (t.rolle !== "bezug" && !t.zaehlpunktEinspeisung) h.push({ stufe: "info", text: "Für die Einspeisung ist die Zählpunktnummer der Überschusseinspeisung anzugeben (eigener Zählpunkt)." });
  }
  if (t.land === "DE") h.push({ stufe: "info", text: "Energy Sharing nach § 42c EnWG ist nach aktuellem Stand zunächst im Netzgebiet eines Verteilnetzbetreibers möglich; ein Netzentgeltvorteil ist derzeit nicht vorgesehen. Ein intelligentes Messsystem ist Voraussetzung." });
  if (t.land === "CH" && t.form === "leg") h.push({ stufe: "info", text: "Eine LEG ist auf das Gebiet einer Gemeinde und auf dieselbe Netzebene bzw. denselben Verteilnetzbetreiber beschränkt; die Netznutzung wird reduziert abgerechnet." });
  return h;
}

export { Ungueltig as EnergieUngueltig };
