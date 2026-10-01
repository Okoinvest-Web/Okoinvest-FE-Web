// src/lib/plattform/eg/anlage.js
//
// Anlagen der Gemeinschaft (Erzeugung, Speicher, Verbrauch – Fachkonzept 3.9) und Schwelle der Lieferantenpflichten nach
// § 69 ElWG (Erzeugungsleistung über 100 kW, Haushalte über 30 kW; Auslegung der Haushaltsgrenze zu bestätigen).
// Reine Funktionen. Python-Spiegel: plattform/eg_stamm_kern.py.

import { auswahl, datum, fehler, text, wahr, zahl } from "../mitglied/basis.js";
import { ANLAGE_ARTEN, ANLAGE_ERZEUGEND, FOERDERUNGEN, LIEFERANTENPFLICHT_KW, MAX_LEISTUNG_JE_ZP_KW, NUTZUNGSMODELLE } from "./modell.js";

export const ANLAGE_STATUS = { geplant: "Geplant", aktiv: "In Betrieb", stillgelegt: "Stillgelegt" };

export function anlageBereinigen(d = {}) {
  const a = {
    bezeichnung: text(d.bezeichnung, 120),
    art: auswahl(d.art, ANLAGE_ARTEN, ""),
    engpassleistungKw: zahl(d.engpassleistungKw, 0, 100000, 2),
    kwp: zahl(d.kwp, 0, 100000, 2),
    ausrichtung: zahl(d.ausrichtung, -180, 180, 0),
    neigung: zahl(d.neigung, 0, 90, 0),
    standort: { lat: zahl(d.standort?.lat, 46, 49.1, 6), lon: zahl(d.standort?.lon, 9.4, 17.2, 6), adresse: text(d.standort?.adresse, 200) },
    eigentuemerMitgliedId: text(d.eigentuemerMitgliedId, 40) || null,
    betreiber: text(d.betreiber, 120),
    betriebsfuehrung: text(d.betriebsfuehrung, 120),
    nutzungsmodell: auswahl(d.nutzungsmodell, NUTZUNGSMODELLE, "ueberschuss"),
    foerderung: auswahl(d.foerderung, FOERDERUNGEN, "keine"),
    inbetriebnahme: datum(d.inbetriebnahme),
    hknRegistriert: wahr(d.hknRegistriert),
    speicherKwh: zahl(d.speicherKwh, 0, 100000, 2),
    speicherLadequelle: text(d.speicherLadequelle, 80),
    iotQuelle: text(d.iotQuelle, 60),
    haushalt: wahr(d.haushalt),
    status: auswahl(d.status, ANLAGE_STATUS, "aktiv"),
  };
  if (!a.bezeichnung) throw fehler("Bitte geben Sie eine Bezeichnung der Anlage an.", "bezeichnung");
  if (!a.art) throw fehler("Bitte wählen Sie die Art der Anlage.", "art");
  if (ANLAGE_ERZEUGEND.includes(a.art) && a.engpassleistungKw === null && a.kwp === null) throw fehler("Bitte Engpassleistung (kW) oder Modulleistung (kWp) angeben.", "engpassleistungKw");
  if (a.art === "speicher" && a.speicherKwh === null) throw fehler("Bitte die Speicherkapazität (kWh) angeben.", "speicherKwh");
  if ((a.engpassleistungKw ?? 0) > MAX_LEISTUNG_JE_ZP_KW) throw fehler("Mehr als 6 MW Erzeugungsleistung je Zählpunkt sind für die gemeinsame Energienutzung nicht zulässig (ElWG § 67).", "engpassleistungKw");
  return a;
}

/** Leistung einer Anlage für die § 69-Schwelle: Engpassleistung, sonst kWp */
export const leistungKw = (a) => Number(a?.engpassleistungKw ?? a?.kwp ?? 0) || 0;

/**
 * Erzeugungsleistung aktiver Erzeugungsanlagen und § 69-Schwelle.
 * Pflicht, wenn Σ > 100 kW oder Σ der Haushalts-Anlagen > 30 kW.
 */
export function erzeugungsleistung(anlagen = []) {
  const aktiv = anlagen.filter((a) => ANLAGE_ERZEUGEND.includes(a.art) && a.status !== "stillgelegt" && a.status !== "geplant");
  const r = (x) => Math.round(x * 100) / 100;
  const gesamtKw = r(aktiv.reduce((s, a) => s + leistungKw(a), 0));
  const haushaltKw = r(aktiv.filter((a) => a.haushalt).reduce((s, a) => s + leistungKw(a), 0));
  return { gesamtKw, haushaltKw, lieferantenpflichten: gesamtKw > LIEFERANTENPFLICHT_KW.allgemein || haushaltKw > LIEFERANTENPFLICHT_KW.haushalt };
}
