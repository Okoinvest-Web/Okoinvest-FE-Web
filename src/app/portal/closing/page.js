// /portal/closing – Käufer bzw. Verkäufer: eigene Closing-Räume (Deal-Abschluss)
import Link from "next/link";
import { Stamp } from "lucide-react";
import { Badge, Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { closingBackend } from "@/lib/plattform/backend/closing";
import { CL_STATUS } from "@/lib/plattform/closing/closing";

export const metadata = { title: "Deal-Abschluss" };
const eur = (x) => `${Math.round(Number(x) || 0).toLocaleString("de-DE")} €`;

export default async function MeineClosingsSeite() {
  const n = await portalNutzer({ rollen: ["investor", "anbieter"] });
  const { closings } = await laden(() => closingBackend().clMeine(n));
  return (
    <>
      <SeitenKopf eyebrow="Mein Portal" titel="Deal-Abschluss" text="Vom Zuschlag bis zur Übergabe: Checkliste, Bedingungen, Notartermin und Zahlung – für Käufer und Verkäufer an einem Ort." />
      {closings.length ? (
        <Karte titel="Ihre Closing-Räume" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {closings.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
                <div className="min-w-0">
                  <Link href={`/portal/closing/${c.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{c.projekt?.titel || c.id}</Link>
                  <p className="text-[12.5px] text-ink-500">{c.meineRolle === "kaeufer" ? "Sie kaufen" : "Sie verkaufen"} · {c.strukturLabel} · {eur(c.kaufpreis)} · Bedingungen {c.cpsGesamt - c.cpsOffen}/{c.cpsGesamt}</p>
                </div>
                <Badge ton={CL_STATUS[c.status]?.ton}>{c.statusLabel}</Badge>
              </li>
            ))}
          </ul>
        </Karte>
      ) : (
        <Leer icon={Stamp} titel="Noch kein Deal-Abschluss" text="Nach einem Zuschlag im Bieterverfahren oder einer angenommenen Absichtserklärung eröffnet ÖkoInvest hier den Closing-Raum." />
      )}
    </>
  );
}
