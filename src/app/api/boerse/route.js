// GET /api/boerse?typ=&land=&phase=&mwpMin=&mwpMax= – öffentliche Projektliste (nur Teaser-Felder)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ auth: "optional" }, async ({ backend, nutzer, suche }) => {
  const filter = Object.fromEntries(["typ", "land", "phase", "mwpMin", "mwpMax"].map((k) => [k, suche.get(k) || undefined]));
  const daten = await backend.boerse(nutzer, filter);
  return { ok: true, ...daten };
});
