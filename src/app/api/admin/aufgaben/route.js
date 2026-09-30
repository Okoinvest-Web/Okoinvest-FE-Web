// GET  /api/admin/aufgaben?ansicht=meine|offen|alle|ueberfaellig|erledigt&bezug=art:id – Aufgaben & Wiedervorlagen (nur admin)
// POST /api/admin/aufgaben – { titel, beschreibung?, faelligAm: "JJJJ-MM-TT", zustaendigId?, bezugArt?, bezugId? }
import { route } from "@/lib/plattform/server/route";

function aufgabenFilter(ansicht, nutzer, bezug = "") {
  const [bezugArt, bezugId] = String(bezug || "").split(":");
  return {
    ...(ansicht === "meine" ? { zustaendigId: nutzer.id, status: "offen" } : {}),
    ...(ansicht === "offen" ? { status: "offen" } : {}),
    ...(ansicht === "ueberfaellig" ? { nurUeberfaellig: true } : {}),
    ...(ansicht === "erledigt" ? { status: "erledigt" } : {}),
    ...(bezugArt && bezugId ? { bezugArt, bezugId } : {}),
  };
}

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({
  ok: true,
  aufgaben: await backend.aufgaben(nutzer, aufgabenFilter(suche.get("ansicht") || "alle", nutzer, suche.get("bezug"))),
}));

export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, aufgabe: await backend.aufgabeAnlegen(nutzer, body) }));
