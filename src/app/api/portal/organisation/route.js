// GET  /api/portal/organisation – eigene Organisationen { ok, organisationen [{id,name,art,rolle,mitglieder}], aktiv }
// POST /api/portal/organisation – { name, art } anlegen (Inhaber = Sie) und direkt in die Organisation wechseln
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, ...(await sicherheit().organisationen(nutzer)) }));

export const POST = route({}, async ({ nutzer, body }) => {
  const s = sicherheit();
  const organisation = await s.organisationAnlegen(nutzer, { name: body.name, art: body.art });
  const wechsel = nutzer.sitzung?.id ? await s.organisationWechseln(nutzer, organisation.id).catch(() => null) : null;
  return { ok: true, organisation, aktiv: wechsel?.aktiv || null };
});
