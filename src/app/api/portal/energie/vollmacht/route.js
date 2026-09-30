// Beschaffungsvollmacht (Rolle unternehmen): POST {aktion: "erteilen", zustimmung: true} | {aktion: "widerrufen"} –
// Zeitpunkt, IP, Browser und Prüfsumme des Textes werden protokolliert
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const POST = route({ rollen: ["unternehmen"] }, async ({ nutzer, body, ip, request }) => {
  const b = energieBackend();
  if (body.aktion === "erteilen") return { ok: true, vollmacht: await b.energieVollmachtErteilen(nutzer, { zustimmung: body.zustimmung === true, ip, userAgent: request.headers.get("user-agent") || "" }) };
  if (body.aktion === "widerrufen") return { ok: true, vollmacht: await b.energieVollmachtWiderrufen(nutzer, { ip }) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
