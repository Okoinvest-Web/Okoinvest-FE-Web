// Ladeinfrastruktur & GEIG: Text, Ladeoptionen und eine Stellplatz-Skizze zur GEIG-Regel (jeder 3. Stellplatz vorbereitet, mind. 1 Ladepunkt)
import { BatteryCharging, PlugZap, Sun, Zap } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import Kopf from "@/components/Energie/Seite/Kopf";
import { cn } from "@/components/ui/cn";

function GeigSkizze() {
  const plaetze = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <figure className="rounded-[1.75rem] bg-white/[0.04] p-5 ring-1 ring-white/10 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-[17px] font-bold text-white">Neubau, 12 Stellplätze – was das GEIG verlangt</span>
        <span className="text-[12px] text-white/55">Prinzipskizze</span>
      </figcaption>
      <ul className="mt-5 grid grid-cols-6 gap-2" aria-label="Stellplätze: jeder dritte mit Leitungsinfrastruktur, einer mit Ladepunkt">
        {plaetze.map((n) => {
          const laden = n === 3;
          const leitung = n % 3 === 0;
          return (
            <li
              key={n}
              className={cn(
                "relative flex aspect-[3/4] flex-col items-center justify-end rounded-lg border-2 border-dashed pb-1.5 text-[10.5px] font-semibold",
                laden ? "border-ov-400 bg-ov-500/25 text-ov-100" : leitung ? "border-navy-300/70 bg-navy-400/15 text-navy-100" : "border-white/15 text-white/35"
              )}
            >
              {laden ? <PlugZap aria-hidden="true" className="mb-auto mt-2 h-4 w-4 text-ov-300" /> : leitung ? <Zap aria-hidden="true" className="mb-auto mt-2 h-4 w-4 text-navy-200" /> : null}
              <span className="sr-only">Stellplatz {n}: {laden ? "Ladepunkt" : leitung ? "Leitungsinfrastruktur" : "ohne Vorgabe"}</span>
              <span aria-hidden="true">{n}</span>
            </li>
          );
        })}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-white/75">
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-[3px] border-2 border-dashed border-ov-400 bg-ov-500/40" /> mindestens 1 Ladepunkt
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-[3px] border-2 border-dashed border-navy-300 bg-navy-400/30" /> Leitung für jeden 3. Stellplatz
        </li>
      </ul>
    </figure>
  );
}

export default function Laden({ ac, dc }) {
  const KACHELN = [
    { icon: PlugZap, k: "Leitungsinfrastruktur", v: "jeder 3. Stellplatz", t: "Neubau Nichtwohngebäude, > 6 Stellplätze" },
    { icon: Zap, k: "Mindestens", v: "1 Ladepunkt", t: "Bestand Nichtwohngebäude, > 20 Stellplätze, seit 2025" },
    { icon: BatteryCharging, k: "Speicher", v: "optional", t: "mehr Eigenverbrauch, Lastspitzen kappen" },
    { icon: Sun, k: "Gleichzeitigkeit", v: "tagsüber", t: "wenn Fahrzeuge stehen und die Sonne scheint" },
  ];
  const OPTIONEN = [
    { titel: "AC 11/22 kW", text: `ab rund ${ac} je Ladepunkt`, fuer: "Mitarbeiter und Dienstwagen, die Stunden stehen" },
    { titel: "DC 50–150 kW", text: `ab rund ${dc} je Lader, ohne Netzausbau`, fuer: "Kunden, Flotten mit kurzen Standzeiten, öffentliches Laden" },
    { titel: "Lastmanagement", text: "Solarstrom zuerst, Netzanschluss nicht überlasten", fuer: "verteilt die verfügbare Leistung auf die Ladepunkte" },
  ];
  return (
    <Section tone="navy" space="lg" bare data-abschnitt="laden" aria-labelledby="laden-titel" className="ov-verlauf-nacht ov-noise overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_50%_at_80%_20%,#000,transparent)]" />
      <div className="ov-container relative">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <Kopf
              dark
              id="laden-titel"
              eyebrow="Ladeinfrastruktur & GEIG"
              titel={
                <>
                  Solarstrom <span className="ov-text-gradient-light">direkt ins Auto.</span>
                </>
              }
              lead="AC-Ladepunkte mit 11 oder 22 kW reichen für Mitarbeiter und Dienstwagen, die Stunden stehen. DC-Schnelllader mit 50 bis 150 kW lohnen sich für Kunden, Flotten mit kurzen Standzeiten und öffentliches Laden – brauchen aber mehr Netzanschlussleistung."
            />
            <Reveal className="mt-6">
              <p className="text-[15.5px] leading-relaxed text-white/70">
                Ein Lastmanagement verteilt die verfügbare Leistung auf die Ladepunkte und bevorzugt Solarstrom. Das GEIG verlangt bei neuen Nichtwohngebäuden mit mehr als sechs Stellplätzen
                Leitungsinfrastruktur für jeden dritten Stellplatz und mindestens einen Ladepunkt; bestehende Nichtwohngebäude mit mehr als 20 Stellplätzen brauchen seit 2025 mindestens einen
                Ladepunkt.
              </p>
            </Reveal>
            <ul className="mt-8 grid gap-3">
              {OPTIONEN.map((o, i) => (
                <Reveal as="li" key={o.titel} delay={i * 60} className="flex items-start gap-4 rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
                  <span aria-hidden="true" className="ov-num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-400/15 text-[13px] font-bold text-ov-300 ring-1 ring-ov-300/30">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-[17px] font-bold text-white">{o.titel}</p>
                    <p className="text-[14.5px] text-white/75">{o.text}</p>
                    <p className="mt-0.5 text-[13px] text-white/55">{o.fuer}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>

          <div className="min-w-0 lg:pt-4">
            <Reveal dir="scale">
              <GeigSkizze />
            </Reveal>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
              {KACHELN.map((x, i) => (
                <Reveal key={x.k} delay={i * 50} className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10 sm:p-5">
                  <dt className="flex items-center gap-2 text-[12.5px] text-white/60">
                    <x.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-300" />
                    {x.k}
                  </dt>
                  <dd>
                    <span className="mt-2 block font-display text-[18px] font-extrabold leading-tight text-white sm:text-[20px]">{x.v}</span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-white/60">{x.t}</span>
                  </dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </Section>
  );
}
