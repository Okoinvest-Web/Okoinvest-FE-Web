// /portal/admin/eg/[id]/abrechnung – Backoffice (Organisator): Abrechnung der Gemeinschaft.
// Perioden (Monat/Quartal/Jahr/Schluss, Probe-Abrechnung für Wechsler), Vorschau mit Prüfungen und Prüfpfad je Belegzeile,
// Vier-Augen-Freigabe (Kassier + Obmann/Vorstand), Versand, Storno/Korrektur. Rechte je Gemeinschaft prüft das Backend (WP4).

import { SeitenKopf } from "@/components/Portal/ui";
import EgReiter from "@/components/Portal/EG/Stamm/EgReiter";
import { AbrechnungAnsicht } from "@/components/Portal/EG/Abrechnung/Ansichten";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "Abrechnung Energiegemeinschaft" };

export default async function Seite({ params, searchParams }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const sp = (await searchParams) || {};
  const b = egBackend();
  const d = await laden(() => b.abPerioden(n, id));
  const wahl = d.perioden.find((p) => p.id === sp.periode) || d.perioden.find((p) => !["abgeschlossen", "storniert"].includes(p.status)) || d.perioden[0] || null;
  const pd = wahl ? await laden(() => b.abPeriodeAktion(n, wahl.id, { aktion: "lesen" })) : null;
  // Vorzeitraum gleicher Art für den Vorschau-Diff (nur lesen; fehlt er oder schlägt das Lesen fehl, entfällt der Vergleich)
  const vorWahl = wahl && wahl.status !== "probe" && !wahl.probe ? d.perioden.filter((p) => p.id !== wahl.id && p.art === wahl.art && !p.probe && !["probe", "storniert", "offen"].includes(p.status) && String(p.bis) < String(wahl.von)).sort((x, y) => String(y.bis).localeCompare(String(x.bis)))[0] : null;
  let vorher = null;
  if (vorWahl) {
    try {
      vorher = await b.abPeriodeAktion(n, vorWahl.id, { aktion: "lesen" });
    } catch {
      vorher = null;
    }
  }
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice · Energiegemeinschaften" titel={`Abrechnung · ${d.gemeinschaft.name}`} text="Abgerechnet werden die Viertelstundenwerte des Netzbetreibers (Eigendeckung, eingebrachte Erzeugung). Jede Zahl ist bis zur Quelle nachvollziehbar; freigegeben wird nach dem Vier-Augen-Prinzip." />
      <EgReiter gemeinschaftId={id} aktiv="abrechnung" art="admin" />
      <AbrechnungAnsicht d={d} pd={pd} basis={`/portal/admin/eg/${id}/abrechnung`} kontoId={n.id} vorher={vorher} />
    </div>
  );
}
