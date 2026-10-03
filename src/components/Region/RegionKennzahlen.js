import Link from "next/link";
import { ArrowRight, Coins, Gauge, Sprout, Sun } from "lucide-react";

import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { BEISPIEL_HA, TENDENZ_TEXT } from "./rechnung";
import { pfad } from "@/lib/land";

const tsd = (v) => `${fmt(Math.round(v / 1000))} Tsd. €`;

/** Kennzahlen-Leiste einer Regionalseite: Ertrag, Pacht, Beispiel 10 ha, Agri-PV */
export default function RegionKennzahlen({ region, k }) {
  const kacheln = [
    {
      icon: Sun,
      titel: "Spezifischer Ertrag",
      wert: `${fmt(k.ertrag)} kWh/kWp`,
      text: `im Jahr, ${region.ertrag?.ort ? `PVGIS-Punkt ${region.ertrag.ort}` : "Orientierungswert"}${region.ertrag?.spanne ? `; in der Region ${region.ertrag.spanne}` : ""}.`,
    },
    {
      icon: Coins,
      titel: "Mögliche Pacht",
      // QM Welle 1: Länder-Sperre – kein €-Pachtwert für AT/CH
      wert: k.pachtGesperrt ? "in Vorbereitung" : `${fmt(k.spanne.min)}–${fmt(k.spanne.max)} €`,
      text: k.pachtGesperrt
        ? `Die Rechenlogik für ${k.land === "CH" ? "die Schweiz" : "Österreich"} ist in Vorbereitung – wir nennen Pachtwerte im persönlichen Gespräch.`
        : `je Hektar und Jahr für Freiflächen-PV – ${TENDENZ_TEXT[region.pacht?.tendenz || "mitte"]}.`,
    },
    {
      icon: Gauge,
      titel: `Beispiel ${BEISPIEL_HA} ha Freifläche`,
      wert: `${fmt(k.mwp, 1)} MWp · ${fmt(k.gwh, 1)} GWh`,
      text: `Strom pro Jahr für rund ${fmt(Math.round(k.haushalte / 100) * 100)} Haushalte${k.pachtGesperrt ? "" : `; Pacht ${tsd(k.pachtJahr.min)}–${tsd(k.pachtJahr.max)} im Jahr`}.`,
    },
    {
      icon: Sprout,
      titel: `Beispiel ${BEISPIEL_HA} ha Agri-PV`,
      wert: `${fmt(k.agriMwp, 1)} MWp · ${fmt(k.agriGwh, 1)} GWh`,
      text: "vertikal-bifazial, die Fläche bleibt überwiegend landwirtschaftlich nutzbar.",
    },
  ];

  return (
    <div>
      <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
        <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
        <dl className="grid px-5 sm:grid-cols-2 sm:px-2 xl:grid-cols-4 xl:px-0 xl:py-3">
          {kacheln.map((c, i) => (
            <Reveal
              key={c.titel}
              delay={i * 60}
              className={cn(
                "flex flex-col border-ink-100 py-5 sm:px-5 sm:py-6 xl:px-7 xl:py-5",
                i > 0 && "border-t",
                i === 1 && "sm:border-l sm:border-t-0",
                i === 3 && "sm:border-l",
                i > 0 && "xl:border-l xl:border-t-0"
              )}
            >
              <dt className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">
                <c.icon aria-hidden="true" className="h-4 w-4" />
                {c.titel}
              </dt>
              <dd className="ov-num mt-3 font-display text-[24px] font-extrabold leading-tight tracking-tight text-ink-900">{c.wert}</dd>
              <dd className="mt-2 text-[14px] leading-relaxed text-ink-600">{c.text}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
      <div className="mt-5 flex flex-col gap-3 text-[12.5px] leading-relaxed text-ink-500 md:flex-row md:items-start md:justify-between">
        <p className="max-w-3xl">
          Ertrag: PVGIS (EU JRC), fest aufgeständert, optimal geneigt, 14 % Systemverluste. Leistung, Pacht und Haushalte aus unseren zentralen Marktannahmen, Stand {STAND} – Orientierungswerte, keine Angebote.
        </p>
        <Link href={pfad("/rechner/pacht")} className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
          Mit eigenen Werten rechnen <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
