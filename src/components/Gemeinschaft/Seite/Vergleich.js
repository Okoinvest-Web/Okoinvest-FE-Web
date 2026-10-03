// Ländervergleich: zuerst der größte Unterschied als Grafik (Abschlag auf das Netzentgelt für geteilten Strom,
// Werte aus GEMEINSCHAFTEN.rechner), dann die vollständige Vergleichstabelle (LaenderVergleich, unverändert).
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import LaenderVergleich from "@/components/Gemeinschaft/LaenderVergleich";
import { GEMEINSCHAFTEN, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const LAND = { de: "Deutschland", at: "Österreich", ch: "Schweiz" };

const ZEILEN = ["at", "ch", "de"]
  .flatMap((l) => GEMEINSCHAFTEN.rechner[l].rabatte.map((r) => ({ ...r, land: l })))
  .sort((a, b) => b.anteil - a.anteil);

export default function Vergleich() {
  return (
    <Section tone="sand" space="lg" id="vergleich" className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
        <SectionHeading
          eyebrow="Ländervergleich"
          title={
            <>
              Drei Länder, <span className="ov-text-gradient">drei Modelle</span>
            </>
          }
        />
        <Reveal>
          <p className="ov-lead text-ink-600 lg:pb-1">
            Die wichtigsten Unterschiede auf einen Blick – Stand {STAND}. Die Regeln entwickeln sich schnell; im Einzelfall prüfen wir den aktuellen Stand mit Netzbetreiber und Behörden.
          </p>
        </Reveal>
      </div>

      {/* Grafik: Netzentgelt-Abschlag */}
      <Reveal className="mt-12 rounded-[2rem] bg-white p-5 shadow-e2 ring-1 ring-ink-200/70 sm:p-7 md:mt-14 md:p-9">
        <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
          <div>
            <p className="ov-overline text-ov-700">Der größte Unterschied</p>
            <p className="mt-2 font-display text-[20px] font-bold leading-snug tracking-[-0.01em] text-ink-900 md:text-[24px]">Abschlag auf das Netzentgelt für geteilten Strom</p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">
              In Österreich und der Schweiz sinkt das Netzentgelt auf geteilten Strom. In Deutschland entsteht der Vorteil nach aktuellem Stand vor allem über den Strompreis zwischen den Teilnehmenden.
            </p>
          </div>
          <ul className="space-y-4 self-center">
            {ZEILEN.map((z) => (
              <li key={`${z.land}-${z.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[13rem_minmax(0,1fr)_3.5rem]">
                <p className="flex min-w-0 items-center gap-2 text-[14px]">
                  <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-navy-950 px-1.5 text-[11px] font-bold text-ov-300">{z.land.toUpperCase()}</span>
                  <span className="truncate font-semibold text-ink-900">{z.label}</span>
                  <span className="sr-only">({LAND[z.land]})</span>
                </p>
                <div aria-hidden="true" className="col-span-2 row-start-2 h-3 overflow-hidden rounded-full bg-sand-100 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                  <div
                    className={cn("h-full rounded-full", z.land === "at" ? "bg-ov-500" : z.land === "ch" ? "bg-navy-500" : "bg-ink-300")}
                    style={{ width: `${Math.max(z.anteil * 100, 0)}%` }}
                  />
                </div>
                <p className={cn("ov-num text-right font-display text-[18px] font-extrabold tracking-tight", z.anteil ? "text-ink-900" : "text-ink-400")}>
                  {z.anteil ? `−${fmt(z.anteil * 100)} %` : "–"}
                  <span className="sr-only">{z.anteil ? " Abschlag" : " kein Abschlag"}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-7 border-t border-ink-100 pt-4 text-[12.5px] leading-relaxed text-ink-500">
          Österreich: Abschlag auf den Arbeitspreis des Netznutzungsentgelts. Schweiz: Abschlag auf das Netznutzungsentgelt in der LEG. Deutschland: nach aktuellem Stand kein Netzentgeltvorteil (§ 42c EnWG).
        </p>
      </Reveal>

      <Reveal className="mt-8 md:mt-10">
        <LaenderVergleich />
      </Reveal>
    </Section>
  );
}
