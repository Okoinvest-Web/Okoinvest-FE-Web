// Pachtmodelle + Vergleich mit Ackerpacht – Beispielrechnung über pachtRechnung (keine eigenen Zahlen)
import Link from "next/link";
import { ArrowRight, BadgePercent, CalendarClock, Lock, TrendingUp } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { Zaehler } from "@/components/motion";
import { BEISPIEL_HA } from "@/components/Flaeche/Verpachten/Hero";
import { PACHT, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pachtRechnung } from "@/lib/rechner/pacht";

const tsd = (v) => `${fmt(Math.round(v / 1000))} Tsd. €`;

/** Jahrespacht als feine Säulen (Jahr 1–30), gemeinsame Skala für alle Modelle */
export function JahresSaeulen({ jahre, max, ton }) {
  const B = 240;
  const H = 56;
  const w = B / jahre.length;
  return (
    <svg viewBox={`0 0 ${B} ${H}`} className="h-14 w-full" aria-hidden="true" preserveAspectRatio="none">
      {jahre.map((j, i) => {
        const h = Math.max(2, (j.solar / max) * H);
        return <rect key={j.jahr} x={i * w + 0.6} y={H - h} width={w - 1.2} height={h} rx="1" className={cn("ov-balken-y", ton)} style={{ "--ov-delay": `${i * 12}ms` }} />;
      })}
    </svg>
  );
}

export default function Pachtmodelle() {
  const fest = pachtRechnung({ ha: BEISPIEL_HA, modell: "fest" });
  const index = pachtRechnung({ ha: BEISPIEL_HA, modell: "index" });
  const umsatz = pachtRechnung({ ha: BEISPIEL_HA, modell: "umsatz", umsatzAnteil: 0.06 });
  const max = Math.max(...[fest, index, umsatz].flatMap((r) => r.jahre.map((j) => j.solar)));

  const MODELLE = [
    { icon: Lock, t: "Festpacht", k: `${fmt(PACHT.freiflaecheProHa.mittel)} €/ha`, x: "Ein fester Betrag je Hektar und Jahr. Maximal planbar, aber ohne Inflationsausgleich.", s: tsd(fest.summeSolar), r: fest, ton: "fill-ov-400" },
    { icon: TrendingUp, t: "Indexiert", k: `+${fmt(PACHT.indexierung * 100, 1)} % p. a.`, x: "Festpacht, die an den Verbraucherpreisindex gekoppelt ist – oder mit fester Staffel steigt.", s: tsd(index.summeSolar), r: index, ton: "fill-ov-600" },
    { icon: BadgePercent, t: "Umsatzbeteiligung", k: `${fmt(PACHT.umsatzbeteiligung.min * 100)}–${fmt(PACHT.umsatzbeteiligung.max * 100)} %`, x: "Anteil an den Stromerlösen, meist mit Mindestpacht als Untergrenze. Sie profitieren von hohen Strompreisen.", s: `${tsd(umsatz.summeSolar)}`, zusatz: "bei 6 %", r: umsatz, ton: "fill-navy-500" },
  ];

  const balken = [
    { l: "Solarpacht indexiert", v: index.summeSolar, c: "bg-gradient-to-r from-ov-600 to-ov-400" },
    { l: "Solarpacht fest", v: fest.summeSolar, c: "bg-ov-400" },
    { l: "Deckungsbeitrag Ackerbau (selbst bewirtschaftet)", v: fest.summeDb, c: "bg-sun-400" },
    { l: "Ackerpacht (Durchschnitt DE)", v: fest.summeAcker, c: "bg-white/40" },
  ];

  return (
    <Section tone="white" space="lg" id="pachtmodelle" className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <SectionHeading
          eyebrow="Pachtmodelle"
          title="Vier Bausteine – Sie entscheiden, was zu Ihnen passt."
          lead={`Beispielrechnung für ${BEISPIEL_HA} Hektar in Süddeutschland über ${PACHT.laufzeit} Jahre. Jede Säule ist ein Jahr – Ihre eigenen Werte rechnen Sie im Pachtrechner.`}
        />
        <Reveal>
          <Link href="/rechner/pacht" className="group inline-flex items-center gap-2 rounded-full bg-ov-50 px-4 py-2.5 text-[14.5px] font-semibold text-ov-800 ring-1 ring-ov-200 transition-colors hover:bg-ov-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
            Mit eigenen Werten rechnen
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {MODELLE.map((m, i) => (
          <Reveal key={m.t} delay={i * 70} className="ov-card-hover flex flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200">
                <m.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="ov-num rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink-600 ring-1 ring-ink-200">Modell {i + 1}</span>
            </div>
            <h3 className="mt-5 font-display text-[19px] font-bold text-ink-900">{m.t}</h3>
            <p className="ov-num mt-1 font-display text-[26px] font-extrabold tracking-tight text-ov-700">{m.k}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{m.x}</p>
            <div className="mt-auto pt-6">
              <div className="rounded-2xl bg-white px-3 pb-2 pt-3 ring-1 ring-ink-200/70">
                <JahresSaeulen jahre={m.r.jahre} max={max} ton={m.ton} />
                <div className="mt-1 flex justify-between text-[10.5px] font-medium text-ink-500">
                  <span>J. 1</span>
                  <span>J. {PACHT.laufzeit}</span>
                </div>
              </div>
              <p className="mt-3 flex items-baseline justify-between gap-2 text-[13.5px]">
                <span className="text-ink-600">Summe {PACHT.laufzeit} J.{m.zusatz ? ` (${m.zusatz})` : ""}</span>
                <span className="ov-num font-bold text-ink-900">{m.s}</span>
              </p>
            </div>
          </Reveal>
        ))}

        {/* Baustein 4: Reservierungsprämie – kommt zusätzlich, daher eigene Optik */}
        <Reveal delay={210} className="relative flex flex-col overflow-hidden rounded-3xl bg-sun-50 p-6 ring-1 ring-sun-200 md:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sun-200/60 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sun-600 shadow-e1 ring-1 ring-sun-200">
              <CalendarClock aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-sun-400 px-2.5 py-1 text-[11.5px] font-bold text-navy-950">zusätzlich</span>
          </div>
          <h3 className="relative mt-5 font-display text-[19px] font-bold text-ink-900">Reservierungsprämie</h3>
          <p className="ov-num relative mt-1 font-display text-[26px] font-extrabold tracking-tight text-sun-700">
            {fmt(PACHT.reservierungProHa.min)}–{fmt(PACHT.reservierungProHa.max)} €/ha
          </p>
          <p className="relative mt-3 text-[15px] leading-relaxed text-ink-700">Jährlich ab Unterschrift bis Baubeginn – zusätzlich zur weiterlaufenden Bewirtschaftung.</p>
          <div className="relative mt-auto pt-6">
            <div className="rounded-2xl bg-white p-3 ring-1 ring-sun-200">
              <div className="flex h-14 items-end gap-1.5" aria-hidden="true">
                <span className="h-[30%] flex-1 rounded-md bg-sun-300" />
                <span className="h-[30%] flex-1 rounded-md bg-sun-300" />
                <span className="h-[30%] flex-1 rounded-md bg-sun-300" />
                <span className="mx-1 w-px self-stretch bg-ink-200" />
                <span className="h-full flex-[3] rounded-md bg-gradient-to-r from-ov-300 to-ov-500" />
              </div>
              <div className="mt-1 flex justify-between text-[10.5px] font-medium text-ink-500">
                <span>Unterschrift</span>
                <span>Baubeginn → Pacht</span>
              </div>
            </div>
            <p className="mt-3 text-[13.5px] font-semibold text-ink-800">Sie bewirtschaften weiter wie bisher</p>
          </div>
        </Reveal>
      </div>

      {/* Vergleich Acker */}
      <Reveal className="ov-noise relative mt-6 overflow-hidden rounded-[2rem] bg-navy-950 text-white md:mt-8">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-60" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-ov-500/25 blur-[90px]" />
        <div className="relative grid gap-8 p-6 sm:p-8 md:p-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-14">
          <div>
            <p className="ov-overline text-ov-300">{BEISPIEL_HA} ha über {PACHT.laufzeit} Jahre</p>
            <p className="mt-4 font-display text-[64px] font-extrabold leading-none tracking-[-0.04em] md:text-[84px]">
              ≈ <Zaehler wert={Math.round(fest.faktorAcker)} dauer={1200} /><span className="text-sun-300">×</span>
            </p>
            <p className="mt-3 max-w-xs text-[16px] leading-relaxed text-white/80">
              bringt schon die Festpacht im Vergleich zur durchschnittlichen Ackerpacht – bei gleicher Fläche.
            </p>
          </div>
          <div>
            <h3 className="sr-only">Einnahmen im Vergleich</h3>
            <ul className="space-y-5">
              {balken.map((b, i) => (
                <li key={b.l}>
                  <div className="mb-2 flex items-baseline justify-between gap-3 text-[14px]">
                    <span className="text-white/80">{b.l}</span>
                    <span className="ov-num shrink-0 font-display text-[17px] font-bold text-white">{tsd(b.v)}</span>
                  </div>
                  <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div className={cn("ov-balken-x h-full rounded-full", b.c)} style={{ width: `${(b.v / index.summeSolar) * 100}%`, "--ov-delay": `${i * 90}ms` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[12.5px] leading-relaxed text-white/60">
              Nominal, vor Steuern; Ackerpacht {fmt(PACHT.ackerProHa)} €/ha und Deckungsbeitrag {fmt(PACHT.deckungsbeitragAcker.mittel)} €/ha jeweils mit {fmt(PACHT.indexierung * 100, 1)} % p. a. fortgeschrieben. Stand {STAND}.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
