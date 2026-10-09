// Karte eines Projekts in der Börse (öffentlich und im Portal). Nur Teaser-Felder.

import Link from "@/components/Land/Link";
import { ArrowUpRight, MapPin, Zap } from "lucide-react";
import { cn } from "@/components/ui/cn";
import TypIllustration, { varianteAus } from "./TypIllustration";
import { QualitaetsBalken } from "@/components/Portal/ui";
import { LAENDER, NETZANSCHLUSS, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { mwp, preisText } from "@/lib/plattform/format";
import { statusLabel } from "@/lib/plattform/prozesse";
import { phaseById, PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import T from "@/components/Sprache/T";
import { BEGRIFFE_EN, mwpEn, preisTextEn } from "@/lib/sprache/begriffe";
import { fmtZahl } from "@/lib/sprache/format";

export function PhaseBadge({ phase, className, dunkel = false }) {
  const p = phaseById(phase);
  const idx = PHASEN.findIndex((x) => x.id === p.id);
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-semibold", dunkel ? "bg-white/10 text-white" : "bg-white/95 text-ink-800 shadow-sm ring-1 ring-ink-200/70", className)}>
      <span aria-hidden="true" className="flex gap-0.5">
        {PHASEN.map((x, i) => (
          <span key={x.id} className={cn("h-2.5 w-1 rounded-full", i <= idx ? "bg-ov-500" : dunkel ? "bg-white/25" : "bg-ink-200")} />
        ))}
      </span>
      <T de={p.kurz} en={BEGRIFFE_EN.phaseKurz[p.id]} />
    </span>
  );
}

export default function ProjektKarte({ projekt: p, href, extra, aktion, className }) {
  const reserviert = p.status === "reserviert";
  return (
    <article className={cn("group ov-card-hover relative flex h-full flex-col rounded-3xl bg-white shadow-e1 ring-1 ring-ink-200/70 hover:ring-ov-200", className)}>
      <div className="relative h-28 overflow-hidden rounded-t-3xl sm:h-36">
        <TypIllustration typ={p.typ} variante={varianteAus(p.id || p.slug)} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04] group-focus-within:scale-[1.04] motion-reduce:transition-none" />
        {/* Lichtkante: gleitet bei Hover/Fokus einmal über das Motiv (nur transform, bei reduzierter Bewegung aus) */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 transition-[transform,opacity] duration-700 ease-out group-hover:translate-x-[320%] group-hover:opacity-100 group-focus-within:translate-x-[320%] group-focus-within:opacity-100 motion-reduce:hidden" />
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <PhaseBadge phase={p.phase} />
          <span className="flex flex-wrap justify-end gap-1.5">
            {reserviert && <span className="rounded-full bg-navy-900 px-2.5 py-1 text-[12px] font-semibold text-white"><T de={statusLabel("projekt", "reserviert")} en={BEGRIFFE_EN.projektStatus.reserviert} /></span>}
            {p.demo && <span className="rounded-full bg-sun-400 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide text-navy-950">Demo</span>}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ov-700"><T de={PROJEKT_TYPEN[p.typ]} en={BEGRIFFE_EN.projektTyp[p.typ]} /></p>
        <h3 className="mt-1.5 font-display text-[18px] font-bold leading-snug text-ink-900">
          <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:underline focus-visible:after:ring-2 focus-visible:after:ring-ov-500">
            {p.titel}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-ink-500">
          <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <T de={[p.region, p.bundesland, LAENDER[p.land]].filter(Boolean).join(" · ")} en={[p.region, p.bundesland, BEGRIFFE_EN.land[p.land]].filter(Boolean).join(" · ")} />
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-ink-100 transition-colors duration-300 group-hover:ring-ov-200">
          <div className="min-w-0 bg-sand-50 px-3.5 py-3">
            <dt className="text-[11.5px] text-ink-500"><T de="Leistung" en="Capacity" /></dt>
            <dd className="ov-num mt-0.5 font-display text-[18px] font-extrabold leading-tight text-ink-900"><T de={p.typ === "speicher" ? `${fmt(p.mwp, p.mwp < 10 ? 1 : 0)} MW` : mwp(p.mwp)} en={p.typ === "speicher" ? `${fmtZahl(p.mwp, p.mwp < 10 ? 1 : 0, "en")} MW` : mwpEn(p.mwp)} />{p.mwhSpeicher ? <span className="ml-1 text-[13px] font-semibold text-ink-500">/ <T de={fmt(p.mwhSpeicher)} en={fmtZahl(p.mwhSpeicher, 0, "en")} /> MWh</span> : null}</dd>
          </div>
          <div className="min-w-0 bg-sand-50 px-3.5 py-3">
            <dt className="text-[11.5px] text-ink-500"><T de="Preisindikation" en="Price indication" /></dt>
            <dd className="mt-0.5 font-display text-[18px] font-extrabold leading-tight text-ink-900"><T de={preisText(p)} en={preisTextEn(p)} /></dd>
          </div>
        </dl>
        <p className="mt-3.5 text-[13px] leading-snug text-ink-600">
          <Zap aria-hidden="true" className="-mt-0.5 mr-1 inline h-3.5 w-3.5 text-ov-600" /><T de={NETZANSCHLUSS[p.netzanschluss] || "Netzanschluss offen"} en={BEGRIFFE_EN.netzanschluss[p.netzanschluss] || "Grid connection open"} />
          {p.codGeplant && <span className="text-ink-500"> · COD {p.codGeplant}</span>}
        </p>
        {typeof p.datenraumQualitaet === "number" && (
          <div className="mt-3">
            <QualitaetsBalken quote={p.datenraumQualitaet} klein label={<T de="Datenraum-Qualität" en="Data room quality" />} labelId={`dq-${p.id || p.slug}`} />
          </div>
        )}
        {extra && <div className="mt-3">{extra}</div>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-ov-700">
            <T de="Exposé ansehen" en="View exposé" />
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200 transition-colors group-hover:bg-ov-600 group-hover:text-white group-hover:ring-ov-600">
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px motion-reduce:transition-none" />
            </span>
          </span>
          {aktion && <div className="relative z-10">{aktion}</div>}
        </div>
      </div>
    </article>
  );
}
