// src/app/agri-pv/page.js – Agri-PV fachlich tief

import { Apple, Beef, CloudHail, Droplets, Egg, Landmark, Layers, Scale, Sprout, Sun, ThermometerSun, Tractor, Wheat } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import AgriBild from "@/components/Agri/AgriBild";
import { abs } from "@/data/site";
import { AGRI, BAUART, ERLOESE, FREIFLAECHE, PACHT, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/agri-pv";
const TITEL = "Agri-PV nach DIN SPEC 91434: Systeme & Recht | ÖkoInvest";
const BESCHREIBUNG =
  "Agri-PV fachlich erklärt: Kategorien der DIN SPEC 91434, vertikale, hoch aufgeständerte und nachgeführte Systeme, Kulturen, GAP, Baurecht, EEG-Förderung, Kosten.";

export const metadata = {
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
    images: [{ url: abs("/img/solarpark-reihen.jpg"), width: 1280, height: 852, alt: "Modulreihen auf landwirtschaftlicher Fläche" }],
  },
};

const pct = (v) => `${fmt(v * 100)} %`;

const SYSTEME = [
  {
    typ: "vertikal",
    titel: "Vertikal, bifazial",
    kat: "Kategorie II · bodennah",
    text: "Senkrechte, beidseitig aktive Module in Ost-West-Ausrichtung als „Solarzaun“. Dazwischen breite Gassen für Mähdrescher und Sämaschine. Erzeugt morgens und abends – dann, wenn Strom oft mehr wert ist.",
  },
  {
    typ: "hoch",
    titel: "Hoch aufgeständert",
    kat: "Kategorie I · lichte Höhe ≥ 2,1 m",
    text: "Ein Moduldach auf hohen Stützen, unter dem bewirtschaftet wird. Ideal für Obst, Beeren und Sonderkulturen: Die Module ersetzen teilweise Hagelnetz oder Folie.",
  },
  {
    typ: "tracker",
    titel: "Einachsig nachgeführt",
    kat: "Kategorie II · je nach Höhe auch I",
    text: "Die Module drehen sich mit der Sonne und können für die Bewirtschaftung senkrecht gestellt werden. Hoher Ertrag je kWp, aber mehr Technik und Wartung.",
  },
  {
    typ: "bodennah",
    titel: "Bodennah mit Beweidung",
    kat: "Kategorie II · Grünland",
    text: "Schräg aufgeständerte Tische mit größerem Reihenabstand auf Grünland. Schafe, Geflügel und – bei höherer Aufständerung – Rinder nutzen Fläche und Schatten.",
  },
];

const TABELLE = {
  kopf: ["", "Vertikal, bifazial", "Hoch aufgeständert", "Nachgeführt", "Bodennah + Weide"],
  zeilen: [
    ["DIN-SPEC-Kategorie", "II", "I", "II (teils I)", "II"],
    ["Bewirtschaftung", "zwischen den Reihen", "unter den Modulen", "zwischen den Reihen", "Weide/Mahd unter und zwischen"],
    ["Typische Kulturen", "Getreide, Raps, Mais, Grünland", "Obst, Beeren, Gemüse, Wein", "Ackerbau, Gemüse", "Grünland, Schafe, Geflügel"],
    ["Fläche je MWp", `ca. ${fmt(BAUART.agriVertikal.haProMwp, 1)} ha`, `ca. ${fmt(BAUART.agriHoch.haProMwp, 1)} ha`, `ca. ${fmt(BAUART.tracker.haProMwp, 1)} ha`, "ca. 1,5–2 ha"],
    ["Stromertrag je kWp*", pct(BAUART.agriVertikal.faktor), pct(BAUART.agriHoch.faktor), pct(BAUART.tracker.faktor), "ca. 95 %"],
    ["Investition", `${fmt(AGRI.capexProKwp.vertikal.min)}–${fmt(AGRI.capexProKwp.vertikal.max)} €/kWp`, `${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)} €/kWp`, "zwischen beiden", "nahe Freifläche"],
    ["Flächenverlust (DIN SPEC)", `≤ ${pct(AGRI.flaechenverlustMaxKat2)}`, `≤ ${pct(AGRI.flaechenverlustMaxKat1)}`, `≤ ${pct(AGRI.flaechenverlustMaxKat2)}`, `≤ ${pct(AGRI.flaechenverlustMaxKat2)}`],
    ["Stärken", "günstig, maschinenfreundlich, Stromprofil morgens/abends", "Schutz vor Hagel, Sonnenbrand, Starkregen", "höchster Ertrag, flexibel stellbar", "einfach, bewährt, Tierwohl durch Schatten"],
    ["Grenzen", "Windlast, Schattenstreifen", "hohe Kosten, Statik", "Technik und Wartung", "nur für Weide/Grünland"],
  ],
};

const FAQ = [
  {
    q: "Was unterscheidet Agri-PV von einem normalen Solarpark?",
    a: `Bei Agri-PV bleibt die landwirtschaftliche Nutzung Hauptnutzung. Die DIN SPEC 91434 verlangt ein Nutzungskonzept, begrenzt den Flächenverlust durch Aufbauten (Kategorie I höchstens ${pct(AGRI.flaechenverlustMaxKat1)}, Kategorie II höchstens ${pct(AGRI.flaechenverlustMaxKat2)}) und fordert, dass mindestens ${pct(AGRI.mindestErtrag)} des Referenzertrags erhalten bleiben. Ein klassischer Solarpark nutzt die Fläche dagegen überwiegend zur Stromerzeugung.`,
  },
  {
    q: "Welche Kulturen eignen sich für Agri-PV?",
    a: "Unter hoch aufgeständerten Anlagen vor allem Kulturen, die Schatten vertragen oder von Schutz profitieren: Beeren, Kernobst, Kirschen, Salate, Kräuter, teils Kartoffeln. Zwischen vertikalen Reihen lassen sich Getreide, Raps, Mais und Grünland mit normaler Technik bewirtschaften. Mais und andere lichtbedürftige Kulturen reagieren unter Moduldächern eher mit Mindererträgen.",
  },
  {
    q: "Bleiben die GAP-Direktzahlungen erhalten?",
    a: `In Deutschland bleiben Flächen mit Agri-PV nach DIN SPEC 91434 in der Regel beihilfefähig – mit einem pauschalen Abzug für die Anlagenfläche; rechnerisch sind ${pct(AGRI.gapFoerderfaehig)} der Fläche förderfähig. Voraussetzung ist, dass die Bewirtschaftung mit üblichen Methoden und Maschinen möglich bleibt. Klären Sie Details und Öko-Regelungen vorab mit dem Landwirtschaftsamt.`,
  },
  {
    q: "Wie hoch muss eine Agri-PV-Anlage sein?",
    a: "Für Kategorie I (Bewirtschaftung unter den Modulen) nennt die DIN SPEC 91434 eine lichte Höhe von mindestens 2,10 m. In der Praxis richten wir Höhe und Reihenabstand nach Ihren Maschinen: Durchfahrtshöhe, Arbeitsbreite und Wendekreis entscheiden über das Layout.",
  },
  {
    q: "Braucht Agri-PV einen Bebauungsplan?",
    a: `Nicht immer: Agri-PV bis ${fmt(AGRI.privilegierungHa, 1)} ha Grundfläche im räumlich-funktionalen Zusammenhang mit einem land- oder forstwirtschaftlichen Betrieb ist im Außenbereich privilegiert – eine Anlage je Hofstelle (§ 35 Abs. 1 Nr. 9 BauGB). Größere Anlagen erfordern in der Regel einen Bebauungsplan. In Österreich und der Schweiz gelten eigene Regeln.`,
  },
  {
    q: "Lohnt sich Agri-PV wirtschaftlich?",
    a: `Agri-PV ist teurer als ein klassischer Solarpark – vertikale Systeme liegen bei ${fmt(AGRI.capexProKwp.vertikal.min)}–${fmt(AGRI.capexProKwp.vertikal.max)} €/kWp, hoch aufgeständerte bei ${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)} €/kWp, gegenüber ${fmt(FREIFLAECHE.capexProKwp.min)}–${fmt(FREIFLAECHE.capexProKwp.max)} €/kWp beim Solarpark. Dafür ist Agri-PV auch auf Ackerflächen EEG-förderfähig, die Ernte bleibt und oft auch der größte Teil der GAP-Zahlung. Der Agri-PV-Rechner zeigt die Wege mit Ihren Zahlen.`,
  },
];

export default function AgriPvPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Projektentwicklung Agri-Photovoltaik",
            serviceType: "Planung, Genehmigung, Bau und Betrieb von Agri-PV-Anlagen nach DIN SPEC 91434",
            provider: { "@id": `${abs("/")}/#organization` },
            areaServed: ["DE", "AT", "CH"],
            url: abs(PFAD),
            description: BESCHREIBUNG,
          }),
        }}
      />

      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Agri-PV" }]}
        eyebrow="Agri-Photovoltaik · DIN SPEC 91434"
        title={<>Zwei Ernten <span className="ov-text-gradient-light">auf einem Feld.</span></>}
        lead="Agri-PV verbindet Landwirtschaft und Stromerzeugung auf derselben Fläche. Richtig geplant schützt sie Kulturen, spart Wasser und bringt ein zweites Einkommen – und die Landwirtschaft bleibt Hauptnutzung."
        actions={[
          { label: "Agri-PV-Rechner", href: "/rechner/agri-pv" },
          { label: "Die vier Wege für Landwirte", href: "/landwirte" },
        ]}
        points={["Kategorie I & II", "GAP-förderfähig", "EEG-förderfähig"]}
      >
        <div className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SYSTEME.map((s, i) => (
            <div key={s.typ} className="ov-hero-in overflow-hidden rounded-2xl ring-1 ring-white/10" style={{ "--ov-delay": `${420 + i * 80}ms` }}>
              <AgriBild typ={s.typ} className="block h-auto w-full" />
              <p className="bg-white/[0.06] px-3 py-2 text-[12.5px] font-semibold text-white/85">{s.titel}</p>
            </div>
          ))}
        </div>
      </PageHero>

      {/* DIN SPEC */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            eyebrow="DIN SPEC 91434"
            title="Wann eine Anlage als Agri-PV gilt."
            lead="Die DIN SPEC 91434 (2021) ist in Deutschland die Grundlage für Förderfähigkeit in der GAP, die EEG-Förderung als besondere Solaranlage und die baurechtliche Privilegierung. Sie verlangt ein landwirtschaftliches Nutzungskonzept – vor der Planung der Module."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { k: "Kategorie I", t: "Hoch aufgeständert", p: [`Bewirtschaftung unter den Modulen`, `lichte Höhe mind. 2,10 m`, `Flächenverlust ≤ ${pct(AGRI.flaechenverlustMaxKat1)}`] },
              { k: "Kategorie II", t: "Bodennah", p: [`Bewirtschaftung zwischen den Reihen`, `vertikal, nachgeführt oder geneigt`, `Flächenverlust ≤ ${pct(AGRI.flaechenverlustMaxKat2)}`] },
            ].map((c, i) => (
              <Reveal key={c.k} delay={i * 80} className="rounded-3xl bg-ov-50 p-6 ring-1 ring-ov-200 md:p-7">
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ov-700">{c.k}</p>
                <p className="mt-2 font-display text-[21px] font-extrabold text-ink-900">{c.t}</p>
                <ul className="mt-4 space-y-2">
                  {c.p.map((x) => (
                    <li key={x} className="flex gap-2 text-[15px] text-ink-700">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                      {x}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
            <Reveal delay={160} className="rounded-3xl bg-navy-950 p-6 text-white sm:col-span-2 md:p-7">
              <p className="font-display text-[18px] font-bold">Für beide Kategorien</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">
                Der landwirtschaftliche Ertrag muss mindestens <strong className="text-white">{pct(AGRI.mindestErtrag)} des Referenzertrags</strong> ohne Anlage erreichen, die Bewirtschaftung mit üblicher Technik muss möglich bleiben, und der Rückbau muss gesichert sein. Für die Nutzung mit Tieren und für Dauerkulturen gelten ergänzende Anforderungen.
              </p>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Systeme */}
      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="Systeme" title="Vier Bauweisen – die Kultur entscheidet." lead="Erst kommt die landwirtschaftliche Nutzung, dann das System. Diese vier Bauweisen decken die meisten Betriebe ab." className="mb-12" />
        <div className="grid gap-5 md:grid-cols-2">
          {SYSTEME.map((s, i) => (
            <Reveal key={s.typ} delay={i * 70} className="overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70">
              <AgriBild typ={s.typ} className="block h-auto w-full" />
              <div className="p-6 md:p-7">
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ov-700">{s.kat}</p>
                <h3 className="ov-h3 mt-2 text-ink-900">{s.titel}</h3>
                <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Vergleichstabelle */}
        <Reveal className="mt-12 overflow-x-auto rounded-3xl bg-white ring-1 ring-ink-200/70">
          <table className="w-full min-w-[860px] border-collapse text-left text-[14.5px]">
            <caption className="sr-only">Agri-PV-Systeme im Vergleich</caption>
            <thead>
              <tr className="bg-navy-950 text-white">
                {TABELLE.kopf.map((k, i) => (
                  <th key={k || i} scope="col" className="px-5 py-4 font-display text-[15px] font-bold">{k || <span className="sr-only">Merkmal</span>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABELLE.zeilen.map(([label, ...werte], i) => (
                <tr key={label} className={i % 2 ? "bg-sand-50" : "bg-white"}>
                  <th scope="row" className="px-5 py-3.5 align-top font-semibold text-ink-800">{label}</th>
                  {werte.map((w, j) => (
                    <td key={j} className="px-5 py-3.5 align-top leading-snug text-ink-600">{w}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <p className="mt-3 text-[12.5px] text-ink-500 md:hidden">Tabelle seitlich wischen, um alle Systeme zu sehen.</p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-500">* Stromertrag je kWp gegenüber einer fest nach Süden aufgeständerten Freiflächenanlage. Orientierungswerte, Stand {STAND}; Standort, Layout und Kultur verschieben die Werte deutlich.</p>
      </Section>

      {/* Kulturen & Tiere */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Kulturen & Tierhaltung" title="Was unter und zwischen den Modulen wächst." className="mb-12" />
        <FeatureGrid
          cols={3}
          items={[
            { icon: Apple, title: "Obst & Beeren", text: "Hoch aufgeständert als Hagel- und Regenschutz. Weniger Sonnenbrand, trockeneres Laub, oft weniger Pflanzenschutz – teils mit Mindererträgen durch Schatten." },
            { icon: Sprout, title: "Gemüse & Kräuter", text: "Salate, Spinat, Kräuter und viele Gemüse vertragen Halbschatten gut und profitieren in Hitzesommern von geringerem Wasserstress." },
            { icon: Wheat, title: "Ackerbau", text: "Zwischen vertikalen Reihen mit üblicher Technik: Gassenbreite nach Arbeitsbreite von Sämaschine, Spritze und Mähdrescher." },
            { icon: Tractor, title: "Grünland & Futterbau", text: "Mahd zwischen den Reihen, Heu und Silage wie gewohnt. Bodennahe Systeme eignen sich besonders." },
            { icon: Beef, title: "Weidetiere", text: "Schafe unter bodennahen Anlagen; Rinder nur bei hoher, robuster Aufständerung. Schatten verbessert das Tierwohl an heißen Tagen." },
            { icon: Egg, title: "Freiland-Geflügel", text: "Module bieten Deckung vor Greifvögeln – Hühner nutzen den Auslauf dadurch gleichmäßiger." },
          ]}
        />
      </Section>

      {/* Vorteile */}
      <Section tone="navy" space="lg" className="ov-noise overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div className="relative">
          <SectionHeading
            dark
            eyebrow="Vorteile"
            title="Mehr aus jedem Hektar."
            lead="Die Pilotanlage Heggelbach des Fraunhofer ISE erreichte eine Landnutzungseffizienz von 160 % – im Hitzesommer 2018 sogar 186 %: Strom und Ernte zusammen brachten deutlich mehr als dieselbe Fläche getrennt genutzt."
            className="mb-12"
          />
          <FeatureGrid
            tone="dark"
            cols={4}
            items={[
              { icon: CloudHail, title: "Hagel- & Sonnenschutz", text: "Das Moduldach schützt Kulturen vor Hagel, Starkregen und Sonnenbrand – ein wachsender Wert im Klimawandel." },
              { icon: Droplets, title: "Weniger Verdunstung", text: "Teilbeschattung senkt die Bodentemperatur und die Verdunstung. In trockenen Jahren kann das den Ertrag stabilisieren." },
              { icon: Layers, title: "Doppelernte", text: "Lebensmittel und Strom von derselben Fläche – ohne landwirtschaftliche Fläche dauerhaft aufzugeben." },
              { icon: Scale, title: "Mehr je Hektar", text: "Mehr Gesamtertrag je Hektar als getrennte Nutzung – das stärkt die Akzeptanz in Gemeinde und Region." },
            ]}
          />
        </div>
      </Section>

      {/* Recht & Förderung */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="GAP, Baurecht, EEG"
          title="Die Rahmenbedingungen in Deutschland – und wie es in AT und CH aussieht."
          lead="Agri-PV ist politisch gewollt. Die Details sind aber verteilt auf Agrar-, Bau- und Energierecht – wir bringen sie für Ihre Fläche zusammen."
          className="mb-12"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Wheat, t: "GAP-Direktzahlungen", x: `Agri-PV-Flächen nach DIN SPEC 91434 bleiben in der Regel beihilfefähig, wenn die Bewirtschaftung mit üblichen Maschinen möglich bleibt und der Flächenverlust höchstens 15 % beträgt – rechnerisch ${pct(AGRI.gapFoerderfaehig)} der Fläche.` },
            { icon: Landmark, t: "Baurecht (§ 35 BauGB)", x: `Privilegiert im Außenbereich sind Agri-PV-Anlagen bis ${fmt(AGRI.privilegierungHa, 1)} ha Grundfläche im räumlich-funktionalen Zusammenhang mit einem Betrieb – eine je Hofstelle. Darüber hinaus in der Regel Bebauungsplan.` },
            { icon: Sun, t: "EEG: besondere Solaranlagen", x: `Agri-PV gilt im EEG als besondere Solaranlage und ist – anders als ein Solarpark – auch auf Ackerflächen außerhalb der Kulisse förderfähig. Ein eigenes Untersegment mit höherem Höchstwert ist vorgesehen, war nach aktuellem Stand aber noch nicht beihilferechtlich freigegeben; Agri-PV bietet daher im ersten Segment mit. Hoch aufgeständerte Anlagen erhalten einen Bonus von ${fmt(ERLOESE.eegBesondereCt - ERLOESE.eegFreiflaecheCt, 1)} ct/kWh.` },
            { icon: ThermometerSun, t: "Flächenkulisse", x: "Anders als klassische Solarparks sind Agri-PV-Anlagen auf Ackerflächen nicht auf benachteiligte Gebiete oder Randstreifen beschränkt. Moorböden und Schutzgebiete bleiben ausgenommen; für Grünland gelten Einschränkungen." },
            { icon: Landmark, t: "Österreich", x: "Agri-PV braucht in der Regel eine passende Widmung nach Landesraumordnung; mehrere Bundesländer erleichtern Agri-PV gegenüber reinen Freiflächenanlagen. Förderung über das EAG – Details je Förderaufruf." },
            { icon: Landmark, t: "Schweiz", x: "Außerhalb der Bauzone ist Agri-PV bewilligungsfähig, wenn sie Vorteile für die landwirtschaftliche Produktion bewirkt oder Versuchszwecken dient (Raumplanungsverordnung); die Regeln wurden 2026 angepasst. Kantonale Fachstellen früh einbinden." },
          ].map((k, i) => (
            <Reveal key={k.t} delay={i * 50} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
              <k.icon aria-hidden="true" className="h-6 w-6 text-ov-600" />
              <p className="mt-4 font-display text-[17.5px] font-bold text-ink-900">{k.t}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{k.x}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 max-w-4xl text-[13.5px] leading-relaxed text-ink-500">Stand {STAND}, ohne Gewähr und ohne Rechtsberatung. Förder- und Planungsrecht ändern sich häufig – wir prüfen die aktuelle Lage für Ihren Standort und stimmen uns mit Landwirtschaftsamt und Gemeinde ab.</p>
      </Section>

      {/* Wirtschaftlichkeit */}
      <Section tone="green" space="lg">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <SectionHeading
            eyebrow="Wirtschaftlichkeit"
            title="Teurer als ein Solarpark – aber die Ernte bleibt."
            lead="Agri-PV braucht mehr Stahl und mehr Fläche je Megawatt. Die EEG-Förderung auch auf Ackerflächen, die weiterlaufende Ernte und die GAP-Zahlung gleichen einen Teil davon aus. Ehrlich gesagt: Hoch aufgeständerte Systeme rechnen sich meist nur bei wertvollen Sonderkulturen."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Solarpark (Vergleich)", `${fmt(FREIFLAECHE.capexProKwp.min)}–${fmt(FREIFLAECHE.capexProKwp.max)} €/kWp`, `${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp`],
              ["Agri-PV vertikal", `${fmt(AGRI.capexProKwp.vertikal.min)}–${fmt(AGRI.capexProKwp.vertikal.max)} €/kWp`, `${fmt(BAUART.agriVertikal.haProMwp, 1)} ha je MWp`],
              ["Agri-PV hoch aufgeständert", `${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)} €/kWp`, `${fmt(BAUART.agriHoch.haProMwp, 1)} ha je MWp`],
              ["Pacht Agri-PV", `${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)} €/ha`, "plus Ernte und GAP"],
            ].map(([k, v, z], i) => (
              <Reveal key={k} delay={i * 60} className={i === 3 ? "rounded-2xl bg-ov-600 p-5 text-white" : "rounded-2xl bg-white p-5 ring-1 ring-ov-100"}>
                <p className={i === 3 ? "text-[13px] text-white" : "text-[13px] text-ink-500"}>{k}</p>
                <p className="ov-num mt-1 font-display text-[22px] font-extrabold tracking-tight">{v}</p>
                <p className={i === 3 ? "mt-0.5 text-[12.5px] text-white" : "mt-0.5 text-[12.5px] text-ink-500"}>{z}</p>
              </Reveal>
            ))}
            <div className="sm:col-span-2">
              <Button href="/rechner/agri-pv" variant="navy" pfeil>
                Mit eigenen Zahlen rechnen
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Agri-PV – gut zu wissen" lead="Ihre Frage ist nicht dabei? Schreiben Sie uns über die Landwirte-Seite – wir antworten persönlich." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/landwirte", titel: "Für Landwirte", text: "Verpachten, selbst investieren, Investor oder Genossenschaft – mit Entscheidungshilfe." },
          { href: "/rechner/agri-pv", titel: "Agri-PV-Rechner", text: "Drei Wege mit IRR, Amortisation, GAP und Deckungsbeitrag." },
          { href: "/freiflaeche", titel: "Freiflächen-PV", text: "Wenn die Fläche ganz für einen Solarpark genutzt werden soll." },
          { href: "/flaechencheck", titel: "Flächencheck", text: "Eignung und Leistung Ihrer Fläche in zwei Minuten." },
        ]}
      />

      <CtaBand
        eyebrow="Agri-PV mit Plan"
        title="Erst die Landwirtschaft, dann die Module."
        text="Wir entwickeln Ihr Nutzungskonzept mit Ihnen, planen normgerecht nach DIN SPEC 91434 und begleiten Genehmigung, Bau und Betrieb."
        primary={{ label: "Welcher Weg passt?", href: "/landwirte" }}
        secondary={{ label: "Agri-PV-Rechner", href: "/rechner/agri-pv" }}
      />
    </div>
  );
}
