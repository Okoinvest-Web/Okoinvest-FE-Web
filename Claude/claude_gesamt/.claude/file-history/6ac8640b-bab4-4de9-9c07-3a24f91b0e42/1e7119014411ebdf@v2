"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Factory, FolderUp, LineChart, MapPinned, Tractor } from "lucide-react";
import { cn } from "@/components/ui/cn";

/**
 * Weiche im Hero: Wer sind Sie? → passender Nutzen, drei Fakten, zwei Wege.
 * Echte Tabs (Pfeiltasten, aria-selected), serverseitig mit erster Gruppe gerendert.
 */
const GRUPPEN = [
  {
    id: "flaeche",
    label: "Fläche",
    lang: "Ich habe eine Fläche",
    icon: MapPinned,
    titel: "Planbare Pacht für 30 Jahre – ohne eigenes Risiko.",
    punkte: ["Kostenloser Flächencheck mit Pachtspanne", "Festpacht, indexiert oder mit Umsatzbeteiligung", "Rückbau vertraglich abgesichert"],
    primaer: { label: "Fläche prüfen", href: "/flaechencheck" },
    sekundaer: { label: "Pachtrechner", href: "/rechner/pacht" },
  },
  {
    id: "landwirt",
    label: "Landwirt",
    lang: "Ich bin Landwirt",
    icon: Tractor,
    titel: "Ernten und Strom erzeugen – auf demselben Acker.",
    punkte: ["Agri-PV nach DIN SPEC 91434", "Verpachten, selbst investieren oder beteiligen", "Direktzahlungen bleiben weitgehend erhalten"],
    primaer: { label: "Welcher Weg passt?", href: "/landwirte" },
    sekundaer: { label: "Agri-PV-Rechner", href: "/rechner/agri-pv" },
  },
  {
    id: "investor",
    label: "Investor",
    lang: "Ich möchte investieren",
    icon: LineChart,
    titel: "Geprüfte PV-Projekte – von Projektrechten bis Bestand.",
    punkte: ["Suchprofil mit automatischem Matching", "NDA und Datenraum digital", "Für Investoren kostenfrei"],
    primaer: { label: "Zur Projektbörse", href: "/projektboerse" },
    sekundaer: { label: "Renditerechner", href: "/rechner/solarpark" },
  },
  {
    id: "anbieter",
    label: "Anbieter",
    lang: "Ich biete ein Projekt an",
    icon: FolderUp,
    titel: "Ihr Projekt vor den richtigen Käufern im DACH-Raum.",
    punkte: ["Qualitätsprüfung vor Veröffentlichung", "Vertraulich bis zur NDA-Freigabe", "Provision nur bei Abschluss"],
    primaer: { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
    sekundaer: { label: "Projekt bewerten", href: "/rechner/projektbewertung" },
  },
  {
    id: "unternehmen",
    label: "Firma",
    lang: "Ich brauche günstigen Strom",
    icon: Factory,
    titel: "Reststrom gemeinsam einkaufen – statt allein zu zahlen.",
    punkte: ["Bündelung im virtuellen Kraftwerk", "Solarstrom aus Parks der Gruppe", "Passt zu Ihrer PV und Ihrem Speicher"],
    primaer: { label: "Ersparnis berechnen", href: "/rechner/reststrom" },
    sekundaer: { label: "So funktioniert der Pool", href: "/reststrom" },
  },
];

export default function ZielgruppenWahl() {
  const basis = useId();
  const [aktiv, setAktiv] = useState(0);
  const g = GRUPPEN[aktiv];

  function taste(e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (aktiv + (e.key === "ArrowRight" ? 1 : GRUPPEN.length - 1)) % GRUPPEN.length;
    setAktiv(n);
    document.getElementById(`${basis}-tab-${n}`)?.focus();
  }

  return (
    <div className="ov-glass rounded-[2rem] p-3 shadow-2xl sm:p-4">
      <p className="px-3 pb-3 pt-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/60">Wer sind Sie?</p>
      <div role="tablist" aria-label="Zielgruppe wählen" onKeyDown={taste} className="grid grid-cols-5 gap-1 rounded-2xl bg-navy-950/60 p-1">
        {GRUPPEN.map((x, i) => {
          const an = i === aktiv;
          return (
            <button
              key={x.id}
              id={`${basis}-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={an}
              aria-controls={`${basis}-panel`}
              tabIndex={an ? 0 : -1}
              onClick={() => setAktiv(i)}
              className={cn(
                "flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-0.5 py-2 text-[11px] font-semibold transition-all duration-300 sm:text-[12.5px]",
                an ? "bg-white text-navy-900 shadow-lg" : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <x.icon aria-hidden="true" className={cn("h-5 w-5", an ? "text-ov-600" : "")} />
              <span className="leading-none">{x.label}</span>
            </button>
          );
        })}
      </div>

      <div id={`${basis}-panel`} role="tabpanel" aria-labelledby={`${basis}-tab-${aktiv}`} key={g.id} className="ov-tab-panel rounded-3xl bg-white p-6 text-ink-900 sm:p-7 mt-3">
        <p className="text-[13px] font-semibold text-ov-700">{g.lang}</p>
        <p className="mt-2 font-display text-[clamp(1.3rem,1.1rem+0.6vw,1.6rem)] font-extrabold leading-tight tracking-tight">{g.titel}</p>
        <ul className="mt-5 space-y-2.5">
          {g.punkte.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[15px] text-ink-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ov-500 text-white">
                <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link href={g.primaer.href} className="group inline-flex h-12 items-center sm:flex-1 justify-center gap-2 rounded-full bg-ov-600 px-5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700">
            {g.primaer.label}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href={g.sekundaer.href} className="inline-flex h-12 items-center justify-center rounded-full px-5 sm:flex-1 text-[15px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50">
            {g.sekundaer.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
