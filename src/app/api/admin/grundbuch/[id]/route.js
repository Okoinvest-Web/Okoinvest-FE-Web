// GET   /api/admin/grundbuch/[id] – Akte (Backoffice-Sicht)
// PATCH /api/admin/grundbuch/[id] – Stammdaten { titel?, recht?, berechtigter?, eigentuemerName?, eigentuemerAnschrift?, eigentuemerAnzahl?,
//       grundstueck?, pfandglaeubiger?[], entgeltJahr?, laufzeitJahre?, laufzeitBeginn?, vertragBezug?, notiz?, abgebrochen?, grund? }
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, akte: await closingBackend().gbAkte(nutzer, params.id) }));
export const PATCH = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, akte: await closingBackend().gbAendern(nutzer, params.id, body) }));
