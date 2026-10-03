// Ablauf der Projektbörse in vier Schritten – jede Karte zeigt, was in diesem Schritt sichtbar wird.
import { Check, FileSignature, KeyRound, Lock, Search, UserPlus } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";

const OEFFENTLICH = ["Typ", "Leistung", "Phase", "Region", "Preisindikation"];
const VERTRAULICH = ["Gemeinde", "Flurstücke", "Netzbetreiber", "Unterlagen"];

function Chip({ offen = true, dunkel = false, children }) {
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-medium ring-1 ring-inset",
        offen ? (dunkel ? "bg-ov-400/15 text-ov-200 ring-ov-300/30" : "bg-ov-50 text-ov-800 ring-ov-200") : dunkel ? "bg-white/5 text-white/45 ring-white/10" : "bg-ink-50 text-ink-400 ring-ink-200"
      )}
    >
      {offen ? <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} /> : <Lock aria-hidden="true" className="h-3 w-3" />}
      {children}
      <span className="sr-only">{offen ? " (sichtbar)" : " (gesperrt)"}</span>
    </li>
  );
}

const SCHRITTE = [
  {
    icon: UserPlus,
    titel: "Registrieren & Suchprofil",
    text: "Kostenloses Investorenkonto mit Größe, Phasen, Ländern und Ticket. Passende Projekte zeigen wir zuerst.",
    sicht: (
      <ul className="flex flex-wrap gap-1.5" aria-label="Angaben im Suchprofil">
        {["Größe", "Phasen", "Länder", "Ticket"].map((x) => <Chip key={x}>{x}</Chip>)}
      </ul>
    ),
    label: "Ihr Suchprofil",
  },
  {
    icon: Search,
    titel: "Exposé prüfen",
    text: "Eckdaten, Phase, Netzanschluss und Preisindikation – anonym, ohne genaue Lage.",
    sicht: (
      <ul className="flex flex-wrap gap-1.5" aria-label="Sichtbarkeit im öffentlichen Teaser">
        {OEFFENTLICH.map((x) => <Chip key={x}>{x}</Chip>)}
        {VERTRAULICH.map((x) => <Chip key={x} offen={false}>{x}</Chip>)}
      </ul>
    ),
    label: "Sichtbar im Teaser",
  },
  {
    icon: KeyRound,
    titel: "NDA per Klick",
    text: "Vertraulichkeitsvereinbarung im Portal akzeptieren. Nach Freigabe öffnet sich der Datenraum.",
    dunkel: true,
    sicht: (
      <ul className="flex flex-wrap gap-1.5" aria-label="Sichtbarkeit nach Freigabe">
        {OEFFENTLICH.map((x) => <Chip key={x} dunkel>{x}</Chip>)}
        {VERTRAULICH.map((x) => <Chip key={x} dunkel>{x}</Chip>)}
      </ul>
    ),
    label: "Nach Freigabe sichtbar",
  },
  {
    icon: FileSignature,
    titel: "LOI & Abschluss",
    text: "Absichtserklärung digital abgeben, Due Diligence, Kaufvertrag – begleitet durch das Backoffice.",
    sicht: (
      <ol className="flex flex-wrap items-center gap-1.5 whitespace-nowrap text-[11.5px] font-semibold text-ink-700" aria-label="Weg zum Abschluss">
        {["LOI", "Due Diligence", "Kaufvertrag"].map((x, i) => (
          <li key={x} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="h-px w-3 bg-ink-300" />}
            <span className="rounded-full bg-white px-2 py-1 ring-1 ring-inset ring-ink-200">{x}</span>
          </li>
        ))}
      </ol>
    ),
    label: "Bis zum Vertrag",
  },
];

export default function Ablauf() {
  return (
    <section data-abschnitt="ablauf" aria-labelledby="ablauf-titel" className="bg-white py-20 md:py-32">
      <div className="ov-container">
        <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-16">
          <SectionHeading eyebrow="Ablauf" title={<span id="ablauf-titel">Vom Exposé zum Abschluss – alles im Portal</span>} lead="Einheitlicher, nachvollziehbarer Prozess für beide Seiten. Jeder Schritt wird protokolliert." />
          <p className="text-[15px] leading-relaxed text-ink-600 lg:pb-2">
            <span className="font-semibold text-ink-900">Vertraulichkeit in Stufen:</span> Öffentlich zeigen wir nur Region, Bundesland bzw. Kanton und Eckdaten. Gemeinde, Flurstücke, Netzbetreiber und Unterlagen sehen Investoren erst nach NDA und Freigabe des Datenraums.
          </p>
        </div>

        <ol className="relative mt-12 grid gap-4 sm:grid-cols-2 md:mt-16 xl:grid-cols-4">
          {SCHRITTE.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal
                as="li"
                key={s.titel}
                delay={i * 80}
                className={cn(
                  "relative flex min-w-0 flex-col rounded-[1.75rem] p-6 ring-1 md:p-7",
                  s.dunkel ? "ov-noise overflow-hidden bg-navy-950 text-white ring-navy-900" : "bg-sand-50 ring-ink-200/60"
                )}
              >
                {s.dunkel && <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ov-500/25 blur-[70px]" />}
                <div className="relative flex items-center justify-between">
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", s.dunkel ? "bg-white/10 text-ov-300" : "bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200/60")}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className={cn("ov-num font-display text-[40px] font-extrabold leading-none tracking-tight", s.dunkel ? "text-white/15" : "text-ink-900/10")}>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className={cn("relative mt-6 font-display text-[19px] font-bold leading-snug", s.dunkel ? "text-white" : "text-ink-900")}>{s.titel}</h3>
                <p className={cn("relative mt-2 text-[14.5px] leading-relaxed", s.dunkel ? "text-white/70" : "text-ink-600")}>{s.text}</p>
                <div aria-hidden="true" className="min-h-6 flex-1" />
                <div className={cn("relative border-t pt-4", s.dunkel ? "border-white/10" : "border-ink-200/70")}>
                  <p className={cn("mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]", s.dunkel ? "text-ov-300" : "text-ink-500")}>{s.label}</p>
                  {s.sicht}
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
