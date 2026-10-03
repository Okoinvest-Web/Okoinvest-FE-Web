// Erlösquellen: Tagesprofil, vier Erlöstöpfe, Größenordnung als Spannen-Balken (Annahmen aus lib/invest/markt)
import { Activity, Gauge, Sun, TrendingUp } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import Kopf from "@/components/Energie/Seite/Kopf";
import TagesprofilGrafik, { TagesprofilLegende } from "@/components/Speicher/TagesprofilGrafik";
import { SPEICHER, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const QUELLEN = [
  { icon: TrendingUp, titel: "Arbitrage", markt: "Day-Ahead & Intraday", text: "Laden bei niedrigen oder negativen Preisen, entladen in den Abend- und Morgenspitzen – am Day-Ahead- und Intraday-Markt." },
  { icon: Activity, titel: "Regelenergie", markt: "FCR & aFRR", text: "Primärregelleistung (FCR) und Sekundärregelleistung (aFRR). FCR ist durch den Speicherzubau unter Druck, aFRR war 2025 einer der größten Erlöstöpfe." },
  { icon: Sun, titel: "Solarverschiebung", markt: "nur Co-Location", text: "Am Solarpark: Strom aus Stunden mit Abregelung oder negativen Preisen wird zu besseren Preisen verkauft." },
  { icon: Gauge, titel: "Netzdienlichkeit", markt: "im Aufbau", text: "Flexible Netzanschlussvereinbarungen und künftige Flexibilitätsmärkte können zusätzlichen Wert schaffen – noch im Aufbau." },
];

const mio = (v) => `${fmt(v / 1e6, 1)} Mio. €`;

/** Spanne min–max auf einer Skala 0..skala, Marke bei „mittel“ */
function Spanne({ titel, min, mittel, max, skala, fuss, ton = "gruen" }) {
  const pct = (v) => `${((v / skala) * 100).toFixed(1)}%`;
  const farbe = ton === "gruen" ? "from-ov-500 to-ov-300" : "from-navy-400 to-navy-200";
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[14px] font-semibold text-white/85">{titel}</p>
        <p className="ov-num font-display text-[22px] font-extrabold tracking-tight text-white md:text-[26px]">
          {mio(min)} – {mio(max)}
        </p>
      </div>
      <div className="relative mt-4 h-3 rounded-full bg-white/[0.08]" aria-hidden="true">
        <div className={`absolute inset-y-0 rounded-full bg-gradient-to-r ${farbe}`} style={{ left: pct(min), width: `calc(${pct(max)} - ${pct(min)})` }} />
        <div className="absolute -top-1.5 h-6 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgba(3,18,43,0.9)]" style={{ left: pct(mittel) }} />
      </div>
      <div className="relative mt-2 h-5 text-[12px] text-white/55" aria-hidden="true">
        <span className="absolute left-0">0</span>
        <span className="ov-num absolute -translate-x-1/2 whitespace-nowrap font-semibold text-white/80" style={{ left: pct(mittel) }}>
          mittel {mio(mittel)}
        </span>
      </div>
      <p className="sr-only">Mittlere Annahme {mio(mittel)}.</p>
      <p className="mt-2 text-[13px] text-white/60">{fuss}</p>
    </div>
  );
}

export default function Erloese({ mw, mwh, invest, erloes }) {
  return (
    <Section tone="navy" space="lg" bare data-abschnitt="erloese" aria-labelledby="erloese-titel" className="ov-verlauf-nacht ov-noise overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_50%_at_75%_20%,#000,transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-10 h-[460px] w-[460px] rounded-full bg-ov-500/15 blur-[130px]" />
      <div className="ov-container relative">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
          <Kopf
            dark
            id="erloese-titel"
            eyebrow="Erlösquellen"
            titel={
              <>
                Günstig laden, teuer entladen – <span className="ov-text-gradient-light">und Netzstabilität verkaufen.</span>
              </>
            }
            lead="Ein Speicher verdient an mehreren Märkten gleichzeitig. Ein Vermarkter optimiert die Fahrweise täglich zwischen Börse und Regelenergie."
          />
          <Reveal dir="scale" className="min-w-0 rounded-[2rem] bg-white/[0.04] p-4 shadow-e5 ring-1 ring-white/10 backdrop-blur-sm sm:p-6 md:p-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-300">Ein sonniger Tag</p>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-white/65 ring-1 ring-white/10">schematisch, keine Messdaten</span>
            </div>
            <div tabIndex={0} role="region" aria-label="Schematischer Tagesverlauf eines Speichers" className="overflow-x-auto rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
              <div className="min-w-[520px] px-1">
                <TagesprofilGrafik legende={false} />
              </div>
            </div>
            <TagesprofilLegende className="mt-4 px-1" />
            <p className="mt-3 px-1 text-[12px] text-white/50 sm:hidden">Grafik seitlich wischen</p>
          </Reveal>
        </div>

        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {QUELLEN.map((q, i) => (
            <Reveal as="li" key={q.titel} delay={i * 60} className="group relative flex flex-col rounded-3xl bg-white/[0.04] p-6 ring-1 ring-white/10 transition-colors hover:bg-white/[0.07]">
              <div className="flex items-center justify-between">
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-400/15 text-ov-300 ring-1 ring-ov-300/30">
                  <q.icon className="h-5 w-5" />
                </span>
                <span aria-hidden="true" className="ov-num font-display text-[28px] font-extrabold text-white/10">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-5 font-display text-[19px] font-bold text-white">{q.titel}</h3>
              <p className="mt-1 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-sun-300">{q.markt}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-white/70">{q.text}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-6 overflow-hidden rounded-[2rem] bg-navy-900/60 ring-1 ring-white/10">
          <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
            <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <p className="ov-overline text-ov-300">Größenordnung</p>
              <h3 className="mt-3 font-display text-[22px] font-bold leading-snug text-white md:text-[26px]">
                Beispiel {mw} MW / {mwh} MWh
              </h3>
              <p className="mt-2 text-[15px] text-white/65">2-Stunden-System nach unseren Marktannahmen</p>
              <dl className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
                  <dt className="text-[12.5px] text-white/60">Vollzyklen pro Jahr</dt>
                  <dd className="ov-num mt-1 font-display text-[24px] font-extrabold text-white">{fmt(SPEICHER.zyklenProJahr)}</dd>
                </div>
                <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
                  <dt className="text-[12.5px] text-white/60">Wirkungsgrad (AC)</dt>
                  <dd className="ov-num mt-1 font-display text-[24px] font-extrabold text-white">{fmt(SPEICHER.wirkungsgrad * 100)} %</dd>
                </div>
              </dl>
            </div>
            <div className="grid gap-9 p-6 sm:p-8">
              <Spanne
                titel="Investition"
                min={invest.min}
                mittel={invest.mittel}
                max={invest.max}
                skala={invest.max * 1.15}
                fuss={`${fmt(SPEICHER.capexProKwh.min)}–${fmt(SPEICHER.capexProKwh.max)} €/kWh schlüsselfertig`}
                ton="navy"
              />
              <Spanne
                titel="Erlöse pro Jahr"
                min={erloes.min}
                mittel={erloes.mittel}
                max={erloes.max}
                skala={erloes.max * 1.15}
                fuss="Arbitrage + Regelenergie, stark marktabhängig"
              />
            </div>
          </div>
          <p className="border-t border-white/10 px-6 py-5 text-[12.5px] leading-relaxed text-white/55 sm:px-8">
            Vor Betriebskosten, Vermarktungsentgelt, Degradation, Baukostenzuschuss und Steuern. Die Spanne zeigt, wie stark das Ergebnis vom Markt abhängt – für eine Investitionsentscheidung
            brauchen Sie ein Erlösgutachten und ein Vermarktungsangebot. Stand {STAND}.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
