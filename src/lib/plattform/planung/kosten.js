// src/lib/plattform/planung/kosten.js
//
// Projektkostenkalkulation je Entwicklungsprojekt – reine Logik (Browser, Server, Tests). Frappe-Gegenstück mit gleichen
// Ergebnissen: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/planung_kern.py (Parität per Test).
//
// Gliederung angelehnt an DIN 276 (Kostengruppen in Klammern) bzw. praxisübliche PV-Gewerke:
//   Entwicklung (KG 700), Grundstück (KG 100), Technik/EPC (KG 400/500), Netzanschluss (KG 200), Nebenkosten,
//   Finanzierung (KG 760), Reserve (Unvorhergesehenes), Sicherheiten (Rückbau – liquiditätswirksam, keine Kosten im
//   engeren Sinn).
// Positionsarten: „menge“ (Menge × Einheitspreis), „prozent“ (Satz × Bezugssumme), „zins“ (Bauzeitzinsen).
// Vorschläge kommen aus src/lib/invest/markt.js (FREIFLAECHE, AGRI, CARPORT, DACH, SPEICHER, PACHT, FINANZIERUNG,
// PROJEKTKOSTEN) und netzanschluss.js; jede Position ist überschreibbar (Kennzeichen „manuell“). Nicht überschriebene
// Positionen folgen den Parametern (Leistung, Fläche, Trasse, Kostenstand …).

import { AGRI, CARPORT, DACH, FINANZIERUNG, FREIFLAECHE, PACHT, PROJEKTKOSTEN as PK, SPEICHER } from "../../invest/markt.js";
import { ebeneFuer } from "../../rechner/netzanschluss.js";

export const r2 = (x) => Math.floor((Number(x) || 0) * 100 + 0.5) / 100;

export const GRUPPEN = {
  entwicklung: { label: "Entwicklung", kg: "700", reihenfolge: 1 },
  grundstueck: { label: "Grundstück & Rechte", kg: "100", reihenfolge: 2 },
  technik: { label: "Technik / EPC", kg: "400/500", reihenfolge: 3 },
  netz: { label: "Netzanschluss", kg: "200", reihenfolge: 4 },
  neben: { label: "Nebenkosten Bau", kg: "700", reihenfolge: 5 },
  reserve: { label: "Unvorhergesehenes", kg: "–", reihenfolge: 6 },
  finanzierung: { label: "Finanzierungskosten", kg: "760", reihenfolge: 7 },
  sicherheit: { label: "Sicherheiten", kg: "–", reihenfolge: 8 },
};

/** Gewerke: Gruppe, DIN-276-Anlehnung, Kostenart im Finanzmodul (für Soll/Ist) */
export const GEWERKE = {
  ent_pacht: { label: "Pachtvorlauf / Reservierung", gruppe: "entwicklung", kg: "110", kostenart: "flaeche" },
  ent_planung: { label: "Planung (Objekt-, Genehmigungs-, B-Plan-Planung)", gruppe: "entwicklung", kg: "730", kostenart: "planung" },
  ent_gutachten: { label: "Gutachten", gruppe: "entwicklung", kg: "740", kostenart: "planung" },
  ent_gebuehren: { label: "Gebühren B-Plan / Genehmigung", gruppe: "entwicklung", kg: "770", kostenart: "genehmigung" },
  ent_recht: { label: "Rechtsberatung", gruppe: "entwicklung", kg: "770", kostenart: "recht" },
  ent_netzpruefung: { label: "Netzprüfung / Netzanfrage", gruppe: "entwicklung", kg: "720", kostenart: "netz" },
  gr_dienstbarkeit: { label: "Dienstbarkeiten (Leitungsrechte)", gruppe: "grundstueck", kg: "120", kostenart: "flaeche" },
  gr_notar: { label: "Notar / Grundbuch", gruppe: "grundstueck", kg: "120", kostenart: "recht" },
  module: { label: "Module", gruppe: "technik", kg: "440" },
  wechselrichter: { label: "Wechselrichter", gruppe: "technik", kg: "440" },
  unterkonstruktion: { label: "Unterkonstruktion inkl. Rammung und Montage", gruppe: "technik", kg: "440" },
  dc: { label: "DC-Verkabelung", gruppe: "technik", kg: "440" },
  ac: { label: "AC-Verkabelung (Niederspannung im Park)", gruppe: "technik", kg: "440" },
  bos: { label: "Monitoring, Blitzschutz, Kommunikation, Inbetriebnahme", gruppe: "technik", kg: "450" },
  zaun: { label: "Zaun, Tore, Kamera", gruppe: "technik", kg: "530" },
  wege: { label: "Wege und Erdarbeiten", gruppe: "technik", kg: "510" },
  ausgleich: { label: "Ausgleichs- und Ökomaßnahmen", gruppe: "technik", kg: "230" },
  speicher: { label: "Batteriespeicher", gruppe: "technik", kg: "440" },
  bauleitung: { label: "Bauleitung / EPC-Marge", gruppe: "technik", kg: "710" },
  station: { label: "Trafostation(en) / Übergabestation", gruppe: "netz", kg: "440" },
  trasse: { label: "Mittelspannungstrasse", gruppe: "netz", kg: "220" },
  querung: { label: "Querungen (Straße, Bahn, Gewässer)", gruppe: "netz", kg: "220" },
  netzanschluss: { label: "Umspannwerk- / Netzanschlusskosten", gruppe: "netz", kg: "220" },
  bkz: { label: "Baukostenzuschuss", gruppe: "netz", kg: "220" },
  versicherung: { label: "Versicherung Bauzeit (CAR/EAR)", gruppe: "neben", kg: "790" },
  contingency: { label: "Unvorhergesehenes (Contingency)", gruppe: "reserve", kg: "–" },
  bauzeitzinsen: { label: "Bauzeitzinsen", gruppe: "finanzierung", kg: "760" },
  fin_gebuehren: { label: "Finanzierungsgebühren", gruppe: "finanzierung", kg: "760" },
  rueckbau: { label: "Rückbausicherheit (Bürgschaft/Hinterlegung)", gruppe: "sicherheit", kg: "–" },
  sonstiges: { label: "Sonstiges", gruppe: "neben", kg: "790", kostenart: "sonstiges" },
};

export const KOSTENSTAENDE = {
  schaetzung: { label: "Kostenschätzung", nr: 1, text: "Erste Schätzung aus Kennwerten (€/kWp)" },
  kostenrahmen: { label: "Kostenrahmen", nr: 2, text: "Budgetrahmen für die Entwicklungsentscheidung" },
  kostenberechnung: { label: "Kostenberechnung", nr: 3, text: "Auf Basis der Genehmigungsplanung und Mengen" },
  angebote: { label: "Angebote", nr: 4, text: "Mit Angebotspreisen der Gewerke" },
  vergabe: { label: "Vergabe", nr: 5, text: "Beauftragte Preise (EPC/Gewerke)" },
  abrechnung: { label: "Abrechnung", nr: 6, text: "Schlussrechnungen, Kostenfeststellung" },
};
export const KOSTENSTAND_IDS = Object.keys(KOSTENSTAENDE);

export const VERLEGEARTEN = {
  graben: "Offener Graben (Acker/Wiese)",
  pflug: "Kabelpflug",
  bankett: "Straßenbankett",
  asphalt: "Asphaltdecke",
  spuelbohrung: "Spülbohrung (HDD)",
};
export const QUERUNGEN = { strasse: "Straße", bahn: "Bahn", gewaesser: "Gewässer" };

/** EPC-Spanne (€/kWp) je Typ aus markt.js */
export function capexSpanne(typ) {
  if (typ === "agri") return AGRI.capexProKwp.vertikal;
  if (typ === "carport") return CARPORT.capexProKwp;
  if (typ === "dach") return DACH.capexProKwp;
  return FREIFLAECHE.capexProKwp;
}
const anteileFuer = (typ) => (typ === "carport" ? PK.epcAnteile.carport : typ === "dach" ? PK.epcAnteile.dach : PK.epcAnteile.standard);
const hatFlaeche = (typ) => ["freiflaeche", "agri", "hybrid", "speicher"].includes(typ);

/** Parameter vervollständigen (Standardwerte aus markt.js) */
export function parameterVoll(p = {}) {
  const typ = p.typ || "freiflaeche";
  const kostenstand = KOSTENSTAENDE[p.kostenstand] ? p.kostenstand : "schaetzung";
  const q = p.trasse?.querungen || {};
  return {
    typ,
    land: p.land || "DE",
    mwp: Math.max(0, Number(p.mwp) || 0),
    mwh: Math.max(0, Number(p.mwh) || 0),
    flaecheHa: Math.max(0, Number(p.flaecheHa) || 0),
    flaechenAnzahl: Math.max(1, Math.round(Number(p.flaechenAnzahl) || 1)),
    zaunM: Math.max(0, Number(p.zaunM) || 0),
    trasse: {
      abschnitte: (Array.isArray(p.trasse?.abschnitte) ? p.trasse.abschnitte : []).filter((a) => VERLEGEARTEN[a?.art] && Number(a.laengeM) > 0).map((a) => ({ art: a.art, laengeM: Number(a.laengeM) })),
      querungen: { strasse: Math.max(0, Math.round(Number(q.strasse) || 0)), bahn: Math.max(0, Math.round(Number(q.bahn) || 0)), gewaesser: Math.max(0, Math.round(Number(q.gewaesser) || 0)) },
      quelle: p.trasse?.quelle || "",
    },
    speicherNetzbezug: !!p.speicherNetzbezug,
    kostenstand,
    contingency: Number.isFinite(Number(p.contingency)) && p.contingency !== null && p.contingency !== "" ? Math.max(0, Math.min(0.5, Number(p.contingency))) : PK.contingency[kostenstand],
    fkQuote: Number.isFinite(Number(p.fkQuote)) && p.fkQuote !== null && p.fkQuote !== "" ? Math.max(0, Math.min(1, Number(p.fkQuote))) : FINANZIERUNG.fremdkapitalQuote,
    zinsBau: Number.isFinite(Number(p.zinsBau)) && p.zinsBau !== null && p.zinsBau !== "" ? Math.max(0, Math.min(0.2, Number(p.zinsBau))) : (FINANZIERUNG.projekt.referenzzinsPct + FINANZIERUNG.projekt.margePct) / 100,
    bauzeitMonate: Math.max(1, Math.min(36, Math.round(Number(p.bauzeitMonate) || PK.bauzeitMonate[typ] || 6))),
    gutachten: (Array.isArray(p.gutachten) ? p.gutachten : []).filter((g) => g?.schluessel).map((g) => ({ schluessel: String(g.schluessel), titel: String(g.titel || g.schluessel) })),
  };
}

export const trassenLaenge = (p) => (p.trasse?.abschnitte || []).reduce((s, a) => s + (Number(a.laengeM) || 0), 0);

/** Kabelsysteme 20 kV nach Anschlussleistung (netzanschluss.js) */
export function kabelSysteme(mw) {
  return Math.max(1, Math.ceil((Number(mw) || 0) / FREIFLAECHE.netz.msSystemMw - 1e-9));
}

/**
 * Vorschlagspositionen aus den Parametern. Jede Position: { schluessel, gewerk, bezeichnung, art, menge, einheit, ep,
 * satz, basis, quelle }.
 */
export function vorschlag(parameter) {
  const p = parameterVoll(parameter);
  const kwp = p.mwp * 1000;
  const pos = [];
  const add = (x) => pos.push({ art: "menge", satz: null, basis: null, ...x });
  const spanne = capexSpanne(p.typ);
  const anteile = anteileFuer(p.typ);
  const pv = kwp > 0 && p.typ !== "speicher";

  // ---- Entwicklung
  const gutachtenSumme = p.gutachten.reduce((s, g) => s + (PK.gutachtenEur[g.schluessel] ?? PK.gutachtenEur.standard), 0);
  const entwGesamt = kwp * FREIFLAECHE.entwicklungProKwp.min > 0 ? (kwp * (FREIFLAECHE.entwicklungProKwp.min + FREIFLAECHE.entwicklungProKwp.max)) / 2 : 0;
  const rest = Math.max(kwp * FREIFLAECHE.entwicklungProKwp.min * 0.5, entwGesamt - gutachtenSumme);
  if (hatFlaeche(p.typ) && p.flaecheHa > 0) {
    const proHa = (PACHT.reservierungProHa.min + PACHT.reservierungProHa.max) / 2;
    add({ schluessel: "ent_pacht", gewerk: "ent_pacht", bezeichnung: `Reservierungsentgelt ${PACHT.reservierungJahre.ueblich} Jahre bis Baubeginn`, menge: r2(p.flaecheHa * PACHT.reservierungJahre.ueblich), einheit: "ha·a", ep: proHa, quelle: "markt.js PACHT.reservierungProHa (Mitte)" });
  }
  for (const k of ["planung", "gebuehren", "recht", "netzpruefung"]) {
    if (!rest || !PK.entwicklungAnteile[k]) continue;
    add({ schluessel: `ent_${k}`, gewerk: `ent_${k}`, bezeichnung: GEWERKE[`ent_${k}`].label, menge: 1, einheit: "psch", ep: r2(rest * PK.entwicklungAnteile[k]), quelle: "markt.js FREIFLAECHE.entwicklungProKwp (Mitte) abzgl. Gutachten" });
  }
  for (const g of p.gutachten) {
    add({ schluessel: `gutachten:${g.schluessel}`, gewerk: "ent_gutachten", bezeichnung: g.titel, menge: 1, einheit: "Stk", ep: PK.gutachtenEur[g.schluessel] ?? PK.gutachtenEur.standard, quelle: "markt.js PROJEKTKOSTEN.gutachtenEur" });
  }

  // ---- Grundstück
  const tl = trassenLaenge(p);
  if (tl > 0) add({ schluessel: "gr_dienstbarkeit", gewerk: "gr_dienstbarkeit", bezeichnung: "Entschädigung Leitungsrechte entlang der Trasse", menge: r2(tl), einheit: "m", ep: PK.dienstbarkeitProM, quelle: "markt.js PROJEKTKOSTEN.dienstbarkeitProM" });
  if (hatFlaeche(p.typ) || tl > 0) {
    const vorgaenge = p.flaechenAnzahl + (tl > 0 ? Math.ceil(tl / 250) : 0);
    add({ schluessel: "gr_notar", gewerk: "gr_notar", bezeichnung: "Notar/Grundbuch (Dienstbarkeiten, Vormerkungen)", menge: vorgaenge, einheit: "Vorgang", ep: PK.notarJeFlaeche, quelle: "markt.js PROJEKTKOSTEN.notarJeFlaeche" });
  }

  // ---- Technik (EPC)
  const epc = spanne.mittel;
  if (pv) {
    for (const k of ["module", "wechselrichter", "unterkonstruktion", "dc", "ac", "bos"]) {
      if (!anteile[k]) continue;
      add({ schluessel: k, gewerk: k, bezeichnung: GEWERKE[k].label, menge: kwp, einheit: "kWp", ep: r2(epc * anteile[k]), quelle: `markt.js EPC ${epc} €/kWp × Anteil ${Math.round(anteile[k] * 100)} %` });
    }
    if (anteile.zaun) {
      if (p.zaunM > 0 || p.flaecheHa > 0) {
        const m = p.zaunM > 0 ? p.zaunM : Math.round(4 * Math.sqrt(p.flaecheHa * 10000) * 1.15);
        add({ schluessel: "zaun", gewerk: "zaun", bezeichnung: `Zaun inkl. Tore${p.zaunM > 0 ? "" : " (Länge geschätzt aus Fläche)"}`, menge: m, einheit: "m", ep: PK.zaunProM, quelle: p.zaunM > 0 ? "Zaunlänge aus Parametern/DXF" : "Umfang ≈ 4 × √Fläche × 1,15" });
        if (p.flaecheHa > 0) add({ schluessel: "kamera", gewerk: "zaun", bezeichnung: "Kamera / Einbruchmeldeanlage", menge: r2(p.flaecheHa), einheit: "ha", ep: PK.kameraProHa, quelle: "markt.js PROJEKTKOSTEN.kameraProHa" });
      } else add({ schluessel: "zaun", gewerk: "zaun", bezeichnung: GEWERKE.zaun.label, menge: kwp, einheit: "kWp", ep: r2(epc * anteile.zaun), quelle: "EPC-Anteil (ohne Zaunlänge)" });
    }
    if (anteile.wege) {
      if (p.flaecheHa > 0 && hatFlaeche(p.typ)) add({ schluessel: "wege", gewerk: "wege", bezeichnung: GEWERKE.wege.label, menge: r2(p.flaecheHa), einheit: "ha", ep: PK.wegeProHa, quelle: "markt.js PROJEKTKOSTEN.wegeProHa" });
      else add({ schluessel: "wege", gewerk: "wege", bezeichnung: p.typ === "carport" ? "Belag, Entwässerung, Erdarbeiten" : GEWERKE.wege.label, menge: kwp, einheit: "kWp", ep: r2(epc * anteile.wege), quelle: "EPC-Anteil" });
    }
    if (hatFlaeche(p.typ) && p.flaecheHa > 0) add({ schluessel: "ausgleich", gewerk: "ausgleich", bezeichnung: GEWERKE.ausgleich.label, menge: r2(p.flaecheHa), einheit: "ha", ep: PK.ausgleichProHa, quelle: "markt.js PROJEKTKOSTEN.ausgleichProHa" });
  }
  if (p.mwh > 0) add({ schluessel: "speicher", gewerk: "speicher", bezeichnung: "Batteriespeicher schlüsselfertig", menge: p.mwh * 1000, einheit: "kWh", ep: SPEICHER.capexProKwh.mittel, quelle: "markt.js SPEICHER.capexProKwh (Mitte)" });
  if (pv && anteile.bauleitung) pos.push({ schluessel: "bauleitung", gewerk: "bauleitung", bezeichnung: GEWERKE.bauleitung.label, art: "prozent", menge: null, einheit: "%", ep: null, satz: Math.round((anteile.bauleitung / (1 - anteile.bauleitung)) * 1e6) / 1e6, basis: "technik", quelle: "EPC-Anteil als Aufschlag auf die Gewerke" });

  // ---- Netz
  const speicherMw = p.mwh > 0 ? p.mwh / 2 : 0;
  const anschlussMw = p.typ === "speicher" ? Math.max(p.mwp, speicherMw) : p.mwp;
  const ebene = ebeneFuer(anschlussMw);
  if (p.typ === "speicher") {
    if (anschlussMw > 0) add({ schluessel: "station", gewerk: "station", bezeichnung: "Umspannung / Schaltanlage Speicher", menge: anschlussMw * 1000, einheit: "kW", ep: ebene === "hs" ? SPEICHER.netzanschlussProKw.hs : SPEICHER.netzanschlussProKw.ms, quelle: "markt.js SPEICHER.netzanschlussProKw" });
  } else if (p.mwp > 0) add({ schluessel: "station", gewerk: "station", bezeichnung: GEWERKE.station.label, menge: r2(p.mwp), einheit: "MWp", ep: FREIFLAECHE.netzanschlussFixProMwp, quelle: "markt.js FREIFLAECHE.netzanschlussFixProMwp" });
  if (tl > 0) {
    if (ebene === "hs") add({ schluessel: "trasse:hs", gewerk: "trasse", bezeichnung: "Kabeltrasse 110 kV", menge: r2(tl), einheit: "m", ep: FREIFLAECHE.netz.hsKabelProKm.mittel / 1000, quelle: "markt.js FREIFLAECHE.netz.hsKabelProKm (Mitte)" });
    else {
      const sys = kabelSysteme(anschlussMw);
      const faktor = 1 + (sys - 1) * FREIFLAECHE.netz.zusatzSystemFaktor;
      for (const a of p.trasse.abschnitte) {
        add({ schluessel: `trasse:${a.art}`, gewerk: "trasse", bezeichnung: `MS-Trasse ${VERLEGEARTEN[a.art]}${sys > 1 ? ` (${sys} Systeme)` : ""}`, menge: r2(a.laengeM), einheit: "m", ep: r2(PK.trasseProM[a.art] * faktor), quelle: `markt.js PROJEKTKOSTEN.trasseProM${sys > 1 ? " × Systemfaktor" : ""}` });
      }
    }
  }
  for (const [k, n] of Object.entries(p.trasse.querungen)) {
    if (n > 0) add({ schluessel: `querung:${k}`, gewerk: "querung", bezeichnung: `Querung ${QUERUNGEN[k]}`, menge: n, einheit: "Stk", ep: PK.querung[k], quelle: "markt.js PROJEKTKOSTEN.querung" });
  }
  if (anschlussMw > 0) {
    if (ebene === "msLeitung") add({ schluessel: "netzanschluss", gewerk: "netzanschluss", bezeichnung: "Einschleifen in die MS-Leitung (Schaltanlage, Schutz)", menge: 1, einheit: "psch", ep: FREIFLAECHE.netz.einschleifen, quelle: "markt.js FREIFLAECHE.netz.einschleifen" });
    else if (ebene === "uwMs") {
      const sys = kabelSysteme(anschlussMw);
      add({ schluessel: "netzanschluss", gewerk: "netzanschluss", bezeichnung: "Schaltfeld(er) im Umspannwerk", menge: sys, einheit: "Feld", ep: FREIFLAECHE.netz.uwFeld.mittel, quelle: "markt.js FREIFLAECHE.netz.uwFeld (Mitte)" });
    } else add({ schluessel: "netzanschluss", gewerk: "netzanschluss", bezeichnung: "Eigenes Umspannwerk 110/20 kV", menge: 1, einheit: "psch", ep: FREIFLAECHE.netz.kundenUwFix + FREIFLAECHE.netz.kundenUwProMva * anschlussMw, quelle: "markt.js FREIFLAECHE.netz.kundenUw*" });
  }
  if (speicherMw > 0 && p.speicherNetzbezug) {
    const satz = ebene === "hs" ? SPEICHER.bkzProKw.hs : SPEICHER.bkzProKw.ms;
    add({ schluessel: "bkz", gewerk: "bkz", bezeichnung: p.land === "AT" ? "Netzbereitstellungsentgelt Speicher (Näherung wie BKZ)" : "Baukostenzuschuss Netzbezug Speicher", menge: speicherMw * 1000, einheit: "kW", ep: satz, quelle: "markt.js SPEICHER.bkzProKw" });
  }

  // ---- Nebenkosten, Reserve, Finanzierung, Sicherheiten
  pos.push({ schluessel: "versicherung", gewerk: "versicherung", bezeichnung: GEWERKE.versicherung.label, art: "prozent", menge: null, einheit: "%", ep: null, satz: PK.versicherungBau, basis: "bau", quelle: "markt.js PROJEKTKOSTEN.versicherungBau" });
  pos.push({ schluessel: "contingency", gewerk: "contingency", bezeichnung: `Unvorhergesehenes (${KOSTENSTAENDE[p.kostenstand].label})`, art: "prozent", menge: null, einheit: "%", ep: null, satz: p.contingency, basis: "bau", quelle: "markt.js PROJEKTKOSTEN.contingency je Kostenstand" });
  pos.push({ schluessel: "bauzeitzinsen", gewerk: "bauzeitzinsen", bezeichnung: `Bauzeitzinsen (${p.bauzeitMonate} Monate, FK ${Math.round(p.fkQuote * 100)} %, Ø 50 % in Anspruch)`, art: "zins", menge: null, einheit: "%", ep: null, satz: p.zinsBau, basis: "bau", quelle: "markt.js FINANZIERUNG.projekt (Referenzzins + Marge)" });
  pos.push({ schluessel: "fin_gebuehren", gewerk: "fin_gebuehren", bezeichnung: "Bearbeitungsgebühr Finanzierung", art: "prozent", menge: null, einheit: "%", ep: null, satz: r2(p.fkQuote * FINANZIERUNG.projekt.bearbeitungPct * 100) / 10000, basis: "invest", quelle: "markt.js FINANZIERUNG.projekt.bearbeitungPct × FK-Quote" });
  if (pv) add({ schluessel: "rueckbau", gewerk: "rueckbau", bezeichnung: GEWERKE.rueckbau.label, menge: kwp, einheit: "kWp", ep: FREIFLAECHE.rueckbauProKwp, quelle: "markt.js FREIFLAECHE.rueckbauProKwp" });
  return pos;
}

/**
 * Gespeicherte Positionen mit dem aktuellen Vorschlag zusammenführen: manuelle Positionen bleiben, nicht manuelle
 * folgen dem Vorschlag (Ist und Notiz bleiben), freie Positionen („frei:…“) bleiben immer.
 */
export function zusammenfuehren(gespeichert = [], vorschlaege = []) {
  const alt = new Map(gespeichert.map((x) => [x.schluessel, x]));
  const out = [];
  for (const v of vorschlaege) {
    const a = alt.get(v.schluessel);
    const vor = { menge: v.menge, ep: v.ep, satz: v.satz };
    if (a?.manuell) out.push({ ...v, ...pick(a), manuell: true, vorschlag: vor });
    else out.push({ ...v, id: a?.id, istEur: a?.istEur ?? null, notiz: a?.notiz || "", angebot: a?.angebot || "", manuell: false, vorschlag: vor });
    alt.delete(v.schluessel);
  }
  for (const a of alt.values()) {
    if (String(a.schluessel).startsWith("frei:") || a.manuell || Number(a.istEur) > 0) out.push({ ...a, vorschlag: a.schluessel.startsWith("frei:") ? null : a.vorschlag || null, entfallen: !a.schluessel.startsWith("frei:") });
  }
  return out;
}
const pick = (a) => ({ id: a.id, bezeichnung: a.bezeichnung, menge: a.menge, ep: a.ep, satz: a.satz, einheit: a.einheit, istEur: a.istEur ?? null, notiz: a.notiz || "", angebot: a.angebot || "" });

/**
 * Berechnung: Beträge je Position, Summen je Gruppe/Gewerk, Kennzahlen, Benchmark-Ampeln.
 * Ergebnis { positionen[+betrag, eurProKwp, abweichung, ampel], gruppen{}, gewerke{}, summen{…}, benchmark{…} }
 */
export function berechnen(positionen, parameter) {
  const p = parameterVoll(parameter);
  const kwp = p.mwp * 1000;
  const liste = positionen.map((x) => ({ ...x, gruppe: GEWERKE[x.gewerk]?.gruppe || "neben" }));
  const betragMenge = (x) => r2((Number(x.menge) || 0) * (Number(x.ep) || 0));
  const summeWo = (f) => liste.filter(f).reduce((s, x) => s + (x.betrag || 0), 0);
  // 1. Mengenpositionen
  for (const x of liste) if (x.art === "menge" || !x.art) x.betrag = betragMenge(x);
  // 2. Aufschläge auf Technik (Bauleitung/EPC-Marge)
  const technikBasis = summeWo((x) => x.gruppe === "technik" && x.art !== "prozent" && x.gewerk !== "speicher");
  for (const x of liste) if (x.art === "prozent" && x.basis === "technik") x.betrag = r2(technikBasis * (Number(x.satz) || 0));
  // 3. Bezug Bau (Technik + Netz): Versicherung, Unvorhergesehenes
  const bau = summeWo((x) => x.gruppe === "technik" || x.gruppe === "netz");
  for (const x of liste) if (x.art === "prozent" && x.basis === "bau") x.betrag = r2(bau * (Number(x.satz) || 0));
  // 4. Bauzeitzinsen: FK-Quote × (Bau + Neben + Reserve) × Zins × Monate/12 × 0,5
  const bauGesamt = summeWo((x) => ["technik", "netz", "neben", "reserve"].includes(x.gruppe) && x.art !== "zins");
  for (const x of liste) if (x.art === "zins") x.betrag = r2(p.fkQuote * bauGesamt * (Number(x.satz) || 0) * (p.bauzeitMonate / 12) * 0.5);
  // 5. Bezug Investition (alles außer Finanzierung/Sicherheit): Gebühren
  const invest = summeWo((x) => !["finanzierung", "sicherheit"].includes(x.gruppe));
  for (const x of liste) if (x.art === "prozent" && x.basis === "invest") x.betrag = r2(invest * (Number(x.satz) || 0));

  const gruppen = {};
  const gewerke = {};
  for (const g of Object.keys(GRUPPEN)) gruppen[g] = { soll: 0, ist: 0, eurProKwp: null };
  for (const x of liste) {
    gruppen[x.gruppe].soll += x.betrag || 0;
    gruppen[x.gruppe].ist += Number(x.istEur) || 0;
    const gw = (gewerke[x.gewerk] ||= { soll: 0, ist: 0, vorschlag: 0, eurProKwp: null });
    gw.soll += x.betrag || 0;
    gw.ist += Number(x.istEur) || 0;
    // Vorschlagswert der Position (für Abweichung)
    if (x.vorschlag && (x.art === "menge" || !x.art)) x.vorschlagBetrag = r2((Number(x.vorschlag.menge) || 0) * (Number(x.vorschlag.ep) || 0));
    else if (x.vorschlag && x.satz && x.vorschlag.satz) x.vorschlagBetrag = r2((x.betrag || 0) * (x.vorschlag.satz / x.satz));
    else x.vorschlagBetrag = null;
    x.abweichung = x.vorschlagBetrag ? (x.betrag - x.vorschlagBetrag) / x.vorschlagBetrag : null;
    x.ampel = x.abweichung === null || !x.manuell ? null : Math.abs(x.abweichung) <= 0.1 ? "gruen" : Math.abs(x.abweichung) <= 0.25 ? "gelb" : "rot";
    x.eurProKwp = kwp > 0 ? r2(x.betrag / kwp) : null;
    gw.vorschlag += x.vorschlagBetrag ?? x.betrag ?? 0;
  }
  for (const g of Object.values(gruppen)) {
    g.soll = r2(g.soll);
    g.ist = r2(g.ist);
    g.eurProKwp = kwp > 0 ? r2(g.soll / kwp) : null;
  }
  for (const g of Object.values(gewerke)) {
    g.soll = r2(g.soll);
    g.ist = r2(g.ist);
    g.vorschlag = r2(g.vorschlag);
    g.eurProKwp = kwp > 0 ? r2(g.soll / kwp) : null;
  }
  const gesamt = r2(Object.entries(gruppen).filter(([k]) => k !== "sicherheit").reduce((s, [, g]) => s + g.soll, 0));
  const capex = r2(gesamt - gruppen.finanzierung.soll);
  const finanzierungsbedarf = r2(gesamt + gruppen.sicherheit.soll);
  const epcOhneSpeicher = r2(gruppen.technik.soll - (gewerke.speicher?.soll || 0));
  const summen = {
    gesamt, capex, finanzierungsbedarf, bau: r2(bau), invest: r2(invest),
    ist: r2(liste.reduce((s, x) => s + (Number(x.istEur) || 0), 0)),
    eurProKwp: kwp > 0 ? r2(gesamt / kwp) : null,
    capexProKwp: kwp > 0 ? r2(capex / kwp) : null,
    epcProKwp: kwp > 0 && p.typ !== "speicher" ? r2(epcOhneSpeicher / kwp) : null,
    eurProKwh: p.mwh > 0 ? r2((gewerke.speicher?.soll || 0) / (p.mwh * 1000)) : null,
    kwp,
  };
  return { positionen: liste, gruppen, gewerke, summen, benchmark: benchmark(summen, gruppen, p), parameter: p };
}

/** Benchmark gegen markt.js: EPC-Spanne des Typs, Entwicklungskosten, Netzanteil an der Anlage */
export function benchmark(summen, gruppen, p) {
  const out = [];
  const kwp = summen.kwp;
  if (kwp > 0 && p.typ !== "speicher") {
    const sp = capexSpanne(p.typ);
    const w = summen.epcProKwp;
    out.push({ id: "epc", label: "Technik/EPC €/kWp", wert: w, min: sp.min, max: sp.max, mittel: sp.mittel, ampel: w <= sp.max && w >= sp.min ? "gruen" : w <= sp.max * 1.1 && w >= sp.min * 0.9 ? "gelb" : "rot", text: `Spanne ${sp.min}–${sp.max} €/kWp (markt.js)` });
    const e = gruppen.entwicklung.eurProKwp;
    const es = FREIFLAECHE.entwicklungProKwp;
    out.push({ id: "entwicklung", label: "Entwicklung €/kWp", wert: e, min: es.min, max: es.max, mittel: (es.min + es.max) / 2, ampel: e <= es.max && e >= es.min ? "gruen" : e <= es.max * 1.25 && e >= es.min * 0.5 ? "gelb" : "rot", text: `Spanne ${es.min}–${es.max} €/kWp bis Baureife` });
    const anteil = summen.epcProKwp > 0 ? gruppen.netz.soll / (summen.epcProKwp * kwp) : 0;
    out.push({ id: "netz", label: "Netzanschluss in % der Anlage", wert: r2(anteil * 10000) / 100, einheit: "%", ampel: anteil <= 0.15 ? "gruen" : anteil <= 0.3 ? "gelb" : "rot", text: "bis 15 % unkritisch, über 30 % drückt die Rendite spürbar (Netzanschluss-Check)" });
  }
  if (p.mwh > 0) {
    const w = summen.eurProKwh;
    const sp = SPEICHER.capexProKwh;
    out.push({ id: "speicher", label: "Speicher €/kWh", wert: w, min: sp.min, max: sp.max, mittel: sp.mittel, ampel: w <= sp.max && w >= sp.min ? "gruen" : w <= sp.max * 1.1 ? "gelb" : "rot", text: `Spanne ${sp.min}–${sp.max} €/kWh` });
  }
  const schlecht = out.some((b) => b.ampel === "rot") ? "rot" : out.some((b) => b.ampel === "gelb") ? "gelb" : "gruen";
  return { eintraege: out, ampel: out.length ? schlecht : null };
}

/**
 * Soll/Ist je Kostenart des Finanzmoduls (nur Entwicklungs-/Grundstückspositionen haben eine Kostenart). istFinanzen =
 * { jeArt: { planung: 1234, … } } aus finanzen.entwicklungIst bzw. ERPNext; sonst manuelle Ist-Werte der Positionen.
 */
export function sollIst(ergebnis, istFinanzen = null) {
  const zeilen = {};
  for (const x of ergebnis.positionen) {
    const art = GEWERKE[x.gewerk]?.kostenart || (x.gruppe === "entwicklung" ? "sonstiges" : null);
    const key = art || `gruppe:${x.gruppe}`;
    const z = (zeilen[key] ||= { schluessel: key, kostenart: art, gruppe: x.gruppe, soll: 0, istManuell: 0, istFinanzen: null });
    z.soll += x.betrag || 0;
    z.istManuell += Number(x.istEur) || 0;
  }
  const jeArt = istFinanzen?.jeArt || null;
  if (jeArt) {
    for (const [art, betrag] of Object.entries(jeArt)) {
      const z = (zeilen[art] ||= { schluessel: art, kostenart: art, gruppe: "entwicklung", soll: 0, istManuell: 0, istFinanzen: null });
      z.istFinanzen = r2((z.istFinanzen || 0) + (Number(betrag) || 0));
    }
  }
  return Object.values(zeilen).map((z) => {
    const ist = z.istFinanzen !== null ? z.istFinanzen : z.istManuell;
    return { ...z, soll: r2(z.soll), istManuell: r2(z.istManuell), ist: r2(ist), quelle: z.istFinanzen !== null ? istFinanzen?.quelle || "finanzen" : "manuell", abweichung: z.soll ? (ist - z.soll) / z.soll : null };
  }).sort((a, b) => (GRUPPEN[a.gruppe]?.reihenfolge || 9) - (GRUPPEN[b.gruppe]?.reihenfolge || 9));
}

/** Momentaufnahme für die Kostenstand-Historie */
export function standSchnappschuss(ergebnis) {
  return {
    summen: { gesamt: ergebnis.summen.gesamt, capex: ergebnis.summen.capex, finanzierungsbedarf: ergebnis.summen.finanzierungsbedarf, eurProKwp: ergebnis.summen.eurProKwp, epcProKwp: ergebnis.summen.epcProKwp },
    gruppen: Object.fromEntries(Object.entries(ergebnis.gruppen).map(([k, g]) => [k, g.soll])),
    positionen: ergebnis.positionen.map((x) => ({ schluessel: x.schluessel, gewerk: x.gewerk, bezeichnung: x.bezeichnung, art: x.art, menge: x.menge, einheit: x.einheit, ep: x.ep, satz: x.satz, betrag: x.betrag, manuell: !!x.manuell })),
  };
}

/** Vergleich zweier Kostenstände (Δ gesamt, Δ je Gruppe) */
export function standVergleich(neu, alt) {
  if (!neu || !alt) return null;
  const d = r2(neu.summen.gesamt - alt.summen.gesamt);
  return {
    gesamt: d, anteil: alt.summen.gesamt ? d / alt.summen.gesamt : null,
    gruppen: Object.fromEntries(Object.keys(GRUPPEN).map((g) => [g, r2((neu.gruppen[g] || 0) - (alt.gruppen[g] || 0))])),
  };
}

/** DXF-Kennzahlen → Parameter-Übernahme (Vorschau der Änderungen, Bestätigung im UI) */
export function uebernahmeAusDxf(parameter, kz) {
  const p = parameterVoll(parameter);
  const aenderungen = [];
  if (kz?.zaunM > 0) aenderungen.push({ feld: "zaunM", label: "Zaunlänge", alt: p.zaunM || null, neu: Math.round(kz.zaunM), einheit: "m" });
  if (kz?.kabelMsM > 0) aenderungen.push({ feld: "trasse", label: "Trassenlänge (Kabel_MS)", alt: trassenLaenge(p) || null, neu: Math.round(kz.kabelMsM), einheit: "m" });
  if (kz?.anlageHa > 0) aenderungen.push({ feld: "flaecheHa", label: "Anlagenfläche (Baugrenze)", alt: p.flaecheHa || null, neu: kz.anlageHa, einheit: "ha" });
  if (kz?.kwpGeschaetzt > 0) aenderungen.push({ feld: "info_kwp", label: `Leistung aus ${kz.tische} Tischen (geschätzt, nur Hinweis)`, alt: p.mwp ? p.mwp * 1000 : null, neu: kz.kwpGeschaetzt, einheit: "kWp", nurHinweis: true });
  return aenderungen;
}

/** Trassenlänge in Parameter setzen (eine Verlegeart; vorhandene Aufteilung wird proportional skaliert) */
export function trasseSetzen(parameter, laengeM, quelle = "") {
  const p = parameterVoll(parameter);
  const alt = trassenLaenge(p);
  const l = Math.max(0, Number(laengeM) || 0);
  const abschnitte = alt > 0 ? p.trasse.abschnitte.map((a) => ({ art: a.art, laengeM: Math.round((a.laengeM / alt) * l * 10) / 10 })) : l > 0 ? [{ art: "graben", laengeM: l }] : [];
  return { ...parameter, trasse: { ...(parameter.trasse || {}), abschnitte, querungen: p.trasse.querungen, quelle } };
}
