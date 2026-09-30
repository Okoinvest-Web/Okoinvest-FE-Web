// GET /api/admin/finanzen/pachtvertraege/auswahl – Eigentümer-Konten, Flächen, Anlagen und Steuervorlagen für das Formular
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await finanzenBackend().pachtAuswahl(nutzer)) }));
