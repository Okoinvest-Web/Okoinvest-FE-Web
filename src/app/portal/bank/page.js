import Link from "next/link";
import { Landmark } from "lucide-react";
import { Badge, Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { teur, datumDe } from "@/components/Portal/Finanzierung/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";
import { ANFRAGE_STATUS } from "@/lib/plattform/finanzierung/bank";

export const metadata = { title: "Finanzierungsanfragen" };

// Bank-Portal: Anfragen der eigenen Bank(en) – Rolle „bank“ (nur per Einladung), andere Rollen 404
export default async function BankSeite() {
  const n = await portalNutzer({ rollen: ["bank"] });
  const d = await laden(() => finanzierungBackend().fzBankMeine(n));
  return (
    <>
      <SeitenKopf eyebrow={d.banken.map((b) => b.name).join(", ") || "Finanzierungspartner"} titel="Finanzierungsanfragen" text="Anfragen von ÖkoInvest an Ihr Haus: Bankenpaket im gesicherten Datenraum einsehen, Term Sheet abgeben, Rückfragen stellen." />
      {d.anfragen.length === 0 ? (
        <Leer icon={Landmark} titel="Keine offenen Anfragen" text="Sobald ÖkoInvest Ihr Haus anfragt, erscheint die Anfrage hier und Sie erhalten eine E-Mail." />
      ) : (
        <Karte titel="Anfragen" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {d.anfragen.map((a) => (
              <li key={a.id}>
                <Link href={`/portal/bank/${a.id}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-ink-50/60 md:flex-row md:items-center md:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink-900">{a.titel}</p>
                    <p className="text-[12.5px] text-ink-500">{String(a.mwp).replace(".", ",")} MWp · {a.land} · Bedarf {teur(a.betragWunsch)} · Frist {datumDe(a.frist)}</p>
                  </div>
                  <Badge ton={ANFRAGE_STATUS[a.status]?.ton}>{ANFRAGE_STATUS[a.status]?.label}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Karte>
      )}
    </>
  );
}
