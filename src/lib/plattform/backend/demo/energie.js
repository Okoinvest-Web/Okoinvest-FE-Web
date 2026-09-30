// src/lib/plattform/backend/demo/energie.js
//
// Energiebeschaffung & Versorger-Ausschreibung im Demo-Backend – Referenz für plattform/api/energie.py
// (Vertrag: docs/API.md, Abschnitt „Energiebeschaffung“). Daten unter db.energie (eigene Sammlung, beim ersten
// Zugriff mit Demo-Daten ergänzt – energie-seed.js). Nutzt die Energie-Stammdaten von „Fachprüfung B“
// (db.fach.abnahmestellen, db.fach.lastgaenge[].analyse) – Lastgang-Upload und Abnahmestellen werden NICHT doppelt gebaut.
//
// Rechte (jede Operation prüft Rolle UND Eigentum selbst):
//   Backoffice – Rolle admin mit Bereich „energie“ (rechte.js): lesen ≥ 1 sieht alles, schreiben = 2 für Mutationen
//                (Unterrollen leitung, energie; lesen/buchhaltung nur lesen)
//   Lieferant  – Rolle „lieferant“, Konto gehört zu einem Versorger im Lieferantenstamm: sieht NUR Ausschreibungen, zu
//                denen der Versorger in mindestens einer Runde eingeladen ist, NUR eigene Angebote, nie Kundennamen oder
//                Lokations-IDs (anonymisiertes Los); Angebote nur in offener Runde (sonst 409)
//   Kunde      – Rolle „unternehmen“: eigene Verträge, Vollmacht, eigene Ausschreibungen, Freigabe des Zuschlags
//   sonst      – 403 bzw. 404 (keine Existenz verraten)

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, sha256, zufallsToken } from "./hilfen";
import { intern } from "../demo";
import { internSicherheit } from "./sicherheitWerkzeuge";
import { kycSperre, kycStatusDb } from "./kycRegeln";
import { passwortHash } from "../../server/passwort";
import { energieSeed } from "./energie-seed";
import { spotReihe } from "../../energie/quellen";
import {
  ANNAHMEN_STANDARD, EMPFEHLUNGEN, STRUKTUREN, VERGUETUNG_MODELLE, bedarfJeQuartal, kuendigungsStichtag, kundenReihe, portfolio as portfolioRechnen,
  tageZwischen, verguetung, vertragEnergiepreisCt, wechselanalyse,
} from "../../energie/beschaffung";
import {
  ZONEN, aktuelleKurve, demoTerminkurve, istPeak, kurveTabelle, produktVerlauf, produktZeitraum, terminCsvParsen, terminEintragPruefen, terminPreisMonat,
  terminPreisZeitraum, trend,
} from "../../energie/markt";
import {
  AUSSCHREIBUNG_OFFEN, AUSSCHREIBUNG_STATUS, BESTPREIS_REGELN, PRODUKT_ARTEN, SICHERHEITEN, angeboteVergleichen, besteJeLieferant, bestpreisHinweis,
  losKennzeichen, preisblattPruefen, produktLabel, produkteBereinigen,
} from "../../energie/ausschreibung";
import { losAnonym, losKontext, zwoelfMonate } from "../../energie/los";
import { VOLLMACHT_TEXT, VOLLMACHT_VERSION } from "../../energie/texte";
/** Wechselanalyse/Fristen für laufende bzw. gekündigte Verträge – auch aus Zuschlag, sobald aktiv (Lieferantenwechsel: kundenenergie.js) */
const analyseRelevant = (x) => ["aktiv", "gekuendigt"].includes(x?.status);

// Helfer aus demo.js erst zur Laufzeit (kein Zirkelimport beim Laden)
const benachrichtigen = (...a) => intern.benachrichtigen(...a);
const protokoll = (...a) => intern.protokoll(...a);
const nutzerById = (...a) => intern.nutzerById(...a);
const nameVon = (...a) => intern.nameVon(...a);
const aktiveAdmins = (...a) => intern.aktiveAdmins(...a);
const postausgangAnlegen = (...a) => internSicherheit.postausgangAnlegen(...a);

const BEREICH = "energie";
const EINLADUNG_TAGE = 21;
const MAIL = "Zu Ihrer Energiebeschaffung gibt es Neuigkeiten. Details finden Sie im Portal.";
const MAIL_LF = "Zu einer Angebotsanfrage gibt es Neuigkeiten. Details finden Sie im Portal von ÖkoInvest.";

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const boLesen = (n) => istAdmin(n) && darfLesen(n, BEREICH);
const boSchreiben = (n) => istAdmin(n) && darfSchreiben(n, BEREICH);
const heute = () => jetzt().slice(0, 10);
const fmtDatum = (iso) => (iso ? new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Vienna", dateStyle: "short", timeStyle: "short" }) : "");

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function leseNoetig(n) {
  angemeldet(n);
  if (!boLesen(n)) throw verboten("Nur für das Backoffice (Energiebeschaffung).");
}
function schreibNoetig(n) {
  angemeldet(n);
  if (!boSchreiben(n)) throw verboten(istAdmin(n) ? "Ihre Backoffice-Rolle erlaubt im Bereich „Energiebeschaffung“ kein Schreiben." : "Nur für das Backoffice (Energiebeschaffung).");
}
/** Fachfehler der reinen Module (status 422) übersetzen */
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e?.status === 422 && !(e instanceof PlattformFehler)) throw ungueltig(e.message);
    throw e;
  }
}

// ================================================================ Datenbestand

function leer() {
  return { v: 1, einstellungen: { ...ANNAHMEN_STANDARD, bestpreisRegelStandard: "abstand", demoKurve: true }, termin: [], lieferanten: [], einladungen: [], vertraege: [], vollmachten: [], ausschreibungen: [], angebote: [], tranchen: [], analysen: [], alarme: {}, laufAm: null };
}

async function lesenBereit() {
  const db = await lesen();
  if (db.energie?.v) return db;
  await aendern(async (d) => {
    if (d.energie?.v) return;
    d.energie = leer();
    try {
      await energieSeed(d);
    } catch (e) {
      console.warn("[plattform-demo] Energie-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}
async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}

const E = (db) => db.energie;
const einstellungen = (db) => ({ ...ANNAHMEN_STANDARD, bestpreisRegelStandard: "abstand", demoKurve: true, ...(E(db).einstellungen || {}) });

/** Alle Terminpreise: gespeicherte Einspielungen + (optional) Demo-Kurve (nicht gespeichert, gekennzeichnet) */
function terminAlle(db) {
  const eigene = E(db).termin || [];
  return einstellungen(db).demoKurve ? [...demoTerminkurve({ stichtag: heute() }), ...eigene] : eigene;
}
const kurveVon = (db) => aktuelleKurve(terminAlle(db));
const kurveHatDemo = (kurve) => Object.values(kurve).some((e) => e.demo);

// ================================================================ Lieferanten-Zuordnung

/** Versorger (Lieferantenstamm) des angemeldeten Kontos oder null */
function lieferantVon(db, n) {
  if (!n?.rollen?.includes("lieferant")) return null;
  return E(db).lieferanten.find((l) => l.status !== "gesperrt" && (l.kontoIds || []).includes(n.id)) || null;
}
const eingeladenIn = (a, lieferantId) => a.status !== "entwurf" && (a.runden || []).some((r) => (r.eingeladen || []).includes(lieferantId));
const aktuelleRunde = (a) => (a.runden || [])[a.runden.length - 1] || null;
const rundeOffen = (r) => !!r && !r.beendetAm && Date.parse(r.frist) > Date.now();

/** Effektiver Status: laufend → auswertung nach Fristablauf */
function statusVon(a) {
  if (a.status === "laufend" && !rundeOffen(aktuelleRunde(a))) return "auswertung";
  return a.status;
}

// ================================================================ Kundendaten (Team B + eigene Verträge)

const nutzerKurz = (db, id) => {
  const u = nutzerById(db, id);
  return u ? { id: u.id, name: nameVon(db, u.id), firma: u.firma || "", email: u.email } : { id, name: "", firma: "", email: "" };
};

function kundeFachdaten(db, kundeId) {
  const stellen = (db.fach?.abnahmestellen || []).filter((s) => s.nutzerId === kundeId);
  const lastgaenge = (db.fach?.lastgaenge || []).filter((l) => l.nutzerId === kundeId).sort((a, b) => String(b.am).localeCompare(String(a.am)));
  return { stellen, lastgang: lastgaenge[0] || null, lastgaenge };
}

/** Los-Eintrag eines Kunden (Schnappschuss): Menge und Profil aus Lastgang > Abnahmestellen > Vertrag */
function losEintragFuer(db, kundeId) {
  const { stellen, lastgang } = kundeFachdaten(db, kundeId);
  const vertrag = aktiverVertrag(db, kundeId);
  const an = lastgang?.analyse;
  const jahresKwh = an?.jahresverbrauchKwh || stellen.reduce((s, x) => s + (x.jahresverbrauchKwh || 0), 0) || vertrag?.jahresKwh || 0;
  return {
    kundeId,
    jahresKwh,
    profilId: an?.lastprofil?.id || vertrag?.lastprofil || "einschicht",
    analyse: an?.wochenprofil ? { wochenprofil: an.wochenprofil, monate: an.monate, jahresverbrauchKwh: an.jahresverbrauchKwh } : null,
    pvKwp: 0, // Lastgang enthält die bestehende PV bereits; geplante PV über den Vertrag (Kundenanalyse)
    speicherKwh: 0,
    land: stellen[0]?.land || vertrag?.zone || "DE",
    spannungsebene: stellen[0]?.spannungsebene || stellen[0]?.netzebeneAt || "",
    messart: stellen[0]?.messart || "",
    abnahmestellen: Math.max(1, stellen.length),
    abnahmestelleIds: stellen.map((s) => s.id),
  };
}

function aktiverVertrag(db, kundeId) {
  const liste = E(db).vertraege.filter((x) => x.kundeId === kundeId && ["aktiv", "gekuendigt"].includes(x.status));
  return liste.sort((a, b) => String(a.vertragEnde).localeCompare(String(b.vertragEnde)))[0] || null;
}

function vollmachtVon(db, kundeId) {
  return [...E(db).vollmachten].reverse().find((x) => x.kundeId === kundeId) || null;
}
const vollmachtAktiv = (db, kundeId) => vollmachtVon(db, kundeId)?.status === "erteilt";

// ================================================================ Wechselanalyse

/** Profilfaktor aus Peak-Anteil und Terminpreisen (Base/Peak) des Folgejahres – ohne Spot-Historie */
function profilfaktorAus(kurve, zone, von, peakAnteil) {
  const bis = zwoelfMonate(von);
  const base = terminPreisZeitraum(kurve, zone, von, bis, "base");
  const peak = terminPreisZeitraum(kurve, zone, von, bis, "peak");
  if (!base || !peak || !Number.isFinite(peakAnteil)) return null;
  const peakStundenAnteil = 3120 / 8760; // Mo–Fr 08–20 Uhr ≈ 35,6 % der Stunden
  const off = (base - peak * peakStundenAnteil) / (1 - peakStundenAnteil);
  return Math.round(((peakAnteil * peak + (1 - peakAnteil) * off) / base) * 1000) / 1000;
}

/** Wechselanalyse eines Vertrags (für Kundenliste, Kundenanalyse, wöchentlichen Lauf) */
function analyseVertrag(db, vt, kurve = kurveVon(db)) {
  const e = einstellungen(db);
  const zone = vt.zone === "AT" ? "AT" : "DE";
  const ende = vt.vertragEnde || "";
  const von = ende ? nachMonat(ende) : `${Number(heute().slice(0, 4)) + 1}-01`;
  const bis = zwoelfMonate(von);
  const fwd = terminPreisZeitraum(kurve, zone, von, bis, "base");
  const los = losEintragFuer(db, vt.kundeId);
  let peakAnteil = null;
  try {
    const reihe = kundenReihe({ von, bis, jahresKwh: vt.jahresKwh || los.jahresKwh, profilId: los.analyse ? los.profilId : vt.lastprofil || los.profilId, analyse: los.analyse, pvKwp: vt.pvKwpGeplant || 0, zone });
    let p = 0;
    let s = 0;
    for (let i = 0; i < reihe.werte.length; i++) {
      s += reihe.werte[i];
      if (istPeak(reihe.startMs + i * 3600000)) p += reihe.werte[i];
    }
    peakAnteil = s > 0 ? p / s : null;
  } catch {
    peakAnteil = null;
  }
  const pf = profilfaktorAus(kurve, zone, von, peakAnteil);
  const cal = `Cal-${von.slice(2, 4)}`;
  const tr = trend(produktVerlauf(terminAlle(db), zone, cal, "base"), 20);
  // Spot/Tranchen ohne Festpreis: Energiepreis ≈ Terminpreis der laufenden 12 Monate + Aufschlag (Nachlauf nach Zuschlag)
  const mJetzt = heute().slice(0, 7);
  const geschaetzt = (vt.preisCt === null || vt.preisCt === undefined) && Number.isFinite(vt.aufschlagCt) ? Math.round(((terminPreisZeitraum(kurve, zone, mJetzt, zwoelfMonate(mJetzt), "base") || 0) / 10 + vt.aufschlagCt) * 1000) / 1000 : null;
  const vertrag = { preisCt: vt.preisCt ?? geschaetzt, preisArt: vt.preisArt, vertragEnde: vt.vertragEnde, kuendigungsfristMonate: vt.kuendigungsfristMonate, kuendigungsfristWochen: vt.kuendigungsfristWochen, verlaengerungMonate: vt.verlaengerungMonate, verlaengerungPreisCt: vt.verlaengerungPreisCt, jahresKwh: vt.jahresKwh || los.jahresKwh };
  const w = wechselanalyse({ vertrag, markt: { forwardEurMwh: fwd, profilfaktor: pf, trend: tr, quelleDemo: kurveHatDemo(kurve) }, annahmen: e, stichtag: heute() });
  if (geschaetzt !== null) w.begruendung.unshift(`Energiepreis geschätzt (${STRUKTUREN[vt.struktur]?.kurz || vt.struktur}): Terminpreis der laufenden 12 Monate + Aufschlag ${vt.aufschlagCt.toLocaleString("de-DE")} ct/kWh.`);
  return { ...w, folgezeitraum: { von, bis }, forwardEurMwh: fwd, profilfaktor: pf, trend: tr, zone };
}
function nachMonat(isoTag) {
  const [j, m] = isoTag.split("-").map(Number);
  return m === 12 ? `${j + 1}-01` : `${j}-${String(m + 1).padStart(2, "0")}`;
}

/** Aufgabe im Backoffice anlegen (Fristen-Alarm) – gleiche Struktur wie aufgabeAnlegen in demo.js */
function aufgabeAnlegenDb(db, { titel, beschreibung, faelligAm, zustaendigId, vonId }) {
  db.aufgaben = db.aufgaben || [];
  const a = { id: neueId("AF"), titel: v.text(titel, 160), beschreibung: v.mehrzeilig(beschreibung, 2000), faelligAm, zustaendigId, bezugArt: null, bezugId: null, status: "offen", erstelltVon: vonId || zustaendigId, erstelltAm: jetzt(), erledigtAm: null, erledigtVon: null, erinnertAm: null };
  db.aufgaben.push(a);
  return a;
}
function energieZustaendig(db) {
  const admins = aktiveAdmins(db);
  return admins.find((u) => (u.backofficeRollen || []).includes("energie")) || admins.find((u) => u.email === "admin@example.com") || admins[0] || null;
}

/**
 * Lauf „Wechselanalyse + Fristen“ (Frappe: wöchentlich bzw. täglich per Scheduler; Demo: Knopf im Backoffice und
 * automatisch, wenn der letzte Lauf älter als 7 Tage ist). Legt je Vertrag eine Analyse ab; erreicht die Restzeit bis
 * zum Kündigungsstichtag eine Alarmstufe (90/60/30/14/7 Tage), entstehen einmalig je Stufe eine Aufgabe für das
 * Backoffice und eine Benachrichtigung an den Kunden. Erinnert Lieferanten 48 h vor Angebotsfrist.
 */
function laufDb(db, n = null) {
  const kurve = kurveVon(db);
  const erg = { analysen: 0, alarme: 0, erinnerungen: 0 };
  const z = energieZustaendig(db);
  for (const vt of E(db).vertraege.filter(analyseRelevant)) {
    const w = analyseVertrag(db, vt, kurve);
    E(db).analysen.push({ id: neueId("WN"), vertragId: vt.id, kundeId: vt.kundeId, am: jetzt(), empfehlung: w.empfehlung, vertragCt: w.vertragCt, marktCt: w.marktCt, deltaEurJahr: w.deltaEurJahr, stichtag: w.stichtag, tageBisStichtag: w.tageBisStichtag, demoKurve: kurveHatDemo(kurve) });
    erg.analysen++;
    if (w.alarm !== null && w.alarm !== undefined && w.stichtag && vt.status === "aktiv") {
      const key = `${vt.id}|${w.stichtag}|${w.alarm}`;
      if (!E(db).alarme[key]) {
        E(db).alarme[key] = jetzt();
        erg.alarme++;
        const k = nutzerKurz(db, vt.kundeId);
        const text = w.alarm === 0 ? `Kündigungsstichtag ${w.stichtag.split("-").reverse().join(".")} verstrichen` : `Kündigung bis ${w.stichtag.split("-").reverse().join(".")} (${w.tageBisStichtag} Tage)`;
        if (z) aufgabeAnlegenDb(db, { titel: `Energievertrag ${k.firma || k.name}: ${text}`, beschreibung: `Empfehlung: ${w.label}.\n${w.begruendung.join("\n")}\nKundenanalyse: /portal/admin/energie/kunden/${vt.kundeId}`, faelligAm: w.alarm === 0 ? heute() : w.stichtag, zustaendigId: z.id, vonId: n?.id });
        const ku = nutzerById(db, vt.kundeId);
        if (ku) benachrichtigen(db, ku, { art: "energie", titel: `Stromvertrag: ${text}`, text: `Empfehlung: ${w.label}. Details unter „Energiebeschaffung“.`, link: "/portal/energie/beschaffung", objektArt: "energievertrag", objektId: vt.id }, { mailText: MAIL, mailBetreff: "Frist Ihres Stromvertrags – ÖkoInvest" });
        for (const adm of aktiveAdmins(db).filter((u) => darfLesen(u, BEREICH))) benachrichtigen(db, adm, { art: "aufgabe", titel: `Frist Energievertrag: ${k.firma || k.name}`, text, link: `/portal/admin/energie/kunden/${vt.kundeId}`, objektArt: "energievertrag", objektId: vt.id }, { mail: false });
      }
    }
  }
  if (E(db).analysen.length > 800) E(db).analysen.splice(0, E(db).analysen.length - 800);
  for (const a of E(db).ausschreibungen) erg.erinnerungen += erinnern(db, a);
  E(db).laufAm = jetzt();
  return erg;
}

function erinnern(db, a, { sofort = false } = {}) {
  const r = aktuelleRunde(a);
  if (a.status !== "laufend" || !rundeOffen(r)) return 0;
  const bis = Date.parse(r.frist) - Date.now();
  if (!sofort && (r.erinnertAm || bis > 48 * 3600e3)) return 0;
  let anzahl = 0;
  for (const lid of r.eingeladen) {
    if (E(db).angebote.some((g) => g.ausschreibungId === a.id && g.runde === r.nr && g.lieferantId === lid && g.status === "abgegeben")) continue;
    for (const kid of E(db).lieferanten.find((l) => l.id === lid)?.kontoIds || []) {
      const u = nutzerById(db, kid);
      if (u) benachrichtigen(db, u, { art: "energie", titel: `Angebotsfrist läuft ab: ${losKennzeichen(a.id)}`, text: `Runde ${r.nr} bis ${fmtDatum(r.frist)}`, link: `/portal/ausschreibungen/${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mailText: MAIL_LF, mailBetreff: "Erinnerung Angebotsfrist – ÖkoInvest" });
    }
    anzahl++;
  }
  r.erinnertAm = jetzt();
  return anzahl;
}

/** Lauf auslösen (Backoffice-Knopf) */
export async function energieLauf(n) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const erg = laufDb(db, n);
    protokoll(db, n, "energie_lauf", "energie", "lauf", `Wechselanalyse/Fristen: ${erg.analysen} Analysen, ${erg.alarme} Alarme, ${erg.erinnerungen} Erinnerungen`);
    return erg;
  });
}
/** Systemlauf (Scheduler-Ersatz im Demo-Betrieb, ohne Nutzer) */
export async function energieSystemLauf() {
  return aendernBereit((db) => laufDb(db, null));
}

async function lauflesen() {
  let db = await lesenBereit();
  const letzte = E(db).laufAm ? Date.parse(E(db).laufAm) : 0;
  if (Date.now() - letzte > 7 * 86400e3) {
    await aendern((d) => void laufDb(d, null));
    db = await lesen();
  }
  return db;
}

// ================================================================ Markt & Terminkurve (Backoffice)

/** Spotpreise einer Zone (Demo: Energy-Charts mit Simulation als Ausfallwert; nicht in der Datei gespeichert) */
export async function energieSpot(n, { zone = "DE", tage = 400 } = {}) {
  leseNoetig(n);
  return spotReihe(ZONEN[zone] ? zone : "DE", { tage: Math.min(800, Math.max(2, Number(tage) || 400)) });
}

/** Terminkurve: aktuelle Kurve je Zone als Tabelle, Einträge (eigene), Verlauf ausgewählter Produkte, Demo-Kennzeichen */
export async function energieTermin(n, { zone = "DE", produkt = "" } = {}) {
  leseNoetig(n);
  const db = await lesenBereit();
  const z = ZONEN[zone] ? zone : "DE";
  const alle = terminAlle(db);
  const kurve = aktuelleKurve(alle);
  const tabelle = kurveTabelle(kurve, z);
  const p = produktZeitraum(produkt) ? produkt : tabelle.find((x) => x.art === "cal")?.produkt || "";
  return {
    zone: z,
    tabelle,
    demoKurve: einstellungen(db).demoKurve,
    enthaeltDemo: tabelle.some((x) => x.demo),
    produkt: p,
    verlauf: p ? { base: produktVerlauf(alle, z, p, "base"), peak: produktVerlauf(alle, z, p, "peak") } : null,
    kurve: Object.values(kurve),
    eintraege: [...E(db).termin].sort((a, b) => b.handelstag.localeCompare(a.handelstag) || String(b.am).localeCompare(String(a.am))).slice(0, 200),
  };
}

/** Terminpreise einspielen: einzeln ({eintrag}) oder CSV ({csv, quelleStandard}) */
export async function energieTerminSpeichern(n, { eintrag = null, csv = "", quelleStandard = "" } = {}) {
  schreibNoetig(n);
  let liste = [];
  let fehler = [];
  if (csv) {
    v.pflicht(typeof csv === "string" && csv.length <= 400000, "Die CSV-Datei ist zu groß (höchstens 400 KB).");
    const r = terminCsvParsen(csv, { quelleStandard: v.text(quelleStandard, 160) });
    liste = r.eintraege;
    fehler = r.fehler;
  } else {
    const r = terminEintragPruefen(eintrag || {});
    if (!r.ok) throw ungueltig(r.fehler);
    liste = [r.eintrag];
  }
  if (!liste.length) throw ungueltig(fehler[0] ? `Zeile ${fehler[0].zeile}: ${fehler[0].text}` : "Keine gültigen Einträge.");
  return aendernBereit((db) => {
    const t = E(db).termin;
    let neu = 0;
    let ersetzt = 0;
    for (const e of liste) {
      const alt = t.find((x) => x.handelstag === e.handelstag && x.zone === e.zone && x.produkt === e.produkt && x.typ === e.typ);
      if (alt) {
        Object.assign(alt, e, { am: jetzt(), vonId: n.id });
        ersetzt++;
      } else {
        t.push({ id: neueId("TP"), ...e, am: jetzt(), vonId: n.id, demo: false });
        neu++;
      }
    }
    if (t.length > 20000) t.splice(0, t.length - 20000);
    protokoll(db, n, "termin_import", "energie", "termin", `Terminpreise eingespielt: ${neu} neu, ${ersetzt} ersetzt${fehler.length ? `, ${fehler.length} Zeilen fehlerhaft` : ""}`);
    return { neu, ersetzt, fehler: fehler.slice(0, 50) };
  });
}

export async function energieTerminLoeschen(n, id) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const i = E(db).termin.findIndex((x) => x.id === v.kennung(id));
    if (i < 0) throw nichtGefunden("Eintrag nicht gefunden.");
    const [e] = E(db).termin.splice(i, 1);
    protokoll(db, n, "termin_loeschen", "energie", e.id, `Terminpreis ${e.zone} ${e.produkt} ${e.typ} (${e.handelstag}) gelöscht`);
    return { ok: true };
  });
}

// ================================================================ Einstellungen

export async function energieEinstellungen(n) {
  leseNoetig(n);
  const db = await lesenBereit();
  return { einstellungen: einstellungen(db), modelle: VERGUETUNG_MODELLE, bestpreisRegeln: BESTPREIS_REGELN };
}

export async function energieEinstellungenSpeichern(n, d = {}) {
  schreibNoetig(n);
  const z = (x, min, max, std, s = 2) => v.zahl(x, { min, max, stellen: s }) ?? std;
  return aendernBereit((db) => {
    const alt = einstellungen(db);
    const neu = {
      ...alt,
      lieferantAufschlagCt: z(d.lieferantAufschlagCt, 0, 10, alt.lieferantAufschlagCt, 3),
      profilAufschlagCt: z(d.profilAufschlagCt, 0, 10, alt.profilAufschlagCt, 3),
      hknCt: z(d.hknCt, 0, 5, alt.hknCt, 3),
      schwelleProzent: z(d.schwelleProzent, 0, 50, alt.schwelleProzent, 1),
      vorlaufTage: z(d.vorlaufTage, 14, 365, alt.vorlaufTage, 0),
      beobachtenTage: z(d.beobachtenTage, 30, 730, alt.beobachtenTage, 0),
      verguetungModell: v.auswahl(d.verguetungModell, VERGUETUNG_MODELLE, alt.verguetungModell),
      serviceFeeEurMwh: z(d.serviceFeeEurMwh, 0, 50, alt.serviceFeeEurMwh, 2),
      erfolgsAnteil: z(d.erfolgsAnteil, 0, 1, alt.erfolgsAnteil, 3),
      risikoSchockProzent: z(d.risikoSchockProzent, 1, 100, alt.risikoSchockProzent, 0),
      bestpreisRegelStandard: v.auswahl(d.bestpreisRegelStandard, BESTPREIS_REGELN, alt.bestpreisRegelStandard),
      demoKurve: d.demoKurve === undefined ? alt.demoKurve : v.wahr(d.demoKurve),
    };
    E(db).einstellungen = neu;
    protokoll(db, n, "einstellungen", "energie", "einstellungen", "Einstellungen Energiebeschaffung geändert");
    return { einstellungen: neu };
  });
}

// ================================================================ Kunden & Verträge

function vertragAusgabe(db, x) {
  const st = kuendigungsStichtag(x);
  return { ...x, energiepreisCt: vertragEnergiepreisCt(x), strukturLabel: STRUKTUREN[x.struktur]?.kurz || x.struktur, kuendigungsStichtag: st, tageBisStichtag: st ? tageZwischen(heute(), st) : null, lieferantName: x.lieferantId ? E(db).lieferanten.find((l) => l.id === x.lieferantId)?.name || x.lieferant : x.lieferant };
}

/** Kundenliste des Backoffice: Unternehmen mit Vertrag, Vollmacht oder Abnahmestelle, dazu Wechselanalyse */
export async function energieKunden(n) {
  leseNoetig(n);
  const db = await lauflesen();
  const kurve = kurveVon(db);
  const ids = new Set([...E(db).vertraege.map((x) => x.kundeId), ...E(db).vollmachten.map((x) => x.kundeId), ...(db.fach?.abnahmestellen || []).map((s) => s.nutzerId)]);
  return [...ids]
    .map((id) => {
      const k = nutzerKurz(db, id);
      const vt = aktiverVertrag(db, id);
      const w = vt ? analyseVertrag(db, vt, kurve) : null;
      const los = losEintragFuer(db, id);
      return {
        kunde: k,
        vertrag: vt ? vertragAusgabe(db, vt) : null,
        jahresKwh: vt?.jahresKwh || los.jahresKwh,
        lastgang: !!los.analyse,
        vollmacht: vollmachtVon(db, id)?.status || "keine",
        analyse: w ? { empfehlung: w.empfehlung, label: w.label, ton: w.ton, vertragCt: w.vertragCt, marktCt: w.marktCt, deltaEurJahr: w.deltaEurJahr, stichtag: w.stichtag, tageBisStichtag: w.tageBisStichtag, alarm: w.alarm } : null,
        ausschreibungen: E(db).ausschreibungen.filter((a) => a.kundenIds.includes(id)).map((a) => ({ id: a.id, titel: a.titel, status: statusVon(a) })),
        poolVertraege: E(db).vertraege.filter((x) => x.kundeId === id && x.pool).length,
      };
    })
    .sort((a, b) => (a.analyse?.tageBisStichtag ?? 99999) - (b.analyse?.tageBisStichtag ?? 99999));
}

/** Detail eines Kunden (Backoffice: jeder; Kunde: nur sich selbst) – Rohdaten für die Kundenanalyse */
export async function energieKunde(n, kundeId) {
  angemeldet(n);
  const id = v.kennung(kundeId);
  if (!boLesen(n) && id !== n.id) throw verboten();
  const db = await lesenBereit();
  const k = nutzerById(db, id);
  if (!k || !k.rollen.includes("unternehmen")) throw nichtGefunden("Kunde nicht gefunden.");
  const kurve = kurveVon(db);
  const { stellen, lastgaenge } = kundeFachdaten(db, id);
  const vertraege = E(db).vertraege.filter((x) => x.kundeId === id).sort((a, b) => String(b.beginn).localeCompare(String(a.beginn)));
  const vt = aktiverVertrag(db, id);
  return {
    kunde: nutzerKurz(db, id),
    abnahmestellen: stellen.map((s) => ({ id: s.id, bezeichnung: s.bezeichnung, land: s.land, messart: s.messart, jahresverbrauchKwh: s.jahresverbrauchKwh, spitzeKw: s.spitzeKw, lieferant: s.lieferant, vertragEnde: s.vertragEnde, maloId: s.maloId, zaehlpunkt: s.zaehlpunkt, spannungsebene: s.spannungsebene, eigenerzeugungKwp: s.eigenerzeugungKwp })),
    lastgaenge: lastgaenge.map((l) => ({ id: l.id, name: l.name, am: l.am, zeitraum: l.analyse?.zeitraum, jahresverbrauchKwh: l.analyse?.jahresverbrauchKwh, spitzeKw: l.analyse?.spitzeKw, benutzungsstunden: l.analyse?.benutzungsstunden, lastprofil: l.analyse?.lastprofil })),
    los: losEintragFuer(db, id),
    vertraege: vertraege.map((x) => vertragAusgabe(db, x)),
    analyse: vt ? analyseVertrag(db, vt, kurve) : null,
    analyseVerlauf: E(db).analysen.filter((x) => x.kundeId === id).slice(-12),
    vollmacht: vollmachtVon(db, id),
    ausschreibungen: E(db).ausschreibungen.filter((a) => a.kundenIds.includes(id)).map((a) => ({ id: a.id, titel: a.titel, status: statusVon(a), lieferbeginn: a.lieferbeginn })),
    einstellungen: einstellungen(db),
    kurveDemo: kurveHatDemo(kurve),
  };
}

const VERTRAG_STATUS = ["aktiv", "gekuendigt", "beendet", "neu"];
function vertragBereinigen(d = {}) {
  const datum = (x) => (/^20\d\d-\d\d-\d\d$/.test(String(x || "")) ? String(x) : "");
  const s = {
    lieferant: v.text(d.lieferant, 120),
    zone: v.auswahl(d.zone, ["DE", "AT"], "DE"),
    preisCt: v.zahl(d.preisCt, { min: 0, max: 200, stellen: 3 }),
    preisArt: v.auswahl(d.preisArt, ["energie", "gesamt"], "energie"),
    struktur: v.auswahl(d.struktur, STRUKTUREN, "fix"),
    beginn: datum(d.beginn),
    vertragEnde: datum(d.vertragEnde),
    kuendigungsfristMonate: v.zahl(d.kuendigungsfristMonate, { min: 0, max: 36, stellen: 0 }),
    kuendigungsfristWochen: v.zahl(d.kuendigungsfristWochen, { min: 0, max: 52, stellen: 0 }),
    verlaengerungMonate: v.zahl(d.verlaengerungMonate, { min: 0, max: 60, stellen: 0 }),
    verlaengerungPreisCt: v.zahl(d.verlaengerungPreisCt, { min: 0, max: 200, stellen: 3 }),
    jahresKwh: v.zahl(d.jahresKwh, { min: 0, max: 5e9, stellen: 0 }),
    lastprofil: v.auswahl(d.lastprofil, ["einschicht", "zweischicht", "dreischicht", "handel"], "einschicht"),
    pvKwpGeplant: v.zahl(d.pvKwpGeplant, { min: 0, max: 100000, stellen: 0 }) || 0,
    speicherKwhGeplant: v.zahl(d.speicherKwhGeplant, { min: 0, max: 100000, stellen: 0 }) || 0,
    status: v.auswahl(d.status, VERTRAG_STATUS, "aktiv"),
    bemerkung: v.mehrzeilig(d.bemerkung, 500),
  };
  v.pflicht(s.lieferant, "Bitte den bisherigen Lieferanten angeben.");
  v.pflicht(s.vertragEnde, "Bitte das Vertragsende angeben.");
  v.pflicht(s.preisCt !== null, "Bitte den Arbeitspreis in ct/kWh angeben.");
  v.pflicht(s.jahresKwh, "Bitte die Jahresmenge in kWh angeben.");
  if (s.beginn) v.pflicht(s.beginn < s.vertragEnde, "Der Vertragsbeginn muss vor dem Vertragsende liegen.");
  return s;
}

/** Vertrag anlegen/ändern: Backoffice für jeden Kunden (kundeId), Kunde nur eigene (quelle „kunde“) */
export async function energieVertragSpeichern(n, { id = null, kundeId = null, daten = {} } = {}) {
  angemeldet(n);
  const bo = boSchreiben(n);
  if (!bo && !n.rollen?.includes("unternehmen")) throw verboten("Stromverträge pflegen Unternehmen bzw. das Backoffice.");
  const s = vertragBereinigen(daten);
  return aendernBereit((db) => {
    const kid = bo && v.kennung(kundeId) ? kundeId : n.id;
    const k = nutzerById(db, kid);
    if (!k || !k.rollen.includes("unternehmen")) throw nichtGefunden("Kunde nicht gefunden.");
    const stellen = (db.fach?.abnahmestellen || []).filter((x) => x.nutzerId === kid).map((x) => x.id);
    const abnahmestelleIds = (Array.isArray(daten.abnahmestelleIds) ? daten.abnahmestelleIds : []).filter((x) => stellen.includes(x));
    if (id) {
      const alt = E(db).vertraege.find((x) => x.id === v.kennung(id));
      if (!alt) throw nichtGefunden("Vertrag nicht gefunden.");
      if (!bo && alt.kundeId !== n.id) throw verboten();
      if (!bo && alt.quelle === "zuschlag") throw konflikt("Verträge aus einem Zuschlag pflegt das Backoffice.");
      Object.assign(alt, s, { abnahmestelleIds, geaendertAm: jetzt() });
      protokoll(db, n, "aendern", "energievertrag", alt.id, `Stromvertrag ${alt.id} geändert`);
      return vertragAusgabe(db, alt);
    }
    v.pflicht(E(db).vertraege.filter((x) => x.kundeId === kid).length < 30, "Höchstens 30 Verträge je Kunde.");
    const neu = { id: neueId("EV"), kundeId: kid, abnahmestelleIds, lieferantId: null, pool: false, ausschreibungId: null, vorvertragId: null, quelle: bo ? "backoffice" : "kunde", ...s, erstelltAm: jetzt(), geaendertAm: jetzt() };
    E(db).vertraege.push(neu);
    protokoll(db, n, "anlegen", "energievertrag", neu.id, `Stromvertrag ${neu.id} angelegt (${nameVon(db, kid)})`);
    return vertragAusgabe(db, neu);
  });
}

// ================================================================ Vollmacht (Kunde)

export async function energieVollmachtErteilen(n, { zustimmung, ip = "", userAgent = "" } = {}) {
  angemeldet(n);
  if (!n.rollen?.includes("unternehmen")) throw verboten("Die Beschaffungsvollmacht erteilen Unternehmen.");
  v.pflicht(zustimmung === true, "Bitte bestätigen Sie den Text der Vollmacht.");
  return aendernBereit((db) => {
    const alt = vollmachtVon(db, n.id);
    if (alt?.status === "erteilt") throw konflikt("Die Vollmacht ist bereits erteilt.");
    const vm = { id: neueId("VM"), kundeId: n.id, version: VOLLMACHT_VERSION, textHash: sha256(VOLLMACHT_TEXT), am: jetzt(), ip: v.text(ip, 64), userAgent: v.text(userAgent, 300), status: "erteilt", widerrufenAm: null, signaturId: null };
    E(db).vollmachten.push(vm);
    protokoll(db, n, "vollmacht", "energievollmacht", vm.id, `Beschaffungsvollmacht erteilt (Version ${VOLLMACHT_VERSION})`, ip);
    for (const adm of aktiveAdmins(db).filter((u) => darfLesen(u, BEREICH))) benachrichtigen(db, adm, { art: "aufgabe", titel: `Beschaffungsvollmacht erteilt: ${nutzerKurz(db, n.id).firma || nameVon(db, n.id)}`, text: "Der Kunde kann jetzt in eine Ausschreibung aufgenommen werden.", link: `/portal/admin/energie/kunden/${n.id}`, objektArt: "energievollmacht", objektId: vm.id }, { mail: false });
    return vm;
  });
}

export async function energieVollmachtWiderrufen(n, { ip = "" } = {}) {
  angemeldet(n);
  return aendernBereit((db) => {
    const vm = vollmachtVon(db, n.id);
    if (!vm || vm.status !== "erteilt") throw konflikt("Es gibt keine aktive Vollmacht.");
    vm.status = "widerrufen";
    vm.widerrufenAm = jetzt();
    protokoll(db, n, "vollmacht_widerruf", "energievollmacht", vm.id, "Beschaffungsvollmacht widerrufen", ip);
    for (const adm of aktiveAdmins(db).filter((u) => darfLesen(u, BEREICH))) benachrichtigen(db, adm, { art: "aufgabe", titel: `Vollmacht widerrufen: ${nutzerKurz(db, n.id).firma || nameVon(db, n.id)}`, text: "Laufende Ausschreibungen prüfen.", link: `/portal/admin/energie/kunden/${n.id}`, objektArt: "energievollmacht", objektId: vm.id }, { mail: false });
    return vm;
  });
}

/** Backoffice verknüpft einen Signaturvorgang (EES) mit der Vollmacht (Signatur-Modul) */
export async function energieVollmachtSignatur(n, kundeId, signaturId) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const vm = vollmachtVon(db, v.kennung(kundeId));
    if (!vm) throw nichtGefunden("Keine Vollmacht vorhanden.");
    vm.signaturId = v.kennung(signaturId) || null;
    return vm;
  });
}

// ================================================================ Übersicht Kunde („Meine Energiebeschaffung“)

export async function energieMeine(n) {
  angemeldet(n);
  if (!n.rollen?.includes("unternehmen") && !istAdmin(n)) throw verboten();
  const db = await lesenBereit();
  const kurve = kurveVon(db);
  const vertraege = E(db).vertraege.filter((x) => x.kundeId === n.id);
  const vt = aktiverVertrag(db, n.id);
  const ausschreibungen = E(db).ausschreibungen.filter((a) => a.kundenIds.includes(n.id) && a.status !== "entwurf").map((a) => kundeAusschreibungAusgabe(db, a, n, kurve));
  // Ersparnis vs. Vorvertrag: neue Verträge aus Zuschlag mit Vorvertrag
  const ersparnis = vertraege
    .filter((x) => x.vorvertragId && x.quelle === "zuschlag")
    .map((x) => {
      const alt = E(db).vertraege.find((y) => y.id === x.vorvertragId);
      const neuCt = x.preisCt ?? (x.aufschlagCt !== undefined && x.aufschlagCt !== null ? (terminPreisZeitraum(kurve, x.zone, x.beginn.slice(0, 7), zwoelfMonate(x.beginn.slice(0, 7))) || 0) / 10 + x.aufschlagCt : null);
      const altCt = vertragEnergiepreisCt(alt);
      return { vertragId: x.id, altCt, neuCt: neuCt !== null ? Math.round(neuCt * 1000) / 1000 : null, jahresKwh: x.jahresKwh, eurJahr: altCt !== null && neuCt !== null ? Math.round(((altCt - neuCt) / 100) * x.jahresKwh) : null, erwartet: x.preisCt === null };
    });
  return {
    vertraege: vertraege.map((x) => vertragAusgabe(db, x)),
    analyse: vt ? analyseVertrag(db, vt, kurve) : null,
    vollmacht: vollmachtVon(db, n.id),
    vollmachtText: VOLLMACHT_TEXT,
    vollmachtVersion: VOLLMACHT_VERSION,
    ausschreibungen,
    ersparnis,
    fach: { abnahmestellen: kundeFachdaten(db, n.id).stellen.length, lastgang: !!kundeFachdaten(db, n.id).lastgang },
  };
}

// ================================================================ Lieferantenstamm

function lieferantAusgabe(db, l, { detail = false } = {}) {
  const teil = E(db).ausschreibungen.filter((a) => (a.runden || []).some((r) => r.eingeladen.includes(l.id)));
  const angebote = E(db).angebote.filter((g) => g.lieferantId === l.id && g.status !== "zurueckgezogen");
  const zuschlaege = angebote.filter((g) => g.status === "zuschlag").length;
  const sterne = l.bewertungen?.length ? Math.round((l.bewertungen.reduce((s, b) => s + b.sterne, 0) / l.bewertungen.length) * 10) / 10 : null;
  const kyc = (l.kontoIds || []).map((k) => kycStatusDb(db, { kontoId: k })).find((s) => s.verifiziert) || (l.kontoIds?.[0] ? kycStatusDb(db, { kontoId: l.kontoIds[0] }) : null);
  const out = {
    id: l.id, name: l.name, land: l.land, gebiete: l.gebiete || [], status: l.status, marktpartnerId: l.marktpartnerId || "", website: l.website || "", notiz: l.notiz || "", demo: !!l.demo,
    ansprechpartner: l.ansprechpartner || [], konten: (l.kontoIds || []).map((k) => nutzerKurz(db, k)), sterne, bewertungenAnzahl: l.bewertungen?.length || 0,
    teilnahme: { eingeladen: teil.length, angebote: new Set(angebote.map((g) => g.ausschreibungId)).size, zuschlaege, quote: teil.length ? Math.round((new Set(angebote.map((g) => g.ausschreibungId)).size / teil.length) * 100) : null },
    kyb: kyc ? { status: kyc.status, verifiziert: kyc.verifiziert } : { status: "kein Konto", verifiziert: false },
    offeneEinladungen: E(db).einladungen.filter((x) => x.lieferantId === l.id && x.status === "offen" && Date.parse(x.ablauf) > Date.now()).map(({ hash: _h, ...x }) => x),
  };
  if (detail) {
    out.bewertungen = (l.bewertungen || []).map((b) => ({ ...b, von: nameVon(db, b.vonId) }));
    out.historie = teil.map((a) => {
      const eigene = angebote.filter((g) => g.ausschreibungId === a.id);
      return { ausschreibungId: a.id, titel: a.titel, status: statusVon(a), runden: [...new Set(eigene.map((g) => g.runde))], zuschlag: eigene.some((g) => g.status === "zuschlag") };
    });
  }
  return out;
}

export async function energieLieferanten(n) {
  leseNoetig(n);
  const db = await lesenBereit();
  return E(db).lieferanten.map((l) => lieferantAusgabe(db, l)).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export async function energieLieferant(n, id) {
  leseNoetig(n);
  const db = await lesenBereit();
  const l = E(db).lieferanten.find((x) => x.id === v.kennung(id));
  if (!l) throw nichtGefunden("Lieferant nicht gefunden.");
  return lieferantAusgabe(db, l, { detail: true });
}

export async function energieLieferantSpeichern(n, { id = null, daten = {} } = {}) {
  schreibNoetig(n);
  const name = v.text(daten.name, 140);
  v.pflicht(name.length >= 3, "Bitte den Namen des Versorgers angeben.");
  const ansprechpartner = (Array.isArray(daten.ansprechpartner) ? daten.ansprechpartner : []).slice(0, 10).map((a) => ({ name: v.text(a?.name, 120), email: v.email(a?.email), telefon: v.text(a?.telefon, 40), funktion: v.text(a?.funktion, 80) })).filter((a) => a.name || a.email);
  const s = { name, land: v.auswahl(daten.land, ["DE", "AT", "CH"], "DE"), gebiete: v.mehrfach(daten.gebiete, ["DE", "AT"]), status: v.auswahl(daten.status, ["aktiv", "gesperrt"], "aktiv"), marktpartnerId: v.text(daten.marktpartnerId, 20), website: v.text(daten.website, 200).startsWith("https://") ? v.text(daten.website, 200) : "", notiz: v.mehrzeilig(daten.notiz, 1000), ansprechpartner };
  if (!s.gebiete.length) s.gebiete = [s.land === "AT" ? "AT" : "DE"];
  return aendernBereit((db) => {
    if (id) {
      const l = E(db).lieferanten.find((x) => x.id === v.kennung(id));
      if (!l) throw nichtGefunden("Lieferant nicht gefunden.");
      Object.assign(l, s);
      protokoll(db, n, "aendern", "lieferant", l.id, `Lieferant „${l.name}“ geändert`);
      return lieferantAusgabe(db, l);
    }
    if (E(db).lieferanten.some((x) => x.name.toLowerCase() === name.toLowerCase())) throw konflikt("Ein Versorger mit diesem Namen existiert bereits.");
    const l = { id: neueId("LF"), ...s, kontoIds: [], bewertungen: [], erstelltAm: jetzt(), demo: false };
    E(db).lieferanten.push(l);
    protokoll(db, n, "anlegen", "lieferant", l.id, `Lieferant „${l.name}“ angelegt`);
    return lieferantAusgabe(db, l);
  });
}

export async function energieLieferantBewerten(n, id, { sterne, text } = {}) {
  schreibNoetig(n);
  const s = v.zahl(sterne, { min: 1, max: 5, stellen: 0 });
  v.pflicht(s, "Bitte 1 bis 5 Sterne vergeben.");
  return aendernBereit((db) => {
    const l = E(db).lieferanten.find((x) => x.id === v.kennung(id));
    if (!l) throw nichtGefunden("Lieferant nicht gefunden.");
    l.bewertungen = [...(l.bewertungen || []), { id: neueId("LB"), am: jetzt(), vonId: n.id, sterne: s, text: v.mehrzeilig(text, 500) }].slice(-50);
    protokoll(db, n, "bewertung", "lieferant", l.id, `Lieferant „${l.name}“ bewertet (${s} Sterne)`);
    return lieferantAusgabe(db, l, { detail: true });
  });
}

// ================================================================ Einladung (Lieferanten ohne Portal-Konto)

const maskieren = (email) => {
  const [lokal, domain] = String(email).split("@");
  return `${lokal.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(6, lokal.length - 1)))}@${domain}`;
};

function einladungAnlegen(db, n, l, email, { basisUrl = "", ausschreibung = null } = {}) {
  for (const x of E(db).einladungen) if (x.lieferantId === l.id && x.email === email && x.status === "offen") x.status = "ersetzt";
  const token = zufallsToken();
  const e = { id: neueId("LE"), lieferantId: l.id, email, hash: sha256(token), ablauf: new Date(Date.now() + EINLADUNG_TAGE * 86400e3).toISOString(), status: "offen", ausschreibungId: ausschreibung?.id || null, eingeladenVon: n.id, erstelltAm: jetzt(), angenommenAm: null, kontoId: null };
  E(db).einladungen.push(e);
  const link = `${basisUrl}/einladung/lieferant/${token}`;
  db.demoLinks ||= [];
  db.demoLinks.unshift({ am: jetzt(), art: "einladung", email, link });
  db.demoLinks = db.demoLinks.slice(0, 50);
  console.info(`[plattform-demo] Lieferanten-Einladung für ${email}: ${link}`);
  postausgangAnlegen(db, {
    an: email, anName: "", nutzerId: null, art: "einladung",
    betreff: ausschreibung ? `Angebotsanfrage Strom (${losKennzeichen(ausschreibung.id)}) – ÖkoInvest` : "Einladung ins Versorger-Portal – ÖkoInvest",
    text: `${ausschreibung ? `ÖkoInvest lädt ${l.name} ein, ein Angebot für die Stromlieferung ab ${ausschreibung.lieferbeginn.split("-").reverse().join("/")} abzugeben (${losKennzeichen(ausschreibung.id)}, Angebotsfrist ${fmtDatum(aktuelleRunde(ausschreibung)?.frist)}).` : `ÖkoInvest lädt ${l.name} in das Versorger-Portal ein.`} Über den Link legen Sie ein Portal-Konto mit dieser E-Mail-Adresse an oder melden sich an; danach sehen Sie die anonymisierten Unterlagen, das Preisblatt und die Fristen. Der Link ist ${EINLADUNG_TAGE} Tage gültig.`,
    link, linkText: ausschreibung ? "Zum Angebot" : "Einladung ansehen", hinweis: "Sie kennen ÖkoInvest nicht? Dann ignorieren Sie diese E-Mail bitte.",
  });
  return { einladung: { ...e, hash: undefined }, link, token };
}

/** Backoffice lädt einen Ansprechpartner eines Versorgers ins Portal ein (optional mit Ausschreibungsbezug) */
export async function energieLieferantEinladen(n, id, { email, basisUrl = "", ausschreibungId = null } = {}) {
  schreibNoetig(n);
  const e = v.email(email);
  v.pflicht(e, "Bitte eine gültige E-Mail-Adresse angeben.");
  return aendernBereit((db) => {
    const l = E(db).lieferanten.find((x) => x.id === v.kennung(id));
    if (!l) throw nichtGefunden("Lieferant nicht gefunden.");
    const vorhanden = db.nutzer.find((u) => u.email === e);
    if (vorhanden?.rollen.includes("admin")) throw konflikt("Backoffice-Konten können nicht als Lieferant eingeladen werden.");
    const a = ausschreibungId ? E(db).ausschreibungen.find((x) => x.id === v.kennung(ausschreibungId)) : null;
    const r = einladungAnlegen(db, n, l, e, { basisUrl, ausschreibung: a });
    if (!l.ansprechpartner.some((x) => x.email === e)) l.ansprechpartner.push({ name: "", email: e, telefon: "", funktion: "" });
    protokoll(db, n, "lieferant_einladung", "lieferant", l.id, `Einladung an ${e}`);
    return { einladung: r.einladung, ...(process.env.NODE_ENV !== "production" ? { demoLink: r.link } : {}) };
  });
}

function einladungSuchen(db, token) {
  const t = String(token || "");
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(t)) return null;
  const h = sha256(t);
  return E(db).einladungen.find((x) => x.hash === h) || null;
}
const einladungGueltig = (e) => e && e.status === "offen" && Date.parse(e.ablauf) > Date.now();

/** Öffentliche Kurzinfo (Einladungsseite) – Versorgername, maskierte E-Mail, ob ein Konto existiert */
export async function energieEinladungInfo(token) {
  const db = await lesenBereit();
  const e = einladungSuchen(db, token);
  if (!einladungGueltig(e)) return { gueltig: false };
  const l = E(db).lieferanten.find((x) => x.id === e.lieferantId);
  return { gueltig: true, lieferant: l?.name || "", email: maskieren(e.email), kontoVorhanden: db.nutzer.some((u) => u.email === e.email), ablauf: e.ablauf, mitAusschreibung: !!e.ausschreibungId };
}

/**
 * Einladung annehmen. Angemeldet: E-Mail muss passen → Rolle „lieferant“ + Zuordnung zum Versorger.
 * Nicht angemeldet: Konto anlegen ({vorname, nachname, passwort}); E-Mail gilt durch den Link als bestätigt.
 * Anmeldung danach regulär über /login (Sitzung setzt die Website nicht hier).
 */
export async function energieEinladungAnnehmen(n, token, { vorname = "", nachname = "", passwort = "", ip = "" } = {}) {
  let hash = null;
  if (!n) {
    const f = v.passwortFehler(passwort);
    v.pflicht(!f, f);
    v.pflicht(v.text(vorname, 80) && v.text(nachname, 80), "Bitte geben Sie Vor- und Nachnamen an.");
    hash = await passwortHash(passwort);
  }
  return aendernBereit((db) => {
    const e = einladungSuchen(db, token);
    if (!einladungGueltig(e)) throw ungueltig("Die Einladung ist ungültig, abgelaufen oder wurde widerrufen.");
    const l = E(db).lieferanten.find((x) => x.id === e.lieferantId);
    if (!l) throw ungueltig("Die Einladung ist ungültig.");
    let u;
    if (n) {
      u = db.nutzer.find((x) => x.id === n.id);
      if (u.email !== e.email) throw verboten("Diese Einladung gilt für eine andere E-Mail-Adresse. Bitte melden Sie sich mit der eingeladenen Adresse an.");
      if (u.rollen.includes("admin")) throw konflikt("Backoffice-Konten können keine Lieferanten-Einladung annehmen.");
    } else {
      if (db.nutzer.some((x) => x.email === e.email)) throw konflikt("Für diese E-Mail-Adresse besteht bereits ein Konto – bitte zuerst anmelden und den Link erneut öffnen.");
      u = { id: neueId("U"), email: e.email, vorname: v.text(vorname, 80), nachname: v.text(nachname, 80), firma: l.name, telefon: "", rollen: ["lieferant"], passwortHash: hash, sitzungVersion: 0, aktiv: true, emailBestaetigt: true, erstelltAm: jetzt(), letzterLogin: null, suchprofil: null };
      db.nutzer.push(u);
      protokoll(db, u, "registrierung", "nutzer", u.id, "Registrierung als Lieferant (Einladung)", ip);
    }
    if (!u.rollen.includes("lieferant")) u.rollen = [...u.rollen, "lieferant"];
    u.emailBestaetigt = true;
    if (!u.firma) u.firma = l.name;
    for (const x of E(db).lieferanten) if (x.id !== l.id) x.kontoIds = (x.kontoIds || []).filter((k) => k !== u.id); // ein Konto → ein Versorger
    if (!l.kontoIds.includes(u.id)) l.kontoIds.push(u.id);
    e.status = "angenommen";
    e.angenommenAm = jetzt();
    e.kontoId = u.id;
    protokoll(db, u, "lieferant_einladung", "lieferant", l.id, `Einladung angenommen (${l.name})`, ip);
    for (const adm of aktiveAdmins(db).filter((x) => darfLesen(x, BEREICH))) benachrichtigen(db, adm, { art: "aufgabe", titel: `Lieferanten-Einladung angenommen: ${l.name}`, text: `${u.email} ist jetzt im Versorger-Portal.`, link: `/portal/admin/energie/lieferanten`, objektArt: "lieferant", objektId: l.id }, { mail: false });
    return { ok: true, neuesKonto: !n, lieferant: l.name, ausschreibungId: e.ausschreibungId, weiter: e.ausschreibungId ? `/portal/ausschreibungen/${e.ausschreibungId}` : "/portal/ausschreibungen" };
  });
}

// ================================================================ Ausschreibungen – Ausgabe je Rolle

function angebotAusgabe(g, { mitHistorie = false } = {}) {
  return { id: g.id, ausschreibungId: g.ausschreibungId, runde: g.runde, positionen: g.positionen, bindefristBis: g.bindefristBis, zahlungszielTage: g.zahlungszielTage, sicherheit: g.sicherheit, sicherheitLabel: SICHERHEITEN[g.sicherheit] || g.sicherheit, bemerkung: g.bemerkung, status: g.status, am: g.am, version: g.version, ...(mitHistorie ? { historie: g.historie || [] } : {}) };
}

function vergleichFuer(db, a, kurve, { runde = null } = {}) {
  const { ctx, kennzahlen, fehlend } = losKontext(a, kurve);
  const angebote = E(db).angebote.filter((g) => g.ausschreibungId === a.id && ["abgegeben", "zuschlag", "unterlegen"].includes(g.status) && (runde === null || g.runde === runde));
  return { ...angeboteVergleichen(angebote, a.produkte, ctx), ctx: { kwh: Math.round(ctx.kwh), lastgewichtetEurMwh: Math.round(ctx.lastgewichtetEurMwh * 100) / 100, baseEurMwh: Math.round(ctx.baseEurMwh * 100) / 100 }, kennzahlen, fehlend };
}

function rundenAusgabe(a, { intern: istIntern = false } = {}) {
  return (a.runden || []).map((r) => ({ nr: r.nr, start: r.start, frist: r.frist, beendetAm: r.beendetAm || null, offen: rundeOffen(r), bestpreisRegel: r.bestpreisRegel, bestpreisLabel: BESTPREIS_REGELN[r.bestpreisRegel]?.label, ...(istIntern ? { eingeladen: r.eingeladen, erinnertAm: r.erinnertAm || null } : { eingeladenAnzahl: undefined }) }));
}

/** Backoffice-Sicht: alles inkl. Klarnamen, Vergleich aller Runden, Teilnehmerstand */
function adminAusgabe(db, a, kurve) {
  const r = aktuelleRunde(a);
  const vergleich = vergleichFuer(db, a, kurve);
  const letzte = r ? vergleichFuer(db, a, kurve, { runde: r.nr }) : null;
  const lfName = (id) => E(db).lieferanten.find((l) => l.id === id)?.name || id;
  const mitNamen = (z) => ({ ...z, lieferant: lfName(z.lieferantId) });
  const e = einstellungen(db);
  const bester = letzte?.bester || vergleich.bester;
  return {
    id: a.id, titel: a.titel, los: losKennzeichen(a.id), status: statusVon(a), statusLabel: AUSSCHREIBUNG_STATUS[statusVon(a)]?.label, zone: a.zone, lieferbeginn: a.lieferbeginn, produkte: a.produkte.map((p) => ({ ...p, label: produktLabel(p) })),
    kunden: a.kundenIds.map((id) => ({ ...nutzerKurz(db, id), vollmacht: vollmachtVon(db, id)?.status || "keine", freigabe: a.zuschlag?.kundenFreigaben?.[id] || null })),
    lose: a.lose.map(({ analyse: _a, ...x }) => ({ ...x, lastgang: !!_a })),
    anonym: a.anonym, regeln: a.regeln, kommune: !!a.kommune, runden: rundenAusgabe(a, { intern: true }), runde: r ? { nr: r.nr, frist: r.frist, offen: rundeOffen(r) } : null,
    teilnehmer: r ? r.eingeladen.map((lid) => ({ lieferantId: lid, name: lfName(lid), geboten: E(db).angebote.some((g) => g.ausschreibungId === a.id && g.runde === r.nr && g.lieferantId === lid && g.status !== "zurueckgezogen") })) : [],
    angebote: E(db).angebote.filter((g) => g.ausschreibungId === a.id).map((g) => ({ ...angebotAusgabe(g, { mitHistorie: true }), lieferantId: g.lieferantId, lieferant: lfName(g.lieferantId) })),
    vergleich: { ...vergleich, zeilen: vergleich.zeilen.map(mitNamen), bester: vergleich.bester ? mitNamen(vergleich.bester) : null },
    vergleichRunde: letzte ? { runde: r.nr, zeilen: letzte.zeilen.map(mitNamen) } : null,
    verguetung: bester ? verguetung({ mengeMwh: vergleich.ctx.kwh / 1000, ersparnisEur: 0, modell: e.verguetungModell, serviceFeeEurMwh: e.serviceFeeEurMwh, erfolgsAnteil: e.erfolgsAnteil }) : null,
    fragen: (a.fragen || []).map((f) => ({ ...f, lieferant: lfName(f.lieferantId) })),
    zuschlag: a.zuschlag ? { ...a.zuschlag, lieferant: lfName(E(db).angebote.find((g) => g.id === a.zuschlag.angebotId)?.lieferantId) } : null,
    verlauf: a.verlauf || [], erstelltAm: a.erstelltAm, kurveDemo: kurveHatDemo(kurve),
  };
}

/** Lieferanten-Sicht: Los anonym, eigene Angebote, öffentliche Antworten, Hinweis Folgerunde – keine Kundendaten */
function lieferantAusgabeAusschreibung(db, a, l, kurve) {
  const r = aktuelleRunde(a);
  const status = statusVon(a);
  const eigene = E(db).angebote.filter((g) => g.ausschreibungId === a.id && g.lieferantId === l.id).sort((x, y) => String(y.am).localeCompare(String(x.am)));
  const zugelassen = !!r && r.eingeladen.includes(l.id);
  let hinweis = null;
  if (r && r.nr > 1 && zugelassen) hinweis = bestpreisHinweis(r.bestpreisRegel, l.id, vergleichFuer(db, a, kurve, { runde: r.nr - 1 }));
  const zuschlagAngebot = a.zuschlag?.am ? E(db).angebote.find((g) => g.id === a.zuschlag.angebotId) : null;
  return {
    id: a.id,
    los: losKennzeichen(a.id),
    titel: `Stromlieferung ${ZONEN[a.zone]?.label || a.zone} ab ${a.lieferbeginn.split("-").reverse().join("/")}`,
    status,
    statusLabel: AUSSCHREIBUNG_STATUS[status]?.label,
    zone: a.zone,
    lieferbeginn: a.lieferbeginn,
    produkte: a.produkte.map((p) => ({ ...p, label: produktLabel(p), text: PRODUKT_ARTEN[p.art]?.text })),
    profil: a.anonym,
    runden: rundenAusgabe(a),
    runde: r ? { nr: r.nr, frist: r.frist, offen: rundeOffen(r), zugelassen } : null,
    darfBieten: zugelassen && status === "laufend" && rundeOffen(r),
    hinweis,
    eigeneAngebote: eigene.map((g) => angebotAusgabe(g)),
    fragen: (a.fragen || []).filter((f) => f.lieferantId === l.id || (f.oeffentlich && f.antwort)).map((f) => ({ id: f.id, text: f.text, antwort: f.antwort || "", am: f.am, beantwortetAm: f.beantwortetAm || null, eigene: f.lieferantId === l.id })),
    ergebnis: a.status === "zuschlag" ? (zuschlagAngebot?.lieferantId === l.id ? "zuschlag" : eigene.length ? "absage" : "ohne_angebot") : a.status === "abgebrochen" ? "abgebrochen" : null,
    sicherheiten: SICHERHEITEN,
  };
}

/** Kunden-Sicht: Status, bei Freigabe den Vergleich der besten Angebote je Versorger mit Namen */
function kundeAusschreibungAusgabe(db, a, n, kurve) {
  const status = statusVon(a);
  const out = { id: a.id, titel: a.titel, status, statusLabel: AUSSCHREIBUNG_STATUS[status]?.label, lieferbeginn: a.lieferbeginn, zone: a.zone, pool: a.kundenIds.length > 1, runden: rundenAusgabe(a).map(({ nr, frist, offen, beendetAm }) => ({ nr, frist, offen, beendetAm })), produkte: a.produkte.map((p) => ({ ...p, label: produktLabel(p) })), eigeneFreigabe: a.zuschlag?.kundenFreigaben?.[n.id] || null, vorschlag: null, vergleich: null, angeboteAnzahl: new Set(E(db).angebote.filter((g) => g.ausschreibungId === a.id && g.status !== "zurueckgezogen").map((g) => g.lieferantId)).size };
  if (["freigabe", "zuschlag"].includes(a.status) && a.zuschlag) {
    const vg = vergleichFuer(db, a, kurve);
    const lfName = (id) => E(db).lieferanten.find((l) => l.id === id)?.name || "";
    // Anteil des Kunden am Pool (für €/Jahr des Kunden)
    const anteil = a.kundenIds.length > 1 ? (a.lose.find((x) => x.kundeId === n.id)?.jahresKwh || 0) / Math.max(1, a.lose.reduce((s, x) => s + (x.jahresKwh || 0), 0)) : 1;
    const beste = besteJeLieferant(vg).slice(0, 6).map((z, i) => ({ lieferant: lfName(z.lieferantId), produkt: z.produkt, art: z.art, ctKwh: z.ctKwh, eurJahr: Math.round(z.eurJahr * anteil), rang: i + 1, abstandProzent: z.abstandProzent, sensitivitaet: Object.fromEntries(Object.entries(z.sensitivitaet).map(([k, x]) => [k, Math.round(x * anteil)])), angebotId: z.angebotId, produktId: z.produktId }));
    const vz = vg.zeilen.find((z) => z.angebotId === a.zuschlag.angebotId && z.produktId === a.zuschlag.produktId);
    const g = E(db).angebote.find((x) => x.id === a.zuschlag.angebotId);
    const neuV = E(db).vertraege.find((y) => y.ausschreibungId === a.id && y.kundeId === n.id);
    const alt = neuV?.vorvertragId ? E(db).vertraege.find((y) => y.id === neuV.vorvertragId) : aktiverVertrag(db, n.id);
    const altCt = vertragEnergiepreisCt(alt);
    out.vorschlag = vz ? { lieferant: lfName(vz.lieferantId), produkt: vz.produkt, art: vz.art, ctKwh: vz.ctKwh, eurJahr: Math.round(vz.eurJahr * anteil), begruendung: a.zuschlag.begruendung || "", bindefristBis: g?.bindefristBis, zahlungszielTage: g?.zahlungszielTage, sicherheit: SICHERHEITEN[g?.sicherheit] || "", altCt, ersparnisEurJahr: altCt !== null && vz.ctKwh ? Math.round(((altCt - vz.ctKwh) / 100) * (a.lose.find((x) => x.kundeId === n.id)?.jahresKwh || 0)) : null } : null;
    out.vergleich = { zeilen: beste, szenarien: vg.szenarien };
  }
  return out;
}

// ================================================================ Ausschreibungen – Lesen

export async function energieAusschreibungen(n, { status = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const kurve = kurveVon(db);
  if (boLesen(n)) {
    return E(db).ausschreibungen
      .filter((a) => !status || statusVon(a) === status)
      .sort((a, b) => String(b.erstelltAm).localeCompare(String(a.erstelltAm)))
      .map((a) => {
        const r = aktuelleRunde(a);
        const vg = vergleichFuer(db, a, kurve, { runde: r?.nr ?? null });
        return { id: a.id, titel: a.titel, los: losKennzeichen(a.id), status: statusVon(a), statusLabel: AUSSCHREIBUNG_STATUS[statusVon(a)]?.label, zone: a.zone, lieferbeginn: a.lieferbeginn, kunden: a.kundenIds.map((id) => nutzerKurz(db, id).firma || nameVon(db, id)), mengeMwh: Math.round(vg.ctx.kwh / 1000), runde: r ? { nr: r.nr, frist: r.frist, offen: rundeOffen(r), eingeladen: r.eingeladen.length } : null, angebote: new Set(E(db).angebote.filter((g) => g.ausschreibungId === a.id && g.runde === r?.nr && g.status !== "zurueckgezogen").map((g) => g.lieferantId)).size, besterCt: vg.bester?.ctKwh ?? null };
      });
  }
  const l = lieferantVon(db, n);
  if (l) {
    return E(db).ausschreibungen
      .filter((a) => eingeladenIn(a, l.id))
      .map((a) => {
        const o = lieferantAusgabeAusschreibung(db, a, l, kurve);
        return { id: o.id, los: o.los, titel: o.titel, status: o.status, statusLabel: o.statusLabel, zone: o.zone, lieferbeginn: o.lieferbeginn, runde: o.runde, darfBieten: o.darfBieten, eigeneAngebote: o.eigeneAngebote.length, jahresMengeMwh: o.profil?.jahresMengeMwh, ergebnis: o.ergebnis };
      });
  }
  if (n.rollen?.includes("unternehmen")) return E(db).ausschreibungen.filter((a) => a.kundenIds.includes(n.id) && a.status !== "entwurf").map((a) => kundeAusschreibungAusgabe(db, a, n, kurve));
  throw verboten();
}

export async function energieAusschreibung(n, id) {
  angemeldet(n);
  let db = await lesenBereit();
  const a0 = E(db).ausschreibungen.find((x) => x.id === v.kennung(id));
  if (!a0) throw nichtGefunden("Ausschreibung nicht gefunden.");
  // Erinnerung 48 h vor Frist (einmalig je Runde)
  const r0 = aktuelleRunde(a0);
  if (a0.status === "laufend" && rundeOffen(r0) && !r0.erinnertAm && Date.parse(r0.frist) - Date.now() <= 48 * 3600e3) {
    await aendern((d) => {
      const x = E(d).ausschreibungen.find((y) => y.id === a0.id);
      if (x) erinnern(d, x);
    });
    db = await lesen();
  }
  const a = E(db).ausschreibungen.find((x) => x.id === a0.id);
  const kurve = kurveVon(db);
  if (boLesen(n)) return { rolle: "admin", ausschreibung: adminAusgabe(db, a, kurve) };
  const l = lieferantVon(db, n);
  if (l) {
    if (!eingeladenIn(a, l.id)) throw nichtGefunden("Ausschreibung nicht gefunden.");
    return { rolle: "lieferant", ausschreibung: lieferantAusgabeAusschreibung(db, a, l, kurve) };
  }
  if (n.rollen?.includes("unternehmen") && a.kundenIds.includes(n.id) && a.status !== "entwurf") return { rolle: "kunde", ausschreibung: kundeAusschreibungAusgabe(db, a, n, kurve) };
  throw nichtGefunden("Ausschreibung nicht gefunden.");
}

// ================================================================ Ausschreibungen – Backoffice

function fristPruefen(wert) {
  const d = new Date(v.text(wert, 40));
  v.pflicht(!Number.isNaN(d.getTime()), "Bitte eine gültige Angebotsfrist angeben.");
  v.pflicht(d.getTime() > Date.now() + 5 * 60e3, "Die Angebotsfrist muss in der Zukunft liegen.");
  v.pflicht(d.getTime() < Date.now() + 120 * 86400e3, "Die Angebotsfrist darf höchstens 120 Tage in der Zukunft liegen.");
  return d.toISOString();
}

/** Ausschreibung anlegen (Entwurf oder direkt starten). Jeder Kunde braucht eine aktive Beschaffungsvollmacht. */
export async function energieAusschreibungAnlegen(n, daten = {}) {
  schreibNoetig(n);
  const titel = v.text(daten.titel, 160);
  v.pflicht(titel.length >= 5, "Bitte einen Titel angeben (mind. 5 Zeichen).");
  const lieferbeginn = /^20\d\d-(0[1-9]|1[0-2])$/.test(String(daten.lieferbeginn || "")) ? daten.lieferbeginn : "";
  v.pflicht(lieferbeginn && lieferbeginn > heute().slice(0, 7), "Bitte einen Lieferbeginn in der Zukunft angeben (JJJJ-MM).");
  const produkte = fach(() => produkteBereinigen(daten.produkte));
  const kundenIds = [...new Set((Array.isArray(daten.kundenIds) ? daten.kundenIds : []).map(v.kennung).filter(Boolean))].slice(0, 50);
  v.pflicht(kundenIds.length >= 1, "Bitte mindestens einen Kunden wählen (bei mehreren: Pool).");
  const zone = v.auswahl(daten.zone, ["DE", "AT"], "DE");
  const starten = v.wahr(daten.starten);
  const frist = starten ? fristPruefen(daten.frist) : null;
  return aendernBereit((db) => {
    for (const kid of kundenIds) {
      const k = nutzerById(db, kid);
      if (!k || !k.rollen.includes("unternehmen")) throw nichtGefunden("Kunde nicht gefunden.");
      if (!vollmachtAktiv(db, kid)) throw konflikt(`Für ${k.firma || nameVon(db, kid)} liegt keine aktive Beschaffungsvollmacht vor – bitte zuerst im Kundenportal erteilen lassen.`);
    }
    const lose = kundenIds.map((kid) => {
      const e = losEintragFuer(db, kid);
      if (Number.isFinite(v.zahl(daten.mengen?.[kid], { min: 1000, max: 5e9 }))) e.jahresKwh = Number(daten.mengen[kid]);
      return e;
    });
    v.pflicht(lose.every((x) => x.jahresKwh > 0), "Für jeden Kunden wird eine Jahresmenge benötigt (Vertrag, Abnahmestelle oder Lastgang).");
    const lieferanten = (Array.isArray(daten.lieferantIds) ? daten.lieferantIds : []).map(v.kennung).filter((x) => E(db).lieferanten.some((l) => l.id === x && l.status === "aktiv"));
    if (starten) v.pflicht(lieferanten.length >= 2, "Für einen Bieterwettbewerb bitte mindestens zwei Versorger einladen.");
    const a = {
      id: neueId("EA"), titel, kundenIds, zone, lieferbeginn, produkte, lose: lose.map(({ abnahmestelleIds: _x, ...r }) => ({ ...r })), abnahmestelleIds: Object.fromEntries(lose.map((x) => [x.kundeId, x.abnahmestelleIds])),
      regeln: { bestpreis: v.auswahl(daten.bestpreis, BESTPREIS_REGELN, einstellungen(db).bestpreisRegelStandard) }, kommune: v.wahr(daten.kommune),
      status: starten ? "laufend" : "entwurf", runden: starten ? [{ nr: 1, start: jetzt(), frist, beendetAm: null, eingeladen: lieferanten, bestpreisRegel: "aus", erinnertAm: null }] : [], vorgemerkt: starten ? [] : lieferanten,
      fragen: [], zuschlag: null, verlauf: [{ am: jetzt(), vonId: n.id, text: `Ausschreibung angelegt (${kundenIds.length} ${kundenIds.length === 1 ? "Kunde" : "Kunden, Pool"}, ${produkte.length} Produktvarianten)` }], erstelltAm: jetzt(), erstelltVon: n.id,
    };
    a.anonym = losAnonym(a);
    E(db).ausschreibungen.push(a);
    if (starten) rundeMelden(db, a, n, daten.basisUrl);
    protokoll(db, n, "ausschreibung", "ausschreibung", a.id, `Ausschreibung „${titel}“ angelegt${starten ? " und gestartet" : ""}`);
    return adminAusgabe(db, a, kurveVon(db));
  });
}

/** Eingeladene Versorger einer (neuen) Runde benachrichtigen; Versorger ohne Konto erhalten eine E-Mail-Einladung */
function rundeMelden(db, a, n, basisUrl = "", nur = null) {
  const r = aktuelleRunde(a);
  a.verlauf.push({ am: jetzt(), vonId: n.id, text: `Runde ${r.nr} gestartet, ${r.eingeladen.length} Versorger eingeladen, Frist ${fmtDatum(r.frist)}` });
  for (const lid of nur || r.eingeladen) {
    const l = E(db).lieferanten.find((x) => x.id === lid);
    if (!l) continue;
    const konten = (l.kontoIds || []).map((k) => nutzerById(db, k)).filter((u) => u?.aktiv);
    if (konten.length) {
      for (const u of konten) benachrichtigen(db, u, { art: "energie", titel: r.nr === 1 ? `Neue Angebotsanfrage: ${losKennzeichen(a.id)}` : `Runde ${r.nr}: ${losKennzeichen(a.id)}`, text: `Angebotsfrist ${fmtDatum(r.frist)}`, link: `/portal/ausschreibungen/${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mailText: MAIL_LF, mailBetreff: "Angebotsanfrage Strom – ÖkoInvest" });
    } else {
      const ap = (l.ansprechpartner || []).find((x) => x.email);
      if (ap) einladungAnlegen(db, n, l, ap.email, { basisUrl: basisUrl || "", ausschreibung: a });
    }
  }
}

/**
 * Backoffice steuert die Ausschreibung:
 *   starten {frist, lieferantIds} · einladen {lieferantIds} · frist {frist} · beenden · naechsteRunde {frist, lieferantIds, bestpreisRegel}
 *   erinnern · antworten {frageId, antwort, oeffentlich} · zuschlagVorschlag {angebotId, produktId, begruendung}
 *   zuschlag (nur mit Freigabe aller Kunden – sonst 409) · vorschlagZurueck · abbrechen {grund}
 */
export async function energieAusschreibungAktion(n, id, daten = {}) {
  schreibNoetig(n);
  const aktion = v.auswahl(daten.aktion, ["starten", "einladen", "frist", "beenden", "naechsteRunde", "erinnern", "antworten", "zuschlagVorschlag", "zuschlag", "vorschlagZurueck", "abbrechen"], "");
  v.pflicht(aktion, "Unbekannte Aktion.");
  return aendernBereit((db) => {
    const a = E(db).ausschreibungen.find((x) => x.id === v.kennung(id));
    if (!a) throw nichtGefunden("Ausschreibung nicht gefunden.");
    const status = statusVon(a);
    const r = aktuelleRunde(a);
    const ende = ["zuschlag", "abgebrochen"].includes(a.status);
    const log = (text) => a.verlauf.push({ am: jetzt(), vonId: n.id, text });
    const lieferantenPruefen = (ids) => [...new Set((Array.isArray(ids) ? ids : []).map(v.kennung).filter((x) => E(db).lieferanten.some((l) => l.id === x && l.status === "aktiv")))];
    let hinweis = "";

    if (aktion === "starten") {
      if (a.status !== "entwurf") throw konflikt("Die Ausschreibung läuft bereits.");
      const ids = lieferantenPruefen(daten.lieferantIds?.length ? daten.lieferantIds : a.vorgemerkt);
      v.pflicht(ids.length >= 2, "Für einen Bieterwettbewerb bitte mindestens zwei Versorger einladen.");
      for (const kid of a.kundenIds) if (!vollmachtAktiv(db, kid)) throw konflikt("Für mindestens einen Kunden liegt keine aktive Beschaffungsvollmacht vor.");
      a.runden = [{ nr: 1, start: jetzt(), frist: fristPruefen(daten.frist), beendetAm: null, eingeladen: ids, bestpreisRegel: "aus", erinnertAm: null }];
      a.status = "laufend";
      rundeMelden(db, a, n, daten.basisUrl);
    } else if (aktion === "einladen") {
      if (status !== "laufend") throw konflikt("Nachladen ist nur in einer offenen Runde möglich.");
      const neu = lieferantenPruefen(daten.lieferantIds).filter((x) => !r.eingeladen.includes(x));
      v.pflicht(neu.length, "Keine neuen Versorger gewählt.");
      r.eingeladen.push(...neu);
      rundeMelden(db, a, n, daten.basisUrl, neu);
      log(`${neu.length} Versorger nachträglich eingeladen`);
    } else if (aktion === "frist") {
      if (ende || a.status === "entwurf" || a.status === "freigabe") throw konflikt("Die Frist kann in diesem Status nicht geändert werden.");
      r.frist = fristPruefen(daten.frist);
      r.beendetAm = null;
      r.erinnertAm = null;
      a.status = "laufend";
      log(`Frist Runde ${r.nr} geändert auf ${fmtDatum(r.frist)}`);
      for (const lid of r.eingeladen) for (const k of E(db).lieferanten.find((l) => l.id === lid)?.kontoIds || []) {
        const u = nutzerById(db, k);
        if (u) benachrichtigen(db, u, { art: "energie", titel: `Neue Angebotsfrist: ${losKennzeichen(a.id)}`, text: `Runde ${r.nr} bis ${fmtDatum(r.frist)}`, link: `/portal/ausschreibungen/${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mailText: MAIL_LF, mailBetreff: "Neue Angebotsfrist – ÖkoInvest" });
      }
    } else if (aktion === "beenden") {
      if (status !== "laufend") throw konflikt("Die Runde ist nicht offen.");
      r.beendetAm = jetzt();
      log(`Runde ${r.nr} vorzeitig beendet – Angebote gesperrt`);
    } else if (aktion === "naechsteRunde") {
      if (ende || a.status === "entwurf" || a.status === "freigabe") throw konflikt("Eine weitere Runde ist in diesem Status nicht möglich.");
      if (rundeOffen(r)) throw konflikt("Die laufende Runde ist noch offen – bitte zuerst beenden oder Frist abwarten.");
      const geboten = new Set(E(db).angebote.filter((g) => g.ausschreibungId === a.id && g.runde === r.nr && g.status === "abgegeben").map((g) => g.lieferantId));
      const ids = lieferantenPruefen(daten.lieferantIds).filter((x) => geboten.has(x));
      v.pflicht(ids.length >= 1, "Bitte mindestens einen Versorger mit Angebot aus der Vorrunde wählen (Shortlist).");
      if (!r.beendetAm) r.beendetAm = r.frist;
      const regel = v.auswahl(daten.bestpreisRegel, BESTPREIS_REGELN, a.regeln?.bestpreis || "aus");
      a.runden.push({ nr: r.nr + 1, start: jetzt(), frist: fristPruefen(daten.frist), beendetAm: null, eingeladen: ids, bestpreisRegel: regel, erinnertAm: null });
      a.status = "laufend";
      rundeMelden(db, a, n, daten.basisUrl);
      for (const lid of r.eingeladen.filter((x) => !ids.includes(x))) for (const k of E(db).lieferanten.find((l) => l.id === lid)?.kontoIds || []) {
        const u = nutzerById(db, k);
        if (u) benachrichtigen(db, u, { art: "energie", titel: `Angebotsanfrage ${losKennzeichen(a.id)}: nächste Runde ohne Ihr Angebot`, text: "Vielen Dank für Ihr Angebot – es wurde für die nächste Runde nicht berücksichtigt.", link: `/portal/ausschreibungen/${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mailText: MAIL_LF, mailBetreff: "Angebotsanfrage Strom – ÖkoInvest" });
      }
    } else if (aktion === "erinnern") {
      if (status !== "laufend") throw konflikt("Die Runde ist nicht offen.");
      hinweis = `${erinnern(db, a, { sofort: true })} Versorger erinnert.`;
      log(hinweis);
    } else if (aktion === "antworten") {
      const f = (a.fragen || []).find((x) => x.id === v.kennung(daten.frageId));
      v.pflicht(f, "Frage nicht gefunden.");
      const antwort = v.mehrzeilig(daten.antwort, 2000);
      v.pflicht(antwort.length >= 3, "Bitte eine Antwort eingeben.");
      f.antwort = antwort;
      f.beantwortetAm = jetzt();
      f.oeffentlich = daten.oeffentlich !== false;
      log(`Frage beantwortet${f.oeffentlich ? " (für alle Bieter sichtbar)" : ""}`);
      const ziel = f.oeffentlich ? r?.eingeladen || [] : [f.lieferantId];
      for (const lid of ziel) for (const k of E(db).lieferanten.find((l) => l.id === lid)?.kontoIds || []) {
        const u = nutzerById(db, k);
        if (u) benachrichtigen(db, u, { art: "energie", titel: `Antwort zu ${losKennzeichen(a.id)}`, text: "Eine Frage zur Angebotsanfrage wurde beantwortet.", link: `/portal/ausschreibungen/${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mail: false });
      }
    } else if (aktion === "zuschlagVorschlag") {
      if (ende) throw konflikt("Die Ausschreibung ist beendet.");
      if (status === "laufend") throw konflikt("Ein Zuschlag ist erst nach Ablauf bzw. Ende der Runde möglich (Gleichbehandlung).");
      const g = E(db).angebote.find((x) => x.id === v.kennung(daten.angebotId) && x.ausschreibungId === a.id && x.status === "abgegeben");
      v.pflicht(g, "Bitte ein gültiges Angebot wählen.");
      const pos = g.positionen.find((p) => p.produktId === daten.produktId);
      v.pflicht(pos, "Bitte die Produktvariante des Angebots wählen.");
      if (Date.parse(g.bindefristBis) < Date.now()) throw konflikt("Die Bindefrist des Angebots ist abgelaufen – bitte beim Versorger verlängern lassen.");
      a.zuschlag = { angebotId: g.id, produktId: pos.produktId, vorschlagAm: jetzt(), vorschlagVon: n.id, begruendung: v.mehrzeilig(daten.begruendung, 1000), kundenFreigaben: {}, am: null };
      a.status = "freigabe";
      log(`Zuschlagsvorschlag an die Kunden gesendet (${E(db).lieferanten.find((l) => l.id === g.lieferantId)?.name}, ${produktLabel(a.produkte.find((p) => p.id === pos.produktId))})`);
      for (const kid of a.kundenIds) {
        const u = nutzerById(db, kid);
        if (u) benachrichtigen(db, u, { art: "energie", titel: "Angebotsvergleich zur Freigabe", text: `${a.titel}: Bitte prüfen und freigeben (Bindefrist ${fmtDatum(g.bindefristBis)}).`, link: `/portal/energie/beschaffung?ausschreibung=${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mailText: "Für Ihre Strombeschaffung liegt ein Angebotsvergleich zur Freigabe bereit. Ohne Ihre Freigabe wird kein Vertrag geschlossen.", mailBetreff: "Angebotsvergleich zur Freigabe – ÖkoInvest" });
      }
    } else if (aktion === "vorschlagZurueck") {
      if (a.status !== "freigabe") throw konflikt("Es liegt kein offener Vorschlag vor.");
      a.zuschlag = null;
      a.status = "laufend";
      if (r && !r.beendetAm) r.beendetAm = r.frist;
      log("Zuschlagsvorschlag zurückgezogen");
    } else if (aktion === "zuschlag") {
      if (a.status !== "freigabe" || !a.zuschlag) throw konflikt("Zuerst einen Zuschlagsvorschlag an die Kunden senden.");
      const fehlt = a.kundenIds.filter((kid) => a.zuschlag.kundenFreigaben?.[kid]?.entscheidung !== "freigegeben");
      if (fehlt.length) throw konflikt(`Kundenfreigabe erforderlich: ${fehlt.length} von ${a.kundenIds.length} Kunden haben noch nicht freigegeben.`);
      zuschlagErteilen(db, a, n);
    } else if (aktion === "abbrechen") {
      if (ende) throw konflikt("Die Ausschreibung ist bereits beendet.");
      const grund = v.mehrzeilig(daten.grund, 500);
      v.pflicht(grund.length >= 3, "Bitte eine Begründung angeben.");
      a.status = "abgebrochen";
      if (r && !r.beendetAm) r.beendetAm = jetzt();
      for (const g of E(db).angebote.filter((x) => x.ausschreibungId === a.id && x.status === "abgegeben")) g.status = "unterlegen";
      log(`Abgebrochen: ${grund}`);
      absagenSenden(db, a, null, "Die Angebotsanfrage wurde ohne Zuschlag beendet. Vielen Dank für Ihr Angebot.");
      for (const kid of a.kundenIds) {
        const u = nutzerById(db, kid);
        if (u) benachrichtigen(db, u, { art: "energie", titel: `Ausschreibung beendet: ${a.titel}`, text: "Die Ausschreibung wurde ohne Zuschlag beendet.", link: "/portal/energie/beschaffung", objektArt: "ausschreibung", objektId: a.id }, { mailText: MAIL, mailBetreff: "Ihre Strom-Ausschreibung – ÖkoInvest" });
      }
    }
    protokoll(db, n, "ausschreibung", "ausschreibung", a.id, `Ausschreibung ${a.id}: ${aktion}`);
    return { ...adminAusgabe(db, a, kurveVon(db)), hinweis };
  });
}

function absagenSenden(db, a, siegerLieferantId, text) {
  const beteiligt = new Set(E(db).angebote.filter((g) => g.ausschreibungId === a.id && g.status !== "zurueckgezogen").map((g) => g.lieferantId));
  for (const lid of beteiligt) {
    if (lid === siegerLieferantId) continue;
    for (const k of E(db).lieferanten.find((l) => l.id === lid)?.kontoIds || []) {
      const u = nutzerById(db, k);
      if (u) benachrichtigen(db, u, { art: "energie", titel: `Angebotsanfrage ${losKennzeichen(a.id)} entschieden`, text, link: `/portal/ausschreibungen/${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mailText: `${text} Details finden Sie im Portal von ÖkoInvest.`, mailBetreff: "Ergebnis Ihrer Angebotsabgabe – ÖkoInvest" });
    }
  }
}

/** Zuschlag erteilen (nur nach Freigabe aller Kunden): Angebot → zuschlag, übrige → unterlegen, Verträge anlegen */
function zuschlagErteilen(db, a, n) {
  const g = E(db).angebote.find((x) => x.id === a.zuschlag.angebotId);
  if (!g || g.status !== "abgegeben") throw konflikt("Das Angebot ist nicht mehr gültig.");
  if (Date.parse(g.bindefristBis) < Date.now()) throw konflikt("Die Bindefrist des Angebots ist abgelaufen.");
  kycSperre(db, "zuschlag", { kontoId: g.kontoId, text: "Zuschlag nicht möglich: Der Versorger ist noch nicht verifiziert (KYB)." }); // KYC/KYB
  const pos = g.positionen.find((p) => p.produktId === a.zuschlag.produktId);
  const p = a.produkte.find((x) => x.id === pos.produktId);
  const l = E(db).lieferanten.find((x) => x.id === g.lieferantId);
  for (const x of E(db).angebote.filter((y) => y.ausschreibungId === a.id && y.status === "abgegeben")) x.status = x.id === g.id ? "zuschlag" : "unterlegen";
  a.status = "zuschlag";
  a.zuschlag.am = jetzt();
  a.zuschlag.vonId = n?.id || null;
  const [j, m] = a.lieferbeginn.split("-").map(Number);
  const ende = new Date(Date.UTC(j + p.laufzeitJahre, m - 1, 0)).toISOString().slice(0, 10);
  for (const kid of a.kundenIds) {
    const alt = aktiverVertrag(db, kid);
    const los = a.lose.find((x) => x.kundeId === kid);
    E(db).vertraege.push({
      id: neueId("EV"), kundeId: kid, abnahmestelleIds: a.abnahmestelleIds?.[kid] || [], lieferant: l.name, lieferantId: l.id, zone: a.zone, preisCt: p.art === "fix" ? pos.arbeitspreisCt : null, preisArt: "energie", struktur: p.art,
      aufschlagCt: p.art === "fix" ? null : pos.aufschlagCt, grundpreisEurMonat: pos.grundpreisEurMonat, hknCt: pos.hknCt, beginn: `${a.lieferbeginn}-01`, vertragEnde: ende, kuendigungsfristMonate: 3, verlaengerungMonate: 0, verlaengerungPreisCt: null,
      jahresKwh: los?.jahresKwh || null, lastprofil: los?.profilId || "einschicht", status: "neu", pool: a.kundenIds.length > 1, quelle: "zuschlag", ausschreibungId: a.id, angebotId: g.id, vorvertragId: alt?.id || null, erstelltAm: jetzt(), geaendertAm: jetzt(),
    });
    if (alt && alt.status === "aktiv") alt.status = "gekuendigt";
    const u = nutzerById(db, kid);
    if (u) benachrichtigen(db, u, { art: "energie", titel: `Zuschlag erteilt: ${l.name}`, text: `${a.titel}: Lieferung ab ${a.lieferbeginn.split("-").reverse().join("/")}. Die Kündigung des bisherigen Vertrags und der Lieferantenwechsel werden eingeleitet.`, link: "/portal/energie/beschaffung", objektArt: "ausschreibung", objektId: a.id }, { mailText: MAIL, mailBetreff: "Zuschlag Ihrer Strombeschaffung – ÖkoInvest" });
  }
  for (const k of l.kontoIds || []) {
    const u = nutzerById(db, k);
    if (u) benachrichtigen(db, u, { art: "energie", titel: `Zuschlag: ${losKennzeichen(a.id)}`, text: `Ihr Angebot (${produktLabel(p)}) erhält den Zuschlag. Kundendaten und Lokations-IDs für den Lieferantenwechsel stellt ÖkoInvest gesondert bereit.`, link: `/portal/ausschreibungen/${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mailText: MAIL_LF, mailBetreff: "Zuschlag Ihrer Angebotsabgabe – ÖkoInvest" });
  }
  absagenSenden(db, a, l.id, "Der Zuschlag ging an einen anderen Versorger. Vielen Dank für Ihr Angebot.");
  const z = energieZustaendig(db);
  if (z) aufgabeAnlegenDb(db, { titel: `Lieferantenwechsel einleiten: ${a.titel}`, beschreibung: `Zuschlag an ${l.name}. Kundendaten (Name, Anschrift, MaLo/Zählpunkt) an den Versorger übermitteln, Altverträge kündigen, Anmeldung zum ${a.lieferbeginn.split("-").reverse().join("/")} bestätigen lassen (DE: GPKE, AT: Wechselprozess nach Wechsel-Verordnung).`, faelligAm: heute(), zustaendigId: z.id, vonId: n?.id });
  a.verlauf.push({ am: jetzt(), vonId: n?.id || null, text: `Zuschlag erteilt an ${l.name} nach Freigabe aller Kunden – Absagen versendet, Verträge angelegt` });
  protokoll(db, n, "zuschlag", "ausschreibung", a.id, `Zuschlag ${a.id} an ${l.name} (${g.id})`);
}

// ================================================================ Lieferant: Angebot & Fragen

/** Verdecktes Angebot abgeben (ersetzt das eigene Angebot derselben Runde) */
export async function energieAngebotAbgeben(n, ausschreibungId, daten = {}) {
  angemeldet(n);
  if (!n.rollen?.includes("lieferant") || istAdmin(n)) throw verboten("Angebote geben Energieversorger ab.");
  return aendernBereit((db) => {
    const l = lieferantVon(db, n);
    if (!l) throw verboten("Ihr Konto ist keinem Versorger zugeordnet.");
    const a = E(db).ausschreibungen.find((x) => x.id === v.kennung(ausschreibungId));
    if (!a || !eingeladenIn(a, l.id)) throw nichtGefunden("Ausschreibung nicht gefunden.");
    const r = aktuelleRunde(a);
    if (!r.eingeladen.includes(l.id)) throw verboten("Sie sind für diese Runde nicht zugelassen.");
    if (statusVon(a) !== "laufend" || !rundeOffen(r)) throw konflikt("Die Angebotsfrist ist abgelaufen – Angebote sind gesperrt.");
    kycSperre(db, "gebot", { kontoId: n.id, organisationId: n.organisation?.id || null }); // KYC/KYB
    const pb = fach(() => preisblattPruefen(daten, a.produkte, { frist: r.frist }));
    let g = E(db).angebote.find((x) => x.ausschreibungId === a.id && x.runde === r.nr && x.lieferantId === l.id && x.status === "abgegeben");
    if (g) {
      g.historie = [...(g.historie || []), { am: g.am, version: g.version, positionen: g.positionen }].slice(-10);
      Object.assign(g, pb, { am: jetzt(), version: (g.version || 1) + 1, kontoId: n.id });
    } else {
      g = { id: neueId("LO"), ausschreibungId: a.id, runde: r.nr, lieferantId: l.id, kontoId: n.id, ...pb, status: "abgegeben", am: jetzt(), version: 1, historie: [] };
      E(db).angebote.push(g);
    }
    for (const adm of aktiveAdmins(db).filter((u) => darfLesen(u, BEREICH))) benachrichtigen(db, adm, { art: "aufgabe", titel: `Angebot eingegangen: ${a.titel}`, text: `${l.name} · Runde ${r.nr}${g.version > 1 ? ` · Version ${g.version}` : ""}`, link: `/portal/admin/energie/ausschreibungen/${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mail: false });
    protokoll(db, n, "angebot", "ausschreibung", a.id, `Angebot ${g.id} (Runde ${r.nr}, Version ${g.version}) abgegeben`);
    return angebotAusgabe(g);
  });
}

export async function energieAngebotZurueckziehen(n, id) {
  angemeldet(n);
  return aendernBereit((db) => {
    const l = lieferantVon(db, n);
    const g = E(db).angebote.find((x) => x.id === v.kennung(id));
    if (!l || !g || g.lieferantId !== l.id) throw nichtGefunden("Angebot nicht gefunden.");
    const a = E(db).ausschreibungen.find((x) => x.id === g.ausschreibungId);
    const r = aktuelleRunde(a);
    if (g.status !== "abgegeben" || g.runde !== r.nr || !rundeOffen(r) || statusVon(a) !== "laufend") throw konflikt("Das Angebot kann nicht mehr zurückgezogen werden.");
    g.status = "zurueckgezogen";
    protokoll(db, n, "angebot", "ausschreibung", a.id, `Angebot ${g.id} zurückgezogen`);
    return { ok: true };
  });
}

export async function energieFrageStellen(n, ausschreibungId, { text } = {}) {
  angemeldet(n);
  const t = v.mehrzeilig(text, 1500);
  v.pflicht(t.length >= 10, "Bitte formulieren Sie Ihre Frage (mind. 10 Zeichen).");
  return aendernBereit((db) => {
    const l = lieferantVon(db, n);
    if (!l) throw verboten("Fragen stellen eingeladene Versorger.");
    const a = E(db).ausschreibungen.find((x) => x.id === v.kennung(ausschreibungId));
    if (!a || !eingeladenIn(a, l.id)) throw nichtGefunden("Ausschreibung nicht gefunden.");
    if (!AUSSCHREIBUNG_OFFEN.includes(a.status) || statusVon(a) !== "laufend") throw konflikt("Fragen sind nur während der Angebotsphase möglich.");
    v.pflicht((a.fragen || []).filter((f) => f.lieferantId === l.id).length < 20, "Höchstens 20 Fragen je Versorger.");
    const f = { id: neueId("LQ"), lieferantId: l.id, kontoId: n.id, text: t, antwort: "", am: jetzt(), beantwortetAm: null, oeffentlich: true };
    a.fragen = [...(a.fragen || []), f];
    for (const adm of aktiveAdmins(db).filter((u) => darfLesen(u, BEREICH))) benachrichtigen(db, adm, { art: "aufgabe", titel: `Bieterfrage: ${a.titel}`, text: `${l.name}: ${t.slice(0, 120)}`, link: `/portal/admin/energie/ausschreibungen/${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mail: false });
    protokoll(db, n, "frage", "ausschreibung", a.id, "Bieterfrage gestellt");
    return { id: f.id, text: f.text, am: f.am, antwort: "", eigene: true };
  });
}

// ================================================================ Kunde: Freigabe

/** Kunde gibt den Zuschlagsvorschlag frei oder lehnt ihn ab; sind alle Kunden einverstanden, wird der Zuschlag erteilt */
export async function energieFreigabe(n, ausschreibungId, { entscheidung, kommentar = "", ip = "" } = {}) {
  angemeldet(n);
  if (!n.rollen?.includes("unternehmen") || istAdmin(n)) throw verboten("Die Freigabe erteilt der Kunde.");
  const e = v.auswahl(entscheidung, ["freigegeben", "abgelehnt"], "");
  v.pflicht(e, "Bitte „freigeben“ oder „ablehnen“ wählen.");
  return aendernBereit((db) => {
    const a = E(db).ausschreibungen.find((x) => x.id === v.kennung(ausschreibungId));
    if (!a || !a.kundenIds.includes(n.id)) throw nichtGefunden("Ausschreibung nicht gefunden.");
    if (a.status !== "freigabe" || !a.zuschlag) throw konflikt("Es liegt kein Vorschlag zur Freigabe vor.");
    if (!vollmachtAktiv(db, n.id)) throw konflikt("Ihre Beschaffungsvollmacht ist nicht aktiv – bitte zuerst erteilen.");
    a.zuschlag.kundenFreigaben = { ...(a.zuschlag.kundenFreigaben || {}), [n.id]: { am: jetzt(), ip: v.text(ip, 64), entscheidung: e, kommentar: v.mehrzeilig(kommentar, 500) } };
    a.verlauf.push({ am: jetzt(), vonId: n.id, text: `Kunde ${nutzerKurz(db, n.id).firma || nameVon(db, n.id)}: ${e === "freigegeben" ? "Zuschlag freigegeben" : "Vorschlag abgelehnt"}` });
    protokoll(db, n, "freigabe", "ausschreibung", a.id, `Zuschlagsvorschlag ${e}`, ip);
    let zuschlag = false;
    if (e === "abgelehnt") {
      for (const adm of aktiveAdmins(db).filter((u) => darfLesen(u, BEREICH))) benachrichtigen(db, adm, { art: "aufgabe", titel: `Kunde lehnt Vorschlag ab: ${a.titel}`, text: v.text(kommentar, 200) || "Ohne Kommentar", link: `/portal/admin/energie/ausschreibungen/${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mail: false });
    } else if (a.kundenIds.every((kid) => a.zuschlag.kundenFreigaben?.[kid]?.entscheidung === "freigegeben")) {
      zuschlagErteilen(db, a, n);
      zuschlag = true;
    } else {
      for (const adm of aktiveAdmins(db).filter((u) => darfLesen(u, BEREICH))) benachrichtigen(db, adm, { art: "aufgabe", titel: `Kundenfreigabe erteilt: ${a.titel}`, text: "Weitere Kunden des Pools müssen noch freigeben.", link: `/portal/admin/energie/ausschreibungen/${a.id}`, objektArt: "ausschreibung", objektId: a.id }, { mail: false });
    }
    return { ok: true, zuschlag, ausschreibung: kundeAusschreibungAusgabe(db, a, n, kurveVon(db)) };
  });
}

// ================================================================ Portfolio (Pool) & Tranchen

function portfolioDb(db) {
  const e = einstellungen(db);
  const kurve = kurveVon(db);
  const pool = E(db).vertraege.filter((x) => x.pool && ["neu", "aktiv"].includes(x.status));
  const bedarf = new Map();
  for (const vt of pool) {
    const von = vt.beginn.slice(0, 7);
    const endeMonat = vt.vertragEnde.slice(0, 7);
    let start = von;
    for (let i = 0; i < 3 && start <= endeMonat; i++) {
      const los = losEintragFuer(db, vt.kundeId);
      const reihe = kundenReihe({ von: start, bis: zwoelfMonate(start) > endeMonat ? endeMonat : zwoelfMonate(start), jahresKwh: vt.jahresKwh || los.jahresKwh, profilId: vt.lastprofil || los.profilId, analyse: los.analyse, zone: vt.zone });
      for (const q of bedarfJeQuartal(reihe)) bedarf.set(`${vt.zone}|${q.periode}`, (bedarf.get(`${vt.zone}|${q.periode}`) || 0) + q.mwh);
      start = `${Number(start.slice(0, 4)) + 1}${start.slice(4)}`;
    }
  }
  const zonen = [...new Set([...[...bedarf.keys()].map((k) => k.split("|")[0]), ...E(db).tranchen.map((t) => t.zone)])];
  const jeZone = {};
  for (const zone of zonen) {
    const b = [...bedarf.entries()].filter(([k]) => k.startsWith(`${zone}|`)).map(([k, mwh]) => ({ periode: k.split("|")[1], mwh }));
    const tr = E(db).tranchen.filter((t) => t.zone === zone && t.typ === "base");
    const marktpreis = (periode) => {
      const z = produktZeitraum(periode);
      return z ? terminPreisZeitraum(kurve, zone, z.von, z.bis, "base") : null;
    };
    const pf = portfolioRechnen({ bedarf: b, tranchen: tr, marktpreis, schockProzent: e.risikoSchockProzent });
    const reihenfolge = (p) => {
      const z = produktZeitraum(p);
      return z ? z.von : p;
    };
    pf.perioden.sort((x, y) => reihenfolge(x.periode).localeCompare(reihenfolge(y.periode)));
    jeZone[zone] = pf;
  }
  return {
    zonen: jeZone,
    kunden: pool.map((vt) => ({ vertragId: vt.id, kunde: nutzerKurz(db, vt.kundeId), zone: vt.zone, jahresKwh: vt.jahresKwh, beginn: vt.beginn, ende: vt.vertragEnde, lieferant: vt.lieferant, struktur: vt.struktur })),
    tranchen: [...E(db).tranchen].sort((a, b) => String(b.gekauftAm).localeCompare(String(a.gekauftAm))),
    kurveDemo: kurveHatDemo(kurve),
    schockProzent: e.risikoSchockProzent,
  };
}

export async function energiePortfolio(n) {
  leseNoetig(n);
  return portfolioDb(await lesenBereit());
}

export async function energieTrancheSpeichern(n, d = {}) {
  schreibNoetig(n);
  const p = produktZeitraum(d.periode);
  v.pflicht(p && p.art === "quartal", "Periode bitte als Quartal angeben (z. B. Q1-27) – Jahresprodukte als vier Quartale buchen.");
  const mwh = v.zahl(d.mwh, { min: 0.1, max: 1e6, stellen: 1 });
  const preis = v.zahl(d.preisEurMwh, { min: -500, max: 3000, stellen: 2 });
  v.pflicht(mwh, "Bitte die Menge in MWh angeben.");
  v.pflicht(preis !== null, "Bitte den Preis in €/MWh angeben.");
  const gekauftAm = /^20\d\d-\d\d-\d\d$/.test(String(d.gekauftAm || "")) ? d.gekauftAm : heute();
  return aendernBereit((db) => {
    const lid = v.kennung(d.lieferantId);
    const l = lid ? E(db).lieferanten.find((x) => x.id === lid) : null;
    const t = { id: neueId("BT"), periode: p.code, zone: v.auswahl(d.zone, ["DE", "AT"], "DE"), typ: "base", mwh, preisEurMwh: preis, gekauftAm, lieferant: l?.name || v.text(d.lieferant, 120), lieferantId: l?.id || null, ausschreibungId: null, status: "aktiv", vonId: n.id, bemerkung: v.text(d.bemerkung, 200) };
    E(db).tranchen.push(t);
    protokoll(db, n, "tranche", "energie", t.id, `Tranche ${t.zone} ${t.periode}: ${mwh} MWh zu ${preis} €/MWh gebucht`);
    return t;
  });
}

export async function energieTrancheStornieren(n, id) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const t = E(db).tranchen.find((x) => x.id === v.kennung(id));
    if (!t) throw nichtGefunden("Tranche nicht gefunden.");
    if (t.status === "storniert") throw konflikt("Die Tranche ist bereits storniert.");
    t.status = "storniert";
    protokoll(db, n, "tranche", "energie", t.id, `Tranche ${t.id} storniert`);
    return t;
  });
}

// ================================================================ Dokumente (Daten für PDF – Website erzeugt das PDF)

/** art: vergleich (Backoffice, Kunde bei Freigabe/Zuschlag) · zuschlag (Backoffice, Kunde, bezuschlagter Versorger) · vollmacht (Kunde, Backoffice) */
export async function energieDokumentDaten(n, { art, id = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const kurve = kurveVon(db);
  if (art === "kundenbericht") {
    // Beschaffungsbericht je Kunde: Backoffice für jeden Kunden, Kunde nur für sich selbst
    const kid = boLesen(n) && v.kennung(id) ? id : n.id;
    if (!boLesen(n) && !n.rollen?.includes("unternehmen")) throw verboten();
    const k = nutzerById(db, kid);
    if (!k || !k.rollen.includes("unternehmen")) throw nichtGefunden("Kunde nicht gefunden.");
    const vertraege = E(db).vertraege.filter((x) => x.kundeId === kid).sort((a, b) => String(b.beginn).localeCompare(String(a.beginn)));
    const vt = aktiverVertrag(db, kid);
    const ersparnis = vertraege.filter((x) => x.vorvertragId && x.quelle === "zuschlag").map((x) => {
      const alt = E(db).vertraege.find((y) => y.id === x.vorvertragId);
      const neuCt = x.preisCt ?? (Number.isFinite(x.aufschlagCt) ? (terminPreisZeitraum(kurve, x.zone, x.beginn.slice(0, 7), zwoelfMonate(x.beginn.slice(0, 7))) || 0) / 10 + x.aufschlagCt : null);
      const altCt = vertragEnergiepreisCt(alt);
      return { vertragId: x.id, lieferant: x.lieferant, altCt, neuCt: neuCt !== null ? Math.round(neuCt * 1000) / 1000 : null, jahresKwh: x.jahresKwh, eurJahr: altCt !== null && neuCt !== null && x.jahresKwh ? Math.round(((altCt - neuCt) / 100) * x.jahresKwh) : null, erwartet: x.preisCt === null || x.preisCt === undefined };
    });
    return {
      art, rolle: boLesen(n) ? "admin" : "kunde", kunde: nutzerKurz(db, kid), vertraege: vertraege.map((x) => vertragAusgabe(db, x)), analyse: vt ? analyseVertrag(db, vt, kurve) : null,
      analyseVerlauf: E(db).analysen.filter((x) => x.kundeId === kid).slice(-12), ersparnis, vollmacht: vollmachtVon(db, kid)?.status || "keine",
      ausschreibungen: E(db).ausschreibungen.filter((a) => a.kundenIds.includes(kid) && a.status !== "entwurf").map((a) => ({ id: a.id, titel: a.titel, status: statusVon(a), lieferbeginn: a.lieferbeginn, pool: a.kundenIds.length > 1 })),
      kurveDemo: kurveHatDemo(kurve), stand: jetzt(),
    };
  }
  if (art === "vollmacht") {
    const kid = boLesen(n) && v.kennung(id) ? id : n.id;
    if (!boLesen(n) && !n.rollen?.includes("unternehmen")) throw verboten();
    return { art, kunde: nutzerKurz(db, kid), vollmacht: vollmachtVon(db, kid), text: VOLLMACHT_TEXT, version: VOLLMACHT_VERSION };
  }
  const a = E(db).ausschreibungen.find((x) => x.id === v.kennung(id));
  if (!a) throw nichtGefunden("Ausschreibung nicht gefunden.");
  if (boLesen(n)) {
    if (art === "zuschlag" && a.status !== "zuschlag") throw konflikt("Noch kein Zuschlag erteilt.");
    return { art, rolle: "admin", ausschreibung: adminAusgabe(db, a, kurve) };
  }
  if (n.rollen?.includes("unternehmen") && a.kundenIds.includes(n.id) && ["freigabe", "zuschlag"].includes(a.status)) {
    if (art === "zuschlag" && a.status !== "zuschlag") throw konflikt("Noch kein Zuschlag erteilt.");
    return { art, rolle: "kunde", ausschreibung: kundeAusschreibungAusgabe(db, a, n, kurve), kunde: nutzerKurz(db, n.id) };
  }
  const l = lieferantVon(db, n);
  if (l && art === "zuschlag" && a.status === "zuschlag" && E(db).angebote.find((g) => g.id === a.zuschlag?.angebotId)?.lieferantId === l.id) {
    return { art, rolle: "lieferant", ausschreibung: lieferantAusgabeAusschreibung(db, a, l, kurve), lieferant: l.name };
  }
  throw nichtGefunden("Dokument nicht gefunden.");
}

/** Übersicht für das Backoffice-Cockpit des Handelsdesks */
export async function energieUebersicht(n) {
  leseNoetig(n);
  const db = await lauflesen();
  const kurve = kurveVon(db);
  const offen = E(db).ausschreibungen.filter((a) => AUSSCHREIBUNG_OFFEN.includes(statusVon(a)));
  const vertraege = E(db).vertraege.filter(analyseRelevant);
  const analysen = vertraege.map((x) => analyseVertrag(db, x, kurve));
  return {
    ausschreibungenOffen: offen.length,
    freigabeOffen: offen.filter((a) => a.status === "freigabe").length,
    lieferanten: E(db).lieferanten.filter((l) => l.status === "aktiv").length,
    kunden: new Set(E(db).vertraege.map((x) => x.kundeId)).size,
    empfehlungen: Object.fromEntries(Object.keys(EMPFEHLUNGEN).map((k) => [k, analysen.filter((w) => w.empfehlung === k).length])),
    fristen: analysen.filter((w) => w.tageBisStichtag !== null && w.tageBisStichtag <= 90).length,
    laufAm: E(db).laufAm,
    kurveDemo: kurveHatDemo(kurve),
    einstellungen: einstellungen(db),
  };
}
