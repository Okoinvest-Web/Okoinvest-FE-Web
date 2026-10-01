// src/lib/plattform/eg/dashboard.js
//
// WP6 „Portale“ – Mitglieder-Dashboard: Zeiträume, Kennzahlen aus den Periodenwerten (WP3), Schritt-für-Schritt-Status der
// Teilnahme mit Fristenhinweis (Fachkonzept 2.4, 3.8), Anleitung zur Zustimmung im Netzbetreiber-Portal (Marktanalyse 4.1, P0
// Nr. 2), Mehrfachteilnahme-Übersicht (ElWG § 71 Abs. 5) und Sozialquote-Monitor (§ 68 Abs. 6, Fachkonzept 4.10).
// Reine Funktionen. Python-Spiegel: plattform/eg_portal_kern.py (Testvektoren eg/testdaten/portal/*.json).
//
// Die Ersparnis ist eine SCHÄTZUNG (Fachkonzept 4.6): Netzentgelt-Reduktion und Abgabenbefreiung zieht der Netzbetreiber
// auf der Netzrechnung ab; maßgeblich sind dessen Werte und die Belege der Gemeinschaft (WP4).

import { plusTage, tageZwischen } from "../mitglied/basis.js";
import { MAX_TEILNAHMEN_JE_ZP, TEILNAHME_STATUS, TEILNAHME_ZAEHLT, TF_MAX } from "./modell.js";
import { reduzierterAp } from "./netzentgelt.js";

const r0 = (x) => Math.round(Number(x) || 0);
const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const r3 = (x) => Math.round((Number(x) || 0) * 1000) / 1000;
const tag = (v) => String(v || "").slice(0, 10);
/** Zahl mit Dezimalkomma (Python-Spiegel _de) */
const de = (x) => String(x).replace(".", ",");

/** Kündigungsfrist, wenn der Vertrag der Gemeinschaft keine nennt (Muster der Koordinationsstelle: üblich 3–7 Wochen) (zu bestätigen) */
export const KUENDIGUNG_FRIST_TAGE = 28;
/** Sozialquote: mindestens 10 % der von Gebietskörperschaften erzeugten Menge an schutzbedürftige Haushalte (ElWG § 68 Abs. 6) */
export const SOZIALQUOTE_PCT = 10;
/** Ab so vielen Resttagen gilt die Zustimmungsfrist als dringend */
export const FRIST_DRINGEND_TAGE = 7;

/** Zeiträume des Dashboards: Werte kommen vom Netzbetreiber am Folgetag, daher endet alles „gestern“ */
export function zeitraeume(heute) {
  const g = plusTage(tag(heute), -1);
  return {
    gestern: { id: "gestern", label: "Gestern", von: g, bis: g },
    monat: { id: "monat", label: "Dieser Monat", von: `${g.slice(0, 8)}01`, bis: g },
    jahr: { id: "jahr", label: "Dieses Jahr", von: `${g.slice(0, 4)}-01-01`, bis: g },
  };
}

/**
 * Kennzahlen aus Periodenwerten (enPeriodenwerte, nur eigene Zählpunkte) und Preisen.
 * @param {{richtung:string, groessen:object, vollstaendig?:boolean, anteilL3?:number}[]} eintraege
 * @param {{bezugspreisCt?:number, einspeisepreisCt?:number, lieferantCt?:number, netzApCt?:number, reduktionPct?:number, abgabenBefreit?:boolean, abgabenCt?:number, co2KgJeKwh?:number}} p
 */
export function energieKennzahlen(eintraege = [], p = {}) {
  const g = (e, k) => Number(e?.groessen?.[k]) || 0;
  const verbrauchZp = eintraege.filter((e) => e.richtung !== "erzeugung");
  const erzeugungZp = eintraege.filter((e) => e.richtung === "erzeugung");
  const verbrauch = verbrauchZp.reduce((s, e) => s + g(e, "verbrauch_gemessen"), 0);
  const ed = verbrauchZp.reduce((s, e) => s + g(e, "eigendeckung"), 0);
  const erzeugung = erzeugungZp.reduce((s, e) => s + g(e, "erzeugung_gemessen"), 0);
  const rest = erzeugungZp.reduce((s, e) => s + g(e, "restueberschuss"), 0);
  const eingebracht = erzeugungZp.reduce((s, e) => s + Math.max(0, (g(e, "erzeugung_tf") || g(e, "erzeugung_gemessen")) - g(e, "restueberschuss")), 0);
  const bezug = Number(p.bezugspreisCt) || 0;
  const netzCt = p.netzApCt ? r2(Number(p.netzApCt) - reduzierterAp(p.netzApCt, p.reduktionPct)) : 0;
  const energie = p.lieferantCt ? (ed * (Number(p.lieferantCt) - bezug)) / 100 : 0;
  const netz = (ed * netzCt) / 100;
  const abgaben = p.abgabenBefreit ? (ed * (Number(p.abgabenCt) || 0)) / 100 : 0;
  return {
    hatDaten: eintraege.length > 0 && verbrauch + erzeugung > 0,
    verbrauchKwh: r3(verbrauch), eigendeckungKwh: r3(ed), anteilPct: verbrauch > 0 ? r1((ed / verbrauch) * 100) : null,
    erzeugungKwh: r3(erzeugung), eingebrachtKwh: r3(eingebracht), restueberschussKwh: r3(rest), nutzungPct: erzeugung > 0 ? r1((eingebracht / erzeugung) * 100) : null,
    ersparnis: { energieEur: r2(energie), netzEur: r2(netz), abgabenEur: r2(abgaben), gesamtEur: r2(energie + netz + abgaben) },
    erloesEur: r2((eingebracht * (Number(p.einspeisepreisCt) || 0)) / 100),
    co2Kg: r1((ed + eingebracht) * (Number(p.co2KgJeKwh) || 0)),
    vollstaendig: eintraege.every((e) => e.vollstaendig !== false),
    anteilL3Pct: r1(Math.max(0, ...eintraege.map((e) => Number(e.anteilL3) || 0)) * 100),
  };
}

// ---------------------------------------------------------------- Status der Teilnahme (Schritt für Schritt)

export const SCHRITTE = [
  { id: "antrag", label: "Beitrittsantrag", text: "Antrag mit Verträgen und Unterschrift." },
  { id: "aufnahme", label: "Aufnahme", text: "Die Gemeinschaft prüft und nimmt Sie auf." },
  { id: "anmeldung", label: "Anmeldung beim Netzbetreiber", text: "Wir melden Ihren Zählpunkt elektronisch an." },
  { id: "zustimmung", label: "Ihre Zustimmung", text: "Sie bestätigen im Portal Ihres Netzbetreibers." },
  { id: "technik", label: "Aktivierung", text: "Der Netzbetreiber ordnet zu, ggf. mit Smart-Meter-Einbau." },
  { id: "aktiv", label: "Gemeinschaftsstrom", text: "Ab dem Aktivierungsdatum zählt jede Viertelstunde." },
];

/**
 * Schritte einer Teilnahme aus Mitglied- und Teilnahmestatus.
 * @returns {{schritte:{id:string,label:string,text:string,zustand:"erledigt"|"aktuell"|"offen"|"fehler"}[], aktuell:string, frist:{bis:string, tageRest:number, dringend:boolean}|null, aufgabe:string, beendet:boolean}}
 */
export function teilnahmeSchritte({ mitgliedStatus = "", teilnahme = null, heute = "" } = {}) {
  const t = teilnahme || {};
  const st = t.status || "";
  let idx = 0;
  let fehlerBei = "";
  let aufgabe = "";
  if (["interessent"].includes(mitgliedStatus)) { idx = 0; aufgabe = "Beitrittsantrag ausfüllen und unterschreiben."; }
  else if (["antrag", "geprueft"].includes(mitgliedStatus)) { idx = 1; aufgabe = "Nichts zu tun – die Gemeinschaft entscheidet über die Aufnahme."; }
  else if (!st || st === "entwurf") { idx = 2; aufgabe = "Nichts zu tun – wir bereiten die Anmeldung beim Netzbetreiber vor."; }
  else if (st === "angefragt") { idx = 2; aufgabe = "Nichts zu tun – der Netzbetreiber prüft die Anmeldung."; }
  else if (st === "zustimmung_offen") { idx = 3; aufgabe = "Jetzt im Portal Ihres Netzbetreibers zustimmen."; }
  else if (st === "zugestimmt" || st === "wartet_technik") { idx = 4; aufgabe = st === "wartet_technik" ? "Nichts zu tun – der Netzbetreiber baut bzw. stellt den Smart Meter um." : "Nichts zu tun – der Netzbetreiber bestätigt das Aktivierungsdatum."; }
  else if (st === "aktiv" || st === "abmeldung_angefragt" || st === "beendet") { idx = 5; aufgabe = st === "aktiv" ? "" : st === "beendet" ? "Die Teilnahme ist beendet." : "Die Abmeldung läuft."; }
  else if (st === "abgelehnt") { idx = 2; fehlerBei = "anmeldung"; aufgabe = "Der Netzbetreiber hat abgelehnt – wir klären den Grund und starten neu."; }
  else if (st === "abgelaufen") { idx = 3; fehlerBei = "zustimmung"; aufgabe = "Die Frist ist abgelaufen – wir starten die Anmeldung auf Wunsch neu."; }
  else if (st === "verworfen") { idx = 2; fehlerBei = "anmeldung"; aufgabe = "Die Anmeldung wurde verworfen."; }
  const fertig = st === "aktiv" || st === "abmeldung_angefragt" || st === "beendet";
  const schritte = SCHRITTE.map((s, i) => ({ ...s, zustand: s.id === fehlerBei ? "fehler" : i < idx || (fertig && i === idx) ? "erledigt" : i === idx ? "aktuell" : "offen" }));
  let frist = null;
  if (st === "zustimmung_offen" && t.fristBis) {
    const rest = tageZwischen(tag(heute), tag(t.fristBis));
    frist = { bis: tag(t.fristBis), tageRest: rest, dringend: rest <= FRIST_DRINGEND_TAGE };
  }
  return { schritte, aktuell: SCHRITTE[idx].id, frist, aufgabe, beendet: st === "beendet", statusLabel: TEILNAHME_STATUS[st]?.label || "" };
}

/**
 * Anleitung zur Zustimmung im Portal des Netzbetreibers (je Netzbetreiber mit Namen; Menübezeichnungen unterscheiden sich).
 * Online-Variante EC_REQ_ONL, Offline-Variante EC_REQ_OFF mit QR-Code (30 Tage, danach 5 Tage Widerruf) (Fachkonzept 2.4).
 */
export function zustimmungsAnleitung({ netzbetreiber = null, gemeinschaft = null, teilnahme = null, zaehlpunktnummer = "" } = {}) {
  const nb = netzbetreiber?.kurzname || netzbetreiber?.name || "Ihres Netzbetreibers";
  const name = gemeinschaft?.name || "Ihrer Energiegemeinschaft";
  const gid = String(gemeinschaft?.gemeinschaftsId || "");
  const zp = String(zaehlpunktnummer || "");
  const tf = Number(teilnahme?.teilnahmefaktor) || 100;
  return {
    titel: netzbetreiber ? `So stimmen Sie bei ${nb} zu` : "So stimmen Sie bei Ihrem Netzbetreiber zu",
    schritte: [
      { id: "portal", titel: "Kundenportal öffnen", text: `Melden Sie sich im Kunden- bzw. Smart-Meter-Portal ${netzbetreiber ? `von ${nb}` : "Ihres Netzbetreibers"} an. Noch kein Zugang? Für die Registrierung brauchen Sie meist die Zählpunktnummer und die Kundennummer von Ihrer Netzrechnung.` },
      { id: "menue", titel: "Bereich für Energiegemeinschaften wählen", text: "Der Menüpunkt heißt je Netzbetreiber unterschiedlich, etwa „Energiegemeinschaften“, „Datenfreigaben“ oder „Zustimmungen“." },
      { id: "anfrage", titel: "Anfrage prüfen", text: `Dort wartet eine Anfrage von „${name}“${gid ? ` (Gemeinschafts-ID ${gid.slice(0, 13)}…)` : ""}${zp ? ` für den Zählpunkt …${zp.slice(-6)}` : ""} mit einem Teilnahmefaktor von ${tf} %.` },
      { id: "zustimmen", titel: "Zustimmen", text: "Bestätigen Sie die Teilnahme. Damit kommt die Zusatzvereinbarung zum Netzzugangsvertrag zustande." },
      { id: "fertig", titel: "Fertig", text: "Ihre Zustimmung erreicht uns automatisch über den Datenaustausch der Netzbetreiber (EDA). Sie müssen uns nichts senden." },
    ],
    hinweise: [
      "Ohne Zustimmung lehnt der Netzbetreiber die Anmeldung nach Fristablauf ab – sie muss dann neu gestartet werden. Am besten gleich erledigen.",
      "Kein Online-Zugang? Fragen Sie uns nach der Offline-Variante: Der Netzbetreiber stellt einen QR-Code zu (30 Tage gültig, danach 5 Tage Widerrufsfrist).",
    ],
  };
}

// ---------------------------------------------------------------- Mehrfachteilnahme (ElWG § 71 Abs. 5)

/**
 * Übersicht je eigenem Zählpunkt über alle der Plattform bekannten Gemeinschaften.
 * @param {{zaehlpunkte:object[], teilnahmen:object[], gemeinschaften:{id:string,name:string}[]}} d
 */
export function mehrfachUebersicht({ zaehlpunkte = [], teilnahmen = [], gemeinschaften = [] } = {}) {
  const name = (id) => gemeinschaften.find((g) => g.id === id)?.name || id;
  return zaehlpunkte.map((z) => {
    const tn = teilnahmen.filter((t) => t.zaehlpunktId === z.id).map((t) => ({ teilnahmeId: t.id, gemeinschaftId: t.gemeinschaftId, gemeinschaft: name(t.gemeinschaftId), teilnahmefaktor: Number(t.teilnahmefaktor) || 0, status: t.status, statusLabel: TEILNAHME_STATUS[t.status]?.label || t.status, zaehlt: TEILNAHME_ZAEHLT.includes(t.status) }));
    const zaehlend = tn.filter((t) => t.zaehlt);
    const summe = zaehlend.reduce((s, t) => s + t.teilnahmefaktor, 0);
    const hinweise = [];
    if (summe > TF_MAX) hinweise.push(`Die Teilnahmefaktoren ergeben ${summe} % – höchstens ${TF_MAX} % sind zulässig.`);
    else if (summe < TF_MAX && zaehlend.length) hinweise.push(`${TF_MAX - summe} % ${z.richtung === "erzeugung" ? "Ihrer Erzeugung" : "Ihres Verbrauchs"} sind noch keiner Gemeinschaft zugeordnet.`);
    if (zaehlend.length >= MAX_TEILNAHMEN_JE_ZP) hinweise.push(`Höchstzahl von ${MAX_TEILNAHMEN_JE_ZP} Gemeinschaften erreicht.`);
    return {
      zaehlpunktId: z.id, zaehlpunktnummer: z.zaehlpunktnummer, bezeichnung: z.bezeichnung || "", richtung: z.richtung,
      teilnahmen: tn, summeTf: summe, freiTf: Math.max(0, TF_MAX - summe), anzahl: zaehlend.length, maxAnzahl: MAX_TEILNAHMEN_JE_ZP, mehrfach: zaehlend.length > 1, hinweise,
    };
  });
}

// ---------------------------------------------------------------- Sozialquote Gemeinde (ElWG § 68 Abs. 6)

/**
 * Monitor der Sozialquote: Anteil der Gemeinde-Erzeugung, der schutzbedürftigen Haushalten zugutekommt.
 * `anSchutzbeduerftigeKwh` = deren Eigendeckung anteilig zur Gemeinde-Erzeugung (Näherung, WP3 liefert die Periodenwerte).
 */
export function sozialquote({ erzeugungKwh = 0, anSchutzbeduerftigeKwh = 0, schutzbeduerftigeHaushalte = 0, sozialtarif = null } = {}) {
  const e = Number(erzeugungKwh) || 0;
  const a = Number(anSchutzbeduerftigeKwh) || 0;
  const n = Number(schutzbeduerftigeHaushalte) || 0;
  const kontingent = Number(sozialtarif?.kontingentPct) || 0;
  const quote = e > 0 ? r1((a / e) * 100) : null;
  let status = "keine_daten";
  let text = "Sobald Energiedaten vorliegen, zeigen wir hier, welcher Anteil der Gemeinde-Erzeugung schutzbedürftigen Haushalten zugutekommt.";
  if (quote !== null) {
    status = quote >= SOZIALQUOTE_PCT ? "erfuellt" : "unter";
    text = quote >= SOZIALQUOTE_PCT ? `${de(quote)} % der Gemeinde-Erzeugung kommen schutzbedürftigen Haushalten zugute – Mindestanteil ${SOZIALQUOTE_PCT} % erreicht.` : `Bisher ${de(quote)} % – für den Mindestanteil von ${SOZIALQUOTE_PCT} % braucht es mehr teilnehmende schutzbedürftige Haushalte oder einen höheren Teilnahmefaktor.`;
  }
  const hinweise = [];
  if (!n) hinweise.push("In der Gemeinschaft ist noch kein schutzbedürftiger Haushalt gekennzeichnet. Nachweis z. B. über GIS-Befreiung oder Sozialhilfebescheid (zu bestätigen).");
  if (kontingent < SOZIALQUOTE_PCT) hinweise.push(`Im Preisblatt ist ${kontingent ? `ein Sozialkontingent von ${kontingent} %` : "kein Sozialkontingent"} hinterlegt – empfohlen sind mindestens ${SOZIALQUOTE_PCT} %.`);
  return { sollPct: SOZIALQUOTE_PCT, quotePct: quote, status, text, schutzbeduerftigeHaushalte: n, kontingentPct: kontingent, erzeugungKwh: r0(e), anSchutzbeduerftigeKwh: r0(a), hinweise };
}

/** Frühestes Austrittsdatum nach Kündigung (Frist laut Vertrag, sonst KUENDIGUNG_FRIST_TAGE); Abmeldung nie rückwirkend */
export const kuendigungFruehestens = (heute, fristTage = KUENDIGUNG_FRIST_TAGE) => plusTage(tag(heute), Math.max(0, Number(fristTage) || 0));
