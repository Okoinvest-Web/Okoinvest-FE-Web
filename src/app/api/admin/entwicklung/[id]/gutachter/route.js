// POST /api/admin/entwicklung/[id]/gutachter – { email, meilensteinIds, fachgebiete?, qualifikation?, buero?, nachweis? } Gutachter/Planer einladen (Link 14 Tage, einmalig;
//      Annahme gibt die Rolle „gutachter“ und weist die Meilensteine zu). Vorhandene Gutachter direkt am Meilenstein zuweisen.
import { route, basisUrl } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const POST = route({ admin: true }, async ({ nutzer, params, body, request }) => ({
  ok: true,
  ...(await entwicklungBackend().entwicklungGutachterEinladen(nutzer, params.id, {
    email: body.email, meilensteinIds: Array.isArray(body.meilensteinIds) ? body.meilensteinIds.slice(0, 40) : [], basisUrl: basisUrl(request),
    fachgebiete: Array.isArray(body.fachgebiete) ? body.fachgebiete.slice(0, 20) : [], qualifikation: body.qualifikation || "", buero: body.buero || "", nachweis: body.nachweis || "",
  })),
}));
