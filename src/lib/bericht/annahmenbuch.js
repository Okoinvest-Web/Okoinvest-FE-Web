// src/lib/bericht/annahmenbuch.js
//
// Bericht-Baustein (Welle 2, Paket B4): Annahmenbuch – zu jeder Annahme, die der Rechner nutzt,
// Wert, Einheit, Quelle, Stand und Status.
//
//  - Grundlage ist das B1-Faktenregister: annahmenPacht / annahmenPachtangebot / annahmenFlaechencheck /
//    annahmenKommune (src/lib/rechner/*, über src/lib/invest/laender/marktFuer.js annahmenbuch()).
//  - Werte, die noch nicht im Register stehen (Konstanten, die vorerst in src/lib/invest/markt.js bleiben, z. B.
//    BAUART, AGRI, Kosten und Finanzierung der Solarpark-Rechenlogik), erscheinen als eigene Zeile mit
//    Quelle „Rechenlogik ÖkoInvest“, Status „zu prüfen“ und dem Hinweis „Stand laut Rechenlogik“ (Fallback,
//    bis B1 sie überführt). Fehlt ein Register-Eintrag (fehlt: true), gilt derselbe Fallback.
//  - Status „zu_pruefen“, „entwurf“ und „abgelaufen“ werden sichtbar markiert (zuPruefen: true).

import { annahmenPacht } from "@/lib/rechner/pacht";
import { annahmenPachtangebot } from "@/lib/rechner/pachtangebot";
import { annahmenFlaechencheck } from "@/lib/rechner/flaechencheck";
import { annahmenKommune } from "@/lib/rechner/kommune";
import { annahmenGewerbestrom } from "@/lib/rechner/gewerbestrom";
import { annahmenFlaechenpass } from "./flaechenpass";
import { annahmenRatsvorlage } from "./ratsvorlage";
import { QUELLEN, STAND, STAND_RECHENLOGIK, AGRI, BAUART } from "@/lib/invest/markt";
import { fmtFaktWert, STATUS_TEXT } from "@/lib/fakten";
import { fmt } from "@/lib/rechner/annahmen";

export const HINWEIS_RECHENLOGIK = "Stand laut Rechenlogik";

/** Lesbare Bezeichnungen der Fakt-IDs (Fallback: die ID selbst) */
export const BEZEICHNUNG = Object.freeze({
  "pacht.freiflaecheProHa": "Pacht Freiflächen-PV (Spanne)",
  "pacht.agriProHa": "Pacht Agri-PV (Spanne)",
  "pacht.ackerProHa": "Durchschnittliche Ackerpacht",
  "pacht.deckungsbeitragAcker": "Deckungsbeitrag Ackerbau (Spanne)",
  "pacht.laufzeit": "Übliche Pachtlaufzeit",
  "pacht.indexierung": "Indexierung (Wertsicherung) pro Jahr",
  "pacht.reservierungProHa": "Reservierungsprämie bis Baubeginn",
  "pacht.umsatzbeteiligung": "Übliche Umsatzbeteiligung",
  "pacht.diskontEigentuemer": "Kalkulationszins Eigentümer",
  "freiflaeche.haProMwp": "Flächenbedarf je MWp",
  "freiflaeche.degradation": "Leistungsverlust der Module pro Jahr",
  "freiflaeche.mindestHa": "Mindestgröße für einen eigenen Park",
  "freiflaeche.kabelProMeter": "Kabeltrasse je Meter",
  "freiflaeche.netzanschlussFixProMwp": "Netzanschluss fix je MWp",
  "freiflaeche.rueckbauProKwp": "Rückbaukosten je kWp",
  "freiflaeche.laufzeit": "Betriebsdauer des Parks",
  "erloese.eegFreiflaecheCt": "EEG-Zuschlagswert Freifläche",
  "erloese.merchantCt": "Marktwert Solarstrom nach der Förderung",
  "erloese.merchantSteigerung": "Steigerung des Marktwerts pro Jahr",
  "erloese.negativAnteilSolar": "Anteil Erzeugung in Zeiten negativer Preise",
  "recht.eeg.foerderdauerJahre": "EEG-Förderdauer",
  "kommune.beteiligungCt": "§ 6 EEG-Beteiligung je kWh",
  "kommune.gewerbesteuerStandort": "Gewerbesteuer-Anteil der Standortgemeinde",
  "kommune.hebesatz": "Durchschnittlicher Hebesatz",
  "kommune.messzahl": "Steuermesszahl Gewerbesteuer",
  "kommune.betrachtungJahre": "Betrachtungszeitraum",
  "kommune.afaJahre": "Abschreibungsdauer",
  "kommune.hinzurechnungZinsen": "Hinzurechnung der Zinsen",
  "kommune.hinzurechnungFreibetrag": "Freibetrag der Hinzurechnung",
  "kommune.laenderMitBeteiligungsgesetz": "Länder mit eigenem Beteiligungsgesetz",
  // Paket B5 – Rechnungs-Check Gewerbestrom
  "umlage.kwkg": "KWKG-Umlage",
  "umlage.offshoreNetz": "Offshore-Netzumlage",
  "umlage.besondereNetznutzung": "Aufschlag für besondere Netznutzung (erste 1.000.000 kWh)",
  "umlage.besondereNetznutzung.ueber1Gwh": "Aufschlag für besondere Netznutzung über 1.000.000 kWh",
  "umlage.besondereNetznutzung.ueber1GwhProduzierend": "Aufschlag über 1.000.000 kWh, produzierendes Gewerbe (Stromkosten > 4 % des Umsatzes)",
  "steuer.strom.regelsatz": "Stromsteuer Regelsatz",
  "steuer.strom.entlastung9b": "Stromsteuer-Entlastung § 9b StromStG",
  "steuer.strom.entlastung9bSockel": "Sockelbetrag der Entlastung pro Jahr",
  "kav.sondervertrag": "Konzessionsabgabe Sondervertragskunden (Höchstbetrag)",
  "kav.tarif": "Konzessionsabgabe Tarifkunden nach Gemeindegröße (Höchstbeträge)",
  "kav.tarifGrenze": "Grenze Tarif-/Sondervertragskunde in Niederspannung",
  "boerse.dayAhead.monate": "Börsenpreis Day-Ahead DE/LU, Monatsmittel (SMARD)",
  "boerse.dayAhead.profil": "Börsenpreis-Profil je Monat, Tagtyp und Stunde (SMARD)",
  "gewerbestrom.lieferantenaufschlag": "Üblicher Lieferantenaufschlag über dem Börsenwert",
  "gewerbestrom.toleranzUeberMarkt": "Abstand für „etwas über Markt“",
  // Paket B8 – Kommunal 2.0 / Ratsvorlage
  "kommune.landesregel.bayern.ctKwh": "Bayern (BayWiVG): Mindestbeteiligung je kWh",
  "kommune.landesregel.bayern.ausgleichCtKwh": "Bayern (BayWiVG): Ausgleichsabgabe je kWh",
  "kommune.landesregel.bayern.abMw": "Bayern (BayWiVG): Pflicht ab Leistung über",
  "kommune.landesregel.brandenburg.eurMw": "Brandenburg (BbgEESG): Sonderabgabe je MW und Jahr",
  "kommune.landesregel.brandenburg.abMw": "Brandenburg (BbgEESG): Pflicht ab Leistung über",
  "kommune.landesregel.mecklenburg-vorpommern.eurMwGemeinde": "Mecklenburg-Vorpommern (BüGembeteilG): Angebot an die Gemeinde je MW",
  "kommune.landesregel.mecklenburg-vorpommern.eurMwEinwohner": "Mecklenburg-Vorpommern (BüGembeteilG): Angebot an die Einwohner je MW",
  "kommune.landesregel.mecklenburg-vorpommern.ersatzEurMw": "Mecklenburg-Vorpommern (BüGembeteilG): Ersatzzahlung je MW",
  "kommune.landesregel.mecklenburg-vorpommern.abMw": "Mecklenburg-Vorpommern (BüGembeteilG): Pflicht ab Leistung",
  "kommune.landesregel.niedersachsen.ctKwh": "Niedersachsen (NWindPVBetG): Akzeptanzabgabe je kWh",
  "kommune.landesregel.niedersachsen.abMw": "Niedersachsen (NWindPVBetG): Pflicht ab Leistung",
  "kommune.landesregel.saarland.ersatzCtKwh": "Saarland (SGBG): Ersatzzahlung je kWh ohne Vereinbarung",
  "kommune.landesregel.sachsen.ctKwh": "Sachsen (EEErtrBetG): Betrag je kWh (geltende Fassung)",
  "kommune.landesregel.sachsen.abMw": "Sachsen (EEErtrBetG): Pflicht ab Leistung",
  "kommune.landesregel.sachsen-anhalt.ctKwh": "Sachsen-Anhalt (AuBG): Zahlung je kWh",
  "kommune.landesregel.sachsen-anhalt.mindestEurKwp": "Sachsen-Anhalt (AuBG): Mindestbetrag je kWp",
  "recht.elwg.gemeinschaftenAb": "ElWG: gemeinsame Energienutzung (Österreich)",
  "recht.eag.abschlagLandwirtschaft": "EAG: Abschlag auf landwirtschaftlichen Flächen (Österreich)",
});

const FUNKTION = { pacht: annahmenPacht, pachtangebot: annahmenPachtangebot, flaechencheck: annahmenFlaechencheck, kommune: annahmenKommune, gewerbestrom: annahmenGewerbestrom, flaechenpass: annahmenFlaechenpass, ratsvorlage: annahmenRatsvorlage };

/** Konstanten, die (noch) nicht im Register stehen – je Rechner, mit Wert aus markt.js */
function rechenlogikZeilen(rechner, eingaben = {}) {
  const z = (id, label, wert, einheit = "") => ({ id, label, wert, einheit });
  if (rechner === "flaechencheck") {
    return [
      z("bauart.agriVertikal.haProMwp", "Flächenbedarf Agri-PV vertikal je MWp", `${fmt(BAUART.agriVertikal.haProMwp, 1)} ha/MWp`),
      z("agri.gapFoerderfaehig", "Anteil Agri-PV-Fläche, der GAP-förderfähig bleibt", `${fmt(AGRI.gapFoerderfaehig * 100)} %`),
      z("flaechencheck.punkte", "Punktwerte der Heuristik (Größe, Nutzung, Besonderheiten, Netz, Eigentum)", "siehe Rechenweg"),
    ];
  }
  if (rechner === "flaechenpass") {
    return [
      z("flaechenpass.bewertung", "Bewertungslogik der Eignung (Punkte je Kriterium, Ausschlussgründe, Ampel)", "siehe Rechenweg"),
      z("flaechenpass.ertrag", "Spezifischer Ertrag je Region (PVGIS, Regionsdaten)", "siehe Rechenweg"),
    ];
  }
  if (rechner === "kommune") {
    return [z("solarpark.rechenlogik", "Investition, Betriebskosten und Finanzierung des Parks (Solarpark-Rechenlogik)", "siehe Rechenweg")];
  }
  // Paket B8: Ratsvorlage – DE wie der Kommunal-Rechner; AT ohne Rechnung (Prüfpunkte mit Quelle im Dokument)
  if (rechner === "ratsvorlage") {
    return annahmenRatsvorlage(eingaben).land === "DE"
      ? [z("solarpark.rechenlogik", "Investition, Betriebskosten und Finanzierung des Parks (Solarpark-Rechenlogik)", "siehe Rechenweg")]
      : [z("widmung.regionsdaten", "Widmungsschritte und Prüfpunkte des Bundeslands (Regionsdaten mit Quelle je Punkt)", "siehe Prüfpunkte")];
  }
  if (rechner === "pachtangebot") {
    return [z("pachtangebot.regeln", "Bewertungsregeln der Klauseln (marktüblich / prüfen / kritisch)", "siehe Klauseln")];
  }
  return [];
}

const ZU_PRUEFEN = new Set(["zu_pruefen", "entwurf", "abgelaufen"]);

function rechenlogikEintrag({ id, label, wert, einheit }) {
  return {
    id,
    label,
    wert,
    einheit,
    quelle: { titel: `Rechenlogik ÖkoInvest (Annahmen der Rechner), Stand ${STAND}`, url: null, art: "eigen" },
    stand: STAND_RECHENLOGIK,
    status: "zu_pruefen",
    statusText: `${STATUS_TEXT.zu_pruefen} · ${HINWEIS_RECHENLOGIK}`,
    zuPruefen: true,
    herkunft: "rechenlogik",
    klasse: "C",
  };
}

/**
 * Annahmenbuch eines Berichts.
 * @param {string} rechner  pacht | pachtangebot | flaechencheck | kommune
 * @param {object} eingaben normalisierte Eingaben (aus neuRechnen)
 * @returns {{ land, rechenbasis, waehrung, eintraege: Array, quellenRechenlogik: Array, hinweis: string }}
 */
export function annahmenbuchFuer(rechner, eingaben = {}) {
  const fn = FUNKTION[rechner];
  let buch = null;
  try {
    buch = fn ? fn(eingaben) : null;
  } catch {
    buch = null; // Fallback unten
  }
  const register = (buch?.eintraege || []).map((x) => {
    if (x.fehlt) {
      return rechenlogikEintrag({ id: x.id, label: BEZEICHNUNG[x.id] || x.id, wert: "–", einheit: "" });
    }
    const status = x.status || "zu_pruefen";
    return {
      id: x.id,
      label: BEZEICHNUNG[x.id] || x.id,
      wert: fmtFaktWert({ wert: x.wert, einheit: x.einheit }, x.land === "DACH" ? "DE" : x.land),
      einheit: x.einheit || "",
      quelle: { titel: x.quelle?.titel || "ohne Angabe", url: x.quelle?.url || null, art: x.quelle?.art || "primaer" },
      stand: x.abruf || null,
      gueltigBis: x.gueltigBis || null,
      status,
      statusText: STATUS_TEXT[status] || status,
      zuPruefen: ZU_PRUEFEN.has(status),
      herkunft: "register",
      klasse: x.klasse || "",
    };
  });
  const eintraege = [...register, ...rechenlogikZeilen(rechner, eingaben).map(rechenlogikEintrag)];
  return {
    land: buch?.land || eingaben.land || "DE",
    rechenbasis: buch?.rechenbasis || "DE",
    waehrung: buch?.waehrung || "EUR",
    eintraege,
    /** Allgemeine Quellen der Rechenlogik (markt.js QUELLEN) – für Zeilen mit „Stand laut Rechenlogik“ */
    // Paket B8: Ratsvorlage Österreich rechnet nicht – keine (deutschen) Quellen der Rechenlogik im Dokument
    quellenRechenlogik: rechner === "ratsvorlage" && buch?.land === "AT" ? [] : (QUELLEN || []).slice(0, 12).map((q) => ({ titel: q.titel || q.label || "", url: q.url || null })).filter((q) => q.titel),
    hinweis: buch ? "" : `${HINWEIS_RECHENLOGIK} (${STAND}) – das Faktenregister lieferte für diesen Rechner keine Einträge.`,
  };
}
