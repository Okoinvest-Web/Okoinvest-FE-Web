// POST /api/admin/onboarding/lauf – Erinnerungslauf „offene Einstiegsschritte“ (3/7 Tage) jetzt ausführen.
// Nur Leitung. Im Betrieb erledigt das der Frappe-Scheduler täglich (oekoinvest_app.plattform.api.onboarding.mail_lauf_taeglich).
import { route } from "@/lib/plattform/server/route";
import { onboardingBackend } from "@/lib/plattform/backend/onboarding";

export const POST = route({ admin: true, maxBytes: 1024 }, async ({ nutzer }) => ({ ok: true, ...(await onboardingBackend().onbMailLauf(nutzer)) }));
