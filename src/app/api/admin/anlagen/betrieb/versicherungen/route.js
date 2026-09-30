// POST /api/admin/anlagen/betrieb/versicherungen – Versicherungsfall anlegen
//      { anlageId, stoerungId?, art, versicherer, police, schadentag, schadenbeschreibung, schadenEur, selbstbehaltEur?, ertragsausfallEur? }
import { route } from "@/lib/plattform/server/route";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";

export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, fall: await betriebBackend().betriebVersicherungSpeichern(nutzer, { ...body, id: null }) }));
