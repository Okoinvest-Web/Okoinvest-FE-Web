// DELETE /api/portal/sicherheit/geraete/[id] – Gerät vergessen (2FA wird dort wieder abgefragt)
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const DELETE = route({ json: false, ohne2fa: true }, async ({ nutzer, params }) => sicherheit().geraetVergessen(nutzer, params.id));
