// src/app/rechner/ppa/page.js – PPA-Rechner für Unternehmen

import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import PpaRechner from "@/components/Rechner/PpaRechner";
import { ALLGEMEIN, ERLOESE, STROM } from "@/lib/invest/markt";
import { GLEICHZEITIG } from "@/lib/rechner/ppa";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = seitenPfad("/rechner/ppa");
const P = STROM.ppa;

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "PPA-Rechner für Unternehmen: Solarstrom-PPA | ÖkoInvest",
  description:
    "PPA-Rechner für den Mittelstand: Ersparnis und Risiko eines Solar-PPA bei fallenden, stabilen oder steigenden Preisen – pay-as-produced oder Baseload, mit CO₂.",
  keywords: ["PPA Rechner", "Power Purchase Agreement Unternehmen", "Solar PPA Mittelstand", "PPA pay as produced", "Baseload PPA", "Stromliefervertrag Solarpark"],
});

const FAQ = [
  {
    q: "Was ist ein PPA und für wen lohnt es sich?",
    a: "Ein Power Purchase Agreement ist ein langfristiger Stromliefervertrag direkt aus einer bestimmten Anlage – hier einem Solarpark – zu einem über Jahre festen Preis. Es lohnt sich vor allem für Unternehmen mit planbarem Verbrauch ab einigen hundert Megawattstunden im Jahr, die sich gegen steigende Strompreise absichern und ihren Strom nachweislich aus erneuerbaren Anlagen beziehen wollen.",
  },
  {
    q: "Pay-as-produced oder Baseload – was ist der Unterschied?",
    a: `Bei pay-as-produced nehmen Sie den Strom genau dann ab, wenn der Park erzeugt – mittags viel, nachts nichts. Was Sie in dem Moment nicht verbrauchen, wird weiterverkauft, meist zu einem niedrigeren Solar-Marktwert. Bei einem Baseload- oder Profil-PPA formt ein Lieferant die Solarmengen in ein gleichmäßiges Band oder Ihr Lastprofil. Das ist bequemer und sicherer, kostet aber einen Strukturierungsaufschlag – grob ${fmt(P.strukturierungCt.min, 1)}–${fmt(P.strukturierungCt.max, 1)} ct/kWh.`,
  },
  {
    q: "Warum spare ich bei fallenden Strompreisen weniger – oder zahle drauf?",
    a: "Der PPA-Preis ist fest. Fällt der Börsenpreis deutlich, wäre die Beschaffung am Markt günstiger gewesen. Das ist der Preis der Absicherung – wie bei einer Versicherung. Der Rechner zeigt deshalb drei Szenarien und den Marktpreis, ab dem sich das PPA nicht mehr rechnet. Viele Unternehmen decken daher nur einen Teil ihres Verbrauchs über ein PPA.",
  },
  {
    q: "Was passiert bei negativen Strompreisen?",
    a: `Das ist eine zentrale Vertragsfrage. 2025 fiel laut dena/Pexapark rund ${fmt(P.negativAnteilSolar * 100)} % der deutschen Solarerzeugung in Stunden mit negativen Preisen. Üblich sind Klauseln, nach denen der Park in diesen Stunden abgeregelt wird oder der Abnehmer nicht zahlen muss – die vereinbarte Menge und damit Ihre Deckung sinken dann entsprechend.`,
  },
  {
    q: "Wie hängen PPA und Reststrom-Pool zusammen?",
    a: "Ein PPA deckt vor allem die Tagesstunden. Den Strom, den Sie abends, nachts und im Winter weiter brauchen, beschaffen Sie wie bisher – oder gebündelt über den Reststrom-Pool von ÖkoInvest. Beides lässt sich kombinieren.",
  },
  {
    q: "Wie werden die CO₂-Einsparungen gerechnet?",
    a: `Mit dem Vermeidungsfaktor des Umweltbundesamts von rund ${fmt(ALLGEMEIN.co2KgProKwh * 1000)} g CO₂ je kWh Solarstrom. Er gilt für Strom aus einer zusätzlichen, neuen Anlage. Für die Bilanz Ihres Unternehmens (Scope 2, marktbasiert) zählt der Nachweis über Herkunftsnachweise – das sollte im Vertrag geregelt sein.`,
  },
];

export default async function Page({ params }) {
  await landDerSeite(params, "/rechner/ppa");
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="ppa"
      breadcrumb="PPA-Rechner"
      eyebrow="Für Unternehmen · Strombeschaffung"
      title={
        <>
          Solarstrom zum Festpreis – <span className="ov-text-gradient-light">was bringt ein PPA?</span>
        </>
      }
      lead="Verbrauch, Lastprofil, heutiger Preis und PPA-Angebot eingeben: Sie sehen Ersparnis und Risiko in drei Börsenpreis-Szenarien, den Grad der Preisabsicherung und die CO₂-Wirkung."
      chips={["Pay-as-produced oder Baseload", "Drei Preisszenarien", "Break-even-Preis", "CO₂-Wirkung"]}
      app={{
        name: "PPA-Rechner für Unternehmen",
        description: "Vergleicht die Energiekosten eines Unternehmens mit und ohne Solar-PPA über die Laufzeit – pay-as-produced oder Baseload, in drei Marktpreis-Szenarien, mit Preisabsicherung und CO₂-Vermeidung.",
        featureList: ["Lastprofil und Gleichzeitigkeit", "Pay-as-produced mit Überschuss-Weiterverkauf", "Baseload mit Strukturierungsaufschlag", "Szenarien Preisverfall, seitwärts, Anstieg", "Break-even-Marktpreis", "Preisabsicherung und CO₂"],
      }}
      rechner={<PpaRechner />}
      erklaerung={
        <div className="ov-prose max-w-none">
          <h2>So rechnet der PPA-Rechner</h2>
          <p>
            Verglichen wird nur der <strong>Energieanteil</strong> Ihres Strompreises – Beschaffung und Vertrieb. Netzentgelte, Umlagen und Stromsteuer zahlen Sie mit und ohne PPA in
            gleicher Höhe. Ihr heutiger Energiepreis folgt im Rechner dem gewählten Szenario: Er bewegt sich über vier Jahre auf 70 %, 100 % oder 130 % des heutigen Niveaus und bleibt dann
            dort. Der PPA-Preis bleibt über die Laufzeit fest.
          </p>
          <p>
            Bei <strong>pay-as-produced</strong> fällt die PPA-Menge im Solarprofil an. Wir nehmen an, dass höchstens {fmt(GLEICHZEITIG * 100)} % Ihres Verbrauchs in den Sonnenstunden
            gleichzeitig gedeckt werden können (Sommer-Überschuss, Winter-Lücke). Was darüber liegt, wird zum Solar-Marktwert weiterverkauft – rund {fmt(P.captureRate * 100)} % des
            Base-Preises, abzüglich {fmt(P.vermarktungsAbschlag * 100)} % Abschlag. Weil die günstigen Mittagsstunden wegfallen, wird der verbleibende Reststrom je kWh etwas teurer.
          </p>
          <p>
            Bei <strong>Baseload</strong> übernimmt ein Lieferant diese Formung gegen einen Aufschlag. Die <strong>Preisabsicherung</strong> zeigt, um wie viel Prozent die Spanne Ihrer
            Energiekosten zwischen Preisverfall und Preisanstieg schrumpft.
          </p>
          <h3>Einordnung</h3>
          <p>
            Zum Vergleich: Reine Erzeuger-PPAs für Solar (pay-as-produced, 10 Jahre) lagen 2025 laut dena bei etwa 35–45 €/MWh – Lieferverträge an Unternehmen liegen wegen Vertrieb,
            Bilanzierung und dem höheren Terminmarkt 2026 darüber. Der EEG-Zuschlag für neue Freiflächenanlagen lag 2025 um {fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh. Mehr zu Verträgen und
            Klauseln im Ratgeber <Link href="/wissen/ratgeber/ppa-fuer-unternehmen">PPA für Unternehmen</Link>.
          </p>
        </div>
      }
      annahmen={[
        ["Terminmarkt Base (Cal-27)", `rund ${fmt(P.baseTerminCt, 1)} ct/kWh`],
        ["Solar-Capture-Rate (Jahr)", `rund ${fmt(P.captureRate * 100)} %`],
        ["Liefer-PPA Solar (10 J.)", `${fmt(P.pppCt.min, 1)}–${fmt(P.pppCt.max, 1)} ct/kWh`],
        ["Strukturierung Baseload", `${fmt(P.strukturierungCt.min, 1)}–${fmt(P.strukturierungCt.max, 1)} ct/kWh`],
        ["Bilanzierung pay-as-produced", `${fmt(P.bilanzierungCt, 1)} ct/kWh`],
        ["Gleichzeitig nutzbar (max.)", `${fmt(GLEICHZEITIG * 100)} % der Tageslast`],
        ["Solar in negativen Stunden 2025", `${fmt(P.negativAnteilSolar * 100, 1)} %`],
        ["CO₂-Vermeidung", `${fmt(ALLGEMEIN.co2KgProKwh * 1000)} g/kWh`],
      ]}
      quellen={[
        { name: "dena – PPA-Marktanalyse 2025", url: "https://www.dena.de/fileadmin/dena/Publikationen/PDFs/2026/PPA_Marktanalyse_2025.pdf" },
        { name: "EEX – Terminmarkt Strom", url: "https://www.eex.com/de/marktdaten/strom" },
        { name: "Umweltbundesamt – Emissionsbilanz", url: "https://www.umweltbundesamt.de/publikationen" },
      ]}
      faq={FAQ}
      faqTitel="PPA für Unternehmen – gut zu wissen"
      querverweise={[
        { href: seitenPfad("/reststrom"), titel: "Reststrom-Pool", text: "Den Strom, den Sie trotz PV und PPA noch brauchen, gebündelt beschaffen." },
        { href: seitenPfad("/rechner/reststrom"), titel: "Reststrom-Rechner", text: "Was Bündelung, Solar-PPA und Flexibilität bei Ihrem Reststrom sparen können." },
        { href: seitenPfad("/virtuelles-kraftwerk"), titel: "Virtuelles Kraftwerk", text: "Wie Parks, Speicher und flexible Verbraucher zusammenspielen." },
        { href: "/wissen/ratgeber/ppa-fuer-unternehmen", titel: "Ratgeber PPA", text: "Vertragsarten, Laufzeiten, Klauseln und worauf Einkäufer achten sollten." },
      ]}
      cta={{
        eyebrow: "Für Unternehmen",
        title: "Solarstrom aus Parks der Region – zum Festpreis.",
        text: "Wir prüfen, ob ein PPA aus einem unserer Parks zu Ihrem Lastgang passt, und kombinieren es auf Wunsch mit dem Reststrom-Pool. Unverbindlich.",
        primary: { label: "PPA anfragen", href: "/kontakt?anliegen=reststrom#formular" },
        secondary: { label: "Reststrom-Pool ansehen", href: seitenPfad("/reststrom") },
      }}
    />
  );
}

export const generateMetadata = landMetadata("/rechner/ppa", metadata);
