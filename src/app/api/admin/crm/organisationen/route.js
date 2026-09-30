// GET  /api/admin/crm/organisationen?q=&art= – Organisationen (Gemeinde, Netzbetreiber, Gutachter, Bank …)
// POST /api/admin/crm/organisationen – anlegen { name, art, plz, ort, land, bundesland, website, telefon, email, tags[], notiz }
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({ ok: true, organisationen: await backend.crmOrganisationen(nutzer, { q: suche.get("q")?.slice(0, 80) || undefined, art: suche.get("art") || undefined }) }));
export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, organisation: await backend.crmOrganisationSpeichern(nutzer, null, body) }));
