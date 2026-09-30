// GET /api/portal/finanzierung/projekt/[id] – Vorbelegung des Cockpits aus Börse/Datenraum (nur Investor mit freigegebenem
//     Datenraum, Anbieter des Projekts, Backoffice; sonst 403) + eigene Szenarien zu diesem Projekt
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, ...(await finanzierungBackend().fzCockpitProjekt(nutzer, params.id)) }));
