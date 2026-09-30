// PATCH  /api/portal/organisation/[id]/mitglieder/[mid] – { rolle } Teamrolle ändern (ab Admin; „inhaber“ = Übertragung durch den Inhaber)
// DELETE /api/portal/organisation/[id]/mitglieder/[mid] – Mitglied entfernen (ab Admin) bzw. selbst austreten
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const PATCH = route({}, async ({ nutzer, params, body }) => ({
  ok: true,
  organisation: await sicherheit().mitgliedAendern(nutzer, params.id, params.mid, { rolle: body.rolle }),
}));

export const DELETE = route({ json: false }, async ({ nutzer, params }) => {
  const r = await sicherheit().mitgliedEntfernen(nutzer, params.id, params.mid);
  return r?.id ? { ok: true, organisation: r } : { ok: true, verlassen: !!r?.verlassen };
});
