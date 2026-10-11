// scripts/plattform-test-security-pen.mjs
//
// Regressionstests des Pen-Tests „Plattform-Armee, Paket SECURITY“ (Protokoll: qa/pentest-2026-10.md)
// gegen den laufenden Dev-Server (Demo-Backend):
//   node scripts/plattform-test-security-pen.mjs [basis-url]
//
// Geprüft:
//   S1  Falsche 2FA-Codes bzw. Passwörter bei sensiblen Aktionen in der Sitzung (neue Wiederherstellungs-
//       codes, 2FA abschalten, E-Mail ändern) zählen zur Kontosperre (exponentieller Backoff wie beim Login).
//   S2  Body-Größenlimit zählt Bytes, nicht UTF-16-Einheiten (Chunked-Anfrage ohne Content-Length → 413).
//   Dazu Kurzregression: Massenzuweisung bei Registrierung/Profil, CSRF-Origin, Fehlerbild ohne Interna.
//
// Eigene Testkonten mit Präfix „pen-“ (…@example.com); Demo-Konten werden nicht verändert.

import { createHmac } from "node:crypto";

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const LAUF = Date.now().toString(36);
const PW = `Pen-${LAUF}-Passwort1`;

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
    console.log(`  ${rot("✗")} ${text}${details !== undefined ? ` – ${JSON.stringify(details).slice(0, 300)}` : ""}`);
  }
  return bedingung;
}
const abschnitt = (t) => console.log(`\n${t}`);

// ---------------------------------------------------------------- TOTP (RFC 6238) für den Test
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Lesen(s) {
  let bits = 0;
  let wert = 0;
  const out = [];
  for (const z of s.replace(/[\s=]/g, "").toUpperCase()) {
    wert = (wert << 5) | B32.indexOf(z);
    bits += 5;
    if (bits >= 8) {
      out.push((wert >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
function totp(geheimnis, zeitMs = Date.now()) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(Math.floor(zeitMs / 30000)));
  const h = createHmac("sha1", base32Lesen(geheimnis)).update(b).digest();
  const o = h[h.length - 1] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, "0");
}

// ---------------------------------------------------------------- HTTP-Client mit Cookies
class Client {
  constructor() {
    this.cookies = new Map();
  }
  async anfrage(methode, pfad, body, { origin = BASIS, kopf = {} } = {}) {
    const headers = { "User-Agent": "plattform-test-security-pen", ...kopf };
    if (origin !== null) headers.Origin = origin;
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    let payload;
    if (body !== undefined) {
      headers["Content-Type"] ||= "application/json";
      payload = typeof body === "string" || body instanceof ReadableStream ? body : JSON.stringify(body);
    }
    // Dev-Server kompiliert bei Bedarf neu – einzelne Verbindungsabbrüche (ECONNRESET) kurz wiederholen
    let res;
    for (let versuch = 0; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual", ...(payload instanceof ReadableStream ? { duplex: "half" } : {}) });
        break;
      } catch (e) {
        if (versuch >= 2 || payload instanceof ReadableStream) throw e;
        await new Promise((r) => setTimeout(r, 2000 * (versuch + 1)));
      }
    }
    for (const sc of res.headers.getSetCookie?.() || []) {
      const [kv] = sc.split(";");
      const i = kv.indexOf("=");
      const name = kv.slice(0, i).trim();
      const wert = kv.slice(i + 1);
      if (wert === "" || /Max-Age=0/i.test(sc)) this.cookies.delete(name);
      else this.cookies.set(name, wert);
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text, headers: res.headers };
  }
  get(pfad) {
    return this.anfrage("GET", pfad);
  }
  post(pfad, body, o) {
    return this.anfrage("POST", pfad, body, o);
  }
}

async function registrieren(email, extra = {}) {
  const c = new Client();
  const r = await c.post("/api/auth/registrieren", { email, passwort: PW, vorname: "Pen", nachname: "Test", rollen: ["investor"], agb: true, ...extra });
  return { c, r };
}

async function zweiFaktorAktivieren(c) {
  let r = await c.post("/api/portal/sicherheit/zwei-faktor", { aktion: "starten" });
  const geheimnis = r.json?.geheimnis;
  r = await c.post("/api/portal/sicherheit/zwei-faktor", { aktion: "bestaetigen", code: totp(geheimnis) });
  return { geheimnis, r };
}

// ================================================================ Tests

abschnitt("Kurzregression: Massenzuweisung, CSRF, Fehlerbild");
{
  const { c, r } = await registrieren(`pen-masse-${LAUF}@example.com`, { emailBestaetigt: true, backofficeRollen: ["leitung"], id: "U-99-PEN", aktiv: true });
  pruefe(r.status === 201 && r.json?.nutzer?.emailBestaetigt === false && !r.json?.nutzer?.backofficeRollen && r.json?.nutzer?.id !== "U-99-PEN", "Registrierung übernimmt keine unerwarteten Felder", r.json?.nutzer);
  let p = await c.anfrage("PATCH", "/api/portal/profil", { vorname: "Pen", nachname: "Test", rollen: ["admin", "gutachter", "bank", "investor"] });
  const rollen = p.json?.nutzer?.rollen || [];
  pruefe(p.status === 200 && !rollen.includes("admin") && !rollen.includes("gutachter") && !rollen.includes("bank"), "Profil: geschützte Rollen nicht selbst wählbar", rollen);
  p = await c.anfrage("PATCH", "/api/portal/profil", { vorname: "X", nachname: "Y" }, { origin: "https://evil.example" });
  pruefe(p.status === 403, "CSRF: fremder Origin → 403", p.status);
  p = await c.anfrage("PATCH", "/api/portal/profil", { vorname: "X", nachname: "Y" }, { origin: null });
  pruefe(p.status === 403, "CSRF: ohne Origin → 403", p.status);
  p = await c.anfrage("PATCH", "/api/portal/profil", "{kaputt");
  pruefe(p.status === 400 && !/SyntaxError|position|node_modules/i.test(p.text), "Ungültiges JSON → 400 ohne Interna", p.text.slice(0, 160));
}

abschnitt("S1: Falsche 2FA-Codes bei „neue Wiederherstellungscodes“ zählen zur Kontosperre");
{
  const email = `pen-codes-${LAUF}@example.com`;
  const { c } = await registrieren(email);
  const { r } = await zweiFaktorAktivieren(c);
  pruefe(r.status === 200 && (r.json?.codes || []).length === 10, "2FA aktiviert", r.json);
  const status = [];
  let letzte = null;
  for (let i = 0; i < 5; i++) {
    letzte = await c.post("/api/portal/sicherheit/zwei-faktor", { aktion: "codes", code: "000000" });
    status.push(letzte.status);
  }
  pruefe(status.slice(0, 5).every((s) => s === 422), "5 falsche Codes → jeweils 422", status);
  letzte = await c.post("/api/portal/sicherheit/zwei-faktor", { aktion: "codes", code: "000000" });
  pruefe(letzte.status === 429 && letzte.json?.code === "gesperrt", "6. Versuch → 429 (Konto gesperrt, Backoff)", letzte.json);
  const fremd = new Client();
  const login = await fremd.post("/api/auth/login", { email, passwort: PW });
  pruefe(login.status === 429 && login.json?.code === "gesperrt", "Sperre gilt auch für die Anmeldung mit richtigem Passwort", login.json);
  const hist = await c.get("/api/portal/sicherheit");
  pruefe((hist.json?.anmeldungen || []).filter((a) => !a.ok && a.grund === "2fa").length >= 5, "Fehlversuche stehen in der Anmeldehistorie", hist.json?.anmeldungen?.slice(0, 3));
  // Mit gültigem Code (nächster Zeitschritt, Replay-Schutz) geht es nach Ablauf der Sperre weiter – hier nur: gültiger Code VOR weiterer Sperrverlängerung bleibt 429 (Sperre hat Vorrang)
  const nochGesperrt = await c.post("/api/portal/sicherheit/zwei-faktor", { aktion: "codes", code: "123456" });
  pruefe(nochGesperrt.status === 429, "solange gesperrt: auch weitere Versuche → 429", nochGesperrt.status);
}

abschnitt("S1: Falsches Passwort bei „E-Mail ändern“ und „2FA abschalten“ zählt zur Kontosperre");
{
  const email = `pen-pw-${LAUF}@example.com`;
  const { c } = await registrieren(email);
  const status = [];
  for (let i = 0; i < 5; i++) {
    const r = await c.post("/api/portal/konto/email", { neu: `pen-neu-${LAUF}-${i}@example.com`, passwort: "Falsches-Passwort-1" });
    status.push(r.status);
  }
  pruefe(status.every((s) => s === 422), "5 falsche Passwörter → jeweils 422", status);
  const r6 = await c.post("/api/portal/konto/email", { neu: `pen-neu-${LAUF}-x@example.com`, passwort: "Falsches-Passwort-1" });
  pruefe(r6.status === 429 && r6.json?.code === "gesperrt", "6. Versuch → 429 (Konto gesperrt)", r6.json);
  const fremd = new Client();
  const login = await fremd.post("/api/auth/login", { email, passwort: PW });
  pruefe(login.status === 429 && login.json?.code === "gesperrt", "Sperre gilt auch für die Anmeldung", login.json);
}
{
  const email = `pen-deakt-${LAUF}@example.com`;
  const { c } = await registrieren(email);
  const { geheimnis, r } = await zweiFaktorAktivieren(c);
  pruefe(r.status === 200, "2FA aktiviert (zweites Konto)", r.status);
  // richtiges Passwort, falscher Code → zählt; Code des NÄCHSTEN Zeitschritts umgeht den Replay-Schutz der Einrichtung
  const status = [];
  for (let i = 0; i < 5; i++) {
    const d = await c.post("/api/portal/sicherheit/zwei-faktor", { aktion: "deaktivieren", passwort: PW, code: "000000" });
    status.push(d.status);
  }
  pruefe(status.every((s) => s === 422), "Abschalten: 5 falsche Codes → jeweils 422", status);
  const d6 = await c.post("/api/portal/sicherheit/zwei-faktor", { aktion: "deaktivieren", passwort: PW, code: totp(geheimnis, Date.now() + 30000) });
  pruefe(d6.status === 429 && d6.json?.code === "gesperrt", "danach auch mit richtigem Code → 429 (Sperre hat Vorrang)", d6.json);
}

abschnitt("S1: Falsches altes Passwort bei „Passwort ändern“ zählt zur Kontosperre (Nachzügler aus der Prüfung)");
{
  const email = `pen-pwneu-${LAUF}@example.com`;
  const { c } = await registrieren(email);
  const status = [];
  for (let i = 0; i < 5; i++) {
    const r = await c.post("/api/portal/passwort", { alt: "Falsches-Passwort-1", neu: `Pen-${LAUF}-Neues1` });
    status.push(r.status);
  }
  pruefe(status.every((s) => s === 422), "5 falsche alte Passwörter → jeweils 422", status);
  // IP-Rate-Limit „passwort“ (5/h) ist jetzt ausgeschöpft – die Kontosperre weisen wir über die Anmeldung nach
  const fremd = new Client();
  const login = await fremd.post("/api/auth/login", { email, passwort: PW });
  pruefe(login.status === 429 && login.json?.code === "gesperrt", "Konto gesperrt: Anmeldung mit richtigem Passwort → 429", login.json);
}

abschnitt("S2: Body-Limit zählt Bytes (Chunked ohne Content-Length)");
{
  const email = `pen-bytes-${LAUF}@example.com`;
  const { c } = await registrieren(email);
  // 40 000 „ä“ = 40 000 UTF-16-Einheiten, aber 80 000 Bytes UTF-8 (> 64 KiB); ohne Content-Length (Chunked)
  const body = JSON.stringify({ vorname: "ä".repeat(40000), nachname: "Test" });
  const strom = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  const r = await c.anfrage("PATCH", "/api/portal/profil", strom);
  pruefe(r.status === 413, "40 000 Umlaute (80 KB UTF-8, Chunked) → 413", r.status);
}

console.log(`\n${ok} Prüfungen bestanden, ${fehler} fehlgeschlagen.`);
process.exit(fehler ? 1 : 0);
