// src/lib/plattform/checkliste.js
//
// Dokumenten-Checklisten: welche Unterlagen je Projektphase bzw. je Fläche erwartet werden.
// Ein Dokument erfüllt einen Punkt, wenn es mit dem Schlüssel des Punkts (Feld `checkliste`)
// hochgeladen wurde. Der Vollständigkeitsgrad der Pflichtpunkte fließt als „Datenraum-Qualität“
// (0–100) in die Börsenkarte ein. Frappe nutzt dieselbe Tabelle (plattform/checkliste.py).
//
// Client- und serverseitig nutzbar (keine Node-Importe).

import { PHASEN } from "@/lib/invest/markt";
import { datenblattVollstaendigkeit } from "./fach/datenblatt"; // Fachprüfung Kapitalseite

const PHASE_IDX = (id) => Math.max(0, PHASEN.findIndex((p) => p.id === id));

/**
 * Projekt-Checkliste. `ab` = Phase, ab der die Unterlage erwartet wird.
 * `ohne` = Projekttypen, für die der Punkt entfällt. `land` = abweichende Bezeichnung je Land.
 */
export const CHECKLISTE_PROJEKT = [
  { id: "pacht", ab: "flaeche", pflicht: true, label: "Pacht- bzw. Nutzungsverträge (geschwärzt)", text: "Flächensicherung für alle Flurstücke inkl. Laufzeit und Verlängerungsoption." },
  { id: "lageplan", ab: "flaeche", pflicht: true, label: "Lageplan mit Flurstücken", text: "Übersichtsplan mit Projektgrenze und Zuwegung." },
  { id: "netzzusage", ab: "netz", pflicht: true, label: "Netzanschlusszusage", text: "Zusage bzw. Reservierung des Netzbetreibers mit Verknüpfungspunkt und Leistung." },
  { id: "aufstellung", ab: "aufstellung", pflicht: true, ohne: ["carport", "dach"], label: "Aufstellungsbeschluss B-Plan", land: { AT: "Einleitung Umwidmung (Grünland-PV)", CH: "Einleitung Nutzungsplanung" }, text: "Beschluss der Gemeinde zur Bauleitplanung bzw. Einleitung des Widmungsverfahrens." },
  { id: "gutachten", ab: "aufstellung", pflicht: true, label: "Fachgutachten", text: "Umwelt, Artenschutz, Blendung, Boden – soweit für das Verfahren gefordert." },
  { id: "satzung", ab: "satzung", pflicht: true, label: "B-Plan-Satzungsbeschluss", land: { AT: "Widmung Grünland-PV / Baubewilligung", CH: "Baubewilligung" }, text: "Rechtskräftiges Planungsrecht." },
  { id: "ertrag", ab: "satzung", pflicht: true, ohne: ["speicher"], label: "Ertragsgutachten", text: "Unabhängiges Ertragsgutachten (P50/P90)." },
  { id: "baugenehmigung", ab: "rtb", pflicht: true, label: "Baugenehmigung & Freigaben", text: "Baugenehmigung bzw. -anzeige und Freigaben des Netzbetreibers." },
  { id: "eeg", ab: "rtb", pflicht: false, ohne: ["speicher"], label: "EEG-Zuschlag bzw. Vermarktung", land: { AT: "EAG-Förderzusage bzw. PPA", CH: "Einmalvergütung bzw. Abnahmevertrag" }, text: "Zuschlag aus der Ausschreibung oder Vermarktungskonzept (PPA) – optional." },
  { id: "betrieb", ab: "cod", pflicht: true, label: "Betriebsdaten & Inbetriebnahme", text: "Inbetriebnahmeprotokoll, Ertragsdaten, laufende Verträge (Wartung, Direktvermarktung)." },
];

/** Flächen-Checkliste (Flächeneigentümer, Landwirte) */
export const CHECKLISTE_FLAECHE = [
  { id: "grundbuch", pflicht: true, label: "Grundbuchauszug", land: { AT: "Grundbuchsauszug" }, text: "Aktueller Auszug für alle Flurstücke (nicht älter als drei Monate)." },
  { id: "flurkarte", pflicht: true, label: "Flurkarte", land: { AT: "Katastralmappe", CH: "Katasterplan" }, text: "Auszug aus dem Liegenschaftskataster mit markierten Flurstücken." },
  { id: "vollmacht", pflicht: true, nurWenn: (f) => f?.eigentum && f.eigentum !== "eigentum", label: "Vollmacht bzw. Zustimmung der Miteigentümer", text: "Nur bei Miteigentum oder Verwaltung erforderlich." },
  { id: "pachtDritter", pflicht: false, label: "Bestehende Pachtverträge Dritter", text: "Falls die Fläche derzeit landwirtschaftlich verpachtet ist – optional." },
];

export const CHECKLISTE_IDS = {
  projekt: CHECKLISTE_PROJEKT.map((x) => x.id),
  flaeche: CHECKLISTE_FLAECHE.map((x) => x.id),
};

function auswerten(punkte) {
  const pflicht = punkte.filter((x) => x.erwartet && x.pflicht);
  const erfuellt = pflicht.filter((x) => x.vorhanden).length;
  return {
    punkte,
    erwartet: pflicht.length,
    erfuellt,
    quote: pflicht.length ? Math.round((erfuellt / pflicht.length) * 100) : 100,
  };
}

function belege(dokumente, id) {
  return (dokumente || []).filter((d) => d.checkliste === id).map((d) => ({ id: d.id, name: d.name, am: d.am }));
}

/**
 * Gewichtung der Datenraum-Qualität (Fachprüfung Kapitalseite): Pflichtunterlagen 70 %, Vollständigkeit des
 * Standard-Projektdatenblatts (fach/datenblatt.js, phasenabhängig) 30 %. Frappe: checkliste.py (identisch).
 */
export const QUALITAET_GEWICHT = { unterlagen: 0.7, datenblatt: 0.3 };

/** Checkliste eines Projekts; `dokumente` = Metadaten mit Feld `checkliste` */
export function checklisteProjekt(p, dokumente = []) {
  const phase = PHASE_IDX(p?.phase);
  const punkte = CHECKLISTE_PROJEKT.filter((x) => !(x.ohne || []).includes(p?.typ)).map((x) => {
    const d = belege(dokumente, x.id);
    return {
      id: x.id,
      label: x.land?.[p?.land] || x.label,
      text: x.text,
      pflicht: x.pflicht,
      ab: x.ab,
      erwartet: PHASE_IDX(x.ab) <= phase,
      vorhanden: d.length > 0,
      dokumente: d,
    };
  });
  const out = auswerten(punkte);
  // Fachprüfung Kapitalseite: Datenblatt fließt in die Datenraum-Qualität ein
  const db = datenblattVollstaendigkeit(p);
  out.quoteUnterlagen = out.quote;
  out.datenblatt = { quote: db.quote, erwartet: db.erwartet, erfuellt: db.erfuellt, bereiche: db.bereiche };
  out.quote = Math.round(out.quoteUnterlagen * QUALITAET_GEWICHT.unterlagen + db.quote * QUALITAET_GEWICHT.datenblatt);
  return out;
}

/** Checkliste einer Fläche */
export function checklisteFlaeche(f, dokumente = []) {
  const punkte = CHECKLISTE_FLAECHE.map((x) => {
    const d = belege(dokumente, x.id);
    const erwartet = x.nurWenn ? !!x.nurWenn(f) : true;
    return { id: x.id, label: x.land?.[f?.land] || x.label, text: x.text, pflicht: x.pflicht, erwartet, vorhanden: d.length > 0, dokumente: d };
  });
  return auswerten(punkte);
}

/** Nur die Kennzahl für die Börsenkarte (öffentlich unkritisch: ein Prozentwert) */
export const datenraumQualitaet = (p, dokumente) => checklisteProjekt(p, dokumente).quote;
