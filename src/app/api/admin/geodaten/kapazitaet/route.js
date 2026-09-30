// POST /api/admin/geodaten/kapazitaet { knotenId, kapazitaet: frei|knapp|unbekannt, freiMw?, quelle, stand? }
//      Kapazitätsangabe eines Netzknotens pflegen (Veröffentlichung des Netzbetreibers bzw. Auskunft, immer mit Quelle).
import { route } from "@/lib/plattform/server/route";
import * as geo from "@/lib/plattform/geodaten";

export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, kapazitaet: await geo.kapazitaetSetzen(nutzer, String(body.knotenId || ""), body) }));
