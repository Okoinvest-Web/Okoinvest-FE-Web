// GET  /api/admin/closing[?status=offen|vorbereitung|signing|vollzogen|abgebrochen] – Closing-Räume, Kandidaten (Zuschlag/LOI), Kennzahlen
// POST /api/admin/closing – Closing-Raum eröffnen { projektId, interesseId, struktur?: asset|share, spvName?, spvGesellschaftId?, anteilProzent?, kaufpreis? } (201)
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await closingBackend().clListe(nutzer, { status: String(suche.get("status") || "").slice(0, 20) })) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  const closing = await closingBackend().clAnlegen(nutzer, body);
  return Response.json({ ok: true, closing }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
