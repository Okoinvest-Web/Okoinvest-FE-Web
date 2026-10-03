import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import CarportRechner from "@/components/Rechner/CarportRechner";
import { CARPORT, ERLOESE, FREIFLAECHE, STAND } from "@/lib/invest/markt";
import { STROMPREIS_STANDARD } from "@/lib/rechner/carport";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = seitenPfad("/rechner/solarcarport");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Solarcarport-Rechner: Kosten & Amortisation | ÖkoInvest",
  description:
    "Solarcarport für Unternehmen und Kommunen berechnen: Leistung je Stellplatz, Ertrag, Investition, Ersparnis, Amortisation – Kauf und Contracting im Vergleich.",
  keywords: ["Solarcarport Rechner", "Solarcarport Kosten", "Parkplatz PV Rechner", "Solarcarport Amortisation", "Solarcarport Contracting", "PV Parkplatz Unternehmen"],
});

const FAQ = [
  {
    q: "Wie viel Leistung passt auf einen Stellplatz?",
    a: `Bei einem Standardstellplatz von 2,5 × 5 m und modernen Modulen rechnen wir mit rund ${fmt(CARPORT.kwpProStellplatz, 1)} kWp je Stellplatz. Bei Reihenanlagen, die Fahrgassen teilweise mit überdecken, kann es mehr sein; bei Einzelcarports oder Schmetterlingsdächern etwas weniger.`,
  },
  {
    q: "Warum ist ein Solarcarport teurer als eine Dachanlage?",
    a: `Weil zur Photovoltaik ein komplettes Tragwerk kommt: Stahl- oder Holzkonstruktion, Fundamente, Anprallschutz, Entwässerung und oft Beleuchtung. Wir rechnen mit ${fmt(CARPORT.capexProKwp.min)}–${fmt(CARPORT.capexProKwp.max)} €/kWp inklusive Stahlbau – ein Mehrfaches einer Freiflächenanlage. Dafür entsteht Nutzen doppelt: Strom und ein überdachter Parkplatz.`,
  },
  {
    q: "Wie wird der Contracting-Preis berechnet?",
    a: `Aus den Vollkosten: Investition verzinst mit marktüblichen Kapitalkosten über ${CARPORT.contractingJahre} Jahre, Betrieb und Wartung, abzüglich der Erlöse für den Überschuss, plus ${fmt(CARPORT.contractingMarge * 100)} % Aufschlag. Umgelegt auf den Strom, den Sie vor Ort nutzen. Je höher Ihr Eigenverbrauch, desto günstiger der Preis. Ein verbindliches Angebot hängt von Standort, Statik, Netzanschluss und Bonität ab.`,
  },
  {
    q: "Was passiert mit dem Überschuss?",
    a: `Strom, den Gebäude und Ladepunkte nicht direkt nutzen, wird ins Netz eingespeist. Wir bewerten ihn vorsichtig mit ${fmt(ERLOESE.merchantCt, 1)} ct/kWh. Je nach Größe gibt es eine Einspeisevergütung oder eine Vermarktung über einen Direktvermarkter; ein Speicher kann den Eigenverbrauch erhöhen.`,
  },
  {
    q: "Ist die Förderung schon eingerechnet?",
    a: "Nein. Manche Länder und Kommunen fördern Solarcarports oder Ladeinfrastruktur zeitweise. Programme ändern sich häufig – wir prüfen im Einzelfall, was für Ihr Vorhaben aktuell verfügbar ist.",
  },
];

export default async function Page({ params }) {
  await landDerSeite(params, "/rechner/solarcarport");
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="solarcarport"
      breadcrumb="Carport-Rechner"
      eyebrow="Für Unternehmen & Kommunen"
      title={
        <>
          Was bringt Ihr Parkplatz <span className="ov-text-gradient-light">als Kraftwerk?</span>
        </>
      }
      lead="Stellplätze, Strompreis und Ladepunkte eingeben – Sie sehen Leistung, Ertrag, Investition, Ersparnis und Amortisation. Und ob sich Kauf oder Contracting für Sie mehr lohnt."
      chips={["Kauf vs. Contracting", "AC- und DC-Ladepunkte", "Eigenverbrauch einstellbar", "DACH-Regionen"]}
      app={{
        name: "Solarcarport-Rechner",
        description: "Wirtschaftlichkeit von Solarcarports und Parkplatz-Photovoltaik mit Ladeinfrastruktur – Kauf und Contracting im Vergleich.",
        featureList: ["Leistung und Ertrag je Stellplatz", "Investition inkl. Ladepunkte", "Ersparnis und Amortisation", "Contracting-Preis aus Vollkosten", "Kumulierter Vorteil über 25 Jahre"],
      }}
      rechner={<CarportRechner />}
      erklaerung={
        <div className="ov-prose max-w-none">
          <h2>So rechnet der Carport-Rechner</h2>
          <p>
            Die Leistung ergibt sich aus der Zahl der Stellplätze. Der Ertrag folgt aus der Region, abzüglich rund {fmt((1 - CARPORT.ertragFaktor) * 100)} % gegenüber einer optimal
            ausgerichteten Freiflächenanlage, weil Carportdächer flacher geneigt und teils verschattet sind.
          </p>
          <p>
            <strong>Kauf:</strong> Jede selbst genutzte Kilowattstunde spart Ihren vollen Netzstrompreis, der mit {fmt(FREIFLAECHE.inflation * 100)} % pro Jahr steigt. Der Überschuss wird
            eingespeist. Davon gehen Betrieb und Wartung ab ({fmt(CARPORT.opexProKwp)} €/kWp im Jahr).
          </p>
          <p>
            <strong>Contracting:</strong> Wir finanzieren, bauen und betreiben den Carport. Sie zahlen nur für den Solarstrom, den Sie nutzen – zu einem festen Preis über{" "}
            {CARPORT.contractingJahre} Jahre. Danach geht die Anlage in der Regel an Sie über. Die Ladepunkte rechnen wir in beiden Varianten als Ihre Investition; auf Wunsch lassen sie sich
            mitfinanzieren.
          </p>
          <h3>Pflichten nicht vergessen</h3>
          <p>
            In mehreren Bundesländern gilt für neue größere Parkplätze eine Solarpflicht, und das Gebäude-Elektromobilitätsinfrastruktur-Gesetz (GEIG) verlangt Leitungsinfrastruktur und
            Ladepunkte. Einen Überblick nach Bundesland finden Sie auf der Seite Solarcarports.
          </p>
        </div>
      }
      annahmen={[
        ["Leistung je Stellplatz", `${fmt(CARPORT.kwpProStellplatz, 1)} kWp`],
        ["Baukosten Carport", `${fmt(CARPORT.capexProKwp.min)}–${fmt(CARPORT.capexProKwp.max)} €/kWp`],
        ["Ertrag ggü. Freifläche", `${fmt(CARPORT.ertragFaktor * 100)} %`],
        ["AC-Ladepunkt", fmtEur(CARPORT.ladepunktAc)],
        ["DC-Schnelllader", fmtEur(CARPORT.ladepunktDc)],
        ["Betrieb", `${fmt(CARPORT.opexProKwp)} €/kWp·a`],
        ["Strompreis Mittelstand", `${fmt(STROMPREIS_STANDARD, 1)} ct/kWh netto`],
        ["Einspeisung Überschuss", `${fmt(ERLOESE.merchantCt, 1)} ct/kWh`],
        ["Betrachtung", `${CARPORT.laufzeit} Jahre`],
        ["Stand", STAND],
      ]}
      quellen={[
        { name: "BDEW-Strompreisanalyse", url: "https://www.bdew.de/service/daten-und-grafiken/bdew-strompreisanalyse/" },
        { name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
        { name: "GEIG", url: "https://www.gesetze-im-internet.de/geig/" },
      ]}
      faq={FAQ}
      faqTitel="Solarcarport – gut zu wissen"
      querverweise={[
        { href: seitenPfad("/solarcarport"), titel: "Solarcarports", text: "Bauarten, Solarpflicht nach Bundesland, GEIG und Contracting im Überblick." },
        { href: seitenPfad("/rechner/reststrom"), titel: "Reststrom-Rechner", text: "Den Strom, den Sie trotz PV noch kaufen, günstiger über den Pool beziehen." },
        { href: seitenPfad("/kommunen"), titel: "Für Kommunen", text: "Parkplätze an Rathaus, Schule und Bad: Solarcarports als Beitrag zur Wärme- und Verkehrswende." },
      ]}
      cta={{
        eyebrow: "Solarcarport",
        title: "Aus dem Parkplatz wird ein Kraftwerk.",
        text: "Schicken Sie uns Lageplan und Verbrauch – wir rechnen Kauf und Contracting mit Ihren Daten und prüfen Statik, Netz und Ladeinfrastruktur.",
        primary: { label: "Carport anfragen", href: seitenPfad("/solarcarport#anfrage") },
        secondary: { label: "Mehr zu Solarcarports", href: seitenPfad("/solarcarport") },
      }}
    />
  );
}

export const generateMetadata = landMetadata("/rechner/solarcarport", metadata);
