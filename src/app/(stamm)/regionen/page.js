// src/app/regionen/page.js – Hub der Regionalseiten „Solarpark & Agri-PV in <Region>“

import Link from "@/components/Land/Link";
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
import { REGIONEN, regionenInSprache } from "@/data/regionen";
import { LAENDER } from "@/data/regionen/meta";
import { abs } from "@/data/site";
import { AGRI, PACHT, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { LAENDER as LAND_INFO, eigenerInhalt, inhaltFuer, linkFuer, pfad, regionSchluessel } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage, landDerAnfrage } from "@/lib/land/seite";
import { datumText, fmtZahl } from "@/lib/sprache/format";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

// Ländermodell: gemeinsame Seite wie vor Welle 2 (DACH, alle Länder gemischt); Länderfassungen mit
// eigenem Inhalt (Register src/lib/land/seiten.js: DE, AT) beginnen Liste, Rechtsrahmen, Kennzahlen
// und FAQ mit ihrem Land. Texte über inhaltFuer() mit Rückfall auf „gemeinsam“.
const TEXTE = {
  gemeinsam: {
    titel: "Solarpark & Agri-PV nach Region (DACH) | ÖkoInvest",
    beschreibung: "Solarpark und Agri-PV in allen 16 Bundesländern, 9 österreichischen Ländern und der Schweiz: Recht, Flächenkulisse, Ertrag und Pacht je Region.",
    reichweite: "für alle 16 deutschen Bundesländer, die 9 österreichischen Bundesländer und die Schweiz",
  },
  DE: {
    titel: "Solarpark & Agri-PV in den deutschen Bundesländern | ÖkoInvest",
    beschreibung: "Solarpark und Agri-PV in allen 16 Bundesländern: Landesrecht, Flächenkulisse, Ertrag und Pacht je Region – mit Quellen.",
    reichweite: "für alle 16 deutschen Bundesländer – mit Verweis auf Österreich und die Schweiz",
  },
  AT: {
    titel: "Freiflächen-PV & Agri-PV in den österreichischen Bundesländern | ÖkoInvest",
    beschreibung: "Freiflächen-PV und Agri-PV in den 9 österreichischen Bundesländern: Widmung, Zonen, Bewilligungen und Ertrag je Bundesland – mit Quellen.",
    reichweite: "für die 9 österreichischen Bundesländer – mit Verweis auf Deutschland und die Schweiz",
  },
};
/* Sprachmodell: englische Fassung (gleiche Schlüssel) */
const TEXTE_EN = {
  gemeinsam: {
    titel: "Solar parks & agrivoltaics by region (DACH) | ÖkoInvest",
    beschreibung: "Solar parks and agrivoltaics in all 16 German states, 9 Austrian states and Switzerland: law, eligible land, yield and lease per region.",
    reichweite: "for all 16 German states, the 9 Austrian states and Switzerland",
  },
  DE: {
    titel: "Solar parks & agrivoltaics in the German states | ÖkoInvest",
    beschreibung: "Solar parks and agrivoltaics in all 16 German states: state law, eligible land, yield and lease per region – with sources.",
    reichweite: "for all 16 German states – with references to Austria and Switzerland",
  },
  AT: {
    titel: "Ground-mounted PV & agrivoltaics in the Austrian states | ÖkoInvest",
    beschreibung: "Ground-mounted PV and agrivoltaics in the 9 Austrian states: zoning, zones, permits and yield per state – with sources.",
    reichweite: "for the 9 Austrian states – with references to Germany and Switzerland",
  },
};
/** land: Land der Seite (null = gemeinsam); nur Länder mit eigenem Inhalt bekommen ihre Fassung */
const texte = (land, sprache = "de") => inhaltFuer(sprache === "en" ? TEXTE_EN : TEXTE, eigenerInhalt("/regionen", land) ? land : null);

const metadataFuer = (land, p) => {
  const en = p?.sprache === "en";
  const t = texte(land, en ? "en" : "de");
  return {
    title: t.titel,
    description: t.beschreibung,
    openGraph: {
      type: "website",
      siteName: "ÖkoInvest",
      title: t.titel,
      description: t.beschreibung,
      images: [{ url: abs("/img/solarpark-himmel.jpg"), width: 1280, height: 852, alt: en ? "Solar park under a blue sky" : "Solarpark unter blauem Himmel" }],
    },
  };
};

const ertraege = REGIONEN.map((r) => r.ertrag?.kwhProKwp).filter(Boolean);
const ERTRAG_MIN = Math.min(...ertraege);
const ERTRAG_MAX = Math.max(...ertraege);
const ertragLand = (land) => REGIONEN.filter((r) => r.land === land).map((r) => r.ertrag?.kwhProKwp).filter(Boolean);
const nachErtrag = [...REGIONEN].filter((r) => r.ertrag?.kwhProKwp).sort((a, b) => b.ertrag.kwhProKwp - a.ertrag.kwhProKwp);
const LAND_FARBE = { DE: "bg-ov-600", AT: "bg-navy-700", CH: "bg-ink-700" };
const RAHMEN_FARBE = ["bg-ov-600", "bg-navy-700", "bg-ink-700"];

const RAHMEN = [
  {
    id: "DE",
    land: "Deutschland",
    icon: Landmark,
    punkte: [
      "Baurecht in der Regel über einen **Bebauungsplan** der Gemeinde; privilegiert sind der 200-m-Streifen an Autobahnen und zweigleisigen Schienenwegen sowie kleine Agri-PV mit Hofbezug.",
      "Förderung über die **EEG-Ausschreibung** nur auf Flächen der Kulisse – Acker und Grünland vor allem in **benachteiligten Gebieten**, soweit das Land sie nicht ausgeschlossen hat.",
      "Regionalpläne und Landesleitfäden steuern, wo Solarparks erwünscht sind – das unterscheidet sich von Land zu Land deutlich.",
    ],
  },
  {
    id: "AT",
    land: "Österreich",
    icon: Scale,
    punkte: [
      "Nötig ist eine **Widmung** im Flächenwidmungsplan (Grünland-Photovoltaik bzw. Sonderwidmung) – Raumordnung ist Landessache.",
      "Größere Parks meist nur in **überörtlichen Zonen** oder nach Kriterienkatalog des Landes; dazu Naturschutz- und ab einer Schwelle elektrizitätsrechtliche Bewilligung.",
      `Die EAG-Marktprämie wird auf Agrar- und Grünland um **${fmt(AGRI.eagAbschlagAt * 100)} %** gekürzt – qualifizierte Agri-PV kann ausgenommen sein.`,
    ],
  },
  {
    id: "CH",
    land: "Schweiz",
    icon: Sprout,
    punkte: [
      "Außerhalb der Bauzone nur, wenn die Anlage **standortgebunden** ist (Art. 24ter RPG): wenig empfindliches oder vorbelastetes Gebiet.",
      "**Agri-PV** muss der Landwirtschaft einen Vorteil bringen oder der Forschung dienen.",
      "Große Anlagen ohne Eigenverbrauch erhalten die Einmalvergütung per **Auktion**; kantonale Richtpläne bezeichnen Eignungsgebiete.",
    ],
  },
];

const FAQ_DE_ERTRAG = {
    q: "Wo in Deutschland lohnt sich ein Solarpark am meisten?",
    a: `Die Einstrahlung steigt von Nord nach Süd: Unsere PVGIS-Abfragen liegen je Region zwischen rund ${fmt(ERTRAG_MIN)} und ${fmt(ERTRAG_MAX)} kWh/kWp im Jahr. Wichtiger als ein paar Prozent Einstrahlung sind aber Netzanschluss, Flächenkulisse und die Haltung der Gemeinde – ein gut angebundener Park im Norden kann sich besser rechnen als eine schlecht angebundene Fläche im Süden.`,
};

const FAQ_REST = [
  {
    q: "Warum gibt es je Bundesland eigene Regeln?",
    a: "Raumordnung und Regionalplanung sind Ländersache. In Deutschland entscheiden die Länder zudem, ob Acker- und Grünland in benachteiligten Gebieten für die EEG-Förderung offen bleibt, und viele haben eigene Leitfäden für Freiflächen-PV. In Österreich regeln die Länder Widmung, Naturschutz und Elektrizitätsrecht, in der Schweiz die Kantone Richtplanung und Bewilligung.",
  },
  {
    nurDe: true, // Pachtwerte gelten nur für Deutschland (Länder-Sperre bis zur Freigabe der AT-Werte, B1)
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

/* Sprachmodell: englische Fassung von Rahmen und FAQ (gleiche Reihenfolge) */
const e = (n, s = 0) => fmtZahl(n, s, "en");
const LAENDER_EN = { DE: { label: "Germany", kurz: "16 federal states" }, AT: { label: "Austria", kurz: "9 federal states" }, CH: { label: "Switzerland", kurz: "Confederation and cantons" } };
const RAHMEN_EN = {
  DE: {
    land: "Germany",
    punkte: [
      "The right to build usually comes from a **development plan** (Bebauungsplan) of the municipality; privileged are the 200 m strip along motorways and two-track railway lines and small farm-related agrivoltaics.",
      "Support via the **EEG tender** (Germany’s Renewable Energy Sources Act) only on land within the eligible categories – arable land and grassland mainly in **less-favoured areas**, unless the state has excluded them.",
      "Regional plans and state guidelines steer where solar parks are welcome – this differs considerably from state to state.",
    ],
  },
  AT: {
    land: "Austria",
    punkte: [
      "A **zoning designation** (Widmung) in the zoning plan is required (grassland – photovoltaics or a special designation) – spatial planning is a matter for the federal states.",
      "Larger parks usually only in **supra-local zones** or according to the state’s criteria catalogue; plus a nature conservation permit and, above a threshold, an electricity law permit.",
      `The EAG market premium (Austria’s Renewable Expansion Act) is reduced by **${e(AGRI.eagAbschlagAt * 100)} %** on agricultural land and grassland – qualified agrivoltaics can be exempt.`,
    ],
  },
  CH: {
    land: "Switzerland",
    punkte: [
      "Outside the building zone only if the installation is **location-dependent** (Art. 24ter RPG, the Spatial Planning Act): areas of low sensitivity or already affected by prior use.",
      "**Agrivoltaics** must benefit agriculture or serve research.",
      "Large installations without self-consumption receive the one-off remuneration via **auction**; cantonal structure plans designate suitable areas.",
    ],
  },
};
const FAQ_DE_ERTRAG_EN = {
  q: "Where in Germany is a solar park most worthwhile?",
  a: `Irradiation increases from north to south: our PVGIS queries range from around ${e(ERTRAG_MIN)} to ${e(ERTRAG_MAX)} kWh/kWp per year depending on the region. More important than a few percent of irradiation, however, are the grid connection, the eligible land and the municipality’s stance – a well-connected park in the north can pay off better than a poorly connected site in the south.`,
};
const FAQ_REST_EN = [
  {
    q: "Why does each state have its own rules?",
    a: "Spatial and regional planning are matters for the states. In Germany, the states also decide whether arable land and grassland in less-favoured areas remain open for EEG support, and many have their own guidelines for ground-mounted PV. In Austria, the states regulate zoning, nature conservation and electricity law; in Switzerland, the cantons regulate structure planning and permits.",
  },
  {
    q: "How much lease is realistic per region?",
    a: `In the DACH region, leases for ground-mounted PV currently mostly range between €${e(PACHT.freiflaecheProHa.min)} and €${e(PACHT.freiflaecheProHa.max)} per hectare and year. On each regional page we indicate whether the region tends to be in the lower, middle or upper band – and why. In the end, the grid, the size and the eligibility of your land are decisive.`,
  },
  {
    q: "Does ÖkoInvest develop in all regions?",
    a: "We check land throughout the DACH region and tell you openly if a site is not suitable. Where large ground-mounted installations are hardly possible legally – for example in city states or Alpine locations – the regional pages show which alternatives exist.",
  },
  {
    q: "How up to date is the information?",
    a: `The regional pages were researched as of ${datumText(STAND, "en")} and cite their sources. Laws, ordinances and regional plans change frequently; for your land we check the current status case by case.`,
  },
];
const FAQ_AT_EN = () => ({
  q: "Where in Austria is a ground-mounted PV installation most worthwhile?",
  a: `Our PVGIS queries range from around ${e(Math.min(...ertragLand("AT")))} to ${e(Math.max(...ertragLand("AT")))} kWh/kWp per year depending on the federal state. More important than a few percent of irradiation, however, are grid access, the state’s zoning or PV zones and the municipality’s stance.`,
});

const faqFuer = (land) => [
  land === "AT"
    ? {
        q: "Wo in Österreich lohnt sich eine Freiflächen-PV-Anlage am meisten?",
        a: `Unsere PVGIS-Abfragen liegen je Bundesland zwischen rund ${fmt(Math.min(...ertragLand("AT")))} und ${fmt(Math.max(...ertragLand("AT")))} kWh/kWp im Jahr. Wichtiger als ein paar Prozent Einstrahlung sind aber Netzzugang, Widmung bzw. PV-Zonen des Landes und die Haltung der Gemeinde.`,
      }
    : FAQ_DE_ERTRAG,
  ...FAQ_REST.filter((f) => land === "DE" || !f.nurDe),
];

/** FAQ in der Sprache der Seite (gleiche Auswahl wie faqFuer) */
const faqInSprache = (land, en) => {
  if (!en) return faqFuer(land);
  const rest = FAQ_REST.map((f, i) => ({ ...f, ...FAQ_REST_EN[i] }));
  return [land === "AT" ? FAQ_AT_EN() : FAQ_DE_ERTRAG_EN, ...rest.filter((f) => land === "DE" || !f.nurDe)];
};

export default async function RegionenHub({ params }) {
  // Ländermodell: Inhaltsfassung = Land mit eigenem Inhalt (Register seiten.js: AT), sonst die
  // gemeinsame (deutsche) Fassung wie vor Welle 2. Pachtwerte nur gemeinsam und in DE.
  const seitenland = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const fmt = (n, s = 0) => fmtZahl(n, s, sprache);
  const REG = regionenInSprache(sprache);
  const nachErtragS = [...REG].filter((r) => r.ertrag?.kwhProKwp).sort((a, b) => b.ertrag.kwhProKwp - a.ertrag.kwhProKwp);
  const stand = en ? datumText(STAND, "en") : STAND;
  const gemeinsam = !eigenerInhalt("/regionen", seitenland);
  const land = gemeinsam ? "DE" : seitenland; // Reihenfolge der Länder (gemeinsam: DE zuerst wie vor Welle 2)
  const deWerte = !seitenland || seitenland === "DE";
  const mitte = pachtSpanne("mitte");
  const t = texte(seitenland, sprache);
  const lp = (k) => pfad(k, seitenland);
  const link = (k, label) => linkFuer(k, seitenland, label);
  const zuerst = (a, b) => (a.id === land ? -1 : b.id === land ? 1 : 0);
  const laenderS = en ? LAENDER.map((l) => ({ ...l, ...LAENDER_EN[l.id] })) : LAENDER;
  const laenderSortiert = [...laenderS].sort(zuerst);
  const rahmenSortiert = [...(en ? uebersetze({ de: RAHMEN, en: RAHMEN.map((b) => RAHMEN_EN[b.id]) }, "en") : RAHMEN)].sort(zuerst);
  const regionenLand = REG.filter((r) => r.land === land);
  const FAQ = faqInSprache(land, en).filter((f) => deWerte || !f.nurDe);
  const landInfo = (l) => (en ? { ...LAND_INFO[l], ...LAND_INFO[l].en } : LAND_INFO[l]);
  const PFAD = lp("/regionen");
  return chBaum(
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: en ? "Solar parks & agrivoltaics by region" : "Solarpark & Agri-PV nach Region",
          url: abs(PFAD),
          description: t.beschreibung,
          hasPart: (gemeinsam ? REG : regionenLand).map((r) => ({ "@type": "WebPage", name: en ? `Solar park & agrivoltaics ${r.inName}` : `Solarpark & Agri-PV ${r.inName}`, url: abs(lp(regionSchluessel(r.slug))) })),
        }}
      />

      <Hero
        breadcrumbs={land === "DE" ? [{ name: en ? "Regions" : "Regionen" }] : [{ name: landInfo(land).name, href: LAND_INFO[land].einstieg }, { name: en ? "Regions" : "Regionen" }]}
        pill={
          gemeinsam
            ? { marke: "DACH", text: en ? `${REG.length} regional pages with sources, as of ${stand}` : `${REGIONEN.length} Regionalseiten mit Quellen, Stand ${STAND}`, href: "#karte" }
            : { marke: land, text: en ? `${regionenLand.length} regional pages ${landInfo(land).fuerLand}, as of ${stand}` : `${regionenLand.length} Regionalseiten ${LAND_INFO[land].fuerLand}, Stand ${STAND}`, href: "#karte" }
        }
        titel={
          en ? (
            <>Solar park & <span className="whitespace-nowrap">agrivoltaics</span> <span className="ov-text-gradient-light">in your region.</span></>
          ) : (
            <>Solarpark & <span className="whitespace-nowrap">Agri-PV</span> <span className="ov-text-gradient-light">in Ihrer Region.</span></>
          )
        }
        lead={
          en ? (
            <><span className="font-medium text-white">Which land works, what the state requires, how much the sun brings</span>{deWerte ? " and what lease is realistic" : ""} – {t.reichweite}.</>
          ) : (
            <><span className="font-medium text-white">Welche Flächen gehen, was das Land vorschreibt, wie viel die Sonne bringt</span>{deWerte ? " und was an Pacht realistisch ist" : ""} – {t.reichweite}.</>
          )
        }
        aktionen={[
          { label: en ? "Choose region" : "Region wählen", href: "#karte" },
          { label: en ? "Check land" : "Fläche prüfen", href: lp("/flaechencheck") },
        ]}
        hinweis={en ? "Free of charge for landowners · assessment at the map table" : "Für Flächeneigentümer kostenfrei · Einschätzung am Kartentisch"}
        versprechen={
          en
            ? deWerte
              ? ["State law per region", "Eligible land and grid", "Yield according to PVGIS", "Lease realistically assessed"]
              : ["State law per federal state", "Zoning, zones and grid", "Yield according to PVGIS", "Sources on every page"]
            : deWerte
              ? ["Landesrecht je Region", "Flächenkulisse und Netz", "Ertrag nach PVGIS", "Pacht realistisch eingeordnet"]
              : ["Landesrecht je Bundesland", "Widmung, Zonen und Netz", "Ertrag nach PVGIS", "Quellen auf jeder Seite"]
        }
        unten={
          <p className="mt-6 flex items-center gap-2 text-[14px] text-white/70">
            <MapPinned aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />
            {en ? (
              <span>Tap your region on the right – or <a href="#ertrag" className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">compare the yield</a></span>
            ) : (
            <span>Tippen Sie rechts auf Ihre Region – oder <a href="#ertrag" className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">vergleichen Sie den Ertrag</a></span>
            )}
          </p>
        }
        buehne={<ErtragsKarte einlauf />}
        bildunterschrift={en ? "Specific yield per region in kWh/kWp – each tile leads to the regional page" : "Spezifischer Ertrag je Region in kWh/kWp – jede Kachel führt zur Regionalseite"}
      />

      {en ? (
        <RegionFakten
          titel="The regional pages in figures"
          fakten={[
            ...(gemeinsam
              ? [
                  { wert: fmt(REG.length), einheit: "regions", text: "researched individually, with sources" },
                  { wert: `${fmt(ERTRAG_MIN)}–${fmt(ERTRAG_MAX)}`, einheit: "kWh/kWp", text: "specific yield per region (PVGIS)" },
                ]
              : [
                  { wert: fmt(regionenLand.length), einheit: "regions", text: `${landInfo(land).inLand}, researched individually, with sources` },
                  { wert: `${fmt(Math.min(...ertragLand(land)))}–${fmt(Math.max(...ertragLand(land)))}`, einheit: "kWh/kWp", text: "specific yield per region (PVGIS)" },
                ]),
            ...(deWerte
              ? [
                  { wert: `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)}`, einheit: "€/ha", text: "typical lease for ground-mounted PV in the DACH region per year" },
                  { wert: `${fmt(mitte.min)}–${fmt(mitte.max)}`, einheit: "€/ha", text: "middle band – assessment on each regional page" },
                ]
              : [{ wert: fmt(REG.length), einheit: "regions", text: "in Germany, Austria and Switzerland on the map" }]),
          ]}
        />
      ) : (
      <RegionFakten
        fakten={[
          ...(gemeinsam
            ? [
                { wert: fmt(REGIONEN.length), einheit: "Regionen", text: "eigenständig recherchiert, mit Quellen" },
                { wert: `${fmt(ERTRAG_MIN)}–${fmt(ERTRAG_MAX)}`, einheit: "kWh/kWp", text: "spezifischer Ertrag je Region (PVGIS)" },
              ]
            : [
                { wert: fmt(regionenLand.length), einheit: "Regionen", text: `${LAND_INFO[land].inLand}, eigenständig recherchiert, mit Quellen` },
                { wert: `${fmt(Math.min(...ertragLand(land)))}–${fmt(Math.max(...ertragLand(land)))}`, einheit: "kWh/kWp", text: "spezifischer Ertrag je Region (PVGIS)" },
              ]),
          ...(deWerte
            ? [
                { wert: `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)}`, einheit: "€/ha", text: "übliche Pacht Freiflächen-PV im DACH-Raum je Jahr" },
                { wert: `${fmt(mitte.min)}–${fmt(mitte.max)}`, einheit: "€/ha", text: "mittleres Band – Einordnung je Regionalseite" },
              ]
            : [{ wert: fmt(REGIONEN.length), einheit: "Regionen", text: "in Deutschland, Österreich und der Schweiz auf der Karte" }]),
        ]}
      />
      )}

      {/* Karte + Liste */}
      <Section tone="white" space="lg" id="karte" className="scroll-mt-24 pt-24 md:pt-36">
        <SectionHeading
          eyebrow={en ? "Regions" : "Regionen"}
          title={en ? "Choose your region" : "Wählen Sie Ihre Region"}
          lead={
            en
              ? "Each page is researched individually – with state law, eligible land, grid and regional questions. The bar shows the specific yield in comparison."
              : "Jede Seite ist eigenständig recherchiert – mit Landesrecht, Flächenkulisse, Netz und regionalen Fragen. Der Balken zeigt den spezifischen Ertrag im Vergleich."
          }
          className="mb-10 md:mb-14"
        />
        <div className="grid gap-5 lg:grid-cols-3">
            {laenderSortiert.map((l, li) => {
              const liste = REG.filter((r) => r.land === l.id);
              return (
                <Reveal key={l.id} delay={li * 60} className={`rounded-[1.75rem] bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-7 ${l.id === land ? "lg:col-span-3" : li === 1 ? "lg:col-span-2" : ""}`}>
                  <h2 className="flex items-baseline justify-between gap-3 border-b border-ink-200 pb-3 font-display text-[20px] font-bold text-ink-900">
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden="true" className={`h-3 w-3 rounded-[4px] ${LAND_FARBE[l.id]}`} />
                      {l.label}
                    </span>
                    <span className="text-[13px] font-medium text-ink-500">{l.kurz}</span>
                  </h2>
                  <ul className={`mt-3 grid gap-x-4 gap-y-1 ${l.id === land ? "sm:grid-cols-2 lg:grid-cols-4" : li === 1 ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
                    {liste.map((r) => (
                      <li key={r.slug}>
                        <Link href={lp(regionSchluessel(r.slug))} className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[15px] text-ink-800 transition-colors hover:bg-ov-50 hover:text-ov-800">
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
        <SectionHeading
          eyebrow={en ? "Legal framework compared" : "Rechtsrahmen im Vergleich"}
          title={en ? "What differs between Germany, Austria and Switzerland" : "Was sich zwischen Deutschland, Österreich und der Schweiz unterscheidet"}
          className="mb-12"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {rahmenSortiert.map((b, i) => (
            <Reveal key={b.id} delay={i * 70} className="relative overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-e1 ring-1 ring-ink-200/60 md:p-8">
              <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${RAHMEN_FARBE[i]}`} />
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-50 text-ov-600"><b.icon aria-hidden="true" className="h-5 w-5" /></span>
                <span className="text-[12.5px] font-semibold text-ink-500">{laenderS.find((l) => l.id === b.id)?.kurz}</span>
              </div>
              <h3 className="mt-5 font-display text-[22px] font-bold text-ink-900">{b.land}</h3>
              <ul className="mt-4 space-y-3">
                {b.punkte.map((p, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink-700">
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
            eyebrow={en ? "Sunshine compared" : "Sonne im Vergleich"}
            title={en ? "Specific yield per region" : "Spezifischer Ertrag je Region"}
            lead={
              en
                ? "Annual yield of a fixed-mount, optimally tilted installation per kilowatt peak at a representative point in the region (PVGIS, 14 % system losses). Differences within a region can be greater than between regions."
                : "Jahresertrag einer fest aufgeständerten, optimal geneigten Anlage je Kilowatt-Peak an einem repräsentativen Punkt der Region (PVGIS, 14 % Systemverluste). Die Unterschiede innerhalb einer Region können größer sein als zwischen den Regionen."
            }
          />
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-600">
            {laenderS.map((l) => (
              <li key={l.id} className="inline-flex items-center gap-2"><span aria-hidden="true" className={`h-3 w-3 rounded-[4px] ${LAND_FARBE[l.id]}`} />{l.label}</li>
            ))}
          </ul>
          <dl className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
              <dt className="text-[12px] text-ink-500">{en ? "Highest value" : "Höchster Wert"}</dt>
              <dd className="ov-num mt-1 font-display text-[22px] font-extrabold text-ink-900">{fmt(ERTRAG_MAX)}</dd>
              <dd className="text-[12.5px] text-ink-600">{nachErtragS.filter((r) => r.ertrag.kwhProKwp === ERTRAG_MAX).map((r) => r.name).join(", ")}</dd>
            </div>
            <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
              <dt className="text-[12px] text-ink-500">{en ? "Lowest value" : "Niedrigster Wert"}</dt>
              <dd className="ov-num mt-1 font-display text-[22px] font-extrabold text-ink-900">{fmt(ERTRAG_MIN)}</dd>
              <dd className="text-[12.5px] text-ink-600">{nachErtragS.filter((r) => r.ertrag.kwhProKwp === ERTRAG_MIN).map((r) => r.name).join(", ")}</dd>
            </div>
          </dl>
          </div>
          <Reveal>
            <ol className="space-y-2">
              {/* Balken wachsen beim Eintritt gestaffelt von oben (sonnigste Region) nach unten – nur transform */}
              {nachErtragS.map((r, i) => (
                <li key={r.slug}>
                  <Link href={lp(regionSchluessel(r.slug))} className="group grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 rounded-lg py-0.5 text-[14px] sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
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
            <p className="mt-4 text-[12.5px] text-ink-500">
              {en
                ? `kWh/kWp per year; bars scaled from ${fmt(Math.round(ERTRAG_MIN * 0.85))} kWh/kWp. Source: EU JRC PVGIS, queries as of ${stand}.`
                : `kWh/kWp und Jahr; Balken ab ${fmt(Math.round(ERTRAG_MIN * 0.85))} kWh/kWp skaliert. Quelle: EU JRC PVGIS, Abfragen Stand ${STAND}.`}
            </p>
          </Reveal>
        </div>
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={en ? "Frequently asked questions" : "Häufige Fragen"} title={en ? "Solar parks in the regions" : "Solarparks in den Regionen"} />
          <Faq items={FAQ} />
        </div>
      </Section>

      {en ? (
        <Querverweise
          items={[
            { href: lp("/flaechencheck"), titel: "Land check", text: "Traffic light, capacity and lease range for your land in two minutes." },
            { href: lp("/rechner/pacht"), titel: link("/rechner/pacht", "Lease calculator").label, text: "Fixed lease, indexed or revenue share over 30 years." },
            { href: lp("/freiflaeche"), titel: link("/freiflaeche", "Ground-mounted PV").label, text: "Site criteria, EEG land categories, permits and ecology in detail." },
            { href: lp("/agri-pv"), titel: link("/agri-pv", "Agrivoltaics").label, text: "Power and farming on the same land – systems and support." },
          ]}
        />
      ) : (
      <Querverweise
        items={[
          { href: lp("/flaechencheck"), titel: "Flächencheck", text: "Ampel, Leistung und Pachtspanne Ihrer Fläche in zwei Minuten." },
          { href: lp("/rechner/pacht"), titel: link("/rechner/pacht", "Pachtrechner").label, text: "Festpacht, indexiert oder Umsatzbeteiligung über 30 Jahre." },
          { href: lp("/freiflaeche"), titel: link("/freiflaeche", "Freiflächen-PV").label, text: "Flächenkriterien, EEG-Kulisse, Genehmigung und Ökologie im Detail." },
          { href: lp("/agri-pv"), titel: link("/agri-pv", "Agri-PV").label, text: "Strom und Landwirtschaft auf derselben Fläche – Systeme und Förderung." },
        ]}
      />
      )}

      {en ? (
        <CtaBand
          eyebrow="Free of charge for landowners"
          title="Your land – whichever region it is in."
          text="We check planning law, grid and irradiation at the map table and tell you openly what is possible."
          primary={{ label: "To the land check", href: lp("/flaechencheck") }}
          secondary={link("/flaeche-verpachten", "Lease your land")}
        />
      ) : (
      <CtaBand
        eyebrow="Für Flächeneigentümer kostenfrei"
        title="Ihre Fläche – egal in welcher Region."
        text="Wir prüfen Planungsrecht, Netz und Einstrahlung am Kartentisch und sagen Ihnen offen, was möglich ist."
        primary={{ label: "Zum Flächencheck", href: lp("/flaechencheck") }}
        secondary={link("/flaeche-verpachten", "Fläche verpachten")}
      />
      )}
    </div>
  );
}

export const generateMetadata = seitenMetadata("/regionen", metadataFuer);
