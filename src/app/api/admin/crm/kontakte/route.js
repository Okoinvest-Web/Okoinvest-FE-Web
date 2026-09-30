// GET  /api/admin/crm/kontakte?q=&rolle=&tag=&organisation=&zustaendig=&quelle=&dubletten=1 – Kontakte (CRM, lesen)
// POST /api/admin/crm/kontakte – Kontakt anlegen { vorname, nachname, firma, email, telefon, plz, ort, land, organisationId, rollen[], tags[], notiz, zustaendigId, trotzdem? }
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({
  ok: true,
  ...(await backend.crmKontakte(nutzer, {
    q: suche.get("q")?.slice(0, 80) || undefined,
    rolle: suche.get("rolle") || undefined,
    tag: suche.get("tag") || undefined,
    organisationId: suche.get("organisation") || undefined,
    zustaendigId: suche.get("zustaendig") || undefined,
    quelle: suche.get("quelle") || undefined,
    nurDubletten: suche.get("dubletten") === "1",
    limit: Number(suche.get("limit")) || 500,
  })),
}));

export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, kontakt: await backend.crmKontaktSpeichern(nutzer, null, body) }));
