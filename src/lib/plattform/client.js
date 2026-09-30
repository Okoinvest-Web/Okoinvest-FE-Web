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

/** Nur interne Pfade als Ziel nach dem Login zulassen (kein Open Redirect) */
export function sicheresZiel(weiter, standard = "/portal") {
  const w = String(weiter || "");
  return w.startsWith("/") && !w.startsWith("//") && !w.startsWith("/\\") && !/^\/api\//.test(w) ? w : standard;
}
