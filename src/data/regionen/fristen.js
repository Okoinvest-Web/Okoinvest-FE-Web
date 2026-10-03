// src/data/regionen/fristen.js
//
// Befristete Hinweise (Fristenkästen, Welle 0 / W0-2) für die Regionalseiten.
// Rein informativ, nur Text, ohne Angebot.
//
// Seit Welle 2 (Paket FRI) eine FASSADE über das Faktenregister: Titel, Text, Quelle und
// Ablauf stehen als Termin-Fakten (Klasse A, mit Abrufdatum und Prüfstatus) in
// src/lib/fakten/daten/termine-2026.js. Exporte und Verhalten sind unverändert:
// Nach Ablauf liefert die Funktion nichts mehr (bei statisch erzeugten Seiten greift das
// mit dem nächsten Build). Abgelaufene Einträge bei der nächsten Pflege im Register löschen –
// fehlt ein Eintrag im Register, verhält sich die Fassade wie nach Ablauf.
//
// Relativer Import mit Endung, damit die Datei auch ohne Next-Auflösung (node --test) lädt.

import { fakt } from "../../lib/fakten/index.js";

/** Termin-Fakt → { ende, eintrag } im bisherigen Format (eintrag wie `recht[]`) */
function fristAusRegister(id, land) {
  const f = fakt(id, land);
  const w = f?.wert;
  if (!w || !w.endeZeitpunkt) return { ende: 0, eintrag: null };
  return {
    ende: Date.parse(w.endeZeitpunkt),
    eintrag: { titel: w.titel, text: w.text, quelle: { titel: f.quelle.titel, url: f.quelle.url } },
  };
}

/**
 * 3. EAG-Fördercall 2026, Investitionszuschuss PV (Österreich).
 * Register: termin.eag.investitionszuschussCall3 (AT) – Ticketziehung 08.10.2026 ab 17:00,
 * Einreichung bis 22.10.2026; erscheint bis 22.10.2026 einschließlich.
 */
export const EAG_CALL_AT = fristAusRegister("termin.eag.investitionszuschussCall3", "AT");

/**
 * Pronovo PV-Auktionsrunde 4/2026 (Schweiz).
 * Register: termin.pronovo.auktionRunde4 (CH) – Gebote 18.10. bis und mit 01.11.2026.
 */
const PRONOVO_RUNDE_4_2026 = fristAusRegister("termin.pronovo.auktionRunde4", "CH");

/**
 * Marktzugang Schweiz: Mitteilung an den Verteilnetzbetreiber bis 31.10.2026 (Art. 11 Abs. 2 StromVV).
 * Register: termin.ch.marktzugangMitteilung (CH). Neu in Welle 2 – noch von keiner Seite genutzt;
 * der Fristenkasten auf /reststrom kann ihn übernehmen.
 */
export const MARKTZUGANG_CH = fristAusRegister("termin.ch.marktzugangMitteilung", "CH");

const gueltig = (liste, jetzt) => liste.filter((f) => f.eintrag && jetzt < f.ende).map((f) => f.eintrag);

/** Liefert die noch gültigen Fristen-Einträge für österreichische Regionen (Format wie `recht[]`). */
export function fristenAT(jetzt = Date.now()) {
  return gueltig([EAG_CALL_AT], jetzt);
}

/** Liefert die noch gültigen Fristen-Einträge für die Schweiz (Format wie `recht[]`). */
export function fristenCH(jetzt = Date.now()) {
  return gueltig([PRONOVO_RUNDE_4_2026], jetzt);
}
