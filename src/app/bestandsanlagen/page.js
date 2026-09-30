// src/app/bestandsanlagen/page.js – Zweitmarkt für PV-Bestandsanlagen (Dach und Freifläche)

import Link from "next/link";
import {
  Activity, ArrowRight, BadgePercent, CalendarClock, Camera, Check, ClipboardList, FileCheck2, FileSearch, FileSignature, FolderLock,
  Gauge, Handshake, LineChart, ScrollText, Search, ShieldCheck, TrendingDown, Wrench,
} from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Steps from "@/components/ui/Steps";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Button from "@/components/ui/Button";
import Querverweise from "@/components/Reusable/Querverweise";
import BestandAnfrage from "@/components/Bestand/BestandAnfrage";
import { abs } from "@/data/site";
import { BESTAND, ERLOESE, PROVISION, STAND } from "@/lib/invest/markt";
import { PHASE_BESTAND, rechneBestand, verguetungRichtwert } from "@/lib/rechner/bestandsanlage";
import { fmt, fmtMio } from "@/lib/rechner/annahmen";

const PFAD = "/bestandsanlagen";
const TITEL = "PV-Bestandsanlagen kaufen und verkaufen | ÖkoInvest";
const BESCHREIBUNG =
  "Zweitmarkt für laufende PV-Anlagen auf Dach und Freifläche: Bewertung nach Ertragswert, Due Diligence, vertraulicher Verkauf, offene Provision.";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["PV Bestandsanlage verkaufen", "Solarpark kaufen Bestand", "Photovoltaik Zweitmarkt", "Bestandsanlage Bewertung", "PV-Anlage gebraucht kaufen"],
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/solarpark-reihen.jpg"), width: 1280, height: 852, alt: "Reihen eines laufenden Solarparks" }],
  },
};

const BOERSE = "/projektboerse?phase=cod";

// Drei Beispiele: gleiche Anlage (2 MWp Freifläche, 1.000 kWh/kWp), unterschiedliches Baujahr
const BEISPIELE = [2010, 2013, 2021].map((j) => {
  const r = rechneBestand({ ibnJahr: j, verguetungCt: verguetungRichtwert(j), modell: j >= 2015 ? "marktpraemie" : "fest", wrJahr: 2029 });
  return { jahr: j, ct: verguetungRichtwert(j), r };
});
const bsp = BEISPIELE[1].r;

const FAQ = [
  {
    q: "Was ist meine PV-Anlage wert?",
    a: `So viel, wie ihre künftigen Cashflows heute wert sind. Entscheidend sind Förderrestlaufzeit und Tarif, der tatsächliche Ertrag, Betriebskosten und Pacht, anstehende Ersatzinvestitionen und die Laufzeit des Pacht- oder Dachvertrags. Für jüngere Anlagen mit heutigen Tarifen liegen übliche Preise grob bei ${fmt(PHASE_BESTAND.preisProKwp.min)}–${fmt(PHASE_BESTAND.preisProKwp.max)} € je kWp; ältere Anlagen mit hohem EEG-Tarif können darüber liegen. Den Ertragswert Ihrer Anlage rechnen Sie im Bewertungsrechner.`,
  },
  {
    q: "Ab welcher Größe lohnt der Verkauf über die Börse?",
    a: "Käufer am Zweitmarkt suchen meist Anlagen ab einigen Hundert kWp, institutionelle Käufer eher ab mehreren MWp oder Portfolios. Kleinere Dachanlagen lassen sich bündeln. Sprechen Sie uns an – wir sagen offen, ob sich ein Verkauf lohnt.",
  },
  {
    q: "Wie lange dauert ein Verkauf?",
    a: "Von der Bewertung bis zum Übergang meist einige Monate. Den Takt bestimmen Vollständigkeit der Unterlagen, Due Diligence des Käufers und Zustimmungen Dritter (etwa Bank, Flächen- oder Dacheigentümer). Ein gut vorbereiteter Datenraum spart die meiste Zeit.",
  },
  {
    q: "Share Deal oder Asset Deal?",
    a: "Bei einer Projektgesellschaft wird häufig die Gesellschaft verkauft (Share Deal) – Verträge und Genehmigungen bleiben in der Gesellschaft. Beim Asset Deal wird die Anlage selbst übertragen; Pacht-, Wartungs- und Vermarktungsverträge müssen übergeleitet werden. Welche Form besser passt, hängt von Steuern, Finanzierung und Vertragslage ab – das klären Sie mit Ihrer Beratung.",
  },
  {
    q: "Wer sieht meine Anlage in der Börse?",
    a: "Öffentlich nur ein anonymer Teaser mit Region, Größe, Inbetriebnahmejahr und Eckdaten. Standort, Verträge, Ertragsdaten und Gutachten sehen registrierte Käufer erst nach Vertraulichkeitsvereinbarung und Freigabe – jeder Zugriff auf den Datenraum wird protokolliert.",
  },
  {
    q: "Wie werden Anlagen in Österreich und der Schweiz bewertet?",
    a: "Nach derselben Logik, aber mit anderen Förderregimen: In Österreich laufen ältere Anlagen häufig mit Tarifen nach dem Ökostromgesetz, neuere mit Marktprämie oder Investitionszuschuss nach dem EAG. In der Schweiz gibt es bei älteren Anlagen teils eine laufende Einspeisevergütung, bei neueren meist eine Einmalvergütung – dann zählen Eigenverbrauch und Rückliefertarif. Förderdauer und Tarif übernehmen Sie im Rechner aus dem Bescheid.",
  },
];

export default function BestandsanlagenPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Kauf und Verkauf von PV-Bestandsanlagen",
    serviceType: "Vermittlung laufender Photovoltaikanlagen (Dach und Freifläche) am Zweitmarkt",
    provider: { "@id": `${abs("/")}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "BusinessAudience", audienceType: "Anlagenbetreiber, Investoren, Stadtwerke, Family Offices" },
    url: abs(PFAD),
    description: BESCHREIBUNG,
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        variant="immersive"
        breadcrumbs={[{ name: "Bestandsanlagen" }]}
        eyebrow="Zweitmarkt PV-Bestandsanlagen"
        title={<>Laufende Anlagen – <span className="ov-text-gradient-light">fair bewertet, vertraulich verkauft.</span></>}
        lead="Solarparks und Dachanlagen mit Ertragshistorie im DACH-Raum: Bewertung nach Ertragswert, geprüfte Unterlagen, Datenraum nach NDA – und eine Provision, die Sie vorher kennen."
        image={{ src: "/img/solarpark-reihen.jpg", alt: "Modulreihen eines laufenden Solarparks" }}
        actions={[
          { label: "Anlage bewerten", href: "/rechner/bestandsanlage", icon: Gauge },
          { label: "Bestand in der Börse", href: BOERSE, icon: Search },
        ]}
        points={["Rechenweg offen", `Provision ${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} % nur bei Abschluss`, "Für Käufer kostenfrei", "Betrieb aus der Gruppe möglich"]}
      />

      {/* Zwei Perspektiven */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Verkäufer und Käufer"
          title="Warum Bestandsanlagen den Besitzer wechseln."
          lead="Am Zweitmarkt treffen sich zwei Interessen: Der eine will Kapital freisetzen oder Risiko abgeben, der andere sucht planbaren Cashflow ohne Entwicklungs- und Baurisiko."
          className="mb-12"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            {
              t: "Gründe für den Verkauf",
              icon: Handshake,
              punkte: [
                "Kapital freisetzen für neue Projekte oder den eigenen Betrieb",
                "Nachfolge, Erbfall oder Auflösung einer Betreibergesellschaft",
                "Portfolio bereinigen – kleine Anlagen, fremde Regionen",
                "Förderende naht: Marktrisiko an einen Spezialisten abgeben",
                "Anstehende Investitionen (Wechselrichter, Repowering) nicht selbst tragen",
                "Refinanzierung oder Bankauflagen",
              ],
            },
            {
              t: "Was Käufer suchen",
              icon: LineChart,
              punkte: [
                "Belegte Erträge statt Prognosen – mehrere Betriebsjahre",
                "Möglichst lange Förderrestlaufzeit oder ein laufender PPA",
                "Gesicherte Fläche bzw. Dach über die gesamte Nutzungsdauer",
                "Vollständige Unterlagen: Abrechnungen, Wartung, Gutachten",
                "Potenzial: Repowering, Speicher am Netzanschluss, Direktvermarktung",
                "Klare Betriebsführung nach dem Übergang",
              ],
            },
          ].map((b, i) => (
            <Reveal key={b.t} delay={i * 80} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-8">
              <b.icon aria-hidden="true" className="h-7 w-7 text-ov-600" />
              <h3 className="mt-4 font-display text-[20px] font-bold text-ink-900">{b.t}</h3>
              <ul className="mt-4 grid gap-2.5">
                {b.punkte.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink-700">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ov-500 text-white">
                      <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Bewertung */}
      <Section tone="sand" space="lg">
        <SectionHeading
          eyebrow="Bewertung"
          title="Was den Wert einer laufenden Anlage bestimmt."
          lead="Grundlage ist der Ertragswert (DCF): alle künftigen Einnahmen und Ausgaben, Jahr für Jahr, abgezinst mit der Renditeerwartung des Käufers. Diese acht Punkte bewegen ihn am stärksten."
          className="mb-12"
        />
        <FeatureGrid
          cols={4}
          items={[
            { icon: CalendarClock, title: "Restlaufzeit der Förderung", text: "In Deutschland 20 Jahre plus Rest des Inbetriebnahmejahres. Hohe Alttarife tragen oft den Großteil des Werts – bis zum letzten Förderjahr." },
            { icon: Activity, title: "Ertragshistorie vs. Prognose", text: "Gemessene Jahre gegen Einstrahlung und Gutachten. Minderertrag hat Ursachen – behebbar oder dauerhaft." },
            { icon: TrendingDown, title: "Degradation", text: `Ältere Module verlieren meist rund ${fmt(BESTAND.degradation * 100, 1)} % pro Jahr, einzelne Modultypen deutlich mehr – Kennlinienmessungen zeigen es.` },
            { icon: Wrench, title: "Wechsel­richter­tausch", text: `Nach ${BESTAND.wechselrichterJahre.min}–${BESTAND.wechselrichterJahre.max} Jahren meist fällig, grob ${fmt(BESTAND.wechselrichterProKwp.min)}–${fmt(BESTAND.wechselrichterProKwp.max)} €/kWp. Steht er bevor, mindert er den Kaufpreis.` },
            { icon: ScrollText, title: "Pacht- und Dachvertrag", text: "Endet der Vertrag vor der technischen Nutzungsdauer, endet auch der Cashflow. Eine gesicherte Verlängerung hebt den Wert." },
            { icon: Camera, title: "Technische Due Diligence", text: "Begehung, Thermografie per Drohne, Kennlinien, Isolationsmessung, Zustand von Unterkonstruktion, Kabeln und Station." },
            { icon: FileCheck2, title: "Anlagenzertifikat & Netz", text: "Anlagen- bzw. Einheitenzertifikat, Netzanschlussvertrag, Konformitätsnachweise, Registrierung im Marktstammdatenregister." },
            { icon: LineChart, title: "Marktpreis nach Förderende", text: `Danach zählt der Solar-Marktwert – wir rechnen vorsichtig mit ${fmt(ERLOESE.merchantCt, 1)} ct/kWh. Ein PPA kann das Risiko begrenzen.` },
          ]}
        />

        {/* Drei Beispiele */}
        <Reveal className="mt-10 rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-display text-[19px] font-bold text-ink-900">Gleiche Anlage, anderes Baujahr – anderer Wert</h3>
            <Link href="/rechner/bestandsanlage" className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-ov-700 hover:text-ov-800">
              Mit eigenen Werten rechnen <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-600">
            2 MWp Freifläche in Süddeutschland, 1.000 kWh/kWp gemessen, Pacht 6.000 €/Jahr, Wechselrichtertausch 2029, Diskontsatz {fmt(BESTAND.diskont.standard * 100, 1)} %, Bewertung ab {BESTAND.bewertungsjahr}.
          </p>
          <div tabIndex={0} role="region" aria-label="Beispielbewertungen" className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <thead className="text-[12px] uppercase tracking-[0.08em] text-ink-500">
                <tr className="border-b border-ink-200">
                  {["Inbetriebnahme", "Vergütung (Richtwert)", "Förderung bis", "Ertragswert", "je kWp", "Einordnung"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="ov-num divide-y divide-ink-100 text-ink-700">
                {BEISPIELE.map(({ jahr, ct, r }) => (
                  <tr key={jahr}>
                    <th scope="row" className="px-3 py-3 font-semibold text-ink-900">{jahr}</th>
                    <td className="px-3 py-3">{fmt(ct, 1)} ct/kWh</td>
                    <td className="px-3 py-3">{r.foerderEnde}</td>
                    <td className="px-3 py-3">{fmtMio(r.wert, 2)}</td>
                    <td className="px-3 py-3 font-semibold text-ink-900">{fmt(r.wertProKwp)} €</td>
                    <td className="px-3 py-3">{r.einordnung === "ueber" ? "über der Spanne" : r.einordnung === "unter" ? "unter der Spanne" : "in der Spanne"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">
            Vergütungen sind grobe Richtwerte je Baujahr, keine Anlagendaten. Übliche Spanne für Bestandsanlagen {fmt(PHASE_BESTAND.preisProKwp.min)}–{fmt(PHASE_BESTAND.preisProKwp.max)} €/kWp. Vor Steuern und Fremdkapital. Stand {STAND}.
          </p>
        </Reveal>
      </Section>

      {/* Due Diligence */}
      <Section tone="white" space="lg">
        <div className="grid gap-10">
          <SectionHeading
            eyebrow="Datenraum"
            title="Welche Unterlagen ein Käufer sehen will."
            lead="Je vollständiger der Datenraum, desto schneller die Prüfung – und desto geringer die Abschläge. Wir helfen beim Zusammenstellen und prüfen vor der Veröffentlichung auf Vollständigkeit."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Wrench, t: "Technisch", p: ["Ertragsdaten, Monitoring-Export", "Ertragsgutachten der Planung", "Wartungs- und Störungsprotokolle", "Thermografie, Kennlinien", "Anlagen- bzw. Einheitenzertifikat", "Pläne, Stringpläne, Datenblätter"] },
              { icon: ScrollText, t: "Rechtlich", p: ["Pacht- bzw. Dachnutzungsvertrag", "Dienstbarkeiten, Grundbuch", "Genehmigung bzw. Baurecht", "Netzanschlussvertrag", "Direktvermarktungs- oder PPA-Vertrag", "Rückbauverpflichtung, Sicherheiten"] },
              { icon: ClipboardList, t: "Kaufmännisch", p: ["Abrechnungen Netzbetreiber / Vermarkter", "Jahresabschlüsse der Gesellschaft", "Finanzierung, Sicherheiten, Covenants", "Versicherungen, Schadenhistorie", "Betriebsführungsverträge", "Marktstammdatenregister-Einträge"] },
            ].map((k, i) => (
              <Reveal key={k.t} delay={i * 70} className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-6">
                <k.icon aria-hidden="true" className="h-6 w-6 text-ov-600" />
                <p className="mt-3 font-display text-[17px] font-bold text-ink-900">{k.t}</p>
                <ul className="mt-3 space-y-2">
                  {k.p.map((x) => (
                    <li key={x} className="flex gap-2 text-[14px] leading-snug text-ink-600">
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
                      {x}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* Ablauf */}
      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="Ablauf über die Plattform" title="Von der Bewertung bis zur Übergabe" align="center" className="mb-14" />
        <Steps
          cols={3}
          items={[
            { icon: Gauge, title: "Bewertung", text: "Erste Einschätzung im Rechner, dann mit Ihren Ertragsdaten und Verträgen eine belastbare Wertspanne – kostenfrei." },
            { icon: FolderLock, title: "Datenraum", text: "Unterlagen hochladen, wir prüfen auf Vollständigkeit und Plausibilität. Lücken zeigen wir, bevor ein Käufer sie findet." },
            { icon: Search, title: "Anonymer Teaser", text: "Region, Größe, Inbetriebnahme, Vergütung und Eckdaten in der Projektbörse – ohne Standort und Namen." },
            { icon: ShieldCheck, title: "NDA & Due Diligence", text: "Registrierte Käufer akzeptieren die Vertraulichkeitsvereinbarung, erhalten Datenraumzugriff und prüfen technisch und rechtlich." },
            { icon: FileSignature, title: "Angebot & Vertrag", text: "Indikative Angebote, Absichtserklärung, Kaufvertrag – als Share Deal oder Asset Deal, mit Ihrer Beratung." },
            { icon: Handshake, title: "Übergang & Betrieb", text: "Meldungen an Netzbetreiber, Register und Vermarkter. Betriebsführung auf Wunsch weiter durch die Gruppe." },
          ]}
        />
      </Section>

      {/* Provision */}
      <Section tone="navy" space="lg">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          <SectionHeading
            dark
            eyebrow="Provision offen"
            title="Sie wissen vorher, was der Verkauf kostet."
            lead={`Keine Einstell-, Listungs- oder Datenraumgebühren. Verkäufer zahlen eine Erfolgsprovision von ${PROVISION.verkaeufer.text}. Käufer zahlen nichts – ${PROVISION.kaeufer.text.replace("für Investoren ", "")}.`}
          />
          <Reveal className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10 md:p-8">
            <BadgePercent aria-hidden="true" className="h-7 w-7 text-ov-300" />
            <p className="mt-4 text-[14px] text-white/70">Beispiel: Anlage mit Ertragswert {fmtMio(bsp.wert, 2)}</p>
            <p className="ov-num mt-2 font-display text-[30px] font-extrabold leading-tight text-white">
              {fmt(Math.round((bsp.wert * PROVISION.verkaeufer.min) / 1000))}–{fmt(Math.round((bsp.wert * PROVISION.verkaeufer.max) / 1000))} Tsd. €
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-white/70">nur bei erfolgreichem Verkauf, auf den tatsächlichen Kaufpreis.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button href={BOERSE} variant="white" pfeil>
                Bestand in der Börse
              </Button>
              <Button href="/projektboerse/anbieten" variant="outlineLight">
                Anlage anbieten
              </Button>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Formular */}
      <Section tone="white" space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Kostenlos & unverbindlich"
              title="Anlage vorstellen oder Suchprofil hinterlegen."
              lead="Für Verkäufer: Eckdaten reichen für eine erste Einschätzung. Für Käufer: Wir melden uns, sobald eine passende Anlage in die Börse kommt."
            />
            <Reveal className="mt-8 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-8">
              <FileSearch aria-hidden="true" className="h-7 w-7 text-ov-600" />
              <p className="mt-4 font-display text-[19px] font-bold text-ink-900">Erst rechnen, dann reden?</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                Der Bewertungsrechner zeigt Ertragswert, Spanne, Wert je kWp und die wichtigsten Werttreiber Ihrer Anlage – ohne Anmeldung.
              </p>
              <Link href="/rechner/bestandsanlage" className="mt-5 inline-flex items-center gap-2 text-[15px] font-semibold text-ov-700 hover:text-ov-800">
                Zum Bewertungsrechner <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-[0_40px_80px_-50px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 md:p-9">
            <BestandAnfrage />
          </Reveal>
        </div>
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Fragen zu Bestandsanlagen" lead="Ihre Frage ist nicht dabei? Stellen Sie sie im Formular – wir antworten persönlich." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/rechner/bestandsanlage", titel: "Bewertungsrechner", text: "Ertragswert, Spanne und Sensitivität Ihrer laufenden Anlage." },
          { href: BOERSE, titel: "Bestand in der Börse", text: "Laufende Anlagen als anonymer Teaser – Details nach NDA." },
          { href: "/investoren", titel: "Für Investoren", text: "Projektrechte, baureife Projekte und Bestand – Phasenmodell und Due-Diligence-Checkliste." },
          { href: "/warum-oekoinvest", titel: "Warum ÖkoInvest", text: "Marktplatz, Makler oder Entwickler-Plattform – die Modelle im offenen Vergleich." },
        ]}
      />

      <CtaBand
        eyebrow="Für Verkäufer und Käufer"
        title="Was ist Ihre Anlage heute wert?"
        text="Im Bewertungsrechner sehen Sie den Ertragswert in wenigen Minuten. Mit Ihren Daten machen wir daraus eine belastbare Spanne – und auf Wunsch einen vertraulichen Verkauf."
        primary={{ label: "Anlage bewerten", href: "/rechner/bestandsanlage" }}
        secondary={{ label: "Bestand in der Börse", href: BOERSE }}
      />
    </div>
  );
}
