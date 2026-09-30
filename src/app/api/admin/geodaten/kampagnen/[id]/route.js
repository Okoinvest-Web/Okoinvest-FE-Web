// GET    /api/admin/geodaten/kampagnen/[id] – Kampagne mit Zielen, Empfängern (Backoffice), Aufgaben, Kennzahlen
// PATCH  /api/admin/geodaten/kampagnen/[id] { name?, beschreibung?, nachfass?, kosten?, vorlageId?, status? }
// DELETE /api/admin/geodaten/kampagnen/[id] – nur Entwürfe ohne Versand bzw. Testkampagnen (Leitung)
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, ...(await akquise2Backend().kampagne(nutzer, params.id)) }));
export const PATCH = route({ admin: true, recht: RECHT }, async ({ nutzer, params, body }) => ({ ok: true, kampagne: await akquise2Backend().kampagneAendern(nutzer, params.id, body) }));
export const DELETE = route({ admin: true, recht: RECHT }, async ({ nutzer, params }) => akquise2Backend().kampagneLoeschen(nutzer, params.id));

