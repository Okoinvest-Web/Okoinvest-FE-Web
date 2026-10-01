// POST /api/portal/eg/[id]/abrechnung/belege/[bid]/zahlung – Zahlung manuell erfassen { betrag, datum, geldkonto: 2800|2700, referenz }
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({}, async ({ nutzer, params, body }) => ({ ok: true, ...(await egBackend().abZahlungErfassen(nutzer, params.bid, body || {})) }));
