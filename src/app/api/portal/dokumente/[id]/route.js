// GET    /api/portal/dokumente/[id] – Download (nur Berechtigte; Datenraum nur mit freigegebenem NDA)
// DELETE /api/portal/dokumente/[id] – eigenen Upload löschen (Admin: alle)
import { route } from "@/lib/plattform/server/route";

export const GET = route({}, async ({ backend, nutzer, params, suche }) => {
  const { meta, daten } = await backend.dokumentLesen(nutzer, params.id);
  const art = suche.get("anzeigen") === "1" ? "inline" : "attachment";
  const ascii = meta.name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(daten, {
    headers: {
      "Content-Type": meta.mime,
      "Content-Length": String(daten.length),
      "Content-Disposition": `${art}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});

export const DELETE = route({ json: false }, async ({ backend, nutzer, params }) => backend.dokumentLoeschen(nutzer, params.id));
