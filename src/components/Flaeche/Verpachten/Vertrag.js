// Pachtvertrag (Gliederung als Dokument) und Steuern – Inhalte unverändert aus der bisherigen Seite
import {
  CalendarClock, FileSignature, HandCoins, KeyRound, Landmark, Route, Scale, ScrollText, ShieldCheck, Sprout, Wheat,
} from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { PACHT, STAND } from "@/lib/invest/markt";

const KLAUSELN = [
  { icon: CalendarClock, t: "Laufzeit", x: `${PACHT.laufzeit} Jahre ab Inbetriebnahme, dazu ${PACHT.verlaengerung} für den Betreiber – an eine höhere Pacht gekoppelt.` },
  { icon: ScrollText, t: "Dienstbarkeit im Grundbuch", x: "Beschränkte persönliche Dienstbarkeit für Anlage, Kabel und Zufahrt – Voraussetzung für jede Bankfinanzierung." },
  { icon: ShieldCheck, t: "Rückbaubürgschaft", x: "Rückbau und Wiederherstellung sind Pflicht des Betreibers, abgesichert durch eine Bank- oder Versicherungsbürgschaft." },
  { icon: Sprout, t: "Bewirtschaftung & Pflege", x: "Bis Baubeginn bewirtschaften Sie weiter. Im Betrieb Pflege durch Mahd oder Beweidung – gern durch Sie oder Ihren Pächter, gegen Vergütung." },
  { icon: Route, t: "Wegerecht & Kabeltrasse", x: "Zufahrt und Kabel über Ihre oder fremde Flurstücke werden gesondert gesichert und entschädigt." },
  { icon: KeyRound, t: "Rücktritt & Fristen", x: "Klare Fristen, bis wann Baurecht und Netz vorliegen müssen. Scheitert das Projekt, erhalten Sie Ihre Fläche frei zurück." },
  { icon: HandCoins, t: "Pacht & Zahlungstermin", x: "Pachtmodell, Indexierung, Fälligkeit (meist jährlich im Voraus) und Reservierungsprämie bis Baubeginn." },
  { icon: Scale, t: "Rechtsnachfolge & Haftung", x: "Vertrag bindet Erben und Käufer; Betreiber versichert Anlage und Haftpflicht und stellt Sie von Schäden frei." },
];

const SICHERUNGEN = [
  { t: "Vertrag", x: "Rückbaupflicht und Fristen", c: "bg-white text-navy-950" },
  { t: "Grundbuch", x: "Dienstbarkeit bindet Rechtsnachfolger", c: "bg-ov-300 text-navy-950" },
  { t: "Bürgschaft", x: "Bank oder Versicherung, vor Baubeginn", c: "bg-sun-400 text-navy-950" },
];

export function Vertrag() {
  return (
    <Section tone="sand" space="lg">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow="Der Pachtvertrag"
            title="Was im Vertrag steht – und warum."
            lead="Ein Solarpark-Pachtvertrag ist ein Nutzungsvertrag über Jahrzehnte. Wir legen ihn offen vor, erklären jede Klausel und geben Ihnen Zeit für die Prüfung mit Anwalt oder Verband."
          />
          {/* Dreifach gesichert */}
          <Reveal className="ov-noise relative mt-8 overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-7">
            <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-60" />
            <p className="ov-overline relative text-ov-300">Ihre Fläche kommt zurück</p>
            <p className="relative mt-2 font-display text-[20px] font-bold leading-snug">Dreifach gesichert – auch wenn es den Betreiber nicht mehr gibt.</p>
            <ol className="relative mt-6 space-y-2">
              {SICHERUNGEN.map((s, i) => (
                <li key={s.t} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-2.5 pr-4 ring-1 ring-white/10" style={{ marginLeft: `${i * 14}px` }}>
                  <span className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 font-display text-[14px] font-extrabold ${s.c}`}>{i + 1}</span>
                  <span className="min-w-0 text-[14px] leading-snug">
                    <span className="font-bold text-white">{s.t}</span>
                    <span className="text-white/70"> · {s.x}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>

        {/* Gliederung als Vertragsdokument */}
        <Reveal dir="scale" className="relative">
          <div aria-hidden="true" className="absolute inset-x-6 -bottom-3 top-3 rotate-[1.2deg] rounded-[1.75rem] bg-white/60 ring-1 ring-ink-200/60" />
          <div className="relative overflow-hidden rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-5 md:px-8">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-ov-200">
                  <FileSignature className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-[17px] font-bold leading-tight text-ink-900">Nutzungsvertrag Solarpark</h3>
                  <p className="text-[13px] text-ink-600">Die acht Punkte, auf die es ankommt</p>
                </div>
              </div>
              <span className="rounded-full bg-ink-50 px-3 py-1 text-[12px] font-semibold text-ink-600 ring-1 ring-ink-200">Gliederung</span>
            </div>
            <ol className="grid sm:grid-cols-2">
              {KLAUSELN.map((k, i) => (
                <li key={k.t} className="flex gap-4 border-b border-ink-100 px-6 py-5 sm:odd:border-r md:px-8 md:py-6 sm:[&:nth-last-child(-n+2)]:border-b-0 last:border-b-0">
                  <span aria-hidden="true" className="ov-num mt-0.5 w-7 shrink-0 font-display text-[13px] font-extrabold text-ov-600">§ {i + 1}</span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-display text-[16.5px] font-bold text-ink-900">
                      <k.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" />
                      {k.t}
                    </p>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

const STEUERN = [
  { icon: HandCoins, t: "Einkommensteuer", x: "Pachteinnahmen sind steuerpflichtig – je nach Lage als Einkünfte aus Vermietung und Verpachtung oder, bei Betriebsvermögen, im landwirtschaftlichen Betrieb. Auch eine Entnahme aus dem Betriebsvermögen kann ein Thema sein." },
  { icon: Landmark, t: "Grundsteuer", x: "Solarpark-Flächen werden in Deutschland in der Regel nicht mehr als land- und forstwirtschaftliches Vermögen (Grundsteuer A), sondern als Grundvermögen (Grundsteuer B) bewertet. Bayern weicht davon ab. Die Grundsteuer übernimmt vertraglich oft der Betreiber." },
  { icon: Wheat, t: "Erbschaft & Schenkung", x: "Verpachtete Solarflächen fallen nach derzeitiger Verwaltungsauffassung meist aus dem begünstigten land- und forstwirtschaftlichen Vermögen. Verbände fordern eine Neuregelung; bei Agri-PV bleibt die landwirtschaftliche Nutzung erhalten. Früh gestalten lohnt sich." },
  { icon: FileSignature, t: "Umsatzsteuer", x: "Die Verpachtung von Grundstücken ist grundsätzlich umsatzsteuerfrei, eine Option zur Umsatzsteuer ist möglich. Für pauschalierende Landwirte gelten Besonderheiten." },
];

export function Steuern() {
  return (
    <Section tone="white" space="lg">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <SectionHeading
          eyebrow="Steuern & Erbschaft"
          title="Vor der Unterschrift zur Steuerberatung."
          lead="Die Pacht ist attraktiv – steuerlich hat die Verpachtung für einen Solarpark aber Folgen, die Sie kennen sollten. Die Punkte unten sind eine Orientierung, keine Steuerberatung."
        />
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full bg-sun-50 px-4 py-2 text-[13.5px] font-semibold text-sun-700 ring-1 ring-sun-200">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sun-400" />
            Wichtig für die Erbfolge
          </p>
        </Reveal>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STEUERN.map((k, i) => (
          <Reveal key={k.t} delay={i * 70} className={`relative flex flex-col rounded-3xl p-6 ring-1 md:p-7 ${k.t.startsWith("Erbschaft") ? "bg-sun-50 ring-sun-200" : "bg-sand-50 ring-ink-200/60"}`}>
            <span aria-hidden="true" className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-e1 ring-1 ${k.t.startsWith("Erbschaft") ? "text-sun-600 ring-sun-200" : "text-ov-600 ring-ink-200"}`}>
              <k.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-5 font-display text-[18px] font-bold text-ink-900">{k.t}</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
          </Reveal>
        ))}
      </div>
      <p className="mt-8 max-w-4xl text-[13.5px] leading-relaxed text-ink-500">
        Deutschland, Stand {STAND}; in Österreich und der Schweiz gelten eigene Regeln (z. B. Einheitswert bzw. kantonales Steuerrecht). Die Rechtslage – insbesondere zur Erbschaftsteuer – ist in Bewegung. Bitte lassen Sie Ihren Fall vor Vertragsschluss von Ihrer Steuerberatung prüfen.
      </p>
    </Section>
  );
}
