#!/usr/bin/env node
// qa/fakten-check.mjs – Prüfung des Faktenregisters (Welle 2, Paket B1), Schritt 6 in npm run verify
//
//   node qa/fakten-check.mjs                       Bericht + qa/out/fakten-<zeitstempel>.json
//   node qa/fakten-check.mjs --json datei.json     JSON-Bericht an diese Stelle
//   node qa/fakten-check.mjs --stdout-json         nur JSON auf stdout (für Werkzeuge)
//   node qa/fakten-check.mjs --heute 2027-01-15    Stichtag vorgeben (Vorschau: was läuft wann ab?)
//   node qa/fakten-check.mjs --testfakt-abgelaufen fügt einen abgelaufenen Klasse-A-Testfakt hinzu
//                                                  (Nachweis: das Gate wird ROT)
//
// Gate ROT (Exit-Code 1): Vertragsfehler/Dubletten, Fakten ohne quelle oder abruf,
// abgelaufene Fakten der Klasse A (Masterplan H7). Warnungen: abgelaufene B/C-Fakten,
// status "zu_pruefen", Quellen ohne URL. Logik: src/lib/fakten/pruefen.js.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(WURZEL, "qa", "out");

const args = process.argv.slice(2);
const wert = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const nurJson = args.includes("--stdout-json");
const heute = wert("--heute") || new Date();
const stempel = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const jsonDatei = wert("--json") || join(OUT, `fakten-${stempel}.json`);

/** Testfakt für den Gate-Nachweis (Abnahme c) – nie in den echten Daten */
const TESTFAKT_ABGELAUFEN_A = Object.freeze({
  id: "test.abgelaufenKlasseA",
  wert: 1,
  einheit: "Test",
  land: "DE",
  quelle: { titel: "Testfakt qa/fakten-check.mjs", url: "https://example.org/testfakt" },
  abruf: "2020-01-01",
  gueltigAb: "2020-01-01",
  gueltigBis: "2020-12-31",
  status: "geprueft",
  pruefer: "Test",
  klasse: "A",
  notiz: "Nur für den Nachweis, dass ein abgelaufener Klasse-A-Wert das Gate rot macht.",
  herkunft: "qa/fakten-check.mjs (Test)",
});

const { alleFakten, pruefeFakten } = await import(pathToFileURL(join(WURZEL, "src/lib/fakten/index.js")).href);

const liste = [...alleFakten(), ...(args.includes("--testfakt-abgelaufen") ? [TESTFAKT_ABGELAUFEN_A] : [])];
const bericht = pruefeFakten(liste, { heute });

if (nurJson) {
  process.stdout.write(JSON.stringify(bericht, null, 1) + "\n");
} else {
  const z = bericht.zusammenfassung;
  const zeile = (zeichen, text) => console.log(`  ${zeichen} ${text}`);
  console.log(`Faktenregister – Stichtag ${bericht.stichtag}: ${z.fakten} Fakten (${Object.entries(z.jeLand).map(([l, n]) => `${l} ${n}`).join(", ")})`);
  zeile(z.vertragsfehler ? "✗" : "✓", `Vertragsfehler/Dubletten: ${z.vertragsfehler}`);
  zeile(z.ohneQuelle ? "✗" : "✓", `ohne Quelle: ${z.ohneQuelle}`);
  zeile(z.ohneAbruf ? "✗" : "✓", `ohne Abrufdatum: ${z.ohneAbruf}`);
  zeile(z.abgelaufenKlasseA ? "✗" : "✓", `abgelaufen, Klasse A: ${z.abgelaufenKlasseA}`);
  zeile(z.abgelaufenKlasseBC ? "•" : "✓", `abgelaufen, Klasse B/C (Warnung): ${z.abgelaufenKlasseBC}`);
  zeile(z.zuPruefen ? "•" : "✓", `status zu_pruefen (Warnung): ${z.zuPruefen}`);
  zeile(z.ohneUrl ? "•" : "✓", `Quelle ohne URL (Warnung): ${z.ohneUrl}`);
  for (const t of bericht.vertragsfehler.slice(0, 20)) console.log(`    Fehler: ${t}`);
  for (const f of bericht.abgelaufenA) console.log(`    Abgelaufen (A): ${f.id} (${f.land}), gültig bis ${f.gueltigBis} – Wert wird auf Seiten als „Stand abgelaufen, wird geprüft“ gezeigt`);
  for (const f of bericht.warnungen.abgelaufenBC) console.log(`    Abgelaufen (${f.klasse}): ${f.id} (${f.land}), gültig bis ${f.gueltigBis}`);
  console.log(`  Ergebnis: ${bericht.urteil}`);
  mkdirSync(dirname(jsonDatei), { recursive: true });
  writeFileSync(jsonDatei, JSON.stringify(bericht, null, 1), "utf8");
  console.log(`  Bericht: ${jsonDatei}`);
}
process.exitCode = bericht.ok ? 0 : 1;
