// Anfrage-Abschnitt – Formular als Hauptakteur, links Erwartung + Portal
import Link from "next/link";
import { ArrowRight, Clock, LayoutDashboard, Lock, MapPin, Ruler } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import DachAnfrage from "@/components/Dach/DachAnfrage";

const BRAUCHEN = [
  { icon: MapPin, t: "Adresse des Gebäudes" },
  { icon: Ruler, t: "Dachart und ungefähre Größe" },
  { icon: Clock, t: "Persönliche Rückmeldung durch unser Team" },
];

export default function Anfrage() {
  return (
    <section id="anfrage" data-abschnitt="anfrage" aria-labelledby="anfrage-titel" className="relative scroll-mt-24 overflow-clip bg-sand-50 py-20 md:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 h-[480px] w-[480px] rounded-full bg-ov-200/40 blur-[120px]" />
      <div className="ov-container relative grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow="Kostenlos & unverbindlich"
            title={<span id="anfrage-titel">Dach vorstellen – wir melden uns.</span>}
            lead="Nennen Sie uns Adresse, Dachart und ungefähre Größe. Wir prüfen und melden uns persönlich."
          />
          <ul className="mt-8 space-y-3">
            {BRAUCHEN.map((b) => (
              <li key={b.t} className="flex items-center gap-3 text-[15px] text-ink-700">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200">
                  <b.icon aria-hidden="true" className="h-4 w-4" />
                </span>
                {b.t}
              </li>
            ))}
          </ul>

          <Reveal className="ov-verlauf-nacht ov-noise relative mt-10 overflow-hidden rounded-3xl p-6 text-white md:p-8">
            <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
            <div className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-ov-300 ring-1 ring-inset ring-white/15">
                <LayoutDashboard aria-hidden="true" className="h-5 w-5" />
              </span>
              <p className="mt-4 font-display text-[20px] font-bold">Status Ihres Dachs jederzeit im Portal</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">
                Prüfergebnis, Angebot, Vertragsentwürfe, Netzanfrage und Bautermine – alles an einem Ort. Registrieren Sie sich mit derselben E-Mail, dann erscheint Ihre Anfrage automatisch.
              </p>
              <Link href="/registrieren?rolle=flaeche" className="group mt-5 inline-flex items-center gap-2 rounded text-[15px] font-semibold text-ov-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
                Zugang zum Portal anlegen <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            </div>
          </Reveal>
        </div>

        <Reveal className="relative rounded-[2rem] bg-white p-6 shadow-e4 ring-1 ring-ink-200/70 md:p-9">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <p className="mb-6 flex items-center gap-2 text-[13px] font-medium text-ink-500">
            <Lock aria-hidden="true" className="h-3.5 w-3.5 text-ov-600" />
            Prüfung, Angebot und Vertragsentwurf kostenfrei
          </p>
          <DachAnfrage />
        </Reveal>
      </div>
    </section>
  );
}
