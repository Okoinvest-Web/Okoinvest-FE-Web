// src/app/freiflaeche/page.js – Freiflächen-PV & Solarparks

import {
  Bird, CalendarRange, Factory, FileCheck2, Fence, Flower2, Gauge, Landmark, MapPinned, Recycle,
  ShieldAlert, Sprout, TrainFront, Trees, Waves,
} from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import SplitMedia from "@/components/ui/SplitMedia";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import JsonLd from "@/components/JsonLd";
import SolarparkSchnitt from "@/components/Flaeche/SolarparkSchnitt";
import Zeitleiste from "@/components/Flaeche/Zeitleiste";
import { Faktenleiste } from "@/components/Flaeche/Seite/teile";
import Hero from "@/components/Flaeche/Freiflaeche/Hero";
import { Kriterien, Wertschoepfung } from "@/components/Flaeche/Freiflaeche/Abschnitte";
import { abs } from "@/data/site";
import { AGRI, FREIFLAECHE, KOMMUNE, PACHT, REGIONEN, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = pfad("/freiflaeche");
const TITEL = "Freiflächen-PV & Solarparks entwickeln | ÖkoInvest";
const BESCHREIBUNG =
  "Solarparks ab rund 3 Hektar in DE, AT und CH: Flächenkriterien, EEG-Flächenkulisse, Genehmigung, Ökologie, Rückbau und Zeitplan. Jetzt Fläche prüfen.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/solarpark-himmel.jpg"), width: 1280, height: 852, alt: "Solarpark unter blauem Himmel" }],
  },
};

const mwpBei = (ha) => ha / FREIFLAECHE.haProMwp;
const sued = REGIONEN.find((r) => r.id === "de-sued");

const FAKTEN = [
  { icon: MapPinned, wert: `ab ${FREIFLAECHE.mindestHa} ha`, einheit: "Flächengröße", text: "darunter tragen sich Planung, Gutachten und Netzanschluss selten" },
  { icon: Gauge, wert: `${fmt(FREIFLAECHE.haProMwp, 1)} ha`, einheit: "je MWp Leistung", text: "mit heutigen Modulen, feste Aufständerung nach Süden" },
  { icon: Landmark, wert: `${FREIFLAECHE.laufzeit} J.`, einheit: "Betrieb & Pacht", text: "danach Rückbau – abgesichert über eine Bürgschaft" },
  { icon: CalendarRange, wert: "2–4 J.", einheit: "bis zum Betrieb", text: "Netz, Gemeinde und Artenschutz geben den Takt vor" },
];

const FAQ = [
  {
    q: "Ab welcher Flächengröße lohnt sich ein Solarpark?",
    a: `Wir entwickeln Solarparks in der Regel ab rund ${FREIFLAECHE.mindestHa} Hektar – das entspricht etwa ${fmt(mwpBei(FREIFLAECHE.mindestHa), 1)} MWp. Darunter tragen sich Planung, Gutachten und Netzanschluss selten. Kleinere Flächen können mit Nachbarflächen zusammengelegt oder als Agri-PV am Hof genutzt werden.`,
  },
  {
    q: "Wie viel Strom erzeugt ein Hektar Solarpark?",
    a: `Mit heutigen Modulen passt rund 1 MWp auf ${fmt(FREIFLAECHE.haProMwp, 1)} Hektar. In Süddeutschland erzeugt das etwa ${fmt(sued.ertrag)} MWh pro Jahr – je Hektar also rund ${fmt(sued.ertrag / FREIFLAECHE.haProMwp / 1000, 1)} GWh, genug für den Jahresbedarf von etwa ${fmt(Math.round(sued.ertrag / FREIFLAECHE.haProMwp / 3.5 / 10) * 10)} Haushalten.`,
  },
  {
    q: "Brauche ich für einen Solarpark immer einen Bebauungsplan?",
    a: "In Deutschland in aller Regel ja: Die Gemeinde stellt einen vorhabenbezogenen Bebauungsplan auf und ändert meist den Flächennutzungsplan. Ausnahme sind seit 2023 Flächen bis 200 m entlang von Autobahnen und zweigleisigen Schienenwegen sowie kleinere, hofnahe Agri-PV-Anlagen – sie sind im Außenbereich privilegiert (§ 35 BauGB) und brauchen nur eine Baugenehmigung.",
  },
  {
    q: "Was ist die EEG-Flächenkulisse?",
    a: "Das EEG legt fest, auf welchen Flächen ein Solarpark eine Marktprämie aus den Ausschreibungen der Bundesnetzagentur bekommen kann – etwa Randstreifen bis 500 m an Autobahnen und Schienenwegen, Konversionsflächen, versiegelte Flächen, Acker- und Grünland in benachteiligten Gebieten sowie besondere Solaranlagen wie Agri-PV. Außerhalb der Kulisse kann ein Park über einen Stromliefervertrag (PPA) finanziert werden.",
  },
  {
    q: "Wie lange dauert es von der Unterschrift bis zum Betrieb?",
    a: "Realistisch 2 bis 4 Jahre. Die längsten Posten sind Netzanschluss, Bauleitplanung mit Artenschutzkartierung über eine Vegetationsperiode und gegebenenfalls die Ausschreibung. Wir sagen das offen – und zahlen in dieser Zeit meist eine Reservierungsprämie, während Sie die Fläche weiter bewirtschaften.",
  },
  {
    q: "Wer baut den Solarpark nach 30 Jahren zurück?",
    a: "Der Betreiber. Der Rückbau samt Entsorgung und Wiederherstellung der landwirtschaftlichen Nutzbarkeit ist im Pachtvertrag geregelt und über eine Rückbaubürgschaft einer Bank oder Versicherung abgesichert. Rammpfosten ohne Beton lassen sich vollständig ziehen; unter extensivem Grünland kann sich der Boden in dieser Zeit erholen – wie stark, hängt von Standort und Pflege ab.",
  },
  {
    q: "Verdient auch die Gemeinde am Solarpark?",
    a: `Ja. Betreiber dürfen der Gemeinde nach § 6 EEG bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je erzeugter Kilowattstunde zahlen, und ${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % der Gewerbesteuer aus Solarparks stehen der Standortgemeinde zu. Das erhöht die Akzeptanz im Gemeinderat erheblich.`,
  },
  {
    q: "Wie ist das in Österreich und der Schweiz?",
    a: "In Österreich braucht ein Solarpark in der Regel eine Widmung als Grünland-Photovoltaik und muss in die Zonierung bzw. die Kriterien des jeweiligen Bundeslandes passen; die Förderung erfolgt über das EAG. In der Schweiz sind Freiflächenanlagen außerhalb der Bauzone nur eingeschränkt möglich – vor allem als standortgebundene Anlagen, etwa Agri-PV mit Vorteil für die Landwirtschaft oder alpine Anlagen.",
  },
];

export default async function FreiflaechePage({ params }) {
  await landDerSeite(params, "/freiflaeche");
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Projektentwicklung Freiflächen-Photovoltaik",
          serviceType: "Entwicklung, Bau und Betrieb von Solarparks",
          provider: { "@id": `${abs("/")}/#organization` },
          areaServed: ["DE", "AT", "CH"],
          url: abs(PFAD),
          description: BESCHREIBUNG,
        }}
      />

      <Hero />
      <Faktenleiste titel="Eckdaten eines Solarparks" fakten={FAKTEN} />
      <Wertschoepfung />

      {/* Schnitt */}
      <Section tone="sand" space="lg">
        <SectionHeading
          eyebrow="So sieht ein Solarpark aus"
          title="Ein Kraftwerk, das kaum Boden versiegelt."
          lead="Pfosten, Wege und Station berühren nur einen kleinen Bruchteil der Fläche – meist deutlich unter 5 %. Der Rest bleibt unversiegelt und wird als Grünland gepflegt."
          className="mb-10"
        />
        <Reveal>
          <SolarparkSchnitt />
        </Reveal>
      </Section>

      <Kriterien />

      {/* EEG-Flächenkulisse */}
      <Section tone="navy" space="lg" className="ov-noise overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div className="relative grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <SectionHeading
              dark
              eyebrow="Deutschland · EEG 2023"
              title="Die Flächenkulisse entscheidet über die Förderung."
              lead="Solarparks ab 1 MW erhalten eine Marktprämie nur über die Ausschreibungen der Bundesnetzagentur – und nur auf bestimmten Flächen. Außerhalb dieser Kulisse finanzieren sich Parks über langfristige Stromlieferverträge (PPA)."
            />
            <div className="mt-8 rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
              <p className="font-display text-[17px] font-bold text-white">Baurecht ohne Bebauungsplan</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">
                Seit 2023 sind Solarparks auf einem <strong className="text-white">200-m-Streifen</strong> entlang von Autobahnen und zweigleisigen Schienenwegen im Außenbereich privilegiert (§ 35 Abs. 1 Nr. 8 b BauGB) – ebenso hofnahe Agri-PV bis {fmt(AGRI.privilegierungHa, 1)} ha Grundfläche. Das spart oft ein bis zwei Jahre.
              </p>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: TrainFront, t: "Randstreifen 500 m", x: "Flächen längs von Autobahnen und Schienenwegen bis 500 m Entfernung, gemessen vom äußeren Fahrbahnrand." },
              { icon: Factory, t: "Konversion & versiegelt", x: "Ehemals wirtschaftlich, verkehrlich, wohnungsbaulich oder militärisch genutzte Flächen; bereits versiegelte Flächen." },
              { icon: Sprout, t: "Benachteiligte Gebiete", x: "Seit dem Solarpaket I (Mai 2024) grundsätzlich förderfähig. Länder können sie per Verordnung ausschließen, sobald mehr als 1 % ihrer Agrarfläche mit Solarparks belegt ist." },
              { icon: Flower2, t: "Besondere Solaranlagen", x: "Agri-PV, Moor-PV, Parkplatz- und schwimmende Anlagen – teils mit Bonus; ein eigenes Untersegment ist vorgesehen, wartete zuletzt aber noch auf die beihilferechtliche Freigabe." },
              { icon: Landmark, t: "Gewerbe- & Industriegebiete", x: "Flächen in Bebauungsplänen für Gewerbe oder Industrie, die für Solar genutzt werden dürfen." },
              { icon: Bird, t: "Naturschutz-Mindestkriterien", x: "Geförderte Freiflächenanlagen müssen seit dem Solarpaket I mindestens drei von fünf naturschutzfachlichen Kriterien erfüllen." },
            ].map((k, i) => (
              <Reveal as="li" key={k.t} delay={i * 60} className="rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10 md:p-6">
                <k.icon aria-hidden="true" className="h-6 w-6 text-ov-300" />
                <p className="mt-4 font-display text-[16.5px] font-bold text-white">{k.t}</p>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/65">{k.x}</p>
              </Reveal>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 max-w-4xl text-[13.5px] leading-relaxed text-white/50">
          Welche Gebiete als „benachteiligt“ gelten, legt die EU-Gebietskulisse fest; ob Ihr Bundesland die Öffnung eingeschränkt hat, prüfen wir flurstückgenau. Stand {STAND}, ohne Gewähr – maßgeblich ist der jeweils aktuelle Gesetzestext.
        </p>
      </Section>

      {/* Genehmigung DACH */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Genehmigung in DACH"
          title="Deutschland, Österreich, Schweiz: drei Verfahren."
          lead="Die Technik ist überall gleich – das Planungsrecht nicht. Die Übersicht zeigt die Grundzüge; welcher Weg für Ihre Fläche realistisch ist, klären wir im Einzelfall."
          className="mb-12"
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              land: "Deutschland",
              kurz: "DE",
              punkte: [
                "Aufstellungsbeschluss des Gemeinderats für einen (vorhabenbezogenen) Bebauungsplan",
                "Frühzeitige Beteiligung von Öffentlichkeit und Behörden, Umweltbericht, Artenschutz",
                "Satzungsbeschluss, meist parallele Änderung des Flächennutzungsplans",
                "Baugenehmigung; privilegierte Flächen (200-m-Streifen, hofnahe Agri-PV) ohne B-Plan",
                "Städtebaulicher Vertrag, Zahlung an die Gemeinde nach § 6 EEG",
              ],
            },
            {
              land: "Österreich",
              kurz: "AT",
              punkte: [
                "Umwidmung in „Grünland-Photovoltaik“ (Bezeichnung je Bundesland verschieden) durch den Gemeinderat",
                "Landesrechtliche Vorgaben: Zonierungen, Eignungs- und Ausschlusszonen, Mindest- oder Höchstgrößen",
                "Elektrizitätsrechtliche und ggf. naturschutzrechtliche Bewilligung",
                "Bei sehr großen Anlagen oder sensiblen Standorten: Prüfung der UVP-Pflicht",
                "Förderung über das EAG (Investitionszuschuss bzw. Marktprämie), sonst PPA",
              ],
            },
            {
              land: "Schweiz",
              kurz: "CH",
              punkte: [
                "Außerhalb der Bauzone nur, wenn die Anlage standortgebunden ist (Raumplanungsrecht)",
                "Agri-PV: nur bei Vorteilen für die landwirtschaftliche Produktion oder zu Versuchszwecken",
                // Quelle: BFE, Photovoltaik-Grossanlagen (Art. 71a EnG) – Teil-Einspeisung bis 31.12.2025 war Voraussetzung; vor Veröffentlichung juristisch bestätigen
                "Alpine Großanlagen: Der befristete „Solarexpress“ verlangte eine Teil-Einspeisung bis Ende 2025 und steht neuen Projekten nicht mehr offen",
                "Baubewilligung der Gemeinde mit Prüfung durch kantonale Fachstellen",
                "Förderung u. a. über die Einmalvergütung; Vermarktung zunehmend über PPA",
              ],
            },
          ].map((l, i) => (
            <Reveal key={l.land} delay={i * 80} className="flex flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-950 font-display text-[14px] font-extrabold text-white">{l.kurz}</span>
                <h3 className="ov-h3 text-ink-900">{l.land}</h3>
              </div>
              <ol className="mt-6 space-y-3">
                {l.punkte.map((p, j) => (
                  <li key={p} className="flex gap-3 text-[15px] leading-snug text-ink-700">
                    <span className="ov-num mt-0.5 w-5 shrink-0 text-[13px] font-bold text-ov-700">{j + 1}.</span>
                    {p}
                  </li>
                ))}
              </ol>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 max-w-4xl text-[13.5px] leading-relaxed text-ink-500">
          Vereinfachte Übersicht ohne Anspruch auf Vollständigkeit. Landes- und kantonale Regeln ändern sich häufig – wir prüfen den aktuellen Stand für Ihren Standort. Keine Rechtsberatung.
        </p>
      </Section>

      {/* Ökologie */}
      <Section tone="green" space="lg">
        <SplitMedia
          image={{ src: "/img/solarpark-baeume.jpg", alt: "Solarpark mit Bäumen und Grünland am Rand" }}
          eyebrow="Ökologie & Biodiversität"
          title="Solarpark und Artenvielfalt: Es kommt auf die Planung an."
          text={[
            "Unter und zwischen den Modulen kann über die Laufzeit ungedüngtes, extensiv gepflegtes Grünland entstehen. Ob ein Park die Artenvielfalt gegenüber der vorherigen Nutzung tatsächlich erhöht, hängt vom Standort, vom Pflegekonzept und von der Ausgangslage ab – das belegt erst ein Monitoring vor Ort.",
            "Seit dem Solarpaket I gilt für geförderte Anlagen: mindestens drei von fünf naturschutzfachlichen Mindestkriterien. Welche Kriterien ein Park erfüllt, steht im Pflegekonzept des jeweiligen Projekts.",
          ]}
          points={[
            { title: "Begrenzte Überbauung", text: "Modulfläche nur auf einem Teil der Grundfläche, breitere Reihenabstände." },
            { title: "Biodiversitätsförderndes Pflegekonzept", text: "Späte, gestaffelte Mahd oder Schafbeweidung." },
            { title: "Durchgängigkeit für Tiere", text: "Zaun mit Bodenabstand, Wildkorridore bei großen Parks." },
            { title: "Biotopelemente", text: "Hecken, Blühstreifen, Steinhaufen, Kleingewässer." },
            { title: "Bodenschonender Betrieb", text: "Kein Dünger, keine Pflanzenschutzmittel." },
          ]}
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Fence, t: "Beweidung", x: "Schafe und – bei höherer Aufständerung – auch andere Weidetiere halten den Aufwuchs kurz. Die Fläche bleibt landwirtschaftlich nutzbar." },
            { icon: Trees, t: "Einbindung ins Landschaftsbild", x: "Hecken und Gehölzstreifen an Sichtachsen, Abstand zu Ortsrändern – das entscheidet oft über die Zustimmung vor Ort." },
            { icon: Waves, t: "Wasser & Boden", x: "Regen versickert zwischen den Modulen, unter dauerhaftem Bewuchs kann sich Humus aufbauen. Drainagen und Erosionsrinnen berücksichtigen wir in der Planung." },
          ].map((k, i) => (
            <Reveal key={k.t} delay={i * 70} className="rounded-3xl bg-white p-6 ring-1 ring-ov-100">
              <k.icon aria-hidden="true" className="h-6 w-6 text-ov-600" />
              <p className="mt-4 font-display text-[17px] font-bold text-ink-900">{k.t}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{k.x}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Rückbau & Sicherheiten */}
      <Section tone="white" space="lg">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            eyebrow="Rückbau & Sicherheiten"
            title="Nach Vertragsende bekommen Sie Ihre Fläche zurück – abgesichert durch Vertrag, Grundbuch und Bürgschaft."
            lead="Die wichtigste Frage vieler Eigentümer: Was, wenn der Betreiber nicht mehr existiert? Die Antwort steht im Vertrag und im Grundbuch."
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: ShieldAlert, t: "Rückbaubürgschaft", x: "Spätestens vor Baubeginn hinterlegt der Betreiber eine Bürgschaft einer Bank oder Versicherung über die Rückbaukosten – regelmäßig angepasst." },
              { icon: FileCheck2, t: "Dienstbarkeit im Grundbuch", x: "Die beschränkte persönliche Dienstbarkeit sichert den Betrieb – und bindet auch jeden Rechtsnachfolger an die Rückbaupflicht." },
              { icon: Recycle, t: "Recycling statt Deponie", x: "Module, Stahl, Aluminium und Kupfer werden verwertet; Module fallen unter die Rücknahmepflicht des Elektrogesetzes." },
              { icon: Sprout, t: "Wiederherstellung", x: `Pfosten ziehen, Kabel bergen, Boden lockern – die Fläche geht in landwirtschaftlich nutzbarem Zustand zurück. Rechnerisch rund ${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp Rückbaukosten.` },
            ].map((k, i) => (
              <Reveal as="li" key={k.t} delay={i * 70} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60">
                <k.icon aria-hidden="true" className="h-6 w-6 text-ov-600" />
                <p className="mt-4 font-display text-[17px] font-bold text-ink-900">{k.t}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{k.x}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* Zeitleiste */}
      <Section tone="sand" space="lg">
        <SectionHeading
          eyebrow="Ablauf"
          title="Von der Flächensicherung bis zum Betrieb."
          lead={`Viele Schritte laufen parallel. Die Pacht beginnt mit dem Bau – davor zahlen wir in der Regel eine Reservierungsprämie von ${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} € je Hektar und Jahr.`}
          className="mb-10"
        />
        <Zeitleiste />
      </Section>

      {/* FAQ */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Solarparks – gut zu wissen" lead="Ihre Frage ist nicht dabei? Schreiben Sie uns über den Flächencheck – wir antworten persönlich." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: pfad("/flaechencheck"), titel: "Flächencheck", text: "Ampel, mögliche Leistung und Pachtspanne Ihrer Fläche in zwei Minuten." },
          { href: pfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Pachtmodelle, Vertragsinhalte und der Weg bis zur ersten Zahlung." },
          { href: pfad("/agri-pv"), titel: "Agri-PV", text: "Wenn die Landwirtschaft auf der Fläche weitergehen soll." },
          { href: pfad("/prozess"), titel: "Unser Prozess", text: "Wie wir Projekte Schritt für Schritt zur Baureife bringen." },
          { href: "/wissen/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Solarpark-Genehmigung", text: "Der Bebauungsplan Schritt für Schritt." },
          { href: "/wissen/ratgeber/solarpark-rueckbau-rueckbaubuergschaft", titel: "Rückbau und Rückbaubürgschaft", text: "Pflicht, Sicherheit und echte Kosten nach 30 Jahren." },
        ]}
      />

      <CtaBand
        eyebrow="Kostenlos & unverbindlich"
        title="Hat Ihre Fläche das Zeug zum Solarpark?"
        text="Flurstücke nennen, wir prüfen Kulisse, Netz und Restriktionen am Kartentisch – und sagen Ihnen ehrlich, ob es sich lohnt. Offen gesagt: Wir sind selbst Projektentwickler und haben Interesse an geeigneten Flächen."
        primary={{ label: "Fläche prüfen", href: pfad("/flaechencheck") }}
        secondary={{ label: "Pachtrechner", href: pfad("/rechner/pacht") }}
      />
    </div>
  );
}

export const generateMetadata = landMetadata("/freiflaeche", metadata);
