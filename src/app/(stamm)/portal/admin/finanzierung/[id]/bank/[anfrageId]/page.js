import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge, SeitenKopf } from "@/components/Portal/ui";
import { AkteAnforderungen, AkteNachAuswahl, AkteQa, AkteVerlauf } from "@/components/Portal/Finanzierung/BankAkteAnsicht";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";
import { ANFRAGE_STATUS } from "@/lib/plattform/finanzierung/bank";

export const metadata = { title: "Bank-Akte" };

// Backoffice-Sicht der Bank-Akte einer Anfrage: Anforderungen liefern, Fragen beantworten, Auszahlungen beantragen, Berichte einreichen
export default async function BankAkteAdmin({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id, anfrageId } = await params;
  const akte = await laden(() => bankakteBackend().baAkte(n, anfrageId));
  const darf = akte.rolle === "bo_schreiben";
  return (
    <>
      <Link href={`/portal/admin/finanzierung/${akte.fallId || id}?tab=banken`} className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{akte.titel}</Link>
      <SeitenKopf eyebrow="Finanzierung · Bank-Akte" titel={akte.bank} text={`${akte.stand.anforderungenOffen} Anforderung(en) offen · ${akte.stand.fragenOffen} Frage(n) offen · ${akte.stand.berichteFaellig} Bericht(e) angefordert`}>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge ton={ANFRAGE_STATUS[akte.anfrageStatus]?.ton}>{akte.anfrageStatusLabel}</Badge>
          {akte.zustaendig && <Badge ton="info">Zuständig bei der Bank: {akte.zustaendig.name}</Badge>}
          {akte.team.length > 0 && <Badge>{akte.team.length} Konto/Konten der Bank</Badge>}
        </div>
      </SeitenKopf>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <AkteAnforderungen akte={akte} darf={darf} />
          <AkteNachAuswahl akte={akte} darf={darf} leitung={false} />
        </div>
        <div className="space-y-6">
          <AkteQa akte={akte} darf={darf} />
          <AkteVerlauf akte={akte} />
        </div>
      </div>
    </>
  );
}
