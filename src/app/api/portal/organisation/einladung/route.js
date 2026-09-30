// POST /api/portal/organisation/einladung – { token } Einladung annehmen (nur mit der eingeladenen E-Mail-Adresse),
// danach aktive Organisation dieser Sitzung → { ok, organisationId, name, rolle }
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const POST = route({ limit: "einladung" }, async ({ nutzer, body }) => {
  const s = sicherheit();
  const r = await s.einladungAnnehmen(nutzer, typeof body.token === "string" ? body.token.slice(0, 200) : "");
  if (nutzer.sitzung?.id) await s.organisationWechseln(nutzer, r.organisationId).catch(() => null);
  return { ok: true, ...r };
});
