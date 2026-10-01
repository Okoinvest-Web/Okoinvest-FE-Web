// src/lib/plattform/backend/demo/eg-portal.js
//
// Demo-Backend WP6 „Portale Mitglied, Interessent, Gemeinde, öffentlicher Rechner“ des Moduls Energiegemeinschaften –
// Referenz für plattform/api/eg_portal.py. Vertrag: docs/EG-SCHNITTSTELLEN.md, Abschnitt 4 (WP6). Regeln:
// src/lib/plattform/eg/{interesse,dashboard,anreize,empfehlung}.js.
//
// Grundsätze
//  - Nur EIGENE Daten (Recht „eigene_daten“ bzw. Mitglied-Eintrag mit kontoId = angemeldetes Konto). Fremde Gemeinschaften
//    → 404, keine Existenz verraten. Die Gemeinde-Sicht zeigt über andere Mitglieder nur Summen (keine Namen).
//  - Keine eigene EDA- oder Abrechnungslogik: Energiedaten (WP3), Belege (WP4), Gründungsaufträge (WP5) werden über deren
//    Operationen gelesen – liefern sie 501 (noch nicht umgesetzt) oder einen Fehler, zeigt das Portal einen Leerzustand.
//    Energiedaten liest WP6 nach eigener Eigentumsprüfung mit dem Systemkonto (WP3 kennt das Recht „eigene_daten“ nicht).
//  - Fremde Entitäten schreibt WP6 nur über die WP1-Operationen (egMitgliedSpeichern, egMitgliedStatus, egZaehlpunktSpeichern,
//    egTeilnahmeSpeichern, egAnlageSpeichern, egTeilnahmeUebergang) mit dem Systemkonto – nachdem Rolle und Eigentum geprüft sind.
//  - Eigene Daten unter db.egPortal: interessen (Plattform EG Interesse, EIN-…), beitritte (Zustimmungen + Unterschrift mit
//    Hash), tfWuensche (für EC_PRTFACT_CHG durch die Gemeinschaft), kuendigungen.

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import { EG_MODELLE, GEMEINSCHAFT_STATUS, MITGLIED_AKTIV, MITGLIED_ARTEN, MITGLIED_STATUS, TEILNAHME_STATUS, ZONELEVEL, ZP_RICHTUNGEN } from "../../eg/modell";
import { egStufe, istOrgan } from "../../eg/rechte";
import { mitgliedName, teilnahmeRegeln, mitgliedBereinigen } from "../../eg/mitglied";
import { tarifAm } from "../../eg/tarif";
import { netzentgeltRegel } from "../../eg/netzentgelt";
import { EG_ORGAN_REITER } from "../../eg/navigation";
import { BEITRITT_DOKUMENTE, BEITRITT_OFFEN, BEITRITT_VERSION, INTERESSE_EINWILLIGUNG, INTERESSE_STATUS, RECHNER_STANDARD, beitrittBereinigen, gemeinschaftOeffentlich, gemeinschaftenSuchen, interesseBereinigen, interesseCluster, rechnerOeffentlich } from "../../eg/interesse";
import { KUENDIGUNG_FRIST_TAGE, energieKennzahlen, kuendigungFruehestens, mehrfachUebersicht, sozialquote, teilnahmeSchritte, zeitraeume, zustimmungsAnleitung } from "../../eg/dashboard";
import { anreizeFuer, meilensteine, tarifZeitfensterAm } from "../../eg/anreize";
import { grueneStunden } from "../../eg/empfehlung";
import { GEMEINSCHAFTEN } from "../../../invest/markt";
import { MitgliedFehler, datum as datumPruefen, ganz, ibanMaskiert, plusTage, tageZwischen } from "../../mitglied/basis";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";
import { egAnlageSpeichern, egIntern, egMitgliedSpeichern, egMitgliedStatus, egTeilnahmeSpeichern, egTeilnahmeUebergang, egZaehlpunktSpeichern } from "./eg-stamm";
import * as energie from "./eg-energie";
import * as abrechnung from "./eg-abrechnung";
import * as gruendung from "./eg-gruendung";
import * as eda from "./eg-eda";

const { protokoll, benachrichtigen, nutzerById } = intern;
const { lesenBereit, zugriff, kontext, heute, E } = egIntern;
const SYS = () => ({ id: "system-eg", rollen: ["admin"], backofficeRollen: ["leitung"], system: true });
const AT = GEMEINSCHAFTEN.rechner.at;
const datumDe = (d) => String(d || "").split("-").reverse().join(".");

/** Fachfehler der reinen Module → PlattformFehler */
function fach(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof MitgliedFehler) {
      const f = new PlattformFehler(e.status || 422, e.message);
      if (e.feld) f.feld = e.feld;
      throw f;
    }
    throw e;
  }
}

/** Operation eines Nachbarpakets; 501 (noch nicht umgesetzt) bzw. Fehler → Leerzustand statt Abbruch */
async function versuch(fn) {
  try {
    return { ok: true, wert: await fn() };
  } catch (e) {
    const status = e?.status || 500;
    if (status !== 501) console.warn("[eg-portal] Nachbarpaket:", e?.message);
    return { ok: false, status, text: status === 501 ? "Diese Daten werden gerade angebunden." : status === 403 || status === 404 ? "Keine Daten freigegeben." : "Die Daten sind gerade nicht erreichbar." };
  }
}

function portalDaten(db) {
  db.egPortal ||= { v: 1 };
  for (const k of ["interessen", "beitritte", "tfWuensche", "kuendigungen"]) db.egPortal[k] ||= [];
  return db.egPortal;
}
const P = (db) => ({ interessen: [], beitritte: [], tfWuensche: [], kuendigungen: [], ...(db.egPortal || {}) });
function anmelden(n) {
  if (!n || n.system) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}

// ================================================================ Ausgabe-Helfer

const nbVon = (db, id) => E(db).netzbetreiber.find((x) => x.id === id) || null;
const tarifVon = (db, gid) => tarifAm(E(db).tarife.filter((t) => t.gemeinschaftId === gid), heute());
function oeffentlich(db, g) {
  const x = E(db);
  const mitglieder = x.mitglieder.filter((m) => m.gemeinschaftId === g.id);
  const plz = [...mitglieder.map((m) => m.person?.plz), ...x.teilnahmen.filter((t) => t.gemeinschaftId === g.id).map((t) => x.zaehlpunkte.find((z) => z.id === t.zaehlpunktId)?.plz?.slice(1))];
  return gemeinschaftOeffentlich(g, { tarif: tarifVon(db, g.id), mitglieder: mitglieder.filter((m) => MITGLIED_AKTIV.includes(m.status)).length, plzBereich: plz, netzbetreiberNamen: (g.netzbetreiber || []).map((id) => nbVon(db, id)?.kurzname || id) });
}
const gemeinschaftKurz = (g) => ({ id: g.id, name: g.name, kurzname: g.kurzname, modell: g.modell, modellKurz: EG_MODELLE[g.modell]?.kurz || g.modell, modellLabel: EG_MODELLE[g.modell]?.label || g.modell, zonelevel: g.zonelevel, zonelevelLabel: ZONELEVEL[g.zonelevel]?.label || "", status: g.status, statusLabel: GEMEINSCHAFT_STATUS[g.status]?.label || g.status, ort: g.sitzAdresse?.ort || "", organisator: !!g.dienstleistung?.aktiv, demo: !!g.demo });
function mitgliedEigen(m) {
  return {
    id: m.id, gemeinschaftId: m.gemeinschaftId, mitgliedsnummer: m.mitgliedsnummer, art: m.art, artLabel: MITGLIED_ARTEN[m.art]?.label || m.art, name: mitgliedName(m), person: { ...m.person },
    status: m.status, statusLabel: MITGLIED_STATUS[m.status]?.label || m.status, ton: MITGLIED_STATUS[m.status]?.ton || "neutral", beitrittAm: m.beitrittAm, austrittZum: m.austrittZum,
    iban: ibanMaskiert(m.iban), sepaMandat: m.sepaMandat?.status ? { referenz: m.sepaMandat.referenz, datum: m.sepaMandat.datum, status: m.sepaMandat.status } : null, rechnungsweg: m.rechnungsweg, schutzbeduerftig: !!m.schutzbeduerftig,
  };
}
/** Eigene Teilnahmen eines Mitglied-Eintrags mit Zählpunkt, Schritten und (solange nötig) Anleitung zur Zustimmung */
function teilnahmenEigen(db, g, m) {
  const x = E(db);
  return x.teilnahmen.filter((t) => t.mitgliedId === m.id && t.gemeinschaftId === g.id && t.status !== "verworfen").map((t) => {
    const z = x.zaehlpunkte.find((y) => y.id === t.zaehlpunktId) || {};
    const s = teilnahmeSchritte({ mitgliedStatus: m.status, teilnahme: t, heute: heute() });
    const offen = ["entwurf", "angefragt", "zustimmung_offen"].includes(t.status) && !["ausgeschieden", "abgelehnt"].includes(m.status);
    return {
      id: t.id, zaehlpunktId: z.id, zaehlpunktnummer: z.zaehlpunktnummer, bezeichnung: z.bezeichnung || "", richtung: z.richtung, richtungLabel: ZP_RICHTUNGEN[z.richtung]?.label || "", smartMeter: z.smartMeter,
      teilnahmefaktor: t.teilnahmefaktor, status: t.status, statusLabel: TEILNAHME_STATUS[t.status]?.label || t.status, ton: TEILNAHME_STATUS[t.status]?.ton || "neutral", gueltigAb: t.gueltigAb, gueltigBis: t.gueltigBis, fristBis: t.fristBis,
      schritte: s, anleitung: offen ? zustimmungsAnleitung({ netzbetreiber: nbVon(db, z.netzbetreiberId), gemeinschaft: g, teilnahme: t, zaehlpunktnummer: z.zaehlpunktnummer }) : null,
      tfWunsch: P(db).tfWuensche.find((w) => w.teilnahmeId === t.id && w.status === "offen") || null,
    };
  });
}
/** Preise für die Ersparnis-Schätzung (Tarif der Gemeinschaft, Netzentgelt-Regel, sonst Standardwerte aus markt.js) */
function preise(db, g, netzebene = 7) {
  const t = tarifVon(db, g.id);
  const regel = netzentgeltRegel({ datum: heute(), modell: g.modell, zonelevel: g.zonelevel, netzebene });
  const ap = (nbVon(db, g.netzbetreiber?.[0])?.netzentgeltAp || []).filter((x) => Number(x.netzebene) === netzebene).sort((a, b) => b.gueltigAb.localeCompare(a.gueltigAb))[0]?.ctKwh;
  return { bezugspreisCt: t?.bezugspreisCt ?? AT.gemeinschaftCt, einspeisepreisCt: t?.einspeisepreisCt ?? 0, lieferantCt: AT.energiepreis, netzApCt: ap ?? AT.netzAp, reduktionPct: regel.reduktionPct, abgabenBefreit: regel.abgabenBefreit, abgabenCt: AT.abgabenCt, co2KgJeKwh: RECHNER_STANDARD.co2KgJeKwh, regelText: regel.text, regelStatus: regel.status };
}
/** Kennzahlen je Zeitraum aus den WP3-Periodenwerten (nur eigene Teilnahmen) */
async function energieFuer(db, g, eigene) {
  const zr = zeitraeume(heute());
  const ids = new Set(eigene.map((t) => t.id));
  const richtung = Object.fromEntries(eigene.map((t) => [t.id, t.richtung]));
  const p = preise(db, g);
  const werte = {};
  let fehlt = null;
  for (const [k, z] of Object.entries(zr)) {
    const r = await versuch(() => energie.enPeriodenwerte(SYS(), g.id, z.von, z.bis));
    if (!r.ok) {
      fehlt = r;
      werte[k] = null;
      continue;
    }
    const liste = (r.wert?.zaehlpunkte || []).filter((e) => ids.has(e.teilnahmeId)).map((e) => ({ ...e, richtung: richtung[e.teilnahmeId] }));
    werte[k] = { ...z, ...energieKennzahlen(liste, p) };
  }
  return { zeitraeume: zr, werte, verfuegbar: !fehlt, hinweis: fehlt?.text || "", preise: { bezugspreisCt: p.bezugspreisCt, lieferantCt: p.lieferantCt, netzApCt: p.netzApCt, regel: p.regelText, regelStatus: p.regelStatus } };
}

/** Mitglied-Einträge des Kontos (alle Gemeinschaften) */
const eigeneMitglieder = (db, n) => E(db).mitglieder.filter((m) => m.kontoId && m.kontoId === n.id);
const tarifKurz = (t, tag) => (t ? { bezeichnung: t.bezeichnung, bezugspreisCt: t.bezugspreisCt, einspeisepreisCt: t.einspeisepreisCt, mitgliedsbeitragJahr: t.mitgliedsbeitragJahr, grundgebuehrMonat: t.grundgebuehrMonat, zeitfensterHeute: tarifZeitfensterAm(t, tag) } : null);

// ================================================================ Lesen

export async function ptUebersicht(n) {
  anmelden(n);
  const db = await lesenBereit();
  const x = E(db);
  const mitgliedschaften = [];
  for (const m of eigeneMitglieder(db, n)) {
    const g = x.gemeinschaften.find((y) => y.id === m.gemeinschaftId);
    if (!g || m.status === "abgelehnt") continue;
    const k = kontext(db, n, g);
    mitgliedschaften.push({ gemeinschaft: gemeinschaftKurz(g), mitglied: mitgliedEigen(m), rollen: k.rollen, organ: istOrgan(k), teilnahmen: teilnahmenEigen(db, g, m), tarif: tarifKurz(tarifVon(db, g.id), heute()) });
  }
  const aufgaben = mitgliedschaften
    .flatMap((ms) => ms.teilnahmen.filter((t) => t.schritte.aktuell === "zustimmung" || t.schritte.schritte.some((s) => s.zustand === "fehler")).map((t) => ({ gemeinschaftId: ms.gemeinschaft.id, gemeinschaft: ms.gemeinschaft.name, teilnahmeId: t.id, zaehlpunktnummer: t.zaehlpunktnummer, text: t.schritte.aufgabe, frist: t.schritte.frist })))
    .sort((a, b) => (a.frist?.tageRest ?? 999) - (b.frist?.tageRest ?? 999));
  const meineIds = new Set(eigeneMitglieder(db, n).map((m) => m.id));
  const meineTn = x.teilnahmen.filter((t) => meineIds.has(t.mitgliedId));
  const mehrfach = mehrfachUebersicht({ zaehlpunkte: x.zaehlpunkte.filter((z) => meineTn.some((t) => t.zaehlpunktId === z.id)), teilnahmen: meineTn, gemeinschaften: x.gemeinschaften });
  const organe = x.gemeinschaften.map((g) => ({ g, k: kontext(db, n, g) })).filter(({ k }) => istOrgan(k)).map(({ g, k }) => ({ id: g.id, name: g.name, rollen: k.rollen, href: `/portal/eg/${g.id}/verwaltung` }));
  const mitgliedIn = new Set(mitgliedschaften.filter((ms) => !["ausgeschieden", "interessent"].includes(ms.mitglied.status)).map((ms) => ms.gemeinschaft.id));
  const offene = x.gemeinschaften.map((g) => oeffentlich(db, g)).filter((g) => g.beitrittOffen && !mitgliedIn.has(g.id));
  const plz = String(n.plz || mitgliedschaften[0]?.mitglied.person?.plz || "");
  const email = String(n.email || "").toLowerCase();
  const interessen = P(db).interessen.filter((i) => i.kontoId === n.id || (email && i.email === email)).map((i) => ({ id: i.id, am: i.erstelltAm, plz: i.plz, rolle: i.rolle, status: i.status, statusLabel: INTERESSE_STATUS[i.status]?.label || i.status, gemeinschaftId: i.gemeinschaftId }));
  const gemeinde = !!n.rollen?.includes("kommune") || eigeneMitglieder(db, n).some((m) => m.art === "gemeinde" && MITGLIED_AKTIV.includes(m.status));
  return {
    heute: heute(), mitgliedschaften, aufgaben, mehrfach, organe, gemeinde, interessen, plz,
    offeneGemeinschaften: offene, vorschlaege: plz ? gemeinschaftenSuchen(offene, { plz }) : [],
    netzbetreiber: x.netzbetreiber.map((b) => ({ id: b.id, kurzname: b.kurzname, name: b.name, nbNummer: b.nbNummer })),
  };
}

export async function ptGemeinschaft(n, gemeinschaftId) {
  anmelden(n);
  const db = await lesenBereit();
  const { g, k } = zugriff(db, n, gemeinschaftId, "eigene_daten", 1);
  const x = E(db);
  const m = eigeneMitglieder(db, n).filter((y) => y.gemeinschaftId === g.id).sort((a, b) => (MITGLIED_AKTIV.includes(b.status) ? 1 : 0) - (MITGLIED_AKTIV.includes(a.status) ? 1 : 0))[0] || null;
  const tarif = tarifVon(db, g.id);
  const basis = {
    heute: heute(), gemeinschaft: { ...oeffentlich(db, g), ...gemeinschaftKurz(g) }, tarif, rollen: k.rollen, organ: istOrgan(k),
    organReiter: istOrgan(k) ? EG_ORGAN_REITER.filter((r) => egStufe(k, r.recht) >= 1) : [], netzentgelt: preise(db, g).regelText,
  };
  if (!m) return { ...basis, mitglied: null, teilnahmen: [], energie: null, belege: { verfuegbar: false, liste: [] }, empfehlungen: [], stunden: grueneStunden(null, { heute: heute() }), meilensteine: [], mehrfach: [], aktionen: {} };
  const tn = teilnahmenEigen(db, g, m);
  const aktiv = tn.filter((t) => ["aktiv", "abmeldung_angefragt", "beendet"].includes(t.status));
  const en = aktiv.length ? await energieFuer(db, g, aktiv) : { verfuegbar: false, hinweis: "Energiedaten gibt es ab der Aktivierung Ihres Zählpunkts.", werte: {}, zeitraeume: zeitraeume(heute()) };
  const bel = await versuch(() => abrechnung.abBelege(n, { gemeinschaftId: g.id, mitgliedId: m.id }));
  const prog = aktiv.length ? await versuch(() => energie.enPrognose(SYS(), g.id)) : { ok: false };
  const stunden = grueneStunden(prog.ok ? prog.wert : null, { heute: heute() });
  // TF-Optimierer (WP3) ist rechenintensiv – auf Abruf über /api/portal/eg/optimierung, nicht beim Seitenaufbau
  const meineIds = new Set(eigeneMitglieder(db, n).map((y) => y.id));
  const meineTn = x.teilnahmen.filter((t) => meineIds.has(t.mitgliedId) && tn.some((y) => y.zaehlpunktId === t.zaehlpunktId));
  const mehrfach = mehrfachUebersicht({ zaehlpunkte: x.zaehlpunkte.filter((z) => tn.some((t) => t.zaehlpunktId === z.id)), teilnahmen: meineTn, gemeinschaften: x.gemeinschaften });
  const jahr = en.werte?.jahr || null;
  const anlagen = x.anlagen.filter((a) => a.eigentuemerMitgliedId === m.id);
  return {
    ...basis, mitglied: mitgliedEigen(m), teilnahmen: tn, energie: en, anlagen: anlagen.map((a) => ({ id: a.id, bezeichnung: a.bezeichnung, art: a.art, kwp: a.kwp, speicherKwh: a.speicherKwh })),
    belege: bel.ok ? { verfuegbar: true, liste: Array.isArray(bel.wert) ? bel.wert : bel.wert?.belege || [] } : { verfuegbar: false, liste: [], hinweis: bel.text },
    stunden, tfVorschlag: null,
    empfehlungen: anreizeFuer({ tarif, heute: heute(), stunden, kennzahlen: jahr, zaehlpunkte: tn, anlagen, mehrfach }),
    meilensteine: jahr?.hatDaten ? meilensteine({ kwh: jahr.eigendeckungKwh, anteilPct: jahr.anteilPct || 0 }) : [],
    zeitfensterHeute: tarifZeitfensterAm(tarif, heute()), mehrfach,
    aktionen: {
      kuendigen: ["aufgenommen", "aktiv"].includes(m.status), zurueckziehen: ["interessent", "antrag", "geprueft"].includes(m.status), tfWunsch: tn.some((t) => ["entwurf", "aktiv"].includes(t.status)),
      kuendigungFruehestens: kuendigungFruehestens(heute(), g.kuendigungsfristTage || KUENDIGUNG_FRIST_TAGE),
    },
    kuendigung: P(db).kuendigungen.filter((y) => y.mitgliedId === m.id).at(-1) || null,
  };
}

export async function ptBelege(n) {
  anmelden(n);
  const db = await lesenBereit();
  const belege = [];
  let hinweis = "";
  let verfuegbar = true;
  for (const m of eigeneMitglieder(db, n).filter((y) => [...MITGLIED_AKTIV, "ausgeschieden"].includes(y.status))) {
    const r = await versuch(() => abrechnung.abBelege(n, { mitgliedId: m.id }));
    if (!r.ok) {
      verfuegbar = false;
      hinweis = r.text;
      continue;
    }
    const g = E(db).gemeinschaften.find((y) => y.id === m.gemeinschaftId);
    for (const b of Array.isArray(r.wert) ? r.wert : r.wert?.belege || []) belege.push({ ...b, gemeinschaft: g?.name || "" });
  }
  return { verfuegbar, hinweis, belege };
}

export async function ptEnergie(n, { zaehlpunktId = "", von = "", bis = "" } = {}) {
  anmelden(n);
  const db = await lesenBereit();
  const meine = new Set(eigeneMitglieder(db, n).map((m) => m.id));
  const t = E(db).teilnahmen.find((y) => y.zaehlpunktId === zaehlpunktId && meine.has(y.mitgliedId));
  if (!t) throw nichtGefunden("Zählpunkt nicht gefunden.");
  const v = datumPruefen(von);
  const b = datumPruefen(bis);
  if (!v || !b || v > b) throw ungueltig("Bitte einen gültigen Zeitraum angeben.");
  if (tageZwischen(v, b) > 366) throw ungueltig("Höchstens ein Jahr je Abruf.");
  const r = await versuch(() => energie.enMessreihen(SYS(), { gemeinschaftId: t.gemeinschaftId, zaehlpunktId, von: v, bis: b }));
  return r.ok ? { verfuegbar: true, zaehlpunktId, von: v, bis: b, daten: r.wert } : { verfuegbar: false, zaehlpunktId, von: v, bis: b, hinweis: r.text };
}

// ================================================================ Beitritt, Kündigung, TF-Wunsch

export async function ptBeitrittAntrag(n, gemeinschaftId, { daten = {} } = {}, { ip = "" } = {}) {
  anmelden(n);
  const db = await lesenBereit();
  const x = E(db);
  const g = x.gemeinschaften.find((y) => y.id === String(gemeinschaftId || ""));
  if (!g) throw nichtGefunden("Gemeinschaft nicht gefunden.");
  if (!BEITRITT_OFFEN.includes(g.status)) throw konflikt("Diese Gemeinschaft nimmt derzeit keine Beitrittsanträge an.");
  const vorhanden = eigeneMitglieder(db, n).find((m) => m.gemeinschaftId === g.id && !["ausgeschieden", "abgelehnt"].includes(m.status));
  if (vorhanden && vorhanden.status !== "interessent") throw konflikt("Sie sind bereits Mitglied bzw. Ihr Antrag liegt der Gemeinschaft vor.");
  const b = fach(() => beitrittBereinigen(daten, { gemeinschaft: g, netzbetreiber: x.netzbetreiber }));
  const person = { ...b.mitglied.person, email: String(n.email || "").toLowerCase() };
  // Vorprüfung, bevor irgendetwas geschrieben wird (Zulässigkeit, Zählpunkt-Eigentum, Σ TF ≤ 100, max. 5 Teilnahmen)
  fach(() => mitgliedBereinigen({ ...b.mitglied, person }, { gemeinschaft: g }));
  for (const z of b.zaehlpunkte) {
    const kurz = `…${z.zaehlpunktnummer.slice(-6)}`;
    const alt = x.zaehlpunkte.find((y) => y.zaehlpunktnummer === z.zaehlpunktnummer);
    if (alt?.inhaberKontoId && alt.inhaberKontoId !== n.id) throw konflikt(`Der Zählpunkt ${kurz} ist bereits einem anderen Konto zugeordnet. Bitte wenden Sie sich an die Gemeinschaft.`);
    if (alt && alt.richtung !== z.richtung) throw konflikt(`Der Zählpunkt ${kurz} ist als ${ZP_RICHTUNGEN[alt.richtung].label} erfasst.`);
    if (alt) {
      const r = teilnahmeRegeln(x.teilnahmen.filter((t) => t.zaehlpunktId === alt.id), { gemeinschaftId: g.id, teilnahmefaktor: z.teilnahmefaktor }, { fremdTf: z.fremdTf, fremdAnzahl: z.fremdAnzahl });
      if (!r.ok) throw konflikt(`Zählpunkt ${kurz}: ${r.fehler}`);
    } else if (z.teilnahmefaktor + z.fremdTf > 100) throw konflikt(`Zählpunkt ${kurz}: Teilnahmefaktor und Anteile in anderen Gemeinschaften ergeben mehr als 100 %.`);
  }
  const sys = SYS();
  const am = jetzt();
  const dokumente = BEITRITT_DOKUMENTE.filter((d) => b.zustimmungen.includes(d.id)).map((d) => ({ id: d.id, titel: d.titel, version: BEITRITT_VERSION }));
  const mdaten = { ...b.mitglied, person, kontoId: n.id, vertraege: dokumente.map((d) => ({ art: d.id, dokumentId: "", version: d.version, am: am.slice(0, 10) })), sepaMandat: b.mitglied.iban ? { referenz: `EG-${neueId("M").slice(-6)}`, datum: heute(), status: "aktiv" } : { referenz: "", datum: "", status: "" } };
  let mitglied;
  if (vorhanden) {
    await egMitgliedSpeichern(sys, { id: vorhanden.id, daten: mdaten });
    mitglied = await egMitgliedStatus(sys, vorhanden.id, { nach: "antrag" });
  } else {
    mitglied = await egMitgliedSpeichern(sys, { gemeinschaftId: g.id, daten: { ...mdaten, status: "antrag" } });
  }
  const angelegt = [];
  const name = mitgliedName({ person });
  for (const z of b.zaehlpunkte) {
    let anlageId = null;
    if (z.richtung === "erzeugung" && z.kwp) {
      const a = await egAnlageSpeichern(sys, { gemeinschaftId: g.id, daten: { bezeichnung: z.bezeichnung || `PV ${name}`, art: "pv", kwp: z.kwp, engpassleistungKw: z.kwp, eigentuemerMitgliedId: mitglied.id, betreiber: name, haushalt: b.mitglied.art === "privat", status: "aktiv" } });
      anlageId = a?.id || null;
    }
    const { zaehlpunkt } = await egZaehlpunktSpeichern(sys, { gemeinschaftId: g.id, daten: { zaehlpunktnummer: z.zaehlpunktnummer, richtung: z.richtung, bezeichnung: z.bezeichnung, smartMeter: z.smartMeter, inhaberKontoId: n.id, inhaberName: name, anlageId } });
    const t = await egTeilnahmeSpeichern(sys, { gemeinschaftId: g.id, daten: { zaehlpunktId: zaehlpunkt.id, mitgliedId: mitglied.id, teilnahmefaktor: z.teilnahmefaktor, fremdTf: z.fremdTf, fremdAnzahl: z.fremdAnzahl } });
    angelegt.push({ teilnahmeId: t.id, zaehlpunktnummer: zaehlpunkt.zaehlpunktnummer, teilnahmefaktor: t.teilnahmefaktor });
  }
  const nachweis = sha256(JSON.stringify({ gemeinschaftId: g.id, mitgliedId: mitglied.id, kontoId: n.id, dokumente, name: b.unterschrift.name, am }));
  await aendern((d) => {
    const pd = portalDaten(d);
    pd.beitritte.push({ id: `BT-${mitglied.id}-${pd.beitritte.length + 1}`, gemeinschaftId: g.id, mitgliedId: mitglied.id, kontoId: n.id, am, ip: String(ip || "").slice(0, 64), dokumente, unterschrift: { name: b.unterschrift.name, art: "einfache elektronische Signatur", am, hash: nachweis }, zaehlpunkte: angelegt });
    for (const i of pd.interessen.filter((y) => (y.kontoId === n.id || y.email === person.email) && !["beigetreten", "verworfen"].includes(y.status))) Object.assign(i, { status: "beigetreten", gemeinschaftId: g.id, geaendertAm: am });
    protokoll(d, n, "eg_beitritt", "eg_gemeinschaft", g.id, `Beitrittsantrag (${angelegt.length} Zählpunkt${angelegt.length === 1 ? "" : "e"}), Nachweis ${nachweis.slice(0, 12)}`);
    benachrichtigen(d, nutzerById(d, n.id), { art: "system", titel: `Beitrittsantrag „${g.name}“`, text: "Ihr Antrag ist eingegangen. Als Nächstes entscheidet die Gemeinschaft über die Aufnahme – danach melden wir Ihren Zählpunkt beim Netzbetreiber an.", link: `/portal/eg/${g.id}`, objektArt: "eg_gemeinschaft", objektId: g.id }, { mail: false });
  });
  const db2 = await lesen();
  const m2 = E(db2).mitglieder.find((y) => y.id === mitglied.id);
  return { ok: true, gemeinschaftId: g.id, mitglied: mitgliedEigen(m2), teilnahmen: teilnahmenEigen(db2, g, m2), nachweis: { hash: nachweis, am, dokumente } };
}

export async function ptKuendigung(n, mitgliedId, { zum = "" } = {}) {
  anmelden(n);
  const db = await lesenBereit();
  const m = eigeneMitglieder(db, n).find((y) => y.id === String(mitgliedId || ""));
  if (!m) throw nichtGefunden("Mitgliedschaft nicht gefunden.");
  const g = E(db).gemeinschaften.find((y) => y.id === m.gemeinschaftId);
  const sys = SYS();
  if (["interessent", "antrag", "geprueft"].includes(m.status)) {
    for (const t of E(db).teilnahmen.filter((y) => y.mitgliedId === m.id && y.status === "entwurf")) await egTeilnahmeUebergang(sys, t.id, { ereignis: "verwerfen", grund: "Antrag durch das Mitglied zurückgezogen" });
    const r = await egMitgliedStatus(sys, m.id, { nach: "abgelehnt", grund: "Antrag durch das Mitglied zurückgezogen" });
    await aendern((d) => {
      portalDaten(d).kuendigungen.push({ id: `KD-${m.id}-${Date.now()}`, mitgliedId: m.id, gemeinschaftId: m.gemeinschaftId, kontoId: n.id, art: "zurueckgezogen", am: jetzt(), zum: "" });
      protokoll(d, n, "eg_antrag_zurueck", "eg_gemeinschaft", m.gemeinschaftId, `Beitrittsantrag Mitglied ${m.mitgliedsnummer} zurückgezogen`);
    });
    return { ok: true, art: "zurueckgezogen", status: r.status, text: "Ihr Antrag ist zurückgezogen." };
  }
  if (!["aufgenommen", "aktiv"].includes(m.status)) throw konflikt(m.status === "gekuendigt" ? `Die Mitgliedschaft ist bereits zum ${datumDe(m.austrittZum)} gekündigt.` : "Diese Mitgliedschaft kann nicht gekündigt werden.");
  const frueh = kuendigungFruehestens(heute(), g?.kuendigungsfristTage || KUENDIGUNG_FRIST_TAGE);
  const d = datumPruefen(zum) || frueh;
  if (d < frueh) throw ungueltig(`Frühestmöglicher Austritt laut Kündigungsfrist: ${datumDe(frueh)}.`);
  const r = await egMitgliedStatus(sys, m.id, { nach: "gekuendigt", zum: d });
  await aendern((db3) => {
    portalDaten(db3).kuendigungen.push({ id: `KD-${m.id}-${Date.now()}`, mitgliedId: m.id, gemeinschaftId: m.gemeinschaftId, kontoId: n.id, art: "kuendigung", am: jetzt(), zum: d });
    protokoll(db3, n, "eg_kuendigung", "eg_gemeinschaft", m.gemeinschaftId, `Kündigung durch Mitglied ${m.mitgliedsnummer} zum ${d}`);
  });
  return { ok: true, art: "kuendigung", status: r.status, austrittZum: d, text: `Ihre Kündigung ist eingegangen. Die Gemeinschaft meldet Ihre Zählpunkte zum ${datumDe(d)} beim Netzbetreiber ab und erstellt die Schlussabrechnung.` };
}

export async function ptTfWunsch(n, teilnahmeId, { teilnahmefaktor } = {}) {
  anmelden(n);
  const db = await lesenBereit();
  const x = E(db);
  const meine = new Set(eigeneMitglieder(db, n).map((m) => m.id));
  const t = x.teilnahmen.find((y) => y.id === String(teilnahmeId || "") && meine.has(y.mitgliedId));
  if (!t) throw nichtGefunden("Teilnahme nicht gefunden.");
  const tf = ganz(teilnahmefaktor, 1, 100);
  if (tf === null) throw ungueltig("Der Teilnahmefaktor ist eine ganze Zahl von 1 bis 100 %.");
  if (tf === t.teilnahmefaktor) throw konflikt("Dieser Teilnahmefaktor gilt bereits.");
  const r = teilnahmeRegeln(x.teilnahmen.filter((y) => y.zaehlpunktId === t.zaehlpunktId), { id: t.id, gemeinschaftId: t.gemeinschaftId, teilnahmefaktor: tf });
  if (!r.ok) throw konflikt(r.fehler);
  if (t.status === "entwurf") {
    const neu = await egTeilnahmeSpeichern(SYS(), { gemeinschaftId: t.gemeinschaftId, id: t.id, daten: { zaehlpunktId: t.zaehlpunktId, mitgliedId: t.mitgliedId, teilnahmefaktor: tf } });
    await aendern((d) => protokoll(d, n, "eg_tf_wunsch", "eg_gemeinschaft", t.gemeinschaftId, `TF-Wunsch ${t.teilnahmefaktor} → ${tf} % (Entwurf, direkt übernommen)`));
    return { ok: true, umgesetzt: true, teilnahmefaktor: neu.teilnahmefaktor, text: "Übernommen – der neue Teilnahmefaktor gilt für die Anmeldung beim Netzbetreiber." };
  }
  if (t.status !== "aktiv") throw konflikt("Während die Anmeldung läuft, kann der Teilnahmefaktor nicht geändert werden.");
  const wunsch = { id: `TW-${t.id}-${Date.now()}`, teilnahmeId: t.id, gemeinschaftId: t.gemeinschaftId, mitgliedId: t.mitgliedId, kontoId: n.id, von: t.teilnahmefaktor, nach: tf, am: jetzt(), status: "offen" };
  await aendern((d) => {
    const pd = portalDaten(d);
    for (const w of pd.tfWuensche.filter((y) => y.teilnahmeId === t.id && y.status === "offen")) w.status = "ersetzt";
    pd.tfWuensche.push(wunsch);
    protokoll(d, n, "eg_tf_wunsch", "eg_gemeinschaft", t.gemeinschaftId, `TF-Wunsch ${t.teilnahmefaktor} → ${tf} % (an die Gemeinschaft, EC_PRTFACT_CHG)`);
  });
  return { ok: true, umgesetzt: false, wunsch, text: "Ihr Wunsch ist bei der Gemeinschaft. Sie meldet die Änderung elektronisch beim Netzbetreiber; derzeit ist eine Änderung pro Tag möglich." };
}

// ================================================================ TF-Wünsche in der Gemeinschaft (Verwaltung / Backoffice)

/**
 * Offene TF-Wünsche der Mitglieder einer Gemeinschaft mit Vorprüfung (Σ ≤ 100 %, eine Änderung pro Tag, laufender Prozess).
 * Sehen: mitgliederliste ≥ 1 (Organe, Backoffice-Pflege). Auslösen (darfAusloesen): eda_ausloesen 2 (Organisator/Gründung).
 */
const TF_TAG_BELEGT = ["gesendet", "bestaetigt", "abgeschlossen", "freigabe_offen", "entwurf"]; // wie eda/automat.js tfAenderungPruefen
export async function ptTfWuensche(n, gemeinschaftId) {
  anmelden(n);
  const db = await lesenBereit();
  const { g, k } = zugriff(db, n, gemeinschaftId, "mitgliederliste", 1);
  const x = E(db);
  const prozesse = (db.egEda?.prozesse || []).filter((p) => p.gemeinschaftId === g.id);
  const ab = plusTage(heute(), 1);
  const wuensche = P(db).tfWuensche.filter((w) => w.gemeinschaftId === g.id && w.status === "offen").map((w) => {
    const t = x.teilnahmen.find((y) => y.id === w.teilnahmeId);
    const z = t ? x.zaehlpunkte.find((y) => y.id === t.zaehlpunktId) : null;
    const m = x.mitglieder.find((y) => y.id === w.mitgliedId);
    const fehler = [];
    if (!t || t.status !== "aktiv") fehler.push("Die Teilnahme ist nicht (mehr) aktiv.");
    else {
      if (t.teilnahmefaktor === w.nach) fehler.push("Der gewünschte Teilnahmefaktor gilt bereits.");
      const r = teilnahmeRegeln(x.teilnahmen.filter((y) => y.zaehlpunktId === t.zaehlpunktId), { id: t.id, gemeinschaftId: g.id, teilnahmefaktor: w.nach });
      if (!r.ok) fehler.push(r.fehler);
      if ((t.tfHistorie || []).some((h) => h.gueltigAb === ab) || prozesse.some((p) => p.teilnahmeId === t.id && p.prozesscode === "EC_PRTFACT_CHG" && p.parameter?.ab === ab && TF_TAG_BELEGT.includes(p.status))) fehler.push("Für morgen ist bereits eine Änderung gemeldet (eine Änderung pro Tag).");
    }
    return { id: w.id, teilnahmeId: w.teilnahmeId, mitgliedId: w.mitgliedId, mitgliedName: m ? mitgliedName(m) : "", mitgliedsnummer: m?.mitgliedsnummer || null, zaehlpunktnummer: z?.zaehlpunktnummer || "", richtung: z?.richtung || "", aktuellTf: t?.teilnahmefaktor ?? null, von: w.von, nach: w.nach, am: w.am, ab, ok: !fehler.length, fehler };
  });
  return { gemeinschaftId: g.id, wuensche, darfAusloesen: egStufe(k, "eda_ausloesen") >= 2, ab, heute: heute() };
}

/**
 * TF-Wünsche umsetzen: entscheidung "melden" → edaTfAendern (EC_PRTFACT_CHG, WP2 prüft 1 Änderung/Tag und Σ ≤ 100 %,
 * Vier-Augen ab Masse) bzw. "ablehnen" (mit Grund). Recht eda_ausloesen 2. Ergebnis je Wunsch; offene Fehlerfälle bleiben offen.
 */
export async function ptTfWunschUmsetzen(n, gemeinschaftId, { wunschIds = [], entscheidung = "melden", ab = "", grund = "" } = {}) {
  anmelden(n);
  if (!["melden", "ablehnen"].includes(entscheidung)) throw ungueltig("Entscheidung: melden oder ablehnen.");
  const ids = [...new Set((Array.isArray(wunschIds) ? wunschIds : []).map(String))].slice(0, 200);
  if (!ids.length) throw ungueltig("Bitte mindestens einen Wunsch auswählen.");
  const db = await lesenBereit();
  const { g } = zugriff(db, n, gemeinschaftId, "eda_ausloesen", 2);
  const offen = P(db).tfWuensche.filter((w) => ids.includes(w.id) && w.gemeinschaftId === g.id && w.status === "offen");
  if (!offen.length) throw nichtGefunden("Keine offenen Wünsche ausgewählt.");
  const am = jetzt();
  if (entscheidung === "ablehnen") {
    const text = String(grund || "").trim().slice(0, 300);
    if (!text) throw ungueltig("Bitte einen Grund für die Ablehnung angeben.");
    await aendern((d) => {
      for (const w of portalDaten(d).tfWuensche.filter((y) => offen.some((o) => o.id === y.id))) Object.assign(w, { status: "abgelehnt", grund: text, erledigtAm: am, erledigtVon: n.id });
      protokoll(d, n, "eg_tf_wunsch_erledigt", "eg_gemeinschaft", g.id, `${offen.length} TF-Wunsch/Wünsche abgelehnt: ${text}`);
    });
    return { gemeldet: 0, abgelehnt: offen.length, fehler: [], prozesse: [], freigabeNoetig: false };
  }
  const abT = datumPruefen(ab) || plusTage(heute(), 1);
  // je Teilnahme nur der jüngste Wunsch (eine Änderung pro Tag)
  const jeTn = new Map();
  for (const w of offen) if (!jeTn.has(w.teilnahmeId) || jeTn.get(w.teilnahmeId).am < w.am) jeTn.set(w.teilnahmeId, w);
  const r = await eda.edaTfAendern(n, g.id, { aenderungen: [...jeTn.values()].map((w) => ({ teilnahmeId: w.teilnahmeId, teilnahmefaktor: w.nach, ab: abT })) });
  const prozessJeTn = new Map((r.prozesse || []).map((p) => [p.teilnahmeId, p]));
  const fehler = (r.fehler || []).map((f) => ({ id: [...jeTn.values()].find((w) => w.teilnahmeId === f.id)?.id || f.id, teilnahmeId: f.id, fehler: f.fehler }));
  await aendern((d) => {
    for (const w of portalDaten(d).tfWuensche) {
      if (!offen.some((o) => o.id === w.id)) continue;
      const p = prozessJeTn.get(w.teilnahmeId);
      if (p) Object.assign(w, { status: "gemeldet", prozessId: p.id, ab: abT, erledigtAm: am, erledigtVon: n.id, freigabeOffen: p.status === "freigabe_offen" });
    }
    protokoll(d, n, "eg_tf_wunsch_erledigt", "eg_gemeinschaft", g.id, `${prozessJeTn.size} TF-Wunsch/Wünsche als EC_PRTFACT_CHG ab ${abT} gemeldet${fehler.length ? `, ${fehler.length} nicht möglich` : ""}`);
  });
  return { gemeldet: prozessJeTn.size, abgelehnt: 0, fehler, prozesse: r.prozesse || [], freigabeNoetig: !!r.freigabeNoetig, ab: abT };
}

// ================================================================ Interessent, Gemeinde, Auskunft, Rechner

export async function ptInteresse(n, { daten = {} } = {}, { ip = "" } = {}) {
  const db = await lesenBereit();
  const x = E(db);
  const angemeldet = n && !n.system ? n : null;
  const i = fach(() => interesseBereinigen({ ...daten, email: daten.email || angemeldet?.email || "", vorname: daten.vorname || angemeldet?.vorname || "", nachname: daten.nachname || angemeldet?.nachname || "", firma: daten.firma || angemeldet?.firma || "" }, { netzbetreiber: x.netzbetreiber }));
  if (i.gemeinschaftId) {
    const g = x.gemeinschaften.find((y) => y.id === i.gemeinschaftId);
    if (!g || !BEITRITT_OFFEN.includes(g.status)) i.gemeinschaftId = "";
  }
  const cluster = interesseCluster(i, x.netzbetreiber);
  const am = jetzt();
  let id = "";
  await aendern((d) => {
    const pd = portalDaten(d);
    const alt = pd.interessen.find((y) => y.email === i.email && y.plz === i.plz && ["neu", "kontaktiert", "zugeordnet"].includes(y.status));
    const satz = { ...i, cluster, kontoId: angemeldet?.id || alt?.kontoId || null, einwilligungNachweis: { text: INTERESSE_EINWILLIGUNG, am, ip: String(ip || "").slice(0, 64) }, geaendertAm: am };
    if (alt) {
      Object.assign(alt, satz);
      id = alt.id;
    } else {
      id = neueId("EIN");
      pd.interessen.push({ id, ...satz, status: "neu", erstelltAm: am });
    }
    protokoll(d, angemeldet, "eg_interesse", "eg_interesse", id, `Interesse ${cluster.schluessel} (${i.rolle})`);
  });
  const liste = x.gemeinschaften.map((g) => oeffentlich(db, g));
  return { ok: true, id, cluster: { netzbetreiberId: cluster.netzbetreiberId, plz: cluster.plz }, passend: gemeinschaftenSuchen(liste, { plz: i.plz, zaehlpunktnummer: i.zaehlpunktnummer, netzbetreiber: x.netzbetreiber }).slice(0, 5) };
}

export async function ptGemeindeSicht(n) {
  anmelden(n);
  const db = await lesenBereit();
  const x = E(db);
  const eigene = eigeneMitglieder(db, n).filter((m) => m.art === "gemeinde" && [...MITGLIED_AKTIV, "antrag", "geprueft"].includes(m.status));
  if (!eigene.length && !n.rollen?.includes("kommune")) throw verboten("Die Gemeinde-Sicht steht Gemeinden zur Verfügung.");
  const gemeinden = [];
  for (const m of eigene) {
    const g = x.gemeinschaften.find((y) => y.id === m.gemeinschaftId);
    if (!g) continue;
    const tn = teilnahmenEigen(db, g, m);
    const zr = zeitraeume(heute());
    const p = preise(db, g);
    const pw = await versuch(() => energie.enPeriodenwerte(SYS(), g.id, zr.jahr.von, zr.jahr.bis));
    const werte = pw.ok ? pw.wert?.zaehlpunkte || [] : [];
    const wert = (tid, gr) => Number(werte.find((w) => w.teilnahmeId === tid)?.groessen?.[gr]) || 0;
    const gebaeude = tn.map((t) => {
      const e = werte.find((w) => w.teilnahmeId === t.id);
      return { ...t, jahr: e ? energieKennzahlen([{ ...e, richtung: t.richtung }], p) : null };
    });
    const alleTn = x.teilnahmen.filter((t) => t.gemeinschaftId === g.id);
    const mitglieder = x.mitglieder.filter((y) => y.gemeinschaftId === g.id);
    const aktivM = mitglieder.filter((y) => MITGLIED_AKTIV.includes(y.status));
    const schutzIds = new Set(aktivM.filter((y) => y.schutzbeduerftig).map((y) => y.id));
    const richtung = (t) => x.zaehlpunkte.find((z) => z.id === t.zaehlpunktId)?.richtung;
    const erz = (tid) => wert(tid, "erzeugung_tf") || wert(tid, "erzeugung_gemessen");
    const erzAlle = alleTn.filter((t) => richtung(t) === "erzeugung").reduce((s, t) => s + erz(t.id), 0);
    const erzGemeinde = tn.filter((t) => t.richtung === "erzeugung").reduce((s, t) => s + erz(t.id), 0);
    const edSchutz = alleTn.filter((t) => schutzIds.has(t.mitgliedId) && richtung(t) !== "erzeugung").reduce((s, t) => s + wert(t.id, "eigendeckung"), 0);
    const tarif = tarifVon(db, g.id);
    const sq = sozialquote({ erzeugungKwh: erzGemeinde, anSchutzbeduerftigeKwh: erzAlle > 0 ? (edSchutz * erzGemeinde) / erzAlle : 0, schutzbeduerftigeHaushalte: schutzIds.size, sozialtarif: tarif?.sozialtarif || null });
    const nachArt = Object.entries(aktivM.reduce((s, y) => ({ ...s, [y.art]: (s[y.art] || 0) + 1 }), {})).map(([art, anzahl]) => ({ art, label: MITGLIED_ARTEN[art]?.label || art, anzahl })).sort((a, b) => b.anzahl - a.anzahl);
    const plzBereich = oeffentlich(db, g).plzBereich;
    gemeinden.push({
      gemeinschaft: gemeinschaftKurz(g), mitglied: mitgliedEigen(m), gebaeude, energieVerfuegbar: pw.ok, energieHinweis: pw.ok ? "" : pw.text,
      sozialquote: { ...sq, gilt: tn.some((t) => t.richtung === "erzeugung") },
      beteiligung: { mitgliederAktiv: aktivM.length, nachArt, antraegeOffen: mitglieder.filter((y) => ["antrag", "geprueft"].includes(y.status)).length, zustimmungOffen: alleTn.filter((t) => t.status === "zustimmung_offen").length, interessenImGebiet: P(db).interessen.filter((i) => plzBereich.includes(i.plz) && ["neu", "kontaktiert", "zugeordnet"].includes(i.status)).length },
      tarif: tarif ? { bezeichnung: tarif.bezeichnung, bezugspreisCt: tarif.bezugspreisCt, einspeisepreisCt: tarif.einspeisepreisCt, sozialtarif: tarif.sozialtarif } : null,
      summe: { gebaeude: tn.length, aktiv: tn.filter((t) => t.status === "aktiv").length, erzeugungKwp: Math.round(x.anlagen.filter((a) => a.eigentuemerMitgliedId === m.id).reduce((s, a) => s + (Number(a.kwp) || 0), 0) * 10) / 10 },
    });
  }
  const gr = await versuch(() => gruendung.grAuftraege(n));
  return { heute: heute(), gemeinden, gruendung: gr.ok ? { verfuegbar: true, auftraege: Array.isArray(gr.wert) ? gr.wert : gr.wert?.auftraege || [] } : { verfuegbar: false, auftraege: [], hinweis: gr.text } };
}

export async function ptDatenauskunft(n) {
  anmelden(n);
  const db = await lesenBereit();
  const x = E(db);
  const mitglieder = eigeneMitglieder(db, n);
  const ids = new Set(mitglieder.map((m) => m.id));
  const teilnahmen = x.teilnahmen.filter((t) => ids.has(t.mitgliedId));
  const zps = new Set(teilnahmen.map((t) => t.zaehlpunktId));
  const pd = P(db);
  const email = String(n.email || "").toLowerCase();
  const auskunft = {
    erstelltAm: jetzt(), rechtsgrundlage: "Art. 15 DSGVO",
    verantwortlich: "die jeweilige Energiegemeinschaft; ÖkoInvest als Auftragsverarbeiter (Organisator), soweit beauftragt",
    konto: { id: n.id, email: n.email, vorname: n.vorname, nachname: n.nachname },
    mitgliedschaften: mitglieder.map((m) => ({ ...m, gemeinschaft: x.gemeinschaften.find((g) => g.id === m.gemeinschaftId)?.name || "" })),
    zaehlpunkte: x.zaehlpunkte.filter((z) => zps.has(z.id)),
    teilnahmen,
    anlagen: x.anlagen.filter((a) => ids.has(a.eigentuemerMitgliedId)),
    interessen: pd.interessen.filter((i) => i.kontoId === n.id || (email && i.email === email)),
    beitritte: pd.beitritte.filter((b) => b.kontoId === n.id),
    tfWuensche: pd.tfWuensche.filter((w) => w.kontoId === n.id),
    kuendigungen: pd.kuendigungen.filter((k) => k.kontoId === n.id),
    hinweis: "Viertelstundenwerte und Belege stellen wir auf Wunsch zusätzlich als Datei bereit (Energiedaten bzw. Abrechnung).",
  };
  await aendern((d) => protokoll(d, n, "eg_datenauskunft", "konto", n.id, "Datenauskunft Energiegemeinschaften erstellt"));
  return auskunft;
}

export async function ptRechner(_n, { daten = {} } = {}) {
  return rechnerOeffentlich(daten && typeof daten === "object" && !Array.isArray(daten) ? daten : {});
}
