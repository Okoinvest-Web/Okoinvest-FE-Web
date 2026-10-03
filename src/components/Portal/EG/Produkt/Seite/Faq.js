// FAQ – Einwände vor dem Formular.
// Eigenes Akkordeon auf <details>: ohne JavaScript bedienbar, Tastatur über <summary>,
// Kurzantwort fett vorn (Scannen), Themen-Sprungmarken links. FAQPage-Schema bleibt erhalten.
import { ArrowDown, ArrowRight, MessageCircleQuestion, Plus, Users, ArrowLeftRight, PiggyBank, Scale, ReceiptText, ShieldCheck } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import JsonLd from "@/components/JsonLd";

// kurz + " " + rest ergibt exakt die bisherige Antwort (auch im Schema).
const FAQ = [
  {
    id: "faq-modelle",
    thema: "Modelle",
    icon: Users,
    q: "Für welche Gemeinschaften ist die Plattform gedacht?",
    kurz: "Für Erneuerbare-Energie-Gemeinschaften (lokal und regional), Bürgerenergiegemeinschaften und gemeinschaftliche Erzeugungsanlagen in Österreich nach den §§ 65–72 ElWG.",
    rest: "Das neue Modell Peer-to-Peer ist im Datenmodell bereits vorgesehen.",
  },
  {
    id: "faq-wechsel",
    thema: "Wechsel",
    icon: ArrowLeftRight,
    q: "Müssen wir bei einem Wechsel alle Zählpunkte neu anmelden?",
    kurz: "Nein.",
    rest: "Die Marktpartner-ID gehört der Gemeinschaft; wir erhalten einen Zugang im EDA-Anwenderportal bzw. eine Bevollmächtigung. Die bestehenden Zustimmungen der Mitglieder bleiben gültig. Für einen Monat rechnen wir parallel und gleichen mit den Werten des Netzbetreibers ab.",
    mehr: { href: "#wechsel", label: "So läuft der Wechsel ab" },
  },
  {
    id: "faq-ersparnis",
    thema: "Ersparnis",
    icon: PiggyBank,
    q: "Wie hoch ist die Ersparnis für ein Mitglied?",
    kurz: "Das hängt vom Modell, vom Verbrauchsprofil und vom Preis in der Gemeinschaft ab.",
    rest: "Öffentlich genannte Beispiele liegen bei rund 50 bis 200 € im Jahr je Haushalt. Der Rechner oben zeigt Ihre Größenordnung – die Netzentgelt-Reduktion zieht der Netzbetreiber direkt auf der Netzrechnung ab.",
    mehr: { href: "#rechner", label: "Zum Rechner" },
  },
  {
    id: "faq-netzentgelte",
    thema: "Netzentgelte",
    icon: Scale,
    q: "Was passiert bei den Netzentgelten ab 2027?",
    kurz: "Mit dem ElWG sollen reduzierte Netzentgelte künftig nach dem Nahebereich (Zonelevel) statt nach der Form der Gemeinschaft berechnet werden.",
    rest: "Die neue Verordnung lag zum 1. Oktober 2026 noch nicht endgültig vor; wir rechnen bis dahin mit einer gekennzeichneten Arbeitshypothese und passen die Werte an, sobald sie feststehen.",
    mehr: { href: "#elwg", label: "Mehr zum ElWG" },
  },
  {
    id: "faq-kosten",
    thema: "Kosten",
    icon: ReceiptText,
    q: "Was kostet die Plattform?",
    kurz: "Wir kalkulieren je Gemeinschaft nach Paket und Größe und legen das Angebot offen dar.",
    rest: "Fragen Sie unverbindlich an – mit wenigen Angaben zu Mitgliedern und Anlagen erhalten Sie ein konkretes Angebot.",
    mehr: { href: "#pakete", label: "Pakete ansehen" },
  },
  {
    id: "faq-datenschutz",
    thema: "Datenschutz",
    icon: ShieldCheck,
    q: "Wer sieht die Viertelstundenwerte der Mitglieder?",
    kurz: "Mitglieder sehen ihre eigenen Werte.",
    rest: "Vorstand und Kassa sehen standardmäßig Summen; eine Einzeleinsicht ist nur mit Zweck möglich und wird protokolliert. Die Betriebsführung arbeitet im Auftrag der Gemeinschaft (Auftragsverarbeitung nach Art. 28 DSGVO).",
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: `${f.kurz} ${f.rest}` } })),
};

export default function Faq() {
  return (
    <Section data-abschnitt="faq" tone="sand" space="lg" aria-labelledby="faq-titel">
      <JsonLd daten={SCHEMA} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading eyebrow="Häufige Fragen" title={<span id="faq-titel">Was Vorstände vor dem Start fragen</span>} lead="Sechs Antworten zu Modellen, Wechsel, Ersparnis, Netzentgelten, Kosten und Datenschutz – jeweils mit der Kurzantwort zuerst." />

          <Reveal as="nav" aria-label="Themen der häufigen Fragen" className="mt-8 hidden lg:block">
            <p className="ov-overline text-ink-500">Direkt zum Thema</p>
            <ul className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
              {FAQ.map(({ id, thema, icon: Icon }) => (
                <li key={id}>
                  <a href={`#${id}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-3 text-[13.5px] sm:px-3.5 sm:text-[14px] font-medium text-ink-700 ring-1 ring-ink-200 transition-colors hover:bg-ov-50 hover:text-ov-800 hover:ring-ov-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                    <Icon aria-hidden="true" className="h-4 w-4 text-ov-600" />
                    {thema}
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={80} className="mt-8 hidden rounded-3xl bg-navy-950 p-6 text-white lg:block">
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-ov-300">
                <MessageCircleQuestion className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[18px] font-bold leading-snug">Ihre Frage ist nicht dabei?</p>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/75">Stellen Sie sie direkt in der Anfrage – im Feld „Ihre Nachricht“ ist Platz dafür.</p>
                <a href="#anfrage" className="group mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-navy-950 transition-colors hover:bg-ov-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950">
                  Zur Anfrage
                  <ArrowDown aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>

        <div>
          <ul className="space-y-3">
            {FAQ.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal as="li" key={f.id} delay={i * 50}>
                  <details
                    id={f.id}
                    open={i === 0}
                    className="group scroll-mt-28 rounded-2xl bg-white/70 ring-1 ring-ink-200/70 transition-[background-color,box-shadow] duration-300 open:bg-white open:shadow-e2 open:ring-ov-200 motion-reduce:transition-none"
                  >
                    <summary className="flex cursor-pointer list-none items-start gap-4 rounded-2xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 md:gap-5 md:p-6 [&::-webkit-details-marker]:hidden">
                      <span aria-hidden="true" className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ink-200/70 transition-colors group-open:bg-ov-600 group-open:text-white group-open:ring-ov-600 sm:flex">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="ov-overline block text-ov-700">{f.thema}</span>
                        <span className="mt-1 block font-display text-[17px] font-bold leading-snug text-ink-900 transition-colors group-hover:text-ov-800 md:text-[18.5px]">{f.q}</span>
                      </span>
                      <span aria-hidden="true" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink-700 ring-1 ring-ink-200 transition-transform duration-300 group-open:rotate-45 group-open:bg-ov-50 group-open:text-ov-700 group-open:ring-ov-200 motion-reduce:transition-none">
                        <Plus className="h-4 w-4" />
                      </span>
                    </summary>
                    <div className="px-5 pb-6 sm:pl-[4.75rem] md:px-6 md:pb-7 md:pl-[5.25rem] md:pr-16">
                      <p className="text-[16px] leading-relaxed text-ink-600 hyphens-manual">
                        <strong className="font-medium text-ink-900">{f.kurz}</strong> {f.rest}
                      </p>
                      {f.mehr && (
                        <a href={f.mehr.href} className="group/mehr mt-4 inline-flex items-center gap-1.5 rounded text-[14.5px] font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                          {f.mehr.label}
                          <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover/mehr:translate-x-0.5" />
                        </a>
                      )}
                    </div>
                  </details>
                </Reveal>
              );
            })}
          </ul>

          {/* Unter lg: Hinweis unter der Liste statt in der Seitenspalte */}
          <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-ink-600 lg:hidden">
            <MessageCircleQuestion aria-hidden="true" className="h-4 w-4 text-ov-600" />
            Ihre Frage ist nicht dabei?
            <a href="#anfrage" className="font-semibold text-ov-700 underline underline-offset-4 hover:text-ov-800">Stellen Sie sie in der Anfrage</a>
          </p>
        </div>
      </div>
    </Section>
  );
}
