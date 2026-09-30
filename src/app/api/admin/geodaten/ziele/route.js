// GET  /api/admin/geodaten/ziele – übernommene Akquise-Ziele
// POST /api/admin/geodaten/ziele { kandidatId, notiz? } – Kandidatenfläche als Akquise-Ziel übernehmen: Fläche in der
//      Akquise-Pipeline + Aufgabe „Eigentümer ermitteln (Grundbuchabfrage)“. Der Kandidat wird serverseitig geladen.
//      Rechte: „geodaten“ und „akquise“ schreiben (Leitung, Akquise). Doppelte Übernahme → 409.
import { route } from "@/lib/plattform/server/route";
import * as geo from "@/lib/plattform/geodaten";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await geo.ziele(nutzer)) }));

export const POST = route({ admin: true, recht: [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }] }, async ({ nutzer, body }) => {
  const r = await geo.uebernehmen(nutzer, body.kandidatId, { notiz: typeof body.notiz === "string" ? body.notiz : "" });
  return Response.json({ ok: true, ...r }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
