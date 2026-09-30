// src/lib/plattform/compliance/index.js
//
// Reine Logik „Compliance – Datenschutz & Geldwäsche“ (Backoffice-Unterrolle compliance): Betroffenenanfragen
// Art. 15–21 DSGVO mit Monatsfrist, interner Verdachtsfall-Workflow (ohne automatischen Versand), Verzeichnis der
// Verarbeitungstätigkeiten, Löschkonzept und SLA der KYC-Warteschlange. Ohne Node-/React-Importe.
// Tests: node --test src/lib/plattform/compliance/compliance.test.mjs
// Python-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/compliance_kern.py

export * from "./datenschutz.js";
export * from "./verdacht.js";
export * from "./vvt.js";
export * from "./sla.js";
