// POST /api/admin/anlagen/betrieb/ersatzteile – Ersatzteil anlegen
//      { bezeichnung, art, hersteller, artikelnummer, bestand, mindestbestand, zielbestand?, lagerort, einheit?, preisEur? }
import { route } from "@/lib/plattform/server/route";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";

export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, teil: await betriebBackend().betriebErsatzteilSpeichern(nutzer, { ...body, id: null }) }));
