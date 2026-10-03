// Ersparnis-Rechner-Abschnitt
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import ErsparnisRechner from "@/components/Portal/EG/Mitglied/ErsparnisRechner";

export default function RechnerSektion() {
  return (
    <Section data-abschnitt="rechner" tone="sand" space="lg" id="rechner" className="scroll-mt-24 overflow-x-clip">
      {/* leiser Lichtschein hinter dem Rechner, rein dekorativ */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/3 -z-0 mx-auto h-[28rem] max-w-5xl rounded-full bg-ov-200/40 blur-3xl" />
      {/* Keine Kurzanleitung neben der Überschrift: Der Rechner nummeriert seine drei Eingabeschritte selbst. */}
      <SectionHeading
        eyebrow="Ersparnis-Rechner"
        title={<>Was bringt eine Gemeinschaft <span className="ov-text-gradient">Ihren Mitgliedern?</span></>}
        lead="Verbrauch oder PV-Anlage eingeben – der Rechner nutzt die Netzentgelt-Regeln 2026 und kennzeichnet die Arbeitshypothese für 2027."
        className="relative mb-10 md:mb-14"
      />
      {/* Kein zusätzlicher Rahmen: RechnerRahmen bringt seine weiße Karte selbst mit. dir="ohne": nach dem Ankersprung sofort sichtbar. */}
      <Reveal dir="ohne" className="relative">
        <ErsparnisRechner
          perspektive="vorstand"
          ctaHref="#anfrage"
          ctaLabel="Angebot für Ihre Gemeinschaft"
          ctaHinweis="Mit den Zahlen Ihrer Gemeinschaft – unverbindlich"
          zweitCta={{ label: "Als Mitglied beitreten", href: "/registrieren?rolle=mitglied&weiter=%2Fportal%2Feg%2Fbeitritt" }}
        />
      </Reveal>
    </Section>
  );
}
