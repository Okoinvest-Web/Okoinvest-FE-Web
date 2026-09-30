// GET /api/admin/register/auskuenfte?q= – gespeicherte Registerabrufe (Abrufdatum, Quelle, Zweck, KYC-Fall)
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await diensteBackend().registerAuskuenfte(nutzer, { q: suche.get("q") || "" })) }));
