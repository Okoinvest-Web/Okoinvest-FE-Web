// /portal/admin/portfolio/[id] – Backoffice: Position mit Formularen (Stammdaten, Monatsertrag, Kapitalabruf, Ausschüttung,
// Status, Dokumente, Börsen-Entwurf) – gleiche Ansicht wie der Investor plus interne Angaben.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import PositionAnsicht from "@/components/Portal/Portfolio/PositionAnsicht";
import { AbrufAnlegen, AbrufZeile, AusschuettungBuchen, AusschuettungStorno, BoerseUebernehmen, DokumentHochladen, ErtragErfassen, Stammdaten, StatusWechsel } from "@/components/Portal/Portfolio/BackofficeFormulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";
import { ABRUF_MIN_FRIST_TAGE, AUSSCHUETTUNG_ARTEN, PF_AKTIV, PF_STATUS, monatPlus, plusTage } from "@/lib/plattform/portfolio/kern";

export const metadata = { title: "Portfolio-Position (Backoffice)" };

export default async function PositionBackoffice({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const p = await laden(() => portfolioBackend().pfPosition(n, id));
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
  const s = p.darf.schreiben && PF_AKTIV.includes(p.status);
  const arten = Object.fromEntries(Object.entries(AUSSCHUETTUNG_ARTEN).filter(([key]) => (p.land === "DE" && p.spvName.includes("KG") ? key !== "gewinn" : true)));
  const bo = s
    ? {
        stammdaten: <Stammdaten p={p} />,
        ertrag: <ErtragErfassen positionId={p.id} vormonat={monatPlus(heute.slice(0, 7), -1)} monitoring={p.monitoring} />,
        abrufe: ["codev", "projekt"].includes(p.art) && p.zusage > 0 ? <AbrufAnlegen positionId={p.id} fruehestens={plusTage(heute, ABRUF_MIN_FRIST_TAGE)} offen={p.kennzahlen.zusage.offen} /> : null,
        abrufZeile: (a) => <AbrufZeile positionId={p.id} abruf={a} />,
        ausschuettungen: <AusschuettungBuchen positionId={p.id} heute={heute} arten={arten} gesperrt={!!p.covenant?.gesperrt} />,
        ausschuettungZeile: (a) => <AusschuettungStorno positionId={p.id} ausschuettung={a} />,
        dokumente: <DokumentHochladen positionId={p.id} />,
        wiederverkauf: p.status === "verkauf_angefragt" ? <BoerseUebernehmen positionId={p.id} /> : null,
      }
    : {};
  return (
    <>
      <Link href="/portal/admin/portfolio" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Investoren-Portfolio</Link>
      <SeitenKopf eyebrow={`Backoffice · ${p.artLabel}`} titel={p.titel} text={`${p.investor?.anzeige || ""} · ${[p.spvName, p.landLabel].filter(Boolean).join(" · ")}`}>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge ton={p.statusTon}>{p.statusLabel}</Badge>
          {p.closingId && <Link href={`/portal/admin/closing/${p.closingId}`} className="text-[13px] font-semibold text-ov-700 hover:text-ov-800">Closing {p.closingId}</Link>}
          {p.wiederverkauf?.boerse && <Link href={`/portal/projekte/${p.wiederverkauf.boerse.id}`} className="text-[13px] font-semibold text-ov-700 hover:text-ov-800">Börsen-Entwurf {p.wiederverkauf.boerse.id}</Link>}
        </div>
      </SeitenKopf>
      {s && p.uebergaenge.length > 0 && (
        <Karte className="mb-6">
          <StatusWechsel positionId={p.id} uebergaenge={p.uebergaenge} labels={PF_STATUS} />
        </Karte>
      )}
      {!p.darf.schreiben && <Hinweis ton="neutral" className="mb-6">Ihre Backoffice-Rolle erlaubt im Portfolio nur Lesen.</Hinweis>}
      {p.notizIntern && <Hinweis ton="neutral" className="mb-6" titel="Interne Notiz">{p.notizIntern}</Hinweis>}
      <PositionAnsicht p={p} basis="/api/admin/portfolio" bo={bo} heute={heute} />
    </>
  );
}
