// POST /api/portal/eg/[id]/abrechnung/camt – Kontoauszug camt.053/054 { xml, ausfuehren?, zuordnungen? {index: belegId} }
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({ maxBytes: 6 * 1024 * 1024 }, async ({ nutzer, params, body }) => ({ ok: true, ...(await egBackend().abCamtImport(nutzer, params.id, { xml: String(body?.xml || ""), ausfuehren: !!body?.ausfuehren, zuordnungen: body?.zuordnungen || {} })) }));
