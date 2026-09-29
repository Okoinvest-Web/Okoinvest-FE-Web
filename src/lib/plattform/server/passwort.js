// src/lib/plattform/server/passwort.js
//
// Passwort-Hashing für das Demo-Backend: scrypt mit 16 Byte Salt, Vergleich
// zeitkonstant. Format: scrypt$N$r$p$<salt b64>$<hash b64> (Parameter im Hash,
// damit sie später erhöht werden können). Frappe nutzt sein eigenes Verfahren.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const LAENGE = 64;

function scryptAsync(passwort, salt, n, r, p) {
  return new Promise((resolve, reject) =>
    scrypt(passwort.normalize("NFKC"), salt, LAENGE, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function passwortHash(passwort) {
  const salt = randomBytes(16);
  const key = await scryptAsync(String(passwort), salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

// Für unbekannte E-Mail-Adressen trotzdem rechnen – gleiche Antwortzeit (keine Konto-Enumeration)
let attrappe = null;

export async function passwortPruefen(passwort, gespeichert) {
  if (!gespeichert) {
    attrappe ||= await passwortHash("attrappe-ohne-konto");
    gespeichert = attrappe;
    passwort = `${passwort}-x`;
  }
  const teile = String(gespeichert).split("$");
  if (teile.length !== 6 || teile[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = teile;
  const soll = Buffer.from(hash, "base64");
  const ist = await scryptAsync(String(passwort ?? ""), Buffer.from(salt, "base64"), Number(n), Number(r), Number(p));
  return soll.length === ist.length && timingSafeEqual(soll, ist);
}
