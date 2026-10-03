// src/lib/plattform/client.js
//
// fetch-Helfer für Client-Komponenten. Mutationen immer als JSON (CSRF-Schutz
// über Content-Type + Origin, siehe server/route.js); Uploads mit Kopfzeile.

export async function senden(url, { method = "POST", body } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new Error("Keine Verbindung – bitte prüfen Sie Ihre Internetverbindung.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    const e = new Error(json.error || `Fehler ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return json;
}

export async function hochladen(datei, { bezugArt, bezugId, kategorie = "allgemein", checkliste = "", anhang = false }) {
  const fd = new FormData();
  fd.append("datei", datei);
  fd.append("bezugArt", bezugArt);
  fd.append("bezugId", bezugId);
  fd.append("kategorie", kategorie);
  if (checkliste) fd.append("checkliste", checkliste);
  if (anhang) fd.append("anhang", "1"); // Querschnitt: Anhang einer Nachricht
  const res = await fetch("/api/portal/dokumente", { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Upload fehlgeschlagen (${res.status})`);
  return json.dokument;
}

// Basis nur zum Auflösen relativer Pfade; .invalid ist reserviert (RFC 2606) und nie erreichbar.
const ZIEL_BASIS = "https://ziel.invalid";
// Unsicher: Steuerzeichen (C0/C1), Leerzeichen, Unicode-Leer-, Zero-Width- und Richtungszeichen, BOM, Backslash.
// Als Codepunkte geprüft, damit keine unsichtbaren Zeichen im Quelltext stehen.
function unsicheresZeichen(s) {
  for (const c of s) {
    const n = c.codePointAt(0);
    if (n <= 0x20 || (n >= 0x7f && n <= 0xa0) || n === 0x5c || n === 0x1680 || n === 0x3000 || n === 0xfeff) return true;
    if ((n >= 0x2000 && n <= 0x200f) || (n >= 0x2028 && n <= 0x202f) || (n >= 0x205f && n <= 0x206f)) return true;
  }
  return false;
}

/**
 * Nur interne Pfade als Ziel nach dem Login zulassen (kein Open Redirect).
 *
 * Browser entfernen beim URL-Parsen Tab/CR/LF und deuten "\" wie "/" (WHATWG URL Standard):
 * "/\t/evil.com" wird so zu "//evil.com" und damit zu https://evil.com. Deshalb werden Steuer-,
 * Leerzeichen und Backslashes komplett abgelehnt, und das Ergebnis wird zusätzlich aufgelöst
 * und muss auf derselben Herkunft bleiben. Zurück kommt der normalisierte Pfad
 * (z. B. "/x/../api/…" wird als "/api/…" erkannt und abgelehnt).
 * Test: node --test src/lib/plattform/sicheresZiel.test.mjs
 */
export function sicheresZiel(weiter, standard = "/portal") {
  const w = String(weiter || "");
  if (!w.startsWith("/") || w.startsWith("//") || unsicheresZeichen(w)) return standard;
  let u;
  try {
    u = new URL(w, ZIEL_BASIS);
  } catch {
    return standard;
  }
  if (u.origin !== ZIEL_BASIS) return standard;
  const pfad = `${u.pathname}${u.search}${u.hash}`;
  return /^\/api(\/|$)/i.test(u.pathname) ? standard : pfad;
}
