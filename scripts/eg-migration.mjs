// scripts/eg-migration.mjs – Migration der Energiegemeinschaften aus dem Prototyp (mitglied/gemeinschaft.js) in das neue
// Modell (eg/modell.js). Nur österreichische Gemeinschaften; idempotent über `migriertAus`.
//
//   node scripts/eg-migration.mjs                     # Vorschau aus .data/plattform.json (nur lesen, ändert nichts)
//   node scripts/eg-migration.mjs --datei <pfad>      # Vorschau aus einer anderen Demo-Datei bzw. JSON-Export
//   node scripts/eg-migration.mjs --ausfuehren [url]  # Übernahme über die laufende Plattform (POST /api/admin/eg, Backoffice-Login)
//
// Ausführen schreibt NIE direkt in die Datei (der Dev-Server hält sie unter Sperre), sondern über die API – dort gelten
// Rechte (Bereich „eg“ schreiben) und Protokoll. Frappe: Patch oekoinvest_app.patches.eg_migration_stamm.

import fs from "node:fs";
import path from "node:path";
import { migrationAusPrototyp } from "../src/lib/plattform/eg/migration.js";

const argv = process.argv.slice(2);
const datei = argv.includes("--datei") ? argv[argv.indexOf("--datei") + 1] : path.join(process.cwd(), ".data", "plattform.json");

if (argv.includes("--ausfuehren")) {
  const basis = (argv.find((a) => /^https?:/.test(a)) || "http://localhost:3100").replace(/\/$/, "");
  const email = process.env.EG_MIGRATION_EMAIL || "admin@example.com";
  const passwort = process.env.EG_MIGRATION_PASSWORT || process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
  const kopf = { "Content-Type": "application/json", Origin: basis };
  const login = await fetch(`${basis}/api/auth/login`, { method: "POST", headers: kopf, body: JSON.stringify({ email, passwort }) });
  const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).find((c) => /oi_sitzung=/.test(c));
  if (login.status !== 200 || !cookie) {
    console.error(`Anmeldung fehlgeschlagen (${login.status}).`);
    process.exit(1);
  }
  for (const aktion of ["migration_vorschau", "migration"]) {
    const r = await fetch(`${basis}/api/admin/eg`, { method: "POST", headers: { ...kopf, Cookie: cookie }, body: JSON.stringify({ aktion }) });
    const j = await r.json().catch(() => ({}));
    console.log(`${aktion}: ${r.status}`, JSON.stringify(j.anzahl || j.error || j), (j.warnungen || []).map((w) => `\n  ! ${w}`).join(""));
    if (r.status !== 200) process.exit(1);
  }
  process.exit(0);
}

if (!fs.existsSync(datei)) {
  console.error(`Datei nicht gefunden: ${datei}`);
  process.exit(1);
}
const db = JSON.parse(fs.readFileSync(datei, "utf8"));
const alt = { gemeinschaften: db.mitglied?.gemeinschaften || [], teilnahmen: db.mitglied?.teilnahmen || [] };
let i = 0;
const r = migrationAusPrototyp(alt, {
  neueId: (p) => `${p}-VORSCHAU-${String(++i).padStart(4, "0")}`,
  heute: new Date().toISOString().slice(0, 10),
  vorhanden: db.eg || { gemeinschaften: [] },
  namen: (id) => {
    const u = (db.nutzer || []).find((x) => x.id === id);
    return u ? { vorname: u.vorname || "", nachname: u.nachname || "", email: u.email || "" } : null;
  },
});
console.log(`Vorschau aus ${datei}:`);
console.log(`  ${r.gemeinschaften.length} Gemeinschaft(en), ${r.mitglieder.length} Mitglieder, ${r.zaehlpunkte.length} Zählpunkte, ${r.teilnahmen.length} Teilnahmen, ${r.anlagen.length} Anlagen, ${r.tarife.length} Tarife`);
for (const g of r.gemeinschaften) console.log(`  + ${g.name}: ${g.modell.toUpperCase()}, Zonelevel ${g.zonelevel}, Status ${g.status}, Netzbetreiber ${g.netzbetreiber.join(", ") || "–"}`);
for (const u of r.uebersprungen) console.log(`  – ${u.name}: ${u.grund}`);
for (const w of r.warnungen) console.log(`  ! ${w}`);
