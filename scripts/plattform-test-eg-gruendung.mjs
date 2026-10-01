// scripts/plattform-test-eg-gruendung.mjs
//
// Test WP5 „Energiegemeinschaften – Gründungsdienstleistung, Wechsel, Vereinsorganisation, Förder-Check, Lieferantenpflichten“:
// reine Logik (Node, ohne Server) + End-to-End gegen den laufenden Dev-Server (Demo-Backend).
//   node scripts/plattform-test-eg-gruendung.mjs [basis-url]      (--nur-logik: ohne Server)
//
// Logik: Testvektoren JS = Datei (Python rechnet dieselbe Datei nach: tests/test_eg_gruendung_kern.py), Schritte je Rechtsform,
// Fristen (VerG § 13, ElWG § 70 Abs. 6), Statuspfad, Lieferantenpflichten (> 100 kW bzw. > 30 kW Haushalte), Umstellungsplan,
// Import (Anbieter-Erkennung, Plausibilität), alle Vorlagen ohne offene Platzhalter mit MUSTER-Hinweis, Förder-Programme mit Quelle
// und Stand, Frappe-Adapter/API vollständig (jede Methode prüft den Nutzer, kein allow_guest), Tailwind-Falle in eigenen Dateien.
// API: Anfrage (Auftraggeber) → fremd 404 → Angebot → Annahme → Schritte (Zuständigkeit, Nachweis) → Gemeinschaft anlegen →
// Schritt mit Stammdaten-Wirkung → Muster-PDF (Vorschau, Version, unverändert) → Förder-Check → Wechsel-Import (Vorschau,
// Ausführen) → Verein (Organ-Sicht, Mitglied ohne Entwürfe, fremd 404) → Auflösung lesen → CSRF → Seiten.
// Eigene Daten: Auftrag/Gemeinschaft „Test-EG <Lauf> (Test)“.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as GR from "../src/lib/plattform/eg/gruendung.js";
import * as W from "../src/lib/plattform/eg/wechsel.js";
import { VORLAGEN, dokumentDaten, vorlageRendern, MUSTER_HINWEIS } from "../src/lib/plattform/eg/vertraege.js";
import { statutenEingaben, statutenPruefen } from "../src/lib/plattform/eg/statuten.js";
import { FOERDER_PROGRAMME, foerderCheck } from "../src/lib/plattform/eg/foerder.js";
import { lieferantenpflichten } from "../src/lib/plattform/eg/lieferantenpflichten.js";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASIS = (process.argv.find((a) => /^https?:/.test(a)) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const NUR_LOGIK = process.argv.includes("--nur-logik");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const H = "2026-10-01";
const APP = path.join(WURZEL, "Backend-Import", "oekoinvest_app");
const PY = path.join(APP, "oekoinvest_app", "plattform");
let ok = 0;
let fehler = 0;
const gruen = (s) => `\x1b[32m${s}\x1b[0m`;
const rot = (s) => `\x1b[31m${s}\x1b[0m`;
function pruefe(bedingung, text, details) {
  if (bedingung) { ok++; console.log(`  ${gruen("✓")} ${text}`); } else { fehler++; console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 500)}` : ""}`); }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);
const wirft = (fn, status) => { try { fn(); return false; } catch (e) { return status ? e.status === status : true; } };
const lesen = (p) => fs.readFileSync(path.join(WURZEL, p), "utf8");

// ================================================================ Logik

function logik() {
  abschnitt("L1. Testvektoren und Python-Spiegel");
  let r;
  try { execFileSync(process.execPath, ["--no-warnings", path.join(WURZEL, "scripts", "eg-gruendung-export.mjs"), "--pruefen"], { stdio: "pipe" }); r = true; } catch (e) { r = String(e.stdout || e.stderr || e.message); }
  pruefe(r === true, "JS-Regeln liefern exakt die Testvektoren und eg_gruendung_daten.json ist aktuell", r);
  for (const py of ["python", "python3", "py"]) {
    try {
      const aus = execFileSync(py, ["-m", "unittest", "oekoinvest_app.plattform.tests.test_eg_gruendung_kern"], { cwd: APP, stdio: "pipe", encoding: "utf8" });
      r = true;
      void aus;
      break;
    } catch (e) {
      r = e.code === "ENOENT" ? "kein Python" : String(e.stderr || e.stdout || e.message).slice(-800);
      if (e.code !== "ENOENT") break;
    }
  }
  pruefe(r === true, "Python eg_gruendung_kern.py = JS (alle Vektoren, Vorlagen-Prüfsummen, Fachprüfungen)", r);

  abschnitt("L2. Gründungsfahrplan je Rechtsform, Fristen, Status");
  const a = GR.auftragBereinigen({ paket: "gruendung", arbeitsname: "Test EG", plz: "5121", modell: "eeg" });
  const s = (x) => GR.schritteErzeugen(x).map((y) => y.schluessel);
  pruefe(s(a).includes("vereinsanzeige") && s(a).includes("zvr") && !s(a).includes("firmenbuch"), "Verein: Vereinsanzeige und ZVR, kein Firmenbuch");
  pruefe(s({ ...a, rechtsform: "egen" }).includes("revisionsverband") && s({ ...a, rechtsform: "egen" }).includes("firmenbuch"), "eGen: Revisionsverband und Firmenbuch");
  pruefe(!s({ ...a, modell: "gea", rechtsform: "keine" }).includes("statuten") && s({ ...a, modell: "gea", rechtsform: "keine" }).includes("gea_vertraege"), "GEA ohne Rechtsperson: Verträge statt Statuten");
  const sch = [{ schluessel: "vereinsanzeige", status: "erledigt", datum: "2026-09-18" }, { schluessel: "zvr", status: "wartet_extern" }];
  pruefe(GR.schrittFrist(sch[1], sch, { paket: "gruendung", auftragAm: "2026-09-01" }) === "2026-10-16", "ZVR-Frist 4 Wochen nach Anzeige (VerG § 13)");
  const nb = { schluessel: "nb_auskunft", status: "in_arbeit", gestartetAm: H };
  pruefe(GR.schrittFrist(nb, [nb], { paket: "gruendung" }) === "2026-10-15", "Netzbetreiber-Auskunft 14 Tage (ElWG § 70 Abs. 6)");
  pruefe(GR.statusPfad("interesse", "marktpartner").join(">") === "in_gruendung>rechtsperson>marktpartner" && GR.statusPfad("aktiv", "in_gruendung").length === 0, "Statuspfad nur über erlaubte Übergänge");
  pruefe(wirft(() => GR.auftragUebergang({ status: "anfrage" }, "annehmen")), "Annahme ohne Angebot abgelehnt");
  const g = GR.gemeinschaftAusAuftrag({ ...a, id: "EGA-1" });
  pruefe(g.gruendungsauftragId === "EGA-1" && g.zonelevel === 3 && g.dienstleistung.aktiv === false, "Gemeinschaft aus Auftrag: Rückverweis, Zonelevel-Vorschlag, Organisator erst nach Vollmacht");

  abschnitt("L3. Lieferantenpflichten, Wechsel, Förder-Check");
  pruefe(lieferantenpflichten({ anlagen: [{ art: "pv", kwp: 101, status: "aktiv" }], heute: H }).pflicht && !lieferantenpflichten({ anlagen: [{ art: "pv", kwp: 100, status: "aktiv" }], heute: H }).pflicht, "Lieferantenpflichten ab > 100 kW");
  const p = W.umstellungsplan({ stichtag: "2026-12-15", heute: H });
  pruefe(p.stichtag === "2027-01-01" && p.letzteAltabrechnung === "2026-12", "Stichtag auf Monatsersten, letzte Altabrechnung Dezember", p);
  const t = W.tabelleLesen("Mitgliedsnummer;Vorname;Nachname;Zählpunktbezeichnung;Energierichtung;Teilnahmefaktor;Tarifgruppe;Teilnehmerstatus\n1;A;B;AT0030000000000000000000000000001;Bezug;150;Standard;aktiv\n");
  pruefe(W.anbieterErkennen(t.kopfNorm).anbieter === "energiedigital", "Export energiedigital erkannt", W.anbieterErkennen(t.kopfNorm));
  const pl = W.plausibilitaet(W.zeilenAbbilden(t.zeilen, W.zuordnungVorschlagen(t.kopfNorm)), { gemeinschaft: { modell: "eeg" } });
  pruefe(pl.fehler.some((f) => f.text.includes("Teilnahmefaktor 150")), "Plausibilität: Teilnahmefaktor > 100 % ist Fehler");
  pruefe(FOERDER_PROGRAMME && Object.values(FOERDER_PROGRAMME).every((x) => x.quelle && x.status), "Jedes Förderprogramm mit Quelle und Status");
  const fc = foerderCheck({ modell: "eeg", anlagen: [{ art: "pv", kwp: 50, status: "geplant" }] });
  pruefe(fc.stand && fc.kennzahlen && Array.isArray(fc.treffer || fc.programme), "Förder-Check liefert Stand und Treffer", fc.kennzahlen);

  abschnitt("L4. Muster (ElWG-Stand) und Statuten");
  let offen = [];
  for (const v of Object.values(VORLAGEN)) {
    const dok = vorlageRendern(v, dokumentDaten({ gemeinschaft: { name: "EEG Test", modell: v.modelle?.[0] || "eeg", rechtsform: v.rechtsformen?.[0] || "verein", zonelevel: 3, sitzAdresse: { ort: "Testort" } }, eingaben: statutenEingaben({}), heute: H }));
    if (/\{\{/.test(dok.text) || dok.kennzeichnung !== MUSTER_HINWEIS) offen.push(v.id);
  }
  pruefe(Object.keys(VORLAGEN).length >= 16 && !offen.length, `${Object.keys(VORLAGEN).length} Vorlagen ohne offene Platzhalter, jede mit MUSTER-Hinweis`, offen);
  const e = statutenEingaben({ taetigkeitsgebiet: "Gemeinde Testort" });
  const dok = vorlageRendern(VORLAGEN.statuten_verein, dokumentDaten({ gemeinschaft: { name: "EEG Test", modell: "eeg", rechtsform: "verein", zonelevel: 3, sitzAdresse: { ort: "Testort" } }, eingaben: e, heute: H }));
  pruefe(statutenPruefen({ modell: "eeg", rechtsform: "verein", name: "EEG Test", sitzOrt: "Testort" }, e, dok).ok, "Musterstatuten Verein erfüllen die Pflichtinhalte nach § 3 Abs. 2 VerG");

  abschnitt("L5. Frappe-Adapter, API, Dateien");
  const adapter = lesen("src/lib/plattform/backend/frappe/eg-gruendung.js");
  const api = fs.readFileSync(path.join(PY, "api", "eg_gruendung.py"), "utf8");
  const ops = ["grAuftraege", "grAuftrag", "grAuftragAnlegen", "grAuftragAktion", "grSchrittAktion", "grDokumentErzeugen", "grImportVorschau", "grImportAusfuehren", "grFoerdercheck", "grVersammlungen", "grAufloesung"];
  pruefe(ops.every((o) => new RegExp(`export (const|async function) ${o}\\b`).test(adapter)) && !adapter.includes("STUB"), "Frappe-Adapter exportiert alle 11 Operationen (kein Stub)");
  const methoden = [...adapter.matchAll(/"eg_gruendung\.([a-z_]+)"/g)].map((m) => m[1]);
  const fn = (m) => api.match(new RegExp(`@frappe\\.whitelist\\(methods=\\["POST"\\]\\)\\ndef ${m}\\([^)]*\\):[^\\n]*\\n([\\s\\S]*?)(?=\\n@frappe|\\ndef |$)`));
  pruefe(methoden.length === 11 && methoden.every((m) => fn(m)), "Jede Adapter-Methode ist in api/eg_gruendung.py als POST freigegeben", methoden.filter((m) => !fn(m)));
  pruefe(methoden.every((m) => /n = nutzer\(als_benutzer\)/.test(fn(m)?.[1] || "")) && !/allow_guest\s*=/.test(api), "Jede Methode prüft den Nutzer, kein allow_guest");
  const dts = ["gruendungsauftrag", "gruendungsschritt", "import", "foerdercheck", "dokument", "versammlung", "versammlung_stimme", "beschluss", "beitrag", "vereinsakte"];
  pruefe(dts.every((d) => fs.existsSync(path.join(PY, "doctype", `plattform_eg_${d}`, `plattform_eg_${d}.json`))), "10 DocTypes plattform_eg_*");
  const eigene = [];
  const sammeln = (d) => { for (const x of fs.readdirSync(path.join(WURZEL, d), { withFileTypes: true })) { const q = path.join(d, x.name); if (x.isDirectory()) sammeln(q); else if (/\.(js|mjs)$/.test(x.name)) eigene.push(q); } };
  for (const d of ["src/components/Portal/EG/Gruendung", "src/lib/plattform/eg/vorlagen", "src/app/portal/eg/gruendung", "src/app/portal/admin/eg/gruendung", "src/app/api/portal/eg/gruendung"]) sammeln(d);
  eigene.push(...["src/lib/plattform/eg/gruendung.js", "src/lib/plattform/eg/wechsel.js", "src/lib/plattform/eg/verein.js", "src/lib/plattform/eg/statuten.js", "src/lib/plattform/eg/vertraege.js", "src/lib/plattform/eg/foerder.js", "src/lib/plattform/eg/lieferantenpflichten.js", "src/lib/plattform/server/eg-gruendung-pdf.js", "src/lib/plattform/backend/demo/eg-gruendung.js", "src/lib/plattform/backend/demo/eg-gruendung-seed.js", "src/lib/plattform/backend/frappe/eg-gruendung.js"]);
  const falle = eigene.filter((f) => /\[[A-Za-zÄÖÜäöüß]+( [A-Za-zÄÖÜäöüß]+)+\]|\[[a-z-]+:[^\]\s,]+\]/.test(lesen(f)));
  pruefe(eigene.length >= 30 && !falle.length, `Tailwind-Falle: keine eckigen Klammern mit Text in ${eigene.length} eigenen Dateien`, falle);
  const seiten = ["src/app/portal/eg/gruendung/page.js", "src/app/portal/eg/gruendung/neu/page.js", "src/app/portal/eg/gruendung/[id]/page.js", "src/app/portal/eg/gruendung/foerdercheck/page.js", "src/app/portal/admin/eg/gruendung/page.js", "src/app/portal/admin/eg/gruendung/[id]/page.js", "src/app/portal/eg/[id]/verein/page.js"];
  pruefe(seiten.every((x) => fs.existsSync(path.join(WURZEL, x))), "Seiten Portal und Backoffice vorhanden");
}

// ================================================================ API

class Client {
  constructor() { this.cookie = ""; }
  async anfrage(methode, pfad, body, { origin = BASIS, roh = false } = {}) {
    const headers = {};
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: "manual", signal: AbortSignal.timeout(180000) });
        if (res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && versuch < 4) { await new Promise((r) => setTimeout(r, 3000 * versuch)); continue; }
        break;
      } catch (e) {
        if (versuch >= 4) throw e;
        await new Promise((r) => setTimeout(r, 3000 * versuch));
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
    try { json = JSON.parse(text); } catch { json = { text: text.slice(0, 200) }; }
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  async login(email) {
    const r = await this.post("/api/auth/login", { email, passwort: DEMO_PASSWORT });
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
}

async function api() {
  const admin = new Client();
  const kunde = new Client();
  const fremd = new Client();
  const obmann = new Client();
  await admin.login("admin@example.com");
  await kunde.login("mitglied@example.com");
  await fremd.login("unternehmen@example.com");
  await obmann.login("eg-obmann@example.com");
  const A = "/api/portal/eg/gruendung";

  abschnitt("A1. Anfrage und Rechte am Auftrag");
  const liste = await admin.get(A);
  pruefe(liste.status === 200 && liste.json.backoffice && liste.json.auftraege.length >= 3 && liste.json.kennzahlen, "Backoffice: alle Aufträge mit Kennzahlen", liste.json.kennzahlen);
  const neu = await kunde.post(A, { daten: { paket: "gruendung", arbeitsname: `Test-EG ${LAUF} (Test)`, plz: "5121", ort: "Ostermiething", modell: "eeg", netzbetreiberId: "ENB-OOE", erzeugungKwp: 120, einwilligung: true } });
  const id = neu.json.auftrag?.id;
  pruefe(neu.status === 201 && id && neu.json.auftrag.status === "anfrage" && neu.json.auftrag.schritte.length > 10, "Auftraggeber legt Anfrage an (Fahrplan erzeugt)", neu.json);
  pruefe((await fremd.get(`${A}/${id}`)).status === 404, "Fremdes Konto: 404");
  const kl = await kunde.get(A);
  pruefe(kl.status === 200 && !kl.json.backoffice && kl.json.auftraege.every((x) => x.id === id || x.auftraggeberName !== undefined) && kl.json.auftraege.some((x) => x.id === id) && !kl.json.kennzahlen, "Auftraggeber sieht eigene Aufträge ohne Backoffice-Kennzahlen");
  pruefe((await kunde.post(`${A}/${id}`, { aktion: "angebot", betragNetto: 1 })).status === 403, "Angebot erstellt nur das Backoffice (403)");

  abschnitt("A2. Angebot, Annahme, Schritte");
  const ang = await admin.post(`${A}/${id}`, { aktion: "angebot", betragNetto: 1990, gueltigTage: 30 });
  pruefe(ang.status === 200 && ang.json.auftrag.status === "angebot" && /^ANG-/.test(ang.json.auftrag.angebot?.nummer || ""), "Angebot mit Nummer", ang.json);
  const an = await kunde.post(`${A}/${id}`, { aktion: "annehmen", bestaetigt: true });
  pruefe(an.status === 200 && GR.GR_AKTIV.includes(an.json.auftrag.status) && an.json.auftrag.auftragAm, "Auftraggeber nimmt an → Auftrag erteilt", an.json.auftrag?.status);
  const fs1 = await kunde.post(`${A}/${id}/schritt`, { schritt: "simulation", aktion: "erledigen" });
  pruefe(fs1.status === 403, "Schritt von ÖkoInvest: Auftraggeber 403");
  const ks = an.json.auftrag.schritte.find((x) => x.zustaendig === "auftraggeber" && x.status !== "erledigt");
  const k1 = ks ? await kunde.post(`${A}/${id}/schritt`, { schritt: ks.schluessel, aktion: "erledigen", notiz: "Nachweis im Test (Test)", wert: ks.feld === "datum" ? H : undefined, datum: H }) : { status: 0 };
  pruefe(k1.status === 200 && k1.json.auftrag.schritte.find((x) => x.schluessel === ks.schluessel)?.status === "erledigt", `Auftraggeber erledigt eigenen Schritt „${ks?.label}“`, k1.json);

  abschnitt("A3. Gemeinschaft anlegen und Stammdaten-Wirkung");
  const ga = await admin.post(`${A}/${id}`, { aktion: "gemeinschaft_anlegen" });
  const gid = ga.json.auftrag?.gemeinschaftId;
  pruefe(ga.status === 200 && gid && ga.json.auftrag.gemeinschaft?.status === "in_gruendung", "Gemeinschaft über WP1 angelegt, Status „in Gründung“", { s: ga.status, g: ga.json.auftrag?.gemeinschaft?.status, m: ga.json.auftrag?.meldungen });
  pruefe((await admin.post(`${A}/${id}`, { aktion: "gemeinschaft_anlegen" })).status === 409, "Zweites Anlegen: 409");
  const zf = await admin.post(`${A}/${id}/schritt`, { schritt: "zvr", aktion: "erledigen", wert: "12", notiz: "x" });
  pruefe(zf.status === 422, "ZVR-Zahl ungültig: 422", zf.json);
  const zr = await admin.post(`${A}/${id}/schritt`, { schritt: "zvr", aktion: "erledigen", wert: "123456789", notiz: "Bescheid (Test)" });
  pruefe(zr.status === 200 && zr.json.auftrag.gemeinschaft?.zvrZahl === "123456789", "ZVR-Zahl in die Stammdaten der Gemeinschaft übernommen", zr.json.auftrag?.gemeinschaft?.zvrZahl);
  const eb = await admin.post(`${A}/${id}/schritt`, { schritt: "eda_bereit", aktion: "erledigen", notiz: "x" });
  pruefe(eb.status === 409, "EDA-bereit vor Marktpartner-ID und Netzbetreibervertrag: 409", eb.json?.fehler || eb.json);

  abschnitt("A4. Muster-Dokumente und Förder-Check");
  const vor = await kunde.get(`/api/portal/eg/dokument?vorlage=statuten_verein&auftragId=${id}`, { roh: true });
  const pdf = Buffer.from(await vor.arrayBuffer());
  pruefe(vor.status === 200 && /pdf/.test(vor.headers.get("content-type") || "") && pdf.subarray(0, 5).toString() === "%PDF-", "Vorschau Musterstatuten als PDF");
  const d1 = await kunde.post("/api/portal/eg/dokument", { vorlage: "statuten_verein", auftragId: id, daten: { taetigkeitsgebiet: `Gemeinde Testort ${LAUF}` } });
  const d2 = await kunde.post("/api/portal/eg/dokument", { vorlage: "statuten_verein", auftragId: id, daten: { taetigkeitsgebiet: `Gemeinde Testort ${LAUF}` } });
  pruefe(d1.status === 200 && d1.json.dokument?.version >= 1 && /^[0-9a-f]{64}$/.test(d1.json.dokument.sha256) && d1.json.pruefung, "Dokument versioniert mit SHA-256 und Statuten-Prüfung", d1.json.dokument);
  pruefe(d2.status === 200 && d2.json.unveraendert && d2.json.dokument.version === d1.json.dokument.version, "Gleicher Inhalt: keine neue Version");
  const dp = await kunde.get(`/api/portal/eg/dokument?id=${d1.json.dokument?.id}`, { roh: true });
  pruefe(dp.status === 200 && /pdf/.test(dp.headers.get("content-type") || ""), "Gespeichertes Dokument als PDF");
  pruefe((await fremd.get(`/api/portal/eg/dokument?id=${d1.json.dokument?.id}`)).status === 404, "Fremdes Konto: Dokument 404");
  const fc = await kunde.post("/api/portal/eg/foerdercheck", { auftragId: id, speichern: true });
  pruefe(fc.status === 200 && fc.json.foerdercheck?.id && fc.json.foerdercheck.stand && Object.keys(fc.json.programme || {}).length >= 3, "Förder-Check gespeichert (Stand, Programme mit Quelle)", fc.json.foerdercheck?.kennzahlen);

  abschnitt("A5. Wechsel-Import");
  const zp = (i) => `AT0030000000000000000${String(Date.now()).slice(-6)}${String(i).padStart(6, "0")}`;
  const csv = `Mitgliedsnummer;Vorname;Nachname;E-Mail;Zählpunktbezeichnung;Energierichtung;Teilnahmefaktor;Tarifgruppe;Teilnehmerstatus\n1;Anna;Test;anna.${LAUF}@example.com;${zp(1)};Bezug;100;Standard;aktiv\n2;Bert;Test;bert.${LAUF}@example.com;${zp(2)};Einspeisung;150;Standard;aktiv\n`;
  const iv = await admin.post(`/api/portal/eg/${gid}/import`, { csv, dateiname: "export-energiedigital.csv", auftragId: id });
  pruefe(iv.status === 200 && iv.json.erkannt?.anbieter === "energiedigital" && iv.json.plausibilitaet?.fehler?.some((f) => f.zeile === 3), "Vorschau: Anbieter erkannt, TF 150 als Fehler in Zeile 3", { s: iv.status, e: iv.json.erkannt, f: iv.json.plausibilitaet?.fehler });
  pruefe((await kunde.post(`/api/portal/eg/${gid}/import`, { csv })).status === 404 || (await kunde.post(`/api/portal/eg/${gid}/import`, { csv })).status === 403, "Import ohne Stammdaten-Recht abgelehnt");
  const ia = await admin.post(`/api/portal/eg/${gid}/import/ausfuehren`, { importId: iv.json.import?.id });
  pruefe(ia.status === 200 && ia.json.ergebnis?.angelegt === 1 && ia.json.ergebnis.fehlerZeilen === 1 && ia.json.import.status === "ausgefuehrt", "Ausführen ohne Fehlerzeilen: 1 Mitglied angelegt", ia.json.ergebnis || ia.json);
  pruefe((await admin.post(`/api/portal/eg/${gid}/import/ausfuehren`, { importId: iv.json.import?.id })).status === 409, "Zweites Ausführen: 409");

  abschnitt("A6. Verein, Auflösung");
  const eg = await admin.get("/api/admin/eg");
  const son = eg.json.gemeinschaften?.find((x) => x.seedSchluessel === "sonnenland");
  const vo = await obmann.get(`/api/portal/eg/${son?.id}/verein`);
  pruefe(vo.status === 200 && vo.json.verein.versammlungen.length >= 2 && vo.json.verein.organCheck && vo.json.verein.gvPflicht, "Obmann: Versammlungen inkl. Entwurf, Organ-Check, GV-Pflicht", vo.json.verein?.rechte);
  const vm = await kunde.get(`/api/portal/eg/${son?.id}/verein`);
  pruefe(vm.status === 200 && vm.json.verein.versammlungen.every((x) => x.status !== "entwurf") && !vm.json.verein.organCheck && !vm.json.verein.beitragsUebersicht, "Mitglied: keine Entwürfe, kein Organ-Check, keine Beiträge");
  pruefe((await fremd.get(`/api/portal/eg/${son?.id}/verein`)).status === 404, "Fremdes Konto: 404");
  pruefe((await kunde.post(`/api/portal/eg/${son?.id}/verein`, { aktion: "beschluss_speichern", daten: { gremium: "vorstand", datum: H, gegenstand: "x", kategorie: "sonstiges" } })).status === 403, "Mitglied erfasst keine Beschlüsse (403)");
  const bs = await obmann.post(`/api/portal/eg/${son?.id}/verein`, { aktion: "beschluss_speichern", daten: { gremium: "vorstand", datum: H, gegenstand: `Testbeschluss ${LAUF} (Test)`, kategorie: "sonstiges", ja: 3, nein: 0 } });
  pruefe(bs.status === 200 && bs.json.verein.beschluesse.some((x) => x.gegenstand.includes(LAUF)), "Obmann erfasst Vorstandsbeschluss", bs.json);
  const au = await admin.get(`/api/portal/eg/${gid}/aufloesung`);
  pruefe(au.status === 200 && Array.isArray(au.json.aufloesung?.punkte) && au.json.aufloesung.abschliessbar === false, "Auflösungs-Checkliste lesbar, nicht abschließbar", au.json.aufloesung?.offen);

  abschnitt("A7. CSRF und Seiten");
  pruefe((await kunde.post(A, { daten: {} }, { origin: "https://boese.example" })).status === 403, "Fremder Origin: 403");
  const seite = async (c, p) => (await c.get(p, { origin: null })).status;
  pruefe((await seite(kunde, "/portal/eg/gruendung")) === 200 && (await seite(kunde, `/portal/eg/gruendung/${id}`)) === 200 && (await seite(kunde, "/portal/eg/gruendung/foerdercheck")) === 200, "Portal-Seiten Gründung, Auftrag, Förder-Check");
  pruefe((await seite(admin, "/portal/admin/eg/gruendung")) === 200 && (await seite(admin, `/portal/admin/eg/gruendung/${id}`)) === 200, "Backoffice-Seiten Liste und Auftrag");
  pruefe((await seite(obmann, `/portal/eg/${son?.id}/verein`)) === 200, "Vereinsseite für Organe");
  const gesperrt = await kunde.get("/portal/admin/eg/gruendung", { origin: null });
  pruefe(gesperrt.status === 404 || gesperrt.text.includes("NEXT_HTTP_ERROR_FALLBACK;404"), "Backoffice-Seite für Portal-Konto gesperrt (notFound, im Dev-Server als Streaming-404)");
}

// ================================================================ Lauf

logik();
if (!NUR_LOGIK) {
  try {
    await api();
  } catch (e) {
    fehler++;
    console.log(rot(`\nAbbruch: ${e.message}`));
  }
}
console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alles grün")} · ${ok} Prüfungen bestanden`);
process.exit(fehler ? 1 : 0);
