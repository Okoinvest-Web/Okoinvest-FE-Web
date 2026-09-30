// POST /api/admin/finanzen/buchhaltung/zahlungen – Kontoauszug einlesen { inhalt (CAMT-XML oder CSV als Text), dateiname, format? } (max. ca. 3 MB)
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const POST = route({ admin: true, maxBytes: 3_500_000 }, async ({ nutzer, body }) => ({ ok: true, ...(await werkzeugeBackend().bhZahlungImport(nutzer, { inhalt: body.inhalt, dateiname: body.dateiname, format: body.format })) }));
