// scripts/plattform-test-sicherheit.mjs
//
// End-to-End-Test „Login, Sicherheit & Teams“ gegen den laufenden Dev-Server (Demo-Backend).
//   node scripts/plattform-test-sicherheit.mjs [basis-url]
//
// Geprüft: sichere Kopfzeilen · TOTP (Einrichtung, falscher Code, Replay, Gerät merken) · Wiederherstellungscode einmalig ·
// Passwort-Reset ersetzt keinen zweiten Faktor · E-Mail-Link einmalig/abgelaufen · Kontosperre mit Backoff ·
// Sitzungen (Liste, einzeln widerrufen → 401, alle anderen abmelden) · Anmeldehistorie · neues Gerät → Meldung ·
// Organisationen (Einladung, Teamrollen lesen/mitglied, Fremdorganisation → 403, Entfernen) · Datenexport nur eigene Daten ·
// Konto-Komfort · E-Mail ändern · Konto löschen · Pflicht-2FA-Einstellung nur Backoffice · neue Seiten.
// Eigene Testkonten mit Präfix „sec-“ (…@example.com); die Demo-Konten werden nicht verändert.

import { createHmac, createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const BASIS = (process.argv[2] || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const LAUF = Date.now().toString(36);
const PW = `Sicher-${LAUF}-Passwort1`;

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
function hotp(schluessel, zaehler) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(zaehler));
  const h = createHmac("sha1", schluessel).update(b).digest();
  const o = h[h.length - 1] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, "0");
}
const schritt = () => Math.floor(Date.now() / 30000);

// ---------------------------------------------------------------- HTTP-Client mit allen Cookies
class Client {
  constructor(name, ua = "plattform-test-sicherheit") {
    this.name = name;
    this.cookies = new Map();
    this.ua = ua;
  }
  get cookie() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async anfrage(methode, pfad, body, { origin = BASIS, kopf = {}, roh = false } = {}) {
    const headers = { "User-Agent": this.ua, ...kopf };
    if (origin) headers.Origin = origin;
    if (this.cookies.size) headers.Cookie = this.cookie;
    let payload;
    if (body !== undefined) {
      headers["Content-Type"] ||= "application/json";
      payload = typeof body === "string" ? body : JSON.stringify(body);
    }
    let res;
    for (let versuch = 1; ; versuch++) {
      try {
        res = await fetch(BASIS + pfad, { method: methode, headers, body: payload, redirect: "manual" });
        break;
      } catch (e) {
        if (versuch >= 4) throw e;
        await new Promise((r) => setTimeout(r, 3000 * versuch));
      }
    }
    for (const c of res.headers.getSetCookie?.() || []) {
      const [paar] = c.split(";");
      const i = paar.indexOf("=");
      const name = paar.slice(0, i);
      const wert = paar.slice(i + 1);
      if (!wert || /max-age=0/i.test(c)) this.cookies.delete(name);
      else this.cookies.set(name, wert);
    }
    if (roh) return res;
    let text = "";
    try {
      text = await res.text();
    } catch {
      text = ""; // Verbindung beim Lesen abgebrochen (überlasteter Dev-Server)
    }
    let json;
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
  put = (p, b, o) => this.anfrage("PUT", p, b ?? {}, o);
  del = (p, o) => this.anfrage("DELETE", p, undefined, o);
  async login(email, passwort = PW) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email} fehlgeschlagen: ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
    return r.json;
  }
  async registrieren(email, rollen, extra = {}) {
    const r = await this.post("/api/auth/registrieren", { email, passwort: PW, vorname: "Sec", nachname: `Test ${this.name}`, rollen, agb: true, ...extra });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
    return r.json.nutzer;
  }
}

const mail = (k) => `sec-${k}-${LAUF}@example.com`;

async function demoLink(admin, art, email) {
  for (let i = 0; i < 5; i++) {
    const r = await admin.get("/api/admin/demo-links");
    const l = r.json.links?.find((x) => x.art === art && x.email === email);
    if (l) return l.link;
    await new Promise((res) => setTimeout(res, 300));
  }
  return null;
}
const pfadVon = (link) => {
  const u = new URL(link);
  return u.pathname + u.search;
};

/** Demo-Datenbank direkt ändern (nur für den Ablauf-Test) – gleiche Sperrdatei wie backend/demo/speicher.js */
async function demoDbAendern(fn) {
  const ordner = path.join(process.cwd(), ".data");
  const datei = path.join(ordner, "plattform.json");
  const sperre = path.join(ordner, "plattform.lock");
  const start = Date.now();
  for (;;) {
    try {
      const h = await fs.open(sperre, "wx");
      await h.writeFile("test");
      await h.close();
      break;
    } catch (e) {
      if (e.code !== "EEXIST" || Date.now() - start > 8000) throw e;
      await new Promise((r) => setTimeout(r, 20));
    }
  }
  try {
    const db = JSON.parse(await fs.readFile(datei, "utf8"));
    fn(db);
    const tmp = `${datei}.test.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 1), "utf8");
    for (let i = 0; ; i++) {
      try {
        await fs.rename(tmp, datei);
        break;
      } catch (e) {
        if (i > 20) throw e;
        await new Promise((r) => setTimeout(r, 15));
      }
    }
  } finally {
    await fs.rm(sperre, { force: true });
  }
}

async function main() {
  console.log(`Sicherheits-Test gegen ${BASIS} (Lauf ${LAUF})`);
  const admin = new Client("admin");
  await admin.login("admin@example.com", DEMO_PASSWORT);
  let r;

  // ------------------------------------------------------------ 1. Kopfzeilen, Seiten
  abschnitt("1. Sichere Kopfzeilen und neue Seiten");
  const gast = new Client("gast");
  r = await gast.get("/login");
  pruefe(r.status === 200 && r.headers.get("x-frame-options") === "DENY" && /frame-ancestors 'none'/.test(r.headers.get("content-security-policy") || ""), "/login: X-Frame-Options DENY + CSP frame-ancestors", [r.status, r.headers.get("x-frame-options")]);
  r = await gast.get("/login/link?token=ungueltig-aber-lang-genug-1234567890");
  pruefe(r.status === 200 && r.headers.get("referrer-policy") === "no-referrer", "/login/link 200, Referrer-Policy no-referrer", [r.status, r.headers.get("referrer-policy")]);
  r = await gast.get("/einladung/gibt-es-nicht-abcdefghijklmnopqrstu");
  pruefe(r.status === 200 && /nicht mehr gültig/.test(r.text), "/einladung/<ungültig> 200 mit Hinweis", r.status);
  r = await gast.get("/portal/sicherheit");
  pruefe([302, 307].includes(r.status), "/portal/sicherheit ohne Sitzung → Login", r.status);

  // ------------------------------------------------------------ 2. Zwei-Faktor (TOTP)
  abschnitt("2. Zwei-Faktor-Anmeldung (TOTP, Replay, Wiederherstellungscodes, Gerät merken)");
  const t = new Client("t");
  const tEmail = mail("t");
  await t.registrieren(tEmail, ["investor"]);
  r = await t.post("/api/portal/sicherheit/zwei-faktor", { aktion: "starten" });
  pruefe(r.status === 200 && /^[A-Z2-7]{32}$/.test(r.json.geheimnis) && r.json.uri.startsWith("otpauth://totp/") && r.json.uri.includes(`secret=${r.json.geheimnis}`), "Einrichtung: Base32-Schlüssel + otpauth-URI", r.json);
  const geheimnis = base32Lesen(r.json.geheimnis || "");
  r = await t.post("/api/portal/sicherheit/zwei-faktor", { aktion: "bestaetigen", code: hotp(geheimnis, schritt() + 5) });
  pruefe(r.status === 422, "falscher Code bei der Einrichtung → 422", r.status);
  const s0 = schritt();
  const code0 = hotp(geheimnis, s0);
  r = await t.post("/api/portal/sicherheit/zwei-faktor", { aktion: "bestaetigen", code: code0 });
  const codes = r.json.codes || [];
  pruefe(r.status === 200 && codes.length === 10 && codes.every((c) => /^[0-9A-Z]{5}-[0-9A-Z]{5}$/.test(c)) && new Set(codes).size === 10, "aktiviert: 10 eindeutige Wiederherstellungscodes", r.json);
  pruefe(r.json.status?.aktiv === true, "Status aktiv");
  r = await t.get("/api/portal/sicherheit");
  pruefe(r.status === 200 && r.json.zweiFaktor.aktiv && r.json.sitzungen.some((s) => s.aktuell && s.zweiFaktor), "Sitzung nach Einrichtung rotiert und 2FA-markiert", r.json.sitzungen);
  pruefe(!JSON.stringify(r.json).includes(codes[0]) && !JSON.stringify(r.json).toLowerCase().includes("geheimnis\":\""), "Übersicht enthält keine Codes/Schlüssel");
  await t.post("/api/auth/logout", {});

  r = await t.post("/api/auth/login", { email: tEmail, passwort: PW });
  pruefe(r.status === 200 && r.json.zweiFaktor === true && !r.json.nutzer, "Login mit Passwort → Zwischenschritt, noch keine Nutzerdaten", r.json);
  pruefe(!t.cookies.has("oi_sitzung") && t.cookies.has("oi_2fa"), "kein Sitzungscookie, nur Zwischen-Cookie", [...t.cookies.keys()]);
  r = await t.get("/api/auth/ich");
  pruefe(r.json.nutzer === null, "vor dem Code: nicht angemeldet");
  r = await t.post("/api/auth/zwei-faktor", { code: code0 === "000000" ? "111111" : "000000" });
  pruefe(r.status === 401 && r.json.code === "zwei_faktor", "falscher Code → 401", r.json);
  r = await t.post("/api/auth/zwei-faktor", { code: code0 });
  pruefe(r.status === 401, "Replay: bereits verwendeter Code → 401", r.status);
  // nächster Zeitschritt ist im Toleranzfenster (±1) gültig und neuer als der letzte
  const naechster = Math.max(schritt(), s0 + 1);
  r = await t.post("/api/auth/zwei-faktor", { code: hotp(geheimnis, naechster), merken: true });
  pruefe(r.status === 200 && r.json.nutzer?.email === tEmail && r.json.zweiFaktorMethode === "totp", "gültiger neuer Code → angemeldet", r.json);
  pruefe(t.cookies.has("oi_sitzung") && !t.cookies.has("oi_2fa"), "Sitzungscookie gesetzt, Zwischen-Cookie gelöscht", [...t.cookies.keys()]);
  r = await t.post("/api/auth/zwei-faktor", { code: hotp(geheimnis, naechster) });
  pruefe(r.status === 401, "ohne Zwischenschritt kein zweiter Code-Login → 401", r.status);
  await t.post("/api/auth/logout", {});
  r = await t.post("/api/auth/login", { email: tEmail, passwort: PW });
  pruefe(r.status === 200 && !r.json.zweiFaktor && r.json.nutzer?.email === tEmail, "gemerktes Gerät (30 Tage): kein Code nötig", r.json);

  const t2 = new Client("t2");
  r = await t2.post("/api/auth/login", { email: tEmail, passwort: PW });
  pruefe(r.json.zweiFaktor === true, "anderes Gerät: Code wieder nötig");
  r = await t2.post("/api/auth/zwei-faktor", { code: codes[0].toLowerCase() });
  pruefe(r.status === 200 && r.json.zweiFaktorMethode === "wiederherstellung" && r.json.codesUebrig === 9, "Wiederherstellungscode (Kleinschreibung egal) → angemeldet, noch 9", r.json);
  const t3 = new Client("t3");
  await t3.post("/api/auth/login", { email: tEmail, passwort: PW });
  r = await t3.post("/api/auth/zwei-faktor", { code: codes[0] });
  pruefe(r.status === 401, "derselbe Wiederherstellungscode ein zweites Mal → 401", r.status);
  r = await t3.post("/api/auth/zwei-faktor", { code: codes[1] });
  pruefe(r.status === 200, "nächster Wiederherstellungscode funktioniert", r.status);

  await gast.post("/api/auth/passwort-vergessen", { email: tEmail });
  const reset = await demoLink(admin, "reset", tEmail);
  const tr = new Client("t-reset");
  r = await tr.post("/api/auth/passwort-setzen", { token: reset ? new URL(reset).searchParams.get("token") : "", passwort: `${PW}x` });
  pruefe(r.status === 200 && r.json.zweiFaktor === true && !tr.cookies.has("oi_sitzung"), "Passwort-Reset ersetzt keinen zweiten Faktor (Zwischenschritt)", r.json);
  r = await t.get("/api/portal/vorgaenge");
  pruefe(r.status === 401, "Reset beendet bestehende Sitzungen → 401", r.status);
  r = await tr.post("/api/auth/zwei-faktor", { code: codes[2] });
  pruefe(r.status === 200, "nach Reset mit Code angemeldet", r.status);
  r = await tr.post("/api/portal/sicherheit/zwei-faktor", { aktion: "deaktivieren", passwort: "falsch-falsch-1", code: codes[3] });
  pruefe(r.status === 422, "Abschalten mit falschem Passwort → 422", r.status);

  // ------------------------------------------------------------ 3. Kontosperre
  abschnitt("3. Kontosperre mit exponentiellem Backoff, Anmeldehistorie");
  const l = new Client("l");
  const lEmail = mail("l");
  await l.registrieren(lEmail, ["flaeche"]);
  const lg = new Client("l-angreifer");
  const status = [];
  for (let i = 0; i < 5; i++) status.push((await lg.post("/api/auth/login", { email: lEmail, passwort: `falsch-${i}-passwort` })).status);
  pruefe(status.every((s) => s === 401), "5 Fehlversuche → jeweils 401", status);
  r = await lg.post("/api/auth/login", { email: lEmail, passwort: PW });
  pruefe(r.status === 429 && r.json.code === "gesperrt" && /Sekunden|Minute/.test(r.json.error), "danach auch richtiges Passwort gesperrt → 429 (Wartezeit genannt)", r.json);
  r = await l.get("/api/portal/sicherheit");
  pruefe(r.json.anmeldungen?.filter((a) => !a.ok && a.grund === "passwort").length >= 5, "Anmeldehistorie zeigt Fehlversuche", r.json.anmeldungen?.slice(0, 3));
  r = await l.get("/api/portal/benachrichtigungen");
  pruefe(r.json.eintraege?.some((b) => b.art === "sicherheit" && /gesperrt/.test(b.titel)), "Kontosperre wird gemeldet (Glocke)", r.json.eintraege?.map((b) => b.titel));

  // ------------------------------------------------------------ 4. E-Mail-Link
  abschnitt("4. Anmeldung per E-Mail-Link (einmalig, 15 min, auch bei Sperre)");
  r = await gast.post("/api/auth/magic-link", { email: `gibtesnicht-${LAUF}@example.com` });
  pruefe(r.status === 200 && r.json.ok, "unbekannte Adresse → trotzdem ok (keine Enumeration)");
  r = await gast.post("/api/auth/magic-link", { email: lEmail });
  pruefe(r.status === 200 && r.json.ok, "Link angefordert");
  const magic = await demoLink(admin, "magic", lEmail);
  pruefe(!!magic && /\/login\/link\?token=/.test(magic), "Link zeigt auf /login/link (Einlösen nur per Klick)", magic);
  r = await admin.get("/api/admin/postausgang?limit=200");
  pruefe(r.json.mails?.some((m) => m.art === "magic" && m.an === lEmail) && !r.json.mails?.some((m) => m.an === `gibtesnicht-${LAUF}@example.com`), "Mail im Postausgang, keine Mail an unbekannte Adresse");
  const token = magic ? new URL(magic).searchParams.get("token") : "";
  r = await gast.get(pfadVon(magic));
  pruefe(r.status === 200, "Vorabruf der Seite verbraucht das Token nicht", r.status);
  const lm = new Client("l-magic");
  r = await lm.post("/api/auth/magic-link/einloesen", { token });
  pruefe(r.status === 200 && r.json.nutzer?.email === lEmail && lm.cookies.has("oi_sitzung"), "Link eingelöst → angemeldet (trotz Passwort-Sperre)", r.json);
  r = await new Client("x").post("/api/auth/magic-link/einloesen", { token });
  pruefe(r.status === 422, "zweites Einlösen → 422", r.status);
  r = await lg.post("/api/auth/login", { email: lEmail, passwort: PW });
  pruefe(r.status === 200, "erfolgreiche Anmeldung hebt die Sperre auf", r.status);
  await gast.post("/api/auth/magic-link", { email: lEmail });
  const magic2 = await demoLink(admin, "magic", lEmail);
  const token2 = magic2 ? new URL(magic2).searchParams.get("token") : "";
  pruefe(token2 && token2 !== token, "neuer Link");
  await demoDbAendern((db) => {
    const h = createHash("sha256").update(token2).digest("hex");
    const eintrag = db.tokens.find((x) => x.hash === h);
    if (eintrag) eintrag.ablauf = new Date(Date.now() - 60e3).toISOString();
  });
  r = await new Client("y").post("/api/auth/magic-link/einloesen", { token: token2 });
  pruefe(r.status === 422, "abgelaufener Link → 422", r.status);
  r = await new Client("z").post("/api/auth/magic-link/einloesen", { token: "a".repeat(43) });
  pruefe(r.status === 422, "erfundenes Token → 422", r.status);

  // ------------------------------------------------------------ 5. Sitzungen & Geräte
  abschnitt("5. Sitzungen: Liste, widerrufen, alle anderen abmelden, neues Gerät");
  const aEmail = mail("a");
  const a1 = new Client("a1");
  await a1.registrieren(aEmail, ["anbieter"]);
  const a2 = new Client("a2");
  await a2.login(aEmail);
  const a3 = new Client("a3", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1");
  await a3.login(aEmail);
  r = await a1.get("/api/portal/sicherheit/sitzungen");
  const eigene = r.json.sitzungen || [];
  pruefe(eigene.length >= 3 && eigene.filter((s) => s.aktuell).length === 1, "Sitzungsliste mit genau einer aktuellen", eigene.map((s) => [s.geraet, s.aktuell]));
  pruefe(eigene.some((s) => s.geraet === "Safari auf iPhone" && s.mobil), "Gerät grob aus User-Agent („Safari auf iPhone“)", eigene.map((s) => s.geraet));
  r = await a1.get("/api/portal/benachrichtigungen");
  pruefe(r.json.eintraege?.some((b) => b.art === "sicherheit" && /neuen Gerät/.test(b.titel) && /iPhone/.test(b.text)), "Anmeldung von neuem Gerät → Benachrichtigung", r.json.eintraege?.map((b) => b.titel));
  r = await admin.get("/api/admin/postausgang?limit=300");
  pruefe(r.json.mails?.some((m) => m.an === aEmail && m.art === "sicherheit" && /neue/i.test(m.betreff)), "… und Sicherheits-Mail");
  const a2Id = (await a2.get("/api/portal/sicherheit/sitzungen")).json.sitzungen?.find((s) => s.aktuell)?.id;
  r = await a1.del(`/api/portal/sicherheit/sitzungen/${a2Id}`);
  pruefe(r.status === 200 && r.json.beendet === 1, "fremde eigene Sitzung beendet", r.json);
  r = await a2.get("/api/portal/vorgaenge");
  pruefe(r.status === 401, "widerrufene Sitzung → sofort 401", r.status);
  r = await a1.get("/api/portal/vorgaenge");
  pruefe(r.status === 200, "eigene Sitzung bleibt gültig", r.status);
  r = await a3.del(`/api/portal/sicherheit/sitzungen/S-26-GIBTESNICHT`);
  pruefe(r.status === 404, "unbekannte Sitzung → 404", r.status);
  const fremdeSitzung = (await t2.get("/api/portal/sicherheit/sitzungen")).json.sitzungen?.find((s) => s.aktuell)?.id;
  r = await a1.del(`/api/portal/sicherheit/sitzungen/${fremdeSitzung}`);
  pruefe(r.status === 404, "Sitzung eines anderen Kontos nicht beendbar → 404", r.status);
  r = await a1.post("/api/portal/sicherheit/sitzungen", { alleAnderen: true });
  pruefe(r.status === 200 && r.json.beendet >= 1, "alle anderen abgemeldet", r.json);
  r = await a3.get("/api/portal/vorgaenge");
  pruefe(r.status === 401, "andere Sitzung danach 401", r.status);
  r = await a1.get("/api/portal/vorgaenge");
  pruefe(r.status === 200, "aktuelle Sitzung läuft mit neuem Cookie weiter", r.status);
  r = await a1.post("/api/portal/sicherheit/sitzungen", { alleAnderen: true }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "CSRF: fremde Herkunft → 403", r.status);

  // ------------------------------------------------------------ 6. Organisationen & Teams
  abschnitt("6. Organisationen: Einladung, Teamrollen, Fremdorganisation");
  const mEmail = mail("m");
  const m = new Client("m");
  await m.registrieren(mEmail, ["anbieter"]);
  const oEmail = mail("o");
  const o = new Client("o");
  await o.registrieren(oEmail, ["anbieter"]);
  r = await a1.post("/api/portal/organisation", { name: `Sec Projektentwicklung ${LAUF}`, art: "projektentwickler" });
  const orgId = r.json.organisation?.id;
  pruefe(r.status === 200 && orgId && r.json.organisation.rolle === "inhaber" && r.json.aktiv === orgId, "Organisation angelegt, Inhaber, Kontext aktiv", r.json);
  r = await a1.get("/api/auth/ich");
  pruefe(r.json.nutzer?.organisation?.id === orgId && r.json.nutzer?.organisationen?.length === 1, "Sitzung kennt aktive Organisation", r.json.nutzer?.organisation);
  r = await a1.post("/api/portal/projekte", { titel: `Team-Projekt ${LAUF}`, typ: "freiflaeche", land: "DE", mwp: 12 });
  const projektId = r.json.projekt?.id;
  pruefe(r.status === 200 && r.json.projekt?.organisationId === orgId && r.json.projekt?.meinZugriff === "eigentuemer", "Projekt im Kontext gehört der Organisation", r.json.projekt && { org: r.json.projekt.organisationId, z: r.json.projekt.meinZugriff });
  r = await o.post("/api/portal/organisation", { name: `Sec Fremd ${LAUF}`, art: "betrieb" });
  const fremdOrg = r.json.organisation?.id;
  r = await m.get(`/api/portal/organisation/${orgId}`);
  pruefe(r.status === 403, "Nicht-Mitglied liest Organisation → 403", r.status);
  r = await m.get(`/api/portal/projekte/${projektId}`);
  pruefe(r.status === 403, "Nicht-Mitglied liest Team-Projekt → 403", r.status);
  r = await a1.post(`/api/portal/organisation/${orgId}/einladungen`, { email: mEmail, rolle: "inhaber" });
  pruefe(r.status === 422, "Rolle „Inhaber“ nicht einladbar → 422", r.status);
  r = await a1.post(`/api/portal/organisation/${orgId}/einladungen`, { email: mEmail, rolle: "lesen" });
  pruefe(r.status === 200 && r.json.einladung?.rolle === "lesen", "Einladung (nur lesen) versendet", r.json);
  const einl = await demoLink(admin, "einladung", mEmail);
  const einlToken = einl ? einl.split("/einladung/")[1] : "";
  pruefe(!!einlToken, "Einladungslink per Mail (Demo-Links)", einl);
  r = await gast.get(`/einladung/${einlToken}`);
  // nur sichtbares HTML prüfen (ohne <script>: der Dev-Server bettet React-Debugdaten ein, im Produktions-Build nicht)
  const sichtbar = r.text.replace(/<script[\s\S]*?<\/script>/g, "");
  pruefe(r.status === 200 && sichtbar.includes(`Sec Projektentwicklung ${LAUF}`) && !sichtbar.includes(mEmail), "Einladungsseite zeigt Organisation, E-Mail nur maskiert", r.status);
  r = await o.post("/api/portal/organisation/einladung", { token: einlToken });
  pruefe(r.status === 403, "Einladung mit fremdem Konto annehmen → 403", r.status);
  r = await m.post("/api/portal/organisation/einladung", { token: einlToken });
  pruefe(r.status === 200 && r.json.organisationId === orgId && r.json.rolle === "lesen", "eingeladene Person nimmt an", r.json);
  r = await m.post("/api/portal/organisation/einladung", { token: einlToken });
  pruefe(r.status === 422, "Einladung nur einmal verwendbar → 422", r.status);
  r = await m.get(`/api/portal/projekte/${projektId}`);
  pruefe(r.status === 200 && r.json.projekt?.meinZugriff === "lesen", "Mitglied (lesen) sieht Team-Projekt", r.json.projekt?.meinZugriff);
  r = await m.patch(`/api/portal/projekte/${projektId}`, { titel: `Geändert ${LAUF}`, typ: "freiflaeche", land: "DE" });
  pruefe(r.status === 403, "Rolle „lesen“ ändert nicht → 403", r.status);
  r = await m.get(`/api/portal/nachrichten?bezug=projekt:${projektId}`);
  pruefe(r.status === 200, "Mitglied liest Nachrichten zum Team-Projekt", r.status);
  r = await m.post("/api/portal/nachrichten", { bezugArt: "projekt", bezugId: projektId, text: "Nur-Lesen darf nicht schreiben" });
  pruefe(r.status === 403, "Rolle „lesen“ sendet keine Nachricht → 403", r.status);
  r = await m.post(`/api/portal/organisation/${orgId}/einladungen`, { email: mail("x"), rolle: "lesen" });
  pruefe(r.status === 403, "Rolle „lesen“ lädt nicht ein → 403", r.status);
  r = await m.get("/api/auth/ich");
  pruefe(r.json.nutzer?.organisation?.id === orgId && r.json.nutzer.organisation.rolle === "lesen", "nach dem Annehmen: Organisation ist aktiver Kontext", r.json.nutzer?.organisation);
  r = await m.post("/api/portal/organisation/wechseln", { organisationId: null });
  pruefe(r.status === 200 && r.json.aktiv === null, "Wechsel in den persönlichen Bereich", r.json);
  r = await m.post("/api/portal/projekte", { titel: `Persönlich ${LAUF}`, typ: "freiflaeche", land: "DE" });
  pruefe(r.status === 200 && !r.json.projekt?.organisationId, "persönlich angelegtes Projekt gehört keiner Organisation", r.json.projekt?.organisationId);
  r = await m.get("/api/portal/projekte");
  pruefe(r.status === 200 && !r.json.projekte?.some((p) => p.id === projektId), "persönliche Liste ohne Team-Projekte");
  r = await m.post("/api/portal/organisation/wechseln", { organisationId: orgId });
  pruefe(r.status === 200 && r.json.aktiv === orgId, "Mitglied wechselt in die Organisation", r.json);
  r = await m.get("/api/portal/projekte");
  pruefe(r.status === 200 && r.json.projekte?.some((p) => p.id === projektId) && r.json.projekte.every((p) => p.organisationId === orgId), "Liste im Kontext = Objekte der Organisation", r.json.projekte?.map((p) => p.id));
  r = await m.post("/api/portal/projekte", { titel: `Nur-Lesen ${LAUF}`, typ: "freiflaeche", land: "DE" });
  pruefe(r.status === 403, "Rolle „lesen“ legt im Kontext nichts an → 403", r.status);
  const mitglied = (await a1.get(`/api/portal/organisation/${orgId}`)).json.organisation?.mitglieder?.find((x) => x.nutzer?.email === mEmail);
  r = await a1.patch(`/api/portal/organisation/${orgId}/mitglieder/${mitglied?.id}`, { rolle: "mitglied" });
  pruefe(r.status === 200, "Inhaber macht „lesen“ zu „Mitglied“", r.status);
  r = await m.patch(`/api/portal/projekte/${projektId}`, { titel: `Team-Projekt ${LAUF} (bearbeitet)`, typ: "freiflaeche", land: "DE" });
  pruefe(r.status === 200 && r.json.projekt?.meinZugriff === "schreiben", "Mitglied bearbeitet Team-Projekt", r.status);
  r = await m.patch(`/api/portal/organisation/${orgId}/mitglieder/${mitglied?.id}`, { rolle: "admin" });
  pruefe(r.status === 403, "Mitglied befördert sich nicht selbst → 403", r.status);
  r = await o.get(`/api/portal/projekte/${projektId}`);
  pruefe(r.status === 403, "Fremdorganisation liest Team-Projekt → 403", r.status);
  r = await o.post("/api/portal/organisation/wechseln", { organisationId: orgId });
  pruefe(r.status === 403, "Wechsel in fremde Organisation → 403", r.status);
  r = await o.get(`/api/portal/organisation/${orgId}`);
  pruefe(r.status === 403, "fremde Organisation lesen → 403", r.status);
  r = await o.post(`/api/portal/organisation/${orgId}/einladungen`, { email: mail("y"), rolle: "admin" });
  pruefe(r.status === 403, "in fremde Organisation einladen → 403", r.status);
  r = await o.post("/api/portal/organisation/zuordnen", { art: "projekt", id: projektId, organisationId: fremdOrg });
  pruefe(r.status === 403, "fremdes Projekt der eigenen Organisation zuordnen → 403", r.status);
  r = await o.get("/api/portal/projekte");
  pruefe(r.status === 200 && !r.json.projekte?.some((p) => p.id === projektId), "Fremdorganisation sieht das Projekt nicht in Listen");
  r = await a1.del(`/api/portal/organisation/${orgId}/mitglieder/${mitglied?.id}`);
  pruefe(r.status === 200, "Inhaber entfernt Mitglied", r.status);
  r = await m.get(`/api/portal/projekte/${projektId}`);
  pruefe(r.status === 403, "nach dem Entfernen → 403", r.status);
  r = await m.get("/api/auth/ich");
  pruefe(r.json.nutzer?.organisation === null, "aktive Organisation der Sitzung entfällt", r.json.nutzer?.organisation);

  // ------------------------------------------------------------ 7. Datenexport
  abschnitt("7. Datenexport (Art. 15/20 DSGVO) – nur eigene Daten");
  const exp = await a1.get("/api/portal/konto/export");
  const daten = exp.json;
  const textExport = exp.text || "";
  pruefe(exp.status === 200 && /attachment; filename="oekoinvest-datenexport-/.test(exp.headers.get("content-disposition") || "") && /application\/json/.test(exp.headers.get("content-type") || ""), "JSON-Download mit Content-Disposition", [exp.status, exp.headers.get("content-disposition")]);
  pruefe(daten.konto?.email === aEmail && daten.projekte?.some((p) => p.id === projektId) && daten.organisationen?.length === 1, "enthält eigenes Konto, eigene Projekte, Mitgliedschaften", { e: daten.konto?.email, p: daten.projekte?.length });
  pruefe(!textExport.includes(mEmail) && !textExport.includes(oEmail) && !textExport.includes("admin@example.com"), "keine personenbezogenen Daten anderer Konten");
  pruefe(!/passwortHash|"hash"|geheimnis|"codes"|zufallsToken/.test(textExport), "keine Geheimnisse (Hash, Schlüssel, Codes)");
  r = await gast.get("/api/portal/konto/export");
  pruefe(r.status === 401, "ohne Sitzung → 401", r.status);

  // ------------------------------------------------------------ 8. Konto-Komfort, E-Mail ändern
  abschnitt("8. Konto-Komfort und E-Mail-Änderung mit Bestätigung");
  r = await a1.patch("/api/portal/konto/komfort", { farbe: "gruen", sprache: "en", kanaele: { email: false }, fremd: "x" });
  pruefe(r.status === 200 && r.json.komfort?.farbe === "gruen" && r.json.komfort?.sprache === "en" && r.json.komfort?.kanaele?.email === false && r.json.komfort?.kanaele?.sicherheitEmail === true, "Avatarfarbe, Sprache, Kanal E-Mail aus; Sicherheitsmails bleiben", r.json);
  r = await a1.patch("/api/portal/konto/komfort", { farbe: "pink" });
  pruefe(r.json.komfort?.farbe === "gruen", "unbekannte Farbe wird ignoriert (Positivliste)", r.json.komfort);
  const neuEmail = mail("o-neu");
  r = await o.post("/api/portal/konto/email", { neu: neuEmail, passwort: "falsch-falsch-1" });
  pruefe(r.status === 422, "E-Mail ändern mit falschem Passwort → 422", r.status);
  r = await o.post("/api/portal/konto/email", { neu: aEmail, passwort: PW });
  pruefe(r.status === 409, "vergebene Adresse → 409", r.status);
  r = await o.post("/api/portal/konto/email", { neu: neuEmail, passwort: PW });
  pruefe(r.status === 200 && r.json.an === neuEmail, "Bestätigungslink an neue Adresse", r.json);
  const aendern = await demoLink(admin, "email_neu", neuEmail);
  r = await o.get("/api/auth/ich");
  pruefe(r.json.nutzer?.email === oEmail, "vor der Bestätigung bleibt die alte Adresse");
  const bestaetigt = await gast.anfrage("GET", pfadVon(aendern), undefined, { roh: true, origin: null });
  pruefe([302, 303, 307].includes(bestaetigt.status) && /hinweis=email-geaendert/.test(bestaetigt.headers.get("location") || ""), "Bestätigungslink leitet ins Profil", [bestaetigt.status, bestaetigt.headers.get("location")]);
  r = await new Client("o-neu").post("/api/auth/login", { email: neuEmail, passwort: PW });
  pruefe(r.status === 200, "Anmeldung mit neuer Adresse", r.status);
  r = await new Client("o-alt").post("/api/auth/login", { email: oEmail, passwort: PW });
  pruefe(r.status === 401, "alte Adresse gilt nicht mehr → 401", r.status);

  // ------------------------------------------------------------ 9. Konto löschen
  abschnitt("9. Konto löschen (Art. 17 DSGVO)");
  const dEmail = mail("d");
  const d = new Client("d");
  await d.registrieren(dEmail, ["flaeche"]);
  r = await d.post("/api/portal/konto/loeschen", { passwort: PW, bestaetigung: "ja" });
  pruefe(r.status === 422, "ohne Bestätigungswort → 422", r.status);
  r = await d.post("/api/portal/konto/loeschen", { passwort: "falsch-falsch-1", bestaetigung: "LÖSCHEN" });
  pruefe(r.status === 422, "falsches Passwort → 422", r.status);
  r = await a1.post("/api/portal/konto/loeschen", { passwort: PW, bestaetigung: "LÖSCHEN" }, { origin: "https://boese.example" });
  pruefe(r.status === 403, "CSRF beim Löschen → 403", r.status);
  r = await d.post("/api/portal/konto/loeschen", { passwort: PW, bestaetigung: "LÖSCHEN" });
  pruefe(r.status === 200 && !d.cookies.has("oi_sitzung"), "Konto gelöscht, abgemeldet", r.status);
  r = await new Client("d2").post("/api/auth/login", { email: dEmail, passwort: PW });
  pruefe(r.status === 401, "Anmeldung danach unmöglich → 401", r.status);
  r = await admin.get(`/api/admin/nutzer?q=${encodeURIComponent(dEmail)}`);
  pruefe(r.status === 200 && !(r.json.nutzer || []).some((u) => u.email === dEmail), "Konto anonymisiert (E-Mail nicht mehr auffindbar)");

  // ------------------------------------------------------------ 10. Pflicht-2FA, Seiten
  abschnitt("10. Pflicht-2FA (nur Backoffice), neue Portalseiten");
  r = await a1.get("/api/portal/sicherheit/pflicht");
  pruefe(r.status === 403, "Pflicht-Einstellung für Nicht-Admin → 403", r.status);
  r = await admin.get("/api/portal/sicherheit/pflicht");
  pruefe(r.status === 200 && Array.isArray(r.json.pflicht?.rollen), "Backoffice liest Pflicht-Einstellung", r.json);
  r = await a1.put("/api/portal/sicherheit/pflicht", { rollen: ["anbieter"] });
  pruefe(r.status === 403, "Nicht-Admin setzt keine Pflicht → 403", r.status);
  for (const [c, p] of [[a1, "/portal/sicherheit"], [a1, "/portal/organisation"], [admin, "/portal/sicherheit"], [m, "/portal/organisation"]]) {
    r = await c.get(p);
    pruefe(r.status === 200, `${p} (${c.name}) 200`, r.status);
  }

  console.log(`\n${fehler ? rot(`${fehler} Fehler`) : gruen("Alle Prüfungen bestanden")} (${ok} ok)`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(rot(`Abbruch: ${e.stack || e.message}`));
  process.exit(1);
});
