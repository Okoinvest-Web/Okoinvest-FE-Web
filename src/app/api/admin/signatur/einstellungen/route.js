// GET   /api/admin/signatur/einstellungen – Modus je Standard-Erklärung (klick | signatur)
// PATCH /api/admin/signatur/einstellungen – { ndaModus?, provisionModus? } (Bereich „signatur“ schreiben; Standard: klick)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, einstellungen: await serviceBackend().signaturEinstellungen(nutzer) }));

export const PATCH = route({ admin: true }, async ({ nutzer, body }) => ({
  ok: true,
  einstellungen: await serviceBackend().signaturEinstellungenSpeichern(nutzer, { ndaModus: body.ndaModus, provisionModus: body.provisionModus }),
}));
