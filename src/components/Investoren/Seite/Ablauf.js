// Ablauf über die Plattform – Zeitstrahl mit Vertraulichkeitsschwelle (öffentlich → nach NDA)
import { FileSignature, FolderLock, Handshake, ShieldCheck, UserPlus, Zap } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/SectionHeading";
import { cn } from "@/components/ui/cn";

const SCHRITTE = [
  { icon: UserPlus, title: "Suchprofil", text: "Ticketgröße, Phasen, Länder und Technologien festlegen – einmal registrieren, jederzeit anpassen." },
  { icon: Zap, title: "Matching", text: "Passende Projekte kommen per Benachrichtigung, oft bevor sie öffentlich in der Börse stehen." },
  { icon: ShieldCheck, title: "NDA", text: "Digitale Vertraulichkeitsvereinbarung mit einem Klick – Voraussetzung für Details und Datenraum." },
  { icon: FolderLock, title: "Datenraum", text: "Pachtverträge, Planung, Netz, Gutachten und Fragen & Antworten an einem Ort, jeder Zugriff protokolliert. Das Exposé-PDF enthält das Projektdatenblatt." },
  { icon: FileSignature, title: "LOI", text: "Absichtserklärung mit Preis, Zahlungsstaffel und Exklusivität – Start der vertieften Prüfung." },
  { icon: Handshake, title: "SPA & Closing", text: "Kaufvertrag über Anteile oder Rechte, Übergabe der Projektgesellschaft, Begleitung bis zum Bau." },
];

/** Gruppen: bis Matching öffentlich bzw. anonym, ab NDA vertraulich */
const GRUPPEN = [
  { titel: "Öffentlich & anonym", text: "Exposé-Teaser mit Region, Größe, Phase und Eckdaten", von: 0, bis: 2 },
  { titel: "Vertraulich nach NDA", text: "Unterlagen, Fragen & Antworten, Verhandlung", von: 2, bis: 6 },
];

export default function Ablauf() {
  return (
    <section data-abschnitt="ablauf" aria-labelledby="ablauf-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden py-20 text-white md:py-28">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-40" />
      <div className="ov-container">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow dark className="mb-4 justify-center">Ablauf über die Plattform</Eyebrow>
          <h2 id="ablauf-titel" className="ov-h2 text-balance">Vom Suchprofil zum Closing&nbsp;– digital und nachvollziehbar.</h2>
        </Reveal>

        {/* Schwelle (ab lg): zwei Bänder über dem Zeitstrahl */}
        <div aria-hidden="true" className="mt-14 hidden grid-cols-6 gap-5 lg:grid">
          {GRUPPEN.map((g, i) => (
            <div key={g.titel} className={cn("rounded-2xl px-5 py-3 ring-1 ring-inset", i === 0 ? "col-span-2 bg-white/[0.04] ring-white/10" : "col-span-4 bg-ov-400/10 ring-ov-300/25")} >
              <p className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", i === 0 ? "text-white/70" : "text-ov-300")}>{g.titel}</p>
              <p className="mt-0.5 text-[13px] text-white/70">{g.text}</p>
            </div>
          ))}
        </div>

        <ol className="relative mt-10 grid gap-x-5 gap-y-0 lg:mt-8 lg:grid-cols-6">
          {/* Linie */}
          <span aria-hidden="true" className="absolute left-[22px] top-2 bottom-2 w-px bg-gradient-to-b from-white/20 via-ov-300/50 to-ov-300/20 lg:left-0 lg:right-0 lg:top-[22px] lg:bottom-auto lg:h-px lg:w-auto lg:bg-gradient-to-r" />
          {SCHRITTE.map((s, i) => {
            const vertraulich = i >= 2;
            return (
              <Reveal as="li" key={s.title} delay={i * 70} className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-x-4 pb-8 last:pb-0 lg:block lg:pb-0">
                <span className={cn("relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-inset", vertraulich ? "bg-ov-600 text-white ring-ov-400/60 shadow-[0_0_0_6px_rgba(102,153,51,0.15)]" : "bg-navy-800 text-white/90 ring-white/20")}>
                  <s.icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div className="lg:mt-5">
                  {i === 2 && (
                    <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-ov-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-ov-200 ring-1 ring-inset ring-ov-300/30 lg:hidden">ab hier vertraulich</p>
                  )}
                  <h3 className="flex items-baseline gap-2 font-display text-[18px] font-bold">
                    <span className="ov-num text-[12px] font-bold text-ov-300">{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{s.text}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
