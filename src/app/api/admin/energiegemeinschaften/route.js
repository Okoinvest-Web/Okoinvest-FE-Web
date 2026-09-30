// GET  /api/admin/energiegemeinschaften – Backoffice: Gemeinschaften mit Teilnehmern und Monatsläufen
// POST /api/admin/energiegemeinschaften – { aktion, … } (Bereich „genossenschaft“ schreiben):
//   speichern {id?, daten} · teilnahme {id, teilnahmeAktion: anmelden|aktivieren|ablehnen|beenden, ab?, bis?, grund?}
//   abrechnen {id, monat, messwerte?}
import { route } from "@/lib/plattform/server/route";
import { mitgliedBackend } from "@/lib/plattform/backend/mitglied";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await mitgliedBackend().boEg(nutzer)) }));

export const POST = route({ admin: true, maxBytes: 96 * 1024 }, async ({ nutzer, body, ip }) => {
  const b = mitgliedBackend();
  const { aktion, id, ...rest } = body;
  if (aktion === "speichern") return { ok: true, gemeinschaft: await b.boEgSpeichern(nutzer, { id: id || null, daten: body.daten || {} }) };
  if (aktion === "teilnahme") return { ok: true, teilnahme: await b.boTeilnahmeAktion(nutzer, id, { ...rest, aktion: body.teilnahmeAktion }, { ip }) };
  if (aktion === "abrechnen") return { ok: true, lauf: await b.boEgAbrechnen(nutzer, id, { monat: body.monat, messwerte: body.messwerte || {} }) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
