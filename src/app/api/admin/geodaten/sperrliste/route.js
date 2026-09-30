// GET  /api/admin/geodaten/sperrliste – Sperrvermerke (maskiert, ohne Klartext-Namen)
// POST /api/admin/geodaten/sperrliste { person: { vorname, nachname | firma, plz }, land?, grund, quelle, notiz? } – manueller Widerspruch
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await akquise2Backend().sperrliste(nutzer)) }));
export const POST = route({ admin: true, recht: RECHT }, async ({ nutzer, body }) => {
  const r = await akquise2Backend().sperreAnlegen(nutzer, body);
  return Response.json({ ok: true, ...r }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
