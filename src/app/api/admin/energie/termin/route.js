// Terminmarkt: GET ?zone=DE|AT&produkt=Cal-27 · POST {eintrag} oder {csv, quelleStandard} (Quelle je Eintrag Pflicht)
// · DELETE ?id= (nur eigene Einspielungen; die Demo-Kurve wird in den Einstellungen abgeschaltet)
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await energieBackend().energieTermin(nutzer, { zone: suche.get("zone") || "DE", produkt: suche.get("produkt") || "" })) }));
export const POST = route({ admin: true, maxBytes: 450 * 1024 }, async ({ nutzer, body }) => ({
  ok: true,
  ...(await energieBackend().energieTerminSpeichern(nutzer, { eintrag: body.eintrag && typeof body.eintrag === "object" ? body.eintrag : null, csv: typeof body.csv === "string" ? body.csv : "", quelleStandard: typeof body.quelleStandard === "string" ? body.quelleStandard : "" })),
}));
export const DELETE = route({ admin: true, json: false }, async ({ nutzer, suche }) => energieBackend().energieTerminLoeschen(nutzer, suche.get("id") || ""));
