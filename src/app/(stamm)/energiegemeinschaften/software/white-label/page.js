// /energiegemeinschaften/software/white-label – EG-Software als White-Label für Stadtwerke, Gemeindewerke und
// regionale Energieversorger in Österreich (Welle 3, Paket B7; Masterplan B7 und B11 „Stadtwerke als Partner“).
//
// Ehrlich: Das White-Label richten wir mit den ersten Partnern ein – keine erfundenen Referenzen, keine fremden
// Marken, Partner werden nur nach schriftlicher Freigabe genannt. Länder: /at voll, gemeinsame Seite mit
// Kennzeichnung „Österreich“, /de und /ch Länderhinweis. Lead: Partneranfrage über POST /api/anfrage
// (typ energiegemeinschaft, Land AT → Lead-Desk AT, Einwilligungsprotokoll im Backend). noindex bis zur Fachprüfung.

import { Building2, Handshake, KeyRound, LayoutDashboard, MapPinned, Palette, ShieldCheck, Users, Wrench } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import CtaBand from "@/components/ui/CtaBand";
import Faq from "@/components/ui/Faq";
import Querverweise from "@/components/Reusable/Querverweise";
import AnfrageMitDaten from "@/components/Gemeinschaft/AnfrageMitDaten";
import JsonLd from "@/components/JsonLd";
import Kopf from "@/components/Portal/EG/Angebot/Kopf";
import { FaktKasten, NurOesterreich } from "@/components/Portal/EG/Angebot/Teile";
import { Haken } from "@/components/Portal/EG/Produkt/Seite/teile";
import { egFakt } from "@/lib/eg-angebot/fakten";
import { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import { abs } from "@/data/site";
import { pfad as seitenPfad, schreibweiseFuer } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";

const SCHLUESSEL = "/energiegemeinschaften/software/white-label";
const PFAD = seitenPfad(SCHLUESSEL);

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "White-Label für Energiegemeinschaften – für Stadtwerke in Österreich | ÖkoInvest",
  description: "Energiegemeinschaften unter Ihrer Marke: Plattform, EDA-Prozesse und Abrechnung für Stadtwerke, Gemeindewerke und regionale Energieversorger in Österreich – auf Wunsch mit Betriebsführung.",
  keywords: ["White Label Energiegemeinschaft", "Energiegemeinschaft Software Stadtwerke", "EEG Plattform Energieversorger", "Energiegemeinschaft Gemeindewerk"],
});
metadata.robots = { index: false, follow: true }; // Fachprüfung offen (Register index: false)

const metadataEn = rechnerMetadataEn({
  title: "White label for energy communities – for municipal utilities in Austria | ÖkoInvest",
  description: "Energy communities under your brand: platform, EDA processes and billing for municipal utilities and regional energy suppliers in Austria – with operational management if desired.",
  keywords: ["white label energy community Austria", "energy community software utilities", "EEG platform energy supplier"],
});

const BUNDESLAENDER = ["Burgenland", "Kärnten", "Niederösterreich", "Oberösterreich", "Salzburg", "Steiermark", "Tirol", "Vorarlberg", "Wien"];
const BUNDESLAENDER_EN = { "Kärnten": "Carinthia", "Niederösterreich": "Lower Austria", "Oberösterreich": "Upper Austria", Steiermark: "Styria", Tirol: "Tyrol", Wien: "Vienna" };

const RAHMEN_ICONS = [MapPinned, Handshake, ShieldCheck];
function RahmenIcon({ i }) {
  const I = RAHMEN_ICONS[i] || ShieldCheck;
  return <I aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />;
}

const TEXTE = {
  de: {
    brot: ["Energiegemeinschaften", "Software", "White-Label"],
    marke: "Österreich",
    eyebrow: "Für Stadtwerke, Gemeindewerke und Energieversorger",
    titel: (
      <>
        Energiegemeinschaften <span className="ov-text-gradient-light">unter Ihrer Marke.</span>
      </>
    ),
    lead: "Ihre Kundinnen und Kunden wollen Strom in der Region teilen. Sie bieten die Gemeinschaft an – unter Ihrem Namen, mit Ihrem Kundenkontakt. Plattform, EDA-Prozesse und Abrechnung kommen von uns, auf Wunsch auch der laufende Betrieb.",
    aktionen: [{ label: "Partnergespräch anfragen", href: "#anfrage" }, { label: "So läuft es ab", href: "#ablauf" }],
    fussnote: "Unverbindlich · Umfang und Zeitplan legen wir gemeinsam fest",
    karte: {
      titel: "Auf einen Blick",
      zeilen: [
        ["Erscheinungsbild", "Ihr Logo, Ihre Farben"],
        ["Kundenkontakt", "bei Ihnen"],
        ["Plattform und EDA", "von ÖkoInvest"],
        ["Betriebsführung", "auf Wunsch"],
      ],
      hinweis: "Das White-Label richten wir mit den ersten Partnern ein. Was im Einzelnen dazugehört, steht im Angebot.",
    },
    nutzenEyebrow: "Nutzen",
    nutzenTitel: "Was Ihr Haus davon hat",
    nutzen: [
      { icon: Users, titel: "Kundenbindung in der Region", text: "Sie bieten Ihren Kundinnen und Kunden, Gemeinden und Betrieben selbst eine Energiegemeinschaft an, statt sie an Dritte zu verweisen." },
      { icon: Palette, titel: "Ihre Marke im Vordergrund", text: "Portal, Beitritt und Belege in Ihrem Erscheinungsbild – den genauen Umfang legen wir im Angebot fest. Wir bleiben im Hintergrund." },
      { icon: Wrench, titel: "Ohne eigene Entwicklung", text: "Mitgliederportal, EDA-Prozesse und Abrechnung mit Vier-Augen-Freigabe nutzen Sie aus unserer Plattform." },
      { icon: LayoutDashboard, titel: "Betrieb, wie es Ihnen passt", text: "Sie betreuen selbst – oder wir übernehmen als Organisator Anmeldungen, Datenqualität und Abrechnung." },
    ],
    rollenEyebrow: "Rollen",
    rollenTitel: "Wer macht was",
    rollenLead: "Klare Aufgaben, vertraglich festgehalten – auch beim Datenschutz.",
    rollen: [
      { icon: Building2, titel: "Ihr Haus", punkte: ["Marke und Kundenkontakt", "Vertrieb in Ihrer Region", "Erste Anlaufstelle für Mitglieder"] },
      { icon: LayoutDashboard, titel: "ÖkoInvest", punkte: ["Plattform und EDA-Prozesse", "Abrechnung und Belege", "Auf Wunsch Betriebsführung als Organisator"] },
      { icon: KeyRound, titel: "Die Gemeinschaft", punkte: ["Behält ihre Marktpartner-ID", "Entscheidet über Tarife und Mitglieder", "Wechselt ohne Neuanmeldung, wenn sie will"] },
    ],
    ablaufEyebrow: "Ablauf",
    ablaufTitel: "Von der ersten Idee zur ersten Gemeinschaft",
    ablauf: [
      { titel: "Erstgespräch", text: "Ziele, Region, Zielgruppen und wie viel Betrieb Sie selbst übernehmen möchten." },
      { titel: "Konzept und Angebot", text: "Umfang, Rollen, Datenschutz-Vereinbarung und Preis – schriftlich und aufgeschlüsselt." },
      { titel: "Einrichtung", text: "Erscheinungsbild, Vorlagen für Verträge und Mitgliederkommunikation, Schulung Ihres Teams." },
      { titel: "Start mit einer ersten Gemeinschaft", text: "Gemeinsamer Start und Auswertung, danach weitere Gemeinschaften in Ihrer Region." },
    ],
    rahmenEyebrow: "Ehrlicher Rahmen",
    rahmenTitel: "Was Sie vorab wissen sollten",
    rahmen: [
      "Das Angebot gilt für Österreich. Für Deutschland und die Schweiz bieten wir die Software derzeit nicht an.",
      "Partner nennen wir öffentlich nur nach schriftlicher Freigabe. Referenzen erfinden wir nicht.",
      "Wer welche Daten verarbeitet, regelt der Vertrag (Auftragsverarbeitung nach Art. 28 DSGVO oder gemeinsame Verantwortlichkeit nach Art. 26 DSGVO).",
    ],
    netzTitel: "Gilt auch für Gemeinschaften unter Ihrer Marke",
    anfrageEyebrow: "Partneranfrage",
    anfrageTitel: "Sprechen wir über Ihre Region",
    anfrageLead: "Ein paar Angaben genügen. Wir melden uns mit einem Terminvorschlag für ein Erstgespräch.",
    legende: "Ihr Haus",
    organisation: "Sie sind",
    organisationen: [{ id: "stadtwerk", label: "Stadtwerk" }, { id: "gemeindewerk", label: "Gemeindewerk" }, { id: "versorger", label: "Regionaler Energieversorger" }, { id: "region", label: "Klima- und Energie-Modellregion" }, { id: "sonstige", label: "Sonstige" }],
    bundesland: "Bundesland",
    interesse: "Woran haben Sie Interesse?",
    interessen: [{ id: "software", label: "Software unter eigener Marke" }, { id: "betrieb", label: "Mit Betriebsführung" }, { id: "information", label: "Zunächst Information" }],
    gemeinschaften: "Wie viele Gemeinschaften planen oder betreuen Sie?",
    gemeinschaftenPlatz: "z. B. 5",
    button: "Partnergespräch anfragen",
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Fragen von Stadtwerken",
    faq: [
      { q: "Brauchen wir eigene IT oder Entwickler?", a: "Nein. Sie nutzen unsere Plattform in Ihrem Erscheinungsbild. Ihr Team braucht eine Schulung für Vertrieb und Mitgliederfragen; die Technik betreiben wir." },
      { q: "Wem gehören die Daten?", a: "Die Gemeinschaft behält ihre Marktpartner-ID und ihre Mitgliederdaten. Wer welche Daten in wessen Auftrag verarbeitet, legen wir im Vertrag fest – als Auftragsverarbeitung oder gemeinsame Verantwortlichkeit nach DSGVO." },
      { q: "Können Gemeinschaften später wechseln?", a: "Ja. Die Marktpartner-ID gehört der Gemeinschaft; ein Wechsel des Dienstleisters braucht keine Neuanmeldung der Zählpunkte. Das gilt in beide Richtungen." },
      { q: "Was kostet das White-Label?", a: "Das hängt von Umfang und Betriebsmodell ab. Wir kalkulieren es nach demselben Aufbau wie unser Preisblatt – Einrichtung, Grundgebühr und Betrag je Zählpunkt – und legen es schriftlich dar." },
      { q: "Gilt das auch in Deutschland oder der Schweiz?", a: "Derzeit nicht. Die Software ist auf das österreichische ElWG und den Datenaustausch über EDA ausgelegt." },
    ],
    querverweise: [
      { href: "/energiegemeinschaften/software", titel: "Plattform & Betrieb", text: "Was die Software kann – Mitgliederportal, Abrechnung, Zustimmung." },
      { href: "/energiegemeinschaften/software/preise", titel: "Preisblatt", text: "Einrichtung, Grundgebühr und Betrag je Zählpunkt." },
      { href: "/kommunen", titel: "Kommunen", text: "Wertschöpfung und Beteiligung vor Ort." },
    ],
    cta: { eyebrow: "Partnerschaft", title: "Ihre Region, Ihre Marke, unsere Plattform.", text: "Lassen Sie uns besprechen, wie Energiegemeinschaften unter Ihrem Namen aussehen können.", primary: { label: "Partnergespräch anfragen", href: "#anfrage" }, secondary: { label: "Plattform ansehen", href: "/energiegemeinschaften/software" } },
  },
  en: {
    brot: ["Energy communities", "Software", "White label"],
    marke: "Austria",
    eyebrow: "For municipal utilities and energy suppliers",
    titel: (
      <>
        Energy communities <span className="ov-text-gradient-light">under your brand.</span>
      </>
    ),
    lead: "Your customers want to share power in the region. You offer the community – under your name, with your customer contact. Platform, EDA processes and billing come from us, and day-to-day operation too if you wish.",
    aktionen: [{ label: "Request a partner meeting", href: "#anfrage" }, { label: "How it works", href: "#ablauf" }],
    fussnote: "Without obligation · we agree scope and schedule together",
    karte: {
      titel: "At a glance",
      zeilen: [
        ["Look and feel", "your logo, your colours"],
        ["Customer contact", "with you"],
        ["Platform and EDA", "from ÖkoInvest"],
        ["Operational management", "if desired"],
      ],
      hinweis: "We are setting up the white label with our first partners. What exactly is included is set out in the offer.",
    },
    nutzenEyebrow: "Benefits",
    nutzenTitel: "What your company gains",
    nutzen: [
      { icon: Users, titel: "Customer loyalty in the region", text: "You offer your customers, municipalities and businesses an energy community yourself instead of referring them to third parties." },
      { icon: Palette, titel: "Your brand in front", text: "Portal, joining and receipts in your look and feel – the exact scope is set out in the offer. We stay in the background." },
      { icon: Wrench, titel: "No development of your own", text: "You use member portal, EDA processes and billing with four-eyes approval from our platform." },
      { icon: LayoutDashboard, titel: "Operation the way you want", text: "You look after it yourself – or we take over registrations, data quality and billing as organiser." },
    ],
    rollenEyebrow: "Roles",
    rollenTitel: "Who does what",
    rollenLead: "Clear tasks, set out in the contract – including data protection.",
    rollen: [
      { icon: Building2, titel: "Your company", punkte: ["Brand and customer contact", "Sales in your region", "First point of contact for members"] },
      { icon: LayoutDashboard, titel: "ÖkoInvest", punkte: ["Platform and EDA processes", "Billing and receipts", "Operational management as organiser if desired"] },
      { icon: KeyRound, titel: "The community", punkte: ["Keeps its market partner ID", "Decides on tariffs and members", "Can switch without re-registration if it wants"] },
    ],
    ablaufEyebrow: "Process",
    ablaufTitel: "From the first idea to the first community",
    ablauf: [
      { titel: "Initial meeting", text: "Goals, region, target groups and how much operation you want to handle yourself." },
      { titel: "Concept and offer", text: "Scope, roles, data protection agreement and price – in writing and broken down." },
      { titel: "Set-up", text: "Look and feel, templates for contracts and member communication, training for your team." },
      { titel: "Start with a first community", text: "Joint start and review, then further communities in your region." },
    ],
    rahmenEyebrow: "Honest framework",
    rahmenTitel: "What you should know in advance",
    rahmen: [
      "The offer applies to Austria. We do not currently offer the software for Germany or Switzerland.",
      "We only name partners publicly with written approval. We do not invent references.",
      "The contract governs who processes which data (processing on behalf under Art. 28 GDPR or joint controllership under Art. 26 GDPR).",
    ],
    netzTitel: "Also applies to communities under your brand",
    anfrageEyebrow: "Partner enquiry",
    anfrageTitel: "Let’s talk about your region",
    anfrageLead: "A few details are enough. We will get back to you with a proposed date for an initial meeting.",
    legende: "Your company",
    organisation: "You are",
    organisationen: [{ id: "stadtwerk", label: "Municipal utility" }, { id: "gemeindewerk", label: "Local municipal works" }, { id: "versorger", label: "Regional energy supplier" }, { id: "region", label: "Climate and energy model region" }, { id: "sonstige", label: "Other" }],
    bundesland: "Federal state",
    interesse: "What are you interested in?",
    interessen: [{ id: "software", label: "Software under own brand" }, { id: "betrieb", label: "With operational management" }, { id: "information", label: "Information first" }],
    gemeinschaften: "How many communities are you planning or looking after?",
    gemeinschaftenPlatz: "e.g. 5",
    button: "Request partner meeting",
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Questions from municipal utilities",
    faq: [
      { q: "Do we need our own IT or developers?", a: "No. You use our platform in your look and feel. Your team needs training for sales and member questions; we run the technology." },
      { q: "Who owns the data?", a: "The community keeps its market partner ID and its member data. Who processes which data on whose behalf is set out in the contract – as processing on behalf or joint controllership under the GDPR." },
      { q: "Can communities switch later?", a: "Yes. The market partner ID belongs to the community; changing the service provider does not require re-registering the metering points. That applies in both directions." },
      { q: "What does the white label cost?", a: "That depends on scope and operating model. We calculate it using the same structure as our price sheet – set-up, base fee and amount per metering point – and set it out in writing." },
      { q: "Does this also apply in Germany or Switzerland?", a: "Not at present. The software is built for Austria’s ElWG and data exchange via EDA." },
    ],
    querverweise: [
      { href: "/energiegemeinschaften/software", titel: "Platform & operation", text: "What the software does – member portal, billing, consent." },
      { href: "/energiegemeinschaften/software/preise", titel: "Price sheet", text: "Set-up, base fee and amount per metering point." },
      { href: "/kommunen", titel: "Municipalities", text: "Local value creation and participation." },
    ],
    cta: { eyebrow: "Partnership", title: "Your region, your brand, our platform.", text: "Let’s discuss what energy communities under your name could look like.", primary: { label: "Request partner meeting", href: "#anfrage" }, secondary: { label: "View the platform", href: "/energiegemeinschaften/software" } },
  },
};

const schema = (en) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${abs(PFAD)}/#service`,
  name: en ? "White label for energy communities" : "White-Label für Energiegemeinschaften",
  serviceType: en ? "Software for energy communities under a partner brand" : "Software für Energiegemeinschaften unter Partnermarke",
  audience: { "@type": "BusinessAudience", name: en ? "Municipal utilities and regional energy suppliers" : "Stadtwerke und regionale Energieversorger" },
  provider: { "@id": `${abs("/")}/#organization` },
  areaServed: { "@type": "Country", name: en ? "Austria" : "Österreich" },
  url: abs(PFAD),
});

export default async function WhiteLabelSeite({ params }) {
  const land = await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  const t = schreibweiseFuer(TEXTE[en ? "en" : "de"], land); // Schweiz: ohne „ß“
  const nurAt = !land || land === "AT";
  const netz = egFakt("netzgebiet", { sprache: en ? "en" : "de" });
  const bundeslaender = [{ id: "offen", label: en ? "Please choose" : "Bitte wählen" }, ...BUNDESLAENDER.map((b) => ({ id: b, label: en ? BUNDESLAENDER_EN[b] || b : b }))];

  return (
    <div className="[&_.ov-lead]:hyphens-manual [&_h2]:hyphens-manual! lg:[&_p]:hyphens-manual">
      {nurAt && <JsonLd daten={schema(en)} />}
      <Kopf
        brotkrumen={[{ name: t.brot[0], href: "/energiegemeinschaften" }, { name: t.brot[1], href: "/energiegemeinschaften/software" }, { name: t.brot[2] }]}
        marke={t.marke}
        eyebrow={t.eyebrow}
        titel={t.titel}
        lead={t.lead}
        aktionen={nurAt ? t.aktionen : []}
        fussnote={nurAt ? t.fussnote : undefined}
        karte={t.karte}
      />

      {!nurAt ? (
        <Section tone="white" space="lg">
          <NurOesterreich land={land} pfad={SCHLUESSEL} en={en} />
        </Section>
      ) : (
        <>
          <Section tone="white" space="lg">
            <SectionHeading eyebrow={t.nutzenEyebrow} title={t.nutzenTitel} className="max-w-3xl" />
            <ul role="list" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {t.nutzen.map((n, i) => (
                <Reveal as="li" key={n.titel} delay={i * 70} className="ov-lift rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70">
                  <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-ov-100">
                    <n.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-[17px] font-bold leading-snug text-ink-900">{n.titel}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{n.text}</p>
                </Reveal>
              ))}
            </ul>
          </Section>

          <Section tone="sand" space="lg">
            <SectionHeading eyebrow={t.rollenEyebrow} title={t.rollenTitel} lead={t.rollenLead} className="max-w-3xl" />
            <ul role="list" className="mt-10 grid gap-5 lg:grid-cols-3">
              {t.rollen.map((r, i) => {
                const mitte = i === 1;
                return (
                  <Reveal as="li" key={r.titel} delay={i * 90} className={mitte ? "ov-verlauf-nacht rounded-[2rem] p-6 text-white shadow-e3 ring-2 ring-ov-500/60 sm:p-8" : "rounded-[2rem] bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 sm:p-8"}>
                    <span aria-hidden="true" className={mitte ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-500 text-white" : "flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 ring-1 ring-ov-100"}>
                      <r.icon className="h-6 w-6" />
                    </span>
                    <h3 className={mitte ? "ov-h3 mt-5 text-white" : "ov-h3 mt-5 text-ink-900"}>{r.titel}</h3>
                    <ul role="list" className="mt-4 space-y-2.5">
                      {r.punkte.map((p) => (
                        <li key={p} className={mitte ? "flex gap-2.5 text-[15px] leading-snug text-white/90" : "flex gap-2.5 text-[15px] leading-snug text-ink-800"}>
                          <Haken dunkel={mitte} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                );
              })}
            </ul>
          </Section>

          <Section tone="white" space="lg" id="ablauf" className="scroll-mt-24">
            <SectionHeading eyebrow={t.ablaufEyebrow} title={t.ablaufTitel} className="max-w-3xl" />
            <Reveal className="mt-10 rounded-[2rem] bg-gradient-to-b from-ov-50/80 to-white p-6 shadow-e1 ring-1 ring-ov-200/70 sm:p-8 lg:p-10">
              <ol role="list" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {t.ablauf.map((s, i) => (
                  <li key={s.titel} className="flex gap-4 lg:flex-col">
                    <span aria-hidden="true" className={i === t.ablauf.length - 1 ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ov-600 font-display text-[18px] font-extrabold text-white" : "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white font-display text-[18px] font-extrabold text-ov-700 shadow-e1 ring-1 ring-ov-200"}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[18px] font-semibold leading-snug text-ink-900">
                        <span className="sr-only">{en ? `Step ${i + 1}: ` : `Schritt ${i + 1}: `}</span>
                        {s.titel}
                      </h3>
                      <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>

            <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:gap-12">
              <div>
                <Eyebrow>{t.rahmenEyebrow}</Eyebrow>
                <h2 className="ov-h3 mt-3 text-ink-900">{t.rahmenTitel}</h2>
                <ul role="list" className="mt-5 space-y-3">
                  {t.rahmen.map((x, i) => (
                    <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
                      <RahmenIcon i={i} />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 font-display text-[17px] font-bold text-ink-900">{t.netzTitel}</p>
                <FaktKasten fakt={netz} en={en} />
              </div>
            </div>
          </Section>

          <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <SectionHeading className="lg:sticky lg:top-28 lg:self-start" eyebrow={t.anfrageEyebrow} title={t.anfrageTitel} lead={t.anfrageLead} />
              <Reveal className="rounded-[2rem] bg-white p-5 shadow-e3 ring-1 ring-ink-200/70 sm:p-8 md:p-10">
                <AnfrageMitDaten
                  legende={t.legende}
                  festeDaten={{ quelle: "eg-white-label", land: "AT", segment: "white-label" }}
                  zusatz={[
                    { name: "organisation", label: t.organisation, art: "select", optionen: t.organisationen },
                    { name: "bundesland", label: t.bundesland, art: "select", optionen: bundeslaender },
                    { name: "anliegen", label: t.interesse, art: "chips", optionen: t.interessen },
                    { name: "gemeinschaften", label: t.gemeinschaften, art: "zahl", platzhalter: t.gemeinschaftenPlatz, breit: true },
                  ]}
                  formular={{ typ: "energiegemeinschaft", felder: ["firma", "telefon", "plz", "nachricht"], button: t.button }}
                />
              </Reveal>
            </div>
          </Section>

          <Section tone="white" space="lg">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitel} />
              <Faq items={t.faq} />
            </div>
          </Section>

          <Querverweise items={t.querverweise} />
          <CtaBand {...t.cta} />
        </>
      )}
    </div>
  );
}

export const generateMetadata = seitenMetadata(SCHLUESSEL, metadata, { en: metadataEn });
