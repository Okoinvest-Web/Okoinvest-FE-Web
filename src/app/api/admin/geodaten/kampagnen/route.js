// GET  /api/admin/geodaten/kampagnen – Akquise-Kampagnen mit Kennzahlen (löst fällige Nachfassstufen aus)
// POST /api/admin/geodaten/kampagnen { name, beschreibung?, kandidatIds[] | filter{} | gemeinde+land, test? } → 201
//      Kandidaten werden serverseitig aus dem Geodaten-Adapter geladen. Rechte: „geodaten“ + „akquise“ schreiben.
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";
import { kampagneAnlegen } from "@/lib/plattform/geodaten/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await akquise2Backend().kampagnen(nutzer)) }));

export const POST = route({ admin: true, maxBytes: 64 * 1024, recht: RECHT }, async ({ nutzer, body }) => {
  const r = await kampagneAnlegen(nutzer, body);
  return Response.json({ ok: true, ...r }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
