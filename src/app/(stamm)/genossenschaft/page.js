import { Check } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import SplitMedia from "@/components/ui/SplitMedia";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import JsonLd from "@/components/JsonLd";
import { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import GenossenschaftAufbau from "@/components/Gemeinschaft/GenossenschaftAufbau";
import AnfrageMitDaten from "@/components/Gemeinschaft/AnfrageMitDaten";
import Hero from "@/components/Gemeinschaft/Genossenschaft/Hero";
import { Ablauf, Geldfluss, Hinweis, Mitglieder, Risiken } from "@/components/Gemeinschaft/Genossenschaft/Abschnitte";
import { FAQ_GENOSSENSCHAFT } from "@/data/faq";
import { FAQ_GENOSSENSCHAFT_EN } from "@/data/faq-en";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { abs } from "@/data/site";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage, landDerAnfrage } from "@/lib/land/seite";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

const PFAD = seitenPfad("/genossenschaft");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Energiegenossenschaft für Solarparks | ÖkoInvest",
  description:
    "Bürger, Landwirte und Gemeinden als Miteigentümer von Solarparks: So funktioniert die geplante Energiegenossenschaft – Mitbestimmung, Risiken, Ablauf.",
  keywords: ["Energiegenossenschaft", "Bürgerbeteiligung Solarpark", "Genossenschaft Photovoltaik", "Agri-PV Landwirt Beteiligung", "eG Mitgliedschaft"],
});

const metadataEn = rechnerMetadataEn({
  title: "Energy cooperative for solar parks | ÖkoInvest",
  description: "Citizens, farmers and municipalities as co-owners of solar parks: how the planned energy cooperative works – co-determination, risks, process.",
  keywords: ["energy cooperative", "citizen participation solar park", "photovoltaic cooperative", "agrivoltaics farmer participation", "cooperative membership"],
});

/* Sprachmodell: englische Fassung (gleiche Reihenfolge) */
const QUERVERWEISE_EN = [
  { titel: "For farmers", text: "Agrivoltaics: lease, invest yourself or participate via the cooperative." },
  { titel: "Energy communities", text: "Share power from the region – energy sharing, EEG, LEG compared." },
  { titel: "For municipalities", text: "Value creation, participation and income for the host municipality." },
  { titel: "Agrivoltaics calculator", text: "Lease, own investment and participation compared directly." },
  { titel: "Participation calculator", text: "How an energy cooperative’s distribution comes about." },
  { titel: "Citizen energy and acceptance", text: "Planning solar parks together with the region." },
];

const QUERVERWEISE = [
  { href: seitenPfad("/landwirte"), titel: "Für Landwirte", text: "Agri-PV: verpachten, selbst investieren oder über die Genossenschaft beteiligen." },
  { href: seitenPfad("/energiegemeinschaften"), titel: "Energiegemeinschaften", text: "Strom aus der Region teilen – Energy Sharing, EEG, LEG im Vergleich." },
  { href: seitenPfad("/kommunen"), titel: "Für Kommunen", text: "Wertschöpfung, Beteiligung und Einnahmen der Standortgemeinde." },
  { href: seitenPfad("/rechner/agri-pv"), titel: "Agri-PV-Rechner", text: "Pacht, Eigeninvestition und Beteiligung im direkten Vergleich." },
  { href: seitenPfad("/rechner/beteiligung"), titel: "Beteiligungsrechner", text: "Wie die Ausschüttung einer Energiegenossenschaft entsteht." },
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
const schemaEn = {
  ...schema,
  name: "Energy cooperative – participation in solar parks (in preparation, not yet founded)",
  description: "Information on the planned energy cooperative of ÖkoInvest GmbH for citizens, farmers, municipalities and businesses.",
};

export default async function GenossenschaftPage({ params }) {
  await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  return chBaum(
    <div className="[&_.ov-lead]:hyphens-manual [&_h2]:hyphens-manual! lg:[&_p]:hyphens-manual">
      <JsonLd daten={en ? schemaEn : schema} />

      <Hero />
      <Hinweis />
      <Mitglieder />

      <Section tone="sand" space="lg">
        {en ? (
          <SplitMedia
            eyebrow="Co-determination – how a cooperative is structured"
            title="One member, one vote"
            text={[
              "Our cooperative is in preparation and has not yet been founded. This is how a cooperative works in principle: it is not the largest capital that decides. In the general meeting, each member generally has one vote – whether they hold one share or twenty.",
              "The general meeting elects the supervisory board, which oversees the management board, approves the annual financial statements and decides whether a surplus is distributed or invested in new parks. A cooperative auditing association regularly reviews management and the financial position.",
            ]}
            points={[
              { title: "General meeting", text: "elects, decides, oversees" },
              { title: "Supervisory board", text: "monitors the management board" },
              { title: "Management board", text: "runs the cooperative’s business" },
            ]}
            aside={
              <div className="overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-ink-200/70">
                <GenossenschaftAufbau />
              </div>
            }
          />
        ) : (
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
        )}
      </Section>

      <Geldfluss />
      <Risiken />
      <Ablauf />

      <Section tone="sand" space="lg" id="interesse" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            className="lg:sticky lg:top-28 lg:self-start"
            eyebrow={en ? "Register interest" : "Interesse registrieren"}
            title={en ? "Be the first to be informed" : "Als Erste informiert werden"}
            lead={
              en
                ? "Without obligation and without any payment obligation. We will get in touch as soon as the articles of association, documents and the first project are in place – and we only use your details for this purpose."
                : "Unverbindlich und ohne Zahlungspflicht. Wir melden uns, sobald Satzung, Unterlagen und das erste Projekt feststehen – und nur dafür nutzen wir Ihre Angaben."
            }
          >
            <ul className="mt-8 space-y-3 border-t border-ink-200 pt-6 text-[15px] text-ink-700">
              {(en
                ? ["Expression of interest, not a subscription", "You receive the documents before any decision", "A payment obligation only arises when you join"]
                : ["Interessenbekundung, keine Zeichnung", "Unterlagen erhalten Sie vor jeder Entscheidung", "Erst mit dem Beitritt entsteht eine Zahlungspflicht"]
              ).map((t) => (
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
            {en ? (
              <AnfrageMitDaten
                legende="Your interest"
                zusatz={[
                  {
                    name: "rolle",
                    label: "I am interested as a",
                    art: "chips",
                    optionen: [
                      { id: "buerger", label: "Citizen" },
                      { id: "landwirt", label: "Farmer, landowner" },
                      { id: "gemeinde", label: "Municipality" },
                      { id: "unternehmen", label: "Business" },
                    ],
                  },
                  {
                    name: "land",
                    label: "Country",
                    art: "select",
                    optionen: [
                      { id: "DE", label: "Germany" },
                      { id: "AT", label: "Austria" },
                      { id: "CH", label: "Switzerland" },
                    ],
                  },
                  { name: "region", label: "Region / district", art: "text", platzhalter: "e.g. Unterallgäu" },
                ]}
                formular={{
                  typ: "genossenschaft",
                  felder: ["telefon", "plz", "nachricht"],
                  button: "Register interest",
                  erfolgText: "Thank you! Your interest has been noted. We will inform you as soon as the cooperative’s documents are available – until then you have no obligations whatsoever.",
                }}
                festeDaten={{ hinweis: "Interessenbekundung, keine Zeichnung" }}
              />
            ) : (
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
            )}
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            eyebrow={en ? "Frequently asked questions" : "Häufige Fragen"}
            title={en ? "The energy cooperative explained" : "Energiegenossenschaft verständlich erklärt"}
            lead={en ? "Co-determination, risks, prospectus and audit – the key answers." : "Mitbestimmung, Risiken, Prospekt und Prüfung – die wichtigsten Antworten."}
          />
          <Faq items={en ? uebersetze({ de: FAQ_GENOSSENSCHAFT, en: FAQ_GENOSSENSCHAFT_EN }, "en") : FAQ_GENOSSENSCHAFT} />
        </div>
      </Section>

      <Querverweise items={en ? uebersetze({ de: QUERVERWEISE, en: QUERVERWEISE_EN }, "en") : QUERVERWEISE} />
      {en ? (
        <CtaBand
          eyebrow="Cooperative in preparation"
          title="Participation that stays local."
          text="Register your interest without obligation. You receive the documents first – and only decide once everything is on the table."
          primary={{ label: "Register interest", href: "#interesse" }}
          secondary={{ label: "For farmers", href: seitenPfad("/landwirte") }}
        />
      ) : (
      <CtaBand
        eyebrow="Genossenschaft in Vorbereitung"
        title="Beteiligung, die vor Ort bleibt."
        text="Registrieren Sie Ihr Interesse unverbindlich. Sie erhalten die Unterlagen zuerst – und entscheiden erst, wenn alles auf dem Tisch liegt."
        primary={{ label: "Interesse registrieren", href: "#interesse" }}
        secondary={{ label: "Für Landwirte", href: seitenPfad("/landwirte") }}
      />
      )}
    </div>
  );
}

export const generateMetadata = seitenMetadata("/genossenschaft", metadata, { en: metadataEn });
