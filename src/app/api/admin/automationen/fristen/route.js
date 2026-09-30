// POST /api/admin/automationen/fristen – Fristen jetzt prüfen (Regeln „Frist überschritten“)
import { route } from "@/lib/plattform/server/route";

export const POST = route({ admin: true }, async ({ backend, nutzer }) => backend.fristenPruefen(nutzer));
