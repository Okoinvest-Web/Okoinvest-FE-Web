// POST /api/portal/status – Statuswechsel durch den Eigentümer
// { art: vorgang|flaeche|projekt|interesse, id, nach, extra: { kommentar?, loi? } }
// Erlaubte Übergänge: src/lib/plattform/prozesse.js (wer: "eigentuemer"), serverseitig erzwungen.
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";

const ARTEN = ["vorgang", "flaeche", "projekt", "interesse"];

export const POST = route({}, async ({ backend, nutzer, body, ip }) => {
  if (!ARTEN.includes(body.art)) throw new PlattformFehler(422, "Unbekannte Objektart.");
  const objekt = await backend.statusWechsel(nutzer, {
    art: body.art,
    id: String(body.id || ""),
    nach: String(body.nach || ""),
    als: "eigentuemer",
    extra: body.extra && typeof body.extra === "object" ? body.extra : {},
    ip,
  });
  return { ok: true, objekt: { id: objekt.id, status: objekt.status } };
});
