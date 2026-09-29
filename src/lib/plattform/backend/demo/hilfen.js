// src/lib/plattform/backend/demo/hilfen.js – kleine Helfer des Demo-Backends

import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // ohne 0/O/1/I

/** Kennung wie V-26-7KQ2XM (Präfix, Jahr, 6 zufällige Zeichen ≈ 30 Bit) */
export function neueId(praefix, laenge = 6) {
  const b = randomBytes(laenge);
  let s = "";
  for (let i = 0; i < laenge; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return `${praefix}-${String(new Date().getFullYear()).slice(2)}-${s}`;
}

export const jetzt = () => new Date().toISOString();

/** ISO-Zeitpunkt relativ zu jetzt (Tage, negativ = Vergangenheit) */
export const vorTagen = (tage, stunden = 0) => new Date(Date.now() - (tage * 24 + stunden) * 3600 * 1000).toISOString();

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** Zufälliges Einmal-Token (256 Bit, base64url) */
export const zufallsToken = () => randomBytes(32).toString("base64url");

export function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
