// src/lib/rechner/kommunePflichten.js – Kommunal-Rechner 2.0 (Welle 3, Paket B8)
//
// Landespflichten zur finanziellen Beteiligung der Gemeinde (Deutschland) – reine Logik, ohne Server-Funktionen
// (läuft im Browser, im Bericht-Baustein und in node:test).
//
//  - Welche Länder ein Beteiligungsgesetz haben: Faktenregister kommune.laenderMitBeteiligungsgesetz (de.js).
//  - Was das Gesetz verlangt: Fakten kommune.landesregel.<bundesland>.* (src/lib/fakten/daten/kommune-laender.js),
//    Wortlaut aus den Regionsdateien mit Quelle. Alle Werte „Prüfung ausstehend“.
//  - Orientierungsbetrag im ersten Betriebsjahr aus Leistung (MWp) und Einspeisung (kWh) des Kommunal-Rechners.
//    Er wird NICHT zur Summe des Kommunal-Rechners addiert: Ob und wie die Landeszahlung mit der Zahlung nach
//    § 6 EEG verrechnet wird, regelt das jeweilige Landesgesetz.
//  - Sachsen: Wert nach der Novelle 09/2025 nicht belegt → kein Betrag (null), nur der Hinweis.
//
// Die bestehende Rechenlogik (rechneKommune, src/lib/rechner/kommune.js) bleibt unverändert; dieses Modul ruft sie
// nur auf. Österreich und Schweiz: keine Geldwerte (Widmungsschritte: src/lib/kommune/widmung.js).

import { fakt, faktWert } from "../fakten/index.js";
import { META } from "../../data/regionen/meta.js";
import { rechneKommune } from "./kommune.js";

export const B8_VERSION = "2026-10-09";

/** Bundesländer je Land aus den Stammdaten der Regionen: { slug, name, kurz, markt } */
export const BUNDESLAENDER = Object.freeze({
  DE: Object.freeze(META.filter((m) => m.land === "DE").map(({ slug, name, kurz, markt }) => Object.freeze({ slug, name, kurz, markt }))),
  AT: Object.freeze(META.filter((m) => m.land === "AT").map(({ slug, name, kurz, markt }) => Object.freeze({ slug, name, kurz, markt }))),
});

/** Standard-Bundesland je Land (für die Vorbelegung) */
export const STANDARD_BUNDESLAND = Object.freeze({ DE: "bayern", AT: "oberoesterreich" });

export const bundeslandFuer = (land, slug) => (BUNDESLAENDER[land] || []).find((b) => b.slug === slug) || null;

const w = (id) => faktWert(`kommune.landesregel.${id}`, "DE");
const ct = (kwh, satz) => (kwh * satz) / 100;

/**
 * Landesregeln. Je Bundesland: Gesetz, Fakten-IDs, Schwelle, Berechnung und Texte (de/en).
 * Texte nur mit Aussagen aus den Regionsdateien (Quelle in den Fakten).
 */
export const LANDESREGELN = Object.freeze({
  bayern: {
    gesetz: "BayWiVG",
    fakten: ["kommune.landesregel.bayern.ctKwh", "kommune.landesregel.bayern.ausgleichCtKwh", "kommune.landesregel.bayern.abMw"],
    gilt: ({ mwp }) => mwp > w("bayern.abMw"),
    betrag: ({ erzeugungKwh }) => ({ wert: ct(erzeugungKwh, w("bayern.ctKwh")), art: "mindestens" }),
    texte: {
      de: {
        kern: "Pflicht zur Beteiligung der Gemeinden bei neuen PV-Freiflächenanlagen mit mehr als 5 MW: mindestens 0,2 bis etwa 0,3 ct je Kilowattstunde. Die 0,2 ct können über eine Vereinbarung nach § 6 EEG erbracht werden. Wer die Pflicht verletzt, kann per Bescheid zu einer Ausgleichsabgabe von insgesamt 0,3 ct/kWh verpflichtet werden.",
        gilt: "seit 1. Januar 2026, Anlagen mit mehr als 5 MW",
        ausnahmen: "nach Angaben des Wirtschaftsministeriums u. a. Anlagen ohne EEG-Förderung, Agri-PV und Bürgerenergiegesellschaften",
        formel: "mindestens 0,2 ct je eingespeister kWh",
      },
      en: {
        kern: "Mandatory municipal participation for new ground-mounted PV plants above 5 MW: at least 0.2 to around 0.3 ct per kilowatt hour. The 0.2 ct can be provided through an agreement under § 6 EEG. Anyone breaching the obligation can be ordered to pay a compensation levy totalling 0.3 ct/kWh.",
        gilt: "since 1 January 2026, plants above 5 MW",
        ausnahmen: "according to the Bavarian Ministry of Economic Affairs, among others plants without EEG support, agrivoltaics and community energy companies",
        formel: "at least 0.2 ct per kWh fed in",
      },
    },
  },
  brandenburg: {
    gesetz: "BbgEESG",
    fakten: ["kommune.landesregel.brandenburg.eurMw", "kommune.landesregel.brandenburg.abMw"],
    gilt: ({ mwp }) => mwp > w("brandenburg.abMw"),
    betrag: ({ mwp }) => ({ wert: mwp * w("brandenburg.eurMw"), art: "pflicht" }),
    texte: {
      de: {
        kern: "Sonderabgabe an die Standortgemeinde: 2.000 € je Megawatt installierter Leistung und Jahr, fällig jeweils bis 30. April des Folgejahres.",
        gilt: "Freiflächenanlagen über 1 MW mit Inbetriebnahme nach dem 31.12.2024 (BbgEESG seit 28.11.2025)",
        ausnahmen: null,
        formel: "2.000 € je MW und Jahr",
      },
      en: {
        kern: "Special levy paid to the host municipality: €2,000 per megawatt of installed capacity per year, due by 30 April of the following year.",
        gilt: "ground-mounted plants above 1 MW commissioned after 31 Dec 2024 (BbgEESG since 28 Nov 2025)",
        ausnahmen: null,
        formel: "€2,000 per MW per year",
      },
    },
  },
  "mecklenburg-vorpommern": {
    gesetz: "BüGembeteilG M-V",
    fakten: [
      "kommune.landesregel.mecklenburg-vorpommern.eurMwGemeinde",
      "kommune.landesregel.mecklenburg-vorpommern.eurMwEinwohner",
      "kommune.landesregel.mecklenburg-vorpommern.ersatzEurMw",
      "kommune.landesregel.mecklenburg-vorpommern.abMw",
    ],
    gilt: ({ mwp }) => mwp >= w("mecklenburg-vorpommern.abMw"),
    betrag: ({ mwp }) => ({
      wert: Math.floor(mwp) * w("mecklenburg-vorpommern.eurMwGemeinde"),
      art: "angebot",
      einwohner: Math.floor(mwp) * w("mecklenburg-vorpommern.eurMwEinwohner"),
    }),
    texte: {
      de: {
        kern: "Der Vorhabenträger muss der Standortgemeinde jährlich 1.000 € je volles Megawatt anbieten und den Einwohnerinnen und Einwohnern ebenfalls 1.000 € je Megawatt, als Gutschrift auf der Stromrechnung oder als Direktzahlung. Kommt keine Vereinbarung zustande, wird eine Ersatzzahlung von 2.000 € je Megawatt fällig.",
        gilt: "Freiflächenanlagen ab 1.000 kW, Aufstellungsbeschluss für den Bebauungsplan nach Inkrafttreten (BüGembeteilG M-V vom 23.04.2026)",
        ausnahmen: "u. a. Bürgerenergiegesellschaften und besondere Solaranlagen nach § 37 Abs. 1 Nr. 3 EEG, etwa Agri- und Moor-PV",
        formel: "Angebot 1.000 € je volles MW und Jahr an die Gemeinde",
      },
      en: {
        kern: "The project developer must offer the host municipality €1,000 per full megawatt each year, and the residents a further €1,000 per megawatt, as a credit on the electricity bill or as a direct payment. If no agreement is reached, a substitute payment of €2,000 per megawatt becomes due.",
        gilt: "ground-mounted plants from 1,000 kW whose development plan was resolved after entry into force (BüGembeteilG M-V of 23 April 2026)",
        ausnahmen: "among others community energy companies and special solar plants under § 37(1) no. 3 EEG, such as agrivoltaics and peatland PV",
        formel: "offer of €1,000 per full MW per year to the municipality",
      },
    },
  },
  niedersachsen: {
    gesetz: "NWindPVBetG",
    fakten: ["kommune.landesregel.niedersachsen.ctKwh", "kommune.landesregel.niedersachsen.abMw"],
    gilt: ({ mwp }) => mwp >= w("niedersachsen.abMw"),
    betrag: ({ erzeugungKwh }) => ({ wert: ct(erzeugungKwh, w("niedersachsen.ctKwh")), art: "pflicht" }),
    texte: {
      de: {
        kern: "Akzeptanzabgabe von 0,2 ct/kWh an die Standortgemeinde. Dazu ein weiteres Beteiligungsangebot an Anwohner und Kommunen im Umkreis von 2.500 Metern, etwa mindestens 0,1 ct/kWh Überschussbeteiligung oder 20 Prozent an der Projektgesellschaft.",
        gilt: "neue Freiflächenanlagen ab 1 MW (NWindPVBetG, seit April 2024)",
        ausnahmen: "Agri-PV und Moor-PV sowie Vorhaben, die vor dem 19. April 2024 genehmigt wurden",
        formel: "0,2 ct je eingespeister kWh",
      },
      en: {
        kern: "Acceptance levy of 0.2 ct/kWh paid to the host municipality. In addition, a further participation offer to residents and municipalities within 2,500 metres, for example at least 0.1 ct/kWh profit participation or 20 per cent of the project company.",
        gilt: "new ground-mounted plants from 1 MW (NWindPVBetG, since April 2024)",
        ausnahmen: "agrivoltaics and peatland PV, as well as projects approved before 19 April 2024",
        formel: "0.2 ct per kWh fed in",
      },
    },
  },
  saarland: {
    gesetz: "SGBG",
    fakten: ["kommune.landesregel.saarland.ersatzCtKwh"],
    gilt: () => true,
    betrag: ({ erzeugungKwh }) => ({ wert: ct(erzeugungKwh, w("saarland.ersatzCtKwh")), art: "ersatz" }),
    texte: {
      de: {
        kern: "Vorhabenträger neuer PV-Freiflächenanlagen müssen die Standortgemeinde an den Erlösen beteiligen; Ziel ist eine Beteiligungsvereinbarung. Kommt keine zustande, ist nach der Übersicht der Fachagentur Wind und Solar eine Ersatzzahlung von 0,2 ct je eingespeister kWh fällig. Die Gemeinden setzen die Einnahmen für Maßnahmen zur Steigerung der Akzeptanz ein.",
        gilt: "neue PV-Freiflächenanlagen (Saarländisches Gemeindebeteiligungsgesetz, seit Juli 2024)",
        ausnahmen: null,
        formel: "Ersatzzahlung 0,2 ct je eingespeister kWh, falls keine Vereinbarung",
      },
      en: {
        kern: "Developers of new ground-mounted PV plants must let the host municipality share in the revenue; the aim is a participation agreement. If none is reached, a substitute payment of 0.2 ct per kWh fed in is due according to the overview of the Fachagentur Wind und Solar. Municipalities use the income for measures that increase acceptance.",
        gilt: "new ground-mounted PV plants (Saarland municipal participation act SGBG, since July 2024)",
        ausnahmen: null,
        formel: "substitute payment of 0.2 ct per kWh fed in if there is no agreement",
      },
    },
  },
  sachsen: {
    gesetz: "EEErtrBetG",
    fakten: ["kommune.landesregel.sachsen.ctKwh", "kommune.landesregel.sachsen.abMw"],
    gilt: ({ mwp }) => mwp >= w("sachsen.abMw"),
    // Wert der geltenden Fassung nicht belegt (Novelle 09/2025) → kein Betrag
    betrag: () => ({ wert: null, art: "offen" }),
    texte: {
      de: {
        kern: "Ertragsbeteiligung der Standortgemeinde je eingespeister Kilowattstunde; individuelle Vereinbarungen, etwa nach § 6 EEG, sind möglich. In der ursprünglichen Fassung waren es 0,1 ct/kWh. Das Gesetz wurde im September 2025 novelliert – den geltenden Wert prüfen wir noch und nennen deshalb keinen Betrag.",
        gilt: "Freiflächenanlagen ab 1 MW, genehmigt ab 1. Januar 2025 (EEErtrBetG, in Kraft seit 29.06.2024)",
        ausnahmen: null,
        formel: "Betrag je eingespeister kWh – Wert der geltenden Fassung wird geprüft",
      },
      en: {
        kern: "Revenue participation of the host municipality per kilowatt hour fed in; individual agreements, for example under § 6 EEG, are possible. The original version set 0.1 ct/kWh. The act was amended in September 2025 – we are still checking the current rate and therefore do not state an amount.",
        gilt: "ground-mounted plants from 1 MW approved from 1 January 2025 (EEErtrBetG, in force since 29 June 2024)",
        ausnahmen: null,
        formel: "amount per kWh fed in – current rate under review",
      },
    },
  },
  "sachsen-anhalt": {
    gesetz: "AuBG",
    fakten: ["kommune.landesregel.sachsen-anhalt.ctKwh", "kommune.landesregel.sachsen-anhalt.mindestEurKwp"],
    gilt: () => true,
    betrag: ({ mwp, erzeugungKwh }) => ({ wert: Math.max(ct(erzeugungKwh, w("sachsen-anhalt.ctKwh")), mwp * 1000 * w("sachsen-anhalt.mindestEurKwp")), art: "pflicht" }),
    texte: {
      de: {
        kern: "Betreiber zahlen der Gemeinde, auf deren Gebiet die Anlage steht, 0,3 ct je eingespeister Kilowattstunde, mindestens aber 2,50 € je Kilowatt-Peak – es gilt der höhere Betrag. Individuelle Vereinbarungen zwischen Gemeinde und Betreiber sind möglich.",
        gilt: "Freiflächenanlagen mit Inbetriebnahme ab 1. Oktober 2025 (AuBG)",
        ausnahmen: null,
        formel: "0,3 ct je eingespeister kWh, mindestens 2,50 € je kWp",
      },
      en: {
        kern: "Operators pay the municipality in whose area the plant stands 0.3 ct per kilowatt hour fed in, but at least €2.50 per kilowatt peak – whichever is higher. Individual agreements between municipality and operator are possible.",
        gilt: "ground-mounted plants commissioned from 1 October 2025 (AuBG)",
        ausnahmen: null,
        formel: "0.3 ct per kWh fed in, at least €2.50 per kWp",
      },
    },
  },
});

/** Text für Länder ohne eigenes Gesetz (Übersicht im Register, Stand siehe Fakt) */
export const OHNE_GESETZ = Object.freeze({
  de: (stand) => `Für Solarparks führt die Länderübersicht der Fachagentur Wind und Solar (Stand ${stand}) hier kein Landesgesetz zur Beteiligung der Gemeinde. Es gilt die freiwillige Zahlung nach § 6 EEG.`,
  en: (stand) => `For solar parks, the overview of the Fachagentur Wind und Solar (as of ${stand}) lists no state law on municipal participation here. The voluntary payment under § 6 EEG applies.`,
});

const datumDe = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : String(iso || ""));

/** Fakten-IDs, auf denen die Landesregel eines Bundeslands beruht (Annahmenbuch) */
export const landesregelFakten = (slug) => ["kommune.laenderMitBeteiligungsgesetz", ...(LANDESREGELN[slug]?.fakten || [])];

/**
 * Landesregel eines deutschen Bundeslands für einen Park.
 * @param {string} slug Bundesland (META.slug, Land DE)
 * @param {{ mwp: number, erzeugungKwh: number }} park
 * @returns {{ slug, name, kurz, gesetz: string|null, hatGesetz: boolean, gilt: boolean|null, betrag: number|null,
 *   art: string|null, einwohner?: number, fakten: string[], status: string, stand: string, quelle: object|null }}
 */
export function landesregelFuer(slug, { mwp = 0, erzeugungKwh = 0 } = {}) {
  const bl = bundeslandFuer("DE", slug);
  if (!bl) return null;
  const liste = faktWert("kommune.laenderMitBeteiligungsgesetz", "DE") || [];
  const listeFakt = fakt("kommune.laenderMitBeteiligungsgesetz", "DE");
  const regel = LANDESREGELN[slug];
  const hatGesetz = !!regel && liste.includes(bl.kurz);
  if (!hatGesetz) {
    return { slug, name: bl.name, kurz: bl.kurz, gesetz: null, hatGesetz: false, gilt: null, betrag: null, art: null, fakten: ["kommune.laenderMitBeteiligungsgesetz"], status: listeFakt?.status || "zu_pruefen", stand: datumDe(listeFakt?.abruf), quelle: listeFakt?.quelle || null };
  }
  const gilt = regel.gilt({ mwp, erzeugungKwh });
  const b = gilt ? regel.betrag({ mwp, erzeugungKwh }) : { wert: 0, art: "unter_schwelle" };
  const haupt = fakt(regel.fakten[0], "DE");
  return {
    slug,
    name: bl.name,
    kurz: bl.kurz,
    gesetz: regel.gesetz,
    hatGesetz: true,
    gilt,
    betrag: Number.isFinite(b.wert) ? b.wert : null,
    art: b.art,
    ...(Number.isFinite(b.einwohner) ? { einwohner: b.einwohner } : {}),
    fakten: landesregelFakten(slug),
    status: haupt?.status || "zu_pruefen",
    stand: datumDe(haupt?.abruf),
    quelle: haupt?.quelle || null,
  };
}

/** Texte einer Landesregel in der Sprache ("de" | "en"); ohne Gesetz der Standardtext */
export function landesregelTexte(slug, sprache = "de") {
  const s = sprache === "en" ? "en" : "de";
  const regel = LANDESREGELN[slug];
  const r = landesregelFuer(slug, {});
  if (!r) return null;
  if (!r.hatGesetz || !regel) {
    const listeFakt = fakt("kommune.laenderMitBeteiligungsgesetz", "DE");
    return { kern: OHNE_GESETZ[s](datumDe(listeFakt?.abruf)), gilt: null, ausnahmen: null, formel: null };
  }
  return regel.texte[s];
}

/**
 * Kommunal-Rechner 2.0 für Deutschland: Rechnung wie /rechner/kommune (unverändert) plus Landesregel.
 * @param {object} eingabe  Eingaben von rechneKommune plus bundesland (Slug); regionId folgt aus dem Bundesland
 */
export function rechneKommunal2(eingabe = {}) {
  const bl = bundeslandFuer("DE", eingabe.bundesland) || bundeslandFuer("DE", STANDARD_BUNDESLAND.DE);
  const { bundesland: _b, ...rest } = eingabe;
  const r = rechneKommune({ ...rest, land: "DE", regionId: bl.markt });
  const erzeugungKwh = r.jahre[0]?.erzeugung || 0;
  const landesregel = landesregelFuer(bl.slug, { mwp: r.eingabe.mwp, erzeugungKwh });
  return { bundesland: bl, kommune: r, landesregel, erzeugungKwh, p6Jahr1: r.jahre[0]?.p6 || 0 };
}
