// test/charakterisierung/diff.mjs
//
// Abweichungsbericht (Markdown) heutige Ausgaben ↔ Snapshots – zum Einfügen in den PR.
// Paket E muss jede Zeile begründen (Quelle am Original, Prüfer).
//   node test/charakterisierung/diff.mjs [rechner …] [--datei bericht.md]
// Exit-Code 0 auch bei Abweichungen (Bericht, kein Gate; das Gate ist rechner.test.mjs).

import { writeFileSync } from "node:fs";
import { RECHNER } from "./faelle.mjs";
import { abweichungen, aktuelleAusgaben, leseSnapshot, relativ } from "./snapshot.mjs";

const args = process.argv.slice(2);
const dateiIdx = args.indexOf("--datei");
const datei = dateiIdx >= 0 ? args[dateiIdx + 1] : null;
const namen = args.filter((a, i) => !a.startsWith("--") && !(dateiIdx >= 0 && i === dateiIdx + 1));
const auswahl = namen.length ? namen : Object.keys(RECHNER);

const zeilen = ["# Abweichungen gegenüber den Charakterisierungs-Snapshots", ""];
let gesamt = 0;
for (const n of auswahl) {
  if (!RECHNER[n]) continue;
  const snap = leseSnapshot(n);
  const jetzt = await aktuelleAusgaben(n);
  if (!snap) {
    zeilen.push(`## ${n}`, "", "_kein Snapshot vorhanden_", "");
    continue;
  }
  const abschnitt = [];
  for (const fall of new Set([...Object.keys(snap.faelle), ...Object.keys(jetzt.faelle)])) {
    const diff = abweichungen(snap.faelle[fall] ?? "(fehlt)", jetzt.faelle[fall] ?? "(fehlt)");
    for (const d of diff) {
      const r = relativ(d.alt, d.neu);
      abschnitt.push(`| ${fall} | \`${d.pfad}\` | ${d.alt} | ${d.neu} | ${r === null ? "" : `${(r * 100).toFixed(1)} %`} | _Begründung/Quelle_ |`);
    }
  }
  gesamt += abschnitt.length;
  if (abschnitt.length) {
    zeilen.push(`## ${n} (${abschnitt.length})`, "", "| Fall | Pfad | alt | neu | Δ | Begründung |", "|---|---|---|---|---|---|", ...abschnitt, "");
  }
}
zeilen.splice(1, 0, "", gesamt ? `${gesamt} Abweichung(en).` : "Keine Abweichungen.");
const text = zeilen.join("\n");
if (datei) {
  writeFileSync(datei, text + "\n", "utf8");
  console.log(`Bericht: ${datei} (${gesamt} Abweichungen)`);
} else console.log(text);
