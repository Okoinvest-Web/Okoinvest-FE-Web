// POST /api/portal/boerse/[id]/nda – { akzeptiert: true } Klick-NDA (Text-Version, Zeitstempel, IP, User-Agent protokolliert)
import { route } from "@/lib/plattform/server/route";

export const POST = route({ rollen: ["investor"] }, async ({ backend, nutzer, params, body, ip, request }) => ({
  ok: true,
  interesse: await backend.ndaAnfragen(nutzer, params.id, {
    akzeptiert: body.akzeptiert === true,
    ip,
    userAgent: request.headers.get("user-agent") || "",
  }),
}));
