// src/app/warum-oekoinvest/page.js – Vergleich Marktplatz vs. Makler vs. Entwickler-Plattform

import Link from "next/link";
import {
  AlertTriangle, ArrowUpRight, BadgePercent, Calculator, Globe2, HardHat, LayoutDashboard, Megaphone, Network, Sprout, Store, UserRound, Zap,
} from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import ModellVergleich from "@/components/Vergleich/ModellVergleich";
import ModellBilanz from "@/components/Vergleich/ModellBilanz";
import NachtHero from "@/components/Unternehmen/NachtHero";
import { cn } from "@/components/ui/cn";
import { abs, KENNZAHLEN } from "@/data/site";
import { PROVISION, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = pfad("/warum-oekoinvest");
const TITEL = "Warum ÖkoInvest: Plattform-Modelle im Vergleich | ÖkoInvest";
const BESCHREIBUNG =
  "Marktplatz, Makler oder Entwickler-Plattform? Offener Vergleich der Modelle im PV-Projekthandel – was ÖkoInvest anders macht und wo unsere Grenzen liegen.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/team-praesentation.jpg"), width: 1280, height: 852, alt: "Projektteam bei einer Besprechung" }],
  },
};

const provisionKurz = `${fmt(PROVISION.verkaeufer.min * 100, 1)}⁠–⁠${fmt(PROVISION.verkaeufer.max * 100)} %`;

const SPALTEN = [
  { id: "markt", titel: "Reiner Marktplatz", sub: "Inserate von Anbietern, Plattform vermittelt Kontakt" },
  { id: "makler", titel: "Makler / Berater", sub: "Persönliche Vermittlung einzelner Projekte" },
  { id: "oi", titel: "Entwickler-Plattform", sub: "ÖkoInvest: Börse + Entwicklung, Bau und Betrieb in der Gruppe", hervorheben: true },
];

const ZEILEN = [
  {
    kriterium: "Konditionen sichtbar",
    werte: [
      { t: "Preise und Provision häufig erst nach Login, Mitgliedschaft oder Anfrage.", stufe: "teils" },
      { t: "Individuell verhandelt, selten öffentlich.", stufe: "nein" },
      { t: `Öffentlich: Verkäuferprovision ${provisionKurz}, nur bei Abschluss. Pachtspannen und Preisbänder auf der Website.`, stufe: "gut" },
    ],
  },
  {
    kriterium: "Kosten für Käufer",
    werte: [
      { t: "Je nach Anbieter Mitgliedschaft, Abo oder Käuferprovision.", stufe: "teils" },
      { t: "Oft Käufer- oder Doppelprovision.", stufe: "teils" },
      { t: "Kostenfrei – Suchprofil, NDA und Datenraum.", stufe: "gut" },
    ],
  },
  {
    kriterium: "Rechner & Rechenweg",
    werte: [
      { t: "Selten; Bewertung bleibt Sache der Parteien.", stufe: "nein" },
      { t: "Einzelbewertung im Mandat, Rechenweg meist intern.", stufe: "teils" },
      { t: "Öffentliche Rechner für Pacht, Dachpacht, Rendite, Projekt- und Bestandsbewertung – mit offenen Annahmen.", stufe: "gut" },
    ],
  },
  {
    kriterium: "Prüfung vor Veröffentlichung",
    werte: [
      { t: "Meist Angaben des Anbieters, Prüftiefe unterschiedlich.", stufe: "teils" },
      { t: "Abhängig von Makler und Mandat.", stufe: "teils" },
      { t: "Vollständigkeits- und Plausibilitätsprüfung der Kernunterlagen. Ersetzt keine Due Diligence.", stufe: "teils" },
    ],
  },
  {
    kriterium: "Entwicklung, Bau, Betrieb",
    werte: [
      { t: "Nicht Teil des Modells.", stufe: "nein" },
      { t: "Nicht Teil des Modells, teils Partnernetzwerk.", stufe: "nein" },
      { t: "In der Gruppe: Projektentwicklung, Bau (ÖKOVOLT, seit 2010), eigene Solarparks seit 2012.", stufe: "gut" },
    ],
  },
  {
    kriterium: "Status & Dokumente",
    werte: [
      { t: "Inserate und Nachrichten.", stufe: "teils" },
      { t: "E-Mail, Telefon, Datenraum je Mandat.", stufe: "teils" },
      { t: "Portal mit Status je Vorgang, Nachrichten, Dokumenten und Datenraum nach Klick-NDA.", stufe: "gut" },
    ],
  },
  {
    kriterium: "Agri-PV, Speicher, Strom",
    werte: [
      { t: "Als Inseratskategorie.", stufe: "teils" },
      { t: "Je nach Spezialisierung.", stufe: "teils" },
      { t: "Agri-PV-Modelle für Landwirte, Speicher-Projekte, virtuelles Kraftwerk und Reststrom-Pool für Unternehmen.", stufe: "gut" },
    ],
  },
  {
    kriterium: "Reichweite & Angebotsmenge",
    werte: [
      { t: "Groß – etablierte Marktplätze sind teils seit über zehn Jahren am Markt.", stufe: "gut" },
      { t: "Netzwerk des Maklers, oft sehr gezielt.", stufe: "teils" },
      { t: "Im Aufbau. Die Plattform ist jung, die Zahl der Projekte in der Börse noch überschaubar.", stufe: "nein" },
    ],
  },
];

const FAQ = [
  {
    q: "Ist ÖkoInvest ein Marktplatz oder ein Entwickler?",
    a: `Beides. Die Projektbörse funktioniert wie ein Marktplatz: Anbieter stellen Projekte ein, Investoren suchen und prüfen. Gleichzeitig entwickelt die ÖKOVOLT Gruppe selbst – rund ${KENNZAHLEN.entwicklungMwProJahr} MWp pro Jahr gehen neu in die Entwicklung – baut und betreibt eigene Solarparks. Das bringt Fachwissen in jede Prüfung, bedeutet aber auch, dass wir in manchen Fällen selbst Interessent sein können.`,
  },
  {
    q: "Gibt es einen Interessenkonflikt, wenn die Gruppe selbst entwickelt?",
    a: "Er kann entstehen – etwa wenn ein Projekt aus der eigenen Entwicklung in der Börse steht oder die Gruppe selbst an einem angebotenen Projekt interessiert ist. Fragen Sie bei jedem Projekt nach, wer Anbieter ist und ob die Gruppe beteiligt ist. Verkäufer entscheiden selbst, an wen sie verkaufen.",
  },
  {
    q: "Warum sind Ihre Konditionen öffentlich?",
    a: `Weil Flächeneigentümer, Anbieter und Investoren vor dem ersten Gespräch wissen sollten, woran sie sind. Die Verkäuferprovision beträgt ${PROVISION.verkaeufer.text}; ${PROVISION.kaeufer.text}; ${PROVISION.flaeche.text}.`,
  },
  {
    q: "Wie viele Projekte gibt es in der Börse?",
    a: "Den aktuellen Stand sehen Sie direkt in der Projektbörse. Ehrlich: Die Plattform ist jung, das Angebot wächst. Baureife Leistung aus der eigenen Entwicklung entsteht zeitversetzt, weil zwischen Flächensicherung und Baureife meist zwei bis drei Jahre liegen.",
  },
  {
    q: "Wann ist ein anderes Modell die bessere Wahl?",
    a: "Wenn Sie ein Standardprojekt möglichst breit streuen wollen, erreichen große, etablierte Marktplätze heute mehr Interessenten. Für komplexe Portfolio-Transaktionen mit umfassender M&A-Begleitung sind spezialisierte Berater oft die richtige Wahl. Wir sagen Ihnen offen, wenn wir nicht der beste Weg sind.",
  },
];

export default async function WarumOekoinvestPage({ params }) {
  await landDerSeite(params, "/warum-oekoinvest");
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Warum ÖkoInvest – Plattform-Modelle im Vergleich",
          url: abs(PFAD),
          description: BESCHREIBUNG,
          about: { "@id": `${abs("/")}/#organization` },
          inLanguage: "de-DE",
        }}
      />

      <NachtHero
        breadcrumbs={[{ name: "Warum ÖkoInvest" }]}
        eyebrow="Offener Vergleich"
        buehne={<ModellBilanz spalten={SPALTEN} zeilen={ZEILEN} />}
        title={<>Marktplatz, Makler oder <span className="ov-text-gradient-light">Entwickler-Plattform?</span></>}
        lead="Wer im PV-Projekthandel kauft, verkauft oder verpachtet, hat drei Arten von Partnern zur Auswahl. Jedes Modell hat Stärken. Hier sehen Sie offen, worin sie sich unterscheiden – und wo unsere Grenzen liegen."
        chips={["Konditionen öffentlich", "Rechner mit Rechenweg", "Entwicklung, Bau und Betrieb in der Gruppe", "Grenzen offen benannt"]}
        actions={[
          { label: "Zum Vergleich", href: "#vergleich" },
          { label: "Zur Projektbörse", href: "/projektboerse" },
        ]}
      />

      {/* Drei Modelle */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Drei Modelle"
          title="Jedes Modell löst ein anderes Problem."
          lead="Keines ist per se besser. Entscheidend ist, was Sie brauchen: Reichweite, persönliche Begleitung oder einen Partner, der ein Projekt auch selbst weiterbringen kann."
          className="mb-12"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { icon: Store, t: "Reiner Marktplatz", stark: "Große Reichweite, viele Segmente, oft lange am Markt.", grenze: "Die Plattform bewertet, entwickelt und baut nicht. Konditionen und Preise sind häufig erst nach Login sichtbar." },
            { icon: UserRound, t: "Makler / Berater", stark: "Persönliche Begleitung, gezielte Ansprache, Verhandlung im Mandat.", grenze: "Abhängig von Netzwerk und Kapazität einzelner Personen; Konditionen und Bewertung meist nicht öffentlich." },
            { icon: HardHat, t: "Entwickler-Plattform", stark: "Börse plus Fachwissen aus Entwicklung, Bau und Betrieb – mit offenen Konditionen und Rechnern.", grenze: "Junge Plattform mit noch begrenzter Reichweite; die Gruppe kann selbst Marktteilnehmer sein." },
          ].map((m, i) => (
            <Reveal
              key={m.t}
              delay={i * 80}
              className={cn("relative flex flex-col overflow-hidden rounded-3xl p-6 md:p-8", i === 2 ? "ov-verlauf-nacht text-white shadow-e4" : "bg-sand-50 ring-1 ring-ink-200/60")}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", i === 2 ? "bg-white/10 text-ov-300 ring-1 ring-white/15" : "bg-white text-ov-600 ring-1 ring-ink-200")}>
                  <m.icon aria-hidden="true" className="h-5 w-5" />
                </span>
                {i === 2 && <span className="rounded-full bg-ov-300 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">Unser Modell</span>}
              </div>
              <h3 className={cn("mt-5 font-display text-[20px] font-bold", i === 2 ? "text-white" : "text-ink-900")}>{m.t}</h3>
              <div className={cn("mt-5 rounded-2xl p-4", i === 2 ? "bg-white/[0.06] ring-1 ring-white/10" : "bg-white ring-1 ring-ink-200/60")}>
                <p className={cn("ov-overline", i === 2 ? "text-ov-300" : "text-ov-700")}>Stärke</p>
                <p className={cn("mt-1.5 text-[15px] leading-relaxed", i === 2 ? "text-white/85" : "text-ink-700")}>{m.stark}</p>
              </div>
              <div className="mt-3 px-4">
                <p className={cn("ov-overline", i === 2 ? "text-white/60" : "text-ink-500")}>Grenze</p>
                <p className={cn("mt-1.5 text-[15px] leading-relaxed", i === 2 ? "text-white/70" : "text-ink-600")}>{m.grenze}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Vergleichstabelle */}
      <Section tone="sand" space="lg" id="vergleich" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Vergleich der Modelle"
          title="Acht Kriterien, drei Modelle."
          lead="Beschrieben ist, was im jeweiligen Modell typisch ist – einzelne Anbieter können abweichen. Wir nennen bewusst keine Namen."
          className="mb-10"
        />
        <ModellVergleich spalten={SPALTEN} zeilen={ZEILEN} />
        <p className="mt-6 max-w-4xl text-[13px] leading-relaxed text-ink-500">Stand {STAND}. Eigene Einordnung auf Basis öffentlich zugänglicher Informationen über die jeweiligen Geschäftsmodelle.</p>
      </Section>

      {/* Was wir anders machen */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Was ÖkoInvest konkret anders macht"
          title="Sechs Dinge, die Sie bei uns prüfen können."
          lead="Keine Versprechen, sondern Punkte, die Sie auf dieser Website nachvollziehen – bevor Sie mit uns sprechen."
          className="mb-12"
        />
        <FeatureGrid
          cols={3}
          items={[
            { icon: BadgePercent, title: "Offene Provision", text: `Verkäuferprovision ${provisionKurz}, nur bei Abschluss. Für Käufer und Flächeneigentümer kostenfrei. Keine Listungsgebühren.`, href: "/projektboerse" },
            { icon: Calculator, title: "Rechner mit Rechenweg", text: "Pacht, Dachpacht, Solarpark-Rendite, Projekt- und Bestandsbewertung – alle Annahmen und Quellen stehen daneben.", href: pfad("/rechner") },
            { icon: HardHat, title: "Entwicklung, Bau, Betrieb", text: "Die ÖKOVOLT Gruppe baut seit 2010, betreibt eigene Solarparks seit 2012 und hat eigene Rammtechnik. Das fließt in jede Prüfung ein.", href: "/unternehmen" },
            { icon: Sprout, title: "Agri-PV-Tiefe", text: "Verpachten, selbst investieren oder über die Genossenschaft beteiligen – mit DIN SPEC 91434 und GAP-Förderfähigkeit im Blick.", href: pfad("/agri-pv") },
            { icon: Zap, title: "Virtuelles Kraftwerk & Reststrom", text: "Strom aus den Parks der Gruppe und Flexibilität aus Speichern – gebündelt für Unternehmen, die weiterhin Netzstrom brauchen.", href: pfad("/reststrom") },
            { icon: LayoutDashboard, title: "Portal mit Status", text: "Jede Anfrage wird ein Vorgang mit Status, Nachrichten und Dokumenten; Datenraum nach Klick-NDA mit protokolliertem Zugriff.", href: "/registrieren" },
          ]}
        />
      </Section>

      {/* Ehrliche Grenzen */}
      <Section tone="green" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow="Ehrliche Grenzen"
            title="Was wir (noch) nicht sind."
            lead="Ein Vergleich ohne eigene Schwächen wäre Werbung. Deshalb hier, was Sie wissen sollten."
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Megaphone, t: "Junge Plattform", x: "Die ÖkoInvest GmbH ist seit 2020 im Firmenbuch eingetragen; die Online-Plattform ist neu. Andere Marktplätze haben über Jahre Bekanntheit aufgebaut." },
              { icon: Network, t: "Reichweite im Aufbau", x: "Die Zahl registrierter Investoren und der Projekte in der Börse wächst erst. Für maximale Streuung eines Standardprojekts sind große Marktplätze heute breiter." },
              { icon: AlertTriangle, t: "Mögliche Eigeninteressen", x: "Die Gruppe entwickelt selbst und kann Anbieter oder Interessent sein. Fragen Sie bei jedem Projekt nach, ob und wie die Gruppe beteiligt ist." },
              { icon: Globe2, t: "Fokus DACH", x: "Wir arbeiten in Deutschland, Österreich und der Schweiz – nicht europaweit. Baureife Leistung aus der eigenen Entwicklung entsteht zeitversetzt über Jahre." },
            ].map((k, i) => (
              <Reveal as="li" key={k.t} delay={i * 60} className="rounded-3xl bg-white p-5 ring-1 ring-ov-100 md:p-6">
                <div className="flex items-center gap-3">
                  <k.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-ov-600" />
                  <p className="font-display text-[16.5px] font-bold text-ink-900">{k.t}</p>
                </div>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* Segmente */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Alle Segmente"
          title="Wofür Sie ÖkoInvest nutzen können."
          lead="Von der Fläche bis zur laufenden Anlage – jeweils mit eigener Seite, Rechner und Anfrage."
          className="mb-10"
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: pfad("/flaeche-verpachten"), t: "Grundstück verpachten", x: "Acker, Grünland, Konversion" },
            { href: pfad("/dachflaeche-verpachten"), t: "Dachfläche verpachten", x: "Gewerbe, Halle, Landwirtschaft, Logistik" },
            { href: pfad("/agri-pv"), t: "Agri-PV", x: "Weiter bewirtschaften, zusätzlich Strom" },
            { href: "/projektboerse", t: "Projektrechte & RTB", x: "Von der Flächensicherung bis baureif" },
            { href: pfad("/bestandsanlagen"), t: "Bestandsanlagen", x: "Laufende Anlagen kaufen und verkaufen" },
            { href: pfad("/grossspeicher"), t: "Großspeicher", x: "Eigenständig oder am Solarpark" },
            { href: pfad("/solarcarport"), t: "Solarcarports", x: "Parkflächen mit Strom und Ladepunkten" },
            { href: pfad("/reststrom"), t: "Reststrom-Pool", x: "Strom für Unternehmen gebündelt" },
          ].map((s, i) => (
            <Reveal as="li" key={s.href} delay={i * 40} className="flex">
              <Link href={s.href} className="group ov-card-hover flex w-full items-start justify-between gap-3 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 hover:bg-white">
                <span>
                  <span className="block font-display text-[16.5px] font-bold text-ink-900">{s.t}</span>
                  <span className="mt-1 block text-[14px] text-ink-600">{s.x}</span>
                </span>
                <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-400 transition-colors group-hover:text-ov-600" />
              </Link>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Fragen zum Modell" lead="Ihre Frage ist nicht dabei? Stellen Sie sie über das Kontaktformular – wir antworten persönlich." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/projektboerse", titel: "Projektbörse", text: "Projekte in allen Phasen – anonymer Teaser, Details nach NDA." },
          { href: pfad("/rechner"), titel: "Rechner & Tools", text: "Alle Rechner mit offenen Annahmen und Quellen." },
          { href: "/unternehmen", titel: "Unternehmen", text: "ÖkoInvest und die ÖKOVOLT Gruppe – wer hinter der Plattform steht." },
        ]}
      />

      <CtaBand
        eyebrow="Selbst prüfen"
        title="Überzeugen Sie sich mit Zahlen, nicht mit Werbung."
        text="Rechnen Sie Ihr Projekt, Ihre Fläche oder Ihre Anlage durch – ohne Anmeldung. Wenn es passt, sprechen wir über den nächsten Schritt."
        primary={{ label: "Zu den Rechnern", href: pfad("/rechner") }}
        secondary={{ label: "Zur Projektbörse", href: "/projektboerse" }}
      />
    </div>
  );
}

export const generateMetadata = landMetadata("/warum-oekoinvest", metadata);
