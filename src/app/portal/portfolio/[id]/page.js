// /portal/portfolio/[id] – Investor: eine Position (Ertrag, Covenants, Ausschüttungen, Kapitalabrufe, Berichte, Dokumente, Steuern, Wiederverkauf)
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge, SeitenKopf } from "@/components/Portal/ui";
import PositionAnsicht from "@/components/Portal/Portfolio/PositionAnsicht";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";

export const metadata = { title: "Portfolio-Position" };

export default async function PositionSeite({ params }) {
  const n = await portalNutzer({ rollen: ["investor"] });
  const { id } = await params;
  const p = await laden(() => portfolioBackend().pfPosition(n, id));
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
  return (
    <>
      <Link href="/portal/portfolio" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Portfolio</Link>
      <SeitenKopf eyebrow={p.artLabel} titel={p.titel} text={[p.spvName, p.bundesland, p.landLabel].filter(Boolean).join(" · ")}>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge ton={p.statusTon}>{p.statusLabel}</Badge>
          {p.meineRolle === "leser" && <Badge>Nur lesen (Teamrolle)</Badge>}
        </div>
      </SeitenKopf>
      <PositionAnsicht p={p} heute={heute} />
    </>
  );
}
