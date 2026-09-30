// src/lib/plattform/finanzen/index.js
//
// Reine Finanz-Logik (ohne Node-/React-Importe): Fälligkeiten, Indexierung, Umsatzbeteiligung, Contracting-Abrechnung,
// Provisionsrechnung, Umsatzsteuer-Vorlagen, IBAN/SEPA-XML, AfA und Projektcontrolling.
// Tests: node --test src/lib/plattform/finanzen/finanzen.test.mjs
// Python-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/finanzen/{logik,sepa,steuer}.py

export * from "./basis.js";
export * from "./konstanten.js";
export * from "./faelligkeit.js";
export * from "./indexierung.js";
export * from "./pacht.js";
export * from "./contracting.js";
export * from "./provision.js";
export * from "./steuer.js";
export * from "./sepa.js";
export * from "./afa.js";
