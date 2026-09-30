// GET  /api/portal/bieter?projekt=P-… – Bieterverfahren in der Sicht der Rolle (Investor: nur eigene Gebote)
// POST /api/portal/bieter – verdecktes Gebot { verfahrenId, preisModus (gesamt|proKwp), preis|preisProKwp,
//      bedingungen, finanzierung, zeitplan, gueltigBis?, finanzierungDokumentId? } (ersetzt eigenes Gebot der Runde)
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const GET = route({}, async ({ nutzer, suche }) => ({ ok: true, ...(await dealroom().bieterverfahren(nutzer, suche.get("projekt") || "")) }));

export const POST = route({ rollen: ["investor"] }, async ({ nutzer, body }) => {
  rateLimit(`gebot:${nutzer.id}`, ...grenze("nachricht"));
  return { ok: true, gebot: await dealroom().gebotAbgeben(nutzer, body) };
});
