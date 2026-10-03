import Link from "next/link";
import { ArrowUpRight, BookOpen, Building2, Calculator, Car, ClipboardList, FileSearch, Handshake, Landmark, Leaf, PlugZap, ShieldCheck, ShoppingBag, Sun, Warehouse, Zap } from "lucide-react";

import SeitenHero from "@/components/Energie/Seite/SeitenHero";
import Faktenleiste from "@/components/Energie/Seite/Faktenleiste";
import Kopf from "@/components/Energie/Seite/Kopf";
import Ablaufleiste from "@/components/Energie/Seite/Ablaufleiste";
import AnfrageBuehne from "@/components/Energie/Seite/AnfrageBuehne";
import Weiterlesen from "@/components/Energie/Seite/Weiterlesen";
import HeroBuehne from "@/components/Carport/Seite/HeroBuehne";
import Solarpflicht from "@/components/Carport/Seite/Solarpflicht";
import Bauarten from "@/components/Carport/Seite/Bauarten";
import Laden from "@/components/Carport/Seite/Laden";
import Finanzierung from "@/components/Carport/Seite/Finanzierung";
import AuswahlAnfrage from "@/components/Carport/AuswahlAnfrage";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import Faq from "@/components/ui/Faq";
import Reveal from "@/components/ui/Reveal";
import { abs, SITE } from "@/data/site";
import { CARPORT, STAND } from "@/lib/invest/markt";
import { rechneCarport } from "@/lib/rechner/carport";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";

const PFAD = "/solarcarport";
const TITEL = "Solarcarport & Parkplatz-PV für Unternehmen | ÖkoInvest";
const BESCHREIBUNG =
  "Solarcarports für Unternehmen und Kommunen: Solarpflicht je Bundesland, Bauarten, Ladepunkte nach GEIG, Contracting – wir bauen, Sie nutzen den Strom.";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Solarcarport Unternehmen", "Parkplatz Photovoltaik", "Solarpflicht Parkplatz", "Solarcarport Contracting", "PV Parkplatz Ladeinfrastruktur", "GEIG Ladepunkte"],
  alternates: { canonical: abs(PFAD) },
  openGraph: { type: "website", url: abs(PFAD), siteName: "ÖkoInvest", title: TITEL, description: BESCHREIBUNG, images: [{ url: abs("/img/gewerbedach.jpg"), width: 1280, height: 852, alt: "Gewerbegebäude mit Photovoltaik" }] },
};

/** Solarpflicht für neue Parkplätze – Kurzfassung, ausführlich im Ratgeber (Stand September 2026) */
const PFLICHT = [
  ["Baden-Württemberg", "mehr als 35", "60 % der geeigneten Fläche", "seit 2022"],
  ["Hamburg", "mehr als 35 neue", "40 % der geeigneten Fläche", "seit 2024"],
  ["Hessen", "mehr als 50 (landeseigen: mehr als 35)", "Anlage über der Stellplatzfläche", "Bauanträge ab Ende 2023"],
  ["Niedersachsen", "mehr als 25", "auch bei Erneuerung von mind. 50 % eines Parkplatzes", "seit 2025 (vorher mehr als 50)"],
  ["Nordrhein-Westfalen", "mehr als 35 (Nichtwohngebäude)", "30 % der geeigneten Fläche, alternativ Bäume", "seit 2022"],
  ["Rheinland-Pfalz", "ab 50 (gewerblich, öffentlich)", "60 % der geeigneten Fläche", "seit 2023"],
  ["Saarland", "ab 35 (gewerblich), öffentliche Parkplätze", "60 % der geeigneten Fläche", "seit 2025"],
  ["Schleswig-Holstein", "mehr als 70", "Neubau und grundlegende Sanierung", "Novelle 2025"],
];
/** Schwelle je Land als Zahl für den Balkenvergleich – abgeleitet aus PFLICHT („mehr als 35“ → > 35) */
const SCHWELLEN = [
  { land: "Niedersachsen", wert: 25, label: "> 25" },
  { land: "Baden-Württemberg", wert: 35, label: "> 35" },
  { land: "Hamburg", wert: 35, label: "> 35" },
  { land: "Nordrhein-Westfalen", wert: 35, label: "> 35" },
  { land: "Saarland", wert: 35, label: "ab 35" },
  { land: "Hessen", wert: 50, label: "> 50" },
  { land: "Rheinland-Pfalz", wert: 50, label: "ab 50" },
  { land: "Schleswig-Holstein", wert: 70, label: "> 70" },
];

const ZIELGRUPPEN = [
  { icon: Building2, title: "Unternehmen", tag: "Mitarbeiter & Flotte", text: "Mitarbeiter- und Besucherparkplätze: Strom für Produktion und Büro, Laden für Dienstwagen und E-Flotte – dann, wenn die Sonne scheint." },
  { icon: ShoppingBag, title: "Handel & Freizeit", tag: "Kundenparkplätze", text: "Kundenparkplätze mit Ladeangebot, Schatten im Sommer und Strom für Kühlung und Beleuchtung – sichtbar nachhaltig." },
  { icon: Landmark, title: "Kommunen", tag: "Rathaus, Schule, Bad", text: "Parkplätze an Rathaus, Schule, Bad und Bahnhof: Solarpflicht erfüllen, Ladeinfrastruktur schaffen, Haushalt entlasten.", href: "/kommunen" },
];

const OHNE = "Bayern, Berlin, Bremen, Mecklenburg-Vorpommern, Sachsen, Sachsen-Anhalt, Thüringen; in Brandenburg wurde die Parkplatzpflicht 2026 wieder aufgehoben";

const beispiel = rechneCarport({ stellplaetze: 100, eigenverbrauch: 0.75, ac: 10, dc: 2 });

const FAQ = [
  {
    q: "Ab wie vielen Stellplätzen gilt die Solarpflicht?",
    a: "Das regelt jedes Bundesland selbst: nach aktuellem Stand ab mehr als 25 Stellplätzen in Niedersachsen, ab mehr als 35 in Baden-Württemberg, Hamburg und NRW, ab 35 gewerblich genutzten im Saarland, ab mehr als 50 in Hessen, ab 50 in Rheinland-Pfalz und ab mehr als 70 in Schleswig-Holstein. Sie gilt in der Regel für neue Parkplätze oder große Erweiterungen, nicht für den Bestand. Maßgeblich ist der aktuelle Gesetzestext zum Zeitpunkt des Bauantrags.",
  },
  {
    q: "Was verlangt das GEIG auf Parkplätzen?",
    a: "Das Gebäude-Elektromobilitätsinfrastruktur-Gesetz verlangt bei neuen Nichtwohngebäuden mit mehr als sechs Stellplätzen Leitungsinfrastruktur für mindestens jeden dritten Stellplatz und mindestens einen Ladepunkt; bei größeren Renovierungen mit mehr als zehn Stellplätzen für jeden fünften. Bestehende Nichtwohngebäude mit mehr als 20 Stellplätzen brauchen seit dem 1. Januar 2025 mindestens einen Ladepunkt. Ein Solarcarport ist die naheliegende Stelle dafür.",
  },
  {
    q: "Was kostet ein Solarcarport?",
    a: `Wir rechnen mit ${fmt(CARPORT.capexProKwp.min)}–${fmt(CARPORT.capexProKwp.max)} €/kWp inklusive Stahlbau, Fundamenten und Entwässerung – bei rund ${fmt(CARPORT.kwpProStellplatz, 1)} kWp je Stellplatz also etwa ${fmtEur(CARPORT.kwpProStellplatz * CARPORT.capexProKwp.min)} bis ${fmtEur(CARPORT.kwpProStellplatz * CARPORT.capexProKwp.max)} je Stellplatz. Dazu kommen Ladepunkte: AC rund ${fmtEur(CARPORT.ladepunktAc)}, DC-Schnelllader rund ${fmtEur(CARPORT.ladepunktDc)} je Stück, ohne Netzausbau.`,
  },
  {
    q: "Wie funktioniert das Contracting?",
    a: `Wir planen, finanzieren, bauen und betreiben den Solarcarport. Sie stellen die Fläche und kaufen den Solarstrom, den Sie vor Ort nutzen, zu einem festen Preis – typischerweise über ${CARPORT.contractingJahre} Jahre. Sie binden kein Kapital, Wartung und Versicherung liegen bei uns. Nach Vertragsende kann die Anlage an Sie übergehen. Voraussetzung sind ein ausreichender Eigenverbrauch und eine gesicherte Nutzung der Fläche.`,
  },
  {
    q: "Stahl oder Holz?",
    a: "Stahl ist schlank, wirtschaftlich bei großen Spannweiten und in vielen Systemen vorgefertigt. Holz – meist Brettschichtholz – bindet CO₂, wirkt wärmer und passt zu Kommunen und Handel mit Nachhaltigkeitsanspruch; es braucht konstruktiven Holzschutz und ist oft etwas teurer. Wir planen beides.",
  },
  {
    q: "Gibt es Regeln in Österreich und der Schweiz?",
    a: "In Österreich regeln die Bundesländer Solarpflichten in ihren Bau- und Energiegesetzen unterschiedlich; eine flächendeckende Parkplatzpflicht wie in einigen deutschen Ländern ist uns nach aktuellem Stand nicht bekannt. In der Schweiz verlangen viele Kantone bei Neubauten Eigenstromerzeugung. Zusätzlich sieht die EU-Gebäuderichtlinie von 2024 schrittweise Solarpflichten vor, auch für überdachte Parkplätze an Gebäuden. Wir prüfen die Lage im Einzelfall.",
  },
];

export default function SolarcarportSeite() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Solarcarports und Parkplatz-Photovoltaik",
    serviceType: "Planung, Bau, Finanzierung und Betrieb von Solarcarports mit Ladeinfrastruktur",
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "BusinessAudience", audienceType: "Unternehmen, Handel, Kommunen" },
    url: abs(PFAD),
    description: BESCHREIBUNG,
  };

  return (
    <div>
      <JsonLd daten={schema} />

      <SeitenHero
        breadcrumbs={[{ name: "Solarcarports & Parkplätze" }]}
        pill={{ marke: "Solarpflicht", text: "In acht Bundesländern gilt sie für neue Parkplätze", kurz: "Solarpflicht in acht Ländern", href: "#solarpflicht" }}
        titel={
          <>
            Solarcarports: Parkplätze, die <span className="ov-text-gradient-light">Strom erzeugen.</span>
          </>
        }
        lead={
          <>
            <span className="font-medium text-white">Für Unternehmen, Handel und Kommunen:</span> Solarcarports mit Ladepunkten, geplant nach Solarpflicht und GEIG. Selbst investieren oder im
            Contracting – wir bauen und betreiben, Sie nutzen den Strom.
          </>
        }
        primaer={{ label: "Carport anfragen", href: "#anfrage" }}
        sekundaer={{ label: "Carport-Rechner", href: "/rechner/solarcarport", icon: Calculator }}
        hinweis="Unverbindlich · erste Einschätzung zu Größe, Ladepunkten und Modell"
        chips={["Solarpflicht sicher erfüllen", "Ladeinfrastruktur AC & DC", "Kauf oder Contracting", "Stahl oder Holz"]}
        buehne={<HeroBuehne kwp={fmt(beispiel.kwp)} mwh={fmt(beispiel.ertrag / 1000)} />}
        bildunterschrift="Schematische Darstellung · Lastmanagement mit fiktiven Werten"
      />

      <Faktenleiste
        titel="Solarcarport in Zahlen"
        items={[
          { icon: Car, wert: `≈ ${fmt(CARPORT.kwpProStellplatz, 1)}`, zahl: { wert: CARPORT.kwpProStellplatz, nachkomma: 1, vor: "≈ " }, einheit: "kWp je Stellplatz", text: "Leistung eines überdachten Stellplatzes" },
          { icon: Sun, wert: `≈ ${fmt(beispiel.kwp)}`, zahl: { wert: Math.round(beispiel.kwp), vor: "≈ " }, einheit: "kWp bei 100 Stellplätzen", text: "Leistung eines Parkplatzes mit 100 Stellplätzen" },
          { icon: Zap, wert: `≈ ${fmt(beispiel.ertrag / 1000)}`, zahl: { wert: Math.round(beispiel.ertrag / 1000), vor: "≈ " }, einheit: "MWh pro Jahr", text: "Ertrag bei 100 Stellplätzen in Süddeutschland" },
          { icon: Leaf, wert: `≈ ${fmt(beispiel.co2Tonnen)}`, zahl: { wert: Math.round(beispiel.co2Tonnen), vor: "≈ " }, einheit: "t CO₂ pro Jahr", text: "vermieden bei 100 Stellplätzen" },
        ]}
        fussnote={`Beispielwerte aus dem Carport-Rechner, Stand ${STAND}.`}
      />

      {/* ---------------- Zielgruppen ---------------- */}
      <Section tone="white" space="lg" data-abschnitt="zielgruppen" aria-labelledby="zielgruppen-titel">
        <Kopf id="zielgruppen-titel" eyebrow="Für wen" titel="Überall, wo Autos tagsüber stehen." className="mb-12 md:mb-14" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ZIELGRUPPEN.map((z, i) => (
            <Reveal as="li" key={z.title} delay={i * 70} className="ov-card-hover group relative flex flex-col rounded-[2rem] bg-sand-50 p-6 ring-1 ring-ink-200/70 focus-within:ring-2 focus-within:ring-ov-500 sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e2 ring-1 ring-ink-200/70 transition-colors duration-300 group-hover:bg-ov-600 group-hover:text-white">
                  <z.icon className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink-600 ring-1 ring-ink-200/70">{z.tag}</span>
              </div>
              <h3 className="mt-6 font-display text-[21px] font-bold text-ink-900">
                {z.href ? (
                  <Link href={z.href} className="inline-flex items-center gap-1.5 outline-none after:absolute after:inset-0 after:rounded-[2rem] after:content-['']">
                    {z.title}
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-ov-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  z.title
                )}
              </h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-ink-600">{z.text}</p>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Solarpflicht pflicht={PFLICHT} schwellen={SCHWELLEN} ohne={OHNE} stand={STAND} />

      <Bauarten />

      <Laden ac={fmtEur(CARPORT.ladepunktAc)} dc={fmtEur(CARPORT.ladepunktDc)} />

      <Finanzierung
        amortisation={fmt(beispiel.kauf.amortisation, 0)}
        invest={fmtEur(Math.round(beispiel.invest.summe / 1000) * 1000)}
        preisCt={fmt(beispiel.contracting.preisCt, 1)}
        jahre={CARPORT.contractingJahre}
      />

      {/* ---------------- Ablauf ---------------- */}
      <Section tone="sand" space="lg" data-abschnitt="ablauf" aria-labelledby="ablauf-titel">
        <Kopf id="ablauf-titel" eyebrow="Ablauf" titel="Vom Lageplan zum Solarcarport." className="mb-12 md:mb-16" />
        <Ablaufleiste
          items={[
            { icon: Car, title: "Lageplan & Verbrauch", text: "Stellplätze, Fahrgassen, Leitungen, Lastgang und Ladebedarf – daraus ergeben sich Größe und Layout." },
            { icon: Calculator, title: "Konzept & Angebot", text: "Bauart, Statik, Ladepunkte und Netzanschluss; Kauf und Contracting als Varianten." },
            { icon: Warehouse, title: "Genehmigung & Netz", text: "Baugenehmigung, wo nötig, Anmeldung beim Netzbetreiber, Abstimmung mit Brandschutz und Versicherung." },
            { icon: Zap, title: "Bau & Betrieb", text: "Montage abschnittsweise, damit der Parkplatz nutzbar bleibt; danach Monitoring und Wartung." },
          ]}
        />
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section tone="white" space="lg" data-abschnitt="faq" aria-labelledby="faq-titel">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Kopf id="faq-titel" eyebrow="Häufige Fragen" titel="Solarcarports&nbsp;– gut zu wissen" lead="Solarpflicht, GEIG, Kosten und Contracting nach aktuellem Stand." />
            <Reveal className="mt-8">
              <Button href="#anfrage" variant="secondary" pfeil>
                Frage direkt stellen
              </Button>
            </Reveal>
          </div>
          <Faq items={FAQ} />
        </div>
      </Section>

      {/* ---------------- Anfrage ---------------- */}
      <AnfrageBuehne
        titel={
          <>
            Ihr Parkplatz, <span className="ov-text-gradient-light">unser Konzept.</span>
          </>
        }
        lead="Ein paar Angaben genügen für eine erste Einschätzung. Lageplan und Lastgang können Sie später im Portal hochladen."
        zusagen={[
          { icon: ShieldCheck, text: "Unverbindlich anfragen" },
          { icon: Handshake, text: "Kauf oder Contracting" },
          { icon: PlugZap, text: "Ladepunkte gleich mitplanen" },
        ]}
        ablauf={[
          { icon: ClipboardList, titel: "Sie schildern kurz Ihren Parkplatz", text: "Stellplätze, Ladebedarf und Modell – Schätzungen genügen." },
          { icon: FileSearch, titel: "Sie erhalten eine Vorgangsnummer", text: "Direkt nach dem Absenden. Lageplan und Lastgang laden Sie später im Portal hoch." },
          { icon: Handshake, titel: "Wir melden uns mit einer ersten Einschätzung", text: "Zu Größe, Bauart, Ladepunkten und Netzanschluss – Kauf und Contracting als Varianten." },
        ]}
        formText="Pflicht sind nur Name, E-Mail und Ihre Einwilligung."
      >
        <AuswahlAnfrage
          typ="carport"
          felder={["firma", "telefon", "plz", "ort", "nachricht"]}
          button="Carport anfragen"
          gruppen={[
            { id: "stellplaetze", legende: "Stellplätze", optionen: [{ id: "bis50", label: "bis 50" }, { id: "50-150", label: "50–150" }, { id: "150-500", label: "150–500" }, { id: "ueber500", label: "über 500" }], start: "50-150" },
            { id: "art", legende: "Sie sind", optionen: [{ id: "unternehmen", label: "Unternehmen" }, { id: "handel", label: "Handel" }, { id: "kommune", label: "Kommune" }, { id: "sonstige", label: "Sonstige" }] },
            { id: "modell", legende: "Interesse an", optionen: [{ id: "offen", label: "Noch offen" }, { id: "kauf", label: "Kauf" }, { id: "contracting", label: "Contracting" }] },
            { id: "laden", legende: "Ladepunkte", mehrfach: true, optionen: [{ id: "ac", label: "AC" }, { id: "dc", label: "DC-Schnellladen" }], start: ["ac"] },
          ]}
        />
      </AnfrageBuehne>

      <Weiterlesen
        text="Rechnen, vergleichen, vertiefen – in Ruhe nachlesen."
        items={[
          { href: "/rechner/solarcarport", icon: Calculator, titel: "Carport-Rechner", text: "Leistung, Ertrag, Investition und Amortisation – Kauf vs. Contracting." },
          { href: "/reststrom", icon: Building2, titel: "Reststrom-Pool", text: "Den Strom, den Sie trotz Carport noch kaufen, gebündelt günstiger beziehen." },
          { href: "/ratgeber/parkplatz-solarpflicht-bundeslaender", icon: BookOpen, titel: "Ratgeber Solarpflicht", text: "Alle Bundesländer mit Rechtsgrundlage, Stichtag und Ausnahmen." },
          { href: "/grossspeicher", icon: Zap, titel: "Speicher", text: "Mehr Eigenverbrauch und Lastspitzen kappen – vom Gewerbe- bis zum Großspeicher." },
        ]}
      />
    </div>
  );
}
