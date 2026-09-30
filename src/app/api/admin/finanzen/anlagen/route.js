// GET /api/admin/finanzen/anlagen – Anlagenbuchhaltung: Contracting-Anlagen mit Aktivierung und AfA-Plan (ERPNext Asset)
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, anlagen: await finanzenBackend().finanzAnlagen(nutzer) }));
