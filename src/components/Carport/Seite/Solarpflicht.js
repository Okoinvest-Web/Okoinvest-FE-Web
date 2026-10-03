// Solarpflicht für Parkplätze: Schwellen als Balkenvergleich + vollständige Tabelle (Daten aus der Seite)
import Link from "next/link";
import { ArrowUpRight, CircleSlash } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import Kopf from "@/components/Energie/Seite/Kopf";

/**
 * pflicht: [[land, schwelle, umfang, seit]]
 * schwellen: [{ land, wert, label }] – Zahl der Stellplätze, ab der die Pflicht greift (aus der Tabelle abgeleitet)
 * ohne: Text der Länder ohne Parkplatzpflicht
 */
export default function Solarpflicht({ pflicht, schwellen, ohne, stand }) {
  const max = 80;
  const sortiert = [...schwellen].sort((a, b) => a.wert - b.wert);
  return (
    <Section tone="sand" space="lg" id="solarpflicht" data-abschnitt="solarpflicht" aria-labelledby="solarpflicht-titel" className="scroll-mt-24">
      <Kopf
        id="solarpflicht-titel"
        eyebrow="Solarpflicht"
        titel="Welche Länder Photovoltaik auf Parkplätzen verlangen."
        lead={`In acht Bundesländern gilt eine Solarpflicht für neue Parkplätze – mit unterschiedlichen Schwellen, Stichtagen und Ausnahmen. Ein Überblick, Stand ${stand}.`}
        className="mb-12 md:mb-14"
      />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <Reveal as="figure" className="rounded-[2rem] bg-white p-6 shadow-e2 ring-1 ring-ink-200/70 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <figcaption className="font-display text-[19px] font-bold text-ink-900">Ab wie vielen Stellplätzen?</figcaption>
            <p className="text-[12.5px] text-ink-500">Schwelle für neue Parkplätze</p>
          </div>
          <ul className="mt-6 space-y-3">
            {sortiert.map((s) => (
              <li key={s.land} className="grid items-center gap-1 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
                <span className="truncate text-[14px] font-semibold text-ink-800">{s.land}</span>
                <span className="flex items-center gap-2">
                  <span className="relative h-7 flex-1 rounded-lg bg-sand-100">
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-ov-500 to-ov-400"
                      style={{ width: `${(s.wert / max) * 100}%` }}
                    />
                    <span
                      className={`ov-num absolute inset-y-0 flex items-center text-[12.5px] font-bold ${s.wert / max > 0.7 ? "pr-2 text-white" : "pl-2 text-ink-900"}`}
                      style={s.wert / max > 0.7 ? { right: `${100 - (s.wert / max) * 100}%` } : { left: `${(s.wert / max) * 100}%` }}
                    >
                      {s.label}
                    </span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className="mt-3 grid gap-3 text-[11.5px] text-ink-400 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <span className="max-sm:hidden" />
            <span className="flex justify-between">
              <span>0</span>
              <span>40</span>
              <span>80 Stellplätze</span>
            </span>
          </div>
          <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">„&gt; 35“ heißt mehr als 35 Stellplätze. Kürzeste Lesart je Land; Einzelheiten in der Tabelle unten.</p>
        </Reveal>

        <div className="grid gap-5">
          <Reveal delay={60} className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70 sm:p-7">
            <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-50 text-ink-500 ring-1 ring-ink-200">
              <CircleSlash className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-[18px] font-bold text-ink-900">Keine Parkplatzpflicht nach aktuellem Stand</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{ohne}.</p>
          </Reveal>
          <Reveal delay={120} className="relative overflow-hidden rounded-[2rem] bg-navy-950 p-6 text-white sm:p-7">
            <div aria-hidden="true" className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-ov-500/25 blur-3xl" />
            <p className="ov-overline relative text-ov-300">Ratgeber</p>
            <h3 className="relative mt-2 font-display text-[18px] font-bold leading-snug">
              <Link href="/wissen/ratgeber/parkplatz-solarpflicht-bundeslaender" className="group inline-flex items-start gap-2 rounded outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ov-300">
                Solarpflicht für Parkplätze: Details, Rechtsgrundlagen und Ausnahmen
                <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ov-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </h3>
          </Reveal>
        </div>
      </div>

      <Reveal className="mt-5 min-w-0">
        <div tabIndex={0} role="region" aria-label="Solarpflicht für Parkplätze nach Bundesland" className="overflow-x-auto rounded-[2rem] bg-white ring-1 ring-ink-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
          <table className="w-full min-w-[720px] text-left text-[14.5px]">
            <caption className="sr-only">Solarpflicht für neue Parkplätze nach Bundesland, Stand {stand}</caption>
            <thead className="bg-sand-100 text-[12px] uppercase tracking-[0.12em] text-ink-600">
              <tr>
                <th scope="col" className="px-6 py-3.5 font-semibold">Land</th>
                <th scope="col" className="px-6 py-3.5 font-semibold">Stellplätze</th>
                <th scope="col" className="px-6 py-3.5 font-semibold">Umfang</th>
                <th scope="col" className="px-6 py-3.5 font-semibold">Gilt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {pflicht.map(([land, schwelle, umfang, seit]) => (
                <tr key={land} className="transition-colors hover:bg-sand-50">
                  <th scope="row" className="px-6 py-3.5 font-semibold text-ink-900">{land}</th>
                  <td className="px-6 py-3.5 text-ink-700">{schwelle}</td>
                  <td className="px-6 py-3.5 text-ink-600">{umfang}</td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-ink-500">{seit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
          Eigene Zusammenstellung aus Landesrecht, ohne Gewähr. Stichtage beziehen sich meist auf den Bauantrag; Ausnahmen gibt es u. a. bei Unwirtschaftlichkeit oder fehlendem Netzanschluss.
          Landesrecht ändert sich häufig – vor der Planung den aktuellen Stand prüfen.
        </p>
      </Reveal>
    </Section>
  );
}
