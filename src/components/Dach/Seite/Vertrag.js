// Der Dachnutzungsvertrag – als Vertragsblatt mit acht Regelungspunkten
import { CalendarClock, FileSignature, HandCoins, Hammer, KeyRound, ScrollText, ShieldCheck, Wrench } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";

export default function Vertrag({ laufzeit, verlaengerung }) {
  const punkte = [
    { icon: CalendarClock, t: "Laufzeit", x: `Meist ${laufzeit} Jahre ab Inbetriebnahme, dazu ${verlaengerung} – abgestimmt auf die Restnutzungsdauer des Dachs.` },
    { icon: ScrollText, t: "Dienstbarkeit", x: "Beschränkte persönliche Dienstbarkeit für Anlage, Kabelwege und Zugang – Voraussetzung für die Finanzierung, bindet auch Käufer." },
    { icon: ShieldCheck, t: "Rückbau", x: "Rückbau und Wiederherstellung der Dachhaut sind Pflicht des Betreibers, bei größeren Anlagen mit Sicherheit (Bürgschaft)." },
    { icon: HandCoins, t: "Versicherung & Haftung", x: "Betreiber versichert Anlage und Haftpflicht und stellt Sie frei. Abstimmung mit Ihrer Gebäudeversicherung vor dem Bau." },
    { icon: KeyRound, t: "Zugang & Betrieb", x: "Anmeldung, Zeiten, Laufwege, Absturzsicherung, Zugang für Wartung und Störungen – ohne Ihren Betrieb zu stören." },
    { icon: Hammer, t: "Dachsanierung in der Laufzeit", x: "Demontage und Remontage auf Anforderung, Kostenverteilung und Umgang mit dem Ertragsausfall – vorab geregelt." },
    { icon: Wrench, t: "Instandhaltung Dach", x: "Wer wartet Dachhaut, Entwässerung und Lichtbänder unter den Modulen? Klare Pflichten verhindern späteren Streit." },
    { icon: FileSignature, t: "Rechtsnachfolge & Mieter", x: "Übergang bei Verkauf oder Erbe; Regeln für Mieter im Gebäude, etwa für Dachzugang und Stromlieferung." },
  ];

  return (
    <section data-abschnitt="vertrag" aria-labelledby="vertrag-titel" className="relative overflow-clip bg-sand-50 py-20 md:py-28">
      <div className="ov-container grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow="Der Dachnutzungsvertrag"
            title={<span id="vertrag-titel">Was im Vertrag steht – und warum.</span>}
            lead="Ein Dachvertrag bindet Ihr Gebäude für Jahrzehnte. Wir legen den Entwurf offen vor, erklären jede Klausel und geben Ihnen Zeit für die Prüfung mit Anwalt oder Verband."
          />
          <Reveal className="mt-8">
            <Button href="#anfrage" variant="navy" pfeil>Vertragsentwurf anfragen</Button>
          </Reveal>
        </div>

        {/* Vertragsblatt */}
        <Reveal dir="scale" className="relative">
          <div aria-hidden="true" className="absolute inset-x-4 -bottom-3 top-3 rounded-[1.75rem] bg-white/60 ring-1 ring-ink-200/60 max-sm:hidden" />
          <div className="relative overflow-hidden rounded-[1.75rem] bg-white shadow-e3 ring-1 ring-ink-200/70">
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-gradient-to-b from-sand-50 to-white px-5 py-4 md:px-8">
              <p className="flex items-center gap-2.5 font-display text-[15px] font-bold text-ink-900">
                <ScrollText aria-hidden="true" className="h-4 w-4 text-ov-600" />
                Dachnutzungsvertrag
              </p>
              <span className="rounded-full bg-ink-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-600 ring-1 ring-ink-200">Inhalte im Überblick</span>
            </div>
            <ol className="grid sm:grid-cols-2">
              {punkte.map((k, i) => (
                <li key={k.t} className="flex gap-4 border-ink-100 p-5 md:p-6 max-sm:[&:not(:first-child)]:border-t sm:[&:nth-child(n+3)]:border-t sm:[&:nth-child(even)]:border-l">
                  <span className="ov-num mt-0.5 font-display text-[13px] font-bold text-ov-600" aria-hidden="true">§&nbsp;{i + 1}</span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-display text-[16px] font-bold text-ink-900">
                      {k.t}
                      <k.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-300" />
                    </p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">{k.x}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
