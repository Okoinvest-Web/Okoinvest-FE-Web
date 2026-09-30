// scripts/plattform-test-service.mjs
//
// End-to-End-Test „Dokumente, Signatur, Termine, Service & HR“ gegen den laufenden Dev-Server (Demo-Backend).
//   node scripts/plattform-test-service.mjs [basis-url]
//
// Prüft:
//  Signatur – Anlage nur Backoffice (Unterrolle „lesen“ → 403), fremdes Konto → 403, Reihenfolge (Zweiter vor dem Ersten → 409),
//             Bestätigungscode per E-Mail (falsch → 422), getippte und gezeichnete Unterschrift (PNG), leeres Bild/fehlende
//             Zustimmung → 422, Abschluss: signiertes PDF beginnt mit den unveränderten Originalbytes, enthält die Prüfseite,
//             SHA-256 wie protokolliert; manipulierte Originaldatei → 409 (Hash-Prüfung); Widerruf vor Abschluss; Einstellungen.
//  Termine  – öffentliche Slots ohne Mitarbeiterangaben, öffentliche Buchung mit Verwaltungs-Link, Doppelbuchung verhindert
//             (kein Mitarbeiter doppelt belegt, danach 409), Storno per Link, ICS nur für Beteiligte, Abwesenheit → Vertretung
//             (Termin und Aufgabe gehen an die Vertretung, abwesende Person ohne Slots).
//  Tickets  – eigene/fremde (403), interne Notizen unsichtbar für Kunden, Kunde darf Status nicht setzen, Unterrollen,
//             Anhang nur für Beteiligte, fremde Anlage → 403, Ticket aus Störung idempotent.
//  Wissen   – nur intern (Kunde → 403 API, 404 Seite), Unterrolle „lesen“ schreibt nicht, Versionen.
//  HR       – Team-Übersicht, Zeiterfassung eigene/fremde, Auswertung; Seiten 200 bzw. 404.
// Eigene Konten mit Präfix svc-test-<Lauf>@example.com – Demo-Daten bleiben unberührt (außer Einträgen dieses Laufs).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PASSWORT = "Service-Test-Passwort-26";

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
const sha = (b) => createHash("sha256").update(b).digest("hex");

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
        if (res.status >= 500 && /text\/html/.test(res.headers.get("content-type") || "") && pfad.startsWith("/api/") && versuch < 4) {
          await new Promise((r) => setTimeout(r, 3000 * versuch));
          continue;
        }
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
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, headers: res.headers, text };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  del = (p, o) => this.anfrage("DELETE", p, undefined, o);
  async login(email, passwort = DEMO_PASSWORT) {
    let r;
    for (let v = 1; v <= 3; v++) {
      r = await this.post("/api/auth/login", { email, passwort });
      if (r.status !== 500) break;
      await new Promise((w) => setTimeout(w, 5000 * v));
    }
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.email = email;
    return this.nutzer;
  }
  async registrieren(schluessel, rollen) {
    const email = `svc-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname: "Service", nachname: `Test ${schluessel}`, firma: "Test GmbH (fiktiv)", rollen, agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    this.nutzer = r.json.nutzer;
    this.email = email;
    return this.nutzer;
  }
}

// ---------------------------------------------------------------- Testdaten: PDF und PNG ohne Pakete

function testPdf(titel) {
  const inhalt = `BT /F1 18 Tf 72 760 Td (${titel}) Tj ET`;
  const objekte = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let s = "%PDF-1.4\n";
  const off = [];
  objekte.forEach((o, i) => {
    off.push(s.length);
    s += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const x = s.length;
  s += `xref\n0 ${objekte.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objekte.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(s, "latin1");
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    let c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(typ, daten) {
  const l = Buffer.alloc(4);
  l.writeUInt32BE(daten.length);
  const td = Buffer.concat([Buffer.from(typ, "latin1"), daten]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(td));
  return Buffer.concat([l, td, c]);
}
/** RGBA-PNG 120×40: transparent, mit dunkler „Unterschrift“ (leer = nur transparent) */
function testPng(leer = false) {
  const w = 120;
  const h = 40;
  const roh = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * (w * 4 + 1) + 1 + x * 4;
      const linie = !leer && Math.abs(y - (20 + Math.round(12 * Math.sin(x / 9)))) <= 1;
      roh[i] = 4;
      roh[i + 1] = 29;
      roh[i + 2] = 66;
      roh[i + 3] = linie ? 255 : 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(roh)), chunk("IEND", Buffer.alloc(0))]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function codeAusPostausgang(admin, email) {
  for (let i = 0; i < 5; i++) {
    const r = await admin.get("/api/admin/postausgang?limit=60");
    const mail = (r.json.mails || []).find((m) => m.an === email && /Bestätigungscode/.test(m.betreff));
    const code = mail && /(\d{6})/.exec(mail.text)?.[1];
    if (code) return code;
    await new Promise((w) => setTimeout(w, 500));
  }
  return null;
}

async function signaturAnlegen(admin, { titel, pdf, unterzeichner, art = "sonstiges" }) {
  const fd = new FormData();
  fd.append("datei", new Blob([pdf], { type: "application/pdf" }), `${titel}.pdf`);
  fd.append("daten", JSON.stringify({ titel, art, unterzeichner, reihenfolge: true, fristTage: 7 }));
  return admin.post("/api/admin/signatur", fd, { kopf: { "X-Plattform-Upload": "1" } });
}

async function unterschreiben(c, id, admin, daten) {
  const code = await c.post(`/api/portal/signatur/${id}`, { aktion: "code" });
  if (code.status !== 200) return code;
  const wert = await codeAusPostausgang(admin, c.email);
  return c.post(`/api/portal/signatur/${id}`, { aktion: "unterschreiben", code: wert, zustimmung: true, ...daten });
}

// ---------------------------------------------------------------- Ablauf

async function main() {
  console.log(`Plattform-Test Service gegen ${BASIS} (Lauf ${LAUF})`);
  const admin = new Client("admin");
  const lesen = new Client("bo-lesen");
  const akquise = new Client("bo-akquise");
  const kunde = new Client("kunde");
  const zweiter = new Client("zweiter");
  const fremd = new Client("fremd");
  await admin.login("admin@example.com");
  await lesen.login("bo-lesen@example.com");
  await akquise.login("bo-akquise@example.com");
  await kunde.registrieren("kunde", ["unternehmen"]);
  await zweiter.registrieren("zweiter", ["flaeche"]);
  await fremd.registrieren("fremd", ["investor"]);

  // ============================================================ Signatur
  abschnitt("Elektronische Unterschrift");
  const original = testPdf(`Testvertrag ${LAUF}`);
  let r = await signaturAnlegen(lesen, { titel: "Test Lesen", pdf: original, unterzeichner: [{ email: kunde.email }] });
  pruefe(r.status === 403, "Unterrolle „lesen“ kann keinen Signaturvorgang anlegen (403)", r.json);
  r = await signaturAnlegen(admin, { titel: `Testvertrag ${LAUF}`, pdf: Buffer.from("kein pdf, nur Text. ".repeat(10)), unterzeichner: [{ email: kunde.email }] });
  pruefe(r.status === 415, "Kein PDF → 415", r.status);
  r = await signaturAnlegen(admin, { titel: `Testvertrag ${LAUF}`, pdf: original, unterzeichner: [{ email: kunde.email }, { email: zweiter.email }] });
  pruefe(r.status === 201 && r.json.vorgang?.status === "laufend", "Backoffice legt Vorgang mit zwei Unterzeichnern an (201)", r.json);
  const sv = r.json.vorgang;
  pruefe(sv?.dokument?.sha256 === sha(original), "SHA-256 des Originals protokolliert", sv?.dokument);
  pruefe(/einfache elektronische Signatur/i.test(sv?.kennzeichnung || "") && /keine .*qualifizierte/i.test(sv?.kennzeichnung || ""), "Kennzeichnung EES (keine qualifizierte Signatur)", sv?.kennzeichnung);

  r = await fremd.get(`/api/portal/signatur/${sv.id}`);
  pruefe(r.status === 403, "Fremdes Konto sieht den Vorgang nicht (403)", r.status);
  r = await fremd.post(`/api/portal/signatur/${sv.id}`, { aktion: "code" });
  pruefe(r.status === 403, "Fremdes Konto kann keinen Code anfordern (403)", r.status);
  r = await fremd.get(`/api/portal/signatur/${sv.id}/pdf`);
  pruefe(r.status === 403, "Fremdes Konto kann das PDF nicht laden (403)", r.status);
  r = await zweiter.post(`/api/portal/signatur/${sv.id}`, { aktion: "code" });
  pruefe(r.status === 409, "Reihenfolge: Zweiter Unterzeichner ist noch nicht dran (409)", r.json);
  r = await kunde.get(`/api/portal/signatur/${sv.id}`);
  pruefe(r.status === 200 && r.json.vorgang.ichBinDran === true, "Erster Unterzeichner ist an der Reihe", r.json.vorgang?.ichBinDran);
  pruefe(r.json.vorgang.unterzeichner.find((u) => !u.ich)?.email === undefined, "Andere Unterzeichner ohne E-Mail-Adresse sichtbar", r.json.vorgang.unterzeichner);

  r = await kunde.post(`/api/portal/signatur/${sv.id}`, { aktion: "code" });
  pruefe(r.status === 200 && r.json.gueltigBis, "Bestätigungscode angefordert", r.json);
  const code1 = await codeAusPostausgang(admin, kunde.email);
  pruefe(/^\d{6}$/.test(code1 || ""), "Code liegt im Postausgang (E-Mail)", code1);
  r = await kunde.post(`/api/portal/signatur/${sv.id}`, { aktion: "unterschreiben", code: code1 === "000000" ? "111111" : "000000", art: "getippt", name: "Service Test", zustimmung: true });
  pruefe(r.status === 422, "Falscher Code → 422", r.json);
  r = await kunde.post(`/api/portal/signatur/${sv.id}`, { aktion: "unterschreiben", code: code1, art: "getippt", name: "Service Test", zustimmung: false });
  pruefe(r.status === 422, "Ohne Zustimmung → 422", r.json);
  r = await kunde.post(`/api/portal/signatur/${sv.id}`, { aktion: "unterschreiben", code: code1, art: "getippt", name: "Service Test kunde", zustimmung: true });
  pruefe(r.status === 200 && r.json.vorgang.fortschritt.unterschrieben === 1 && r.json.vorgang.status === "laufend", "Getippte Unterschrift (1 von 2)", r.json);
  r = await kunde.post(`/api/portal/signatur/${sv.id}`, { aktion: "code" });
  pruefe(r.status === 409, "Bereits unterschrieben → kein weiterer Code (409)", r.status);

  r = await zweiter.post(`/api/portal/signatur/${sv.id}`, { aktion: "code" });
  const code2 = await codeAusPostausgang(admin, zweiter.email);
  r = await zweiter.post(`/api/portal/signatur/${sv.id}`, { aktion: "unterschreiben", code: code2, art: "gezeichnet", bild: testPng(true), zustimmung: true });
  pruefe(r.status === 422, "Leeres Unterschriftsfeld → 422", r.json);
  r = await zweiter.post(`/api/portal/signatur/${sv.id}`, { aktion: "unterschreiben", code: code2, art: "gezeichnet", bild: testPng(), zustimmung: true });
  pruefe(r.status === 200 && r.json.vorgang.status === "abgeschlossen", "Gezeichnete Unterschrift schließt den Vorgang ab", r.json);
  const fertig = r.json.vorgang;
  pruefe(!!fertig?.signiert?.sha256 && fertig.signiert.sha256 !== fertig.dokument.sha256, "SHA-256 vorher/nachher im Protokoll", fertig?.signiert);

  const dl = await kunde.anfrage("GET", `/api/portal/signatur/${sv.id}/pdf?variante=signiert`, undefined, { roh: true });
  const signiert = Buffer.from(await dl.arrayBuffer());
  pruefe(dl.status === 200 && /application\/pdf/.test(dl.headers.get("content-type") || ""), "Signiertes PDF abrufbar (Beteiligte)", dl.status);
  pruefe(signiert.subarray(0, original.length).equals(original), "Signiertes PDF beginnt mit den unveränderten Originalbytes (inkrementelles Update)");
  const seitenAnzahl = Number([...signiert.toString("latin1").matchAll(/\/Count (\d+)/g)].pop()?.[1] || 0);
  pruefe(signiert.toString("latin1").includes("PR\xdcFSEITE") && seitenAnzahl >= 2, `Signiertes PDF enthält die Prüfseite (${seitenAnzahl} Seiten: Original + Prüfseite)`, seitenAnzahl);
  pruefe(sha(signiert) === fertig.signiert.sha256, "SHA-256 des signierten PDFs stimmt mit dem Protokoll überein");
  pruefe(signiert.toString("latin1").includes("/SMask"), "Gezeichnete Unterschrift als Bild eingebettet");
  r = await fremd.get(`/api/portal/signatur/${sv.id}/pdf?variante=signiert`);
  pruefe(r.status === 403, "Fremdes Konto: signiertes PDF → 403", r.status);
  r = await admin.get(`/api/portal/signatur/${sv.id}`);
  pruefe(r.json.vorgang.protokoll.some((e) => e.art === "unterschrieben" && e.ip && e.userAgent !== undefined), "Protokoll mit Zeit, IP und Browser (Backoffice)", r.json.vorgang.protokoll?.slice(-3));

  // Hash-Prüfung: Originaldatei nachträglich verändern → Unterschrift abgelehnt
  r = await signaturAnlegen(admin, { titel: `Hashtest ${LAUF}`, pdf: testPdf(`Hashtest ${LAUF}`), unterzeichner: [{ email: kunde.email }] });
  const hv = r.json.vorgang;
  const dbDatei = path.join(process.cwd(), ".data", "plattform.json");
  if (existsSync(dbDatei)) {
    const db = JSON.parse(readFileSync(dbDatei, "utf8"));
    const eintrag = db.service?.signaturen?.find((x) => x.id === hv.id);
    const datei = eintrag && path.join(process.cwd(), ".data", "uploads", eintrag.datei);
    if (datei && existsSync(datei)) {
      writeFileSync(datei, Buffer.concat([readFileSync(datei), Buffer.from("%manipuliert\n")]));
      r = await unterschreiben(kunde, hv.id, admin, { art: "getippt", name: "Service Test" });
      pruefe(r.status === 409, "Manipulierte Originaldatei → Unterschrift abgelehnt (409)", r.json);
      r = await admin.get(`/api/portal/signatur/${hv.id}`);
      pruefe(r.json.vorgang.protokoll.some((e) => e.art === "hash_abweichung"), "Hash-Abweichung im Protokoll", r.json.vorgang.protokoll?.map((e) => e.art));
    } else pruefe(false, "Demo-Datei für Hashtest gefunden");
  } else console.log("  (Hashtest übersprungen – kein Demo-Backend im Arbeitsverzeichnis)");

  // Widerruf vor Abschluss
  r = await signaturAnlegen(admin, { titel: `Widerruf ${LAUF}`, pdf: testPdf(`Widerruf ${LAUF}`), unterzeichner: [{ email: kunde.email }] });
  const wv = r.json.vorgang;
  r = await kunde.post(`/api/portal/signatur/${wv.id}`, { aktion: "widerrufen", grund: "Test" });
  pruefe(r.status === 403, "Unterzeichner kann nicht widerrufen (403)", r.status);
  r = await admin.post(`/api/portal/signatur/${wv.id}`, { aktion: "widerrufen", grund: "Test-Widerruf" });
  pruefe(r.status === 200 && r.json.vorgang.status === "widerrufen", "Backoffice widerruft vor Abschluss", r.json.vorgang?.status);
  r = await kunde.post(`/api/portal/signatur/${wv.id}`, { aktion: "code" });
  pruefe(r.status === 409, "Widerrufener Vorgang: kein Code mehr (409)", r.status);
  r = await admin.post(`/api/portal/signatur/${sv.id}`, { aktion: "widerrufen", grund: "zu spät" });
  pruefe(r.status === 409, "Abgeschlossener Vorgang kann nicht widerrufen werden (409)", r.status);

  r = await admin.get("/api/admin/signatur/einstellungen");
  pruefe(r.status === 200 && ["klick", "signatur"].includes(r.json.einstellungen?.ndaModus), "Einstellung Klick/Signatur abrufbar", r.json.einstellungen);
  r = await lesen.patch("/api/admin/signatur/einstellungen", { ndaModus: "signatur" });
  pruefe(r.status === 403, "Unterrolle „lesen“ ändert den Signatur-Modus nicht (403)", r.status);
  r = await kunde.get("/api/portal/signatur");
  pruefe(r.status === 200 && r.json.vorgaenge.some((x) => x.id === sv.id) && !r.json.vorgaenge.some((x) => x.id === "SV-00-XXXXXX"), "Liste enthält eigene Vorgänge", r.json.vorgaenge?.length);
  r = await fremd.get("/api/portal/signatur");
  pruefe(r.status === 200 && !r.json.vorgaenge.some((x) => x.id === sv.id), "Liste eines fremden Kontos ohne fremde Vorgänge");

  // ============================================================ Termine
  abschnitt("Termine & Kalender");
  const anon = new Client("anonym");
  r = await anon.get("/api/portal/termine/slots?art=beratung_video");
  pruefe(r.status === 200 && r.json.slots?.length > 0, "Öffentliche Slots ohne Anmeldung", r.json.slots?.length);
  pruefe(!r.json.slots?.some((s) => s.mitarbeiter), "Öffentliche Slots ohne Mitarbeiterangaben");
  r = await anon.get("/api/portal/termine/slots?art=datenraum");
  pruefe(r.status === 401, "Datenraum-Session nicht öffentlich (401)", r.status);
  r = await kunde.get("/api/portal/termine/slots?art=datenraum");
  pruefe(r.status === 403, "Datenraum-Session nur für Investoren (403)", r.status);
  const slots = (await anon.get("/api/portal/termine/slots?art=beratung_video")).json.slots || [];
  const ziel = slots[Math.min(slots.length - 1, 6)];
  const buchungen = [];
  let konflikt = null;
  for (let i = 0; i < 6 && !konflikt; i++) {
    r = await anon.post("/api/portal/termine/oeffentlich", { art: "beratung_video", start: ziel.start, kontakt: { name: `Test Person ${i}`, email: `svc-test-${LAUF}-t${i}@example.com` }, einwilligung: true, herkunft: "kontakt" });
    if (r.status === 201) buchungen.push(r.json);
    else konflikt = r;
  }
  pruefe(buchungen.length >= 1 && !!buchungen[0].verwaltenToken, "Öffentliche Buchung mit Verwaltungs-Link", buchungen[0]);
  pruefe(konflikt?.status === 409, `Doppelbuchung verhindert: nach ${buchungen.length} Buchung(en) ist der Slot voll (409)`, konflikt?.json);
  const mitarbeiter = buchungen.map((b) => b.termin.mitarbeiter?.name);
  pruefe(new Set(mitarbeiter).size === mitarbeiter.length, "Jede Buchung desselben Slots bei einer anderen Person", mitarbeiter);
  r = await anon.post("/api/portal/termine/oeffentlich", { art: "beratung_video", start: slots[0].start, kontakt: { name: "Ohne Einwilligung", email: `svc-test-${LAUF}-x@example.com` } });
  pruefe(r.status === 422, "Öffentliche Buchung ohne Einwilligung → 422", r.status);
  r = await anon.post("/api/portal/termine/oeffentlich", { art: "beratung_video", start: new Date(Date.now() + 86400e3).toISOString().replace(/T.*/, "T02:13:00.000Z"), kontakt: { name: "Nachts", email: `svc-test-${LAUF}-n@example.com` }, einwilligung: true });
  pruefe(r.status === 409, "Zeit außerhalb der Arbeitszeiten → 409", r.status);
  // Admin-Kalender: keine Überschneidung je Mitarbeiter
  r = await admin.get(`/api/admin/termine?von=${ziel.start.slice(0, 10)}&bis=${ziel.start.slice(0, 10)}`);
  const aktiv = (r.json.termine || []).filter((t) => ["gebucht", "bestaetigt"].includes(t.status));
  const ueber = aktiv.some((a, i) => aktiv.some((b, j) => j > i && a.mitarbeiter?.id === b.mitarbeiter?.id && new Date(a.start) < new Date(b.ende) && new Date(b.start) < new Date(a.ende)));
  pruefe(r.status === 200 && !ueber, "Kalender: keine überschneidenden Termine je Mitarbeiter", aktiv.length);

  // Verwaltung per Link
  const tok = buchungen[0]?.verwaltenToken;
  r = await anon.post("/api/portal/termine/oeffentlich/verwalten", { token: tok });
  pruefe(r.status === 200 && r.json.termin?.id === buchungen[0]?.termin.id, "Termin über den Link aus der E-Mail abrufbar", r.status);
  r = await anon.post("/api/portal/termine/oeffentlich/verwalten", { token: "x".repeat(43) });
  pruefe(r.status === 404, "Falscher Link → 404", r.status);
  r = await anon.post("/api/portal/termine/oeffentlich/verwalten", { token: tok, aktion: "stornieren", grund: "Test" });
  pruefe(r.status === 200 && r.json.termin?.status === "storniert", "Storno per Link", r.json.termin?.status);
  r = await admin.get("/api/admin/postausgang?limit=80");
  const icsMail = (r.json.mails || []).find((m) => m.an === `svc-test-${LAUF}-t0@example.com` && m.anhang?.mime === "text/calendar");
  pruefe(!!icsMail && /BEGIN:VCALENDAR/.test(icsMail.anhang.inhalt) && /UID:/.test(icsMail.anhang.inhalt), "Bestätigung mit ICS-Einladung", icsMail?.betreff);

  // Portal-Buchung + ICS nur für Beteiligte
  const kSlots = (await kunde.get("/api/portal/termine/slots?art=beratung_telefon")).json.slots || [];
  r = await kunde.post("/api/portal/termine", { art: "beratung_telefon", start: kSlots[kSlots.length - 1]?.start });
  pruefe(r.status === 201, "Kunde bucht im Portal", r.json);
  const kt = r.json.termin;
  r = await kunde.anfrage("GET", `/api/portal/termine/${kt?.id}/ics`, undefined, { roh: true });
  const icsText = await r.text();
  pruefe(r.status === 200 && /text\/calendar/.test(r.headers.get("content-type") || "") && /DTSTART:\d{8}T\d{6}Z/.test(icsText), "ICS-Download für den Kunden", r.status);
  r = await fremd.get(`/api/portal/termine/${kt?.id}/ics`);
  pruefe(r.status === 403, "ICS fremder Termin → 403", r.status);
  r = await fremd.patch(`/api/portal/termine/${kt?.id}`, { aktion: "stornieren" });
  pruefe(r.status === 403, "Fremder Termin kann nicht storniert werden (403)", r.status);
  r = await kunde.patch(`/api/portal/termine/${kt?.id}`, { aktion: "bestaetigen" });
  pruefe(r.status === 403, "Kunde kann nicht „bestätigen“ (403)", r.status);

  // Abwesenheit → Vertretung (Akquise → Leitung)
  const bo = await admin.get("/api/admin/termine/verfuegbarkeit");
  const akqId = bo.json.mitarbeiter?.find((m) => m.email === "bo-akquise@example.com")?.id;
  const adminId = admin.nutzer.id;
  const von = new Date(Date.now() + 21 * 86400e3).toISOString().slice(0, 10);
  const bis = new Date(Date.now() + 34 * 86400e3).toISOString().slice(0, 10);
  const sA = (await admin.get(`/api/portal/termine/slots?art=beratung_telefon&von=${von}&bis=${bis}&mitarbeiter=${akqId}`)).json.slots || [];
  const sL = new Set(((await admin.get(`/api/portal/termine/slots?art=beratung_telefon&von=${von}&bis=${bis}&mitarbeiter=${adminId}`)).json.slots || []).map((s) => s.start));
  const vorhandeneAbw = ((await admin.get(`/api/admin/hr/abwesenheiten?konto=${akqId}`)).json.abwesenheiten || []).map((a) => [a.von, a.bis]);
  const gemeinsam = sA.find((s) => sL.has(s.start) && !vorhandeneAbw.some(([v, b]) => v <= s.start.slice(0, 10) && s.start.slice(0, 10) <= b));
  if (akqId && gemeinsam) {
    r = await admin.post("/api/admin/termine", { art: "beratung_telefon", start: gemeinsam.start, fuerKontoId: kunde.nutzer.id, mitarbeiterId: akqId });
    pruefe(r.status === 201 && r.json.termin.mitarbeiter?.id === akqId, "Backoffice bucht Termin bei Akquise", r.json);
    const vt = r.json.termin;
    const tag = new Date(gemeinsam.start).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
    const aufg = await admin.post("/api/admin/aufgaben", { titel: `Vertretungstest ${LAUF}`, faelligAm: tag, zustaendigId: akqId });
    r = await akquise.post("/api/admin/hr/abwesenheiten", { mitarbeiterId: adminId, von: tag, bis: tag, art: "urlaub" });
    pruefe(r.status === 403, "Abwesenheit anderer nur durch die Leitung (403)", r.status);
    r = await admin.post("/api/admin/hr/abwesenheiten", { mitarbeiterId: akqId, von: tag, bis: tag, art: "fortbildung", vertretungId: adminId });
    pruefe(r.status === 201 && r.json.vertretung?.termine >= 1 && r.json.vertretung?.aufgaben >= 1, "Abwesenheit → Termin und Aufgabe gehen an die Vertretung", r.json.vertretung);
    const abwId = r.json.abwesenheit?.id;
    r = await admin.get(`/api/portal/termine/${vt?.id}`);
    pruefe(r.json.termin?.mitarbeiter?.id === adminId && r.json.termin?.vertretungFuer?.id === akqId, "Termin zeigt Vertretung und Vertretenen", r.json.termin?.mitarbeiter);
    r = await admin.get(`/api/admin/aufgaben?zustaendig=${adminId}`);
    r = await admin.get(`/api/portal/termine/slots?art=beratung_telefon&von=${tag}&bis=${tag}&mitarbeiter=${akqId}`);
    pruefe(r.status === 200 && r.json.slots.length === 0, "Abwesende Person hat an dem Tag keine freien Slots", r.json.slots?.length);
    if (aufg.json?.aufgabe?.id || aufg.json?.id) await admin.patch(`/api/admin/aufgaben/${aufg.json.aufgabe?.id || aufg.json.id}`, { status: "erledigt" });
    if (abwId) await admin.del(`/api/admin/hr/abwesenheiten/${abwId}`);
    await admin.patch(`/api/portal/termine/${vt?.id}`, { aktion: "stornieren" });
  } else pruefe(false, "Gemeinsamer freier Slot Akquise/Leitung gefunden", { akqId, sA: sA.length, sL: sL.size });

  // ============================================================ Tickets
  abschnitt("Service & Support");
  r = await kunde.post("/api/portal/support", { betreff: `Frage zur Abrechnung ${LAUF}`, text: "Bitte prüfen Sie die Abrechnung, der Abschlag ist unklar.", kategorie: "abrechnung" });
  pruefe(r.status === 201 && r.json.ticket?.status === "neu", "Kunde eröffnet Ticket", r.json);
  const tk = r.json.ticket;
  pruefe(!!tk?.sla?.reaktionBis && tk?.sla?.reaktion === undefined, "Kunde sieht Reaktionsziel, aber keine SLA-Interna", tk?.sla);
  r = await fremd.get(`/api/portal/support/${tk.id}`);
  pruefe(r.status === 403, "Fremdes Ticket → 403", r.status);
  r = await fremd.post(`/api/portal/support/${tk.id}`, { text: "Hallo" });
  pruefe(r.status === 403, "Fremdes Ticket: Antwort → 403", r.status);
  r = await fremd.get("/api/portal/support");
  pruefe(r.status === 200 && !r.json.tickets.some((t) => t.id === tk.id), "Fremde Liste ohne das Ticket");
  r = await admin.post(`/api/portal/support/${tk.id}`, { text: "Interne Notiz: Zähler prüfen.", intern: true });
  r = await admin.post(`/api/portal/support/${tk.id}`, { text: "Wir prüfen die Abrechnung und melden uns." });
  pruefe(r.status === 200 && r.json.ticket.status === "in_arbeit" && !!r.json.ticket.sla?.reaktion?.erfuellt, "Antwort des Service setzt erste Reaktion (SLA)", r.json.ticket?.sla);
  r = await kunde.get(`/api/portal/support/${tk.id}`);
  pruefe(r.status === 200 && r.json.ticket.nachrichten.length === 2 && !r.json.ticket.nachrichten.some((m) => m.intern || /Interne Notiz/.test(m.text)), "Kunde sieht keine internen Notizen", r.json.ticket?.nachrichten?.length);
  r = await kunde.patch(`/api/portal/support/${tk.id}`, { aktion: "status", status: "geloest" });
  pruefe(r.status === 403, "Kunde kann den Status nicht setzen (403)", r.status);
  r = await lesen.post(`/api/portal/support/${tk.id}`, { text: "Antwort aus Lesen" });
  pruefe(r.status === 403, "Unterrolle „lesen“ antwortet nicht (403)", r.status);
  r = await akquise.post("/api/admin/support", { stoerungId: "ST-26-XXXXXX" });
  pruefe(r.status === 403, "Unterrolle „akquise“ darf im Support nicht schreiben (403)", r.status);
  const fd = new FormData();
  fd.append("datei", new Blob([Buffer.from(testPng().split(",")[1], "base64")], { type: "image/png" }), "zaehler.png");
  r = await kunde.post(`/api/portal/support/${tk.id}/anhang`, fd, { kopf: { "X-Plattform-Upload": "1" } });
  pruefe(r.status === 200 && r.json.anhang?.id, "Kunde lädt Anhang hoch", r.json);
  const aid = r.json.anhang?.id;
  r = await fremd.get(`/api/portal/support/${tk.id}/anhang/${aid}`);
  pruefe(r.status === 403, "Fremdes Konto: Anhang → 403", r.status);
  r = await admin.anfrage("GET", `/api/portal/support/${tk.id}/anhang/${aid}`, undefined, { roh: true });
  pruefe(r.status === 200 && /image\/png/.test(r.headers.get("content-type") || ""), "Backoffice lädt Anhang", r.status);
  r = await kunde.patch(`/api/portal/support/${tk.id}`, { aktion: "schliessen" });
  pruefe(r.status === 200 && r.json.ticket.status === "geschlossen", "Kunde schließt eigenes Ticket", r.json.ticket?.status);
  // Anlagen: fremde Anlage → 403; Ticket aus Störung idempotent
  const anl = await admin.get("/api/portal/anlagen");
  const fremdeAnlage = (anl.json.anlagen || [])[0]?.id;
  if (fremdeAnlage) {
    r = await kunde.post("/api/portal/support", { betreff: "Störung fremde Anlage", text: "Diese Anlage gehört mir nicht, Test.", kategorie: "stoerung", anlageId: fremdeAnlage });
    pruefe(r.status === 403, "Ticket zu fremder Anlage → 403", r.status);
  }
  const st = await admin.get("/api/portal/anlagen/stoerungen?status=alle");
  const stId = (st.json.stoerungen || [])[0]?.id;
  if (stId) {
    const a1 = await admin.post("/api/admin/support", { stoerungId: stId });
    const a2 = await admin.post("/api/admin/support", { stoerungId: stId });
    pruefe(a1.status === 201 && a1.json.ticket?.id === a2.json.ticket?.id && a1.json.ticket?.kategorie === "stoerung", "Ticket aus Anlagen-Störung (idempotent)", a1.json.ticket?.id);
  }
  r = await admin.get("/api/admin/support?status=offen");
  pruefe(r.status === 200 && typeof r.json.kennzahlen?.slaVerletzt === "number", "Backoffice-Liste mit SLA-Kennzahlen", r.json.kennzahlen);
  r = await kunde.get("/api/admin/support");
  pruefe(r.status === 403, "Kunde: Backoffice-Ticketliste → 403", r.status);

  // ============================================================ Wissen
  abschnitt("Wissensdatenbank (nur intern)");
  r = await admin.get("/api/admin/wissen?q=Signatur");
  pruefe(r.status === 200 && r.json.artikel.length >= 1, "Suche in der Wissensdatenbank", r.json.artikel?.length);
  r = await kunde.get("/api/admin/wissen");
  pruefe(r.status === 403, "Kunde: Wissensdatenbank → 403", r.status);
  r = await lesen.post("/api/admin/wissen", { titel: "Test", kategorie: "it", inhalt: "Das ist ein Testartikel mit genug Text." });
  pruefe(r.status === 403, "Unterrolle „lesen“ schreibt keine Artikel (403)", r.status);
  r = await admin.post("/api/admin/wissen", { titel: `Testartikel ${LAUF}`, kategorie: "it", inhalt: "Das ist ein Testartikel mit genug Text für die Prüfung.", tags: ["test"] });
  pruefe(r.status === 201 && r.json.artikel.version === 1, "Artikel anlegen", r.json);
  const wid = r.json.artikel?.id;
  r = await admin.patch(`/api/admin/wissen/${wid}`, { titel: `Testartikel ${LAUF} v2`, kategorie: "it", inhalt: "Überarbeiteter Inhalt des Testartikels mit genug Text.", tags: ["test"] });
  pruefe(r.status === 200 && r.json.artikel.version === 2 && r.json.artikel.versionen.length === 1, "Neue Version beim Speichern", r.json.artikel?.version);
  r = await admin.del(`/api/admin/wissen/${wid}`);
  pruefe(r.status === 200, "Artikel löschen", r.status);

  // ============================================================ HR
  abschnitt("HR & interne Steuerung");
  r = await admin.get("/api/admin/hr");
  pruefe(r.status === 200 && r.json.mitarbeiter.some((m) => m.auslastung && Array.isArray(m.gebiete)), "Team-Übersicht mit Auslastung und Gebieten", r.json.mitarbeiter?.length);
  r = await kunde.get("/api/admin/hr");
  pruefe(r.status === 403, "Kunde: Team → 403", r.status);
  const projekte = await admin.get("/api/admin/projekte");
  const pid = (projekte.json.projekte || [])[0]?.id;
  r = await lesen.post("/api/admin/hr/zeiten", { datum: new Date().toISOString().slice(0, 10), stunden: 1.5, projektId: pid, taetigkeit: "verwaltung", text: "Test" });
  pruefe(r.status === 201, "Eigene Zeit erfassen (auch Unterrolle „lesen“)", r.json);
  const zid = r.json.zeit?.id;
  r = await lesen.post("/api/admin/hr/zeiten", { kontoId: adminId, datum: new Date().toISOString().slice(0, 10), stunden: 1, projektId: pid, taetigkeit: "verwaltung" });
  pruefe(r.status === 403, "Zeiten anderer nur durch die Leitung (403)", r.status);
  r = await admin.get(`/api/admin/hr/auswertung?projekt=${pid}`);
  pruefe(r.status === 200 && r.json.summe >= 1.5, "Auswertung je Projekt (Schnittstelle Projektentwicklung/Finanzen)", r.json);
  if (zid) await lesen.del(`/api/admin/hr/zeiten/${zid}`);

  // ============================================================ Seiten
  abschnitt("Seiten");
  for (const [c, pfad, erwartet] of [
    [admin, "/portal/signatur", 200], [admin, `/portal/signatur/${sv.id}`, 200], [kunde, `/portal/signatur/${sv.id}`, 200], [fremd, `/portal/signatur/${sv.id}`, 404],
    [kunde, "/portal/termine", 200], [kunde, "/portal/support", 200], [kunde, `/portal/support/${tk.id}`, 200], [fremd, `/portal/support/${tk.id}`, 404],
    [admin, "/portal/admin/kalender", 200], [admin, "/portal/admin/support", 200], [admin, "/portal/admin/team", 200], [admin, "/portal/admin/wissen", 200],
    [kunde, "/portal/admin/wissen", 404], [kunde, "/portal/admin/kalender", 404], [anon, "/termin", 200], [anon, `/termin/verwalten?token=${tok}`, 200],
  ]) {
    const res = await c.anfrage("GET", pfad, undefined, { origin: null });
    // Portal-Seiten streamen (loading.js): notFound() kann nach dem ersten Byte kommen → Status 200 mit 404-Fallback
    const nichtGefunden = res.status === 404 || res.text.includes("NEXT_HTTP_ERROR_FALLBACK;404");
    const geheim = /Testvertrag|Frage zur Abrechnung/.test(res.text);
    pruefe(erwartet === 404 ? nichtGefunden && !geheim : res.status === 200 && !nichtGefunden, `${pfad} (${c.name}) → ${erwartet}`, res.status);
  }

  console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(2);
});
