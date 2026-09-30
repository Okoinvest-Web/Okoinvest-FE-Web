// POST /api/admin/crm/aktivitaeten – { typ: anruf|termin|email|notiz, betreff, text?, am?, dauerMin?, ergebnis?, kontaktId?, organisationId?, bezugArt?, bezugId?, wiedervorlageAm?, zustaendigId? }
// Mit wiedervorlageAm entsteht zusätzlich eine Backoffice-Aufgabe (Glocke, „Meine Aufgaben“).
import { route } from "@/lib/plattform/server/route";

export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, aktivitaet: await backend.crmAktivitaetAnlegen(nutzer, body) }));
