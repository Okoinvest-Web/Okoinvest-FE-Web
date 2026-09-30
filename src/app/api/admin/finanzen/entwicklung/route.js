// GET  /api/admin/finanzen/entwicklung – Kostenträger/Entwicklungsprojekte mit Ist-Kosten, Budget-Vergleich, Kosten je MWp
//      (Rechte-Matrix: Bereich „entwicklung“ lesen; das Backend lässt zusätzlich „finanzen“ lesen zu)
// POST /api/admin/finanzen/entwicklung – Kosten buchen { projektId, kostenart, betrag, datum, beleg?, beschreibung? } (Bereich „finanzen“ schreiben)
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({ admin: true, recht: [{ bereich: "entwicklung", stufe: 1 }] }, async ({ nutzer }) => ({ ok: true, projekte: await finanzenBackend().entwicklungKosten(nutzer) }));

export const POST = route({ admin: true, recht: [{ bereich: "finanzen", stufe: 2 }] }, async ({ nutzer, body }) => ({ ok: true, kosten: await finanzenBackend().entwicklungKostenBuchen(nutzer, body) }));
