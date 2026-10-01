// src/lib/plattform/eg/eda/schema.js
//
// Schemas, Builder und Parser der EDA-Nachrichten (WP2). Reine Funktionen; Python-Spiegel plattform/eg_eda_kern.py.
//
// Format: „kanonisches EDA-XML“ der Plattform. Elementnamen angelehnt an die ebUtilities-Schemas CMRequest,
// CMNotification, CMRevoke, CPRequest, CPNotification, ECMPList, ConsumptionRecord (MarketParticipantDirectory mit
// RoutingHeader, ProcessDirectory mit MessageId, ConversationId, MeteringPoint …) laut Sekundärquellen. Namensräume,
// Pflichtfelder und Verschachtelung der offiziellen XSD (zu bestätigen) setzt der Gateway-Adapter (dienste/eda-gateway,
// Abbildung „ebutilities“) – die Fachlogik arbeitet nur mit diesem Format. Zusatz gegenüber ebUtilities: Element
// ProcessCode im Kopf (eindeutige Prozesszuordnung, z. B. CM_REV_CUS vs. CM_REV_IMP).

import { EDA_NACHRICHTEN, EDA_PROZESSE, NACHRICHT_PROZESSE, SEKTOR_STROM } from "./codes.js";
import { XmlFehler, kind, kinderMit, kindText, xmlLesen, xmlSchreiben } from "./xml.js";

export class EdaFehler extends Error {
  constructor(msg, fehler = []) {
    super(msg);
    this.name = "EdaFehler";
    this.status = 422;
    this.fehler = fehler;
  }
}

export const NS_BASIS = "urn:oekoinvest:eda";
export const RICHTUNG_EDA = { verbrauch: "CONSUMPTION", erzeugung: "GENERATION" };
export const MODELL_EDA = { dynamisch: "DYNAMIC", statisch: "STATIC" };
export const QH_MINUTEN = 15;

const MP = ["MeteringPoint", "zp", 1];
const RC = ["ResponseCode", "code", 1];
const RID = ["CMRequestId", "text", 1];
const ECID = ["ECID", "ecid", 1];

/** Felder des ProcessDirectory je Nachrichtencode: (Element, Typ, Pflicht, Optionen) */
export const SCHEMA_FELDER = {
  ANFORDERUNG_ECON: [MP, RID, ["ReqDatType", "auswahl", 1, ["EnergyCommunityRegistration", "EnergyCommunityRegistrationOffline"]], ["DateFrom", "datum", 1], ECID, ["ECPartFact", "tf", 1], ["EnergyDirection", "richtung", 1], ["ECShare", "anteil", 0], ["ECDisModel", "modell", 0]],
  ANTWORT_ECON: [MP, RID, RC],
  ZUSTIMMUNG_ECON: [MP, RID, RC, ["ConsentId", "text", 1]],
  ABLEHNUNG_ECON: [MP, RID, RC],
  ABSCHLUSS_ECON: [MP, ECID, ["ConsentId", "text", 1], ["DateActivate", "datum", 1], ["ECPartFact", "tf", 1], ["EnergyDirection", "richtung", 1], ["DateTo", "datum", 0]],
  ANFORDERUNG_CPF: [MP, ECID, ["ConsentId", "text", 1], ["DateFrom", "datum", 1], ["ECPartFact", "tf", 0], ["ECShare", "anteil", 0]],
  ANTWORT_CPF: [MP, RC, ["DateFrom", "datum", 0]],
  ABLEHNUNG_CPF: [MP, RC],
  AUFHEBUNG_CCMS: [MP, ECID, ["ConsentId", "text", 1], ["ConsentEnd", "datum", 1], ["Reason", "auswahl", 0, ["SP", "CUS", "IMP"]]],
  ANTWORT_CCMS: [MP, RC, ["ConsentEnd", "datum", 0]],
  ABLEHNUNG_CCMS: [MP, RC],
  ANFORDERUNG_PT: [MP, ["ECID", "ecid", 0], ["DateTimeFrom", "zeit", 1], ["DateTimeTo", "zeit", 1]],
  ANTWORT_PT: [MP, RC],
  ABLEHNUNG_PT: [MP, RC],
  ANFORDERUNG_ECP: [ECID],
  SENDEN_ECP: [ECID, ["ECDisModel", "modell", 0], ["MPListData", "liste", 1, [MP, ["ConsentId", "text", 0], ["EnergyDirection", "richtung", 1], ["ECPartFact", "tf", 0], ["DateFrom", "datum", 0], ["DateTo", "datum", 0]]]],
  ABLEHNUNG_ECP: [RC],
  DATEN_CRMSG: [MP, ["ECID", "ecid", 0], ["Energy", "energie", 1]],
  ABLEHNUNG_CRMSG: [MP, RC],
  EDASendError: [["ResponseCode", "code", 0], ["ErrorText", "text", 0]],
};

// ---------------------------------------------------------------- Werte prüfen und formatieren

const istZiffer = (c) => c >= "0" && c <= "9";
const istGross = (c) => c >= "A" && c <= "Z";
const nurZiffern = (s) => s.length > 0 && [...s].every(istZiffer);
const nurAlnumGross = (s) => s.length > 0 && [...s].every((c) => istZiffer(c) || istGross(c));

/** Gültiges Kalenderdatum JJJJ-MM-TT */
export function istDatum(s) {
  s = String(s ?? "");
  if (s.length !== 10 || s[4] !== "-" || s[7] !== "-" || !nurZiffern(s.slice(0, 4) + s.slice(5, 7) + s.slice(8, 10))) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
/** Zeitpunkt JJJJ-MM-TTThh:mm:ssZ (UTC) */
export function istZeit(s) {
  s = String(s ?? "");
  if (s.length !== 20 || s[10] !== "T" || s[13] !== ":" || s[16] !== ":" || s[19] !== "Z" || !istDatum(s.slice(0, 10))) return false;
  const h = s.slice(11, 13), m = s.slice(14, 16), x = s.slice(17, 19);
  return nurZiffern(h + m + x) && Number(h) < 24 && Number(m) < 60 && Number(x) < 60;
}
/** Zählpunktnummer AT (33 Zeichen) – Formatprüfung wie eg/zaehlpunkt.js, hier ohne Netzbetreiberliste */
export const istZaehlpunkt = (s) => {
  s = String(s ?? "");
  return s.length === 33 && s.startsWith("AT") && nurZiffern(s.slice(2, 13)) && nurAlnumGross(s.slice(13));
};
/** Gemeinschafts-ID (33 Zeichen, AT + …) */
export const istGemeinschaftsId = (s) => {
  s = String(s ?? "");
  return s.length === 33 && s.startsWith("AT") && nurAlnumGross(s);
};
/** EDA-Adresse: 2 Großbuchstaben + 6 Ziffern (RC…, CC…, GC…, AT… Netzbetreiber) */
export const istMarktpartner = (s) => {
  s = String(s ?? "");
  return s.length === 8 && istGross(s[0]) && istGross(s[1]) && nurZiffern(s.slice(2));
};

/** Zahl für XML: höchstens 6 Nachkommastellen, ohne nachlaufende Nullen (Parität mit Python f"{x:.6f}") */
export function zahlFormat(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) throw new EdaFehler("Ungültiger Zahlenwert.");
  let t = n.toFixed(6);
  if (t.indexOf(".") >= 0) {
    while (t.endsWith("0")) t = t.slice(0, -1);
    if (t.endsWith(".")) t = t.slice(0, -1);
  }
  return t === "-0" ? "0" : t;
}

function wertPruefen(name, typ, wert, opt) {
  const s = String(wert ?? "").trim();
  switch (typ) {
    case "zp":
      return istZaehlpunkt(s) ? "" : `${name}: Zählpunktnummer ungültig (33 Zeichen, AT + Netzbetreibernummer + PLZ + 20 Zeichen).`;
    case "ecid":
      return istGemeinschaftsId(s) ? "" : `${name}: Gemeinschafts-ID ungültig (33 Zeichen).`;
    case "datum":
      return istDatum(s) ? "" : `${name}: Datum JJJJ-MM-TT erwartet.`;
    case "zeit":
      return istZeit(s) ? "" : `${name}: Zeitpunkt JJJJ-MM-TTThh:mm:ssZ (UTC) erwartet.`;
    case "tf":
      return nurZiffern(s) && s.length <= 3 && Number(s) >= 1 && Number(s) <= 100 ? "" : `${name}: Teilnahmefaktor ganzzahlig 1–100.`;
    case "anteil": {
      const p = s.split(".");
      const ok = p.length <= 2 && nurZiffern(p[0]) && (p.length === 1 || (nurZiffern(p[1]) && p[1].length <= 1)) && Number(s) >= 0 && Number(s) <= 100;
      return ok ? "" : `${name}: Anteil 0–100 % mit höchstens einer Nachkommastelle.`;
    }
    case "richtung":
      return s === "CONSUMPTION" || s === "GENERATION" ? "" : `${name}: CONSUMPTION oder GENERATION.`;
    case "modell":
      return s === "DYNAMIC" || s === "STATIC" ? "" : `${name}: DYNAMIC oder STATIC.`;
    case "code":
      return nurZiffern(s) && s.length <= 4 ? "" : `${name}: Responsecode (Ziffern) erwartet.`;
    case "auswahl":
      return (opt || []).includes(s) ? "" : `${name}: zulässig sind ${(opt || []).join(", ")}.`;
    default:
      return s.length >= 1 && s.length <= 120 ? "" : `${name}: Text (1–120 Zeichen) erwartet.`;
  }
}

/** Datenfelder gegen das Schema prüfen → Fehlerliste */
export function datenPruefen(code, daten = {}) {
  const felder = SCHEMA_FELDER[code];
  if (!felder) return [`Unbekannter Nachrichtencode „${code}“.`];
  const fehler = [];
  for (const [name, typ, pflicht, opt] of felder) {
    const w = daten[name];
    const leer = w === undefined || w === null || (typeof w === "string" && !w.trim()) || (Array.isArray(w) && !w.length);
    if (leer) {
      if (pflicht) fehler.push(`${name}: Pflichtfeld fehlt.`);
      continue;
    }
    if (typ === "liste") {
      if (!Array.isArray(w)) {
        fehler.push(`${name}: Liste erwartet.`);
        continue;
      }
      w.forEach((z, i) => {
        for (const [un, ut, up, uo] of opt) {
          const x = z?.[un];
          if (x === undefined || x === null || String(x).trim() === "") {
            if (up) fehler.push(`${name} ${i + 1}, ${un}: Pflichtfeld fehlt.`);
            continue;
          }
          const f = wertPruefen(`${name} ${i + 1}, ${un}`, ut, x, uo);
          if (f) fehler.push(f);
        }
      });
    } else if (typ === "energie") {
      fehler.push(...energiePruefen(w));
    } else {
      const f = wertPruefen(name, typ, w, opt);
      if (f) fehler.push(f);
    }
  }
  if (code === "ANFORDERUNG_CPF" && !String(daten.ECPartFact ?? "").trim() && !String(daten.ECShare ?? "").trim()) fehler.push("ECPartFact oder ECShare: eines von beiden ist Pflicht.");
  return fehler;
}

function energiePruefen(e) {
  const f = [];
  if (!e || typeof e !== "object") return ["Energy: Energiedaten fehlen."];
  if (!istZeit(e.start)) f.push("Energy: MeteringPeriodStart ungültig.");
  if (!istZeit(e.ende)) f.push("Energy: MeteringPeriodEnd ungültig.");
  const reihen = Array.isArray(e.reihen) ? e.reihen : [];
  if (!reihen.length) f.push("Energy: keine EnergyData.");
  const soll = istZeit(e.start) && istZeit(e.ende) ? Math.round((Date.parse(e.ende) - Date.parse(e.start)) / (QH_MINUTEN * 60000)) : null;
  if (soll !== null && (soll < 1 || soll > 31 * 100)) f.push("Energy: Zeitraum ungültig.");
  reihen.forEach((r, i) => {
    if (!String(r?.meterCode || "").trim()) f.push(`EnergyData ${i + 1}: MeterCode fehlt.`);
    const w = Array.isArray(r?.werte) ? r.werte : [];
    if (soll !== null && w.length !== soll) f.push(`EnergyData ${i + 1}: ${w.length} Werte, erwartet ${soll}.`);
    if (w.some((x) => x !== null && !Number.isFinite(Number(x)))) f.push(`EnergyData ${i + 1}: ungültiger Wert.`);
    const q = Array.isArray(r?.qualitaet) ? r.qualitaet : [];
    if (q.length !== w.length) f.push(`EnergyData ${i + 1}: Qualität fehlt.`);
  });
  return f;
}

const plusMinuten = (iso, min) => new Date(Date.parse(iso) + min * 60000).toISOString().slice(0, 19) + "Z";

// ---------------------------------------------------------------- Builder

/**
 * Nachricht bauen (kanonisches XML). Wirft EdaFehler mit Fehlerliste.
 * @param {{code:string, prozesscode:string, absender:string, empfaenger:string, erstellt:string, messageId:string,
 *   conversationId:string, prozessdatum:string, modus?:"PROD"|"SIMU", duplikat?:boolean, daten:object}} n
 * @returns {string} XML
 */
export function nachrichtBauen(n) {
  const { code, prozesscode, absender, empfaenger, erstellt, messageId, conversationId, prozessdatum, modus = "PROD", duplikat = false, daten = {} } = n || {};
  const info = EDA_NACHRICHTEN[code];
  const fehler = [];
  if (!info || info.intern) fehler.push(`Nachrichtencode „${code}“ ist keine EDA-Nachricht.`);
  if (!EDA_PROZESSE[prozesscode] || !(NACHRICHT_PROZESSE[code] || []).includes(prozesscode)) fehler.push(`Prozess „${prozesscode}“ passt nicht zu „${code}“.`);
  if (!istMarktpartner(absender)) fehler.push("Absender: EDA-Adresse (2 Buchstaben + 6 Ziffern) erwartet.");
  if (!istMarktpartner(empfaenger)) fehler.push("Empfänger: EDA-Adresse (2 Buchstaben + 6 Ziffern) erwartet.");
  if (!istZeit(erstellt)) fehler.push("Erstellt: Zeitpunkt UTC erwartet.");
  if (!String(messageId || "").trim() || String(messageId).length > 80) fehler.push("MessageId fehlt.");
  if (!String(conversationId || "").trim() || String(conversationId).length > 80) fehler.push("ConversationId fehlt.");
  if (!istDatum(prozessdatum)) fehler.push("ProcessDate: Datum erwartet.");
  if (info && !info.intern) fehler.push(...datenPruefen(code, daten));
  if (fehler.length) throw new EdaFehler(`Nachricht ${code} ist ungültig: ${fehler[0]}`, fehler);
  const schema = info.schema;
  const version = EDA_PROZESSE[prozesscode].version || "01.00";
  const t = (name, text) => ({ name, text: text === undefined || text === null ? "" : String(text) });
  const felder = [];
  for (const [name, typ, , opt] of SCHEMA_FELDER[code]) {
    const w = daten[name];
    if (w === undefined || w === null || (typeof w === "string" && !w.trim()) || (Array.isArray(w) && !w.length)) continue;
    if (typ === "liste") {
      for (const z of w) felder.push({ name, kinder: opt.filter(([un]) => z[un] !== undefined && z[un] !== null && String(z[un]) !== "").map(([un, ut]) => t(un, ut === "anteil" ? zahlFormat(z[un]) : String(z[un]).trim())) });
    } else if (typ === "energie") {
      const anzahl = Math.round((Date.parse(w.ende) - Date.parse(w.start)) / (QH_MINUTEN * 60000));
      felder.push({
        name: "Energy",
        kinder: [
          t("MeteringReason", "00"), t("MeteringPeriodStart", w.start), t("MeteringPeriodEnd", w.ende), t("MeteringIntervall", "QH"), t("NumberOfMeteringIntervall", anzahl),
          ...w.reihen.map((r) => ({
            name: "EnergyData", attrs: { MeterCode: r.meterCode, UOM: "KWH" },
            kinder: r.werte.map((x, i) => (x === null || x === undefined ? null : { name: "EP", kinder: [t("DTF", plusMinuten(w.start, i * QH_MINUTEN)), t("MM", r.qualitaet[i] || "L1"), t("BQ", zahlFormat(x))] })).filter(Boolean),
          })),
        ],
      });
    } else {
      felder.push(t(name, typ === "anteil" ? zahlFormat(w) : String(w).trim()));
    }
  }
  return xmlSchreiben({
    name: schema,
    attrs: { xmlns: `${NS_BASIS}:${schema}:${version}`, SchemaVersion: version },
    kinder: [
      {
        name: "MarketParticipantDirectory", attrs: { DocumentMode: modus === "SIMU" ? "SIMU" : "PROD", Duplicate: duplikat ? "true" : "false" },
        kinder: [
          { name: "RoutingHeader", kinder: [{ name: "Sender", attrs: { AddressType: "EC_NUMBER" }, kinder: [t("MessageAddress", absender)] }, { name: "Receiver", attrs: { AddressType: "EC_NUMBER" }, kinder: [t("MessageAddress", empfaenger)] }, t("DocumentCreationDateTime", erstellt)] },
          t("Sector", SEKTOR_STROM), t("MessageCode", code), t("ProcessCode", prozesscode),
        ],
      },
      { name: "ProcessDirectory", kinder: [t("MessageId", messageId), t("ConversationId", conversationId), t("ProcessDate", prozessdatum), ...felder] },
    ],
  });
}

// ---------------------------------------------------------------- Parser

/**
 * Nachricht lesen und validieren.
 * @returns {{ok:boolean, fehler:string[], hinweise:string[], kopf:object, daten:object}}
 */
export function nachrichtLesen(xml) {
  const fehler = [];
  const hinweise = [];
  let w;
  try {
    w = xmlLesen(xml);
  } catch (e) {
    if (e instanceof XmlFehler) return { ok: false, fehler: [`XML: ${e.message}`], hinweise, kopf: {}, daten: {} };
    throw e;
  }
  const mpd = kind(w, "MarketParticipantDirectory");
  const pd = kind(w, "ProcessDirectory");
  if (!mpd || !pd) return { ok: false, fehler: ["Aufbau: MarketParticipantDirectory bzw. ProcessDirectory fehlt."], hinweise, kopf: { schema: w.name }, daten: {} };
  const rh = kind(mpd, "RoutingHeader");
  const kopf = {
    schema: w.name,
    version: w.attrs.SchemaVersion || "",
    absender: kindText(kind(rh, "Sender"), "MessageAddress"),
    empfaenger: kindText(kind(rh, "Receiver"), "MessageAddress"),
    erstellt: kindText(rh, "DocumentCreationDateTime"),
    sektor: kindText(mpd, "Sector"),
    nachrichtencode: kindText(mpd, "MessageCode"),
    prozesscode: kindText(mpd, "ProcessCode"),
    modus: mpd.attrs.DocumentMode || "PROD",
    duplikat: mpd.attrs.Duplicate === "true",
    messageId: kindText(pd, "MessageId"),
    conversationId: kindText(pd, "ConversationId"),
    prozessdatum: kindText(pd, "ProcessDate"),
  };
  const code = kopf.nachrichtencode;
  const info = EDA_NACHRICHTEN[code];
  if (!info || info.intern) fehler.push(`Unbekannter Nachrichtencode „${code}“.`);
  else if (info.schema !== w.name) fehler.push(`Schema „${w.name}“ passt nicht zu ${code} (erwartet ${info.schema}).`);
  if (!kopf.prozesscode) {
    const moegl = NACHRICHT_PROZESSE[code] || [];
    if (moegl.length === 1) {
      kopf.prozesscode = moegl[0];
      hinweise.push(`ProcessCode fehlt – aus ${code} abgeleitet (${moegl[0]}).`);
    } else fehler.push("ProcessCode fehlt.");
  } else if (info && !(NACHRICHT_PROZESSE[code] || []).includes(kopf.prozesscode)) fehler.push(`Prozess „${kopf.prozesscode}“ passt nicht zu ${code}.`);
  if (!istMarktpartner(kopf.absender)) fehler.push("Absender (MessageAddress) ungültig.");
  if (!istMarktpartner(kopf.empfaenger)) fehler.push("Empfänger (MessageAddress) ungültig.");
  if (kopf.sektor && kopf.sektor !== SEKTOR_STROM) hinweise.push(`Sektor ${kopf.sektor} (erwartet ${SEKTOR_STROM} Strom).`);
  if (!istZeit(kopf.erstellt)) fehler.push("DocumentCreationDateTime ungültig.");
  if (!kopf.messageId || kopf.messageId.length > 80) fehler.push("MessageId fehlt.");
  if (!kopf.conversationId || kopf.conversationId.length > 80) fehler.push("ConversationId fehlt.");
  if (!istDatum(kopf.prozessdatum)) fehler.push("ProcessDate ungültig.");
  const daten = {};
  for (const [name, typ, , opt] of SCHEMA_FELDER[code] || []) {
    if (typ === "liste") {
      const l = kinderMit(pd, name);
      if (l.length) daten[name] = l.map((z) => Object.fromEntries(opt.map(([un]) => [un, kindText(z, un)]).filter(([, v]) => v !== "")));
    } else if (typ === "energie") {
      const e = kind(pd, "Energy");
      if (e) daten.Energy = energieLesen(e, hinweise);
    } else {
      const v = kindText(pd, name);
      if (v !== "") daten[name] = v;
    }
  }
  if (info && !info.intern) fehler.push(...datenPruefen(code, daten));
  return { ok: !fehler.length, fehler, hinweise, kopf, daten };
}

function energieLesen(e, hinweise) {
  const start = kindText(e, "MeteringPeriodStart");
  const ende = kindText(e, "MeteringPeriodEnd");
  const anzahl = istZeit(start) && istZeit(ende) ? Math.round((Date.parse(ende) - Date.parse(start)) / (QH_MINUTEN * 60000)) : 0;
  const reihen = kinderMit(e, "EnergyData").map((d) => {
    const werte = new Array(Math.max(0, anzahl)).fill(null);
    const qualitaet = new Array(Math.max(0, anzahl)).fill("");
    for (const ep of kinderMit(d, "EP")) {
      const dtf = kindText(ep, "DTF");
      const i = istZeit(dtf) && istZeit(start) ? Math.round((Date.parse(dtf) - Date.parse(start)) / (QH_MINUTEN * 60000)) : -1;
      if (i < 0 || i >= anzahl) {
        hinweise.push(`EnergyData ${d.attrs.MeterCode || ""}: Wert außerhalb des Zeitraums verworfen.`);
        continue;
      }
      const bq = Number(kindText(ep, "BQ"));
      werte[i] = Number.isFinite(bq) ? bq : null;
      const mm = kindText(ep, "MM") || "L1";
      qualitaet[i] = mm === "L1" || mm === "L2" || mm === "L3" ? mm : "L3";
    }
    const fehlend = werte.filter((x) => x === null).length;
    if (fehlend) hinweise.push(`EnergyData ${d.attrs.MeterCode || ""}: ${fehlend} Viertelstunde(n) ohne Wert.`);
    return { meterCode: d.attrs.MeterCode || "", werte, qualitaet: qualitaet.map((q, i) => (werte[i] === null ? "L3" : q)) };
  });
  return { start, ende, reihen };
}
