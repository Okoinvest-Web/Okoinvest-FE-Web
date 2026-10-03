// Anfrage-Abschnitt /kommunen: links Einordnung + „Was nach dem Absenden passiert“ (mitlaufend ab lg),
// rechts die strukturierte Anfrage (KommuneAnfrage → POST /api/anfrage, unverändert).
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, ClipboardList, Clock, LockKeyhole } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import KommuneAnfrage from "@/components/Kommune/KommuneAnfrage";

// beschreibt genau, was der Erfolgstext der Anfrage zusagt
const ABLAUF = [
  { icon: ClipboardList, titel: "Sie schildern kurz Ihr Anliegen", text: "Konkrete Fläche, Kriterienkatalog oder Stadtwerke-Beteiligung – ein paar Angaben genügen." },
  { icon: BadgeCheck, titel: "Wir bestätigen Ihre Gemeinde", text: "Über die Verwaltung – erst danach zeigen wir Projektdaten aus Ihrem Gemeindegebiet." },
  { icon: CalendarCheck, titel: "Sie erhalten einen Terminvorschlag", text: "Auf Wunsch stellen wir uns im Gemeinderat vor. Nach der Registrierung sehen Sie im Portal die Projekte in Ihrem Gebiet." },
];

// Zeitstrahl – ab lg in der linken Spalte, mobil nach dem Formular; die andere Fassung ist per display:none ausgeblendet.
function Ablauf({ className }) {
  return (
    <div className={className}>
      <p className="ov-overline text-ink-500">Was nach dem Absenden passiert</p>
      <ol className="mt-6">
        {ABLAUF.map(({ icon: Icon, titel, text }, i) => (
          <li key={titel} className="relative flex gap-4 pb-7 last:pb-0">
            {i < ABLAUF.length - 1 && <span aria-hidden="true" className="absolute bottom-1 left-[21px] top-12 w-px bg-gradient-to-b from-ov-400/70 to-ink-200" />}
            <span aria-hidden="true" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-700 shadow-e1 ring-1 ring-ink-200">
              <Icon className="h-5 w-5" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sun-400 text-[11px] font-bold text-navy-950">{i + 1}</span>
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-display text-[16.5px] font-bold leading-snug text-ink-900">
                <span className="sr-only">Schritt {i + 1}: </span>
                {titel}
              </p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-600">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Anfrage() {
  return (
    <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow="Gespräch"
            title="Wir stellen uns im Gemeinderat vor."
            lead="Ob konkrete Fläche, Kriterienkatalog oder Stadtwerke-Beteiligung: Schildern Sie kurz Ihr Anliegen – wir melden uns mit einem Terminvorschlag."
          />
          <Ablauf className="mt-10 max-lg:hidden" />
        </div>

        <Reveal className="relative">
          <div aria-hidden="true" className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <div className="rounded-[2rem] bg-white p-5 shadow-e3 ring-1 ring-ink-200/70 sm:p-7 md:p-9">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-6">
              <div className="min-w-0">
                <p className="font-display text-[20px] font-bold text-ink-900">Anfrage für Ihre Gemeinde</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ov-800">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  Wir melden uns persönlich bei Ihnen.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-500">
                <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
                Unverbindlich anfragen
              </span>
            </div>
            <KommuneAnfrage />
            <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
              Tipp: Im Feld „Unternehmen / Betrieb“ den Namen der Verwaltung bzw. des Stadtwerks angeben. Projektdaten aus Ihrem Gemeindegebiet zeigen wir erst nach Bestätigung der Gemeinde.
            </p>
            <p className="mt-4 border-t border-ink-100 pt-4 text-[14px] text-ink-600">
              Lieber gleich im Portal starten?{" "}
              <Link href="/registrieren?rolle=kommune" className="group inline-flex items-center gap-1 rounded font-semibold text-ov-700 underline decoration-ov-300 underline-offset-4 hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                Konto für Ihre Gemeinde anlegen
                <ArrowRight aria-hidden="true" className="ov-pfeil h-3.5 w-3.5" />
              </Link>
            </p>
          </div>
        </Reveal>
        <Ablauf className="lg:hidden" />
      </div>
    </Section>
  );
}
