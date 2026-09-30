// Pool-Portfolio: GET Beschaffungsstand, Hedge-Quote, Mark-to-Market, Risiko · POST {aktion: buchen {periode, zone, mwh,
// preisEurMwh, gekauftAm, lieferantId|lieferant, bemerkung} | stornieren {id}}
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, portfolio: await energieBackend().energiePortfolio(nutzer) }));
export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  const b = energieBackend();
  if (body.aktion === "buchen") return { ok: true, tranche: await b.energieTrancheSpeichern(nutzer, body) };
  if (body.aktion === "stornieren") return { ok: true, tranche: await b.energieTrancheStornieren(nutzer, body.id) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
