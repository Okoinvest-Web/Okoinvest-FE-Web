// GET   /api/portal/datenraum/dokumente/[id][?anzeigen=1] – Datenraum-Dokument (Rechte inkl. Freigabestufe),
//       Dateiname mit Empfänger + Datum („Wasserzeichen“), jeder Zugriff im Zugriffsprotokoll
// PATCH /api/portal/datenraum/dokumente/[id] – { ordner?, stufe? (1|2), versionVon? } Anbieter/Backoffice
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const GET = route({}, async ({ nutzer, params, suche, ip }) => {
  const anzeigen = suche.get("anzeigen") === "1";
  const { meta, daten, dateiname } = await dealroom().datenraumDokument(nutzer, params.id, { ip, anzeigen });
  const ascii = dateiname.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(daten, {
    headers: {
      "Content-Type": meta.mime,
      "Content-Length": String(daten.length),
      "Content-Disposition": `${anzeigen ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(dateiname)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});

export const PATCH = route({ rollen: ["anbieter"] }, async ({ nutzer, params, body }) => ({
  ok: true,
  eintrag: await dealroom().datenraumEinordnen(nutzer, params.id, { ordner: body.ordner, stufe: body.stufe, versionVon: body.versionVon }),
}));
