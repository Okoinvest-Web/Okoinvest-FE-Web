// GET /api/admin/eg/netzbetreiber?stichtag=JJJJ-MM-TT – Netzbetreiber-Stammdaten und Netzentgelt-Regeln (Bereich „eg“ lesen)
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => {
  const b = egBackend();
  const [nb, r] = await Promise.all([b.egNetzbetreiber(nutzer), b.egNetzentgeltRegeln(nutzer, { stichtag: suche.get("stichtag") || "" })]);
  return { ok: true, ...nb, ...r };
});
