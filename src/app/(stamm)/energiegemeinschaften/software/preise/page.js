// /energiegemeinschaften/software/preise – öffentliches Preisblatt der EG-Software Österreich (Welle 3, Paket B7).
//
// Transparente Struktur je Paket (Einrichtung einmalig, Grundgebühr je Gemeinschaft, Betrag je Zählpunkt).
// Es gibt noch keine freigegebenen Beträge (Inhaberpunkt): src/lib/eg-angebot/preisblatt.js zeigt dann überall
// „Preis auf Anfrage“ und den Freigabe-Vermerk. Länder: /at voll, gemeinsame Seite mit Kennzeichnung „Österreich“,
// /de und /ch Länderhinweis (keine EG-Software für DE/CH). Lead: Preisanfrage über POST /api/anfrage
// (typ energiegemeinschaft, Land AT, Einwilligungsprotokoll im Backend). noindex bis Fachprüfung und Preisfreigabe.

import { BadgeEuro, FileText, Layers, Receipt, Scale } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import CtaBand from "@/components/ui/CtaBand";
import Faq from "@/components/ui/Faq";
import Querverweise from "@/components/Reusable/Querverweise";
import AnfrageMitDaten from "@/components/Gemeinschaft/AnfrageMitDaten";
import JsonLd from "@/components/JsonLd";
import Kopf from "@/components/Portal/EG/Angebot/Kopf";
import Preisblatt, { FreigabeVermerk } from "@/components/Portal/EG/Angebot/Preisblatt";
import { FaktKasten, NurOesterreich } from "@/components/Portal/EG/Angebot/Teile";
import { egFakt } from "@/lib/eg-angebot/fakten";
import { FREIGABE } from "@/lib/eg-angebot/preisblatt";
import { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import { abs } from "@/data/site";
import { pfad as seitenPfad, schreibweiseFuer } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";

const SCHLUESSEL = "/energiegemeinschaften/software/preise";
const PFAD = seitenPfad(SCHLUESSEL);

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Preise: Software für Energiegemeinschaften (AT) | ÖkoInvest",
  description: "Was die Software für Energiegemeinschaften kostet: Einrichtung, Grundgebühr und Betrag je Zählpunkt – offen aufgeschlüsselt. Jetzt Angebot anfragen.",
  keywords: ["Energiegemeinschaft Software Preis", "EEG Abrechnung Kosten", "Energiegemeinschaft Kosten je Zählpunkt", "Betriebsführung Energiegemeinschaft Preis"],
});
metadata.robots = { index: false, follow: true }; // Fachprüfung und Preisfreigabe offen (Register index: false)

const metadataEn = rechnerMetadataEn({
  title: "Pricing: energy community software (Austria) | ÖkoInvest",
  description: "What energy community software costs in Austria: set-up, base fee per community and amount per metering point – openly itemised. Request an offer now.",
  keywords: ["energy community software price Austria", "EEG billing costs", "cost per metering point energy community", "energy community operational management price"],
});

const TEXTE = {
  de: {
    brot: ["Energiegemeinschaften", "Software", "Preisblatt"],
    marke: "Österreich",
    eyebrow: "Software für Energiegemeinschaften · Preisblatt",
    titel: (
      <>
        Was die Software kostet – <span className="ov-text-gradient-light">offen aufgeschlüsselt.</span>
      </>
    ),
    lead: "Der Preis setzt sich aus drei Teilen zusammen: einer einmaligen Einrichtung, einer Grundgebühr je Gemeinschaft und einem Betrag je Zählpunkt. So sehen Sie vorab, wofür Sie zahlen – und wie sich die Kosten mit der Größe Ihrer Gemeinschaft entwickeln.",
    aktionen: [{ label: "Preis für Ihre Gemeinschaft anfragen", href: "#anfrage" }, { label: "Preisblatt ansehen", href: "#preisblatt" }],
    fussnote: "Unverbindlich · schriftliches Angebot · auch für bestehende Gemeinschaften",
    karte: {
      titel: "So ist der Preis aufgebaut",
      zeilen: [
        ["Einrichtung", "einmalig"],
        ["Grundgebühr", "je Gemeinschaft und Monat"],
        ["Betrag je Zählpunkt", "je Monat"],
        ["Kosten Dritter", "gesondert ausgewiesen"],
      ],
    },
    blattEyebrow: "Preisblatt",
    blattTitel: "Drei Pakete, gleich aufgebaut",
    blattLead: "Jedes Paket hat dieselben Preisposten. Die Gründung ist eine einmalige Leistung; danach läuft der Betrieb über Software oder Betriebsführung.",
    vermerkTitel: "Stand der Beträge",
    grundsaetzeEyebrow: "Grundsätze",
    grundsaetzeTitel: "Woran Sie uns messen können",
    grundsaetze: [
      { icon: Layers, titel: "Nach Zählpunkten aufgebaut", text: "Der laufende Preis richtet sich nach der Zahl der Zählpunkte, nicht nach der Strommenge, die in der Gemeinschaft geteilt wird." },
      { icon: Receipt, titel: "Kosten Dritter getrennt", text: "Gebühren Dritter, etwa Bankgebühren für SEPA-Einzüge, sind nicht enthalten. Wir nennen sie im Angebot gesondert." },
      { icon: BadgeEuro, titel: "Netto und brutto", text: "Jeder Betrag steht netto und mit Umsatzsteuer da – Sie müssen nichts selbst umrechnen." },
      { icon: FileText, titel: "Schriftlich vor dem Vertrag", text: "Sie erhalten vor jedem Vertrag ein schriftliches Angebot mit denselben Posten wie in diesem Preisblatt." },
    ],
    elwgTitel: "Rechtlicher Rahmen in Österreich",
    anfrageEyebrow: "Preisanfrage",
    anfrageTitel: "Preis für Ihre Gemeinschaft",
    anfrageLead: "Nennen Sie Paket, Modell und ungefähre Zahl der Zählpunkte. Wir schicken Ihnen ein schriftliches Angebot, aufgeschlüsselt wie dieses Preisblatt.",
    legende: "Ihre Gemeinschaft",
    paket: "Paket",
    pakete: [{ id: "offen", label: "Noch offen" }, { id: "software", label: "Software" }, { id: "betrieb", label: "Betriebsführung" }, { id: "gruendung", label: "Gründung" }],
    modell: "Modell",
    modelle: [{ id: "offen", label: "Noch offen" }, { id: "eeg_lokal", label: "EEG lokal" }, { id: "eeg_regional", label: "EEG regional" }, { id: "beg", label: "BEG" }, { id: "gea", label: "GEA" }],
    zp: "Wie viele Zählpunkte? (Schätzung genügt)",
    zpPlatz: "z. B. 60",
    button: "Preis anfragen",
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Fragen zum Preis",
    faq: [
      { q: "Warum stehen noch keine Beträge im Preisblatt?", a: "Die Beträge sind noch nicht freigegeben. Wir veröffentlichen sie hier, sobald das geschehen ist. Bis dahin erhalten Sie den Preis für Ihre Gemeinschaft auf Anfrage – schriftlich und mit denselben Posten." },
      { q: "Was zählt als Zählpunkt?", a: "Jeder Zählpunkt, der an der Gemeinschaft teilnimmt – Bezug und Einspeisung jeweils für sich. Ein Mitglied mit PV-Anlage hat also meist zwei Zählpunkte." },
      { q: "Ist der Wechsel von einem anderen Anbieter im Preis enthalten?", a: "Was beim Wechsel anfällt – Datenübernahme, Abgleich mit dem Netzbetreiber, Parallellauf –, steht im Angebot unter Einrichtung. Ob sich ein Wechsel für Ihre Gemeinschaft lohnt, zeigt der Wechsel-Check." },
      { q: "Welche Kosten kommen von Dritten?", a: "Je nach Gemeinschaft etwa Bankgebühren für SEPA-Einzüge oder Kosten einer Rechts- oder Steuerberatung. Wir führen sie im Angebot getrennt auf." },
    ],
    querverweise: [
      { href: "/energiegemeinschaften/software", titel: "Plattform & Betrieb", text: "Was die Software kann und wie die Pakete aufgebaut sind." },
      { href: "/energiegemeinschaften/software/wechsel-check", titel: "Wechsel-Check", text: "Ob sich ein Anbieterwechsel lohnt und was vorher zu klären ist." },
      { href: "/energiegemeinschaften/software/white-label", titel: "White-Label für Stadtwerke", text: "Energiegemeinschaften unter Ihrer Marke betreiben." },
      { href: "/energiegemeinschaften/rechner", titel: "Energiegemeinschaft-Rechner", text: "Ersparnis aus Energiepreis, Netzentgelt und Abgabe." },
    ],
    cta: { eyebrow: "Preisanfrage", title: "Ein Angebot, das Sie nachrechnen können.", text: "Paket, Modell und Zählpunkte genügen – wir schicken Ihnen ein schriftliches Angebot mit allen Posten.", primary: { label: "Preis anfragen", href: "#anfrage" }, secondary: { label: "Zum Wechsel-Check", href: "/energiegemeinschaften/software/wechsel-check" } },
    landTitel: "Preisblatt für Österreich",
  },
  en: {
    brot: ["Energy communities", "Software", "Price sheet"],
    marke: "Austria",
    eyebrow: "Software for energy communities · Price sheet",
    titel: (
      <>
        What the software costs – <span className="ov-text-gradient-light">openly broken down.</span>
      </>
    ),
    lead: "The price consists of three parts: a one-off set-up, a base fee per community and an amount per metering point. So you can see in advance what you pay for – and how the costs develop with the size of your community.",
    aktionen: [{ label: "Request a price for your community", href: "#anfrage" }, { label: "View price sheet", href: "#preisblatt" }],
    fussnote: "Without obligation · written offer · also for existing communities",
    karte: {
      titel: "How the price is structured",
      zeilen: [
        ["Set-up", "one-off"],
        ["Base fee", "per community and month"],
        ["Amount per metering point", "per month"],
        ["Third-party costs", "shown separately"],
      ],
    },
    blattEyebrow: "Price sheet",
    blattTitel: "Three packages, structured the same way",
    blattLead: "Every package has the same price items. Founding is a one-off service; afterwards, operation continues via Software or Operational management.",
    vermerkTitel: "Status of the amounts",
    grundsaetzeEyebrow: "Principles",
    grundsaetzeTitel: "What you can hold us to",
    grundsaetze: [
      { icon: Layers, titel: "Based on metering points", text: "The ongoing price depends on the number of metering points, not on the amount of power shared in the community." },
      { icon: Receipt, titel: "Third-party costs separate", text: "Third-party fees, for example bank charges for direct debits, are not included. We list them separately in the offer." },
      { icon: BadgeEuro, titel: "Net and gross", text: "Every amount is shown net and including VAT – you do not have to convert anything yourself." },
      { icon: FileText, titel: "In writing before the contract", text: "Before any contract, you receive a written offer with the same items as this price sheet." },
    ],
    elwgTitel: "Legal framework in Austria",
    anfrageEyebrow: "Price enquiry",
    anfrageTitel: "Price for your community",
    anfrageLead: "Tell us the package, model and approximate number of metering points. We will send you a written offer, broken down like this price sheet.",
    legende: "Your community",
    paket: "Package",
    pakete: [{ id: "offen", label: "Still open" }, { id: "software", label: "Software" }, { id: "betrieb", label: "Operational management" }, { id: "gruendung", label: "Founding" }],
    modell: "Model",
    modelle: [{ id: "offen", label: "Still open" }, { id: "eeg_lokal", label: "EEG local" }, { id: "eeg_regional", label: "EEG regional" }, { id: "beg", label: "BEG" }, { id: "gea", label: "GEA" }],
    zp: "How many metering points? (an estimate is enough)",
    zpPlatz: "e.g. 60",
    button: "Request price",
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Questions about the price",
    faq: [
      { q: "Why are there no amounts in the price sheet yet?", a: "The amounts have not yet been released. We will publish them here as soon as that has happened. Until then, you will receive the price for your community on request – in writing and with the same items." },
      { q: "What counts as a metering point?", a: "Every metering point that participates in the community – consumption and feed-in each count separately. A member with a PV installation therefore usually has two metering points." },
      { q: "Is switching from another provider included in the price?", a: "What a switch involves – data takeover, reconciliation with the grid operator, parallel run – is listed in the offer under set-up. The switch check shows whether switching is worthwhile for your community." },
      { q: "Which costs come from third parties?", a: "Depending on the community, for example bank charges for direct debits or the costs of legal or tax advice. We list them separately in the offer." },
    ],
    querverweise: [
      { href: "/energiegemeinschaften/software", titel: "Platform & operation", text: "What the software does and how the packages are structured." },
      { href: "/energiegemeinschaften/software/wechsel-check", titel: "Switch check", text: "Whether switching provider is worthwhile and what to clarify first." },
      { href: "/energiegemeinschaften/software/white-label", titel: "White label for municipal utilities", text: "Run energy communities under your own brand." },
      { href: "/energiegemeinschaften/rechner", titel: "Energy community calculator", text: "Savings from energy price, grid fee and levy." },
    ],
    cta: { eyebrow: "Price enquiry", title: "An offer you can check for yourself.", text: "Package, model and metering points are enough – we will send you a written offer with all items.", primary: { label: "Request price", href: "#anfrage" }, secondary: { label: "To the switch check", href: "/energiegemeinschaften/software/wechsel-check" } },
    landTitel: "Price sheet for Austria",
  },
};

const schema = (en) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${abs(PFAD)}/#service`,
  name: en ? "Software and operational management for energy communities" : "Software und Betriebsführung für Energiegemeinschaften",
  serviceType: en ? "Software and services for energy communities" : "Software und Dienstleistung für Energiegemeinschaften",
  provider: { "@id": `${abs("/")}/#organization` },
  areaServed: { "@type": "Country", name: en ? "Austria" : "Österreich" },
  url: abs(PFAD),
  // Keine Offer-Preise im Schema, solange keine Beträge freigegeben sind
});

export default async function PreisblattSeite({ params }) {
  const land = await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  const t = schreibweiseFuer(TEXTE[en ? "en" : "de"], land); // Schweiz: ohne „ß“
  const nurAt = !land || land === "AT";
  const elwg = egFakt("elwg", { sprache: en ? "en" : "de" });
  const netz = egFakt("netzgebiet", { sprache: en ? "en" : "de" });
  const vermerk = FreigabeVermerk({ en });

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
        karte={{ ...t.karte, hinweis: vermerk || undefined }}
      />

      {!nurAt ? (
        <Section tone="white" space="lg">
          <NurOesterreich land={land} pfad={SCHLUESSEL} en={en} />
        </Section>
      ) : (
        <>
          <Section tone="sand" space="lg" id="preisblatt" className="scroll-mt-24">
            <SectionHeading eyebrow={t.blattEyebrow} title={t.blattTitel} lead={t.blattLead} className="max-w-3xl" />
            {vermerk && (
              <Reveal className="mt-8 flex gap-3 rounded-2xl bg-white p-5 text-[14.5px] leading-relaxed text-ink-700 ring-1 ring-sun-200" data-preis-freigabe={FREIGABE.freigegeben ? "ja" : "ausstehend"}>
                <Scale aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-600" />
                <p>
                  <strong className="text-ink-900">{t.vermerkTitel}:</strong> {vermerk}
                </p>
              </Reveal>
            )}
            <div className="mt-12 md:mt-14">
              <Preisblatt en={en} />
            </div>
          </Section>

          <Section tone="white" space="lg">
            <SectionHeading eyebrow={t.grundsaetzeEyebrow} title={t.grundsaetzeTitel} className="max-w-3xl" />
            <ul role="list" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {t.grundsaetze.map((g, i) => (
                <Reveal as="li" key={g.titel} delay={i * 70} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70">
                  <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-ov-100">
                    <g.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-[17px] font-bold leading-snug text-ink-900">{g.titel}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{g.text}</p>
                </Reveal>
              ))}
            </ul>
            <div className="mt-12 grid gap-3 lg:grid-cols-2">
              <p className="font-display text-[18px] font-bold text-ink-900 lg:col-span-2">{t.elwgTitel}</p>
              <FaktKasten fakt={elwg} en={en} />
              <FaktKasten fakt={netz} en={en} />
            </div>
          </Section>

          <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <SectionHeading className="lg:sticky lg:top-28 lg:self-start" eyebrow={t.anfrageEyebrow} title={t.anfrageTitel} lead={t.anfrageLead} />
              <Reveal className="rounded-[2rem] bg-white p-5 shadow-e3 ring-1 ring-ink-200/70 sm:p-8 md:p-10">
                <AnfrageMitDaten
                  legende={t.legende}
                  festeDaten={{ quelle: "eg-preisblatt", land: "AT", anliegen: "software" }}
                  zusatz={[
                    { name: "paket", label: t.paket, art: "select", optionen: t.pakete },
                    { name: "modell", label: t.modell, art: "select", optionen: t.modelle },
                    { name: "zaehlpunkte", label: t.zp, art: "zahl", platzhalter: t.zpPlatz, breit: true },
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
