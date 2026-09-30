// GET /api/admin/onboarding – Einarbeitungsstand aller Backoffice-Konten (Onboarding-Assistenten, Team B1).
// Nur Unterrolle „Leitung“ (403 sonst). Liefert je Konto: Unterrollen, Untertyp, erledigt/gesamt, offene Schritte.
import { route } from "@/lib/plattform/server/route";
import { onboardingBackend } from "@/lib/plattform/backend/onboarding";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, team: await onboardingBackend().onbTeam(nutzer) }));
