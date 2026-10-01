// GET /api/portal/eg/datenauskunft[?download=1] – Auskunft nach Art. 15 DSGVO über alle Energiegemeinschafts-Daten des
// Kontos (WP6), auf Wunsch als JSON-Datei. Jeder Abruf wird protokolliert.
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({ limit: "export" }, async ({ nutzer, suche }) => {
  const auskunft = await egBackend().ptDatenauskunft(nutzer);
  if (suche.get("download") !== "1") return { ok: true, auskunft };
  return new Response(JSON.stringify(auskunft, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="datenauskunft-energiegemeinschaft-${auskunft.erstelltAm.slice(0, 10)}.json"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
