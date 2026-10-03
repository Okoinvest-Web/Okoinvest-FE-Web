// Abschnitte der Seite /genossenschaft (Server-Komponenten). Texte inhaltlich unverändert aus der bisherigen Seite.
import { AlertTriangle, ArrowDown, ArrowRight, Building2, ClipboardList, Coins, Factory, FileText, Landmark, Lock, Mail, Scale, ShieldAlert, Sprout, Sun, UserCheck, Users, Vote } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";

/* ---------------- Wichtiger Hinweis (überlappt den Hero) ---------------- */
export function Hinweis() {
  return (
    <section aria-label="Wichtiger Hinweis" className="relative z-10 -mt-12 md:-mt-16">
      <div className="ov-container">
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-e4 ring-1 ring-ink-200/70 sm:flex-row sm:items-start sm:gap-5 md:rounded-[2rem] md:p-7">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-sun-400" />
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sun-50 text-sun-700 ring-1 ring-sun-200">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <p className="text-[15px] leading-relaxed text-ink-700">
            <strong className="text-ink-900">Wichtig:</strong> Diese Seite beschreibt ein geplantes Vorhaben. Sie ist keine Anlageberatung und kein Angebot zum Erwerb von Genossenschaftsanteilen. Satzung, Projektauswahl und Beteiligungsbedingungen stehen noch nicht fest; Aussagen zu Ausgestaltung und Rechtslage werden vor dem Start rechtlich geprüft.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Für wen ---------------- */
const MITGLIEDER = [
  { icon: Users, title: "Bürgerinnen und Bürger", text: "Aus den Standortregionen: am Park vor der eigenen Haustür beteiligt – statt nur daneben zu wohnen.", ton: "bg-ov-600 text-white" },
  { icon: Sprout, title: "Landwirte & Flächengeber", text: "Wer Flächen für einen Park zur Verfügung stellt, soll bevorzugt Mitglied werden können – zusätzlich zu Pacht oder Agri-PV-Ertrag.", ton: "bg-sun-400 text-navy-950" },
  { icon: Landmark, title: "Gemeinden", text: "Kommunen können sich beteiligen und so Wertschöpfung über § 6 EEG und Gewerbesteuer hinaus vor Ort halten.", ton: "bg-navy-700 text-white" },
  { icon: Building2, title: "Unternehmen", text: "Betriebe aus der Region – etwa aus dem Reststrom-Pool – als Mitglieder mit Interesse an regionalem Strom.", ton: "bg-ink-800 text-white" },
];

export function Mitglieder() {
  return (
    <Section tone="white" space="lg">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
        <SectionHeading eyebrow="Für wen" title="Wer Mitglied werden kann" />
        <Reveal>
          <p className="ov-lead text-ink-600 lg:pb-1">Die Genossenschaft soll die Menschen zusammenbringen, die einen Solarpark möglich machen – und die mit ihm leben.</p>
        </Reveal>
      </div>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 md:mt-14 lg:grid-cols-4 lg:gap-5">
        {MITGLIEDER.map((m, i) => (
          <Reveal as="li" key={m.title} delay={i * 70} className="relative flex flex-col overflow-hidden rounded-[1.5rem] bg-sand-50 p-6 ring-1 ring-ink-200/70">
            <span aria-hidden="true" className={cn("flex h-12 w-12 items-center justify-center rounded-2xl shadow-e1", m.ton)}>
              <m.icon className="h-[22px] w-[22px]" />
            </span>
            <h3 className="mt-6 font-display text-[18px] font-bold leading-snug text-ink-900">{m.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{m.text}</p>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

/* ---------------- Wie das Geld in die Parks kommt ---------------- */
const FLUSS = [
  { icon: Users, t: "Mitglieder zeichnen Anteile", s: "Die Einlagen bilden das Eigenkapital der Genossenschaft." },
  { icon: Factory, t: "Beteiligung an einer Parkgesellschaft", s: "Die Genossenschaft erwirbt einen Anteil an einer Betreibergesellschaft – neben ÖkoInvest und gegebenenfalls weiteren Investoren." },
  { icon: Sun, t: "Park erzeugt und verkauft Strom", s: "Über EEG-Vergütung, PPA oder den Reststrom-Pool; der Park trägt Kredit, Betrieb und Pacht." },
  { icon: Coins, t: "Überschuss an die Genossenschaft", s: "Ihr Anteil am Ergebnis fließt an die Genossenschaft; die Generalversammlung entscheidet über die Verwendung." },
];

export function Geldfluss() {
  return (
    <Section tone="white" space="lg">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
        <SectionHeading eyebrow="Beteiligung an Parks" title="Wie das Geld in die Parks kommt" />
        <Reveal>
          <p className="ov-lead text-ink-600 lg:pb-1">
            Geplant ist, dass sich die Genossenschaft an den Betreibergesellschaften einzelner Solarparks beteiligt – mit einem Anteil, der zu ihrer Größe passt. Welche Parks das sind, entscheiden die Organe der Genossenschaft.
          </p>
        </Reveal>
      </div>

      <div className="relative mt-12 md:mt-16">
        <ol className="grid gap-3 lg:grid-cols-4 lg:gap-0">
          {FLUSS.map((f, i) => (
            <Reveal as="li" key={f.t} delay={i * 80} className="relative flex flex-col lg:pr-10 lg:last:pr-0">
              <div className={cn("relative flex h-full flex-col rounded-[1.5rem] p-6 ring-1", i === 3 ? "bg-ov-600 text-white ring-ov-600" : "bg-sand-50 ring-ink-200/70")}>
                <div className="flex items-center justify-between">
                  <span aria-hidden="true" className={cn("flex h-11 w-11 items-center justify-center rounded-2xl ring-1", i === 3 ? "bg-white/15 text-white ring-white/25" : "bg-white text-ov-700 ring-ink-200")}>
                    <f.icon className="h-5 w-5" />
                  </span>
                  <span className={cn("ov-num font-display text-[13px] font-bold", i === 3 ? "text-white/70" : "text-ink-400")}>
                    <span className="sr-only">Schritt </span>0{i + 1}
                  </span>
                </div>
                <p className={cn("mt-5 font-display text-[17px] font-bold leading-snug", i === 3 ? "text-white" : "text-ink-900")}>{f.t}</p>
                <p className={cn("mt-2 text-[14.5px] leading-relaxed", i === 3 ? "text-white/80" : "text-ink-600")}>{f.s}</p>
              </div>
              {i < FLUSS.length - 1 && (
                <>
                  <ArrowRight aria-hidden="true" className="absolute right-2 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-ov-500 lg:block" />
                  <ArrowDown aria-hidden="true" className="mx-auto mt-3 h-5 w-5 text-ov-500 lg:hidden" />
                </>
              )}
            </Reveal>
          ))}
        </ol>
        {/* Rückfluss */}
        <Reveal className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-ov-300 bg-ov-50/60 px-5 py-4 text-[14.5px] text-ink-700">
          <Vote aria-hidden="true" className="h-5 w-5 shrink-0 text-ov-700" />
          <span>
            <strong className="text-ink-900">Und dann?</strong> Die Generalversammlung beschließt, ob ein Überschuss ausgeschüttet oder in neue Parks investiert wird.
          </span>
        </Reveal>
      </div>
    </Section>
  );
}

/* ---------------- Risiken ---------------- */
const RISIKEN = [
  { icon: AlertTriangle, t: "Verlustrisiko", s: "Genossenschaftsanteile sind unternehmerisches Eigenkapital. Im schlechtesten Fall kann die Einlage ganz verloren gehen." },
  { icon: Scale, t: "Keine garantierte Ausschüttung", s: "Ob und in welcher Höhe ein Überschuss verteilt wird, beschließt die Generalversammlung – abhängig von Ertrag, Strompreisen, Finanzierung und Kosten." },
  { icon: ClipboardList, t: "Eingeschränkte Verfügbarkeit", s: "Anteile sind nicht börsennotiert. Kündigungen sind nur mit Frist zum Geschäftsjahresende möglich; die Auszahlung folgt später." },
  { icon: ShieldAlert, t: "Keine Einlagensicherung", s: "Anders als Bankeinlagen sind Genossenschaftsanteile nicht durch eine Einlagensicherung geschützt. Eine Nachschusspflicht kann die Satzung ausschließen." },
];

export function Risiken() {
  return (
    <section id="risiken" aria-labelledby="risiken-titel" className="ov-verlauf-nacht relative isolate scroll-mt-24 overflow-hidden py-20 text-white md:py-32">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-40" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-1/4 -z-10 h-[460px] w-[460px] rounded-full bg-sun-500/10 blur-[120px]" />
      <div className="ov-container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow dark className="mb-4">Risiken</Eyebrow>
          <h2 id="risiken-titel" className="ov-h2 text-balance text-white">Was Sie vor einer Beteiligung wissen müssen</h2>
          <p className="ov-lead mt-5 text-white/70">Eine Genossenschaft ist eine demokratische, aber keine risikolose Form der Beteiligung. Wir benennen die Risiken offen – bevor es um Beträge geht.</p>
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          {RISIKEN.map((r, i) => (
            <Reveal as="li" key={r.t} delay={i * 70} className="flex flex-col rounded-[1.5rem] bg-white/[0.05] p-6 ring-1 ring-inset ring-white/10 backdrop-blur-sm md:p-7">
              <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sun-400/15 text-sun-300 ring-1 ring-inset ring-sun-300/30">
                <r.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-[18px] font-bold text-white">{r.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">{r.s}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Ablauf ---------------- */
const ABLAUF = [
  { icon: Mail, title: "Interesse registrieren", text: "Unverbindlich über das Formular unten. Das ist derzeit der einzige Schritt, der online möglich ist." },
  { icon: FileText, title: "Unterlagen erhalten", text: "Sobald die Genossenschaft gegründet ist: Satzung, wesentliche Informationen zu Projekten und Risiken – vor jeder Entscheidung." },
  { icon: UserCheck, title: "Beitritt erklären", text: "Schriftliche Beitrittserklärung und Zeichnung der Anteile nach der Satzung. Erst dann entsteht eine Zahlungspflicht." },
  { icon: Vote, title: "Mitglied sein", text: "Eintragung in die Mitgliederliste, Stimmrecht in der Generalversammlung, Berichte über die Parks im Portal." },
];

export function Ablauf() {
  return (
    <Section tone="white" space="lg">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
        <SectionHeading eyebrow="Ablauf" title="Der Weg zur Mitgliedschaft" />
        <Reveal>
          <p className="ov-lead text-ink-600 lg:pb-1">Heute können Sie nur Schritt 1 gehen. Alles Weitere folgt erst, wenn die Genossenschaft gegründet ist und Sie alle Unterlagen in Ruhe prüfen konnten.</p>
        </Reveal>
      </div>

      <ol className="relative mt-12 grid gap-4 md:mt-16 lg:grid-cols-4 lg:gap-5">
        {ABLAUF.map((s, i) => {
          const jetzt = i === 0;
          return (
            <Reveal as="li" key={s.title} delay={i * 70} className={cn("relative flex flex-col rounded-[1.5rem] p-6 ring-1", jetzt ? "bg-ov-50 ring-ov-300 shadow-e2" : "bg-white ring-ink-200/70")}>
              <div className="flex items-center justify-between gap-3">
                <span aria-hidden="true" className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", jetzt ? "bg-ov-600 text-white" : "bg-sand-100 text-ink-500")}>
                  <s.icon className="h-5 w-5" />
                </span>
                {jetzt ? (
                  <span className="rounded-full bg-ov-600 px-2.5 py-1 text-[11.5px] font-bold text-white">Heute möglich</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2.5 py-1 text-[11.5px] font-semibold text-ink-500">
                    <Lock aria-hidden="true" className="h-3 w-3" />
                    Nach der Gründung
                  </span>
                )}
              </div>
              <p className="mt-5 font-display text-[17px] font-bold text-ink-900">
                <span className="ov-num mr-1.5 text-ink-400">0{i + 1}</span>
                {s.title}
              </p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{s.text}</p>
              {jetzt && (
                <a href="#interesse" className="mt-auto inline-flex items-center gap-1.5 rounded pt-5 text-[14.5px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                  Zum Formular <ArrowDown aria-hidden="true" className="h-4 w-4" />
                </a>
              )}
            </Reveal>
          );
        })}
      </ol>
    </Section>
  );
}
