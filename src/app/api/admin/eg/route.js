// GET  /api/admin/eg?status=&modell=&q= – Backoffice: alle Energiegemeinschaften mit Kennzahlen und Hinweisen (Bereich „eg“ lesen)
// POST /api/admin/eg – { aktion: "anlegen", daten } | { aktion: "migration_vorschau" } | { aktion: "migration" } (Bereich „eg“ schreiben)
// Vertrag: docs/EG-SCHNITTSTELLEN.md (WP1). Rechte prüft zusätzlich das Backend (Kontext-Rollen je Gemeinschaft).
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await egBackend().egGemeinschaften(nutzer, { status: suche.get("status") || "", modell: suche.get("modell") || "", q: suche.get("q") || "" })) }));

export const POST = route({ admin: true, maxBytes: 64 * 1024 }, async ({ nutzer, body }) => {
  const b = egBackend();
  if (body.aktion === "anlegen") return { ok: true, gemeinschaft: await b.egGemeinschaftSpeichern(nutzer, { daten: body.daten || {} }) };
  if (body.aktion === "migration_vorschau") return { ok: true, ...(await b.egMigrationVorschau(nutzer)) };
  if (body.aktion === "migration") return { ok: true, ...(await b.egMigrationAusfuehren(nutzer)) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
