// GET /api/portal/konto/export – Datenexport (Art. 15/20 DSGVO) als JSON-Download, nur eigene Daten, protokolliert
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const GET = route({ limit: "export", ohne2fa: true }, async ({ nutzer }) => {
  const daten = await sicherheit().datenExport(nutzer);
  const tag = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(daten, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="oekoinvest-datenexport-${tag}.json"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
