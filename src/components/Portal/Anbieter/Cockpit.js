// „Was ist zu tun?“ über alle Projekte des Anbieters (bzw. Punkte, die auf das Backoffice warten) – Server-Komponente.
// Daten: anbieterCockpit(n) aus backend/anbieter.js.

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { Badge, Hinweis, Karte } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";

const ART = {
  mandat: "Auftrag", einreichen: "Entwurf", pruefpunkt: "Rückfrage", anonymitaet: "Teaser", votum: "LOI", vorkenntnis: "Vorkenntnis",
  qa: "Q&A", closing: "Closing", provision: "Provision", bestand: "Bestand",
};
const tag = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join(".") : "");

export default function AnbieterCockpit({ daten, titel = "Was ist zu tun?", untertitel }) {
  if (!daten) return null;
  const projekte = (daten.projekte || []).filter((p) => p.aufgaben.length);
  const admin = daten.rolle === "admin";
  return (
    <Karte
      titel={titel}
      untertitel={untertitel || (admin ? "Antworten, Meldungen und Stellungnahmen von Anbietern" : "Offene Schritte über alle Ihre Projekte – von der Einreichung bis zur Provisionsrechnung")}
      aktion={daten.summe ? <Badge ton={daten.ueberfaellig ? "warn" : "info"}>{daten.summe} offen{daten.ueberfaellig ? ` · ${daten.ueberfaellig} überfällig` : ""}</Badge> : null}
    >
      {!projekte.length ? (
        <Hinweis ton="ok" icon={CheckCircle2}>{admin ? "Keine offenen Punkte von Anbietern." : "Aktuell ist nichts von Ihnen zu tun. Neue Rückfragen, LOIs und Fristen erscheinen hier und in der Glocke."}</Hinweis>
      ) : (
        <ul className="space-y-5">
          {projekte.map(({ projekt: p, aufgaben }) => (
            <li key={p.id}>
              <p className="mb-2 text-[13px] font-semibold text-ink-500">
                <Link href={`/portal/projekte/${p.id}`} className="hover:text-ov-700">{p.titel || p.id}</Link>
              </p>
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl ring-1 ring-inset ring-ink-200/70">
                {aufgaben.map((a, i) => (
                  <li key={`${a.art}-${i}`}>
                    <Link href={a.link} className="flex items-center gap-3 px-4 py-3 text-[14px] text-ink-800 transition-colors hover:bg-ink-50">
                      <Badge ton={a.ueberfaellig ? "warn" : a.ton}>{ART[a.art] || a.art}</Badge>
                      <span className="min-w-0 flex-1">{a.text}</span>
                      {a.frist && (
                        <span className={cn("hidden shrink-0 items-center gap-1 text-[12.5px] sm:inline-flex", a.ueberfaellig ? "font-semibold text-danger-700" : "text-ink-500")}>
                          {a.ueberfaellig ? <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" /> : <Clock aria-hidden="true" className="h-3.5 w-3.5" />} bis {tag(a.frist)}
                        </span>
                      )}
                      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  );
}
