// /portal/admin/eg/[id]/energiedaten – Backoffice: Energiedaten einer Gemeinschaft (WP3). Dashboard (Erzeugung, Verbrauch,
// Eigendeckung), Prognose, Datenqualitäts-Leitstand mit Reklamation, Abweichungsbericht und Sozialquote, Werkzeuge
// (CSV-/Excel-Import, Einzelwerte, Mehrfachteilnahme-Optimierer, Simulation). ?monat=JJJJ-MM wählt den Prüfmonat.

import Link from "next/link";
import { Calculator } from "lucide-react";
import { Badge, Karte, SeitenKopf } from "@/components/Portal/ui";
import { Klappe } from "@/components/Portal/Mitglied/teile";
import EgReiter from "@/components/Portal/EG/Stamm/EgReiter";
import { AbweichungKarte, EnergieUebersicht, PrognoseKarte, QualitaetLeitstand } from "@/components/Portal/EG/Energie/EnergieDashboard";
import { CsvImportEnergie, Optimierer, ZpEinzelwerte } from "@/components/Portal/EG/Energie/Werkzeuge";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { GEMEINSCHAFT_STATUS } from "@/lib/plattform/eg/modell";

export const metadata = { title: "Energiedaten der Gemeinschaft" };

export default async function Energiedaten({ params, searchParams }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const sp = (await searchParams) || {};
  const monat = /^\d{4}-\d{2}$/.test(sp.monat || "") ? sp.monat : "";
  const b = egBackend();
  const d = await laden(() => b.egGemeinschaft(n, id));
  const g = d.gemeinschaft;
  const r = d.rechte || {};
  const [dashboard, qualitaet, abweichung, prognose] = await Promise.all([
    laden(() => b.enDashboard(n, id)),
    laden(() => b.enQualitaet(n, id, { monat })),
    laden(() => b.enAbweichungsbericht(n, id, { monat })),
    laden(() => b.enPrognose(n, id)),
  ]);
  const api = `/api/admin/eg/${g.id}/energiedaten`;
  const zps = (d.zaehlpunkte || []).filter((z) => (d.teilnahmen || []).some((t) => t.zaehlpunktId === z.id && t.gemeinschaftId === g.id && !["verworfen"].includes(t.status)));
  const zpListe = zps.map((z) => ({ id: z.id, label: `${z.bezeichnung || z.inhaberName || ""} · ${z.richtungLabel || z.richtung} · …${z.zaehlpunktnummer.slice(-10)}`, mehrfach: (d.teilnahmen || []).filter((t) => t.zaehlpunktId === z.id).length > 1 || /Mehrfach/.test(z.hinweis || "") }));
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`Energiedaten · ${g.modellKurz} · Zonelevel ${g.zonelevel} · ${g.verteilmodell}`} titel={g.name} text="Viertelstundenwerte des Netzbetreibers (EDA, CR_MSG) bzw. importierte Exporte der Netzbetreiber-Portale, Datenqualität und Abgleich – Grundlage der Abrechnung." aktionen={<Link href={`/portal/admin/eg/simulation?gemeinschaft=${g.id}`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800"><Calculator aria-hidden="true" className="h-4 w-4" />Simulation mit diesen Daten</Link>}>
        <div className="mt-3 flex flex-wrap gap-2"><Badge ton={GEMEINSCHAFT_STATUS[g.status]?.ton}>{g.statusLabel}</Badge>{g.demo && <Badge>Demo</Badge>}</div>
      </SeitenKopf>
      <EgReiter gemeinschaftId={g.id} aktiv="energiedaten" art="admin" />
      <EnergieUebersicht dashboard={dashboard} qualitaet={qualitaet} />
      <PrognoseKarte prognose={prognose} />
      <QualitaetLeitstand qualitaet={qualitaet} basisPfad={`/portal/admin/eg/${g.id}/energiedaten`} apiPfad={api} darfReklamieren={qualitaet?.rechte?.reklamieren} />
      <AbweichungKarte abweichung={abweichung} />
      <Karte titel="Werkzeuge" untertitel="Import aus dem Netzbetreiber-Portal, Einzelwerte, Optimierung der Teilnahmefaktoren">
        <div className="space-y-3">
          {(r.stammdaten || 0) >= 1 && <Klappe titel="CSV-/Excel-Import (Ausweichweg ohne EDA)"><CsvImportEnergie url={api} zaehlpunkte={zpListe} /></Klappe>}
          {qualitaet?.rechte?.einzeln && <Klappe titel="Viertelstundenwerte eines Zählpunkts (protokolliert)"><ZpEinzelwerte url={api} zaehlpunkte={zpListe} heute={dashboard.heute} /></Klappe>}
          {qualitaet?.rechte?.einzeln && <Klappe titel="Mehrfachteilnahme-Optimierer (Teilnahmefaktoren)"><Optimierer url={api} zaehlpunkte={zpListe} /></Klappe>}
          {!qualitaet?.rechte?.einzeln && <p className="text-[13px] text-ink-500">Einzelwerte und Optimierer stehen der Betriebsführung mit Dienstleistungsvertrag (Organisator) bzw. dem Vorstand zur Verfügung (Zweckbindung).</p>}
        </div>
      </Karte>
    </div>
  );
}
