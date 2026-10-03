import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import ProjektbewertungRechner from "@/components/Rechner/ProjektbewertungRechner";
import { FREIFLAECHE, PHASEN, PROVISION, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = seitenPfad("/rechner/projektbewertung");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Projektbewertung Solarpark: Wert nach Phase | ÖkoInvest",
  description:
    "Was sind PV-Projektrechte wert? Kaufpreisspanne je kWp nach Phase, Netzanschluss, Größe und Vermarktung – mit Werttreibern, Risiko und Weg in die Projektbörse.",
  keywords: ["Projektrechte Solarpark Preis", "Solarpark Projekt verkaufen", "RTB Solarpark Preis", "Projektbewertung Photovoltaik", "Entwicklungsprämie Solar"],
});

const FAQ = [
  {
    q: "Wie werden Projektrechte für Solarparks bewertet?",
    a: "In der Praxis über einen Preis je kWp, der mit dem Entwicklungsstand steigt: Je weiter ein Projekt ist, desto geringer das Risiko für den Käufer. Neben der Phase entscheiden vor allem der Netzanschluss (Zusage, Kapazität, Entfernung), die Größe, die Erlössicherung über EEG-Zuschlag oder PPA sowie die Qualität von Pacht- und Planungsunterlagen. Professionelle Käufer rechnen zusätzlich rückwärts: Aus der erwarteten Rendite des fertigen Parks ergibt sich, wie viel sie für die Rechte zahlen können.",
  },
  {
    q: "Wird der Kaufpreis auf einmal bezahlt?",
    a: "Bei frühen Projekten selten. Üblich sind gestaffelte Zahlungen: ein Teil bei Unterzeichnung, weitere Raten bei Meilensteinen wie Satzungsbeschluss, Baugenehmigung, Netzanschlussvertrag oder Baureife (RTB). So teilen Käufer und Verkäufer das Entwicklungsrisiko. Die Staffelung beeinflusst den Gesamtpreis oft stärker als kleine Unterschiede im Preis je kWp.",
  },
  {
    q: "Was bedeutet Ready-to-Build (RTB)?",
    a: "Ein Projekt ist baureif, wenn Baurecht (in der Regel ein rechtskräftiger Bebauungsplan und die Baugenehmigung), gesicherte Flächen für die Laufzeit, eine Netzanschlusszusage mit Einspeisepunkt und die wesentlichen Gutachten vorliegen. Ab dann kann gebaut werden – offen sind meist nur noch Vermarktung, Finanzierung und EPC-Vertrag.",
  },
  {
    q: "Was kostet der Verkauf über die ÖkoInvest-Projektbörse?",
    a: `Für Käufer nichts. Verkäufer zahlen eine Erfolgsprovision von ${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} % des Kaufpreises – nur, wenn ein Kaufvertrag zustande kommt. Einstellen, Exposé und Matching sind kostenfrei.`,
  },
  {
    q: "Warum mindert eine lange Kabeltrasse den Wert so stark?",
    a: `Weil der Käufer die Kosten trägt: Rund ${fmt(FREIFLAECHE.kabelProMeter)} € je Meter Mittelspannungstrasse inklusive Tiefbau fallen bei einem 10-MWp-Projekt mit 5 km Trasse schnell mit über 50 €/kWp ins Gewicht – so viel wie die gesamte Entwicklungsprämie in frühen Phasen. Dazu kommen Wegerechte und Genehmigungen entlang der Trasse.`,
  },
];

export default async function Page({ params }) {
  await landDerSeite(params, "/rechner/projektbewertung");
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="projektbewertung"
      breadcrumb="Projektbewertung"
      eyebrow="Für Investoren & Entwickler"
      title={
        <>
          Was ist Ihr Projekt <span className="ov-text-gradient-light">in dieser Phase wert?</span>
        </>
      }
      lead="Kaufpreisspanne je kWp und gesamt – nach Entwicklungsstand, Netzanschluss, Größe, Vermarktung und Land. Mit Werttreibern, Abschlägen und Risikoeinordnung."
      chips={["Sechs Phasen bis Bestand", "Netz, Größe, EEG/PPA", "DACH-weit", "Weg in die Projektbörse"]}
      app={{
        name: "Projektbewertung für Solarprojekte",
        description: "Orientierende Bewertung von Photovoltaik-Projektrechten nach Entwicklungsphase mit Werttreibern und Risikoeinordnung.",
        featureList: ["Kaufpreisspanne je kWp und gesamt", "Sechs Entwicklungsphasen", "Zu- und Abschläge für Netzanschluss, Größe, Vermarktung", "Risikoeinordnung"],
      }}
      rechner={<ProjektbewertungRechner />}
      erklaerung={
        <div className="ov-prose max-w-none">
          <h2>Wie der Projektwert entsteht</h2>
          <p>
            Ein Solarprojekt gewinnt mit jedem Meilenstein an Wert, weil ein Risiko wegfällt: Ist die Fläche gesichert, fehlt noch der Netzanschluss; mit der Netzzusage fehlt das Baurecht; mit
            dem Satzungsbeschluss fehlen meist nur noch Genehmigung und letzte Gutachten. Der Rechner startet mit der Marktspanne der gewählten Phase und verschiebt sie mit Zu- und Abschlägen.
          </p>
          <h3>Was den Preis am stärksten bewegt</h3>
          <ul>
            <li>
              <strong>Netzanschluss:</strong> In vielen Regionen der Engpass Nummer eins. Eine reservierte Kapazität oder eine frühe Zusage ist oft mehr wert als ein Planungsschritt.
            </li>
            <li>
              <strong>Größe:</strong> Unter etwa 8 MWp wird der Käuferkreis kleiner, weil Due Diligence und Netzanschluss fast gleich viel kosten wie bei großen Projekten.
            </li>
            <li>
              <strong>Erlössicherung:</strong> Ein EEG-Zuschlag oder ein unterschriebener PPA macht das Projekt bankfähig und verkürzt die Zeit bis zum Bau.
            </li>
            <li>
              <strong>Unterlagen:</strong> Saubere Pachtverträge mit Grundbuchsicherung, Ertragsgutachten, Umwelt- und Blendgutachten sowie ein vollständiger Datenraum beschleunigen den Verkauf.
            </li>
          </ul>
          <p>
            Die Spannen sind Orientierung für ein erstes Gespräch. Ein Wertgutachten ersetzen sie nicht – dafür rechnen Käufer den fertigen Park durch. Mit dem{" "}
            <Link href={seitenPfad("/rechner/solarpark")}>Solarpark-Renditerechner</Link> können Sie diese Sicht selbst nachvollziehen.
          </p>
        </div>
      }
      annahmen={[
        ...PHASEN.map((p) => [p.label, `${fmt(p.preisProKwp.min)}–${fmt(p.preisProKwp.max)} €/kWp`]),
        ["Kabeltrasse", `${fmt(FREIFLAECHE.kabelProMeter)} €/m`],
        ["Provision Verkäufer", `${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} %, nur bei Abschluss`],
        ["Stand", STAND],
      ]}
      quellen={[{ name: `Marktannahmen ÖkoInvest (Spannen DACH, Stand ${STAND})` }, { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" }]}
      faq={FAQ}
      faqTitel="Projektrechte bewerten – gut zu wissen"
      querverweise={[
        { href: "/projektboerse/anbieten", titel: "Projekt anbieten", text: "Exposé anlegen, Käufer mit passendem Suchprofil erreichen – Provision nur bei Abschluss." },
        { href: seitenPfad("/rechner/solarpark"), titel: "Solarpark-Renditerechner", text: "IRR, LCOE und DSCR – so rechnen Käufer den fertigen Park." },
        { href: "/investoren", titel: "Für Investoren", text: "Phasenmodell, Due-Diligence-Checkliste und Ablauf vom Suchprofil bis zum Closing." },
        { href: seitenPfad("/prozess"), titel: "Projektablauf", text: "Von der Flächensicherung bis zur Inbetriebnahme – alle Schritte und Dauern." },
      ]}
      cta={{
        eyebrow: "Projektbörse",
        title: "Ihr Projekt verdient den richtigen Käufer.",
        text: "Stellen Sie Ihr Projekt anonym in die Börse. Wir prüfen die Unterlagen, gleichen mit Suchprofilen ab und begleiten NDA, Datenraum und Verhandlung.",
        primary: { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
        secondary: { label: "Zur Projektbörse", href: "/projektboerse" },
      }}
    />
  );
}

export const generateMetadata = landMetadata("/rechner/projektbewertung", metadata);
