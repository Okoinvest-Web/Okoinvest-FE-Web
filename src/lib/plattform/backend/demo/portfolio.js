// src/lib/plattform/backend/demo/portfolio.js
//
// Investor-Portfolio nach dem Kauf im Demo-Backend – Referenz für plattform/api/portfolio.py (Vertrag: docs/API.md,
// Abschnitt „Portfolio“). Regeln: portfolio/kern.js (1:1 in portfolio_kern.py).
//
//   Positionen   aus vollzogenen Closings automatisch übernommen (Käufer = Investor), Status folgt der Übergabe-Checkliste;
//                Co-Development-Beteiligungen legt das Backoffice an (Verknüpfung mit dem Entwicklungsprojekt).
//   Investor     sieht nur eigene bzw. Positionen seiner Organisation (Teamrolle; „Nur lesen“ ohne Aktionen): Ertrag Soll/Ist,
//                DSCR/Covenants, Ausschüttungen, Kapitalabrufe (Zahlung melden), Dokumente, Berichte (PDF), Steuerhinweise,
//                Wiederverkauf anfragen (→ Entwurf in der Projektbörse, Anbieter = Investor, Provision annehmen).
//   Backoffice   Bereich „portfolio“ (rechte.js): lesen ≥ 1, schreiben = 2 – Stammdaten, Monatserträge, Abrufe, Ausschüttungen,
//                Statuswechsel (Automat), Dokumente, Börsen-Entwurf, Fristenlauf (Erinnerungen, Verzug, Covenant-Ampel).
//   KYC          Ausschüttungen und Kapitalabrufe nur an verifizierte Investoren (409, Code „kyc“).
//
// Daten unter db.portfolio (eigene Sammlung, beim ersten Zugriff mit fiktiven Demo-Daten ergänzt). ALLES FIKTIV.

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { UPLOAD, PROJEKT_TYPEN, LAENDER } from "../../konstanten";
import {
  ABRUF_OFFEN, ABRUF_STATUS, AUSSCHUETTUNG_ARTEN, PF_AKTIV, PF_ARTEN, PF_STATUS, PF_UEBERGAENGE, PortfolioFehler, WV_STRUKTUREN,
  abrufAktion, abrufPruefen, abrufVerzug, ausschuettungPruefen, boerseEntwurf, cashflowKennzahlen, covenantAuswertung, ertragAuswertung, ertraegeAbgleichen, istAusZaehler,
  istMonat, monatPlus, periodeStandard, sollMonat, periodenAuswahl, plusTage, positionAusClosing, quellensteuerHinweis, statusNachUebergabe,
  steuerHinweise, uebergangPruefen, wiederverkaufPruefen,
} from "../../portfolio/kern";
import { berichtRechnen } from "../../portfolio/bericht";
import { UEBERGABE_PUNKTE } from "../../closing/closing";
import { intern, projektAnlegen, provisionAkzeptieren } from "../demo";
import { aendern, lesen, uploadLesen, uploadSchreiben } from "./speicher";
import { jetzt, neueId, sha256, vorTagen, zufallsToken } from "./hilfen";
import { kycStatusDb } from "./kycRegeln";
import { teamRolle } from "./teams";
import { darfTeamSchreiben } from "../../organisation";
import { zaehlerMonatswerte } from "./anlagen"; // Anlagen-Monitoring: Zählerstand-Monatswerte (Demo: fehlende aus der Simulation abgeleitet)

const { benachrichtigen, protokoll, nutzerById, nameVon, kurz, aktiveAdmins } = intern;

const SCHEMA = 1;
const SYSTEM = Object.freeze({ id: "SYSTEM-PORTFOLIO", rollen: ["admin"], backofficeRollen: ["leitung"], aktiv: true, vorname: "Portfolio", nachname: "" });
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
const BEREICH = "portfolio";
const LABEL = "Portfolio & Beteiligungen";

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const boLesen = (n) => istAdmin(n) && darfLesen(n, BEREICH);
const boSchreiben = (n) => istAdmin(n) && darfSchreiben(n, BEREICH);

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function schreibNoetig(n) {
  angemeldet(n);
  if (!boSchreiben(n)) throw verboten(istAdmin(n) ? `Ihre Backoffice-Rolle erlaubt im Bereich „${LABEL}“ kein Schreiben.` : "Nur für das Backoffice.");
}
function leseNoetig(n) {
  angemeldet(n);
  if (!boLesen(n)) throw verboten("Nur für das Backoffice.");
}
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof PortfolioFehler) throw new PlattformFehler(e.status, e.message);
    throw e;
  }
}

// ================================================================ Datenbestand

const leer = () => ({ v: SCHEMA, positionen: [], ertraege: [], abrufe: [], ausschuettungen: [], dokumente: [] });
const P = (db) => db.portfolio;

let vorbereitet = false;
async function lesenBereit() {
  if (!vorbereitet) {
    // Nachbarmodule einmalig befüllen lassen (eigene Transaktionen, nicht verschachteln)
    await import("./entwicklung").then((m) => m.entwicklungMeine?.(SYSTEM)).catch(() => null);
    await import("./kyc").then((m) => m.kycStatus(null, { kontoId: "U-00-000000" })).catch(() => null);
    await import("./closing").then((m) => m.clListe?.(SYSTEM)).catch(() => null);
    vorbereitet = true;
  }
  let db = await lesen();
  if (db.portfolio?.v !== SCHEMA) {
    await aendern((d) => {
      if (d.portfolio?.v === SCHEMA) return;
      d.portfolio = leer();
      try {
        seed(d);
      } catch (e) {
        console.warn("[plattform-demo] Portfolio-Demodaten nicht ergänzt:", e?.message);
      }
    });
    db = await lesen();
  }
  if (abgleichNoetig(db)) {
    await aendern((d) => abgleichen(d));
    db = await lesen();
  }
  return db;
}
async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}

// ================================================================ Abgleich mit Closing und Börse

function abgleichNoetig(db) {
  const pos = P(db).positionen;
  for (const c of db.closing?.closings || []) {
    if (c.status !== "vollzogen") continue;
    const x = pos.find((p) => p.closingId === c.id);
    if (!x) return true;
    if (x.status === "uebernahme" && statusNachUebergabe(x.art, c.uebergabe || [], UEBERGABE_PUNKTE) !== "uebernahme") return true;
  }
  return pos.some((p) => p.boerseProjektId && p.status === "verkauf_boerse" && db.projekte.find((q) => q.id === p.boerseProjektId)?.status === "verkauft");
}

/** Vollzogene Closings → Positionen; Übergabe erledigt → Betrieb/Bau; Börsen-Wiederverkauf verkauft → Position verkauft */
function abgleichen(db) {
  for (const c of db.closing?.closings || []) {
    if (c.status !== "vollzogen") continue;
    let x = P(db).positionen.find((p) => p.closingId === c.id);
    if (!x) {
      const p = db.projekte.find((q) => q.id === c.projektId) || {};
      const k = nutzerById(db, c.kaeuferId);
      const i = db.interessen.find((q) => q.id === c.interesseId);
      x = { id: neueId("PO"), ...positionAusClosing(c, p), investorId: c.kaeuferId, organisationId: i?.organisationId || null, entwicklungId: null, boerseProjektId: null, degradation: null, dscrLockup: null, dscrDefault: null, wiederverkauf: null, notizIntern: "", verlauf: [], erstelltAm: jetzt(), geaendertAm: jetzt() };
      P(db).positionen.push(x);
      verlauf(x, SYSTEM, `Aus dem Closing ${c.id} übernommen – Übergabe läuft.`, true);
      if (k) benachrichtigen(db, k, { art: "portfolio", titel: `Neu im Portfolio: ${x.titel}`, text: "Nach dem Closing finden Sie die Position mit Übergabestand, Dokumenten und später Ertrag und Ausschüttungen im Portfolio.", link: `/portal/portfolio/${x.id}`, objektArt: "portfolio", objektId: x.id }, { mailBetreff: "Neue Position im Portfolio – ÖkoInvest", mailText: "Ein abgeschlossener Kauf wurde in Ihr Portfolio übernommen. Details finden Sie im Portal." });
    }
    if (x.status === "uebernahme") {
      const nach = statusNachUebergabe(x.art, c.uebergabe || [], UEBERGABE_PUNKTE);
      if (nach !== "uebernahme") {
        x.status = nach;
        if (nach === "betrieb" && !x.inbetriebnahme) x.inbetriebnahme = c.vollzogenAm || heute();
        verlauf(x, SYSTEM, `Übergabe abgeschlossen – Status „${PF_STATUS[nach].label}“.`, true);
        x.geaendertAm = jetzt();
        for (const u of empfaenger(db, x)) benachrichtigen(db, u, { art: "portfolio", titel: `Übergabe abgeschlossen: ${x.titel}`, text: "Die Übergabe-Checkliste ist vollständig. Monatliche Erträge und Berichte folgen im Portfolio.", link: `/portal/portfolio/${x.id}`, objektArt: "portfolio", objektId: x.id }, { mail: false });
      }
    }
  }
  for (const x of P(db).positionen) {
    if (x.boerseProjektId && x.status === "verkauf_boerse" && db.projekte.find((q) => q.id === x.boerseProjektId)?.status === "verkauft") {
      x.status = "verkauft";
      verlauf(x, SYSTEM, "Wiederverkauf über die Projektbörse abgeschlossen.", true);
      x.geaendertAm = jetzt();
    }
  }
}

// ================================================================ Hilfen

function verlauf(o, n, text, oeffentlich = false) {
  o.verlauf = o.verlauf || [];
  o.verlauf.push({ am: jetzt(), vonId: n?.id && n.id !== SYSTEM.id ? n.id : null, text: v.text(text, 300), oeffentlich: !!oeffentlich });
  if (o.verlauf.length > 300) o.verlauf.splice(0, o.verlauf.length - 300);
}

/** Rolle an einer Position: backoffice | investor (schreiben) | leser (Team „Nur lesen“) | null */
function rolleAn(db, n, x) {
  if (!n || !x) return null;
  if (boLesen(n)) return "backoffice";
  if (!n.rollen?.includes("investor")) return null;
  if (x.investorId === n.id) return "investor";
  const r = x.organisationId ? teamRolle(db, n.id, x.organisationId) : null;
  if (!r) return null;
  return darfTeamSchreiben(r) ? "investor" : "leser";
}

function positionLaden(db, id) {
  const x = P(db).positionen.find((p) => p.id === v.kennung(id));
  if (!x) throw nichtGefunden("Position nicht gefunden.");
  return x;
}
function zugriff(db, n, id) {
  angemeldet(n);
  const x = positionLaden(db, id);
  const rolle = rolleAn(db, n, x);
  if (!rolle) throw nichtGefunden("Position nicht gefunden.");
  return { x, rolle };
}

/** Investor-Konto und schreibberechtigte Teammitglieder (für Benachrichtigungen) */
function empfaenger(db, x) {
  const ids = new Set([x.investorId]);
  if (x.organisationId) for (const m of db.mitgliedschaften || []) if (m.organisationId === x.organisationId && ["inhaber", "admin"].includes(m.rolle)) ids.add(m.nutzerId);
  return [...ids].map((id) => nutzerById(db, id)).filter((u) => u?.aktiv);
}
function backofficeMelden(db, titel, text, link, objektId) {
  for (const a of aktiveAdmins(db).filter((u) => darfSchreiben(u, BEREICH)).slice(0, 5)) benachrichtigen(db, a, { art: "status", titel, text, link, objektArt: "portfolio", objektId }, { mail: false });
}
function kycPruefen(db, x, text) {
  const s = kycStatusDb(db, { kontoId: x.investorId, organisationId: x.organisationId });
  const s2 = s.verifiziert ? s : kycStatusDb(db, { kontoId: x.investorId });
  if (!s2.verifiziert) throw new PlattformFehler(409, text, "kyc");
  return s2;
}

const ertraegeVon = (db, x) => P(db).ertraege.filter((e) => e.positionId === x.id);
const abrufeVon = (db, x) => P(db).abrufe.filter((a) => a.positionId === x.id).sort((a, b) => a.nummer - b.nummer);
const ausschuettungenVon = (db, x) => P(db).ausschuettungen.filter((a) => a.positionId === x.id).sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
const letzterMonat = () => monatPlus(heute().slice(0, 7), -1);

// ---------------------------------------------------------------- Ist-Erträge aus dem Anlagen-Monitoring (Position.anlageId)

/** Zählerstand-Monatswerte der verknüpften Anlage (außerhalb der Schreibtransaktion lesen); null = nicht verfügbar */
async function monitoringZeilen(anlageId) {
  if (!anlageId) return null;
  try {
    return await zaehlerMonatswerte(SYSTEM, anlageId);
  } catch {
    return null;
  }
}
/** Erzeugungszähler der Anlage (abrechnungsrelevant, Register 2.8.0) */
const erzeugungIds = (db, anlageId) => (db.anlagen?.messpunkte || []).filter((m) => m.anlageId === anlageId && m.abrechnungsrelevant && m.art === "erzeugung").map((m) => m.id);
/** Monats-Ist automatisch übernehmen – manuelle Werte behalten Vorrang, Quelle wird gekennzeichnet */
function ertraegeUebernehmen(db, x, zeilen) {
  if (!x.anlageId || !zeilen) return { neu: 0, geaendert: 0 };
  const auto = istAusZaehler(zeilen, erzeugungIds(db, x.anlageId), { ab: String(x.kaufdatum || "").slice(0, 7), bis: letzterMonat() });
  const r = ertraegeAbgleichen(ertraegeVon(db, x), auto, { positionId: x.id, am: jetzt() });
  P(db).ertraege = [...P(db).ertraege.filter((e) => e.positionId !== x.id), ...r.liste.map((e) => (e.id ? e : { ...e, id: neueId("PE") }))];
  x.monitoringAbgleich = { am: jetzt(), neu: r.neu, geaendert: r.geaendert };
  return r;
}
function monitoringSicht(db, x) {
  if (!x.anlageId) return null;
  const a = (db.anlagen?.anlagen || []).find((q) => q.id === x.anlageId);
  return { anlageId: x.anlageId, anlageName: a?.name || x.anlageId, monateAuto: ertraegeVon(db, x).filter((e) => e.automatisch).length, letzterAbgleich: x.monitoringAbgleich?.am || null };
}
function anlagePruefen(db, anlageId) {
  if (anlageId && !(db.anlagen?.anlagen || []).some((a) => a.id === anlageId)) throw ungueltig("Die Anlage wurde im Anlagen-Monitoring nicht gefunden.");
}

function entwicklungSicht(db, x) {
  if (!x.entwicklungId || !db.entwicklung) return null;
  const p = (db.entwicklung.projekte || []).find((q) => q.id === x.entwicklungId);
  if (!p) return null;
  const ms = (db.entwicklung.meilensteine || []).filter((m) => m.projektId === p.id).sort((a, b) => (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0));
  const relevant = ms.filter((m) => m.externTitel || ["netz", "genehmigung", "cod", "bau"].includes(m.phase) || m.kategorie === "meilenstein").slice(0, 14);
  const erledigt = ms.filter((m) => ["erledigt", "entfaellt"].includes(m.status)).length;
  return {
    id: p.id, titel: p.titel, phase: p.phase || "", status: p.status || "", zielCod: p.zielCod || "", fortschritt: ms.length ? Math.round((erledigt / ms.length) * 100) : 0,
    meilensteine: (relevant.length ? relevant : ms.slice(0, 14)).map((m) => ({ id: m.id, titel: m.externTitel || m.titel, status: m.status, sollEnde: m.sollEnde || "", istEnde: m.istEnde || "" })),
    link: `/portal/entwicklung/${p.id}`,
  };
}

function abrufAusgabe(a, rolle, h) {
  return {
    id: a.id, nummer: a.nummer, betrag: a.betrag, zweck: a.zweck, meilenstein: a.meilenstein || "", angekuendigtAm: a.angekuendigtAm, faelligAm: a.faelligAm, status: a.status,
    statusLabel: ABRUF_STATUS[a.status]?.label, statusTon: ABRUF_STATUS[a.status]?.ton, gemeldetAm: a.gemeldetAm || "", referenz: a.referenz || "", bezahltAm: a.bezahltAm || "",
    storniertAm: a.storniertAm || "", grund: a.grund || "", verzugTage: abrufVerzug(a, h), darfMelden: rolle === "investor" && a.status === "angekuendigt",
  };
}

function positionAusgabe(db, n, x, { detail = false } = {}) {
  const rolle = rolleAn(db, n, x);
  const bo = rolle === "backoffice";
  const h = heute();
  const abrufe = abrufeVon(db, x);
  const aus = ausschuettungenVon(db, x);
  const ertraege = ertraegeVon(db, x);
  const bis = letzterMonat();
  const ertrag = x.p50KwhJahr ? ertragAuswertung(x, ertraege, { bis }) : null;
  const covenant = covenantAuswertung(x, ertraege, { bis });
  const kennzahlen = cashflowKennzahlen(x, { abrufe, ausschuettungen: aus }, { heute: h });
  const offeneAbrufe = abrufe.filter((a) => ABRUF_OFFEN.includes(a.status));
  const investor = nutzerById(db, x.investorId);
  const basis = {
    id: x.id, art: x.art, artLabel: PF_ARTEN[x.art]?.label, status: x.status, statusLabel: PF_STATUS[x.status]?.label, statusTon: PF_STATUS[x.status]?.ton,
    titel: x.titel, typ: x.typ, typLabel: PROJEKT_TYPEN[x.typ] || x.typ, land: x.land, landLabel: LAENDER[x.land] || x.land, bundesland: x.bundesland || "", mwp: x.mwp,
    spvName: x.spvName || "", anteilProzent: x.anteilProzent || 100, struktur: x.struktur || "", kaufpreis: x.kaufpreis || 0, kaufdatum: x.kaufdatum || "", inbetriebnahme: x.inbetriebnahme || "",
    zusage: x.zusage || 0, kennzahlen, ertragAmpel: ertrag?.ampel || "grau", ertragAbw12: ertrag?.summe12?.abw ?? null, covenantAmpel: covenant.ampel, dscr: covenant.dscr,
    offeneAbrufe: offeneAbrufe.length, offenerAbrufBetrag: offeneAbrufe.reduce((s, a) => s + a.betrag, 0), naechsteFaelligkeit: offeneAbrufe.map((a) => a.faelligAm).sort()[0] || "",
    ueberfaellig: offeneAbrufe.some((a) => abrufVerzug(a, h) > 0), meineRolle: rolle, geaendertAm: x.geaendertAm,
    investor: bo ? { id: x.investorId, anzeige: investor ? [investor.firma, nameVon(db, investor.id)].filter(Boolean).join(" – ") : "–" } : undefined,
  };
  if (!detail) return basis;
  const c = x.closingId ? (db.closing?.closings || []).find((q) => q.id === x.closingId) : null;
  const bp = x.boerseProjektId ? db.projekte.find((q) => q.id === x.boerseProjektId) : null;
  return {
    ...basis,
    closingId: x.closingId || null, projektId: x.projektId || null, entwicklungId: x.entwicklungId || null,
    monitoring: monitoringSicht(db, x),
    stammdaten: { anlageId: x.anlageId || null, p50KwhJahr: x.p50KwhJahr ?? null, verguetungCt: x.verguetungCt ?? null, opexJahr: x.opexJahr ?? null, schuldendienstJahr: x.schuldendienstJahr ?? null, degradation: x.degradation ?? null, dscrLockup: x.dscrLockup ?? null, dscrDefault: x.dscrDefault ?? null },
    ertrag, covenant,
    abrufe: abrufe.map((a) => abrufAusgabe(a, rolle, h)),
    ausschuettungen: aus.map((a) => ({ id: a.id, art: a.art, artLabel: AUSSCHUETTUNG_ARTEN[a.art]?.label, periode: a.periode, betrag: a.betrag, datum: a.datum, status: a.status, bankZustimmung: !!a.bankZustimmung, notiz: bo ? a.notiz || "" : undefined, quellensteuer: quellensteuerHinweis(x.land, a.art) })),
    dokumente: P(db).dokumente.filter((d) => d.positionId === x.id && (bo || d.freigabe)).sort((a, b) => String(b.am).localeCompare(String(a.am))).map((d) => ({ id: d.id, name: d.name, art: d.art, groesse: d.groesse, am: d.am, freigabe: !!d.freigabe, link: bo ? `/api/admin/portfolio/dokumente/${d.id}` : `/api/portal/portfolio/dokumente/${d.id}` })),
    entwicklung: entwicklungSicht(db, x),
    uebergabe: c ? { closingId: c.id, erledigt: (c.uebergabe || []).filter((u) => u.erledigt).length, gesamt: UEBERGABE_PUNKTE.length, link: bo ? `/portal/admin/closing/${c.id}` : `/portal/closing/${c.id}` } : null,
    wiederverkauf: x.wiederverkauf ? { ...x.wiederverkauf, strukturLabel: WV_STRUKTUREN[x.wiederverkauf.struktur], boerse: bp ? { id: bp.id, titel: bp.titel, status: bp.status, provisionAkzeptiert: !!bp.provisionAkzeptiert, slug: bp.slug } : null } : null,
    steuer: steuerHinweise(x.land),
    perioden: periodenAuswahl(x, h), periodeStandard: { quartal: periodeStandard("quartal", h), jahr: periodeStandard("jahr", h) },
    verlauf: bo ? x.verlauf || [] : (x.verlauf || []).filter((e) => e.oeffentlich).map((e) => ({ am: e.am, text: e.text })),
    notizIntern: bo ? x.notizIntern || "" : undefined,
    uebergaenge: bo ? PF_UEBERGAENGE[x.status] || [] : [],
    darf: {
      schreiben: boSchreiben(n), melden: rolle === "investor",
      wiederverkauf: rolle === "investor" && ["betrieb", "bau"].includes(x.status),
      zurueckziehen: rolle === "investor" && x.status === "verkauf_angefragt",
      provision: rolle === "investor" && x.status === "verkauf_boerse" && !!bp && !bp.provisionAkzeptiert,
    },
  };
}

// ================================================================ Investor

export async function pfMeine(n) {
  angemeldet(n);
  const db = await lesenBereit();
  const liste = P(db).positionen.filter((x) => rolleAn(db, n, x)).map((x) => positionAusgabe(db, n, x));
  const aktiv = liste.filter((x) => PF_AKTIV.includes(x.status));
  const summe = (f) => aktiv.reduce((s, x) => s + (f(x) || 0), 0);
  return {
    positionen: liste.sort((a, b) => PF_AKTIV.indexOf(a.status) - PF_AKTIV.indexOf(b.status) || String(b.geaendertAm).localeCompare(String(a.geaendertAm))),
    kennzahlen: {
      anzahl: aktiv.length, mwp: Math.round(summe((x) => (x.mwp || 0) * (x.anteilProzent || 100) / 100) * 100) / 100, paidIn: summe((x) => x.kennzahlen.paidIn), ausgeschuettet: summe((x) => x.kennzahlen.ausgeschuettet),
      ausgeschuettet12: summe((x) => x.kennzahlen.ausgeschuettet12), offeneZusage: summe((x) => x.kennzahlen.zusage.offen), offeneAbrufe: summe((x) => x.offeneAbrufe), offenerAbrufBetrag: summe((x) => x.offenerAbrufBetrag),
      warnungen: aktiv.filter((x) => x.ueberfaellig || ["gelb", "rot"].includes(x.covenantAmpel) || x.ertragAmpel === "rot").length,
    },
  };
}

export async function pfPosition(n, id) {
  const db = await lesenBereit();
  const { x } = zugriff(db, n, id);
  return positionAusgabe(db, n, x, { detail: true });
}

/** Investor-Aktionen: abruf_melden { abrufId, referenz } · wiederverkauf { … } · wiederverkauf_zurueck · provision_akzeptieren */
export async function pfPortalAktion(n, id, daten = {}) {
  angemeldet(n);
  const aktion = v.auswahl(daten.aktion, ["abruf_melden", "wiederverkauf", "wiederverkauf_zurueck", "provision_akzeptieren"], "");
  if (!aktion) throw ungueltig("Unbekannte Aktion.");
  if (aktion === "provision_akzeptieren") {
    const db0 = await lesenBereit();
    const { x, rolle } = zugriff(db0, n, id);
    if (rolle !== "investor") throw verboten("Nur für den Investor mit Schreibrecht.");
    if (x.status !== "verkauf_boerse" || !x.boerseProjektId) throw konflikt("Für diese Position gibt es keinen Börsen-Entwurf.");
    if (x.investorId !== n.id) throw verboten("Die Verkäuferprovision nimmt das Konto an, dem die Position gehört.");
    await provisionAkzeptieren(n, x.boerseProjektId, { ip: daten.ip || "" });
    return aendern((db) => {
      const y = positionLaden(db, id);
      verlauf(y, n, "Verkäuferprovision für den Wiederverkauf akzeptiert.", true);
      y.geaendertAm = jetzt();
      backofficeMelden(db, `Wiederverkauf: Provision akzeptiert – ${y.titel}`, "Der Börsen-Entwurf kann geprüft und veröffentlicht werden.", `/portal/admin/portfolio/${y.id}`, y.id);
      return positionAusgabe(db, n, y, { detail: true });
    });
  }
  return aendernBereit((db) => {
    const { x, rolle } = zugriff(db, n, id);
    if (rolle !== "investor") throw verboten(rolle === "leser" ? "Mit der Teamrolle „Nur lesen“ sind keine Aktionen möglich." : "Nur für den Investor.");
    const h = heute();
    if (aktion === "abruf_melden") {
      const a = P(db).abrufe.find((q) => q.id === v.kennung(daten.abrufId) && q.positionId === x.id);
      if (!a) throw nichtGefunden("Kapitalabruf nicht gefunden.");
      Object.assign(a, fach(() => abrufAktion(a, "melden", { referenz: v.text(daten.referenz, 80) }, { heute: h, rolle: "investor" })), { gemeldetVonId: n.id });
      verlauf(x, n, `Zahlung zu Kapitalabruf Nr. ${a.nummer} gemeldet${a.referenz ? ` (Referenz ${a.referenz})` : ""}.`, true);
      backofficeMelden(db, `Kapitalabruf Nr. ${a.nummer}: Zahlung gemeldet`, `${x.titel} – bitte Zahlungseingang prüfen.`, `/portal/admin/portfolio/${x.id}`, x.id);
    } else if (aktion === "wiederverkauf") {
      const wv = fach(() => wiederverkaufPruefen(x, { ...daten, grund: v.mehrzeilig(daten.grund, 600) }, { heute: h }));
      fach(() => uebergangPruefen(x.status, "verkauf_angefragt"));
      x.wiederverkauf = { ...wv, vonId: n.id };
      x.status = "verkauf_angefragt";
      verlauf(x, n, `Wiederverkauf angefragt (${WV_STRUKTUREN[wv.struktur]}, ${wv.anteilProzent} %, ab ${wv.zeitpunkt}).`, true);
      backofficeMelden(db, `Wiederverkauf angefragt: ${x.titel}`, "Bitte Preisindikation prüfen und den Börsen-Entwurf vorbereiten.", `/portal/admin/portfolio/${x.id}`, x.id);
    } else if (aktion === "wiederverkauf_zurueck") {
      if (x.status !== "verkauf_angefragt") throw konflikt("Nur eine offene Anfrage kann zurückgezogen werden.");
      x.status = x.wiederverkauf?.vorherStatus && ["betrieb", "bau"].includes(x.wiederverkauf.vorherStatus) ? x.wiederverkauf.vorherStatus : "betrieb";
      x.wiederverkauf = { ...(x.wiederverkauf || {}), zurueckgezogenAm: h };
      verlauf(x, n, "Wiederverkaufsanfrage zurückgezogen.", true);
    }
    x.geaendertAm = jetzt();
    protokoll(db, n, `portfolio_${aktion}`, "portfolio", x.id, aktion);
    return positionAusgabe(db, n, x, { detail: true });
  });
}

/** Berichtsdaten (PDF erzeugt die Website): { art: quartal|jahr, periode } */
export async function pfBerichtDaten(n, id, { art = "quartal", periode = "", ip = "" } = {}) {
  const db0 = await lesenBereit();
  const { x } = zugriff(db0, n, id);
  const a = art === "jahr" ? "jahr" : "quartal";
  const per = periode || periodeStandard(a, heute());
  const bericht = fach(() => berichtRechnen(x, { ertraege: ertraegeVon(db0, x), abrufe: abrufeVon(db0, x), ausschuettungen: ausschuettungenVon(db0, x) }, { art: a, periode: per, heute: heute() }));
  await aendern((db) => protokoll(db, n, "portfolio_bericht", "portfolio", x.id, `${a} ${per}`, ip));
  const u = nutzerById(db0, n.id);
  return { position: positionAusgabe(db0, n, x), stammdaten: { ...x, verlauf: undefined, notizIntern: undefined }, bericht, empfaenger: [u?.firma, nameVon(db0, n.id)].filter(Boolean).join(" – ") };
}

/** Download eines freigegebenen Dokuments (Investor) bzw. jedes Dokuments (Backoffice) – protokolliert */
export async function pfDokumentLesen(n, dokId, { ip = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const d = P(db).dokumente.find((q) => q.id === v.kennung(dokId));
  if (!d) throw nichtGefunden("Dokument nicht gefunden.");
  const x = positionLaden(db, d.positionId);
  const rolle = rolleAn(db, n, x);
  if (!rolle || (rolle !== "backoffice" && !d.freigabe)) throw nichtGefunden("Dokument nicht gefunden.");
  const daten = await uploadLesen(d.datei);
  await aendern((db2) => protokoll(db2, n, "portfolio_download", "portfolio", x.id, `Download ${d.name}`, ip));
  return { name: d.name, mime: d.mime, daten };
}

// ================================================================ Backoffice

export async function pfUebersicht(n) {
  leseNoetig(n);
  const db = await lesenBereit();
  const h = heute();
  const liste = P(db).positionen.map((x) => positionAusgabe(db, n, x));
  const abrufe = P(db).abrufe.filter((a) => ABRUF_OFFEN.includes(a.status)).map((a) => {
    const x = P(db).positionen.find((p) => p.id === a.positionId);
    return { ...abrufAusgabe(a, "backoffice", h), positionId: a.positionId, position: x?.titel || "" };
  }).sort((a, b) => a.faelligAm.localeCompare(b.faelligAm));
  return {
    positionen: liste,
    abrufe,
    wiederverkauf: liste.filter((x) => x.status === "verkauf_angefragt"),
    kennzahlen: {
      positionen: liste.filter((x) => PF_AKTIV.includes(x.status)).length, uebernahme: liste.filter((x) => x.status === "uebernahme").length,
      abrufeOffen: abrufe.length, abrufeUeberfaellig: abrufe.filter((a) => a.verzugTage > 0).length, covenantWarnungen: liste.filter((x) => ["gelb", "rot"].includes(x.covenantAmpel)).length,
      ausgeschuettet12: liste.reduce((s, x) => s + (x.kennzahlen.ausgeschuettet12 || 0), 0),
    },
    schreiben: boSchreiben(n),
  };
}

/** Auswahl für „Position anlegen“: Investorenkonten, Organisationen, Entwicklungsprojekte (Co-Development) */
export async function pfAuswahl(n) {
  leseNoetig(n);
  const db = await lesenBereit();
  return {
    investoren: db.nutzer.filter((u) => u.aktiv && u.rollen.includes("investor")).map((u) => ({ id: u.id, name: nameVon(db, u.id), firma: u.firma || "" })),
    entwicklung: (db.entwicklung?.projekte || []).filter((p) => p.status !== "abgebrochen").map((p) => ({ id: p.id, titel: p.titel, mwp: p.mwp, land: p.land, typ: p.typ, codev: (p.freigaben || []).filter((f) => f.art === "codev").map((f) => f.nutzerId).filter(Boolean) })),
    arten: PF_ARTEN, typen: PROJEKT_TYPEN,
  };
}

function stammdaten(d = {}, basis = {}) {
  const zahl = (k, o) => (Object.hasOwn(d, k) ? v.zahl(d[k], o) : basis[k] ?? null);
  return {
    titel: Object.hasOwn(d, "titel") ? v.text(d.titel, 140) : basis.titel || "",
    typ: v.auswahl(d.typ, Object.keys(PROJEKT_TYPEN), basis.typ || "freiflaeche"),
    land: v.auswahl(d.land, Object.keys(LAENDER), basis.land || "DE"),
    bundesland: Object.hasOwn(d, "bundesland") ? v.text(d.bundesland, 80) : basis.bundesland || "",
    mwp: zahl("mwp", { min: 0.01, max: 5000, stellen: 3 }),
    spvName: Object.hasOwn(d, "spvName") ? v.text(d.spvName, 160) : basis.spvName || "",
    anteilProzent: zahl("anteilProzent", { min: 1, max: 100, stellen: 2 }) ?? 100,
    kaufpreis: zahl("kaufpreis", { min: 0, max: 1e11 }) ?? 0,
    kaufdatum: Object.hasOwn(d, "kaufdatum") ? (/^20\d\d-\d\d-\d\d$/.test(String(d.kaufdatum)) ? d.kaufdatum : "") : basis.kaufdatum || "",
    inbetriebnahme: Object.hasOwn(d, "inbetriebnahme") ? (/^20\d\d-\d\d(-\d\d)?$/.test(String(d.inbetriebnahme)) ? d.inbetriebnahme : "") : basis.inbetriebnahme || "",
    zusage: zahl("zusage", { min: 0, max: 1e11 }) ?? 0,
    p50KwhJahr: zahl("p50KwhJahr", { min: 0, max: 1e10 }),
    verguetungCt: zahl("verguetungCt", { min: 0, max: 100, stellen: 3 }),
    opexJahr: zahl("opexJahr", { min: 0, max: 1e9 }),
    schuldendienstJahr: zahl("schuldendienstJahr", { min: 0, max: 1e10 }),
    degradation: zahl("degradation", { min: 0, max: 0.05, stellen: 4 }),
    dscrLockup: zahl("dscrLockup", { min: 1, max: 3, stellen: 2 }),
    dscrDefault: zahl("dscrDefault", { min: 1, max: 3, stellen: 2 }),
    anlageId: Object.hasOwn(d, "anlageId") ? v.kennung(d.anlageId) || null : basis.anlageId ?? null, // Anlagen-Monitoring: Ist-Erträge automatisch
  };
}

/** Position anlegen: { art, investorId, organisationId?, entwicklungId?, …Stammdaten } */
export async function pfAnlegen(n, daten = {}) {
  schreibNoetig(n);
  const zeilen = await monitoringZeilen(v.kennung(daten.anlageId));
  return aendernBereit((db) => {
    const art = v.auswahl(daten.art, Object.keys(PF_ARTEN), "");
    if (!art) throw ungueltig("Bitte die Art der Position wählen.");
    const u = nutzerById(db, v.kennung(daten.investorId));
    if (!u || !u.rollen.includes("investor")) throw ungueltig("Bitte ein Investorenkonto wählen.");
    const orgId = v.kennung(daten.organisationId) || null;
    if (orgId && !teamRolle(db, u.id, orgId)) throw ungueltig("Der Investor ist nicht Mitglied dieser Organisation.");
    let ep = null;
    if (art === "codev") {
      ep = (db.entwicklung?.projekte || []).find((p) => p.id === v.kennung(daten.entwicklungId));
      if (!ep) throw ungueltig("Bitte das Entwicklungsprojekt wählen.");
      if (P(db).positionen.some((p) => p.entwicklungId === ep.id && p.investorId === u.id && PF_AKTIV.includes(p.status))) throw konflikt("Für dieses Projekt gibt es bereits eine Beteiligung des Investors.");
    }
    kycPruefen(db, { investorId: u.id, organisationId: orgId }, "Beteiligungen nur für verifizierte Investoren (KYC/KYB).");
    const s = stammdaten({ titel: ep?.titel, mwp: ep?.mwp, land: ep?.land, typ: ep?.typ, ...daten });
    v.pflicht(s.titel.length >= 3, "Bitte einen Titel angeben.");
    if (art === "codev") v.pflicht(s.zusage > 0, "Bitte die Kapitalzusage angeben.");
    else v.pflicht(s.kaufpreis > 0, "Bitte den Kaufpreis angeben.");
    const x = {
      id: neueId("PO"), art, status: art === "codev" ? "entwicklung" : art === "projekt" ? "bau" : "betrieb", ...s, investorId: u.id, organisationId: orgId, entwicklungId: ep?.id || null,
      closingId: null, projektId: null, boerseProjektId: null, struktur: v.auswahl(daten.struktur, ["share", "asset"], "share"), wiederverkauf: null, notizIntern: v.text(daten.notizIntern, 1000), verlauf: [], erstelltAm: jetzt(), geaendertAm: jetzt(),
    };
    if (!x.kaufdatum) x.kaufdatum = heute();
    anlagePruefen(db, x.anlageId);
    P(db).positionen.push(x);
    ertraegeUebernehmen(db, x, zeilen);
    verlauf(x, n, `Position angelegt (${PF_ARTEN[art].label}).`, true);
    benachrichtigen(db, u, { art: "portfolio", titel: `Neu im Portfolio: ${x.titel}`, text: art === "codev" ? "Ihre Co-Development-Beteiligung mit Kapitalzusage und Abrufen ist im Portfolio." : "Die Position ist in Ihrem Portfolio.", link: `/portal/portfolio/${x.id}`, objektArt: "portfolio", objektId: x.id }, { mailBetreff: "Neue Position im Portfolio – ÖkoInvest", mailText: "In Ihrem Portfolio wurde eine Position angelegt. Details finden Sie im Portal." });
    protokoll(db, n, "portfolio_anlegen", "portfolio", x.id, `${art}: ${x.titel}`);
    return positionAusgabe(db, n, x, { detail: true });
  });
}

export async function pfAendern(n, id, daten = {}) {
  schreibNoetig(n);
  const zeilen = Object.hasOwn(daten, "anlageId") ? await monitoringZeilen(v.kennung(daten.anlageId)) : null;
  return aendernBereit((db) => {
    const x = positionLaden(db, id);
    if (["verkauft", "beendet"].includes(x.status)) throw konflikt("Die Position ist abgeschlossen.");
    const s = stammdaten(daten, x);
    v.pflicht(s.titel.length >= 3, "Bitte einen Titel angeben.");
    if (x.art === "codev" && s.zusage < abrufeVon(db, x).filter((a) => a.status !== "storniert").reduce((t, a) => t + a.betrag, 0)) throw ungueltig("Die Zusage darf nicht unter den bereits abgerufenen Betrag sinken.");
    anlagePruefen(db, s.anlageId);
    const anlageNeu = s.anlageId !== (x.anlageId || null);
    Object.assign(x, s);
    if (anlageNeu) {
      // Verknüpfung geändert: bisher automatisch übernommene Werte verwerfen, neue übernehmen (manuelle bleiben)
      P(db).ertraege = P(db).ertraege.filter((e) => e.positionId !== x.id || !e.automatisch);
      if (x.anlageId) ertraegeUebernehmen(db, x, zeilen);
      verlauf(x, n, x.anlageId ? `Mit Anlage ${x.anlageId} verknüpft – Ist-Erträge werden aus dem Monitoring übernommen.` : "Verknüpfung mit dem Anlagen-Monitoring entfernt.");
    }
    if (Object.hasOwn(daten, "notizIntern")) x.notizIntern = v.text(daten.notizIntern, 1000);
    x.geaendertAm = jetzt();
    verlauf(x, n, "Stammdaten geändert.");
    protokoll(db, n, "portfolio_aendern", "portfolio", x.id, "Stammdaten");
    return positionAusgabe(db, n, x, { detail: true });
  });
}

/**
 * Backoffice-Aktionen:
 *   status { nach, grund? } · ertrag { monat, kwh, quelle? } (leer = löschen) · abruf { betrag, faelligAm, zweck, meilenstein? }
 *   abruf_bestaetigen { abrufId, datum? } · abruf_stornieren { abrufId, grund } · ausschuettung { art, periode, betrag, datum, bankZustimmung?, notiz? }
 *   ausschuettung_storno { ausschuettungId, grund } · boerse (Börsen-Entwurf aus der Wiederverkaufsanfrage)
 *   ertrag_uebernehmen (Ist-Erträge aus dem Anlagen-Monitoring der verknüpften Anlage, manuelle Werte behalten Vorrang)
 */
export async function pfAktion(n, id, daten = {}) {
  schreibNoetig(n);
  const aktion = v.auswahl(daten.aktion, ["status", "ertrag", "ertrag_uebernehmen", "abruf", "abruf_bestaetigen", "abruf_stornieren", "ausschuettung", "ausschuettung_storno", "boerse"], "");
  if (!aktion) throw ungueltig("Unbekannte Aktion.");
  if (aktion === "boerse") return boerseAnlegen(n, id);
  if (aktion === "ertrag_uebernehmen") {
    const db0 = await lesenBereit();
    const x0 = positionLaden(db0, id);
    if (!x0.anlageId) throw konflikt("Die Position ist mit keiner Anlage des Monitorings verknüpft.");
    const zeilen = await monitoringZeilen(x0.anlageId);
    if (!zeilen) throw konflikt("Die Monatswerte der Anlage sind derzeit nicht verfügbar.");
    return aendernBereit((db) => {
      const x = positionLaden(db, id);
      const r = ertraegeUebernehmen(db, x, zeilen);
      verlauf(x, n, `Ist-Erträge aus dem Anlagen-Monitoring übernommen (${r.neu} neu, ${r.geaendert} aktualisiert).`);
      x.geaendertAm = jetzt();
      protokoll(db, n, "portfolio_ertrag_uebernehmen", "portfolio", x.id, `${r.neu} neu, ${r.geaendert} aktualisiert`);
      return positionAusgabe(db, n, x, { detail: true });
    });
  }
  return aendernBereit((db) => {
    const x = positionLaden(db, id);
    const h = heute();
    const link = `/portal/portfolio/${x.id}`;
    if (aktion === "status") {
      const nach = fach(() => uebergangPruefen(x.status, String(daten.nach || "")));
      if (nach === "verkauf_angefragt") throw konflikt("Den Wiederverkauf fragt der Investor im Portfolio an.");
      if (nach === "verkauf_boerse") throw konflikt("Bitte den Börsen-Entwurf über „In die Börse übernehmen“ anlegen.");
      const vorher = x.status;
      x.status = nach;
      if (nach === "betrieb" && !x.inbetriebnahme) x.inbetriebnahme = h;
      if (["betrieb", "bau"].includes(nach) && ["verkauf_angefragt", "verkauf_boerse"].includes(vorher)) x.wiederverkauf = { ...(x.wiederverkauf || {}), beendetAm: h, ergebnis: v.text(daten.grund, 300) || "nicht weiterverfolgt" };
      verlauf(x, n, `Status: ${PF_STATUS[nach].label}${daten.grund ? ` – ${v.text(daten.grund, 200)}` : ""}.`, true);
      for (const u of empfaenger(db, x)) benachrichtigen(db, u, { art: "portfolio", titel: `${x.titel}: ${PF_STATUS[nach].label}`, text: "Der Status Ihrer Position hat sich geändert.", link, objektArt: "portfolio", objektId: x.id }, { mailBetreff: "Neuigkeiten zu Ihrem Portfolio – ÖkoInvest", mailText: "Der Status einer Position in Ihrem Portfolio hat sich geändert. Details finden Sie im Portal." });
    } else if (aktion === "ertrag") {
      if (!istMonat(daten.monat) || daten.monat > h.slice(0, 7)) throw ungueltig("Bitte einen vergangenen oder den laufenden Monat angeben (JJJJ-MM).");
      const alt = P(db).ertraege.findIndex((e) => e.positionId === x.id && e.monat === daten.monat);
      if (daten.kwh === "" || daten.kwh === null || daten.kwh === undefined) {
        if (alt >= 0) P(db).ertraege.splice(alt, 1);
        verlauf(x, n, `Ertrag ${daten.monat} gelöscht.`);
      } else {
        const kwh = v.zahl(daten.kwh, { min: 0, max: 1e10 });
        if (kwh === null) throw ungueltig("Bitte die erzeugte Energie in kWh angeben.");
        const e = { id: alt >= 0 ? P(db).ertraege[alt].id : neueId("PE"), positionId: x.id, monat: daten.monat, kwh: Math.round(kwh), quelle: v.text(daten.quelle, 80) || "Betriebsführung", vonId: n.id, am: jetzt() };
        if (alt >= 0) P(db).ertraege[alt] = e;
        else P(db).ertraege.push(e);
        verlauf(x, n, `Ertrag ${daten.monat}: ${e.kwh.toLocaleString("de-DE")} kWh (${e.quelle}).`);
      }
    } else if (aktion === "abruf") {
      kycPruefen(db, x, "Kapitalabrufe nur an verifizierte Investoren (KYC/KYB).");
      const neu = fach(() => abrufPruefen(x, abrufeVon(db, x), { ...daten, zweck: v.text(daten.zweck, 200), meilenstein: v.text(daten.meilenstein, 160) }, { heute: h }));
      const a = { id: neueId("CC"), positionId: x.id, ...neu, status: "angekuendigt", vonId: n.id, erinnert: {} };
      P(db).abrufe.push(a);
      verlauf(x, n, `Kapitalabruf Nr. ${a.nummer} über ${a.betrag.toLocaleString("de-DE")} € angekündigt, fällig am ${a.faelligAm} (${a.zweck}).`, true);
      for (const u of empfaenger(db, x)) benachrichtigen(db, u, { art: "portfolio", titel: `Kapitalabruf Nr. ${a.nummer}: ${x.titel}`, text: `${a.betrag.toLocaleString("de-DE")} € fällig am ${a.faelligAm.split("-").reverse().join(".")} – ${a.zweck}`, link, objektArt: "portfolio", objektId: x.id }, { mailBetreff: "Kapitalabruf zu Ihrer Beteiligung – ÖkoInvest", mailText: "Zu einer Ihrer Beteiligungen wurde Kapital abgerufen. Betrag, Frist und Zahlungsdetails finden Sie im Portal." });
    } else if (aktion === "abruf_bestaetigen" || aktion === "abruf_stornieren") {
      const a = P(db).abrufe.find((q) => q.id === v.kennung(daten.abrufId) && q.positionId === x.id);
      if (!a) throw nichtGefunden("Kapitalabruf nicht gefunden.");
      Object.assign(a, fach(() => abrufAktion(a, aktion === "abruf_bestaetigen" ? "bestaetigen" : "stornieren", { datum: daten.datum, grund: v.text(daten.grund, 300) }, { heute: h, rolle: "backoffice" })), { bestaetigtVonId: n.id });
      const txt = aktion === "abruf_bestaetigen" ? `Zahlungseingang zu Kapitalabruf Nr. ${a.nummer} bestätigt (${a.bezahltAm}).` : `Kapitalabruf Nr. ${a.nummer} storniert: ${a.grund}`;
      verlauf(x, n, txt, true);
      for (const u of empfaenger(db, x)) benachrichtigen(db, u, { art: "portfolio", titel: aktion === "abruf_bestaetigen" ? `Zahlung eingegangen: Abruf Nr. ${a.nummer}` : `Abruf Nr. ${a.nummer} storniert`, text: `${x.titel} – ${txt}`, link, objektArt: "portfolio", objektId: x.id }, { mail: false });
    } else if (aktion === "ausschuettung") {
      kycPruefen(db, x, "Ausschüttungen nur an verifizierte Investoren (KYC/KYB).");
      const covenant = covenantAuswertung(x, ertraegeVon(db, x), { bis: letzterMonat() });
      const a = { id: neueId("AZ"), positionId: x.id, ...fach(() => ausschuettungPruefen(x, { ...daten, notiz: v.text(daten.notiz, 300) }, { heute: h, covenant })), vonId: n.id, am: jetzt() };
      P(db).ausschuettungen.push(a);
      verlauf(x, n, `Ausschüttung gebucht: ${AUSSCHUETTUNG_ARTEN[a.art].label}, ${a.betrag.toLocaleString("de-DE")} € (${a.periode})${a.bankZustimmung ? " – mit Zustimmung der Bank" : ""}.`, true);
      for (const u of empfaenger(db, x)) benachrichtigen(db, u, { art: "portfolio", titel: `Ausschüttung: ${x.titel}`, text: `${AUSSCHUETTUNG_ARTEN[a.art].label} ${a.betrag.toLocaleString("de-DE")} € (Periode ${a.periode}, Zahlung ${a.datum.split("-").reverse().join(".")}).`, link, objektArt: "portfolio", objektId: x.id }, { mailBetreff: "Ausschüttung zu Ihrer Beteiligung – ÖkoInvest", mailText: "Zu einer Ihrer Beteiligungen wurde eine Ausschüttung gebucht. Details finden Sie im Portal." });
    } else if (aktion === "ausschuettung_storno") {
      const a = P(db).ausschuettungen.find((q) => q.id === v.kennung(daten.ausschuettungId) && q.positionId === x.id);
      if (!a) throw nichtGefunden("Ausschüttung nicht gefunden.");
      if (a.status === "storniert") throw konflikt("Die Ausschüttung ist bereits storniert.");
      const grund = v.text(daten.grund, 300);
      v.pflicht(grund.length >= 5, "Bitte einen Grund angeben.");
      Object.assign(a, { status: "storniert", storniertAm: h, grund });
      verlauf(x, n, `Ausschüttung vom ${a.datum} storniert: ${grund}`, true);
    }
    x.geaendertAm = jetzt();
    protokoll(db, n, `portfolio_${aktion}`, "portfolio", x.id, aktion);
    return positionAusgabe(db, n, x, { detail: true });
  });
}

/** Börsen-Entwurf aus der Wiederverkaufsanfrage: Projekt „Entwurf“ mit Anbieter = Investor, Position → verkauf_boerse */
async function boerseAnlegen(n, id) {
  const db0 = await lesenBereit();
  const x0 = positionLaden(db0, id);
  if (x0.status !== "verkauf_angefragt" || !x0.wiederverkauf) throw konflikt("Zuerst muss der Investor den Wiederverkauf anfragen.");
  fach(() => uebergangPruefen(x0.status, "verkauf_boerse"));
  const u = nutzerById(db0, x0.investorId);
  if (!u?.aktiv) throw konflikt("Das Investorenkonto ist nicht aktiv.");
  const entwurf = boerseEntwurf(x0, x0.wiederverkauf);
  const p = await projektAnlegen({ ...u, rollen: [...new Set([...(u.rollen || []), "anbieter"])], organisation: null }, entwurf, {});
  return aendern((db) => {
    const x = positionLaden(db, id);
    x.boerseProjektId = p.id;
    x.status = "verkauf_boerse";
    x.geaendertAm = jetzt();
    verlauf(x, n, `Börsen-Entwurf ${p.id} angelegt – nach Annahme der Verkäuferprovision prüft ÖkoInvest und veröffentlicht.`, true);
    for (const k of empfaenger(db, x)) benachrichtigen(db, k, { art: "portfolio", titel: `Wiederverkauf vorbereitet: ${x.titel}`, text: "Bitte die Verkäuferprovision im Portfolio annehmen – danach prüft und veröffentlicht ÖkoInvest das Angebot.", link: `/portal/portfolio/${x.id}`, objektArt: "portfolio", objektId: x.id }, { mailBetreff: "Wiederverkauf vorbereitet – ÖkoInvest", mailText: "Für Ihre Position wurde ein Angebot in der Projektbörse vorbereitet. Bitte prüfen Sie es im Portal." });
    protokoll(db, n, "portfolio_boerse", "portfolio", x.id, `Börsen-Entwurf ${p.id}`);
    return positionAusgabe(db, n, x, { detail: true });
  });
}

export async function pfDokumentSpeichern(n, { positionId, art = "bericht", name = "", mime, daten, freigabe = true } = {}) {
  schreibNoetig(n);
  if (!UPLOAD.typen[mime]) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  const DOK_ARTEN = ["jahresabschluss", "steuer", "bericht", "vertrag", "gesellschafter", "sonstiges"];
  const db0 = await lesenBereit();
  positionLaden(db0, positionId);
  const datei = `${neueId("PY")}-${zufallsToken().slice(0, 12)}.${UPLOAD.typen[mime]}`;
  await uploadSchreiben(datei, daten);
  return aendern((db) => {
    const x = positionLaden(db, positionId);
    const d = { id: neueId("PY"), positionId: x.id, art: v.auswahl(art, DOK_ARTEN, "sonstiges"), name: v.text(String(name || "").replace(/[\\/]/g, "_"), 160) || `dokument.${UPLOAD.typen[mime]}`, mime, groesse: daten.length, datei, sha256: sha256(daten), freigabe: v.wahr(freigabe) || freigabe === undefined, vonId: n.id, am: jetzt() };
    P(db).dokumente.push(d);
    verlauf(x, n, `Dokument „${d.name}“ bereitgestellt${d.freigabe ? "" : " (intern)"}.`, d.freigabe);
    if (d.freigabe) for (const u of empfaenger(db, x)) benachrichtigen(db, u, { art: "portfolio", titel: `Neues Dokument: ${x.titel}`, text: d.name, link: `/portal/portfolio/${x.id}`, objektArt: "portfolio", objektId: x.id }, { mailBetreff: "Neues Dokument in Ihrem Portfolio – ÖkoInvest", mailText: "Zu einer Position in Ihrem Portfolio wurde ein Dokument bereitgestellt." });
    protokoll(db, n, "portfolio_dokument", "portfolio", x.id, d.name);
    return { id: d.id, name: d.name, art: d.art, groesse: d.groesse, am: d.am, freigabe: d.freigabe };
  });
}

/**
 * Fristenlauf (Frappe: Scheduler täglich): Abruf fällig in ≤ 3 Tagen → Erinnerung; überfällig → Mahnhinweis an Investor und
 * Backoffice (je Abruf einmal je Stufe); Covenant-Ampel gelb/rot neu → Hinweis an Backoffice und Investor.
 */
export async function pfFristenLauf(n) {
  if (n) leseNoetig(n);
  const db0 = await lesenBereit();
  // Ist-Erträge verknüpfter Anlagen vorab lesen (async, außerhalb der Schreibtransaktion)
  const monitoring = new Map();
  for (const id of new Set(P(db0).positionen.filter((p) => p.anlageId && PF_AKTIV.includes(p.status)).map((p) => p.anlageId))) monitoring.set(id, await monitoringZeilen(id));
  return aendern((db) => {
    const h = heute();
    const erg = { erinnerungen: 0, verzug: 0, covenant: 0, ertraegeUebernommen: 0 };
    for (const x of P(db).positionen.filter((p) => p.anlageId && PF_AKTIV.includes(p.status))) {
      const r = ertraegeUebernehmen(db, x, monitoring.get(x.anlageId));
      erg.ertraegeUebernommen += r.neu + r.geaendert;
    }
    for (const a of P(db).abrufe.filter((q) => q.status === "angekuendigt")) {
      const x = P(db).positionen.find((p) => p.id === a.positionId);
      if (!x) continue;
      a.erinnert = a.erinnert || {};
      const link = `/portal/portfolio/${x.id}`;
      if (a.faelligAm >= h && a.faelligAm <= plusTage(h, 3) && !a.erinnert.vorher) {
        a.erinnert.vorher = h;
        erg.erinnerungen++;
        for (const u of empfaenger(db, x)) benachrichtigen(db, u, { art: "portfolio", titel: `Erinnerung: Kapitalabruf Nr. ${a.nummer} fällig am ${a.faelligAm.split("-").reverse().join(".")}`, text: `${x.titel} – ${a.betrag.toLocaleString("de-DE")} €`, link, objektArt: "portfolio", objektId: x.id }, { mailBetreff: "Erinnerung Kapitalabruf – ÖkoInvest", mailText: "Ein Kapitalabruf zu Ihrer Beteiligung wird in Kürze fällig. Details im Portal." });
      }
      if (abrufVerzug(a, h) > 0 && !a.erinnert.verzug) {
        a.erinnert.verzug = h;
        erg.verzug++;
        for (const u of empfaenger(db, x)) benachrichtigen(db, u, { art: "portfolio", titel: `Kapitalabruf Nr. ${a.nummer} überfällig`, text: `${x.titel} – bitte Zahlung veranlassen bzw. im Portal melden. Verzugsfolgen richten sich nach dem Beteiligungsvertrag.`, link, objektArt: "portfolio", objektId: x.id }, { mailBetreff: "Kapitalabruf überfällig – ÖkoInvest", mailText: "Ein Kapitalabruf zu Ihrer Beteiligung ist überfällig. Details im Portal." });
        backofficeMelden(db, `Kapitalabruf überfällig: ${x.titel}`, `Abruf Nr. ${a.nummer}, fällig ${a.faelligAm}.`, `/portal/admin/portfolio/${x.id}`, x.id);
      }
    }
    for (const x of P(db).positionen.filter((p) => PF_AKTIV.includes(p.status))) {
      const c = covenantAuswertung(x, ertraegeVon(db, x), { bis: letzterMonat() });
      if (c.ampel !== x.covenantAmpelGemeldet && ["gelb", "rot"].includes(c.ampel)) {
        erg.covenant++;
        backofficeMelden(db, `Covenant ${c.ampel === "rot" ? "verletzt" : "Frühwarnung"}: ${x.titel}`, c.grund, `/portal/admin/portfolio/${x.id}`, x.id);
        for (const u of empfaenger(db, x)) benachrichtigen(db, u, { art: "portfolio", titel: `Covenant-Hinweis: ${x.titel}`, text: c.grund, link: `/portal/portfolio/${x.id}`, objektArt: "portfolio", objektId: x.id }, { mail: false });
        verlauf(x, SYSTEM, c.grund);
      }
      x.covenantAmpelGemeldet = c.ampel;
    }
    return { ok: true, ...erg, am: jetzt() };
  });
}

// ================================================================ Demo-Daten (fiktiv)

const FAKTOR = [0.97, 1.03, 0.94, 1.01, 0.99, 1.05, 0.96, 0.92, 1.02, 0.98, 1.04, 0.95, 1.0, 0.97, 1.01, 0.93, 0.99, 1.02];

function seed(db) {
  const inv = db.nutzer.find((u) => u.email === "investor@example.com");
  const admin = db.nutzer.find((u) => u.email === "admin@example.com");
  if (!inv) return;
  const org = (db.organisationen || []).find((o) => /Demo Capital/.test(o.name) && teamRolle(db, inv.id, o.id));
  const h = heute();
  const bis = letzterMonat();
  const basis = { investorId: inv.id, organisationId: org?.id || null, closingId: null, projektId: null, boerseProjektId: null, degradation: null, dscrLockup: null, dscrDefault: null, wiederverkauf: null, notizIntern: "", verlauf: [], erstelltAm: vorTagen(200), geaendertAm: vorTagen(3) };

  // 1) Bestand DE – GmbH & Co. KG, Bankfinanzierung, DSCR grün
  const a = {
    id: neueId("PO"), ...basis, art: "bestand", status: "betrieb", titel: "Solarpark Hochfeld (Demo)", typ: "freiflaeche", land: "DE", bundesland: "Bayern", mwp: 8.2,
    spvName: "Demo Solarpark Hochfeld GmbH & Co. KG (fiktiv)", anteilProzent: 100, struktur: "share", kaufpreis: 5740000, kaufdatum: monatPlus(h.slice(0, 7), -18) + "-14",
    inbetriebnahme: "2022-07", zusage: 0, p50KwhJahr: 8692000, verguetungCt: 6.4, opexJahr: 74000, schuldendienstJahr: 380000,
  };
  // 2) Bestand AT – GmbH, 49 %, Ertrag unter Plan, DSCR gelb (Lock-up)
  const b = {
    id: neueId("PO"), ...basis, art: "bestand", status: "betrieb", titel: "Agri-PV Donautal (Demo)", typ: "agri", land: "AT", bundesland: "Oberösterreich", mwp: 4.6,
    spvName: "Demo Agri-PV Donautal GmbH (fiktiv)", anteilProzent: 49, struktur: "share", kaufpreis: 3450000, kaufdatum: monatPlus(h.slice(0, 7), -10) + "-03",
    inbetriebnahme: "2024-05", zusage: 0, p50KwhJahr: 4968000, verguetungCt: 7.9, opexJahr: 41000, schuldendienstJahr: 280000,
  };
  P(db).positionen.push(a, b);
  verlauf(a, SYSTEM, "Anteilskauf vollzogen, Übergabe abgeschlossen (Demo).", true);
  verlauf(b, SYSTEM, "Beteiligung 49 % erworben, Übergabe abgeschlossen (Demo).", true);
  const mA = [];
  for (let i = 17; i >= 0; i--) mA.push(monatPlus(bis, -i));
  mA.forEach((m, i) => {
    if (m >= a.kaufdatum.slice(0, 7)) P(db).ertraege.push({ id: neueId("PE"), positionId: a.id, monat: m, kwh: Math.round(sollM(a, m) * FAKTOR[i % FAKTOR.length]), quelle: "Betriebsführung (Demo)", vonId: null, am: vorTagen(5) });
    if (m >= b.kaufdatum.slice(0, 7)) P(db).ertraege.push({ id: neueId("PE"), positionId: b.id, monat: m, kwh: Math.round(sollM(b, m) * (FAKTOR[(i + 5) % FAKTOR.length] - 0.1)), quelle: "Datenlogger (Demo)", vonId: null, am: vorTagen(5) });
  });
  const j = Number(h.slice(0, 4));
  const as = (pos, art, periode, betrag, datum) => P(db).ausschuettungen.push({ id: neueId("AZ"), positionId: pos.id, art, periode, betrag, datum, bankZustimmung: false, notiz: "Demo", status: "gebucht", vonId: admin?.id || null, am: `${datum}T10:00:00.000Z` });
  as(a, "entnahme", String(j - 1), 120000, `${j - 1}-10-15`);
  as(a, "entnahme", String(j - 1), 180000, `${j}-04-20`);
  as(a, "entnahme", String(j), 110000, `${j}-07-15`);
  as(b, "gewinn", String(j - 1), 58800, `${j}-05-28`);

  // 3) Co-Development – Solarpark Mühlweg (Entwicklungsprojekt), Zusage 1,2 Mio. €, ein Abruf offen
  const ep = (db.entwicklung?.projekte || []).find((p) => p.titel === "Solarpark Mühlweg (Demo)");
  const c = {
    id: neueId("PO"), ...basis, art: "codev", status: "entwicklung", titel: "Solarpark Mühlweg (Demo)", typ: "freiflaeche", land: "DE", bundesland: "Bayern", mwp: ep?.mwp || 16.5,
    spvName: "Demo Mühlweg Projektentwicklung GmbH & Co. KG (fiktiv)", anteilProzent: 50, struktur: "share", kaufpreis: 0, kaufdatum: vorTagen(60).slice(0, 10), inbetriebnahme: "",
    zusage: 1200000, p50KwhJahr: null, verguetungCt: null, opexJahr: null, schuldendienstJahr: null, entwicklungId: ep?.id || null,
  };
  P(db).positionen.push(c);
  verlauf(c, SYSTEM, "Co-Development-Vereinbarung unterzeichnet: Zusage 1.200.000 €, Abrufe nach Meilensteinen (Demo).", true);
  const ab = (nr, betrag, zweck, meilenstein, angekuendigt, faellig, status, bezahlt = "") => P(db).abrufe.push({ id: neueId("CC"), positionId: c.id, nummer: nr, betrag, zweck, meilenstein, angekuendigtAm: angekuendigt, faelligAm: faellig, status, bezahltAm: bezahlt, gemeldetAm: bezahlt, referenz: "", vonId: admin?.id || null, erinnert: {} });
  ab(1, 250000, "Flächensicherung und Planungskosten Bebauungsplan", "Aufstellungsbeschluss", vorTagen(58).slice(0, 10), vorTagen(44).slice(0, 10), "bezahlt", vorTagen(46).slice(0, 10));
  ab(2, 180000, "Gutachten (Artenschutz, Blendung, Boden)", "Gutachten", vorTagen(30).slice(0, 10), vorTagen(16).slice(0, 10), "bezahlt", vorTagen(17).slice(0, 10));
  ab(3, 220000, "Anzahlung Netzanschluss (Baukostenzuschuss)", "Netzanschlusszusage", plusTage(h, -2), plusTage(h, 14), "angekuendigt");
}
const sollM = (pos, m) => sollMonat(pos, m) || 0;

export const _test = { SCHEMA, kurz };
