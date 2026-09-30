// src/lib/plattform/server/leak.js
//
// Optionale Leak-Prüfung neuer Passwörter gegen „Have I Been Pwned“ (Pwned Passwords, k-Anonymity):
// Nur die ersten 5 Zeichen des SHA-1-Hashes verlassen den Server, der Abgleich des Rests erfolgt lokal.
// „Add-Padding“ verschleiert zusätzlich die Antwortgröße. Aktiv nur mit PLATTFORM_HIBP=1.
// Bei Netzfehlern/Zeitüberschreitung wird die Prüfung übersprungen (kein Ausfall der Registrierung).

import { createHash } from "node:crypto";
import { PlattformFehler } from "../fehler";

const URL_BASIS = "https://api.pwnedpasswords.com/range/";
const TIMEOUT_MS = 3000;

export const leakPruefungAktiv = () => process.env.PLATTFORM_HIBP === "1";

/** Anzahl der bekannten Vorkommen (0 = nicht bekannt) oder null, wenn nicht geprüft */
export async function passwortVorkommen(passwort) {
  if (!leakPruefungAktiv() || typeof passwort !== "string" || !passwort) return null;
  const sha1 = createHash("sha1").update(passwort, "utf8").digest("hex").toUpperCase();
  const praefix = sha1.slice(0, 5);
  const rest = sha1.slice(5);
  try {
    const res = await fetch(URL_BASIS + praefix, {
      headers: { "Add-Padding": "true", "User-Agent": "OekoInvest-Plattform" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const text = await res.text();
    for (const zeile of text.split(/\r?\n/)) {
      const [suffix, anzahl] = zeile.trim().split(":");
      if (suffix === rest) return Number(anzahl) || 0; // Padding-Zeilen haben Anzahl 0
    }
    return 0;
  } catch (e) {
    console.warn("[plattform] Leak-Prüfung übersprungen:", e?.name || "Fehler");
    return null;
  }
}

/** Wirft 422, wenn das Passwort in bekannten Datenlecks vorkommt (nur mit PLATTFORM_HIBP=1) */
export async function passwortLeakPruefen(passwort) {
  const n = await passwortVorkommen(passwort);
  if (n && n > 0) {
    throw new PlattformFehler(422, "Dieses Passwort ist aus bekannten Datenlecks bekannt und daher unsicher. Bitte wählen Sie ein anderes – am besten eine Passphrase aus mehreren Wörtern.", "passwort_geleakt");
  }
}
