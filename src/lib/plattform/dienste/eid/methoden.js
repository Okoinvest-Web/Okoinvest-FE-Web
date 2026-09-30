// src/lib/plattform/dienste/eid/methoden.js
//
// Staatliche eID als Identifizierungs-Methoden (nur serverseitig): „ID Austria“ (AT) und „Online-Ausweis“ (DE, nPA/eAT/
// eID-Karte über einen eID-Service nach BSI TR-03130 mit OpenID-Connect-Schnittstelle). Ablauf: Authorization-Code-Flow
// mit state + nonce + PKCE (S256), client_secret_post, ID-Token-Prüfung (oidc.js). Ohne Konfiguration außerhalb der
// Produktion bzw. mit PLATTFORM_DEMO=1: Simulator (klar als DEMO gekennzeichnet), der denselben Prüfpfad durchläuft.
//
// Konfiguration (Umgebung der Website; Frappe: site_config oekoinvest_eid_*, siehe GO-LIVE.md und docs/EID.md):
//   EID_BPK_PEPPER            geheimer Pfeffer (≥ 16 Zeichen) für den bPK-/Pseudonym-Hash – Pflicht für den Echtbetrieb
//   EID_AT_UMGEBUNG           produktion | referenz (Standard: referenz außerhalb der Produktion)
//   EID_AT_CLIENT_ID          Client-ID aus der IDA-SPR (bei ID Austria eine URL der Anwendung)
//   EID_AT_CLIENT_SECRET      Client-Secret (Pflicht, auch mit PKCE)
//   EID_AT_ISSUER / _AUTH_URL / _TOKEN_URL / _JWKS_URL   nur zum Übersteuern der offiziellen Endpunkte
//   EID_AT_JWKS               fest hinterlegte Schlüssel (JWKS-JSON oder PEM-Zertifikat) statt Abruf – „Pinning“
//   EID_AT_LOA_MIN            hoch | substanziell (Standard hoch)
//   EID_AT_REDIRECT_URI       Standard: <Basis-URL>/api/dienste/eid/rueckkehr (muss exakt so registriert sein)
//   EID_DE_*                  wie oben für den eID-Service (ISSUER Pflicht; Endpunkte sonst per Discovery),
//                             zusätzlich EID_DE_CLAIM_VORNAME/_NACHNAME/_GEBURTSDATUM/_PSEUDONYM/_LOA (Claim-Namen des
//                             Dienstes), EID_DE_LOA_STANDARD (Niveau, falls der Dienst keines liefert – zu bestätigen)
//   EID_*_ALGS                zugelassene Signaturverfahren (Komma-Liste; Standard RS/PS/ES 256–512)
//
// Geheimnisse erscheinen nie in Antworten, Protokollen oder URLs.

import { generateKeyPairSync, sign } from "node:crypto";
import { EID_ALGS_STANDARD, b64url, schluesselLaden } from "./oidc.js";

export const EID_REDIRECT_PFAD = "/api/dienste/eid/rueckkehr";
export const EID_BINDUNG_COOKIE = "oi_eid_bindung";
export const EID_VORGANG_MINUTEN = 10;
const DEMO_PFEFFER = "oekoinvest-demo-eid-pfeffer-nur-entwicklung"; // greift nie in Produktion

/** Offizielle Endpunkte ID Austria (https://www.id-austria.gv.at/de/developer/anbinden/anbindung-mit-openid-connect) */
export const ID_AUSTRIA_UMGEBUNGEN = {
  produktion: {
    issuer: "https://idp.id-austria.gv.at",
    authUrl: "https://idp.id-austria.gv.at/auth/idp/profile/oidc/authorize",
    tokenUrl: "https://idp.id-austria.gv.at/auth/idp/profile/oidc/token",
    jwksUrl: "https://idp.id-austria.gv.at/auth/idp/profile/oidc/keyset",
  },
  referenz: {
    issuer: "https://idp.ref.id-austria.gv.at",
    authUrl: "https://idp.ref.id-austria.gv.at/auth/idp/profile/oidc/authorize",
    tokenUrl: "https://idp.ref.id-austria.gv.at/auth/idp/profile/oidc/token",
    jwksUrl: "https://idp.ref.id-austria.gv.at/auth/idp/profile/oidc/keyset",
  },
};

/**
 * Methoden-Steckbriefe. claims: Claim-Namen je Minimaldatum (erster vorhandener gewinnt).
 * ID Austria: bPK immer als urn:pvpgvat:oidc.bpk; Name/Geburtsdatum als Standard-Profil-Claims (Freigabe der Attribute in
 * der IDA-SPR; für private Service Provider teils Akkreditierung nötig – zu bestätigen); Vertrauensniveau als
 * urn:pvpgvat:oidc.eid_citizen_qaa_eidas_level (eIDAS-URI).
 */
export const EID_METHODEN = {
  id_austria: {
    id: "id_austria", label: "ID Austria", land: "AT", prefix: "EID_AT", icon: "BadgeCheck",
    kurz: "Mit ID Austria am Smartphone bestätigen – in wenigen Minuten, ohne Ausweiskopie.",
    text: "Sie werden zur offiziellen Anmeldeseite der ID Austria weitergeleitet und bestätigen dort mit der App „Digitales Amt“ bzw. Ihrem Sicherheitsschlüssel. Übermittelt werden nur Vorname, Familienname, Geburtsdatum, das bereichsspezifische Personenkennzeichen (bei uns nur verschlüsselt gespeichert) und das Vertrauensniveau.",
    scope: "openid profile",
    claims: {
      vorname: ["given_name", "urn:pvpgvat:oidc.given_name"],
      nachname: ["family_name", "urn:pvpgvat:oidc.family_name"],
      geburtsdatum: ["birthdate", "urn:pvpgvat:oidc.birthdate"],
      bpk: ["urn:pvpgvat:oidc.bpk", "bpk"],
      land: ["urn:pvpgvat:oidc.eid_issuing_nation"],
      txn: ["txn", "jti", "sid"],
    },
    loaClaims: ["urn:pvpgvat:oidc.eid_citizen_qaa_eidas_level", "acr"],
  },
  online_ausweis: {
    id: "online_ausweis", label: "Online-Ausweis", land: "DE", prefix: "EID_DE", icon: "IdCard",
    kurz: "Mit Personalausweis, eAT oder EU-eID-Karte und der AusweisApp – Karte ans Smartphone halten, PIN eingeben.",
    text: "Sie werden zu unserem zertifizierten eID-Service weitergeleitet. Die AusweisApp liest mit Ihrer PIN nur die für uns freigegebenen Daten: Vorname, Familienname, Geburtsdatum und ein dienstespezifisches Pseudonym (bei uns nur verschlüsselt gespeichert).",
    scope: "openid profile",
    claims: {
      vorname: ["given_name", "GivenNames", "givenNames"],
      nachname: ["family_name", "FamilyNames", "familyNames"],
      geburtsdatum: ["birthdate", "DateOfBirth", "dateOfBirth"],
      bpk: ["restricted_id", "RestrictedID", "pseudonym", "sub"],
      land: ["IssuingState", "issuing_state", "nationality"],
      txn: ["txn", "jti", "sid"],
    },
    loaClaims: ["acr", "loa", "level_of_assurance"],
  },
};
export const EID_METHODEN_IDS = Object.keys(EID_METHODEN);

const liste = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

/** Demo-Betrieb erlaubt? (wie beim Identitäts-Demo: außerhalb der Produktion oder mit PLATTFORM_DEMO=1) */
export const eidDemoErlaubt = (env = process.env) => env.NODE_ENV !== "production" || env.PLATTFORM_DEMO === "1";

/** Konfiguration einer Methode aus der Umgebung. demo=true → Simulator. */
export function eidKonfig(methode, env = process.env) {
  const m = EID_METHODEN[methode];
  if (!m) return null;
  const p = (k) => String(env[`${m.prefix}_${k}`] || "").trim();
  const prod = env.NODE_ENV === "production";
  let basis = { issuer: "", authUrl: "", tokenUrl: "", jwksUrl: "" };
  if (methode === "id_austria") basis = ID_AUSTRIA_UMGEBUNGEN[p("UMGEBUNG") === "produktion" || (prod && p("UMGEBUNG") !== "referenz") ? "produktion" : "referenz"];
  const claims = { ...m.claims };
  for (const [feld, k] of [["vorname", "CLAIM_VORNAME"], ["nachname", "CLAIM_NACHNAME"], ["geburtsdatum", "CLAIM_GEBURTSDATUM"], ["bpk", "CLAIM_PSEUDONYM"]]) if (p(k)) claims[feld] = liste(p(k));
  const pfeffer = String(env.EID_BPK_PEPPER || "");
  const k = {
    methode, label: m.label, land: m.land, scope: p("SCOPE") || m.scope, claims,
    loaClaims: p("CLAIM_LOA") ? liste(p("CLAIM_LOA")) : m.loaClaims,
    loaMin: ["hoch", "substanziell"].includes(p("LOA_MIN")) ? p("LOA_MIN") : "hoch",
    loaStandard: methode === "online_ausweis" && ["hoch", "substanziell"].includes(p("LOA_STANDARD")) ? p("LOA_STANDARD") : "",
    algs: p("ALGS") ? liste(p("ALGS")).filter((a) => EID_ALGS_STANDARD.includes(a)) : EID_ALGS_STANDARD,
    issuer: p("ISSUER") || basis.issuer,
    authUrl: p("AUTH_URL") || basis.authUrl,
    tokenUrl: p("TOKEN_URL") || basis.tokenUrl,
    jwksUrl: p("JWKS_URL") || basis.jwksUrl,
    jwksFest: p("JWKS"),
    clientId: p("CLIENT_ID"),
    clientSecret: p("CLIENT_SECRET"),
    redirectUri: p("REDIRECT_URI"),
    pfeffer: pfeffer.length >= 16 ? pfeffer : "",
    demo: false,
  };
  const echt = !!(k.clientId && k.clientSecret && k.issuer && k.pfeffer && (k.authUrl || methode === "online_ausweis"));
  if (!echt) {
    if (!eidDemoErlaubt(env)) return { ...k, aktiv: false, grund: "nicht_konfiguriert" };
    return {
      ...k, demo: true, aktiv: true, issuer: `https://demo-eid.oekoinvest.invalid/${methode}`, clientId: "oekoinvest-demo", clientSecret: "", authUrl: "/portal/eid/demo",
      tokenUrl: "", jwksUrl: "", jwksFest: "", algs: ["ES256"], loaMin: k.loaMin, pfeffer: k.pfeffer || DEMO_PFEFFER,
    };
  }
  return { ...k, aktiv: true };
}

/**
 * Für den KYC-Assistenten (Team „Eigene Identifizierung“): verfügbare eID-Methoden.
 * Liefert [{ id, label, land, kurz, text, demo, aktiv, loaMin }] – nur Methoden, die gestartet werden können.
 */
export function eidVerfuegbar(env = process.env) {
  return EID_METHODEN_IDS.map((id) => ({ m: EID_METHODEN[id], k: eidKonfig(id, env) }))
    .filter(({ k }) => k?.aktiv)
    .map(({ m, k }) => ({ id: m.id, label: m.label, land: m.land, kurz: m.kurz, text: m.text, icon: m.icon, demo: k.demo, aktiv: true, loaMin: k.loaMin }));
}

/** Einträge für KYC_METHODEN (kyc.js, Team 1) – gleiche Form, eID-Teil */
export const EID_KYC_METHODEN = Object.fromEntries(EID_METHODEN_IDS.map((id) => [`eid_${id}`, {
  label: EID_METHODEN[id].label, land: EID_METHODEN[id].land, art: "eid", eidMethode: id, kurz: EID_METHODEN[id].kurz, start: "/api/portal/dienste/eid",
}]));

// ---------------------------------------------------------------- Autorisierungs-URL

export function redirectUri(k, basisUrl = "") {
  return k.redirectUri || `${String(basisUrl || "").replace(/\/$/, "")}${EID_REDIRECT_PFAD}`;
}

/** Autorisierungs-URL (Authorization-Code-Flow, PKCE S256). Demo: eigene Simulator-Seite (relativer Pfad). */
export function autorisierungsUrl(k, { state, nonce, challenge, redirect }) {
  const q = new URLSearchParams({ response_type: "code", client_id: k.clientId, redirect_uri: redirect, scope: k.scope, state, nonce, code_challenge: challenge, code_challenge_method: "S256" });
  if (k.demo) q.set("methode", k.methode);
  return `${k.authUrl}?${q.toString()}`;
}

/**
 * eID-Client-URL nach BSI TR-03124-1 (AusweisApp) – nur nötig, wenn ein eID-Server direkt (TR-03130, tcToken)
 * statt über die OIDC-Schnittstelle eines eID-Services angebunden wird. Mobil: eid://…
 */
export function eidClientUrl(tcTokenUrl, { mobil = false } = {}) {
  return `${mobil ? "eid" : "http"}://127.0.0.1:24727/eID-Client?tcTokenURL=${encodeURIComponent(tcTokenUrl)}`;
}

// ---------------------------------------------------------------- Netz: Discovery, JWKS, Token-Endpunkt

const JWKS_CACHE = new Map(); // url → { am, schluessel }
const DISCOVERY_CACHE = new Map();

async function holen(url, init = {}, { timeoutMs = 15000 } = {}) {
  if (!/^https:\/\//i.test(url)) throw Object.assign(new Error("Nur HTTPS-Endpunkte sind zulässig."), { status: 503 });
  let res;
  try {
    res = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch {
    throw Object.assign(new Error("Der eID-Dienst ist nicht erreichbar."), { status: 502, code: "token" });
  }
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

/** Endpunkte ergänzen (Discovery nur, wenn nicht fest konfiguriert). Prüft, dass der Discovery-Issuer passt. */
export async function endpunkte(k) {
  if (k.demo || (k.authUrl && k.tokenUrl && (k.jwksUrl || k.jwksFest))) return k;
  const url = `${k.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  let d = DISCOVERY_CACHE.get(url);
  if (!d || Date.now() - d.am > 6 * 3600 * 1000) {
    const r = await holen(url);
    if (r.status !== 200 || r.json?.issuer !== k.issuer) throw Object.assign(new Error("Die Metadaten des eID-Dienstes sind ungültig."), { status: 502 });
    d = { am: Date.now(), json: r.json };
    DISCOVERY_CACHE.set(url, d);
  }
  return { ...k, authUrl: k.authUrl || d.json.authorization_endpoint, tokenUrl: k.tokenUrl || d.json.token_endpoint, jwksUrl: k.jwksUrl || d.json.jwks_uri };
}

/** Signaturschlüssel: fest hinterlegt (Pinning) oder per JWKS-URL (1 h Cache; neu laden erzwingbar bei unbekannter kid) */
export async function signaturSchluessel(k, { neu = false } = {}) {
  if (k.jwksFest) return schluesselLaden(k.jwksFest);
  if (!k.jwksUrl) return [];
  const c = JWKS_CACHE.get(k.jwksUrl);
  if (c && !neu && Date.now() - c.am < 3600 * 1000) return c.schluessel;
  const r = await holen(k.jwksUrl);
  if (r.status !== 200 || !r.json) throw Object.assign(new Error("Die Signaturschlüssel des eID-Dienstes sind nicht abrufbar."), { status: 502 });
  const schluessel = schluesselLaden(r.json);
  JWKS_CACHE.set(k.jwksUrl, { am: Date.now(), schluessel });
  return schluessel;
}

/** Code gegen Tokens tauschen (client_secret_post + PKCE). Liefert das ID-Token (Access-Token wird verworfen). */
export async function codeTauschen(k, { code, verifier, redirect }) {
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirect, client_id: k.clientId, client_secret: k.clientSecret, code_verifier: verifier });
  const r = await holen(k.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: body.toString() });
  if (r.status !== 200 || typeof r.json?.id_token !== "string") throw Object.assign(new Error("Die Anmeldung konnte beim eID-Dienst nicht abgeschlossen werden."), { status: 502, code: "token" });
  return r.json.id_token;
}

// ---------------------------------------------------------------- Demo-Aussteller (Simulator)

/**
 * Demo-ID-Token signieren (ES256, frischer Schlüssel je Vorgang). Liefert { idToken, jwk } – der öffentliche Schlüssel
 * wird beim Vorgang abgelegt und dient beim Abschluss als „JWKS“ des Simulators.
 */
export function demoTokenAusstellen(k, claims) {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const kid = `demo-${Date.now().toString(36)}`;
  const kopf = b64url(JSON.stringify({ alg: "ES256", typ: "JWT", kid }));
  const inhalt = b64url(JSON.stringify(claims));
  const sig = sign("sha256", Buffer.from(`${kopf}.${inhalt}`), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return { idToken: `${kopf}.${inhalt}.${b64url(sig)}`, jwk: { ...publicKey.export({ format: "jwk" }), kid, alg: "ES256", use: "sig" } };
}
