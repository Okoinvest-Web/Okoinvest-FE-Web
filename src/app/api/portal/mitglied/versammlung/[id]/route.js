// GET /api/portal/mitglied/versammlung/[id] – Generalversammlung mit Tagesordnung, Unterlagen, eigener Stimme bzw. Ergebnis
//     (Mitglieder der Genossenschaft; Backoffice mit Zwischenstand und Teilnahme ohne Einzelstimmen)
import { route } from "@/lib/plattform/server/route";
import { mitgliedBackend } from "@/lib/plattform/backend/mitglied";

export const GET = route({ rollen: ["mitglied"] }, async ({ nutzer, params }) => ({ ok: true, versammlung: await mitgliedBackend().gvDetail(nutzer, params.id) }));
