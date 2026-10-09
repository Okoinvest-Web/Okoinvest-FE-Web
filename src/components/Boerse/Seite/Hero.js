// Hero der Projektbörse – gleiche Bühnensprache wie /energiegemeinschaften/software
import { ArrowDown, Check } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import Link from "@/components/Land/Link";
import ExposeBuehne from "./ExposeBuehne";
import { spracheDerAnfrage } from "@/lib/land/seite";

const VERSPRECHEN = ["Für Investoren kostenfrei", "Anonym bis zur NDA", "Datenraum mit Protokoll", "Provision nur bei Erfolg"];
const VERSPRECHEN_EN = ["Free of charge for investors", "Anonymous until the NDA", "Data room with access log", "Commission only on success"];

// Sprachmodell: Titel, Lead, Aktionen usw. übersetzt die aufrufende Seite; Standardtexte hier je Sprache.
export default function Hero({ breadcrumbs, pill, titel, lead, aktionen, hinweis, unten, buehne, bildunterschrift: bildProp, versprechen: versprechenProp }) {
  const en = spracheDerAnfrage() === "en";
  const bildunterschrift = bildProp ?? (en ? "Example view with fictitious figures" : "Beispielansicht mit fiktiven Werten");
  const versprechen = versprechenProp ?? (en ? VERSPRECHEN_EN : VERSPRECHEN);
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-24 pt-6 sm:pt-8 md:pb-32 md:pt-10">
        <Breadcrumbs items={breadcrumbs} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid grid-cols-1 items-center gap-y-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-x-12 xl:gap-x-16">
          <div className="max-w-[36rem]">
            {pill && (
              <Link
                href={pill.href}
                className="ov-hero-in group inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                style={{ "--ov-delay": "40ms" }}
              >
                <span className="shrink-0 rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">{pill.marke}</span>
                <span className="min-w-0 truncate">{pill.text}</span>
                <ArrowDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ov-300 transition-transform duration-200 group-hover:translate-y-0.5 motion-reduce:transition-none" />
              </Link>
            )}

            <h1 id="hero-titel" className="ov-h1 ov-hero-in mt-6 text-balance md:mt-8" style={{ "--ov-delay": "100ms" }}>
              {titel}
            </h1>
            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
              {lead}
            </p>

            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              {aktionen.map((a, i) => (
                <Button key={a.href} href={a.href} size="lg" pfeil={i === 0} magnetisch={i === 0} variant={i === 0 ? "primary" : "outlineLight"} className="w-full sm:w-auto">
                  {a.label}
                </Button>
              ))}
            </div>
            {hinweis && (
              <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>{hinweis}</p>
            )}

            <div className="ov-hero-in mt-9 border-t border-white/10 pt-7 md:mt-10" style={{ "--ov-delay": "360ms" }}>
              <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {versprechen.map((x, i) => (
                  <li key={x} className={cn("flex items-start gap-2.5 text-[14px] leading-snug text-white/85", i > 1 && "max-sm:hidden")}>
                    <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                      <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
              {unten}
            </div>
          </div>

          <figure className="ov-hero-in relative mx-auto w-full max-w-[600px] lg:mx-0 lg:max-w-none" style={{ "--ov-delay": "220ms" }}>
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
            {buehne || <ExposeBuehne />}
            <figcaption className="mt-8 text-center text-[12px] text-white/60">
              {bildunterschrift}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

