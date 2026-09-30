// Lieferant: POST Preisblatt {positionen[], bindefristBis, zahlungszielTage, sicherheit, bemerkung} (verdeckt, ersetzt das eigene
// Angebot derselben Runde; nach Frist 409) · POST {aktion: "zurueckziehen", angebotId}
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const POST = route({ rollen: ["lieferant"] }, async ({ nutzer, params, body }) => {
  const b = energieBackend();
  if (body.aktion === "zurueckziehen") return b.energieAngebotZurueckziehen(nutzer, body.angebotId);
  return { ok: true, angebot: await b.energieAngebotAbgeben(nutzer, params.id, body) };
});
