// src/lib/plattform/planung/ausgabe.js
//
// Aufbereitung der Kostenkalkulation für Portal, PDF und CSV – gemeinsam für Demo-Backend und Frappe-Adapter, damit beide
// Betriebsarten identische Ausgaben liefern. Eingabe sind die gespeicherten Rohdaten (Frappe: planung.kalkulation liefert
// genau diese Felder), Ausgabe das Objekt, das Kalkulation.js und kosten-pdf.js erwarten.

import { GEWERKE, GRUPPEN, KOSTENSTAENDE, VERLEGEARTEN, berechnen, sollIst, standVergleich, trassenLaenge, vorschlag, zusammenfuehren } from "./kosten.js";

/** Parameter der Kalkulation: Typ, Land, Leistung und Gutachten immer aus dem Projekt; Fläche/Grundstücke als Vorbelegung */
export function parameterFuer(projektParameter, gespeichert = null) {
  const s = gespeichert?.parameter || {};
  const pp = projektParameter;
  return {
    ...s, typ: pp.typ, land: pp.land, mwp: pp.mwp, mwh: pp.mwh, gutachten: pp.gutachten,
    flaecheHa: s.flaecheHa ?? pp.flaecheHa, flaechenAnzahl: s.flaechenAnzahl ?? pp.flaechenAnzahl,
    kostenstand: gespeichert?.kostenstand || s.kostenstand || "schaetzung",
  };
}

/**
 * roh = { projekt: {id,titel,typ,land,mwp,mwh}, projektParameter, gespeichert: {id, kostenstand, parameter, positionen, geaendertAm, geaendertVon} | null,
 *         ist: {jeArt, quelle} | null, staende: [{id, stand, am, von, kommentar, summen, gruppen}], uebergabe, quellen: {akquise, dxf}, darfBearbeiten }
 */
export function kalkulationAusgabe(roh) {
  const k = roh.gespeichert || null;
  const parameter = parameterFuer(roh.projektParameter, k);
  const e = berechnen(zusammenfuehren(k?.positionen || [], vorschlag(parameter)), parameter);
  const staende = [...(roh.staende || [])].sort((a, b) => String(b.am).localeCompare(String(a.am)));
  return {
    projekt: roh.projekt,
    id: k?.id || null, gespeichert: !!k, kostenstand: parameter.kostenstand, kostenstandLabel: KOSTENSTAENDE[parameter.kostenstand]?.label || parameter.kostenstand,
    parameter: { ...e.parameter, trasseLaengeM: trassenLaenge(e.parameter), contingencyEigen: k?.parameter?.contingency !== null && k?.parameter?.contingency !== undefined },
    positionen: e.positionen, gruppen: e.gruppen, gewerke: e.gewerke, summen: e.summen, benchmark: e.benchmark,
    sollIst: sollIst(e, roh.ist), istQuelle: roh.ist ? roh.ist.quelle || "plattform" : "manuell",
    staende: staende.map((s, i) => ({ ...s, standLabel: KOSTENSTAENDE[s.stand]?.label || s.stand, vergleich: standVergleich(s, staende[i + 1]) })),
    uebergabe: roh.uebergabe || null,
    quellen: roh.quellen || { akquise: null, dxf: [] },
    auswahl: { gruppen: GRUPPEN, gewerke: Object.fromEntries(Object.entries(GEWERKE).map(([id, g]) => [id, { label: g.label, gruppe: g.gruppe, kg: g.kg }])), kostenstaende: KOSTENSTAENDE, verlegearten: VERLEGEARTEN },
    geaendertAm: k?.geaendertAm || null, geaendertVon: k?.geaendertVon || "",
    darfBearbeiten: !!roh.darfBearbeiten,
  };
}
