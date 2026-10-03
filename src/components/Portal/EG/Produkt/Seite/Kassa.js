// Für Kassa und Vorstand – Bento-Raster mit Mini-Visualisierungen (reines HTML/Inline-SVG, Server-Komponente)
import { ArrowRight, BadgeCheck, ClipboardList, Eye, FileSignature, HandCoins, Lock, ShieldCheck, Users } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";

/*
 * Arbeitswerkzeuge für Kassa und Vorstand – nur Aussagen, die auch in Tour, Vergleich und FAQ stehen.
 * Die Mini-Grafiken sind dekorativ (aria-hidden) und enthalten keine Zahlen; der Text jeder Kachel trägt die Aussage.
 */

/* ---------- Mini-Visualisierungen ---------- */

/** Vier-Augen-Freigabe: Ablauf der Periode mit zwei Freigaben durch zwei Personen */
function VisFreigabe() {
  const schritte = [
    { l: "Vorschau", art: "fertig" },
    { l: "1. Freigabe", wer: "Kassier", art: "person" },
    { l: "2. Freigabe", wer: "Vorstand", art: "person" },
    { l: "Versand", art: "ziel" },
  ];
  return (
    <div aria-hidden="true" className="relative mt-8 rounded-2xl bg-white/70 p-4 ring-1 ring-ink-200/70 sm:p-5">
      <ol className="relative grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-1">
        <span className="absolute bottom-[18px] left-[17px] top-[18px] w-0.5 bg-gradient-to-b from-ov-500 to-ov-300 sm:hidden" />
        <span className="absolute left-[12.5%] right-[12.5%] top-[18px] hidden h-0.5 bg-gradient-to-r from-ov-500 via-ov-500 to-ov-300 sm:block" />
        {schritte.map((s) => (
          <li key={s.l} className="relative flex items-center gap-3 sm:flex-col sm:gap-0 sm:text-center">
            <span
              className={cn(
                "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                s.art === "person" ? "bg-navy-700 text-white" : s.art === "ziel" ? "bg-ov-600 text-white" : "bg-ov-100 text-ov-700"
              )}
            >
              {s.art === "person" ? <Users className="h-4 w-4" /> : s.art === "ziel" ? <ArrowRight className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </span>
            <span className="whitespace-nowrap text-[12px] font-semibold leading-tight text-ink-800 sm:mt-2">{s.l}</span>
            {s.wer ? (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-ov-50 px-2 py-0.5 text-[11px] font-semibold text-ov-800 ring-1 ring-ov-200 sm:ml-0 sm:mt-1">
                <BadgeCheck className="h-3 w-3" />{s.wer}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Einzeleinsicht nur mit Zweck: Summen offen, Einzelzeilen gesperrt, Zugriff wird protokolliert */
function VisEinsicht() {
  return (
    <div aria-hidden="true" className="mt-8 space-y-2.5">
      <div className="rounded-xl bg-white/[0.07] p-3 ring-1 ring-white/12">
        <div className="flex items-center justify-between text-[11.5px] font-semibold text-white/80">
          <span>Summe der Gemeinschaft</span>
          <span className="rounded-full bg-ov-400/20 px-2 py-0.5 text-[10.5px] text-ov-200">sichtbar</span>
        </div>
        <svg viewBox="0 0 200 36" preserveAspectRatio="none" className="mt-3 h-12 w-full">
          {[14, 22, 18, 28, 24, 31, 26, 20, 27, 33].map((h, i) => (
            <rect key={i} x={i * 20 + 3} y={36 - h} width="13" height={h} rx="2.5" fill="var(--color-ov-400)" fillOpacity={0.45 + i * 0.05} />
          ))}
        </svg>
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className={cn("items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/10", i > 2 ? "hidden lg:flex" : "flex")}>
          <span className="h-5 w-5 shrink-0 rounded-full bg-white/15" />
          <span className="h-2 flex-1 rounded-full bg-white/15" style={{ maxWidth: `${[72, 58, 66, 50, 62][i]}%` }} />
          <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-white/55" />
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-sun-300/50 px-3 py-2 text-[11.5px] text-sun-200">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        <span>Zweck angegeben · Zugriff protokolliert</span>
      </div>
    </div>
  );
}

/** SEPA und Mahnwesen: aus der Abrechnung in zwei Zahlungsrichtungen, Mahnung als Folgeschritt */
function VisSepa() {
  return (
    <div aria-hidden="true" className="mt-7 flex items-center gap-2 text-[11.5px] font-semibold">
      <span className="rounded-lg bg-white px-2.5 py-2 text-ink-800 shadow-e1 ring-1 ring-ink-200">Abrechnung</span>
      <svg viewBox="0 0 40 60" className="h-14 w-8 shrink-0" fill="none" stroke="var(--color-ov-500)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M2 30 C 20 30, 20 10, 38 10" />
        <path d="M2 30 C 20 30, 20 50, 38 50" />
        <path d="M33 6 l5 4 -5 4 M33 46 l5 4 -5 4" />
      </svg>
      <span className="flex min-w-0 flex-col gap-2">
        <span className="truncate rounded-lg bg-ov-50 px-2.5 py-1.5 text-ov-800 ring-1 ring-ov-200">Lastschrift</span>
        <span className="truncate rounded-lg bg-navy-50 px-2.5 py-1.5 text-navy-700 ring-1 ring-navy-100">Überweisung</span>
        <span className="truncate rounded-lg border border-dashed border-sun-300 bg-sun-50 px-2.5 py-1.5 text-sun-700">Mahnung</span>
      </span>
    </div>
  );
}

/** Umsatzsteuer-Sonderfälle: die drei Fälle als Merkmale */
function VisUst() {
  return (
    <div aria-hidden="true" className="mt-7 flex flex-wrap gap-2">
      {["Kleinunternehmer", "Landwirt", "Reverse Charge"].map((f, i) => (
        <span key={f} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1", i === 2 ? "bg-navy-50 text-navy-700 ring-navy-100" : "bg-white text-ink-800 ring-ink-200")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-ov-500" : i === 1 ? "bg-sun-500" : "bg-navy-500")} />
          {f}
        </span>
      ))}
    </div>
  );
}

/** Export mit Prüfpfad: von der Summe bis zum Viertelstundenwert */
function VisPruefpfad() {
  const ebenen = ["Export", "Rechnung", "Viertelstundenwert"];
  return (
    <ol aria-hidden="true" className="mt-7 space-y-1.5">
      {ebenen.map((e, i) => (
        <li key={e} className="flex items-center gap-2" style={{ paddingLeft: `${i * 18}px` }}>
          {i > 0 ? <span className="h-3 w-3 shrink-0 rounded-bl-md border-b-[1.5px] border-l-[1.5px] border-ink-300" /> : null}
          <span className={cn("truncate rounded-lg px-2.5 py-1 text-[12px] font-semibold ring-1", i === ebenen.length - 1 ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-800 ring-ink-200")}>{e}</span>
        </li>
      ))}
    </ol>
  );
}

/** Organe und Versammlungen: drei verbundene Bausteine der Vereinsführung */
function VisVerein() {
  // Als umbrechende Chips statt drei schmaler Spalten: „Versammlungen“ wurde in der Spaltenbreite getrennt.
  return (
    <div aria-hidden="true" className="mt-7 flex flex-wrap gap-2 text-[13px] font-semibold text-ink-800">
      {[["Organe", Users], ["Versammlungen", ClipboardList], ["Beschlüsse", FileSignature]].map(([l, Icon]) => (
        <span key={l} className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3.5 ring-1 ring-ink-200">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon className="h-3.5 w-3.5" /></span>
          {l}
        </span>
      ))}
    </div>
  );
}

/* ---------- Kacheln ---------- */

const KACHELN = [
  {
    id: "freigabe",
    icon: BadgeCheck,
    title: "Vier-Augen-Freigabe",
    text: "Jede Abrechnung und Zahlung mit zwei Freigaben – Status je Periode und Vergleich zum Vorzeitraum.",
    vis: VisFreigabe,
    flaeche: "bg-gradient-to-br from-white to-ov-50 ring-ov-200/70",
    raster: "md:col-span-2 lg:col-span-4",
    gross: true,
  },
  {
    id: "einsicht",
    icon: ShieldCheck,
    title: "Einzeleinsicht nur mit Zweck",
    text: "Vorstand und Kassa sehen standardmäßig Summen; eine Einzeleinsicht ist nur mit Zweck möglich und wird protokolliert.",
    vis: VisEinsicht,
    dunkel: true,
    raster: "md:row-span-2 lg:col-span-2",
  },
  {
    id: "sepa",
    icon: HandCoins,
    title: "SEPA und Mahnwesen",
    text: "SEPA-Lastschrift und -Überweisung aus der Abrechnung heraus, Mahnwesen inklusive.",
    vis: VisSepa,
    raster: "lg:col-span-2",
  },
  {
    id: "ust",
    icon: ClipboardList,
    title: "Umsatzsteuer-Sonderfälle",
    text: "Kleinunternehmer, Landwirt, Reverse Charge – die Fälle, die in Vereinen sonst von Hand laufen.",
    vis: VisUst,
    raster: "lg:col-span-2",
  },
  {
    id: "export",
    icon: FileSignature,
    title: "Export für die Steuerberatung",
    text: "Exporte für die Steuerberatung, jede Zahl mit Prüfpfad bis zum Viertelstundenwert.",
    vis: VisPruefpfad,
    raster: "lg:col-span-3",
  },
  {
    id: "verein",
    icon: Users,
    title: "Organe und Versammlungen",
    text: "Vereinsführung direkt in der Plattform: Organe, Versammlungen und Beschlüsse der Gemeinschaft an einem Ort.",
    vis: VisVerein,
    raster: "lg:col-span-3",
  },
];

function Kachel({ k, i }) {
  const Icon = k.icon;
  const Vis = k.vis;
  return (
    <Reveal
      as="li"
      delay={i * 70}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[1.75rem] p-6 ring-1 md:p-7",
        k.dunkel ? "ov-verlauf-nacht text-white shadow-e4 ring-white/10" : cn("shadow-e1", k.flaeche || "bg-white ring-ink-200/80"),
        k.raster
      )}
    >
      <div className={cn("flex gap-4", k.gross ? "flex-col sm:flex-row sm:items-start sm:justify-between" : "flex-col")}>
        <div className={cn(k.gross && "max-w-md")}>
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", k.dunkel ? "bg-white/10 text-ov-300 ring-1 ring-white/15" : "bg-ov-100 text-ov-700")}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <h3 className={cn("mt-4 font-display font-bold tracking-[-0.015em]", k.gross ? "text-[1.5rem] leading-tight md:text-[1.75rem]" : "text-[1.2rem] leading-snug", k.dunkel ? "text-white" : "text-ink-900")}>
            {k.title}
          </h3>
          <p className={cn("ov-klein mt-2", k.dunkel ? "text-white/75" : "text-ink-600")}>{k.text}</p>
        </div>
      </div>
      <div className="mt-auto">
        <Vis />
      </div>
    </Reveal>
  );
}

export default function Kassa() {
  return (
    <Section data-abschnitt="kassa" tone="sand" space="lg" id="kassa" className="scroll-mt-24">
      {/* Kein Rückverweis auf die Tour: Die Abrechnungs-Ansicht steht unmittelbar darüber. */}
      <SectionHeading eyebrow="Vereinsführung" title="Der Verein läuft mit&nbsp;– nicht nebenher" lead="Die Arbeit, die in Vorständen die meiste Zeit kostet, an einem Ort: Vereinsführung, Freigaben, Zahlungsverkehr und Exporte." className="mb-10 md:mb-14" />
      <ul className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-6">
        {KACHELN.map((k, i) => <Kachel key={k.id} k={k} i={i} />)}
      </ul>
    </Section>
  );
}
