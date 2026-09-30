// GET  /api/portal/nachrichten              – Threads (je Vorgang/Fläche/Projekt/Interesse/Allgemein)
// GET  /api/portal/nachrichten?bezug=art:id – Nachrichten eines Threads (markiert als gelesen)
// POST /api/portal/nachrichten              – { bezugArt, bezugId, text }
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";

export const GET = route({}, async ({ backend, nutzer, suche }) => {
  const bezug = suche.get("bezug");
  if (bezug) {
    const [art, id] = bezug.split(":");
    return { ok: true, thread: await backend.nachrichten(nutzer, art, id) };
  }
  return { ok: true, threads: await backend.nachrichtenThreads(nutzer) };
});

export const POST = route({}, async ({ backend, nutzer, body }) => {
  rateLimit(`nachricht:${nutzer.id}`, ...grenze("nachricht"));
  const m = await backend.nachrichtSenden(nutzer, { bezugArt: String(body.bezugArt || ""), bezugId: String(body.bezugId || ""), text: body.text, anhaenge: Array.isArray(body.anhaenge) ? body.anhaenge.slice(0, 10).map(String) : [] }); // Querschnitt: Anhänge
  return { ok: true, nachricht: m };
});
