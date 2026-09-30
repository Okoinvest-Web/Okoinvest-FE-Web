// scripts/plattform-test-querschnitt.mjs
//
// Tests „Querschnitt, Leitung“ (Team 10):
//   node scripts/plattform-test-querschnitt.mjs --nur-logik     Teil A: reine Logik + Gleichheit JS/Python (ohne Server)
//   node scripts/plattform-test-querschnitt.mjs [basis-url]      Teil A + B gegen den laufenden Dev-Server (Demo-Backend)
//
// Teil A: Protokollfilter (Bereinigung, Freitext, Zeitraum, Facetten, Seiten), Digest-Text ohne Inhalte, Versionsketten,
//         Dokumentfilter, Kontexthilfe/Handbuch-Rechte; Gleichheit mit plattform/querschnitt_kern.py.
// Teil B: Nachricht mit Anhang (stumm hochgeladen, nur eigener Anhang derselben Unterhaltung, fremder → 403/422),
//         Lesebestätigung, Dokument-Version (Kette, Konflikt bei Doppelersatz), Prüfstatus nur Backoffice (403),
//         Pflichtbegründung, Benachrichtigung des Uploaders, E-Mail-Rhythmus + Digest (keine Inhalte), Protokollsuche
//         (Rechte, Filter, CSV mit Formel-Schutz), Leitungs-Cockpit + Management-Bericht (nur Leitung), erweiterte Suche,
//         Handbuch-Seiten je Rolle, CSRF. Eigene Testkonten mit Präfix „qs-“ (example.com).

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { aufloesungRegistrieren } from "./onboarding-pfade-export.mjs";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NUR_LOGIK = process.argv.includes("--nur-logik");
const BASIS = (process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);

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
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 400)}` : ""}`);
  }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);

// ================================================================ Teil A – Logik

const PROTOKOLL = [
  { id: "A-1", am: "2026-09-01T08:00:00Z", aktion: "upload", objektArt: "flaeche", objektId: "F-26-AAAA", text: "Dokument Lageplan.pdf", nutzer: "Frida Fläche", nutzerId: "U-26-EINS" },
  { id: "A-2", am: "2026-09-10T09:00:00Z", aktion: "status", objektArt: "flaeche", objektId: "F-26-AAAA", text: "Status: Vorprüfung", nutzer: "Anna Admin", nutzerId: "U-26-ADMN" },
  { id: "A-3", am: "2026-09-20T10:00:00Z", aktion: "export", objektArt: "export", objektId: "monatsbericht", text: "Monatsbericht 2026-09 als PDF", nutzer: "Anna Admin", nutzerId: "U-26-ADMN" },
  { id: "A-4", am: "2026-09-25T11:00:00Z", aktion: "upload", objektArt: "projekt", objektId: "P-26-BBBB", text: "Dokument Ertragsgutachten.pdf", nutzer: "Paul Projekt", nutzerId: "U-26-ZWEI" },
];
const FAELLE = [
  {},
  { q: "lageplan" },
  { aktion: "upload" },
  { objektArt: "flaeche", von: "2026-09-05" },
  { nutzer: "admin" },
  { nutzer: "U-26-EINS" },
  { von: "2026-09-10", bis: "2026-09-20" },
  { q: "F-26-AAAA", proSeite: 10, seite: 1 },
  { aktion: "up<script>", von: "gestern", seite: -3, proSeite: 99999 },
];

async function teilA() {
  aufloesungRegistrieren();
  const q = await import(pathToFileURL(path.join(WURZEL, "src/lib/plattform/querschnitt.js")).href);
  const k = await import(pathToFileURL(path.join(WURZEL, "src/lib/plattform/konstanten.js")).href);

  abschnitt("A1. Revisionsprotokoll – Filter");
  let r = q.protokollFiltern(PROTOKOLL, {});
  pruefe(r.gesamt === 4 && r.eintraege[0].id === "A-4", "ohne Filter: alle, neueste zuerst", r.eintraege.map((e) => e.id));
  pruefe(q.protokollFiltern(PROTOKOLL, { q: "lageplan" }).gesamt === 1, "Freitext ohne Groß-/Kleinschreibung");
  pruefe(q.protokollFiltern(PROTOKOLL, { nutzer: "admin" }).gesamt === 2, "Nutzer per Namensteil");
  pruefe(q.protokollFiltern(PROTOKOLL, { nutzer: "U-26-EINS" }).gesamt === 1, "Nutzer per Konto-ID");
  pruefe(q.protokollFiltern(PROTOKOLL, { von: "2026-09-10", bis: "2026-09-20" }).gesamt === 2, "Zeitraum inklusive Grenzen");
  r = q.protokollFiltern(PROTOKOLL, { aktion: "up<script>", von: "gestern", seite: -3, proSeite: 99999 });
  pruefe(r.filter.aktion === "upscript" && r.filter.von === "" && r.filter.seite === 1 && r.filter.proSeite === 200, "Filter werden bereinigt (Positivliste, Grenzen)", r.filter);
  pruefe(q.protokollFiltern(PROTOKOLL, {}).facetten.aktion[0].wert === "upload", "Facetten nach Häufigkeit");
  const viele = Array.from({ length: 120 }, (_, i) => ({ ...PROTOKOLL[0], id: `A-${i}`, am: `2026-09-01T08:${String(i % 60).padStart(2, "0")}:00Z` }));
  r = q.protokollFiltern(viele, { proSeite: 50, seite: 3 });
  pruefe(r.seiten === 3 && r.eintraege.length === 20, "Seiten: 120 Treffer → 3 Seiten, letzte mit 20", { seiten: r.seiten, n: r.eintraege.length });
  pruefe(q.protokollFiltern(viele, { alle: true }).eintraege.length === 120, "alle = true liefert alle Treffer (CSV)");

  abschnitt("A2. Tages-Digest – nur Anzahl, keine Inhalte");
  const d = q.digestText([{ art: "nachricht", titel: "GEHEIM Projekt X" }, { art: "status" }, { art: "nachricht" }], k.BENACHRICHTIGUNG_ARTEN);
  pruefe(d.anzahl === 3 && /3 neue Ereignisse/.test(d.betreff), "Betreff mit Anzahl", d.betreff);
  pruefe(/Neue Nachrichten: 2/.test(d.text) && /Statuswechsel: 1/.test(d.text), "Text zählt je Art", d.text);
  pruefe(!/GEHEIM/.test(d.text + d.betreff), "keine Titel/Inhalte im Digest");
  pruefe(q.DIGEST_AUSNAHMEN.includes("sicherheit"), "Sicherheitsmeldungen nie im Digest");

  abschnitt("A3. Dokumente – Versionen, Filter, Prüfstatus");
  const doks = [
    { id: "D-1", name: "Lageplan.pdf", version: 1, ersetztDurch: "D-2", kategorie: "plan", bezugArt: "flaeche", bezugTitel: "Acker" },
    { id: "D-2", name: "Lageplan.pdf", version: 2, vorgaengerId: "D-1", ersetztDurch: "D-3", kategorie: "plan", bezugArt: "flaeche", bezugTitel: "Acker" },
    { id: "D-3", name: "Lageplan-neu.pdf", version: 3, vorgaengerId: "D-2", kategorie: "plan", bezugArt: "flaeche", bezugTitel: "Acker", freigabe: { status: "freigegeben" } },
    { id: "D-4", name: "Vollmacht.pdf", kategorie: "allgemein", bezugArt: "nutzer" },
  ];
  const akt = q.aktuelleVersionen(doks);
  pruefe(akt.length === 2 && akt[0].id === "D-3" && akt[0].vorversionen === 2, "nur aktuelle Versionen mit Anzahl Vorversionen", akt.map((x) => [x.id, x.vorversionen]));
  pruefe(q.dokumenteFiltern(akt, { q: "vollmacht" }).length === 1 && q.dokumenteFiltern(akt, { freigabe: "freigegeben" }).length === 1 && q.dokumenteFiltern(akt, { freigabe: "eingegangen" })[0].id === "D-4", "Suche und Filter nach Prüfstatus");
  pruefe(q.freigabeVon({}) === "eingegangen" && q.freigabeVon({ freigabe: { status: "boese" } }) === "eingegangen", "unbekannter Status → eingegangen");

  abschnitt("A4. Kontexthilfe & Handbücher");
  pruefe(q.hilfeFuer("/portal/admin/protokoll", ["admin"]).titel === "Revisionsprotokoll", "längster Präfix gewinnt");
  pruefe(q.hilfeFuer("/portal/flaechen/F-26-X", ["flaeche"]).handbuch === "rolle-eigentuemer", "Handbuch je Rolle");
  pruefe(q.hilfeFuer("/portal/admin", ["investor"]).handbuch === "rolle-investor", "Backoffice-Handbuch nie für Externe (Ersatz: eigenes)");
  pruefe(!q.handbuchErlaubt("backoffice-leitung", ["investor"]) && q.handbuchErlaubt("rolle-bank", ["admin"]) && !q.handbuchErlaubt("../../.env", ["admin"]), "Handbuch-Rechte und feste ID-Liste");

  abschnitt("A5. Gleichheit mit Frappe (plattform/querschnitt_kern.py)");
  const code = `
import json, sys
sys.path.insert(0, r"${path.join(WURZEL, "Backend-Import", "oekoinvest_app").replace(/\\/g, "\\\\")}")
from oekoinvest_app.plattform import querschnitt_kern as qk
daten = json.loads(sys.stdin.read())
aus = {"filter": [qk.protokoll_filtern(daten["protokoll"], f) for f in daten["faelle"]], "digest": qk.digest_text(daten["digest"], daten["labels"])}
print(json.dumps(aus))
`;
  const digestEin = [{ art: "nachricht" }, { art: "status" }, { art: "nachricht" }, { art: "termin" }];
  const labels = Object.fromEntries(Object.entries(k.BENACHRICHTIGUNG_ARTEN).map(([a, x]) => [a, x.label]));
  let py = null;
  for (const bin of ["python", "python3", "py"]) {
    try {
      py = JSON.parse(execFileSync(bin, ["-c", code], { input: JSON.stringify({ protokoll: PROTOKOLL, faelle: FAELLE, digest: digestEin, labels }), encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }));
      break;
    } catch {
      py = null;
    }
  }
  if (!py) {
    console.log("  (Python nicht verfügbar – Gleichheitsprüfung übersprungen)");
    return;
  }
  const js = FAELLE.map((f) => q.protokollFiltern(PROTOKOLL, f));
  FAELLE.forEach((f, i) => {
    const a = js[i];
    const b = py.filter[i];
    pruefe(a.gesamt === b.gesamt && JSON.stringify(a.eintraege.map((e) => e.id)) === JSON.stringify(b.eintraege.map((e) => e.id)) && JSON.stringify(a.filter) === JSON.stringify(b.filter) && JSON.stringify(a.facetten) === JSON.stringify(b.facetten), `Filter ${JSON.stringify(f)} identisch`, { js: a.filter, py: b.filter });
  });
  const dj = q.digestText(digestEin, k.BENACHRICHTIGUNG_ARTEN);
  pruefe(dj.text === py.digest.text && dj.betreff === py.digest.betreff, "Digest-Text identisch", { js: dj.text, py: py.digest.text });
}

// ================================================================ Teil B – gegen den Server

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }
  async anfrage(methode, pfad, body, { origin = BASIS, kopf = {}, roh = false } = {}) {
    const headers = { ...kopf };
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    let payload = body;
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] ||= "application/json";
      payload = typeof body === "string" ? body : JSON.stringify(body);
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
    if (roh) return res;
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 300) };
    }
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
  async registrieren(praefix, rollen) {
    const r = await this.post("/api/auth/registrieren", { email: `qs-${praefix}-${LAUF}@example.com`, passwort: "Qs-Passwort-2026", vorname: "Qs", nachname: `${praefix} ${LAUF}`, rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${praefix} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
  async hochladen(pfad, { name = "test.pdf", felder = {} } = {}) {
    const fd = new FormData();
    fd.append("datei", new Blob([Buffer.from(`%PDF-1.4\n% qs-test ${LAUF} ${name}\n%%EOF\n`)], { type: "application/pdf" }), name);
    for (const [k, w] of Object.entries(felder)) fd.append(k, w);
    return this.anfrage("POST", pfad, fd, { kopf: { "X-Plattform-Upload": "1" } });
  }
}

async function teilB() {
  const eigen = new Client("eigentümer");
  const fremd = new Client("fremd");
  const admin = new Client("admin");
  const lesen = new Client("bo-lesen");
  const akquise = new Client("bo-akquise");
  const eigenNutzer = await eigen.registrieren("eigen", ["flaeche"]);
  await fremd.registrieren("fremd", ["flaeche"]);
  await admin.login("admin@example.com");
  await lesen.login("bo-lesen@example.com");
  await akquise.login("bo-akquise@example.com");
  let r;

  abschnitt("B1. Nachrichten – Anhang & Lesebestätigung");
  const thread = { bezugArt: "nutzer", bezugId: eigenNutzer.id };
  r = await eigen.hochladen("/api/portal/dokumente", { name: "Vollmacht.pdf", felder: { ...thread, kategorie: "allgemein", anhang: "1" } });
  pruefe(r.status === 200 && r.json.dokument?.id, "Anhang hochladen (stumm)", r.json);
  const anhangId = r.json.dokument?.id;
  r = await eigen.get(`/api/portal/nachrichten?bezug=nutzer:${eigenNutzer.id}`);
  pruefe(r.status === 200 && !(r.json.thread?.nachrichten || []).some((m) => /Dokument hochgeladen/.test(m.text)), "stummer Upload erzeugt keine Systemnachricht", r.json.thread?.nachrichten);
  r = await eigen.post("/api/portal/nachrichten", { ...thread, text: "Anbei die Vollmacht", anhaenge: [anhangId] });
  pruefe(r.status === 200, "Nachricht mit Anhang senden", r.json);
  r = await fremd.post("/api/portal/nachrichten", { bezugArt: "nutzer", bezugId: eigenNutzer.id, text: "Fremder Versuch", anhaenge: [anhangId] });
  pruefe([403, 404].includes(r.status), "fremder Thread → 403/404", r.status);
  const fremdNutzer = (await fremd.get("/api/auth/ich")).json?.nutzer;
  if (fremdNutzer?.id) {
    r = await fremd.post("/api/portal/nachrichten", { bezugArt: "nutzer", bezugId: fremdNutzer.id, text: "Mit fremdem Anhang", anhaenge: [anhangId] });
    pruefe(r.status === 422, "fremder Anhang im eigenen Thread → 422", r.status);
  }
  r = await eigen.get(`/api/portal/nachrichten?bezug=nutzer:${eigenNutzer.id}`);
  let m = (r.json.thread?.nachrichten || []).find((x) => x.text === "Anbei die Vollmacht");
  pruefe(m?.anhaenge?.length === 1 && m.anhaenge[0].id === anhangId && m.gelesen === false, "Anhang sichtbar, noch nicht gelesen", m);
  r = await admin.get(`/api/portal/nachrichten?bezug=nutzer:${eigenNutzer.id}`);
  pruefe(r.status === 200 && (r.json.thread?.nachrichten || []).some((x) => x.anhaenge?.length === 1), "Backoffice sieht den Anhang");
  r = await eigen.get(`/api/portal/nachrichten?bezug=nutzer:${eigenNutzer.id}`);
  m = (r.json.thread?.nachrichten || []).find((x) => x.text === "Anbei die Vollmacht");
  pruefe(m?.gelesen === true, "nach Öffnen durch das Backoffice: gelesen", m);
  r = await fremd.get(`/api/portal/dokumente/${anhangId}`, { roh: true });
  pruefe([403, 404].includes(r.status), "fremder Download des Anhangs → 403/404", r.status);

  abschnitt("B2. Dokumente – Versionen & Prüfstatus");
  r = await eigen.hochladen(`/api/portal/querschnitt/dokumente/${anhangId}/version`, { name: "Vollmacht-v2.pdf" });
  pruefe(r.status === 200 && r.json.dokument?.version === 2 && r.json.dokument?.vorgaengerId === anhangId, "neue Version 2 mit Vorgänger", r.json);
  const v2 = r.json.dokument?.id;
  r = await eigen.hochladen(`/api/portal/querschnitt/dokumente/${anhangId}/version`, { name: "doppelt.pdf" });
  pruefe(r.status === 409, "alte Version erneut ersetzen → 409", r.status);
  r = await fremd.hochladen(`/api/portal/querschnitt/dokumente/${v2}/version`, { name: "fremd.pdf" });
  pruefe([403, 404].includes(r.status), "fremde Version → 403/404", r.status);
  r = await eigen.hochladen(`/api/portal/querschnitt/dokumente/${v2}/version`, { name: "x.pdf" }, {});
  const v3 = r.json.dokument?.id;
  r = await eigen.get(`/api/portal/querschnitt/dokumente/${v3}/versionen`);
  pruefe(r.status === 200 && r.json.versionen?.map((x) => x.version).join(",") === "1,2,3", "Versionskette 1,2,3", r.json.versionen?.map((x) => x.version));
  r = await fremd.get(`/api/portal/querschnitt/dokumente/${v3}/versionen`);
  pruefe([403, 404].includes(r.status), "fremde Versionskette → 403/404", r.status);
  r = await eigen.post(`/api/portal/querschnitt/dokumente/${v3}/freigabe`, { status: "freigegeben" });
  pruefe(r.status === 403, "Nutzer darf nicht freigeben → 403", r.status);
  r = await lesen.post(`/api/portal/querschnitt/dokumente/${v3}/freigabe`, { status: "freigegeben" });
  pruefe(r.status === 403, "Backoffice „Nur lesen“ → 403", r.status);
  r = await admin.post(`/api/portal/querschnitt/dokumente/${v3}/freigabe`, { status: "abgelehnt", kommentar: "" });
  pruefe(r.status === 422, "Ablehnung ohne Begründung → 422", r.status);
  r = await admin.post(`/api/portal/querschnitt/dokumente/${v3}/freigabe`, { status: "abgelehnt", kommentar: "Unterschrift fehlt auf Seite 2" });
  pruefe(r.status === 200 && r.json.dokument?.freigabe?.status === "abgelehnt", "Backoffice setzt „Nachbesserung nötig“", r.json);
  r = await eigen.get("/api/portal/benachrichtigungen");
  pruefe((r.json.eintraege || []).some((b) => /Nachbesserung/i.test(b.titel)), "Uploader wird benachrichtigt", r.json.eintraege?.slice?.(0, 2));
  r = await admin.post(`/api/portal/querschnitt/dokumente/${v3}/freigabe`, { status: "freigegeben" }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "Freigabe mit fremder Herkunft → 403 (CSRF)", r.status);

  abschnitt("B3. Benachrichtigungen – Rhythmus & Tages-Digest");
  r = await eigen.put("/api/portal/querschnitt/rhythmus", { rhythmus: "stündlich" });
  pruefe(r.status === 422, "ungültiger Rhythmus → 422", r.status);
  r = await eigen.put("/api/portal/querschnitt/rhythmus", { rhythmus: "taeglich" });
  pruefe(r.status === 200 && r.json.rhythmus === "taeglich", "Tages-Digest aktivieren", r.json);
  r = await admin.post("/api/portal/nachrichten", { ...thread, text: `Vertraulich-${LAUF}: Antwort des Backoffice` });
  pruefe(r.status === 200, "Backoffice schreibt (Ereignis wird vorgemerkt)");
  r = await eigen.get("/api/portal/querschnitt/rhythmus");
  pruefe(r.status === 200 && r.json.vorgemerkt >= 1, "Ereignis für den Digest vorgemerkt", r.json);
  r = await akquise.post("/api/admin/leitung/digest", { erzwingen: true });
  pruefe(r.status === 403, "Digest-Lauf nur Leitung (Akquise → 403)", r.status);
  r = await admin.post("/api/admin/leitung/digest", { erzwingen: true });
  pruefe(r.status === 200 && r.json.mails >= 1, "Leitung versendet den Digest", r.json);
  r = await admin.get("/api/admin/postausgang?limit=50");
  const mail = (r.json.postausgang || r.json.eintraege || r.json.mails || []).find?.((x) => x.an === eigenNutzer.email && x.art === "digest");
  pruefe(!!mail && !mail.text.includes(`Vertraulich-${LAUF}`) && /Neue Nachrichten: \d/.test(mail.text), "Digest-Mail ohne Inhalte, mit Anzahl", mail || Object.keys(r.json));
  r = await eigen.get("/api/portal/querschnitt/rhythmus");
  pruefe(r.json.vorgemerkt === 0, "nach dem Lauf nichts mehr vorgemerkt", r.json);
  await eigen.put("/api/portal/querschnitt/rhythmus", { rhythmus: "sofort" });

  abschnitt("B4. Revisionsprotokoll – Suche & CSV");
  r = await eigen.get("/api/admin/protokoll/suche?q=Vollmacht");
  pruefe(r.status === 403, "Suche nur Backoffice → 403", r.status);
  r = await admin.get(`/api/admin/protokoll/suche?q=Vollmacht-v2&aktion=version`);
  pruefe(r.status === 200 && r.json.gesamt >= 1 && r.json.eintraege.every((e) => e.aktion === "version"), "Suche nach Text + Aktion", { gesamt: r.json.gesamt });
  r = await admin.get(`/api/admin/protokoll/suche?nutzer=${eigenNutzer.id}&proSeite=10`);
  pruefe(r.status === 200 && r.json.gesamt >= 2 && r.json.eintraege.every((e) => e.nutzerId === eigenNutzer.id), "Suche nach Konto-ID", { gesamt: r.json.gesamt });
  r = await admin.get(`/api/admin/protokoll/suche?q=Vollmacht&format=csv`, { roh: true });
  const csvText = await r.text();
  pruefe(r.status === 200 && (r.headers.get("content-type") || "").includes("text/csv") && csvText.startsWith("﻿") && csvText.includes(";"), "CSV-Export (BOM, Semikolon)", csvText.slice(0, 80));
  r = await lesen.get("/api/admin/protokoll/suche?q=x");
  pruefe(r.status === 200, "„Nur lesen“ darf suchen", r.status);

  abschnitt("B5. Leitungs-Cockpit & Management-Bericht");
  r = await admin.get("/portal/admin/leitung", { roh: true });
  const html = await r.text();
  pruefe(r.status === 200 && html.includes("Leitungs-Cockpit") && html.includes("Gesicherte Fläche"), "Cockpit für Leitung", r.status);
  r = await akquise.get("/portal/admin/leitung", { roh: true });
  const htmlA = await r.text();
  pruefe(!htmlA.includes("Gesicherte Fläche"), "Cockpit nicht für Akquise (404-Inhalt)", r.status);
  r = await admin.get("/api/admin/leitung/bericht?monat=2026-09", { roh: true });
  const pdf = Buffer.from(await r.arrayBuffer());
  pruefe(r.status === 200 && pdf.subarray(0, 5).toString() === "%PDF-" && pdf.length > 2000, "Management-Bericht als PDF", { status: r.status, bytes: pdf.length });
  r = await admin.get("/api/admin/leitung/bericht?monat=2026-13");
  pruefe(r.status === 422, "ungültiger Monat → 422", r.status);
  r = await akquise.get("/api/admin/leitung/bericht?monat=2026-09");
  pruefe(r.status === 403, "Bericht nur Leitung (Akquise → 403)", r.status);
  r = await admin.get("/api/admin/protokoll/suche?q=Management-Bericht&aktion=export");
  pruefe(r.json.gesamt >= 1, "Abruf des Berichts protokolliert", r.json.gesamt);

  abschnitt("B6. Globale Suche (erweitert), Handbuch, Hilfe");
  r = await eigen.get("/api/portal/suche?q=Vollmacht");
  pruefe(r.status === 200 && r.json.treffer.some((t) => t.art === "dokument") && r.json.treffer.every((t) => /^\/portal/.test(t.href)), "eigene Dokumente in der Suche", r.json.treffer?.map((t) => t.art));
  r = await fremd.get("/api/portal/suche?q=Vollmacht");
  pruefe(!r.json.treffer.some((t) => t.art === "dokument" && t.id === v3), "fremde Dokumente nie in der Suche");
  r = await admin.get("/api/portal/suche?q=Logistik");
  pruefe(r.status === 200 && r.json.treffer.every((t) => /^\/portal/.test(t.href)), "Backoffice-Suche nur Portal-Pfade", r.json.treffer?.map((t) => t.art));
  r = await eigen.get("/portal/hilfe/handbuch/rolle-eigentuemer", { roh: true });
  pruefe(r.status === 200 && (await r.text()).includes("Eigentümer"), "Handbuch der eigenen Rolle", r.status);
  r = await eigen.get("/portal/hilfe/handbuch/backoffice-leitung", { roh: true });
  pruefe(!(await r.text()).includes("Tagesroutine"), "Backoffice-Handbuch nicht für Externe");
  r = await eigen.get("/portal/dokumente?q=Vollmacht", { roh: true });
  pruefe(r.status === 200, "Dokumente-Seite mit Suche", r.status);
  r = await admin.get("/portal/admin/protokoll?q=Vollmacht&aktion=version", { roh: true });
  pruefe(r.status === 200 && (await r.text()).includes("Treffer"), "Protokoll-Seite mit Suche", r.status);
}

async function main() {
  console.log(`Querschnitt & Leitung – ${NUR_LOGIK ? "nur Logik" : `Test gegen ${BASIS}`} (Lauf ${LAUF})`);
  await teilA();
  if (!NUR_LOGIK) await teilB();
  console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(1);
});
