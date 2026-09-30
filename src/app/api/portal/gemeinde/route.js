// GET  /api/portal/gemeinde?vorgang=… – Gemeindecockpit (Gemeinde: eigenes geprüftes Anliegen; Backoffice: Bereich „kommunen“)
// POST /api/portal/gemeinde – { vorgangId, aktion, … }: schritt · termin · terminLoeschen · zahlung · zahlungLoeschen
//      · stellungnahme · antwort · erledigt (Verfahren/Zahlungen nur Backoffice – Prüfung im Backend)
import { route } from "@/lib/plattform/server/route";
import { gemeindeBackend } from "@/lib/plattform/backend/gemeinde";

export const GET = route({ rollen: ["kommune"] }, async ({ nutzer, suche }) => ({ ok: true, cockpit: await gemeindeBackend().gdCockpit(nutzer, { vorgangId: suche.get("vorgang") || null }) }));

export const POST = route({ rollen: ["kommune"] }, async ({ nutzer, body, ip }) => {
  const { vorgangId, ...rest } = body;
  return { ok: true, cockpit: await gemeindeBackend().gdAktion(nutzer, vorgangId, rest, { ip }) };
});
