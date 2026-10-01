// /api/portal/eg/gruendung/[id] – Gründungsauftrag (WP5)
//   GET   Detail mit Schritten, Fristen, Formularhilfen, Dokumenten, Importen, Förder-Checks
//   POST  { aktion: angebot | signatur | annehmen | ablehnen | beauftragt_manuell | gemeinschaft_anlegen | gemeinschaft_verknuepfen | daten |
//           schritte_aktualisieren | stichtag | statuten | notiz | abbrechen | uebergeben | probeabrechnung | mitglieder_informieren, … }
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, auftrag: await egBackend().grAuftrag(nutzer, params.id) }));

export const POST = route({ maxBytes: 1024 * 1024 }, async ({ nutzer, params, body }) => ({ ok: true, auftrag: await egBackend().grAuftragAktion(nutzer, params.id, body || {}) }));
