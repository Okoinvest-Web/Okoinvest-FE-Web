// PUT /api/admin/bonitaet/einstellungen – Pflicht vor LOI/Gebot: { geltung: alle|firmen|pilot|aus|null, gueltigTage, rotSperrt,
//     schritte: { loi, gebot }, pilotKonto: { id, an } }
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const PUT = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, ...(await diensteBackend().bonitaetEinstellungenSpeichern(nutzer, body)) }));
