// Abschnitte der Seite /virtuelles-kraftwerk (Server-Komponenten, Inhalte kommen aus der Seite)
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Calculator, MessageSquare, Radio, ShieldCheck, Activity } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import Kopf from "@/components/Energie/Seite/Kopf";
import { cn } from "@/components/ui/cn";

const TON = [
  { chip: "bg-sun-50 text-sun-700 ring-sun-200", icon: "bg-sun-50 text-sun-600 ring-sun-200", balken: "from-sun-400 to-sun-300" },
  { chip: "bg-ov-50 text-ov-700 ring-ov-200", icon: "bg-ov-50 text-ov-600 ring-ov-200", balken: "from-ov-500 to-ov-300" },
  { chip: "bg-navy-50 text-navy-700 ring-navy-100", icon: "bg-navy-50 text-navy-600 ring-navy-100", balken: "from-navy-500 to-navy-300" },
];

/** Drei Bausteine als Kette Erzeuger → Speicher → Verbraucher, darunter Erzeugerarten */
export function Bausteine({ items, arten }) {
  return (
    <Section tone="white" space="lg" data-abschnitt="bausteine" aria-labelledby="bausteine-titel">
      <Kopf
        id="bausteine-titel"
        eyebrow="Die drei Bausteine"
        titel="Erzeuger, Speicher, Verbraucher"
        lead="Erst das Zusammenspiel macht den Verbund wertvoll: Erzeugung ohne Abnehmer ist Börsenrisiko, Verbrauch ohne eigene Erzeugung ist Preisrisiko."
        className="mb-12 md:mb-16"
      />
      <ol className="grid gap-5 lg:grid-cols-3 lg:gap-0">
        {items.map((b, i) => (
          <Reveal as="li" key={b.title} delay={i * 80} className="relative flex lg:pr-10 [&:last-child]:pr-0">
            {i < items.length - 1 && (
              <span aria-hidden="true" className="absolute right-0 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 translate-x-[calc(50%-1.25rem)] items-center justify-center rounded-full bg-white text-ink-500 shadow-e2 ring-1 ring-ink-200 lg:flex">
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
            <article className="relative flex w-full flex-col overflow-hidden rounded-[2rem] bg-sand-50 p-6 ring-1 ring-ink-200/70 sm:p-8">
              <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", TON[i].balken)} />
              <div className="flex items-start justify-between gap-3">
                <span aria-hidden="true" className={cn("flex h-14 w-14 items-center justify-center rounded-2xl ring-1", TON[i].icon)}>
                  <b.icon className="h-6 w-6" />
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1", TON[i].chip)}>{b.tag}</span>
              </div>
              <h3 className="mt-6 font-display text-[22px] font-bold text-ink-900">{b.title}</h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-ink-600">{b.text}</p>
            </article>
          </Reveal>
        ))}
      </ol>
      <ul className="mt-5 grid gap-3 md:grid-cols-3">
        {arten.map((x, i) => (
          <Reveal as="li" key={x.t} delay={i * 60} className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 ring-1 ring-ink-200/70">
            <x.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-sun-500" />
            <p className="text-[14.5px] text-ink-700">
              <strong className="font-semibold text-ink-900">{x.t}</strong> · {x.s}
            </p>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

/** Vier Leistungen auf dunkler Bühne */
export function Leistungen({ items }) {
  return (
    <Section tone="navy" space="lg" bare data-abschnitt="leistungen" aria-labelledby="leistungen-titel" className="ov-verlauf-nacht ov-noise overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_50%_at_80%_20%,#000,transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-10 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[130px]" />
      <div className="ov-container relative">
        <div className="mb-12 grid gap-6 md:mb-16 lg:grid-cols-[1fr_auto] lg:items-end">
          <Kopf
            dark
            id="leistungen-titel"
            eyebrow="Leistungen"
            titel={
              <>
                Vier Aufgaben, <span className="ov-text-gradient-light">eine Leitwarte.</span>
              </>
            }
            lead="Welche davon für Ihre Anlage oder Ihr Unternehmen sinnvoll sind, klären wir im Einzelfall."
          />
        </div>
        <ul className="grid gap-4 md:grid-cols-2 md:gap-5">
          {items.map((l, i) => (
            <Reveal as="li" key={l.title} delay={(i % 2) * 70} className="group relative flex gap-5 rounded-[1.75rem] bg-white/[0.04] p-6 ring-1 ring-white/10 transition-colors hover:bg-white/[0.07] sm:p-8">
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ov-400/15 text-ov-300 ring-1 ring-ov-300/30">
                <l.icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p aria-hidden="true" className="ov-num text-[12px] font-bold tracking-[0.16em] text-sun-300">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 font-display text-[20px] font-bold text-white">{l.title}</h3>
                <p className="mt-2 text-[15.5px] leading-relaxed text-white/70">{l.text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/** Für wen + Regelrahmen */
export function FuerWen({ zielgruppen, regeln }) {
  return (
    <Section tone="white" space="lg" data-abschnitt="fuer-wen" aria-labelledby="fuerwen-titel">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
        <div>
          <Kopf id="fuerwen-titel" eyebrow="Für wen" titel="Wer vom Verbund profitiert" className="mb-8 md:mb-10" />
          <ul className="grid gap-4 sm:grid-cols-2">
            {zielgruppen.map((z, i) => (
              <Reveal as="li" key={z.title} delay={(i % 2) * 60} className="flex">
                <article className="group ov-card-hover relative flex w-full flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 transition-colors focus-within:ring-2 focus-within:ring-ov-500 hover:bg-white">
                  <div className="flex items-start justify-between">
                    <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200/70 transition-colors duration-300 group-hover:bg-ov-600 group-hover:text-white">
                      <z.icon className="h-[22px] w-[22px]" />
                    </span>
                    <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-ink-400 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ov-700" />
                  </div>
                  <h3 className="mt-5 font-display text-[18px] font-bold leading-snug text-ink-900">
                    <Link href={z.href} className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']">
                      {z.title}
                    </Link>
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{z.text}</p>
                </article>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal className="self-start overflow-hidden rounded-[2rem] bg-navy-950 text-white shadow-e4">
          <div className="border-b border-white/10 p-6 sm:p-8">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ov-300">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Rahmen in Deutschland
            </p>
            <h3 className="mt-3 font-display text-[22px] font-bold leading-snug">Die Regeln, nach denen ein Verbund spielt</h3>
          </div>
          <ul className="divide-y divide-white/10">
            {regeln.map((r) => (
              <li key={r.titel} className="flex gap-4 px-6 py-5 sm:px-8">
                <Radio aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ov-300" />
                <div>
                  <p className="font-semibold text-white">{r.titel}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-white/70">{r.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-white/10 bg-white/[0.03] px-6 py-5 text-[13.5px] leading-relaxed text-white/65 sm:px-8">
            <Activity aria-hidden="true" className="mr-1.5 inline h-4 w-4 align-[-3px] text-ov-300" />
            Unser Verbund wächst mit jedem Park und jedem Pool-Teilnehmer. Die Belieferung der Unternehmen erfolgt über einen lizenzierten Energielieferanten; Direktvermarktung und Regelleistung
            setzen wir mit präqualifizierten Partnern um.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}

/** Einstieg: zwei klare nächste Schritte statt CTA-Band */
export function Einstieg() {
  const WEGE = [
    {
      icon: Calculator,
      marke: "In einer Minute",
      titel: "Reststrom-Ersparnis berechnen",
      text: "Für Unternehmen: was der gebündelte Einkauf im Pool für Ihr Lastprofil bedeuten kann.",
      href: "/rechner/reststrom",
      label: "Zum Reststrom-Rechner",
      primaer: true,
    },
    {
      icon: MessageSquare,
      marke: "Kostenlos und unverbindlich",
      titel: "Anlage einbringen oder anfragen",
      text: "Ob Solarpark, Speicher oder Stromverbrauch im Mittelstand: Wir prüfen, welche Rolle Ihre Anlage oder Ihr Unternehmen im virtuellen Kraftwerk spielen kann.",
      href: "/kontakt?anliegen=reststrom",
      label: "Anfrage stellen",
      primaer: false,
    },
  ];
  return (
    <Section tone="navy" space="lg" bare id="anfrage" data-abschnitt="einstieg" aria-labelledby="einstieg-titel" className="ov-verlauf-nacht ov-noise scroll-mt-24 overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_20%_30%,#000,transparent)]" />
      <div className="ov-container relative">
        <Kopf
          dark
          align="center"
          id="einstieg-titel"
          eyebrow="Teil des Verbunds werden"
          titel={
            <>
              Anlage einbringen oder <span className="ov-text-gradient-light">Reststrom bündeln?</span>
            </>
          }
          className="mb-12 md:mb-14"
        />
        <ul className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          {WEGE.map((w, i) => (
            <Reveal as="li" key={w.titel} delay={i * 80} dir="scale" className="flex">
              <article className={cn("flex w-full flex-col rounded-[2rem] p-6 sm:p-8", w.primaer ? "bg-white text-ink-900 shadow-e5" : "bg-white/[0.05] text-white ring-1 ring-white/15")}>
                <span aria-hidden="true" className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", w.primaer ? "bg-ov-50 text-ov-600 ring-1 ring-ov-200" : "bg-white/[0.08] text-ov-300 ring-1 ring-white/15")}>
                  <w.icon className="h-6 w-6" />
                </span>
                <p className={cn("mt-5 text-[12.5px] font-semibold uppercase tracking-[0.14em]", w.primaer ? "text-ov-700" : "text-ov-300")}>{w.marke}</p>
                <h3 className={cn("mt-1 font-display text-[22px] font-bold leading-snug", w.primaer ? "text-ink-900" : "text-white")}>{w.titel}</h3>
                <p className={cn("mt-2 flex-1 text-[15.5px] leading-relaxed", w.primaer ? "text-ink-600" : "text-white/70")}>{w.text}</p>
                <div className="mt-7">
                  <Button href={w.href} size="lg" pfeil variant={w.primaer ? "primary" : "outlineLight"} className="w-full sm:w-auto">
                    {w.label}
                  </Button>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}
