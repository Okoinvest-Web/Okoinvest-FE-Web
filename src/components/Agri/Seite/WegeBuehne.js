// Hero-Bühne für /landwirte: Foto im Rahmen + Glas-Panel mit den vier Wegen (Server-Komponente)
import Image from "next/image";
import { ArrowDownRight, Wheat } from "lucide-react";
import { wegeFuer } from "@/components/Agri/wege";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";

export default function WegeBuehne({ bild, notiz }) {
  const en = spracheDerAnfrage() === "en";
  const WEGE = wegeFuer(en ? "en" : "de", landDerAnfrage());
  return (
    <div className="ov-hero-in relative mx-auto w-full max-w-[640px] lg:mx-0 lg:max-w-none xl:-mr-6" style={{ "--ov-delay": "220ms" }}>
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] shadow-e4 ring-1 ring-white/15 md:rounded-[2.25rem]">
        <div className="relative aspect-[4/3] sm:aspect-[16/12]">
          <Image src={bild.src} alt={bild.alt} fill priority sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" style={{ objectPosition: bild.position || "center" }} />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/20 to-transparent" />
        </div>
        {/* Wege-Panel: ab sm auf dem Bild, mobil darunter */}
        <nav aria-label={en ? "The four routes" : "Die vier Wege"} className="relative bg-navy-950 p-3 sm:absolute sm:inset-x-4 sm:bottom-4 sm:rounded-[1.4rem] sm:bg-navy-950/75 sm:p-2 sm:ring-1 sm:ring-inset sm:ring-white/15 sm:backdrop-blur-md">
          <p className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ov-300 sm:px-3 sm:pt-2">{en ? "Four routes to your solar power" : "Vier Wege zu Ihrem Solarstrom"}</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {WEGE.map((w) => (
              <li key={w.id}>
                <a
                  href={`#weg-${w.id}`}
                  className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                >
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ov-400/15 font-display text-[14px] font-extrabold text-ov-300 ring-1 ring-inset ring-ov-300/30 transition-colors group-hover:bg-ov-500 group-hover:text-white">
                    {w.buchstabe}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug">{w.titel}</span>
                  <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-white/40 transition-colors group-hover:text-ov-300" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {notiz && (
        <div className="ov-hero-in absolute -right-4 top-6 z-10 hidden max-w-[15rem] items-start gap-3 rounded-2xl bg-white/95 p-3.5 pr-4 text-ink-900 shadow-e4 ring-1 ring-white sm:flex lg:-right-6" style={{ "--ov-delay": "620ms" }}>
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200">
            <Wheat className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-ov-700">{notiz.marke}</span>
            <span className="mt-0.5 block font-display text-[15px] font-bold leading-snug">{notiz.titel}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-600">{notiz.text}</span>
          </span>
        </div>
      )}
    </div>
  );
}
