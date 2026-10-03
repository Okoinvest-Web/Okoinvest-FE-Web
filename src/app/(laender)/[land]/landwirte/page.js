// src/app/landwirte/page.js – Landwirte & Agri-PV: die vier Wege

import { BatteryCharging, CalendarClock, CloudHail, Compass, Scale, ShieldCheck, Sprout, TrendingUp, Users, Warehouse, Wheat } from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import JsonLd from "@/components/JsonLd";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import WegeEntscheider from "@/components/Agri/WegeEntscheider";
import AgriBild from "@/components/Agri/AgriBild";
import { WEGE } from "@/components/Agri/wege";
import AgriHero from "@/components/Agri/Seite/AgriHero";
import WegeBuehne from "@/components/Agri/Seite/WegeBuehne";
import WegeKarten from "@/components/Agri/Seite/WegeKarten";
import Faktenleiste from "@/components/Agri/Seite/Faktenleiste";
import Sprungleiste from "@/components/Agri/Seite/Sprungleiste";
import { abs } from "@/data/site";
import { AGRI, PACHT, STAND, STROM } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = pfad("/landwirte");
const TITEL = "Agri-PV für Landwirte: vier Wege zum Solarstrom | ÖkoInvest";
const BESCHREIBUNG =
  "Fläche verpachten, selbst investieren, Investor baut oder Genossenschaft: die vier Wege zu Agri-PV für Landwirte im Vergleich – mit Entscheidungshilfe.";

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
    images: [{ url: abs("/img/freiflaeche-begehung.jpg"), width: 1280, height: 852, alt: "Begehung einer landwirtschaftlichen Fläche" }],
  },
};

const ZEILEN = [
  ["Eigene Investition", "invest"],
  ["Einnahmen", "einnahmen"],
  ["Risiko", "risiko"],
  ["Landwirtschaft", "bewirtschaftung"],
  ["Ihr Aufwand", "aufwand"],
  ["Passt für", "fuer"],
];

const GRUENDE = [
  { icon: TrendingUp, title: "Zweites Standbein", text: "Eine feste Pacht fließt jährlich – unabhängig von Ernte und Getreidepreis. Stromerlöse schwanken mit Sonne und Strompreis, aber nicht mit der Ernte." },
  { icon: Scale, title: "Risikostreuung", text: "Strom und Ernte auf derselben Fläche: Fällt eines schwächer aus, trägt das andere. Die Fläche bleibt Ihr Betriebsmittel." },
  { icon: CloudHail, title: "Schutz für Kulturen", text: "Hoch aufgeständerte Module schützen Obst und Beeren vor Hagel, Starkregen und Sonnenbrand; der Boden verdunstet weniger Wasser." },
  { icon: BatteryCharging, title: "Eigenstrom für den Hof", text: "Melktechnik, Kühlung, Lüftung, Trocknung: Bei hofnahen Anlagen kann Solarstrom direkt im Betrieb genutzt werden." },
  { icon: Warehouse, title: "Hofnachfolge stärken", text: "Ein planbares Zusatzeinkommen macht den Betrieb für die nächste Generation attraktiver – ohne die Fläche abzugeben." },
  { icon: Users, title: "Akzeptanz im Dorf", text: "Agri-PV erhält die Landwirtschaft sichtbar. Über eine Energiegenossenschaft könnten Nachbarn und Gemeinde mitverdienen – unsere ist in Vorbereitung." },
];

const SCHRITTE = [
  "Fläche, Kulturen, Maschinenbreiten und Netz – wir prüfen alles vorab",
  "Wir stimmen uns mit Landwirtschaftsamt und Gemeinde ab",
  "Status, Unterlagen und Nachrichten später im Portal",
];

const FAQ = [
  {
    q: "Welcher der vier Wege bringt am meisten?",
    a: "Je Hektar bringt die Pacht für einen klassischen Solarpark meist die höchste feste Zahlung – dafür endet die Bewirtschaftung. Bei Agri-PV ist die Pacht niedriger, Sie ernten aber weiter und behalten den größten Teil der Direktzahlungen. Eine Eigeninvestition hat die höchsten Chancen, aber auch das unternehmerische Risiko. Der Agri-PV-Rechner stellt die Wege mit Ihren Zahlen nebeneinander.",
  },
  {
    q: "Verliere ich mit Agri-PV meine Direktzahlungen?",
    a: `In Deutschland in der Regel nicht vollständig: Flächen mit Agri-PV nach DIN SPEC 91434 bleiben unter Voraussetzungen beihilfefähig, üblicherweise mit einem Abzug für die durch die Anlage nicht nutzbare Fläche – rechnerisch bleiben etwa ${fmt(AGRI.gapFoerderfaehig * 100)} % förderfähig. Maßgeblich sind die aktuellen GAP-Regeln; klären Sie den Einzelfall vorab mit Ihrem Landwirtschaftsamt.`,
  },
  {
    q: "Wie funktioniert die Beteiligung über die Genossenschaft?",
    a: "Die Anlage gehört ganz oder teilweise einer Energiegenossenschaft. Mitglieder zeichnen Anteile und erhalten neben der Pacht gegebenenfalls eine Ausschüttung, deren Höhe von Ertrag und Beschlüssen der Generalversammlung abhängt – eine feste Zusage gibt es nicht, Anteile können an Wert verlieren. Nachbarn und Gemeinde können ebenfalls Mitglied werden. Jedes Mitglied hat in der Regel eine Stimme, unabhängig von der Zahl der Anteile. Wichtig: Unsere Genossenschaft ist in Vorbereitung; Anteile können noch nicht gezeichnet werden.",
  },
  {
    q: "Kann ich den Strom selbst auf dem Hof nutzen?",
    a: `Das hängt vom Anschlusskonzept ab. Liegt die Anlage nah am Hof und gehört Ihnen (Weg B), kann ein Teil des Stroms direkt in Stall, Kühlung oder Trocknung fließen. Land- und forstwirtschaftliche Betriebe profitieren zudem seit 2026 von der auf ${fmt(STROM.stromsteuerProduzierend, 2)} ct/kWh gesenkten Stromsteuer. Bei großen Anlagen wird der Strom meist vollständig eingespeist und direkt vermarktet.`,
  },
  {
    q: "Brauche ich für Agri-PV einen Bebauungsplan?",
    a: `Nicht immer. Agri-PV-Anlagen bis ${fmt(AGRI.privilegierungHa, 1)} ha Grundfläche im räumlich-funktionalen Zusammenhang mit einem landwirtschaftlichen Betrieb sind im Außenbereich privilegiert (§ 35 BauGB) – eine Anlage je Hofstelle. Größere Anlagen brauchen in der Regel einen Bebauungsplan der Gemeinde.`,
  },
  {
    q: "Was bedeutet Agri-PV für Hofnachfolge und Erbschaft?",
    a: "Eine Agri-PV-Anlage kann die Hofnachfolge stärken: Sie bringt ein zweites Einkommen, das nicht von der Ernte abhängt – bei Festpacht weitgehend planbar –, und die Fläche bleibt landwirtschaftlich genutzt. Steuerlich ist Agri-PV oft günstiger zu gestalten als ein klassischer Solarpark, weil die landwirtschaftliche Nutzung erhalten bleibt – die Details sind aber komplex und sollten mit der Steuerberatung geklärt werden.",
  },
];

export default async function LandwirtePage({ params }) {
  await landDerSeite(params, "/landwirte");
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Agri-PV und Solarprojekte für landwirtschaftliche Betriebe",
          provider: { "@id": `${abs("/")}/#organization` },
          areaServed: ["DE", "AT", "CH"],
          audience: { "@type": "Audience", audienceType: "Landwirtinnen und Landwirte" },
          url: abs(PFAD),
          description: BESCHREIBUNG,
        }}
      />

      <AgriHero
        breadcrumbs={[{ name: "Für Landwirte" }]}
        pill={{ href: "#entscheider", marke: "Tipp", text: "Entscheidungshilfe: Welcher Weg passt zu Ihrem Betrieb?", textKurz: "Welcher Weg passt zu Ihnen?" }}
        titel={
          <>
            Agri-PV: Die Ernte bleibt. <span className="ov-text-gradient-light">Strom kommt dazu.</span>
          </>
        }
        lead="Agri-PV macht Ihre Fläche zum zweiten Standbein – ohne die Landwirtschaft aufzugeben. Verpachten, selbst investieren, einen Investor bauen lassen oder über eine Genossenschaft mitverdienen (unsere ist in Vorbereitung): Sie wählen den Weg, wir setzen ihn um."
        aktionen={[
          { label: "Welcher Weg passt?", href: "#entscheider" },
          { label: "Agri-PV-Rechner", href: pfad("/rechner/agri-pv") },
        ]}
        unterzeile="Für Landwirte kostenfrei · fünf Fragen, eine Empfehlung mit Begründung"
        punkte={["Nach DIN SPEC 91434", "GAP bleibt größtenteils", "Deutschland, Österreich und Schweiz", "Von der Idee bis zum Betrieb"]}
        buehne={
          <WegeBuehne
            bild={{ src: "/img/freiflaeche-begehung.jpg", alt: "Begehung einer landwirtschaftlichen Fläche mit Photovoltaik", position: "center 55%" }}
            notiz={{ marke: "Wege B–D", titel: "Sie ernten weiter", text: "auf rund 85–90 % der Fläche" }}
          />
        }
      />

      <Faktenleiste
        titel="Agri-PV für Landwirte: Richtwerte"
        fakten={[
          { icon: Compass, wert: "4", einheit: "Wege", text: "Verpachten, selbst investieren, Investor oder Genossenschaft" },
          { icon: Wheat, wert: "85–90", suffix: "%", einheit: "Fläche bewirtschaftet", text: "bei Agri-PV (Wege B–D) bleibt der Großteil in Ihrer Hand" },
          { icon: ShieldCheck, wert: fmt(AGRI.gapFoerderfaehig * 100), suffix: "%", einheit: "GAP-förderfähig", text: "der Fläche bleiben in Deutschland rechnerisch beihilfefähig" },
          { icon: CalendarClock, wert: "30", suffix: "Jahre", einheit: "Laufendes Einkommen", text: "aus Pacht oder Strom – unabhängig von der Ernte, Stromerlöse aber abhängig von Sonne und Strompreis" },
        ]}
      />

      <Sprungleiste
        ziele={[
          { href: "#wege", label: "Die vier Wege" },
          { href: "#vergleich", label: "Vergleich" },
          { href: "#warum", label: "Warum Agri-PV" },
          { href: "#entscheider", label: "Entscheidungshilfe" },
          { href: "#anfrage", label: "Anfrage" },
          { href: "#fragen", label: "Fragen" },
        ]}
      />

      {/* Vier Wege */}
      <Section tone="white" space="lg" id="wege" className="scroll-mt-24">
        <div className="mb-10 grid gap-x-16 gap-y-6 md:mb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <SectionHeading eyebrow="Die vier Wege" title="Vier Wege – ein Ziel: Ihr Hof verdient mit." />
          <Reveal delay={80}>
            <p className="ov-lead text-pretty text-ink-600">Jeder Weg hat seine Stärken. Viele Betriebe kombinieren sie auch – etwa eine Fläche verpachten und bei einer anderen über die Genossenschaft einsteigen.</p>
          </Reveal>
        </div>
        <WegeKarten />

        {/* Vergleichstabelle */}
        <div id="vergleich" className="scroll-mt-24 pt-16 md:pt-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <h3 className="ov-h3 text-ink-900">Die Wege im direkten Vergleich</h3>
            <p className="text-[14px] text-ink-500">Orientierungswerte DACH, Stand {STAND}</p>
          </div>
          <Reveal className="overflow-hidden rounded-[1.75rem] bg-white shadow-e2 ring-1 ring-ink-200/70">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-[14.5px]">
                <caption className="sr-only">Die vier Wege im Vergleich</caption>
                <thead>
                  <tr className="bg-navy-950 text-white">
                    <th scope="col" className="w-[15%] px-5 py-4 font-semibold">
                      <span className="sr-only">Merkmal</span>
                    </th>
                    {WEGE.map((w) => (
                      <th key={w.id} scope="col" className="px-5 py-4 align-bottom font-display text-[15.5px] font-bold">
                        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ov-400/20 text-[13px] text-ov-300 ring-1 ring-inset ring-ov-300/30">{w.buchstabe}</span>
                        {w.titel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ZEILEN.map(([label, key], i) => (
                    <tr key={key} className={i % 2 ? "bg-sand-50" : "bg-white"}>
                      <th scope="row" className="sticky left-0 bg-inherit px-5 py-3.5 align-top font-semibold text-ink-800">
                        {label}
                      </th>
                      {WEGE.map((w) => (
                        <td key={w.id} className="px-5 py-3.5 align-top leading-snug text-ink-600">
                          {w[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-ov-50">
                    <th scope="row" className="sticky left-0 bg-inherit px-5 py-4 align-top font-semibold text-ov-800">
                      Richtwert Pacht
                    </th>
                    <td className="ov-num px-5 py-4 align-top font-semibold text-ink-900">
                      {fmt(PACHT.freiflaecheProHa.min)}–{fmt(PACHT.freiflaecheProHa.max)} €/ha
                    </td>
                    <td className="px-5 py-4 align-top text-ink-600">entfällt – Erlöse aus Strom</td>
                    <td className="ov-num px-5 py-4 align-top font-semibold text-ink-900">
                      {fmt(PACHT.agriProHa.min)}–{fmt(PACHT.agriProHa.max)} €/ha
                    </td>
                    <td className="ov-num px-5 py-4 align-top font-semibold text-ink-900">
                      {fmt(PACHT.agriProHa.min)}–{fmt(PACHT.agriProHa.max)} €/ha + Ausschüttung
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>
          <p className="mt-3 text-[12.5px] text-ink-500 md:hidden">Tabelle seitlich wischen, um alle Wege zu sehen.</p>
          <p className="mt-4 text-[13px] text-ink-500">Orientierungswerte DACH, Stand {STAND}. Die Wege B–D setzen eine Agri-PV-Anlage nach DIN SPEC 91434 voraus. Die Stufen in den Karten fassen diese Tabelle zusammen.</p>
        </div>
      </Section>

      {/* Warum Agri-PV */}
      <Section tone="green" space="lg" id="warum" className="scroll-mt-24 overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg-light absolute inset-0 opacity-60" />
        <div className="relative">
          <div className="mb-10 grid gap-x-16 gap-y-6 md:mb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
            <SectionHeading eyebrow="Warum Agri-PV" title="Ein zweites Standbein neben der Ernte." />
            <Reveal delay={80}>
              <p className="ov-lead text-pretty text-ink-600">Ernte, Preise und Auflagen machen die Landwirtschaft schwer planbar. Strom aus der eigenen Fläche bringt über die Laufzeit ein zweites Einkommen: Eine feste Pacht ist davon unabhängig, Stromerlöse hängen von Einstrahlung und Strompreis ab – aber nicht von Ernte und Getreidepreis.</p>
            </Reveal>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Reveal className="ov-noise relative flex flex-col overflow-hidden rounded-[1.75rem] bg-navy-950 text-white lg:row-span-2">
              <div className="relative min-h-[13rem] flex-1 bg-navy-50">
                <AgriBild typ="hoch" fuellen className="absolute inset-0 block h-full w-full" />
              </div>
              <div className="relative flex flex-col p-6 md:p-7">
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-ov-500/25 blur-3xl" />
                <span aria-hidden="true" className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-400/15 text-ov-300 ring-1 ring-inset ring-ov-300/30">
                  <TrendingUp className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className="relative mt-5 font-display text-[21px] font-bold tracking-[-0.01em]">{GRUENDE[0].title}</h3>
                <p className="relative mt-2 text-pretty text-[15px] leading-relaxed text-white/75">{GRUENDE[0].text}</p>
                <p className="relative mt-5 text-[13px] text-white/60">Im Bild: hoch aufgeständert, Bewirtschaftung unter den Modulen</p>
              </div>
            </Reveal>
            <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              {GRUENDE.slice(1).map((g, i) => (
                <Reveal as="li" key={g.title} delay={(i % 2) * 70} className={i === 4 ? "sm:col-span-2" : undefined}>
                  <div className="flex h-full gap-4 rounded-[1.5rem] bg-white p-6 shadow-e1 ring-1 ring-ov-100">
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200">
                      <g.icon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <div>
                      <h3 className="font-display text-[17.5px] font-bold text-ink-900">{g.title}</h3>
                      <p className="mt-1.5 text-pretty text-[14.5px] leading-relaxed text-ink-600">{g.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Entscheider */}
      <section id="entscheider" data-abschnitt="entscheider" aria-labelledby="entscheider-titel" className="ov-verlauf-nacht ov-noise relative isolate scroll-mt-24 overflow-hidden py-20 text-white md:py-32">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-60" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-1/3 -z-10 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[120px]" />
        <div className="ov-container">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14">
            <Reveal>
              <Eyebrow dark className="mb-4">
                Entscheidungshilfe
              </Eyebrow>
              <h2 id="entscheider-titel" className="ov-h2 text-balance text-white">
                Welcher Weg passt zu Ihrem Betrieb?
              </h2>
              <p className="ov-lead mt-5 text-pretty text-white/70">Fünf Fragen, eine Empfehlung mit Begründung. Dauert keine Minute – und ersetzt nicht das Gespräch, bereitet es aber gut vor.</p>
              <ol className="mt-8 space-y-3">
                {["Bewirtschaftung & Fläche", "Kapital & Risiko", "Zeit & Ziele"].map((t, i) => (
                  <li key={t} className="flex items-center gap-3 text-[15px] text-white/85">
                    <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[12px] font-bold text-ov-300 ring-1 ring-inset ring-white/15">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={100} className="text-ink-900">
              <WegeEntscheider />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Anfrage */}
      <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Kostenlos & unverbindlich"
              title="Sprechen wir über Ihren Hof."
              lead="Erzählen Sie uns von Fläche, Kulturen und Zielen. Wir melden uns mit einer ersten Einschätzung, welche Wege für Sie realistisch sind – und rechnen sie gemeinsam mit Ihnen durch. Offen gesagt: Wir sind selbst Projektentwickler; das Gespräch kostet Sie nichts, weil wir an gemeinsamen Projekten verdienen."
            />
            <ol className="relative mt-10 space-y-6 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-ov-200">
              {SCHRITTE.map((t, i) => (
                <li key={t} className="relative flex items-start gap-4 text-[15.5px] leading-snug text-ink-700">
                  <span aria-hidden="true" className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-display text-[14px] font-bold text-ov-700 shadow-e1 ring-1 ring-ov-200">
                    {i === SCHRITTE.length - 1 ? <Sprout className="h-4 w-4" /> : String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="pt-2.5">{t}</span>
                </li>
              ))}
            </ol>
          </div>
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-e3 ring-1 ring-ink-200/70 md:p-9">
            <AnfrageFormular
              typ="agri"
              daten={{ quelle: "landwirte" }}
              felder={["firma", "telefon", "plz", "ort", "land", "nachricht"]}
              titel="Ihr Betrieb"
              text="Gern mit Angaben zu Fläche (ha), Kulturen und dem Weg, der Sie interessiert."
              button="Anfrage senden"
              rolle="landwirt"
            />
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg" id="fragen" className="scroll-mt-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Was Landwirte uns fragen" lead="Ihre Frage ist nicht dabei? Schreiben Sie uns – wir antworten persönlich." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        ueberschrift="Weiter für Ihren Betrieb"
        items={[
          { href: pfad("/agri-pv"), titel: "Agri-PV im Detail", text: "Systeme nach DIN SPEC 91434, Kulturen, GAP, Baurecht und EEG." },
          { href: pfad("/rechner/agri-pv"), titel: "Agri-PV-Rechner", text: "Pacht, Eigeninvestition und Genossenschaft mit Ihren Zahlen." },
          { href: pfad("/genossenschaft"), titel: "Genossenschaft", text: "Wie die Beteiligung als Mitglied funktioniert." },
          { href: pfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Pachtmodelle und Vertragsinhalte für klassische Solarparks." },
          { href: "/wissen/ratgeber/agri-pv-wirtschaftlichkeit", titel: "Agri-PV Wirtschaftlichkeit", text: "Kosten, Erlöse und Rendite vertikaler und hoher Anlagen." },
          { href: "/wissen/ratgeber/photovoltaik-landwirt-steuern", titel: "Steuern für Landwirte mit PV", text: "Was bei Pacht und eigener Anlage steuerlich gilt." },
        ]}
      />

      <CtaBand
        eyebrow="Für Landwirte kostenfrei"
        title="Ihr Hof, Ihr Weg – wir rechnen ihn durch."
        text="Ob Pacht, eigene Anlage oder später die Genossenschaft: Wir zeigen Ihnen die Zahlen für Ihre Fläche und begleiten Sie von der Idee bis zum Betrieb. Wir sind selbst Projektentwickler – kostenfrei ist das für Sie, weil wir an gemeinsamen Projekten verdienen."
        primary={{ label: "Agri-PV-Rechner", href: pfad("/rechner/agri-pv") }}
        secondary={{ label: "Fläche prüfen", href: pfad("/flaechencheck") }}
      />
    </div>
  );
}

export const generateMetadata = landMetadata("/landwirte", metadata);
