// POST /api/admin/status – Statuswechsel durch das Backoffice
// { art: vorgang|flaeche|projekt|interesse|provision, id, nach, extra: { kommentar?, grund?, pachtangebot?, provisionSatz?, interesseId?, kaufpreis? } }
// Der Nutzer erhält automatisch eine Nachricht im Portal (Thread des Objekts).
import { route } from "@/lib/plattform/server/route";
import { PROZESS_ARTEN } from "@/lib/plattform/prozesse";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const POST = route({ admin: true }, async ({ backend, nutzer, body, ip }) => {
  if (!PROZESS_ARTEN.includes(body.art)) throw new PlattformFehler(422, "Unbekannte Objektart.");
  const objekt = await backend.statusWechsel(nutzer, {
    art: body.art,
    id: String(body.id || ""),
    nach: String(body.nach || ""),
    als: "admin",
    extra: body.extra && typeof body.extra === "object" ? body.extra : {},
    ip,
  });
  return { ok: true, objekt: { id: objekt.id, status: objekt.status } };
});
