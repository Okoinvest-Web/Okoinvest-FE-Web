// src/lib/plattform/totp.js
//
// Zwei-Faktor-Anmeldung ohne Fremdpakete (nur Node-`crypto`, NUR serverseitig):
//  - TOTP nach RFC 6238 (HMAC-SHA1, 30 s, 6 Stellen) auf Basis von HOTP (RFC 4226)
//  - Base32 (RFC 4648) für den Schlüssel in Authenticator-Apps, otpauth-URI
//  - Wiederherstellungscodes (einmalig, nur als SHA-256 gespeichert)
//  - Verschlüsselung des TOTP-Schlüssels im Demo-Backend (AES-256-GCM). Frappe speichert den
//    Schlüssel in einem Password-Feld (verschlüsselt mit dem encryption_key der Site).
//
// Replay-Schutz: `totpPruefen` liefert den Zeitschritt des akzeptierten Codes; das Backend speichert
// ihn als `letzterSchritt` und akzeptiert danach nur noch spätere Schritte.

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const PERIODE_S = 30;
export const STELLEN = 6;
/** Toleranz ± Zeitschritte (Uhrabweichung des Telefons) */
export const FENSTER = 1;
export const AUSSTELLER = "ÖkoInvest";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32(buf) {
  let bits = 0;
  let wert = 0;
  let out = "";
  for (const byte of buf) {
    wert = (wert << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(wert >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(wert << (5 - bits)) & 31];
  return out;
}

export function base32Lesen(s) {
  const sauber = String(s || "").toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let wert = 0;
  const out = [];
  for (const z of sauber) {
    const i = B32.indexOf(z);
    if (i < 0) throw new Error("Ungültiges Base32");
    wert = (wert << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((wert >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Neuer TOTP-Schlüssel: 160 Bit (Empfehlung RFC 4226), Base32 */
export const geheimnisErzeugen = () => base32(randomBytes(20));

/** HOTP-Wert (RFC 4226) für Zähler `zaehler` */
export function hotp(schluessel, zaehler, stellen = STELLEN, algo = "sha1") {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(zaehler));
  const h = createHmac(algo, schluessel).update(b).digest();
  const o = h[h.length - 1] & 0x0f;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** stellen).padStart(stellen, "0");
}

export const zeitschritt = (zeitMs = Date.now()) => Math.floor(zeitMs / 1000 / PERIODE_S);

/** TOTP-Code eines Base32-Schlüssels zu einem Zeitpunkt (für Tests und Anzeige) */
export const totp = (geheimnisB32, zeitMs = Date.now()) => hotp(base32Lesen(geheimnisB32), zeitschritt(zeitMs));

function gleich(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Code prüfen. Liefert den Zeitschritt des passenden Codes oder null.
 * Nur Schritte > `letzterSchritt` zählen (derselbe Code ist nie zweimal gültig).
 */
export function totpPruefen(geheimnisB32, code, { letzterSchritt = -1, zeitMs = Date.now(), fenster = FENSTER } = {}) {
  const c = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(c) || !geheimnisB32) return null;
  const schluessel = base32Lesen(geheimnisB32);
  const jetzt = zeitschritt(zeitMs);
  let treffer = null;
  // alle Fenster-Schritte rechnen (gleiche Laufzeit, unabhängig vom Treffer)
  for (let d = -fenster; d <= fenster; d++) {
    const s = jetzt + d;
    if (gleich(hotp(schluessel, s), c) && s > letzterSchritt && treffer === null) treffer = s;
  }
  return treffer;
}

/** otpauth-URI für Authenticator-Apps (Google Authenticator, Microsoft Authenticator, 1Password …) */
export function otpauthUri({ geheimnis, konto, aussteller = AUSSTELLER }) {
  const label = `${encodeURIComponent(aussteller)}:${encodeURIComponent(konto)}`;
  return `otpauth://totp/${label}?secret=${geheimnis}&issuer=${encodeURIComponent(aussteller)}&algorithm=SHA1&digits=${STELLEN}&period=${PERIODE_S}`;
}

// ---------------------------------------------------------------- Wiederherstellungscodes

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // ohne 0/O/1/I
export const ANZAHL_CODES = 10;

/** Ein Code: XXXXX-XXXXX (50 Bit) */
function einCode() {
  const b = randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) s += CODE_ALPHABET[b[i] % 32];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

export const codesErzeugen = (anzahl = ANZAHL_CODES) => Array.from({ length: anzahl }, einCode);
export const codeNormal = (c) => String(c || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
export const codeHash = (c) => createHash("sha256").update(`oekoinvest-wiederherstellung|${codeNormal(c)}`).digest("hex");
export const istWiederherstellungscode = (c) => /^[0-9A-Z]{10}$/.test(codeNormal(c));

// ---------------------------------------------------------------- Verschlüsselung (Demo-Backend)

function schluesselMaterial() {
  const s = process.env.PLATTFORM_2FA_SCHLUESSEL || process.env.SESSION_SECRET || "";
  if (process.env.NODE_ENV === "production" && s.length < 32) {
    throw new Error("PLATTFORM_2FA_SCHLUESSEL (oder SESSION_SECRET) fehlt – in Produktion Pflicht für die Zwei-Faktor-Anmeldung.");
  }
  return createHash("sha256").update(`oekoinvest-2fa|${s || "oekoinvest-entwicklung-unsicher-nie-produktiv-verwenden"}`).digest();
}

/** Text → "v1.<iv>.<tag>.<chiffrat>" (base64url) */
export function verschluesseln(text) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", schluesselMaterial(), iv);
  const ct = Buffer.concat([c.update(String(text), "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function entschluesseln(wert) {
  const [v, iv, tag, ct] = String(wert || "").split(".");
  if (v !== "v1" || !iv || !tag || !ct) return "";
  try {
    const d = createDecipheriv("aes-256-gcm", schluesselMaterial(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return "";
  }
}
