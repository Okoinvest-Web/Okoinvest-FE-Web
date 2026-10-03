// test/charakterisierung/aktualisieren.mjs
//
// Schreibt die Snapshots aus den heutigen Rechner-Ausgaben neu.
//   node test/charakterisierung/aktualisieren.mjs            alle Rechner
//   node test/charakterisierung/aktualisieren.mjs pacht ppa  nur diese
//
// Nur ausführen, wenn eine Abweichung fachlich begründet ist (Quelle, Prüfer) –
// vorher den Diff-Bericht (diff.mjs) in den PR übernehmen.

import { RECHNER } from "./faelle.mjs";
import { aktuelleAusgaben, schreibeSnapshot, snapshotPfad } from "./snapshot.mjs";

const auswahl = process.argv.slice(2);
const namen = auswahl.length ? auswahl : Object.keys(RECHNER);
for (const n of namen) {
  if (!RECHNER[n]) {
    console.error(`Unbekannter Rechner: ${n} (bekannt: ${Object.keys(RECHNER).join(", ")})`);
    process.exitCode = 1;
    continue;
  }
  const daten = await aktuelleAusgaben(n);
  schreibeSnapshot(n, daten);
  console.log(`geschrieben: ${snapshotPfad(n)} (${Object.keys(daten.faelle).length} Fälle)`);
}
