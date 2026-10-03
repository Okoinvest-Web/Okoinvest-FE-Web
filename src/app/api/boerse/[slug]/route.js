// GET /api/boerse/[slug] – Exposé: öffentlich nur Teaser; vertrauliche Felder und Datenraum
// nur für Anbieter, Admin und Investoren mit freigegebenem NDA.
import { route } from "@/lib/plattform/server/route";
import { istDemo } from "@/lib/plattform/backend";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { istOeffentlichSichtbar } from "@/lib/boerse/sichtbarkeit";

export const GET = route({ auth: "optional" }, async ({ backend, nutzer, params }) => {
  const d = await backend.boerseDetail(nutzer, params.slug, { zaehlen: false });
  // QM Welle 1: wie das Exposé – ohne Sonderrecht keine Test- und (außerhalb des Demo-Modus) keine Demo-Projekte
  const sonderrecht = ["eigentuemer", "admin"].includes(d?.zugriff);
  if (!sonderrecht && !istOeffentlichSichtbar(d?.projekt, { demo: istDemo() })) throw new PlattformFehler(404, "Projekt nicht gefunden.");
  return { ok: true, ...d };
});
