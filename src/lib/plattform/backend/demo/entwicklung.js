// src/lib/plattform/backend/demo/entwicklung.js
//
// Projektentwicklung im Demo-Backend – Referenz für plattform/api/entwicklung.py (Vertrag: docs/API.md, Abschnitt 11).
// Internes Entwicklungsmanagement: Entwicklungsprojekt mit Projektflächen, Meilenstein-Plan nach Vorlage (Land × Typ)
// mit Soll/Ist, Abhängigkeiten, Dokumentenpflicht und Gutachter-Zuweisung, Risikoregister, Behörden-/Stakeholder-Kontakte
// (CRM), Entscheidungsprotokoll, Budget/Ist, Pipeline-Wert, Übergabe an Börse bzw. Bau/Betrieb.
//
// Daten unter db.entwicklung (eigene Sammlung, beim ersten Zugriff einmalig mit Demo-Daten ergänzt – entwicklung-seed.js).
//
// Rechte (jede Operation prüft Rolle UND Eigentum selbst):
//   Backoffice      – Rolle admin mit Bereich „entwicklung“ (rechte.js): lesen ≥ 1 sieht alles, schreiben = 2 pflegt
//                     (Unterrollen leitung, projektleitung; akquise/transaktion/buchhaltung/lesen nur lesen)
//   Eigentümer      – Konto (oder Team) einer verknüpften Plattform-Fläche: nur vereinfachter Fortschritt (Meilensteine mit
//                     externem Titel, Quartal statt Datum), eigene Flächen – keine Risiken, Kosten, Namen, Notizen
//   Co-Investor     – Freigabe je Projekt (Konto oder Organisation, Rolle investor): Fortschritt, Termine, freigegebene
//                     Risiken (Kennzeichen „extern“) und Dokumente – Freigabe und Zugriff nur mit verifiziertem KYC/KYB
//                     (kycRegeln, Schritt „codevelopment“), sonst 409 (Code „kyc“)
//   Gutachter       – Rolle gutachter UND Zuweisung am Meilenstein: nur die zugewiesenen Meilensteine, eigene Rückfragen,
//                     Upload von Gutachten; kann „in Arbeit“/„eingereicht“ melden, nie erledigen
//   sonst           – 403 (Seiten: 404)

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { LAENDER, BUNDESLAENDER, UPLOAD } from "../../konstanten";
import {
  BUDGET_KATEGORIEN, ENTSCHEIDUNG_ARTEN, GUTACHTER_FACHGEBIETE, GUTACHTER_QUALIFIKATION, ENTWICKLUNG_OFFEN, ENTWICKLUNG_STATUS, ENTWICKLUNG_TYPEN, KATEGORIEN, KONTAKT_ROLLEN_ENTWICKLUNG,
  MEILENSTEIN_FERTIG, MEILENSTEIN_STATUS, PACHT_GESICHERT, PACHT_STATUS, RISIKO_KATEGORIEN, RISIKO_STATUS, VERMARKTUNG, ZIEL_MWP_JAHR,
  erzeugtKreis, heuteIso, istUeberfaellig, kritischerPfad, mwpAusFlaeche, offeneVorgaenger, phaseAusMeilensteinen, phaseLabel, pipelineWert,
  planBerechnen, planMonate, plusMonate, quartal, risikoAmpel, risikoScore, tageZwischen, verzugTage, vermarktungLabel, vorlage,
} from "../../entwicklung";
import { PHASEN } from "@/lib/invest/markt";
import { intern } from "../demo";
import { aendern, lesen, uploadLesen, uploadSchreiben } from "./speicher";
import { jetzt, neueId, sha256, slugify, zufallsToken } from "./hilfen";
import { teamRolle, darfTeamLesenObjekt } from "./teams";
import { entwicklungSeed } from "./entwicklung-seed";
import * as anlagenDemo from "./anlagen";

import { internSicherheit } from "./sicherheitWerkzeuge";
import { kycFreigabeDb, kycSperre } from "./kycRegeln"; // KYC/KYB: Co-Development nur mit verifiziertem Investor

const { benachrichtigen, protokoll, nutzerById, nameVon } = intern;
const postausgangAnlegen = (...a) => internSicherheit.postausgangAnlegen(...a);

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const boLesen = (n) => istAdmin(n) && darfLesen(n, "entwicklung");
const boSchreiben = (n) => istAdmin(n) && darfSchreiben(n, "entwicklung");
const EINLADUNG_TAGE = 14;

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function leseNoetig(n) {
  angemeldet(n);
  if (!boLesen(n)) throw verboten("Nur für das Backoffice (Projektentwicklung).");
}
function schreibNoetig(n) {
  angemeldet(n);
  if (!boSchreiben(n)) throw verboten(istAdmin(n) ? "Ihre Backoffice-Rolle erlaubt im Bereich „Projektentwicklung“ kein Schreiben." : "Nur für das Backoffice (Projektentwicklung).");
}

// ================================================================ Datenbestand

function leer() {
  return { v: 1, projekte: [], flaechen: [], meilensteine: [], risiken: [], entscheidungen: [], budget: [], dokumente: [], rueckfragen: [], einladungen: [], gutachterProfile: [], fristenGeprueftAm: null };
}

async function lesenBereit() {
  const db = await lesen();
  if (db.entwicklung?.v) return db;
  await aendern(async (d) => {
    if (d.entwicklung?.v) return;
    d.entwicklung = leer();
    try {
      await entwicklungSeed(d);
    } catch (e) {
      console.warn("[plattform-demo] Entwicklungs-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}

async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}

const E = (db) => db.entwicklung;
const ms = (db, pid) => E(db).meilensteine.filter((m) => m.projektId === pid).sort((a, b) => (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0));
const plattformFlaeche = (db, id) => (id ? db.flaechen.find((f) => f.id === id) || null : null);

// ================================================================ Gutachter-Profil (Fachgebiete, Qualifikation)

function profilDaten(d = {}) {
  return {
    fachgebiete: v.mehrfach(Array.isArray(d.fachgebiete) ? d.fachgebiete : [], GUTACHTER_FACHGEBIETE),
    qualifikation: v.auswahl(d.qualifikation, GUTACHTER_QUALIFIKATION, ""),
    buero: v.text(d.buero, 160),
    nachweis: v.text(d.nachweis, 300),
  };
}

function profilVon(db, nutzerId) {
  return (E(db).gutachterProfile || []).find((x) => x.nutzerId === nutzerId) || null;
}

function profilAusgabe(db, nutzerId) {
  const x = profilVon(db, nutzerId);
  return {
    nutzerId, ...(personKurz(db, nutzerId) || {}),
    fachgebiete: x?.fachgebiete || [], fachgebieteLabel: (x?.fachgebiete || []).map((f) => GUTACHTER_FACHGEBIETE[f] || f),
    qualifikation: x?.qualifikation || "", qualifikationLabel: GUTACHTER_QUALIFIKATION[x?.qualifikation] || "", buero: x?.buero || "", nachweis: x?.nachweis || "",
  };
}

function profilSetzen(db, nutzerId, d) {
  E(db).gutachterProfile ||= [];
  const neu = profilDaten(d);
  const alt = profilVon(db, nutzerId);
  if (alt) Object.assign(alt, Object.fromEntries(Object.entries(neu).filter(([k, w]) => Object.hasOwn(d, k) || (Array.isArray(w) ? w.length : w))), { geaendertAm: jetzt() });
  else E(db).gutachterProfile.push({ nutzerId, ...neu, geaendertAm: jetzt() });
}

// ================================================================ Zugriff

/** Eigentümer (bzw. Team) einer verknüpften Plattform-Fläche? */
function istEigentuemer(db, n, p) {
  return E(db).flaechen.some((pf) => {
    if (pf.projektId !== p.id || !pf.flaecheId) return false;
    const f = plattformFlaeche(db, pf.flaecheId);
    return !!f && (f.nutzerId === n.id || darfTeamLesenObjekt(db, n, f));
  });
}

/** Co-Development-Freigabe des Kontos bzw. seiner Organisation (ohne KYC-Prüfung) */
function freigabeRoh(db, n, p) {
  if (!n?.rollen?.includes("investor")) return null;
  return (p.freigaben || []).find((fg) => (fg.nutzerId && fg.nutzerId === n.id) || (fg.organisationId && teamRolle(db, n.id, fg.organisationId))) || null;
}

/** KYC-Ziel des zugreifenden Investors: eigener Fall bzw. KYB der freigegebenen (oder aktiven) Organisation */
const kycZiel = (n, fg) => ({ kontoId: n.id, organisationId: fg?.organisationId || n.organisation?.id || null });

/** Wirksame Freigabe: nur mit verifiziertem KYC/KYB (Schritt „codevelopment“) */
function freigabeFuer(db, n, p) {
  const fg = freigabeRoh(db, n, p);
  return fg && kycFreigabeDb(db, "codevelopment", kycZiel(n, fg)).ok ? fg : null;
}

function gutachterMeilensteine(db, n, p) {
  if (!n?.rollen?.includes("gutachter")) return [];
  return ms(db, p.id).filter((m) => (m.gutachterIds || []).includes(n.id));
}

/** Zugriffe des Nutzers auf ein Projekt: { backoffice, eigentuemer, investor (Freigabe|null), gutachter [Meilensteine] } */
function zugriffe(db, n, p) {
  if (!n || !p) return null;
  const fg = freigabeRoh(db, n, p);
  const kyc = fg ? kycFreigabeDb(db, "codevelopment", kycZiel(n, fg)) : null;
  const z = { backoffice: boLesen(n), eigentuemer: istEigentuemer(db, n, p), investor: kyc?.ok ? fg : null, investorKyc: kyc && !kyc.ok ? kyc : null, gutachter: gutachterMeilensteine(db, n, p) };
  z.irgendeiner = z.backoffice || z.eigentuemer || !!z.investor || z.gutachter.length > 0;
  return z;
}

function projektLaden(db, id) {
  const p = E(db).projekte.find((x) => x.id === v.kennung(id));
  if (!p) throw nichtGefunden("Entwicklungsprojekt nicht gefunden.");
  return p;
}

function projektIntern(db, n, id) {
  leseNoetig(n);
  return projektLaden(db, id);
}

// ================================================================ Berechnungen

/** Plan, kritischer Pfad, Phase, Pipeline, Fortschritt, Verzug eines Projekts */
function kennzahlen(db, p, heute = heuteIso()) {
  const liste = ms(db, p.id);
  const kp = kritischerPfad(liste, { heute });
  const phase = phaseAusMeilensteinen(liste);
  const flaechen = E(db).flaechen.filter((pf) => pf.projektId === p.id);
  const aktiv = liste.filter((m) => m.status !== "entfaellt");
  const erledigt = aktiv.filter((m) => m.status === "erledigt").length;
  const ueberfaellig = liste.filter((m) => istUeberfaellig(m, heute));
  const cod = liste.find((m) => m.phase === "cod");
  const prognoseCod = cod ? kp.je.get(cod.id)?.prognoseEnde || cod.sollEnde : kp.projektEnde;
  const codVerzugMonate = p.zielCod && prognoseCod ? Math.max(0, Math.round(tageZwischen(p.zielCod.length === 4 ? `${p.zielCod}-12-01` : `${p.zielCod}-01`, prognoseCod) / 30.4)) : 0;
  const budget = E(db).budget.filter((b) => b.projektId === p.id);
  const risiken = E(db).risiken.filter((r) => r.projektId === p.id && !["geschlossen"].includes(r.status));
  const naechste = liste.filter((m) => !MEILENSTEIN_FERTIG.includes(m.status)).sort((a, b) => String(a.sollEnde).localeCompare(String(b.sollEnde)))[0] || null;
  return {
    phase,
    phaseLabel: phaseLabel(phase),
    pipeline: pipelineWert({ mwp: p.typ === "speicher" ? p.mwp || (p.mwh || 0) / 2 : p.mwp, phase, wahrscheinlichkeit: p.wahrscheinlichkeit }),
    fortschritt: aktiv.length ? Math.round((erledigt / aktiv.length) * 100) : 0,
    meilensteine: { gesamt: aktiv.length, erledigt, ueberfaellig: ueberfaellig.length, kritischUeberfaellig: ueberfaellig.filter((m) => kp.je.get(m.id)?.kritisch).length },
    prognoseCod,
    codVerzugMonate,
    flaecheHa: Math.round(flaechen.reduce((s, f) => s + (Number(f.ha) || 0), 0) * 10) / 10,
    flaecheGesichertHa: Math.round(flaechen.filter((f) => PACHT_GESICHERT.includes(f.pachtStatus)).reduce((s, f) => s + (Number(f.ha) || 0), 0) * 10) / 10,
    budgetPlan: budget.reduce((s, b) => s + (Number(b.planEur) || 0), 0),
    budgetIst: budget.reduce((s, b) => s + (Number(b.istEur) || 0), 0),
    risikoMax: risiken.reduce((m, r) => Math.max(m, risikoScore(r)), 0),
    risikenOffen: risiken.length,
    naechsterMeilenstein: naechste ? { id: naechste.id, titel: naechste.titel, sollEnde: naechste.sollEnde } : null,
    kp,
  };
}

// ================================================================ Ausgabe (Backoffice)

const personKurz = (db, id) => {
  const u = id ? nutzerById(db, id) : null;
  return u ? { id: u.id, name: nameVon(db, u.id), email: u.email } : null;
};

function meilensteinAusgabe(db, m, kp, heute) {
  const k = kp?.je.get(m.id);
  const doks = E(db).dokumente.filter((d) => d.meilensteinId === m.id);
  return {
    ...m,
    statusLabel: MEILENSTEIN_STATUS[m.status]?.label || m.status,
    kategorieLabel: KATEGORIEN[m.kategorie]?.label || m.kategorie,
    verantwortlich: personKurz(db, m.verantwortlichId),
    gutachter: (m.gutachterIds || []).map((g) => personKurz(db, g)).filter(Boolean),
    verzugTage: verzugTage(m, heute),
    ueberfaellig: istUeberfaellig(m, heute),
    kritisch: !!k?.kritisch,
    puffer: k?.puffer ?? null,
    prognoseStart: k?.prognoseStart || m.sollStart,
    prognoseEnde: k?.prognoseEnde || m.sollEnde,
    dokumente: doks.length,
    pflichtErfuellt: (m.dokumentPflicht || []).map((pf) => ({ name: pf, erfuellt: doks.some((d) => d.pflicht === pf) })),
    rueckfragen: E(db).rueckfragen.filter((r) => r.meilensteinId === m.id).length,
  };
}

function projektKurz(db, p, heute = heuteIso()) {
  const k = kennzahlen(db, p, heute);
  const { kp, ...rest } = k;
  return {
    id: p.id, titel: p.titel, typ: p.typ, typLabel: ENTWICKLUNG_TYPEN[p.typ] || p.typ, land: p.land, bundesland: p.bundesland, gemeinde: p.gemeinde || "",
    mwp: p.mwp, mwh: p.mwh, status: p.status, statusLabel: ENTWICKLUNG_STATUS[p.status]?.label || p.status, zielCod: p.zielCod || "",
    vermarktung: p.vermarktung, vermarktungLabel: vermarktungLabel(p.vermarktung, p.land), projektleiter: personKurz(db, p.projektleiterId),
    boerseProjektId: p.boerseProjektId || null, anlageId: p.anlageId || null, erstelltAm: p.erstelltAm, geaendertAm: p.geaendertAm,
    ...rest,
  };
}

function projektAusgabe(db, n, p) {
  const heute = heuteIso();
  const k = kennzahlen(db, p, heute);
  const crm = db.bo?.kontakte || [];
  const liste = ms(db, p.id);
  return {
    ...projektKurz(db, p, heute),
    beschreibung: p.beschreibung || "", nvp: p.nvp || "", netzbetreiber: p.netzbetreiber || "", landkreis: p.landkreis || "", start: p.start,
    wahrscheinlichkeit: p.wahrscheinlichkeit ?? null, erpProjekt: p.erpProjekt || null,
    projektEnde: k.kp.projektEnde,
    flaechen: E(db).flaechen.filter((pf) => pf.projektId === p.id).map((pf) => {
      const f = plattformFlaeche(db, pf.flaecheId);
      return { ...pf, pachtStatusLabel: PACHT_STATUS[pf.pachtStatus]?.label || pf.pachtStatus, plattformFlaeche: f ? { id: f.id, bezeichnung: f.bezeichnung, status: f.status } : null, eigentuemerKonto: personKurz(db, f?.nutzerId) };
    }),
    meilensteine: liste.map((m) => meilensteinAusgabe(db, m, k.kp, heute)),
    risiken: E(db).risiken.filter((r) => r.projektId === p.id).map((r) => ({ ...r, score: risikoScore(r), ampel: risikoAmpel(risikoScore(r)), kategorieLabel: RISIKO_KATEGORIEN[r.kategorie] || r.kategorie, statusLabel: RISIKO_STATUS[r.status] || r.status, verantwortlich: personKurz(db, r.verantwortlichId) })).sort((a, b) => b.score - a.score),
    entscheidungen: E(db).entscheidungen.filter((x) => x.projektId === p.id).map((x) => ({ ...x, artLabel: ENTSCHEIDUNG_ARTEN[x.art] || x.art, von: personKurz(db, x.vonId) })).sort((a, b) => String(b.datum).localeCompare(String(a.datum))),
    budget: E(db).budget.filter((b) => b.projektId === p.id).map((b) => ({ ...b, kategorieLabel: BUDGET_KATEGORIEN[b.kategorie] || b.kategorie })),
    kontakte: (p.kontakte || []).map((kt) => {
      const c = crm.find((x) => x.id === kt.kontaktId);
      return { ...kt, rolleLabel: KONTAKT_ROLLEN_ENTWICKLUNG[kt.rolle] || kt.rolle, kontakt: c ? { id: c.id, name: [c.titel, c.vorname, c.nachname].filter(Boolean).join(" "), firma: c.firma || "", funktion: c.funktion || "", email: c.email || "", telefon: c.telefon || "" } : null };
    }),
    freigaben: (p.freigaben || []).map((fg) => ({ ...fg, nutzer: personKurz(db, fg.nutzerId), organisation: fg.organisationId ? { id: fg.organisationId, name: (db.organisationen || []).find((o) => o.id === fg.organisationId)?.name || "" } : null })),
    dokumente: E(db).dokumente.filter((d) => d.projektId === p.id).map((d) => dokumentAusgabe(db, d)),
    rueckfragen: E(db).rueckfragen.filter((r) => r.projektId === p.id).map((r) => ({ ...r, von: personKurz(db, r.vonId) })),
    einladungen: E(db).einladungen.filter((x) => x.projektId === p.id).map(({ hash: _h, ...x }) => x),
    gutachterProfile: [...new Set(liste.flatMap((m) => m.gutachterIds || []))].map((g) => profilAusgabe(db, g)),
    darfBearbeiten: boSchreiben(n),
  };
}

function dokumentAusgabe(db, d) {
  const { datei: _d, ...rest } = d;
  return { ...rest, von: personKurz(db, d.vonId)?.name || "", link: `/api/portal/entwicklung/dokumente/${d.id}` };
}

// ================================================================ Portfolio (Backoffice)

export async function entwicklungPortfolio(n, { q = "", status = "" } = {}) {
  leseNoetig(n);
  await fristenLazy(n);
  const db = await lesenBereit();
  const heute = heuteIso();
  const such = v.text(q, 80).toLowerCase();
  const alle = E(db).projekte
    .filter((p) => !status || p.status === status)
    .filter((p) => !such || [p.titel, p.gemeinde, p.bundesland, p.id].join(" ").toLowerCase().includes(such));
  const projekte = alle.map((p) => projektKurz(db, p, heute));
  const offen = projekte.filter((p) => ENTWICKLUNG_OFFEN.includes(p.status));

  const jePhase = [{ id: null, label: "Akquise" }, ...PHASEN.map((x) => ({ id: x.id, label: x.kurz }))].map((ph) => {
    const t = offen.filter((p) => (p.phase || null) === ph.id);
    return { phase: ph.id, label: ph.label, anzahl: t.length, mwp: runde(t.reduce((s, p) => s + (p.mwp || 0), 0)), wert: t.reduce((s, p) => s + p.pipeline.wert, 0) };
  });
  const jeLand = Object.keys(LAENDER).map((l) => {
    const t = offen.filter((p) => p.land === l);
    return { land: l, label: LAENDER[l], anzahl: t.length, mwp: runde(t.reduce((s, p) => s + (p.mwp || 0), 0)), wert: t.reduce((s, p) => s + p.pipeline.wert, 0) };
  });
  const jahre = new Map();
  for (const p of projekte.filter((x) => x.status !== "abgebrochen")) {
    const j = Number(String(p.prognoseCod || p.zielCod || "").slice(0, 4));
    if (!j) continue;
    const e = jahre.get(j) || { jahr: j, mwp: 0, mwpGewichtet: 0, anzahl: 0 };
    e.mwp = runde(e.mwp + (p.mwp || 0));
    e.mwpGewichtet = runde(e.mwpGewichtet + p.pipeline.gewichtetMwp);
    e.anzahl++;
    jahre.set(j, e);
  }
  const verzug = [];
  const fristen = [];
  const in30 = plusMonate(heute, 1);
  for (const p of E(db).projekte.filter((x) => ENTWICKLUNG_OFFEN.includes(x.status))) {
    const kp = kritischerPfad(ms(db, p.id), { heute });
    for (const m of ms(db, p.id)) {
      if (MEILENSTEIN_FERTIG.includes(m.status)) continue;
      const eintrag = { projektId: p.id, projektTitel: p.titel, meilensteinId: m.id, titel: m.titel, sollEnde: m.sollEnde, status: m.status, kritisch: !!kp.je.get(m.id)?.kritisch, verantwortlich: personKurz(db, m.verantwortlichId || p.projektleiterId) };
      if (istUeberfaellig(m, heute)) verzug.push({ ...eintrag, tage: verzugTage(m, heute) });
      else if (m.sollEnde && m.sollEnde <= in30) fristen.push({ ...eintrag, inTagen: tageZwischen(heute, m.sollEnde) });
    }
  }
  verzug.sort((a, b) => Number(b.kritisch) - Number(a.kritisch) || b.tage - a.tage);
  fristen.sort((a, b) => String(a.sollEnde).localeCompare(String(b.sollEnde)));
  const leiter = db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin") && darfSchreiben(u, "entwicklung"));
  const auslastung = leiter
    .map((u) => {
      const eigene = E(db).projekte.filter((p) => p.projektleiterId === u.id && ENTWICKLUNG_OFFEN.includes(p.status));
      const offeneMs = E(db).meilensteine.filter((m) => !MEILENSTEIN_FERTIG.includes(m.status) && (m.verantwortlichId === u.id || (!m.verantwortlichId && eigene.some((p) => p.id === m.projektId))));
      return {
        id: u.id, name: nameVon(db, u.id), projekte: eigene.length, mwp: runde(eigene.reduce((s, p) => s + (p.mwp || 0), 0)),
        offeneMeilensteine: offeneMs.length, ueberfaellig: offeneMs.filter((m) => istUeberfaellig(m, heute)).length, faellig30: offeneMs.filter((m) => m.sollEnde && m.sollEnde >= heute && m.sollEnde <= in30).length,
      };
    })
    .filter((a) => a.projekte || a.offeneMeilensteine)
    .sort((a, b) => b.offeneMeilensteine - a.offeneMeilensteine);
  return {
    projekte,
    summen: {
      anzahl: offen.length,
      mwp: runde(offen.reduce((s, p) => s + (p.mwp || 0), 0)),
      mwpGewichtet: runde(offen.reduce((s, p) => s + p.pipeline.gewichtetMwp, 0)),
      volumen: offen.reduce((s, p) => s + p.pipeline.volumen, 0),
      wert: offen.reduce((s, p) => s + p.pipeline.wert, 0),
      jePhase, jeLand, jeJahr: [...jahre.values()].sort((a, b) => a.jahr - b.jahr), zielMwpJahr: ZIEL_MWP_JAHR,
    },
    verzug, fristen, auslastung,
    darfBearbeiten: boSchreiben(n),
  };
}

const runde = (x) => Math.round((Number(x) || 0) * 100) / 100;

export async function entwicklungProjekt(n, id) {
  const db = await lesenBereit();
  const p = projektIntern(db, n, id);
  return projektAusgabe(db, n, p);
}

/** Auswahllisten für Formulare (Backoffice) */
export async function entwicklungAuswahl(n) {
  leseNoetig(n);
  const db = await lesenBereit();
  return {
    projektleiter: db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin") && darfSchreiben(u, "entwicklung")).map((u) => ({ id: u.id, name: nameVon(db, u.id) })),
    flaechen: db.flaechen.filter((f) => !["abgelehnt", "entwurf"].includes(f.status)).map((f) => ({ id: f.id, bezeichnung: f.bezeichnung, land: f.land, bundesland: f.bundesland, ort: f.ort, ha: f.ha, agri: !!f.agri, status: f.status, eigentuemer: nameVon(db, f.nutzerId) || "ohne Konto", verknuepft: E(db).flaechen.some((pf) => pf.flaecheId === f.id) })),
    kontakte: (db.bo?.kontakte || []).map((c) => ({ id: c.id, name: [c.vorname, c.nachname].filter(Boolean).join(" ") || c.firma, firma: c.firma || "", rollen: c.rollen || [] })).sort((a, b) => a.name.localeCompare(b.name, "de")),
    investoren: db.nutzer.filter((u) => u.aktiv && u.rollen.includes("investor")).map((u) => ({ id: u.id, name: nameVon(db, u.id), firma: u.firma || "" })),
    organisationen: (db.organisationen || []).map((o) => ({ id: o.id, name: o.name })),
    gutachter: db.nutzer.filter((u) => u.aktiv && u.rollen.includes("gutachter")).map((u) => ({ ...profilAusgabe(db, u.id), id: u.id, name: nameVon(db, u.id), firma: u.firma || "", email: u.email })),
  };
}

// ================================================================ Anlegen & Stammdaten

function stammdaten(d, alt = {}) {
  const has = (k) => Object.hasOwn(d, k);
  const f = {};
  if (has("titel") || !alt.id) f.titel = v.text(d.titel, 120);
  if (has("typ") || !alt.id) f.typ = v.auswahl(d.typ, ENTWICKLUNG_TYPEN, alt.typ || "freiflaeche");
  if (has("land") || !alt.id) f.land = v.auswahl(d.land, LAENDER, alt.land || "DE");
  const land = f.land || alt.land;
  if (has("bundesland") || !alt.id) f.bundesland = v.auswahl(d.bundesland, BUNDESLAENDER[land] || [], "");
  for (const k of ["gemeinde", "landkreis", "nvp", "netzbetreiber"]) if (has(k)) f[k] = v.text(d[k], 160);
  if (has("mwp")) f.mwp = v.zahl(d.mwp, { min: 0, max: 5000, stellen: 2 }) ?? 0;
  if (has("mwh")) f.mwh = v.zahl(d.mwh, { min: 0, max: 20000, stellen: 1 }) ?? 0;
  if (has("zielCod")) f.zielCod = v.monat(d.zielCod) || "";
  if (has("vermarktung") || !alt.id) f.vermarktung = v.auswahl(d.vermarktung, VERMARKTUNG, alt.vermarktung || "eeg");
  if (has("status")) f.status = v.auswahl(d.status, ENTWICKLUNG_STATUS, alt.status || "aktiv");
  if (has("beschreibung")) f.beschreibung = v.mehrzeilig(d.beschreibung, 4000);
  if (has("wahrscheinlichkeit")) f.wahrscheinlichkeit = d.wahrscheinlichkeit === null || d.wahrscheinlichkeit === "" ? null : v.zahl(d.wahrscheinlichkeit, { min: 0, max: 1, stellen: 2 });
  if (has("start")) f.start = /^20\d\d-\d\d-\d\d$/.test(String(d.start || "")) ? d.start : alt.start || heuteIso();
  const neu = { ...alt, ...f };
  v.pflicht(neu.titel?.length >= 3, "Bitte geben Sie einen Projekttitel an (mind. 3 Zeichen).");
  v.pflicht(!!neu.bundesland, "Bitte wählen Sie Bundesland bzw. Kanton.");
  if (neu.typ === "speicher") v.pflicht((neu.mwh || 0) > 0 || (neu.mwp || 0) > 0, "Bitte geben Sie Leistung (MW) oder Kapazität (MWh) des Speichers an.");
  else v.pflicht((neu.mwp || 0) > 0, "Bitte geben Sie die geplante Leistung in MWp an.");
  return neu;
}

function projektleiterPruefen(db, id) {
  const k = v.kennung(id);
  if (!k) return null;
  const u = nutzerById(db, k);
  if (!u || !u.rollen.includes("admin") || !darfSchreiben(u, "entwicklung")) throw ungueltig("Projektleitung: Konto mit Schreibrecht „Projektentwicklung“ wählen.");
  return u.id;
}

/** Meilensteine nach Vorlage anlegen und terminieren */
function planAnlegen(db, p, n) {
  const schritte = vorlage(p.land, p.typ);
  const idVon = new Map(schritte.map((s) => [s.schluessel, neueId("MS")]));
  const liste = schritte.map((s, i) => ({
    id: idVon.get(s.schluessel), projektId: p.id, schluessel: s.schluessel, titel: s.titel, kategorie: s.kategorie, dauerMonate: s.dauerMonate,
    nach: s.nach.map((x) => idVon.get(x)).filter(Boolean), phase: s.phase, dokumentPflicht: s.dokumentPflicht, externTitel: s.externTitel, gutachten: s.gutachten,
    status: "offen", sollStart: null, sollEnde: null, sollFix: false, istStart: null, istEnde: null, verantwortlichId: null, gutachterIds: [], notiz: "",
    eingereichtAm: null, nachweisVerzicht: "", erinnert: {}, reihenfolge: i,
  }));
  const geplant = planBerechnen(liste, { start: p.start || heuteIso() });
  E(db).meilensteine.push(...geplant);
  if (!p.zielCod) {
    const cod = geplant.find((m) => m.phase === "cod");
    p.zielCod = (cod?.sollEnde || plusMonate(p.start, planMonate(schritte))).slice(0, 7);
  }
  protokoll(db, n, "entwicklung_plan", "entwicklung", p.id, `Meilenstein-Plan nach Vorlage ${p.land}/${ENTWICKLUNG_TYPEN[p.typ]} angelegt (${geplant.length} Meilensteine)`);
}

function pachtAusFlaeche(f) {
  if (!f) return "angefragt";
  if (["vertrag", "planung", "bau", "betrieb"].includes(f.status)) return "pachtvertrag";
  if (f.status === "pachtangebot") return "verhandlung";
  return "angefragt";
}

export async function entwicklungAnlegen(n, daten = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const t = jetzt();
    const f = daten.flaecheId ? plattformFlaeche(db, v.kennung(daten.flaecheId)) : null;
    if (daten.flaecheId && !f) throw ungueltig("Fläche nicht gefunden.");
    const vorschlag = f ? vorschlagAusFlaeche(f) : {};
    const p = stammdaten({ ...vorschlag, ...daten, start: daten.start || heuteIso() }, {});
    p.id = neueId("EP");
    p.status = "aktiv";
    p.projektleiterId = projektleiterPruefen(db, daten.projektleiterId) || (boSchreiben(n) ? n.id : null);
    p.kontakte = [];
    p.freigaben = [];
    p.boerseProjektId = null;
    p.anlageId = null;
    p.erpProjekt = null;
    p.erstelltVon = n.id;
    p.erstelltAm = t;
    p.geaendertAm = t;
    E(db).projekte.push(p);
    if (f) {
      if (E(db).flaechen.some((pf) => pf.flaecheId === f.id)) throw konflikt("Diese Fläche ist bereits einem Entwicklungsprojekt zugeordnet.");
      E(db).flaechen.push({ id: neueId("PF"), projektId: p.id, flaecheId: f.id, bezeichnung: f.bezeichnung, eigentuemerName: nameVon(db, f.nutzerId) || "", ha: f.ha || 0, pachtStatus: pachtAusFlaeche(f), pachtBeginn: "", pachtEnde: "", pachtEurHa: null, notiz: "" });
    }
    if (daten.mitVorlage !== false) planAnlegen(db, p, n);
    protokoll(db, n, "entwicklung_angelegt", "entwicklung", p.id, `Entwicklungsprojekt angelegt: ${p.titel}${f ? ` (aus Fläche ${f.id})` : ""}`);
    return projektAusgabe(db, n, p);
  });
}

export async function entwicklungAendern(n, id, daten = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const p = projektLaden(db, id);
    const { id: _i, ...rest } = daten || {};
    const alt = { ...p };
    const neu = stammdaten(rest, p);
    if (Object.hasOwn(rest, "projektleiterId")) neu.projektleiterId = projektleiterPruefen(db, rest.projektleiterId);
    if (neu.status !== alt.status && ["boerse", "bau"].includes(neu.status)) throw konflikt("Übergaben bitte über „Übergabe an Börse“ bzw. „Übergabe an Bau/Betrieb“.");
    Object.assign(p, neu, { geaendertAm: jetzt() });
    if (neu.status !== alt.status) {
      E(db).entscheidungen.push({ id: neueId("EN"), projektId: p.id, datum: heuteIso(), titel: `Status: ${ENTWICKLUNG_STATUS[neu.status]?.label}`, art: neu.status === "abgebrochen" ? "nogo" : "strategie", beschluss: `Projektstatus von „${ENTWICKLUNG_STATUS[alt.status]?.label}“ auf „${ENTWICKLUNG_STATUS[neu.status]?.label}“ gesetzt.`, begruendung: v.mehrzeilig(rest.begruendung, 2000), beteiligte: "", vonId: n.id, am: jetzt() });
    }
    if (neu.land !== alt.land || neu.typ !== alt.typ) {
      protokoll(db, n, "entwicklung_hinweis", "entwicklung", p.id, "Land oder Typ geändert – Meilenstein-Plan bleibt bestehen (bei Bedarf neu aus Vorlage)");
    }
    const felder = Object.keys(rest).filter((k) => JSON.stringify(alt[k]) !== JSON.stringify(p[k]));
    protokoll(db, n, "entwicklung_geaendert", "entwicklung", p.id, felder.length ? `Stammdaten geändert: ${felder.join(", ")}`.slice(0, 280) : "Gespeichert (ohne Änderung)");
    return projektAusgabe(db, n, p);
  });
}

// ================================================================ Einträge (Flächen, Meilensteine, Risiken, …)

const datumOk = (s) => (/^20\d\d-\d\d-\d\d$/.test(String(s || "")) ? String(s) : null);

function meilensteinSpeichern(db, n, p, id, d) {
  const liste = ms(db, p.id);
  const alt = id ? liste.find((m) => m.id === id) : null;
  if (id && !alt) throw nichtGefunden("Meilenstein nicht gefunden.");
  const has = (k) => Object.hasOwn(d, k);
  const m = alt ? { ...alt } : {
    id: neueId("MS"), projektId: p.id, schluessel: "eigen", titel: "", kategorie: "gemeinde", dauerMonate: 1, nach: [], phase: null, dokumentPflicht: [], externTitel: "", gutachten: false,
    status: "offen", sollStart: null, sollEnde: null, sollFix: false, istStart: null, istEnde: null, verantwortlichId: null, gutachterIds: [], notiz: "", eingereichtAm: null, nachweisVerzicht: "", erinnert: {}, reihenfolge: liste.length,
  };
  if (has("titel") || !alt) m.titel = v.text(d.titel, 160);
  v.pflicht(m.titel.length >= 3, "Bitte geben Sie einen Titel an.");
  if (has("kategorie")) m.kategorie = v.auswahl(d.kategorie, KATEGORIEN, m.kategorie);
  if (has("dauerMonate")) m.dauerMonate = v.zahl(d.dauerMonate, { min: 0.25, max: 60, stellen: 2 }) ?? m.dauerMonate;
  if (has("externTitel")) m.externTitel = v.text(d.externTitel, 120);
  if (has("notiz")) m.notiz = v.mehrzeilig(d.notiz, 3000);
  if (has("phase")) m.phase = v.auswahl(d.phase, PHASEN.map((x) => x.id), "") || null;
  if (has("dokumentPflicht")) m.dokumentPflicht = v.textListe(d.dokumentPflicht, { max: 8, laenge: 120 });
  if (has("verantwortlichId")) {
    const k = v.kennung(d.verantwortlichId);
    const u = k ? nutzerById(db, k) : null;
    if (k && (!u || !u.rollen.includes("admin"))) throw ungueltig("Verantwortlich kann nur ein Backoffice-Konto sein.");
    m.verantwortlichId = u?.id || null;
  }
  const neueGutachter = [];
  if (has("gutachterIds")) {
    const ids = (Array.isArray(d.gutachterIds) ? d.gutachterIds : []).map(v.kennung).filter(Boolean).slice(0, 10);
    for (const g of ids) {
      const u = nutzerById(db, g);
      if (!u || !u.rollen.includes("gutachter")) throw ungueltig("Zuweisen lassen sich nur Konten mit der Rolle Gutachter/Planer (Einladung nutzen).");
    }
    for (const g of ids) if (!(m.gutachterIds || []).includes(g)) neueGutachter.push(g);
    m.gutachterIds = [...new Set(ids)];
  }
  if (has("nach")) {
    const vorg = (Array.isArray(d.nach) ? d.nach : []).map(v.kennung).filter(Boolean);
    for (const x of vorg) if (!liste.some((y) => y.id === x) || x === m.id) throw ungueltig("Abhängigkeit: unbekannter Meilenstein.");
    if (erzeugtKreis([...liste.filter((y) => y.id !== m.id), m], m.id, vorg)) throw konflikt("Diese Abhängigkeit würde einen Kreis erzeugen.");
    m.nach = [...new Set(vorg)];
  }
  for (const k of ["sollStart", "sollEnde", "istStart", "istEnde"]) if (has(k)) m[k] = datumOk(d[k]);
  if (has("sollStart") || has("sollEnde")) m.sollFix = !!(m.sollStart && m.sollEnde);
  if (m.sollStart && m.sollEnde && m.sollEnde < m.sollStart) throw ungueltig("Das Soll-Ende liegt vor dem Soll-Start.");
  if (m.istStart && m.istEnde && m.istEnde < m.istStart) throw ungueltig("Das Ist-Ende liegt vor dem Ist-Start.");
  if (has("nachweisVerzicht")) m.nachweisVerzicht = v.mehrzeilig(d.nachweisVerzicht, 500);

  const altStatus = alt?.status || "offen";
  if (has("status")) m.status = v.auswahl(d.status, MEILENSTEIN_STATUS, m.status);
  const gesamt = [...liste.filter((y) => y.id !== m.id), m];
  if (m.status === "erledigt" && altStatus !== "erledigt") {
    const offen = offeneVorgaenger(gesamt, m);
    if (offen.length) throw konflikt(`Erst die Vorgänger abschließen: ${offen.map((x) => x.titel).join(", ")}.`);
    const doks = E(db).dokumente.filter((x) => x.meilensteinId === m.id);
    const fehlt = (m.dokumentPflicht || []).filter((pf) => !doks.some((x) => x.pflicht === pf));
    if (fehlt.length && (m.nachweisVerzicht || "").length < 10) {
      throw new PlattformFehler(422, `Dokumentenpflicht: ${fehlt.join(", ")} fehlt. Bitte hochladen oder den Verzicht begründen (mind. 10 Zeichen).`, "dokumentenpflicht");
    }
    m.istEnde ||= heuteIso();
    m.istStart ||= m.sollStart || m.istEnde;
  }
  if (m.status === "in_arbeit" && !m.istStart) m.istStart = heuteIso();
  if (altStatus === "erledigt" && m.status !== "erledigt") {
    const nachfolger = liste.filter((y) => (y.nach || []).includes(m.id) && y.status === "erledigt");
    if (nachfolger.length) throw konflikt(`Nachfolger sind bereits erledigt: ${nachfolger.map((x) => x.titel).join(", ")}.`);
    m.istEnde = null;
  }
  if (!m.sollStart || !m.sollEnde) {
    const [neu] = planBerechnen([...gesamt], { start: p.start || heuteIso(), prognose: false }).filter((x) => x.id === m.id);
    m.sollStart = neu.sollStart;
    m.sollEnde = neu.sollEnde;
  }
  if (alt) Object.assign(alt, m);
  else E(db).meilensteine.push(m);
  const ziel = alt || m;

  // Nachfolger neu terminieren (nicht fixierte), wenn sich Termine/Status geändert haben
  // (ohne Prognose: Soll-Basis bleibt, nur tatsächliche Ist-Termine und geänderte Dauern verschieben Nachfolger)
  const nachher = planBerechnen(ms(db, p.id), { start: p.start || heuteIso(), prognose: false });
  for (const x of nachher) Object.assign(E(db).meilensteine.find((y) => y.id === x.id), { sollStart: x.sollStart, sollEnde: x.sollEnde });

  if (ziel.status === "erledigt" && altStatus !== "erledigt") {
    protokoll(db, n, "meilenstein_erledigt", "entwicklung", p.id, `Meilenstein erledigt: ${ziel.titel}${ziel.nachweisVerzicht && (ziel.dokumentPflicht || []).length ? " (Nachweisverzicht begründet)" : ""}`);
    fortschrittMelden(db, p, ziel);
  } else {
    protokoll(db, n, alt ? "meilenstein_geaendert" : "meilenstein_angelegt", "entwicklung", p.id, `${alt ? "Meilenstein geändert" : "Meilenstein angelegt"}: ${ziel.titel}${has("status") && altStatus !== ziel.status ? ` (${MEILENSTEIN_STATUS[ziel.status]?.label})` : ""}`);
  }
  for (const g of neueGutachter) {
    const u = nutzerById(db, g);
    benachrichtigen(db, u, { art: "entwicklung", titel: "Neuer Auftrag: " + ziel.titel, text: `Ihnen wurde im Projekt „${p.titel}“ ein Meilenstein zugewiesen. Soll-Termin: ${ziel.sollEnde || "offen"}.`, link: `/portal/entwicklung/${p.id}`, objektArt: "entwicklung", objektId: p.id }, { mailBetreff: "Neuer Auftrag in der Projektentwicklung – ÖkoInvest", mailText: "Ihnen wurde ein Meilenstein (Gutachten/Planung) zugewiesen. Details finden Sie im Portal." });
  }
  return ziel;
}

/** Meilenstein erledigt → vereinfachte Meldung an Eigentümer (nur mit externem Titel) und Co-Investoren */
function fortschrittMelden(db, p, m) {
  const empfaenger = new Map();
  if (m.externTitel) {
    for (const pf of E(db).flaechen.filter((x) => x.projektId === p.id && x.flaecheId)) {
      const f = plattformFlaeche(db, pf.flaecheId);
      const u = f?.nutzerId ? nutzerById(db, f.nutzerId) : null;
      if (u) empfaenger.set(u.id, { u, titel: "Neuer Fortschritt bei Ihrem Projekt", text: `Erledigt: ${m.externTitel}.` });
    }
  }
  for (const fg of p.freigaben || []) {
    const u = fg.nutzerId ? nutzerById(db, fg.nutzerId) : null;
    if (u && !empfaenger.has(u.id)) empfaenger.set(u.id, { u, titel: `Meilenstein erreicht: ${p.titel}`, text: `Erledigt: ${m.titel}.` });
  }
  for (const { u, titel, text } of empfaenger.values()) {
    benachrichtigen(db, u, { art: "entwicklung", titel, text, link: `/portal/entwicklung/${p.id}`, objektArt: "entwicklung", objektId: p.id }, { mailBetreff: "Neuigkeiten zu Ihrem Projekt – ÖkoInvest", mailText: "Ihr Projekt hat einen weiteren Schritt erreicht. Details finden Sie im Portal unter „Projektentwicklung“." });
  }
}

const EINTRAG = {
  /** Profil eines Gutachters (id = Konto-ID): Fachgebiete, Qualifikation (z. B. öffentlich bestellt und vereidigt), Büro, Nachweis */
  gutachterprofil(db, n, p, id, d) {
    const u = id ? nutzerById(db, id) : null;
    if (!u || !u.rollen.includes("gutachter")) throw nichtGefunden("Gutachter nicht gefunden.");
    profilSetzen(db, u.id, d);
    protokoll(db, n, "gutachter_profil", "entwicklung", p.id, `Gutachter-Profil gepflegt: ${nameVon(db, u.id)}`);
    return profilAusgabe(db, u.id);
  },
  flaeche(db, n, p, id, d) {
    const alt = id ? E(db).flaechen.find((x) => x.id === id && x.projektId === p.id) : null;
    if (id && !alt) throw nichtGefunden("Projektfläche nicht gefunden.");
    const has = (k) => Object.hasOwn(d, k);
    const x = alt ? { ...alt } : { id: neueId("PF"), projektId: p.id, flaecheId: null, bezeichnung: "", eigentuemerName: "", ha: 0, pachtStatus: "angefragt", pachtBeginn: "", pachtEnde: "", pachtEurHa: null, notiz: "" };
    if (has("flaecheId")) {
      const f = d.flaecheId ? plattformFlaeche(db, v.kennung(d.flaecheId)) : null;
      if (d.flaecheId && !f) throw ungueltig("Plattform-Fläche nicht gefunden.");
      if (f && E(db).flaechen.some((y) => y.flaecheId === f.id && y.id !== x.id)) throw konflikt("Diese Fläche ist bereits einem Entwicklungsprojekt zugeordnet.");
      x.flaecheId = f?.id || null;
      if (f) {
        x.bezeichnung ||= f.bezeichnung;
        x.ha ||= f.ha || 0;
        x.eigentuemerName ||= nameVon(db, f.nutzerId);
      }
    }
    if (has("bezeichnung")) x.bezeichnung = v.text(d.bezeichnung, 120);
    if (has("eigentuemerName")) x.eigentuemerName = v.text(d.eigentuemerName, 120);
    if (has("ha")) x.ha = v.zahl(d.ha, { min: 0, max: 100000, stellen: 2 }) ?? 0;
    if (has("pachtStatus")) x.pachtStatus = v.auswahl(d.pachtStatus, PACHT_STATUS, x.pachtStatus);
    if (has("pachtBeginn")) x.pachtBeginn = datumOk(d.pachtBeginn) || "";
    if (has("pachtEnde")) x.pachtEnde = datumOk(d.pachtEnde) || "";
    if (has("pachtEurHa")) x.pachtEurHa = v.zahl(d.pachtEurHa, { min: 0, max: 100000 });
    if (has("notiz")) x.notiz = v.mehrzeilig(d.notiz, 2000);
    v.pflicht(x.bezeichnung.length >= 2, "Bitte geben Sie eine Bezeichnung der Fläche an.");
    if (alt) Object.assign(alt, x);
    else E(db).flaechen.push(x);
    protokoll(db, n, "projektflaeche", "entwicklung", p.id, `Projektfläche ${alt ? "geändert" : "verknüpft"}: ${x.bezeichnung} (${PACHT_STATUS[x.pachtStatus]?.label})`);
    return x;
  },
  meilenstein: (db, n, p, id, d) => meilensteinSpeichern(db, n, p, id, d),
  risiko(db, n, p, id, d) {
    const alt = id ? E(db).risiken.find((x) => x.id === id && x.projektId === p.id) : null;
    if (id && !alt) throw nichtGefunden("Risiko nicht gefunden.");
    const has = (k) => Object.hasOwn(d, k);
    const x = alt ? { ...alt } : { id: neueId("RK"), projektId: p.id, titel: "", kategorie: "sonstige", eintritt: 3, auswirkung: 3, massnahme: "", verantwortlichId: null, status: "offen", extern: false, meilensteinId: null, erstelltAm: jetzt() };
    if (has("titel") || !alt) x.titel = v.text(d.titel, 160);
    if (has("kategorie")) x.kategorie = v.auswahl(d.kategorie, RISIKO_KATEGORIEN, x.kategorie);
    if (has("eintritt")) x.eintritt = Math.round(v.zahl(d.eintritt, { min: 1, max: 5 }) ?? x.eintritt);
    if (has("auswirkung")) x.auswirkung = Math.round(v.zahl(d.auswirkung, { min: 1, max: 5 }) ?? x.auswirkung);
    if (has("massnahme")) x.massnahme = v.mehrzeilig(d.massnahme, 2000);
    if (has("status")) x.status = v.auswahl(d.status, RISIKO_STATUS, x.status);
    if (has("extern")) x.extern = v.wahr(d.extern);
    if (has("meilensteinId")) x.meilensteinId = ms(db, p.id).some((m) => m.id === d.meilensteinId) ? d.meilensteinId : null;
    if (has("verantwortlichId")) {
      const u = nutzerById(db, v.kennung(d.verantwortlichId));
      x.verantwortlichId = u && u.rollen.includes("admin") ? u.id : null;
    }
    v.pflicht(x.titel.length >= 3, "Bitte beschreiben Sie das Risiko.");
    x.geaendertAm = jetzt();
    if (alt) Object.assign(alt, x);
    else E(db).risiken.push(x);
    protokoll(db, n, "risiko", "entwicklung", p.id, `Risiko ${alt ? "geändert" : "erfasst"}: ${x.titel} (${x.eintritt}×${x.auswirkung})`);
    return { ...x, score: risikoScore(x) };
  },
  entscheidung(db, n, p, id, d) {
    if (id) throw konflikt("Das Entscheidungsprotokoll ist unveränderlich – bitte eine neue Entscheidung erfassen.");
    const x = { id: neueId("EN"), projektId: p.id, datum: datumOk(d.datum) || heuteIso(), titel: v.text(d.titel, 160), art: v.auswahl(d.art, ENTSCHEIDUNG_ARTEN, "sonstige"), beschluss: v.mehrzeilig(d.beschluss, 3000), begruendung: v.mehrzeilig(d.begruendung, 3000), beteiligte: v.text(d.beteiligte, 300), vonId: n.id, am: jetzt() };
    v.pflicht(x.titel.length >= 3 && x.beschluss.length >= 3, "Bitte Titel und Beschluss angeben.");
    E(db).entscheidungen.push(x);
    protokoll(db, n, "entscheidung", "entwicklung", p.id, `Entscheidung protokolliert: ${x.titel}`);
    return x;
  },
  budget(db, n, p, id, d) {
    const alt = id ? E(db).budget.find((x) => x.id === id && x.projektId === p.id) : null;
    if (id && !alt) throw nichtGefunden("Budgetposition nicht gefunden.");
    const has = (k) => Object.hasOwn(d, k);
    const x = alt ? { ...alt } : { id: neueId("BP"), projektId: p.id, kategorie: "sonstiges", bezeichnung: "", planEur: 0, istEur: 0, istQuelle: "manuell", notiz: "" };
    if (has("kategorie")) x.kategorie = v.auswahl(d.kategorie, BUDGET_KATEGORIEN, x.kategorie);
    if (has("bezeichnung") || !alt) x.bezeichnung = v.text(d.bezeichnung, 160) || BUDGET_KATEGORIEN[x.kategorie];
    if (has("planEur")) x.planEur = v.zahl(d.planEur, { min: 0, max: 1e9 }) ?? 0;
    if (has("istEur")) {
      if (x.istQuelle === "erpnext") throw konflikt("Ist-Werte dieser Position kommen aus ERPNext und sind hier nicht änderbar.");
      x.istEur = v.zahl(d.istEur, { min: 0, max: 1e9 }) ?? 0;
      x.istQuelle = "manuell";
    }
    if (has("notiz")) x.notiz = v.mehrzeilig(d.notiz, 1000);
    if (alt) Object.assign(alt, x);
    else E(db).budget.push(x);
    protokoll(db, n, "budget", "entwicklung", p.id, `Budgetposition ${alt ? "geändert" : "angelegt"}: ${x.bezeichnung}`);
    return x;
  },
  kontakt(db, n, p, id, d) {
    const crm = db.bo?.kontakte || [];
    const k = crm.find((c) => c.id === v.kennung(d.kontaktId));
    const alt = id ? (p.kontakte || []).find((x) => x.id === id) : null;
    if (id && !alt) throw nichtGefunden("Kontakt nicht gefunden.");
    if (!alt && !k) throw ungueltig("Bitte einen Kontakt aus dem CRM wählen.");
    const x = alt ? { ...alt } : { id: neueId("EK"), kontaktId: k.id, rolle: "sonstige", notiz: "" };
    if (Object.hasOwn(d, "rolle")) x.rolle = v.auswahl(d.rolle, KONTAKT_ROLLEN_ENTWICKLUNG, x.rolle);
    if (Object.hasOwn(d, "notiz")) x.notiz = v.mehrzeilig(d.notiz, 1000);
    p.kontakte ||= [];
    if (!alt && p.kontakte.some((y) => y.kontaktId === x.kontaktId && y.rolle === x.rolle)) throw konflikt("Dieser Kontakt ist mit dieser Rolle bereits verknüpft.");
    if (alt) Object.assign(alt, x);
    else p.kontakte.push(x);
    // Beziehung im CRM sichtbar machen (Bezug auf das Entwicklungsprojekt)
    if (k && !alt) {
      k.bezuege ||= [];
      if (!k.bezuege.some((b) => b.art === "entwicklung" && b.id === p.id)) k.bezuege.push({ art: "entwicklung", id: p.id, rolle: KONTAKT_ROLLEN_ENTWICKLUNG[x.rolle] || "Sonstige", am: jetzt() });
    }
    protokoll(db, n, "kontakt", "entwicklung", p.id, `Stakeholder ${alt ? "geändert" : "verknüpft"} (${KONTAKT_ROLLEN_ENTWICKLUNG[x.rolle]})`);
    return x;
  },
  freigabe(db, n, p, id, d) {
    const alt = id ? (p.freigaben || []).find((x) => x.id === id) : null;
    if (id && !alt) throw nichtGefunden("Freigabe nicht gefunden.");
    const x = alt ? { ...alt } : { id: neueId("FG"), art: "codev", nutzerId: null, organisationId: null, risiken: true, dokumente: true, seit: jetzt(), vonId: n.id };
    if (!alt) {
      const u = d.nutzerId ? nutzerById(db, v.kennung(d.nutzerId)) : null;
      const o = d.organisationId ? (db.organisationen || []).find((y) => y.id === v.kennung(d.organisationId)) : null;
      if (!u && !o) throw ungueltig("Bitte ein Investorenkonto oder eine Organisation wählen.");
      if (u && !u.rollen.includes("investor")) throw ungueltig("Co-Development-Freigaben gibt es nur für Investorenkonten.");
      x.nutzerId = u?.id || null;
      x.organisationId = o?.id || null;
      // KYC/KYB: Freigabe nur für verifizierte Investoren (409, Code „kyc“)
      kycSperre(db, "codevelopment", { kontoId: x.nutzerId, organisationId: x.organisationId, text: "Co-Development-Freigabe nicht möglich: Der Investor ist noch nicht verifiziert (KYC/KYB)." });
    }
    if (Object.hasOwn(d, "risiken")) x.risiken = v.wahr(d.risiken);
    if (Object.hasOwn(d, "dokumente")) x.dokumente = v.wahr(d.dokumente);
    p.freigaben ||= [];
    if (!alt && p.freigaben.some((y) => (x.nutzerId && y.nutzerId === x.nutzerId) || (x.organisationId && y.organisationId === x.organisationId))) throw konflikt("Für dieses Konto bzw. diese Organisation besteht bereits eine Freigabe.");
    if (alt) Object.assign(alt, x);
    else {
      p.freigaben.push(x);
      const u = x.nutzerId ? nutzerById(db, x.nutzerId) : null;
      if (u) benachrichtigen(db, u, { art: "entwicklung", titel: "Co-Development: Projekt freigegeben", text: `Sie können den Fortschritt von „${p.titel}“ im Portal verfolgen.`, link: `/portal/entwicklung/${p.id}`, objektArt: "entwicklung", objektId: p.id }, { mailBetreff: "Projektfreigabe Co-Development – ÖkoInvest", mailText: "Ein Entwicklungsprojekt wurde für Sie freigegeben. Details finden Sie im Portal." });
    }
    protokoll(db, n, "freigabe", "entwicklung", p.id, `Co-Development-Freigabe ${alt ? "geändert" : "erteilt"}`);
    return x;
  },
};

export async function entwicklungEintragSpeichern(n, projektId, { art, id = null, daten = {} } = {}) {
  schreibNoetig(n);
  if (!EINTRAG[art]) throw ungueltig("Unbekannte Eintragsart.");
  return aendernBereit((db) => {
    const p = projektLaden(db, projektId);
    const e = EINTRAG[art](db, n, p, id ? v.kennung(id) : null, daten || {});
    p.geaendertAm = jetzt();
    return { eintrag: e, projekt: projektAusgabe(db, n, p) };
  });
}

export async function entwicklungEintragLoeschen(n, projektId, { art, id } = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const p = projektLaden(db, projektId);
    const k = v.kennung(id);
    const weg = (liste, pred) => {
      const i = liste.findIndex(pred);
      if (i < 0) throw nichtGefunden("Eintrag nicht gefunden.");
      return liste.splice(i, 1)[0];
    };
    if (art === "flaeche") weg(E(db).flaechen, (x) => x.id === k && x.projektId === p.id);
    else if (art === "risiko") weg(E(db).risiken, (x) => x.id === k && x.projektId === p.id);
    else if (art === "budget") {
      const b = E(db).budget.find((x) => x.id === k && x.projektId === p.id);
      if (b?.istQuelle === "erpnext") throw konflikt("Positionen mit Ist-Werten aus ERPNext werden dort gepflegt.");
      weg(E(db).budget, (x) => x.id === k && x.projektId === p.id);
    } else if (art === "kontakt") weg(p.kontakte || [], (x) => x.id === k);
    else if (art === "freigabe") weg(p.freigaben || [], (x) => x.id === k);
    else if (art === "meilenstein") {
      const m = E(db).meilensteine.find((x) => x.id === k && x.projektId === p.id);
      if (!m) throw nichtGefunden("Meilenstein nicht gefunden.");
      if (m.status === "erledigt") throw konflikt("Erledigte Meilensteine bleiben erhalten (Status „Entfällt“ nutzen).");
      if (E(db).dokumente.some((d) => d.meilensteinId === m.id)) throw konflikt("Am Meilenstein hängen Dokumente – bitte „Entfällt“ nutzen.");
      for (const x of ms(db, p.id)) if ((x.nach || []).includes(m.id)) x.nach = [...new Set([...x.nach.filter((y) => y !== m.id), ...(m.nach || [])])];
      weg(E(db).meilensteine, (x) => x.id === k);
    } else if (art === "entscheidung") throw konflikt("Das Entscheidungsprotokoll ist unveränderlich.");
    else throw ungueltig("Unbekannte Eintragsart.");
    p.geaendertAm = jetzt();
    protokoll(db, n, "eintrag_entfernt", "entwicklung", p.id, `Eintrag entfernt (${art})`);
    return projektAusgabe(db, n, p);
  });
}

// ================================================================ Aktionen (Plan, Übergaben, ERPNext)

const NETZ_AUS_MS = (liste) => {
  const z = liste.find((m) => m.schluessel === "netzzusage");
  const a = liste.find((m) => m.schluessel === "netzanfrage");
  if (z?.status === "erledigt") return "zusage";
  if (a?.status === "erledigt") return "angefragt";
  return "offen";
};

export async function entwicklungAktion(n, projektId, { aktion, begruendung = "" } = {}) {
  schreibNoetig(n);
  if (aktion === "uebergabe_anlage") return uebergabeAnlage(n, projektId);
  return aendernBereit((db) => {
    const p = projektLaden(db, projektId);
    const liste = ms(db, p.id);
    if (aktion === "plan_neu") {
      const neu = planBerechnen(liste, { start: p.start || heuteIso(), fixieren: false });
      for (const x of neu) Object.assign(E(db).meilensteine.find((y) => y.id === x.id), { sollStart: x.sollStart, sollEnde: x.sollEnde, sollFix: false });
      protokoll(db, n, "entwicklung_plan", "entwicklung", p.id, "Terminplan neu berechnet (Vorwärtsrechnung, fixe Termine gelöst)");
      return { ok: true, projekt: projektAusgabe(db, n, p) };
    }
    if (aktion === "vorlage_anwenden") {
      if (liste.length) throw konflikt("Das Projekt hat bereits Meilensteine.");
      planAnlegen(db, p, n);
      return { ok: true, projekt: projektAusgabe(db, n, p) };
    }
    if (aktion === "uebergabe_boerse") {
      if (p.boerseProjektId) throw konflikt("Das Projekt wurde bereits an die Börse übergeben.");
      const k = kennzahlen(db, p);
      const titel = `${ENTWICKLUNG_TYPEN[p.typ] || "PV-Projekt"} ${String(p.mwp || "").replace(".", ",")} MWp, ${p.bundesland}`.slice(0, 120);
      const t = jetzt();
      const bp = {
        id: neueId("P"), slug: "", anbieterId: n.id, organisationId: null,
        titel, typ: p.typ, land: p.land, bundesland: p.bundesland, region: p.landkreis || "", mwp: p.mwp || 0, mwhSpeicher: p.mwh || 0, flaecheHa: k.flaecheHa,
        phase: k.phase || "flaeche", netzanschluss: NETZ_AUS_MS(liste), codGeplant: (k.prognoseCod || "").slice(0, 7) || p.zielCod || "", preisModus: "anfrage", preis: null, preisProKwp: null,
        beschreibung: `Aus der eigenen Projektentwicklung von ÖkoInvest (${k.phaseLabel}). ${p.beschreibung || ""}`.trim().slice(0, 4000), highlights: [],
        vertraulich: { gemeinde: p.gemeinde || "", gemarkung: "", flurstuecke: "", netzbetreiber: p.netzbetreiber || "", einspeisepunkt: p.nvp || "", entfernungNetzKm: null, sicherung: `${k.flaecheGesichertHa} von ${k.flaecheHa} ha gesichert`, planungsrecht: k.phaseLabel, ertragKwhKwp: null, verguetung: vermarktungLabel(p.vermarktung, p.land), details: "" },
        status: "entwurf", statusVerlauf: [{ status: "entwurf", am: t, vonId: n.id, vonRolle: "admin", kommentar: `Übergabe aus Entwicklungsprojekt ${p.id}` }],
        provisionAkzeptiert: null, provisionSatz: null, ablehnGrund: "", aufrufe: 0, zustaendigId: n.id, veroeffentlichtAm: null, erstelltAm: t, geaendertAm: t,
        entwicklungId: p.id,
      };
      bp.slug = `${slugify(bp.titel)}-${bp.id.slice(-4).toLowerCase()}`;
      db.projekte.push(bp);
      p.boerseProjektId = bp.id;
      p.status = "boerse";
      p.geaendertAm = t;
      E(db).entscheidungen.push({ id: neueId("EN"), projektId: p.id, datum: heuteIso(), titel: "Übergabe an die Projektbörse", art: "strategie", beschluss: `Börsen-Projekt ${bp.id} als Entwurf angelegt (Freigabe über „Projekt-Freigabe“).`, begruendung: v.mehrzeilig(begruendung, 2000), beteiligte: "", vonId: n.id, am: t });
      protokoll(db, n, "uebergabe_boerse", "entwicklung", p.id, `An Börse übergeben: Projekt ${bp.id}`);
      protokoll(db, n, "anlegen", "projekt", bp.id, `Projekt aus Entwicklung ${p.id} angelegt`);
      return { ok: true, boerseProjektId: bp.id, projekt: projektAusgabe(db, n, p) };
    }
    if (aktion === "erpnext_sync") {
      throw konflikt("ERPNext ist im Demo-Betrieb nicht angebunden – Ist-Kosten werden manuell gepflegt (im Betrieb: Sync über Frappe, siehe docs/API.md Abschnitt 11).");
    }
    throw ungueltig("Unbekannte Aktion.");
  });
}

async function uebergabeAnlage(n, projektId) {
  if (!darfSchreiben(n, "anlagen")) throw verboten("Für die Übergabe an Bau/Betrieb ist zusätzlich das Schreibrecht „Anlagen & Monitoring“ nötig.");
  const db = await lesenBereit();
  const p = projektLaden(db, projektId);
  if (p.anlageId) throw konflikt("Das Projekt wurde bereits an Bau/Betrieb übergeben.");
  const phase = phaseAusMeilensteinen(ms(db, p.id));
  if (!["rtb", "cod"].includes(phase)) throw konflikt("Übergabe an Bau/Betrieb erst ab Baureife (RTB).");
  const typ = p.typ === "hybrid" ? "freiflaeche" : p.typ;
  const anlage = await anlagenDemo.anlageAnlegen(n, {
    name: p.titel, typ, status: "bau", land: p.land, bundesland: p.bundesland, ort: p.gemeinde || "", kwp: typ === "speicher" ? 0 : Math.round((p.mwp || 0) * 1000),
    speicherKwh: Math.round((p.mwh || 0) * 1000), speicherKw: typ === "speicher" ? Math.round((p.mwp || 0) * 1000) : 0, lastprofil: "keins",
    beschreibung: `Übernommen aus Entwicklungsprojekt ${p.id}.`,
  });
  return aendern((d) => {
    const x = d.entwicklung.projekte.find((y) => y.id === p.id);
    x.anlageId = anlage.id;
    x.status = "bau";
    x.geaendertAm = jetzt();
    d.entwicklung.entscheidungen.push({ id: neueId("EN"), projektId: x.id, datum: heuteIso(), titel: "Übergabe an Bau/Betrieb", art: "go", beschluss: `Anlage ${anlage.id} im Anlagen-Monitoring angelegt (Status „Im Bau“).`, begruendung: "", beteiligte: "", vonId: n.id, am: jetzt() });
    protokoll(d, n, "uebergabe_anlage", "entwicklung", x.id, `An Bau/Betrieb übergeben: Anlage ${anlage.id}`);
    return { ok: true, anlageId: anlage.id, projekt: projektAusgabe(d, n, x) };
  });
}

// ================================================================ Vorlage-Assistent

function vorschlagAusFlaeche(f) {
  const typ = f.nutzung === "dach" ? "dach" : f.agri ? "agri" : "freiflaeche";
  return {
    titel: `${ENTWICKLUNG_TYPEN[typ]} ${f.ort || f.bezeichnung}`.replace(/\s*\(Demo\)/, "").slice(0, 100) + (/\(Demo\)/.test(f.bezeichnung) ? " (Demo)" : ""),
    typ, land: f.land || "DE", bundesland: f.bundesland || "", gemeinde: f.ort || "",
    mwp: typ === "dach" ? null : mwpAusFlaeche(f.ha, { agri: !!f.agri }),
  };
}

export async function entwicklungAssistent(n, { flaecheId = "", land = "", typ = "", start = "" } = {}) {
  leseNoetig(n);
  const db = await lesenBereit();
  const f = flaecheId ? plattformFlaeche(db, v.kennung(flaecheId)) : null;
  if (flaecheId && !f) throw nichtGefunden("Fläche nicht gefunden.");
  const basis = f ? vorschlagAusFlaeche(f) : {};
  const l = v.auswahl(land, LAENDER, basis.land || "DE");
  const t = v.auswahl(typ, ENTWICKLUNG_TYPEN, basis.typ || "freiflaeche");
  const s = /^20\d\d-\d\d-\d\d$/.test(String(start)) ? start : heuteIso();
  const schritte = vorlage(l, t);
  const idVon = new Map(schritte.map((x) => [x.schluessel, x.schluessel]));
  const plan = planBerechnen(schritte.map((x) => ({ ...x, id: x.schluessel, nach: x.nach.map((y) => idVon.get(y)), status: "offen" })), { start: s });
  const kp = kritischerPfad(plan, { heute: s });
  return {
    vorschlag: { ...basis, land: l, typ: t, start: s, flaecheId: f?.id || null, zielCod: kp.projektEnde.slice(0, 7) },
    flaeche: f ? { id: f.id, bezeichnung: f.bezeichnung, ha: f.ha, agri: !!f.agri, status: f.status, eigentuemer: nameVon(db, f.nutzerId), bereitsVerknuepft: E(db).flaechen.some((pf) => pf.flaecheId === f.id) } : null,
    plan: plan.map((m) => ({ schluessel: m.schluessel, titel: m.titel, kategorie: m.kategorie, dauerMonate: m.dauerMonate, sollStart: m.sollStart, sollEnde: m.sollEnde, kritisch: !!kp.je.get(m.id)?.kritisch, phase: m.phase, dokumentPflicht: m.dokumentPflicht, gutachten: m.gutachten })),
    monateBisCod: planMonate(schritte),
  };
}

// ================================================================ Gutachter-Einladung

export async function entwicklungGutachterEinladen(n, projektId, { email, meilensteinIds = [], basisUrl = "", fachgebiete = [], qualifikation = "", buero = "", nachweis = "" } = {}) {
  schreibNoetig(n);
  const e = v.email(email);
  v.pflicht(e, "Bitte geben Sie eine gültige E-Mail-Adresse an.");
  return aendernBereit((db) => {
    const p = projektLaden(db, projektId);
    const ids = (Array.isArray(meilensteinIds) ? meilensteinIds : []).map(v.kennung).filter((x) => ms(db, p.id).some((m) => m.id === x));
    v.pflicht(ids.length > 0, "Bitte mindestens einen Meilenstein für den Auftrag wählen.");
    const vorhanden = db.nutzer.find((u) => u.email === e);
    if (vorhanden?.rollen.includes("admin")) throw konflikt("Backoffice-Konten brauchen keine Gutachter-Einladung.");
    for (const x of E(db).einladungen) if (x.projektId === p.id && x.email === e && x.status === "offen") x.status = "ersetzt";
    const token = zufallsToken();
    const einl = { id: neueId("GE"), projektId: p.id, email: e, meilensteinIds: ids, profil: profilDaten({ fachgebiete, qualifikation, buero, nachweis }), hash: sha256(token), ablauf: new Date(Date.now() + EINLADUNG_TAGE * 86400e3).toISOString(), status: "offen", eingeladenVon: n.id, erstelltAm: jetzt(), angenommenAm: null, angenommenVon: null };
    E(db).einladungen.push(einl);
    const link = `${basisUrl}/einladung/gutachter/${token}`;
    db.demoLinks ||= [];
    db.demoLinks.unshift({ am: jetzt(), art: "einladung", email: e, link });
    db.demoLinks = db.demoLinks.slice(0, 50);
    console.info(`[plattform-demo] Gutachter-Einladung für ${e}: ${link}`);
    postausgangAnlegen(db, {
      an: e, anName: vorhanden ? nameVon(db, vorhanden.id) : "", nutzerId: vorhanden?.id || null, art: "einladung",
      betreff: "Einladung als Gutachter/Planer – ÖkoInvest",
      text: `${nameVon(db, n.id)} lädt Sie ein, im Portal von ÖkoInvest an ${ids.length === 1 ? "einem Meilenstein" : `${ids.length} Meilensteinen`} eines Entwicklungsprojekts mitzuarbeiten (Unterlagen hochladen, Rückfragen stellen). Der Link ist ${EINLADUNG_TAGE} Tage gültig. Ohne Konto registrieren Sie sich mit dieser E-Mail-Adresse.`,
      link, linkText: "Einladung ansehen", hinweis: "Sie kennen ÖkoInvest nicht? Dann ignorieren Sie diese E-Mail bitte.",
    });
    protokoll(db, n, "gutachter_einladung", "entwicklung", p.id, `Gutachter eingeladen: ${e} (${ids.length} Meilensteine)`);
    const { hash: _h, ...aus } = einl;
    return { einladung: aus, ...(process.env.NODE_ENV !== "production" ? { demoLink: link } : {}) };
  });
}

function einladungSuchen(db, token) {
  const t = String(token || "");
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(t)) return null;
  const h = sha256(t);
  return (E(db)?.einladungen || []).find((x) => x.hash === h) || null;
}

const maskieren = (email) => {
  const [lokal, domain] = String(email).split("@");
  return `${lokal.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(6, lokal.length - 1)))}@${domain}`;
};

/** Öffentliche Kurzinfo zur Einladungsseite – ohne Projektdetails (nur Anzahl Aufträge, einladende Person) */
export async function entwicklungEinladungInfo(token) {
  const db = await lesenBereit();
  const e = einladungSuchen(db, token);
  if (!e || e.status !== "offen" || new Date(e.ablauf) < new Date()) return { gueltig: false };
  return { gueltig: true, auftraege: e.meilensteinIds.length, eingeladenVon: nameVon(db, e.eingeladenVon), email: maskieren(e.email), ablauf: e.ablauf };
}

export async function entwicklungEinladungAnnehmen(n, token) {
  angemeldet(n);
  return aendernBereit((db) => {
    const e = einladungSuchen(db, token);
    if (!e || e.status !== "offen" || new Date(e.ablauf) < new Date()) throw ungueltig("Die Einladung ist ungültig, abgelaufen oder wurde widerrufen.");
    const u = db.nutzer.find((x) => x.id === n.id);
    if (u.email !== e.email) throw verboten("Diese Einladung gilt für eine andere E-Mail-Adresse. Bitte melden Sie sich mit der eingeladenen Adresse an.");
    if (u.rollen.includes("admin")) throw konflikt("Backoffice-Konten brauchen keine Gutachter-Rolle.");
    if (!u.rollen.includes("gutachter")) u.rollen = [...u.rollen, "gutachter"];
    if (e.profil) profilSetzen(db, u.id, e.profil); // Fachgebiete/Qualifikation aus der Einladung übernehmen
    if (!u.emailBestaetigt) u.emailBestaetigt = true; // Link per E-Mail erhalten = Adresse nachgewiesen
    const p = projektLaden(db, e.projektId);
    for (const m of ms(db, p.id)) if (e.meilensteinIds.includes(m.id) && !(m.gutachterIds || []).includes(u.id)) m.gutachterIds = [...(m.gutachterIds || []), u.id];
    e.status = "angenommen";
    e.angenommenAm = jetzt();
    e.angenommenVon = u.id;
    const einladender = nutzerById(db, e.eingeladenVon);
    if (einladender) benachrichtigen(db, einladender, { art: "entwicklung", titel: `Gutachter-Einladung angenommen`, text: `${nameVon(db, u.id)} arbeitet jetzt an ${e.meilensteinIds.length} Meilenstein(en) in „${p.titel}“ mit.`, link: `/portal/admin/entwicklung/${p.id}`, objektArt: "entwicklung", objektId: p.id }, { mail: false });
    protokoll(db, u, "gutachter_einladung", "entwicklung", p.id, "Gutachter-Einladung angenommen");
    return { projektId: p.id, auftraege: e.meilensteinIds.length };
  });
}

// ================================================================ Externe Sichten

function externAusgabe(db, n, p, z) {
  const heute = heuteIso();
  const k = kennzahlen(db, p, heute);
  const liste = ms(db, p.id);
  const basis = {
    id: p.id, titel: p.titel, typLabel: ENTWICKLUNG_TYPEN[p.typ] || p.typ, land: p.land, bundesland: p.bundesland, gemeinde: p.gemeinde || "",
    phaseLabel: k.phaseLabel, fortschritt: k.fortschritt, statusLabel: ENTWICKLUNG_STATUS[p.status]?.label || p.status,
    sichten: [z.eigentuemer && "eigentuemer", z.investor && "investor", z.gutachter.length && "gutachter"].filter(Boolean),
    // Co-Development freigegeben, aber Verifizierung offen → Hinweis statt Projektdaten
    kycErforderlich: z.investorKyc && !z.investor ? { schritt: "codevelopment", status: z.investorKyc.status } : null,
  };
  if (z.eigentuemer) {
    const schritte = liste.filter((m) => m.externTitel && m.status !== "entfaellt");
    basis.eigentuemer = {
      meineFlaechen: E(db).flaechen.filter((pf) => pf.projektId === p.id && pf.flaecheId).filter((pf) => {
        const f = plattformFlaeche(db, pf.flaecheId);
        return f && (f.nutzerId === n.id || darfTeamLesenObjekt(db, n, f));
      }).map((pf) => ({ bezeichnung: pf.bezeichnung, ha: pf.ha, pachtStatusLabel: PACHT_STATUS[pf.pachtStatus]?.label || "", flaecheId: pf.flaecheId })),
      // zeitlich sortiert (erledigt nach Ist-Ende, sonst nach Prognose), nur Quartale – keine genauen Termine
      schritte: schritte
        .map((m) => ({ m, datum: m.status === "erledigt" ? m.istEnde || m.sollEnde : k.kp.je.get(m.id)?.prognoseEnde || m.sollEnde }))
        .sort((x, y) => String(x.datum).localeCompare(String(y.datum)))
        .map(({ m, datum }) => ({ titel: m.externTitel, stand: m.status === "erledigt" ? "erledigt" : m.status === "in_arbeit" ? "laeuft" : "geplant", zeitraum: quartal(datum) })),
      inbetriebnahme: quartal(k.prognoseCod),
    };
  }
  if (z.investor) {
    const fg = z.investor;
    basis.investor = {
      mwp: p.mwp, mwh: p.mwh, flaecheHa: k.flaecheHa, flaecheGesichertHa: k.flaecheGesichertHa, zielCod: p.zielCod, prognoseCod: k.prognoseCod, vermarktungLabel: vermarktungLabel(p.vermarktung, p.land),
      meilensteine: liste.filter((m) => m.status !== "entfaellt").map((m) => ({ id: m.id, titel: m.titel, kategorie: m.kategorie, kategorieLabel: KATEGORIEN[m.kategorie]?.label, status: m.status, statusLabel: MEILENSTEIN_STATUS[m.status]?.label, sollStart: m.sollStart, sollEnde: m.sollEnde, istEnde: m.istEnde, verzugTage: verzugTage(m, heute), kritisch: !!k.kp.je.get(m.id)?.kritisch, nach: m.nach, prognoseStart: k.kp.je.get(m.id)?.prognoseStart || m.sollStart, prognoseEnde: k.kp.je.get(m.id)?.prognoseEnde || m.sollEnde })),
      risiken: fg.risiken ? E(db).risiken.filter((r) => r.projektId === p.id && r.extern && r.status !== "geschlossen").map((r) => ({ id: r.id, titel: r.titel, kategorieLabel: RISIKO_KATEGORIEN[r.kategorie], score: risikoScore(r), ampel: risikoAmpel(risikoScore(r)), massnahme: r.massnahme, statusLabel: RISIKO_STATUS[r.status] })) : [],
      dokumente: fg.dokumente ? E(db).dokumente.filter((d) => d.projektId === p.id && d.freigabeInvestor).map((d) => ({ id: d.id, name: d.name, groesse: d.groesse, am: d.am, link: `/api/portal/entwicklung/dokumente/${d.id}` })) : [],
    };
  }
  if (z.gutachter.length) {
    basis.gutachter = {
      auftraege: z.gutachter.map((m) => ({
        id: m.id, titel: m.titel, kategorieLabel: KATEGORIEN[m.kategorie]?.label, status: m.status, statusLabel: MEILENSTEIN_STATUS[m.status]?.label, sollStart: m.sollStart, sollEnde: m.sollEnde,
        ueberfaellig: istUeberfaellig(m, heute), eingereichtAm: m.eingereichtAm || null, dokumentPflicht: m.dokumentPflicht || [],
        dokumente: E(db).dokumente.filter((d) => d.meilensteinId === m.id && (d.vonId === n.id || d.fuerGutachter)).map((d) => ({ id: d.id, name: d.name, pflicht: d.pflicht, groesse: d.groesse, am: d.am, eigenes: d.vonId === n.id, link: `/api/portal/entwicklung/dokumente/${d.id}` })),
        rueckfragen: E(db).rueckfragen.filter((r) => r.meilensteinId === m.id && (r.vonId === n.id || (r.backoffice && r.anId === n.id))).map((r) => ({ id: r.id, text: r.text, am: r.am, backoffice: !!r.backoffice, von: r.backoffice ? "ÖkoInvest Projektentwicklung" : "Sie" })),
      })),
    };
  }
  return basis;
}

/** Projekte, an denen der Nutzer extern beteiligt ist (Eigentümer, Co-Investor, Gutachter) */
export async function entwicklungMeine(n) {
  angemeldet(n);
  const db = await lesenBereit();
  return E(db).projekte
    .filter((p) => p.status !== "abgebrochen")
    .map((p) => ({ p, z: zugriffe(db, n, p) }))
    .filter(({ z }) => z.eigentuemer || z.investor || z.investorKyc || z.gutachter.length)
    .map(({ p, z }) => externAusgabe(db, n, p, z));
}

export async function entwicklungExtern(n, id) {
  angemeldet(n);
  const db = await lesenBereit();
  const p = projektLaden(db, id);
  const z = zugriffe(db, n, p);
  if (!(z.eigentuemer || z.investor || z.gutachter.length) || p.status === "abgebrochen") {
    if (z.investorKyc && p.status !== "abgebrochen") kycSperre(db, "codevelopment", kycZiel(n, freigabeRoh(db, n, p))); // 409 (Code „kyc“)
    throw verboten("Dieses Projekt ist für Ihr Konto nicht freigegeben.");
  }
  return externAusgabe(db, n, p, z);
}

/** Gutachter meldet Stand an seinem Meilenstein: in_arbeit | eingereicht (erledigen darf nur die Projektleitung) */
export async function entwicklungMeilensteinMelden(n, projektId, meilensteinId, { aktion } = {}) {
  angemeldet(n);
  return aendernBereit((db) => {
    const p = projektLaden(db, projektId);
    const m = gutachterMeilensteine(db, n, p).find((x) => x.id === v.kennung(meilensteinId));
    if (!m) throw verboten("Dieser Meilenstein ist Ihnen nicht zugewiesen.");
    if (MEILENSTEIN_FERTIG.includes(m.status)) throw konflikt("Der Meilenstein ist bereits abgeschlossen.");
    if (aktion === "in_arbeit") {
      m.status = "in_arbeit";
      m.istStart ||= heuteIso();
    } else if (aktion === "eingereicht") {
      if (!E(db).dokumente.some((d) => d.meilensteinId === m.id && d.vonId === n.id)) throw new PlattformFehler(422, "Bitte laden Sie zuerst Ihr Gutachten bzw. Ihre Unterlagen hoch.");
      m.status = "in_arbeit";
      m.istStart ||= heuteIso();
      m.eingereichtAm = jetzt();
      const empf = nutzerById(db, m.verantwortlichId || p.projektleiterId);
      if (empf) benachrichtigen(db, empf, { art: "entwicklung", titel: `Gutachten eingereicht: ${m.titel}`, text: `${nameVon(db, n.id)} hat Unterlagen zur Prüfung eingereicht (${p.titel}).`, link: `/portal/admin/entwicklung/${p.id}?reiter=plan`, objektArt: "entwicklung", objektId: p.id }, { mailBetreff: "Gutachten eingereicht – ÖkoInvest", mailText: "Zu einem Meilenstein wurden Unterlagen zur Prüfung eingereicht. Details im Backoffice." });
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, "gutachter_meldung", "entwicklung", p.id, `Gutachter meldet „${aktion === "eingereicht" ? "eingereicht" : "in Arbeit"}“: ${m.titel}`);
    return { ok: true, projekt: externAusgabe(db, n, p, zugriffe(db, n, p)) };
  });
}

/** Rückfrage am Meilenstein – Gutachter an Projektleitung bzw. Backoffice an einen zugewiesenen Gutachter */
export async function entwicklungRueckfrage(n, projektId, { meilensteinId, text, anId = null } = {}) {
  angemeldet(n);
  const t = v.mehrzeilig(text, 3000);
  v.pflicht(t.length >= 3, "Bitte formulieren Sie Ihre Rückfrage.");
  return aendernBereit((db) => {
    const p = projektLaden(db, projektId);
    const m = ms(db, p.id).find((x) => x.id === v.kennung(meilensteinId));
    if (!m) throw nichtGefunden("Meilenstein nicht gefunden.");
    const bo = boSchreiben(n);
    if (!bo && !(m.gutachterIds || []).includes(n.id)) throw verboten("Dieser Meilenstein ist Ihnen nicht zugewiesen.");
    const an = bo ? v.kennung(anId) || (m.gutachterIds || [])[0] || null : null;
    if (bo && (!an || !(m.gutachterIds || []).includes(an))) throw ungueltig("Rückfragen gehen an einen zugewiesenen Gutachter.");
    const r = { id: neueId("RF"), projektId: p.id, meilensteinId: m.id, vonId: n.id, anId: an, backoffice: bo, text: t, am: jetzt() };
    E(db).rueckfragen.push(r);
    const empf = bo ? nutzerById(db, an) : nutzerById(db, m.verantwortlichId || p.projektleiterId);
    if (empf) benachrichtigen(db, empf, { art: "entwicklung", titel: `Rückfrage: ${m.titel}`, text: bo ? "Die Projektentwicklung hat Ihnen eine Rückfrage gestellt." : `${nameVon(db, n.id)}: ${t.slice(0, 160)}`, link: bo ? `/portal/entwicklung/${p.id}` : `/portal/admin/entwicklung/${p.id}?reiter=plan`, objektArt: "entwicklung", objektId: p.id }, { mailBetreff: "Rückfrage in der Projektentwicklung – ÖkoInvest", mailText: "Es gibt eine neue Rückfrage zu einem Meilenstein. Details finden Sie im Portal." });
    protokoll(db, n, "rueckfrage", "entwicklung", p.id, `Rückfrage zu „${m.titel}“`);
    return { ok: true, rueckfrage: r };
  });
}

// ================================================================ Dokumente

export async function entwicklungDokumentSpeichern(n, { projektId, meilensteinId = "", pflicht = "", name, mime, daten, freigabeInvestor = false, fuerGutachter = false } = {}) {
  angemeldet(n);
  if (!UPLOAD.typen[mime]) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  const db0 = await lesenBereit();
  const p0 = projektLaden(db0, projektId);
  const m0 = meilensteinId ? ms(db0, p0.id).find((x) => x.id === v.kennung(meilensteinId)) : null;
  if (meilensteinId && !m0) throw nichtGefunden("Meilenstein nicht gefunden.");
  const bo = boSchreiben(n);
  if (!bo && !(m0 && (m0.gutachterIds || []).includes(n.id))) throw verboten("Hochladen dürfen nur die Projektentwicklung und zugewiesene Gutachter.");
  const datei = `${neueId("ED")}-${zufallsToken().slice(0, 12)}.${UPLOAD.typen[mime]}`;
  await uploadSchreiben(datei, daten);
  return aendern((db) => {
    const p = projektLaden(db, projektId);
    const d = {
      id: neueId("ED"), projektId: p.id, meilensteinId: m0?.id || null, pflicht: m0 && (m0.dokumentPflicht || []).includes(pflicht) ? pflicht : "",
      name: v.text(String(name || "").replace(/[\\/]/g, "_"), 160) || `dokument.${UPLOAD.typen[mime]}`, mime, groesse: daten.length, datei, vonId: n.id, am: jetzt(),
      freigabeInvestor: bo ? v.wahr(freigabeInvestor) : false, fuerGutachter: bo ? v.wahr(fuerGutachter) : false,
    };
    E(db).dokumente.push(d);
    protokoll(db, n, "dokument", "entwicklung", p.id, `Dokument hochgeladen: ${d.name}${m0 ? ` (${m0.titel})` : ""}`);
    return dokumentAusgabe(db, d);
  });
}

/** Rechteprüfung für den Download: Backoffice, Gutachter (eigene bzw. für ihn freigegebene am zugewiesenen Meilenstein), Co-Investor (freigegeben) */
export async function entwicklungDokumentLesen(n, id) {
  angemeldet(n);
  const db = await lesenBereit();
  const d = E(db).dokumente.find((x) => x.id === v.kennung(id));
  if (!d) throw nichtGefunden("Dokument nicht gefunden.");
  const p = projektLaden(db, d.projektId);
  let ok = boLesen(n);
  if (!ok && d.meilensteinId) {
    const m = ms(db, p.id).find((x) => x.id === d.meilensteinId);
    ok = !!m && (m.gutachterIds || []).includes(n.id) && n.rollen?.includes("gutachter") && (d.vonId === n.id || d.fuerGutachter);
  }
  if (!ok) {
    const fg = freigabeFuer(db, n, p);
    ok = !!fg && fg.dokumente && d.freigabeInvestor;
  }
  if (!ok) throw verboten("Kein Zugriff auf dieses Dokument.");
  await aendern((x) => protokoll(x, n, "dokument_abruf", "entwicklung", p.id, `Dokument abgerufen: ${d.name}`));
  return { name: d.name, mime: d.mime, daten: await uploadLesen(d.datei) };
}

// ================================================================ Fristen-Erinnerungen (Frappe: Scheduler täglich)

/** Erinnert Verantwortliche/Gutachter an Fristen ≤ 7 Tage und überfällige Meilensteine (je Stufe einmal) */
export async function entwicklungFristen(n) {
  if (n) leseNoetig(n);
  return aendernBereit((db) => fristenLauf(db));
}

function fristenLauf(db) {
  const heute = heuteIso();
  let vorab = 0;
  let verzug = 0;
  for (const p of E(db).projekte.filter((x) => ENTWICKLUNG_OFFEN.includes(x.status))) {
    for (const m of ms(db, p.id)) {
      if (MEILENSTEIN_FERTIG.includes(m.status) || !m.sollEnde) continue;
      m.erinnert ||= {};
      const tage = tageZwischen(heute, m.sollEnde);
      const stufe = tage < 0 ? "verzug" : tage <= 7 ? "vorab" : null;
      if (!stufe || m.erinnert[stufe] === m.sollEnde) continue;
      m.erinnert[stufe] = m.sollEnde;
      const empf = [nutzerById(db, m.verantwortlichId || p.projektleiterId), ...(m.gutachterIds || []).map((g) => nutzerById(db, g))].filter(Boolean);
      for (const u of empf) {
        const extern = !u.rollen.includes("admin");
        benachrichtigen(db, u, {
          art: "entwicklung",
          titel: stufe === "verzug" ? `Überfällig: ${m.titel}` : `Frist in ${tage} Tag${tage === 1 ? "" : "en"}: ${m.titel}`,
          text: `${p.titel} – Soll-Termin ${m.sollEnde}.`,
          link: extern ? `/portal/entwicklung/${p.id}` : `/portal/admin/entwicklung/${p.id}?reiter=plan`,
          objektArt: "entwicklung", objektId: p.id,
        }, { mailBetreff: stufe === "verzug" ? "Überfälliger Meilenstein – ÖkoInvest" : "Frist in der Projektentwicklung – ÖkoInvest", mailText: "Ein Meilenstein in der Projektentwicklung ist bald fällig bzw. überfällig. Details finden Sie im Portal." });
      }
      if (stufe === "verzug") verzug++;
      else vorab++;
    }
  }
  E(db).fristenGeprueftAm = heute;
  return { vorab, verzug, geprueftAm: heute };
}

/** Einmal täglich beim Öffnen des Portfolios (Demo ersetzt so den Scheduler) */
async function fristenLazy() {
  const db = await lesenBereit();
  if (E(db).fristenGeprueftAm === heuteIso()) return;
  await aendern((d) => {
    if (d.entwicklung.fristenGeprueftAm === heuteIso()) return;
    fristenLauf(d);
  });
}

/** Für die Suche/Übersicht anderer Module: Anzahl externer Projekte (ohne Inhalte) */
export async function entwicklungZaehler(n) {
  if (!n) return 0;
  const db = await lesen();
  if (!db.entwicklung?.v) return 0;
  return E(db).projekte.filter((p) => p.status !== "abgebrochen" && (() => {
    const z = zugriffe(db, n, p);
    return z.eigentuemer || z.investor || z.gutachter.length;
  })()).length;
}
