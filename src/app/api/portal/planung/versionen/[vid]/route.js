// GET  /api/portal/planung/versionen/[vid] – Datei der Planversion (?abgeleitet=1: aus DWG konvertierte DXF bzw. GeoJSON-Vorschau
//      aus KMZ/Shapefile; ?anzeigen=1 PDF inline; ?meta=1 Metadaten als JSON). Rechte wie Sichtbarkeit, Abruf protokolliert.
// POST /api/portal/planung/versionen/[vid] – { aktion: einreichen | freigeben | zurueckweisen | zurueckziehen | konvertieren, kommentar }
import { route } from "@/lib/plattform/server/route";
import { planungBackend } from "@/lib/plattform/backend/planung";

export const GET = route({}, async ({ nutzer, params, suche }) => {
  const b = planungBackend();
  if (suche.get("meta") === "1") return b.planungVersion(nutzer, params.vid);
  const { name, mime, daten } = await b.planungDatei(nutzer, params.vid, { abgeleitet: suche.get("abgeleitet") === "1" });
  const art = suche.get("anzeigen") === "1" && mime === "application/pdf" ? "inline" : "attachment";
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(daten, {
    headers: {
      "Content-Type": mime === "application/pdf" ? mime : "application/octet-stream",
      "Content-Length": String(daten.length),
      "Content-Disposition": `${art}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});

export const POST = route({}, async ({ nutzer, params, body }) => ({
  ok: true,
  version: await planungBackend().planungVersionAktion(nutzer, params.vid, { aktion: String(body?.aktion || ""), kommentar: String(body?.kommentar || "").slice(0, 300) }),
}));
