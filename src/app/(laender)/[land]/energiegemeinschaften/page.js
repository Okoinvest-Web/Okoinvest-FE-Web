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
import { abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { EAG_CALL_AT } from "@/data/regionen/fristen";
import { LAENDER, linkFuer, pfad as seitenPfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = seitenPfad("/energiegemeinschaften");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Energiegemeinschaft gründen & versorgen (DACH) | ÖkoInvest",
  description:
    "Energiegemeinschaft gründen oder mit Parkstrom versorgen: Energy Sharing (§ 42c EnWG), EEG und BEG in Österreich, LEG in der Schweiz im Vergleich.",
  keywords: ["Energiegemeinschaft", "Energy Sharing", "§ 42c EnWG", "Erneuerbare-Energie-Gemeinschaft", "Bürgerenergiegemeinschaft", "LEG Schweiz", "vZEV"],
});

// Österreich-Fassung (Welle 2): Österreich zuerst – Tabs, Fristenkasten, Formular, Querverweise
const metadataFuer = (land) =>
  land === "AT"
    ? {
        ...metadata,
        title: "Energiegemeinschaft in Österreich gründen & versorgen (EEG, BEG) | ÖkoInvest",
        description: "Erneuerbare-Energie-Gemeinschaft oder Bürgerenergiegemeinschaft in Österreich gründen oder mit Parkstrom versorgen – mit Vergleich zu Energy Sharing in Deutschland und LEG in der Schweiz.",
      }
    : metadata;

// beschreibt nur, was der Abschnitt zusagt (Prüfung von Anlage und Modell)
const ABLAUF = [
  { icon: MessageSquareText, t: "Sie schildern, wo Sie stehen", x: "Gründen, versorgen oder betreiben – Land, Rolle und ungefähre Größe genügen." },
  { icon: MapPinned, t: "Wir prüfen den Nahebereich", x: "Welche Anlage in Ihrem Nahebereich in Frage kommt und welches Modell passt." },
  { icon: Handshake, t: "Wir melden uns mit einer Einschätzung", x: "Was das Modell Ihren Mitgliedern bringen kann – und die nächsten Schritte." },
];

const querverweiseAt = () => [
  { href: seitenPfad("/energiegemeinschaften/software", "AT"), titel: "Software für Energiegemeinschaften", text: "Gründung, Abrechnung und Betrieb in Österreich." },
  { href: seitenPfad("/energiegemeinschaften/rechner", "AT"), titel: "Energiegemeinschaft-Rechner", text: "Ersparnis aus Energiepreis, Netzentgelt und Abgabe für EEG und BEG." },
  { href: seitenPfad("/regionen", "AT"), titel: "Regionen in Österreich", text: "Widmung, Zonen und Bewilligungen je Bundesland." },
  { href: "/wissen/ratgeber/energy-sharing-energiegemeinschaften", titel: "Energy Sharing im Vergleich", text: "EEG, BEG, LEG und § 42c EnWG ausführlich erklärt." },
  { href: seitenPfad("/genossenschaft", "AT"), titel: linkFuer("/genossenschaft", "AT", "Energiegenossenschaft").label, text: "Bürger, Landwirte und Gemeinden als Miteigentümer der Parks." },
];

const QUERVERWEISE = [
  { href: seitenPfad("/genossenschaft"), titel: "Energiegenossenschaft", text: "Bürger, Landwirte und Gemeinden als Miteigentümer der Parks." },
  { href: seitenPfad("/kommunen"), titel: "Kommunen", text: "Wertschöpfung und Beteiligung vor Ort – von § 6 EEG bis Gewerbesteuer." },
  { href: seitenPfad("/virtuelles-kraftwerk"), titel: "Virtuelles Kraftwerk", text: "Wie Erzeugung, Speicher und Verbrauch im Verbund zusammenwirken." },
  { href: "/wissen/ratgeber/energy-sharing-energiegemeinschaften", titel: "Energy Sharing im Vergleich", text: "EEG, BEG, LEG und § 42c EnWG ausführlich erklärt." },
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
const schemaFuer = (land) => (land === "AT" ? { ...schema, "@id": `${abs(seitenPfad("/energiegemeinschaften", "AT"))}/#service`, url: abs(seitenPfad("/energiegemeinschaften", "AT")) } : schema);

export default async function EnergiegemeinschaftenPage({ params }) {
  const { land } = await landDerSeite(params, "/energiegemeinschaften");
  const at = land === "AT";
  return (
    <div className="[&_.ov-lead]:hyphens-manual [&_h2]:hyphens-manual! lg:[&_p]:hyphens-manual">
      <JsonLd daten={schemaFuer(land)} />

      <Hero />
      <Fakten />
      <Prinzip />
      <Vergleich />

      <Section tone="white" space="lg" id="details" className="scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
          <SectionHeading eyebrow="Im Detail" title="Was in Ihrem Land gilt" />
          <Reveal>
            <p className="ov-lead text-ink-600 lg:pb-1">Wählen Sie ein Land: So funktioniert das Modell, hier liegen die Grenzen – und das tragen wir bei.</p>
          </Reveal>
        </div>
        <div className="mt-10 md:mt-12">
          <LaenderTabs start={LAENDER[land].praefix} />
        </div>
        {at && Date.now() < EAG_CALL_AT.ende && (
          <Reveal className="mt-8 flex gap-3 rounded-2xl bg-sand-50 p-5 text-[14.5px] leading-relaxed text-ink-700 ring-1 ring-ink-200/70">
            <Clock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
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
          </Reveal>
        )}
      </Section>

      <Rolle />

      <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            className="lg:sticky lg:top-28 lg:self-start"
            eyebrow="Anfrage"
            title="Gemeinschaft planen oder versorgen"
            lead="Erzählen Sie uns kurz, wo Sie stehen. Wir prüfen, welche Anlage in Ihrem Nahebereich in Frage kommt und welches Modell passt."
          >
            <ol className="mt-10 space-y-5">
              {ABLAUF.map((x, i) => (
                <li key={x.t} className="flex gap-4">
                  <span aria-hidden="true" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-700 shadow-e1 ring-1 ring-ink-200">
                    <x.icon className="h-5 w-5" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sun-400 text-[11px] font-bold text-navy-950">{i + 1}</span>
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-display text-[16.5px] font-bold leading-snug text-ink-900">
                      <span className="sr-only">Schritt {i + 1}: </span>
                      {x.t}
                    </p>
                    <p className="mt-0.5 text-[14.5px] leading-relaxed text-ink-600">{x.x}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ul className="mt-8 space-y-3 border-t border-ink-200 pt-6 text-[15px] text-ink-700">
              {[
                { icon: Building, t: "Für Gemeinden, Vereine, Betriebe und Bürgerinitiativen" },
                { icon: Users, t: "Auch für bestehende Gemeinschaften" },
              ].map((x) => (
                <li key={x.t} className="flex items-center gap-2.5">
                  <x.icon aria-hidden="true" className="h-4 w-4 text-ov-600" />
                  {x.t}
                </li>
              ))}
            </ul>
          </SectionHeading>
          <Reveal className="rounded-[2rem] bg-white p-5 shadow-e3 ring-1 ring-ink-200/70 sm:p-8 md:p-10">
            <p className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ov-800">
              <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              Wir melden uns persönlich bei Ihnen.
            </p>
            <AnfrageMitDaten
              legende="Ihre Gemeinschaft"
              zusatz={[
                {
                  name: "anliegen",
                  label: "Worum geht es?",
                  art: "chips",
                  optionen: [
                    { id: "gruenden", label: "Gemeinschaft gründen" },
                    { id: "versorgen", label: "Mit Parkstrom versorgen" },
                    { id: "betreiben", label: "Betrieb & Abrechnung" },
                  ],
                },
                {
                  name: "land",
                  label: "Land",
                  art: "select",
                  wert: land,
                  optionen: [
                    { id: "DE", label: "Deutschland" },
                    { id: "AT", label: "Österreich" },
                    { id: "CH", label: "Schweiz" },
                  ],
                },
                {
                  name: "rolle",
                  label: "Sie sind",
                  art: "select",
                  optionen: [
                    { id: "gemeinde", label: "Gemeinde" },
                    { id: "verein", label: "Verein / Bürgerinitiative" },
                    { id: "unternehmen", label: "Unternehmen" },
                    { id: "privat", label: "Privatperson" },
                    { id: "bestehend", label: "Bestehende Gemeinschaft" },
                  ],
                },
                { name: "teilnehmer", label: "Ungefähre Zahl der Teilnehmenden", art: "zahl", platzhalter: "z. B. 40" },
                { name: "gemeindeOrt", label: "Gemeinde / Region", art: "text", platzhalter: "z. B. Ostermiething" },
              ]}
              formular={{
                typ: "energiegemeinschaft",
                felder: ["firma", "telefon", "plz", "nachricht"],
                button: "Anfrage senden",
              }}
            />
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            eyebrow="Häufige Fragen"
            title="Energiegemeinschaften verständlich erklärt"
            lead="Energy Sharing, EEG, BEG, ZEV und LEG – die wichtigsten Antworten nach aktuellem Stand."
          />
          <Faq items={FAQ_GEMEINSCHAFT} />
        </div>
      </Section>

      <Querverweise items={at ? querverweiseAt() : QUERVERWEISE} />
      <CtaBand
        eyebrow="Gemeinsam statt allein"
        title="Strom aus der Region für Ihre Gemeinschaft."
        text="Ob Gemeinde, Verein oder Betrieb: Wir prüfen, welche Anlage im Nahebereich liegt, welches Modell passt und was es Ihren Mitgliedern bringt."
        primary={{ label: "Gemeinschaft anfragen", href: "#anfrage" }}
        secondary={at ? { label: "Zum Energiegemeinschaft-Rechner", href: seitenPfad("/energiegemeinschaften/rechner", "AT") } : { label: "Zur Genossenschaft", href: seitenPfad("/genossenschaft") }}
      />
    </div>
  );
}

export const generateMetadata = landMetadata("/energiegemeinschaften", metadataFuer);
