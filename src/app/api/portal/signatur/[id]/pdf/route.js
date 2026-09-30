// GET /api/portal/signatur/[id]/pdf?variante=original|signiert[&anzeigen=1] – PDF (nur Beteiligte/Backoffice, Abruf protokolliert)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

/** Dateiname für Content-Disposition: nur druckbares ASCII, ohne Anführungszeichen und Backslash */
const asciiName = (s) => Array.from(String(s || "dokument.pdf"), (c) => (c >= " " && c <= "~" && c !== '"' && c !== "\\" ? c : "_")).join("");

export const GET = route({}, async ({ nutzer, params, suche, ip }) => {
  const variante = suche.get("variante") === "signiert" ? "signiert" : "original";
  const { name, daten } = await serviceBackend().signaturDatei(nutzer, params.id, { variante, ip });
  const art = suche.get("anzeigen") === "1" ? "inline" : "attachment";
  return new Response(daten, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(daten.length),
      "Content-Disposition": `${art}; filename="${asciiName(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
