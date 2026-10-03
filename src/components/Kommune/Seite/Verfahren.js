// Bauleitplanung als Zeitstrahl: sechs Schritte, Beschlüsse des Gemeinderats hervorgehoben,
// darunter die Arbeitsteilung (Gemeinde entscheidet · Entwickler trägt Planung und Kosten) und die Ausnahmen.
import Link from "next/link";
import { ClipboardCheck, Eye, FileText, Megaphone, Route, Vote, Zap } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";

const SCHRITTE = [
  { icon: Vote, title: "Aufstellungsbeschluss", text: "Der Gemeinderat beschließt, einen Bebauungsplan aufzustellen – oft zusammen mit der Änderung des Flächennutzungsplans im Parallelverfahren.", tag: "beschluss" },
  { icon: Megaphone, title: "Frühzeitige Beteiligung", text: "Öffentlichkeit und Behörden werden früh informiert und können sich äußern (§§ 3 Abs. 1, 4 Abs. 1 BauGB).", tag: "beteiligung" },
  { icon: FileText, title: "Entwurf & Umweltbericht", text: "Planzeichnung, Begründung, Umweltbericht, Artenschutz, Blend- und ggf. Bodengutachten, Ausgleichskonzept.", tag: "entwickler" },
  { icon: Eye, title: "Öffentliche Auslegung", text: "Der Entwurf wird veröffentlicht; Stellungnahmen von Bürgern und Trägern öffentlicher Belange gehen ein.", tag: "beteiligung" },
  { icon: ClipboardCheck, title: "Abwägung & Satzung", text: "Der Gemeinderat wägt die Stellungnahmen ab und beschließt den Bebauungsplan als Satzung (§ 10 BauGB).", tag: "beschluss" },
  { icon: Zap, title: "Bekanntmachung & Bau", text: "Mit der Bekanntmachung tritt der Plan in Kraft. Es folgen Baugenehmigung bzw. -anzeige, Netzanschluss und Bau." },
];

const TAGS = {
  beschluss: { label: "Beschluss Gemeinderat", klasse: "bg-navy-700 text-white" },
  beteiligung: { label: "Beteiligung", klasse: "bg-white text-ink-700 ring-1 ring-inset ring-ink-200" },
  entwickler: { label: "Arbeit des Entwicklers", klasse: "bg-ov-100 text-ov-800" },
};

export default function Verfahren() {
  return (
    <Section tone="sand" space="lg" id="verfahren" className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
        <SectionHeading eyebrow="Bauleitplanung" title="Die Gemeinde hat die Planungshoheit – wir tragen die Arbeit." />
        <Reveal>
          <p className="ov-lead text-ink-600 lg:pb-1">
            Für die meisten Solarparks braucht es einen Bebauungsplan. Planungsbüro, Gutachten und Verfahrenskosten übernimmt der Entwickler über einen städtebaulichen Vertrag.
          </p>
        </Reveal>
      </div>

      {/* Arbeitsteilung */}
      <Reveal className="mt-12 grid gap-3 sm:grid-cols-2 md:mt-14">
        <div className="flex items-center gap-4 rounded-2xl bg-navy-950 p-5 text-white">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-ov-300 ring-1 ring-inset ring-white/15"><Vote className="h-5 w-5" /></span>
          <p className="text-[15px] leading-snug"><span className="block font-display text-[17px] font-bold">Die Gemeinde entscheidet</span><span className="text-white/70">Aufstellungsbeschluss, Abwägung, Satzung</span></p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-ink-200/70">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-ov-100"><FileText className="h-5 w-5" /></span>
          <p className="text-[15px] leading-snug"><span className="block font-display text-[17px] font-bold text-ink-900">Der Entwickler trägt die Arbeit</span><span className="text-ink-600">Planungsbüro, Gutachten, Verfahrenskosten</span></p>
        </div>
      </Reveal>

      {/* Zeitstrahl */}
      <ol className="relative mt-12 grid gap-0 md:mt-16 lg:grid-cols-6 lg:gap-5">
        <span aria-hidden="true" className="absolute bottom-6 left-[23px] top-6 w-px bg-gradient-to-b from-ov-400 via-ov-300 to-ink-200 lg:bottom-auto lg:left-6 lg:right-6 lg:top-[23px] lg:h-px lg:w-auto lg:bg-gradient-to-r" />
        {SCHRITTE.map((s, i) => {
          const tag = s.tag && TAGS[s.tag];
          const beschluss = s.tag === "beschluss";
          return (
            <Reveal as="li" key={s.title} delay={i * 70} className="relative flex gap-5 pb-9 last:pb-0 lg:flex-col lg:gap-0 lg:pb-0">
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1",
                  beschluss ? "bg-navy-700 text-white ring-navy-700 shadow-[0_10px_24px_-10px_rgba(0,52,115,0.7)]" : "bg-white text-ov-700 ring-ink-200"
                )}
              >
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 lg:mt-6">
                <p className="ov-num text-[12.5px] font-semibold text-ink-400">
                  <span className="sr-only">Schritt </span>0{i + 1}
                </p>
                <p className="mt-1 font-display text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink-900 lg:min-h-[2.75em]">{s.title}</p>
                {tag && <span className={cn("mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", tag.klasse)}>{tag.label}</span>}
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-600 lg:text-[14px]">{s.text}</p>
              </div>
            </Reveal>
          );
        })}
      </ol>
      <p className="mt-8 text-[13px] text-ink-500 lg:mt-10">Für das gesamte Verfahren sind realistisch ein bis zwei Jahre anzusetzen.</p>

      {/* Ausnahmen */}
      <Reveal className="mt-10 flex flex-col gap-5 rounded-[1.75rem] bg-white p-6 ring-1 ring-ink-200/70 sm:flex-row sm:items-start md:p-8">
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-50 text-sun-700 ring-1 ring-sun-200">
          <Route className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[18px] font-bold text-ink-900">Ausnahmen ohne Bebauungsplan</p>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-600">
            Entlang von Autobahnen und zweigleisigen Schienenwegen sind Freiflächenanlagen in einem 200-Meter-Streifen nach § 35 Abs. 1 Nr. 8 b BauGB privilegiert, ebenso kleine Agri-PV-Anlagen bis 2,5 ha mit Hofbezug. Die Gemeinde bleibt über ihr Einvernehmen beteiligt. Mehr im{" "}
            <Link href="/ratgeber/solarpark-genehmigung-bebauungsplan" className="rounded font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-ov-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
              Ratgeber Genehmigung
            </Link>
            .
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
