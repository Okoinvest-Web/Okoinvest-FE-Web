// Bühne im Kopf von /unternehmen: Foto des Firmensitzes, dazu zwei schwebende
// Karten mit belegten Angaben (Registerauszug, Meilensteine der Gruppe).
import Image from "next/image";
import { Landmark } from "lucide-react";
import { GESELLSCHAFT } from "@/data/site";

const STATIONEN = [
  { jahr: "2010", text: "Gruppe gegründet" },
  { jahr: "2012", text: "Eigene Solarparks" },
  { jahr: "2020", text: "ÖkoInvest GmbH" },
];

export default function FirmenBuehne() {
  return (
    <figure className="relative">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-navy-900 shadow-e5 ring-1 ring-white/15 md:rounded-[2rem]">
        <div className="relative aspect-[4/3] w-full">
          <Image
            src="/img/firmensitz.jpg"
            alt="Firmensitz der ÖKOVOLT Gruppe mit Firmenfahrzeugen"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 640px"
            className="object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/5 to-transparent" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-navy-950/25 to-transparent" />
        </div>
      </div>

      {/* Registerkarte – ab sm schwebend oben links */}
      <div className="relative mt-4 sm:absolute sm:-left-6 sm:top-8 sm:mt-0 sm:w-[17.5rem] lg:-left-10">
        <div className="rounded-2xl bg-navy-950/90 p-4 shadow-e4 ring-1 ring-white/15 backdrop-blur-md">
          <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-ov-300">
            <Landmark aria-hidden="true" className="h-3.5 w-3.5" />
            Firmenbuch
          </p>
          <p className="mt-2 font-display text-[17px] font-bold leading-tight text-white">{GESELLSCHAFT.name}</p>
          <p className="mt-1 text-[13px] leading-snug text-white/70">
            {GESELLSCHAFT.ort} · {GESELLSCHAFT.register}
          </p>
        </div>
      </div>

      {/* Meilensteine – ab sm schwebend unten rechts */}
      <div className="relative mt-3 sm:absolute sm:-bottom-8 sm:right-6 sm:mt-0 lg:-right-4">
        <ol className="flex items-stretch overflow-hidden rounded-2xl bg-white text-ink-900 shadow-e4 ring-1 ring-ink-200/70" aria-label="Meilensteine der Gruppe">
          {STATIONEN.map((s, i) => (
            <li key={s.jahr} className="relative min-w-0 flex-1 px-3.5 py-3.5 sm:px-5">
              {i > 0 && <span aria-hidden="true" className="absolute left-0 top-3 bottom-3 w-px bg-ink-100" />}
              <span className="ov-num block font-display text-[20px] font-extrabold leading-none tracking-tight text-ink-900 sm:text-[22px]">{s.jahr}</span>
              <span className="mt-1.5 block text-[12px] font-medium leading-snug text-ov-700 sm:whitespace-nowrap sm:text-[12.5px]">{s.text}</span>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="sr-only">Firmensitz der ÖKOVOLT Gruppe</figcaption>
    </figure>
  );
}
