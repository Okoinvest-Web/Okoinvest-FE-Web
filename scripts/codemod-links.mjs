#!/usr/bin/env node
// scripts/codemod-links.mjs – Links auf die Länderzonen umstellen (Welle 2, Länderrouting)
//
//   node scripts/codemod-links.mjs            Trockenlauf: Bericht, nichts wird geschrieben
//   node scripts/codemod-links.mjs --schreiben  Dateien ändern
//   node scripts/codemod-links.mjs --pruefen    nur prüfen: Exit 1, wenn noch harte Links auf alte
//                                               Pfade stehen (Gate in npm run verify, Abnahme e)
//   --json <datei>                             Bericht zusätzlich als JSON
//
// Was als „harter Link auf einen verschobenen Pfad“ zählt: ein String-Literal, dessen Inhalt ein
// alter Pfad einer Länderzonen-Seite ist ("/rechner/pacht", "/regionen/tirol", "/faq#x") oder der
// Ratgeber unter seinem alten Namen ("/ratgeber/…"). Ausgenommen sind Literale als Argument der
// Länderfunktionen pfad(…)/ziel(…)/alternates(…)/landDerSeite(…)/landMetadata(…) – dort sind sie
// Schlüssel, keine Links –, Kommentare sowie src/lib/land selbst und die Tests.
//
// Ersetzungen:
//   href="/rechner/pacht"      → href={pfad("/rechner/pacht")}
//   href: "/rechner/pacht"     → href: pfad("/rechner/pacht")
//   "/ratgeber/x"              → "/wissen/ratgeber/x"   (Stamm, kein pfad() nötig)
//   "… im [Pachtrechner](/rechner/pacht) …"  → Pfad im Fließtext auf das Ziel umgeschrieben
// Nicht automatisch (Bericht, Handarbeit): Template-Literale mit Platzhaltern (`/regionen/${slug}`),
// Objektschlüssel und case-Marken.
// Import: `import { pfad } from "@/lib/land"` (in src/lib, src/data, src/content relativ mit .js);
// heißt in der Datei schon etwas „pfad“, als `{ pfad as seitenPfad }`.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { SEITEN, seiteFuer } from "../src/lib/land/stufen.js";
import { ziel } from "../src/lib/land/pfad.js";
import { nurPfad, umbenannt, zoneFuer } from "../src/lib/land/zonen.js";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const schreiben = args.includes("--schreiben");
const pruefen = args.includes("--pruefen");
const jsonIdx = args.indexOf("--json");
const jsonDatei = jsonIdx >= 0 ? args[jsonIdx + 1] : null;

/** Dateien, die die Länderlogik selbst sind oder alte Pfade bewusst als Daten führen. */
const AUSGENOMMEN = [
  "src/lib/land/",
  "src/lib/indexsteuerung.js", // Crawler-Regeln (Präfixe von Hand gepflegt)
  "src/data/navigation.js", // Schlüssel; Navigation und Footer lösen über src/lib/land auf
  "src/lib/gruppe/partner-register.js", // ZIELE sind Schlüssel; zielPfad() löst über src/lib/land auf
];

/** Ist das ein alter Pfad einer verschobenen Seite (ohne Präfix)? */
export function alterPfad(roh) {
  if (typeof roh !== "string" || !roh.startsWith("/") || roh.startsWith("//")) return false;
  const p = nurPfad(roh);
  if (umbenannt(p)) return true;
  if (zoneFuer(p) !== "land") return false;
  const s = seiteFuer(p);
  if (!s) return false;
  return !SEITEN[s.muster]?.neu;
}

// Aufrufe, deren Argument ein Schlüssel ist (auch die lokalen Kurzformen lp/link/landLink in Seiten der Länderzonen)
const SCHLUESSEL_FUNKTIONEN = /(?:\b(?:pfad|seitenPfad|ziel|alternates|hreflang|entsprechung|linkFuer|navLink|landLink|lp|link|landPfad)\(\s*|\b(?:landDerSeite|landMetadata)\([^()]*?,?\s*|\bschluessel:\s*)$/;

function dateien(dir, liste = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (n === "node_modules" || n.startsWith(".")) continue;
      dateien(p, liste);
    } else if (/\.(m?js)$/.test(n) && !/\.test\.mjs$/.test(n)) liste.push(p);
  }
  return liste;
}

const rel = (p) => relative(WURZEL, p).split(sep).join("/");

/** Bereiche einer Zeile, die Kommentar sind (// …) – grob, reicht für unseren Code. */
function kommentarAb(zeile) {
  let inS = null;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (inS) {
      if (c === "\\") i++;
      else if (c === inS) inS = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") inS = c;
    else if (c === "/" && zeile[i + 1] === "/" && zeile[i - 1] !== ":" ) return i;
  }
  return -1;
}

const FLIESSTEXT = /(^|[\s(\[="'>])(\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*)(?=$|[\s)\]"'#?<.,;:!])/g;

function bearbeite(datei, quelle) {
  const r = rel(datei);
  const funde = [];
  const zeilen = quelle.split("\n");
  let blockKommentar = false;
  let brauchtImport = false;
  const hatPfadName = /\bpfad\b/.test(quelle.replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']*lib\/land[^"']*["'];?/g, ""));
  const name = hatPfadName ? "seitenPfad" : "pfad";

  for (let z = 0; z < zeilen.length; z++) {
    let zeile = zeilen[z];
    const t = zeile.trim();
    if (blockKommentar) {
      if (t.includes("*/")) blockKommentar = false;
      continue;
    }
    if (t.startsWith("/*")) {
      if (!t.includes("*/")) blockKommentar = true;
      continue;
    }
    if (t.startsWith("//") || t.startsWith("*")) continue;
    const kAb = kommentarAb(zeile);
    const code = kAb >= 0 ? zeile.slice(0, kAb) : zeile;
    const rest = kAb >= 0 ? zeile.slice(kAb) : "";

    // 1) ganze String-Literale "…" / '…'
    let neu = code.replace(/(["'])((?:\\.|(?!\1)[^\\\n])*)\1/g, (voll, q, inhalt, pos, ganz) => {
      if (!alterPfad(inhalt)) {
        // 2) Fließtext innerhalb eines Literals
        if (!inhalt.includes("/")) return voll;
        let geaendert = false;
        const ersetzt = inhalt.replace(FLIESSTEXT, (m, vor, p) => {
          if (!alterPfad(p)) return m;
          geaendert = true;
          funde.push({ datei: r, zeile: z + 1, art: "fliesstext", alt: p, neu: ziel(p).href });
          return vor + ziel(p).href;
        });
        return geaendert ? q + ersetzt + q : voll;
      }
      const vorher = ganz.slice(0, pos);
      const nachher = ganz.slice(pos + voll.length);
      if (SCHLUESSEL_FUNKTIONEN.test(vorher)) return voll; // schon Schlüssel
      const umb = umbenannt(nurPfad(inhalt));
      if (umb) {
        funde.push({ datei: r, zeile: z + 1, art: "umbenannt", alt: inhalt, neu: ziel(inhalt).href });
        return q + ziel(inhalt).href + q;
      }
      if (/^\s*:/.test(nachher) && !/\?\s*$/.test(vorher)) {
        funde.push({ datei: r, zeile: z + 1, art: "manuell", grund: "Objektschlüssel oder case-Marke", alt: inhalt });
        return voll;
      }
      if (/\bcase\s*$/.test(vorher)) {
        funde.push({ datei: r, zeile: z + 1, art: "manuell", grund: "case-Marke", alt: inhalt });
        return voll;
      }
      brauchtImport = true;
      const jsx = /[A-Za-z0-9_-]=\s*$/.test(vorher) && !/[=!<>]=\s*$/.test(vorher);
      funde.push({ datei: r, zeile: z + 1, art: jsx ? "jsx" : "literal", alt: inhalt, neu: ziel(inhalt).href, vergleich: /(===|!==|startsWith\()\s*$/.test(vorher) || undefined });
      return jsx ? `{${name}(${q}${inhalt}${q})}` : `${name}(${q}${inhalt}${q})`;
    });

    // 3) Template-Literale: statische Pfade ersetzen, Platzhalter melden
    neu = neu.replace(/`([^`]*)`/g, (voll, inhaltGanz) => {
      let geaendert = false;
      // nur die statischen Teile; ${…}-Ausdrücke bleiben unberührt (dort gilt Schritt 1)
      const teile = inhaltGanz.split(/(\$\{[^}]*\})/);
      const ersetzt = teile.map((inhalt, idx) => (idx % 2 ? inhalt : inhalt.replace(/(^|[\s(\[="'>])(\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*)(\/?$|(?=[\s)\]"'#?<.,;:!]))/g, (m, vor, p, platz, pos) => {
        // Pfad endet direkt vor einem ${…}-Platzhalter → dynamischer Link, nicht automatisch lösbar
        const vorPlatzhalter = idx < teile.length - 1 && pos + m.length === inhalt.length;
        if (vorPlatzhalter) {
          const basis = nurPfad(p);
          if (alterPfad(basis) || alterPfad(`${basis}/x`) || basis === "/regionen" || basis === "/ratgeber") {
            funde.push({ datei: r, zeile: z + 1, art: "manuell", grund: "Template mit Platzhalter", alt: `${p}/\${…}` });
          }
          return m;
        }
        if (!alterPfad(p)) return m;
        geaendert = true;
        funde.push({ datei: r, zeile: z + 1, art: "fliesstext", alt: p, neu: ziel(p).href });
        return vor + ziel(p).href;
      }))).join("");
      return geaendert ? "`" + ersetzt + "`" : voll;
    });

    zeilen[z] = neu + rest;
  }

  let ergebnis = zeilen.join("\n");
  if (brauchtImport && !/import\s*\{[^}]*\bpfad\b[^}]*\}\s*from\s*["'][^"']*lib\/land/.test(quelle)) {
    const relativ = /^src\/(lib|data|content)\//.test(r);
    const ziel = relativ ? posix.relative(posix.dirname(r), "src/lib/land/index.js") : "@/lib/land";
    const spez = relativ && !ziel.startsWith(".") ? `./${ziel}` : ziel;
    const imp = `import { ${name === "pfad" ? "pfad" : "pfad as seitenPfad"} } from "${spez}";`;
    const z2 = ergebnis.split("\n");
    let letzte = -1;
    let direktive = -1;
    for (let i = 0; i < z2.length; i++) {
      if (/^["']use (client|server)["'];?\s*$/.test(z2[i].trim())) direktive = i;
      if (/^import\s.*from\s+["'][^"']+["'];?\s*$/.test(z2[i]) || /^\}\s*from\s+["'][^"']+["'];?\s*$/.test(z2[i]) || /^import\s+["'][^"']+["'];?\s*$/.test(z2[i])) letzte = i;
    }
    const nach = Math.max(letzte, direktive);
    z2.splice(nach + 1, 0, imp);
    ergebnis = z2.join("\n");
  }
  return { ergebnis, funde };
}

const alle = [...dateien(join(WURZEL, "src"))];
const bericht = { zeit: new Date().toISOString(), dateien: 0, ersetzt: 0, fliesstext: 0, umbenannt: 0, manuell: [], vergleiche: [], geaendert: [] };
const verbleibend = [];

for (const d of alle) {
  const r = rel(d);
  if (AUSGENOMMEN.some((a) => r === a || r.startsWith(a))) continue;
  const quelle = readFileSync(d, "utf8");
  const { ergebnis, funde } = bearbeite(d, quelle);
  if (!funde.length) continue;
  for (const f of funde) {
    if (f.art === "manuell") bericht.manuell.push(f);
    else if (f.art === "fliesstext") bericht.fliesstext++;
    else if (f.art === "umbenannt") bericht.umbenannt++;
    else bericht.ersetzt++;
    if (f.vergleich) bericht.vergleiche.push(f);
  }
  const auto = funde.filter((f) => f.art !== "manuell");
  if (auto.length) {
    bericht.dateien++;
    bericht.geaendert.push({ datei: r, anzahl: auto.length });
    verbleibend.push(...auto);
  }
  if (schreiben && ergebnis !== quelle) writeFileSync(d, ergebnis, "utf8");
}

// public/llms.txt: Klartext-Links (absolute URLs und Pfade)
const llms = join(WURZEL, "public", "llms.txt");
try {
  const t = readFileSync(llms, "utf8");
  let n = 0;
  const neuT = t.replace(/(https:\/\/www\.oekoinvest\.com)?(\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*)(?=$|[\s)\]#?.,;:])/gm, (m, host, p) => {
    if (!alterPfad(p)) return m;
    n++;
    return (host || "") + ziel(p).href;
  });
  if (n) {
    bericht.fliesstext += n;
    bericht.geaendert.push({ datei: "public/llms.txt", anzahl: n });
    verbleibend.push(...Array.from({ length: n }, () => ({ datei: "public/llms.txt" })));
    if (schreiben) writeFileSync(llms, neuT, "utf8");
  }
} catch {
  /* keine llms.txt */
}

console.log(`Codemod Länderlinks${schreiben ? " (geschrieben)" : pruefen ? " (Prüfung)" : " (Trockenlauf)"}`);
console.log(`  Dateien mit Funden:        ${bericht.geaendert.length}`);
console.log(`  pfad()-Ersetzungen:        ${bericht.ersetzt}`);
console.log(`  umbenannt (/ratgeber):     ${bericht.umbenannt}`);
console.log(`  Fließtext umgeschrieben:   ${bericht.fliesstext}`);
console.log(`  Vergleiche (prüfen):       ${bericht.vergleiche.length}`);
console.log(`  nicht automatisch lösbar:  ${bericht.manuell.length}`);
for (const m of bericht.manuell) console.log(`    ${m.datei}:${m.zeile}  ${m.alt}  (${m.grund})`);
if (bericht.vergleiche.length) for (const v of bericht.vergleiche) console.log(`    Vergleich ${v.datei}:${v.zeile}  ${v.alt}`);

if (jsonDatei) {
  mkdirSync(dirname(resolve(jsonDatei)), { recursive: true });
  writeFileSync(resolve(jsonDatei), JSON.stringify(bericht, null, 1), "utf8");
}

if (pruefen) {
  const offen = verbleibend.length + bericht.manuell.length;
  if (offen) {
    console.log(`\nROT: ${offen} harte Links auf verschobene Pfade (Abnahme e).`);
    for (const g of bericht.geaendert.slice(0, 30)) console.log(`  ${g.datei}: ${g.anzahl}`);
    process.exit(1);
  }
  console.log("\nGRÜN: 0 harte Links auf verschobene Pfade.");
}
