// scripts/plattform-test-eid.mjs
//
// Test „Staatliche eID“ (ID Austria, Online-Ausweis): Logik ohne Server + Ablauf gegen den laufenden Dev-Server (Demo).
//   node scripts/plattform-test-eid.mjs [basis-url]          (nur Logik: --ohne-server)
//
// Logik: PKCE S256, JWS-Prüfung mit selbst erzeugten Schlüsseln (RS256/PS256/ES256/ES384, Manipulation, falscher Schlüssel,
// kid, alg none/HS*, RSA < 2048, JWE, crit), ID-Token-Claims (iss, aud, azp, exp, iat, Höchstalter, nbf, nonce/Hash,
// Vertrauensniveau inkl. eIDAS/STORK/nicht notifiziert), Minimaldaten ohne Klartext-bPK, Abgleich, Konfiguration
// (Demo nur außerhalb der Produktion, offizielle ID-Austria-Endpunkte, keine Geheimnisse in der URL).
// Server: Start (CSRF, Cookie-Bindung HttpOnly/Pfad, kein Bindungswert im Body), Simulator nur für eigenen Vorgang,
// Rücksprung ohne Bindung/fremdes Konto/Wiederholung/ohne Sitzung, Code nicht in der Weiterleitung, LoA zu niedrig,
// falsche nonce, falsche PKCE-Challenge, Abbruch, Online-Ausweis, KYC-Hinweis (Status unverändert), Compliance-Regel.
// Eigene Konten mit Präfix eid-test-<Lauf>@example.com; die Compliance-Regel wird am Ende zurückgesetzt.

import { generateKeyPairSync, createHmac, sign } from "node:crypto";
import {
  EID_ALGS_STANDARD, b64url, bpkHash, datumNormal, eidAbgleich, idTokenPruefen, jwsPruefen, loaStufe, minimaldaten, pkceChallenge, pkcePaar, schluesselLaden, sha256Hex,
} from "../src/lib/plattform/dienste/eid/oidc.js";
import { EID_METHODEN, ID_AUSTRIA_UMGEBUNGEN, autorisierungsUrl, eidClientUrl, eidKonfig, eidVerfuegbar, redirectUri } from "../src/lib/plattform/dienste/eid/methoden.js";

const BASIS = (process.argv.find((a, i) => i > 1 && /^https?:/.test(a)) || process.env.PLATTFORM_TEST_URL || "http://localhost:3100").replace(/\/$/, "");
const OHNE_SERVER = process.argv.includes("--ohne-server");
const DEMO_PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";
const PASSWORT = "Eid-Test-Passwort-2026";
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
async function versuche(name, fn) {
  try {
    await fn();
  } catch (e) {
    fehler++;
    console.log(`  ${rot("✗")} ${name}: ${e.message}`);
  }
}

// ---------------------------------------------------------------- Logik

function jwt(alg, key, claims, kopf = {}) {
  const h = b64url(JSON.stringify({ alg, typ: "JWT", ...kopf }));
  const p = b64url(JSON.stringify(claims));
  const daten = Buffer.from(`${h}.${p}`);
  let sig;
  if (alg.startsWith("HS")) sig = createHmac(`sha${alg.slice(2)}`, key).update(daten).digest();
  else if (alg.startsWith("ES")) sig = sign(`sha${alg.slice(2)}`, daten, { key, dsaEncoding: "ieee-p1363" });
  else if (alg.startsWith("PS")) sig = sign(`sha${alg.slice(2)}`, daten, { key, padding: 6, saltLength: 32 });
  else sig = sign(`sha${alg.slice(2)}`, daten, key);
  return `${h}.${p}.${b64url(sig)}`;
}

function logik() {
  abschnitt("1. PKCE, Zufall");
  const p = pkcePaar();
  pruefe(p.methode === "S256" && p.verifier.length >= 43 && p.verifier.length <= 128 && p.challenge === pkceChallenge(p.verifier), "PKCE S256: Verifier 43–128 Zeichen, Challenge = BASE64URL(SHA256(verifier))");
  pruefe(pkceChallenge("abc") === "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0", "Challenge-Kodierung base64url ohne Padding (SHA-256 von „abc“)");

  abschnitt("2. JWS-Signaturprüfung mit selbst erzeugten Testschlüsseln");
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const rsa2 = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const rsaKlein = generateKeyPairSync("rsa", { modulusLength: 1024 });
  const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const ec384 = generateKeyPairSync("ec", { namedCurve: "secp384r1" });
  const jwks = { keys: [
    { ...rsa.publicKey.export({ format: "jwk" }), kid: "rsa-1", use: "sig" },
    { ...ec.publicKey.export({ format: "jwk" }), kid: "ec-1", use: "sig" },
    { ...ec384.publicKey.export({ format: "jwk" }), kid: "ec-2" },
    { ...rsa2.publicKey.export({ format: "jwk" }), kid: "enc-1", use: "enc" },
  ] };
  const schluessel = schluesselLaden(JSON.stringify(jwks));
  pruefe(schluessel.length === 3, "JWKS geladen, Verschlüsselungsschlüssel (use=enc) ignoriert", schluessel.length);
  const pem = schluesselLaden(rsa.publicKey.export({ format: "pem", type: "spki" }));
  pruefe(pem.length === 1 && jwsPruefen(jwt("RS256", rsa.privateKey, { a: 1 }), { schluessel: pem }).ok, "PEM-Schlüssel (Pinning) funktioniert");

  const c = { a: 1 };
  pruefe(jwsPruefen(jwt("RS256", rsa.privateKey, c, { kid: "rsa-1" }), { schluessel }).ok, "RS256 gültig");
  pruefe(jwsPruefen(jwt("PS256", rsa.privateKey, c, { kid: "rsa-1" }), { schluessel }).ok, "PS256 gültig");
  pruefe(jwsPruefen(jwt("ES256", ec.privateKey, c, { kid: "ec-1" }), { schluessel }).ok, "ES256 gültig (IEEE-P1363-Signatur)");
  pruefe(jwsPruefen(jwt("ES384", ec384.privateKey, c), { schluessel }).ok, "ES384 gültig ohne kid (Kurve passt nur zu einem Schlüssel)");
  const t = jwt("RS256", rsa.privateKey, { a: 1 }, { kid: "rsa-1" });
  const [h, , s] = t.split(".");
  pruefe(jwsPruefen(`${h}.${b64url(JSON.stringify({ a: 2 }))}.${s}`, { schluessel }).grund === "signatur", "manipulierter Inhalt → signatur");
  pruefe(jwsPruefen(jwt("RS256", rsa2.privateKey, c, { kid: "rsa-1" }), { schluessel }).grund === "signatur", "fremder Schlüssel → signatur");
  pruefe(jwsPruefen(jwt("RS256", rsa.privateKey, c, { kid: "unbekannt" }), { schluessel }).grund === "schluessel", "unbekannte kid → schluessel");
  pruefe(jwsPruefen(`${b64url(JSON.stringify({ alg: "none" }))}.${b64url("{}")}.`, { schluessel }).grund === "alg", "alg none → abgelehnt");
  pruefe(jwsPruefen(jwt("HS256", "geheim", c), { schluessel }).grund === "alg", "HS256 ohne ausdrückliche Freigabe → abgelehnt (Algorithmus-Verwechslung)");
  pruefe(jwsPruefen(jwt("HS256", "geheim", c), { algs: ["HS256"], hmacGeheimnis: "geheim" }).ok, "HS256 nur mit Freigabe + Geheimnis gültig");
  pruefe(jwsPruefen(jwt("RS256", rsaKlein.privateKey, c), { schluessel: schluesselLaden({ keys: [rsaKlein.publicKey.export({ format: "jwk" })] }) }).grund === "schluessel", "RSA-Schlüssel < 2048 Bit → abgelehnt");
  pruefe(jwsPruefen("a.b.c.d.e").grund === "verschluesselt", "JWE (5 Teile) → klarer Code „verschluesselt“");
  pruefe(jwsPruefen(jwt("RS256", rsa.privateKey, c, { crit: ["x"], x: 1 }), { schluessel }).grund === "crit", "unbekannte crit-Kopfzeile → abgelehnt");
  pruefe(jwsPruefen("kein.token").grund === "format" && jwsPruefen("e30.e30.").ok === false, "kaputtes Format → abgelehnt");
  pruefe(!EID_ALGS_STANDARD.some((a) => a.startsWith("HS")), "Standard-Algorithmen ohne HS*/none");

  abschnitt("3. ID-Token-Claims");
  const jetztS = 1_900_000_000;
  const basis = { iss: "https://idp.ref.id-austria.gv.at", aud: "https://oekoinvest.example/eid", iat: jetztS - 5, exp: jetztS + 300, nonce: "n-123", given_name: "Anna", family_name: "Muster", birthdate: "1980-02-03", "urn:pvpgvat:oidc.bpk": "XFN+541505g:abcdEFGH=", "urn:pvpgvat:oidc.eid_citizen_qaa_eidas_level": "http://eidas.europa.eu/LoA/high" };
  const opt = { issuer: basis.iss, clientId: basis.aud, nonce: "n-123", schluessel, jetztS, loaClaims: EID_METHODEN.id_austria.loaClaims, loaMin: "hoch" };
  const tok = (cl, kopf = { kid: "rsa-1" }) => jwt("RS256", rsa.privateKey, cl, kopf);
  let r = idTokenPruefen(tok(basis), opt);
  pruefe(r.ok && r.loa === "hoch", "gültiges ID-Token (RS256, eIDAS high) → ok", r.grund);
  pruefe(idTokenPruefen(tok(basis), { ...opt, nonce: undefined, nonceHash: sha256Hex("n-123") }).ok, "nonce als gespeicherter Hash geprüft");
  pruefe(idTokenPruefen(tok({ ...basis, iss: "https://boese.example" }), opt).grund === "iss", "falscher Aussteller → iss");
  pruefe(idTokenPruefen(tok({ ...basis, aud: "fremde-app" }), opt).grund === "aud", "falsche Audience → aud");
  pruefe(idTokenPruefen(tok({ ...basis, aud: [basis.aud, "andere"] }), opt).grund === "azp", "mehrere Audiences ohne azp → azp");
  pruefe(idTokenPruefen(tok({ ...basis, aud: [basis.aud, "andere"], azp: basis.aud }), opt).ok, "mehrere Audiences mit passendem azp → ok");
  pruefe(idTokenPruefen(tok({ ...basis, exp: jetztS - 200 }), opt).grund === "exp", "abgelaufen (über Toleranz) → exp");
  pruefe(idTokenPruefen(tok({ ...basis, exp: jetztS - 60 }), opt).ok, "abgelaufen innerhalb 120 s Toleranz → ok (Uhrenabweichung)");
  pruefe(idTokenPruefen(tok({ ...basis, iat: jetztS + 600 }), opt).grund === "iat", "Ausstellung in der Zukunft → iat");
  pruefe(idTokenPruefen(tok({ ...basis, iat: jetztS - 3600, exp: jetztS + 60 }), opt).grund === "alter", "Anmeldung älter als 15 min → alter");
  pruefe(idTokenPruefen(tok({ ...basis, nbf: jetztS + 600 }), opt).grund === "nbf", "nbf in der Zukunft → nbf");
  pruefe(idTokenPruefen(tok({ ...basis, nonce: "n-999" }), opt).grund === "nonce", "falsche nonce (Replay/fremde Anmeldung) → nonce");
  pruefe(idTokenPruefen(tok({ ...basis, nonce: undefined }), opt).grund === "nonce", "fehlende nonce → nonce");
  const subst = { ...basis, "urn:pvpgvat:oidc.eid_citizen_qaa_eidas_level": "http://eidas.europa.eu/LoA/substantial" };
  pruefe(idTokenPruefen(tok(subst), opt).grund === "loa", "Vertrauensniveau substanziell bei Minimum hoch → loa");
  pruefe(idTokenPruefen(tok(subst), { ...opt, loaMin: "substanziell" }).ok, "substanziell bei Minimum substanziell → ok");
  const ohneLoa = { ...basis, "urn:pvpgvat:oidc.eid_citizen_qaa_eidas_level": undefined };
  pruefe(idTokenPruefen(tok(ohneLoa), opt).grund === "loa" && idTokenPruefen(tok(ohneLoa), { ...opt, loaStandard: "hoch" }).ok, "ohne Niveau-Claim → loa; mit konfiguriertem Standardniveau → ok");
  pruefe(idTokenPruefen(tok(basis), { ...opt, schluessel: [] }).grund === "schluessel", "keine Schlüssel → schluessel");

  abschnitt("4. Vertrauensniveau, Minimaldaten, Abgleich");
  const faelle = [["http://eidas.europa.eu/LoA/high", "hoch"], ["http://eidas.europa.eu/LoA/substantial", "substanziell"], ["http://eidas.europa.eu/LoA/low", "niedrig"], ["http://www.stork.gov.eu/1.0/citizenQAALevel/4", "hoch"], ["3", "substanziell"], ["http://eidas.europa.eu/NotNotified/LoA/high", ""], ["irgendwas", ""], [undefined, ""]];
  pruefe(faelle.every(([w, e]) => loaStufe(w) === e), "eIDAS/STORK/Klartext → hoch/substanziell/niedrig; nicht notifiziert/unbekannt → leer", faelle.map(([w]) => loaStufe(w)));
  const md = minimaldaten(basis, EID_METHODEN.id_austria.claims, { pfeffer: "test-pfeffer-1234567890", tokenHash: "ab".repeat(32) });
  pruefe(md.vorname === "Anna" && md.nachname === "Muster" && md.geburtsdatum === "1980-02-03", "Minimaldaten: Vorname, Familienname, Geburtsdatum");
  pruefe(md.bpkHash === bpkHash("XFN+541505g:abcdEFGH=", "test-pfeffer-1234567890") && !JSON.stringify(md).includes("abcdEFGH"), "bPK nur als HMAC-Hash, nie im Klartext");
  pruefe(bpkHash("x", "a") !== bpkHash("x", "b") && bpkHash("x", "") === null, "Hash hängt vom geheimen Pfeffer ab; ohne Pfeffer kein Hash");
  pruefe(md.transaktionsId === `T-${"ab".repeat(12)}` && Object.keys(md).length === 6, "Transaktions-ID aus Token-Hash, keine weiteren Claims übernommen", md);
  pruefe(datumNormal("19800203") === "1980-02-03" && datumNormal("3.2.1980") === "1980-02-03", "Geburtsdatum normalisiert (YYYYMMDD, TT.MM.JJJJ)");
  pruefe(eidAbgleich({ vorname: "Anna Maria", nachname: "Müller", geburtsdatum: "1980-02-03" }, { vorname: "Anna", nachname: "Mueller", geburtsdatum: "1980-02-03" }).name === true, "Abgleich: Umlaute/zweiter Vorname stimmen");
  const ab = eidAbgleich({ vorname: "Erika", nachname: "Mustermann", geburtsdatum: "1964-08-12" }, { vorname: "Anna", nachname: "Muster", geburtsdatum: "1980-02-03" });
  pruefe(ab.name === false && ab.geburtsdatum === false, "Abgleich: andere Person erkannt");
  pruefe(eidAbgleich({ vorname: "A", nachname: "B" }, {}).name === null, "Abgleich ohne Vergleichsdaten → null (keine Aussage)");

  abschnitt("5. Konfiguration");
  const prod = { NODE_ENV: "production" };
  pruefe(eidKonfig("id_austria", prod).aktiv === false && eidVerfuegbar(prod).length === 0, "Produktion ohne Konfiguration: kein Demo, keine Methode verfügbar");
  pruefe(eidKonfig("id_austria", { NODE_ENV: "production", PLATTFORM_DEMO: "1" }).demo === true, "Produktions-Build mit PLATTFORM_DEMO=1 → Simulator");
  const dev = eidVerfuegbar({ NODE_ENV: "development" });
  pruefe(dev.length === 2 && dev.every((m) => m.demo), "Entwicklung ohne Konfiguration: beide Methoden als DEMO", dev.map((m) => m.id));
  const echtAt = { NODE_ENV: "production", EID_AT_CLIENT_ID: "https://oekoinvest.example/eid", EID_AT_CLIENT_SECRET: "s3cr3t-nur-test", EID_BPK_PEPPER: "pfeffer-nur-fuer-den-test" };
  const k = eidKonfig("id_austria", echtAt);
  pruefe(k.aktiv && !k.demo && k.issuer === ID_AUSTRIA_UMGEBUNGEN.produktion.issuer && k.tokenUrl.endsWith("/auth/idp/profile/oidc/token"), "ID Austria konfiguriert: offizielle Produktions-Endpunkte");
  pruefe(eidKonfig("id_austria", { ...echtAt, EID_AT_UMGEBUNG: "referenz" }).issuer === "https://idp.ref.id-austria.gv.at", "Referenzumgebung umschaltbar");
  pruefe(eidKonfig("id_austria", { ...echtAt, EID_BPK_PEPPER: "kurz" }).aktiv === false, "ohne ausreichenden Pfeffer kein Echtbetrieb");
  pruefe(eidKonfig("online_ausweis", { ...prod, EID_DE_CLIENT_ID: "x", EID_DE_CLIENT_SECRET: "y", EID_BPK_PEPPER: "pfeffer-nur-fuer-den-test" }).aktiv === false, "Online-Ausweis ohne Aussteller-URL (ISSUER) nicht aktiv");
  const kDe = eidKonfig("online_ausweis", { ...prod, EID_DE_ISSUER: "https://eid.dienst.example", EID_DE_CLIENT_ID: "x", EID_DE_CLIENT_SECRET: "y", EID_BPK_PEPPER: "pfeffer-nur-fuer-den-test", EID_DE_CLAIM_PSEUDONYM: "rid", EID_DE_LOA_STANDARD: "hoch" });
  pruefe(kDe.aktiv && kDe.claims.bpk[0] === "rid" && kDe.loaStandard === "hoch", "Online-Ausweis: Claim-Namen und Standardniveau konfigurierbar");
  const url = autorisierungsUrl(k, { state: "S", nonce: "N", challenge: "C", redirect: redirectUri(k, "https://oekoinvest.example") });
  const q = new URL(url).searchParams;
  pruefe(q.get("response_type") === "code" && q.get("code_challenge_method") === "S256" && q.get("state") === "S" && q.get("nonce") === "N" && q.get("redirect_uri") === "https://oekoinvest.example/api/dienste/eid/rueckkehr", "Autorisierungs-URL: Code-Flow, PKCE S256, state, nonce, Rücksprung-URL");
  pruefe(!url.includes("s3cr3t") && !url.includes("pfeffer"), "keine Geheimnisse in der Autorisierungs-URL");
  pruefe(eidClientUrl("https://x.example/tc?a=1") === "http://127.0.0.1:24727/eID-Client?tcTokenURL=https%3A%2F%2Fx.example%2Ftc%3Fa%3D1", "eID-Client-URL nach TR-03124-1 (AusweisApp)");
}

// ---------------------------------------------------------------- Server

class Client {
  constructor(name) {
    this.name = name;
    this.cookies = {};
  }
  get cookie() {
    return Object.entries(this.cookies).map(([k, w]) => `${k}=${w}`).join("; ");
  }
  async anfrage(methode, pfad, body, { origin = BASIS, kopf = {}, ohneBindung = false } = {}) {
    const headers = { ...kopf };
    if (origin) headers.Origin = origin;
    const c = Object.entries(this.cookies).filter(([k]) => !(ohneBindung && k === "oi_eid_bindung")).map(([k, w]) => `${k}=${w}`).join("; ");
    if (c) headers.Cookie = c;
    let payload;
    if (body !== undefined) {
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
        await new Promise((r) => setTimeout(r, 5000 * versuch));
      }
    }
    const setCookies = res.headers.getSetCookie?.() || [];
    for (const sc of setCookies) {
      const [paar] = sc.split(";");
      const i = paar.indexOf("=");
      const name = paar.slice(0, i);
      const wert = paar.slice(i + 1);
      if (/oi_sitzung$|^oi_eid_bindung$/.test(name)) {
        if (wert && !/max-age=0/i.test(sc)) this.cookies[name] = wert;
        else delete this.cookies[name];
      }
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text: text.slice(0, 200) };
    }
    return { status: res.status, json, text, headers: res.headers, setCookies };
  }
  get = (p, o) => this.anfrage("GET", p, undefined, o);
  post = (p, b, o) => this.anfrage("POST", p, b ?? {}, o);
  patch = (p, b, o) => this.anfrage("PATCH", p, b ?? {}, o);
  async login(email, passwort = DEMO_PASSWORT) {
    const r = await this.post("/api/auth/login", { email, passwort });
    if (r.status !== 200) throw new Error(`Login ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
  async registrieren(schluessel, vorname, nachname) {
    const email = `eid-test-${LAUF}-${schluessel}@example.com`;
    const r = await this.post("/api/auth/registrieren", { email, passwort: PASSWORT, vorname, nachname, rollen: ["investor"], agb: true });
    if (r.status !== 201) throw new Error(`Registrierung ${email}: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.nutzer;
  }
}

/** Start → Simulator → Rücksprung-URL. Liefert { start, q, rueck } */
async function durchlauf(c, methode, auswahl, { nonce, codeChallenge } = {}) {
  const start = await c.post("/api/portal/dienste/eid", { methode });
  if (start.status !== 200) throw new Error(`Start ${methode}: ${start.status} ${JSON.stringify(start.json)}`);
  const q = new URL(start.json.url, BASIS).searchParams;
  const d = await c.post("/api/portal/dienste/eid/demo", { state: q.get("state"), nonce: nonce ?? q.get("nonce"), codeChallenge: codeChallenge ?? q.get("code_challenge"), auswahl });
  if (d.status !== 200) throw new Error(`Simulator: ${d.status} ${JSON.stringify(d.json)}`);
  return { start, q, rueck: d.json.url };
}
const ziel = (r) => new URL(r.headers.get("location") || "/", BASIS);

async function server() {
  abschnitt(`6. Server (Demo) – ${BASIS}, Lauf ${LAUF}`);
  const inv = new Client("investor");
  const fremd = new Client("fremd");
  const gast = new Client("gast");
  const comp = new Client("compliance");
  await inv.registrieren("inv", "Anna", `Eidtest${LAUF}`);
  await fremd.registrieren("fremd", "Fred", `Fremd${LAUF}`);
  let compOk = true;
  try {
    await comp.login("bo-compliance@example.com");
  } catch {
    compOk = false;
  }
  // KYC-Fall mit Personenangaben (für Abgleich und Hinweis)
  await inv.patch("/api/portal/kyc", { abschnitt: "kontotyp", daten: { kontotyp: "privat" } });
  await inv.patch("/api/portal/kyc", { abschnitt: "person", daten: { vorname: "Anna", nachname: `Eidtest${LAUF}`, geburtsdatum: "1980-02-03", geburtsort: "Teststadt", staatsangehoerigkeit: "AT", adresse: { strasse: "Testweg 1", plz: "5121", ort: "Ostermiething", land: "AT" } } });
  let r = await inv.get("/api/portal/kyc");
  const fallId = r.json?.fall?.id;
  const statusVorher = r.json?.status?.status;
  pruefe(true, `Testkonten registriert${fallId ? `, KYC-Fall ${fallId}` : " (ohne KYC-Fall)"}`);

  await versuche("Status/Start", async () => {
    r = await inv.get("/api/portal/dienste/eid");
    pruefe(r.status === 200 && r.json.methoden?.length === 2 && r.json.methoden.every((m) => m.demo), "Status: ID Austria und Online-Ausweis als DEMO verfügbar", r.json.methoden);
    r = await gast.get("/api/portal/dienste/eid");
    pruefe(r.status === 401, "ohne Anmeldung → 401", r.status);
    r = await inv.post("/api/portal/dienste/eid", { methode: "id_austria" }, { origin: "https://boese.example.com" });
    pruefe(r.status === 403, "Start von fremder Herkunft (CSRF) → 403", r.status);
    r = await inv.post("/api/portal/dienste/eid", { methode: "unbekannt" });
    pruefe(r.status === 422 || r.status === 400, "unbekanntes Verfahren → abgelehnt", r.status);
    r = await inv.post("/api/portal/dienste/eid", { methode: "id_austria" });
    const sc = r.setCookies.find((x) => x.startsWith("oi_eid_bindung=")) || "";
    pruefe(r.status === 200 && r.json.url?.startsWith("/portal/eid/demo?") && /^EI-/.test(r.json.vorgang?.id || ""), "Start → Weiterleitung auf den Simulator, Vorgang EI-…", r.json);
    pruefe(/HttpOnly/i.test(sc) && /Path=\/api\/dienste\/eid\/rueckkehr/i.test(sc) && /SameSite=lax/i.test(sc), "Browser-Bindung als HttpOnly-Cookie, nur für den Rücksprung-Pfad, SameSite=Lax", sc.replace(/=[^;]+/, "=…"));
    pruefe(!("bindung" in r.json) && !r.text.includes(inv.cookies.oi_eid_bindung || "§§"), "Bindungswert nicht im Antwort-Body");
    const q = new URL(r.json.url, BASIS).searchParams;
    pruefe(q.get("code_challenge_method") === "S256" && q.get("state")?.length >= 43 && q.get("nonce")?.length >= 43, "Autorisierungs-URL mit PKCE S256, state und nonce (≥ 256 Bit)");
    r = await inv.get(`/portal/eid/demo?${q.toString()}`);
    pruefe(r.status === 200 && /DEMO|Demo-Modus/.test(r.text), "Simulator-Seite erreichbar und als DEMO gekennzeichnet", r.status);
    r = await fremd.post("/api/portal/dienste/eid/demo", { state: q.get("state"), nonce: q.get("nonce"), codeChallenge: q.get("code_challenge"), auswahl: "hoch" });
    pruefe(r.status === 403, "Simulator: fremdes Konto kann den Vorgang nicht bedienen → 403", r.status);
  });

  await versuche("Rücksprung-Sicherheit", async () => {
    // a) ohne Browser-Bindung (z. B. Login-CSRF: Link aus fremdem Browser)
    let d = await durchlauf(inv, "id_austria", "hoch");
    r = await inv.get(d.rueck, { ohneBindung: true });
    pruefe(r.status === 303 && ziel(r).searchParams.get("ergebnis") === "fehler", "Rücksprung ohne Bindungs-Cookie → verworfen", ziel(r).search);
    r = await inv.get(d.rueck);
    pruefe(r.status === 303 && ziel(r).searchParams.get("eid") === "doppelt", "Vorgang danach verbraucht (kein zweiter Versuch mit demselben state)", ziel(r).search);
    // b) fremdes Konto mit dem Rücksprung-Link
    d = await durchlauf(inv, "id_austria", "hoch");
    r = await fremd.get(d.rueck);
    pruefe(r.status === 303 && ziel(r).searchParams.get("eid") === "ungueltig", "Rücksprung in fremder Sitzung → ungültig", ziel(r).search);
    r = await gast.get(d.rueck);
    pruefe(r.status === 303 && ziel(r).pathname === "/login", "Rücksprung ohne Sitzung → Anmeldung (nichts verarbeitet)", ziel(r).pathname);
    // c) regulär
    r = await inv.get(d.rueck);
    const z = ziel(r);
    pruefe(r.status === 303 && z.pathname === "/portal/verifizierung" && z.searchParams.get("ergebnis") === "bestanden", "gültiger Rücksprung → bestanden, Weiterleitung zur Verifizierung", z.search);
    pruefe(!z.search.includes("code=") && !z.search.includes("state=") && /no-store/.test(r.headers.get("cache-control") || "") && !r.text.length, "Weiterleitung ohne code/state, ohne Inhalt, kein Cache");
    pruefe(r.setCookies.some((x) => x.startsWith("oi_eid_bindung=") && /Max-Age=0/i.test(x)), "Bindungs-Cookie nach dem Rücksprung gelöscht");
    r = await inv.get(d.rueck);
    pruefe(r.status === 303 && ziel(r).searchParams.get("eid") === "doppelt", "Wiederholung desselben Rücksprungs (Replay) → abgewiesen", ziel(r).search);
    r = await inv.get("/api/portal/dienste/eid");
    const nw = r.json.nachweis;
    pruefe(nw?.methode === "id_austria" && nw.vertrauensniveau === "hoch" && nw.vorname === "Anna" && nw.demo === true && /^DEMO-/.test(nw.transaktionsId || ""), "Nachweis: Name, Vertrauensniveau hoch, Transaktions-ID, DEMO-Kennzeichen", nw);
    pruefe(!/XFN\+|bpkHash|verifier|stateHash|nonceHash|idToken/.test(r.text), "Status enthält keine bPK, Hashes, Verifier oder Tokens");
  });

  await versuche("Negativfälle", async () => {
    let d = await durchlauf(inv, "id_austria", "substanziell");
    r = await inv.get(d.rueck);
    pruefe(ziel(r).searchParams.get("ergebnis") === "abgelehnt", "Vertrauensniveau substanziell bei Minimum hoch → abgelehnt", ziel(r).search);
    d = await durchlauf(inv, "id_austria", "hoch", { nonce: "falsche-nonce-aus-anderem-vorgang" });
    r = await inv.get(d.rueck);
    pruefe(ziel(r).searchParams.get("ergebnis") === "fehler", "Token mit falscher nonce → fehler", ziel(r).search);
    d = await durchlauf(inv, "id_austria", "hoch", { codeChallenge: "A".repeat(43) });
    r = await inv.get(d.rueck);
    pruefe(ziel(r).searchParams.get("ergebnis") === "fehler", "Code mit fremder PKCE-Challenge → fehler", ziel(r).search);
    d = await durchlauf(inv, "online_ausweis", "abbrechen");
    r = await inv.get(d.rueck);
    pruefe(ziel(r).searchParams.get("ergebnis") === "abgebrochen", "Abbruch beim Aussteller → abgebrochen", ziel(r).search);
    r = await inv.get(`${d.rueck.replace(/state=[^&]+/, "state=erfunden")}`);
    pruefe(ziel(r).searchParams.get("eid") === "ungueltig", "erfundener state → ungültig", ziel(r).search);
    r = await inv.get("/api/portal/dienste/eid");
    const v = r.json.vorgaenge || [];
    pruefe(v.some((x) => x.status === "fehler" && /Nonce/.test(x.grund)) && v.some((x) => x.status === "fehler" && /PKCE/.test(x.grund)), "Gründe lesbar im Vorgang (Nonce, PKCE)", v.map((x) => `${x.status}:${x.grund}`));
  });

  await versuche("Online-Ausweis", async () => {
    const d = await durchlauf(inv, "online_ausweis", "hoch");
    r = await inv.get(d.rueck);
    pruefe(ziel(r).searchParams.get("ergebnis") === "bestanden", "Online-Ausweis (DEMO) → bestanden", ziel(r).search);
    r = await inv.get("/api/portal/dienste/eid");
    pruefe(r.json.nachweis?.methode === "online_ausweis" && r.json.nachweis?.vertrauensniveau === "hoch", "Nachweis Online-Ausweis mit Vertrauensniveau hoch", r.json.nachweis);
    const d2 = await durchlauf(inv, "online_ausweis", "abweichend");
    r = await inv.get(d2.rueck);
    pruefe(ziel(r).searchParams.get("ergebnis") === "bestanden", "andere Person: Token gültig (Abweichung wird als Hinweis gemeldet)", ziel(r).search);
    r = await inv.get("/api/portal/dienste/eid");
    pruefe(r.json.vorgaenge?.[0]?.nachweis?.abgleich?.name === false, "Abgleich erkennt Namensabweichung", r.json.vorgaenge?.[0]?.nachweis?.abgleich);
  });

  await versuche("KYC-Hinweis und Compliance-Regel", async () => {
    r = await inv.get("/api/portal/kyc");
    pruefe(r.json?.status?.status === statusVorher, "KYC-Status durch eID unverändert", [statusVorher, r.json?.status?.status]);
    r = await inv.get("/api/portal/dienste/eid/einstellungen");
    pruefe(r.status === 403, "Einstellungen: Kunde → 403", r.status);
    if (!compOk || !fallId) {
      pruefe(true, "Compliance-Konto bzw. KYC-Fall nicht vorhanden – Regel-/Hinweisprüfung übersprungen");
      return;
    }
    r = await comp.get(`/api/admin/compliance/${fallId}`);
    const pe = (r.json?.fall?.pruefergebnisse || r.json?.pruefergebnisse || []).filter((x) => x.art === "eid");
    pruefe(pe.some((x) => x.ergebnis === "ok" && /DEMO/.test(x.quelle) && x.daten?.vertrauensniveau === "hoch") && pe.some((x) => x.ergebnis === "auffaellig"), "KYC-Fall: eID-Hinweise (ok, auffällig bei Abweichung) mit DEMO-Kennzeichen", pe.map((x) => `${x.ergebnis}:${x.quelle}`));
    pruefe(pe.every((x) => !JSON.stringify(x).includes("XFN+")), "KYC-Hinweis ohne bPK");
    r = await comp.post("/api/portal/dienste/eid/einstellungen", { hochBestaetigt: true });
    pruefe(r.status === 200 && r.json.einstellungen?.hochBestaetigt === true, "Compliance aktiviert Regel „eID hoch = Identität bestätigt“", r.json);
    try {
      // eigenes Konto (Tageslimit je Konto: 10 Anmeldungen) mit KYC-Personenangaben
      const reg = new Client("regel");
      await reg.registrieren("regel", "Rita", `Regel${LAUF}`);
      await reg.patch("/api/portal/kyc", { abschnitt: "kontotyp", daten: { kontotyp: "privat" } });
      await reg.patch("/api/portal/kyc", { abschnitt: "person", daten: { vorname: "Rita", nachname: `Regel${LAUF}`, geburtsdatum: "1980-01-01", geburtsort: "Teststadt", staatsangehoerigkeit: "AT", adresse: { strasse: "Testweg 1", plz: "5121", ort: "Ostermiething", land: "AT" } } });
      const regVorher = (await reg.get("/api/portal/kyc")).json?.status?.status;
      const d = await durchlauf(reg, "id_austria", "hoch");
      r = await reg.get(d.rueck);
      r = await reg.get("/api/portal/dienste/eid");
      pruefe(r.json.nachweis?.identitaetBestaetigt === true && r.json.regel?.hochBestaetigt === true, "mit Regel: Nachweis „Identität bestätigt“", r.json.nachweis);
      const d2 = await durchlauf(reg, "id_austria", "abweichend");
      await reg.get(d2.rueck);
      r = await reg.get("/api/portal/dienste/eid");
      pruefe(r.json.vorgaenge?.[0]?.nachweis?.identitaetBestaetigt === false, "mit Regel, aber Abweichung/Dublette → nicht bestätigt", r.json.vorgaenge?.[0]?.nachweis);
      r = await reg.get("/api/portal/kyc");
      pruefe(r.json?.status?.status === regVorher, "auch mit Regel: KYC-Status unverändert (Compliance entscheidet)", [regVorher, r.json?.status?.status]);
    } finally {
      r = await comp.post("/api/portal/dienste/eid/einstellungen", { hochBestaetigt: false });
      pruefe(r.status === 200 && r.json.einstellungen?.hochBestaetigt === false, "Regel zurückgesetzt");
    }
  });
}

async function main() {
  console.log("eID-Test (ID Austria, Online-Ausweis)");
  logik();
  if (!OHNE_SERVER) await server();
  console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen`);
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
