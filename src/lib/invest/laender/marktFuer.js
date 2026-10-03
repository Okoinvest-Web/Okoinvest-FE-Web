// src/lib/invest/laender/marktFuer.js
//
// Länder-Engine (Welle 2, Paket B1): marktFuer(land) baut aus dem Faktenregister die
// Marktannahmen eines Landes in DERSELBEN FORM wie die bisherigen markt.js-Konstanten
// (FREIFLAECHE, ERLOESE, ZUSCHLAEGE, PACHT, KOMMUNE, DACH = Dach-PV, QUELLEN, REGIONEN)
// – plus Land, Währung, Erlösmodell, Sperre und Annahmenbuch.
//
//   marktFuer("DE")  → Grundlage der Fassade src/lib/invest/markt.js (Strangler-Muster)
//   marktFuer("AT")  → EUR, eigene Fakten, fehlende Werte = null und in `luecken`
//   marktFuer("CH")  → CHF/Rp., eigene Fakten, fehlende Werte = null und in `luecken`
//
// Werte gehen NIE stillschweigend von einem Land ins andere über: Fehlt ein Wert für AT/CH,
// gilt nur ein ausdrücklich als „DACH“ angelegter Fakt (Technikwerte), sonst null.
// Rechner nutzen rechenbasisFuer(): Solange ein Land gesperrt ist (sperre.js), rechnen sie
// – wie bisher – mit der deutschen Basis und melden die Sperre sichtbar.

import { fakt, fakten as faktenListe, quellenListe, datumDe, datumLang, waehrungFuer, waehrungInfo, anzeigeStatus } from "../../fakten/index.js";
import { regionenVon, alleRegionen } from "./regionen.js";
import { laenderSperre, landAus } from "./sperre.js";
import { erloesmodellFuer } from "./erloesmodelle.js";

export { alleRegionen, regionenVon, standardRegion, REGION_STAMM } from "./regionen.js";
export { LAENDER_SPERRE, laenderSperre, landVonRegion, landAus } from "./sperre.js";
export { erloesmodellFuer } from "./erloesmodelle.js";

const kopie = (v) => (v !== null && typeof v === "object" ? structuredClone(v) : v);
const LAENDER = ["DE", "AT", "CH"];
export const normLand = (land) => (LAENDER.includes(String(land || "DE").toUpperCase()) ? String(land || "DE").toUpperCase() : "DE");

/** Leser, der jeden genutzten Fakt und jede Lücke festhält (Annahmenbuch) */
function leser(land) {
  const benutzt = new Map();
  const luecken = [];
  const w = (id) => {
    const f = fakt(id, land);
    if (!f) {
      luecken.push(id);
      return null;
    }
    benutzt.set(`${f.id}|${f.land}`, f);
    return kopie(f.wert);
  };
  const f = (id) => {
    const x = fakt(id, land);
    if (x) benutzt.set(`${x.id}|${x.land}`, x);
    return x;
  };
  return { w, f, benutzt, luecken };
}

/** Zuschlagstermine eines Segments aus dem Register, chronologisch */
function zuschlaege(land, segment, merke) {
  return faktenListe({ land, praefix: `zuschlag.${segment}.`, mitDach: false })
    .filter((x) => x.status !== "entwurf")
    .sort((a, b) => String(a.gueltigAb).localeCompare(String(b.gueltigAb)))
    .map((x) => {
      merke.set(`${x.id}|${x.land}`, x);
      return { datum: x.gueltigAb, termin: datumLang(x.gueltigAb), ct: x.wert.ct, hoechstwertCt: x.wert.hoechstwertCt };
    });
}

/** Termine eines Kalenderjahres aus einer Zuschlagsliste (wie bisher markt.js) */
const zuschlaegeJahr = (liste, jahr) => liste.filter((z) => z.datum.startsWith(String(jahr))).map(({ termin, ct }) => ({ termin, ct }));

function baue(land) {
  const { w, f, benutzt, luecken } = leser(land);

  const FREIFLAECHE = {
    haProMwp: w("freiflaeche.haProMwp"),
    mindestHa: w("freiflaeche.mindestHa"),
    capexProKwp: w("freiflaeche.capexProKwp"),
    kabelProMeter: w("freiflaeche.kabelProMeter"),
    netzanschlussFixProMwp: w("freiflaeche.netzanschlussFixProMwp"),
    entwicklungProKwp: w("freiflaeche.entwicklungProKwp"),
    opexProKwp: w("freiflaeche.opexProKwp"),
    rueckbauProKwp: w("freiflaeche.rueckbauProKwp"),
    degradation: w("freiflaeche.degradation"),
    inflation: w("freiflaeche.inflation"),
    laufzeit: w("freiflaeche.laufzeit"),
    netz: {
      msSystemMw: w("freiflaeche.netz.msSystemMw"),
      zusatzSystemFaktor: w("freiflaeche.netz.zusatzSystemFaktor"),
      uwFeld: w("freiflaeche.netz.uwFeld"),
      einschleifen: w("freiflaeche.netz.einschleifen"),
      hsKabelProKm: w("freiflaeche.netz.hsKabelProKm"),
      kundenUwFix: w("freiflaeche.netz.kundenUwFix"),
      kundenUwProMva: w("freiflaeche.netz.kundenUwProMva"),
      grenzeMsMw: w("freiflaeche.netz.grenzeMsMw"),
      grenzeUwMw: w("freiflaeche.netz.grenzeUwMw"),
      abregelung: w("freiflaeche.netz.abregelung"),
      pruefWochen: w("freiflaeche.netz.pruefWochen"),
    },
  };

  const freiflaeche = zuschlaege(land, "freiflaeche", benutzt);
  const dachTermine = zuschlaege(land, "dach", benutzt);
  const ZUSCHLAEGE = {
    freiflaeche,
    dach: dachTermine,
    quelle: freiflaeche.length || dachTermine.length ? "Bundesnetzagentur, Ergebnisse der Ausschreibungen Solaranlagen (erstes und zweites Segment)" : null,
  };

  const ERLOESE = {
    eegFreiflaecheCt: w("erloese.eegFreiflaecheCt"),
    eegBesondereCt: w("erloese.eegBesondereCt"),
    ppaCt: w("erloese.ppaCt"),
    merchantCt: w("erloese.merchantCt"),
    merchantSteigerung: w("erloese.merchantSteigerung"),
    paragraph51: { anteilNegativ: w("erloese.negativAnteilSolar") },
    zuschlagsHistorie: zuschlaegeJahr(freiflaeche, 2025),
    lcoeIseCt: w("erloese.lcoeIseCt"),
  };

  const PACHT = {
    freiflaecheProHa: w("pacht.freiflaecheProHa"),
    agriProHa: w("pacht.agriProHa"),
    umsatzbeteiligung: w("pacht.umsatzbeteiligung"),
    ackerProHa: w("pacht.ackerProHa"),
    gruenlandProHa: w("pacht.gruenlandProHa"),
    deckungsbeitragAcker: w("pacht.deckungsbeitragAcker"),
    laufzeit: w("pacht.laufzeit"),
    verlaengerung: w("pacht.verlaengerung"),
    indexierung: w("pacht.indexierung"),
    reservierungProHa: w("pacht.reservierungProHa"),
    diskontEigentuemer: w("pacht.diskontEigentuemer"),
    reservierungJahre: w("pacht.reservierungJahre"),
    festlaufzeitMax: w("pacht.festlaufzeitMax"),
    verlaengerungMax: w("pacht.verlaengerungMax"),
    anwaltskosten: w("pacht.anwaltskosten"),
  };

  const laenderGesetz = f("kommune.laenderMitBeteiligungsgesetz");
  const KOMMUNE = {
    beteiligungCt: w("kommune.beteiligungCt"),
    gewerbesteuerStandort: w("kommune.gewerbesteuerStandort"),
    hebesatz: w("kommune.hebesatz"),
    laenderMitBeteiligungsgesetz: w("kommune.laenderMitBeteiligungsgesetz"),
    /** Stand der Länderübersicht = Abrufdatum des Fakts */
    laenderGesetzeStand: laenderGesetz ? datumDe(laenderGesetz.abruf) : null,
    messzahl: w("kommune.messzahl"),
    betrachtungJahre: w("kommune.betrachtungJahre"),
    afaJahre: w("kommune.afaJahre"),
    hinzurechnungZinsen: w("kommune.hinzurechnungZinsen"),
    hinzurechnungFreibetrag: w("kommune.hinzurechnungFreibetrag"),
    hebesatzSpanne: w("kommune.hebesatzSpanne"),
  };

  const DACH = {
    mindestM2: w("dach.mindestM2"),
    dacharten: w("dach.dacharten"),
    ausrichtung: w("dach.ausrichtung"),
    pachtProM2: w("dach.pachtProM2"),
    pachtProKwp: w("dach.pachtProKwp"),
    umsatzbeteiligung: w("dach.umsatzbeteiligung"),
    laufzeit: w("dach.laufzeit"),
    verlaengerung: w("dach.verlaengerung"),
    einmalDiskont: w("dach.einmalDiskont"),
    capexProKwp: w("dach.capexProKwp"),
    opexProKwp: w("dach.opexProKwp"),
    zuschlagsHistorie: zuschlaegeJahr(dachTermine, 2025),
    eegDachCt: w("dach.eegDachCt"),
    ueberschussCt: w("dach.ueberschussCt"),
    ppaVorOrtCt: w("dach.ppaVorOrtCt"),
    ppaPachtAnteil: w("dach.ppaPachtAnteil"),
    eigenverbrauch: w("dach.eigenverbrauch"),
    restnutzungMinJahre: w("dach.restnutzungMinJahre"),
    sanierungProM2: w("dach.sanierungProM2"),
    lcoeIseCt: w("dach.lcoeIseCt"),
    quellen: quellenListe(land, "dach"),
  };

  const REGIONEN = regionenVon(land);
  for (const r of REGIONEN) f(`region.${r.id}.ertrag`);

  const erloesmodell = erloesmodellFuer(land);
  for (const x of erloesmodell.fakten) benutzt.set(`${x.id}|${x.land}`, x);

  const genutzt = [...benutzt.values()];
  const abrufe = genutzt.map((x) => x.abruf).filter(Boolean).sort();
  const offen = genutzt.filter((x) => x.klasse !== "C" && x.status !== "geprueft").map((x) => x.id);
  const abgelaufenA = genutzt.filter((x) => x.klasse === "A" && anzeigeStatus(x) === "abgelaufen").map((x) => x.id);

  return {
    land,
    waehrung: waehrungFuer(land),
    waehrungInfo: waehrungInfo(land),
    /** Länder-Sperre (sperre.js) – null = es darf in Landeswährung gerechnet und gezeigt werden */
    sperre: laenderSperre(land),
    erloesmodell,
    FREIFLAECHE,
    ZUSCHLAEGE,
    ERLOESE,
    PACHT,
    KOMMUNE,
    DACH,
    QUELLEN: quellenListe(land, "allgemein"),
    REGIONEN,
    /** jüngstes Abrufdatum der genutzten Fakten (ISO) */
    stand: abrufe.length ? abrufe[abrufe.length - 1] : null,
    /** Fakt-IDs, die für dieses Land fehlen (Wert null) – nichts wird aus einem anderen Land übernommen */
    luecken: [...new Set([...luecken, ...erloesmodell.luecken])],
    /** Annahmenbuch: alle genutzten Fakten (eingefroren) */
    fakten: genutzt,
    /** Freigabe-Bewertung: bereit, wenn keine Lücken, keine ungeprüften A/B-Werte, kein abgelaufener A-Wert */
    freigabe: {
      bereit: luecken.length === 0 && offen.length === 0 && abgelaufenA.length === 0 && erloesmodell.freigabeBereit,
      ungeprueftAB: offen,
      abgelaufenA,
    },
  };
}

const CACHE = new Map();

/**
 * Marktannahmen eines Landes (gecacht; Objekte nicht verändern).
 * @param {"DE"|"AT"|"CH"} [land="DE"] auch klein geschrieben; Unbekanntes → "DE"
 */
export function marktFuer(land = "DE") {
  const l = normLand(land);
  if (!CACHE.has(l)) CACHE.set(l, baue(l));
  return CACHE.get(l);
}

/**
 * Rechenbasis für einen Rechner: Land aus Eingabe (land, sonst Regions-ID, sonst "DE").
 * Gesperrte Länder rechnen – wie vor B1 – mit der deutschen Basis; `sperre` ist dann gesetzt
 * und die Oberfläche blendet Geldwerte aus. So bleibt das Verhalten unverändert, bis die
 * Sperre bewusst aufgehoben wird; danach rechnet der Rechner mit marktFuer(land).
 */
export function rechenbasisFuer({ land, regionId } = {}) {
  const l = land ? landAus(land) : regionId ? landAus(regionId) : "DE";
  const sperre = laenderSperre(l);
  const basis = sperre ? "DE" : l;
  return { land: l, rechenbasis: basis, sperre, markt: marktFuer(basis), landMarkt: marktFuer(l) };
}

/**
 * Annahmenbuch für Berichte (B4): Fakten zu einer Liste von IDs im Land der Rechenbasis,
 * je Eintrag mit Wert, Einheit, Quelle, Stand und Anzeige-Status (abgelaufen nie als aktuell).
 */
export function annahmenbuch(ids, landOderEingabe = "DE", { heute = new Date() } = {}) {
  const { rechenbasis, land, sperre } = typeof landOderEingabe === "object" ? rechenbasisFuer(landOderEingabe) : rechenbasisFuer({ land: landOderEingabe });
  const eintraege = ids.map((id) => {
    const x = fakt(id, rechenbasis);
    if (!x) return { id, land: rechenbasis, fehlt: true };
    return {
      id: x.id,
      land: x.land,
      wert: kopie(x.wert),
      einheit: x.einheit,
      quelle: { ...x.quelle },
      abruf: x.abruf,
      gueltigBis: x.gueltigBis ?? null,
      status: anzeigeStatus(x, heute),
      klasse: x.klasse,
      pruefer: x.pruefer,
    };
  });
  return { land, rechenbasis, sperre, waehrung: waehrungFuer(rechenbasis), eintraege };
}

/** Alle Regionen aller Länder (für die Fassade markt.js REGIONEN) – neue Objekte */
export const regionenAlle = () => alleRegionen();
