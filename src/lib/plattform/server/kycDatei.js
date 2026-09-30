// src/lib/plattform/server/kycDatei.js
//
// KYC-Uploads: Typ an den ersten Bytes erkennen (nie dem Browser-MIME oder der Endung trauen) und Auslieferung
// einer entschlüsselten Unterlage (kein Cache, nosniff, Sandbox-CSP, kein Referrer).

export function mimeAusBytes(b) {
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  return "";
}

export function kycDateiAntwort(meta, daten, { anzeigen = false } = {}) {
  const name = String(meta.name || "unterlage");
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(daten, {
    headers: {
      "Content-Type": meta.mime,
      "Content-Length": String(daten.length),
      "Content-Disposition": `${anzeigen ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
