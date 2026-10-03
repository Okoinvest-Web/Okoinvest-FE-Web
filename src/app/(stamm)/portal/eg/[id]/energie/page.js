// /portal/eg/[id]/energie – Organe-Sicht der Energiedaten (WP3): Vorstand, Kassier und Rechnungsprüfung sehen Summen der
// Gemeinschaft (qh_aggregiert), Prognose, Datenqualität und Abweichungsbericht; Einzelwerte nur der Vorstand mit
// Zweckbindung (qh_einzeln, protokolliert). Ohne Rolle 404, ohne Recht 404 (keine Existenz verraten).

import { notFound } from "next/navigation";
import { Badge, Karte, SeitenKopf } from "@/components/Portal/ui";
import { Klappe } from "@/components/Portal/Mitglied/teile";
import EgReiter from "@/components/Portal/EG/Stamm/EgReiter";
import { AbweichungKarte, EnergieUebersicht, PrognoseKarte, QualitaetLeitstand } from "@/components/Portal/EG/Energie/EnergieDashboard";
import { ZpEinzelwerte } from "@/components/Portal/EG/Energie/Werkzeuge";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "Energiedaten der Gemeinschaft" };

export default async function Energie({ params, searchParams }) {
  const n = await portalNutzer();
  const { id } = await params;
  const sp = (await searchParams) || {};
  const monat = /^\d{4}-\d{2}$/.test(sp.monat || "") ? sp.monat : "";
  const b = egBackend();
  const k = (await laden(() => b.egKontext(n, { gemeinschaftId: id }))).gemeinschaften[0];
  if (!k || (k.rechte?.qh_aggregiert || 0) < 1) notFound();
  const [dashboard, qualitaet, abweichung, prognose] = await Promise.all([
    laden(() => b.enDashboard(n, id)),
    laden(() => b.enQualitaet(n, id, { monat })),
    laden(() => b.enAbweichungsbericht(n, id, { monat })),
    laden(() => b.enPrognose(n, id)),
  ]);
  const zpListe = (qualitaet.zeilen || []).map((z) => ({ id: z.zaehlpunktId, label: `${z.name || "Zählpunkt"} · ${z.richtung} · …${z.zaehlpunktnummer.slice(-10)}` }));
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`Energiedaten · ${(k.rollenLabels || []).join(", ")}`} titel={k.name} text="Summen der Gemeinschaft aus den Werten des Netzbetreibers. Einzelwerte von Mitgliedern sind zweckgebunden und werden nur bei Bedarf eingesehen.">
        <div className="mt-3"><Badge ton="info">{k.modell?.toUpperCase()}</Badge></div>
      </SeitenKopf>
      <EgReiter gemeinschaftId={id} aktiv="energie" art="organ" rechte={k.rechte} />
      <EnergieUebersicht dashboard={dashboard} qualitaet={qualitaet} />
      <PrognoseKarte prognose={prognose} />
      <QualitaetLeitstand qualitaet={qualitaet} basisPfad={`/portal/eg/${id}/energie`} apiPfad={`/api/portal/eg/${id}/energie`} darfReklamieren={false} />
      <AbweichungKarte abweichung={abweichung} />
      {qualitaet.rechte?.einzeln && (
        <Karte titel="Einzelwerte (Zweckbindung)">
          <Klappe titel="Viertelstundenwerte eines Zählpunkts – Einsicht wird protokolliert"><ZpEinzelwerte url={`/api/portal/eg/${id}/energie`} zaehlpunkte={zpListe} heute={dashboard.heute} /></Klappe>
        </Karte>
      )}
    </div>
  );
}
