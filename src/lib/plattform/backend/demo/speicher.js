// src/lib/plattform/backend/demo/speicher.js
//
// Datei-Datenbank des Demo-Backends: eine JSON-Datei unter .data/plattform.json
// (steht in .gitignore). Schreiben nur unter einer Sperrdatei (funktioniert auch,
// wenn Next.js das Modul mehrfach lädt) und atomar über Datei + Umbenennen.
// Uploads liegen unter .data/uploads/ mit zufälligen Dateinamen.

import { promises as fs } from "node:fs";
import path from "node:path";

export const DATEN_ORDNER = path.join(process.cwd(), ".data");
export const UPLOAD_ORDNER = path.join(DATEN_ORDNER, "uploads");
const DATEI = path.join(DATEN_ORDNER, "plattform.json");
const SPERRE = path.join(DATEN_ORDNER, "plattform.lock");
const SCHEMA = 1;

let cache = null; // { mtimeMs, size, db }

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

async function sperren() {
  await fs.mkdir(DATEN_ORDNER, { recursive: true });
  const start = Date.now();
  for (;;) {
    try {
      const h = await fs.open(SPERRE, "wx");
      await h.writeFile(String(process.pid));
      await h.close();
      return;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      // verwaiste Sperre (Prozess abgestürzt) nach 10 s entfernen
      try {
        const st = await fs.stat(SPERRE);
        if (Date.now() - st.mtimeMs > 10000) await fs.rm(SPERRE, { force: true });
      } catch {
        /* inzwischen weg */
      }
      if (Date.now() - start > 8000) throw new Error("Demo-Datenbank ist gesperrt");
      await warte(10 + Math.random() * 20);
    }
  }
}

async function entsperren() {
  await fs.rm(SPERRE, { force: true }).catch(() => {});
}

async function dateiLesen() {
  try {
    const st = await fs.stat(DATEI);
    if (cache && cache.mtimeMs === st.mtimeMs && cache.size === st.size) return structuredClone(cache.db);
    const roh = await fs.readFile(DATEI, "utf8");
    const db = JSON.parse(roh);
    cache = { mtimeMs: st.mtimeMs, size: st.size, db };
    return structuredClone(db);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}

async function dateiSchreiben(db) {
  const tmp = `${DATEI}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 1), "utf8");
  for (let i = 0; ; i++) {
    try {
      await fs.rename(tmp, DATEI);
      break;
    } catch (e) {
      // Windows: Ziel kurzzeitig von einem Leser geöffnet
      if (i > 20 || !["EPERM", "EBUSY", "EACCES"].includes(e.code)) {
        await fs.rm(tmp, { force: true }).catch(() => {});
        throw e;
      }
      await warte(15);
    }
  }
  cache = null;
}

let seedFn = null;
/** Seed-Funktion registrieren (liefert eine neue, befüllte Datenbank) */
export function seedSetzen(fn) {
  seedFn = fn;
}

async function sicherstellen() {
  const db = await dateiLesen();
  if (db && db.schema === SCHEMA) return db;
  await sperren();
  try {
    const erneut = await dateiLesen();
    if (erneut && erneut.schema === SCHEMA) return erneut;
    const neu = await seedFn();
    neu.schema = SCHEMA;
    await dateiSchreiben(neu);
    return structuredClone(neu);
  } finally {
    await entsperren();
  }
}

/** Nur lesen (Kopie – Änderungen daran werden NICHT gespeichert) */
export async function lesen() {
  return sicherstellen();
}

/** Lesen, ändern, speichern unter Sperre. `fn(db)` darf db verändern und ein Ergebnis liefern. */
export async function aendern(fn) {
  await sicherstellen();
  await sperren();
  try {
    const db = await dateiLesen();
    const ergebnis = await fn(db);
    await dateiSchreiben(db);
    return ergebnis;
  } finally {
    await entsperren();
  }
}

export async function uploadSchreiben(dateiname, daten) {
  await fs.mkdir(UPLOAD_ORDNER, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_ORDNER, path.basename(dateiname)), daten);
}

export async function uploadLesen(dateiname) {
  return fs.readFile(path.join(UPLOAD_ORDNER, path.basename(dateiname)));
}

export async function uploadLoeschen(dateiname) {
  await fs.rm(path.join(UPLOAD_ORDNER, path.basename(dateiname)), { force: true });
}
