// PUT /api/portal/suchprofil – Suchprofil des Investors { mwpMin, mwpMax, phasen[], laender[], typen[], ticketMin, ticketMax, benachrichtigen, schwelle (50–100, Standard 70) }
import { route } from "@/lib/plattform/server/route";

export const PUT = route({ rollen: ["investor"] }, async ({ backend, nutzer, body }) => ({
  ok: true,
  suchprofil: await backend.suchprofilSpeichern(nutzer, body),
}));
