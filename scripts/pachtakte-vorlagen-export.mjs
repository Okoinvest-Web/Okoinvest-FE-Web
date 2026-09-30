// Erzeugt Backend-Import/.../plattform/pachtakte_vorlagen.json aus src/lib/plattform/pachtakte.js (Tabellen und Texte;
// die Logik ist in pachtakte_kern.py nachgebaut). Nach Änderungen an pachtakte.js ausführen:
//   node scripts/pachtakte-vorlagen-export.mjs
import { writeFileSync } from "node:fs";
const P = await import(new URL("../src/lib/plattform/pachtakte.js", import.meta.url).href);
const namen = [
  "ANLIEGEN_STATUS", "ANLIEGEN_OFFEN", "ANLIEGEN_BEARBEITUNG_TAGE", "KUENDIGUNG_GRUENDE", "WECHSEL_ANLAESSE", "ERBNACHWEISE", "AUFTEILUNG_GRUNDLAGEN", "VERLAENGERUNG_WUENSCHE",
  "ANLIEGEN_ARTEN", "ANLIEGEN_UEBERGAENGE", "RUECKBAU_STATUS", "RUECKBAU_UEBERGAENGE", "SICHERHEIT_STATUS", "SICHERHEIT_ARTEN", "AGRI_NACHWEIS_ARTEN", "AGRI_NACHWEIS_STATUS",
  "AGRI_NACHWEIS_KULTUREN", "AGRI_NACHWEIS_EINHEITEN", "AGRI_BEWIRTSCHAFTER", "JA_NEIN_ENTFAELLT", "DIN_91434", "AGRI_NACHWEIS_UEBERGAENGE", "STEUER_HINWEISE_PACHT", "LAND_TEXT",
];
const daten = { _hinweis: "GENERIERT aus src/lib/plattform/pachtakte.js – nicht von Hand ändern (Generator: node scripts/pachtakte-vorlagen-export.mjs)" };
for (const n of namen) daten[n] = P[n];
writeFileSync(new URL("../Backend-Import/oekoinvest_app/oekoinvest_app/plattform/pachtakte_vorlagen.json", import.meta.url), JSON.stringify(daten, null, 1) + "\n", "utf8");
console.log("ok", namen.length);
