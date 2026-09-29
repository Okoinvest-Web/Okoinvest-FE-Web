import { BadgePercent, BarChart3, ClipboardCheck, EyeOff, FileCheck2, FolderLock, Handshake, LayoutList, Send, ShieldCheck, UserPlus, Users } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
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

export default function Anbieten() {
  return (
    <>
      <PageHero
        breadcrumbs={[{ name: "Projektbörse", href: "/projektboerse" }, { name: "Projekt anbieten", href: PFAD }]}
        eyebrow="Für Projektentwickler"
        title={<>Ihr Solarprojekt vor den <span className="ov-text-gradient">richtigen Investoren</span> – vertraulich</>}
        lead={`Anonymes Exposé, Klick-NDA und digitaler Datenraum: Sie behalten die Kontrolle, wir bringen Käufer und Verkäufer zusammen. Provision ${PROVISION.verkaeufer.text}.`}
        image={{ src: "/img/planer-tablet.jpg", alt: "Projektentwickler prüft Planunterlagen am Tablet" }}
        actions={[
          { label: "Als Anbieter registrieren", href: "/registrieren?rolle=anbieter" },
          { label: "Zur Projektbörse", href: "/projektboerse" },
        ]}
        points={["Keine Listungsgebühren", "Anonym bis zur NDA", "Statistik in Echtzeit", "DACH-weit"]}
        badge={
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">Erfolgsprovision</p>
            <p className="ov-num mt-1 font-display text-[28px] font-extrabold text-ink-900">{SPANNE}</p>
            <p className="text-[13px] text-ink-500">nur bei Abschluss</p>
          </div>
        }
      />

      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Warum hier" title="Vermarkten, ohne das Projekt aus der Hand zu geben" lead="Die Börse ist Teil einer Gruppe, die seit 2010 Solarkraftwerke plant, baut und selbst betreibt. Wir kennen die Fragen der Käufer – und bereiten Ihr Projekt entsprechend auf." />
        <FeatureGrid
          className="mt-12"
          items={[
            { icon: EyeOff, title: "Anonym bis zur NDA", text: "Öffentlich nur Region, Leistung, Phase und Preisindikation. Keine Gemeinde, keine Flurstücke – Flächeneigentümer und Gemeinden werden nicht vorzeitig angesprochen." },
            { icon: FolderLock, title: "Datenraum mit Protokoll", text: "Unterlagen sehen nur freigegebene Investoren. Jeder Zugriff wird protokolliert." },
            { icon: BarChart3, title: "Transparente Statistik", text: "Aufrufe, Merker, NDA-Anfragen und LOIs in Ihrem Portal – Sie sehen, wie Ihr Projekt ankommt." },
            { icon: ShieldCheck, title: "Qualitätsprüfung", text: "Jedes Projekt prüfen wir vor der Veröffentlichung. Das schafft Vertrauen auf Käuferseite – und spart Ihnen Rückfragen." },
            { icon: Users, title: "Investoren mit Suchprofil", text: "Registrierte Investoren hinterlegen Größe, Phasen, Länder und Ticket. Passende Projekte sehen sie zuerst." },
            { icon: Handshake, title: "Begleitung bis zum Abschluss", text: "Von der LOI über die Due Diligence bis zum Kaufvertrag begleitet Sie ein fester Ansprechpartner im Backoffice." },
          ]}
        />
      </Section>

      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="Ablauf" title="In fünf Schritten zum geprüften Inserat" />
        <Steps
          className="mt-12"
          cols={3}
          items={[
            { icon: UserPlus, title: "Anbieterkonto anlegen", text: "Kostenlos registrieren. Ihr Konto ist sofort nutzbar." },
            { icon: LayoutList, title: "Projekt erfassen", text: "Grunddaten, Entwicklungsstand, Exposé und vertrauliche Angaben – jeder Schritt wird gespeichert." },
            { icon: BadgePercent, title: "Provision akzeptieren", text: `Erfolgsprovision ${PROVISION.verkaeufer.text} – digital, mit Zeitstempel.` },
            { icon: ClipboardCheck, title: "Prüfung durch das Backoffice", text: "Wir prüfen Angaben und Unterlagen und melden uns bei Rückfragen im Portal." },
            { icon: Send, title: "Veröffentlichung & Vermarktung", text: "Anonymer Teaser in der Börse, Datenraum nach NDA, LOIs und Abschluss im Portal." },
          ]}
        />
      </Section>

      <Section tone="white" space="lg">
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
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-white/70">Provision ({pct(PROVISION.verkaeufer.min)}–{pct(PROVISION.verkaeufer.max)})</dt>
                <dd className="ov-num font-display text-[24px] font-extrabold text-ov-300">{fmtEur(BEISPIEL_KAUFPREIS * PROVISION.verkaeufer.min)} – {fmtEur(BEISPIEL_KAUFPREIS * PROVISION.verkaeufer.max)}</dd>
              </div>
            </dl>
            <p className="relative mt-6 text-[12.5px] leading-relaxed text-white/50">Beispiel auf Basis der Marktspannen für Ready-to-Build ({fmt(RTB.preisProKwp.min)}–{fmt(RTB.preisProKwp.max)} €/kWp, DACH). Der tatsächliche Kaufpreis hängt von Netzanschluss, Vergütung, Standort und Verhandlung ab.</p>
          </Reveal>
        </div>
      </Section>

      <Section tone="ink" space="lg">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeading eyebrow="Qualitätsprüfung" title="Was wir vor der Veröffentlichung prüfen" lead="Keine Due Diligence – aber genug, damit Investoren Ihr Projekt ernst nehmen." />
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["Flächensicherung", "Pacht-, Options- oder Gestattungsverträge und deren Laufzeit"],
              ["Planungsrecht", "Stand der Bauleitplanung, Widmung bzw. Bewilligung"],
              ["Netzanschluss", "Netzanfrage, Zusage oder Reservierung, Entfernung zum Verknüpfungspunkt"],
              ["Plausibilität", "Leistung zu Fläche, Ertragsannahmen, Zeitplan bis zur Inbetriebnahme"],
              ["Preisindikation", "Einordnung gegenüber üblichen Spannen der jeweiligen Phase"],
              ["Anonymität", "Titel und Beschreibung ohne Rückschluss auf die genaue Lage"],
            ].map(([t, x]) => (
              <li key={t} className="rounded-2xl bg-white p-5 ring-1 ring-ink-200/70">
                <p className="font-display text-[16px] font-bold text-ink-900">{t}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-600">{x}</p>
              </li>
            ))}
          </ul>
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
