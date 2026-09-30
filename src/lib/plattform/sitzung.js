// src/lib/plattform/sitzung.js
//
// Signierte Sitzungstoken (HMAC-SHA256 über SESSION_SECRET) – nur Web Crypto,
// damit dieselbe Prüfung in der Middleware (Edge) und in Route-Handlern läuft.
//
// Token:  v1.<payload base64url>.<signatur base64url>
// Payload { u: Nutzer-ID, v: Sitzungsversion, iat, exp } – enthält keine Rollen:
// Rollen und Sperren werden bei jeder Anfrage frisch aus dem Backend gelesen.
// Erhöht sich die Sitzungsversion eines Kontos (Passwort geändert/zurückgesetzt,
// Konto gesperrt), sind alle alten Token sofort ungültig.

export const SITZUNG_DAUER_S = 60 * 60 * 24 * 7; // 7 Tage

const DEV_GEHEIMNIS = "oekoinvest-entwicklung-unsicher-nie-produktiv-verwenden";
const enc = new TextEncoder();
const dec = new TextDecoder();

/** Cookie-Name: in Produktion mit __Host--Präfix (erzwingt Secure, Path=/, keine Domain) */
export function cookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-oi_sitzung" : "oi_sitzung";
}

function geheimnis() {
  const s = process.env.SESSION_SECRET || "";
  if (process.env.NODE_ENV === "production") {
    if (s.length < 32) throw new Error("SESSION_SECRET fehlt oder ist kürzer als 32 Zeichen – in Produktion Pflicht.");
    return s;
  }
  if (s) return s;
  if (!globalThis.__oiSitzungGewarnt) {
    globalThis.__oiSitzungGewarnt = true;
    console.warn("[plattform] SESSION_SECRET nicht gesetzt – unsicherer Entwicklungs-Schlüssel aktiv. Niemals so produktiv betreiben.");
  }
  return DEV_GEHEIMNIS;
}

const schluesselCache = new Map();
function schluessel() {
  const s = geheimnis();
  if (!schluesselCache.has(s)) {
    schluesselCache.set(s, crypto.subtle.importKey("raw", enc.encode(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]));
  }
  return schluesselCache.get(s);
}

function b64u(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function vonB64u(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/** sitzungId: Kennung des Sitzungseintrags im Backend (Sitzungsliste, einzeln widerrufbar) */
export async function tokenErstellen({ nutzerId, version = 0, sitzungId = null }) {
  const jetzt = Math.floor(Date.now() / 1000);
  const payload = b64u(enc.encode(JSON.stringify({ u: nutzerId, v: version, ...(sitzungId ? { s: sitzungId } : {}), iat: jetzt, exp: jetzt + SITZUNG_DAUER_S })));
  const daten = `v1.${payload}`;
  const sig = await crypto.subtle.sign("HMAC", await schluessel(), enc.encode(daten));
  return `${daten}.${b64u(sig)}`;
}

/** Liefert { nutzerId, version, sitzungId, exp } oder null. Signaturprüfung zeitkonstant (subtle.verify). */
export async function tokenPruefen(token) {
  try {
    if (typeof token !== "string" || token.length > 600) return null;
    const teile = token.split(".");
    if (teile.length !== 3 || teile[0] !== "v1") return null;
    const ok = await crypto.subtle.verify("HMAC", await schluessel(), vonB64u(teile[2]), enc.encode(`${teile[0]}.${teile[1]}`));
    if (!ok) return null;
    const p = JSON.parse(dec.decode(vonB64u(teile[1])));
    if (!p?.u || typeof p.exp !== "number" || p.exp < Math.floor(Date.now() / 1000)) return null;
    return { nutzerId: String(p.u), version: Number(p.v) || 0, sitzungId: typeof p.s === "string" ? p.s : null, exp: p.exp };
  } catch {
    return null;
  }
}

/** Cookie-Optionen (HttpOnly, SameSite=Lax, Secure in Produktion) */
export function cookieOptionen(maxAge = SITZUNG_DAUER_S) {
  return { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge };
}

// ---------------------------------------------------------------- Zwischenschritt Zwei-Faktor (Login, Sicherheit & Teams)
// Nach Passwort bzw. E-Mail-Link, aber vor dem 2FA-Code: kurzlebiges, signiertes Token (5 min) in eigenem
// Cookie. Es berechtigt zu nichts außer dem Absenden des Codes (POST /api/auth/zwei-faktor).
// Eigene Domäne im signierten Text („z1.“), damit es nie als Sitzungstoken durchgeht.

export const ZWISCHEN_DAUER_S = 5 * 60;

export async function zwischenTokenErstellen({ nutzerId, version = 0, methode = "passwort" }) {
  const jetzt = Math.floor(Date.now() / 1000);
  const payload = b64u(enc.encode(JSON.stringify({ u: nutzerId, v: version, m: methode, iat: jetzt, exp: jetzt + ZWISCHEN_DAUER_S })));
  const daten = `z1.${payload}`;
  const sig = await crypto.subtle.sign("HMAC", await schluessel(), enc.encode(daten));
  return `${daten}.${b64u(sig)}`;
}

/** Liefert { nutzerId, version, methode, iat } oder null */
export async function zwischenTokenPruefen(token) {
  try {
    if (typeof token !== "string" || token.length > 600) return null;
    const teile = token.split(".");
    if (teile.length !== 3 || teile[0] !== "z1") return null;
    const ok = await crypto.subtle.verify("HMAC", await schluessel(), vonB64u(teile[2]), enc.encode(`${teile[0]}.${teile[1]}`));
    if (!ok) return null;
    const p = JSON.parse(dec.decode(vonB64u(teile[1])));
    if (!p?.u || typeof p.exp !== "number" || p.exp < Math.floor(Date.now() / 1000)) return null;
    return { nutzerId: String(p.u), version: Number(p.v) || 0, methode: String(p.m || "passwort"), iat: p.iat };
  } catch {
    return null;
  }
}
