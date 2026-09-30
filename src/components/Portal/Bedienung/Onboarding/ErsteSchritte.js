// Checkliste „Erste Schritte“ auf der Portal-Übersicht (Server-Komponente).
// Sichtbar, bis alle Punkte erledigt sind oder die Checkliste ausgeblendet wurde.
// Punkte werden aus echten Daten abgeleitet (siehe lib/plattform/onboarding.js).

import Link from "next/link";
import { ArrowRight, Check, Compass } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { checklisteZeigen } from "@/lib/plattform/onboarding";
import { ersteSchritteLaden } from "@/lib/plattform/server/bedienung";
import ChecklisteAusblenden from "./ChecklisteAusblenden";

export default async function ErsteSchritte({ nutzer }) {
  let daten;
  try {
    daten = await ersteSchritteLaden(nutzer);
  } catch {
    return null; // nie die Übersicht blockieren
  }
  const { liste, zustand } = daten;
  if (!checklisteZeigen(liste, zustand)) return null;
  const offen = liste.punkte.filter((p) => !p.erledigt);
  const einstiegOffen = ["neu", "laufend"].includes(zustand.status);
  return (
    <section aria-labelledby="erste-schritte" className="rounded-3xl bg-white ring-1 ring-ink-200/70">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 md:px-6">
        <div className="min-w-0">
          <h2 id="erste-schritte" className="font-display text-[17px] font-bold text-ink-900">Erste Schritte</h2>
          <p className="mt-0.5 text-[13.5px] text-ink-500">
            {liste.erledigt} von {liste.gesamt} erledigt – noch {offen.length} {offen.length === 1 ? "Punkt" : "Punkte"}, dann ist Ihr Portal startklar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {einstiegOffen && (
            <Link href="/portal/willkommen" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ov-600 px-3.5 text-[13.5px] font-semibold text-white hover:bg-ov-700">
              <Compass aria-hidden="true" className="h-4 w-4" /> Geführt starten
            </Link>
          )}
          <ChecklisteAusblenden />
        </div>
      </div>
      <div className="px-5 pb-5 pt-4 md:px-6">
        <div className="h-2 rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={liste.quote} aria-label="Fortschritt Erste Schritte">
          <div className="h-2 rounded-full bg-ov-500" style={{ width: `${Math.max(4, liste.quote)}%` }} />
        </div>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {liste.punkte.map((p) => (
            <li key={p.id}>
              <Link
                href={p.href}
                className={cn("group flex h-full items-start gap-3 rounded-2xl p-3 ring-1 ring-inset transition-colors", p.erledigt ? "bg-sand-50/60 ring-ink-100" : "bg-white ring-ink-200/70 hover:ring-ov-300")}
              >
                <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", p.erledigt ? "bg-ov-500 text-white" : "ring-2 ring-inset ring-ink-300")}>
                  {p.erledigt && <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[14.5px] font-semibold", p.erledigt ? "text-ink-500 line-through decoration-ink-300" : "text-ink-900 group-hover:text-ov-700")}>
                    {p.titel}
                    <span className="sr-only">{p.erledigt ? " – erledigt" : " – offen"}</span>
                  </span>
                  {!p.erledigt && <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">{p.text}</span>}
                </span>
                {!p.erledigt && <ArrowRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-400 group-hover:text-ov-700" />}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
