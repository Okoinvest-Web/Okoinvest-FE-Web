// Anfrage als Höhepunkt der Seite: dunkle Bühne, helle Formularkarte, Ablauf „Was nach dem Absenden passiert“.
// Reihenfolge mobil: Kopf → Formular → Ablauf. Muster der Referenzseite /energiegemeinschaften/software.
import Section from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { Clock } from "lucide-react";
import T from "@/components/Sprache/T";

function Ablauf({ schritte, className }) {
  return (
    <div className={className}>
      <h3 className="text-ov-300">
        <span className="ov-overline block font-sans"><T de="Was nach dem Absenden passiert" en="What happens after you submit" /></span>
      </h3>
      <ol className="mt-6">
        {schritte.map(({ icon: Icon, titel, text }, i) => (
          <li key={titel} className="relative flex gap-4 pb-7 last:pb-0">
            {i < schritte.length - 1 && <span aria-hidden="true" className="absolute bottom-1 left-[21px] top-12 w-px bg-gradient-to-b from-ov-400/60 to-white/10" />}
            <span aria-hidden="true" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-ov-300 ring-1 ring-white/15">
              <Icon className="h-5 w-5" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sun-400 text-[11px] font-bold text-navy-950">{i + 1}</span>
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-display text-[17px] font-bold leading-snug text-white">
                <span className="sr-only">Schritt {i + 1}: </span>
                {titel}
              </p>
              <p className="mt-1 text-[15px] leading-relaxed text-white/70">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * id, eyebrow, titel (ReactNode), lead
 * zusagen: [{ icon, text }]
 * ablauf:  [{ icon, titel, text }]
 * formTitel, formText: Kopf der Formularkarte
 * antwort: kurze Zusage zur Antwortzeit vor dem Absenden (Conversion-Plan: „was passiert danach“ VOR dem Senden);
 *          Standard ist die auf der Website bereits genutzte Formulierung, null blendet sie aus
 * dekor:   optionale Grafik im Hintergrund (aria-hidden)
 * children: das Formular
 */
/** Leises Hintergrundmotiv: Ringe um einen Energiepunkt (wie das Netzmotiv der Referenzseite) */
export function RingDekor({ className }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 380 380" fill="none" className={className}>
      {[150, 112, 76, 42].map((r, i) => (
        <circle key={r} cx="190" cy="190" r={r} stroke="currentColor" strokeOpacity={0.08 + i * 0.05} strokeDasharray={i === 0 ? "3 6" : undefined} />
      ))}
      {[0, 60, 120, 180, 240, 300].map((w) => {
        const a = (w * Math.PI) / 180;
        return <circle key={w} cx={190 + Math.cos(a) * 112} cy={190 + Math.sin(a) * 112} r={w % 120 === 0 ? 5 : 3.5} fill="currentColor" fillOpacity="0.35" />;
      })}
      <circle cx="190" cy="190" r="16" fill="#f5a70f" fillOpacity="0.85" />
      <circle cx="190" cy="190" r="28" stroke="#f5a70f" strokeOpacity="0.35" />
    </svg>
  );
}

export default function AnfrageBuehne({
  id = "anfrage",
  eyebrow = <T de="Anfrage" en="Enquiry" />,
  titel,
  lead,
  zusagen = [],
  ablauf = [],
  formTitel = <T de="Ihre Anfrage" en="Your enquiry" />,
  formText,
  antwort = <T de="Wir melden uns persönlich bei Ihnen." en="We will get back to you personally." />,
  dekor,
  children,
}) {
  const titelId = `${id}-titel`;
  return (
    <Section data-abschnitt="anfrage" tone="navy" space="lg" id={id} bare aria-labelledby={titelId} className="ov-verlauf-nacht ov-noise scroll-mt-24 overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_20%_30%,#000,transparent)]" />
      {dekor === undefined ? <RingDekor className="pointer-events-none absolute -bottom-28 -left-28 hidden h-[460px] w-[460px] text-ov-300 opacity-50 lg:block" /> : dekor}

      <div className="ov-container relative grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal className="lg:self-start lg:pt-4">
          <Eyebrow dark className="mb-4">
            {eyebrow}
          </Eyebrow>
          <h2 id={titelId} className="ov-h2 text-balance text-white">
            {titel}
          </h2>
          {lead && <p className="ov-lead mt-5 max-w-xl text-pretty text-white/75">{lead}</p>}
          {zusagen.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {zusagen.map(({ icon: Icon, text }) => (
                <li key={text} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/[0.07] px-3.5 py-2 text-[14px] font-medium text-white/90 ring-1 ring-white/15">
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-300" />
                  {text}
                </li>
              ))}
            </ul>
          )}
          {ablauf.length > 0 && <Ablauf schritte={ablauf} className="mt-12 hidden border-t border-white/10 pt-10 lg:block" />}
        </Reveal>

        <Reveal dir="scale" className="relative min-w-0">
          <div aria-hidden="true" className="absolute -inset-6 rounded-[2.75rem] bg-ov-500/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] bg-white text-ink-900 shadow-e4 ring-1 ring-white/20">
            <div className="border-b border-ink-200/70 bg-gradient-to-r from-ov-50 to-white px-6 py-5 sm:px-8 md:px-10">
              <p className="font-display text-[20px] font-bold leading-tight text-ink-900">{formTitel}</p>
              {formText && <p className="mt-1 text-[14px] text-ink-600">{formText}</p>}
              {antwort && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ov-800">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  {antwort}
                </p>
              )}
            </div>
            <div className="p-6 sm:p-8 md:p-10">{children}</div>
          </div>
        </Reveal>

        {ablauf.length > 0 && <Ablauf schritte={ablauf} className="lg:hidden" />}
      </div>
    </Section>
  );
}
