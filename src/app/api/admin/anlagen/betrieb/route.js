// GET  /api/admin/anlagen/betrieb – Übersicht der Betriebsführung (Fristen, SLA, Aufträge, Versicherungen, Lager)
// POST /api/admin/anlagen/betrieb – { aktion: "lauf" } Fristen-/SLA-/Lager-Lauf auslösen (Aufgaben + Benachrichtigungen)
// Rechte: Backoffice mit Bereich „anlagen“ (lesen bzw. schreiben) – prüfen route() und das Backend.
import { route } from "@/lib/plattform/server/route";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await betriebBackend().betriebUebersicht(nutzer)) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  if (body.aktion !== "lauf") throw new PlattformFehler(422, "Unbekannte Aktion.");
  return { ok: true, ergebnis: await betriebBackend().betriebLauf(nutzer) };
});
