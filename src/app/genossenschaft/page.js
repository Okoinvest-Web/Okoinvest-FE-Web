import { Check } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import SplitMedia from "@/components/ui/SplitMedia";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import JsonLd from "@/components/JsonLd";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import GenossenschaftAufbau from "@/components/Gemeinschaft/GenossenschaftAufbau";
import AnfrageMitDaten from "@/components/Gemeinschaft/AnfrageMitDaten";
import Hero from "@/components/Gemeinschaft/Genossenschaft/Hero";
import { Ablauf, Geldfluss, Hinweis, Mitglieder, Risiken } from "@/components/Gemeinschaft/Genossenschaft/Abschnitte";
import { FAQ_GENOSSENSCHAFT } from "@/data/faq";
import { abs } from "@/data/site";

const PFAD = "/genossenschaft";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Energiegenossenschaft für Solarparks | ÖkoInvest",
  description:
    "Bürger, Landwirte und Gemeinden als Miteigentümer von Solarparks: So funktioniert die geplante Energiegenossenschaft – Mitbestimmung, Risiken, Ablauf.",
  keywords: ["Energiegenossenschaft", "Bürgerbeteiligung Solarpark", "Genossenschaft Photovoltaik", "Agri-PV Landwirt Beteiligung", "eG Mitgliedschaft"],
});

const QUERVERWEISE = [
  { href: "/landwirte", titel: "Für Landwirte", text: "Agri-PV: verpachten, selbst investieren oder über die Genossenschaft beteiligen." },
  { href: "/energiegemeinschaften", titel: "Energiegemeinschaften", text: "Strom aus der Region teilen – Energy Sharing, EEG, LEG im Vergleich." },
  { href: "/kommunen", titel: "Für Kommunen", text: "Wertschöpfung, Beteiligung und Einnahmen der Standortgemeinde." },
  { href: "/rechner/agri-pv", titel: "Agri-PV-Rechner", text: "Pacht, Eigeninvestition und Beteiligung im direkten Vergleich." },
  { href: "/rechner/beteiligung", titel: "Beteiligungsrechner", text: "Wie die Ausschüttung einer Energiegenossenschaft entsteht." },
  { href: "/ratgeber/buergerenergie-solarpark-akzeptanz", titel: "Bürgerenergie und Akzeptanz", text: "Solarparks gemeinsam mit der Region planen." },
];

const schema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${abs(PFAD)}/#webpage`,
  url: abs(PFAD),
  name: "Energiegenossenschaft – Beteiligung an Solarparks (in Vorbereitung, noch nicht gegründet)",
  description: "Informationen zur geplanten Energiegenossenschaft der ÖkoInvest GmbH für Bürger, Landwirte, Gemeinden und Unternehmen.",
  isPartOf: { "@id": `${abs("/")}/#website` },
  about: { "@id": `${abs("/")}/#organization` },
};

export default function GenossenschaftPage() {
  return (
    <div className="[&_.ov-lead]:hyphens-manual [&_h2]:hyphens-manual! lg:[&_p]:hyphens-manual">
      <JsonLd daten={schema} />

      <Hero />
      <Hinweis />
      <Mitglieder />

      <Section tone="sand" space="lg">
        <SplitMedia
          eyebrow="Mitbestimmung – so ist eine Genossenschaft aufgebaut"
          title="Ein Mitglied, eine Stimme"
          text={[
            "Unsere Genossenschaft ist in Vorbereitung und noch nicht gegründet. So funktioniert eine Genossenschaft grundsätzlich: Dort entscheidet nicht das größte Kapital. Jedes Mitglied hat in der Generalversammlung grundsätzlich eine Stimme – ob es einen Anteil hält oder zwanzig.",
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

      <Geldfluss />
      <Risiken />
      <Ablauf />

      <Section tone="sand" space="lg" id="interesse" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            className="lg:sticky lg:top-28 lg:self-start"
            eyebrow="Interesse registrieren"
            title="Als Erste informiert werden"
            lead="Unverbindlich und ohne Zahlungspflicht. Wir melden uns, sobald Satzung, Unterlagen und das erste Projekt feststehen – und nur dafür nutzen wir Ihre Angaben."
          >
            <ul className="mt-8 space-y-3 border-t border-ink-200 pt-6 text-[15px] text-ink-700">
              {["Interessenbekundung, keine Zeichnung", "Unterlagen erhalten Sie vor jeder Entscheidung", "Erst mit dem Beitritt entsteht eine Zahlungspflicht"].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ov-100 text-ov-700">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </SectionHeading>
          <Reveal className="rounded-[2rem] bg-white p-5 shadow-e3 ring-1 ring-ink-200/70 sm:p-8 md:p-10">
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
        eyebrow="Genossenschaft in Vorbereitung"
        title="Beteiligung, die vor Ort bleibt."
        text="Registrieren Sie Ihr Interesse unverbindlich. Sie erhalten die Unterlagen zuerst – und entscheiden erst, wenn alles auf dem Tisch liegt."
        primary={{ label: "Interesse registrieren", href: "#interesse" }}
        secondary={{ label: "Für Landwirte", href: "/landwirte" }}
      />
    </div>
  );
}
