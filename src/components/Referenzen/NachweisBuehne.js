// Bühne im Kopf von /referenzen: Foto eines Solarparks, darauf die eigenen
// Parks als Registerauszüge (nur Angaben aus src/data/referenzen.js).
import Image from "next/image";
import { FileCheck2, Sun } from "lucide-react";
import { PARKS } from "@/data/referenzen";

export default function NachweisBuehne() {
  return (
    <figure className="relative">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-navy-900 shadow-e5 ring-1 ring-white/15 md:rounded-[2rem]">
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/11]">
          <Image src="/img/solarpark-reihen.jpg" alt="Modulreihen eines Solarparks" fill priority sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/20 to-transparent" />
        </div>
        <p className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-navy-950/80 px-3 py-1.5 text-[12.5px] font-semibold text-white ring-1 ring-white/15 backdrop-blur-md">
          <Sun aria-hidden="true" className="h-3.5 w-3.5 text-sun-300" />
          Seit 2012 im Eigenbetrieb
        </p>
      </div>

      {/* Registerauszüge – ab sm über dem unteren Bildrand */}
      <ul className="relative mt-3 grid gap-2.5 sm:-mt-24 sm:grid-cols-3 sm:px-5" aria-label="Eigene Solarparks mit Betreibergesellschaft">
        {PARKS.map((p) => (
          <li key={p.id} className="rounded-2xl bg-white p-4 text-ink-900 shadow-e4 ring-1 ring-ink-200/70">
            <p className="flex items-center justify-between gap-2">
              <span className="font-display text-[15px] font-bold leading-tight">{p.name.replace("Solarpark ", "")}</span>
              <FileCheck2 aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600" />
            </p>
            <p className="mt-1 text-[12.5px] text-ink-500">{p.region}</p>
            <p className="ov-num mt-2.5 border-t border-ink-100 pt-2.5 text-[12px] font-medium leading-snug text-ink-700">{p.register.split(",")[0]}</p>
            <p className="text-[12px] leading-snug text-ink-500">{p.seit.replace("Betreibergesellschaft ", "")}</p>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">Solarpark der Gruppe mit den Registerangaben der eigenen Parks</figcaption>
    </figure>
  );
}
