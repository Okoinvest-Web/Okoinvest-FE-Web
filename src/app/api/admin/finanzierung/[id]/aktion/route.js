// POST /api/admin/finanzierung/[id]/aktion – { aktion, … }:
//   anfragen { bankIds[], frist, nachricht } (E-Mail mit Einladungslink je Bank) · einladung_neu { anfrageId } · anfrage_zurueck { anfrageId }
//   paket { freigabe[] } · termsheet { anfrageId, termsheet } · entscheidung { anfrageId, begruendung } (nur Unterrolle Leitung)
//   kreditvertrag { kreditvertrag } · cp { cpId, erledigt, nachweis } · covenant · geschaeftsmodell { gewaehlt, annahmen, begruendung } (Leitung)
import { route, basisUrl } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const POST = route({ admin: true }, async ({ nutzer, params, body, request }) => finanzierungBackend().fzAktion(nutzer, params.id, { ...body, basisUrl: basisUrl(request) }));
