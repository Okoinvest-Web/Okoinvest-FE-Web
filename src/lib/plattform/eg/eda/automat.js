// src/lib/plattform/eg/eda/automat.js
//
// Zustandsautomat je EDA-Prozess (WP2), Prüfungen vor dem Versand, Fristen, Erinnerungen, Fristen-Ampel.
// Reine Funktionen; Python-Spiegel plattform/eg_eda_kern.py. Teilnahme-Status ändert NUR WP1 (egTeilnahmeUebergang):
// diese Datei liefert dafür die Ereignisse (`ereignisse[]`) – das Backend ruft sie der Reihe nach auf.
//
// Fachliche Grundlage: Fachkonzept 2.4 (Beitritt, 30 Tage Zustimmung, first come first served), 2.5 (TF 1× täglich,
// Aufteilungsschlüssel, Datenempfang), 2.7 (Abmeldung nicht rückwirkend, Widerruf, implizite Abmeldung), 3.8 (Automat),
// 3.14 (Prozess/Nachricht); ElWG § 71 Abs. 5 (max. 5 Teilnahmen, Σ TF ≤ 100, ganzzahlig ≥ 1).

import { CODES_KEINE_ZUSTIMMUNG, CODES_TECHNIK, EDA_FRISTEN, EDA_PROZESSE, PROZESS_OFFEN, PROZESS_STATUS, VIER_AUGEN_AB, portalAnleitung, responsecodeInfo } from "./codes.js";
import { MODELL_EDA, RICHTUNG_EDA, istDatum, istGemeinschaftsId, istMarktpartner, istZaehlpunkt, nachrichtBauen } from "./schema.js";
import { plusTage, tagVon, tageZwischen } from "./zeit.js";

const ZAEHLT = ["entwurf", "angefragt", "zustimmung_offen", "zugestimmt", "wartet_technik", "aktiv", "abmeldung_angefragt"]; // modell.js TEILNAHME_ZAEHLT
const MAX_TEILNAHMEN = 5;
const GEMEINSCHAFT_EDA = ["eda_bereit", "aktiv", "aufnahmestopp", "in_aufloesung"];
const datumDe = (t) => (t ? String(t).slice(0, 10).split("-").reverse().join(".") : "");

// ---------------------------------------------------------------- Kennungen

/** Message- bzw. Conversation-ID: <Absender><JJJJMMTThhmmss><6 Zeichen> (eindeutig je Absender, max. 80 Zeichen) */
export function edaId(absender, jetztIso, zufall) {
  const ts = String(jetztIso || "").slice(0, 19).split("-").join("").split(":").join("").split("T").join("");
  return `${absender}${ts}${String(zufall || "").toUpperCase().slice(0, 6).padEnd(6, "0")}`;
}

// ---------------------------------------------------------------- Prüfungen vor dem Versand

/** Allgemeine EDA-Voraussetzungen der Gemeinschaft */
export function gemeinschaftEdaPruefen(g) {
  const fehler = [];
  if (!g) return ["Gemeinschaft fehlt."];
  if (!istMarktpartner(g.marktpartnerId)) fehler.push("Marktpartner-ID (ebUtilities) fehlt – Registrierung als Marktpartner abschließen (Fachkonzept 2.3).");
  if (!istGemeinschaftsId(g.gemeinschaftsId)) fehler.push("Gemeinschafts-ID (33 Zeichen) fehlt – sie vergibt der Netzbetreiber mit dem Betreibervertrag (HA II 7.1).");
  if (!GEMEINSCHAFT_EDA.includes(g.status)) fehler.push("EDA-Prozesse sind erst ab dem Status „EDA-bereit“ möglich.");
  return fehler;
}

/**
 * Anmeldung (EC_REQ_ONL/OFF) prüfen.
 * @returns {{ok:boolean, fehler:string[], hinweise:string[], ereignisseVorher:string[]}}
 */
export function anmeldungPruefen({ gemeinschaft, teilnahme, zaehlpunkt, teilnahmenDesZp = [], offeneProzesse = [], heute }) {
  const fehler = [...gemeinschaftEdaPruefen(gemeinschaft)];
  const hinweise = [];
  const ereignisseVorher = [];
  if (!teilnahme) return { ok: false, fehler: ["Teilnahme fehlt."], hinweise, ereignisseVorher };
  if (gemeinschaft?.status === "aufnahmestopp") fehler.push("Die Gemeinschaft hat einen Aufnahmestopp.");
  if (["abgelehnt", "abgelaufen"].includes(teilnahme.status)) ereignisseVorher.push("erneut");
  else if (teilnahme.status !== "entwurf") fehler.push(`Anmeldung nur aus dem Entwurf (aktuell: ${teilnahme.status}).`);
  if (!zaehlpunkt || !istZaehlpunkt(zaehlpunkt.zaehlpunktnummer)) fehler.push("Zählpunktnummer fehlt oder ist ungültig.");
  if (zaehlpunkt && !RICHTUNG_EDA[zaehlpunkt.richtung]) fehler.push("Energierichtung des Zählpunkts fehlt.");
  const tf = Number(teilnahme.teilnahmefaktor);
  if (!Number.isInteger(tf) || tf < 1 || tf > 100) fehler.push("Teilnahmefaktor ganzzahlig 1–100 (ElWG § 71 Abs. 5).");
  if (gemeinschaft?.verteilmodell === "statisch" && zaehlpunkt?.richtung === "verbrauch" && !(Number(teilnahme.aufteilungsschluesselPct) > 0)) fehler.push("Statisches Modell: Aufteilungsschlüssel des Verbrauchszählpunkts fehlt.");
  if (gemeinschaft?.verteilmodell === "statisch") hinweise.push("Neu aktivierte Gemeinschaften erhalten ab 05.10.2026 voraussichtlich nur noch das dynamische Modell (zu bestätigen).");
  const andere = teilnahmenDesZp.filter((t) => t.id !== teilnahme.id && ZAEHLT.includes(t.status));
  if (andere.length >= MAX_TEILNAHMEN) fehler.push(`Der Zählpunkt nimmt bereits an ${andere.length} Gemeinschaften teil (höchstens ${MAX_TEILNAHMEN}, ElWG § 71 Abs. 5).`);
  const summe = andere.reduce((s, t) => s + (Number(t.teilnahmefaktor) || 0), 0) + (Number.isFinite(tf) ? tf : 0);
  if (summe > 100) fehler.push(`Summe der bekannten Teilnahmefaktoren ${summe} % > 100 % (ElWG § 71 Abs. 5).`);
  if (offeneProzesse.some((p) => p.teilnahmeId === teilnahme.id && PROZESS_OFFEN.includes(p.status))) fehler.push("Für diese Teilnahme läuft bereits ein EDA-Prozess.");
  if (zaehlpunkt?.smartMeter === "nein") hinweise.push("Kein Smart Meter hinterlegt – der Netzbetreiber muss ggf. erst einbauen (bis zu 2 Monate, HA II 5.1.1).");
  if (zaehlpunkt?.smartMeter === "unbekannt") hinweise.push("Smart Meter unbekannt – bitte beim Mitglied nachfragen.");
  if (!heute) fehler.push("Stichtag fehlt.");
  return { ok: !fehler.length, fehler, hinweise, ereignisseVorher };
}

/** TF-Änderung (EC_PRTFACT_CHG) prüfen: aktiv, 1–100 ganzzahlig, ab ≥ heute, 1 Änderung je Tag, Σ ≤ 100, kein laufender Prozess */
export function tfAenderungPruefen({ gemeinschaft, teilnahme, teilnahmefaktor, ab, teilnahmenDesZp = [], prozesse = [], heute }) {
  const fehler = [...gemeinschaftEdaPruefen(gemeinschaft)];
  const hinweise = [];
  if (!teilnahme) return { ok: false, fehler: ["Teilnahme fehlt."], hinweise };
  if (teilnahme.status !== "aktiv") fehler.push("Der Teilnahmefaktor ist nur bei aktiven Teilnahmen änderbar.");
  const tf = Number(teilnahmefaktor);
  if (!Number.isInteger(tf) || tf < 1 || tf > 100) fehler.push("Teilnahmefaktor ganzzahlig 1–100 (ElWG § 71 Abs. 5).");
  if (tf === Number(teilnahme.teilnahmefaktor)) fehler.push("Der Teilnahmefaktor ist unverändert.");
  if (!istDatum(ab)) fehler.push("Gültig-ab-Datum fehlt.");
  else if (ab < heute) fehler.push("Eine Änderung ist nicht rückwirkend möglich (frühestens heute).");
  const tage = new Set([...(teilnahme.tfHistorie || []).map((h) => h.gueltigAb), ...prozesse.filter((p) => p.teilnahmeId === teilnahme.id && p.prozesscode === "EC_PRTFACT_CHG" && ["gesendet", "bestaetigt", "abgeschlossen", "freigabe_offen", "entwurf"].includes(p.status)).map((p) => p.parameter?.ab)]);
  if (istDatum(ab) && tage.has(ab)) fehler.push("Je Gemeinschaft und Zählpunkt ist derzeit nur eine Änderung des Teilnahmefaktors pro Tag möglich (bis 01.04.2028).");
  if (prozesse.some((p) => p.teilnahmeId === teilnahme.id && PROZESS_OFFEN.includes(p.status))) fehler.push("Für diese Teilnahme läuft bereits ein EDA-Prozess (Responsecode 86 vermeiden).");
  const andere = teilnahmenDesZp.filter((t) => t.id !== teilnahme.id && ZAEHLT.includes(t.status)).reduce((s, t) => s + (Number(t.teilnahmefaktor) || 0), 0);
  if (Number.isFinite(tf) && andere + tf > 100) fehler.push(`Summe der bekannten Teilnahmefaktoren ${andere + tf} % > 100 %.`);
  if (!teilnahme.consentId) hinweise.push("Consent-ID fehlt – Zählpunktliste (EC_PODLIST) abgleichen.");
  return { ok: !fehler.length, fehler, hinweise };
}

/** Abmeldung (CM_REV_SP) prüfen: aktiv, Prozessdatum ≥ heute (nicht rückwirkend), kein laufender Prozess */
export function abmeldungPruefen({ gemeinschaft, teilnahme, zum, prozesse = [], heute }) {
  const fehler = [...gemeinschaftEdaPruefen(gemeinschaft)];
  const hinweise = [];
  if (!teilnahme) return { ok: false, fehler: ["Teilnahme fehlt."], hinweise };
  if (teilnahme.status !== "aktiv") fehler.push("Abmelden lassen sich nur aktive Teilnahmen.");
  if (!istDatum(zum)) fehler.push("Datum der Abmeldung (letzter Tag der Zuordnung) fehlt.");
  else if (zum < heute) fehler.push("Eine Abmeldung ist nicht rückwirkend möglich (Prozessdatum frühestens heute, Fachkonzept 2.7).");
  if (prozesse.some((p) => p.teilnahmeId === teilnahme.id && PROZESS_OFFEN.includes(p.status))) fehler.push("Für diese Teilnahme läuft bereits ein EDA-Prozess.");
  if (!teilnahme.consentId) hinweise.push("Consent-ID fehlt – wird als „Migration“ gesendet (Altfall vor 03.10.2022, HA II 7.2), bitte prüfen.");
  return { ok: !fehler.length, fehler, hinweise };
}

/** Nachforderung (CR_REQ_PT) prüfen: Zeitraum nach Aktivierung, nicht in der Zukunft, höchstens 31 Tage je Anfrage */
export function nachforderungPruefen({ gemeinschaft, teilnahme, von, bis, heute }) {
  const fehler = [...gemeinschaftEdaPruefen(gemeinschaft)];
  if (!teilnahme) return { ok: false, fehler: ["Teilnahme fehlt."], hinweise: [] };
  if (!["aktiv", "abmeldung_angefragt", "beendet"].includes(teilnahme.status)) fehler.push("Nachforderung nur für aktivierte Teilnahmen.");
  if (!istDatum(von) || !istDatum(bis) || von > bis) fehler.push("Zeitraum (von ≤ bis) fehlt.");
  else {
    if (bis >= heute) fehler.push("Nachforderung nur für vergangene Tage (Daten frühestens am Folgetag).");
    if (teilnahme.gueltigAb && von < teilnahme.gueltigAb) fehler.push(`Vor der Aktivierung (${datumDe(teilnahme.gueltigAb)}) gibt es keine Gemeinschaftsdaten.`);
    if (tageZwischen(von, bis) > 30) fehler.push("Höchstens 31 Tage je Nachforderung (Plattform-Regel).");
  }
  return { ok: !fehler.length, fehler, hinweise: [] };
}

/** Vier-Augen-Prinzip für Massenabmeldungen und TF-Massenänderungen (Fachkonzept 5) */
export const vierAugenNoetig = (art, anzahl) => ["abmelden", "tf"].includes(art) && Number(anzahl) >= VIER_AUGEN_AB;

// ---------------------------------------------------------------- Prozess anlegen und Startnachricht

/** Neuer Prozess (ohne id/conversationId – vergibt das Backend) */
export function prozessNeu({ prozesscode, gemeinschaft, teilnahme = null, zaehlpunkt = null, netzbetreiber = null, prozessdatum, parameter = {}, freigabeNoetig = false, jetzt, von = null }) {
  const p = EDA_PROZESSE[prozesscode];
  if (!p) throw new Error(`Unbekannter Prozess ${prozesscode}`);
  const status = freigabeNoetig ? "freigabe_offen" : "entwurf";
  return {
    gemeinschaftId: gemeinschaft?.id || "", prozesscode, version: p.version, teilnahmeId: teilnahme?.id || "", zaehlpunktId: zaehlpunkt?.id || "", zaehlpunktnummer: zaehlpunkt?.zaehlpunktnummer || "",
    netzbetreiberId: netzbetreiber?.id || zaehlpunkt?.netzbetreiberId || "", empfaenger: netzbetreiber?.marktpartnerId || "", prozessdatum, status, responsecode: "", responsetext: "",
    fristBis: "", gesendetAm: "", versuche: 0, freigabe: freigabeNoetig ? { status: "offen", beantragtVon: von, von: null, am: "" } : { status: "", beantragtVon: null, von: null, am: "" },
    massenId: "", parameter, ergebnis: {}, erinnerungen: [], merker: [], nachfolgerId: "",
    verlauf: [{ am: jetzt, von: "", nach: status, nachricht: "", text: freigabeNoetig ? "Angelegt – Freigabe durch den Vorstand nötig (Vier-Augen)" : "Angelegt", konto: von }],
  };
}

/**
 * Startnachricht eines ausgehenden Prozesses bauen.
 * @returns {{code:string, xml:string}}
 */
export function startNachricht(prozess, { gemeinschaft, zaehlpunkt = null, teilnahme = null, messageId, erstellt, modus = "PROD", duplikat = false }) {
  const pc = prozess.prozesscode;
  const def = EDA_PROZESSE[pc];
  if (!def || def.richtung !== "aus" || def.intern) throw new Error(`Prozess ${pc} wird nicht von der Gemeinschaft gestartet.`);
  const zp = zaehlpunkt?.zaehlpunktnummer || prozess.zaehlpunktnummer;
  const ecid = gemeinschaft.gemeinschaftsId;
  const consent = teilnahme?.consentId || "Migration";
  const par = prozess.parameter || {};
  let daten;
  if (pc === "EC_REQ_ONL" || pc === "EC_REQ_OFF") {
    daten = {
      MeteringPoint: zp, CMRequestId: prozess.conversationId, ReqDatType: pc === "EC_REQ_OFF" ? "EnergyCommunityRegistrationOffline" : "EnergyCommunityRegistration", DateFrom: prozess.prozessdatum, ECID: ecid,
      ECPartFact: String(teilnahme?.teilnahmefaktor ?? par.teilnahmefaktor), EnergyDirection: RICHTUNG_EDA[zaehlpunkt?.richtung] || par.richtung,
      ECShare: gemeinschaft.verteilmodell === "statisch" && teilnahme?.aufteilungsschluesselPct ? teilnahme.aufteilungsschluesselPct : undefined, ECDisModel: MODELL_EDA[gemeinschaft.verteilmodell],
    };
  } else if (pc === "EC_PRTFACT_CHG") daten = { MeteringPoint: zp, ECID: ecid, ConsentId: consent, DateFrom: par.ab, ECPartFact: String(par.teilnahmefaktor) };
  else if (pc === "EC_PRT_CHANGE") daten = { MeteringPoint: zp, ECID: ecid, ConsentId: consent, DateFrom: par.ab, ECShare: par.pct };
  else if (pc === "CM_REV_SP") daten = { MeteringPoint: zp, ECID: ecid, ConsentId: consent, ConsentEnd: par.zum, Reason: "SP" };
  else if (pc === "CR_REQ_PT") daten = { MeteringPoint: zp, ECID: ecid, DateTimeFrom: par.vonUtc, DateTimeTo: par.bisUtc };
  else if (pc === "EC_PODLIST") daten = { ECID: ecid };
  const code = def.start;
  const xml = nachrichtBauen({ code, prozesscode: pc, absender: gemeinschaft.marktpartnerId, empfaenger: prozess.empfaenger, erstellt, messageId, conversationId: prozess.conversationId, prozessdatum: prozess.prozessdatum, modus, duplikat, daten });
  return { code, xml };
}

/** Prozess als gesendet markieren (nach erfolgreicher Übergabe an Gateway bzw. Simulator) */
export function alsGesendet(prozess, { jetzt, messageId, wiederholung = false }) {
  const neu = { ...prozess, verlauf: [...prozess.verlauf] };
  const von = neu.status;
  neu.status = "gesendet";
  neu.gesendetAm = jetzt;
  neu.versuche = (neu.versuche || 0) + 1;
  neu.verlauf.push({ am: jetzt, von, nach: "gesendet", nachricht: EDA_PROZESSE[prozess.prozesscode]?.start || "", text: wiederholung ? `Erneut gesendet (Versuch ${neu.versuche}, ${messageId})` : `Gesendet (${messageId})`, konto: null });
  return neu;
}

/** Freigabe (Vier-Augen) erteilen oder ablehnen – nicht durch die beantragende Person */
export function freigabeAnwenden(prozess, { entscheidung, von, jetzt, grund = "" }) {
  if (prozess.status !== "freigabe_offen") throw new Error("Für diesen Prozess ist keine Freigabe offen.");
  if (von && prozess.freigabe?.beantragtVon && von === prozess.freigabe.beantragtVon) throw new Error("Vier-Augen-Prinzip: Die beantragende Person kann nicht selbst freigeben.");
  const ok = entscheidung === "erteilen";
  const nach = ok ? "entwurf" : "verworfen";
  return { ...prozess, status: nach, freigabe: { ...prozess.freigabe, status: ok ? "erteilt" : "abgelehnt", von, am: jetzt }, verlauf: [...prozess.verlauf, { am: jetzt, von: "freigabe_offen", nach, nachricht: "", text: ok ? "Freigegeben (Vier-Augen)" : `Freigabe abgelehnt${grund ? `: ${grund}` : ""}`, konto: von }] };
}

// ---------------------------------------------------------------- Eingang verarbeiten

function setze(prozess, status, { jetzt, code, text, responsecode }) {
  const neu = { ...prozess, verlauf: [...(prozess.verlauf || [])], merker: [...(prozess.merker || [])] };
  if (responsecode !== undefined && responsecode !== "") {
    neu.responsecode = responsecode;
    neu.responsetext = responsecodeInfo(responsecode).text;
  }
  const von = neu.status;
  if (status) neu.status = status;
  neu.verlauf.push({ am: jetzt, von, nach: neu.status, nachricht: code, text: text || "", konto: null });
  return neu;
}

/**
 * Eingehende Nachricht auf einen bestehenden Prozess anwenden.
 * @param {object} prozess
 * @param {{kopf:object, daten:object}} n gelesene Nachricht (nachrichtLesen)
 * @param {{teilnahme?:object, jetzt:string}} o
 * @returns {{prozess:object, ereignisse:object[], energiedaten:boolean, hinweise:string[], klaerfall:string, verteilschluessel:string}}
 */
export function eingangAnwenden(prozess, n, { teilnahme = null, jetzt }) {
  const code = n.kopf.nachrichtencode;
  const d = n.daten || {};
  const rc = d.ResponseCode || "";
  const info = responsecodeInfo(rc);
  const pc = prozess.prozesscode;
  const ts = teilnahme?.status || "";
  const tag = tagVon(n.kopf.erstellt || jetzt);
  const aus = { prozess, ereignisse: [], energiedaten: false, hinweise: [], klaerfall: "", verteilschluessel: "" };
  const ev = (ereignis, extra = {}) => aus.ereignisse.push({ ereignis, responsecode: rc || undefined, ...extra });
  const offen = PROZESS_OFFEN.includes(prozess.status);
  if (!offen && !(pc === "CR_REQ_PT" && code === "DATEN_CRMSG")) {
    aus.prozess = setze(prozess, null, { jetzt, code, text: "Nachricht zu bereits abgeschlossenem Prozess – nur protokolliert", responsecode: rc });
    aus.hinweise.push(`Prozess ist bereits „${PROZESS_STATUS[prozess.status]?.label || prozess.status}“ – Nachricht ${code} nur protokolliert.`);
    return aus;
  }
  if (code === "EDASendError") {
    aus.prozess = setze(prozess, "fehler", { jetzt, code, text: `Zustellfehler der EDA-Plattform${d.ErrorText ? `: ${d.ErrorText}` : ""}`, responsecode: rc });
    if (ts === "angefragt") ev("fehler");
    aus.klaerfall = "Zustellfehler – Adressierung (Marktpartner-ID des Netzbetreibers) und Gateway prüfen, dann erneut senden.";
    return aus;
  }
  if (pc === "EC_REQ_ONL" || pc === "EC_REQ_OFF") {
    if (code === "ANTWORT_ECON") {
      if (ts === "angefragt") {
        ev("anforderung_econ", { datum: tag });
        aus.prozess = { ...setze(prozess, "bestaetigt", { jetzt, code, text: `Netzbetreiber hat die Anmeldung angenommen und die Zustimmung beim Mitglied angefordert (Frist ${EDA_FRISTEN.zustimmungTage} Tage)`, responsecode: rc }), fristBis: plusTage(tag, EDA_FRISTEN.zustimmungTage) };
      } else if (ts === "zugestimmt" || ts === "zustimmung_offen") {
        if (ts === "zustimmung_offen") aus.hinweise.push("ANTWORT_ECON nach Zustimmungsanforderung – nur protokolliert.");
        else ev("antwort_econ", { datum: tag });
        aus.prozess = { ...setze(prozess, "bestaetigt", { jetzt, code, text: CODES_TECHNIK.includes(rc) ? `Technik ausständig: ${info.text}` : `Antwort des Netzbetreibers${rc ? ` (${rc} ${info.text})` : ""}`, responsecode: rc }), ...(ts === "zugestimmt" ? { technikSeit: tag } : {}) };
      } else {
        aus.prozess = setze(prozess, null, { jetzt, code, text: "Antwort protokolliert", responsecode: rc });
        aus.hinweise.push(`ANTWORT_ECON passt nicht zum Teilnahme-Status „${ts || "–"}“.`);
      }
      return aus;
    }
    if (code === "ZUSTIMMUNG_ECON") {
      if (ts === "angefragt") ev("anforderung_econ", { datum: tag });
      if (ts === "angefragt" || ts === "zustimmung_offen") ev("zustimmung_econ", { consentId: d.ConsentId, datum: tag });
      else aus.hinweise.push(`ZUSTIMMUNG_ECON passt nicht zum Teilnahme-Status „${ts || "–"}“.`);
      aus.prozess = { ...setze(prozess, "bestaetigt", { jetzt, code, text: `Mitglied hat zugestimmt (Consent-ID ${d.ConsentId})${pc === "EC_REQ_OFF" ? `; Widerruf binnen ${EDA_FRISTEN.offlineWiderrufTage} Tagen möglich` : ""}`, responsecode: rc }), fristBis: "" };
      return aus;
    }
    if (code === "ABSCHLUSS_ECON") {
      if (ts === "angefragt") ev("anforderung_econ", { datum: tag });
      if (ts === "angefragt" || ts === "zustimmung_offen") ev("zustimmung_econ", { consentId: d.ConsentId, datum: tag });
      if (["angefragt", "zustimmung_offen", "zugestimmt", "wartet_technik"].includes(ts)) ev("abschluss_econ", { datum: d.DateActivate, consentId: d.ConsentId });
      else aus.hinweise.push(`ABSCHLUSS_ECON passt nicht zum Teilnahme-Status „${ts || "–"}“.`);
      if (teilnahme && Number(d.ECPartFact) !== Number(teilnahme.teilnahmefaktor)) aus.klaerfall = `Netzbetreiber meldet Teilnahmefaktor ${d.ECPartFact} %, Plattform ${teilnahme.teilnahmefaktor} % – bitte abgleichen (EC_PODLIST).`;
      aus.prozess = { ...setze(prozess, "abgeschlossen", { jetzt, code, text: `Zuordnung aktiv ab ${datumDe(d.DateActivate)}`, responsecode: rc }), fristBis: "", ergebnis: { ...prozess.ergebnis, aktivAb: d.DateActivate, consentId: d.ConsentId } };
      return aus;
    }
    if (code === "ABLEHNUNG_ECON") {
      if (ts === "zustimmung_offen" && CODES_KEINE_ZUSTIMMUNG.includes(rc)) ev("frist_abgelaufen", { datum: tag });
      else if (["angefragt", "zustimmung_offen", "wartet_technik"].includes(ts)) ev("ablehnung_econ", { datum: tag });
      else if (ts === "zugestimmt") {
        ev("antwort_econ", { datum: tag });
        ev("ablehnung_econ", { datum: tag });
      } else aus.hinweise.push(`ABLEHNUNG_ECON passt nicht zum Teilnahme-Status „${ts || "–"}“.`);
      aus.prozess = { ...setze(prozess, CODES_KEINE_ZUSTIMMUNG.includes(rc) ? "zeitueberschreitung" : "abgelehnt", { jetzt, code, text: `Abgelehnt: ${rc} ${info.text}`, responsecode: rc }), fristBis: "" };
      return aus;
    }
  }
  if (pc === "EC_PRTFACT_CHG" || pc === "EC_PRT_CHANGE") {
    if (code === "ANTWORT_CPF") {
      if (pc === "EC_PRTFACT_CHG") {
        if (ts === "aktiv") ev("tf_geaendert", { teilnahmefaktor: Number(prozess.parameter?.teilnahmefaktor), datum: d.DateFrom || prozess.parameter?.ab });
        else aus.hinweise.push(`TF-Bestätigung, aber Teilnahme ist „${ts || "–"}“.`);
      } else aus.verteilschluessel = "gueltig";
      aus.prozess = setze(prozess, "abgeschlossen", { jetzt, code, text: pc === "EC_PRTFACT_CHG" ? `Teilnahmefaktor ${prozess.parameter?.teilnahmefaktor} % ab ${datumDe(d.DateFrom || prozess.parameter?.ab)} bestätigt` : "Aufteilungsschlüssel bestätigt", responsecode: rc });
      return aus;
    }
    if (code === "ABLEHNUNG_CPF") {
      aus.prozess = setze(prozess, "abgelehnt", { jetzt, code, text: `Abgelehnt: ${rc} ${info.text}`, responsecode: rc });
      return aus;
    }
  }
  if (pc === "CM_REV_SP") {
    if (code === "ANTWORT_CCMS") {
      if (ts === "abmeldung_angefragt") ev("abmeldung_ok", { datum: d.ConsentEnd || prozess.parameter?.zum });
      else aus.hinweise.push(`Abmeldebestätigung, aber Teilnahme ist „${ts || "–"}“.`);
      aus.prozess = setze(prozess, "abgeschlossen", { jetzt, code, text: `Abmeldung zum ${datumDe(d.ConsentEnd || prozess.parameter?.zum)} bestätigt`, responsecode: rc });
      return aus;
    }
    if (code === "ABLEHNUNG_CCMS") {
      if (ts === "abmeldung_angefragt") ev("abmeldung_abgelehnt");
      aus.prozess = setze(prozess, "abgelehnt", { jetzt, code, text: `Abmeldung abgelehnt: ${rc} ${info.text}`, responsecode: rc });
      return aus;
    }
  }
  if (pc === "CR_REQ_PT") {
    if (code === "ANTWORT_PT") {
      aus.prozess = { ...setze(prozess, "bestaetigt", { jetzt, code, text: "Nachforderung angenommen – Daten folgen", responsecode: rc }), bestaetigtAm: jetzt };
      return aus;
    }
    if (code === "ABLEHNUNG_PT") {
      aus.prozess = setze(prozess, "abgelehnt", { jetzt, code, text: `Nachforderung abgelehnt: ${rc} ${info.text}`, responsecode: rc });
      return aus;
    }
    if (code === "DATEN_CRMSG") {
      aus.energiedaten = true;
      aus.prozess = setze(prozess, "abgeschlossen", { jetzt, code, text: "Nachgeforderte Energiedaten empfangen" });
      return aus;
    }
  }
  if (pc === "EC_PODLIST") {
    if (code === "SENDEN_ECP") {
      aus.prozess = { ...setze(prozess, "abgeschlossen", { jetzt, code, text: `Zählpunktliste empfangen (${(d.MPListData || []).length} Einträge)` }), ergebnis: { ...prozess.ergebnis, liste: d.MPListData || [], modell: d.ECDisModel || "" } };
      return aus;
    }
    if (code === "ABLEHNUNG_ECP") {
      aus.prozess = setze(prozess, "abgelehnt", { jetzt, code, text: `Zählpunktliste abgelehnt: ${rc} ${info.text}`, responsecode: rc });
      return aus;
    }
  }
  aus.prozess = setze(prozess, null, { jetzt, code, text: "Unerwartete Nachricht – nur protokolliert", responsecode: rc });
  aus.hinweise.push(`Nachricht ${code} ist im Prozess ${pc} nicht vorgesehen.`);
  aus.klaerfall = `Unerwartete Nachricht ${code} im Prozess ${pc}.`;
  return aus;
}

/**
 * Eingang ohne bestehenden Prozess (vom Netzbetreiber gestartet): CM_REV_CUS/CM_REV_IMP (Widerruf, implizit) und CR_MSG.
 * @returns {{prozesscode:string, ereignisse:object[], energiedaten:boolean, text:string, hinweise:string[]}}
 */
export function eingangOhneProzess(n, { teilnahme = null }) {
  const code = n.kopf.nachrichtencode;
  const pc = n.kopf.prozesscode;
  const d = n.daten || {};
  const ts = teilnahme?.status || "";
  if (code === "AUFHEBUNG_CCMS" && (pc === "CM_REV_CUS" || pc === "CM_REV_IMP")) {
    const ereignis = pc === "CM_REV_CUS" ? "cm_rev_cus" : "cm_rev_imp";
    const ereignisse = [];
    const hinweise = [];
    if (ts === "aktiv") ereignisse.push({ ereignis, datum: d.ConsentEnd });
    else if (ts === "abmeldung_angefragt") ereignisse.push({ ereignis: "abmeldung_ok", datum: d.ConsentEnd });
    else hinweise.push(`Aufhebung durch den Netzbetreiber, aber Teilnahme ist „${ts || "nicht gefunden"}“.`);
    const text = pc === "CM_REV_CUS" ? `Mitglied hat die Zuordnung im Netzbetreiber-Portal widerrufen (Ende ${datumDe(d.ConsentEnd)}) – Vertragsende prüfen` : `Implizite Abmeldung (Auszug bzw. vertragsloser Zustand) zum ${datumDe(d.ConsentEnd)} – Nachmieter muss sich neu anmelden`;
    return { prozesscode: pc, ereignisse, energiedaten: false, text, hinweise };
  }
  if (code === "DATEN_CRMSG") return { prozesscode: "CR_MSG", ereignisse: [], energiedaten: true, text: "Energiedaten empfangen", hinweise: [] };
  return { prozesscode: "", ereignisse: [], energiedaten: false, text: "", hinweise: [`Nachricht ${code} ohne zugehörigen Prozess (ConversationId ${n.kopf.conversationId}).`] };
}

// ---------------------------------------------------------------- Fristen, Wiederholungen, Erinnerungen

/** Fällige Erinnerungsstufe (1 …) für eine offene Zustimmung oder 0 */
export function erinnerungFaellig(prozess, teilnahme, heute) {
  if (!prozess || prozess.status !== "bestaetigt" || teilnahme?.status !== "zustimmung_offen" || !prozess.fristBis) return 0;
  const seit = tageZwischen(plusTage(prozess.fristBis, -EDA_FRISTEN.zustimmungTage), heute);
  if (heute > prozess.fristBis) return 0;
  const erledigt = new Set((prozess.erinnerungen || []).map((e) => e.stufe));
  let faellig = 0;
  EDA_FRISTEN.erinnerungTage.forEach((t, i) => {
    if (seit >= t && !erledigt.has(i + 1)) faellig = i + 1;
  });
  // nur die höchste fällige Stufe senden, wenn keine höhere schon erledigt ist
  return faellig && ![...erledigt].some((s) => s > faellig) ? faellig : 0;
}

/**
 * Fristenlauf: Aktionen für alle Prozesse.
 * @param {{prozesse:object[], teilnahmen:Object<string,object>, heute:string}} o
 * @returns {{art:string, prozessId:string, teilnahmeId:string, stufe?:number, text:string}[]}
 */
export function fristenPruefen({ prozesse = [], teilnahmen = {}, heute }) {
  const aktionen = [];
  for (const p of prozesse) {
    const t = p.teilnahmeId ? teilnahmen[p.teilnahmeId] || null : null;
    const a = (art, text, extra = {}) => aktionen.push({ art, prozessId: p.id, teilnahmeId: p.teilnahmeId || "", text, ...extra });
    const merker = new Set(p.merker || []);
    if (p.status === "gesendet" && p.gesendetAm && !EDA_PROZESSE[p.prozesscode]?.intern) {
      const warte = EDA_FRISTEN.backoffTage[Math.max(0, (p.versuche || 1) - 1)] ?? EDA_FRISTEN.antwortTage;
      if (tageZwischen(tagVon(p.gesendetAm), heute) >= warte) {
        if ((p.versuche || 1) < EDA_FRISTEN.maxVersuche) a("wiederholen", `Keine Antwort seit ${warte} Tagen – erneut senden (Versuch ${(p.versuche || 1) + 1}).`);
        else a("zeitueberschreitung", `Keine Antwort nach ${p.versuche} Versuchen – Klärfall (Gateway, Adressierung, Netzbetreiber).`);
      }
    }
    if (p.status === "bestaetigt" && t?.status === "zustimmung_offen" && p.fristBis && heute > p.fristBis) a("frist_abgelaufen", `Zustimmungsfrist am ${datumDe(p.fristBis)} abgelaufen.`);
    const stufe = erinnerungFaellig(p, t, heute);
    if (stufe) a("erinnern", `Erinnerung ${stufe} an das Mitglied (noch ${tageZwischen(heute, p.fristBis)} Tage).`, { stufe });
    if (p.status === "bestaetigt" && t?.status === "wartet_technik" && p.technikSeit && tageZwischen(p.technikSeit, heute) >= EDA_FRISTEN.technikHinweisTage && !merker.has("technik")) a("hinweis_technik", `Seit ${tageZwischen(p.technikSeit, heute)} Tagen wartet die Aktivierung auf den Netzbetreiber (Smart Meter) – nachfragen bzw. Reklamation.`);
    if (p.prozesscode === "CR_REQ_PT" && p.status === "bestaetigt" && p.bestaetigtAm && tageZwischen(tagVon(p.bestaetigtAm), heute) >= EDA_FRISTEN.nachforderungTage && !merker.has("nachforderung")) a("hinweis_nachforderung", `Nachgeforderte Daten fehlen seit ${EDA_FRISTEN.nachforderungTage} Tagen – Reklamation vorbereiten.`);
    if (p.prozesscode === "REKLAMATION" && p.status === "gesendet" && p.fristBis && heute > p.fristBis && !merker.has("eskalation")) a("reklamation_eskalation", `Keine Antwort des Netzbetreibers bis ${datumDe(p.fristBis)} – Eskalation (Schlichtungsstelle der E-Control) vorbereiten.`);
  }
  return aktionen;
}

/** Zeitüberschreitung bzw. Fristablauf auf den Prozess anwenden */
export function fristAnwenden(prozess, art, { jetzt, text = "" }) {
  const nach = { zeitueberschreitung: "zeitueberschreitung", frist_abgelaufen: "zeitueberschreitung", reklamation_eskalation: "zeitueberschreitung" }[art] || null;
  const merker = { hinweis_technik: "technik", hinweis_nachforderung: "nachforderung", reklamation_eskalation: "eskalation" }[art];
  const neu = setze(prozess, nach, { jetzt, code: "", text: text || art });
  if (merker) neu.merker = [...new Set([...(neu.merker || []), merker])];
  if (art === "frist_abgelaufen") neu.fristBis = prozess.fristBis;
  return neu;
}

/**
 * Fristen-Ampel eines Prozesses: rot (handeln), gelb (beobachten), gruen (läuft), grau (erledigt).
 * @returns {{ampel:"rot"|"gelb"|"gruen"|"grau", tageRest:number|null, text:string}}
 */
export function fristAmpel(prozess, teilnahme, heute) {
  const s = prozess.status;
  if (s === "freigabe_offen") return { ampel: "gelb", tageRest: null, text: "Freigabe durch den Vorstand offen" };
  if (["abgelehnt", "fehler", "zeitueberschreitung"].includes(s)) return prozess.nachfolgerId ? { ampel: "grau", tageRest: null, text: "Neu gestartet" } : { ampel: "rot", tageRest: null, text: s === "abgelehnt" ? `Abgelehnt${prozess.responsecode ? ` (${prozess.responsecode})` : ""}` : PROZESS_STATUS[s].label };
  if (["abgeschlossen", "verworfen"].includes(s)) return { ampel: "grau", tageRest: null, text: PROZESS_STATUS[s].label };
  if (s === "bestaetigt" && prozess.fristBis && teilnahme?.status === "zustimmung_offen") {
    const rest = tageZwischen(heute, prozess.fristBis);
    if (rest < 0) return { ampel: "rot", tageRest: rest, text: "Frist abgelaufen" };
    return { ampel: rest <= 3 ? "rot" : rest <= 10 ? "gelb" : "gruen", tageRest: rest, text: `Zustimmung offen – noch ${rest} ${rest === 1 ? "Tag" : "Tage"}` };
  }
  if (s === "bestaetigt" && teilnahme?.status === "wartet_technik") {
    const seit = prozess.technikSeit ? tageZwischen(prozess.technikSeit, heute) : 0;
    return { ampel: seit >= EDA_FRISTEN.technikHinweisTage ? "rot" : "gelb", tageRest: null, text: `Wartet auf Technik seit ${seit} Tagen` };
  }
  if (prozess.prozesscode === "REKLAMATION" && s === "gesendet" && prozess.fristBis) {
    const rest = tageZwischen(heute, prozess.fristBis);
    return { ampel: rest < 0 ? "rot" : rest <= 3 ? "gelb" : "gruen", tageRest: rest, text: `Antwort des Netzbetreibers bis ${datumDe(prozess.fristBis)}` };
  }
  if (s === "gesendet") return { ampel: (prozess.versuche || 1) > 1 ? "gelb" : "gruen", tageRest: null, text: (prozess.versuche || 1) > 1 ? `Antwort offen – Versuch ${prozess.versuche}` : "Antwort offen" };
  return { ampel: "gruen", tageRest: null, text: PROZESS_STATUS[s]?.label || s };
}

// ---------------------------------------------------------------- Erinnerung an das Mitglied

/**
 * Erinnerungstext mit Anleitung für das Portal des Netzbetreibers.
 * @returns {{betreff:string, text:string}}
 */
export function erinnerungText({ name, gemeinschaftName, gemeinschaftsId, zaehlpunktnummer, teilnahmefaktor, fristBis, netzbetreiberId, netzbetreiberName, stufe = 1, heute }) {
  const a = portalAnleitung(netzbetreiberId);
  const rest = fristBis ? tageZwischen(heute, fristBis) : null;
  const dringend = rest !== null && rest <= 3;
  const betreff = `${dringend ? "Dringend: " : stufe > 1 ? "Erinnerung: " : ""}Bitte Teilnahme an „${gemeinschaftName}“ im Portal Ihres Netzbetreibers bestätigen`;
  const zeilen = [
    `Guten Tag${name ? ` ${name}` : ""},`,
    "",
    `Ihre Anmeldung zur Energiegemeinschaft „${gemeinschaftName}“ liegt bei ${netzbetreiberName || "Ihrem Netzbetreiber"}. Damit sie wirksam wird, müssen Sie selbst im ${a.portal} zustimmen${fristBis ? ` – bis spätestens ${datumDe(fristBis)}${rest !== null && rest >= 0 ? ` (noch ${rest} ${rest === 1 ? "Tag" : "Tage"})` : ""}` : ""}.`,
    "",
    "Ihre Angaben zum Vergleich:",
    `• Zählpunkt: ${zaehlpunktnummer}`,
    `• Gemeinschafts-ID: ${gemeinschaftsId}`,
    `• Teilnahmefaktor: ${teilnahmefaktor} %`,
    "",
    "So geht es:",
    ...a.schritte.map((s, i) => `${i + 1}. ${s}`),
    "",
    a.hinweis,
    "Brauchen Sie Hilfe? Antworten Sie im Portal von ÖkoInvest unter „Nachrichten“ – wir rufen Sie gerne zurück.",
  ];
  return { betreff, text: zeilen.join("\n") };
}
