// scripts/demo-sicherung.mjs
//
// Sicherung und Wiederherstellung des Demo-Backends (NUR Demo-/Testdaten).
// Sichert den kompletten .data-Ordner (plattform.json, ki-nutzung.json,
// uploads/, kyc/ …) in einen Zeitstempel-Ordner unter .data-sicherungen/
// mit SHA-256-Manifest. Die Wiederherstellung prüft erst jedes Manifest-Hash
// und schreibt dann unter derselben Sperrdatei (plattform.lock), die auch das
// Demo-Backend benutzt – so kollidiert sie nicht mit dem laufenden Dev-Server.
//
// Aufrufe (im Projektordner):
//   node scripts/demo-sicherung.mjs sichern [name]
//   node scripts/demo-sicherung.mjs liste
//   node scripts/demo-sicherung.mjs pruefen <name>
//   node scripts/demo-sicherung.mjs wiederherstellen <name>
//
// Keine npm-Abhängigkeiten, nur node:fs / node:crypto / node:path.

import { promises as fs, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const WURZEL = process.cwd();
const DATEN = path.join(WURZEL, ".data");
const ZIEL = path.join(WURZEL, ".data-sicherungen");
const SPERRE = path.join(DATEN, "plattform.lock");

// Nie mitsichern: Sperrdatei und liegengebliebene atomare Schreib-Reste.
const AUSSCHLUSS = (rel) => rel === "plattform.lock" || /\.tmp$/.test(rel) || /plattform\.json\.\d+\.\d+\.tmp$/.test(rel);

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

async function dateienRekursiv(ordner, basis = ordner) {
  const liste = [];
  const eintraege = await fs.readdir(ordner, { withFileTypes: true });
  for (const e of eintraege) {
    const voll = path.join(ordner, e.name);
    if (e.isDirectory()) liste.push(...(await dateienRekursiv(voll, basis)));
    else if (e.isFile()) liste.push(path.relative(basis, voll).replaceAll("\\", "/"));
  }
  return liste.sort();
}

// Dieselbe Sperrlogik wie src/lib/plattform/backend/demo/speicher.js, damit
// Wiederherstellung und laufender Dev-Server sich nicht in die Quere kommen.
function prozessLebt(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}

async function sperren() {
  await fs.mkdir(DATEN, { recursive: true });
  const start = Date.now();
  for (;;) {
    try {
      const h = await fs.open(SPERRE, "wx");
      await h.writeFile(String(process.pid));
      await h.close();
      return;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        const st = await fs.stat(SPERRE);
        const pid = Number(readFileSync(SPERRE, "utf8")) || 0;
        const alt = Date.now() - st.mtimeMs;
        if ((!prozessLebt(pid) && alt > 2000) || alt > 120000) await fs.rm(SPERRE, { force: true });
      } catch {
        /* inzwischen weg */
      }
      if (Date.now() - start > 60000) throw new Error("Demo-Datenbank ist gesperrt (Dev-Server beschäftigt) – später erneut versuchen");
      await warte(15 + Math.random() * 35);
    }
  }
}

async function entsperren() {
  await fs.rm(SPERRE, { force: true }).catch(() => {});
}

// Atomar schreiben (Datei + Umbenennen), mit Windows-Wiederholung wie im Demo-Backend.
async function atomarSchreiben(ziel, daten) {
  await fs.mkdir(path.dirname(ziel), { recursive: true });
  const tmp = `${ziel}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, daten);
  for (let i = 0; ; i++) {
    try {
      await fs.rename(tmp, ziel);
      return;
    } catch (e) {
      if (i > 20 || !["EPERM", "EBUSY", "EACCES"].includes(e.code)) {
        await fs.rm(tmp, { force: true }).catch(() => {});
        throw e;
      }
      await warte(15);
    }
  }
}

async function sichern(name) {
  try {
    statSync(DATEN);
  } catch {
    console.error("Kein .data-Ordner vorhanden – nichts zu sichern.");
    process.exit(1);
  }
  const stempel = new Date().toISOString().replaceAll(":", "-").slice(0, 19);
  const ordnerName = name ? `${stempel}_${name.replace(/[^\w.-]+/g, "-")}` : stempel;
  const ziel = path.join(ZIEL, ordnerName);
  await fs.mkdir(ziel, { recursive: true });

  const manifest = { erstellt: new Date().toISOString(), quelle: ".data", schemaHinweis: null, dateien: {} };
  let bytes = 0;
  // Unter der Backend-Sperre lesen, damit die Sicherung keinen halben Stand
  // erwischt (z. B. plattform.json neu, zugehöriger Upload noch nicht da).
  await sperren();
  try {
    const dateien = (await dateienRekursiv(DATEN)).filter((r) => !AUSSCHLUSS(r));
    for (const rel of dateien) {
      const daten = await fs.readFile(path.join(DATEN, rel));
      manifest.dateien[rel] = { sha256: sha256(daten), bytes: daten.length };
      bytes += daten.length;
      const zielDatei = path.join(ziel, rel);
      await fs.mkdir(path.dirname(zielDatei), { recursive: true });
      await fs.writeFile(zielDatei, daten);
      // Kopie sofort gegenlesen (Sichern-Verifizieren): Kopie muss dem Original gleichen.
      const kopie = await fs.readFile(zielDatei);
      if (sha256(kopie) !== manifest.dateien[rel].sha256) throw new Error(`Kopie weicht ab: ${rel}`);
    }
  } finally {
    await entsperren();
  }
  try {
    // Aus der Kopie lesen, nicht aus .data – der Hinweis muss zur Sicherung passen.
    manifest.schemaHinweis = JSON.parse(await fs.readFile(path.join(ziel, "plattform.json"), "utf8")).schema ?? null;
  } catch {
    /* plattform.json fehlt oder gerade im Umbau – Hinweis bleibt leer */
  }
  await fs.writeFile(path.join(ziel, "manifest.json"), JSON.stringify(manifest, null, 1), "utf8");
  console.log(`Sicherung angelegt: .data-sicherungen/${ordnerName}`);
  console.log(`Dateien: ${Object.keys(manifest.dateien).length}, Umfang: ${(bytes / 1024 / 1024).toFixed(1)} MB, Schema: ${manifest.schemaHinweis}`);
  return ordnerName;
}

async function manifestLesen(name) {
  const ordner = path.join(ZIEL, name);
  const manifest = JSON.parse(await fs.readFile(path.join(ordner, "manifest.json"), "utf8"));
  return { ordner, manifest };
}

async function pruefen(name, still = false) {
  const { ordner, manifest } = await manifestLesen(name);
  const fehler = [];
  for (const [rel, soll] of Object.entries(manifest.dateien)) {
    try {
      const daten = await fs.readFile(path.join(ordner, rel));
      if (sha256(daten) !== soll.sha256) fehler.push(`Hash weicht ab: ${rel}`);
    } catch {
      fehler.push(`Datei fehlt: ${rel}`);
    }
  }
  if (fehler.length) {
    console.error(`Sicherung ${name} FEHLERHAFT:\n- ${fehler.join("\n- ")}`);
    process.exit(2);
  }
  if (!still) console.log(`Sicherung ${name} OK (${Object.keys(manifest.dateien).length} Dateien, alle SHA-256 stimmen).`);
  return manifest;
}

async function wiederherstellen(name) {
  // 1. Erst die Sicherung selbst prüfen – eine kaputte Sicherung wird nie eingespielt.
  const manifest = await pruefen(name, true);
  const { ordner } = await manifestLesen(name);

  // 2. Sicherheitsnetz: aktuellen Stand vor dem Überschreiben wegsichern.
  let netz = null;
  try {
    statSync(path.join(DATEN, "plattform.json"));
    netz = await sichern("vor-wiederherstellung");
  } catch {
    /* nichts da – z. B. echter Datenverlust */
  }

  // 3. Unter der Sperre des Demo-Backends zurückschreiben (atomar je Datei).
  await sperren();
  try {
    for (const rel of Object.keys(manifest.dateien)) {
      const daten = await fs.readFile(path.join(ordner, rel));
      await atomarSchreiben(path.join(DATEN, rel), daten);
    }
  } finally {
    await entsperren();
  }

  // 4. Nachkontrolle: eingespielter Stand gegen das Manifest.
  const fehler = [];
  for (const [rel, soll] of Object.entries(manifest.dateien)) {
    const daten = await fs.readFile(path.join(DATEN, rel));
    if (sha256(daten) !== soll.sha256) fehler.push(rel);
  }
  if (fehler.length) {
    console.error(`Nachkontrolle FEHLGESCHLAGEN (evtl. schreibt der Dev-Server gerade): ${fehler.join(", ")}`);
    console.error(netz ? `Vorheriger Stand liegt unter .data-sicherungen/${netz}` : "Kein vorheriger Stand vorhanden.");
    process.exit(3);
  }
  console.log(`Wiederherstellung aus ${name} abgeschlossen, Nachkontrolle OK (${Object.keys(manifest.dateien).length} Dateien).`);
  if (netz) console.log(`Stand davor gesichert als: .data-sicherungen/${netz}`);
  console.log("Hinweis: Laufender Dev-Server liest den neuen Stand automatisch (mtime-Cache).");
}

async function liste() {
  let eintraege = [];
  try {
    eintraege = (await fs.readdir(ZIEL, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    /* noch keine Sicherungen */
  }
  if (!eintraege.length) return console.log("Keine Sicherungen unter .data-sicherungen/ vorhanden.");
  for (const name of eintraege) {
    try {
      const { manifest } = await manifestLesen(name);
      const bytes = Object.values(manifest.dateien).reduce((s, d) => s + d.bytes, 0);
      console.log(`${name}  –  ${Object.keys(manifest.dateien).length} Dateien, ${(bytes / 1024 / 1024).toFixed(1)} MB, Schema ${manifest.schemaHinweis}`);
    } catch {
      console.log(`${name}  –  (kein lesbares Manifest)`);
    }
  }
}

const [befehl, name] = process.argv.slice(2);
try {
  if (befehl === "sichern") await sichern(name);
  else if (befehl === "liste") await liste();
  else if (befehl === "pruefen" && name) await pruefen(name);
  else if (befehl === "wiederherstellen" && name) await wiederherstellen(name);
  else {
    console.log("Aufruf: node scripts/demo-sicherung.mjs sichern [name] | liste | pruefen <name> | wiederherstellen <name>");
    process.exit(1);
  }
} catch (e) {
  console.error("Fehler:", e?.message || e);
  process.exit(1);
}
