// GET /api/boerse/[slug] – Exposé: öffentlich nur Teaser; vertrauliche Felder und Datenraum
// nur für Anbieter, Admin und Investoren mit freigegebenem NDA.
import { route } from "@/lib/plattform/server/route";

export const GET = route({ auth: "optional" }, async ({ backend, nutzer, params }) => {
  const d = await backend.boerseDetail(nutzer, params.slug, { zaehlen: false });
  return { ok: true, ...d };
});
