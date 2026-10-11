// Prüft scripts/demo-sicherung.mjs vollständig isoliert: Das Skript läuft in
// einem Temp-Ordner mit eigener .data-Attrappe – die echte Demo-Datenbank und
// der laufende Dev-Server werden NICHT berührt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "scripts", "demo-sicherung.mjs");

function lauf(cwd, ...args) {
  return execFileSync(process.execPath, [SKRIPT, ...args], { cwd, encoding: "utf8" });
}

test("Demo-Sicherung: sichern, prüfen, Datenverlust, wiederherstellen", () => {
  const wurzel = mkdtempSync(path.join(tmpdir(), "demo-sicherung-"));
  try {
    const daten = path.join(wurzel, ".data");
    mkdirSync(path.join(daten, "uploads"), { recursive: true });
    const db = JSON.stringify({ schema: 2, konten: [{ id: "T-1", name: "Testkonto" }] });
    writeFileSync(path.join(daten, "plattform.json"), db);
    writeFileSync(path.join(daten, "uploads", "beleg.pdf"), "PDF-Attrappe");
    writeFileSync(path.join(daten, "plattform.lock"), "999999"); // darf NICHT mitgesichert werden
    writeFileSync(path.join(daten, "plattform.json.1.2.tmp"), "Rest"); // Schreibrest, auch nicht

    // Sichern
    const aus = lauf(wurzel, "sichern", "test");
    assert.match(aus, /Sicherung angelegt/);
    const name = readdirSync(path.join(wurzel, ".data-sicherungen"))[0];
    const manifest = JSON.parse(readFileSync(path.join(wurzel, ".data-sicherungen", name, "manifest.json"), "utf8"));
    assert.deepEqual(Object.keys(manifest.dateien).sort(), ["plattform.json", "uploads/beleg.pdf"]);
    assert.equal(manifest.schemaHinweis, 2);

    // Prüfen
    assert.match(lauf(wurzel, "pruefen", name), /OK/);

    // Manipulierte Sicherung wird erkannt und NICHT eingespielt
    const kopie = path.join(wurzel, ".data-sicherungen", name, "plattform.json");
    const original = readFileSync(kopie, "utf8");
    writeFileSync(kopie, original + " ");
    assert.throws(() => lauf(wurzel, "wiederherstellen", name), /FEHLERHAFT|Hash/);
    writeFileSync(kopie, original);

    // Datenverlust simulieren und wiederherstellen
    rmSync(path.join(daten, "plattform.json"));
    rmSync(path.join(daten, "uploads", "beleg.pdf"));
    assert.match(lauf(wurzel, "wiederherstellen", name), /Nachkontrolle OK/);
    assert.equal(readFileSync(path.join(daten, "plattform.json"), "utf8"), db);
    assert.equal(readFileSync(path.join(daten, "uploads", "beleg.pdf"), "utf8"), "PDF-Attrappe");
    assert.ok(!existsSync(path.join(daten, "plattform.lock")), "Sperre nach Wiederherstellung entfernt");
  } finally {
    rmSync(wurzel, { recursive: true, force: true });
  }
});
