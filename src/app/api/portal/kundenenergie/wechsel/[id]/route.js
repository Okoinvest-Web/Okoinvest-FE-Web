// POST /api/portal/kundenenergie/wechsel/[id] – Schritt bestätigen { schritt, bemerkung? }
// Kunde: Liefervertrag gegengezeichnet, Kündigungsbestätigung, erste Rechnung · Versorger: Liefervertrag bereitgestellt,
// Anmeldung Netzbetreiber, Lieferbeginn · Backoffice (Energie, auch über /api/admin/energie/wechsel/[id]): alle außer Zuschlag.
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";

export const POST = route({ rollen: ["unternehmen", "lieferant"] }, async ({ nutzer, params, body }) => {
  rateLimit(`wechsel:${nutzer.id}`, ...grenze("nachricht"));
  return { ok: true, wechsel: await kundenenergieBackend().lieferantenwechselAktion(nutzer, params.id, body) };
});
