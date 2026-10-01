// src/lib/plattform/eg/index.js
//
// Einstieg in die reinen Regeln des Moduls Energiegemeinschaften (keine Importe aus backend/, client- und serverseitig).
// WP1-Teil: Datenmodell, Kennungen, Stammdaten, Mitglied/Zählpunkt/Teilnahme, Anlage, Tarif, Netzbetreiber, Netzentgelt,
// Rechte je Gemeinschaft, Zustandswechsel, Navigation, Migration aus dem Prototyp. Andere Pakete exportieren ihre Module
// selbst (eg/eda/**, eg/verteilung.js …) – hier nur WP1.

export * from "./modell.js";
export * from "./zaehlpunkt.js";
export * from "./stamm.js";
export * from "./mitglied.js";
export * from "./anlage.js";
export * from "./tarif.js";
export * from "./netzbetreiber.js";
export * from "./netzentgelt.js";
export * from "./rechte.js";
export * from "./status.js";
export * from "./navigation.js";
export * from "./migration.js";
export { MitgliedFehler as EgFehler } from "../mitglied/basis.js";
