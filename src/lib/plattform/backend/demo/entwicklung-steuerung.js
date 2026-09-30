// src/lib/plattform/backend/demo/entwicklung-steuerung.js
//
// Projektentwicklung – Steuerung im Demo-Backend (Referenz für plattform/api/entwicklung_steuerung.py, docs/API.md Abschnitt 11a):
//   Projektampel über alle Projekte, Pipeline-Bericht MWp je Phase × Land mit Ziel-Abgleich, Kapazitätsplanung der
//   Projektleitungen, projektübergreifendes Risikoregister (Risikokosten, überfällige Prüfungen), Entscheidungsvorlagen für die
//   Geschäftsführung (Zustandsautomat, Vier-Augen-Prinzip, Folgeaktionen), Aufgaben aus fälligen Meilensteinen und
//   Optionsfristen, Grundbuch-Sicherung der Projektflächen.
//
// Daten: db.entwicklungSteuerung { vorlagen[], kapazitaet{kontoId: stunden}, aufgabenLaufAm } sowie Zusatzfelder an
// db.entwicklung (flaechen[].grundbuch/grundbuchDatum/optionBis/optionAufgabeId, meilensteine[].aufgabeId, projekte[].verwertung).
//
// Rechte: Backoffice mit Bereich „entwicklung“ lesen (≥ 1) bzw. schreiben (= 2); Entscheidung über Vorlagen und Kapazitäten
// nur Unterrolle „leitung“ (Geschäftsführung), Vier-Augen-Prinzip (Einreicher entscheidet nicht selbst).

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben, unterrollen } from "../../rechte";
import {
  GRUNDBUCH_HINWEIS, GRUNDBUCH_SICHERUNG, KAPAZITAET, OFFEN, VERWERTUNG, VORLAGE_AKTIONEN, VORLAGE_ARTEN, VORLAGE_OFFEN, VORLAGE_STATUS,
  ampelVerteilung, aufgabenFaellig, geschaeftsmodellEingabenStandard, geschaeftsmodellKurz, dokumentLuecken, kapazitaetsplan, optionsfristen, pipelineMatrix, projektAmpel, projektleiterVorschlag,
  risikoBewertung, sicherungsgrad, vorlageFolgen, vorlageUebergang, zielAbgleich,
} from "../../entwicklung-steuerung";
import { ENTWICKLUNG_TYPEN, PACHT_STATUS, RISIKO_KATEGORIEN, heuteIso, quartal } from "../../entwicklung";
import { geschaeftsmodellVergleich } from "../../finanzierung/geschaeftsmodell";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId } from "./hilfen";
import * as ent from "./entwicklung";

const { benachrichtigen, protokoll, nutzerById, nameVon } = intern;

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const boLesen = (n) => istAdmin(n) && darfLesen(n, "entwicklung");
const boSchreiben = (n) => istAdmin(n) && darfSchreiben(n, "entwicklung");
const istLeitung = (n) => istAdmin(n) && unterrollen(n).includes("leitung");

function leseNoetig(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  if (!boLesen(n)) throw verboten("Nur für das Backoffice (Projektentwicklung).");
}
function schreibNoetig(n) {
  leseNoetig(n);
  if (!boSchreiben(n)) throw verboten("Ihre Backoffice-Rolle erlaubt im Bereich „Projektentwicklung“ kein Schreiben.");
}

const S = (db) => {
  db.entwicklungSteuerung ||= { v: 1, vorlagen: [], kapazitaet: {}, aufgabenLaufAm: null };
  return db.entwicklungSteuerung;
};
const E = (db) => db.entwicklung;
const personKurz = (db, id) => {
  const u = id ? nutzerById(db, id) : null;
  return u ? { id: u.id, name: nameVon(db, u.id), email: u.email } : null;
};
const datumOk = (s) => (/^20\d\d-\d\d-\d\d$/.test(String(s || "")) ? String(s) : "");

/** Entwicklungsdaten sicher geladen (Seed über das Entwicklungsmodul) */
async function bereit(n) {
  await ent.entwicklungAuswahl(n); // lesenBereit + Rechteprüfung „entwicklung lesen“
  return lesen();
}

// ================================================================ Kennzahlen je Projekt

function projektZusatz(db, p, heute) {
  const liste = E(db).meilensteine.filter((m) => m.projektId === p.id);
  const flaechen = E(db).flaechen.filter((f) => f.projektId === p.id);
  const risiken = E(db).risiken.filter((r) => r.projektId === p.id && r.status !== "geschlossen");
  const luecken = dokumentLuecken(liste, E(db).dokumente.filter((d) => d.projektId === p.id), { heute });
  const optionen = optionsfristen(flaechen, { heute });
  const pruefung = risiken.filter((r) => r.pruefenAm && r.pruefenAm < heute);
  return { liste, flaechen, risiken, luecken, optionen, pruefung };
}

function ampelFuer(db, kurz, heute) {
  const p = E(db).projekte.find((x) => x.id === kurz.id);
  const z = projektZusatz(db, p, heute);
  return {
    ampel: projektAmpel({ ...kurz, dokumentLuecken: z.luecken.length, optionsfristen: z.optionen.length, pruefungUeberfaellig: z.pruefung.length }),
    z,
  };
}

function leiterListe(db) {
  const kap = S(db).kapazitaet || {};
  return db.nutzer
    .filter((u) => u.aktiv && u.rollen.includes("admin") && darfSchreiben(u, "entwicklung"))
    .map((u) => ({ id: u.id, name: nameVon(db, u.id), stundenMonat: kap[u.id] || null, projektleitung: unterrollen(u).includes("projektleitung") }));
}

function kapazitaetFuer(db, heute) {
  const leiter = leiterListe(db);
  const plan = kapazitaetsplan({
    leiter, heute,
    projekte: E(db).projekte.map((p) => ({ id: p.id, projektleiterId: p.projektleiterId, status: p.status })),
    meilensteine: E(db).meilensteine,
  });
  const mitRolle = new Set(leiter.filter((l) => l.projektleitung).map((l) => l.id));
  plan.zeilen = plan.zeilen.filter((z) => z.projekte || z.offeneMeilensteine || mitRolle.has(z.id));
  return plan;
}

// ================================================================ Übersicht (alle Projekte)

export async function steuerungUebersicht(n) {
  leseNoetig(n);
  const pf = await ent.entwicklungPortfolio(n);
  const db = await lesen();
  const heute = heuteIso();
  const jahr = Number(heute.slice(0, 4));
  const projekte = pf.projekte.map((kurz) => {
    const { ampel, z } = ampelFuer(db, kurz, heute);
    return {
      id: kurz.id, titel: kurz.titel, typ: kurz.typ, typLabel: kurz.typLabel, land: kurz.land, bundesland: kurz.bundesland, status: kurz.status, statusLabel: kurz.statusLabel,
      phase: kurz.phase, phaseLabel: kurz.phaseLabel, mwp: kurz.mwp, mwh: kurz.mwh, projektleiter: kurz.projektleiter, prognoseCod: kurz.prognoseCod, zielCod: kurz.zielCod,
      codVerzugMonate: kurz.codVerzugMonate, budgetPlan: kurz.budgetPlan, budgetIst: kurz.budgetIst, risikoMax: kurz.risikoMax, fortschritt: kurz.fortschritt,
      pipeline: kurz.pipeline, naechsterMeilenstein: kurz.naechsterMeilenstein, ampel, sicherung: sicherungsgrad(z.flaechen), dokumentLuecken: z.luecken.length,
      verwertung: E(db).projekte.find((x) => x.id === kurz.id)?.verwertung || null,
    };
  });
  const offen = projekte.filter((p) => OFFEN.includes(p.status));
  const risiken = [];
  const luecken = [];
  const optionen = [];
  for (const p of offen) {
    const roh = E(db).projekte.find((x) => x.id === p.id);
    const z = projektZusatz(db, roh, heute);
    for (const r of z.risiken) {
      const b = risikoBewertung(r);
      risiken.push({ id: r.id, projektId: p.id, projektTitel: p.titel, titel: r.titel, kategorie: r.kategorie, kategorieLabel: RISIKO_KATEGORIEN[r.kategorie] || r.kategorie, status: r.status, massnahme: r.massnahme || "", ...b, kostenEur: r.kostenEur || 0, pruefenAm: r.pruefenAm || "", pruefungUeberfaellig: !!(r.pruefenAm && r.pruefenAm < heute), verantwortlich: personKurz(db, r.verantwortlichId) });
    }
    for (const m of z.luecken) luecken.push({ projektId: p.id, projektTitel: p.titel, meilensteinId: m.id, titel: m.titel, sollEnde: m.sollEnde, fehlt: (m.dokumentPflicht || []).filter((pf2) => !E(db).dokumente.some((d) => d.meilensteinId === m.id && d.pflicht === pf2)) });
    for (const f of z.optionen) optionen.push({ projektId: p.id, projektTitel: p.titel, flaecheId: f.id, bezeichnung: f.bezeichnung, optionBis: f.optionBis, inTagen: f.inTagen, ha: f.ha });
  }
  risiken.sort((a, b) => b.score - a.score || b.erwartet - a.erwartet);
  luecken.sort((a, b) => String(a.sollEnde).localeCompare(String(b.sollEnde)));
  const vorlagen = S(db).vorlagen.filter((x) => VORLAGE_OFFEN.includes(x.status)).map((x) => vorlageKurz(db, x)).sort((a, b) => (a.status === "eingereicht" ? -1 : 1) - (b.status === "eingereicht" ? -1 : 1) || String(b.geaendertAm).localeCompare(String(a.geaendertAm)));
  const kapazitaet = kapazitaetFuer(db, heute);
  return {
    stand: heute,
    projekte,
    verteilung: ampelVerteilung(offen.map((p) => p.ampel)),
    matrix: pipelineMatrix(projekte),
    ziel: zielAbgleich(pf.summen.jeJahr, { ziel: pf.summen.zielMwpJahr, abJahr: jahr, jahre: 6 }),
    zielMwpJahr: pf.summen.zielMwpJahr,
    summen: { anzahl: pf.summen.anzahl, mwp: pf.summen.mwp, mwpGewichtet: pf.summen.mwpGewichtet, wert: pf.summen.wert },
    kapazitaet: { ...kapazitaet, vorschlag: projektleiterVorschlag(kapazitaet)?.id || null },
    risiken: risiken.slice(0, 50),
    risikoSumme: { anzahl: risiken.length, hoch: risiken.filter((r) => r.score >= 15).length, erwartet: risiken.reduce((s, r) => s + r.erwartet, 0), pruefungUeberfaellig: risiken.filter((r) => r.pruefungUeberfaellig).length },
    dokumentLuecken: luecken.slice(0, 25),
    optionsfristen: optionen.sort((a, b) => a.inTagen - b.inTagen),
    vorlagen,
    aufgabenLaufAm: S(db).aufgabenLaufAm,
    leitung: istLeitung(n),
    darfBearbeiten: boSchreiben(n),
  };
}

// ================================================================ Projekt (Reiter „Steuerung“)

export async function steuerungProjekt(n, projektId) {
  leseNoetig(n);
  const kurz = await ent.entwicklungProjekt(n, projektId);
  const db = await lesen();
  const heute = heuteIso();
  const { ampel, z } = ampelFuer(db, kurz, heute);
  const p = E(db).projekte.find((x) => x.id === kurz.id);
  const gm = geschaeftsmodellFuer(db, p);
  const gesellschaft = (db.dienste?.gesellschaften || []).find((g) => g.entwicklungProjektId === p.id && g.status !== "aufgeloest") || null;
  const fall = (db.finanzierung?.faelle || []).find((f) => f.bezugArt === "entwicklung" && f.bezugId === p.id) || null;
  const aufgaben = (db.aufgaben || []).filter((a) => a.bezugEntwicklung === p.id || z.liste.some((m) => m.aufgabeId === a.id)).map((a) => ({ id: a.id, titel: a.titel, faelligAm: a.faelligAm, status: a.status, zustaendig: personKurz(db, a.zustaendigId) })).sort((a, b) => String(a.faelligAm).localeCompare(String(b.faelligAm)));
  return {
    projekt: { id: p.id, titel: p.titel, land: p.land, typ: p.typ, typLabel: ENTWICKLUNG_TYPEN[p.typ] || p.typ, status: p.status, verwertung: p.verwertung || null, verwertungLabel: VERWERTUNG[p.verwertung]?.label || "" },
    ampel,
    flaechen: z.flaechen.map((f) => ({ id: f.id, bezeichnung: f.bezeichnung, ha: f.ha, pachtStatus: f.pachtStatus, pachtStatusLabel: PACHT_STATUS[f.pachtStatus]?.label || f.pachtStatus, grundbuch: f.grundbuch || "keine", grundbuchLabel: GRUNDBUCH_SICHERUNG[f.grundbuch || "keine"]?.label, grundbuchDatum: f.grundbuchDatum || "", optionBis: f.optionBis || "", optionInTagen: f.optionBis ? Math.round((new Date(`${f.optionBis}T00:00:00Z`) - new Date(`${heute}T00:00:00Z`)) / 86400e3) : null })),
    sicherung: sicherungsgrad(z.flaechen),
    grundbuchHinweis: GRUNDBUCH_HINWEIS[p.land] || GRUNDBUCH_HINWEIS.DE,
    dokumentLuecken: z.luecken.map((m) => ({ id: m.id, titel: m.titel, sollEnde: m.sollEnde })),
    vorlagen: S(db).vorlagen.filter((x) => x.projektId === p.id).map((x) => vorlageKurz(db, x)).sort((a, b) => String(b.erstelltAm).localeCompare(String(a.erstelltAm))),
    geschaeftsmodell: gm,
    gesellschaft: gesellschaft ? { id: gesellschaft.id, firma: gesellschaft.firma || gesellschaft.name || "", status: gesellschaft.status } : null,
    finanzierungsfall: fall ? { id: fall.id, titel: fall.titel, status: fall.status } : null,
    aufgaben,
    leitung: istLeitung(n),
    darfBearbeiten: boSchreiben(n),
  };
}

/** Geschäftsmodell-Vergleich für die Verwertungsentscheidung – Eingaben aus dem Finanzierungsfall, sonst Standard je Typ/Land */
function geschaeftsmodellFuer(db, p) {
  const fall = (db.finanzierung?.faelle || []).find((f) => f.bezugArt === "entwicklung" && f.bezugId === p.id) || null;
  try {
    return geschaeftsmodellKurz(geschaeftsmodellVergleich(fall?.eingaben || geschaeftsmodellEingabenStandard(p), {}), { quelle: fall ? `Finanzierungsfall ${fall.id}` : "Standardannahmen je Typ und Land (markt.js)", gewaehlt: fall?.geschaeftsmodell?.gewaehlt || null });
  } catch {
    return null;
  }
}

// ================================================================ Kapazität (Leitung)

export async function steuerungKapazitaetSetzen(n, nutzerId, { stundenMonat = null } = {}) {
  leseNoetig(n);
  if (!istLeitung(n)) throw verboten("Kapazitäten der Projektleitungen legt die Leitung fest.");
  return aendern((db) => {
    const u = nutzerById(db, v.kennung(nutzerId));
    if (!u || !u.rollen.includes("admin") || !darfSchreiben(u, "entwicklung")) throw nichtGefunden("Projektleitung nicht gefunden.");
    const s = S(db);
    if (stundenMonat === null || stundenMonat === "") delete s.kapazitaet[u.id];
    else {
      const h = v.zahl(stundenMonat, { min: KAPAZITAET.min, max: KAPAZITAET.max, stellen: 0 });
      v.pflicht(h !== null && h !== undefined, `Bitte Stunden je Monat zwischen ${KAPAZITAET.min} und ${KAPAZITAET.max} angeben.`);
      s.kapazitaet[u.id] = h;
    }
    protokoll(db, n, "entwicklung_kapazitaet", "entwicklung", u.id, `Kapazität ${nameVon(db, u.id)}: ${s.kapazitaet[u.id] || `Standard ${KAPAZITAET.stundenMonat}`} h/Monat`);
    return { ok: true, nutzerId: u.id, stundenMonat: s.kapazitaet[u.id] || null, kapazitaet: kapazitaetFuer(db, heuteIso()) };
  });
}

// ================================================================ Flächensicherung (Grundbuch, Optionsfrist)

export async function steuerungSicherung(n, projektId, flaecheId, daten = {}) {
  schreibNoetig(n);
  await bereit(n);
  return aendern((db) => {
    const p = E(db).projekte.find((x) => x.id === v.kennung(projektId));
    if (!p) throw nichtGefunden("Entwicklungsprojekt nicht gefunden.");
    const f = E(db).flaechen.find((x) => x.id === v.kennung(flaecheId) && x.projektId === p.id);
    if (!f) throw nichtGefunden("Projektfläche nicht gefunden.");
    const has = (k) => Object.hasOwn(daten, k);
    if (has("grundbuch")) f.grundbuch = v.auswahl(daten.grundbuch, GRUNDBUCH_SICHERUNG, f.grundbuch || "keine");
    if (has("grundbuchDatum")) f.grundbuchDatum = datumOk(daten.grundbuchDatum);
    if (has("optionBis")) {
      const d = datumOk(daten.optionBis);
      if (d && f.pachtStatus !== "option") throw konflikt("Eine Optionsfrist gibt es nur bei Flächen mit Status „Optionsvertrag“.");
      if (d !== (f.optionBis || "")) f.optionAufgabeId = null; // neue Frist → neue Erinnerung
      f.optionBis = d;
    }
    if (f.grundbuch === "eingetragen") v.pflicht(!!f.grundbuchDatum, "Bitte das Eintragungsdatum angeben.");
    if (["vorgemerkt", "eingetragen"].includes(f.grundbuch) && !["option", "pachtvertrag"].includes(f.pachtStatus)) throw konflikt("Grundbuchliche Sicherung setzt einen Options- oder Pachtvertrag voraus.");
    if (f.grundbuchDatum && f.grundbuchDatum > heuteIso()) throw ungueltig("Das Eintragungsdatum liegt in der Zukunft.");
    protokoll(db, n, "projektflaeche", "entwicklung", p.id, `Flächensicherung ${f.bezeichnung}: Grundbuch „${GRUNDBUCH_SICHERUNG[f.grundbuch || "keine"].label}“${f.optionBis ? `, Option bis ${f.optionBis}` : ""}`);
    return { ok: true, flaeche: { id: f.id, grundbuch: f.grundbuch || "keine", grundbuchDatum: f.grundbuchDatum || "", optionBis: f.optionBis || "" }, sicherung: sicherungsgrad(E(db).flaechen.filter((x) => x.projektId === p.id)) };
  });
}

// ================================================================ Entscheidungsvorlagen

function vorlageKurz(db, x) {
  const p = E(db).projekte.find((y) => y.id === x.projektId);
  return {
    id: x.id, projektId: x.projektId, projektTitel: p?.titel || "", art: x.art, artLabel: VORLAGE_ARTEN[x.art]?.label || x.art, titel: x.titel, status: x.status,
    statusLabel: VORLAGE_STATUS[x.status]?.label || x.status, budgetEur: x.budgetEur || 0, empfehlung: x.empfehlung || "", empfehlungLabel: VERWERTUNG[x.empfehlung]?.label || "",
    entscheidungBis: x.entscheidungBis || "", eingereichtAm: x.eingereichtAm || null, entschiedenAm: x.entschiedenAm || null, erstelltAm: x.erstelltAm, geaendertAm: x.geaendertAm,
    ersteller: personKurz(db, x.erstelltVon), eingereichtVon: personKurz(db, x.eingereichtVon),
  };
}

function vorlageVoll(db, n, x) {
  return {
    ...vorlageKurz(db, x),
    sachverhalt: x.sachverhalt || "", beschlussvorschlag: x.beschlussvorschlag || "", alternativen: x.alternativen || "", risikenText: x.risikenText || "",
    snapshot: x.snapshot || null, entscheidung: x.entscheidung || null, verlauf: (x.verlauf || []).map((e) => ({ ...e, von: personKurz(db, e.vonId)?.name || "" })),
    aktionen: vorlageAktionenFuer(n, x),
    bearbeitbar: boSchreiben(n) && ["entwurf", "zurueckgestellt"].includes(x.status),
    leitung: istLeitung(n),
  };
}

/** Sichtbare Aktionen je Status und Rolle (inhaltliche Prüfung beim Ausführen, 422 mit Hinweis) */
function vorlageAktionenFuer(n, x) {
  return Object.entries(VORLAGE_AKTIONEN)
    .filter(([, a]) => a.von.includes(x.status))
    .filter(([, a]) => (a.wer === "leitung" ? istLeitung(n) && x.eingereichtVon !== n.id : boSchreiben(n)))
    .map(([id, a]) => ({ id, label: a.label, begruendung: a.begruendung }));
}

const vorlageLaden = (db, id) => {
  const x = S(db).vorlagen.find((y) => y.id === v.kennung(id));
  if (!x) throw nichtGefunden("Entscheidungsvorlage nicht gefunden.");
  return x;
};

export async function vorlageHolen(n, id) {
  leseNoetig(n);
  const db = await bereit(n);
  return vorlageVoll(db, n, vorlageLaden(db, id));
}

export async function vorlageSpeichern(n, projektId, { id = null, daten = {} } = {}) {
  schreibNoetig(n);
  await bereit(n);
  return aendern((db) => {
    const p = E(db).projekte.find((x) => x.id === v.kennung(projektId));
    if (!p) throw nichtGefunden("Entwicklungsprojekt nicht gefunden.");
    const alt = id ? vorlageLaden(db, id) : null;
    if (alt && alt.projektId !== p.id) throw nichtGefunden("Entscheidungsvorlage nicht gefunden.");
    if (alt && !["entwurf", "zurueckgestellt"].includes(alt.status)) throw konflikt("Eingereichte oder entschiedene Vorlagen sind unveränderlich – bitte eine neue Vorlage anlegen.");
    if (!alt && !OFFEN.includes(p.status)) throw konflikt("Für abgeschlossene Projekte können keine Vorlagen mehr angelegt werden.");
    const has = (k) => Object.hasOwn(daten, k);
    const x = alt || { id: neueId("EVL"), projektId: p.id, art: "gate_entwicklung", titel: "", sachverhalt: "", beschlussvorschlag: "", alternativen: "", risikenText: "", budgetEur: 0, empfehlung: "", entscheidungBis: "", status: "entwurf", erstelltVon: n.id, erstelltAm: jetzt(), verlauf: [] };
    if (has("art") || !alt) x.art = v.auswahl(daten.art, VORLAGE_ARTEN, x.art);
    if (has("titel") || !alt) x.titel = v.text(daten.titel, 160) || `${VORLAGE_ARTEN[x.art].label}: ${p.titel}`.slice(0, 160);
    for (const k of ["sachverhalt", "beschlussvorschlag", "alternativen", "risikenText"]) if (has(k)) x[k] = v.mehrzeilig(daten[k], 4000);
    if (has("budgetEur")) x.budgetEur = v.zahl(daten.budgetEur, { min: 0, max: 1e8 }) ?? 0;
    if (has("empfehlung")) x.empfehlung = v.auswahl(daten.empfehlung, VERWERTUNG, "");
    if (has("entscheidungBis")) x.entscheidungBis = datumOk(daten.entscheidungBis);
    if (!VORLAGE_ARTEN[x.art].verwertung) x.empfehlung = "";
    if (!VORLAGE_ARTEN[x.art].budget) x.budgetEur = 0;
    if (x.art === "abbruch" && S(db).vorlagen.some((y) => y.id !== x.id && y.projektId === p.id && y.art === "abbruch" && y.status === "eingereicht")) throw konflikt("Für dieses Projekt liegt bereits eine Abbruch-Vorlage zur Entscheidung vor.");
    x.geaendertAm = jetzt();
    x.verlauf.push({ am: jetzt(), vonId: n.id, text: alt ? "Vorlage bearbeitet" : "Vorlage angelegt" });
    if (!alt) S(db).vorlagen.push(x);
    protokoll(db, n, "entwicklung_vorlage", "entwicklung", p.id, `Entscheidungsvorlage ${alt ? "bearbeitet" : "angelegt"}: ${x.titel}`);
    return vorlageVoll(db, n, x);
  });
}

/** Momentaufnahme der Entscheidungsgrundlagen beim Einreichen (bleibt unverändert im PDF) */
async function snapshotErstellen(n, projektId) {
  const k = await ent.entwicklungProjekt(n, projektId);
  const heute = heuteIso();
  const db = await lesen();
  const p = E(db).projekte.find((x) => x.id === k.id);
  const { ampel, z } = ampelFuer(db, k, heute);
  const offen = k.risiken.filter((r) => r.status !== "geschlossen");
  return {
    am: jetzt(), stand: heute,
    projekt: { id: k.id, titel: k.titel, typLabel: k.typLabel, land: k.land, bundesland: k.bundesland, gemeinde: k.gemeinde, mwp: k.mwp, mwh: k.mwh, vermarktungLabel: k.vermarktungLabel, projektleiter: k.projektleiter?.name || "", nvp: k.nvp || "", netzbetreiber: k.netzbetreiber || "" },
    phase: k.phase, phaseLabel: k.phaseLabel, fortschritt: k.fortschritt, prognoseCod: k.prognoseCod, zielCod: k.zielCod, codVerzugMonate: k.codVerzugMonate,
    pipeline: k.pipeline, budgetPlan: k.budgetPlan, budgetIst: k.budgetIst, flaecheHa: k.flaecheHa, flaecheGesichertHa: k.flaecheGesichertHa, sicherung: sicherungsgrad(z.flaechen),
    ampel,
    risiken: offen.slice(0, 8).map((r) => ({ titel: r.titel, kategorieLabel: r.kategorieLabel, score: r.score, restScore: r.restScore ?? null, erwartet: r.erwartet || 0, massnahme: r.massnahme || "" })),
    risikokosten: offen.reduce((s, r) => s + (r.erwartet || 0), 0),
    meilensteine: k.meilensteine.filter((m) => !["erledigt", "entfaellt"].includes(m.status)).sort((a, b) => String(a.sollEnde).localeCompare(String(b.sollEnde))).slice(0, 8).map((m) => ({ titel: m.titel, sollEnde: m.sollEnde, prognoseEnde: m.prognoseEnde, kritisch: m.kritisch, status: m.statusLabel })),
    erledigt: k.meilensteine.filter((m) => m.status === "erledigt").map((m) => ({ titel: m.titel, istEnde: m.istEnde })).slice(-8),
    geschaeftsmodell: geschaeftsmodellFuer(db, p),
    codQuartal: quartal(k.prognoseCod),
  };
}

export async function vorlageAktion(n, id, { aktion = "", begruendung = "", option = "" } = {}) {
  leseNoetig(n);
  const db0 = await bereit(n);
  const x0 = vorlageLaden(db0, id);
  const pruef = vorlageUebergang(x0, aktion, { leitung: istLeitung(n), schreiben: boSchreiben(n), nutzerId: n.id, begruendung, option });
  if (!pruef.ok) throw new PlattformFehler(pruef.status, pruef.fehler);
  const snapshot = aktion === "einreichen" ? await snapshotErstellen(n, x0.projektId) : null;
  const erg = await aendern((db) => {
    const x = vorlageLaden(db, id);
    const p = E(db).projekte.find((y) => y.id === x.projektId);
    const nochmal = vorlageUebergang(x, aktion, { leitung: istLeitung(n), schreiben: boSchreiben(n), nutzerId: n.id, begruendung, option });
    if (!nochmal.ok) throw new PlattformFehler(nochmal.status, nochmal.fehler);
    const b = v.mehrzeilig(begruendung, 2000);
    const t = jetzt();
    x.status = nochmal.nach;
    x.geaendertAm = t;
    x.verlauf.push({ am: t, vonId: n.id, text: `${VORLAGE_AKTIONEN[aktion].label}${b ? `: ${b}` : ""}` });
    const pl = nutzerById(db, p.projektleiterId);
    const ersteller = nutzerById(db, x.eingereichtVon || x.erstelltVon);
    if (aktion === "einreichen") {
      x.snapshot = snapshot;
      x.eingereichtAm = t;
      x.eingereichtVon = n.id;
      for (const u of db.nutzer.filter((y) => y.aktiv && y.rollen.includes("admin") && unterrollen(y).includes("leitung") && y.id !== n.id)) {
        benachrichtigen(db, u, { art: "aufgabe", titel: `Entscheidungsvorlage: ${x.titel}`.slice(0, 160), text: `${VORLAGE_ARTEN[x.art].label} zu „${p.titel}“ liegt zur Entscheidung vor${x.entscheidungBis ? ` (bis ${x.entscheidungBis})` : ""}.`, link: `/portal/admin/entwicklung/vorlagen/${x.id}`, objektArt: "entwicklung", objektId: p.id }, { mailBetreff: "Entscheidungsvorlage zur Freigabe – ÖkoInvest", mailText: "Eine Entscheidungsvorlage der Projektentwicklung liegt zur Entscheidung vor. Details und PDF im Portal." });
      }
    }
    if (["genehmigen", "ablehnen", "zurueckstellen"].includes(aktion)) {
      x.entschiedenAm = t;
      const folgen = aktion === "genehmigen" ? vorlageFolgen(x, { option }) : null;
      x.entscheidung = { aktion, am: t, vonId: n.id, von: nameVon(db, n.id), begruendung: b, option: folgen?.verwertung || null };
      if (aktion !== "zurueckstellen") {
        E(db).entscheidungen.push({ id: neueId("EN"), projektId: p.id, datum: heuteIso(), titel: `${aktion === "genehmigen" ? "Genehmigt" : "Abgelehnt"}: ${VORLAGE_ARTEN[x.art].label}`.slice(0, 160), art: aktion === "genehmigen" ? folgen.entscheidungArt : "nogo", beschluss: `${x.beschlussvorschlag}${folgen?.verwertung ? `\nVerwertung: ${VERWERTUNG[folgen.verwertung].label}` : ""}${folgen?.budgetEur ? `\nBudget: ${folgen.budgetEur.toLocaleString("de-DE")} €` : ""}`.slice(0, 3000), begruendung: b, beteiligte: `Geschäftsführung (${nameVon(db, n.id)}); Vorlage ${x.id}`, vonId: n.id, am: t });
      }
      if (folgen) {
        if (folgen.budgetEur) E(db).budget.push({ id: neueId("BP"), projektId: p.id, kategorie: "sonstiges", bezeichnung: `Budgetfreigabe ${x.id}: ${VORLAGE_ARTEN[x.art].label}`.slice(0, 160), planEur: folgen.budgetEur, istEur: 0, istQuelle: "manuell", notiz: `Genehmigt am ${heuteIso()} durch ${nameVon(db, n.id)}` });
        if (folgen.verwertung) p.verwertung = folgen.verwertung;
        if (folgen.status && OFFEN.includes(p.status)) p.status = folgen.status;
        for (const a of folgen.aufgaben) {
          const zust = pl || ersteller;
          if (!zust) continue;
          db.aufgaben ||= [];
          db.aufgaben.push({ id: neueId("AF"), titel: v.text(`${a.titel} (${p.titel})`, 160), beschreibung: v.mehrzeilig(`${a.text ? `${a.text}\n` : ""}Aus Entscheidungsvorlage ${x.id}. Projekt: /portal/admin/entwicklung/${p.id}`, 2000), faelligAm: new Date(Date.now() + a.tage * 86400e3).toISOString().slice(0, 10), zustaendigId: zust.id, bezugArt: null, bezugId: null, bezugEntwicklung: p.id, status: "offen", erstelltVon: n.id, erstelltAm: t, erledigtAm: null, erledigtVon: null, erinnertAm: null });
        }
        p.geaendertAm = t;
      }
      const empf = new Map([ersteller, pl].filter(Boolean).map((u) => [u.id, u]));
      for (const u of empf.values()) {
        benachrichtigen(db, u, { art: "aufgabe", titel: `Vorlage ${VORLAGE_STATUS[x.status].label.toLowerCase()}: ${x.titel}`.slice(0, 160), text: b || `Die Geschäftsführung hat über „${x.titel}“ entschieden.`, link: `/portal/admin/entwicklung/vorlagen/${x.id}`, objektArt: "entwicklung", objektId: p.id }, { mailBetreff: "Entscheidung zur Vorlage – ÖkoInvest", mailText: "Über Ihre Entscheidungsvorlage wurde entschieden. Details im Portal." });
      }
    }
    protokoll(db, n, `entwicklung_vorlage_${aktion}`, "entwicklung", p.id, `Entscheidungsvorlage ${x.id}: ${VORLAGE_AKTIONEN[aktion].label}`);
    return vorlageVoll(db, n, x);
  });
  return erg;
}

// ================================================================ Aufgaben aus Meilensteinen und Optionsfristen

function aufgabenLauf(db, n, { projektId = null } = {}) {
  const heute = heuteIso();
  const erg = { angelegt: 0, erledigt: 0, meilensteine: 0, optionen: 0 };
  db.aufgaben ||= [];
  const projekte = E(db).projekte.filter((p) => OFFEN.includes(p.status) && (!projektId || p.id === projektId));
  const neu = (p, zustId, titel, beschreibung, faelligAm) => {
    const a = { id: neueId("AF"), titel: v.text(titel, 160), beschreibung: v.mehrzeilig(beschreibung, 2000), faelligAm, zustaendigId: zustId, bezugArt: null, bezugId: null, bezugEntwicklung: p.id, status: "offen", erstelltVon: n?.id || zustId, erstelltAm: jetzt(), erledigtAm: null, erledigtVon: null, erinnertAm: null };
    db.aufgaben.push(a);
    erg.angelegt++;
    const u = nutzerById(db, zustId);
    if (u) benachrichtigen(db, u, { art: "aufgabe", titel: a.titel, text: `Fällig am ${faelligAm}.`, link: "/portal/admin/aufgaben", objektArt: "entwicklung", objektId: p.id }, { mail: false });
    return a;
  };
  for (const p of projekte) {
    const liste = E(db).meilensteine.filter((m) => m.projektId === p.id);
    // Erledigte/entfallene Meilensteine → Aufgabe schließen
    for (const m of liste.filter((y) => y.aufgabeId && ["erledigt", "entfaellt"].includes(y.status))) {
      const a = db.aufgaben.find((y) => y.id === m.aufgabeId && y.status !== "erledigt");
      if (a) {
        Object.assign(a, { status: "erledigt", erledigtAm: jetzt(), erledigtVon: n?.id || a.zustaendigId });
        erg.erledigt++;
      }
    }
    for (const m of aufgabenFaellig(liste, { heute })) {
      const zust = m.verantwortlichId || p.projektleiterId;
      if (!zust || !nutzerById(db, zust)) continue;
      const pflicht = (m.dokumentPflicht || []).filter((pf) => !E(db).dokumente.some((d) => d.meilensteinId === m.id && d.pflicht === pf));
      const a = neu(p, zust, `Meilenstein fällig: ${m.titel} (${p.titel})`, [`Soll-Ende ${m.sollEnde}${m.sollEnde < heute ? " – überfällig" : ""}.`, pflicht.length ? `Pflichtdokumente offen: ${pflicht.join(", ")}.` : "Pflichtdokumente vollständig.", m.gutachten ? "Externer Gutachter-/Planerauftrag: Stand beim Auftragnehmer abfragen." : "", `Projekt: /portal/admin/entwicklung/${p.id}?reiter=plan&ms=${m.id}`].filter(Boolean).join("\n"), m.sollEnde < heute ? heute : m.sollEnde);
      m.aufgabeId = a.id;
      erg.meilensteine++;
    }
    for (const f of optionsfristen(E(db).flaechen.filter((x) => x.projektId === p.id), { heute })) {
      const roh = E(db).flaechen.find((x) => x.id === f.id);
      if (roh.optionAufgabeId || !p.projektleiterId) continue;
      const a = neu(p, p.projektleiterId, `Optionsfrist ${f.bezeichnung}: Option ausüben oder verlängern (${p.titel})`, `Die Option auf „${f.bezeichnung}“ (${f.ha} ha) läuft am ${f.optionBis} ab${f.inTagen < 0 ? " – bereits abgelaufen" : ` (in ${f.inTagen} Tagen)`}. Ausübung schriftlich erklären bzw. Verlängerung mit dem Eigentümer vereinbaren; Grundbuch-Sicherung prüfen.\nProjekt: /portal/admin/entwicklung/${p.id}?reiter=steuerung`, f.inTagen < 14 ? heute : new Date(new Date(`${f.optionBis}T00:00:00Z`).getTime() - 14 * 86400e3).toISOString().slice(0, 10));
      roh.optionAufgabeId = a.id;
      erg.optionen++;
    }
  }
  S(db).aufgabenLaufAm = jetzt();
  if (erg.angelegt || erg.erledigt) protokoll(db, n, "entwicklung_aufgaben", "entwicklung", projektId || "alle", `Aufgaben aus Meilensteinen/Optionsfristen: ${erg.angelegt} angelegt, ${erg.erledigt} erledigt`);
  return erg;
}

export async function steuerungAufgabenErzeugen(n, { projektId = "" } = {}) {
  schreibNoetig(n);
  await bereit(n);
  return aendern((db) => {
    const pid = projektId ? v.kennung(projektId) : null;
    if (projektId && !E(db).projekte.some((p) => p.id === pid)) throw nichtGefunden("Entwicklungsprojekt nicht gefunden.");
    return { ok: true, ...aufgabenLauf(db, n, { projektId: pid }) };
  });
}
