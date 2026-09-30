// src/lib/plattform/planung/konverter.js
//
// NUR SERVERSEITIG: Aufruf des CAD-Konvertierungsdienstes (Backend-Import/dienste/cad-konverter) DWG → DXF.
//   CAD_KONVERTER_URL    z. B. http://cad-konverter:8080 (internes Netz, nie öffentlich)
//   CAD_KONVERTER_TOKEN  Bearer-Token (≥ 32 Zeichen, identisch mit KONVERTER_TOKEN im Dienst)
// Ohne Konfiguration: { ok:false, status:"nicht_verfuegbar" } – der Plan bleibt mit Hinweis „Vorschau nach Konvertierung“.

import { dxfArt } from "./dxf.js";

export const KONVERTER_TIMEOUT_MS = 120000;

export function konverterKonfiguriert() {
  return !!(process.env.CAD_KONVERTER_URL && (process.env.CAD_KONVERTER_TOKEN || "").length >= 32);
}

/** DWG-Bytes → { ok, daten (DXF-Buffer), dauerMs } | { ok:false, status: nicht_verfuegbar|fehler, fehler } */
export async function dwgNachDxf(daten) {
  if (!konverterKonfiguriert()) return { ok: false, status: "nicht_verfuegbar", fehler: "Kein Konvertierungsdienst konfiguriert (CAD_KONVERTER_URL/CAD_KONVERTER_TOKEN)." };
  const start = Date.now();
  try {
    const res = await fetch(`${process.env.CAD_KONVERTER_URL.replace(/\/$/, "")}/v1/konvertieren?ziel=dxf`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CAD_KONVERTER_TOKEN}`, "Content-Type": "application/octet-stream" },
      body: daten,
      signal: AbortSignal.timeout(KONVERTER_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, status: "fehler", fehler: String(j.fehler || `Konvertierung fehlgeschlagen (HTTP ${res.status}).`).slice(0, 200) };
    }
    const dxf = Buffer.from(await res.arrayBuffer());
    if (dxfArt(dxf.subarray(0, 400).toString("latin1")) !== "ascii") return { ok: false, status: "fehler", fehler: "Der Dienst lieferte keine gültige DXF-Datei." };
    return { ok: true, daten: dxf, dauerMs: Date.now() - start };
  } catch (e) {
    return { ok: false, status: "fehler", fehler: e?.name === "TimeoutError" ? "Zeitüberschreitung beim Konvertieren." : "Konvertierungsdienst nicht erreichbar." };
  }
}
