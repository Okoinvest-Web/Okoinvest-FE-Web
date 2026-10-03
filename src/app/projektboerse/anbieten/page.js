import { BadgePercent, BarChart3, Check, ClipboardCheck, EyeOff, FileCheck2, FolderLock, Handshake, LayoutList, Lock, Send, ShieldCheck, UserPlus, Users } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import { cn } from "@/components/ui/cn";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import Hero from "@/components/Boerse/Seite/Hero";
import AnbieterBuehne from "@/components/Boerse/Seite/AnbieterBuehne";
import { abs, sprachAlternates } from "@/data/site";
import { PHASEN, PROVISION } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

const PFAD = "/projektboerse/anbieten";
const TITEL = "Solarprojekt verkaufen: Projektbörse | ÖkoInvest";
const SPANNE = `${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100, 0)} %`;
const BESCHREIBUNG = `Solarpark oder Projektrechte verkaufen: anonymes Exposé, NDA per Klick, digitaler Datenraum. Provision ${SPANNE} nur bei Abschluss – keine Listungsgebühren.`;

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: sprachAlternates("/projektboerse/anbieten", "/en/sell-your-project"),
  openGraph: {
    type: "website",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/planer-tablet.jpg"), width: 1280, height: 852, alt: "Projektplanung am Tablet" }],
  },
};

// Beispielrechnung aus den Marktannahmen: baureifes Projekt, Mitte der Preisspanne
const RTB = PHASEN.find((p) => p.id === "rtb");
const BEISPIEL_MWP = 10;
const BEISPIEL_PREIS_KWP = Math.round((RTB.preisProKwp.min + RTB.preisProKwp.max) / 2);
const BEISPIEL_KAUFPREIS = BEISPIEL_MWP * 1000 * BEISPIEL_PREIS_KWP;
const pct = (x) => `${fmt(x * 100, x * 100 % 1 ? 1 : 0)} %`;

const FAQ = [
  {
    q: "Was kostet es, ein Projekt einzustellen?",
    a: `Nichts. Es gibt keine Einstell-, Listungs- oder Datenraumgebühren. Nur wenn ein über die Projektbörse vermittelter Investor Ihr Projekt erwirbt, fällt eine Erfolgsprovision von ${PROVISION.verkaeufer.text.replace(", nur bei erfolgreichem Abschluss", "")} an.`,
  },
  {
    q: "Wie wird der Provisionssatz festgelegt?",
    a: `Der Satz liegt zwischen ${pct(PROVISION.verkaeufer.min)} und ${pct(PROVISION.verkaeufer.max)} des Kaufpreises und richtet sich in der Regel nach Projektgröße und Aufwand. Er wird vor der Veröffentlichung festgelegt und steht in Ihrem Portal. Die Vereinbarung akzeptieren Sie beim Einreichen – mit Zeitstempel protokolliert.`,
  },
  {
    q: "Wer sieht meine Projektdaten?",
    a: "Öffentlich erscheint nur ein anonymer Teaser: Typ, Leistung, Phase, Region, Bundesland bzw. Kanton und Preisindikation. Gemeinde, Flurstücke, Netzbetreiber und Unterlagen sehen nur das Backoffice und Investoren, deren Vertraulichkeitsvereinbarung freigegeben wurde. Sie sehen jederzeit Aufrufe, Merker und NDA-Anfragen.",
  },
  {
    q: "Welche Projekte nehmen Sie auf?",
    a: "Freiflächen-PV, Agri-PV, Parkplatz- und Carport-PV sowie Batteriegroßspeicher in Deutschland, Österreich und der Schweiz – von gesicherten Flächen bis zur Bestandsanlage. Voraussetzung sind nachvollziehbare Angaben zu Flächensicherung, Planungsstand und Netzanschluss.",
  },
  {
    q: "Kann ich das Projekt wieder zurückziehen?",
    a: "Ja. Solange kein Verkauf abgeschlossen ist, nehmen Sie das Projekt mit einem Klick von der Börse und bearbeiten es als Entwurf weiter.",
  },
  {
    q: "Tritt ÖkoInvest selbst als Käufer auf?",
    a: "Die ÖKOVOLT Gruppe entwickelt und betreibt selbst Solarparks und kann im Einzelfall Interesse an Projekten haben. Das legen wir offen; über die Börse gelten für alle Interessenten dieselben Regeln.",
  },
];

const VORTEILE = [
  { icon: EyeOff, title: "Anonym bis zur NDA", text: "Öffentlich nur Region, Leistung, Phase und Preisindikation. Keine Gemeinde, keine Flurstücke – Flächeneigentümer und Gemeinden werden nicht vorzeitig angesprochen." },
  { icon: FolderLock, title: "Datenraum mit Protokoll", text: "Unterlagen sehen nur freigegebene Investoren. Jeder Zugriff wird protokolliert." },
  { icon: BarChart3, title: "Transparente Statistik", text: "Aufrufe, Merker, NDA-Anfragen und LOIs in Ihrem Portal – Sie sehen, wie Ihr Projekt ankommt." },
  { icon: ShieldCheck, title: "Qualitätsprüfung", text: "Jedes Projekt prüfen wir vor der Veröffentlichung. Das schafft Vertrauen auf Käuferseite – und spart Ihnen Rückfragen." },
  { icon: Users, title: "Investoren mit Suchprofil", text: "Registrierte Investoren hinterlegen Größe, Phasen, Länder und Ticket. Passende Projekte sehen sie zuerst." },
  { icon: Handshake, title: "Begleitung bis zum Abschluss", text: "Von der LOI über die Due Diligence bis zum Kaufvertrag begleitet Sie ein fester Ansprechpartner im Backoffice." },
];

const SCHRITTE = [
  { icon: UserPlus, title: "Anbieterkonto anlegen", text: "Kostenlos registrieren. Ihr Konto ist sofort nutzbar." },
  { icon: LayoutList, title: "Projekt erfassen", text: "Grunddaten, Entwicklungsstand, Exposé, Projektdatenblatt und vertrauliche Angaben – jeder Schritt wird gespeichert. Das Datenblatt erscheint nach der NDA im Exposé-PDF." },
  { icon: BadgePercent, title: "Provision akzeptieren", text: `Erfolgsprovision ${PROVISION.verkaeufer.text} – digital, mit Zeitstempel.` },
  { icon: ClipboardCheck, title: "Prüfung durch das Backoffice", text: "Wir prüfen Angaben und Unterlagen und melden uns bei Rückfragen im Portal." },
  { icon: Send, title: "Veröffentlichung & Vermarktung", text: "Anonymer Teaser in der Börse, Datenraum nach NDA, LOIs und Abschluss im Portal." },
];

const PRUEFUNG = [
  ["Flächensicherung", "Pacht-, Options- oder Gestattungsverträge und deren Laufzeit"],
  ["Planungsrecht", "Stand der Bauleitplanung, Widmung bzw. Bewilligung"],
  ["Netzanschluss", "Netzanfrage, Zusage oder Reservierung, Entfernung zum Verknüpfungspunkt"],
  ["Plausibilität", "Leistung zu Fläche, Ertragsannahmen, Zeitplan bis zur Inbetriebnahme"],
  ["Preisindikation", "Einordnung gegenüber üblichen Spannen der jeweiligen Phase"],
  ["Anonymität", "Titel und Beschreibung ohne Rückschluss auf die genaue Lage"],
];

export default function Anbieten() {
  const provAnteilMax = PROVISION.verkaeufer.max * 100;
  return (
    <>
      <Hero
        breadcrumbs={[{ name: "Projektbörse", href: "/projektboerse" }, { name: "Projekt anbieten", href: PFAD }]}
        pill={{ marke: SPANNE, text: "Provision nur bei Abschluss – so rechnet es sich", href: "#provision" }}
        titel={<>Solarprojekt verkaufen – <span className="ov-text-gradient-light">an die richtigen Investoren.</span></>}
        lead={<><span className="font-medium text-white">Anonymes Exposé, Klick-NDA und digitaler Datenraum:</span> Sie behalten die Kontrolle, wir bringen Käufer und Verkäufer zusammen. Provision {PROVISION.verkaeufer.text}.</>}
        aktionen={[
          { label: "Als Anbieter registrieren", href: "/registrieren?rolle=anbieter" },
          { label: "Zur Projektbörse", href: "/projektboerse" },
        ]}
        hinweis="Kostenlos registrieren · keine Einstell-, Listungs- oder Datenraumgebühren"
        versprechen={["Keine Listungsgebühren", "Anonym bis zur NDA", "Statistik in Echtzeit", "DACH-weit"]}
        buehne={<AnbieterBuehne />}
      />

      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Warum hier" title="Vermarkten, ohne das Projekt aus der Hand zu geben" lead="Die Börse ist Teil einer Gruppe, die seit 2010 Solarkraftwerke plant, baut und selbst betreibt. Wir kennen die Fragen der Käufer – und bereiten Ihr Projekt entsprechend auf." />
        <ul className="mt-12 grid gap-4 md:mt-16 md:grid-cols-2 lg:grid-cols-3">
          {VORTEILE.map((v, i) => {
            const Icon = v.icon;
            const gross = i === 0;
            const band = i === VORTEILE.length - 1;
            return (
              <Reveal
                as="li"
                key={v.title}
                delay={i * 60}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-[1.75rem] p-6 ring-1 md:p-7",
                  gross ? "ov-noise bg-navy-950 text-white ring-navy-900 md:col-span-2 lg:col-span-1 lg:row-span-2" : "bg-sand-50 ring-ink-200/60",
                  band && "md:col-span-2 lg:col-span-3 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-x-6"
                )}
              >
                {gross && <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-ov-500/25 blur-[80px]" />}
                <span className={cn("relative flex h-11 w-11 items-center justify-center rounded-2xl", gross ? "bg-white/10 text-ov-300" : "bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200/60")}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className={cn("relative", band && "lg:min-w-0")}>
                  <h3 className={cn("mt-5 font-display font-bold leading-snug", gross ? "text-[22px] text-white" : "text-[18px] text-ink-900", band && "lg:mt-0")}>{v.title}</h3>
                  <p className={cn("mt-2 text-[15px] leading-relaxed", gross ? "text-white/70" : "text-ink-600", band && "lg:mt-1")}>{v.text}</p>
                </div>
                {band && <Button href="/registrieren?rolle=anbieter" variant="secondary" pfeil className="mt-5 justify-self-start lg:mt-0">Anbieterkonto anlegen</Button>}
                {gross && (
                  <div className="relative mt-auto pt-8" aria-hidden="true">
                    <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-inset ring-white/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ov-300">Öffentlicher Teaser</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {["Typ", "Leistung", "Phase", "Region", "Preis"].map((x) => (
                          <span key={x} className="inline-flex items-center gap-1 rounded-full bg-ov-400/15 px-2 py-1 text-[11.5px] font-medium text-ov-200 ring-1 ring-inset ring-ov-300/30"><Check className="h-3 w-3" strokeWidth={3} />{x}</span>
                        ))}
                      </div>
                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Erst nach NDA</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {["Gemeinde", "Flurstücke", "Netzbetreiber", "Unterlagen"].map((x) => (
                          <span key={x} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11.5px] font-medium text-white/50 ring-1 ring-inset ring-white/10"><Lock className="h-3 w-3" />{x}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Reveal>
            );
          })}
        </ul>
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <SectionHeading eyebrow="Ablauf" title="In fünf Schritten zum geprüften Inserat" />
          <Button href="/registrieren?rolle=anbieter" pfeil className="justify-self-start">Jetzt starten</Button>
        </div>
        <ol className="relative mt-12 grid gap-4 sm:grid-cols-2 md:mt-16 lg:grid-cols-5 lg:gap-3">
          <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-[2.375rem] hidden h-px bg-gradient-to-r from-ov-200 via-ov-400 to-ov-200 lg:block" />
          {SCHRITTE.map((s, i) => {
            const Icon = s.icon;
            const letzter = i === SCHRITTE.length - 1;
            return (
              <Reveal as="li" key={s.title} delay={i * 70} className={cn("relative flex min-w-0 flex-col rounded-[1.5rem] p-5 ring-1 lg:p-6", letzter ? "bg-ov-600 text-white ring-ov-600 sm:col-span-2 lg:col-span-1" : "bg-white ring-ink-200/60")}>
                <div className="flex items-center justify-between">
                  <span className={cn("relative z-10 flex h-[2.75rem] w-[2.75rem] items-center justify-center rounded-2xl", letzter ? "bg-white/15 text-white" : "bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200")}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className={cn("ov-num font-display text-[13px] font-bold", letzter ? "text-white/80" : "text-ov-700")}>Schritt {i + 1}</span>
                </div>
                <h3 lang="de" className={cn("mt-5 font-display text-[17px] font-bold leading-snug [hyphens:auto]", letzter ? "text-white" : "text-ink-900")}>{s.title}</h3>
                <p lang="de" className={cn("mt-2 text-[14px] leading-relaxed [hyphens:auto]", letzter ? "text-white/85" : "text-ink-600")}>{s.text}</p>
              </Reveal>
            );
          })}
        </ol>
      </Section>

      <Section tone="white" space="lg" id="provision" className="scroll-mt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading eyebrow="Provision" title="Transparent – und nur bei Erfolg" lead="Keine Grundgebühr, keine Laufzeit, keine Exklusivbindung für das Inserat. Die Provision zahlt der Verkäufer nur, wenn ein über die Börse vermittelter Investor kauft." />
            <ul className="mt-8 space-y-3 text-[15.5px] text-ink-700">
              <li className="flex gap-3"><FileCheck2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> Satz zwischen {pct(PROVISION.verkaeufer.min)} und {pct(PROVISION.verkaeufer.max)} des Kaufpreises</li>
              <li className="flex gap-3"><FileCheck2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> Festgelegt vor der Veröffentlichung, im Portal einsehbar</li>
              <li className="flex gap-3"><FileCheck2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> {PROVISION.kaeufer.text.charAt(0).toUpperCase() + PROVISION.kaeufer.text.slice(1)}</li>
            </ul>
          </div>
          <Reveal className="ov-noise relative overflow-hidden rounded-[2rem] bg-navy-950 p-7 text-white md:p-10">
            <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ov-500/30 blur-[100px]" />
            <p className="relative text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">Rechenbeispiel</p>
            <p className="relative mt-3 text-[15px] text-white/70">Baureifes Freiflächenprojekt mit {BEISPIEL_MWP} MWp, Kaufpreis in der Mitte der üblichen Spanne ({fmt(BEISPIEL_PREIS_KWP)} €/kWp):</p>
            <dl className="relative mt-6 space-y-4">
              <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-4">
                <dt className="text-white/70">Kaufpreis Projektrechte</dt>
                <dd className="ov-num font-display text-[24px] font-extrabold">{fmtEur(BEISPIEL_KAUFPREIS)}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <dt className="text-white/70">Provision ({pct(PROVISION.verkaeufer.min)}–{pct(PROVISION.verkaeufer.max)})</dt>
                <dd className="ov-num font-display text-[24px] font-extrabold text-ov-300">{fmtEur(BEISPIEL_KAUFPREIS * PROVISION.verkaeufer.min)} – {fmtEur(BEISPIEL_KAUFPREIS * PROVISION.verkaeufer.max)}</dd>
              </div>
            </dl>
            {/* Anteil der Provision am Kaufpreis, maßstäblich */}
            <div className="relative mt-6" aria-hidden="true">
              <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
                <span className="h-full bg-white/30" style={{ width: `${100 - provAnteilMax}%` }} />
                <span className="h-full bg-ov-400" style={{ width: `${provAnteilMax}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[11.5px] text-white/55">
                <span>Kaufpreis</span>
                <span className="text-ov-300">Provision höchstens {pct(PROVISION.verkaeufer.max)}</span>
              </div>
            </div>
            <p className="relative mt-6 text-[12.5px] leading-relaxed text-white/50">Beispiel auf Basis der Marktspannen für Ready-to-Build ({fmt(RTB.preisProKwp.min)}–{fmt(RTB.preisProKwp.max)} €/kWp, DACH). Der tatsächliche Kaufpreis hängt von Netzanschluss, Vergütung, Standort und Verhandlung ab.</p>
          </Reveal>
        </div>
      </Section>

      <Section tone="navy" space="lg" className="ov-verlauf-nacht ov-noise overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <SectionHeading dark eyebrow="Qualitätsprüfung" title="Was wir vor der Veröffentlichung prüfen" lead="Keine Due Diligence – aber genug, damit Investoren Ihr Projekt ernst nehmen." />
            <Button href="/registrieren?rolle=anbieter" variant="white" pfeil className="mt-8">Projekt einreichen</Button>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {PRUEFUNG.map(([t, x], i) => (
              <Reveal as="li" key={t} delay={i * 50} className="flex gap-4 rounded-2xl bg-white/[0.05] p-5 ring-1 ring-inset ring-white/10">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ov-400/15 text-ov-300 ring-1 ring-inset ring-ov-300/40">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[16px] font-bold text-white">{t}</span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-white/65">{x}</span>
                </span>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHeading eyebrow="Häufige Fragen" title="Projekt anbieten: Antworten" />
            <Button href="/registrieren?rolle=anbieter" className="mt-8" pfeil>Jetzt Anbieterkonto anlegen</Button>
          </div>
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/projektboerse", titel: "Projektbörse", text: "Alle veröffentlichten Projekte mit Filtern" },
          { href: "/rechner/projektbewertung", titel: "Projektbewertung", text: "Wert Ihres Projekts je Phase einschätzen" },
          { href: "/investoren", titel: "Für Investoren", text: "So prüfen Käufer Projekte" },
        ]}
      />

      <CtaBand
        eyebrow="Projekt anbieten"
        title="Bereit, Ihr Projekt zu vermarkten?"
        text="Konto anlegen, Projekt erfassen, einreichen – wir melden uns im Portal. Provision nur bei Abschluss."
        primary={{ label: "Als Anbieter registrieren", href: "/registrieren?rolle=anbieter" }}
        secondary={{ label: "Zur Projektbörse", href: "/projektboerse" }}
      />
    </>
  );
}
