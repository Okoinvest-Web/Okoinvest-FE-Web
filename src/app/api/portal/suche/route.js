// GET /api/portal/suche?q=&limit= – globale Suche der Befehlspalette (Strg/⌘+K)
// Liefert nur Objekte, die der angemeldete Nutzer sehen darf (Rolle UND Eigentum im Backend):
// eigene Flächen/Projekte/Vorgänge/Nachrichten, Börse nur für Investoren, alles + Nutzer nur für das Backoffice.
// Antwort: { ok, q, treffer: [{ art, id, titel, untertitel, href }] } – href immer ein interner Portal-Pfad.
import { route } from "@/lib/plattform/server/route";
import { rateLimit } from "@/lib/plattform/server/rateLimit";
import { bedienung } from "@/lib/plattform/backend/bedienung";
import { erweiterteTreffer } from "@/lib/plattform/server/sucheErweitert"; // Querschnitt: Dokumente, Aufgaben, Anlagen, Entwicklung, CRM, Termine, Tickets

export const GET = route({}, async ({ nutzer, suche }) => {
  // großzügig (Tippen löst mehrere Anfragen aus), aber gegen Abgreifen begrenzt
  rateLimit(`suche:${nutzer.id}`, process.env.NODE_ENV === "production" ? 120 : 1200, 60e3);
  const limit = Number(suche.get("limit")) || 6;
  const r = await bedienung().suchen(nutzer, { q: suche.get("q") || "", limit });
  const mehr = r.q && r.q.length >= 2 ? await erweiterteTreffer(nutzer, r.q, { limit: Math.min(10, limit) }).catch(() => []) : [];
  return { ok: true, ...r, treffer: [...(r.treffer || []), ...mehr] };
});
