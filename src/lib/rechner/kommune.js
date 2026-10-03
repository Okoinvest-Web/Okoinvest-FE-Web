// src/lib/rechner/kommune.js
//
// Was ein Solarpark der Standortgemeinde bringt – reine Logik (Deutschland).
// Quellen der Einnahmen:
//  1. § 6 EEG: freiwillige Zahlung des Betreibers bis 0,2 ct/kWh
//  2. Gewerbesteuer: 90 % des Messbetrags an die Standortgemeinde
//     (§ 29 Abs. 1 Nr. 2 GewStG), 100 %, wenn der Betreiber dort seinen Sitz hat
//  3. Pacht, wenn Flächen der Gemeinde genutzt werden
//
// Die Gewerbesteuer wird vereinfacht aus der Solarpark-Rechnung abgeleitet:
// Ergebnis = EBITDA − lineare AfA − Zinsen, Hinzurechnung von 25 % der Zinsen
// über 200.000 €, Verlustvortrag ohne Mindestbesteuerung. Typisch ist, dass in
// den ersten Jahren durch Abschreibung und Zinsen kaum Gewerbesteuer anfällt.

//
// Länderfähig (Welle 2, Paket B1): KOMMUNE, PACHT, ERLOESE und FREIFLAECHE je Land aus dem
// Faktenregister über rechenbasisFuer({ land, regionId }). Gesperrte Länder (AT/CH: § 6 EEG
// und Gewerbesteuer sind deutsches Recht) rechnen wie bisher mit der deutschen Basis und
// melden `sperre`. Die Parkrechnung (solarpark.js) läuft noch über die Fassade markt.js.

import { BAUART } from "../invest/markt.js";
import { rechenbasisFuer, marktFuer, standardRegion, annahmenbuch } from "../invest/laender/marktFuer.js";
import { rechneSolarpark } from "./solarpark.js";

/** Fakten, auf denen rechneKommune unmittelbar beruht (Annahmenbuch für Bericht B4; Parkrechnung siehe solarpark.js) */
export const KOMMUNE_FAKTEN = [
  "kommune.beteiligungCt",
  "kommune.gewerbesteuerStandort",
  "kommune.hebesatz",
  "kommune.messzahl",
  "kommune.betrachtungJahre",
  "kommune.afaJahre",
  "kommune.hinzurechnungZinsen",
  "kommune.hinzurechnungFreibetrag",
  "kommune.laenderMitBeteiligungsgesetz",
  "pacht.freiflaecheProHa",
  "pacht.indexierung",
  "erloese.eegFreiflaecheCt",
  "erloese.negativAnteilSolar",
  "freiflaeche.laufzeit",
];

/** Annahmenbuch (Wert, Quelle, Stand, Status je Fakt) zu einer Eingabe von rechneKommune */
export const annahmenKommune = (eingabe = {}) => annahmenbuch(KOMMUNE_FAKTEN, { land: eingabe.land, regionId: eingabe.regionId ?? standardRegion(eingabe.land) });

const { KOMMUNE, PACHT, ERLOESE } = marktFuer("DE");

/** Standardeingaben (deutsche Werte; für ein anderes Land füllt rechneKommune fehlende Eingaben aus dessen Rechenbasis) */
export const STANDARD = {
  mwp: 20,
  regionId: "de-sued",
  bauart: "sued",
  hebesatz: KOMMUNE.hebesatz,
  paragraph6: true,
  gemeindeflaeche: false,
  anteilGemeinde: 1,
  pachtHa: PACHT.freiflaecheProHa.mittel,
  sitzInGemeinde: false,
  /** Erlös des Parks in ct/kWh (EEG-Zuschlag bzw. PPA) – bestimmt den Gewinn und damit die Gewerbesteuer */
  preisCt: ERLOESE.eegFreiflaecheCt,
};

export function rechneKommune(eingabe = {}) {
  const basis = rechenbasisFuer({ land: eingabe.land, regionId: eingabe.regionId ?? standardRegion(eingabe.land) });
  const { KOMMUNE, PACHT, ERLOESE, FREIFLAECHE } = basis.markt;
  const landStandard = { regionId: standardRegion(basis.land), hebesatz: KOMMUNE.hebesatz, pachtHa: PACHT.freiflaecheProHa.mittel, preisCt: ERLOESE.eegFreiflaecheCt };
  const e = { ...STANDARD, ...landStandard, ...eingabe };
  const N = KOMMUNE.betrachtungJahre;
  const L = FREIFLAECHE.laufzeit; // gesamte Laufzeit – nach Ende der AfA steigt die Gewerbesteuer
  const park = rechneSolarpark({ mwp: e.mwp, regionId: e.regionId, bauart: e.bauart, pachtHa: e.pachtHa, preisCt: e.preisCt, modell: "eeg", laufzeit: L });
  const flaecheHa = e.mwp * (BAUART[e.bauart] || BAUART.sued).haProMwp;
  const afa = park.investition.summe / KOMMUNE.afaJahre;
  const anteilGewSt = e.sitzInGemeinde ? 1 : KOMMUNE.gewerbesteuerStandort;

  let verlustvortrag = 0;
  const jahre = [];
  for (let t = 1; t <= L; t++) {
    const j = park.jahre[t - 1];
    // § 6 Abs. 5 EEG: Erstattet wird nur für Strommengen, für die eine Förderung nach dem EEG in Anspruch genommen
    // wurde (gesetze-im-internet.de/eeg_2014/__6.html, abgerufen 03.10.2026). Paket E: Zahlung daher nur in der
    // EEG-Förderphase (vorher alle 30 Jahre) und ohne die nach § 51 EEG nicht geförderten Zeiträume (vorher volle Erzeugung).
    const p6 = e.paragraph6 && j.imVertrag ? (j.erzeugung * j.vergueteterAnteil * KOMMUNE.beteiligungCt) / 100 : 0;
    // § 6-Zahlung ist beim Betreiber Betriebsausgabe (Erstattung durch den Netzbetreiber bei EEG-Anlagen – vereinfacht neutral)
    const ergebnis = j.ebitda - (t <= KOMMUNE.afaJahre ? afa : 0) - j.zinsen;
    const hinzurechnung = Math.max(0, j.zinsen - KOMMUNE.hinzurechnungFreibetrag) * KOMMUNE.hinzurechnungZinsen;
    let ertrag = ergebnis + hinzurechnung;
    if (ertrag < 0) {
      verlustvortrag += -ertrag;
      ertrag = 0;
    } else if (verlustvortrag > 0) {
      const verrechnet = Math.min(verlustvortrag, ertrag);
      verlustvortrag -= verrechnet;
      ertrag -= verrechnet;
    }
    const gewSt = ertrag * KOMMUNE.messzahl * e.hebesatz * anteilGewSt;
    const pacht = e.gemeindeflaeche ? flaecheHa * e.anteilGemeinde * e.pachtHa * Math.pow(1 + PACHT.indexierung, t - 1) : 0;
    jahre.push({ jahr: t, p6, gewSt, pacht, summe: p6 + gewSt + pacht, erzeugung: j.erzeugung });
  }
  const summeBis = (k, bis) => jahre.slice(0, bis).reduce((s, j) => s + j[k], 0);
  const topf = (bis) => {
    const g = { p6: summeBis("p6", bis), gewSt: summeBis("gewSt", bis), pacht: summeBis("pacht", bis) };
    g.summe = g.p6 + g.gewSt + g.pacht;
    return g;
  };
  const gesamt = topf(N);
  const gesamtLaufzeit = topf(L);
  const ersteGewSt = jahre.find((j) => j.gewSt > 0)?.jahr ?? null;
  const spaet = jahre.slice(KOMMUNE.afaJahre);
  const gewStNachAfa = spaet.length ? spaet.reduce((s, j) => s + j.gewSt, 0) / spaet.length : 0;

  return {
    eingabe: e,
    /** Länder-Sperre AT/CH: § 6 EEG und Gewerbesteuer sind deutsches Recht (laender/sperre.js) */
    sperre: basis.sperre,
    /** Hinweis: Landesgesetze zur Beteiligung (KOMMUNE.laenderMitBeteiligungsgesetz) sind nicht gerechnet */
    landesregeln: { laender: KOMMUNE.laenderMitBeteiligungsgesetz, stand: KOMMUNE.laenderGesetzeStand, gerechnet: false },
    jahre,
    gesamt,
    gesamtLaufzeit,
    gewStNachAfa,
    proJahr: gesamt.summe / N,
    jahre1: jahre[0],
    ersteGewSt,
    flaecheHa,
    ertragJahr1: park.ertragJahr1,
    investition: park.investition.summe,
    N,
    L,
  };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/kommune.js                         */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, text) => {
    if (!ok) fehler.push(text);
  };
  const r = rechneKommune({ mwp: 10, regionId: "de-sued", paragraph6: true, gemeindeflaeche: false });
  const anteil51 = 1 - ERLOESE.paragraph51.anteilNegativ;
  pruefe(Math.abs(r.jahre[0].p6 - 11_000_000 * anteil51 * 0.002) < 1, "§ 6: 11 GWh × geförderter Anteil (§ 51) × 0,2 ct");
  pruefe(r.jahre[19].p6 > 0 && r.jahre[20].p6 === 0, "§ 6 nur in der EEG-Förderphase (Erstattung § 6 Abs. 5)");
  pruefe(rechneKommune({ regionId: "at" }).sperre?.land === "AT" && r.sperre === null, "Länder-Sperre: AT gesperrt, DE frei");
  pruefe(r.jahre.length === 30, "30 Jahre Laufzeit gerechnet");
  pruefe(r.gesamt.pacht === 0, "ohne Gemeindefläche keine Pacht");
  pruefe(r.gesamtLaufzeit.gewSt > 0, "über die Laufzeit fällt Gewerbesteuer an");
  pruefe(r.jahre[0].gewSt <= r.jahre[24].gewSt, "Gewerbesteuer steigt tendenziell (AfA, Zinsen, Verlustvortrag)");
  pruefe(r.gewStNachAfa > 0, "nach Ende der AfA fällt Gewerbesteuer an");
  const teuer = rechneKommune({ mwp: 10, preisCt: 6.5 });
  pruefe(teuer.gesamt.gewSt > r.gesamt.gewSt, "höherer Erlös → mehr Gewerbesteuer");
  const ohne6 = rechneKommune({ mwp: 10, paragraph6: false });
  pruefe(ohne6.gesamt.p6 === 0, "ohne § 6 keine Zahlung");
  const hoch = rechneKommune({ mwp: 10, hebesatz: 5 });
  const niedrig = rechneKommune({ mwp: 10, hebesatz: 3 });
  pruefe(Math.abs(hoch.gesamtLaufzeit.gewSt / niedrig.gesamtLaufzeit.gewSt - 5 / 3) < 1e-6, "Gewerbesteuer proportional zum Hebesatz");
  const sitz = rechneKommune({ mwp: 10, sitzInGemeinde: true });
  pruefe(Math.abs(sitz.gesamtLaufzeit.gewSt / r.gesamtLaufzeit.gewSt - 1 / 0.9) < 1e-6, "Sitz in der Gemeinde: 100 statt 90 %");
  const flaeche = rechneKommune({ mwp: 10, gemeindeflaeche: true, anteilGemeinde: 1, pachtHa: 2000 });
  pruefe(Math.abs(flaeche.jahre[0].pacht - 11 * 2000) < 1, "Pacht: 11 ha × 2.000 €");
  return { fehler, beispiel: r };
}

if (typeof process !== "undefined" && process.argv?.[1] && /kommune\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler, beispiel: r } = selbsttest();
  console.log(
    `Beispiel 10 MWp: § 6 ${Math.round(r.gesamt.p6)} €, GewSt ${Math.round(r.gesamt.gewSt)} € (erstmals Jahr ${r.ersteGewSt}, danach ~${Math.round(r.gewStNachAfa)} €/J.), gesamt ${Math.round(r.gesamt.summe)} € in 20 J., ${Math.round(r.gesamtLaufzeit.summe)} € in 30 J.`
  );
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest kommune.js: alle Prüfungen bestanden.");
}
