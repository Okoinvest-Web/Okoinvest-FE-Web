// src/lib/plattform/buchhaltung/index.js
//
// Reine Logik „Buchhaltung“ (Backoffice-Unterrolle buchhaltung): Mahnwesen mit konfigurierbaren Stufen/Gebühren,
// Zahlungseingang (CAMT/CSV) mit Zuordnungsvorschlag, OP-Liste mit Altersstruktur, Storno-/Korrekturbelege,
// Nummernkreise, DATEV-/BMD-Export und Monatsabschluss-Checkliste. Ohne Node-/React-Importe.
// Tests: node --test src/lib/plattform/buchhaltung/buchhaltung.test.mjs
// Python-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/buchhaltung_kern.py

export * from "./mahnwesen.js";
export * from "./zahlungsimport.js";
export * from "./op.js";
export * from "./export.js";
export * from "./abschluss.js";
