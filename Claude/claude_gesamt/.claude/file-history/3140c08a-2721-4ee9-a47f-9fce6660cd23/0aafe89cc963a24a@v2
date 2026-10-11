// Ordnet alle geänderten Dateien den thematischen Commits nach dem QM-Vorschlag zu.
// Aufruf: node commits-welle1.mjs            → Probelauf (zeigt Gruppen)
//         node commits-welle1.mjs --ausfuehren → committet Gruppe für Gruppe
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, cpSync, readdirSync } from "node:fs";

const REPO = "C:/Users/SALEADMIN/Downloads/Oekoinvest-Web";
const Q = "C:/Users/SALEAD~1/AppData/Local/Temp/claude/c--Users-SALEADMIN-Downloads-Oekoinvest-Web/3140c08a-2721-4ee9-a47f-9fce6660cd23/scratchpad/welle1";
const sh = (c) => execSync(c, { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const ausfuehren = process.argv.includes("--ausfuehren");
const TRAILER = "\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";

// alle geänderten, gelöschten und neuen Dateien
const dateien = sh("git status --porcelain --untracked-files=all -z").split("\0").filter(Boolean).map((z) => z.slice(3));
const design = new Set(readFileSync(`${Q}/QM/commit-00-design-vor-welle1.txt`, "utf8").split(/\r?\n/).map((s) => s.trim().replace(/\\/g, "/")).filter(Boolean));

const GRUPPEN = [
  { name: "F", regex: /^(test\/|qa\/|\.github\/workflows\/)|^package\.json$/, text: "Sicherheitsnetz: Charakterisierungstests aller Rechner, npm run verify (Tests, Selbsttest, Claim-Lint, axe, Funnel-E2E), Version 0.4.0" },
  { name: "I", regex: /^(\.gitignore|\.env\.example|Backend-Import\/dienste\/[^/]+\/\.env\.example|src\/app\/robots\.js|public\/robots\.txt|src\/app\/sitemap\.js|src\/app\/layout\.js|src\/data\/site\.js|src\/lib\/indexsteuerung|src\/components\/Seo\/|src\/lib\/hreflang\.js|src\/lib\/baseUrl\.js)/, text: "Indexsteuerung und Stammdaten: noindex außerhalb der Produktion, Crawler-Regeln, Build-Abbruch ohne NEXT_PUBLIC_SITE_URL, lang=en, Altcode entfernt; Kontaktdaten, UID, ECG-Angaben und Gesellschafter laut Inhaber" },
  { name: "A", regex: /^(src\/components\/JsonLd|src\/lib\/ipAdresse|next\.config\.mjs|src\/lib\/energy\.js|src\/app\/api\/auth\/|src\/lib\/plattform\/client\.js|src\/lib\/plattform\/backend\/index\.js|src\/lib\/plattform\/demoGuard|src\/lib\/sicheresZiel|public\/\.well-known\/)/, text: "Sicherheit: zentrales JSON-LD-Escaping, vertrauenswürdige Proxy-IP, CSP (Report-Only) und HSTS, Demo-Guard, Open-Redirect-Prüfung, Timeout/Retry, Rate-Limit Passwort-Reset" },
  { name: "B", regex: /^(src\/components\/Statistik\/|src\/components\/Cookies\/|src\/lib\/herkunft|src\/lib\/statistik|src\/lib\/plattform\/ki\/|src\/lib\/ereignis\/)/, text: "Datenschutz: GA nur auf Positivliste, Banner lehnt wirklich ab (Fassung und Zeitstempel), Codes gehasht, KI-Herkunft, PII-Schwärzung, KI-Triage standardmäßig aus" },
  { name: "E", regex: /^(src\/lib\/invest\/markt\.js|src\/lib\/rechner\/|src\/components\/Rechner\/)/, text: "Zahlen: Werte am Original geprüft (EEG-Zuschläge 2026, § 51, § 6 Abs. 5, Umlagen, Pacht, CO₂ 0,685), Länder-Sperre AT/CH, Rechenfehler Großspeicher; Snapshot-Abweichungen begründet" },
  { name: "C", regex: /^(src\/components\/Plattform\/AnfrageFormular|src\/components\/Portal\/Bedienung\/pruefung|src\/app\/api\/anfrage\/|src\/components\/Flaeche\/FlaechenWizard|src\/components\/Kommune\/KommuneAnfrage|src\/components\/Investoren\/InvestorAnfrage|src\/components\/Reststrom\/ReststromAnfrage|src\/lib\/plattform\/backend\/demo\.js|src\/lib\/plattform\/backend\/demo\/bo-seed|Backend-Import\/.*anfrage\.py|src\/components\/En\/ContactForm|src\/lib\/anfrage\/|scripts\/plattform-test\.mjs)/, text: "Leads: AT/CH-PLZ und Land bis ins Backend, Flächencheck-Eingaben, Hinweis statt Pflicht-Einwilligung, Telefon nur bei Rückruf, Zähler, Routing je Land" },
  { name: "D", regex: /^(src\/lib\/boerse\/|src\/app\/projektboerse\/|src\/app\/api\/boerse\/|src\/data\/unternehmen\.js|src\/data\/referenzen\.js|src\/app\/impressum\/|src\/app\/barrierefreiheit\/|src\/app\/genossenschaft\/|src\/components\/Reststrom\/Seite\/|src\/app\/(freiflaeche|landwirte|investoren)\/|src\/app\/en\/)/, text: "Ehrlichkeit: keine Testprojekte öffentlich (Seiten, API, Teaser, Sitemap), kein Offer, Claims und Umweltaussagen korrigiert, Genossenschaft in Vorbereitung, Barrierefreiheitserklärung, vollständiges Impressum" },
  { name: "G", regex: /^(src\/data\/regionen\/|src\/content\/ratgeber\/|src\/data\/lexikon\.js|src\/data\/faq\.js|src\/app\/kommunen\/|src\/app\/rechner\/kommune\/|src\/app\/energiegemeinschaften\/page\.js|src\/app\/agri-pv\/|src\/app\/reststrom\/)/, text: "Rechtsaussagen korrigiert (§ 6 EEG, Landesgesetze, AT-Widmung, UVP, Art. 24ter RPG, Solarexpress, GMP) und Fristenkästen EAG/Pronovo/StromVV" },
  { name: "R", regex: /^docs\//, text: "Masterplan DACH und Rechtstexte als Entwürfe zur anwaltlichen Prüfung (nicht freigegeben)" },
];
const DESIGN_TEXT = "Design-Zwischenstand vom 02.10.: Seitenbausteine (Seite/*, Bühnen, Heroes), Animationssystem, Ratgeber- und Rechnerseiten\n\nEnthält in einzelnen Seiten-Dateien bereits Korrekturen aus Welle 1 (Design- und Welle-1-Änderungen liegen dort in derselben Datei).";
const REST_TEXT = "Welle 1 Abnahme: keine öffentlichen Zeitzusagen, Länder-Sperre auf Regionsseiten, Rechtsentwürfe noindex, restliche Reizwörter und übrige Seitenänderungen";

const zuordnung = new Map();
for (const d of dateien) {
  const g = GRUPPEN.find((g) => g.regex.test(d));
  // Paket-Dateien gehen in ihr Paket, auch wenn sie in der Design-Liste stehen; sonst Design-Liste, sonst Rest
  const name = g ? g.name : design.has(d) ? "Design" : "Rest";
  if (!zuordnung.has(name)) zuordnung.set(name, []);
  zuordnung.get(name).push(d);
}
const reihenfolge = ["Design", "F", "I", "A", "B", "E", "C", "D", "G", "Rest", "R"];
for (const n of reihenfolge) console.log(`${n.padEnd(7)} ${String((zuordnung.get(n) || []).length).padStart(4)} Dateien`);
console.log(`gesamt  ${dateien.length}`);
if (!ausfuehren) process.exit(0);

const commit = (name, text) => {
  const liste = zuordnung.get(name) || [];
  if (!liste.length) return;
  writeFileSync(`${REPO}/.git/commit-liste.txt`, liste.join("\n"));
  sh("git add -A --pathspec-from-file=.git/commit-liste.txt");
  writeFileSync(`${REPO}/.git/commit-text.txt`, text + TRAILER);
  sh("git commit -q -F .git/commit-text.txt");
  console.log(`✔ ${name}: ${sh("git log -1 --format=%h").trim()} (${liste.length} Dateien)`);
};

commit("Design", DESIGN_TEXT);
// Paket F mit den Snapshots VOR Paket E, danach Stand nach E zurück (geht mit Commit E)
const SNAP = `${REPO}/test/charakterisierung/snapshots`;
const nachE = `${Q}/QM/snapshots-nachher-E`;
for (const f of readdirSync(`${Q}/E/snapshots-vorher`)) cpSync(`${Q}/E/snapshots-vorher/${f}`, `${SNAP}/${f}`);
commit("F", GRUPPEN.find((g) => g.name === "F").text + "\n\nSnapshots im Stand vor der Zahlenkorrektur (Paket E); Abweichungen folgen begründet im Commit von Paket E.");
for (const f of readdirSync(nachE)) cpSync(`${nachE}/${f}`, `${SNAP}/${f}`);
zuordnung.set("E", [...(zuordnung.get("E") || []), ...readdirSync(nachE).map((f) => `test/charakterisierung/snapshots/${f}`)]);
for (const n of ["I", "A", "B", "E", "C", "D", "G"]) commit(n, GRUPPEN.find((g) => g.name === n).text);
commit("Rest", REST_TEXT);
commit("R", GRUPPEN.find((g) => g.name === "R").text);
console.log("offen danach:", sh("git status --porcelain").trim() || "nichts");
