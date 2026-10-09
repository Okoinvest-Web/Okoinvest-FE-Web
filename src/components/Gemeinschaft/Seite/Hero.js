// Hero /energiegemeinschaften – dunkle Bühne wie /energiegemeinschaften/software; rechts das Netz-Schema
// mit den drei Ländermodellen als Leiste darunter.
import { ArrowRight, Calculator, Check } from "lucide-react";
import Link from "@/components/Land/Link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import TextEnthuellung from "@/components/motion/TextEnthuellung";
import NetzSchema from "./NetzSchema";
import { pfad } from "@/lib/land";
import { spracheDerAnfrage } from "@/lib/land/seite";

/* Sprachmodell: englische Fassung */
const PUNKTE_EN = ["Energy sharing since June 2026", "EEG and BEG in Austria", "LEG in Switzerland since 2026", "Park power for the community"];
const MODELLE_SUB_EN = { DE: "§ 42c EnWG", AT: "EAG / ElWG", CH: "Mantelerlass (omnibus act)" };

const PUNKTE = ["Energy Sharing seit Juni 2026", "EEG und BEG in Österreich", "LEG in der Schweiz seit 2026", "Parkstrom für die Gemeinschaft"];
const MODELLE = [
  { kurz: "DE", name: "Energy Sharing", sub: "§ 42c EnWG" },
  { kurz: "AT", name: "EEG · BEG", sub: "EAG / ElWG" },
  { kurz: "CH", name: "LEG · ZEV · vZEV", sub: "Mantelerlass" },
];

export default function Hero() {
  const en = spracheDerAnfrage() === "en";
  const punkte = en ? PUNKTE_EN : PUNKTE;
  const modelle = en ? MODELLE.map((m) => ({ ...m, name: m.kurz === "DE" ? "Energy sharing" : m.name, sub: MODELLE_SUB_EN[m.kurz] })) : MODELLE;
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-24 pt-6 sm:pt-8 md:pb-32 md:pt-10">
        <Breadcrumbs items={[{ name: en ? "Energy communities" : "Energiegemeinschaften" }]} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-x-12 xl:gap-x-16">
          <div className="max-w-[36rem]">
            <Link
              href={pfad("/energiegemeinschaften/software")}
              className="ov-hero-in group inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
              style={{ "--ov-delay": "40ms" }}
            >
              <span className="shrink-0 rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">AT</span>
              <span className="min-w-0 truncate">
                <span className="sm:hidden">{en ? "Platform & operation" : "Plattform & Betrieb"}</span>
                <span className="max-sm:hidden">{en ? "Platform and operation for communities in Austria" : "Plattform und Betrieb für Gemeinschaften in Österreich"}</span>
              </span>
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ov-300 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>

            <h1 id="hero-titel" className="ov-h1 mt-6 text-balance md:mt-8">
              {en ? (
                <TextEnthuellung verzoegerung={80}>
                  Sharing power in an <span className="ov-text-gradient-light">energy community.</span>
                </TextEnthuellung>
              ) : (
              <TextEnthuellung verzoegerung={80}>
                Strom teilen in der <span className="ov-text-gradient-light">Energie&shy;gemeinschaft.</span>
              </TextEnthuellung>
              )}
            </h1>

            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 [hyphens:manual] md:mt-6" style={{ "--ov-delay": "180ms" }}>
              {en ? (
                <>
                  In all three countries, citizens, municipalities and businesses may now share power from renewable installations – via the public grid. <span className="font-medium text-white">The rules differ considerably.</span> We show what applies where, and supply communities with power from our parks.
                </>
              ) : (
                <>
                  In allen drei Ländern dürfen Bürger, Gemeinden und Betriebe inzwischen Strom aus erneuerbaren Anlagen teilen – über das öffentliche Netz. <span className="font-medium text-white">Die Regeln unterscheiden sich stark.</span> Wir zeigen, was wo gilt, und versorgen Gemeinschaften mit Strom aus unseren Parks.
                </>
              )}
            </p>

            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <Button href="#vergleich" size="lg" pfeil magnetisch className="w-full sm:w-auto">{en ? "Compare countries" : "Länder vergleichen"}</Button>
              <Button href="#anfrage" size="lg" variant="outlineLight" className="w-full sm:w-auto">{en ? "Enquire about a community" : "Gemeinschaft anfragen"}</Button>
            </div>

            <div className="ov-hero-in mt-9 border-t border-white/10 pt-7 md:mt-10" style={{ "--ov-delay": "340ms" }}>
              <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {punkte.map((x, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14px] leading-snug text-white/85">
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
                  {en ? "In Austria?" : "In Österreich?"}{" "}
                  <Link href={pfad("/energiegemeinschaften/rechner")} className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
                    {en ? "Calculate savings" : "Ersparnis rechnen"}
                  </Link>
                </span>
              </p>
            </div>
          </div>

          <figure className="ov-hero-in relative mx-auto w-full max-w-[600px] lg:mx-0 lg:max-w-none" style={{ "--ov-delay": "200ms" }}>
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
            <div className="rounded-[2rem] bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm sm:p-6">
              <NetzSchema dunkel bewegt />
            </div>
            <ul className="relative z-10 mx-0 mt-3 grid sm:-mt-7 sm:mx-8 grid-cols-3 gap-px overflow-hidden rounded-2xl bg-ink-100 shadow-e4 ring-1 ring-white/20">
              {modelle.map((m) => (
                <li key={m.kurz} className="bg-white px-3 py-3 text-ink-900 sm:px-4">
                  <span className="inline-flex h-6 items-center rounded-md bg-navy-950 px-1.5 text-[11px] font-bold text-ov-300">{m.kurz}</span>
                  <span className="mt-1.5 block text-[13px] font-bold leading-tight sm:text-[14px]">{m.name}</span>
                  <span className="block text-[11.5px] text-ink-500 sm:text-[12px]">{m.sub}</span>
                </li>
              ))}
            </ul>
            <figcaption className="mt-5 text-center text-[12px] text-white/60 lg:text-right">{en ? "Schematic: sharing power via the public grid" : "Schema: Strom teilen über das öffentliche Netz"}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
