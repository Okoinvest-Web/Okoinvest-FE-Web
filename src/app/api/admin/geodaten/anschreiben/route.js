// GET /api/admin/geodaten/anschreiben?kandidat=<id> – Anschreiben-Vorlage (Serienbrief an Eigentümer) mit
//     Datenschutzinformation (Art. 14 DSGVO) und Hinweis zur Direktwerbung. Platzhalter «…» füllt der Serienbrief aus dem CRM.
import { route } from "@/lib/plattform/server/route";
import * as geo from "@/lib/plattform/geodaten";
import { anschreiben } from "@/lib/plattform/geodaten/anschreiben";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => {
  const k = await geo.kandidat(nutzer, String(suche.get("kandidat") || "").slice(0, 80));
  return { ok: true, vorlage: anschreiben(k) };
});
