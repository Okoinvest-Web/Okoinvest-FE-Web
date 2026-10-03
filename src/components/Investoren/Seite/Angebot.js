// „Was wir anbieten“ – Bento-Raster nach Einstiegszeitpunkt
import Link from "next/link";
import { ArrowUpRight, BatteryCharging, Building2, FileSignature, Handshake, Layers, Users } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { cn } from "@/components/ui/cn";
import { PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";

function Etikett({ children, dunkel = false }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold", dunkel ? "bg-white/10 text-white/85 ring-1 ring-inset ring-white/15" : "bg-ink-100 text-ink-600")}>
      {children}
    </span>
  );
}

function Symbol({ icon: Icon, ton = "hell" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset",
        ton === "hell" && "bg-ov-50 text-ov-700 ring-ov-200",
        ton === "gruen" && "bg-white/15 text-white ring-white/25",
        ton === "navy" && "bg-white/10 text-ov-300 ring-white/15"
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={1.8} />
    </span>
  );
}

export default function Angebot() {
  const entwicklung = PHASEN.filter((p) => p.id !== "cod");
  const max = Math.max(...entwicklung.map((p) => p.preisProKwp.max));
  return (
    <section data-abschnitt="angebot" aria-labelledby="angebot-titel" className="bg-white pb-20 pt-20 md:pb-24 md:pt-28">
      <div className="ov-container">
        <div className="mb-10 grid gap-6 md:mb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] lg:items-end lg:gap-16">
          <div>
            <SectionHeading eyebrow="Was wir anbieten" title={<span id="angebot-titel">Vom ersten Pachtvertrag bis zur laufenden Anlage.</span>} />
          </div>
          <Reveal>
            <p className="ov-lead text-ink-600">Sie entscheiden, wie viel Entwicklungsrisiko Sie tragen wollen. Je früher der Einstieg, desto günstiger der Preis je kWp&nbsp;– und desto wichtiger ein Partner, der das Projekt bis zum Netz bringt.</p>
          </Reveal>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          {/* Projektrechte – mit Mini-Preistreppe */}
          <Reveal className="relative overflow-hidden rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70 md:col-span-2 md:p-8 lg:col-span-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <Symbol icon={Layers} />
              <Etikett>Einstieg früh · mehr Auswahl</Etikett>
            </div>
            <h3 className="ov-h3 mt-6 text-ink-900">Projektrechte in jeder Phase</h3>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-600">Von gesicherter Fläche über Netzzusage und Aufstellungsbeschluss bis zum Satzungsbeschluss&nbsp;– mit transparentem Stand und offenen Punkten.</p>
            <div className="mt-7 grid grid-cols-5 items-end gap-2 sm:gap-3" aria-hidden="true">
              {entwicklung.map((p) => (
                <div key={p.id} className="min-w-0">
                  <div className="relative h-24 rounded-xl bg-gradient-to-t from-white to-white/40 ring-1 ring-inset ring-ink-200/60 sm:h-28">
                    <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-ink-200/80" />
                    <div
                      className="absolute inset-x-2 rounded-md bg-gradient-to-t from-ov-600 to-ov-400 shadow-[0_6px_14px_-6px_rgba(102,153,51,0.7)]"
                      style={{ bottom: `${(p.preisProKwp.min / max) * 100}%`, top: `${100 - (p.preisProKwp.max / max) * 100}%`, minHeight: 6 }}
                    />
                  </div>
                  <p className="mt-2 truncate text-[11.5px] font-semibold text-ink-700 sm:text-[12.5px]">{p.kurz}</p>
                  <p className="ov-num text-[11px] text-ink-500 sm:text-[12px]">{fmt(p.preisProKwp.min)}–{fmt(p.preisProKwp.max)} €</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-ink-500">Marktspannen je kWp für Projektrechte, Details im Phasenmodell unten.</p>
          </Reveal>

          {/* RTB – hervorgehoben */}
          <Reveal delay={80} className="relative flex flex-col overflow-hidden rounded-3xl bg-ov-700 p-6 text-white md:p-8 lg:col-span-2">
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-ov-400/40 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <Symbol icon={FileSignature} ton="gruen" />
              <Etikett dunkel>Einstieg baureif</Etikett>
            </div>
            <h3 className="ov-h3 relative mt-6">Baureife Projekte (RTB)</h3>
            <p className="relative mt-2 text-[15px] leading-relaxed text-white/85">Baurecht, Netzanschluss, Flächen und Gutachten liegen vor. Auf Wunsch mit EPC aus der Gruppe&nbsp;– eigene Rammtechnik inklusive.</p>
            <ul className="relative mt-auto space-y-2 border-t border-white/15 pt-5 text-[13.5px] text-white/85 max-lg:mt-6">
              {["Baurecht", "Netzanschluss", "Flächen", "Gutachten"].map((x) => (
                <li key={x} className="flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sun-300" />{x} liegt vor</li>
              ))}
            </ul>
          </Reveal>

          {/* Bestand */}
          <Reveal delay={60} className="relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8 lg:col-span-2">
            <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <Symbol icon={Building2} ton="navy" />
              <Etikett dunkel>Einstieg im Betrieb</Etikett>
            </div>
            <h3 className="ov-h3 relative mt-6">Bestandsanlagen &amp; Secondary</h3>
            <p className="relative mt-2 text-[15px] leading-relaxed text-white/75">Laufende Solarparks mit Ertragshistorie, Förderung oder PPA&nbsp;– für Investoren, die Cashflow statt Entwicklungsrisiko suchen.</p>
          </Reveal>

          {/* Co-Development */}
          <Reveal delay={120} className="relative overflow-hidden rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-8 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <Symbol icon={Handshake} />
              <Etikett>Früh, mit Vorkaufsrecht</Etikett>
            </div>
            <h3 className="ov-h3 mt-6 text-ink-900">Co-Development</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">Früh einsteigen, Entwicklung mitfinanzieren, Vorkaufsrecht bei Baureife sichern&nbsp;– mit Meilensteinzahlungen und klarer Governance.</p>
          </Reveal>

          {/* Weitere Wege */}
          <div className="grid gap-4 md:col-span-2 md:grid-cols-2 lg:col-span-2 lg:grid-cols-1 lg:gap-5">
            {[
              { icon: BatteryCharging, titel: "Speicher & Co-Location", text: "Batteriespeicher am selben Netzanschluss wie der Solarpark oder als eigenständiges Projekt an Netzknoten.", href: pfad("/grossspeicher") },
              { icon: Users, titel: "Beteiligung für Bürger", text: "Kleinere Beträge? Über die Genossenschaft beteiligen sich Bürger und Landwirte an Parks vor Ort.", href: pfad("/genossenschaft") },
            ].map((w, i) => (
              <Reveal key={w.href} delay={160 + i * 60} className="flex">
                <Link
                  href={w.href}
                  className="group relative flex w-full items-start gap-4 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 transition-[box-shadow,transform] duration-300 hover:shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 motion-safe:hover:-translate-y-0.5"
                >
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200 transition-colors group-hover:bg-ov-600 group-hover:text-white">
                    <w.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 font-display text-[16px] font-bold text-ink-900">
                      {w.titel}
                      <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-colors group-hover:text-ov-700" />
                    </span>
                    <span className="mt-1 block text-[13.5px] leading-relaxed text-ink-600">{w.text}</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
