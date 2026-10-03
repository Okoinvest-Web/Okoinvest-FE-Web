// Provision – transparent: Rollenkacheln + Beispielrechnung als Balken, darunter die Werkzeuge
import Link from "next/link";
import { ArrowUpRight, BadgePercent, LineChart, Scale, Sprout } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { cn } from "@/components/ui/cn";
import { PHASEN, PROVISION } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

const rtb = PHASEN.find((p) => p.id === "rtb");
const BEISPIEL = { mwp: 20, preis: Math.round((rtb.preisProKwp.min + rtb.preisProKwp.max) / 2) };
const kaufpreis = BEISPIEL.mwp * 1000 * BEISPIEL.preis;

const WERKZEUGE = [
  { href: "/rechner/solarpark", icon: LineChart, titel: "Solarpark-Renditerechner", text: "Projekt- und EK-IRR, LCOE, DSCR und Cashflow über 30 Jahre – mit Sensitivitätsmatrix." },
  { href: "/rechner/projektbewertung", icon: Scale, titel: "Projektbewertung", text: "Kaufpreisspanne je kWp nach Phase, Netzanschluss, Größe und Vermarktung." },
];

export default function Provision() {
  const rollen = [
    { icon: LineChart, titel: "Investoren", wert: "0 €", text: PROVISION.kaeufer.text, hervor: true },
    { icon: BadgePercent, titel: "Verkäufer", wert: `${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} %`, text: PROVISION.verkaeufer.text },
    { icon: Sprout, titel: "Flächeneigentümer", wert: "0 €", text: PROVISION.flaeche.text },
  ];
  const anteilMax = PROVISION.verkaeufer.max * 100;
  return (
    <section data-abschnitt="provision" aria-labelledby="provision-titel" className="bg-white py-20 md:py-28">
      <div className="ov-container">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <SectionHeading
            eyebrow="Provision – transparent"
            title={<span id="provision-titel">Für Investoren kostenfrei. Punkt.</span>}
            lead="Wir verdienen erst, wenn ein Projekt den Besitzer wechselt – und dann zahlt der Verkäufer. So bleibt unser Interesse klar: passende Projekte, die auch wirklich gebaut werden."
          />

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {rollen.map((k, i) => (
                <Reveal key={k.titel} delay={i * 70} className={cn("relative overflow-hidden rounded-3xl p-5", k.hervor ? "bg-ov-700 text-white" : "bg-sand-50 ring-1 ring-ink-200/70")}>
                  {k.hervor && <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-ov-400/40 blur-2xl" />}
                  <div className="relative flex items-center gap-2">
                    <k.icon aria-hidden="true" className={cn("h-4 w-4", k.hervor ? "text-ov-200" : "text-ov-600")} />
                    <p className={cn("text-[13px] font-semibold", k.hervor ? "text-white/90" : "text-ink-600")}>{k.titel}</p>
                  </div>
                  <p className="ov-kpi relative mt-3">{k.wert}</p>
                  <p className={cn("relative mt-1.5 text-[13.5px] leading-relaxed", k.hervor ? "text-white/85" : "text-ink-600")}>{k.text}</p>
                </Reveal>
              ))}
            </div>

            {/* Beispielrechnung */}
            <Reveal delay={200} className="rounded-3xl bg-white p-5 shadow-e2 ring-1 ring-ink-200/70 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">Rechenbeispiel</p>
                <p className="text-[13px] text-ink-600">{BEISPIEL.mwp} MWp baureif zu {fmt(BEISPIEL.preis)} €/kWp</p>
              </div>
              <p className="ov-num mt-2 font-display text-[26px] font-extrabold tracking-tight text-ink-900">
                {fmtEur(kaufpreis)} <span className="text-[14px] font-bold text-ink-500">Kaufpreis</span>
              </p>
              <div className="relative mt-4 h-4 overflow-hidden rounded-full bg-ov-100" aria-hidden="true">
                <span className="absolute inset-y-0 right-0 bg-sun-400" style={{ width: `${anteilMax * 4}%` }} />
                <span className="absolute inset-y-0 right-0 bg-sun-500" style={{ width: `${(PROVISION.verkaeufer.min * 100) * 4}%` }} />
              </div>
              <div className="mt-2 flex justify-between gap-4 text-[12px] text-ink-500" aria-hidden="true">
                <span>Kaufpreis an den Verkäufer</span>
                <span>Provision (vergrößert dargestellt)</span>
              </div>
              <p className="mt-4 border-t border-ink-100 pt-4 text-[14px] leading-relaxed text-ink-700">
                Die Provision von <strong className="font-semibold text-ink-900">{fmtEur(kaufpreis * PROVISION.verkaeufer.min)}</strong> bis <strong className="font-semibold text-ink-900">{fmtEur(kaufpreis * PROVISION.verkaeufer.max)}</strong> trägt der Verkäufer, nur bei Abschluss. Sie zahlen als Käufer: <strong className="font-semibold text-ov-700">0&nbsp;€</strong>.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Werkzeuge */}
        <div className="mt-16 md:mt-20">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <h3 className="ov-h3 text-ink-900">Rechnen Sie selbst</h3>
            <p className="text-[14px] text-ink-500">Zwei Werkzeuge für Ihre Kalkulation</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {WERKZEUGE.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group relative isolate flex items-start gap-5 overflow-hidden rounded-3xl bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 transition-[box-shadow,transform] duration-300 hover:shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 motion-safe:hover:-translate-y-1 md:p-7"
              >
                <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 h-44 w-44 rounded-full bg-ov-200/50 opacity-60 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200 transition-colors group-hover:bg-ov-600 group-hover:text-white">
                  <t.icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3 font-display text-[19px] font-bold text-ink-900">
                    {t.titel}
                    <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-400 transition-colors group-hover:text-ov-700" />
                  </span>
                  <span className="mt-1.5 block text-[14.5px] leading-relaxed text-ink-600">{t.text}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
