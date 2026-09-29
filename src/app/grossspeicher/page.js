import { Activity, BatteryCharging, Cable, Clock, Flame, Gauge, LineChart, MapPinned, Network, Plug, ShieldCheck, Sun, Thermometer, TrendingUp, Zap, Building2 } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import TagesprofilGrafik from "@/components/Speicher/TagesprofilGrafik";
import AuswahlAnfrage from "@/components/Carport/AuswahlAnfrage";
import { abs, SITE } from "@/data/site";
import { SPEICHER, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/grossspeicher";
const TITEL = "Batteriegroßspeicher: Co-Location & Stand-alone | ÖkoInvest";
const BESCHREIBUNG =
  "Großspeicher am Solarpark oder am Netzknoten: Erlöse aus Arbitrage und Regelenergie, Netzanschluss, Baukostenzuschuss, Netzentgelte, LFP-Technik und Sicherheit.";

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
const mio = (v) => `${fmt(v / 1e6, 1)} Mio. €`;

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        variant="immersive"
        breadcrumbs={[{ name: "Großspeicher" }]}
        eyebrow="Batteriegroßspeicher"
        title={
          <>
            Solarstrom, <span className="ov-text-gradient-light">wenn er gebraucht wird.</span>
          </>
        }
        lead="Großspeicher am Solarpark oder an Netzknoten: Wir entwickeln Speicherprojekte vom Netzanschluss bis zur Vermarktung – für Flächeneigentümer, Investoren und Stadtwerke."
        image={{ src: "/img/speicher.jpg", alt: "Batteriespeicher-Container an einem Energiestandort" }}
        actions={[
          { label: "Speicherprojekt anfragen", href: "#anfrage" },
          { label: "Für Investoren", href: "/investoren", icon: LineChart },
        ]}
        points={["Co-Location & Stand-alone", "Arbitrage & Regelenergie", "LFP, 2 h und 4 h"]}
      />

      {/* ---------------- Modelle ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Zwei Modelle" title="Am Solarpark oder am Netzknoten." lead="Der Netzanschluss ist der knappste Faktor – er entscheidet, welches Modell sich rechnet." className="mb-12" />
        <div className="grid gap-5 lg:grid-cols-2">
          {[
            {
              icon: Sun,
              titel: "Co-Location am Solarpark",
              ton: "hell",
              punkte: [
                "nutzt den vorhandenen Netzanschluss mit – Überbauung statt neuer Anschlussleistung",
                "nimmt Mittagsspitzen auf, die sonst abgeregelt oder zu negativen Preisen verkauft würden",
                "speist abends ein, wenn Preise und Bedarf hoch sind",
                "Regeln für gemischt genutzte Speicher (Grünstrom und Netzstrom) wurden 2025 gelockert; die Umsetzung läuft",
              ],
            },
            {
              icon: Network,
              titel: "Stand-alone am Netzknoten",
              ton: "dunkel",
              punkte: [
                "frei in der Fahrweise: Arbitrage und Regelenergie rund um die Uhr",
                "skalierbar auf viele Megawattstunden am Umspannwerk",
                "eigener Netzanschluss nötig – oft knapp, mit langen Wartezeiten",
                "in der Regel Baukostenzuschuss; Netzentgeltbefreiung nach § 118 Abs. 6 EnWG bis 2029",
              ],
            },
          ].map((m, i) => (
            <Reveal key={m.titel} delay={i * 80} className={m.ton === "dunkel" ? "rounded-[2rem] bg-navy-950 p-7 text-white md:p-9" : "rounded-[2rem] bg-sand-50 p-7 ring-1 ring-ink-200/70 md:p-9"}>
              <m.icon aria-hidden="true" className={m.ton === "dunkel" ? "h-8 w-8 text-ov-300" : "h-8 w-8 text-ov-600"} />
              <h3 className={m.ton === "dunkel" ? "ov-h3 mt-5 text-white" : "ov-h3 mt-5 text-ink-900"}>{m.titel}</h3>
              <ul className="mt-5 space-y-3">
                {m.punkte.map((p) => (
                  <li key={p} className={m.ton === "dunkel" ? "flex gap-3 text-[15.5px] leading-relaxed text-white/75" : "flex gap-3 text-[15.5px] leading-relaxed text-ink-700"}>
                    <span aria-hidden="true" className={m.ton === "dunkel" ? "mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-300" : "mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500"} />
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ---------------- Erlöse ---------------- */}
      <Section tone="navy" space="lg">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
          <SectionHeading
            dark
            eyebrow="Erlösquellen"
            title="Günstig laden, teuer entladen – und Netzstabilität verkaufen."
            lead="Ein Speicher verdient an mehreren Märkten gleichzeitig. Ein Vermarkter optimiert die Fahrweise täglich zwischen Börse und Regelenergie."
          />
          <Reveal className="min-w-0 rounded-[2rem] bg-white/[0.04] p-4 ring-1 ring-white/10 md:p-6">
            <div tabIndex={0} role="region" aria-label="Schematischer Tagesverlauf eines Speichers" className="overflow-x-auto">
              <div className="min-w-[540px]">
                <TagesprofilGrafik />
              </div>
            </div>
            <p className="mt-2 px-2 text-[12.5px] text-white/50">Schematischer Tagesverlauf an einem sonnigen Tag, keine Messdaten.</p>
          </Reveal>
        </div>
        <div className="mt-12">
          <FeatureGrid
            tone="dark"
            cols={4}
            items={[
              { icon: TrendingUp, title: "Arbitrage", text: "Laden bei niedrigen oder negativen Preisen, entladen in den Abend- und Morgenspitzen – am Day-Ahead- und Intraday-Markt." },
              { icon: Activity, title: "Regelenergie", text: "Primärregelleistung (FCR) und Sekundärregelleistung (aFRR). FCR ist durch den Speicherzubau unter Druck, aFRR war 2025 einer der größten Erlöstöpfe." },
              { icon: Sun, title: "Solarverschiebung", text: "Am Solarpark: Strom aus Stunden mit Abregelung oder negativen Preisen wird zu besseren Preisen verkauft." },
              { icon: Gauge, title: "Netzdienlichkeit", text: "Flexible Netzanschlussvereinbarungen und künftige Flexibilitätsmärkte können zusätzlichen Wert schaffen – noch im Aufbau." },
            ]}
          />
        </div>
        <Reveal className="mt-10 grid gap-4 rounded-[2rem] bg-white/[0.04] p-6 ring-1 ring-white/10 md:grid-cols-3 md:p-8">
          <div className="md:col-span-3">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300">Größenordnung · Beispiel {MW} MW / {MWH} MWh</p>
          </div>
          {[
            ["Investition", `${mio(invest.min)} – ${mio(invest.max)}`, `${fmt(SPEICHER.capexProKwh.min)}–${fmt(SPEICHER.capexProKwh.max)} €/kWh schlüsselfertig`],
            ["Erlöse pro Jahr", `${mio(erloes.min)} – ${mio(erloes.max)}`, "Arbitrage + Regelenergie, stark marktabhängig"],
            ["Technik", `${fmt(SPEICHER.zyklenProJahr)} Zyklen · ${fmt(SPEICHER.wirkungsgrad * 100)} %`, "Vollzyklen pro Jahr · Wirkungsgrad (AC)"],
          ].map(([k, v, t]) => (
            <div key={k}>
              <p className="text-[13px] text-white/60">{k}</p>
              <p className="ov-num mt-1 font-display text-[24px] font-extrabold tracking-tight text-white">{v}</p>
              <p className="mt-1 text-[13px] text-white/55">{t}</p>
            </div>
          ))}
          <p className="text-[12.5px] leading-relaxed text-white/50 md:col-span-3">
            Vor Betriebskosten, Vermarktungsentgelt, Degradation, Baukostenzuschuss und Steuern. Die Spanne zeigt, wie stark das Ergebnis vom Markt abhängt – für eine Investitionsentscheidung
            brauchen Sie ein Erlösgutachten und ein Vermarktungsangebot. Stand {STAND}.
          </p>
        </Reveal>
      </Section>

      {/* ---------------- Netz ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Netzanschluss" title="Der Engpass heißt Netz – nicht Batterie." lead="Bei Netzbetreibern liegen Anschlussanfragen für Speicher in einem Vielfachen der tatsächlich möglichen Leistung. Wer Speicher entwickeln will, braucht eine Strategie für den Anschluss." className="mb-12" />
        <FeatureGrid
          cols={3}
          items={[
            { icon: Plug, title: "Überbauung nutzen", text: "Solarpark und Speicher teilen sich einen Anschluss: Die Summe der Leistungen darf größer sein als die Anschlussleistung, gesteuert über ein Energiemanagement." },
            { icon: Cable, title: "Baukostenzuschuss", text: "Seit dem BGH-Beschluss vom 15.07.2025 zulässig auch für Speicher. Höhe je nach Netzebene und Netzbetreiber – früh anfragen und einpreisen." },
            { icon: Clock, title: "Reifegrad zählt", text: "Netzbetreiber priorisieren zunehmend Projekte mit gesicherter Fläche, Planung und Finanzierung. Spekulative Anfragen verlieren an Bedeutung." },
            { icon: Zap, title: "Flexible Anschlüsse", text: "Flexible Netzanschlussvereinbarungen erlauben einen schnelleren Anschluss gegen zeitweise begrenzte Einspeisung oder Bezug." },
            { icon: MapPinned, title: "Standort", text: "Nähe zu Umspannwerk oder Solarpark, Zuwegung für Schwerlast, Abstand zu Wohnbebauung, Lärm und Brandschutz." },
            { icon: Building2, title: "Genehmigung", text: "Je nach Standort Bauantrag im Außenbereich oder B-Plan. Die Gemeinde früh einbinden – auch zu Brandschutz und Feuerwehr." },
          ]}
        />
      </Section>

      {/* ---------------- Technik & Sicherheit ---------------- */}
      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading eyebrow="Technik" title="LFP, 2 oder 4 Stunden." />
            <dl className="mt-8 space-y-4">
              {[
                ["Zellchemie", "Lithium-Eisenphosphat (LFP): langlebig, thermisch stabil, ohne Kobalt."],
                ["Dauer", "2-Stunden-Systeme für Regelenergie und Tagesarbitrage; 4-Stunden-Systeme verschieben mehr Solarstrom in den Abend und gewinnen an Bedeutung."],
                ["Aufbau", "Batterie-Container, Wechselrichter (PCS), Transformatoren, Energiemanagement und Anbindung an den Vermarkter."],
                ["Lebensdauer", `Rund ${fmt(SPEICHER.zyklenProJahr)} Vollzyklen pro Jahr; Kapazitätsverlust wird über Erweiterung (Augmentation) oder Garantie ausgeglichen.`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white p-5 ring-1 ring-ink-200/70">
                  <dt className="font-display text-[16px] font-bold text-ink-900">{k}</dt>
                  <dd className="mt-1 text-[15px] leading-relaxed text-ink-600">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <SectionHeading eyebrow="Sicherheit" title="Brandschutz von Anfang an." />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { icon: Thermometer, t: "Überwachung", x: "Temperatur, Spannung und Gas je Modul, automatische Abschaltung." },
                { icon: Flame, t: "Löschkonzept", x: "Abgestimmt mit der Feuerwehr, inkl. Zufahrt, Löschwasser und Einsatzplan." },
                { icon: ShieldCheck, t: "Abstände & Normen", x: "Container-Abstände und Prüfungen nach anerkannten Normen für Batteriesysteme." },
                { icon: BatteryCharging, t: "Betrieb", x: "Fernüberwachung rund um die Uhr, Wartung und klare Zuständigkeiten." },
              ].map((s) => (
                <li key={s.t} className="rounded-2xl bg-white p-5 ring-1 ring-ink-200/70">
                  <s.icon aria-hidden="true" className="h-5 w-5 text-ov-600" />
                  <p className="mt-3 font-display text-[16px] font-bold text-ink-900">{s.t}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-ink-600">{s.x}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ---------------- Ablauf ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Ablauf" title="Vom Standort zum laufenden Speicher" align="center" className="mb-14" />
        <Steps
          items={[
            { icon: MapPinned, title: "Standort & Netz", text: "Fläche sichern, Netzanschluss anfragen oder bestehenden Solarpark-Anschluss prüfen." },
            { icon: LineChart, title: "Erlöse & Auslegung", text: "Erlösgutachten, Leistung und Dauer, Vermarktungsmodell (Merchant, Tolling, Floor)." },
            { icon: ShieldCheck, title: "Genehmigung", text: "Bau- und Brandschutzkonzept, Abstimmung mit Gemeinde und Feuerwehr." },
            { icon: Zap, title: "Bau & Vermarktung", text: "Lieferung, Montage, Inbetriebnahme, Präqualifikation für Regelenergie und Betrieb." },
          ]}
        />
      </Section>

      {/* ---------------- Anfrage ---------------- */}
      <Section tone="sand" space="lg" id="anfrage">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading eyebrow="Anfrage" title="Fläche, Park oder Kapital für einen Speicher?" lead="Ob Sie eine Fläche nahe einem Umspannwerk haben, einen Solarpark nachrüsten oder in Speicherprojekte investieren möchten – wir melden uns mit einer ersten Einschätzung." />
          <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70 md:p-8">
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
          </div>
        </div>
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Großspeicher – gut zu wissen" />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/investoren", titel: "Für Investoren", text: "Speicher- und Solarprojekte in jeder Phase – Suchprofil, NDA, Datenraum." },
          { href: "/rechner/solarpark", titel: "Solarpark-Renditerechner", text: "IRR, LCOE und DSCR des Solarparks, an dem der Speicher stehen kann." },
          { href: "/virtuelles-kraftwerk", titel: "Virtuelles Kraftwerk", text: "Wie Speicher, Parks und Verbraucher gemeinsam am Markt agieren." },
          { href: "/ratgeber/grossspeicher-erloese", titel: "Ratgeber Speichererlöse", text: "Arbitrage, FCR und aFRR im Detail – mit Marktentwicklung." },
        ]}
      />

      <CtaBand
        eyebrow="Großspeicher"
        title="Aus Netzanschluss wird Wert."
        text="Wir prüfen Standort, Netz und Erlöse und entwickeln Ihr Speicherprojekt bis zur Baureife – oder bringen Sie als Investor mit baureifen Projekten zusammen."
        primary={{ label: "Speicherprojekt anfragen", href: "#anfrage" }}
        secondary={{ label: "Für Investoren", href: "/investoren" }}
      />
    </div>
  );
}
