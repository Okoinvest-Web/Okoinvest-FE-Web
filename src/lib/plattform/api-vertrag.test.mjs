// Tests des API-Vertrags (Plattform-Armee, Paket API):  node --test src/lib/plattform/api-vertrag.test.mjs
//
// Sichert die Konsistenz zwischen docs/API.md, dem erzeugten Register docs/API-REGISTER.md,
// den Adaptern (backend/frappe.js + backend/frappe/*.js), den Frappe-Methoden
// (Backend-Import/.../plattform/api/*.py) und den HTTP-Routen (src/app/api/**):
//   1. docs/API-REGISTER.md ist aktuell (sonst: node scripts/api-register.mjs)
//   2. Jede Adapter-Methode existiert als @frappe.whitelist-Funktion im passenden api/<modul>.py
//   3. Jede in docs/*.md dokumentierte Methode `modul.funktion` existiert in Python
//   4. Jede in docs/API.md dokumentierte HTTP-Route existiert als route.js
//   5. Jede deklarierte Backend-Operation (OPERATIONEN-Listen + Adapter-Schlüssel) ist in
//      Demo- UND Frappe-Baum implementiert (statisch, ergänzt die Laufzeit-Warnung in backend/*.js)
//   6. Die einheitliche Fehlerstruktur (fehler.js) ist in docs/API.md dokumentiert
//
// Rein statisch (Dateisystem), keine App-Importe – läuft auch ohne Alias-Loader.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adapterMethoden, registerErzeugen, REGISTER_PFAD, WURZEL, routenSammeln } from "../../../scripts/api-register.mjs";

const PY_API = path.join(WURZEL, "Backend-Import", "oekoinvest_app", "oekoinvest_app", "plattform", "api");
const BACKEND = path.join(WURZEL, "src", "lib", "plattform", "backend");
const APP_API = path.join(WURZEL, "src", "app", "api");

const lesen = (p) => fs.readFileSync(p, "utf8");
const API_MD = lesen(path.join(WURZEL, "docs", "API.md"));

// Alle Markdown-Dokumente, die zusammen den Vertrag bilden (API.md verweist auf Fachdokumente)
function alleDocs() {
  const teile = [];
  for (const d of ["docs", "docs/eg", "docs/handbuch", "docs/fachpruefung"]) {
    const dir = path.join(WURZEL, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith(".md")) teile.push(lesen(path.join(dir, f)));
  }
  return teile.join("\n");
}

// Python-Funktionen je Modul, mit Decorator-Block je Funktion
function pyModul(modul) {
  const datei = path.join(PY_API, `${modul}.py`);
  if (!fs.existsSync(datei)) return null;
  const text = lesen(datei);
  const funktionen = new Map(); // name → whitelisted (bool)
  const zeilen = text.split("\n");
  for (let i = 0; i < zeilen.length; i++) {
    const m = zeilen[i].match(/^def ([a-z0-9_]+)\(/);
    if (!m) continue;
    let whitelisted = false;
    for (let j = i - 1; j >= 0; j--) {
      const z = zeilen[j].trim();
      if (z.startsWith("@")) { if (z.includes("whitelist")) whitelisted = true; continue; }
      if (z === "" || z.startsWith("#")) continue;
      break;
    }
    funktionen.set(m[1], whitelisted);
  }
  return funktionen;
}
const pyCache = new Map();
const py = (modul) => { if (!pyCache.has(modul)) pyCache.set(modul, pyModul(modul)); return pyCache.get(modul); };

test("docs/API-REGISTER.md ist aktuell (sonst: node scripts/api-register.mjs)", () => {
  assert.ok(fs.existsSync(REGISTER_PFAD), "docs/API-REGISTER.md fehlt – mit `node scripts/api-register.mjs` erzeugen");
  const soll = registerErzeugen().replace(/\r\n/g, "\n");
  const ist = lesen(REGISTER_PFAD).replace(/\r\n/g, "\n");
  assert.equal(ist, soll, "docs/API-REGISTER.md ist veraltet – bitte `node scripts/api-register.mjs` ausführen");
});

test("Jede Adapter-Methode existiert whitelisted in Backend-Import api/<modul>.py", () => {
  const fehler = [];
  for (const [mf, { adapter }] of adapterMethoden()) {
    const [modul, fn] = mf.split(".");
    const fns = py(modul);
    if (!fns) { fehler.push(`${mf} (${adapter}): api/${modul}.py fehlt`); continue; }
    if (!fns.has(fn)) { fehler.push(`${mf} (${adapter}): Funktion fehlt in api/${modul}.py`); continue; }
    if (!fns.get(fn)) fehler.push(`${mf} (${adapter}): Funktion ohne @frappe.whitelist`);
  }
  assert.deepEqual(fehler, [], `Adapter ↔ Frappe inkonsistent:\n${fehler.join("\n")}`);
});

test("Jede in docs dokumentierte Methode `modul.funktion` existiert in Python", () => {
  // Nur die Vertragsdokumente (API.md + docs/eg) – Prüfberichte (docs/fachpruefung) nennen auch Datenfelder
  const DOCS = [path.join(WURZEL, "docs", "API.md"), path.join(WURZEL, "docs", "EG-SCHNITTSTELLEN.md"),
    ...fs.readdirSync(path.join(WURZEL, "docs", "eg")).filter((f) => f.endsWith(".md")).map((f) => path.join(WURZEL, "docs", "eg", f)),
  ].map((p) => lesen(p)).join("\n");
  const fehler = new Set();
  for (const m of DOCS.matchAll(/`([a-z][a-z0-9_]+)\.([a-z][a-z0-9_]+)`/g)) {
    const [, modul, fn] = m;
    if (["js", "py", "mjs", "md", "json"].includes(fn)) continue; // Dateinamen, keine Methoden
    const fns = py(modul);
    if (!fns) continue; // kein API-Modul (z. B. Objekt.feld-Schreibweise)
    if (!fns.has(fn)) fehler.add(`${modul}.${fn}`);
  }
  assert.deepEqual([...fehler].sort(), [], "In docs dokumentiert, aber nicht in Backend-Import/.../api vorhanden");
});

test("Jede in docs/API.md dokumentierte HTTP-Route existiert (src/app/api/**)", () => {
  const fehler = new Set();
  const existiert = (pfad) => {
    const segmente = pfad.replace(/^\/api\//, "").split("/").filter(Boolean);
    let dir = APP_API;
    for (const s of segmente) {
      const eintraege = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
      if (eintraege.includes(s)) { dir = path.join(dir, s); continue; }
      const dynamisch = eintraege.find((x) => x.startsWith("["));
      if (dynamisch) { dir = path.join(dir, dynamisch); continue; }
      return false;
    }
    // route.js direkt – oder dokumentierter Präfix eines Routenbaums (z. B. „außerhalb von /api/portal“)
    return fs.existsSync(path.join(dir, "route.js")) || fs.existsSync(dir);
  };
  for (const m of API_MD.matchAll(/(?<![\w/.])(\/api\/[A-Za-z0-9\-_/[\]]+)/g)) {
    const roh = m[1];
    if (roh.startsWith("/api/method") || roh.startsWith("/api/resource")) continue; // Frappe-Seite
    if (roh.includes("...") || /\[\//.test(roh)) continue; // Kurzschreibweisen ([/id], /…)
    const pfad = roh.replace(/\[$/, "").replace(/\/$/, "");
    if (!existiert(pfad)) fehler.add(pfad);
  }
  assert.deepEqual([...fehler].sort(), [], "In docs/API.md dokumentiert, aber keine route.js vorhanden");
});

// ---- 5. Operationen: deklariert ↔ implementiert (Demo- und Frappe-Baum) --------------

function exportNamen(datei) {
  const text = lesen(datei);
  const namen = new Set();
  for (const m of text.matchAll(/export\s+(?:const|let|function|async function|class)\s+([A-Za-z0-9_$]+)/g)) namen.add(m[1]);
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const t of m[1].split(",")) {
      const name = t.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) namen.add(name);
    }
  }
  return namen;
}

function baumExporte(dateien) {
  const namen = new Set();
  for (const d of dateien) for (const n of exportNamen(d)) namen.add(n);
  return namen;
}

function deklarierteOperationen() {
  const ops = new Set();
  const dateien = [path.join(BACKEND, "index.js"), ...fs.readdirSync(BACKEND).filter((f) => f.endsWith(".js")).map((f) => path.join(BACKEND, f))];
  for (const d of dateien) {
    const text = lesen(d);
    // Blöcke `X_OPERATIONEN = [ … ]` bzw. `= { … }` (EG): alle String-Literale darin
    for (const m of text.matchAll(/[A-Z_]*OPERATIONEN\s*=\s*(\[|\{)([\s\S]*?)(\]|\});/g)) {
      for (const s of m[2].matchAll(/"([A-Za-z0-9_]+)"/g)) ops.add(s[1]);
    }
  }
  return ops;
}

// Bewusst ohne Frappe-Spiegel (bis zum Livegang, siehe backend/newsletter.js): Demo-only-Operationen
const FRAPPE_SPAETER = new Set(["newsletterAnlegen", "newsletterBestaetigen", "newsletterAbmelden", "newsletterLesen", "newsletterEmpfaenger", "newsletterAufraeumen", "newsletterUebersicht", "newsletterExport", "newsletterLoeschen"]);

test("Jede deklarierte Operation ist im Demo- UND im Frappe-Baum implementiert", () => {
  const js = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => path.join(dir, f));
  const demo = baumExporte([path.join(BACKEND, "demo.js"), ...js(path.join(BACKEND, "demo"))]);
  const frappe = baumExporte([path.join(BACKEND, "frappe.js"), ...js(path.join(BACKEND, "frappe"))]);
  const fehler = [];
  for (const op of [...deklarierteOperationen()].sort()) {
    if (!demo.has(op)) fehler.push(`${op}: fehlt im Demo-Baum (backend/demo*)`);
    if (!frappe.has(op) && !FRAPPE_SPAETER.has(op)) fehler.push(`${op}: fehlt im Frappe-Baum (backend/frappe*)`);
  }
  assert.deepEqual(fehler, [], `Operationen ohne Implementierung:\n${fehler.join("\n")}`);
});

// ---- 6. Fehlerstruktur und Statuscodes ------------------------------------------------

test("Einheitliche Fehlerstruktur: alle Statuscodes aus fehler.js sind in docs/API.md dokumentiert", () => {
  const text = lesen(path.join(WURZEL, "src", "lib", "plattform", "fehler.js"));
  const codes = [...text.matchAll(/^\s*(\d{3}):\s*"([a-z_]+)"/gm)];
  assert.ok(codes.length >= 10, "CODES in fehler.js nicht gefunden");
  const fehlend = codes.filter(([, status, code]) => !API_MD.includes(`\`${code}\``) && !API_MD.includes(` ${status} `)).map(([, s, c]) => `${s}/${c}`);
  assert.deepEqual(fehlend, [], "Statuscode/Fehlercode aus fehler.js fehlt in docs/API.md");
  assert.ok(API_MD.includes("{ ok: false, error, code }"), "Fehlerform `{ ok: false, error, code }` nicht in docs/API.md dokumentiert");
});

// ---- Rate-Limits: Dokumentation deckt die Grenzen ab ----------------------------------

test("Alle Rate-Limit-Namen aus server/rateLimit.js sind in docs/API.md dokumentiert", () => {
  const text = lesen(path.join(WURZEL, "src", "lib", "plattform", "server", "rateLimit.js"));
  const block = text.match(/GRENZEN\s*=\s*\{([\s\S]*?)\};/);
  assert.ok(block, "GRENZEN in rateLimit.js nicht gefunden");
  const namen = [...block[1].matchAll(/^\s*([A-Za-z0-9_]+):\s*\[/gm)].map((m) => m[1]);
  assert.ok(namen.length >= 5, "keine Grenzen gefunden");
  const fehlend = namen.filter((n) => !API_MD.includes(`\`${n}\``));
  assert.deepEqual(fehlend, [], "Rate-Limit-Grenze fehlt in docs/API.md (Abschnitt „Rate-Limits“)");
});
