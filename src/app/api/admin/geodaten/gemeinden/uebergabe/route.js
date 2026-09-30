// POST   /api/admin/geodaten/gemeinden/uebergabe { schluessel, name, land, bundesland, terminAm?, notiz?, punkte? } – an die
//        Kommune-Ansprache übergeben: CRM-Organisation (falls neu), CRM-Aktivität (Termin/Notiz), Aufgabe. Zusätzlich „crm“ schreiben.
// DELETE /api/admin/geodaten/gemeinden/uebergabe { schluessel } – Übergabe zurücknehmen (nur Leitung)
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const POST = route({ admin: true, recht: [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }, { bereich: "crm", stufe: 2 }] }, async ({ nutzer, body }) => {
  const r = await akquise2Backend().gemeindeUebergeben(nutzer, body.schluessel, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
export const DELETE = route({ admin: true, recht: RECHT }, async ({ nutzer, body }) => akquise2Backend().uebergabeZuruecknehmen(nutzer, body?.schluessel));
