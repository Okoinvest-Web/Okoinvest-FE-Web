// Seitenkopf der EG-Angebotsseiten (Welle 3, Paket B7: Preisblatt, White-Label) – gleiche Bühne wie der
// Hero von /energiegemeinschaften/software (ov-verlauf-nacht, Raster, Lichtkante, Brotkrumen dunkel),
// rechts statt der Produktbühne ein Steckbrief als Glaskarte. Server-Komponente, Texte kommen von der Seite.
import { Check, MapPin } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

/**
 * @param {{ brotkrumen: {name: string, href?: string}[], marke: string, eyebrow: string, titel: any, lead: any,
 *   aktionen?: {label: string, href: string, variant?: string}[], fussnote?: string, punkte?: string[],
 *   karte?: { titel: string, zeilen: [string, string][] , hinweis?: string } }} p
 */
export default function Kopf({ brotkrumen, marke, eyebrow, titel, lead, aktionen = [], fussnote, punkte = [], karte }) {
  return (
    <section data-abschnitt="hero" aria-labelledby="kopf-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-20 pt-6 sm:pt-8 md:pb-28 md:pt-10">
        <Breadcrumbs items={brotkrumen} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-x-14 xl:gap-x-20">
          <div className="min-w-0 max-w-[38rem]">
            {/* Länderkennung: Das Angebot gilt für Österreich – auch auf der gemeinsamen Seite sichtbar */}
            <p className="ov-hero-in inline-flex max-w-full items-center gap-2 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15" style={{ "--ov-delay": "40ms" }}>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">
                <MapPin aria-hidden="true" className="h-3 w-3" />
                {marke}
              </span>
              <span className="min-w-0 truncate">{eyebrow}</span>
            </p>

            <h1 id="kopf-titel" className="ov-h1 ov-hero-in mt-6 text-balance md:mt-8" style={{ "--ov-delay": "100ms" }}>
              {titel}
            </h1>
            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 [hyphens:manual] md:mt-6" style={{ "--ov-delay": "180ms" }}>
              {lead}
            </p>

            {aktionen.length > 0 && (
              <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
                {aktionen.map((a, i) => (
                  <Button key={a.href} href={a.href} size="lg" pfeil={i === 0} magnetisch={i === 0} variant={a.variant || (i === 0 ? "primary" : "outlineLight")} className="w-full sm:w-auto">
                    {a.label}
                  </Button>
                ))}
              </div>
            )}
            {fussnote && (
              <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
                {fussnote}
              </p>
            )}
            {punkte.length > 0 && (
              <ul className="ov-hero-in mt-9 grid gap-x-6 gap-y-3 border-t border-white/10 pt-7 sm:grid-cols-2 md:mt-10" style={{ "--ov-delay": "360ms" }}>
                {punkte.map((x, i) => (
                  <li key={i} className={cn("flex items-start gap-2.5 text-[14px] leading-snug text-white/85", i > 1 && "max-sm:hidden")}>
                    <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                      <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {karte && (
            <div className="ov-hero-in relative min-w-0" style={{ "--ov-delay": "220ms" }}>
              <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
              <div className="rounded-[2rem] bg-white/[0.06] p-6 ring-1 ring-inset ring-white/15 backdrop-blur-sm sm:p-8">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">{karte.titel}</p>
                <dl className="mt-5 divide-y divide-white/10">
                  {karte.zeilen.map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                      <dt className="text-[14.5px] text-white/70">{k}</dt>
                      <dd className="text-[15px] font-semibold text-white sm:text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                {karte.hinweis && <p className="mt-4 border-t border-white/10 pt-4 text-[13px] leading-relaxed text-white/65">{karte.hinweis}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
