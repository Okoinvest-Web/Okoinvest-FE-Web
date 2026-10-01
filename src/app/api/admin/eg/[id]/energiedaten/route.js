// GET  /api/admin/eg/[id]/energiedaten?ansicht=… – Energiedaten einer Gemeinschaft (WP3, Bereich „eg“; Kontext-Rechte prüft das Backend):
//   dashboard (Standard) · qualitaet&monat= · abweichung&monat=&toleranzPct=&toleranzKwh= · prognose
//   messreihen&von=&bis=[&zaehlpunktId=] (Einzelwerte nur mit qh_einzeln, protokolliert) · optimierung&zaehlpunktId=
//   perioden&von=&bis= (Periodenwerte, Eingang der Abrechnung)
// POST /api/admin/eg/[id]/energiedaten – { aktion, … }:
//   csv {csv, zaehlpunktId?, datei?, ausfuehren} (Import aus dem Netzbetreiber-Portal, ausführen nur mit stammdaten 2)
//   reklamieren {zaehlpunktId, von, bis, gruende[]} (Nachforderung CR_REQ_PT über WP2, eda_ausloesen 2)
//   empfangen {payload} (EDA-Eingang von Hand, nur Betriebsführung mit Schreibrecht „eg“)
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer, params, suche }) => {
  const b = egBackend();
  const id = params.id;
  const ansicht = suche.get("ansicht") || "dashboard";
  const monat = suche.get("monat") || "";
  if (ansicht === "dashboard") return { ok: true, ...(await b.enDashboard(nutzer, id)) };
  if (ansicht === "qualitaet") return { ok: true, ...(await b.enQualitaet(nutzer, id, { monat })) };
  if (ansicht === "abweichung") return { ok: true, ...(await b.enAbweichungsbericht(nutzer, id, { monat, toleranzPct: Number(suche.get("toleranzPct")) || 0.5, toleranzKwh: Number(suche.get("toleranzKwh")) || 0.1 })) };
  if (ansicht === "prognose") return { ok: true, ...(await b.enPrognose(nutzer, id)) };
  if (ansicht === "messreihen") return { ok: true, ...(await b.enMessreihen(nutzer, { gemeinschaftId: id, zaehlpunktId: suche.get("zaehlpunktId") || "", von: suche.get("von") || "", bis: suche.get("bis") || "", aufloesung: suche.get("aufloesung") || "viertelstunde" })) };
  if (ansicht === "optimierung") return { ok: true, ...(await b.enOptimierung(nutzer, { zaehlpunktId: suche.get("zaehlpunktId") || "" })) };
  if (ansicht === "perioden") return { ok: true, ...(await b.enPeriodenwerte(nutzer, id, suche.get("von") || "", suche.get("bis") || "")) };
  throw new PlattformFehler(422, "Unbekannte Ansicht.");
});

export const POST = route({ admin: true, maxBytes: 6_500_000 }, async ({ nutzer, params, body }) => {
  const b = egBackend();
  const { aktion } = body;
  if (aktion === "csv") return { ok: true, ...(await b.enCsvImport(nutzer, params.id, { csv: String(body.csv || ""), zaehlpunktId: body.zaehlpunktId || "", datei: body.datei || "", ausfuehren: body.ausfuehren === true })) };
  if (aktion === "reklamieren") return { ok: true, ...(await b.enQualitaet(nutzer, params.id, { reklamation: { zaehlpunktId: body.zaehlpunktId, von: body.von, bis: body.bis, gruende: Array.isArray(body.gruende) ? body.gruende : [] } })) };
  if (aktion === "empfangen") return { ok: true, ergebnis: await b.enEnergiedatenEmpfangen(nutzer, { ...(body.payload || {}), gemeinschaftId: params.id }) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
