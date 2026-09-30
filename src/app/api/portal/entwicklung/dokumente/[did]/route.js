// GET /api/portal/entwicklung/dokumente/[did] – Download (Backoffice; Gutachter nur eigene bzw. für ihn freigegebene am zugewiesenen
//     Meilenstein; Co-Investor nur freigegebene). Abruf wird protokolliert.
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const GET = route({}, async ({ nutzer, params, suche }) => {
  const { name, mime, daten } = await entwicklungBackend().entwicklungDokumentLesen(nutzer, params.did);
  const art = suche.get("anzeigen") === "1" ? "inline" : "attachment";
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(daten, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(daten.length),
      "Content-Disposition": `${art}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
