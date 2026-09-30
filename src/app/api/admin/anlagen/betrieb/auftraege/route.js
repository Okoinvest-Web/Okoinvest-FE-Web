// POST /api/admin/anlagen/betrieb/auftraege – Serviceauftrag anlegen
//      { anlageId, stoerungId?, planId?, art, dienstleister, kontakt, beschreibung, termin?, kostenEur?, bestellnummer? }
import { route } from "@/lib/plattform/server/route";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";

export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, auftrag: await betriebBackend().betriebAuftragSpeichern(nutzer, { ...body, id: null }) }));
