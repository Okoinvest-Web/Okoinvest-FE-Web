// Karte eines Projekts in der Börse (öffentlich und im Portal). Nur Teaser-Felder.

import Link from "next/link";
import { ArrowUpRight, MapPin, Zap } from "lucide-react";
import { cn } from "@/components/ui/cn";
import TypIllustration from "./TypIllustration";
import { QualitaetsBalken } from "@/components/Portal/ui";
import { LAENDER, NETZANSCHLUSS, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { mwp, preisText } from "@/lib/plattform/format";
import { statusLabel } from "@/lib/plattform/prozesse";
import { phaseById, PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

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
      {p.kurz}
    </span>
  );
}

export default function ProjektKarte({ projekt: p, href, extra, aktion, className }) {
  const reserviert = p.status === "reserviert";
  return (
    <article className={cn("group ov-card-hover relative flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70 hover:ring-ov-200", className)}>
      <div className="relative h-36 overflow-hidden">
        <TypIllustration typ={p.typ} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]" />
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <PhaseBadge phase={p.phase} />
          <span className="flex flex-wrap justify-end gap-1.5">
            {reserviert && <span className="rounded-full bg-navy-900 px-2.5 py-1 text-[12px] font-semibold text-white">{statusLabel("projekt", "reserviert")}</span>}
            {p.demo && <span className="rounded-full bg-sun-400 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide text-navy-950">Demo</span>}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">{PROJEKT_TYPEN[p.typ]}</p>
        <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-ink-500">
          <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {[p.region, p.bundesland, LAENDER[p.land]].filter(Boolean).join(" · ")}
        </p>
        <h3 className="mt-2 font-display text-[18px] font-bold leading-snug text-ink-900">
          <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:underline">
            {p.titel}
          </Link>
        </h3>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-ink-100 py-3.5">
          <div className="min-w-0">
            <dt className="text-[11.5px] text-ink-500">Leistung</dt>
            <dd className="ov-num mt-0.5 font-display text-[17px] font-extrabold text-ink-900">{p.typ === "speicher" ? `${fmt(p.mwp, p.mwp < 10 ? 1 : 0)} MW` : mwp(p.mwp)}{p.mwhSpeicher ? <span className="ml-1 text-[13px] font-semibold text-ink-500">/ {fmt(p.mwhSpeicher)} MWh</span> : null}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11.5px] text-ink-500">Preisindikation</dt>
            <dd className="mt-0.5 font-display text-[17px] font-extrabold text-ink-900">{preisText(p)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[13px] leading-snug text-ink-600">
          <Zap aria-hidden="true" className="-mt-0.5 mr-1 inline h-3.5 w-3.5 text-ov-600" />{NETZANSCHLUSS[p.netzanschluss] || "Netzanschluss offen"}
          {p.codGeplant && <span className="text-ink-400"> · COD {p.codGeplant}</span>}
        </p>
        {typeof p.datenraumQualitaet === "number" && (
          <div className="mt-3">
            <QualitaetsBalken quote={p.datenraumQualitaet} klein />
          </div>
        )}
        {extra && <div className="mt-3">{extra}</div>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-ov-700">
            Exposé ansehen <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
          {aktion && <div className="relative z-10">{aktion}</div>}
        </div>
      </div>
    </article>
  );
}
