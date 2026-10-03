// Hero /genossenschaft – dunkle Bühne; rechts das Prinzip „Ein Mitglied, eine Stimme“ als Grafik
// (1 Anteil vs. 20 Anteile – beide eine Stimme) und der Status „im Aufbau“.
import { Building2, Check, Hourglass, Landmark, Sprout, Users } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import TextEnthuellung from "@/components/motion/TextEnthuellung";
import f from "@/components/Energie/fluss.module.css";

// Bewegung (einmalig beim Laden): Mitglied A legt 1 Anteil, Mitglied B 20 Anteile – die Kästchen füllen sich –,
// danach erscheint bei beiden gleichzeitig dieselbe „1“. Genau das ist die Botschaft: Einlage ≠ Stimmgewicht.

const PUNKTE = ["Beteiligung an Parks der Region", "Ein Mitglied, eine Stimme", "Landwirte als Mitglieder", "Interesse unverbindlich melden"];
const GRUPPEN = [
  { icon: Users, label: "Bürger" },
  { icon: Sprout, label: "Landwirte" },
  { icon: Landmark, label: "Gemeinden" },
  { icon: Building2, label: "Betriebe" },
];
const BEISPIEL = [
  { wer: "Mitglied A", anteile: 1 },
  { wer: "Mitglied B", anteile: 20 },
];

function Stimmen() {
  return (
    <div className="rounded-[1.75rem] bg-white p-5 text-ink-900 shadow-e4 ring-1 ring-white/20 sm:p-7">
      <p className="ov-overline text-ov-700">Mitbestimmung</p>
      <p className="mt-2 font-display text-[22px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[26px]">Ein Mitglied, eine Stimme</p>
      <p className="mt-1 text-[14px] text-ink-500">in der Generalversammlung – unabhängig von der Höhe der Einlage</p>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-b border-ink-100 pb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400">
        <span>Anteile</span>
        <span>Stimme</span>
      </div>
      <ul className="ov-sofort divide-y divide-ink-100" style={{ "--ov-delay": "650ms" }}>
        {BEISPIEL.map((m) => (
          <li key={m.wer} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-4">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-ink-700">
                {m.wer} · <span className="ov-num">{m.anteile}</span> {m.anteile === 1 ? "Anteil" : "Anteile"}
              </p>
              <div aria-hidden="true" className="mt-2 flex flex-wrap gap-1">
                {Array.from({ length: m.anteile }, (_, i) => (
                  <span key={i} className={cn(f.pop, "h-3.5 w-3.5 rounded-[4px] bg-navy-600/85 sm:h-4 sm:w-4")} style={{ "--i": i }} />
                ))}
              </div>
            </div>
            <span className={cn(f.pop, "flex h-11 w-11 items-center justify-center rounded-full bg-ov-600 font-display text-[18px] font-extrabold text-white shadow-[0_8px_20px_-8px_rgba(102,153,51,0.8)]")} style={{ "--ov-delay": "1350ms" }}>
              1<span className="sr-only"> Stimme</span>
            </span>
          </li>
        ))}
      </ul>

      <ul className="mt-4 grid grid-cols-4 gap-2 border-t border-ink-100 pt-5">
        {GRUPPEN.map((g) => (
          <li key={g.label} className="flex flex-col items-center gap-1.5 text-center">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-ov-100">
              <g.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[12px] font-semibold text-ink-700">{g.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Hero() {
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-24 pt-6 sm:pt-8 md:pb-32 md:pt-10">
        <Breadcrumbs items={[{ name: "Genossenschaft" }]} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-x-14 xl:gap-x-20">
          <div className="max-w-[36rem]">
            <p className="ov-hero-in inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15" style={{ "--ov-delay": "40ms" }}>
              <span className="inline-flex items-center gap-1 rounded-full bg-sun-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">
                <Hourglass aria-hidden="true" className="h-3 w-3" />
                Im Aufbau
              </span>
              Energiegenossenschaft
            </p>

            <h1 id="hero-titel" className="ov-h1 mt-6 text-balance md:mt-8">
              <TextEnthuellung verzoegerung={80}>
                Miteigentümer werden – <span className="ov-text-gradient-light">nicht nur Nachbar.</span>
              </TextEnthuellung>
            </h1>

            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 [hyphens:manual] md:mt-6" style={{ "--ov-delay": "180ms" }}>
              Wir bauen eine Energiegenossenschaft auf, über die sich Bürger, Landwirte, Gemeinden und Unternehmen an den Solarparks der Region beteiligen können. <span className="font-medium text-white">Ein Mitglied, eine Stimme – unabhängig von der Höhe der Einlage.</span>
            </p>

            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <Button href="#interesse" size="lg" pfeil magnetisch className="w-full sm:w-auto">Interesse registrieren</Button>
              <Button href="#risiken" size="lg" variant="outlineLight" className="w-full sm:w-auto">Risiken ansehen</Button>
            </div>
            <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
              Noch keine Zeichnung von Anteilen · Registrierte Interessenten erhalten die Unterlagen zuerst
            </p>

            <div className="ov-hero-in mt-9 border-t border-white/10 pt-7 md:mt-10" style={{ "--ov-delay": "360ms" }}>
              <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {PUNKTE.map((x) => (
                  <li key={x} className="flex items-start gap-2.5 text-[14px] leading-snug text-white/85">
                    <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                      <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <figure className={cn("ov-hero-in relative mx-auto w-full max-w-[520px] lg:mx-0 lg:ml-auto")} style={{ "--ov-delay": "200ms" }}>
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
            <div aria-hidden="true" className="absolute inset-x-6 -bottom-3 top-6 -z-10 rotate-[-2deg] rounded-[1.75rem] bg-white/[0.06] ring-1 ring-white/10" />
            <Stimmen />
            <figcaption className="mt-5 text-center text-[12px] text-white/60 lg:text-right">Schematische Darstellung des Stimmrechts</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
