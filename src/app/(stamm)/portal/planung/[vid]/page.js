import Link from "next/link";
import { ArrowLeft, Download, FileWarning } from "lucide-react";
import { Angaben, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import PlanViewer from "@/components/Portal/Planung/PlanViewer";
import { PlanStatus } from "@/components/Portal/Planung/Planliste";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { planungBackend } from "@/lib/plattform/backend/planung";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Planvorschau", robots: { index: false, follow: false } };

export default async function PlanVorschau({ params }) {
  const n = await portalNutzer();
  const { vid } = await params;
  const d = await laden(() => planungBackend().planungVersion(n, vid));
  const v = d.version;
  const zurueck = d.backoffice ? `/portal/admin/entwicklung/${d.projekt.id}?reiter=planung` : `/portal/entwicklung/${d.projekt.id}`;
  const kz = v.analyse?.kennzahlen;
  const vorschauArt = v.vorschau?.art && v.vorschau.art !== "pdf" ? v.vorschau.art : null;

  return (
    <>
      <Link href={zurueck} className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{d.projekt.titel}</Link>
      <SeitenKopf
        eyebrow={`${d.plan.plannummer} · Index ${v.index} · ${d.plan.planartLabel}`}
        titel={d.plan.titel}
        text={`Maßstab ${d.plan.massstab} · ${d.plan.blattformat} · Planstand ${new Date(`${v.planstand}T00:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" })} · ${v.planer || v.von}`}
        aktionen={<a href={v.link} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Download aria-hidden="true" className="h-4 w-4" />Original ({v.format.toUpperCase()})</a>}
      >
        <div className="mt-3"><PlanStatus status={v.status} label={v.statusLabel} /></div>
      </SeitenKopf>

      <div className="space-y-6">
        {vorschauArt ? (
          <PlanViewer url={v.vorschau.link} art={vorschauArt} titel={`${d.plan.plannummer} ${d.plan.titel}`} />
        ) : v.format === "pdf" ? (
          <Karte titel="PDF-Plan"><a href={`${v.link}?anzeigen=1`} target="_blank" rel="noopener" className="font-semibold text-ov-700 hover:text-ov-800">PDF im Browser öffnen</a></Karte>
        ) : (
          <Hinweis ton="warn" icon={FileWarning} titel="Vorschau nach Konvertierung">
            DWG ist ein proprietäres Format. Die Vorschau erscheint, sobald der Konvertierungsdienst die Datei in DXF umgewandelt hat{v.konvertierung?.hinweis ? ` (${v.konvertierung.hinweis})` : ""}. Das Original steht zum Download bereit.
          </Hinweis>
        )}
        {(kz?.layerGefunden?.length > 0 || v.analyse?.einheit) && (
          <Karte titel="Aus der Zeichnung abgeleitet">
            <Angaben items={[
              { label: "Einheit", wert: v.analyse?.einheit?.label },
              { label: "Ausdehnung", wert: v.analyse?.groesse ? `${fmt(v.analyse.groesse.breiteM)} × ${fmt(v.analyse.groesse.hoeheM)} m` : "–" },
              ...(kz?.tische ? [{ label: "Modultische / Modulfläche", wert: `${fmt(kz.tische)} Tische · ${fmt(kz.modulflaecheM2)} m² (≈ ${fmt(kz.kwpGeschaetzt)} kWp geschätzt)` }] : []),
              ...(kz?.zaunM ? [{ label: "Zaunlänge", wert: `${fmt(kz.zaunM)} m` }] : []),
              ...(kz?.kabelMsM ? [{ label: "MS-Kabeltrasse", wert: `${fmt(kz.kabelMsM)} m` }] : []),
              ...(kz?.wegeM2 ? [{ label: "Wege", wert: `${fmt(kz.wegeM2)} m²` }] : []),
              ...(kz?.trafos ? [{ label: "Trafostationen", wert: String(kz.trafos) }] : []),
              ...(kz?.anlageHa ? [{ label: "Anlagenfläche (Baugrenze)", wert: `${fmt(kz.anlageHa, 2)} ha` }] : []),
            ]} />
            {v.aenderung && <p className="mt-4 text-[13.5px] text-ink-600">Änderung: {v.aenderung}</p>}
          </Karte>
        )}
      </div>
    </>
  );
}
