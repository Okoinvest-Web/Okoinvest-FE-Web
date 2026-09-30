// /portal/grundbuch/[id] – Grundbuch-Akte für Eigentümer bzw. Dachgeber: Ablauf mit „Was bedeutet das für Sie?“, Muster zum
// Nachlesen, Kosten (trägt in der Regel der Betreiber), Grundbuchauszug nach Eintragung. Fremde Akte → 404.
import Link from "next/link";
import { ArrowLeft, FileDown, Info } from "lucide-react";
import { Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { KostenTabelle, MusterLinks, SchritteEigentuemer, StatusBadgeGb } from "@/components/Portal/Closing/GrundbuchAnzeige";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { closingBackend } from "@/lib/plattform/backend/closing";
import { GB_LOESCHUNG } from "@/lib/plattform/closing/grundbuch";
import { datumZeit } from "@/lib/plattform/format";

export const metadata = { title: "Grundbuch-Akte" };

export default async function GrundbuchEigentuemerSeite({ params }) {
  const n = await portalNutzer();
  const { id } = await params;
  const a = await laden(() => closingBackend().gbAkte(n, id));
  const auszug = (a.dokumente || []).find((d) => d.schritt === "eintragung");
  return (
    <>
      <Link href={a.meineRolle === "backoffice" ? `/portal/admin/grundbuch/${a.id}` : "/portal/grundbuch"} className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> {a.meineRolle === "backoffice" ? "Backoffice-Ansicht" : "Grundbuch & Dienstbarkeit"}</Link>
      <SeitenKopf eyebrow={`Grundbuch · ${a.landLabel}`} titel={a.titel} text={a.rechtLabel} aktionen={<StatusBadgeGb status={a.status} label={a.statusLabel} />} />
      <Hinweis ton="info" icon={Info} className="mb-6">{a.einleitung}</Hinweis>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Karte titel="Ablauf bis zur Eintragung" untertitel={`${a.fortschritt.erledigt} von ${a.fortschritt.gesamt} Schritten erledigt`}>
            <SchritteEigentuemer akte={a} />
          </Karte>
          <Karte titel="Am Vertragsende">
            <p className="text-[14px] leading-relaxed text-ink-700">{GB_LOESCHUNG[a.land] || GB_LOESCHUNG.DE}</p>
          </Karte>
        </div>
        <div className="min-w-0 space-y-6">
          {auszug && (
            <Karte titel="Grundbuchauszug">
              <a href={`/api/portal/grundbuch/${a.id}/dokumente/${auszug.id}`} className="inline-flex items-center gap-2 text-[14px] font-semibold text-ov-700 hover:text-ov-800"><FileDown aria-hidden="true" className="h-4 w-4" />{auszug.name}</a>
            </Karte>
          )}
          <Karte titel="Zum Nachlesen" untertitel="Muster – keine Rechtsberatung">
            <MusterLinks akte={a} />
          </Karte>
          <Karte titel="Kosten" untertitel="Schätzung – die Kosten trägt in der Regel der Betreiber">
            <KostenTabelle kosten={a.kosten} />
          </Karte>
          {a.verlauf.length > 0 && (
            <Karte titel="Bisher erledigt">
              <ol className="space-y-2 text-[13.5px]">{[...a.verlauf].reverse().slice(0, 12).map((x, i) => <li key={i}><span className="text-ink-500">{datumZeit(x.am)}</span> – {x.text}</li>)}</ol>
            </Karte>
          )}
        </div>
      </div>
      <Hinweis ton="neutral" className="mt-6">{a.hinweis} Fragen beantworten wir gern über „Nachrichten“.</Hinweis>
    </>
  );
}
