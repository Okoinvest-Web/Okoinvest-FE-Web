// /portal/hilfe/handbuch – Übersicht der Handbücher, die zum Konto passen (Backoffice: alle).
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { HANDBUECHER, handbuchErlaubt } from "@/lib/plattform/querschnitt";

export const metadata = { title: "Handbücher" };

export default async function Handbuecher() {
  const n = await portalNutzer();
  const liste = Object.entries(HANDBUECHER).filter(([id]) => handbuchErlaubt(id, n.rollen || []));
  const extern = liste.filter(([id]) => !id.startsWith("backoffice"));
  const intern = liste.filter(([id]) => id.startsWith("backoffice"));
  const Gruppe = ({ titel, eintraege }) =>
    eintraege.length ? (
      <Karte titel={titel}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {eintraege.map(([id, h]) => (
            <li key={id}>
              <Link href={`/portal/hilfe/handbuch/${id}`} className="flex items-center gap-3 rounded-2xl bg-sand-50 p-3.5 text-[14.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200/70 hover:ring-ov-300">
                <BookOpen aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-700" /> {h.titel}
              </Link>
            </li>
          ))}
        </ul>
      </Karte>
    ) : null;
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Hilfe" titel="Handbücher" text="Anleitungen je Rolle – vom ersten Schritt bis zu typischen Fehlern. Zu jeder Portalseite finden Sie oben rechts über „?“ die passende Kurzhilfe." />
      <Gruppe titel="Für Ihre Rolle" eintraege={extern} />
      <Gruppe titel="Backoffice" eintraege={intern} />
    </div>
  );
}
