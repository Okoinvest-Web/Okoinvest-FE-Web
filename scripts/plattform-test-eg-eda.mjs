// scripts/plattform-test-eg-eda.mjs
//
// Tests WP2 „EDA-Marktkommunikation“ (Energiegemeinschaften).
//   node scripts/plattform-test-eg-eda.mjs --vektoren      # Testvektoren (JS = Referenz) nach src/lib/plattform/eg/testdaten/eda/ schreiben
//   node scripts/plattform-test-eg-eda.mjs --nur-logik     # nur reine Regeln + Vektoren (ohne Server)
//   node scripts/plattform-test-eg-eda.mjs [basis-url]     # Logik + EINE Testreihe gegen den Dev-Server (Demo-Backend)
//
// Python-Gegenstück mit denselben Vektoren: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/tests/test_eg_eda_kern.py
// Server-Teil: Rechte (Gast 401, Mitglied 404, Lesen ohne Schreibrecht 403), Übersicht/Journal, Anmeldung mit Simulator
// (Zustellung, Fristen-Ampel, Erinnerung), TF-Änderung (1×/Tag), Massen-Abmeldung mit Vier-Augen-Freigabe durch den
// Obmann, Zählpunktliste mit Abgleich, Nachforderung, Energiedaten an WP3, idempotenter Eingang, Reklamation mit Akte.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import * as E from "../src/lib/plattform/eg/eda/index.js";

const KA = String.fromCharCode(91);
const KZ = String.fromCharCode(93);
const ORDNER = path.join(process.cwd(), "src/lib/plattform/eg/testdaten/eda");
const args = process.argv.slice(2);
const NUR_LOGIK = args.includes("--nur-logik");
const VEKTOREN = args.includes("--vektoren");
const BASIS = (args.find((a) => !a.startsWith("--")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";

let ok = 0;
let fehler = 0;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const rot = (s) => `\x1b[31m${s}\x1b[0m`;
function pruefe(bedingung, text, details) {
  if (bedingung) {
    ok++;
    console.log(`  ${gruen("✓")} ${text}`);
  } else {
    fehler++;
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 500)}` : ""}`);
  }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);
const json = (x) => (x === undefined ? null : JSON.parse(JSON.stringify(x)));

// ================================================================ Testvektoren

const ZP1 = "AT0030000491000000000000000D00001";
const ZP2 = "AT0030000491000000000000000D00002";
const ECID = "AT00300004910RC109417000000000001";
const G = { id: "EGG-26-TEST01", name: "Testgemeinschaft (Demo)", status: "aktiv", marktpartnerId: "RC109417", gemeinschaftsId: ECID, verteilmodell: "dynamisch" };
const GS = { ...G, id: "EGG-26-TEST02", verteilmodell: "statisch" };
const NB = { id: "ENB-OOE", name: "Netz Oberösterreich GmbH", kurzname: "Netz OÖ", marktpartnerId: "AT003000", kontaktEmail: "" };
const ZPV = { id: "EZP-26-A", zaehlpunktnummer: ZP1, richtung: "verbrauch", smartMeter: "ja", netzbetreiberId: "ENB-OOE" };
const ZPE = { id: "EZP-26-B", zaehlpunktnummer: ZP2, richtung: "erzeugung", smartMeter: "nein", netzbetreiberId: "ENB-OOE" };
const T = (status, extra = {}) => ({ id: "ETN-26-A", zaehlpunktId: "EZP-26-A", gemeinschaftId: G.id, mitgliedId: "EMG-26-A", teilnahmefaktor: 100, aufteilungsschluesselPct: null, consentId: "", tfHistorie: [], status, ...extra });
const J = "2026-10-01T08:00:00.000Z";
const HEUTE = "2026-10-01";

function prozess(pc, status, extra = {}) {
  const p = E.prozessNeu({ prozesscode: pc, gemeinschaft: G, teilnahme: T("entwurf"), zaehlpunkt: ZPV, netzbetreiber: NB, prozessdatum: HEUTE, parameter: extra.parameter || {}, jetzt: J });
  return { ...p, id: "EDP-26-T1", conversationId: "RC10941720261001080000ABCDEF", status, ...extra };
}
function ein(code, pc, daten, { erstellt = "2026-10-02T09:00:00Z", conv = "RC10941720261001080000ABCDEF", mid = "AT00300020261002090000M00001" } = {}) {
  const xml = E.nachrichtBauen({ code, prozesscode: pc, absender: "AT003000", empfaenger: "RC109417", erstellt, messageId: mid, conversationId: conv, prozessdatum: erstellt.slice(0, 10), daten });
  return { xml, n: E.nachrichtLesen(xml) };
}

function vektorenErzeugen() {
  const v = {};
  const fall = (datei, fn, args, name = "") => {
    const f = E[fn] || (fn === "zufallFolge" ? zufallFolge : null);
    let r;
    try {
      r = { ergebnis: json(f(...args)) };
    } catch (e) {
      r = { fehler: e.message };
    }
    (v[datei] ||= []).push({ name: name || fn, fn, args: json(args), ...r });
  };
  // ---- zeit
  for (const t of ["2026-03-29", "2026-10-25", "2026-10-01", "2027-03-28", "2026-12-31"]) {
    fall("zeit", "tagBeginnUtc", [t]);
    fall("zeit", "qhAnzahl", [t]);
  }
  fall("zeit", "wienOffsetMinuten", [Date.parse("2026-10-25T00:59:59Z")]);
  fall("zeit", "wienOffsetMinuten", [Date.parse("2026-10-25T01:00:00Z")]);
  fall("zeit", "lokalTag", ["2026-10-24T22:00:00Z"]);
  fall("zeit", "lokalTag", ["2026-12-31T23:30:00Z"]);
  fall("zeit", "plusTage", ["2026-10-01", 30]);
  fall("zeit", "tageZwischen", ["2026-10-01", "2026-10-31"]);
  fall("zeit", "tageListe", ["2026-10-30", "2026-11-02"]);
  // ---- xml
  fall("xml", "xmlSchreiben", [{ name: "A", attrs: { x: "1 & 2", y: '"q"' }, kinder: [{ name: "B", text: "<ä>" }, { name: "C" }, { name: "D", text: 5 }] }]);
  fall("xml", "xmlLesen", [`<?xml version="1.0"?><!-- k --><p:A xmlns:p="urn:x" a="1"><p:B>x &amp; y &#228;</p:B><C/><D><!${KA}CDATA${KA}<roh>${KZ}${KZ}></D></p:A>`]);
  fall("xml", "xmlLesen", [`<!DOCTYPE x ${KA}<!ENTITY a "b">${KZ}><A/>`], "DOCTYPE abgelehnt");
  fall("xml", "xmlLesen", ["<A><B></A>"], "falsches Endtag");
  fall("xml", "xmlLesen", ["<A>&foo;</A>"], "unbekannte Entität");
  fall("xml", "xmlLesen", ["<A/><B/>"], "zwei Wurzeln");
  // ---- schema
  const anf = { code: "ANFORDERUNG_ECON", prozesscode: "EC_REQ_ONL", absender: "RC109417", empfaenger: "AT003000", erstellt: "2026-10-01T08:00:00Z", messageId: "RC10941720261001080000AAAAAA", conversationId: "RC10941720261001080000ABCDEF", prozessdatum: "2026-10-02", daten: { MeteringPoint: ZP1, CMRequestId: "RC10941720261001080000ABCDEF", ReqDatType: "EnergyCommunityRegistration", DateFrom: "2026-10-02", ECID, ECPartFact: "60", EnergyDirection: "CONSUMPTION", ECShare: 10.5, ECDisModel: "STATIC" } };
  fall("schema", "nachrichtBauen", [anf], "Anmeldung");
  fall("schema", "nachrichtBauen", [{ ...anf, daten: { ...anf.daten, ECPartFact: "0", MeteringPoint: "AT123" } }], "ungültige Anmeldung");
  fall("schema", "nachrichtBauen", [{ ...anf, prozesscode: "CM_REV_SP" }], "Prozess passt nicht");
  fall("schema", "nachrichtLesen", [E.nachrichtBauen(anf)], "Anmeldung lesen");
  fall("schema", "nachrichtLesen", ["<CMRequest><MarketParticipantDirectory/></CMRequest>"], "Aufbau fehlt");
  fall("schema", "nachrichtLesen", [E.nachrichtBauen(anf).replace("ANFORDERUNG_ECON", "ZUSTIMMUNG_ECON")], "Schema passt nicht");
  fall("schema", "nachrichtLesen", [E.nachrichtBauen(anf).replace("<ProcessCode>EC_REQ_ONL</ProcessCode>", "")], "ProcessCode fehlt, mehrdeutig");
  const podl = { code: "SENDEN_ECP", prozesscode: "EC_PODLIST", absender: "AT003000", empfaenger: "RC109417", erstellt: "2026-10-01T08:00:00Z", messageId: "M2", conversationId: "C2", prozessdatum: "2026-10-01", daten: { ECID, ECDisModel: "DYNAMIC", MPListData: [{ MeteringPoint: ZP1, ConsentId: "C-1", EnergyDirection: "CONSUMPTION", ECPartFact: "100", DateFrom: "2026-01-01" }, { MeteringPoint: ZP2, EnergyDirection: "GENERATION", ECPartFact: "60" }] } };
  fall("schema", "nachrichtBauen", [podl], "Zählpunktliste");
  fall("schema", "nachrichtLesen", [E.nachrichtBauen(podl)], "Zählpunktliste lesen");
  const ed = E.simulatorEnergiedaten({ zaehlpunktnummer: ZP1, tag: "2026-10-25", richtung: "verbrauch", teilnahmefaktor: 80, seed: "vektor" });
  ed.reihen[0].werte[5] = null;
  const crx = E.nachrichtBauen({ code: "DATEN_CRMSG", prozesscode: "CR_MSG", absender: "AT003000", empfaenger: "RC109417", erstellt: "2026-10-26T03:00:00Z", messageId: "M3", conversationId: "C3", prozessdatum: "2026-10-25", daten: { MeteringPoint: ZP1, Energy: ed } });
  fall("schema", "nachrichtLesen", [crx], "Energiedaten 100 Viertelstunden mit Lücke");
  for (const x of [0, 1.5, 0.1 + 0.2, -0.0000001, 123456.7890123, 2.5e-7]) fall("schema", "zahlFormat", [x]);
  fall("schema", "nachrichtBauen", [{ ...podl, code: "ANFORDERUNG_CPF", prozesscode: "EC_PRTFACT_CHG", daten: { MeteringPoint: ZP1, ECID, ConsentId: "C-1", DateFrom: "2026-10-02" } }], "CPF ohne TF/Schlüssel");
  // ---- codes
  for (const c of ["99", "183", "999", ""]) fall("codes", "responsecodeInfo", [c]);
  fall("codes", "portalAnleitung", ["ENB-OOE"]);
  fall("codes", "portalAnleitung", ["ENB-XYZ"]);
  // ---- automat: Prüfungen
  fall("automat", "edaId", ["RC109417", "2026-10-01T08:00:00.000Z", "ab12"]);
  fall("automat", "gemeinschaftEdaPruefen", [{ ...G, marktpartnerId: "", status: "in_gruendung" }]);
  fall("automat", "anmeldungPruefen", [{ gemeinschaft: G, teilnahme: T("entwurf"), zaehlpunkt: ZPV, teilnahmenDesZp: [T("entwurf"), { id: "X", status: "aktiv", teilnahmefaktor: 40 }], offeneProzesse: [], heute: HEUTE }], "Anmeldung Σ TF > 100");
  fall("automat", "anmeldungPruefen", [{ gemeinschaft: GS, teilnahme: T("abgelehnt", { teilnahmefaktor: 50 }), zaehlpunkt: { ...ZPV, smartMeter: "nein" }, teilnahmenDesZp: [], offeneProzesse: [], heute: HEUTE }], "statisch ohne Schlüssel, erneut");
  fall("automat", "anmeldungPruefen", [{ gemeinschaft: G, teilnahme: T("entwurf", { teilnahmefaktor: 60 }), zaehlpunkt: ZPE, teilnahmenDesZp: [1, 2, 3, 4, 5].map((i) => ({ id: `X${i}`, status: "aktiv", teilnahmefaktor: 5 })), offeneProzesse: [], heute: HEUTE }], "mehr als 5 Teilnahmen");
  fall("automat", "tfAenderungPruefen", [{ gemeinschaft: G, teilnahme: T("aktiv", { tfHistorie: [{ gueltigAb: "2026-10-02", tf: 100 }], consentId: "C-1" }), teilnahmefaktor: 80, ab: "2026-10-02", teilnahmenDesZp: [], prozesse: [], heute: HEUTE }], "TF zweimal am Tag");
  fall("automat", "tfAenderungPruefen", [{ gemeinschaft: G, teilnahme: T("aktiv"), teilnahmefaktor: 101, ab: "2026-09-30", teilnahmenDesZp: [], prozesse: [{ teilnahmeId: "ETN-26-A", status: "gesendet", prozesscode: "CM_REV_SP" }], heute: HEUTE }], "TF ungültig, rückwirkend, Prozess läuft");
  fall("automat", "tfAenderungPruefen", [{ gemeinschaft: G, teilnahme: T("aktiv", { consentId: "C-1" }), teilnahmefaktor: 70, ab: "2026-10-05", teilnahmenDesZp: [{ id: "Y", status: "aktiv", teilnahmefaktor: 40 }], prozesse: [], heute: HEUTE }], "TF Σ > 100");
  fall("automat", "abmeldungPruefen", [{ gemeinschaft: G, teilnahme: T("aktiv"), zum: "2026-09-30", prozesse: [], heute: HEUTE }], "Abmeldung rückwirkend");
  fall("automat", "abmeldungPruefen", [{ gemeinschaft: G, teilnahme: T("aktiv", { consentId: "C-1" }), zum: "2026-10-31", prozesse: [], heute: HEUTE }], "Abmeldung ok");
  fall("automat", "nachforderungPruefen", [{ gemeinschaft: G, teilnahme: T("aktiv", { gueltigAb: "2026-09-15" }), von: "2026-09-01", bis: "2026-10-01", heute: HEUTE }], "Nachforderung vor Aktivierung/heute");
  fall("automat", "vierAugenNoetig", ["abmelden", 3]);
  fall("automat", "vierAugenNoetig", ["anmelden", 30]);
  // ---- automat: Prozess, Startnachricht, Versand, Freigabe
  fall("automat", "prozessNeu", [{ prozesscode: "CM_REV_SP", gemeinschaft: G, teilnahme: T("aktiv"), zaehlpunkt: ZPV, netzbetreiber: NB, prozessdatum: "2026-10-31", parameter: { zum: "2026-10-31" }, freigabeNoetig: true, jetzt: J, von: "U-1" }]);
  const pAnm = prozess("EC_REQ_ONL", "entwurf");
  fall("automat", "startNachricht", [pAnm, { gemeinschaft: GS, zaehlpunkt: ZPV, teilnahme: T("entwurf", { aufteilungsschluesselPct: 12.5 }), messageId: "RC10941720261001080000M00001", erstellt: "2026-10-01T08:00:00Z" }], "Start Anmeldung statisch");
  fall("automat", "startNachricht", [prozess("CM_REV_SP", "entwurf", { parameter: { zum: "2026-10-31" } }), { gemeinschaft: G, zaehlpunkt: ZPV, teilnahme: T("aktiv"), messageId: "M5", erstellt: "2026-10-01T08:00:00Z", modus: "SIMU" }], "Start Abmeldung ohne Consent (Migration)");
  fall("automat", "startNachricht", [prozess("CR_REQ_PT", "entwurf", { parameter: { vonUtc: "2026-09-19T22:00:00Z", bisUtc: "2026-09-21T22:00:00Z" } }), { gemeinschaft: G, zaehlpunkt: ZPV, teilnahme: T("aktiv"), messageId: "M6", erstellt: "2026-10-01T08:00:00Z" }], "Start Nachforderung");
  fall("automat", "startNachricht", [prozess("CM_REV_CUS", "entwurf"), { gemeinschaft: G, messageId: "M7", erstellt: "2026-10-01T08:00:00Z" }], "eingehender Prozess nicht startbar");
  fall("automat", "alsGesendet", [pAnm, { jetzt: J, messageId: "M1" }]);
  fall("automat", "alsGesendet", [{ ...pAnm, versuche: 1, status: "gesendet" }, { jetzt: J, messageId: "M1b", wiederholung: true }]);
  const pFrei = { ...prozess("CM_REV_SP", "freigabe_offen"), freigabe: { status: "offen", beantragtVon: "U-1", von: null, am: "" } };
  fall("automat", "freigabeAnwenden", [pFrei, { entscheidung: "erteilen", von: "U-1", jetzt: J }], "Vier-Augen selbst");
  fall("automat", "freigabeAnwenden", [pFrei, { entscheidung: "erteilen", von: "U-2", jetzt: J }], "Vier-Augen erteilt");
  fall("automat", "freigabeAnwenden", [pFrei, { entscheidung: "ablehnen", von: "U-2", jetzt: J, grund: "falsches Datum" }], "Vier-Augen abgelehnt");
  // ---- automat: Eingänge
  const g = (status) => prozess("EC_REQ_ONL", status, { gesendetAm: J, versuche: 1 });
  const b = { MeteringPoint: ZP1, CMRequestId: "RC10941720261001080000ABCDEF" };
  const eingang = (name, p, code, pc, daten, t, o) => fall("automat", "eingangAnwenden", [p, ein(code, pc, daten, o).n, { teilnahme: t, jetzt: "2026-10-02T09:00:01.000Z" }], name);
  eingang("ANTWORT_ECON 99 → Zustimmung angefordert", g("gesendet"), "ANTWORT_ECON", "EC_REQ_ONL", { ...b, ResponseCode: "99" }, T("angefragt"));
  eingang("ZUSTIMMUNG_ECON ohne vorherige Antwort (Reihenfolge)", g("gesendet"), "ZUSTIMMUNG_ECON", "EC_REQ_ONL", { ...b, ResponseCode: "175", ConsentId: "CONS-1" }, T("angefragt"));
  eingang("ANTWORT_ECON 182 nach Zustimmung → Technik", g("bestaetigt"), "ANTWORT_ECON", "EC_REQ_ONL", { ...b, ResponseCode: "182" }, T("zugestimmt"));
  eingang("ABSCHLUSS_ECON mit TF-Abweichung", g("bestaetigt"), "ABSCHLUSS_ECON", "EC_REQ_ONL", { MeteringPoint: ZP1, ECID, ConsentId: "CONS-1", DateActivate: "2026-10-03", ECPartFact: "90", EnergyDirection: "CONSUMPTION" }, T("wartet_technik"));
  eingang("ABLEHNUNG_ECON 173 → Frist abgelaufen", g("bestaetigt"), "ABLEHNUNG_ECON", "EC_REQ_ONL", { ...b, ResponseCode: "173" }, T("zustimmung_offen"));
  eingang("ABLEHNUNG_ECON 183 im Status angefragt", g("gesendet"), "ABLEHNUNG_ECON", "EC_REQ_ONL", { ...b, ResponseCode: "183" }, T("angefragt"));
  eingang("ABLEHNUNG nach Zustimmung", g("bestaetigt"), "ABLEHNUNG_ECON", "EC_REQ_ONL", { ...b, ResponseCode: "57" }, T("zugestimmt"));
  eingang("EDASendError", g("gesendet"), "EDASendError", "EC_REQ_ONL", { ResponseCode: "76", ErrorText: "Empfänger unbekannt" }, T("angefragt"));
  eingang("Nachricht zu abgeschlossenem Prozess", g("abgeschlossen"), "ANTWORT_ECON", "EC_REQ_ONL", { ...b, ResponseCode: "99" }, T("aktiv"));
  const ptf = prozess("EC_PRTFACT_CHG", "gesendet", { parameter: { teilnahmefaktor: 80, ab: "2026-10-05" } });
  eingang("TF bestätigt", ptf, "ANTWORT_CPF", "EC_PRTFACT_CHG", { MeteringPoint: ZP1, ResponseCode: "99", DateFrom: "2026-10-05" }, T("aktiv"));
  eingang("TF abgelehnt 86", ptf, "ABLEHNUNG_CPF", "EC_PRTFACT_CHG", { MeteringPoint: ZP1, ResponseCode: "86" }, T("aktiv"));
  eingang("Schlüssel bestätigt", prozess("EC_PRT_CHANGE", "gesendet", { parameter: { pct: 12.5, ab: "2026-10-05" } }), "ANTWORT_CPF", "EC_PRT_CHANGE", { MeteringPoint: ZP1, ResponseCode: "99" }, T("aktiv"));
  const pab = prozess("CM_REV_SP", "gesendet", { parameter: { zum: "2026-10-31" } });
  eingang("Abmeldung bestätigt", pab, "ANTWORT_CCMS", "CM_REV_SP", { MeteringPoint: ZP1, ResponseCode: "99", ConsentEnd: "2026-10-31" }, T("abmeldung_angefragt"));
  eingang("Abmeldung abgelehnt", pab, "ABLEHNUNG_CCMS", "CM_REV_SP", { MeteringPoint: ZP1, ResponseCode: "82" }, T("abmeldung_angefragt"));
  const ppt = prozess("CR_REQ_PT", "gesendet", { parameter: { von: "2026-09-20", bis: "2026-09-21" } });
  eingang("Nachforderung angenommen", ppt, "ANTWORT_PT", "CR_REQ_PT", { MeteringPoint: ZP1, ResponseCode: "99" }, T("aktiv"));
  eingang("Nachforderung Daten", { ...ppt, status: "abgeschlossen" }, "DATEN_CRMSG", "CR_REQ_PT", { MeteringPoint: ZP1, Energy: E.simulatorEnergiedaten({ zaehlpunktnummer: ZP1, tag: "2026-09-20", richtung: "verbrauch", seed: "v" }) }, T("aktiv"));
  eingang("Zählpunktliste", prozess("EC_PODLIST", "gesendet"), "SENDEN_ECP", "EC_PODLIST", { ECID, MPListData: [{ MeteringPoint: ZP1, EnergyDirection: "CONSUMPTION", ECPartFact: "100", ConsentId: "C-1" }] }, null);
  eingang("Unerwartet", prozess("EC_PODLIST", "gesendet"), "ANTWORT_CPF", "EC_PRTFACT_CHG", { MeteringPoint: ZP1, ResponseCode: "99" }, null);
  fall("automat", "eingangOhneProzess", [ein("AUFHEBUNG_CCMS", "CM_REV_CUS", { MeteringPoint: ZP1, ECID, ConsentId: "C-1", ConsentEnd: "2026-10-15", Reason: "CUS" }).n, { teilnahme: T("aktiv") }], "Widerruf");
  fall("automat", "eingangOhneProzess", [ein("AUFHEBUNG_CCMS", "CM_REV_IMP", { MeteringPoint: ZP1, ECID, ConsentId: "C-1", ConsentEnd: "2026-10-15" }).n, { teilnahme: T("beendet") }], "Implizit bei beendet");
  fall("automat", "eingangOhneProzess", [ein("ANTWORT_ECON", "EC_REQ_ONL", { ...b, ResponseCode: "99" }).n, { teilnahme: null }], "ohne Prozess");
  // ---- automat: Fristen, Ampel, Erinnerungen
  const pZ = { ...g("bestaetigt"), id: "EDP-Z", teilnahmeId: "ETN-Z", fristBis: "2026-10-31", erinnerungen: [{ stufe: 1, am: "2026-10-03" }] };
  const tz = { "ETN-Z": T("zustimmung_offen", { id: "ETN-Z" }), "ETN-W": T("wartet_technik", { id: "ETN-W" }) };
  const fristFaelle = [
    pZ,
    { ...g("gesendet"), id: "EDP-G1", teilnahmeId: "", gesendetAm: "2026-09-29T08:00:00.000Z", versuche: 1 },
    { ...g("gesendet"), id: "EDP-G3", teilnahmeId: "", gesendetAm: "2026-09-20T08:00:00.000Z", versuche: 3 },
    { ...g("bestaetigt"), id: "EDP-Z2", teilnahmeId: "ETN-Z", fristBis: "2026-09-30" },
    { ...g("bestaetigt"), id: "EDP-W", teilnahmeId: "ETN-W", technikSeit: "2026-07-01" },
    { ...prozess("CR_REQ_PT", "bestaetigt"), id: "EDP-P", teilnahmeId: "", bestaetigtAm: "2026-09-20T08:00:00.000Z" },
    { ...prozess("REKLAMATION", "gesendet"), id: "EDP-R", teilnahmeId: "", gesendetAm: "2026-09-01T08:00:00.000Z", fristBis: "2026-09-15" },
  ];
  fall("automat", "fristenPruefen", [{ prozesse: fristFaelle, teilnahmen: tz, heute: "2026-10-12" }]);
  for (const h of ["2026-10-03", "2026-10-09", "2026-10-29", "2026-11-01"]) fall("automat", "erinnerungFaellig", [{ ...pZ, erinnerungen: [] }, tz["ETN-Z"], h]);
  fall("automat", "erinnerungFaellig", [pZ, tz["ETN-Z"], "2026-10-04"], "Stufe 1 schon erledigt");
  for (const p of fristFaelle) fall("automat", "fristAmpel", [p, tz[p.teilnahmeId] || null, "2026-10-12"], `Ampel ${p.id}`);
  fall("automat", "fristAmpel", [{ ...g("abgelehnt"), responsecode: "183" }, null, HEUTE], "Ampel abgelehnt");
  fall("automat", "fristAmpel", [{ ...g("abgelehnt"), nachfolgerId: "EDP-N" }, null, HEUTE], "Ampel neu gestartet");
  fall("automat", "fristAmpel", [{ ...g("gesendet"), versuche: 2 }, null, HEUTE], "Ampel Wiederholung");
  fall("automat", "fristAnwenden", [pZ, "frist_abgelaufen", { jetzt: J, text: "Frist abgelaufen" }]);
  fall("automat", "fristAnwenden", [pZ, "hinweis_technik", { jetzt: J }]);
  fall("automat", "erinnerungText", [{ name: "Eva Esche (Demo)", gemeinschaftName: G.name, gemeinschaftsId: ECID, zaehlpunktnummer: ZP1, teilnahmefaktor: 100, fristBis: "2026-10-03", netzbetreiberId: "ENB-OOE", netzbetreiberName: "Netz OÖ", stufe: 4, heute: HEUTE }]);
  fall("automat", "erinnerungText", [{ name: "", gemeinschaftName: G.name, gemeinschaftsId: ECID, zaehlpunktnummer: ZP1, teilnahmefaktor: 50, fristBis: "", netzbetreiberId: "ENB-XYZ", netzbetreiberName: "", stufe: 1, heute: HEUTE }]);
  // ---- daten
  const cr = E.nachrichtLesen(crx);
  fall("daten", "energiedatenPayload", [cr, { gemeinschaftId: G.id, nachrichtId: "EDN-26-X" }]);
  fall("daten", "energiedatenKennzahlen", [E.energiedatenPayload(cr, { gemeinschaftId: G.id, nachrichtId: "N" }).payload]);
  const unbek = json(cr);
  unbek.daten.Energy.reihen[1].meterCode = "9-9:9.9.9";
  fall("daten", "energiedatenPayload", [unbek, { gemeinschaftId: G.id, nachrichtId: "N" }], "unbekannter MeterCode");
  const tl = [{ teilnahmeId: "A", zaehlpunktnummer: ZP1, gueltigAb: "2026-09-20" }, { teilnahmeId: "B", zaehlpunktnummer: ZP2, gueltigAb: "2026-09-01", gueltigBis: "2026-09-25" }, { teilnahmeId: "C", zaehlpunktnummer: "X", gueltigAb: "" }];
  fall("daten", "datenluecken", [{ teilnahmen: tl, empfangen: { [ZP1]: ["2026-09-21", "2026-09-22", "2026-09-24"], [ZP2]: E.tageListe("2026-09-01", "2026-09-20") }, von: "2026-09-01", bis: "2026-09-30", heute: "2026-09-27" }]);
  fall("daten", "zeitraeume", [["2026-09-03", "2026-09-01", "2026-09-02", "2026-09-10", "2026-09-30", "2026-10-01"]]);
  const soll = [
    { zaehlpunktnummer: ZP1, teilnahmeId: "A", status: "aktiv", consentId: "C-1", teilnahmefaktor: 100, richtung: "verbrauch" },
    { zaehlpunktnummer: ZP2, teilnahmeId: "B", status: "aktiv", consentId: "", teilnahmefaktor: 60, richtung: "erzeugung" },
    { zaehlpunktnummer: "AT0030000491000000000000000D00003", teilnahmeId: "C", status: "aktiv", consentId: "C-3", teilnahmefaktor: 100, richtung: "verbrauch" },
    { zaehlpunktnummer: "AT0030000491000000000000000D00004", teilnahmeId: "D", status: "beendet", consentId: "C-4", teilnahmefaktor: 100, richtung: "verbrauch" },
  ];
  const ist = [{ MeteringPoint: ZP1, ConsentId: "C-9", EnergyDirection: "CONSUMPTION", ECPartFact: "90" }, { MeteringPoint: ZP2, ConsentId: "C-2", EnergyDirection: "GENERATION", ECPartFact: "60" }, { MeteringPoint: "AT0030000491000000000000000D00004", EnergyDirection: "CONSUMPTION" }, { MeteringPoint: "AT0030000491000000000000000D00005", EnergyDirection: "CONSUMPTION" }];
  fall("daten", "podlistAbgleich", [soll, ist]);
  fall("daten", "podlistAbgleich", [soll.map((x) => (x.teilnahmeId === "D" ? { ...x, gueltigBis: "2026-10-31" } : x)), ist, "2026-10-12"], "beendet, Zuordnung endet erst in der Zukunft");
  const abgl = E.podlistAbgleich(soll, ist);
  const luecken = E.datenluecken({ teilnahmen: tl, empfangen: { [ZP1]: ["2026-09-21"] }, von: "2026-09-01", bis: "2026-09-30", heute: "2026-09-27" });
  fall("daten", "reklamationBefunde", [{ luecken, prozesse: fristFaelle, podlist: abgl, qualitaet: [{ zaehlpunktnummer: ZP1, monat: "2026-09", anteilL3: 0.0417, aeltesterL3: "2026-09-02" }], heute: "2026-10-12" }]);
  const bef = E.reklamationBefunde({ luecken, prozesse: [], podlist: abgl, heute: "2026-10-12" });
  fall("daten", "reklamationVorlage", [{ gemeinschaft: G, netzbetreiber: { ...NB, kontaktEmail: "eg@example.com" }, befunde: [...bef, { art: "datenluecke", zaehlpunktnummer: "=SUMME(A1)", text: 'Text; mit "Zeichen"', seit: "", umfang: 1 }], heute: "2026-10-12" }]);
  fall("daten", "reklamationAkte", [{ id: "EDP-R", gemeinschaftId: G.id, netzbetreiberId: "ENB-OOE", status: "gesendet", fristBis: "2026-10-26", ergebnis: { netzbetreiberName: "Netz OÖ", gemeinschaftName: G.name }, verlauf: [{ am: "2026-10-12T08:00:00.000Z", nach: "gesendet", nachricht: "REKLAMATION_NB", text: "Versendet" }] }, [{ zeitpunkt: "2026-10-12T08:00:00.000Z", richtung: "aus", nachrichtencode: "REKLAMATION_NB", sha256: "ab".repeat(32) }]]);
  // ---- simulator
  fall("simulator", "seedVon", ["Sonnenland|ä"]);
  fall("simulator", "zufallFolge", ["test-seed", 8]);
  const sAnm = (pc, daten, mid) => ein(pc === "EC_REQ_ONL" ? "ANFORDERUNG_ECON" : E.EDA_PROZESSE[pc].start, pc, daten, { mid }).n;
  const anmD = { MeteringPoint: ZP1, CMRequestId: "C1", ReqDatType: "EnergyCommunityRegistration", DateFrom: "2026-10-02", ECID, ECPartFact: "100", EnergyDirection: "CONSUMPTION" };
  for (let i = 1; i <= 6; i++) fall("simulator", "simulatorAntworten", [sAnm("EC_REQ_ONL", anmD, `MSIM${i}`), { zaehlpunkte: { [ZP1]: { smartMeter: i === 2 ? "nein" : "ja" } } }, { seed: "demo", heute: HEUTE }], `Anmeldung ${i}`);
  fall("simulator", "simulatorAntworten", [sAnm("EC_REQ_ONL", anmD, "MX"), { zaehlpunkte: { [ZP1]: { bekannt: false } } }, { seed: "demo", heute: HEUTE }], "ZP unbekannt");
  fall("simulator", "simulatorAntworten", [sAnm("EC_REQ_ONL", anmD, "MX"), { gemeinschaftsIds: [] }, { seed: "demo", heute: HEUTE }], "Gemeinschafts-ID unbekannt");
  fall("simulator", "simulatorAntworten", [sAnm("EC_REQ_ONL", anmD, "MX"), { zaehlpunkte: { [ZP1]: { fremdTf: 30 } } }, { seed: "demo", heute: HEUTE }], "Σ TF");
  fall("simulator", "simulatorAntworten", [sAnm("EC_PRTFACT_CHG", { MeteringPoint: ZP1, ECID, ConsentId: "C", DateFrom: "2026-10-05", ECPartFact: "80" }, "MT"), {}, { seed: "demo", heute: HEUTE }], "TF");
  fall("simulator", "simulatorAntworten", [sAnm("CR_REQ_PT", { MeteringPoint: ZP1, ECID, DateTimeFrom: "2026-09-19T22:00:00Z", DateTimeTo: "2026-09-29T22:00:00Z" }, "MP"), {}, { seed: "demo", heute: HEUTE }], "Nachforderung");
  fall("simulator", "simulatorAntworten", [sAnm("EC_PODLIST", { ECID }, "ML3"), { liste: [{ MeteringPoint: ZP1, EnergyDirection: "CONSUMPTION", ECPartFact: "100" }, { MeteringPoint: ZP2, EnergyDirection: "GENERATION", ECPartFact: "40" }] }, { seed: "demo", heute: HEUTE }], "Zählpunktliste");
  fall("simulator", "simulatorAntworten", [sAnm("CM_REV_SP", { MeteringPoint: ZP1, ECID, ConsentId: "C", ConsentEnd: "2026-10-31" }, "MR"), {}, { seed: "demo", heute: HEUTE }], "Abmeldung");
  for (const t of ["2026-10-01", "2026-10-02", "2026-10-03"]) fall("simulator", "simulatorLiefertTag", [ZP1, t, "demo"]);
  fall("simulator", "simulatorEnergiedaten", [{ zaehlpunktnummer: ZP2, tag: "2026-06-21", richtung: "erzeugung", teilnahmefaktor: 60, kwp: 28, seed: "demo" }], "PV Sommer");
  fall("simulator", "simulatorEnergiedaten", [{ zaehlpunktnummer: ZP1, tag: "2026-03-29", richtung: "verbrauch", teilnahmefaktor: 100, jahresverbrauchKwh: 4200, seed: "demo" }], "Verbrauch Zeitumstellung");
  mkdirSync(ORDNER, { recursive: true });
  for (const [datei, liste] of Object.entries(v)) writeFileSync(path.join(ORDNER, `${datei}.json`), `${klammernMaskieren(JSON.stringify({ stand: E.EDA_STAND, erzeugt: "node scripts/plattform-test-eg-eda.mjs --vektoren", faelle: liste }, null, 1))}\n`);
  console.log(`Testvektoren geschrieben: ${Object.entries(v).map(([d, l]) => `${d} (${l.length})`).join(", ")}`);
}

/** Eckige Klammern INNERHALB von JSON-Zeichenketten als Unicode-Escape schreiben (Tailwind liest auch JSON unter src) */
function klammernMaskieren(text) {
  const AUF = String.fromCharCode(91);
  const ZU = String.fromCharCode(93);
  let aus = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") {
        aus += c + text[++i];
        continue;
      }
      if (c === '"') inString = false;
      aus += c === AUF ? "\\u005b" : c === ZU ? "\\u005d" : c;
    } else {
      if (c === '"') inString = true;
      aus += c;
    }
  }
  return aus;
}

function zufallFolge(seed, k) {
  const r = E.zufall(seed);
  return Array.from({ length: k }, () => r());
}

function gleich(a, b) {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => gleich(x, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return gleich(ka, kb) && ka.every((k) => gleich(a[k], b[k]));
  }
  return false;
}

function vektorenPruefen() {
  abschnitt("Testvektoren (gemeinsam mit Python)");
  for (const datei of ["zeit", "xml", "schema", "codes", "automat", "daten", "simulator"]) {
    const { faelle } = JSON.parse(readFileSync(path.join(ORDNER, `${datei}.json`), "utf8"));
    let n = 0;
    for (const f of faelle) {
      const fn = E[f.fn] || (f.fn === "zufallFolge" ? zufallFolge : null);
      let r;
      try {
        r = { ergebnis: json(fn(...f.args)) };
      } catch (e) {
        r = { fehler: e.message };
      }
      const soll = "fehler" in f ? { fehler: f.fehler } : { ergebnis: f.ergebnis };
      if (gleich(r, soll)) n++;
      else pruefe(false, `${datei}: ${f.name}`, { ist: r, soll });
    }
    pruefe(n === faelle.length, `${datei}.json: ${n}/${faelle.length} Fälle`);
  }
}

function logikPruefen() {
  abschnitt("Reine Regeln (zusätzlich)");
  // Rundlauf aller Nachrichtencodes: bauen → lesen → gleiche Daten
  const beispiele = JSON.parse(readFileSync(path.join(ORDNER, "schema.json"), "utf8")).faelle.filter((f) => f.fn === "nachrichtLesen" && f.ergebnis?.ok);
  pruefe(beispiele.length >= 3, "Schema-Beispiele lesbar");
  const ed = E.simulatorEnergiedaten({ zaehlpunktnummer: ZP2, tag: "2026-10-25", richtung: "erzeugung", kwp: 10, seed: "x" });
  pruefe(ed.reihen.every((r) => r.werte.length === 100), "Zeitumstellung Oktober: 100 Viertelstunden");
  pruefe(E.qhAnzahl("2026-03-29") === 92 && E.qhAnzahl("2026-06-01") === 96, "Zeitumstellung März: 92, sonst 96");
  const xml = E.nachrichtBauen({ code: "DATEN_CRMSG", prozesscode: "CR_MSG", absender: "AT003000", empfaenger: "RC109417", erstellt: "2026-10-26T03:00:00Z", messageId: "M", conversationId: "C", prozessdatum: "2026-10-25", daten: { MeteringPoint: ZP2, Energy: ed } });
  const n = E.nachrichtLesen(xml);
  const p = E.energiedatenPayload(n, { gemeinschaftId: "G", nachrichtId: "N" }).payload;
  pruefe(n.ok && p.reihen.length === 3 && gleich(p.reihen[0].werte, ed.reihen[0].werte), "CR_MSG Rundlauf: Werte unverändert (volle Präzision)");
  const sum = (g) => p.reihen.find((r) => r.groesse === g).werte.reduce((a, b) => a + b, 0);
  pruefe(sum("restueberschuss") <= sum("erzeugung_tf") + 1e-9 && sum("erzeugung_tf") <= sum("erzeugung_gemessen") + 1e-9, "Plausibel: Restüberschuss ≤ Erzeugung × TF ≤ Erzeugung");
  const v = E.simulatorEnergiedaten({ zaehlpunktnummer: ZP1, tag: "2026-07-01", richtung: "verbrauch", teilnahmefaktor: 50, seed: "y" });
  const r = Object.fromEntries(v.reihen.map((x) => [E.METER_CODES[x.meterCode], x.werte]));
  pruefe(r.eigendeckung.every((x, i) => x <= r.verbrauch_tf[i] + 1e-9 && x <= r.anteil_erzeugung[i] + 1e-9), "Eigendeckung = min(Anteil, Verbrauch × TF) je Viertelstunde (Fachkonzept 4.2)");
  pruefe(!E.nachrichtLesen("<x>").ok && !E.nachrichtLesen("").ok, "Kaputtes XML → Fehler statt Absturz");
  let wurf = "";
  try {
    E.xmlLesen(`<A>${"<B>".repeat(50)}</A>`);
  } catch (e) {
    wurf = e.message;
  }
  pruefe(wurf.includes("tief"), "Tiefenlimit greift");
  pruefe(E.responsecodeInfo("183").erneut && !E.responsecodeInfo("185").erneut, "Responsecodes mit Handlungsempfehlung");
  const quelle = readFileSync(path.join(process.cwd(), "src/lib/plattform/eg/eda/xml.js"), "utf8") + readFileSync(path.join(process.cwd(), "src/lib/plattform/eg/eda/schema.js"), "utf8");
  pruefe(!quelle.includes(`${KA}CDATA`) && !quelle.includes(`${KA}zu bestätigen${KZ}`), "Tailwind-Falle: keine Klammer-Muster in eda/*.js");
}

// ================================================================ Server (eine Testreihe)

class Client {
  constructor() {
    this.cookie = "";
  }
  async anfrage(methode, pfad, body) {
    const headers = { Origin: BASIS };
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: "manual", signal: AbortSignal.timeout(180000) });
        if (res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && versuch < 3) {
          await new Promise((r) => setTimeout(r, 4000 * versuch));
          continue;
        }
        break;
      } catch (e) {
        if (versuch >= 3) throw e;
        await new Promise((r) => setTimeout(r, 5000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    const text = await res.text();
    let j = null;
    try {
      j = JSON.parse(text);
    } catch {
      j = { text: text.slice(0, 200) };
    }
    return { status: res.status, json: j, text };
  }
  get = (p) => this.anfrage("GET", p);
  post = (p, b) => this.anfrage("POST", p, b ?? {});
  async login(email) {
    const r = await this.post("/api/auth/login", { email, passwort: DEMO_PASSWORT });
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
}

async function serverPruefen() {
  abschnitt(`Server ${BASIS} (Demo-Backend)`);
  const admin = new Client();
  const gast = new Client();
  const mitglied = new Client();
  const obmann = new Client();
  await admin.login("admin@example.com");
  await mitglied.login("mitglied@example.com");
  await obmann.login("eg-obmann@example.com");
  const liste = await admin.get("/api/admin/eg");
  let gid = liste.json?.gemeinschaften?.find((g) => g.seedSchluessel === "sonnenland" || /Sonnenland/.test(g.name))?.id;
  if (!gid) {
    // Fallback: Übersicht der EDA-Seite listet Gemeinschaften nicht – Kontext des Obmanns
    const k = await obmann.get("/api/portal/eg/kontext").catch(() => null);
    gid = k?.json?.gemeinschaften?.[0]?.id;
  }
  if (!pruefe(!!gid, "Demo-Gemeinschaft „Sonnenland“ gefunden", liste.status)) return;
  const basis = `/api/admin/eg/${gid}/eda`;
  pruefe((await gast.get(basis)).status === 401, "Gast → 401");
  pruefe([403, 404].includes((await mitglied.get(basis)).status), "Mitglied ohne Backoffice → 403/404");
  const u = await admin.get(basis);
  if (!pruefe(u.status === 200 && Array.isArray(u.json?.prozesse), "Übersicht lädt (Prozesse, Kennzahlen, Ampel)", u.json)) return;
  pruefe(u.json.prozesse.some((p) => p.prozesscode === "EC_REQ_ONL") && u.json.kennzahlen?.zustimmungOffen >= 1, "Seed: Anmeldungen mit offener Zustimmung vorhanden");
  pruefe(u.json.prozesse.some((p) => p.ampel?.ampel), "Fristen-Ampel je Prozess");
  const j = await admin.get(`${basis}?journal=1`);
  pruefe(j.status === 200 && j.json?.nachrichten?.length > 0 && j.json.nachrichten.every((n) => /^[0-9a-f]{64}$/.test(n.sha256)), "Nachrichtenjournal mit SHA-256");
  // Anmeldung eines Entwurfs (Norbert)
  const entwurf = u.json.teilnahmen?.find((t) => t.status === "entwurf");
  if (pruefe(!!entwurf, "Teilnahme im Entwurf vorhanden")) {
    const a = await admin.post(basis, { aktion: "anmelden", teilnahmeIds: [entwurf.id] });
    pruefe(a.status === 200 && a.json?.prozesse?.length === 1 && !a.json.fehler?.length, "EC_REQ_ONL erzeugt und gesendet", a.json);
    const pid = a.json?.prozesse?.[0]?.id;
    const nochmal = await admin.post(basis, { aktion: "anmelden", teilnahmeIds: [entwurf.id] });
    pruefe(nochmal.json?.fehler?.length === 1, "Doppelte Anmeldung abgelehnt", nochmal.json);
    const z = await admin.post(basis, { aktion: "simulator", simulatorAktion: "zustellen", alle: true });
    pruefe(z.status === 200 && z.json?.zugestellt >= 1, "Simulator stellt Antworten zu", z.json);
    const d = await admin.get(`${basis}?prozess=${pid}`);
    pruefe(d.status === 200 && d.json?.nachrichten?.length >= 2 && d.json.prozess.status !== "gesendet", "Prozessdetail: Antwort verarbeitet, Teilnahme fortgeschrieben", d.json?.prozess?.status);
    const roh = d.json?.nachrichten?.find((n) => n.richtung === "ein");
    if (roh) {
      const dup = await admin.post(basis, { aktion: "eingang", xml: roh.rohinhalt });
      pruefe(dup.status === 200 && dup.json?.doppelt === true, "Eingang idempotent je Message-ID", dup.json);
    }
  }
  // TF-Änderung
  const aktiv = u.json.teilnahmen?.filter((t) => t.status === "aktiv") || [];
  const ab = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  const tf = await admin.post(basis, { aktion: "tf", aenderungen: [{ teilnahmeId: aktiv[0]?.id, teilnahmefaktor: 90, ab }] });
  pruefe(tf.status === 200 && tf.json?.prozesse?.length === 1, "EC_PRTFACT_CHG gesendet", tf.json);
  const tf2 = await admin.post(basis, { aktion: "tf", aenderungen: [{ teilnahmeId: aktiv[0]?.id, teilnahmefaktor: 80, ab }] });
  pruefe(tf2.json?.fehler?.length === 1, "Zweite TF-Änderung desselben Tages abgelehnt", tf2.json);
  // Massen-Abmeldung → Vier-Augen
  const zum = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const ziel = aktiv.slice(3, 6).map((t) => t.id);
  const m = await admin.post(basis, { aktion: "abmelden", teilnahmeIds: ziel, zum });
  pruefe(m.status === 200 && m.json?.freigabeNoetig === true && m.json.prozesse.every((p) => p.status === "freigabe_offen"), "Massen-Abmeldung wartet auf Freigabe (Vier-Augen)", m.json);
  const selbst = await admin.post(basis, { aktion: "freigeben", prozessIds: m.json?.prozesse?.map((p) => p.id) || [], entscheidung: "erteilen" });
  pruefe(selbst.status === 403 || selbst.json?.fehler?.length, "Backoffice darf nicht selbst freigeben", selbst.json);
  const pf = `/api/portal/eg/${gid}/eda`;
  const fl = await obmann.get(pf);
  pruefe(fl.status === 200 && fl.json?.freigaben?.length >= 3, "Obmann sieht offene Freigaben", fl.json);
  const fg = await obmann.post(pf, { prozessIds: m.json?.prozesse?.map((p) => p.id) || [], entscheidung: "erteilen" });
  pruefe(fg.status === 200 && fg.json?.freigegeben === 3, "Obmann gibt frei → CM_REV_SP gesendet", fg.json);
  pruefe([403, 404].includes((await mitglied.get(pf)).status), "Mitglied sieht keine Freigaben");
  // Zählpunktliste, Nachforderung, Energiedaten
  const pl = await admin.post(basis, { aktion: "podlist" });
  pruefe(pl.status === 200 && pl.json?.prozess?.id, "EC_PODLIST angefordert", pl.json);
  await admin.post(basis, { aktion: "simulator", simulatorAktion: "zustellen", alle: true });
  const pd = await admin.get(`${basis}?prozess=${pl.json?.prozess?.id}`);
  pruefe(pd.json?.abgleich?.length > 0, "Abgleich Soll/Ist mit Zählpunktliste", pd.json?.prozess?.status);
  const nf = await admin.post(basis, { aktion: "nachforderung", teilnahmeId: aktiv[1]?.id, von: new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10), bis: new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10) });
  pruefe(nf.status === 200 && nf.json?.prozess?.prozesscode === "CR_REQ_PT", "CR_REQ_PT gesendet", nf.json);
  const en = await admin.post(basis, { aktion: "simulator", simulatorAktion: "energiedaten" });
  pruefe(en.status === 200 && en.json?.nachrichten >= 1, "Simulator liefert Energiedaten (CR_MSG) und reicht sie an WP3 weiter", en.json);
  // Erinnerungen und erneut anstoßen
  const er = await admin.post(basis, { aktion: "erinnern" });
  pruefe(er.status === 200 && er.json?.erinnert >= 1, "Erinnerungen an Mitglieder mit Anleitung je Netzbetreiber", er.json);
  const ea = await admin.post(basis, { aktion: "erneut" });
  pruefe(ea.status === 200 && typeof ea.json?.erneut === "number", "Massenaktion „ausstehende Zustimmungen erneut anstoßen“", ea.json);
  // Fristenlauf und Reklamation
  const fr = await admin.post(basis, { aktion: "fristenlauf" });
  pruefe(fr.status === 200 && Array.isArray(fr.json?.aktionen), "Fristenlauf", fr.json);
  const rv = await admin.post(basis, { aktion: "reklamation", reklamationAktion: "vorschau", netzbetreiberId: "ENB-OOE" });
  pruefe(rv.status === 200 && rv.json?.vorlage?.betreff && rv.json.befunde?.length > 0, "Reklamation: Befunde und Vorlage", rv.json?.befunde?.length);
  const ra = await admin.post(basis, { aktion: "reklamation", reklamationAktion: "anlegen", netzbetreiberId: "ENB-OOE", text: rv.json?.vorlage?.text, betreff: rv.json?.vorlage?.betreff });
  pruefe(ra.status === 200 && ra.json?.prozess?.status === "gesendet", "Reklamation versendet und protokolliert", ra.json);
  const akte = await admin.get(`${basis}?akte=${ra.json?.prozess?.id}`);
  pruefe(akte.status === 200 && /Beschwerdeakte/.test(akte.json?.text || ""), "Beschwerdeakte abrufbar");
  // Seiten
  for (const s of [`/portal/admin/eg/${gid}/eda`, `/portal/admin/eg/${gid}/eda/journal`, `/portal/admin/eg/${gid}/eda/reklamation`]) {
    const r = await admin.get(s);
    pruefe(r.status === 200, `Seite ${s.replace(gid, "[id]")} → 200`, r.status);
  }
}

async function main() {
  if (VEKTOREN) vektorenErzeugen();
  vektorenPruefen();
  logikPruefen();
  if (!NUR_LOGIK && !VEKTOREN) {
    try {
      await serverPruefen();
    } catch (e) {
      fehler++;
      console.log(`  ${rot("✗")} Server: ${e.message}`);
    }
  }
  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("alles grün")} · ${ok} Prüfungen ok`);
  process.exit(fehler ? 1 : 0);
}
main();
