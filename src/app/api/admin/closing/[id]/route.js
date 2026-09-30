// GET   /api/admin/closing/[id] – Closing-Raum (Backoffice-Sicht inkl. Prüfungen „Signing/Closing möglich?“)
// PATCH /api/admin/closing/[id] – { struktur?, kaufpreis?, spvName?, spvGesellschaftId?, anteilProzent?, meilensteine?[], earnOut?,
//       notar?: { name, kanzlei, email, telefon, ort, termin, notiz }, zahlung?: { treuhand, kontoHinweis, faelligAm }, notizIntern? }
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, closing: await closingBackend().clAkte(nutzer, params.id) }));
export const PATCH = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, closing: await closingBackend().clAendern(nutzer, params.id, body) }));
