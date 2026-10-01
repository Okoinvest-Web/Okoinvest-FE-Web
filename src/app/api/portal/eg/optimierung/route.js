// GET /api/portal/eg/optimierung?zaehlpunkt=… – Vorschlag des Mehrfachteilnahme-Optimierers (WP3 enOptimierung, prüft selbst,
// dass der Zählpunkt dem Konto gehört) für die Anzeige im Mitgliederportal vereinheitlicht (eg/empfehlung.js tfEmpfehlung).
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { tfEmpfehlung } from "@/lib/plattform/eg/empfehlung";

export const GET = route({}, async ({ nutzer, suche }) => {
  const r = await egBackend().enOptimierung(nutzer, { zaehlpunktId: suche.get("zaehlpunkt") || "" });
  return { ok: true, vorschlag: tfEmpfehlung(r), hinweise: Array.isArray(r?.hinweise) ? r.hinweise.slice(0, 4) : [], datenbasis: r?.datenbasis || "" };
});
