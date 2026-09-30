import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import Faq from "@/components/ui/Faq";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import TerminOeffentlich from "@/components/Portal/Termine/TerminOeffentlich";
import { TERMIN_ARTEN, TERMIN_ART_IDS } from "@/lib/plattform/termine";
import { abs } from "@/data/site";

const PFAD = "/termin";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Termin vereinbaren: Beratung & Besichtigung | ÖkoInvest",
  description: "Freien Termin direkt online buchen: Flächenbesichtigung, Beratung am Telefon oder per Video, Gemeindetermin – mit Bestätigung und Kalenderdatei per E-Mail.",
  keywords: ["Termin ÖkoInvest", "Flächenbesichtigung Solarpark", "Beratung Freiflächen-PV", "Gemeinde Solarpark Termin"],
});

const HERKUNFT = ["kontakt", "flaechencheck", "website"];

const FAQ = [
  { q: "Was kostet ein Beratungstermin?", a: "Für Flächeneigentümer, Landwirte und Gemeinden sind Beratung und Besichtigung kostenfrei und unverbindlich." },
  { q: "Wie verschiebe oder storniere ich einen Termin?", a: "In der Bestätigungs-E-Mail finden Sie einen persönlichen Link. Darüber können Sie den Termin bis zum Beginn verschieben oder absagen. Mit einem Portal-Konto sehen Sie Ihre Termine zusätzlich unter „Termine“." },
  { q: "Was sollte ich für eine Flächenbesichtigung vorbereiten?", a: "Hilfreich sind Flurstücksnummern oder ein Lageplan, bekannte Leitungen oder Dienstbarkeiten und – falls vorhanden – Angaben zum Pachtstatus. Eine erste Einschätzung erhalten Sie in der Regel schon vorab über den Flächencheck." },
];

export default async function TerminSeite({ searchParams }) {
  const sp = await searchParams;
  const arten = TERMIN_ART_IDS.filter((a) => TERMIN_ARTEN[a].oeffentlich);
  const herkunft = HERKUNFT.includes(sp?.herkunft) ? sp.herkunft : "website";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Terminbuchung ÖkoInvest",
    url: abs(PFAD),
    provider: { "@id": `${abs("/")}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    availableChannel: { "@type": "ServiceChannel", serviceUrl: abs(PFAD) },
  };
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <PageHero
        breadcrumbs={[{ name: "Termin vereinbaren" }]}
        eyebrow="Termin online buchen"
        title="Sprechen wir über Ihre Fläche oder Ihr Projekt."
        lead="Wählen Sie einen freien Termin: Besichtigung vor Ort, Beratung am Telefon oder per Video, Termin mit Ihrer Gemeinde. Sie erhalten sofort eine Bestätigung mit Kalenderdatei."
        points={["Kostenfrei und unverbindlich", "Persönliche Ansprechperson aus Ihrer Region", "Umbuchen oder absagen per Link", "Deutschland, Österreich, Schweiz"]}
        image={{ src: "/img/planer-tablet.jpg", alt: "Planung einer Photovoltaik-Freiflächenanlage am Tablet" }}
      />
      <Section tone="white" space="md">
        <div className="mx-auto max-w-5xl">
          <TerminOeffentlich arten={arten} startArt={TERMIN_ARTEN[sp?.art]?.oeffentlich ? sp.art : undefined} herkunft={herkunft} flaeche={sp?.plz ? { plz: String(sp.plz).slice(0, 10), ort: String(sp.ort || "").slice(0, 80) } : null} />
        </div>
      </Section>
      <Section tone="sand" space="md">
        <div className="mx-auto max-w-3xl">
          <h2 className="ov-h2 mb-8 text-ink-900">Häufige Fragen zur Terminbuchung</h2>
          <Faq items={FAQ} />
        </div>
      </Section>
    </div>
  );
}
