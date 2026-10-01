// src/lib/plattform/backend/demo/speicher.js
//
// Datei-Datenbank des Demo-Backends: eine JSON-Datei unter .data/plattform.json
// (steht in .gitignore). Schreiben nur unter einer Sperrdatei (funktioniert auch,
// wenn Next.js das Modul mehrfach lädt) und atomar über Datei + Umbenennen.
// Uploads liegen unter .data/uploads/ mit zufälligen Dateinamen.

import { promises as fs, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";

export const DATEN_ORDNER = path.join(process.cwd(), ".data");
export const UPLOAD_ORDNER = path.join(DATEN_ORDNER, "uploads");
const DATEI = path.join(DATEN_ORDNER, "plattform.json");
const SPERRE = path.join(DATEN_ORDNER, "plattform.lock");
const SCHEMA = 2; // 2: Benachrichtigungen, Postausgang, Aufgaben, Checklisten

let cache = null; // { mtimeMs, size, db }

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// Sperrdatei: schützt gegen parallele Schreiber aus mehreren Prozessen.
// Unter Last (viele parallele Tests) darf sie NIE einem lebenden Prozess
// weggenommen werden – sonst gehen Schreibvorgänge verloren. Verwaist ist eine
// Sperre nur, wenn der eingetragene Prozess nicht mehr existiert oder sie sehr
// alt ist (Absturz mitten im Schreiben).
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
      try {
        const st = await fs.stat(SPERRE);
        const pid = Number(readFileSync(SPERRE, "utf8")) || 0;
        const alt = Date.now() - st.mtimeMs;
        if ((!prozessLebt(pid) && alt > 2000) || alt > 120000) await fs.rm(SPERRE, { force: true });
      } catch {
        /* inzwischen weg */
      }
      if (Date.now() - start > 60000) throw new Error("Demo-Datenbank ist gesperrt");
      await warte(15 + Math.random() * 35);
    }
  }
}

async function entsperren() {
  await fs.rm(SPERRE, { force: true }).catch(() => {});
}

// Innerhalb eines Prozesses: Schreibvorgänge strikt nacheinander (Warteschlange),
// statt dass viele gleichzeitige Anfragen um die Sperrdatei konkurrieren.
// Auf globalThis, damit mehrfach geladene Modulinstanzen dieselbe Schlange teilen.
const SCHLANGE = Symbol.for("oekoinvest.demo.schreibschlange");
const IM_SCHREIBEN = (globalThis[Symbol.for("oekoinvest.demo.imSchreiben")] ||= new AsyncLocalStorage());
function nacheinander(fn) {
  // Verschachtelter Schreibzugriff würde auf sich selbst warten (Deadlock) –
  // und außerdem die äußere Änderung überschreiben. Deshalb klarer Fehler.
  // Nur solange die äußere Änderung läuft; danach gestartete Folgeaufgaben (die den
  // Kontext erben) dürfen normal schreiben.
  if (IM_SCHREIBEN.getStore()?.aktiv) throw new Error("Verschachtelter Schreibzugriff auf die Demo-Datenbank (aendern in aendern)");
  const vorher = globalThis[SCHLANGE] || Promise.resolve();
  const lauf = vorher.catch(() => {}).then(() => {
    const zustand = { aktiv: true };
    return IM_SCHREIBEN.run(zustand, async () => {
      try {
        return await fn();
      } finally {
        zustand.aktiv = false;
      }
    });
  });
  globalThis[SCHLANGE] = lauf.catch(() => {});
  return lauf;
}

// Wiederhergestellt (Team Service): dateiLesen, dateiSchreiben und seedFn fehlten seit Commit 640c032
// (ReferenceError bei jedem Zugriff) – unverändert aus dem Stand davor übernommen.

// BEWUSST SYNCHRON: React 19 schneidet im Dev-Modus den Rückgabewert von
// awaited I/O (fs.promises) für die Debug-Anzeige mit und liefert ihn im
// HTML aus – das war die komplette Demo-Datenbank inkl. Passwort-Hashes auf
// jeder Seite (2–5 MB). Synchrones Lesen erzeugt keinen solchen I/O-Eintrag.
async function dateiLesen() {
  try {
    const st = statSync(DATEI);
    if (cache && cache.mtimeMs === st.mtimeMs && cache.size === st.size) return structuredClone(cache.db);
    const roh = readFileSync(DATEI, "utf8");
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

let nachSeedFn = null;
/** Hook nach dem allerersten Seed (z. B. Demo-Vorbereitung aller Fachmodule, demo/vorbereiten.js) */
export function nachSeedSetzen(fn) {
  nachSeedFn = fn;
}

async function sicherstellen() {
  const db = await dateiLesen();
  if (db && db.schema === SCHEMA) return db;
  let neu;
  await sperren();
  try {
    const erneut = await dateiLesen();
    if (erneut && erneut.schema === SCHEMA) return erneut;
    neu = await seedFn();
    neu.schema = SCHEMA;
    await dateiSchreiben(neu);
  } finally {
    await entsperren();
  }
  // Nach dem Seed (außerhalb der Sperre): Fachmodul-Seeds anstoßen. Läuft der allererste Zugriff
  // ausnahmsweise innerhalb einer Schreibtransaktion, nicht warten (sonst verschachteltes aendern).
  if (nachSeedFn) {
    const lauf = () => Promise.resolve(nachSeedFn()).catch((e) => console.warn("[plattform-demo] Nach-Seed:", e?.message || e));
    if (IM_SCHREIBEN.getStore()?.aktiv) IM_SCHREIBEN.exit(lauf);
    else {
      await lauf();
      return (await dateiLesen()) || structuredClone(neu);
    }
  }
  return structuredClone(neu);
}

/** Nur lesen (Kopie – Änderungen daran werden NICHT gespeichert) */
export async function lesen() {
  return sicherstellen();
}

/** Lesen, ändern, speichern unter Sperre. `fn(db)` darf db verändern und ein Ergebnis liefern. */
export async function aendern(fn) {
  await sicherstellen();
  return nacheinander(async () => {
    await sperren();
    try {
      const db = await dateiLesen();
      const ergebnis = await fn(db);
      await dateiSchreiben(db);
      return ergebnis;
    } finally {
      await entsperren();
    }
  });
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
