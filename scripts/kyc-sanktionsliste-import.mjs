// scripts/kyc-sanktionsliste-import.mjs
//
// MANUELLER Import der konsolidierten EU-Finanzsanktionsliste für das Demo-Backend (Frappe: kyc_aufgaben.sanktionsliste_importieren).
// Es wird NICHTS aus dem Netz geladen – die Datei laden Sie selbst von der offiziellen Quelle herunter:
//
//   Europäische Kommission, Financial Sanctions Files (FSF): https://webgate.ec.europa.eu/fsd/fsf
//   „Consolidated list of persons, groups and entities subject to EU financial sanctions“ – XML (v1.1) oder CSV (v1.1)
//
// Aufruf:
//   node scripts/kyc-sanktionsliste-import.mjs <pfad/zur/datei.xml|.csv> [--stand JJJJ-MM-TT] [--pruefen]
//     --pruefen  nur einlesen und zählen, nichts schreiben
//
// Ergebnis: .data/kyc-sanktionsliste.json { quelle, stand, importiertAm, sha256, format, eintraege[] } – liegt in .gitignore.
// Das Demo-Backend liest die Datei synchron beim Abgleich; ohne Datei nutzt es die kleine FIKTIVE Testliste.
// Beim nächsten Fristen-Lauf (Backoffice → Compliance → „Fristen jetzt prüfen“) werden offene und verifizierte Fälle
// gegen den neuen Stand abgeglichen. Treffer führen nie automatisch zu einer Entscheidung, sondern zur manuellen Prüfung.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { euCsvLesen, euXmlLesen } from "../src/lib/plattform/sanktionsliste.js";

const args = process.argv.slice(2);
const datei = args.find((a) => !a.startsWith("--"));
const standIdx = args.indexOf("--stand");
const stand = standIdx >= 0 ? args[standIdx + 1] : new Date().toISOString().slice(0, 10);
const nurPruefen = args.includes("--pruefen");

if (!datei) {
  console.error("Aufruf: node scripts/kyc-sanktionsliste-import.mjs <datei.xml|datei.csv> [--stand JJJJ-MM-TT] [--pruefen]");
  process.exit(2);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(stand || "")) {
  console.error("--stand muss das Format JJJJ-MM-TT haben.");
  process.exit(2);
}

const roh = readFileSync(datei);
const sha256 = createHash("sha256").update(roh).digest("hex");
const text = roh.toString("utf8");
const format = text.trimStart().startsWith("<") ? "xml" : "csv";
const eintraege = format === "xml" ? euXmlLesen(text) : euCsvLesen(text);
if (!eintraege.length) {
  console.error("Keine Einträge erkannt – bitte Format prüfen (EU-FSF XML v1.1 bzw. CSV v1.1).");
  process.exit(1);
}
const personen = eintraege.filter((e) => e.typ === "person").length;
console.log(`${eintraege.length} Einträge erkannt (${personen} Personen, ${eintraege.length - personen} Organisationen/sonstige), Format ${format.toUpperCase()}, SHA-256 ${sha256}`);
if (nurPruefen) process.exit(0);

const ziel = path.join(process.cwd(), ".data", "kyc-sanktionsliste.json");
mkdirSync(path.dirname(ziel), { recursive: true });
const inhalt = {
  quelle: `EU-Finanzsanktionsliste (FSF), Datei ${path.basename(datei)}`,
  stand,
  importiertAm: new Date().toISOString(),
  sha256,
  format,
  eintraege,
};
const tmp = `${ziel}.${process.pid}.tmp`;
writeFileSync(tmp, JSON.stringify(inhalt), "utf8");
renameSync(tmp, ziel);
console.log(`Gespeichert: ${ziel} (Stand ${stand}).`);
