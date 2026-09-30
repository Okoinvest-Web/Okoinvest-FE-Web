// POST /api/admin/entwicklung/[id]/kalkulation/aktion – { aktion: festschreiben {stand, kommentar} | trasse_akquise |
//      dxf_uebernehmen {versionId, felder[]} | vorschlag {schluessel?[]} | uebergeben } (Bereich „entwicklung“ schreiben)
import { route } from "@/lib/plattform/server/route";
import { planungBackend } from "@/lib/plattform/backend/planung";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({
  ok: true,
  kalkulation: await planungBackend().kalkulationAktion(nutzer, params.id, {
    aktion: String(body?.aktion || ""), stand: String(body?.stand || ""), kommentar: String(body?.kommentar || ""), versionId: String(body?.versionId || ""),
    felder: Array.isArray(body?.felder) ? body.felder.map(String) : [], schluessel: Array.isArray(body?.schluessel) ? body.schluessel.map(String) : null,
  }),
}));
