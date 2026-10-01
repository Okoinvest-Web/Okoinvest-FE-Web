// GET /api/portal/eg – Energiegemeinschaften im Portal (WP6): eigene Mitgliedschaften, Teilnahmen mit Schritten,
// Aufgaben (Zustimmung beim Netzbetreiber), Mehrfachteilnahme, offene Gemeinschaften für den Beitritt. Nur eigene Daten.
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, ...(await egBackend().ptUebersicht(nutzer)) }));
