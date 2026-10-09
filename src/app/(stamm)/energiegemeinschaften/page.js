import { Building, Clock, Handshake, MapPinned, MessageSquareText, Users } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import LaenderTabs from "@/components/Gemeinschaft/LaenderTabs";
import AnfrageMitDaten from "@/components/Gemeinschaft/AnfrageMitDaten";
import Hero from "@/components/Gemeinschaft/Seite/Hero";
import Fakten from "@/components/Gemeinschaft/Seite/Fakten";
import Prinzip from "@/components/Gemeinschaft/Seite/Prinzip";
import Vergleich from "@/components/Gemeinschaft/Seite/Vergleich";
import Rolle from "@/components/Gemeinschaft/Seite/Rolle";
import { FAQ_GEMEINSCHAFT } from "@/data/faq";
import { FAQ_GEMEINSCHAFT_EN } from "@/data/faq-en";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { EAG_CALL_AT } from "@/data/regionen/fristen";
import { LAENDER, linkFuer, pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { ENERGIEGEMEINSCHAFTEN_CH, ENERGIEGEMEINSCHAFTEN_CH_EN } from "@/data/laender/ch/energiegemeinschaften";
import { rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";

const PFAD = seitenPfad("/energiegemeinschaften");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Energiegemeinschaft gründen & versorgen (DACH) | ÖkoInvest",
  description:
    "Energiegemeinschaft gründen oder mit Parkstrom versorgen: Energy Sharing (§ 42c EnWG), EEG und BEG in Österreich, LEG in der Schweiz im Vergleich.",
  keywords: ["Energiegemeinschaft", "Energy Sharing", "§ 42c EnWG", "Erneuerbare-Energie-Gemeinschaft", "Bürgerenergiegemeinschaft", "LEG Schweiz", "vZEV"],
});

const metadataEn = rechnerMetadataEn({
  title: "Founding & supplying an energy community (DACH) | ÖkoInvest",
  description:
    "Found an energy community or supply one with park power: energy sharing (§ 42c EnWG, Germany), EEG and BEG in Austria, LEG in Switzerland compared.",
  keywords: ["energy community", "energy sharing", "§ 42c EnWG", "renewable energy community", "citizens’ energy community", "LEG Switzerland", "vZEV"],
});

// Österreich-Fassung (Welle 2): Österreich zuerst – Tabs, Fristenkasten, Formular, Querverweise
const metadataFuerEn = (land) => {
  const basis = uebersetze({ de: metadata, en: metadataEn }, "en");
  if (land === "AT")
    return {
      ...basis,
      title: "Founding & supplying an energy community in Austria (EEG, BEG) | ÖkoInvest",
      description: "Found a renewable energy community (EEG) or citizens’ energy community (BEG) in Austria, or supply one with park power – compared with energy sharing in Germany and the LEG in Switzerland.",
    };
  if (land === "CH") {
    const ch = uebersetze({ de: ENERGIEGEMEINSCHAFTEN_CH.metadata, en: ENERGIEGEMEINSCHAFTEN_CH_EN.metadata }, "en");
    return { ...basis, ...ch, openGraph: { ...basis.openGraph, ...ch.openGraph } };
  }
  return basis;
};
const metadataFuer = (land, p) =>
  p?.sprache === "en"
    ? metadataFuerEn(land)
    : land === "AT"
    ? {
        ...metadata,
        title: "Energiegemeinschaft in Österreich gründen & versorgen (EEG, BEG) | ÖkoInvest",
        description: "Erneuerbare-Energie-Gemeinschaft oder Bürgerenergiegemeinschaft in Österreich gründen oder mit Parkstrom versorgen – mit Vergleich zu Energy Sharing in Deutschland und LEG in der Schweiz.",
      }
    : land === "CH"
      ? { ...metadata, ...ENERGIEGEMEINSCHAFTEN_CH.metadata, openGraph: { ...metadata.openGraph, ...ENERGIEGEMEINSCHAFTEN_CH.metadata.openGraph } }
      : metadata;

// beschreibt nur, was der Abschnitt zusagt (Prüfung von Anlage und Modell)
const ABLAUF = [
  { icon: MessageSquareText, t: "Sie schildern, wo Sie stehen", x: "Gründen, versorgen oder betreiben – Land, Rolle und ungefähre Größe genügen." },
  { icon: MapPinned, t: "Wir prüfen den Nahebereich", x: "Welche Anlage in Ihrem Nahebereich in Frage kommt und welches Modell passt." },
  { icon: Handshake, t: "Wir melden uns mit einer Einschätzung", x: "Was das Modell Ihren Mitgliedern bringen kann – und die nächsten Schritte." },
];

/* Sprachmodell: englische Fassung (gleiche Reihenfolge) */
const ABLAUF_EN = [
  { t: "You tell us where you stand", x: "Founding, supplying or operating – country, role and approximate size are enough." },
  { t: "We check the proximity area", x: "Which installation in your proximity area is suitable and which model fits." },
  { t: "We get back to you with an assessment", x: "What the model can bring your members – and the next steps." },
];
const QUERVERWEISE_AT_EN = [
  { titel: "Software for energy communities", text: "Founding, billing and operation in Austria." },
  { titel: "Energy community calculator", text: "Savings from energy price, grid fee and levy for EEG and BEG." },
  { titel: "Regions in Austria", text: "Zoning (Widmung), zones and permits per federal state." },
  { titel: "Energy sharing compared", text: "EEG, BEG, LEG and § 42c EnWG explained in detail." },
  { titel: "Energy cooperative", text: "Citizens, farmers and municipalities as co-owners of the parks." },
];
const QUERVERWEISE_EN = [
  { titel: "Energy cooperative", text: "Citizens, farmers and municipalities as co-owners of the parks." },
  { titel: "Municipalities", text: "Local value creation and participation – from § 6 EEG to trade tax." },
  { titel: "Virtual power plant", text: "How generation, storage and consumption work together in a network." },
  { titel: "Energy sharing compared", text: "EEG, BEG, LEG and § 42c EnWG explained in detail." },
  { titel: "Software for energy communities", text: "Founding, billing and operation in Austria." },
  { titel: "Energy sharing calculator", text: "Calculate the benefit per participant in DE, AT and CH." },
];

const querverweiseAt = () => [
  { href: seitenPfad("/energiegemeinschaften/software", "AT"), titel: "Software für Energiegemeinschaften", text: "Gründung, Abrechnung und Betrieb in Österreich." },
  { href: seitenPfad("/energiegemeinschaften/rechner", "AT"), titel: "Energiegemeinschaft-Rechner", text: "Ersparnis aus Energiepreis, Netzentgelt und Abgabe für EEG und BEG." },
  { href: seitenPfad("/regionen", "AT"), titel: "Regionen in Österreich", text: "Widmung, Zonen und Bewilligungen je Bundesland." },
  { href: "/ratgeber/energy-sharing-energiegemeinschaften", titel: "Energy Sharing im Vergleich", text: "EEG, BEG, LEG und § 42c EnWG ausführlich erklärt." },
  { href: seitenPfad("/genossenschaft", "AT"), titel: linkFuer("/genossenschaft", "AT", "Energiegenossenschaft").label, text: "Bürger, Landwirte und Gemeinden als Miteigentümer der Parks." },
];

const QUERVERWEISE = [
  { href: seitenPfad("/genossenschaft"), titel: "Energiegenossenschaft", text: "Bürger, Landwirte und Gemeinden als Miteigentümer der Parks." },
  { href: seitenPfad("/kommunen"), titel: "Kommunen", text: "Wertschöpfung und Beteiligung vor Ort – von § 6 EEG bis Gewerbesteuer." },
  { href: seitenPfad("/virtuelles-kraftwerk"), titel: "Virtuelles Kraftwerk", text: "Wie Erzeugung, Speicher und Verbrauch im Verbund zusammenwirken." },
  { href: "/ratgeber/energy-sharing-energiegemeinschaften", titel: "Energy Sharing im Vergleich", text: "EEG, BEG, LEG und § 42c EnWG ausführlich erklärt." },
  { href: seitenPfad("/energiegemeinschaften/software"), titel: linkFuer("/energiegemeinschaften/software", "DE", "Software für Energiegemeinschaften").label, text: "Gründung, Abrechnung und Betrieb in Österreich." },
  { href: seitenPfad("/rechner/energy-sharing"), titel: "Energy-Sharing-Rechner", text: "Vorteil je Teilnehmer in DE, AT und CH berechnen." },
];

// Fristenkasten W0-2 (nur Text, rein informativ). Geprüft am 03.10.2026 am Original:
// EAG-Abwicklungsstelle, Meldung vom 18.09.2026 (Link im Kasten). Der Kasten verschwindet nach dem 22.10.2026
// (statisch: mit dem nächsten Build); Ablaufdatum zentral in src/data/regionen/fristen.js. Danach Kasten löschen.

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${abs(PFAD)}/#service`,
  name: "Energiegemeinschaften gründen, versorgen und betreiben",
  serviceType: "Beratung und Versorgung von Energiegemeinschaften",
  description: "Versorgung von Energiegemeinschaften mit Strom aus Solarparks sowie Begleitung bei Gründung und Betrieb in Deutschland, Österreich und der Schweiz.",
  provider: { "@id": `${abs("/")}/#organization` },
  areaServed: [
    { "@type": "Country", name: "Deutschland" },
    { "@type": "Country", name: "Österreich" },
    { "@type": "Country", name: "Schweiz" },
  ],
  url: abs(PFAD),
};
const schemaEn = {
  ...schema,
  name: "Founding, supplying and operating energy communities",
  serviceType: "Advice and supply for energy communities",
  description: "Supply of energy communities with power from solar parks, and support with founding and operation in Germany, Austria and Switzerland.",
  areaServed: [
    { "@type": "Country", name: "Germany" },
    { "@type": "Country", name: "Austria" },
    { "@type": "Country", name: "Switzerland" },
  ],
};
const schemaFuer = (land, en = false) => {
  const s = en ? schemaEn : schema;
  return land === "AT" || land === "CH" ? { ...s, "@id": `${abs(seitenPfad("/energiegemeinschaften", land))}/#service`, url: abs(seitenPfad("/energiegemeinschaften", land)) } : s;
};

export default async function EnergiegemeinschaftenPage({ params }) {
  // Land der Seite (null = gemeinsam wie vor Welle 2); AT hat eine eigene Fassung (Register seiten.js)
  const land = await seitenLand(params);
  const at = land === "AT";
  const ch = land === "CH"; // Schweiz-Fassung: LEG/vZEV zuerst, Querverweise ohne Rechner mit LandHinweis
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const ablauf = en ? uebersetze({ de: ABLAUF, en: ABLAUF_EN }, "en") : ABLAUF;
  const querverweise = at
    ? en
      ? uebersetze({ de: querverweiseAt(), en: QUERVERWEISE_AT_EN }, "en")
      : querverweiseAt()
    : ch
      ? en
        ? uebersetze({ de: ENERGIEGEMEINSCHAFTEN_CH.querverweise, en: ENERGIEGEMEINSCHAFTEN_CH_EN.querverweise }, "en")
        : ENERGIEGEMEINSCHAFTEN_CH.querverweise
      : en
        ? uebersetze({ de: QUERVERWEISE, en: QUERVERWEISE_EN }, "en")
        : QUERVERWEISE;
  const faq = en ? uebersetze({ de: FAQ_GEMEINSCHAFT, en: FAQ_GEMEINSCHAFT_EN }, "en") : FAQ_GEMEINSCHAFT;
  return (
    <div className="[&_.ov-lead]:hyphens-manual [&_h2]:hyphens-manual! lg:[&_p]:hyphens-manual">
      <JsonLd daten={schemaFuer(land, en)} />

      <Hero />
      <Fakten />
      <Prinzip />
      <Vergleich />

      <Section tone="white" space="lg" id="details" className="scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
          <SectionHeading eyebrow={en ? "In detail" : "Im Detail"} title={en ? "What applies in your country" : "Was in Ihrem Land gilt"} />
          <Reveal>
            <p className="ov-lead text-ink-600 lg:pb-1">
              {en
                ? "Choose a country: this is how the model works, these are its limits – and this is what we contribute."
                : "Wählen Sie ein Land: So funktioniert das Modell, hier liegen die Grenzen – und das tragen wir bei."}
            </p>
          </Reveal>
        </div>
        <div className="mt-10 md:mt-12">
          <LaenderTabs start={land ? LAENDER[land].praefix : undefined} />
        </div>
        {at && Date.now() < EAG_CALL_AT.ende && (
          <Reveal className="mt-8 flex gap-3 rounded-2xl bg-sand-50 p-5 text-[14.5px] leading-relaxed text-ink-700 ring-1 ring-ink-200/70">
            <Clock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
            {en ? (
              <p>
                <strong className="text-ink-900">Deadline in Austria:</strong> The 3rd EAG funding call 2026 (EAG = Erneuerbaren-Ausbau-Gesetz, Austria’s Renewable
                Expansion Act) for investment grants for PV installations starts on 8&nbsp;October 2026 at 17:00 with the ticket draw; applications can be submitted
                from 9&nbsp;October (08:00) to 22&nbsp;October 2026. A ticket alone is not yet an application. The EAG portal is unavailable for maintenance from
                7&nbsp;October (17:00) to 9&nbsp;October (08:00).{" "}
                <a
                  href="https://www.eag-abwicklungsstelle.at/artikel/3-foerdercall-fuer-photovoltaikanlagen-laeuft-von-8-bis-22-oktober-2026/"
                  className="font-medium text-ov-700 underline underline-offset-2 hover:text-ov-800"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Source: EAG-Abwicklungsstelle
                </a>
              </p>
            ) : (
            <p>
              <strong className="text-ink-900">Frist in Österreich:</strong> Der 3. EAG-Fördercall 2026 für Investitionszuschüsse zu PV-Anlagen startet am
              8.&nbsp;Oktober 2026 um 17&nbsp;Uhr mit der Ticketziehung; eingereicht wird vom 9.&nbsp;Oktober (8&nbsp;Uhr) bis 22.&nbsp;Oktober 2026. Ein Ticket
              allein ist noch kein Antrag. Das EAG-Portal ist vom 7.&nbsp;Oktober (17&nbsp;Uhr) bis 9.&nbsp;Oktober (8&nbsp;Uhr) wegen Wartung nicht erreichbar.{" "}
              <a
                href="https://www.eag-abwicklungsstelle.at/artikel/3-foerdercall-fuer-photovoltaikanlagen-laeuft-von-8-bis-22-oktober-2026/"
                className="font-medium text-ov-700 underline underline-offset-2 hover:text-ov-800"
                rel="noopener noreferrer"
                target="_blank"
              >
                Quelle: EAG-Abwicklungsstelle
              </a>
            </p>
            )}
          </Reveal>
        )}
      </Section>

      <Rolle />

      <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            className="lg:sticky lg:top-28 lg:self-start"
            eyebrow={en ? "Enquiry" : "Anfrage"}
            title={en ? "Plan or supply a community" : "Gemeinschaft planen oder versorgen"}
            lead={
              en
                ? "Tell us briefly where you stand. We check which installation in your proximity area is suitable and which model fits."
                : "Erzählen Sie uns kurz, wo Sie stehen. Wir prüfen, welche Anlage in Ihrem Nahebereich in Frage kommt und welches Modell passt."
            }
          >
            <ol className="mt-10 space-y-5">
              {ablauf.map((x, i) => (
                <li key={i} className="flex gap-4">
                  <span aria-hidden="true" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-700 shadow-e1 ring-1 ring-ink-200">
                    <x.icon className="h-5 w-5" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sun-400 text-[11px] font-bold text-navy-950">{i + 1}</span>
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-display text-[16.5px] font-bold leading-snug text-ink-900">
                      <span className="sr-only">{en ? `Step ${i + 1}: ` : `Schritt ${i + 1}: `}</span>
                      {x.t}
                    </p>
                    <p className="mt-0.5 text-[14.5px] leading-relaxed text-ink-600">{x.x}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ul className="mt-8 space-y-3 border-t border-ink-200 pt-6 text-[15px] text-ink-700">
              {[
                { icon: Building, t: en ? "For municipalities, associations, businesses and citizens’ initiatives" : "Für Gemeinden, Vereine, Betriebe und Bürgerinitiativen" },
                { icon: Users, t: en ? "Also for existing communities" : "Auch für bestehende Gemeinschaften" },
              ].map((x, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <x.icon aria-hidden="true" className="h-4 w-4 text-ov-600" />
                  {x.t}
                </li>
              ))}
            </ul>
          </SectionHeading>
          <Reveal className="rounded-[2rem] bg-white p-5 shadow-e3 ring-1 ring-ink-200/70 sm:p-8 md:p-10">
            <p className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ov-800">
              <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {en ? "We will get back to you personally." : "Wir melden uns persönlich bei Ihnen."}
            </p>
            <AnfrageMitDaten
              legende={en ? "Your community" : "Ihre Gemeinschaft"}
              zusatz={[
                {
                  name: "anliegen",
                  label: en ? "What is it about?" : "Worum geht es?",
                  art: "chips",
                  optionen: en
                    ? [
                        { id: "gruenden", label: "Found a community" },
                        { id: "versorgen", label: "Supply with park power" },
                        { id: "betreiben", label: "Operation & billing" },
                      ]
                    : [
                    { id: "gruenden", label: "Gemeinschaft gründen" },
                    { id: "versorgen", label: "Mit Parkstrom versorgen" },
                    { id: "betreiben", label: "Betrieb & Abrechnung" },
                  ],
                },
                {
                  name: "land",
                  label: en ? "Country" : "Land",
                  art: "select",
                  wert: land,
                  optionen: en
                    ? [
                        { id: "DE", label: "Germany" },
                        { id: "AT", label: "Austria" },
                        { id: "CH", label: "Switzerland" },
                      ]
                    : [
                    { id: "DE", label: "Deutschland" },
                    { id: "AT", label: "Österreich" },
                    { id: "CH", label: "Schweiz" },
                  ],
                },
                {
                  name: "rolle",
                  label: en ? "You are" : "Sie sind",
                  art: "select",
                  optionen: en
                    ? [
                        { id: "gemeinde", label: "Municipality" },
                        { id: "verein", label: "Association / citizens’ initiative" },
                        { id: "unternehmen", label: "Company" },
                        { id: "privat", label: "Private individual" },
                        { id: "bestehend", label: "Existing community" },
                      ]
                    : [
                    { id: "gemeinde", label: "Gemeinde" },
                    { id: "verein", label: "Verein / Bürgerinitiative" },
                    { id: "unternehmen", label: "Unternehmen" },
                    { id: "privat", label: "Privatperson" },
                    { id: "bestehend", label: "Bestehende Gemeinschaft" },
                  ],
                },
                { name: "teilnehmer", label: en ? "Approximate number of participants" : "Ungefähre Zahl der Teilnehmenden", art: "zahl", platzhalter: en ? "e.g. 40" : "z. B. 40" },
                { name: "gemeindeOrt", label: en ? "Municipality / region" : "Gemeinde / Region", art: "text", platzhalter: en ? "e.g. Ostermiething" : "z. B. Ostermiething" },
              ]}
              formular={{
                typ: "energiegemeinschaft",
                felder: ["firma", "telefon", "plz", "nachricht"],
                button: en ? "Send enquiry" : "Anfrage senden",
              }}
            />
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            eyebrow={en ? "Frequently asked questions" : "Häufige Fragen"}
            title={en ? "Energy communities explained" : "Energiegemeinschaften verständlich erklärt"}
            lead={en ? "Energy sharing, EEG, BEG, ZEV and LEG – the key answers as things stand." : "Energy Sharing, EEG, BEG, ZEV und LEG – die wichtigsten Antworten nach aktuellem Stand."}
          />
          <Faq items={faq} />
        </div>
      </Section>

      <Querverweise items={querverweise} />
      {en ? (
        <CtaBand
          eyebrow="Together instead of alone"
          title="Power from the region for your community."
          text="Whether municipality, association or business: we check which installation is in the proximity area, which model fits and what it brings your members."
          primary={{ label: "Enquire about a community", href: "#anfrage" }}
          secondary={at ? { label: "To the energy community calculator", href: seitenPfad("/energiegemeinschaften/rechner", "AT") } : { label: "To the cooperative", href: seitenPfad("/genossenschaft") }}
        />
      ) : (
      <CtaBand
        eyebrow="Gemeinsam statt allein"
        title="Strom aus der Region für Ihre Gemeinschaft."
        text="Ob Gemeinde, Verein oder Betrieb: Wir prüfen, welche Anlage im Nahebereich liegt, welches Modell passt und was es Ihren Mitgliedern bringt."
        primary={{ label: "Gemeinschaft anfragen", href: "#anfrage" }}
        secondary={at ? { label: "Zum Energiegemeinschaft-Rechner", href: seitenPfad("/energiegemeinschaften/rechner", "AT") } : { label: "Zur Genossenschaft", href: seitenPfad("/genossenschaft") }}
      />
      )}
    </div>
  );
}

export const generateMetadata = seitenMetadata("/energiegemeinschaften", metadataFuer);
