// scripts/api-register.mjs – erzeugt docs/API-REGISTER.md (Plattform-Armee, Paket API)
//
// Automatisches Register aller Plattform-HTTP-Routen (src/app/api/**) und aller
// Frappe-Methoden aus den Adaptern (src/lib/plattform/backend/frappe.js + frappe/*.js).
// Beschreibungen kommen aus der ersten Kommentarzeile der jeweiligen route.js –
// das Register erfindet nichts, es sammelt nur.
//
// Aufruf:   node scripts/api-register.mjs          (schreibt docs/API-REGISTER.md)
// Prüfung:  node --test src/lib/plattform/api-vertrag.test.mjs  (Register muss aktuell sein)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = path.join(WURZEL, "src", "app", "api");
const BACKEND_DIR = path.join(WURZEL, "src", "lib", "plattform", "backend");
export const REGISTER_PFAD = path.join(WURZEL, "docs", "API-REGISTER.md");

/** Alle route.js unter src/app/api, als [pfad wie "/api/portal/…", dateipfad] */
export function routenSammeln(dir = API_DIR, prefix = "/api") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "de"))) {
    if (e.isDirectory()) out.push(...routenSammeln(path.join(dir, e.name), `${prefix}/${e.name}`));
    else if (e.name === "route.js") out.push([prefix, path.join(dir, e.name)]);
  }
  return out;
}

/** HTTP-Verben, die eine route.js exportiert */
export function verben(quelltext) {
  const v = new Set();
  for (const m of quelltext.matchAll(/export\s+(?:const|async function|function)\s+(GET|POST|PATCH|PUT|DELETE|HEAD)\b/g)) v.add(m[1]);
  for (const m of quelltext.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const t of m[1].split(",")) {
      const name = t.trim().split(/\s+as\s+/).pop()?.trim();
      if (["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD"].includes(name)) v.add(name);
    }
  }
  return ["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD"].filter((x) => v.has(x));
}

/** Erste aussagekräftige Kommentarzeile der Datei (ohne führendes "// METHODE /pfad – ") */
export function beschreibung(quelltext) {
  for (const zeile of quelltext.split("\n").slice(0, 12)) {
    const z = zeile.trim();
    if (!z.startsWith("//")) { if (z && !z.startsWith("/*") && !z.startsWith("*")) break; continue; }
    const text = z.replace(/^\/\/\s*/, "").trim();
    if (!text) continue;
    // "GET /api/x?y=… – Beschreibung" → nur die Beschreibung hinter dem Gedankenstrich
    const teil = text.split(/\s[–-]\s/).slice(1).join(" – ").trim();
    return (teil || text).replace(/\|/g, "·");
  }
  return "";
}

/** Frappe-Methoden aller Adapter: Map "modul.funktion" → {operation, adapter} (erste Fundstelle) */
export function adapterMethoden() {
  const dateien = [
    path.join(BACKEND_DIR, "frappe.js"),
    ...fs.readdirSync(path.join(BACKEND_DIR, "frappe")).filter((f) => f.endsWith(".js")).sort()
      .map((f) => path.join(BACKEND_DIR, "frappe", f)),
  ];
  const methoden = new Map();
  for (const d of dateien) {
    const t = fs.readFileSync(d, "utf8");
    for (const m of t.matchAll(/([A-Za-z0-9_]+)\s*:\s*"([a-z][a-z0-9_]+\.[a-z][a-z0-9_]+)"/g)) {
      if (!methoden.has(m[2])) methoden.set(m[2], { operation: m[1], adapter: path.basename(d) });
    }
  }
  return methoden;
}

/** Markdown des Registers erzeugen (deterministisch, ohne Zeitstempel im Inhalt) */
export function registerErzeugen() {
  const zeilen = [];
  zeilen.push("# API-Register (automatisch erzeugt)");
  zeilen.push("");
  zeilen.push("**Nicht von Hand bearbeiten.** Erzeugt mit `node scripts/api-register.mjs`; Aktualität sichert");
  zeilen.push("`src/lib/plattform/api-vertrag.test.mjs`. Vertrag und Semantik: [`docs/API.md`](./API.md) und die dort");
  zeilen.push("verlinkten Fachdokumente – dieses Register ist die vollständige Routen- und Methodenliste dazu.");
  zeilen.push("");
  zeilen.push("## HTTP-Routen der Website (`src/app/api/**`)");
  zeilen.push("");
  zeilen.push("| Route | Verben | Beschreibung (erste Kommentarzeile der route.js) |");
  zeilen.push("|---|---|---|");
  for (const [pfad, datei] of routenSammeln()) {
    const t = fs.readFileSync(datei, "utf8");
    zeilen.push(`| \`${pfad}\` | ${verben(t).join(", ")} | ${beschreibung(t)} |`);
  }
  zeilen.push("");
  zeilen.push("## Frappe-Methoden (Adapter → `oekoinvest_app.plattform.api.*`)");
  zeilen.push("");
  zeilen.push("Jede Zeile: whitelisted Methode ← Operation des Backend-Vertrags (Demo und Frappe signaturgleich).");
  zeilen.push("");
  zeilen.push("| Methode | Operation | Adapter |");
  zeilen.push("|---|---|---|");
  const methoden = [...adapterMethoden().entries()].sort((a, b) => a[0].localeCompare(b[0], "de"));
  for (const [mf, { operation, adapter }] of methoden) {
    zeilen.push(`| \`${mf}\` | \`${operation}\` | \`backend/${adapter === "frappe.js" ? "frappe.js" : `frappe/${adapter}`}\` |`);
  }
  zeilen.push("");
  return zeilen.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(REGISTER_PFAD, registerErzeugen(), "utf8");
  console.log(`geschrieben: ${path.relative(WURZEL, REGISTER_PFAD)}`);
}
