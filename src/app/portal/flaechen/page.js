import Link from "next/link";
import { LandPlot, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { Karte, Leer, SeitenKopf, StatusBadge, Stepper } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { LAENDER, FLAECHE_NUTZUNG } from "@/lib/plattform/konstanten";
import { statusInfo } from "@/lib/plattform/prozesse";
import { ha } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";
import { PROVISION } from "@/lib/invest/markt";

export const metadata = { title: "Flächen" };

export default async function Flaechen() {
  const n = await portalNutzer({ rollen: ["flaeche", "landwirt"] });
  const flaechen = await backend().flaechen(n);
  const summe = flaechen.reduce((s, f) => s + (f.ha || 0), 0);

  return (
    <div>
      <SeitenKopf
        eyebrow="Flächen"
        titel="Meine Flächen"
        text={`Von der Vorprüfung bis zum Betrieb: Hier sehen Sie für jede Fläche, wo sie steht. Die Prüfung ist ${PROVISION.flaeche.text}.`}
        aktionen={<Button href="/portal/flaechen/neu" icon={Plus}>Fläche hinzufügen</Button>}
      />
      {flaechen.length ? (
        <>
          <p className="mb-4 text-[14px] text-ink-600">
            <span className="ov-num font-semibold text-ink-900">{fmt(flaechen.length)}</span> {flaechen.length === 1 ? "Fläche" : "Flächen"} mit zusammen <span className="ov-num font-semibold text-ink-900">{ha(summe)}</span>
          </p>
          <ul className="grid gap-4 xl:grid-cols-2">
            {flaechen.map((f) => (
              <li key={f.id}>
                <Karte className="relative h-full transition-shadow hover:ring-ov-200">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-[18px] font-bold text-ink-900">
                        <Link href={`/portal/flaechen/${f.id}`} className="after:absolute after:inset-0 hover:text-ov-700">{f.bezeichnung}</Link>
                      </h2>
                      <p className="mt-0.5 text-[13.5px] text-ink-500">
                        {[ha(f.ha), FLAECHE_NUTZUNG[f.nutzung], [f.plz, f.ort].filter(Boolean).join(" "), LAENDER[f.land], f.agri ? "Agri-PV" : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <StatusBadge art="flaeche" status={f.status} />
                  </div>
                  <div className="mt-5">
                    <Stepper art="flaeche" status={f.status} kompakt />
                  </div>
                  <p className="mt-4 text-[14px] leading-relaxed text-ink-600">{statusInfo("flaeche", f.status).text}</p>
                </Karte>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Leer
          icon={LandPlot}
          titel="Noch keine Fläche hinterlegt"
          text="Lage, Größe und – wenn zur Hand – die Flurstücke genügen. Wir melden uns mit einer ehrlichen Ersteinschätzung."
          aktion={<Button href="/portal/flaechen/neu" pfeil>Erste Fläche hinzufügen</Button>}
        />
      )}
    </div>
  );
}
