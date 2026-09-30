// src/app/rechner/dachpacht/page.js – Dachpacht-Rechner

import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import DachpachtRechner from "@/components/Dach/DachpachtRechner";
import SectionHeading from "@/components/ui/SectionHeading";
import { DACH, FREIFLAECHE } from "@/lib/invest/markt";
import { NETZSTROM_CT } from "@/lib/rechner/dachpacht";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/rechner/dachpacht";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Dachpacht-Rechner Photovoltaik | ÖkoInvest",
  description:
    "Dachfläche für PV verpachten: Leistung, Ertrag und Pachtspanne Ihres Gewerbedachs – dazu Dachpacht, Dachstrom-PPA und Eigeninvestition im Vergleich. Kostenlos.",
  keywords: ["Dachpacht Rechner", "Dachfläche verpachten Photovoltaik", "Dachpacht pro m²", "Gewerbedach PV Pacht", "Dach vermieten Solar"],
});

const FAQ = [
  {
    q: "Wie viel Pacht bringt ein Gewerbedach?",
    a: `Als Orientierung rechnen wir mit ${fmt(DACH.pachtProM2.min, 2)}–${fmt(DACH.pachtProM2.max, 2)} € je m² und Jahr bzw. ${fmt(DACH.pachtProKwp.min)}–${fmt(DACH.pachtProKwp.max)} € je installiertem kWp. Höhere Werte, wie sie manche Anbieter nennen, sind bei heutigen Zuschlagswerten nur für sehr große, gut ausgerichtete Dächer mit Netzanschluss am Gebäude realistisch. Entscheidend ist, dass die Pacht zum Stromerlös passt – sonst wird das Projekt nicht gebaut.`,
  },
  {
    q: "Warum zeigt der Rechner Faserzement als „nicht belegbar“?",
    a: "Faserzement-Wellplatten aus der Zeit vor 1993 enthalten häufig Asbest. Diese Dächer dürfen nach der Gefahrstoffverordnung nicht überbaut oder angebohrt werden. Auch asbestfreie Wellplatten tragen Module selten dauerhaft sicher. Möglich ist eine Sanierung vorab – teils als Gegenleistung des Betreibers.",
  },
  {
    q: "Einmalzahlung oder jährliche Pacht?",
    a: `Die Einmalzahlung ist der auf heute abgezinste Wert aller künftigen Pachten – bei ${DACH.laufzeit} Jahren etwa das 12- bis 13-Fache einer Jahrespacht, nicht die Summe. Sie ist attraktiv, wenn Sie Kapital für eine Dachsanierung oder Investition brauchen. Die jährliche Pacht bringt in Summe mehr und lässt sich an einen Index koppeln.`,
  },
  {
    q: "Was bedeutet „Pacht + Dachstrom (PPA)“?",
    a: `Der Betreiber baut und betreibt die Anlage und liefert Ihnen (oder Ihrem Mieter) den Strom direkt vom Dach – meist deutlich günstiger als Netzstrom, weil Netzentgelte und Teile der Abgaben entfallen. Dafür fällt die Pacht oft niedriger aus; wir rechnen mit ${fmt(DACH.ppaPachtAnteil * 100)} % der Pacht. Lohnend ist das, wenn tagsüber viel Strom im Gebäude verbraucht wird.`,
  },
  {
    q: "Lohnt sich die Eigeninvestition mehr?",
    a: "Rechnerisch oft ja – wenn Sie einen hohen Eigenverbrauch haben, Kapital binden wollen und Betrieb, Versicherung, Wartung und Wechselrichtertausch selbst organisieren. Die Pacht ist dagegen ohne Kapital und ohne Betriebsrisiko. Steuerlich kann der Eigenbetrieb Folgen haben (etwa eine gewerbliche Infizierung von Vermietungseinkünften) – vor der Entscheidung zur Steuerberatung.",
  },
];

export default function Page() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="dachpacht"
      breadcrumb="Dachpacht-Rechner"
      eyebrow="Dachpacht-Rechner"
      title={<>Was ist Ihr Dach <span className="ov-text-gradient-light">als Kraftwerk wert?</span></>}
      lead="Dachfläche, Dachart, Ausrichtung und Region – Sie sehen Leistung, Ertrag und Pachtspanne und vergleichen Dachpacht, Dachstrom-PPA und Eigeninvestition über die Laufzeit."
      chips={["Kostenlos & ohne Anmeldung", "Pacht, PPA und Eigeninvestition", "Gewerbe-, Hallen- und Agrardächer"]}
      app={{
        name: "ÖkoInvest Dachpacht-Rechner",
        description: "Berechnet Leistung, Ertrag und Pachtspanne großer Dachflächen für Photovoltaik und vergleicht Dachpacht, Stromlieferung vom Dach (PPA) und Eigeninvestition.",
        featureList: ["Dachart und Ausrichtung", "Pachtspanne je m² und kWp", "Einmalzahlung als Barwert", "Vergleich Pacht, PPA und Eigeninvestition", "Kumulierte Werte über 15–30 Jahre"],
      }}
      rechner={<DachpachtRechner />}
      erklaerung={
        <>
          <SectionHeading
            eyebrow="So rechnen wir"
            title="Die Pacht muss zum Strom passen – sonst wird nicht gebaut."
            lead="Wir leiten die Pacht nicht aus Werbewerten ab, sondern prüfen sie gegen den Stromerlös, den die Anlage auf Ihrem Dach erzielen kann."
          />
          <div className="ov-prose mt-8 max-w-2xl">
            <p>
              Die <strong>Leistung</strong> ergibt sich aus der Dachfläche: Auf geneigten Trapez- und Sandwichdächern rechnen wir mit rund {fmt(DACH.dacharten[0].m2ProKwp)} m² je kWp, auf Flachdächern mit Ost/West-Aufständerung mit rund {fmt(DACH.dacharten[2].m2ProKwp)} m² – inklusive Randabständen und Brandschutzstreifen. Den <strong>Ertrag</strong> leiten wir aus der Einstrahlung Ihrer Region ab, abzüglich Dachneigung und Ausrichtung, mit {fmt(FREIFLAECHE.degradation * 100, 1)} % Degradation pro Jahr.
            </p>
            <p>
              Für den <strong>Vergleich</strong> setzen wir Ihren Netzstrompreis (Richtwert {fmt(NETZSTROM_CT, 1)} ct/kWh für den Mittelstand) gegen den PPA-Preis vom Dach und gegen eine eigene Anlage, deren Überschuss mit {fmt(DACH.ueberschussCt, 1)} ct/kWh vergütet wird. Barwerte rechnen wir mit dem Kalkulationszins, damit Einmalbeträge und Jahreszahlungen vergleichbar werden.
            </p>
            <p>
              Was im Dachnutzungsvertrag stehen sollte und welche Voraussetzungen Ihr Dach erfüllen muss, lesen Sie unter <Link href="/dachflaeche-verpachten">Dachfläche verpachten</Link>.
            </p>
          </div>
        </>
      }
      annahmen={[
        ["Dachpacht (Orientierung)", `${fmt(DACH.pachtProM2.min, 2)}–${fmt(DACH.pachtProM2.max, 2)} €/m²·a`],
        ["entspricht", `${fmt(DACH.pachtProKwp.min)}–${fmt(DACH.pachtProKwp.max)} €/kWp·a`],
        ["Umsatzbeteiligung üblich", `${fmt(DACH.umsatzbeteiligung.min * 100)}–${fmt(DACH.umsatzbeteiligung.max * 100)} %`],
        ["Zuschläge Dach 2025", DACH.zuschlagsHistorie.map((z) => fmt(z.ct, 2)).join(" · ") + " ct"],
        ["Überschuss bei Eigenverbrauch", `${fmt(DACH.ueberschussCt, 1)} ct/kWh`],
        ["Investition Gewerbedach", `${fmt(DACH.capexProKwp.min)}–${fmt(DACH.capexProKwp.max)} €/kWp`],
        ["Betriebskosten", `${fmt(DACH.opexProKwp)} €/kWp·a`],
        ["Einmalzahlung abgezinst mit", `${fmt(DACH.einmalDiskont * 100, 1)} %`],
        ["Pacht bei zusätzlichem PPA", `${fmt(DACH.ppaPachtAnteil * 100)} % der Pacht`],
      ]}
      quellen={DACH.quellen.slice(0, 2).map((q) => ({ name: q.titel, url: q.url })).concat([{ name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" }])}
      faq={FAQ}
      querverweise={[
        { href: "/dachflaeche-verpachten", titel: "Dachfläche verpachten", text: "Modelle, Voraussetzungen, Vertrag, Steuern und Ablauf – für Gewerbe-, Hallen- und Agrardächer." },
        { href: "/rechner/pacht", titel: "Pachtrechner Freifläche", text: "Acker oder Grünland statt Dach? Solarpacht je Hektar über 30 Jahre." },
        { href: "/reststrom", titel: "Reststrom-Pool", text: "Den Strom, den Sie trotz Dachanlage noch kaufen, gebündelt günstiger beziehen." },
      ]}
      cta={{
        eyebrow: "Für Dacheigentümer kostenfrei",
        title: "Aus der Rechnung ein echtes Angebot machen?",
        text: "Wir prüfen Statik, Dachzustand, Brandschutz und Netzanschluss und legen Ihnen ein Angebot mit Vertragsentwurf vor – ohne Kosten und ohne Verpflichtung.",
        primary: { label: "Dach prüfen lassen", href: "/dachflaeche-verpachten#anfrage" },
        secondary: { label: "Dachfläche verpachten", href: "/dachflaeche-verpachten" },
      }}
    />
  );
}
