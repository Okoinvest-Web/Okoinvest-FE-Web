// Handelsdesk (Backoffice, Bereich „energie“): GET Übersicht · POST {aktion: "lauf"} Wechselanalyse + Fristen jetzt ausführen
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, uebersicht: await energieBackend().energieUebersicht(nutzer) }));
export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  if (body.aktion !== "lauf") throw new PlattformFehler(422, "Unbekannte Aktion.");
  return { ok: true, lauf: await energieBackend().energieLauf(nutzer) };
});
