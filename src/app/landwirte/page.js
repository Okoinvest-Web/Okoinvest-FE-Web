// src/app/landwirte/page.js – Landwirte & Agri-PV: die vier Wege

import Link from "next/link";
import { ArrowUpRight, BatteryCharging, CloudHail, Scale, ShieldCheck, Sprout, TrendingUp, Users, Warehouse } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import WegeEntscheider from "@/components/Agri/WegeEntscheider";
import AgriBild from "@/components/Agri/AgriBild";
import { WEGE } from "@/components/Agri/wege";
import { abs } from "@/data/site";
import { AGRI, PACHT, STAND, STROM } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/landwirte";
const TITEL = "Agri-PV für Landwirte: vier Wege zum Solarstrom | ÖkoInvest";
const BESCHREIBUNG =
  "Fläche verpachten, selbst investieren, Investor baut oder Genossenschaft: die vier Wege zu Agri-PV für Landwirte im Vergleich – mit Entscheidungshilfe.";

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
    a: "Die Anlage gehört ganz oder teilweise einer Energiegenossenschaft. Sie werden Mitglied, zeichnen Anteile und erhalten neben der Pacht eine Ausschüttung, deren Höhe von Ertrag und Beschlüssen der Generalversammlung abhängt. Nachbarn und Gemeinde können ebenfalls Mitglied werden. Jedes Mitglied hat in der Regel eine Stimme, unabhängig von der Zahl der Anteile.",
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
    a: "Eine Agri-PV-Anlage kann die Hofnachfolge stärken: Sie bringt ein zweites, wetterunabhängiges Einkommen und die Fläche bleibt landwirtschaftlich genutzt. Steuerlich ist Agri-PV oft günstiger zu gestalten als ein klassischer Solarpark, weil die landwirtschaftliche Nutzung erhalten bleibt – die Details sind aber komplex und sollten mit der Steuerberatung geklärt werden.",
  },
];

export default function LandwirtePage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Agri-PV und Solarprojekte für landwirtschaftliche Betriebe",
            provider: { "@id": `${abs("/")}/#organization` },
            areaServed: ["DE", "AT", "CH"],
            audience: { "@type": "Audience", audienceType: "Landwirtinnen und Landwirte" },
            url: abs(PFAD),
            description: BESCHREIBUNG,
          }),
        }}
      />

      <PageHero
        variant="immersive"
        breadcrumbs={[{ name: "Für Landwirte" }]}
        eyebrow="Für Landwirtinnen & Landwirte"
        title={<>Ernte bleibt. <span className="ov-text-gradient-light">Strom kommt dazu.</span></>}
        lead="Agri-PV macht Ihre Fläche zum zweiten Standbein – ohne die Landwirtschaft aufzugeben. Verpachten, selbst investieren, einen Investor bauen lassen oder über die Genossenschaft mitverdienen: Sie wählen den Weg, wir setzen ihn um."
        image={{ src: "/img/freiflaeche-begehung.jpg", alt: "Begehung einer landwirtschaftlichen Fläche mit Photovoltaik", position: "center 55%" }}
        actions={[
          { label: "Welcher Weg passt?", href: "#entscheider" },
          { label: "Agri-PV-Rechner", href: "/rechner/agri-pv" },
        ]}
        points={["DIN SPEC 91434", "GAP bleibt größtenteils", "DE · AT · CH"]}
      />

      {/* Vier Wege */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Die vier Wege"
          title="Vier Wege – ein Ziel: Ihr Hof verdient mit."
          lead="Jeder Weg hat seine Stärken. Viele Betriebe kombinieren sie auch – etwa eine Fläche verpachten und bei einer anderen über die Genossenschaft einsteigen."
          className="mb-12"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {WEGE.map((w, i) => {
            const Icon = w.icon;
            return (
              <Reveal key={w.id} delay={i * 70} className="flex">
                <Link href={w.href} className="group ov-card-hover relative flex w-full flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 hover:bg-white hover:ring-ov-200 md:p-7">
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ov-600 ring-1 ring-ink-200 transition-colors group-hover:bg-ov-500 group-hover:text-white group-hover:ring-ov-500">
                      <Icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <span className="font-display text-[36px] font-extrabold leading-none text-ink-200 transition-colors group-hover:text-ov-200">{w.buchstabe}</span>
                  </div>
                  <h3 className="mt-6 font-display text-[19px] font-bold leading-snug text-ink-900">{w.titel}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{w.text}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14.5px] font-semibold text-ov-700">
                    Mehr erfahren <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>

        {/* Vergleichstabelle */}
        <Reveal className="mt-12 overflow-x-auto rounded-3xl ring-1 ring-ink-200/70">
          <table className="w-full min-w-[820px] border-collapse text-left text-[14.5px]">
            <caption className="sr-only">Die vier Wege im Vergleich</caption>
            <thead>
              <tr className="bg-navy-950 text-white">
                <th scope="col" className="w-[15%] px-5 py-4 font-semibold">&nbsp;</th>
                {WEGE.map((w) => (
                  <th key={w.id} scope="col" className="px-5 py-4 align-bottom font-display text-[15.5px] font-bold">
                    <span className="mr-2 text-ov-300">{w.buchstabe}</span>
                    {w.titel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ZEILEN.map(([label, key], i) => (
                <tr key={key} className={i % 2 ? "bg-sand-50" : "bg-white"}>
                  <th scope="row" className="px-5 py-3.5 align-top font-semibold text-ink-800">{label}</th>
                  {WEGE.map((w) => (
                    <td key={w.id} className="px-5 py-3.5 align-top leading-snug text-ink-600">{w[key]}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-white">
                <th scope="row" className="px-5 py-3.5 align-top font-semibold text-ink-800">Richtwert Pacht</th>
                <td className="px-5 py-3.5 align-top text-ink-600">{fmt(PACHT.freiflaecheProHa.min)}–{fmt(PACHT.freiflaecheProHa.max)} €/ha</td>
                <td className="px-5 py-3.5 align-top text-ink-600">entfällt – Erlöse aus Strom</td>
                <td className="px-5 py-3.5 align-top text-ink-600">{fmt(PACHT.agriProHa.min)}–{fmt(PACHT.agriProHa.max)} €/ha</td>
                <td className="px-5 py-3.5 align-top text-ink-600">{fmt(PACHT.agriProHa.min)}–{fmt(PACHT.agriProHa.max)} €/ha + Ausschüttung</td>
              </tr>
            </tbody>
          </table>
        </Reveal>
        <p className="mt-3 text-[12.5px] text-ink-500 md:hidden">Tabelle seitlich wischen, um alle Wege zu sehen.</p>
        <p className="mt-4 text-[13px] text-ink-500">Orientierungswerte DACH, Stand {STAND}. Die Wege B–D setzen eine Agri-PV-Anlage nach DIN SPEC 91434 voraus.</p>
      </Section>

      {/* Warum Agri-PV */}
      <Section tone="green" space="lg">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Warum Agri-PV"
              title="Ein zweites Standbein, das mit dem Wetter nicht schwankt."
              lead="Ernte, Preise und Auflagen machen die Landwirtschaft schwer planbar. Strom aus der eigenen Fläche bringt 30 Jahre ein Einkommen, das davon weitgehend unabhängig ist."
            />
          </div>
          <Reveal dir="right" className="grid grid-cols-2 gap-3">
            <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-ov-100"><AgriBild typ="vertikal" className="block h-auto w-full" /></div>
            <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-ov-100"><AgriBild typ="hoch" className="block h-auto w-full" /></div>
          </Reveal>
        </div>
        <FeatureGrid
          className="mt-12"
          cols={3}
          items={[
            { icon: TrendingUp, title: "Zweites Standbein", text: "Pacht oder Stromerlöse fließen jährlich – unabhängig von Ernte, Getreidepreis und Witterung." },
            { icon: Scale, title: "Risikostreuung", text: "Strom und Ernte auf derselben Fläche: Fällt eines schwächer aus, trägt das andere. Die Fläche bleibt Ihr Betriebsmittel." },
            { icon: CloudHail, title: "Schutz für Kulturen", text: "Hoch aufgeständerte Module schützen Obst und Beeren vor Hagel, Starkregen und Sonnenbrand; der Boden verdunstet weniger Wasser." },
            { icon: BatteryCharging, title: "Eigenstrom für den Hof", text: "Melktechnik, Kühlung, Lüftung, Trocknung: Bei hofnahen Anlagen kann Solarstrom direkt im Betrieb genutzt werden." },
            { icon: Warehouse, title: "Hofnachfolge stärken", text: "Ein planbares Zusatzeinkommen macht den Betrieb für die nächste Generation attraktiver – ohne die Fläche abzugeben." },
            { icon: Users, title: "Akzeptanz im Dorf", text: "Agri-PV erhält die Landwirtschaft sichtbar. Mit der Genossenschaft können Nachbarn und Gemeinde mitverdienen." },
          ]}
        />
      </Section>

      {/* Entscheider */}
      <Section tone="sand" space="lg" id="entscheider" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
          <SectionHeading
            eyebrow="Entscheidungshilfe"
            title="Welcher Weg passt zu Ihrem Betrieb?"
            lead="Fünf Fragen, eine Empfehlung mit Begründung. Dauert keine Minute – und ersetzt nicht das Gespräch, bereitet es aber gut vor."
          >
            <ul className="mt-8 space-y-3 text-[15px] text-ink-700">
              {["Bewirtschaftung & Fläche", "Kapital & Risiko", "Zeit & Ziele"].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <ShieldCheck aria-hidden="true" className="h-5 w-5 text-ov-600" /> {t}
                </li>
              ))}
            </ul>
          </SectionHeading>
          <WegeEntscheider />
        </div>
      </Section>

      {/* Anfrage */}
      <Section tone="white" space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Kostenlos & unverbindlich"
              title="Sprechen wir über Ihren Hof."
              lead="Erzählen Sie uns von Fläche, Kulturen und Zielen. Wir melden uns mit einer ersten Einschätzung, welche Wege für Sie realistisch sind – und rechnen sie gemeinsam mit Ihnen durch."
            />
            <ul className="mt-8 space-y-3">
              {[
                "Fläche, Kulturen, Maschinenbreiten und Netz – wir prüfen alles vorab",
                "Wir stimmen uns mit Landwirtschaftsamt und Gemeinde ab",
                "Status, Unterlagen und Nachrichten später im Portal",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-[15.5px] text-ink-700">
                  <Sprout aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Reveal className="rounded-[2rem] bg-sand-50 p-6 ring-1 ring-ink-200/70 md:p-9">
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

      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Was Landwirte uns fragen" lead="Ihre Frage ist nicht dabei? Schreiben Sie uns – wir antworten persönlich." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        ueberschrift="Weiter für Ihren Betrieb"
        items={[
          { href: "/agri-pv", titel: "Agri-PV im Detail", text: "Systeme nach DIN SPEC 91434, Kulturen, GAP, Baurecht und EEG." },
          { href: "/rechner/agri-pv", titel: "Agri-PV-Rechner", text: "Pacht, Eigeninvestition und Genossenschaft mit Ihren Zahlen." },
          { href: "/genossenschaft", titel: "Genossenschaft", text: "Wie die Beteiligung als Mitglied funktioniert." },
          { href: "/flaeche-verpachten", titel: "Fläche verpachten", text: "Pachtmodelle und Vertragsinhalte für klassische Solarparks." },
        ]}
      />

      <CtaBand
        eyebrow="Für Landwirte kostenfrei"
        title="Ihr Hof, Ihr Weg – wir rechnen ihn durch."
        text="Ob Pacht, eigene Anlage oder Genossenschaft: Wir zeigen Ihnen die Zahlen für Ihre Fläche und begleiten Sie von der Idee bis zum Betrieb."
        primary={{ label: "Agri-PV-Rechner", href: "/rechner/agri-pv" }}
        secondary={{ label: "Fläche prüfen", href: "/flaechencheck" }}
      />
    </div>
  );
}
