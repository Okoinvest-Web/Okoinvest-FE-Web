// Hero der Seite /dachflaeche-verpachten – Nachtbühne wie die Referenzseite
import { Calculator, Check } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { TextEnthuellung } from "@/components/motion";
import DachBuehne from "./DachBuehne";
import { pfad } from "@/lib/land";

const PUNKTE = ["Prüfung & Angebot kostenfrei", "Pacht, Dachstrom oder Sanierung", "Statik und Brandschutz geprüft", "Status jederzeit im Portal"];

export default function Hero({ bsp, m2, laufzeit }) {
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-10 -z-10 h-[520px] w-[520px] rounded-full bg-sun-300/10 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-24 pt-6 sm:pt-8 md:pb-32 md:pt-10">
        <Breadcrumbs items={[{ name: "Dachfläche verpachten" }]} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-x-10 xl:gap-x-14">
          <div className="max-w-[36rem]">
            <p className="ov-hero-in inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300" style={{ "--ov-delay": "40ms" }}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-300" />
              Für Dacheigentümer
            </p>
            <h1 id="hero-titel" className="ov-h1 mt-5 text-balance md:mt-6">
              <TextEnthuellung verzoegerung={80}>
                Dachfläche verpachten. <span className="ov-text-gradient-light">Sie kassieren die Pacht.</span>
              </TextEnthuellung>
            </h1>
            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
              Verpachten Sie Gewerbe-, Hallen-, Landwirtschafts- oder Logistikdächer ab rund 1.000 m² für Photovoltaik – als feste Pacht, Einmalzahlung, mit günstigem Dachstrom oder im Tausch gegen ein saniertes Dach. <span className="text-white">Geplant und gebaut von einer Gruppe, die seit 2010 Gewerbedächer belegt.</span>
            </p>

            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <Button href="#anfrage" size="lg" pfeil magnetisch className="w-full sm:w-auto">Dach prüfen lassen</Button>
              <Button href={pfad("/rechner/dachpacht")} size="lg" variant="outlineLight" className="w-full sm:w-auto">Dachpacht berechnen</Button>
            </div>

            <div className="ov-hero-in mt-9 border-t border-white/10 pt-7 md:mt-10" style={{ "--ov-delay": "340ms" }}>
              <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {PUNKTE.map((x, i) => (
                  <li key={x} className={cn("flex items-start gap-2.5 text-[14px] leading-snug text-white/85", i > 1 && "max-sm:hidden")}>
                    <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                      <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-center gap-2 text-[14px] text-white/70">
                <Calculator aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />
                <span>
                  Erst vergleichen?{" "}
                  <a href="#modelle" className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
                    Die fünf Pachtmodelle
                  </a>
                </span>
              </p>
            </div>
          </div>

          <figure className="relative mx-auto w-full max-w-[640px] lg:mx-0 lg:max-w-none">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.2),transparent_70%)] blur-2xl" />
            <DachBuehne bsp={bsp} m2={m2} laufzeit={laufzeit} />
            <figcaption className="mt-6 text-center text-[12px] text-white/60 sm:mt-8">
              Beispielrechnung mit Standardannahmen des Dachpacht-Rechners · Portalansicht beispielhaft
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
