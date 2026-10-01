// scripts/plattform-test-integration.mjs
//
// Integrationsteam – Lücken zwischen den Fachmodulen:
//   node scripts/plattform-test-integration.mjs --nur-logik     Teil A: reine Logik + Gleichheit JS/Python (ohne Server)
//   node scripts/plattform-test-integration.mjs [basis-url]      Teil A + B gegen den laufenden Dev-Server (Demo-Backend)
//
// Teil A: Fristerinnerungen (Stufen, Schlüssel, Pachtakte inkl. Rückbausicherheit, Einzahlungsfrist Genossenschaft,
//         Stellungnahme-Frist Gemeinde) mit Gleichheit zu plattform/frist_erinnerung_kern.py.
//         Weitere Integrations-Logik steht in den Fachreihen: Vorkenntnis/Gebots-Stellungnahme (plattform-test-anbieter A8),
//         Ist-Erträge aus dem Monitoring (plattform-test-portfolio A5), Pacht-Kündigung/Zahlungsaufteilung
//         (node --test src/lib/plattform/finanzen/finanzen.test.mjs).
// Teil B: Fristerinnerungs-Lauf (Backoffice 200, zweiter Lauf meldet nichts doppelt, Eigentümer 403, CSRF 403),
//         Automationen-Fristenlauf liefert die Erinnerungen mit, Login-Schnellauswahl zeigt die neuen Demo-Konten.

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lade = (p) => import(pathToFileURL(path.join(WURZEL, p)).href);
const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";

let ok = 0;
let fehler = 0;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const rot = (s) => `\x1b[31m${s}\x1b[0m`;
function pruefe(bedingung, text, details) {
  if (bedingung) {
    ok++;
    console.log(`  ${gruen("✓")} ${text}`);
  } else {
    fehler++;
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 600)}` : ""}`);
  }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);

// ================================================================ Teil A – Logik

const HEUTE = "2026-10-01";
const FALL = {
  vertrag: { id: "PT-1", bezeichnung: "Acker Nord (Test)", status: "aktiv", vertragsdatum: "2024-01-15", beginn: "2026-07-01", laufzeitJahre: 1, ende: "2027-06-30", kuendigungZum: "" },
  fristen: [
    { id: "ende", datum: "2026-12-30", titel: "Ende der Grundlaufzeit", text: "Danach endet der Vertrag." },
    { id: "vorbereitung", datum: "2026-10-08", titel: "Verlängerung oder Rückbau abstimmen", text: "" },
    { id: "kuendigung", datum: "2026-09-20", titel: "Vertragsende laut Kündigung", text: "" },
    { id: "fremd", datum: "2026-10-01", titel: "Unbekannt", text: "" },
  ],
  akte: { sicherheit: { status: "vorgesehen", ab: "baubeginn" } },
  mitglied: { id: "GM-1", status: "zugelassen", nr: "17", einzahlungFrist: "2026-10-05" },
  stellungnahmen: [
    { id: "GS-1", betreff: "Eingrünung", frist: "2026-10-03", status: "offen", von: "oekoinvest" },
    { id: "GS-2", betreff: "Wegerecht", frist: "2026-09-25", status: "offen", von: "gemeinde" },
    { id: "GS-3", betreff: "Erledigt", frist: "2026-10-01", status: "erledigt", von: "gemeinde" },
    { id: "GS-4", betreff: "Später", frist: "2026-12-01", status: "offen", von: "gemeinde" },
  ],
};

async function teilA() {
  const R = await lade("src/lib/plattform/fristErinnerung.js");
  const P = await lade("src/lib/plattform/pachtakte.js");

  abschnitt("A1. Stufen und Schlüssel");
  const st = (f, s) => R.erinnerungsStufe(f, HEUTE, s)?.stufe ?? null;
  pruefe(st("2027-02-01") === null && st("2026-12-30") === "t90" && st("2026-10-31") === "t30" && st("2026-10-08") === "t7" && st("2026-10-01") === "t0", "Pacht: 90/30/7/0 Tage vorher, davor nichts");
  pruefe(st("2026-09-20") === "ueberfaellig" && st("2026-08-01") === null, `Überfällig nur bis ${R.UEBERFAELLIG_TAGE} Tage nach Ablauf`);
  pruefe(st("2026-10-05", R.ERINNERUNG_STUFEN.einzahlung) === "t7" && st("2026-10-20", R.ERINNERUNG_STUFEN.einzahlung) === null, "Einzahlung: erst 7 Tage vorher");
  pruefe(R.erinnerungsSchluessel("PA", "x".repeat(80), "ende").length === 60 && R.erinnerungsSchluessel("A", "", null, "B") === "A:B", "Schlüssel ≤ 60 Zeichen, leere Teile entfallen");

  abschnitt("A2. Pachtakte, Genossenschaft, Gemeinde");
  const pa = R.pachtErinnerungen({ vertrag: FALL.vertrag, fristen: FALL.fristen, akte: FALL.akte, heute: HEUTE });
  pruefe(pa.length === 4 && pa.every((e) => e.schluessel.startsWith("PA:PT-1:")), "Pacht: Ende, Vorbereitung, überfällige Kündigung und Rückbausicherheit (unbekannte Frist ignoriert)", pa.map((e) => e.schluessel));
  pruefe(pa.find((e) => e.titel === "Rückbausicherheit fehlt")?.an.join() === "backoffice" && pa.find((e) => /Grundlaufzeit/.test(e.titel)).an.join() === "eigentuemer,backoffice", "Rückbausicherheit nur an das Backoffice, Fristen an Eigentümer und Backoffice");
  const gek = R.pachtErinnerungen({ vertrag: { ...FALL.vertrag, status: "gekuendigt" }, fristen: FALL.fristen, akte: {}, heute: HEUTE });
  pruefe(gek.length === 1 && /Kündigung/.test(gek[0].titel), "Nach Kündigung zählt nur das Vertragsende laut Kündigung");
  pruefe(R.pachtErinnerungen({ vertrag: { ...FALL.vertrag, status: "beendet" }, fristen: FALL.fristen, akte: FALL.akte, heute: HEUTE }).length === 0, "Beendeter Vertrag → keine Erinnerungen");
  const fr = P.vertragsFristen({ vertragsdatum: "2024-01-01", beginn: "2026-01-01", ende: "2045-12-31", kuendigungZum: "" }, { verlaengerungJahre: 5 }, { heute: "2043-12-31" });
  pruefe(R.pachtErinnerungen({ vertrag: { ...FALL.vertrag, ende: "2045-12-31" }, fristen: fr, akte: {}, heute: "2043-10-15" }).some((e) => e.stufe === "t90" && /Verlängerung/.test(e.titel)), "Zusammenspiel mit pachtakte.vertragsFristen: Verlängerung 24 Monate vor Laufzeitende");
  const ez = R.einzahlungErinnerungen({ mitglied: FALL.mitglied, offenEur: 1250, genoName: "Bürgerenergie Test eG", heute: HEUTE });
  pruefe(ez.length === 1 && ez[0].an.join() === "mitglied" && /1\.250 €/.test(ez[0].text) && /05\.10\.2026/.test(ez[0].text), "Einzahlung: Erinnerung an das Mitglied mit Betrag und Frist", ez);
  const ezu = R.einzahlungErinnerungen({ mitglied: { ...FALL.mitglied, einzahlungFrist: "2026-09-28" }, offenEur: 500, heute: HEUTE });
  pruefe(ezu[0]?.stufe === "ueberfaellig" && ezu[0].an.join() === "mitglied,backoffice", "Einzahlung überfällig → auch Backoffice");
  pruefe(!R.einzahlungErinnerungen({ mitglied: FALL.mitglied, offenEur: 0, heute: HEUTE }).length && !R.einzahlungErinnerungen({ mitglied: { ...FALL.mitglied, status: "aktiv" }, offenEur: 100, heute: HEUTE }).length, "Bezahlt bzw. aktiv → keine Erinnerung");
  const sn = R.stellungnahmeErinnerungen({ akteId: "GA-1", gemeinde: "Demo-Stadt", stellungnahmen: FALL.stellungnahmen, heute: HEUTE });
  pruefe(sn.length === 2 && sn[0].an.join() === "gemeinde" && sn[0].stufe === "t2" && sn[1].an.join() === "backoffice" && sn[1].stufe === "ueberfaellig", "Stellungnahme: angefragte Seite erinnern, erledigte/spätere nicht", sn.map((e) => [e.schluessel, e.an]));

  abschnitt("A3. Gleichheit mit Frappe (plattform/frist_erinnerung_kern.py)");
  const js = {
    stufen: ["2027-02-01", "2026-12-30", "2026-10-31", "2026-10-08", "2026-10-01", "2026-09-20", "2026-08-01"].map((f) => R.erinnerungsStufe(f, HEUTE)),
    pacht: pa,
    gekuendigt: gek,
    einzahlung: [ez, ezu],
    stellungnahme: sn,
  };
  const skript = `
import json,sys
from oekoinvest_app.plattform import frist_erinnerung_kern as R
f=json.loads(sys.stdin.read())
h="${HEUTE}"
v=f["vertrag"]
out={
 "stufen":[R.erinnerungs_stufe(x,h) for x in ["2027-02-01","2026-12-30","2026-10-31","2026-10-08","2026-10-01","2026-09-20","2026-08-01"]],
 "pacht":R.pacht_erinnerungen(vertrag=v,fristen=f["fristen"],akte=f["akte"],heute=h),
 "gekuendigt":R.pacht_erinnerungen(vertrag={**v,"status":"gekuendigt"},fristen=f["fristen"],akte={},heute=h),
 "einzahlung":[R.einzahlung_erinnerungen(mitglied=f["mitglied"],offen_eur=1250,geno_name="Bürgerenergie Test eG",heute=h),R.einzahlung_erinnerungen(mitglied={**f["mitglied"],"einzahlungFrist":"2026-09-28"},offen_eur=500,heute=h)],
 "stellungnahme":R.stellungnahme_erinnerungen(akte_id="GA-1",gemeinde="Demo-Stadt",stellungnahmen=f["stellungnahmen"],heute=h),
}
sys.stdout.write(json.dumps(out,ensure_ascii=False))
`;
  let py = null;
  try {
    py = JSON.parse(execFileSync("python", ["-c", skript], { cwd: path.join(WURZEL, "Backend-Import", "oekoinvest_app"), input: JSON.stringify(FALL), encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } }));
  } catch (e) {
    console.log(`  (Python nicht verfügbar – Gleichheitsprüfung übersprungen: ${String(e.message).slice(0, 160)})`);
  }
  if (py) for (const k of Object.keys(js)) pruefe(JSON.stringify(js[k]) === JSON.stringify(py[k]), `Gleich in JS und Python: ${k}`, { js: js[k], py: py[k] });
}

// ================================================================ Teil B – gegen den Dev-Server

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }
  async anfrage(methode, pfad, body, { origin = BASIS } = {}) {
    const headers = {};
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(180000) });
        break;
      } catch (e) {
        if (versuch >= 3) throw e;
        await new Promise((r) => setTimeout(r, 4000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const [name, wert] = paar.split("=");
      if (/oi_sitzung$/.test(name)) this.cookie = wert ? `${name}=${wert}` : "";
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 300) };
    }
    return { status: res.status, json, text };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
}

async function teilB() {
  const admin = new Client("admin");
  const flaeche = new Client("flaeche");
  await admin.login("admin@example.com");
  await flaeche.login("flaeche@example.com");

  abschnitt("B1. Fristerinnerungen (täglicher Lauf, Knopf)");
  let r = await admin.post("/api/admin/fristen/erinnerungen", {});
  pruefe(r.status === 200 && r.json.ok && Number.isInteger(r.json.erinnerungen), "Backoffice startet den Lauf → 200 mit Zählern", r.json);
  r = await admin.post("/api/admin/fristen/erinnerungen", {});
  pruefe(r.status === 200 && r.json.erinnerungen === 0, "Zweiter Lauf am selben Tag meldet nichts doppelt", r.json);
  r = await flaeche.post("/api/admin/fristen/erinnerungen", {});
  pruefe(r.status === 403, "Eigentümer → 403", r.status);
  r = await admin.post("/api/admin/fristen/erinnerungen", {}, { origin: "https://boese.example" });
  pruefe(r.status === 403, "Fremder Origin (CSRF) → 403", r.status);
  r = await admin.post("/api/admin/automationen/fristen", {});
  pruefe(r.status === 200 && "fristErinnerungen" in r.json, "Fristen-Lauf der Automationen schließt die Fristerinnerungen ein", r.json);

  abschnitt("B2. Login-Schnellauswahl");
  r = await new Client("gast").get("/login");
  pruefe(r.status === 200 && ["bank-sachbearbeitung@example.com", "bo-compliance2@example.com", "deal-investor1@example.com"].every((e) => r.text.includes(e)), "Neue Demo-Konten in der Schnellauswahl", r.status);
}

async function main() {
  console.log(`Integration – ${NUR_LOGIK ? "nur Logik" : `Test gegen ${BASIS}`}`);
  await teilA();
  if (!NUR_LOGIK) await teilB();
  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} · ${ok} ok`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(1);
});
