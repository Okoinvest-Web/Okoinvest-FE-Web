// GET  /api/admin/finanzen/abrechnungen/[id] – Beleg mit internen Angaben (Pflichtangaben-Prüfung, Mahnhinweis, KYC)
// POST /api/admin/finanzen/abrechnungen/[id] – { aktion: bezahlt {datum?} | offen | mahnen | storno {grund} } (schreiben)
//      Pacht-Gutschrift „bezahlt“ nur mit verifiziertem KYC (sonst 409, code „kyc“).
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, abrechnung: await finanzenBackend().abrechnung(nutzer, params.id) }));

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, abrechnung: await finanzenBackend().abrechnungAktion(nutzer, params.id, body) }));
