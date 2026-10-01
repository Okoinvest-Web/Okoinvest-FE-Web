// /api/portal/eg/[id]/verein – Vereinsorganisation (WP5): Organe, Mitglieder-/Generalversammlungen (Versammlungsmodul), Beschlüsse, Beiträge
//   GET   Übersicht je Kontext-Rolle (Mitglieder: Versammlungen und GV-Beschlüsse; Organe/Backoffice: alles)
//   POST  { aktion: gv_speichern | gv_einladen | gv_oeffnen | gv_abstimmen | gv_abschliessen | gv_absagen | beschluss_speichern |
//           organ_speichern | organ_beenden | beitraege_vorschreiben | beitrag_status | statuten_speichern, id?, daten? }
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, verein: await egBackend().grVersammlungen(nutzer, params.id) }));

export const POST = route({}, async ({ nutzer, params, body }) => ({ ok: true, verein: await egBackend().grVersammlungen(nutzer, params.id, { aktion: String(body?.aktion || ""), id: String(body?.id || ""), daten: body?.daten || {} }) }));
