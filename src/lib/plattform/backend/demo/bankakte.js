// src/lib/plattform/backend/demo/bankakte.js
//
// Bank-Akte im Demo-Backend – Referenz für plattform/api/bankakte.py (Vertrag: docs/API.md, Abschnitt „Bank-Akte“). Ergänzt
// das Bank-Portal der Finanzierung (demo/finanzierung.js: Einladung, Bankenpaket, Term Sheet, Entscheidung, Kreditvertrag, CPs,
// Covenants) um den Prozess nach dem Erstkontakt – je Finanzierungsanfrage:
//   Unterlagen-Anforderungen der Bank (Checkliste mit Frist) → Lieferung durch ÖkoInvest (Upload bzw. Freigabe eines Bausteins)
//   → Akzeptanz/Nachforderung · Q&A mit Antworten · Zuständigkeit (Sachbearbeitung der Bank) · Kreditentscheidung (Gremium)
//   · Bestätigung der Auszahlungsvoraussetzungen (CPs) durch die Bank · Auszahlungsanträge (Ziehungen) mit Freigabe/Valuta
//   · Monitoring-Berichte (Covenant-Report aus dem Covenant-Monitoring, Jahresabschluss, Betriebsbericht …) mit Prüfung
// sowie das Bank-Team (mehrere Sachbearbeiter je Bank mit Rollen Leitung / Sachbearbeitung / Nur lesen, Einladung von Kollegen).
//
// Rechte:
//   Bank        – Rolle bank UND Konto der angefragten Bank (bank.nutzerIds) UND Teamrolle je Aktion (bankakte.js, BANK_AKTION_ROLLE)
//   Backoffice  – admin mit Bereich „finanzierung“: lesen ≥ 1, schreiben = 2
//
// Daten unter db.bankportal (eigene Sammlung; Verweise auf db.finanzierung).

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { UPLOAD } from "../../konstanten";
import { BANKENPAKET, BANKENPAKET_IDS, ANFRAGE_STATUS } from "../../finanzierung/bank";
import {
  ANFORDERUNG_STATUS, AUSZAHLUNG_STATUS, BANK_AKTION_ROLLE, BANK_TEAMROLLEN, BERICHT_ARTEN, BERICHT_STATUS, BankakteFehler, KREDIT_ERGEBNIS, QA_KATEGORIEN,
  akteStand, anforderungenBereinigen, auszahlungBereinigen, bankRolleAus, bankRolleReicht, berichtBereinigen, cpOffen, frageBereinigen, kreditentscheidungBereinigen,
} from "../../finanzierung/bankakte";
import { intern } from "../demo";
import { aendern, lesen, uploadLesen, uploadSchreiben } from "./speicher";
import { jetzt, neueId, sha256, vorTagen, zufallsToken } from "./hilfen";
import { internSicherheit } from "./sicherheitWerkzeuge";

const { benachrichtigen, protokoll, nutzerById, nameVon, aktiveAdmins } = intern;
const postausgangAnlegen = (...a) => internSicherheit.postausgangAnlegen(...a);
const SCHEMA = 2; // 2: Bestandsfinanzierung nur aus Demo-Fällen mit Anlage
const EINLADUNG_TAGE = 7;
const istAdmin = (n) => !!n?.rollen?.includes("admin");
const boLesen = (n) => istAdmin(n) && darfLesen(n, "finanzierung");
const boSchreiben = (n) => istAdmin(n) && darfSchreiben(n, "finanzierung");
const heute = () => new Date().toISOString().slice(0, 10);

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof BankakteFehler) throw new PlattformFehler(e.status || 422, e.message);
    throw e;
  }
}

// ================================================================ Datenbestand

async function lesenBereit() {
  let db = await lesen();
  if (!db.finanzierung?.v) {
    const fz = await import("./finanzierung");
    await fz.fzBankZaehler({ id: "system-bankakte", rollen: ["bank"] }).catch(() => null); // Finanzierungs-Demo sicherstellen
    await fz.fzBankMeine({ id: "system-bankakte", rollen: ["bank"] }).catch(() => null);
    db = await lesen();
  }
  if ((db.bankportal?.v || 0) >= SCHEMA && db.bankportal.fzSchema === db.finanzierung?.v) return db;
  await aendern(async (d) => {
    if ((d.bankportal?.v || 0) >= SCHEMA && d.bankportal.fzSchema === d.finanzierung?.v) return;
    d.bankportal = { v: SCHEMA, fzSchema: d.finanzierung?.v || 0, akten: [], mitglieder: [], einladungen: [], dateien: [] };
    try {
      seed(d);
    } catch (e) {
      console.warn("[plattform-demo] Bank-Akten-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}
async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}
const BP = (db) => db.bankportal;
const FZ = (db) => db.finanzierung;
const bankVon = (db, id) => (FZ(db).banken || []).find((b) => b.id === id) || null;

function akteVon(db, a) {
  let akte = BP(db).akten.find((x) => x.anfrageId === a.id);
  if (!akte) {
    akte = { id: neueId("BA"), anfrageId: a.id, fallId: a.fallId, bankId: a.bankId, zustaendigId: null, anforderungen: [], qa: [], kreditentscheidung: null, cpBank: {}, auszahlungen: [], berichte: [], verlauf: [], erstelltAm: jetzt() };
    BP(db).akten.push(akte);
  }
  return akte;
}
const akteLesen = (db, a) => BP(db).akten.find((x) => x.anfrageId === a.id) || { anforderungen: [], qa: [], kreditentscheidung: null, cpBank: {}, auszahlungen: [], berichte: [], verlauf: [], zustaendigId: null };

/** Rolle der Bank-Seite in dieser Bank (null = kein Mitglied) */
export function bankRolle(db, n, bankId) {
  if (!n?.rollen?.includes("bank")) return null;
  return bankRolleAus(BP(db)?.mitglieder || [], bankVon(db, bankId), n.id);
}

/** Zugriff auf eine Anfrage: { a, f, sicht: "bank"|"bo", rolle } */
function zugriff(db, n, anfrageId) {
  const a = (FZ(db).anfragen || []).find((x) => x.id === v.kennung(anfrageId));
  if (!a) throw nichtGefunden("Anfrage nicht gefunden.");
  const f = (FZ(db).faelle || []).find((x) => x.id === a.fallId);
  if (!f) throw nichtGefunden("Finanzierungsfall nicht gefunden.");
  if (boLesen(n)) return { a, f, sicht: "bo", rolle: boSchreiben(n) ? "bo_schreiben" : "bo_lesen" };
  const rolle = bankRolle(db, n, a.bankId);
  if (!rolle) throw verboten("Diese Anfrage richtet sich an eine andere Bank.");
  if (a.status === "zurueckgezogen") throw verboten("Die Anfrage wurde zurückgezogen.");
  return { a, f, sicht: "bank", rolle };
}
function rolleNoetig(z, aktion) {
  if (z.sicht === "bo") {
    if (z.rolle !== "bo_schreiben") throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzierung & Banken“ kein Schreiben.");
    return;
  }
  const noetig = BANK_AKTION_ROLLE[aktion] || "leitung";
  if (!bankRolleReicht(z.rolle, noetig)) throw verboten(`Dafür ist in Ihrem Haus die Rolle „${BANK_TEAMROLLEN[noetig].label}“ nötig.`);
}
function verlaufAkte(db, akte, n, text) {
  akte.verlauf ||= [];
  akte.verlauf.push({ am: jetzt(), von: n ? nameVon(db, n.id) || "System" : "System", text: v.text(text, 300) });
  akte.geaendertAm = jetzt();
}
function anBackoffice(db, f, titel, text, mail = true) {
  for (const u of aktiveAdmins(db).filter((x) => darfLesen(x, "finanzierung"))) {
    benachrichtigen(db, u, { art: "finanzierung", titel, text, link: `/portal/admin/finanzierung/${f.id}?tab=banken`, objektArt: "finanzierung", objektId: f.id }, { mail, mailBetreff: `ÖkoInvest: ${titel}`, mailText: "Es gibt Neuigkeiten zu einer Finanzierung. Details sehen Sie nach der Anmeldung im Portal." });
  }
}
function anBank(db, a, akte, titel, text, mail = true) {
  const b = bankVon(db, a.bankId);
  const ids = akte?.zustaendigId && (b?.nutzerIds || []).includes(akte.zustaendigId) ? [akte.zustaendigId] : b?.nutzerIds || [];
  for (const id of ids) {
    const u = nutzerById(db, id);
    if (u) benachrichtigen(db, u, { art: "finanzierung", titel, text, link: `/portal/bank/${a.id}`, objektArt: "finanzierung", objektId: a.id }, { mail, mailBetreff: `ÖkoInvest: ${titel}`, mailText: "Es gibt Neuigkeiten zu einer Finanzierungsanfrage. Details sehen Sie nach der Anmeldung im Portal." });
  }
}

// ================================================================ Ausgabe

const dateiAusgabe = (a, d, sicht) => (d ? { id: d.id, name: d.name, mime: d.mime, groesse: d.groesse, am: d.am, link: sicht === "bo" ? `/api/admin/finanzierung/bankakte/${a.id}/dateien/${d.id}` : `/api/portal/bank/${a.id}/akte/dateien/${d.id}` } : null);

function akteAusgabe(db, z) {
  const { a, f, sicht } = z;
  const akte = akteLesen(db, a);
  const dat = (id) => dateiAusgabe(a, BP(db).dateien.find((d) => d.id === id && d.anfrageId === a.id), sicht);
  const b = bankVon(db, a.bankId);
  const ausgewaehlt = a.status === "ausgewaehlt";
  const kv = ausgewaehlt ? f.kreditvertrag || null : null;
  const ts = (FZ(db).termsheets || []).filter((t) => t.anfrageId === a.id).sort((x, y) => String(y.am).localeCompare(String(x.am)))[0] || null;
  const cps = ausgewaehlt ? (f.cps || []).map((c) => {
    const bk = akte.cpBank?.[c.id];
    const gueltig = bk && bk.cpAm === c.am; // Bestätigung gilt nur für den erledigten Stand, den die Bank gesehen hat
    return { id: c.id, label: c.label, erledigt: !!c.erledigt, am: c.am, nachweis: c.nachweis || "", bank: gueltig ? bk : null };
  }) : [];
  const cpBankGueltig = Object.fromEntries(cps.filter((c) => c.bank).map((c) => [c.id, { status: c.bank.status }]));
  const team = (b?.nutzerIds || []).map((id) => ({ id, name: nameVon(db, id), rolle: bankRolleAus(BP(db).mitglieder, b, id) })).filter((x) => x.rolle);
  return {
    anfrageId: a.id, fallId: f.id, bank: b?.name || "", bankId: a.bankId, anfrageStatus: a.status, anfrageStatusLabel: ANFRAGE_STATUS[a.status]?.label || a.status, titel: f.titel,
    sicht, rolle: z.rolle, rolleLabel: BANK_TEAMROLLEN[z.rolle]?.label || (sicht === "bo" ? "Backoffice" : ""),
    zustaendig: akte.zustaendigId ? { id: akte.zustaendigId, name: nameVon(db, akte.zustaendigId) } : null, team,
    anforderungen: (akte.anforderungen || []).map((x) => ({ ...x, statusLabel: ANFORDERUNG_STATUS[x.status]?.label, statusTon: ANFORDERUNG_STATUS[x.status]?.ton, bausteinLabel: BANKENPAKET.find((p) => p.id === x.baustein)?.label || "", ueberfaellig: ["offen", "nachforderung"].includes(x.status) && x.frist < heute(), lieferung: x.lieferung ? { ...x.lieferung, dateien: (x.lieferung.dateiIds || []).map(dat).filter(Boolean) } : null })),
    qa: (akte.qa || []).map((x) => ({ ...x, kategorieLabel: QA_KATEGORIEN[x.kategorie], von: sicht === "bank" ? nameVon(db, x.vonId) : `${b?.name || "Bank"} – ${nameVon(db, x.vonId)}`, antwort: x.antwort ? { ...x.antwort, dateien: (x.antwort.dateiIds || []).map(dat).filter(Boolean) } : null })).reverse(),
    kreditentscheidung: akte.kreditentscheidung ? { ...akte.kreditentscheidung, label: KREDIT_ERGEBNIS[akte.kreditentscheidung.ergebnis]?.label, ton: KREDIT_ERGEBNIS[akte.kreditentscheidung.ergebnis]?.ton } : null,
    termsheetBetrag: ts?.termsheet?.betrag || null,
    kreditvertrag: kv, cps, cpOffen: kv ? cpOffen(f.cps || [], cpBankGueltig).length : null,
    auszahlungen: (akte.auszahlungen || []).map((x) => ({ ...x, statusLabel: AUSZAHLUNG_STATUS[x.status]?.label, statusTon: AUSZAHLUNG_STATUS[x.status]?.ton })).reverse(),
    ausgezahlt: (akte.auszahlungen || []).filter((x) => x.status === "ausgezahlt").reduce((s, x) => s + x.betrag, 0),
    covenant: kv && f.covenant ? { ampel: f.covenant.ampel, letzte: f.covenant.letzte, llcr: f.covenant.llcr, restschuld: f.covenant.restschuld, geprueftAm: f.covenant.geprueftAm, pruefungen: (f.covenant.pruefungen || []).slice(-8) } : null,
    reporting: kv ? f.reporting || null : null,
    berichte: (akte.berichte || []).map((x) => ({ ...x, artLabel: BERICHT_ARTEN[x.art], statusLabel: BERICHT_STATUS[x.status]?.label, statusTon: BERICHT_STATUS[x.status]?.ton, ueberfaellig: x.status === "angefordert" && x.faelligAm && x.faelligAm < heute(), datei: x.dateiId ? dat(x.dateiId) : null, pdf: x.snapshot ? (sicht === "bo" ? `/api/admin/finanzierung/bankakte/${a.id}/berichte/${x.id}` : `/api/portal/bank/${a.id}/akte/berichte/${x.id}`) : null, snapshot: undefined })).reverse(),
    bausteine: BANKENPAKET.filter((p) => p.quelle !== "auto").map((p) => ({ id: p.id, label: p.label, freigegeben: (f.paketFreigabe || []).includes(p.id) })),
    stand: akteStand(akte, heute()),
    verlauf: (akte.verlauf || []).slice(-40).reverse(),
  };
}

// ================================================================ Lesen

/** Bank-Akte einer Anfrage – Bank (eigene Anfrage) oder Backoffice */
export async function baAkte(n, anfrageId) {
  angemeldet(n);
  const db = await lesenBereit();
  return akteAusgabe(db, zugriff(db, n, anfrageId));
}

/** Stand je Anfrage für die Liste der Bank bzw. die Fall-Übersicht im Backoffice */
export async function baStaende(n, { fallId = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const out = {};
  for (const a of FZ(db).anfragen || []) {
    if (fallId && a.fallId !== fallId) continue;
    try {
      const z = zugriff(db, n, a.id);
      const akte = akteLesen(db, a);
      out[a.id] = { ...akteStand(akte, heute()), zustaendig: akte.zustaendigId ? nameVon(db, akte.zustaendigId) : "", kredit: akte.kreditentscheidung?.ergebnis || null, rolle: z.rolle };
    } catch {
      /* kein Zugriff auf diese Anfrage */
    }
  }
  return out;
}

// ================================================================ Aktionen

/** Aktionen der Bank bzw. von ÖkoInvest an der Akte (Rechte je Aktion) */
export async function baAktion(n, anfrageId, daten = {}) {
  angemeldet(n);
  const aktion = v.text(daten.aktion, 40);
  const r = await aendernBereit((db) => {
    const z = zugriff(db, n, anfrageId);
    const { a, f, sicht } = z;
    const akte = akteVon(db, a);
    const b = bankVon(db, a.bankId);
    const h = heute();
    const nurBank = () => {
      if (sicht !== "bank") throw verboten("Diesen Schritt erledigt die Bank.");
    };
    const nurBo = () => {
      if (sicht !== "bo") throw verboten("Diesen Schritt erledigt ÖkoInvest.");
    };
    rolleNoetig(z, aktion);

    if (aktion === "anforderung") {
      nurBank();
      if (["abgesagt", "nicht_ausgewaehlt"].includes(a.status)) throw konflikt("Die Anfrage ist abgeschlossen.");
      const liste = fach(() => anforderungenBereinigen(daten, { heute: h, bausteine: BANKENPAKET_IDS }));
      for (const p of liste) akte.anforderungen.push({ id: neueId("BU"), ...p, status: "offen", vonId: n.id, am: jetzt() });
      verlaufAkte(db, akte, n, `${liste.length} Unterlage(n) angefordert`);
      anBackoffice(db, f, `Unterlagen angefordert: ${b.name}`, `${liste.length} Punkt(e) – ${f.titel}`);
    } else if (aktion === "anforderung_liefern") {
      nurBo();
      const x = akte.anforderungen.find((y) => y.id === v.kennung(daten.anforderungId));
      if (!x) throw nichtGefunden("Anforderung nicht gefunden.");
      if (!["offen", "nachforderung"].includes(x.status)) throw konflikt("Diese Anforderung ist bereits beantwortet.");
      const text = v.mehrzeilig(daten.text, 2000);
      const dateiIds = (Array.isArray(daten.dateiIds) ? daten.dateiIds : []).map(v.kennung).filter((id) => BP(db).dateien.some((d) => d.id === id && d.anfrageId === a.id));
      const freigeben = x.baustein && v.wahr(daten.bausteinFreigeben);
      v.pflicht(text.length >= 3 || dateiIds.length || freigeben, "Bitte eine Antwort, eine Datei oder die Freigabe des Bausteins angeben.");
      if (freigeben && !(f.paketFreigabe || []).includes(x.baustein)) {
        f.paketFreigabe = [...(f.paketFreigabe || []), x.baustein];
        f.verlauf ||= [];
        f.verlauf.push({ am: jetzt(), von: nameVon(db, n.id), text: `Baustein „${BANKENPAKET.find((p) => p.id === x.baustein)?.label}“ auf Anforderung von ${b.name} freigegeben` });
      }
      x.status = "geliefert";
      x.lieferung = { text, dateiIds, bausteinFreigegeben: !!freigeben, am: jetzt(), von: nameVon(db, n.id) };
      verlaufAkte(db, akte, n, `Unterlage geliefert: ${x.titel}`);
      anBank(db, a, akte, `Unterlage geliefert: ${x.titel}`, f.titel);
    } else if (aktion === "anforderung_pruefen") {
      nurBank();
      const x = akte.anforderungen.find((y) => y.id === v.kennung(daten.anforderungId));
      if (!x) throw nichtGefunden("Anforderung nicht gefunden.");
      if (x.status !== "geliefert") throw konflikt("Nur gelieferte Unterlagen lassen sich prüfen.");
      const erg = v.auswahl(daten.ergebnis, ["akzeptiert", "nachforderung"], "");
      if (!erg) throw ungueltig("Bitte „akzeptieren“ oder „nachfordern“ wählen.");
      const kommentar = v.text(daten.kommentar, 500);
      if (erg === "nachforderung") {
        v.pflicht(kommentar.length >= 5, "Bitte beschreiben, was noch fehlt.");
        const frist = /^\d{4}-\d{2}-\d{2}$/.test(String(daten.frist || "")) ? daten.frist : "";
        if (frist) {
          if (frist <= h) throw ungueltig("Die neue Frist muss in der Zukunft liegen.");
          x.frist = frist;
        }
      }
      x.status = erg;
      x.pruefung = { am: jetzt(), von: nameVon(db, n.id), kommentar };
      verlaufAkte(db, akte, n, `${x.titel}: ${ANFORDERUNG_STATUS[erg].label}`);
      anBackoffice(db, f, `${b.name}: ${ANFORDERUNG_STATUS[erg].label} – ${x.titel}`, kommentar || f.titel, erg === "nachforderung");
    } else if (aktion === "frage") {
      nurBank();
      const q = fach(() => frageBereinigen(daten));
      akte.qa.push({ id: neueId("BQ"), ...q, status: "offen", vonId: n.id, am: jetzt(), antwort: null });
      a.verlauf ||= [];
      a.verlauf.push({ am: jetzt(), text: `Frage der Bank (${QA_KATEGORIEN[q.kategorie]}): ${q.frage.slice(0, 200)}`, fuerBank: true });
      verlaufAkte(db, akte, n, `Frage gestellt (${QA_KATEGORIEN[q.kategorie]})`);
      anBackoffice(db, f, `Frage einer Bank: ${b.name}`, q.frage.slice(0, 160), false);
    } else if (aktion === "antwort") {
      nurBo();
      const x = akte.qa.find((y) => y.id === v.kennung(daten.frageId));
      if (!x) throw nichtGefunden("Frage nicht gefunden.");
      const text = v.mehrzeilig(daten.text, 4000);
      v.pflicht(text.length >= 3, "Bitte die Antwort eingeben.");
      const dateiIds = (Array.isArray(daten.dateiIds) ? daten.dateiIds : []).map(v.kennung).filter((id) => BP(db).dateien.some((d) => d.id === id && d.anfrageId === a.id));
      x.antwort = { text, dateiIds, am: jetzt(), von: nameVon(db, n.id) };
      x.status = "beantwortet";
      verlaufAkte(db, akte, n, "Frage beantwortet");
      anBank(db, a, akte, "Antwort auf Ihre Frage", f.titel);
    } else if (aktion === "zustaendig") {
      nurBank();
      const id = v.kennung(daten.nutzerId);
      if (!(b.nutzerIds || []).includes(id) || !bankRolleAus(BP(db).mitglieder, b, id)) throw ungueltig("Zuständig kann nur ein aktives Mitglied Ihres Hauses sein.");
      akte.zustaendigId = id;
      verlaufAkte(db, akte, n, `Zuständig: ${nameVon(db, id)}`);
      const u = nutzerById(db, id);
      if (u && u.id !== n.id) benachrichtigen(db, u, { art: "finanzierung", titel: "Ihnen wurde eine Finanzierungsanfrage zugewiesen", text: f.titel, link: `/portal/bank/${a.id}`, objektArt: "finanzierung", objektId: a.id });
    } else if (aktion === "kreditentscheidung") {
      nurBank();
      if (f.kreditvertrag) throw konflikt("Der Kreditvertrag ist bereits erfasst.");
      const ts = (FZ(db).termsheets || []).filter((t) => t.anfrageId === a.id).sort((x, y) => String(y.am).localeCompare(String(x.am)))[0];
      const k = fach(() => kreditentscheidungBereinigen(daten.entscheidung || {}, { anfrageStatus: a.status, termsheetBetrag: ts?.termsheet?.betrag || null, heute: h }));
      akte.kreditentscheidung = { ...k, am: jetzt(), vonId: n.id, von: nameVon(db, n.id) };
      a.verlauf.push({ am: jetzt(), text: `Kreditentscheidung: ${KREDIT_ERGEBNIS[k.ergebnis].label}`, fuerBank: true });
      f.verlauf ||= [];
      f.verlauf.push({ am: jetzt(), von: `${b.name}`, text: `Kreditentscheidung: ${KREDIT_ERGEBNIS[k.ergebnis].label}${k.betrag ? ` (${Math.round(k.betrag / 1000).toLocaleString("de-DE")} T€)` : ""}` });
      verlaufAkte(db, akte, n, `Kreditentscheidung: ${KREDIT_ERGEBNIS[k.ergebnis].label}`);
      anBackoffice(db, f, `Kreditentscheidung ${b.name}: ${KREDIT_ERGEBNIS[k.ergebnis].label}`, k.ergebnis === "abgelehnt" ? k.begruendung.slice(0, 160) : `${Math.round(k.betrag / 1000).toLocaleString("de-DE")} T€, gültig bis ${k.gueltigBis.split("-").reverse().join(".")}`);
    } else if (aktion === "cp_bestaetigen") {
      nurBank();
      if (a.status !== "ausgewaehlt" || !f.kreditvertrag) throw konflikt("CPs bestätigt die ausgewählte Bank nach Erfassung des Kreditvertrags.");
      const cp = (f.cps || []).find((c) => c.id === v.text(daten.cpId, 40));
      if (!cp) throw nichtGefunden("Auszahlungsvoraussetzung nicht gefunden.");
      if (!cp.erledigt) throw konflikt("Diese Voraussetzung ist von ÖkoInvest noch nicht als erfüllt gemeldet.");
      const status = v.auswahl(daten.status, ["bestaetigt", "beanstandet"], "");
      if (!status) throw ungueltig("Bitte „bestätigen“ oder „beanstanden“ wählen.");
      const kommentar = v.text(daten.kommentar, 500);
      if (status === "beanstandet") v.pflicht(kommentar.length >= 5, "Bitte die Beanstandung begründen.");
      akte.cpBank ||= {};
      akte.cpBank[cp.id] = { status, kommentar, am: jetzt(), von: nameVon(db, n.id), cpAm: cp.am };
      verlaufAkte(db, akte, n, `CP „${cp.label}“ ${status === "bestaetigt" ? "bestätigt" : "beanstandet"}`);
      if (status === "beanstandet") anBackoffice(db, f, `CP beanstandet: ${cp.label}`, `${b.name}: ${kommentar}`);
    } else if (aktion === "auszahlung_beantragen") {
      nurBo();
      if (a.status !== "ausgewaehlt") throw konflikt("Auszahlungen beantragt ÖkoInvest bei der ausgewählten Bank.");
      const cpBank = Object.fromEntries(Object.entries(akte.cpBank || {}).filter(([id, x]) => (f.cps || []).find((c) => c.id === id)?.am === x.cpAm));
      const x = fach(() => auszahlungBereinigen(daten, { kreditvertrag: f.kreditvertrag, cps: f.cps || [], cpBank, auszahlungen: akte.auszahlungen, heute: h }));
      if (akte.kreditentscheidung && akte.kreditentscheidung.ergebnis === "abgelehnt") throw konflikt("Die Bank hat den Kredit abgelehnt.");
      akte.auszahlungen.push({ id: neueId("BZ"), ...x, status: "beantragt", am: jetzt(), von: nameVon(db, n.id) });
      verlaufAkte(db, akte, n, `Auszahlung beantragt: ${x.betrag.toLocaleString("de-DE")} € zum ${x.wunschDatum}`);
      anBank(db, a, akte, "Auszahlungsantrag", `${x.betrag.toLocaleString("de-DE")} € zum ${x.wunschDatum.split("-").reverse().join(".")} – ${f.titel}`);
    } else if (aktion === "auszahlung_entscheiden") {
      nurBank();
      const x = akte.auszahlungen.find((y) => y.id === v.kennung(daten.auszahlungId));
      if (!x) throw nichtGefunden("Auszahlungsantrag nicht gefunden.");
      const erg = v.auswahl(daten.ergebnis, ["freigegeben", "ausgezahlt", "abgelehnt"], "");
      if (!erg) throw ungueltig("Bitte eine Entscheidung wählen.");
      if (erg === "ausgezahlt" && x.status !== "freigegeben") throw konflikt("Ausgezahlt werden nur freigegebene Anträge.");
      if (erg !== "ausgezahlt" && x.status !== "beantragt") throw konflikt("Der Antrag ist bereits entschieden.");
      const kommentar = v.text(daten.kommentar, 500);
      if (erg === "abgelehnt") v.pflicht(kommentar.length >= 5, "Bitte die Ablehnung begründen.");
      if (erg === "ausgezahlt") {
        const valuta = /^\d{4}-\d{2}-\d{2}$/.test(String(daten.valuta || "")) ? daten.valuta : "";
        if (!valuta || valuta > h) throw ungueltig("Bitte das Valutadatum angeben (nicht in der Zukunft).");
        x.valuta = valuta;
        if (f.kreditvertrag && !f.kreditvertrag.auszahlungAm) f.kreditvertrag.auszahlungAm = valuta; // erste Ziehung = Auszahlungsbeginn
        if (f.status === "vertrag") {
          f.status = "auszahlung";
          f.verlauf ||= [];
          f.verlauf.push({ am: jetzt(), von: b.name, text: `Erste Auszahlung ${x.betrag.toLocaleString("de-DE")} € (Valuta ${valuta})` });
        }
      }
      x.status = erg;
      x.entscheid = { am: jetzt(), von: nameVon(db, n.id), kommentar };
      verlaufAkte(db, akte, n, `Auszahlung ${x.betrag.toLocaleString("de-DE")} €: ${AUSZAHLUNG_STATUS[erg].label}`);
      anBackoffice(db, f, `Auszahlung ${AUSZAHLUNG_STATUS[erg].label.toLowerCase()}: ${b.name}`, `${x.betrag.toLocaleString("de-DE")} € – ${f.titel}`, erg !== "freigegeben");
    } else if (aktion === "bericht_anfordern") {
      nurBank();
      if (a.status !== "ausgewaehlt") throw konflikt("Berichte fordert die finanzierende Bank an.");
      const x = fach(() => berichtBereinigen({ ...daten, faelligAm: daten.faelligAm ?? "" }, { heute: h }));
      akte.berichte.push({ id: neueId("BR"), ...x, status: "angefordert", vonId: n.id, am: jetzt() });
      verlaufAkte(db, akte, n, `Bericht angefordert: ${BERICHT_ARTEN[x.art]} ${x.periode}`);
      anBackoffice(db, f, `Bericht angefordert: ${BERICHT_ARTEN[x.art]}`, `${b.name} – ${x.periode}, fällig ${x.faelligAm.split("-").reverse().join(".")}`);
    } else if (aktion === "bericht_einreichen") {
      nurBo();
      if (a.status !== "ausgewaehlt") throw konflikt("Berichte gehen an die finanzierende Bank.");
      let x = daten.berichtId ? akte.berichte.find((y) => y.id === v.kennung(daten.berichtId)) : null;
      if (daten.berichtId && !x) throw nichtGefunden("Bericht nicht gefunden.");
      if (x && !["angefordert", "beanstandet"].includes(x.status)) throw konflikt("Dieser Bericht ist bereits eingereicht.");
      if (!x) {
        const neu = fach(() => berichtBereinigen({ art: daten.art, periode: daten.periode, bemerkung: daten.bemerkung }, { heute: h }));
        x = { id: neueId("BR"), ...neu, faelligAm: "", vonId: n.id, am: jetzt() };
        akte.berichte.push(x);
      }
      const dateiId = v.kennung(daten.dateiId);
      if (dateiId && !BP(db).dateien.some((d) => d.id === dateiId && d.anfrageId === a.id)) throw ungueltig("Datei nicht gefunden.");
      if (x.art === "covenant") {
        if (!f.kreditvertrag) throw konflikt("Covenant-Reports gibt es erst mit Kreditvertrag.");
        if (!f.covenant) throw konflikt("Noch keine Covenant-Prüfung – bitte im Reiter „Covenants & Reporting“ prüfen lassen.");
        const c = f.covenant;
        x.snapshot = { fall: { titel: f.titel }, kreditvertrag: f.kreditvertrag, covenant: { ampel: c.ampel, letzte: c.letzte, llcr: c.llcr, restschuld: c.restschuld, pruefungen: (c.pruefungen || []).slice(-8), monate: (c.monate || []).slice(-12) } };
        x.kennzahlen = { dscr: c.letzte?.dscr ?? null, llcr: c.llcr ?? null, ampel: c.ampel?.id || "grau" };
        if (f.reporting) f.reporting = { ...f.reporting, zuletzt: jetzt(), gemahnt: false };
      } else v.pflicht(dateiId, "Bitte den Bericht als Datei hochladen.");
      x.dateiId = dateiId || x.dateiId || null;
      x.status = "eingereicht";
      x.eingereichtAm = jetzt();
      x.bemerkung = v.text(daten.bemerkung, 1000) || x.bemerkung || "";
      verlaufAkte(db, akte, n, `Bericht eingereicht: ${BERICHT_ARTEN[x.art]} ${x.periode}`);
      anBank(db, a, akte, `Bericht eingereicht: ${BERICHT_ARTEN[x.art]}`, `${x.periode} – ${f.titel}`);
    } else if (aktion === "bericht_pruefen") {
      nurBank();
      const x = akte.berichte.find((y) => y.id === v.kennung(daten.berichtId));
      if (!x) throw nichtGefunden("Bericht nicht gefunden.");
      if (x.status !== "eingereicht") throw konflikt("Nur eingereichte Berichte lassen sich prüfen.");
      const erg = v.auswahl(daten.ergebnis, ["geprueft", "beanstandet"], "");
      if (!erg) throw ungueltig("Bitte „geprüft“ oder „beanstanden“ wählen.");
      const kommentar = v.text(daten.kommentar, 500);
      if (erg === "beanstandet") v.pflicht(kommentar.length >= 5, "Bitte die Beanstandung begründen.");
      x.status = erg;
      x.pruefung = { am: jetzt(), von: nameVon(db, n.id), kommentar };
      verlaufAkte(db, akte, n, `Bericht ${x.periode}: ${BERICHT_STATUS[erg].label}`);
      anBackoffice(db, f, `Bericht ${BERICHT_STATUS[erg].label.toLowerCase()}: ${BERICHT_ARTEN[x.art]}`, `${b.name} – ${x.periode}${kommentar ? `: ${kommentar}` : ""}`, erg === "beanstandet");
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, `bankakte_${aktion}`, "finanzierung", a.id, `Bank-Akte: ${aktion}`);
    return { ok: true };
  });
  return { ...r, akte: await baAkte(n, anfrageId) };
}

/** Datei zur Akte hochladen – Bank (Anlage zur Anforderung/Frage) oder ÖkoInvest (Lieferung, Antwort, Bericht) */
export async function baDateiSpeichern(n, anfrageId, { name, mime, daten } = {}) {
  angemeldet(n);
  if (!UPLOAD.typen[mime]) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  const db0 = await lesenBereit();
  const z0 = zugriff(db0, n, anfrageId);
  if (z0.sicht === "bo" && !boSchreiben(n)) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Finanzierung & Banken“ kein Schreiben.");
  if (z0.sicht === "bank" && !bankRolleReicht(z0.rolle, "sachbearbeiter")) throw verboten("Mit der Rolle „Nur lesen“ können Sie keine Dateien hochladen.");
  if (BP(db0).dateien.filter((d) => d.anfrageId === z0.a.id).length >= 200) throw konflikt("Für diese Anfrage sind bereits sehr viele Dateien hinterlegt.");
  const datei = `BD-${neueId("BD")}-${zufallsToken().slice(0, 12)}.${UPLOAD.typen[mime]}`;
  await uploadSchreiben(datei, daten);
  return aendern((db) => {
    const d = { id: neueId("BD"), anfrageId: z0.a.id, seite: z0.sicht, name: v.text(String(name || "").replace(/[\\/]/g, "_"), 160) || `datei.${UPLOAD.typen[mime]}`, mime, groesse: daten.length, datei, sha256: sha256(daten), vonId: n.id, am: jetzt() };
    BP(db).dateien.push(d);
    protokoll(db, n, "bankakte_datei", "finanzierung", z0.a.id, `Bank-Akte: Datei ${d.name}`);
    return { ok: true, datei: dateiAusgabe(z0.a, d, z0.sicht) };
  });
}

export async function baDateiLesen(n, anfrageId, dateiId, { ip = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const z = zugriff(db, n, anfrageId);
  const d = BP(db).dateien.find((x) => x.id === v.kennung(dateiId) && x.anfrageId === z.a.id);
  if (!d) throw nichtGefunden("Datei nicht gefunden.");
  await aendern((x) => protokoll(x, n, "download", "finanzierung", z.a.id, `Bank-Akte: ${d.name} abgerufen`, ip));
  return { name: d.name, mime: d.mime, daten: await uploadLesen(d.datei) };
}

/** Covenant-Report (Momentaufnahme bei Einreichung) als Daten für reportingPdf */
export async function baBerichtDaten(n, anfrageId, berichtId, { ip = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const z = zugriff(db, n, anfrageId);
  const x = akteLesen(db, z.a).berichte.find((y) => y.id === v.kennung(berichtId));
  if (!x?.snapshot) throw nichtGefunden("Bericht nicht gefunden.");
  await aendern((d) => protokoll(d, n, "download", "finanzierung", z.a.id, `Covenant-Report ${x.periode} abgerufen`, ip));
  return { ...x.snapshot, periode: x.periode, ersteller: nameVon(db, n.id) || n.email };
}

// ================================================================ Bank-Team (mehrere Sachbearbeiter)

function eigeneBank(db, n, bankId) {
  const banken = (FZ(db).banken || []).filter((b) => bankRolle(db, n, b.id));
  const b = bankId ? banken.find((x) => x.id === v.kennung(bankId)) : banken[0];
  if (!b) throw verboten("Nur für Mitglieder eines Finanzierungspartners.");
  return b;
}
const domain = (e) => String(e || "").split("@")[1] || "";

export async function baTeam(n, { bankId = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const b = eigeneBank(db, n, bankId);
  const rolle = bankRolle(db, n, b.id);
  return {
    bank: { id: b.id, name: b.name }, rolle, rolleLabel: BANK_TEAMROLLEN[rolle]?.label, darfVerwalten: rolle === "leitung", rollen: BANK_TEAMROLLEN,
    mitglieder: (b.nutzerIds || []).map((id) => {
      const u = nutzerById(db, id);
      return { id, name: nameVon(db, id), email: u?.email || "", rolle: bankRolleAus(BP(db).mitglieder, b, id), ich: id === n.id };
    }).filter((x) => x.rolle),
    einladungen: rolle === "leitung" ? BP(db).einladungen.filter((e) => e.bankId === b.id && e.status === "offen" && e.ablauf > jetzt()).map((e) => ({ id: e.id, email: e.email, rolle: e.rolle, ablauf: e.ablauf })) : [],
    domain: domain(n.email),
  };
}

/** Team verwalten (nur Leitung): einladen (gleiche E-Mail-Domain wie die einladende Person), Rolle ändern, entfernen, Einladung widerrufen */
export async function baTeamAktion(n, daten = {}) {
  angemeldet(n);
  const aktion = v.auswahl(daten.aktion, ["einladen", "rolle", "entfernen", "widerrufen"], "");
  if (!aktion) throw ungueltig("Unbekannte Aktion.");
  let demoLink = null;
  const r = await aendernBereit((db) => {
    const b = eigeneBank(db, n, daten.bankId);
    if (bankRolle(db, n, b.id) !== "leitung") throw verboten("Das Team verwaltet die Leitung Ihres Hauses.");
    const rolle = v.auswahl(daten.rolle, BANK_TEAMROLLEN, "");
    if (aktion === "einladen") {
      const email = v.email(daten.email);
      v.pflicht(email, "Bitte eine gültige E-Mail-Adresse angeben.");
      v.pflicht(rolle, "Bitte eine Rolle wählen.");
      if (domain(email) !== domain(n.email)) throw ungueltig(`Einladen lassen sich nur Adressen Ihres Hauses (@${domain(n.email)}). Andere Adressen richtet ÖkoInvest auf Anfrage ein.`);
      const u = db.nutzer.find((x) => x.email === email);
      if (u && (b.nutzerIds || []).includes(u.id)) throw konflikt("Diese Person gehört bereits zum Team.");
      if (u?.rollen?.includes("admin")) throw konflikt("Backoffice-Konten können nicht Mitglied einer Bank sein.");
      for (const e of BP(db).einladungen) if (e.bankId === b.id && e.email === email && e.status === "offen") e.status = "ersetzt";
      const token = zufallsToken();
      BP(db).einladungen.push({ id: neueId("BE"), bankId: b.id, email, rolle, hash: sha256(token), status: "offen", ablauf: new Date(Date.now() + EINLADUNG_TAGE * 86400e3).toISOString(), vonId: n.id, am: jetzt() });
      const link = `${String(daten.basisUrl || "").replace(/\/$/, "")}/einladung/bankteam/${token}`;
      postausgangAnlegen(db, { an: email, anName: email, nutzerId: u?.id || null, art: "finanzierung", betreff: `Einladung in das Bank-Portal von ÖkoInvest (${b.name})`, text: `${nameVon(db, n.id)} lädt Sie als „${BANK_TEAMROLLEN[rolle].label}“ in das Bank-Portal ein. Der Link ist persönlich, ${EINLADUNG_TAGE} Tage gültig und nur mit Anmeldung unter dieser E-Mail-Adresse nutzbar.`, link, linkText: "Einladung annehmen", hinweis: "Vertraulich – bitte nicht weiterleiten." });
      if (process.env.NODE_ENV !== "production") {
        db.demoLinks ||= [];
        db.demoLinks.unshift({ am: jetzt(), art: "einladung", email, link });
        demoLink = link;
      }
      protokoll(db, n, "bankteam_einladen", "finanzierung", b.id, `Bank-Team: ${email} eingeladen (${rolle})`);
    } else if (aktion === "widerrufen") {
      const e = BP(db).einladungen.find((x) => x.id === v.kennung(daten.einladungId) && x.bankId === b.id && x.status === "offen");
      if (!e) throw nichtGefunden("Einladung nicht gefunden.");
      e.status = "widerrufen";
    } else {
      const id = v.kennung(daten.nutzerId);
      if (!(b.nutzerIds || []).includes(id)) throw nichtGefunden("Mitglied nicht gefunden.");
      if (id === n.id) throw konflikt("Die eigene Rolle ändert eine andere Person der Leitung.");
      const leitungen = (b.nutzerIds || []).filter((x) => bankRolleAus(BP(db).mitglieder, b, x) === "leitung");
      let m = BP(db).mitglieder.find((x) => x.bankId === b.id && x.nutzerId === id);
      if (!m) {
        m = { id: neueId("BM"), bankId: b.id, nutzerId: id, rolle: "leitung", status: "aktiv", am: jetzt() };
        BP(db).mitglieder.push(m);
      }
      if (aktion === "rolle") {
        v.pflicht(rolle, "Bitte eine Rolle wählen.");
        if (m.rolle === "leitung" && rolle !== "leitung" && leitungen.length <= 1) throw konflikt("Mindestens eine Person muss die Leitung behalten.");
        m.rolle = rolle;
      } else {
        if (m.rolle === "leitung" && leitungen.length <= 1) throw konflikt("Mindestens eine Person muss die Leitung behalten.");
        m.status = "entfernt";
        b.nutzerIds = (b.nutzerIds || []).filter((x) => x !== id);
        for (const akte of BP(db).akten) if (akte.bankId === b.id && akte.zustaendigId === id) akte.zustaendigId = null;
      }
      protokoll(db, n, `bankteam_${aktion}`, "finanzierung", b.id, `Bank-Team: ${nameVon(db, id)} ${aktion === "rolle" ? `→ ${rolle}` : "entfernt"}`);
    }
    return { ok: true };
  });
  return { ...r, ...(demoLink ? { demoLink } : {}), team: await baTeam(n, { bankId: daten.bankId }) };
}

export async function baTeamEinladungInfo(token) {
  const db = await lesenBereit();
  const e = BP(db).einladungen.find((x) => x.hash === sha256(String(token || "")));
  if (!e || e.status !== "offen" || e.ablauf < jetzt()) return { gueltig: false };
  return { gueltig: true, email: e.email, bank: bankVon(db, e.bankId)?.name || "", rolle: BANK_TEAMROLLEN[e.rolle]?.label || e.rolle, ablauf: e.ablauf };
}

export async function baTeamEinladungAnnehmen(n, token) {
  angemeldet(n);
  return aendernBereit((db) => {
    const e = BP(db).einladungen.find((x) => x.hash === sha256(String(token || "")));
    if (!e || e.status !== "offen" || e.ablauf < jetzt()) throw ungueltig("Die Einladung ist ungültig, abgelaufen oder wurde widerrufen.");
    const u = nutzerById(db, n.id);
    if (u.email !== e.email) throw verboten("Diese Einladung gilt für eine andere E-Mail-Adresse. Bitte melden Sie sich mit der eingeladenen Adresse an.");
    if (u.rollen.includes("admin")) throw konflikt("Backoffice-Konten können nicht Mitglied einer Bank sein.");
    const b = bankVon(db, e.bankId);
    if (!b) throw nichtGefunden("Bank nicht gefunden.");
    if (!u.rollen.includes("bank")) u.rollen.push("bank");
    b.nutzerIds ||= [];
    if (!b.nutzerIds.includes(u.id)) b.nutzerIds.push(u.id);
    const m = BP(db).mitglieder.find((x) => x.bankId === b.id && x.nutzerId === u.id);
    if (m) Object.assign(m, { rolle: e.rolle, status: "aktiv", am: jetzt() });
    else BP(db).mitglieder.push({ id: neueId("BM"), bankId: b.id, nutzerId: u.id, rolle: e.rolle, status: "aktiv", am: jetzt() });
    e.status = "angenommen";
    e.angenommenAm = jetzt();
    const einlader = nutzerById(db, e.vonId);
    if (einlader) benachrichtigen(db, einlader, { art: "finanzierung", titel: "Einladung angenommen", text: `${nameVon(db, u.id)} ist jetzt Mitglied Ihres Teams (${BANK_TEAMROLLEN[e.rolle].label}).`, link: "/portal/bank/team", objektArt: "finanzierung", objektId: b.id }, { mail: false });
    protokoll(db, u, "bankteam_beitritt", "finanzierung", b.id, `Bank-Team beigetreten (${b.name}, ${e.rolle})`);
    return { ok: true, bank: b.name };
  });
}

// ================================================================ Demo-Daten (fiktiv)

function seed(db) {
  const F = db.finanzierung;
  if (!F?.banken?.length) return;
  const bankKonto = db.nutzer.find((u) => u.email === "bank@example.com");
  const admin = db.nutzer.find((u) => u.email === "admin@example.com");
  const b1 = F.banken.find((b) => bankKonto && (b.nutzerIds || []).includes(bankKonto.id));
  if (!b1 || !admin) return;
  // Zweites Bank-Konto (Sachbearbeitung) – mehrere Sachbearbeiter je Bank
  let kollege = db.nutzer.find((u) => u.email === "bank-sachbearbeitung@example.com");
  if (!kollege) {
    kollege = { ...bankKonto, id: neueId("U"), email: "bank-sachbearbeitung@example.com", vorname: "Bruno", nachname: "Sachbearbeitung (Demo)", sitzungVersion: 0, letzterLogin: null, erstelltAm: vorTagen(15), rollen: ["bank"] };
    db.nutzer.push(kollege);
  }
  if (!b1.nutzerIds.includes(kollege.id)) b1.nutzerIds.push(kollege.id);
  const BPx = db.bankportal;
  BPx.mitglieder.push({ id: neueId("BM"), bankId: b1.id, nutzerId: bankKonto.id, rolle: "leitung", status: "aktiv", am: vorTagen(20) });
  BPx.mitglieder.push({ id: neueId("BM"), bankId: b1.id, nutzerId: kollege.id, rolle: "sachbearbeiter", status: "aktiv", am: vorTagen(15) });
  const tag = (t) => new Date(Date.now() + t * 86400e3).toISOString().slice(0, 10);
  const leer = (a) => ({ id: neueId("BA"), anfrageId: a.id, fallId: a.fallId, bankId: a.bankId, zustaendigId: kollege.id, anforderungen: [], qa: [], kreditentscheidung: null, cpBank: {}, auszahlungen: [], berichte: [], verlauf: [], erstelltAm: vorTagen(18) });

  // 1) Anfrage im Wettbewerb (Term Sheet abgegeben): Unterlagen angefordert, Q&A
  const a1 = F.anfragen.find((a) => a.bankId === b1.id && ["termsheet", "in_pruefung", "offen"].includes(a.status));
  if (a1) {
    const k = leer(a1);
    k.anforderungen.push({ id: neueId("BU"), titel: "Zweites Ertragsgutachten (P90, 1 Jahr)", beschreibung: "Für Anlagen über 10 MWp verlangt unser Kreditgremium zwei unabhängige Gutachten.", baustein: "ertragsgutachten", frist: tag(9), status: "offen", vonId: kollege.id, am: vorTagen(5) });
    k.anforderungen.push({ id: neueId("BU"), titel: "Entwurf EPC-Vertrag mit Zahlungsplan", beschreibung: "", baustein: "epc", frist: tag(-2), status: "offen", vonId: kollege.id, am: vorTagen(12) });
    k.anforderungen.push({ id: neueId("BU"), titel: "Netzanschlusszusage", beschreibung: "", baustein: "netz", frist: tag(-6), status: "akzeptiert", vonId: kollege.id, am: vorTagen(14), lieferung: { text: "Im Bankenpaket freigegeben.", dateiIds: [], bausteinFreigegeben: true, am: vorTagen(10), von: "Demo-Backoffice" }, pruefung: { am: vorTagen(9), von: nameVon(db, kollege.id), kommentar: "" } });
    k.qa.push({ id: neueId("BQ"), frage: "Welche Degradation ist im Financial Model angesetzt?", kategorie: "technik", status: "beantwortet", vonId: kollege.id, am: vorTagen(8), antwort: { text: "0,4 % p. a. linear ab Jahr 2 (Herstellergarantie 0,4 %, Demo).", dateiIds: [], am: vorTagen(7), von: "Demo-Backoffice" } });
    k.qa.push({ id: neueId("BQ"), frage: "Ist der Pachtvertrag mit Eintrittsrecht der finanzierenden Bank ausgestattet?", kategorie: "recht", status: "offen", vonId: bankKonto.id, am: vorTagen(2), antwort: null });
    k.verlauf.push({ am: vorTagen(12), von: nameVon(db, kollege.id), text: "Unterlagen angefordert" });
    BPx.akten.push(k);
  }

  // 2) Bestandsfinanzierung der Bank (Anlage mit Kreditvertrag): Anfrage „ausgewählt“, Kreditentscheidung, CPs bestätigt, Ziehung, Berichte
  const f2 = F.faelle.find((f) => f.demo && f.bezugArt === "anlage" && f.kreditvertrag && f.entscheidung?.bankId === b1.id); // Demo-Bestand mit Messdaten (nicht Testfälle)
  if (f2) {
    let a2 = F.anfragen.find((a) => a.fallId === f2.id && a.bankId === b1.id);
    if (!a2) {
      a2 = { id: neueId("FA"), fallId: f2.id, bankId: b1.id, status: "ausgewaehlt", frist: f2.kreditvertrag.unterzeichnetAm, nachricht: "Bestandsfinanzierung (Demo) – in die Plattform übernommen.", gesendetAm: vorTagen(30), verlauf: [{ am: vorTagen(30), text: "Bestandsfinanzierung übernommen (Demo)", fuerBank: true }] };
      F.anfragen.push(a2);
      f2.entscheidung.anfrageId = a2.id;
    }
    const k = leer(a2);
    k.zustaendigId = bankKonto.id;
    k.kreditentscheidung = { ergebnis: "genehmigt", gremium: "Kreditausschuss (Demo)", beschlussAm: f2.kreditvertrag.unterzeichnetAm, betrag: f2.kreditvertrag.betrag, gueltigBis: f2.kreditvertrag.unterzeichnetAm, auflagen: [], begruendung: "", am: vorTagen(30), vonId: bankKonto.id, von: nameVon(db, bankKonto.id) };
    for (const c of f2.cps || []) k.cpBank[c.id] = { status: "bestaetigt", kommentar: "", am: vorTagen(30), von: nameVon(db, bankKonto.id), cpAm: c.am };
    k.auszahlungen.push({ id: neueId("BZ"), betrag: f2.kreditvertrag.betrag, wunschDatum: f2.kreditvertrag.auszahlungAm, zweck: "Vollauszahlung Bestandsfinanzierung (Demo)", status: "ausgezahlt", valuta: f2.kreditvertrag.auszahlungAm, am: vorTagen(30), von: "Demo-Backoffice", entscheid: { am: vorTagen(30), von: nameVon(db, bankKonto.id), kommentar: "" } });
    const jahr = new Date().getFullYear();
    k.berichte.push({ id: neueId("BR"), art: "jahresabschluss", periode: `GJ ${jahr - 1}`, faelligAm: tag(-10), bemerkung: "Geprüfter Jahresabschluss der Projektgesellschaft", status: "angefordert", vonId: bankKonto.id, am: vorTagen(60) });
    k.berichte.push({ id: neueId("BR"), art: "versicherung", periode: String(jahr), faelligAm: tag(25), bemerkung: "", status: "angefordert", vonId: kollege.id, am: vorTagen(20) });
    k.verlauf.push({ am: vorTagen(30), von: "System", text: "Bestandsfinanzierung übernommen (Demo)" });
    BPx.akten.push(k);
  }
}
