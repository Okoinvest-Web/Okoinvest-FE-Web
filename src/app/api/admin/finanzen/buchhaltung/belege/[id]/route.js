// POST /api/admin/finanzen/buchhaltung/belege/[id] – { aktion: "storno", grund, provisionStornieren? } | { aktion: "mahnsperre", bis?, grund? }
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => {
  const b = werkzeugeBackend();
  if (body.aktion === "storno") return b.bhStorno(nutzer, params.id, { grund: body.grund, provisionStornieren: body.provisionStornieren });
  if (body.aktion === "mahnsperre") return b.bhMahnsperre(nutzer, params.id, { bis: body.bis, grund: body.grund });
  throw new PlattformFehler(400, "Unbekannte Aktion.");
});
