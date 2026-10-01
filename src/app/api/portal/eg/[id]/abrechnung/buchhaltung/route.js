// GET  /api/portal/eg/[id]/abrechnung/buchhaltung?jahr= – E/A-Rechnung, Kassabuch, UVA, Kleinunternehmer, Prüfvermerke
// POST … – { aktion: "buchung", daten } (Kassa/Bank) | { aktion: "pruefvermerk", daten } (Rechnungsprüfung)
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({}, async ({ nutzer, params, suche }) => ({ ok: true, ...(await egBackend().abBuchungen(nutzer, params.id, { jahr: suche.get("jahr") || "" })) }));

export const POST = route({}, async ({ nutzer, params, body }) => {
  const b = egBackend();
  if (body?.aktion === "buchung") return { ok: true, ...(await b.abBuchungSpeichern(nutzer, params.id, { daten: body.daten || {} })) };
  if (body?.aktion === "pruefvermerk") return { ok: true, ...(await b.abPruefvermerk(nutzer, params.id, { daten: body.daten || {} })) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
