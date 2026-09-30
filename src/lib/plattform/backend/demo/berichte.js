// src/lib/plattform/backend/demo/berichte.js
//
// Berichte & Analysen im Demo-Backend: Trichter über Zeit, Konversion je Quelle (Herkunft/UTM am
// Vorgang), Pipeline-MWp nach Phase/Land, Provision erwartet (gewichtet nach Abschluss-
// wahrscheinlichkeit) vs. realisiert, Durchlaufzeiten je Stufe, Team-Leistung. Zeitraum frei wählbar.
// Die Rechenlogik ist rein (berichtBerechnen) und wird auch vom Monatsbericht (PDF/CSV) genutzt.

import { PROVISION, PHASEN, FREIFLAECHE } from "@/lib/invest/markt";
import { PROZESSE } from "../../prozesse";
import { preisGesamt } from "../../format";
import { LAENDER, VORGANG_TYPEN } from "../../konstanten";
import { slaStatus } from "../../akquise";
import { darfLesen } from "../../rechte";
import { boLesen, eingangAm, erstkontaktAm, nameVon, rechtNoetig } from "./bo-kern";

/**
 * Abschlusswahrscheinlichkeit je Stand eines Börsenprojekts (interne Annahme des Backoffice,
 * im Bericht offengelegt; keine Marktzahl). Maßgeblich ist der weiteste Stand eines Interessenten.
 */
export const WAHRSCHEINLICHKEIT = {
  pruefung: { label: "In Prüfung", p: 0.05 },
  veroeffentlicht: { label: "Veröffentlicht, ohne NDA", p: 0.1 },
  nda: { label: "Datenraum freigegeben", p: 0.2 },
  loi: { label: "LOI abgegeben", p: 0.35 },
  reserviert: { label: "LOI angenommen / reserviert", p: 0.6 },
  verkauft: { label: "Verkauft", p: 1 },
};

const TZ = "Europe/Vienna";
const tagVon = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
const monatVon = (iso) => tagVon(iso).slice(0, 7);
const DATUM = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function zeitraum({ von, bis } = {}) {
  const heute = tagVon(new Date().toISOString());
  const b = DATUM.test(bis || "") ? bis : heute;
  let vn = DATUM.test(von || "") ? von : null;
  if (!vn) {
    const d = new Date(`${b}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 11, 1);
    vn = d.toISOString().slice(0, 10);
  }
  if (vn > b) vn = b;
  const monate = [];
  const d = new Date(`${vn.slice(0, 7)}-01T12:00:00Z`);
  while (d.toISOString().slice(0, 7) <= b.slice(0, 7) && monate.length < 60) {
    monate.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return { von: vn, bis: b, monate };
}

/** Erster Zeitpunkt, an dem ein Objekt einen Status (oder einen späteren der Pipeline) erreicht hat */
function erreichtAm(o, art, status) {
  const pipe = PROZESSE[art].pipeline;
  const idx = pipe.indexOf(status);
  if (art === "vorgang" && status === "eingegangen") return o.erstelltAm;
  const e = (o.statusVerlauf || []).filter((x) => pipe.indexOf(x.status) >= idx && idx >= 0).sort((a, b) => String(a.am).localeCompare(String(b.am)))[0];
  return e?.am || null;
}
const ersterEintrag = (o, status) => (o.statusVerlauf || []).filter((x) => x.status === status).sort((a, b) => String(a.am).localeCompare(String(b.am)))[0]?.am || null;

const median = (l) => {
  if (!l.length) return null;
  const s = [...l].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const r1 = (x) => (x === null || x === undefined ? null : Math.round(x * 10) / 10);

function projektStand(db, p) {
  if (p.status === "verkauft") return "verkauft";
  if (p.status === "reserviert") return "reserviert";
  if (p.status === "pruefung") return "pruefung";
  const st = db.interessen.filter((i) => i.projektId === p.id).map((i) => i.status);
  if (st.includes("loi_angenommen")) return "reserviert";
  if (st.includes("loi_abgegeben")) return "loi";
  if (st.includes("nda_freigegeben")) return "nda";
  return "veroeffentlicht";
}

function kaufpreisSchaetzung(p) {
  const g = preisGesamt(p);
  if (g) return { wert: g, geschaetzt: false };
  const ph = PHASEN.find((x) => x.id === p.phase);
  return ph && p.mwp ? { wert: ((ph.preisProKwp.min + ph.preisProKwp.max) / 2) * p.mwp * 1000, geschaetzt: true } : { wert: 0, geschaetzt: true };
}

/** Reine Berechnung eines Berichts über die Demo-Datenbank */
export function berichtBerechnen(db, filter = {}) {
  const z = zeitraum(filter);
  const imZeitraum = (iso) => iso && tagVon(iso) >= z.von && tagVon(iso) <= z.bis;
  const monatsIndex = Object.fromEntries(z.monate.map((m, i) => [m, i]));
  const leer = () => z.monate.map(() => 0);

  // ------------------------------------------------ Trichter über Zeit
  const STUFEN = {
    vorgang: ["eingegangen", "in_pruefung", "qualifiziert", "angebot", "abgeschlossen"],
    flaeche: ["eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag"],
  };
  const trichterZeit = {};
  for (const [art, stufen] of Object.entries(STUFEN)) {
    const reihen = Object.fromEntries(stufen.map((s) => [s, leer()]));
    for (const o of db[art === "vorgang" ? "vorgaenge" : "flaechen"]) {
      for (const s of stufen) {
        const am = erreichtAm(o, art, s);
        if (am && monatsIndex[monatVon(am)] !== undefined && imZeitraum(am)) reihen[s][monatsIndex[monatVon(am)]]++;
      }
    }
    trichterZeit[art] = { stufen: stufen.map((s) => ({ id: s, label: PROZESSE[art].status[s].label })), reihen };
  }
  // Kohorte: Vorgänge mit Eingang im Zeitraum – welcher Anteil erreicht welche Stufe
  const kohorte = db.vorgaenge.filter((x) => imZeitraum(x.erstelltAm));
  const kohorteTrichter = STUFEN.vorgang.map((s) => ({ id: s, label: PROZESSE.vorgang.status[s].label, anzahl: kohorte.filter((o) => erreichtAm(o, "vorgang", s)).length }));
  const flaechenKohorte = db.flaechen.filter((f) => imZeitraum(eingangAm(db, "flaeche", f)) && f.status !== "entwurf");
  const flaechenTrichter = STUFEN.flaeche.map((s) => ({ id: s, label: PROZESSE.flaeche.status[s].label, anzahl: flaechenKohorte.filter((o) => erreichtAm(o, "flaeche", s)).length }));

  // ------------------------------------------------ Konversion je Quelle
  const quellenMap = new Map();
  for (const vg of kohorte) {
    const h = vg.herkunft || {};
    const kanal = h.kanal || "Unbekannt";
    const e = quellenMap.get(kanal) || { kanal, anfragen: 0, qualifiziert: 0, abgeschlossen: 0, abgelehnt: 0, kampagnen: {} };
    e.anfragen++;
    if (erreichtAm(vg, "vorgang", "qualifiziert")) e.qualifiziert++;
    if (vg.status === "abgeschlossen") e.abgeschlossen++;
    if (vg.status === "abgelehnt") e.abgelehnt++;
    const kampagne = h.utm_campaign || h.utm_source;
    if (kampagne) e.kampagnen[kampagne] = (e.kampagnen[kampagne] || 0) + 1;
    quellenMap.set(kanal, e);
  }
  const quellen = [...quellenMap.values()]
    .map((e) => ({ ...e, quoteQualifiziert: e.anfragen ? e.qualifiziert / e.anfragen : 0, quoteAbschluss: e.anfragen ? e.abgeschlossen / e.anfragen : 0, kampagnen: Object.entries(e.kampagnen).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, anzahl]) => ({ name, anzahl })) }))
    .sort((a, b) => b.anfragen - a.anfragen);
  const typen = Object.entries(kohorte.reduce((acc, x) => ((acc[x.typ] = (acc[x.typ] || 0) + 1), acc), {})).map(([typ, anzahl]) => ({ typ, label: VORGANG_TYPEN[typ] || typ, anzahl })).sort((a, b) => b.anzahl - a.anzahl);

  // ------------------------------------------------ Pipeline-MWp nach Phase/Land
  const offenProjekt = db.projekte.filter((p) => ["pruefung", "veroeffentlicht", "reserviert"].includes(p.status));
  const laender = Object.keys(LAENDER);
  const pipelinePhasen = PHASEN.map((ph) => ({ id: ph.id, label: ph.kurz || ph.label, werte: Object.fromEntries(laender.map((l) => [l, r1(offenProjekt.filter((p) => p.phase === ph.id && p.land === l).reduce((s, p) => s + (p.mwp || 0), 0))])) }));
  const offenFlaeche = db.flaechen.filter((f) => ["eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag", "planung"].includes(f.status));
  const flaechenPipeline = ["eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag", "planung"].map((s) => ({ id: s, label: PROZESSE.flaeche.status[s].label, werte: Object.fromEntries(laender.map((l) => [l, r1(offenFlaeche.filter((f) => f.status === s && f.land === l).reduce((sum, f) => sum + (f.ha || 0) / FREIFLAECHE.haProMwp, 0))])) }));

  // ------------------------------------------------ Provision erwartet vs. realisiert
  const erwartet = offenProjekt.map((p) => {
    const stand = projektStand(db, p);
    const kp = kaufpreisSchaetzung(p);
    const satz = p.provisionSatz ?? PROVISION.verkaeufer.min;
    const brutto = kp.wert * satz;
    return { id: p.id, titel: p.titel, land: p.land, mwp: p.mwp, stand, standLabel: WAHRSCHEINLICHKEIT[stand].label, p: WAHRSCHEINLICHKEIT[stand].p, kaufpreis: Math.round(kp.wert), geschaetzt: kp.geschaetzt, satz, provision: Math.round(brutto), gewichtet: Math.round(brutto * WAHRSCHEINLICHKEIT[stand].p) };
  }).sort((a, b) => b.gewichtet - a.gewichtet);
  const realisiertMonat = leer();
  const bezahltMonat = leer();
  const realisiert = db.provisionen.filter((pv) => pv.status !== "storniert" && imZeitraum(pv.erstelltAm));
  for (const pv of realisiert) realisiertMonat[monatsIndex[monatVon(pv.erstelltAm)]] += pv.betrag;
  for (const pv of db.provisionen.filter((x) => x.status === "bezahlt")) {
    const am = ersterEintrag(pv, "bezahlt") || pv.erstelltAm;
    if (imZeitraum(am) && monatsIndex[monatVon(am)] !== undefined) bezahltMonat[monatsIndex[monatVon(am)]] += pv.betrag;
  }
  const provision = {
    erwartetGewichtet: erwartet.reduce((s, x) => s + x.gewichtet, 0),
    erwartetUngewichtet: erwartet.reduce((s, x) => s + x.provision, 0),
    realisiert: realisiert.reduce((s, x) => s + x.betrag, 0),
    bezahlt: db.provisionen.filter((x) => x.status === "bezahlt" && imZeitraum(ersterEintrag(x, "bezahlt") || x.erstelltAm)).reduce((s, x) => s + x.betrag, 0),
    offen: db.provisionen.filter((x) => ["offen", "in_rechnung"].includes(x.status)).reduce((s, x) => s + x.betrag, 0),
    realisiertMonat,
    bezahltMonat,
    projekte: erwartet,
    wahrscheinlichkeiten: WAHRSCHEINLICHKEIT,
  };

  // ------------------------------------------------ Durchlaufzeiten je Stufe (Tage)
  const durchlauf = {};
  for (const art of ["vorgang", "flaeche", "projekt", "interesse"]) {
    const pipe = PROZESSE[art].pipeline;
    const liste = db[{ vorgang: "vorgaenge", flaeche: "flaechen", projekt: "projekte", interesse: "interessen" }[art]];
    durchlauf[art] = pipe.slice(0, -1).map((s, i) => {
      const naechste = pipe[i + 1];
      const tage = [];
      for (const o of liste) {
        const a = art === "vorgang" && s === "eingegangen" ? o.erstelltAm : ersterEintrag(o, s);
        const b = ersterEintrag(o, naechste);
        if (a && b && imZeitraum(b) && b >= a) tage.push((new Date(b) - new Date(a)) / 86400e3);
      }
      return { von: s, nach: naechste, label: `${PROZESSE[art].status[s].label} → ${PROZESSE[art].status[naechste].label}`, anzahl: tage.length, median: r1(median(tage)), mittel: r1(tage.length ? tage.reduce((x, y) => x + y, 0) / tage.length : null) };
    });
  }

  // ------------------------------------------------ Team-Leistung
  const team = db.nutzer
    .filter((u) => u.rollen.includes("admin") && u.aktiv)
    .map((u) => {
      let wechsel = 0;
      for (const liste of [db.vorgaenge, db.flaechen, db.projekte, db.interessen, db.provisionen]) for (const o of liste) for (const e of o.statusVerlauf || []) if (e.vonId === u.id && imZeitraum(e.am)) wechsel++;
      const heute = tagVon(new Date().toISOString());
      const flaechen = db.flaechen.filter((f) => f.zustaendigId === u.id && f.status !== "entwurf");
      const sla = flaechen.map((f) => {
        const ein = eingangAm(db, "flaeche", f);
        return imZeitraum(ein) ? slaStatus(ein, erstkontaktAm(db, "flaeche", f, ein)).status : null;
      }).filter((s) => s && s !== "offen" && s !== "faellig");
      return {
        id: u.id,
        name: nameVon(db, u.id),
        offen: db.vorgaenge.filter((x) => x.zustaendigId === u.id && ["eingegangen", "in_pruefung", "qualifiziert", "angebot"].includes(x.status)).length + db.flaechen.filter((x) => x.zustaendigId === u.id && ["eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag", "planung"].includes(x.status)).length + db.projekte.filter((x) => x.zustaendigId === u.id && ["pruefung", "veroeffentlicht", "reserviert"].includes(x.status)).length,
        statuswechsel: wechsel,
        aufgabenErledigt: db.aufgaben.filter((a) => a.erledigtVon === u.id && imZeitraum(a.erledigtAm)).length,
        aufgabenUeberfaellig: db.aufgaben.filter((a) => a.zustaendigId === u.id && a.status === "offen" && a.faelligAm && a.faelligAm < heute).length,
        crmAktivitaeten: (db.bo?.aktivitaeten || []).filter((a) => a.vonId === u.id && !a.system && imZeitraum(a.am)).length,
        slaQuote: sla.length ? sla.filter((s) => s === "erledigt").length / sla.length : null,
        slaBasis: sla.length,
      };
    })
    .sort((a, b) => b.statuswechsel + b.aufgabenErledigt + b.crmAktivitaeten - (a.statuswechsel + a.aufgabenErledigt + a.crmAktivitaeten));

  const summeMwp = (l) => r1(l.reduce((s, x) => s + Object.values(x.werte).reduce((a, b) => a + (b || 0), 0), 0));
  return {
    zeitraum: z,
    erstelltAm: new Date().toISOString(),
    kennzahlen: {
      anfragen: kohorte.length,
      qualifiziertQuote: kohorte.length ? kohorteTrichter[2].anzahl / kohorte.length : 0,
      flaechenNeu: flaechenKohorte.length,
      flaechenHa: r1(flaechenKohorte.reduce((s, f) => s + (f.ha || 0), 0)),
      projekteVeroeffentlicht: db.projekte.filter((p) => imZeitraum(p.veroeffentlichtAm)).length,
      verkaeufe: db.projekte.filter((p) => p.status === "verkauft" && imZeitraum(ersterEintrag(p, "verkauft"))).length,
      pipelineMwp: summeMwp(pipelinePhasen),
      flaechenMwp: summeMwp(flaechenPipeline),
      provisionRealisiert: provision.realisiert,
      provisionErwartet: provision.erwartetGewichtet,
    },
    trichterZeit,
    kohorteTrichter,
    flaechenTrichter,
    quellen,
    typen,
    pipelinePhasen,
    flaechenPipeline,
    provision,
    durchlauf,
    team,
  };
}

export async function bericht(n, filter = {}) {
  rechtNoetig(n, "berichte", 1);
  const db = await boLesen();
  const b = berichtBerechnen(db, filter);
  // Buchhaltung/Leitung sehen Provisionsdetails; andere Unterrollen nur Summen
  if (!darfLesen(n, "provisionen")) b.provision.projekte = [];
  return b;
}
