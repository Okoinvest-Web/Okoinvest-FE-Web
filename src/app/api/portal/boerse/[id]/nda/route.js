// POST /api/portal/boerse/[id]/nda – { akzeptiert: true } Klick-NDA (Text-Version, Zeitstempel, IP, User-Agent protokolliert)
import { route } from "@/lib/plattform/server/route";
import { signaturModusPruefen } from "@/lib/plattform/signatur/server"; // Signatur: Modus „signatur“ → 409 signatur_noetig

export const POST = route({ rollen: ["investor"] }, async ({ backend, nutzer, params, body, ip, request }) => {
  await signaturModusPruefen(nutzer, "nda", params.id, { ip }); // Standard „klick“: ohne Wirkung
  return {
    ok: true,
    interesse: await backend.ndaAnfragen(nutzer, params.id, {
      akzeptiert: body.akzeptiert === true,
      ip,
      userAgent: request.headers.get("user-agent") || "",
    }),
  };
});
