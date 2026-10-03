import { Activity, BookOpen, Calculator, ClipboardList, Clock, FileSearch, Gauge, Handshake, LineChart, MapPinned, Network, ShieldCheck, Zap } from "lucide-react";

import SeitenHero from "@/components/Energie/Seite/SeitenHero";
import Faktenleiste from "@/components/Energie/Seite/Faktenleiste";
import Kopf from "@/components/Energie/Seite/Kopf";
import Ablaufleiste from "@/components/Energie/Seite/Ablaufleiste";
import AnfrageBuehne from "@/components/Energie/Seite/AnfrageBuehne";
import Weiterlesen from "@/components/Energie/Seite/Weiterlesen";
import HeroBuehne from "@/components/Speicher/Seite/HeroBuehne";
import Modelle from "@/components/Speicher/Seite/Modelle";
import Erloese from "@/components/Speicher/Seite/Erloese";
import Netz from "@/components/Speicher/Seite/Netz";
import Technik from "@/components/Speicher/Seite/Technik";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import Faq from "@/components/ui/Faq";
import Reveal from "@/components/ui/Reveal";
import AuswahlAnfrage from "@/components/Carport/AuswahlAnfrage";
import { abs, SITE } from "@/data/site";
import { SPEICHER, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";

const PFAD = "/grossspeicher";
const TITEL = "Batteriegroßspeicher: Co-Location & Stand-alone | ÖkoInvest";
const BESCHREIBUNG =
  "Batteriegroßspeicher am Solarpark oder Netzknoten: Erlöse aus Arbitrage und Regelenergie, Netzanschluss, Baukostenzuschuss, LFP-Technik und Sicherheit.";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Batteriegroßspeicher", "Großspeicher Solarpark", "Co-Location Speicher", "BESS Erlöse", "Baukostenzuschuss Speicher", "Stand-alone Batteriespeicher", "Speicher Netzanschluss"],
  alternates: { canonical: abs(PFAD) },
  openGraph: { type: "website", url: abs(PFAD), siteName: "ÖkoInvest", title: TITEL, description: BESCHREIBUNG, images: [{ url: abs("/img/speicher.jpg"), width: 1280, height: 852, alt: "Batteriespeicher-Container" }] },
};

// Beispiel 10 MW / 20 MWh (2-h-System) aus den Marktannahmen
const MW = 10;
const MWH = 20;
const invest = { min: MWH * 1000 * SPEICHER.capexProKwh.min, mittel: MWH * 1000 * SPEICHER.capexProKwh.mittel, max: MWH * 1000 * SPEICHER.capexProKwh.max };
const erloes = { min: MW * SPEICHER.erloesProMwJahr.min, mittel: MW * SPEICHER.erloesProMwJahr.mittel, max: MW * SPEICHER.erloesProMwJahr.max };

const FAQ = [
  {
    q: "Co-Location oder Stand-alone – was ist besser?",
    a: "Das hängt vom Netzanschluss ab. Co-Location nutzt den Netzanschluss eines Solarparks mit: Der Speicher nimmt Mittagsspitzen auf, die sonst abgeregelt oder billig verkauft würden, und speist abends ein – ohne zusätzliche Anschlussleistung. Stand-alone-Speicher an Umspannwerken sind frei in der Fahrweise und größer skalierbar, brauchen aber einen eigenen, oft knappen Netzanschluss und zahlen in der Regel einen Baukostenzuschuss.",
  },
  {
    q: "Womit verdient ein Großspeicher Geld?",
    a: `Mit Preisunterschieden am Strommarkt (Day-Ahead und Intraday), mit Regelenergie (Primärregelleistung FCR und Sekundärregelleistung aFRR) und – am Solarpark – mit verschobenem Solarstrom. Die Erlöse schwanken stark mit dem Markt; wir rechnen vorsichtig mit ${fmt(SPEICHER.erloesProMwJahr.min / 1000)}–${fmt(SPEICHER.erloesProMwJahr.max / 1000)} T€ je MW und Jahr. Indizes zeigen zeitweise höhere theoretische Potenziale, die in der Praxis nur teilweise erreicht werden. Für die Finanzierung werden zunehmend Tolling- oder Floor-Verträge mit Vermarktern genutzt.`,
  },
  {
    q: "Muss ein Speicher einen Baukostenzuschuss zahlen?",
    a: "Nach der Entscheidung des Bundesgerichtshofs vom 15. Juli 2025 (EnVR 1/24) dürfen Netzbetreiber auch von Batteriespeichern einen Baukostenzuschuss nach dem Leistungspreismodell verlangen. Je nach Netzebene und Netzgebiet kann das die Investition spürbar erhöhen. Bei Co-Location am bestehenden Anschluss eines Solarparks fällt er für die gemeinsam genutzte Leistung in der Regel nicht erneut an – das ist im Einzelfall mit dem Netzbetreiber zu klären.",
  },
  {
    q: "Zahlt ein Speicher Netzentgelte?",
    a: "Nach § 118 Abs. 6 EnWG sind Stromspeicher, die bis zum 4. August 2029 in Betrieb gehen, 20 Jahre lang von Netzentgelten für den eingespeicherten und wieder eingespeisten Strom befreit. Die Bundesnetzagentur arbeitet an einer Reform der Netzentgeltsystematik; nach aktuellem Stand ist für Anlagen innerhalb der Frist Vertrauensschutz zu erwarten – die Entwicklung sollte bei jeder Investitionsentscheidung geprüft werden.",
  },
  {
    q: "Wie sicher sind Großspeicher?",
    a: "Heute werden fast ausschließlich Lithium-Eisenphosphat-Zellen (LFP) eingesetzt, die thermisch deutlich stabiler sind als ältere Zellchemien. Dazu kommen Zell- und Modulüberwachung, Gasdetektion, Abstände zwischen Containern, Löschkonzepte mit der Feuerwehr und Prüfungen nach anerkannten Normen. Ein Brandschutzkonzept ist Teil jeder Genehmigung.",
  },
  {
    q: "Gilt das auch in Österreich und der Schweiz?",
    a: "Die Erlösquellen sind ähnlich – Regelenergie über APG bzw. Swissgrid, Arbitrage an den Strombörsen. Netzentgelte, Anschlussregeln und Genehmigung unterscheiden sich aber. In Österreich spielen Speicher zudem in Erneuerbare-Energie-Gemeinschaften und bei Photovoltaik-Parks mit begrenzter Einspeiseleistung eine wachsende Rolle. Wir prüfen die Rahmenbedingungen je Standort.",
  },
];

export default function GrossspeicherSeite() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Entwicklung von Batteriegroßspeichern",
    serviceType: "Projektentwicklung von Batteriespeichern (Co-Location am Solarpark und Stand-alone)",
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    url: abs(PFAD),
    description: BESCHREIBUNG,
  };

  return (
    <div>
      <JsonLd daten={schema} />

      <SeitenHero
        breadcrumbs={[{ name: "Großspeicher" }]}
        pill={{ marke: "BGH 2025", text: "Baukostenzuschuss auch für Speicher – was das heißt", kurz: "Baukostenzuschuss für Speicher", href: "#netz" }}
        titel={
          <>
            Großspeicher: Solarstrom, <span className="ov-text-gradient-light">wenn er gebraucht wird.</span>
          </>
        }
        lead={
          <>
            <span className="font-medium text-white">Batteriegroßspeicher am Solarpark oder am Netzknoten:</span> Wir entwickeln Speicherprojekte vom Netzanschluss bis zur Vermarktung – für Flächeneigentümer, Investoren und Stadtwerke.
          </>
        }
        primaer={{ label: "Speicherprojekt anfragen", href: "#anfrage" }}
        sekundaer={{ label: "Für Investoren", href: "/investoren", icon: LineChart }}
        hinweis="Unverbindlich · erste Einschätzung zu Standort, Netz und Modell"
        chips={["Co-Location & Stand-alone", "Arbitrage & Regelenergie", "LFP, 2 h und 4 h", "Vom Netzanschluss bis zur Vermarktung"]}
        buehne={<HeroBuehne />}
        bildunterschrift="Schematische Darstellung · Beispielansicht mit fiktiven Werten"
      />

      <Faktenleiste
        titel="Großspeicher in Zahlen"
        items={[
          { icon: Clock, wert: "2–4 h", einheit: "Speicherdauer", text: "2-Stunden-Systeme für Regelenergie, 4 Stunden für mehr Solarverschiebung" },
          { icon: Activity, wert: fmt(SPEICHER.zyklenProJahr), zahl: { wert: SPEICHER.zyklenProJahr }, einheit: "Vollzyklen pro Jahr", text: "Annahme in unseren Rechnungen" },
          { icon: Gauge, wert: `${fmt(SPEICHER.wirkungsgrad * 100)} %`, zahl: { wert: Math.round(SPEICHER.wirkungsgrad * 100), nach: " %" }, einheit: "Wirkungsgrad (AC)", text: "vom Laden bis zum Entladen" },
          { icon: ShieldCheck, wert: "20 J.", zahl: { wert: 20, nach: " J." }, einheit: "ohne Netzentgelte", text: "§ 118 Abs. 6 EnWG bei Inbetriebnahme bis 4. August 2029" },
        ]}
        fussnote={`Annahmen Stand ${STAND}`}
      />

      <Modelle />

      <Erloese mw={MW} mwh={MWH} invest={invest} erloes={erloes} />

      <Netz />

      <Technik />

      {/* ---------------- Ablauf ---------------- */}
      <Section tone="white" space="lg" data-abschnitt="ablauf" aria-labelledby="ablauf-titel">
        <div className="mb-12 flex flex-col gap-6 md:mb-16 lg:flex-row lg:items-end lg:justify-between">
          <Kopf id="ablauf-titel" eyebrow="Ablauf" titel="Vom Standort zum laufenden Speicher." />
          <Reveal className="flex flex-wrap gap-2 lg:justify-end">
            <span className="sr-only">Vermarktungsmodelle:</span>
            {["Merchant", "Tolling", "Floor"].map((v) => (
              <span key={v} className="inline-flex min-h-9 items-center rounded-full bg-sand-50 px-3.5 text-[13.5px] font-semibold text-ink-700 ring-1 ring-ink-200/70">
                {v}
              </span>
            ))}
          </Reveal>
        </div>
        <Ablaufleiste
          items={[
            { icon: MapPinned, title: "Standort & Netz", text: "Fläche sichern, Netzanschluss anfragen oder bestehenden Solarpark-Anschluss prüfen." },
            { icon: LineChart, title: "Erlöse & Auslegung", text: "Erlösgutachten, Leistung und Dauer, Vermarktungsmodell (Merchant, Tolling, Floor)." },
            { icon: ShieldCheck, title: "Genehmigung", text: "Bau- und Brandschutzkonzept, Abstimmung mit Gemeinde und Feuerwehr." },
            { icon: Zap, title: "Bau & Vermarktung", text: "Lieferung, Montage, Inbetriebnahme, Präqualifikation für Regelenergie und Betrieb." },
          ]}
        />
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section tone="sand" space="lg" data-abschnitt="faq" aria-labelledby="faq-titel">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Kopf id="faq-titel" eyebrow="Häufige Fragen" titel="Großspeicher – gut zu wissen" lead="Modelle, Erlöse, Netz und Sicherheit nach aktuellem Stand." />
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
            Fläche, Park oder Kapital <span className="ov-text-gradient-light">für einen Speicher?</span>
          </>
        }
        lead="Ob Sie eine Fläche nahe einem Umspannwerk haben, einen Solarpark nachrüsten oder in Speicherprojekte investieren möchten – wir melden uns mit einer ersten Einschätzung."
        zusagen={[
          { icon: ShieldCheck, text: "Unverbindlich anfragen" },
          { icon: Network, text: "Co-Location & Stand-alone" },
          { icon: MapPinned, text: "Deutschland, Österreich, Schweiz" },
        ]}
        ablauf={[
          { icon: ClipboardList, titel: "Sie schildern kurz Ihre Ausgangslage", text: "Fläche, Solarpark, Netzanschluss oder Kapital – ein paar Angaben genügen." },
          { icon: FileSearch, titel: "Sie erhalten eine Vorgangsnummer", text: "Direkt nach dem Absenden. Mit einer Registrierung verfolgen Sie den Stand im Portal." },
          { icon: Handshake, titel: "Wir melden uns mit einer ersten Einschätzung", text: "Zu Standort, Netz, Modell und Erlösen – und den nächsten Schritten." },
        ]}
        formText="Pflicht sind nur Name, E-Mail und Ihre Einwilligung."
      >
        <AuswahlAnfrage
          typ="speicher"
          felder={["firma", "telefon", "plz", "land", "nachricht"]}
          button="Speicherprojekt anfragen"
          gruppen={[
            { id: "rolle", legende: "Sie haben …", optionen: [{ id: "flaeche", label: "eine Fläche" }, { id: "solarpark", label: "einen Solarpark" }, { id: "kapital", label: "Kapital" }, { id: "netz", label: "einen Netzanschluss" }] },
            { id: "modell", legende: "Modell", optionen: [{ id: "offen", label: "Noch offen" }, { id: "colocation", label: "Co-Location" }, { id: "standalone", label: "Stand-alone" }] },
            { id: "groesse", legende: "Größenordnung", optionen: [{ id: "bis10", label: "bis 10 MW" }, { id: "10-50", label: "10–50 MW" }, { id: "ueber50", label: "über 50 MW" }] },
          ]}
        />
      </AnfrageBuehne>

      <Weiterlesen
        text="Rechnen, vergleichen, vertiefen – in Ruhe nachlesen."
        items={[
          { href: "/investoren", icon: LineChart, titel: "Für Investoren", text: "Speicher- und Solarprojekte in jeder Phase – Suchprofil, NDA, Datenraum." },
          { href: "/rechner/solarpark", icon: Calculator, titel: "Solarpark-Renditerechner", text: "IRR, LCOE und DSCR des Solarparks, an dem der Speicher stehen kann." },
          { href: "/virtuelles-kraftwerk", icon: Network, titel: "Virtuelles Kraftwerk", text: "Wie Speicher, Parks und Verbraucher gemeinsam am Markt agieren." },
          { href: "/ratgeber/grossspeicher-erloese", icon: BookOpen, titel: "Ratgeber Speichererlöse", text: "Arbitrage, FCR und aFRR im Detail – mit Marktentwicklung." },
        ]}
      />
    </div>
  );
}
