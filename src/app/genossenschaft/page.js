import { AlertTriangle, Building2, ClipboardList, FileText, Landmark, Mail, Scale, ShieldAlert, Sprout, UserCheck, Users, Vote } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import SplitMedia from "@/components/ui/SplitMedia";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import GenossenschaftAufbau from "@/components/Gemeinschaft/GenossenschaftAufbau";
import AnfrageMitDaten from "@/components/Gemeinschaft/AnfrageMitDaten";
import { FAQ_GENOSSENSCHAFT } from "@/data/faq";
import { abs } from "@/data/site";

const PFAD = "/genossenschaft";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Energiegenossenschaft für Solarparks | ÖkoInvest",
  description:
    "Bürger, Landwirte und Gemeinden als Miteigentümer von Solarparks: So funktioniert die geplante Energiegenossenschaft – mit Mitbestimmung, Risiken und Ablauf.",
  keywords: ["Energiegenossenschaft", "Bürgerbeteiligung Solarpark", "Genossenschaft Photovoltaik", "Agri-PV Landwirt Beteiligung", "eG Mitgliedschaft"],
});

const MITGLIEDER = [
  { icon: Users, title: "Bürgerinnen und Bürger", text: "Aus den Standortregionen: am Park vor der eigenen Haustür beteiligt – statt nur daneben zu wohnen." },
  { icon: Sprout, title: "Landwirte & Flächengeber", text: "Wer Flächen für einen Park zur Verfügung stellt, soll bevorzugt Mitglied werden können – zusätzlich zu Pacht oder Agri-PV-Ertrag." },
  { icon: Landmark, title: "Gemeinden", text: "Kommunen können sich beteiligen und so Wertschöpfung über § 6 EEG und Gewerbesteuer hinaus vor Ort halten." },
  { icon: Building2, title: "Unternehmen", text: "Betriebe aus der Region – etwa aus dem Reststrom-Pool – als Mitglieder mit Interesse an regionalem Strom." },
];

const RISIKEN = [
  { icon: AlertTriangle, t: "Verlustrisiko", s: "Genossenschaftsanteile sind unternehmerisches Eigenkapital. Im schlechtesten Fall kann die Einlage ganz verloren gehen." },
  { icon: Scale, t: "Keine garantierte Ausschüttung", s: "Ob und in welcher Höhe ein Überschuss verteilt wird, beschließt die Generalversammlung – abhängig von Ertrag, Strompreisen, Finanzierung und Kosten." },
  { icon: ClipboardList, t: "Eingeschränkte Verfügbarkeit", s: "Anteile sind nicht börsennotiert. Kündigungen sind nur mit Frist zum Geschäftsjahresende möglich; die Auszahlung folgt später." },
  { icon: ShieldAlert, t: "Keine Einlagensicherung", s: "Anders als Bankeinlagen sind Genossenschaftsanteile nicht durch eine Einlagensicherung geschützt. Eine Nachschusspflicht kann die Satzung ausschließen." },
];

const ABLAUF = [
  { icon: Mail, title: "Interesse registrieren", text: "Unverbindlich über das Formular unten. Das ist derzeit der einzige Schritt, der online möglich ist." },
  { icon: FileText, title: "Unterlagen erhalten", text: "Sobald die Genossenschaft gegründet ist: Satzung, wesentliche Informationen zu Projekten und Risiken – vor jeder Entscheidung." },
  { icon: UserCheck, title: "Beitritt erklären", text: "Schriftliche Beitrittserklärung und Zeichnung der Anteile nach der Satzung. Erst dann entsteht eine Zahlungspflicht." },
  { icon: Vote, title: "Mitglied sein", text: "Eintragung in die Mitgliederliste, Stimmrecht in der Generalversammlung, Berichte über die Parks im Portal." },
];

const QUERVERWEISE = [
  { href: "/landwirte", titel: "Für Landwirte", text: "Agri-PV: verpachten, selbst investieren oder über die Genossenschaft beteiligen." },
  { href: "/energiegemeinschaften", titel: "Energiegemeinschaften", text: "Strom aus der Region teilen – Energy Sharing, EEG, LEG im Vergleich." },
  { href: "/kommunen", titel: "Für Kommunen", text: "Wertschöpfung, Beteiligung und Einnahmen der Standortgemeinde." },
  { href: "/rechner/agri-pv", titel: "Agri-PV-Rechner", text: "Pacht, Eigeninvestition und Beteiligung im direkten Vergleich." },
];

const schema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${abs(PFAD)}/#webpage`,
  url: abs(PFAD),
  name: "Energiegenossenschaft – Beteiligung an Solarparks (im Aufbau)",
  description: "Informationen zur geplanten Energiegenossenschaft der ÖkoInvest GmbH für Bürger, Landwirte, Gemeinden und Unternehmen.",
  isPartOf: { "@id": `${abs("/")}/#website` },
  about: { "@id": `${abs("/")}/#organization` },
};

export default function GenossenschaftPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        breadcrumbs={[{ name: "Genossenschaft" }]}
        eyebrow="Energiegenossenschaft · im Aufbau"
        title={
          <>
            Miteigentümer werden – <span className="ov-text-gradient">nicht nur Nachbar.</span>
          </>
        }
        lead="Wir bauen eine Energiegenossenschaft auf, über die sich Bürger, Landwirte, Gemeinden und Unternehmen an den Solarparks der Region beteiligen können. Ein Mitglied, eine Stimme – unabhängig von der Höhe der Einlage."
        image={{ src: "/img/freiflaeche-begehung.jpg", alt: "Begehung einer Freifläche für einen geplanten Solarpark" }}
        points={["Beteiligung an Parks der Region", "Ein Mitglied, eine Stimme", "Landwirte als Mitglieder", "Interesse unverbindlich melden"]}
        actions={[
          { label: "Interesse registrieren", href: "#interesse" },
          { label: "Risiken ansehen", href: "#risiken" },
        ]}
        badge={
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sun-500">Status</p>
            <p className="mt-1.5 font-display text-[20px] font-extrabold leading-tight text-ink-900">Im Aufbau</p>
            <p className="mt-1.5 text-[13px] leading-snug text-ink-600">Noch keine Zeichnung von Anteilen. Registrierte Interessenten erhalten die Unterlagen zuerst.</p>
          </div>
        }
      />

      <Section tone="white" space="sm">
        <Reveal className="flex gap-4 rounded-3xl bg-sun-400/10 p-5 ring-1 ring-sun-400/40 md:p-6">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-sun-500" />
          <p className="text-[15px] leading-relaxed text-ink-700">
            <strong className="text-ink-900">Wichtig:</strong> Diese Seite beschreibt ein geplantes Vorhaben. Sie ist keine Anlageberatung und kein Angebot zum Erwerb
            von Genossenschaftsanteilen. Satzung, Projektauswahl und Beteiligungsbedingungen stehen noch nicht fest; Aussagen zu Ausgestaltung und Rechtslage
            werden vor dem Start rechtlich geprüft.
          </p>
        </Reveal>
      </Section>

      <Section tone="white" space="md">
        <SectionHeading
          eyebrow="Für wen"
          title="Wer Mitglied werden kann"
          lead="Die Genossenschaft soll die Menschen zusammenbringen, die einen Solarpark möglich machen – und die mit ihm leben."
          className="mb-10 md:mb-14"
        />
        <FeatureGrid items={MITGLIEDER} cols={4} />
      </Section>

      <Section tone="sand" space="lg">
        <SplitMedia
          eyebrow="Mitbestimmung"
          title="Ein Mitglied, eine Stimme"
          text={[
            "In einer Genossenschaft entscheidet nicht das größte Kapital. Jedes Mitglied hat in der Generalversammlung grundsätzlich eine Stimme – ob es einen Anteil hält oder zwanzig.",
            "Die Generalversammlung wählt den Aufsichtsrat, der den Vorstand kontrolliert, beschließt über den Jahresabschluss und darüber, ob ein Überschuss ausgeschüttet oder in neue Parks investiert wird. Ein genossenschaftlicher Prüfungs- bzw. Revisionsverband prüft regelmäßig Geschäftsführung und wirtschaftliche Lage.",
          ]}
          points={[
            { title: "Generalversammlung", text: "wählt, beschließt, kontrolliert" },
            { title: "Aufsichtsrat", text: "überwacht den Vorstand" },
            { title: "Vorstand", text: "führt die Geschäfte der Genossenschaft" },
          ]}
          aside={
            <div className="overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-ink-200/70">
              <GenossenschaftAufbau />
            </div>
          }
        />
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            eyebrow="Beteiligung an Parks"
            title="Wie das Geld in die Parks kommt"
            lead="Geplant ist, dass sich die Genossenschaft an den Betreibergesellschaften einzelner Solarparks beteiligt – mit einem Anteil, der zu ihrer Größe passt. Welche Parks das sind, entscheiden die Organe der Genossenschaft."
          />
          <ol className="space-y-4">
            {[
              { t: "Mitglieder zeichnen Anteile", s: "Die Einlagen bilden das Eigenkapital der Genossenschaft." },
              { t: "Beteiligung an einer Parkgesellschaft", s: "Die Genossenschaft erwirbt einen Anteil an einer Betreibergesellschaft – neben ÖkoInvest und gegebenenfalls weiteren Investoren." },
              { t: "Park erzeugt und verkauft Strom", s: "Über EEG-Vergütung, PPA oder den Reststrom-Pool; der Park trägt Kredit, Betrieb und Pacht." },
              { t: "Überschuss an die Genossenschaft", s: "Ihr Anteil am Ergebnis fließt an die Genossenschaft; die Generalversammlung entscheidet über die Verwendung." },
            ].map((s, i) => (
              <Reveal as="li" key={s.t} delay={i * 70} className="flex gap-4 rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-display text-[15px] font-extrabold text-ov-600 ring-1 ring-ov-200">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-semibold text-ink-900">{s.t}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-600">{s.s}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      <Section tone="navy" space="lg" id="risiken" className="scroll-mt-24 overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div className="relative">
          <SectionHeading
            dark
            eyebrow="Risiken"
            title="Was Sie vor einer Beteiligung wissen müssen"
            lead="Eine Genossenschaft ist eine demokratische, aber keine risikolose Form der Beteiligung. Wir benennen die Risiken offen – bevor es um Beträge geht."
            className="mb-10 md:mb-14"
          />
          <ul className="grid gap-4 md:grid-cols-2 md:gap-5">
            {RISIKEN.map((r, i) => (
              <Reveal as="li" key={r.t} delay={i * 70} className="flex gap-4 rounded-3xl bg-white/[0.04] p-6 ring-1 ring-white/10 md:p-7">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sun-400/15 text-sun-400">
                  <r.icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-[18px] font-bold text-white">{r.t}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-white/65">{r.s}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Ablauf"
          title="Der Weg zur Mitgliedschaft"
          lead="Heute können Sie nur Schritt 1 gehen. Alles Weitere folgt erst, wenn die Genossenschaft gegründet ist und Sie alle Unterlagen in Ruhe prüfen konnten."
          className="mb-12 md:mb-16"
        />
        <Steps items={ABLAUF} />
      </Section>

      <Section tone="sand" space="lg" id="interesse" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow="Interesse registrieren"
            title="Als Erste informiert werden"
            lead="Unverbindlich und ohne Zahlungspflicht. Wir melden uns, sobald Satzung, Unterlagen und das erste Projekt feststehen – und nur dafür nutzen wir Ihre Angaben."
          />
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-ink-200/70 sm:p-8 md:p-10">
            <AnfrageMitDaten
              legende="Ihr Interesse"
              zusatz={[
                {
                  name: "rolle",
                  label: "Ich interessiere mich als",
                  art: "chips",
                  optionen: [
                    { id: "buerger", label: "Bürger/in" },
                    { id: "landwirt", label: "Landwirt/in, Flächengeber" },
                    { id: "gemeinde", label: "Gemeinde" },
                    { id: "unternehmen", label: "Unternehmen" },
                  ],
                },
                {
                  name: "land",
                  label: "Land",
                  art: "select",
                  optionen: [
                    { id: "DE", label: "Deutschland" },
                    { id: "AT", label: "Österreich" },
                    { id: "CH", label: "Schweiz" },
                  ],
                },
                { name: "region", label: "Region / Landkreis", art: "text", platzhalter: "z. B. Unterallgäu" },
              ]}
              formular={{
                typ: "genossenschaft",
                felder: ["telefon", "plz", "nachricht"],
                button: "Interesse registrieren",
                erfolgText: "Danke! Ihr Interesse ist vermerkt. Wir informieren Sie, sobald die Unterlagen zur Genossenschaft vorliegen – vorher entstehen für Sie keinerlei Verpflichtungen.",
              }}
              festeDaten={{ hinweis: "Interessenbekundung, keine Zeichnung" }}
            />
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            eyebrow="Häufige Fragen"
            title="Energiegenossenschaft verständlich erklärt"
            lead="Mitbestimmung, Risiken, Prospekt und Prüfung – die wichtigsten Antworten."
          />
          <Faq items={FAQ_GENOSSENSCHAFT} />
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand
        eyebrow="Genossenschaft im Aufbau"
        title="Beteiligung, die vor Ort bleibt."
        text="Registrieren Sie Ihr Interesse unverbindlich. Sie erhalten die Unterlagen zuerst – und entscheiden erst, wenn alles auf dem Tisch liegt."
        primary={{ label: "Interesse registrieren", href: "#interesse" }}
        secondary={{ label: "Für Landwirte", href: "/landwirte" }}
      />
    </div>
  );
}
