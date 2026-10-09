// Zeitleiste für Abläufe – Desktop waagerecht mit Verbindungslinie, mobil senkrecht.
// Wird auch auf /bestandsanlagen genutzt. schritte: [{ icon, title, text }]
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import T from "@/components/Sprache/T";

export default function Zeitleiste({ titelId, eyebrow, titel, lead, schritte, ton = "white" }) {
  const n = schritte.length;
  return (
    <section data-abschnitt="ablauf" aria-labelledby={titelId} className={cn("py-20 md:py-28", ton === "sand" ? "bg-sand-50" : "bg-white")}>
      <div className="ov-container">
        <SectionHeading eyebrow={eyebrow} title={<span id={titelId}>{titel}</span>} lead={lead} align="center" />
        <ol className={cn("relative mt-12 grid gap-0 md:mt-16 lg:gap-5", n === 6 ? "lg:grid-cols-6" : n === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
          <span aria-hidden="true" className="absolute left-[8%] right-[8%] top-6 hidden h-px bg-gradient-to-r from-ov-200 via-ov-300 to-ov-500 lg:block" />
          {schritte.map((s, i) => {
            const letzter = i === n - 1;
            return (
              <Reveal as="li" key={s.title} delay={i * 70} className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 pb-8 last:pb-0 lg:flex lg:flex-col lg:items-center lg:pb-0 lg:text-center">
                {!letzter && <span aria-hidden="true" className="absolute bottom-0 left-6 top-12 w-px bg-ov-200 lg:hidden" />}
                <span
                  className={cn(
                    "relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl ring-1",
                    letzter ? "bg-ov-600 text-white shadow-e3 ring-ov-600" : "bg-white text-ov-600 shadow-e1 ring-ink-200"
                  )}
                >
                  <s.icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="pt-1 lg:mt-5 lg:pt-0">
                  <p className="ov-num text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400"><T de="Schritt" en="Step" /> {i + 1}</p>
                  <h3 className={cn("mt-1 font-display text-[17px] font-bold", letzter ? "text-ov-700" : "text-ink-900")}>{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{s.text}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
