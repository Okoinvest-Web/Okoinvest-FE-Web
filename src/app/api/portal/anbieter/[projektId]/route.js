// GET  /api/portal/anbieter/[projektId] – Anbieter-Akte (Anbieter/Team, Backoffice; Investor mit Datenraum: nur Bestandsdaten)
// POST /api/portal/anbieter/[projektId] – { aktion, … } Anbieter: mandat_erteilen · mandat_kuendigen · exklusivitaet_beenden ·
//      pruefpunkt_antworten · votum · vorkenntnis_melden · bestand_speichern · ertrag_import (Vertrag: docs/API.md „Anbieter / Verkäufer“)
//      Rolle investor zugelassen, weil Wiederverkäufer aus dem Portfolio Anbieter ihres Projekts sind – das Backend prüft das Eigentum.
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { anbieterBackend } from "@/lib/plattform/backend/anbieter";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, akte: await anbieterBackend().anbieterAkte(nutzer, params.projektId) }));

export const POST = route({ rollen: ["anbieter", "investor"], maxBytes: 256 * 1024 }, async ({ nutzer, params, body, ip }) => {
  rateLimit(`anbieter:${nutzer.id}`, ...grenze("nachricht"));
  return { ok: true, akte: await anbieterBackend().anbieterAktion(nutzer, params.projektId, body, { ip }) };
});
