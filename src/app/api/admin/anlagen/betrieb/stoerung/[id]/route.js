// GET  /api/admin/anlagen/betrieb/stoerung/[id] – Störung als Ticket (SLA, Ursache, Ertragsausfall, Aufträge, Versicherung)
// POST /api/admin/anlagen/betrieb/stoerung/[id] – { aktion: speichern, daten } (Ertragsausfall rechnet der Server aus
//      Prognose, Vertrag und Monitoring) · { aktion: beheben, text } (Pflicht: Ursache + Maßnahme, keine offenen Aufträge)
import { route } from "@/lib/plattform/server/route";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";
import { stoerungKontext } from "@/lib/plattform/betrieb/auswertung";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, ticket: await betriebBackend().betriebStoerung(nutzer, params.id) }));

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => {
  const b = betriebBackend();
  if (body.aktion === "speichern") {
    const t = await b.betriebStoerung(nutzer, params.id);
    const kontext = await stoerungKontext(nutzer, t.anlageId);
    return { ok: true, ticket: await b.betriebStoerungSpeichern(nutzer, params.id, body.daten || {}, kontext) };
  }
  if (body.aktion === "beheben") return { ok: true, ticket: await b.betriebStoerungBeheben(nutzer, params.id, { text: body.text || "" }) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
