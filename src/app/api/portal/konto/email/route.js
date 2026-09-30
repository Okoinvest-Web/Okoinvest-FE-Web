// POST /api/portal/konto/email – { neu, passwort } → Bestätigungslink an die neue Adresse (24 h), Hinweis an die alte.
// Wirksam erst nach Klick auf den Link (GET /api/auth/email-aendern?token=…).
import { route, basisUrl } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const POST = route({ limit: "passwort" }, async ({ nutzer, body, request }) =>
  sicherheit().emailAendernAnfordern(nutzer, { neu: body.neu, passwort: typeof body.passwort === "string" ? body.passwort : "", basisUrl: basisUrl(request) })
);
