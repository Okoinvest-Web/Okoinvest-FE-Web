// Dunkler Anker: Unsere Rolle (versorgen · gründen · betreiben), Hinweis Gemeinschaft plus Genossenschaft
// und die beiden Werkzeuge für Österreich (Rechner, Plattform) als nächste Schritte.
import Link from "next/link";
import { ArrowRight, Calculator, FileCheck2, Handshake, LayoutDashboard, Receipt, Sun } from "lucide-react";
import { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { pfad } from "@/lib/land";

const WEGE = [
  { icon: Sun, title: "Mit Parkstrom versorgen", text: "Wir bringen Strom aus Solarparks der Gruppe im zulässigen Nahebereich in bestehende oder neue Gemeinschaften ein – mit fairem, planbarem Preis." },
  { icon: FileCheck2, title: "Gründen", text: "Satzung oder Statuten, Rechtsform, Teilnahmeverträge, Anmeldung beim Netzbetreiber: Wir begleiten Gemeinden, Vereine und Bürgerinitiativen durch die Gründung." },
  { icon: Receipt, title: "Betreiben", text: "Geplant: Zuordnung der Viertelstundenwerte, Abrechnung und Mitgliederverwaltung als Dienstleistung – damit das Ehrenamt nicht an der Buchhaltung scheitert." },
];

const WERKZEUGE = [
  { href: pfad("/energiegemeinschaften/rechner"), icon: Calculator, eyebrow: "Österreich · Rechner", titel: "Was bringt mir eine Energiegemeinschaft?", text: "Ersparnis aus Energiepreis, reduziertem Netzentgelt und Abgabe – für EEG, BEG und GEA, mit den Regeln 2026 und ab 2027." },
  { href: pfad("/energiegemeinschaften/software"), icon: LayoutDashboard, eyebrow: "Österreich · Plattform & Betrieb", titel: "Gemeinschaften gründen, führen und betreiben", text: "Mitgliederportal mit geführter Zustimmung beim Netzbetreiber, Mehrfachteilnahme, Abrechnung und Betriebsführung." },
];

export default function Rolle() {
  return (
    <section data-abschnitt="rolle" aria-labelledby="rolle-titel" className="ov-verlauf-nacht relative isolate overflow-hidden py-20 text-white md:py-32">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-40" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-1/4 -z-10 h-[460px] w-[460px] rounded-full bg-navy-500/25 blur-[120px]" />

      <div className="ov-container">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
          <Reveal>
            <Eyebrow dark className="mb-4">Unsere Rolle</Eyebrow>
            <h2 id="rolle-titel" className="ov-h2 text-white">Versorgen, gründen, betreiben</h2>
          </Reveal>
          <Reveal>
            <p className="ov-lead text-white/70 lg:pb-1">Die Gemeinschaft gehört ihren Mitgliedern. Wir liefern Strom aus der Region und nehmen ihr die Arbeit ab, die viele Initiativen ausbremst.</p>
          </Reveal>
        </div>

        <ol className="mt-12 grid gap-4 md:mt-16 lg:grid-cols-3 lg:gap-5">
          {WEGE.map((w, i) => (
            <Reveal as="li" key={w.title} delay={i * 80} className="relative flex flex-col rounded-[1.5rem] bg-white/[0.05] p-6 ring-1 ring-inset ring-white/10 backdrop-blur-sm md:p-7">
              <div className="flex items-center justify-between">
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-ov-400/15 text-ov-300 ring-1 ring-inset ring-ov-300/30">
                  <w.icon className="h-5 w-5" />
                </span>
                <span aria-hidden="true" className="ov-num font-display text-[28px] font-extrabold leading-none text-white/15">0{i + 1}</span>
              </div>
              <p className="mt-5 font-display text-[19px] font-bold text-white">{w.title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">{w.text}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-5 flex flex-col gap-4 rounded-[1.5rem] bg-ov-500/10 p-6 ring-1 ring-inset ring-ov-300/25 sm:flex-row sm:items-center sm:gap-6 md:p-7">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ov-500 text-white">
            <Handshake className="h-6 w-6" />
          </span>
          <p className="text-[15.5px] leading-relaxed text-white/75">
            <strong className="text-white">Gemeinschaft plus Genossenschaft:</strong> Gerade in Deutschland setzt Energy Sharing voraus, dass die Anlage den Teilnehmenden zugeordnet ist. Eine Beteiligung über die geplante{" "}
            <Link href={pfad("/genossenschaft")} className="rounded font-semibold text-white underline decoration-ov-300/70 underline-offset-4 hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">Energiegenossenschaft</Link> kann das ermöglichen – Mitglieder werden Miteigentümer und nutzen den Strom gemeinsam.
          </p>
        </Reveal>

        <div className="mt-14 md:mt-16">
          <p className="ov-overline text-white/60">Werkzeuge für Österreich</p>
          <ul className="mt-5 grid gap-4 md:grid-cols-2 md:gap-5">
            {WERKZEUGE.map((k, i) => (
              <Reveal as="li" key={k.href} delay={i * 80}>
                <Link href={k.href} className="ov-lift group flex h-full gap-4 rounded-[1.75rem] bg-white p-6 text-ink-900 shadow-e3 ring-1 ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300 md:p-8">
                  <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ov-600 text-white"><k.icon className="h-6 w-6" /></span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">{k.eyebrow}</span>
                    <span className="mt-1 block font-display text-[19px] font-bold leading-snug md:text-[20px]">{k.titel}</span>
                    <span className="mt-2 block text-[14.5px] leading-relaxed text-ink-600">{k.text}</span>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-ov-700">
                      Öffnen <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
