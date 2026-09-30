// src/lib/plattform/backend/demo/planung.js
//
// Planungsdateien (CAD) & Projektkostenkalkulation im Demo-Backend – Referenz für plattform/api/planung.py
// (Vertrag: docs/API.md, Abschnitt „Planungsdateien & Projektkosten“). Daten unter db.planung (eigene Sammlung, einmalig
// mit Demo-Plänen ergänzt, sobald die Projektentwicklung Demo-Daten hat – planung-seed.js).
//
// Rechte (jede Operation prüft Rolle UND Eigentum selbst):
//   Pläne         Backoffice mit Bereich „entwicklung“ lesen/schreiben (rechte.js); Gutachter/Planer nur Pläne an ihnen
//                 zugewiesenen Meilensteinen bzw. eigene Pläne (Hochladen, „zur Prüfung“); Co-Investor (Freigabe mit
//                 Schalter „Dokumente“) nur freigegebene Versionen; Eigentümer und alle anderen: 403.
//   Kalkulation   nur Backoffice (lesen ≥ 1, schreiben = 2) – Kosten sind intern.

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { intern } from "../demo";
import { aendern, lesen, uploadLesen, uploadSchreiben } from "./speicher";
import { jetzt, neueId, zufallsToken } from "./hilfen";
import { teamRolle } from "./teams";
import { planungSeed } from "./planung-seed";
import { entwicklungIst } from "./finanzen";
import { BLATTFORMATE, FORMATE, MASSSTAEBE, PLANARTEN, PLAN_AKTIONEN, PLAN_STATUS, aktionPruefen, formatErkennen, naechsterIndex, planZugriff } from "../../planung/regeln";
import { analyseDatei } from "../../planung/analyse";
import { dwgNachDxf, konverterKonfiguriert } from "../../planung/konverter";
import { kalkulationAusgabe, parameterFuer as parameterFuerRoh } from "../../planung/ausgabe";
import { GEWERKE, KOSTENSTAENDE, KOSTENSTAND_IDS, VERLEGEARTEN, berechnen, r2, standSchnappschuss, trasseSetzen, uebernahmeAusDxf, vorschlag, zusammenfuehren } from "../../planung/kosten";

const { protokoll, benachrichtigen, nutzerById, nameVon } = intern;

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const boLesen = (n) => istAdmin(n) && darfLesen(n, "entwicklung");
const boSchreiben = (n) => istAdmin(n) && darfSchreiben(n, "entwicklung");

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

const leer = () => ({ v: 1, plaene: [], versionen: [], kalkulationen: [], staende: [] });

async function lesenBereit() {
  const db = await lesen();
  if (db.planung?.v || !db.entwicklung?.v) return db;
  await aendern((d) => {
    if (d.planung?.v || !d.entwicklung?.v) return;
    d.planung = leer();
    try {
      planungSeed(d);
    } catch (e) {
      console.warn("[plattform-demo] Planungs-Demodaten nicht ergänzt:", e?.message);
    }
  });
  return lesen();
}
const PL = (db) => (db.planung ||= leer());

function projektLaden(db, id) {
  const p = (db.entwicklung?.projekte || []).find((x) => x.id === v.kennung(id));
  if (!p) throw nichtGefunden("Entwicklungsprojekt nicht gefunden.");
  return p;
}
const meilensteine = (db, pid) => (db.entwicklung?.meilensteine || []).filter((m) => m.projektId === pid).sort((a, b) => (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0));

function freigabeFuer(db, n, p) {
  if (!n?.rollen?.includes("investor")) return null;
  return (p.freigaben || []).find((fg) => (fg.nutzerId && fg.nutzerId === n.id) || (fg.organisationId && teamRolle(db, n.id, fg.organisationId))) || null;
}

/** Zugriffskontext des Nutzers auf ein Projekt */
function kontext(db, n, p) {
  const gutachterMs = new Set(n?.rollen?.includes("gutachter") ? meilensteine(db, p.id).filter((m) => (m.gutachterIds || []).includes(n.id)).map((m) => m.id) : []);
  return { backoffice: boLesen(n), schreiben: boSchreiben(n), nutzerId: n.id, gutachterMs, investor: freigabeFuer(db, n, p) };
}

const person = (db, id) => {
  const u = id ? nutzerById(db, id) : null;
  return u ? { id: u.id, name: nameVon(db, u.id) } : null;
};

// ================================================================ Ausgabe

function versionAusgabe(db, x, z) {
  const { datei, abgeleitet, ...rest } = x;
  const vorschauArt = x.format === "dxf" ? "dxf" : x.format === "pdf" ? "pdf" : ["geojson", "kml"].includes(x.format) ? x.format : abgeleitet?.art || null;
  const basis = `/api/portal/planung/versionen/${x.id}`;
  return {
    ...rest,
    statusLabel: PLAN_STATUS[x.status]?.label || x.status,
    formatLabel: FORMATE[x.format]?.label || x.format,
    datei: { name: datei?.name, groesse: datei?.groesse, mime: datei?.mime },
    abgeleitet: abgeleitet ? { name: abgeleitet.name, art: abgeleitet.art, groesse: abgeleitet.groesse } : null,
    link: basis,
    vorschau: vorschauArt ? { art: vorschauArt, link: abgeleitet && x.format !== "dxf" && !["geojson", "kml", "pdf"].includes(x.format) ? `${basis}?abgeleitet=1` : basis, seite: `/portal/planung/${x.id}` } : null,
    von: person(db, x.vonId)?.name || "",
    statusVerlauf: z.backoffice ? (x.statusVerlauf || []).map((s) => ({ ...s, von: person(db, s.vonId)?.name || "" })) : undefined,
    analyse: z.backoffice || z.planer ? x.analyse : x.analyse ? { einheit: x.analyse.einheit, groesse: x.analyse.groesse } : null,
  };
}

function planAusgabe(db, plan, z) {
  const alle = PL(db).versionen.filter((x) => x.planId === plan.id).sort((a, b) => String(b.am).localeCompare(String(a.am)));
  const zg = planZugriff(z, plan, alle);
  const sichtbar = alle.filter(zg.version);
  const zz = { ...z, planer: zg.planer };
  const aktuell = sichtbar.find((x) => x.status === "freigegeben") || sichtbar[0] || null;
  const ms = plan.meilensteinId ? (db.entwicklung?.meilensteine || []).find((m) => m.id === plan.meilensteinId) : null;
  return {
    id: plan.id, projektId: plan.projektId, plannummer: plan.plannummer, titel: plan.titel, planart: plan.planart, planartLabel: PLANARTEN[plan.planart] || plan.planart,
    massstab: plan.massstab, blattformat: plan.blattformat, meilensteinId: plan.meilensteinId || null, meilenstein: ms ? { id: ms.id, titel: ms.titel } : null,
    planer: plan.planer || "", planerKonto: z.backoffice ? person(db, plan.planerId) : null, erstelltAm: plan.erstelltAm,
    index: aktuell?.index || "", status: aktuell?.status || "entwurf", statusLabel: PLAN_STATUS[aktuell?.status || "entwurf"]?.label,
    versionen: sichtbar.map((x) => versionAusgabe(db, x, zz)),
    darfHochladen: zg.hochladen, istPlaner: zg.planer,
  };
}

// ================================================================ Pläne

/** Pläne eines Entwicklungsprojekts (gefiltert nach Zugriff) */
export async function planungListe(n, projektId) {
  angemeldet(n);
  const db = await lesenBereit();
  const p = projektLaden(db, projektId);
  const z = kontext(db, n, p);
  const plaene = PL(db).plaene.filter((x) => x.projektId === p.id).map((x) => planAusgabe(db, x, z)).filter((x) => z.backoffice || x.versionen.length || x.istPlaner);
  if (!z.backoffice && !z.gutachterMs.size && !(z.investor && z.investor.dokumente)) throw verboten("Kein Zugriff auf die Pläne dieses Projekts.");
  const ms = meilensteine(db, p.id).filter((m) => z.backoffice || z.gutachterMs.has(m.id)).map((m) => ({ id: m.id, titel: m.titel }));
  return {
    projekt: { id: p.id, titel: p.titel, typ: p.typ },
    plaene: plaene.sort((a, b) => String(a.plannummer).localeCompare(String(b.plannummer), "de", { numeric: true })),
    rechte: { backoffice: z.backoffice, schreiben: z.schreiben, neuerPlan: z.schreiben || z.gutachterMs.size > 0 },
    meilensteine: ms,
    konverter: konverterKonfiguriert(),
    auswahl: { planarten: PLANARTEN, massstaebe: MASSSTAEBE, blattformate: BLATTFORMATE, aktionen: Object.fromEntries(Object.entries(PLAN_AKTIONEN).map(([k, a]) => [k, a.label])) },
  };
}

/** Übersicht für Externe (Gutachter, Co-Investor): Projekte mit sichtbaren Plänen */
export async function planungMeine(n) {
  angemeldet(n);
  const db = await lesenBereit();
  const out = [];
  for (const p of db.entwicklung?.projekte || []) {
    const z = kontext(db, n, p);
    if (!z.backoffice && !z.gutachterMs.size && !(z.investor && z.investor.dokumente)) continue;
    const plaene = PL(db).plaene.filter((x) => x.projektId === p.id).map((x) => planAusgabe(db, x, z)).filter((x) => z.backoffice || x.versionen.length || x.istPlaner);
    if (plaene.length || z.gutachterMs.size) out.push({ projekt: { id: p.id, titel: p.titel }, plaene });
  }
  return out;
}

function planDaten(d = {}, alt = {}) {
  const x = {
    plannummer: v.text(d.plannummer ?? alt.plannummer, 40),
    titel: v.text(d.titel ?? alt.titel, 160),
    planart: v.auswahl(d.planart ?? alt.planart, PLANARTEN, "sonstiges"),
    massstab: v.auswahl(d.massstab ?? alt.massstab, MASSSTAEBE, "ohne"),
    blattformat: v.auswahl(d.blattformat ?? alt.blattformat, BLATTFORMATE, "digital"),
    planer: v.text(d.planer ?? alt.planer, 120),
  };
  if (!x.plannummer) throw ungueltig("Bitte eine Plannummer angeben.");
  if (!x.titel) throw ungueltig("Bitte einen Plantitel angeben.");
  return x;
}

/** Plankopf anlegen/ändern (Backoffice). Neue Pläne entstehen sonst mit dem ersten Upload. */
export async function planungPlanSpeichern(n, projektId, { id = null, daten = {} } = {}) {
  schreibNoetig(n);
  await lesenBereit();
  return aendern((db) => {
    const p = projektLaden(db, projektId);
    const x = planDaten(daten, id ? PL(db).plaene.find((y) => y.id === id) || {} : {});
    const msId = daten.meilensteinId ? v.kennung(daten.meilensteinId) : "";
    if (msId && !meilensteine(db, p.id).some((m) => m.id === msId)) throw ungueltig("Meilenstein gehört nicht zu diesem Projekt.");
    if (PL(db).plaene.some((y) => y.projektId === p.id && y.plannummer.toLowerCase() === x.plannummer.toLowerCase() && y.id !== id)) throw konflikt(`Plannummer „${x.plannummer}“ ist bereits vergeben.`);
    let plan;
    if (id) {
      plan = PL(db).plaene.find((y) => y.id === v.kennung(id) && y.projektId === p.id);
      if (!plan) throw nichtGefunden("Plan nicht gefunden.");
      Object.assign(plan, x, { meilensteinId: msId || null, geaendertAm: jetzt() });
    } else {
      plan = { id: neueId("PL"), projektId: p.id, ...x, meilensteinId: msId || null, planerId: null, erstelltVon: n.id, erstelltAm: jetzt(), geaendertAm: jetzt() };
      PL(db).plaene.push(plan);
    }
    protokoll(db, n, "plan", "entwicklung", p.id, `Plan ${id ? "geändert" : "angelegt"}: ${plan.plannummer} ${plan.titel}`);
    return planAusgabe(db, plan, kontext(db, n, p));
  });
}

async function konvertieren(version, daten) {
  const r = await dwgNachDxf(daten);
  if (!r.ok) return { konvertierung: { status: r.status, hinweis: r.status === "nicht_verfuegbar" ? "Vorschau nach Konvertierung (Dienst nicht eingerichtet)." : r.fehler, am: jetzt() } };
  const datei = `${version.id}-${zufallsToken().slice(0, 12)}.dxf`;
  await uploadSchreiben(datei, r.daten);
  const { analyse } = analyseDatei("dxf", r.daten);
  return {
    konvertierung: { status: "fertig", hinweis: `DWG → DXF in ${Math.round(r.dauerMs / 100) / 10} s`, am: jetzt() },
    abgeleitet: { name: String(version.datei.name || "plan").replace(/\.dwg$/i, "") + ".dxf", mime: FORMATE.dxf.mime, groesse: r.daten.length, datei, art: "dxf" },
    analyse: { ...analyse, dwgVersion: version.analyse?.dwgVersion, dwgRelease: version.analyse?.dwgRelease },
  };
}

/**
 * Upload einer Planversion. Ohne planId entsteht ein neuer Plan (Backoffice oder Gutachter am zugewiesenen Meilenstein).
 * daten = Buffer; Format wird am Inhalt erkannt (formatErkennen), Größenlimit je Format.
 */
export async function planungHochladen(n, { projektId, planId = "", plan = {}, version = {}, name = "", daten } = {}) {
  angemeldet(n);
  const erk = formatErkennen(daten, name);
  if (!erk.ok) throw new PlattformFehler(erk.status, erk.fehler);
  const db0 = await lesenBereit();
  const p0 = projektLaden(db0, projektId);
  const z0 = kontext(db0, n, p0);
  let planAlt = null;
  if (planId) {
    planAlt = PL(db0).plaene.find((x) => x.id === v.kennung(planId) && x.projektId === p0.id);
    if (!planAlt) throw nichtGefunden("Plan nicht gefunden.");
    const zg = planZugriff(z0, planAlt, PL(db0).versionen.filter((x) => x.planId === planAlt.id));
    if (!zg.hochladen) throw verboten("Neue Planstände dürfen nur die Projektentwicklung und der beauftragte Planer hochladen.");
  } else {
    const msId = v.kennung(plan.meilensteinId);
    if (!z0.schreiben && !(msId && z0.gutachterMs.has(msId))) throw verboten("Neue Pläne dürfen nur die Projektentwicklung und zugewiesene Planer/Gutachter anlegen.");
    if (msId && !meilensteine(db0, p0.id).some((m) => m.id === msId)) throw ungueltig("Meilenstein gehört nicht zu diesem Projekt.");
  }
  const endung = FORMATE[erk.format].endung;
  const versionId = neueId("PLV");
  const datei = `${versionId}-${zufallsToken().slice(0, 12)}.${endung}`;
  await uploadSchreiben(datei, daten);
  const { analyse, abgeleitet: abg } = analyseDatei(erk.format, daten, erk.info);
  let abgeleitet = null;
  if (abg) {
    const d2 = `${versionId}-${zufallsToken().slice(0, 12)}-vorschau.geojson`;
    await uploadSchreiben(d2, abg.daten);
    abgeleitet = { name: abg.name, mime: abg.mime, groesse: abg.daten.length, datei: d2, art: abg.art };
  }
  const sauber = v.text(String(name || "").replace(/[\\/:*?"<>|]/g, "_"), 160) || `plan.${endung}`;
  const neu = {
    id: versionId, format: erk.format, datei: { name: sauber, mime: FORMATE[erk.format].mime, groesse: daten.length, datei }, abgeleitet, analyse: { ...analyse, hinweis: erk.info.hinweis || undefined },
    konvertierung: erk.format === "dwg" ? { status: "ausstehend", hinweis: "Vorschau nach Konvertierung", am: jetzt() } : null,
  };
  if (erk.format === "dwg") Object.assign(neu, await konvertieren(neu, daten));

  return aendern((db) => {
    const p = projektLaden(db, projektId);
    const z = kontext(db, n, p);
    let pl;
    if (planId) pl = PL(db).plaene.find((x) => x.id === planAlt.id);
    else {
      const kopf = planDaten(plan);
      if (PL(db).plaene.some((y) => y.projektId === p.id && y.plannummer.toLowerCase() === kopf.plannummer.toLowerCase())) throw konflikt(`Plannummer „${kopf.plannummer}“ ist bereits vergeben – bitte als neuen Planstand zum bestehenden Plan hochladen.`);
      const msId = v.kennung(plan.meilensteinId) || null;
      pl = { id: neueId("PL"), projektId: p.id, ...kopf, meilensteinId: msId, planerId: z.schreiben ? null : n.id, erstelltVon: n.id, erstelltAm: jetzt(), geaendertAm: jetzt() };
      PL(db).plaene.push(pl);
    }
    const vorhanden = PL(db).versionen.filter((x) => x.planId === pl.id);
    const x = {
      ...neu, planId: pl.id, projektId: p.id, index: naechsterIndex(vorhanden.map((y) => y.index)),
      planstand: /^\d{4}-\d{2}-\d{2}$/.test(String(version.planstand || "")) ? version.planstand : jetzt().slice(0, 10),
      planer: v.text(version.planer, 120) || pl.planer || nameVon(db, n.id), aenderung: v.text(version.aenderung, 300) || (vorhanden.length ? "" : "Erstausgabe"),
      status: "entwurf", statusVerlauf: [{ status: "entwurf", am: jetzt(), vonId: n.id, kommentar: "Hochgeladen" }], vonId: n.id, am: jetzt(),
    };
    PL(db).versionen.push(x);
    pl.geaendertAm = jetzt();
    protokoll(db, n, "plan", "entwicklung", p.id, `Planstand ${pl.plannummer} Index ${x.index} hochgeladen (${FORMATE[x.format].label})`);
    return { plan: planAusgabe(db, pl, z), version: versionAusgabe(db, x, { ...z, planer: true }) };
  });
}

function versionFinden(db, id) {
  const x = PL(db).versionen.find((y) => y.id === v.kennung(id));
  if (!x) throw nichtGefunden("Planversion nicht gefunden.");
  const plan = PL(db).plaene.find((y) => y.id === x.planId);
  const p = projektLaden(db, x.projektId);
  return { x, plan, p };
}

/** Statusaktion an einer Version: einreichen | freigeben | zurueckweisen | zurueckziehen | konvertieren | analysieren (Kennzahlen neu auswerten) */
export async function planungVersionAktion(n, versionId, { aktion, kommentar = "" } = {}) {
  angemeldet(n);
  const db0 = await lesenBereit();
  const { x: x0, plan: plan0, p: p0 } = versionFinden(db0, versionId);
  const z0 = kontext(db0, n, p0);
  const zg0 = planZugriff(z0, plan0, [x0]);
  if (!zg0.version(x0)) throw verboten("Kein Zugriff auf diesen Plan.");
  if (aktion === "konvertieren") {
    if (!z0.schreiben) throw verboten("Nur die Projektentwicklung kann die Konvertierung anstoßen.");
    if (x0.format !== "dwg") throw ungueltig("Nur DWG-Dateien werden konvertiert.");
    const erg = await konvertieren(x0, await uploadLesen(x0.datei.datei));
    return aendern((db) => {
      const { x, plan, p } = versionFinden(db, versionId);
      Object.assign(x, erg);
      protokoll(db, n, "plan", "entwicklung", p.id, `Konvertierung ${plan.plannummer} Index ${x.index}: ${erg.konvertierung.status}`);
      return versionAusgabe(db, x, { ...kontext(db, n, p), planer: true });
    });
  }
  if (aktion === "analysieren") {
    if (!z0.schreiben) throw verboten("Nur die Projektentwicklung kann die Auswertung anstoßen.");
    const quelle = x0.format === "dwg" ? x0.abgeleitet : x0.datei;
    if (!quelle?.datei) throw konflikt("Noch keine auswertbare Datei – DWG bitte erst konvertieren.");
    const { analyse } = analyseDatei(x0.format === "dwg" ? "dxf" : x0.format, await uploadLesen(quelle.datei), {});
    return aendern((db) => {
      const { x, plan, p } = versionFinden(db, versionId);
      x.analyse = { ...(x.analyse || {}), ...analyse };
      protokoll(db, n, "plan", "entwicklung", p.id, `Plan ${plan.plannummer} Index ${x.index} ausgewertet`);
      return versionAusgabe(db, x, { ...kontext(db, n, p), planer: true });
    });
  }
  const rolle = z0.schreiben ? "bo" : zg0.planer ? "planer" : "";
  if (!rolle) throw verboten("Dafür fehlt Ihnen das Recht.");
  return aendern((db) => {
    const { x, plan, p } = versionFinden(db, versionId);
    const pr = aktionPruefen(aktion, { status: x.status, rolle, kommentar });
    if (!pr.ok) throw new PlattformFehler(pr.status, pr.fehler);
    x.status = pr.nach;
    x.statusVerlauf = [...(x.statusVerlauf || []), { status: pr.nach, am: jetzt(), vonId: n.id, kommentar: v.text(kommentar, 300) }];
    if (pr.nach === "freigegeben") {
      for (const y of PL(db).versionen) {
        if (y.planId === plan.id && y.id !== x.id && y.status === "freigegeben") {
          y.status = "ersetzt";
          y.statusVerlauf = [...(y.statusVerlauf || []), { status: "ersetzt", am: jetzt(), vonId: n.id, kommentar: `Ersetzt durch Index ${x.index}` }];
        }
      }
      x.freigegebenAm = jetzt();
      x.freigegebenVon = n.id;
    }
    // Benachrichtigungen: Einreichung → Projektleitung; Freigabe/Zurückweisung → Planer (Hochladender, falls extern)
    const pl = p.projektleiterId ? nutzerById(db, p.projektleiterId) : null;
    if (aktion === "einreichen" && pl && pl.id !== n.id) benachrichtigen(db, pl, { art: "entwicklung", titel: `Plan zur Prüfung: ${plan.plannummer}`, text: `${plan.titel} (Index ${x.index}) im Projekt „${p.titel}“ wartet auf Prüfung.`, link: `/portal/admin/entwicklung/${p.id}?reiter=planung`, objektArt: "entwicklung", objektId: p.id }, { mailBetreff: "Plan zur Prüfung – ÖkoInvest", mailText: "Ein Planstand wurde zur Prüfung eingereicht. Details finden Sie im Portal." });
    const hochlader = nutzerById(db, x.vonId);
    if (["freigeben", "zurueckweisen"].includes(aktion) && hochlader && hochlader.id !== n.id && !hochlader.rollen?.includes("admin")) benachrichtigen(db, hochlader, { art: "entwicklung", titel: `Plan ${aktion === "freigeben" ? "freigegeben" : "zurückgewiesen"}: ${plan.plannummer}`, text: `${plan.titel} (Index ${x.index})${kommentar ? ` – ${v.text(kommentar, 160)}` : ""}`, link: `/portal/entwicklung/${p.id}`, objektArt: "entwicklung", objektId: p.id }, { mailBetreff: "Neuigkeiten zu Ihrem Plan – ÖkoInvest", mailText: "Der Status eines Planstands hat sich geändert. Details finden Sie im Portal." });
    protokoll(db, n, "plan", "entwicklung", p.id, `Plan ${plan.plannummer} Index ${x.index}: ${PLAN_STATUS[pr.nach].label}${kommentar ? ` (${v.text(kommentar, 120)})` : ""}`);
    return versionAusgabe(db, x, { ...kontext(db, n, p), planer: true });
  });
}

/** Datei einer Version (Original bzw. abgeleitete DXF/GeoJSON) – Rechte wie Sichtbarkeit, Abruf protokolliert */
export async function planungDatei(n, versionId, { abgeleitet = false } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const { x, plan, p } = versionFinden(db, versionId);
  const z = kontext(db, n, p);
  if (!planZugriff(z, plan, [x]).version(x)) throw verboten("Kein Zugriff auf diesen Plan.");
  const quelle = abgeleitet ? x.abgeleitet : x.datei;
  if (!quelle?.datei) throw nichtGefunden(abgeleitet ? "Für diese Version gibt es (noch) keine abgeleitete Datei." : "Datei nicht gefunden.");
  await aendern((d) => protokoll(d, n, "dokument_abruf", "entwicklung", p.id, `Plan abgerufen: ${plan.plannummer} Index ${x.index}${abgeleitet ? " (abgeleitet)" : ""}`));
  return { name: quelle.name, mime: quelle.mime, daten: await uploadLesen(quelle.datei), format: abgeleitet ? quelle.art : x.format };
}

/** Metadaten einer Version für die Vorschauseite */
export async function planungVersion(n, versionId) {
  angemeldet(n);
  const db = await lesenBereit();
  const { x, plan, p } = versionFinden(db, versionId);
  const z = kontext(db, n, p);
  const zg = planZugriff(z, plan, [x]);
  if (!zg.version(x)) throw verboten("Kein Zugriff auf diesen Plan.");
  return { projekt: { id: p.id, titel: p.titel }, plan: { id: plan.id, plannummer: plan.plannummer, titel: plan.titel, massstab: plan.massstab, blattformat: plan.blattformat, planartLabel: PLANARTEN[plan.planart] }, version: versionAusgabe(db, x, { ...z, planer: zg.planer }), backoffice: z.backoffice };
}

// ================================================================ Kostenkalkulation

function projektParameter(db, p) {
  const fl = (db.entwicklung?.flaechen || []).filter((f) => f.projektId === p.id);
  const gutachten = meilensteine(db, p.id).filter((m) => m.gutachten && m.status !== "entfaellt").map((m) => ({ schluessel: m.schluessel, titel: m.titel }));
  return { typ: p.typ, land: p.land, mwp: Number(p.mwp) || 0, mwh: Number(p.mwh) || 0, flaecheHa: Math.round(fl.reduce((s, f) => s + (Number(f.ha) || 0), 0) * 100) / 100, flaechenAnzahl: Math.max(1, fl.length), gutachten };
}

const parameterFuer = (db, p, k) => parameterFuerRoh(projektParameter(db, p), k);

function akquiseTrasse(db, p) {
  const flIds = new Set((db.entwicklung?.flaechen || []).filter((f) => f.projektId === p.id && f.flaecheId).map((f) => f.flaecheId));
  const ziele = (db.geo?.ziele || []).filter((z) => flIds.has(z.flaecheId) && z.umspannwerk?.trasseM > 0);
  if (!ziele.length) return null;
  const z = ziele.sort((a, b) => a.umspannwerk.trasseM - b.umspannwerk.trasseM)[0];
  return { zielId: z.id, flaecheId: z.flaecheId, trasseM: Math.round(z.umspannwerk.trasseM), umspannwerk: z.umspannwerk.name || z.umspannwerk.art || "", kostenMin: z.umspannwerk.kostenMin, kostenMax: z.umspannwerk.kostenMax, demo: !!z.demo };
}

function dxfQuellen(db, p) {
  return PL(db).versionen
    .filter((x) => x.projektId === p.id && x.analyse?.kennzahlen && x.analyse.kennzahlen.layerGefunden?.length && x.status !== "ersetzt")
    .map((x) => {
      const plan = PL(db).plaene.find((y) => y.id === x.planId);
      return { versionId: x.id, plannummer: plan?.plannummer, titel: plan?.titel, index: x.index, status: x.status, statusLabel: PLAN_STATUS[x.status]?.label, kennzahlen: x.analyse.kennzahlen };
    })
    .sort((a, b) => (a.status === "freigegeben" ? -1 : 0) - (b.status === "freigegeben" ? -1 : 0));
}

async function kalkAusgabe(db, n, p) {
  const k = PL(db).kalkulationen.find((x) => x.projektId === p.id) || null;
  let ist = null;
  try {
    const r = await entwicklungIst(n, p.id);
    ist = { jeArt: r.jeArt || {}, quelle: r.quelle || "plattform" };
  } catch {
    ist = null;
  }
  return kalkulationAusgabe({
    projekt: { id: p.id, titel: p.titel, typ: p.typ, land: p.land, mwp: p.mwp, mwh: p.mwh },
    projektParameter: projektParameter(db, p),
    gespeichert: k ? { id: k.id, kostenstand: k.kostenstand, parameter: k.parameter, positionen: k.positionen, geaendertAm: k.geaendertAm, geaendertVon: person(db, k.vonId)?.name || "" } : null,
    ist,
    staende: PL(db).staende.filter((x) => x.projektId === p.id).map((s) => ({ id: s.id, stand: s.stand, am: s.am, von: person(db, s.vonId)?.name || "", kommentar: s.kommentar, summen: s.summen, gruppen: s.gruppen })),
    uebergabe: p.kostenkalkulation || null,
    quellen: { akquise: akquiseTrasse(db, p), dxf: dxfQuellen(db, p) },
    darfBearbeiten: boSchreiben(n),
  });
}

export async function kalkulationHolen(n, projektId) {
  leseNoetig(n);
  const db = await lesenBereit();
  const p = projektLaden(db, projektId);
  return kalkAusgabe(db, n, p);
}

const zahlOderNull = (x, o) => (x === "" || x === null || x === undefined ? null : v.zahl(x, o));

function parameterPruefen(d = {}, alt = {}) {
  const q = d.trasse?.querungen || {};
  const abschnitte = (Array.isArray(d.trasse?.abschnitte) ? d.trasse.abschnitte : alt.trasse?.abschnitte || []).slice(0, 20).map((a) => ({ art: v.auswahl(a?.art, VERLEGEARTEN, ""), laengeM: v.zahl(a?.laengeM, { min: 0, max: 200000, stellen: 1 }) || 0 })).filter((a) => a.art && a.laengeM > 0);
  const n = (k, o) => (Object.hasOwn(d, k) ? zahlOderNull(d[k], o) : alt[k] ?? null);
  return {
    flaecheHa: n("flaecheHa", { min: 0, max: 100000, stellen: 2 }),
    flaechenAnzahl: n("flaechenAnzahl", { min: 1, max: 500, stellen: 0 }),
    zaunM: n("zaunM", { min: 0, max: 200000, stellen: 1 }),
    trasse: { abschnitte, querungen: { strasse: v.zahl(q.strasse ?? alt.trasse?.querungen?.strasse, { min: 0, max: 100, stellen: 0 }) || 0, bahn: v.zahl(q.bahn ?? alt.trasse?.querungen?.bahn, { min: 0, max: 100, stellen: 0 }) || 0, gewaesser: v.zahl(q.gewaesser ?? alt.trasse?.querungen?.gewaesser, { min: 0, max: 100, stellen: 0 }) || 0 }, quelle: v.text(d.trasse?.quelle ?? alt.trasse?.quelle, 80) },
    speicherNetzbezug: Object.hasOwn(d, "speicherNetzbezug") ? v.wahr(d.speicherNetzbezug) : !!alt.speicherNetzbezug,
    contingency: n("contingency", { min: 0, max: 0.5, stellen: 4 }),
    fkQuote: n("fkQuote", { min: 0, max: 1, stellen: 4 }),
    zinsBau: n("zinsBau", { min: 0, max: 0.2, stellen: 5 }),
    bauzeitMonate: n("bauzeitMonate", { min: 1, max: 36, stellen: 0 }),
  };
}

function positionenPruefen(liste = []) {
  if (!Array.isArray(liste)) return [];
  if (liste.length > 300) throw ungueltig("Höchstens 300 Positionen.");
  const gesehen = new Set();
  const out = [];
  for (const x of liste) {
    let schluessel = v.text(x?.schluessel, 80);
    if (!schluessel || schluessel === "frei:") schluessel = `frei:${zufallsToken().slice(0, 8)}`;
    if (!/^[a-z_]+(:[A-Za-z0-9_-]+)?$/.test(schluessel) || gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);
    const frei = schluessel.startsWith("frei:");
    const gewerk = frei ? v.auswahl(x.gewerk, GEWERKE, "sonstiges") : v.auswahl(x.gewerk, GEWERKE, "sonstiges");
    const pos = {
      schluessel, gewerk, bezeichnung: v.text(x.bezeichnung, 160) || GEWERKE[gewerk].label, art: frei ? "menge" : v.auswahl(x.art, ["menge", "prozent", "zins"], "menge"),
      menge: v.zahl(x.menge, { min: -1e9, max: 1e9, stellen: 3 }), einheit: v.text(x.einheit, 20) || "psch", ep: v.zahl(x.ep, { min: -1e9, max: 1e9, stellen: 4 }),
      satz: v.zahl(x.satz, { min: 0, max: 1, stellen: 6 }), manuell: frei ? true : v.wahr(x.manuell),
      istEur: v.zahl(x.istEur, { min: -1e10, max: 1e10, stellen: 2 }), notiz: v.text(x.notiz, 300), angebot: v.text(x.angebot, 120),
    };
    if (frei && (pos.menge === null || pos.ep === null)) throw ungueltig(`Position „${pos.bezeichnung}“: Menge und Einheitspreis angeben.`);
    out.push(pos);
  }
  return out;
}

/** Kalkulation speichern: { parameter, positionen } – nicht überschriebene Positionen folgen dem Vorschlag */
export async function kalkulationSpeichern(n, projektId, { parameter = {}, positionen = null } = {}) {
  schreibNoetig(n);
  await lesenBereit();
  await aendern((db) => {
    const p = projektLaden(db, projektId);
    let k = PL(db).kalkulationen.find((x) => x.projektId === p.id);
    if (!k) {
      k = { id: neueId("KK"), projektId: p.id, parameter: {}, positionen: [], kostenstand: "schaetzung", erstelltAm: jetzt() };
      PL(db).kalkulationen.push(k);
    }
    k.parameter = parameterPruefen(parameter, k.parameter);
    if (positionen) {
      const neu = positionenPruefen(positionen);
      const par = parameterFuer(db, p, k);
      k.positionen = zusammenfuehren(neu, vorschlag(par)).filter((x) => x.manuell || x.istEur || x.notiz || x.angebot || x.schluessel.startsWith("frei:")).map(({ vorschlag: _v, entfallen: _e, ...rest }) => rest);
    }
    k.geaendertAm = jetzt();
    k.vonId = n.id;
    protokoll(db, n, "kalkulation", "entwicklung", p.id, `Kostenkalkulation gespeichert (${KOSTENSTAENDE[k.kostenstand].label})`);
  });
  return kalkulationHolen(n, projektId);
}

/**
 * Aktionen: festschreiben {stand, kommentar} · trasse_akquise · dxf_uebernehmen {versionId, felder[]} ·
 * vorschlag {schluessel?: [..]} (Überschreibungen zurücksetzen) · uebergeben (Finanzierungsbedarf/Capex an Finanzierung & Bewertung)
 */
export async function kalkulationAktion(n, projektId, { aktion, stand = "", kommentar = "", versionId = "", felder = [], schluessel = null } = {}) {
  schreibNoetig(n);
  const db0 = await lesenBereit();
  const p0 = projektLaden(db0, projektId);
  const vorher = await kalkAusgabe(db0, n, p0);
  await aendern((db) => {
    const p = projektLaden(db, projektId);
    let k = PL(db).kalkulationen.find((x) => x.projektId === p.id);
    if (!k) {
      k = { id: neueId("KK"), projektId: p.id, parameter: {}, positionen: [], kostenstand: "schaetzung", erstelltAm: jetzt() };
      PL(db).kalkulationen.push(k);
    }
    const par = parameterFuer(db, p, k);
    switch (aktion) {
      case "festschreiben": {
        if (!KOSTENSTAND_IDS.includes(stand)) throw ungueltig("Bitte einen Kostenstand wählen.");
        const alt = KOSTENSTAENDE[k.kostenstand]?.nr || 0;
        if (KOSTENSTAENDE[stand].nr < alt && v.text(kommentar, 300).length < 5) throw ungueltig("Rückschritt im Kostenstand: bitte begründen.");
        k.kostenstand = stand;
        const e = berechnen(zusammenfuehren(k.positionen, vorschlag({ ...par, kostenstand: stand })), { ...par, kostenstand: stand });
        PL(db).staende.push({ id: neueId("KS"), projektId: p.id, kalkulationId: k.id, stand, am: jetzt(), vonId: n.id, kommentar: v.text(kommentar, 300), parameter: e.parameter, ...standSchnappschuss(e) });
        protokoll(db, n, "kalkulation", "entwicklung", p.id, `Kostenstand festgeschrieben: ${KOSTENSTAENDE[stand].label} – ${Math.round(e.summen.gesamt / 1000)} T€`);
        break;
      }
      case "trasse_akquise": {
        const a = akquiseTrasse(db, p);
        if (!a) throw konflikt("Für die Flächen dieses Projekts liegt keine Trassenlänge aus der Geodaten-Akquise vor.");
        k.parameter = trasseSetzen(k.parameter, a.trasseM, `akquise:${a.zielId}`);
        protokoll(db, n, "kalkulation", "entwicklung", p.id, `Trassenlänge aus Akquise übernommen: ${a.trasseM} m (${a.umspannwerk})`);
        break;
      }
      case "dxf_uebernehmen": {
        const x = PL(db).versionen.find((y) => y.id === v.kennung(versionId) && y.projektId === p.id);
        if (!x?.analyse?.kennzahlen) throw nichtGefunden("Planversion mit Kennzahlen nicht gefunden.");
        const kz = x.analyse.kennzahlen;
        const erlaubt = uebernahmeAusDxf(par, kz).filter((a) => !a.nurHinweis).map((a) => a.feld);
        const wahl = (Array.isArray(felder) ? felder : []).filter((f) => erlaubt.includes(f));
        if (!wahl.length) throw ungueltig("Bitte mindestens eine Kennzahl zur Übernahme bestätigen.");
        if (wahl.includes("zaunM")) k.parameter.zaunM = Math.round(kz.zaunM);
        if (wahl.includes("flaecheHa")) k.parameter.flaecheHa = kz.anlageHa;
        if (wahl.includes("trasse")) k.parameter = trasseSetzen(k.parameter, Math.round(kz.kabelMsM), `dxf:${x.id}`);
        protokoll(db, n, "kalkulation", "entwicklung", p.id, `Kennzahlen aus Plan übernommen (${wahl.join(", ")})`);
        break;
      }
      case "vorschlag": {
        const nur = Array.isArray(schluessel) ? new Set(schluessel) : null;
        k.positionen = k.positionen
          .map((x) => (!x.schluessel.startsWith("frei:") && (!nur || nur.has(x.schluessel)) ? { ...x, manuell: false } : x))
          .filter((x) => x.manuell || x.istEur || x.notiz || x.angebot || x.schluessel.startsWith("frei:"));
        protokoll(db, n, "kalkulation", "entwicklung", p.id, "Vorschlagswerte wiederhergestellt");
        break;
      }
      case "uebergeben": {
        const s = vorher.summen;
        p.kostenkalkulation = { gesamt: s.gesamt, capex: s.capex, finanzierungsbedarf: s.finanzierungsbedarf, eurProKwp: s.eurProKwp, epcProKwp: s.epcProKwp, stand: k.kostenstand, standLabel: KOSTENSTAENDE[k.kostenstand].label, kalkulationId: k.id, am: jetzt(), vonId: n.id };
        protokoll(db, n, "kalkulation", "entwicklung", p.id, `Projektkosten übergeben: Finanzierungsbedarf ${Math.round(s.finanzierungsbedarf / 1000)} T€, Capex ${Math.round(s.capex / 1000)} T€ (${KOSTENSTAENDE[k.kostenstand].label})`);
        break;
      }
      default:
        throw ungueltig("Unbekannte Aktion.");
    }
    k.geaendertAm = jetzt();
    k.vonId = n.id;
  });
  return kalkulationHolen(n, projektId);
}

/** Übergabewerte für andere Module (Finanzierung, Bewertung/Börse): letzter übergebener Stand oder aktuelle Berechnung */
export async function kalkulationKennzahlen(n, projektId) {
  const k = await kalkulationHolen(n, projektId);
  return { projektId: k.projekt.id, uebergeben: k.uebergabe, aktuell: { gesamt: k.summen.gesamt, capex: k.summen.capex, finanzierungsbedarf: k.summen.finanzierungsbedarf, eurProKwp: k.summen.eurProKwp, stand: k.kostenstand } };
}

export const _intern = { r2 };
