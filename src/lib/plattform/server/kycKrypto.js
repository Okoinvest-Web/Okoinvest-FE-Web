// src/lib/plattform/server/kycKrypto.js
//
// Verschlüsselte Ablage der KYC-Unterlagen im Demo-Backend: AES-256-GCM (authentifiziert), je Datei zufälliger
// 96-Bit-IV, Dokument-ID als Zusatzdaten (AAD) – eine Datei lässt sich nicht unbemerkt einem anderen Dokument unterschieben.
//
// Schlüssel: PLATTFORM_KYC_SCHLUESSEL – 32 Byte als Hex (64 Zeichen) bzw. Base64, oder eine Passphrase ≥ 32 Zeichen
// (wird per scrypt abgeleitet). Erzeugen: `openssl rand -base64 32`. Ohne Schlüssel:
//   - Produktion: 503 (keine unverschlüsselte Ablage, kein stiller Fallback)
//   - Entwicklung: fester, UNSICHERER Entwicklungsschlüssel mit Warnung im Log
// Schlüsselwechsel: alte Dateien bleiben mit dem alten Schlüssel lesbar, wenn er in PLATTFORM_KYC_SCHLUESSEL_ALT steht
// (kommagetrennt). Die Schlüssel-Kennung (8 Byte SHA-256) steht im Dateikopf.
//
// Dateiformat: "OIKYC1" (6) | Schlüssel-Kennung (8) | IV (12) | Tag (16) | Chiffrat
// Frappe: privates File, zusätzlich AES-256-GCM mit site_config „oekoinvest_kyc_schluessel“ (plattform/kyc_kern.py).

import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { PlattformFehler } from "../fehler";

const MAGIC = Buffer.from("OIKYC1", "ascii");
const DEV_PASSPHRASE = "oekoinvest-kyc-entwicklung-UNSICHER-nur-lokal-2026";
let gewarnt = false;

function schluesselAus(wert) {
  const s = String(wert || "").trim();
  if (!s) return null;
  if (/^[0-9a-f]{64}$/i.test(s)) return Buffer.from(s, "hex");
  if (/^[A-Za-z0-9+/_-]{43}=?$/.test(s)) {
    const b = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    if (b.length === 32) return b;
  }
  if (s.length < 32) throw new PlattformFehler(503, "Der Schlüssel für die KYC-Ablage ist zu kurz (mindestens 32 Zeichen).");
  return scryptSync(s, "oekoinvest-kyc-v1", 32);
}

const kennung = (k) => createHash("sha256").update(k).digest().subarray(0, 8);

export function kycSchluesselStatus() {
  const env = process.env.PLATTFORM_KYC_SCHLUESSEL;
  if (env) return { gesetzt: true, entwicklung: false };
  return { gesetzt: false, entwicklung: process.env.NODE_ENV !== "production" };
}

function aktuellerSchluessel() {
  const env = process.env.PLATTFORM_KYC_SCHLUESSEL;
  if (env) return schluesselAus(env);
  if (process.env.NODE_ENV === "production") {
    throw new PlattformFehler(503, "Die verschlüsselte Ablage für Verifizierungsunterlagen ist nicht eingerichtet (PLATTFORM_KYC_SCHLUESSEL).");
  }
  if (!gewarnt) {
    gewarnt = true;
    console.warn("[plattform-kyc] PLATTFORM_KYC_SCHLUESSEL fehlt – unsicherer Entwicklungsschlüssel aktiv (nur lokal verwenden).");
  }
  return scryptSync(DEV_PASSPHRASE, "oekoinvest-kyc-v1", 32);
}

function alleSchluessel() {
  const liste = [aktuellerSchluessel()];
  for (const alt of String(process.env.PLATTFORM_KYC_SCHLUESSEL_ALT || "").split(",")) if (alt.trim()) liste.push(schluesselAus(alt));
  if (process.env.PLATTFORM_KYC_SCHLUESSEL && process.env.NODE_ENV !== "production") liste.push(scryptSync(DEV_PASSPHRASE, "oekoinvest-kyc-v1", 32));
  return liste;
}

/** Klartext → verschlüsselter Puffer (aad = Dokument-ID) */
export function kycVerschluesseln(klartext, aad) {
  const k = aktuellerSchluessel();
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  c.setAAD(Buffer.from(String(aad), "utf8"));
  const chiffrat = Buffer.concat([c.update(klartext), c.final()]);
  return Buffer.concat([MAGIC, kennung(k), iv, c.getAuthTag(), chiffrat]);
}

/** Verschlüsselter Puffer → Klartext; Manipulation/falscher Schlüssel → Fehler */
export function kycEntschluesseln(daten, aad) {
  const b = Buffer.from(daten);
  if (b.length < 42 || !b.subarray(0, 6).equals(MAGIC)) throw new PlattformFehler(500, "Die Datei ist beschädigt.");
  const id = b.subarray(6, 14);
  const k = alleSchluessel().find((x) => kennung(x).equals(id));
  if (!k) throw new PlattformFehler(500, "Die Datei wurde mit einem unbekannten Schlüssel verschlüsselt.");
  const d = createDecipheriv("aes-256-gcm", k, b.subarray(14, 26));
  d.setAAD(Buffer.from(String(aad), "utf8"));
  d.setAuthTag(b.subarray(26, 42));
  try {
    return Buffer.concat([d.update(b.subarray(42)), d.final()]);
  } catch {
    throw new PlattformFehler(500, "Die Datei konnte nicht entschlüsselt werden (manipuliert oder falscher Schlüssel).");
  }
}
