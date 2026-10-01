// GET /api/portal/eg/[id]/energie?ansicht=… – Organe-Sicht der Energiedaten (WP3): dashboard · qualitaet&monat= ·
//     abweichung&monat= · prognose · messreihen&zaehlpunktId=&von=&bis= (nur mit qh_einzeln bzw. eigener Zählpunkt, protokolliert)
// Rechte je Kontext-Rolle (qh_aggregiert für Summen) prüft das Backend; ohne Rolle 404.
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({}, async ({ nutzer, params, suche }) => {
  const b = egBackend();
  const id = params.id;
  const ansicht = suche.get("ansicht") || "dashboard";
  const monat = suche.get("monat") || "";
  if (ansicht === "dashboard") return { ok: true, ...(await b.enDashboard(nutzer, id)) };
  if (ansicht === "qualitaet") return { ok: true, ...(await b.enQualitaet(nutzer, id, { monat })) };
  if (ansicht === "abweichung") return { ok: true, ...(await b.enAbweichungsbericht(nutzer, id, { monat })) };
  if (ansicht === "prognose") return { ok: true, ...(await b.enPrognose(nutzer, id)) };
  if (ansicht === "messreihen") return { ok: true, ...(await b.enMessreihen(nutzer, { gemeinschaftId: id, zaehlpunktId: suche.get("zaehlpunktId") || "", von: suche.get("von") || "", bis: suche.get("bis") || "" })) };
  throw new PlattformFehler(422, "Unbekannte Ansicht.");
});
