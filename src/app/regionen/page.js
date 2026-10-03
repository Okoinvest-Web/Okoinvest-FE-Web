// src/app/regionen/page.js – Hub der Regionalseiten „Solarpark & Agri-PV in <Region>“

import Link from "next/link";
import { ArrowRight, Landmark, MapPinned, Scale, Sprout } from "lucide-react";

import Hero from "@/components/Boerse/Seite/Hero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import { pachtSpanne } from "@/components/Region/rechnung";
import ErtragsKarte, { ERTRAG_STUFEN, ertragStufe } from "@/components/Region/ErtragsKarte";
import RegionFakten from "@/components/Region/RegionFakten";
import { REGIONEN } from "@/data/regionen";
import { LAENDER } from "@/data/regionen/meta";
import { abs } from "@/data/site";
import { AGRI, PACHT, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";

const PFAD = "/regionen";
const TITEL = "Solarpark & Agri-PV nach Region (DACH) | ÖkoInvest";
const BESCHREIBUNG =
  "Solarpark und Agri-PV in allen 16 Bundesländern, 9 österreichischen Ländern und der Schweiz: Recht, Flächenkulisse, Ertrag und Pacht je Region.";

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
    images: [{ url: abs("/img/solarpark-himmel.jpg"), width: 1280, height: 852, alt: "Solarpark unter blauem Himmel" }],
  },
};

const ertraege = REGIONEN.map((r) => r.ertrag?.kwhProKwp).filter(Boolean);
const ERTRAG_MIN = Math.min(...ertraege);
const ERTRAG_MAX = Math.max(...ertraege);
const nachErtrag = [...REGIONEN].filter((r) => r.ertrag?.kwhProKwp).sort((a, b) => b.ertrag.kwhProKwp - a.ertrag.kwhProKwp);
const LAND_FARBE = { DE: "bg-ov-600", AT: "bg-navy-700", CH: "bg-ink-700" };
const RAHMEN_FARBE = ["bg-ov-600", "bg-navy-700", "bg-ink-700"];

const RAHMEN = [
  {
    land: "Deutschland",
    icon: Landmark,
    punkte: [
      "Baurecht in der Regel über einen **Bebauungsplan** der Gemeinde; privilegiert sind der 200-m-Streifen an Autobahnen und zweigleisigen Schienenwegen sowie kleine Agri-PV mit Hofbezug.",
      "Förderung über die **EEG-Ausschreibung** nur auf Flächen der Kulisse – Acker und Grünland vor allem in **benachteiligten Gebieten**, soweit das Land sie nicht ausgeschlossen hat.",
      "Regionalpläne und Landesleitfäden steuern, wo Solarparks erwünscht sind – das unterscheidet sich von Land zu Land deutlich.",
    ],
  },
  {
    land: "Österreich",
    icon: Scale,
    punkte: [
      "Nötig ist eine **Widmung** im Flächenwidmungsplan (Grünland-Photovoltaik bzw. Sonderwidmung) – Raumordnung ist Landessache.",
      "Größere Parks meist nur in **überörtlichen Zonen** oder nach Kriterienkatalog des Landes; dazu Naturschutz- und ab einer Schwelle elektrizitätsrechtliche Bewilligung.",
      `Die EAG-Marktprämie wird auf Agrar- und Grünland um **${fmt(AGRI.eagAbschlagAt * 100)} %** gekürzt – qualifizierte Agri-PV kann ausgenommen sein.`,
    ],
  },
  {
    land: "Schweiz",
    icon: Sprout,
    punkte: [
      "Außerhalb der Bauzone nur, wenn die Anlage **standortgebunden** ist (Art. 24ter RPG): wenig empfindliches oder vorbelastetes Gebiet.",
      "**Agri-PV** muss der Landwirtschaft einen Vorteil bringen oder der Forschung dienen.",
      "Große Anlagen ohne Eigenverbrauch erhalten die Einmalvergütung per **Auktion**; kantonale Richtpläne bezeichnen Eignungsgebiete.",
    ],
  },
];

const FAQ = [
  {
    q: "Wo in Deutschland lohnt sich ein Solarpark am meisten?",
    a: `Die Einstrahlung steigt von Nord nach Süd: Unsere PVGIS-Abfragen liegen je Region zwischen rund ${fmt(ERTRAG_MIN)} und ${fmt(ERTRAG_MAX)} kWh/kWp im Jahr. Wichtiger als ein paar Prozent Einstrahlung sind aber Netzanschluss, Flächenkulisse und die Haltung der Gemeinde – ein gut angebundener Park im Norden kann sich besser rechnen als eine schlecht angebundene Fläche im Süden.`,
  },
  {
    q: "Warum gibt es je Bundesland eigene Regeln?",
    a: "Raumordnung und Regionalplanung sind Ländersache. In Deutschland entscheiden die Länder zudem, ob Acker- und Grünland in benachteiligten Gebieten für die EEG-Förderung offen bleibt, und viele haben eigene Leitfäden für Freiflächen-PV. In Österreich regeln die Länder Widmung, Naturschutz und Elektrizitätsrecht, in der Schweiz die Kantone Richtplanung und Bewilligung.",
  },
  {
    q: "Wie viel Pacht ist je Region realistisch?",
    a: `Im DACH-Raum liegen die Pachten für Freiflächen-PV derzeit meist zwischen ${fmt(PACHT.freiflaecheProHa.min)} und ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr. Auf jeder Regionalseite ordnen wir ein, ob die Region eher im unteren, mittleren oder oberen Band liegt – und warum. Den Ausschlag geben am Ende Netz, Größe und Förderfähigkeit Ihrer Fläche.`,
  },
  {
    q: "Entwickelt ÖkoInvest in allen Regionen?",
    a: "Wir prüfen Flächen im gesamten DACH-Raum und sagen Ihnen offen, wenn eine Fläche nicht passt. Wo große Freiflächen rechtlich kaum möglich sind – etwa in Stadtstaaten oder alpinen Lagen – zeigen die Regionalseiten, welche Alternativen es gibt.",
  },
  {
    q: "Wie aktuell sind die Angaben?",
    a: `Die Regionalseiten sind zum Stand ${STAND} recherchiert und nennen ihre Quellen. Gesetze, Verordnungen und Regionalpläne ändern sich häufig; für Ihre Fläche prüfen wir den aktuellen Stand im Einzelfall.`,
  },
];

export default function RegionenHub() {
  const mitte = pachtSpanne("mitte");
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Solarpark & Agri-PV nach Region",
          url: abs(PFAD),
          description: BESCHREIBUNG,
          hasPart: REGIONEN.map((r) => ({ "@type": "WebPage", name: `Solarpark & Agri-PV ${r.inName}`, url: abs(`${PFAD}/${r.slug}`) })),
        }}
      />

      <Hero
        breadcrumbs={[{ name: "Regionen" }]}
        pill={{ marke: "DACH", text: `${REGIONEN.length} Regionalseiten mit Quellen, Stand ${STAND}`, href: "#karte" }}
        titel={<>Solarpark & <span className="whitespace-nowrap">Agri-PV</span> <span className="ov-text-gradient-light">in Ihrer Region.</span></>}
        lead={<><span className="font-medium text-white">Welche Flächen gehen, was das Land vorschreibt, wie viel die Sonne bringt</span> und was an Pacht realistisch ist – für alle 16 deutschen Bundesländer, die 9 österreichischen Bundesländer und die Schweiz.</>}
        aktionen={[
          { label: "Region wählen", href: "#karte" },
          { label: "Fläche prüfen", href: "/flaechencheck" },
        ]}
        hinweis="Für Flächeneigentümer kostenfrei · Einschätzung am Kartentisch"
        versprechen={["Landesrecht je Region", "Flächenkulisse und Netz", "Ertrag nach PVGIS", "Pacht realistisch eingeordnet"]}
        unten={
          <p className="mt-6 flex items-center gap-2 text-[14px] text-white/70">
            <MapPinned aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />
            <span>Tippen Sie rechts auf Ihre Region – oder <a href="#ertrag" className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">vergleichen Sie den Ertrag</a></span>
          </p>
        }
        buehne={<ErtragsKarte einlauf />}
        bildunterschrift="Spezifischer Ertrag je Region in kWh/kWp – jede Kachel führt zur Regionalseite"
      />

      <RegionFakten
        fakten={[
          { wert: fmt(REGIONEN.length), einheit: "Regionen", text: "eigenständig recherchiert, mit Quellen" },
          { wert: `${fmt(ERTRAG_MIN)}–${fmt(ERTRAG_MAX)}`, einheit: "kWh/kWp", text: "spezifischer Ertrag je Region (PVGIS)" },
          { wert: `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)}`, einheit: "€/ha", text: "übliche Pacht Freiflächen-PV im DACH-Raum je Jahr" },
          { wert: `${fmt(mitte.min)}–${fmt(mitte.max)}`, einheit: "€/ha", text: "mittleres Band – Einordnung je Regionalseite" },
        ]}
      />

      {/* Karte + Liste */}
      <Section tone="white" space="lg" id="karte" className="scroll-mt-24 pt-24 md:pt-36">
        <SectionHeading eyebrow="Regionen" title="Wählen Sie Ihre Region" lead="Jede Seite ist eigenständig recherchiert – mit Landesrecht, Flächenkulisse, Netz und regionalen Fragen. Der Balken zeigt den spezifischen Ertrag im Vergleich." className="mb-10 md:mb-14" />
        <div className="grid gap-5 lg:grid-cols-3">
            {LAENDER.map((l, li) => {
              const liste = REGIONEN.filter((r) => r.land === l.id);
              return (
                <Reveal key={l.id} delay={li * 60} className={`rounded-[1.75rem] bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-7 ${l.id === "DE" ? "lg:col-span-3" : l.id === "AT" ? "lg:col-span-2" : ""}`}>
                  <h2 className="flex items-baseline justify-between gap-3 border-b border-ink-200 pb-3 font-display text-[20px] font-bold text-ink-900">
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden="true" className={`h-3 w-3 rounded-[4px] ${LAND_FARBE[l.id]}`} />
                      {l.label}
                    </span>
                    <span className="text-[13px] font-medium text-ink-500">{l.kurz}</span>
                  </h2>
                  <ul className={`mt-3 grid gap-x-4 gap-y-1 ${l.id === "DE" ? "sm:grid-cols-2 lg:grid-cols-4" : l.id === "AT" ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
                    {liste.map((r) => (
                      <li key={r.slug}>
                        <Link href={`${PFAD}/${r.slug}`} className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[15px] text-ink-800 transition-colors hover:bg-ov-50 hover:text-ov-800">
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{r.name}</span>
                            {r.ertrag?.kwhProKwp && <span className="ov-num block text-[13px] text-ink-500">{fmt(r.ertrag.kwhProKwp)} kWh/kWp</span>}
                          </span>
                          {r.ertrag?.kwhProKwp && (
                            <span aria-hidden="true" className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-ink-100">
                              <span className="block h-full rounded-full" style={{ width: `${Math.max(12, ((r.ertrag.kwhProKwp - ERTRAG_MIN * 0.85) / (ERTRAG_MAX - ERTRAG_MIN * 0.85)) * 100)}%`, background: ERTRAG_STUFEN[ertragStufe(r.ertrag.kwhProKwp)].fill }} />
                            </span>
                          )}
                          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600 opacity-60 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              );
            })}
        </div>
      </Section>

      {/* Rechtsrahmen */}
      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="Drei Länder, drei Rechtsrahmen" title="Was sich zwischen Deutschland, Österreich und der Schweiz unterscheidet" className="mb-12" />
        <div className="grid gap-4 lg:grid-cols-3">
          {RAHMEN.map((b, i) => (
            <Reveal key={b.land} delay={i * 70} className="relative overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-e1 ring-1 ring-ink-200/60 md:p-8">
              <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${RAHMEN_FARBE[i]}`} />
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-50 text-ov-600"><b.icon aria-hidden="true" className="h-5 w-5" /></span>
                <span className="text-[12.5px] font-semibold text-ink-500">{LAENDER[i]?.kurz}</span>
              </div>
              <h3 className="mt-5 font-display text-[22px] font-bold text-ink-900">{b.land}</h3>
              <ul className="mt-4 space-y-3">
                {b.punkte.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink-700">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                    <span>
                      {p.split(/\*\*(.+?)\*\*/g).map((t, j) => (j % 2 ? <strong key={j} className="font-semibold text-ink-900">{t}</strong> : t))}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Ertragsvergleich */}
      <Section tone="white" space="lg" id="ertrag" className="scroll-mt-20">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow="Sonne im Vergleich"
            title="Spezifischer Ertrag je Region"
            lead="Jahresertrag einer fest aufgeständerten, optimal geneigten Anlage je Kilowatt-Peak an einem repräsentativen Punkt der Region (PVGIS, 14 % Systemverluste). Die Unterschiede innerhalb einer Region können größer sein als zwischen den Regionen."
          />
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-600">
            {LAENDER.map((l) => (
              <li key={l.id} className="inline-flex items-center gap-2"><span aria-hidden="true" className={`h-3 w-3 rounded-[4px] ${LAND_FARBE[l.id]}`} />{l.label}</li>
            ))}
          </ul>
          <dl className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
              <dt className="text-[12px] text-ink-500">Höchster Wert</dt>
              <dd className="ov-num mt-1 font-display text-[22px] font-extrabold text-ink-900">{fmt(ERTRAG_MAX)}</dd>
              <dd className="text-[12.5px] text-ink-600">{nachErtrag.filter((r) => r.ertrag.kwhProKwp === ERTRAG_MAX).map((r) => r.name).join(", ")}</dd>
            </div>
            <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
              <dt className="text-[12px] text-ink-500">Niedrigster Wert</dt>
              <dd className="ov-num mt-1 font-display text-[22px] font-extrabold text-ink-900">{fmt(ERTRAG_MIN)}</dd>
              <dd className="text-[12.5px] text-ink-600">{nachErtrag.filter((r) => r.ertrag.kwhProKwp === ERTRAG_MIN).map((r) => r.name).join(", ")}</dd>
            </div>
          </dl>
          </div>
          <Reveal>
            <ol className="space-y-2">
              {/* Balken wachsen beim Eintritt gestaffelt von oben (sonnigste Region) nach unten – nur transform */}
              {nachErtrag.map((r, i) => (
                <li key={r.slug}>
                  <Link href={`${PFAD}/${r.slug}`} className="group grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 rounded-lg py-0.5 text-[14px] sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
                    <span className="truncate text-ink-700 group-hover:text-ov-700">{r.name}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                      <span
                        className={`ov-balken-x block h-full rounded-full ${LAND_FARBE[r.land]}`}
                        style={{ "--i": Math.min(i, 20) * 0.6, width: `${Math.max(8, ((r.ertrag.kwhProKwp - ERTRAG_MIN * 0.85) / (ERTRAG_MAX - ERTRAG_MIN * 0.85)) * 100)}%` }}
                      />
                    </span>
                    <span className="ov-num w-12 text-right font-semibold text-ink-900">{fmt(r.ertrag.kwhProKwp)}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[12.5px] text-ink-500">kWh/kWp und Jahr; Balken ab {fmt(Math.round(ERTRAG_MIN * 0.85))} kWh/kWp skaliert. Quelle: EU JRC PVGIS, Abfragen Stand {STAND}.</p>
          </Reveal>
        </div>
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Solarparks in den Regionen" />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/flaechencheck", titel: "Flächencheck", text: "Ampel, Leistung und Pachtspanne Ihrer Fläche in zwei Minuten." },
          { href: "/rechner/pacht", titel: "Pachtrechner", text: "Festpacht, indexiert oder Umsatzbeteiligung über 30 Jahre." },
          { href: "/freiflaeche", titel: "Freiflächen-PV", text: "Flächenkriterien, EEG-Kulisse, Genehmigung und Ökologie im Detail." },
          { href: "/agri-pv", titel: "Agri-PV", text: "Strom und Landwirtschaft auf derselben Fläche – Systeme und Förderung." },
        ]}
      />

      <CtaBand
        eyebrow="Für Flächeneigentümer kostenfrei"
        title="Ihre Fläche – egal in welcher Region."
        text="Wir prüfen Planungsrecht, Netz und Einstrahlung am Kartentisch und sagen Ihnen offen, was möglich ist."
        primary={{ label: "Zum Flächencheck", href: "/flaechencheck" }}
        secondary={{ label: "Fläche verpachten", href: "/flaeche-verpachten" }}
      />
    </div>
  );
}
