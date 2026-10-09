// Ablauf der Projektbörse in vier Schritten – jede Karte zeigt, was in diesem Schritt sichtbar wird.
import { Check, FileSignature, KeyRound, Lock, Search, UserPlus } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const TEXTE = {
  de: {
    oeffentlich: ["Typ", "Leistung", "Phase", "Region", "Preisindikation"],
    vertraulich: ["Gemeinde", "Flurstücke", "Netzbetreiber", "Unterlagen"],
    sichtbar: " (sichtbar)",
    gesperrt: " (gesperrt)",
    schritte: [
      { titel: "Registrieren & Suchprofil", text: "Kostenloses Investorenkonto mit Größe, Phasen, Ländern und Ticket. Passende Projekte zeigen wir zuerst.", aria: "Angaben im Suchprofil", chips: ["Größe", "Phasen", "Länder", "Ticket"], label: "Ihr Suchprofil" },
      { titel: "Exposé prüfen", text: "Eckdaten, Phase, Netzanschluss und Preisindikation – anonym, ohne genaue Lage.", aria: "Sichtbarkeit im öffentlichen Teaser", label: "Sichtbar im Teaser" },
      { titel: "NDA per Klick", text: "Vertraulichkeitsvereinbarung im Portal akzeptieren. Nach Freigabe öffnet sich der Datenraum.", aria: "Sichtbarkeit nach Freigabe", label: "Nach Freigabe sichtbar" },
      { titel: "LOI & Abschluss", text: "Absichtserklärung digital abgeben, Due Diligence, Kaufvertrag – begleitet durch das Backoffice.", aria: "Weg zum Abschluss", chips: ["LOI", "Due Diligence", "Kaufvertrag"], label: "Bis zum Vertrag" },
    ],
    eyebrow: "Ablauf",
    titel: "Vom Exposé zum Abschluss – alles im Portal",
    lead: "Einheitlicher, nachvollziehbarer Prozess für beide Seiten. Jeder Schritt wird protokolliert.",
    stufen: "Vertraulichkeit in Stufen:",
    stufenText: " Öffentlich zeigen wir nur Region, Bundesland bzw. Kanton und Eckdaten. Gemeinde, Flurstücke, Netzbetreiber und Unterlagen sehen Investoren erst nach NDA und Freigabe des Datenraums.",
  },
  en: {
    oeffentlich: ["Type", "Capacity", "Stage", "Region", "Price indication"],
    vertraulich: ["Municipality", "Plots", "Grid operator", "Documents"],
    sichtbar: " (visible)",
    gesperrt: " (locked)",
    schritte: [
      { titel: "Register & search profile", text: "Free investor account with size, stages, countries and ticket. We show you suitable projects first.", aria: "Details in the search profile", chips: ["Size", "Stages", "Countries", "Ticket"], label: "Your search profile" },
      { titel: "Review the exposé", text: "Key data, stage, grid connection and price indication – anonymous, without the exact location.", aria: "Visibility in the public teaser", label: "Visible in the teaser" },
      { titel: "NDA in one click", text: "Accept the non-disclosure agreement in the portal. Once approved, the data room opens.", aria: "Visibility after approval", label: "Visible after approval" },
      { titel: "LOI & closing", text: "Submit a letter of intent digitally, due diligence, purchase agreement – supported by our back office.", aria: "Path to closing", chips: ["LOI", "Due diligence", "Purchase agreement"], label: "Through to the contract" },
    ],
    eyebrow: "How it works",
    titel: "From exposé to closing – all in the portal",
    lead: "A uniform, traceable process for both sides. Every step is logged.",
    stufen: "Confidentiality in stages:",
    stufenText: " Publicly, we only show the region, federal state or canton and key data. Investors only see the municipality, plots, grid operator and documents after the NDA and approval of the data room.",
  },
};

function Chip({ offen = true, dunkel = false, t, children }) {
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-medium ring-1 ring-inset",
        offen ? (dunkel ? "bg-ov-400/15 text-ov-200 ring-ov-300/30" : "bg-ov-50 text-ov-800 ring-ov-200") : dunkel ? "bg-white/5 text-white/45 ring-white/10" : "bg-ink-50 text-ink-400 ring-ink-200"
      )}
    >
      {offen ? <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} /> : <Lock aria-hidden="true" className="h-3 w-3" />}
      {children}
      <span className="sr-only">{offen ? t.sichtbar : t.gesperrt}</span>
    </li>
  );
}

const schritteFuer = (t) => [
  {
    icon: UserPlus,
    ...t.schritte[0],
    sicht: (
      <ul className="flex flex-wrap gap-1.5" aria-label={t.schritte[0].aria}>
        {t.schritte[0].chips.map((x) => <Chip key={x} t={t}>{x}</Chip>)}
      </ul>
    ),
  },
  {
    icon: Search,
    ...t.schritte[1],
    sicht: (
      <ul className="flex flex-wrap gap-1.5" aria-label={t.schritte[1].aria}>
        {t.oeffentlich.map((x) => <Chip key={x} t={t}>{x}</Chip>)}
        {t.vertraulich.map((x) => <Chip key={x} t={t} offen={false}>{x}</Chip>)}
      </ul>
    ),
  },
  {
    icon: KeyRound,
    ...t.schritte[2],
    dunkel: true,
    sicht: (
      <ul className="flex flex-wrap gap-1.5" aria-label={t.schritte[2].aria}>
        {t.oeffentlich.map((x) => <Chip key={x} t={t} dunkel>{x}</Chip>)}
        {t.vertraulich.map((x) => <Chip key={x} t={t} dunkel>{x}</Chip>)}
      </ul>
    ),
  },
  {
    icon: FileSignature,
    ...t.schritte[3],
    sicht: (
      <ol className="flex flex-wrap items-center gap-1.5 whitespace-nowrap text-[11.5px] font-semibold text-ink-700" aria-label={t.schritte[3].aria}>
        {t.schritte[3].chips.map((x, i) => (
          <li key={x} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="h-px w-3 bg-ink-300" />}
            <span className="rounded-full bg-white px-2 py-1 ring-1 ring-inset ring-ink-200">{x}</span>
          </li>
        ))}
      </ol>
    ),
  },
];

export default function Ablauf() {
  const t = uebersetze(TEXTE, spracheDerAnfrage());
  const SCHRITTE = schritteFuer(t);
  return (
    <section data-abschnitt="ablauf" aria-labelledby="ablauf-titel" className="bg-white py-20 md:py-32">
      <div className="ov-container">
        <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-16">
          <SectionHeading eyebrow={t.eyebrow} title={<span id="ablauf-titel">{t.titel}</span>} lead={t.lead} />
          <p className="text-[15px] leading-relaxed text-ink-600 lg:pb-2">
            <span className="font-semibold text-ink-900">{t.stufen}</span>{t.stufenText}
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
