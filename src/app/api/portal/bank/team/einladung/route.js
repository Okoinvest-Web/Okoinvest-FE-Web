// POST /api/portal/bank/team/einladung – Einladung in das Bank-Team annehmen { token } (angemeldet mit der eingeladenen E-Mail-Adresse);
//      setzt die Rolle „bank“, verknüpft das Konto mit der Bank und vergibt die Teamrolle aus der Einladung
import { route } from "@/lib/plattform/server/route";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";

export const POST = route({ limit: "einladung" }, async ({ nutzer, body }) => bankakteBackend().baTeamEinladungAnnehmen(nutzer, String(body.token || "").slice(0, 200)));
