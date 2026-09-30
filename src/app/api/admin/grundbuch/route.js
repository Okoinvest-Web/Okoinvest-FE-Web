// GET  /api/admin/grundbuch[?status=offen|vorbereitung|…&land=DE|AT|CH&q=] – Akten, Kennzahlen, Bericht „offene Grundbuch-Eintragungen“
// POST /api/admin/grundbuch – Akte anlegen { bezugArt: flaeche|anlage|frei, bezugId?, land?, objektArt?, recht?, titel?, eigentuemerName?,
//      eigentuemerEmail?, grundstueck?, pfandglaeubiger?[], ohnePfandrecht?, entgeltJahr?, laufzeitJahre? } – Bereich „grundbuch“ schreiben (201)
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({
  ok: true,
  ...(await closingBackend().gbListe(nutzer, { status: String(suche.get("status") || "").slice(0, 20), land: String(suche.get("land") || "").slice(0, 2), q: String(suche.get("q") || "").slice(0, 80) })),
}));

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  const akte = await closingBackend().gbAnlegen(nutzer, body);
  return Response.json({ ok: true, akte }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
