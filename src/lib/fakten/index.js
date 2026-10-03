// src/lib/fakten/index.js
//
// Öffentliche Schnittstelle des Faktenregisters (Welle 2, Paket B1).
//   import { fakt, faktWert, fakten, alleFakten } from "@/lib/fakten";
// Datenmodule werden NUR hier eingebunden (Abnahme f: keine Importe aus daten/*
// außerhalb src/lib/fakten). Neue Datei unter daten/ → hier in DATENMODULE eintragen.
// Vertrag eines Fakts: ./schema.js.

import { erstelleRegister } from "./register.js";
import de from "./daten/de.js";
import at from "./daten/at.js";
import ch from "./daten/ch.js";
// Paket FRI (Termine, Umlagen, Netzentgelte) – Dateien gehören FRI, hier nur eingebunden
import termineDe from "./daten/termine-de.js";
import termineAt from "./daten/termine-at.js";
import termineCh from "./daten/termine-ch.js";
import umlagenDe from "./daten/umlagen-de.js";
import umlagenAt from "./daten/umlagen-at.js";
import umlagenCh from "./daten/umlagen-ch.js";
import netzentgelteDe from "./daten/netzentgelte-de.js";
import netzentgelteAt from "./daten/netzentgelte-at.js";
import netzentgelteCh from "./daten/netzentgelte-ch.js";

export const DATENMODULE = [de, at, ch, termineDe, termineAt, termineCh, umlagenDe, umlagenAt, umlagenCh, netzentgelteDe, netzentgelteAt, netzentgelteCh];

export const REGISTER = erstelleRegister(DATENMODULE);

export const { fakt, faktWert, fakten, alleFakten, quellenListe } = REGISTER;
/** Vertragsprüfung aller Fakten (Dubletten, Pflichtfelder) – genutzt von qa/fakten-check.mjs und Tests */
export const registerPruefen = REGISTER.pruefen;

export { erstelleRegister } from "./register.js";
export * from "./schema.js";
export * from "./waehrung.js";
export { pruefeFakten } from "./pruefen.js";
