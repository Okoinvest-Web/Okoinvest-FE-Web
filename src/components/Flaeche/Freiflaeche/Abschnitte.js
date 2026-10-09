// Abschnitte der Seite /freiflaeche: Wertschöpfungskette und Flächenkriterien mit Ampel-Tafel
import { Banknote, Check, Landmark, Layers, MapPinned, Mountain, PlugZap, Route, Ruler, Sun, X } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { FREIFLAECHE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";
import Link from "@/components/Land/Link";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";

const mwpBei = (ha) => ha / FREIFLAECHE.haProMwp;

const KETTE = [
  { icon: MapPinned, t: "Flächensicherung", x: "Kartentisch-Prüfung, Pachtangebot, Nutzungsvertrag und Dienstbarkeit – für Eigentümer kostenfrei." },
  { icon: PlugZap, t: "Netzanschluss", x: "Netzanfrage, Trassenplanung, Umspannwerk oder Einschleifung in die Mittelspannung." },
  { icon: Landmark, t: "Baurecht", x: "Gemeinderat, Bebauungsplan, Gutachten, Ausgleich – oder privilegierte Baugenehmigung." },
  { icon: Banknote, t: "Vermarktung & Finanzierung", x: "EEG-Ausschreibung oder PPA, Bankfinanzierung, Eigenbetrieb oder Verkauf an Investoren." },
];

/** Sprachmodell: Wertschöpfungskette (en nur Texte, je Index wie KETTE). */
const TEXTE_KETTE = {
  de: {
    kette: KETTE,
    eyebrow: "Was wir entwickeln",
    titel: "Vom Acker zum Kraftwerk – mit einem Partner für alle Phasen.",
    lead: `Die ÖkoInvest entwickelt rund 50 MWp pro Jahr neu. Typische Parks liegen zwischen ${FREIFLAECHE.mindestHa} und 100 Hektar – also etwa ${fmt(mwpBei(FREIFLAECHE.mindestHa), 0)} bis ${fmt(mwpBei(100), 0)} MWp.`,
  },
  en: {
    kette: [
      { t: "Securing the land", x: "Desk review, lease offer, land use agreement and easement – free of charge for owners." },
      { t: "Grid connection", x: "Grid request, cable route planning, substation or loop-in connection to the medium-voltage grid." },
      { t: "Building rights", x: "Municipal council, development plan, expert reports, ecological compensation – or a privileged building permit." },
      { t: "Marketing & financing", x: "EEG tender or PPA, bank financing, own operation or sale to investors." },
    ],
    eyebrow: "What we develop",
    titel: "From farmland to power plant – with one partner for every phase.",
    lead: `ÖkoInvest starts developing around 50 MWp of new capacity every year. Typical parks cover between ${FREIFLAECHE.mindestHa} and 100 hectares – roughly ${fmtZahl(mwpBei(FREIFLAECHE.mindestHa), 0, "en")} to ${fmtZahl(mwpBei(100), 0, "en")} MWp.`,
  },
};

/** t: Länderinhalt (inhaltFuer) – kette: { [Titel]: Text } ersetzt einzelne Schritte; ohne t wie vor Welle 2 */
export function Wertschoepfung({ t = {} }) {
  const w = uebersetze(TEXTE_KETTE, spracheDerAnfrage());
  // Länderinhalt ist nach den deutschen Titeln geschlüsselt (KETTE[i].t), der Text kommt in der Sprache der Seite
  const kette = w.kette.map((k, i) => (t.kette?.[KETTE[i].t] ? { ...k, x: t.kette[KETTE[i].t] } : k));
  return (
    <Section tone="white" space="lg">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end lg:gap-16">
        <SectionHeading eyebrow={w.eyebrow} title={w.titel} />
        <Reveal>
          <p className="ov-lead text-ink-600">{w.lead}</p>
        </Reveal>
      </div>

      <ol className="relative mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-0">
        {kette.map((k, i) => (
          <Reveal
            as="li"
            key={i}
            delay={i * 80}
            className={cn(
              "group relative flex flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7",
              "xl:rounded-none xl:first:rounded-l-[2rem] xl:last:rounded-r-[2rem]",
              i === KETTE.length - 1 && "xl:bg-navy-950 xl:text-white xl:ring-navy-950"
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn("ov-num font-display text-[44px] font-extrabold leading-none tracking-[-0.04em]", i === KETTE.length - 1 ? "text-ov-600 xl:text-ov-300" : "text-ov-600/25")}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span aria-hidden="true" className={cn("flex h-11 w-11 items-center justify-center rounded-2xl shadow-e1 ring-1", i === KETTE.length - 1 ? "bg-white text-ov-600 ring-ink-200 xl:bg-white/10 xl:text-ov-300 xl:ring-white/15" : "bg-white text-ov-600 ring-ink-200")}>
                <k.icon className="h-5 w-5" />
              </span>
            </div>
            <h3 className={cn("mt-8 font-display text-[19px] font-bold", i === KETTE.length - 1 ? "text-ink-900 xl:text-white" : "text-ink-900")}>{k.t}</h3>
            <p className={cn("mt-2 text-[15px] leading-relaxed", i === KETTE.length - 1 ? "text-ink-600 xl:text-white/70" : "text-ink-600")}>{k.x}</p>
            {i < KETTE.length - 1 && (
              <span aria-hidden="true" className="absolute -right-[13px] top-1/2 z-10 hidden h-[26px] w-[26px] -translate-y-1/2 items-center justify-center rounded-full bg-white text-ov-600 shadow-e2 ring-1 ring-ink-200 xl:flex">
                <svg viewBox="0 0 12 12" className="h-3 w-3"><path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            )}
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

const KRITERIEN = [
  { icon: Ruler, title: "Größe & Zuschnitt", text: `Ab rund ${FREIFLAECHE.mindestHa} ha, ideal 10–100 ha. Kompakte Zuschnitte sind günstiger als lange, schmale Streifen. Mehrere Eigentümer können Flächen bündeln.` },
  { icon: PlugZap, title: "Netzentfernung", text: `Jeder Kilometer Mittelspannungskabel kostet grob ${fmt(FREIFLAECHE.kabelProMeter)} Tsd. €. Unter 2–3 km ist gut, größere Parks tragen auch längere Trassen – oder einen eigenen Anschluss ans Umspannwerk.` },
  { icon: Mountain, title: "Neigung & Ausrichtung", text: "Eben oder leicht nach Süden, Osten oder Westen geneigt. Steile Nordhänge scheiden praktisch aus, Kuppen und Senken kosten Reihenabstand." },
  { icon: Sun, title: "Einstrahlung & Verschattung", text: "Waldränder, Gebäude und Masten werfen Schatten. Mit Abstandsflächen planen wir sie ein – sie werden zu Biotopstreifen." },
  { icon: Route, title: "Zufahrt & Baugrund", text: "Befestigte Zufahrt für Lkw in der Bauphase, tragfähiger, rammbarer Boden. Steinige Böden oder Altlasten prüfen wir mit Rammtests." },
  { icon: Layers, title: "Planungsrecht & Kulisse", text: "Regionalplan, Flächennutzungsplan, EEG-Kulisse und die Haltung der Gemeinde. Vorbelastete Flächen – Autobahn, Bahn, Konversion – haben die besten Chancen." },
];

const AMPEL = [
  { titel: "Gute Voraussetzungen", ton: "gruen", punkte: ["Randstreifen an Autobahn oder Bahn", "Konversions- und Gewerbebrachen", "Ertragsschwache Acker- und Grünlandflächen", "Netzverknüpfung in wenigen Kilometern", "Gemeinde mit Freiflächenkonzept"] },
  { titel: "Genau prüfen", ton: "gelb", punkte: ["Landschaftsschutzgebiet", "Angrenzender Wald (Abstand, Brandschutz)", "Hangneigung, Senken, Drainagen", "Hochwertige Böden – Agri-PV als Alternative", "Bodendenkmäler, Leitungen, Richtfunk"] },
  { titel: "Meist ausgeschlossen", ton: "rot", punkte: ["Naturschutzgebiet, Nationalpark", "Natura-2000-Kerngebiete (FFH, Vogelschutz)", "Wasserschutzzone I/II", "Festgesetztes Überschwemmungsgebiet (nur mit Ausnahme)", "Wald (Rodung ist praktisch nicht genehmigungsfähig)"] },
];

const TON = {
  gruen: { leuchte: "bg-ov-500 shadow-[0_0_0_6px_rgba(140,186,88,0.25)]", kopf: "bg-ov-50", haken: "text-ov-600" },
  gelb: { leuchte: "bg-sun-400 shadow-[0_0_0_6px_rgba(245,167,15,0.22)]", kopf: "bg-sun-50", haken: "text-sun-600" },
  rot: { leuchte: "bg-navy-950 shadow-[0_0_0_6px_rgba(3,18,43,0.12)]", kopf: "bg-ink-50", haken: "text-ink-400" },
};

/** Sprachmodell: Flächenkriterien und Ampel (en nur Texte, je Index). */
const TEXTE_KRITERIEN = {
  de: {
    kriterien: KRITERIEN,
    ampel: AMPEL,
    eyebrow: "Flächenkriterien",
    titel: "Welche Fläche eignet sich?",
    lead: "Keine Fläche ist perfekt. Entscheidend ist das Zusammenspiel aus Größe, Netz, Lage und Restriktionen – das prüfen wir kostenfrei, bevor wir über Verträge sprechen.",
    link: "Eigene Fläche in zwei Minuten prüfen",
    ampelTitel: "Ampel: Welche Flächen sich eignen",
  },
  en: {
    kriterien: [
      { title: "Size & shape", text: `From around ${FREIFLAECHE.mindestHa} ha, ideally 10–100 ha. Compact plots are cheaper than long, narrow strips. Several owners can pool their land.` },
      { title: "Distance to the grid", text: `Each kilometre of medium-voltage cable costs roughly €${fmtZahl(FREIFLAECHE.kabelProMeter, 0, "en")}k. Under 2–3 km is good; larger parks can also carry longer cable routes – or their own connection to the substation.` },
      { title: "Slope & orientation", text: "Flat or gently sloping to the south, east or west. Steep north-facing slopes are practically ruled out; hilltops and hollows cost row spacing." },
      { title: "Irradiation & shading", text: "Forest edges, buildings and pylons cast shadows. We plan around them with setback areas – which become biotope strips." },
      { title: "Access & subsoil", text: "Paved access for lorries during construction and load-bearing soil suitable for pile driving. We check stony ground or contaminated sites with pile-driving tests." },
      { title: "Planning law & land categories", text: "Regional plan, land use plan, EEG land categories and the municipality’s stance. Pre-impacted land – motorways, railways, conversion sites – has the best chances." },
    ],
    ampel: [
      { titel: "Good conditions", punkte: ["Strips alongside motorways or railways", "Conversion sites and commercial brownfields", "Low-yield arable land and grassland", "Grid connection point within a few kilometres", "Municipality with a ground-mounted PV concept"] },
      { titel: "Check carefully", punkte: ["Landscape protection area", "Adjacent forest (setback, fire protection)", "Slopes, hollows, drainage", "High-quality soils – agrivoltaics as an alternative", "Archaeological sites, pipelines, radio links"] },
      { titel: "Usually ruled out", punkte: ["Nature reserve, national park", "Core Natura 2000 areas (Habitats Directive, Birds Directive)", "Water protection zone I/II", "Designated floodplain (only by exception)", "Forest (clearing is practically never approved)"] },
    ],
    eyebrow: "Site criteria",
    titel: "Which land is suitable?",
    lead: "No site is perfect. What matters is the interplay of size, grid, location and restrictions – we check this free of charge before we talk about contracts.",
    link: "Check your own land in two minutes",
    ampelTitel: "Traffic light: which land is suitable",
  },
};

/** t: Länderinhalt (inhaltFuer) – kriterien: { [Titel]: { title?, text? } }, ampel: ersetzt die Ampel-Tafel */
export function Kriterien({ t = {} }) {
  const w = uebersetze(TEXTE_KRITERIEN, spracheDerAnfrage());
  // Länderinhalt ist nach den deutschen Titeln geschlüsselt (KRITERIEN[i].title)
  const kriterien = w.kriterien.map((k, i) => (t.kriterien?.[KRITERIEN[i].title] ? { ...k, ...t.kriterien[KRITERIEN[i].title] } : k));
  const ampel = t.ampel ?? w.ampel;
  return (
    <Section tone="white" space="lg">
      <div className="rounded-[2rem] bg-sand-50 p-6 ring-1 ring-ink-200/60 sm:p-8 md:p-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <SectionHeading
            eyebrow={w.eyebrow}
            title={w.titel}
            lead={t.kriterienLead ?? w.lead}
          />
          <Reveal>
            <Link href={pfad("/flaechencheck")} className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14.5px] font-semibold text-ov-800 shadow-e1 ring-1 ring-ov-200 transition-colors hover:bg-ov-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
              {w.link}
              <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"><path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </Reveal>
        </div>

        <ul className="mt-10 grid gap-x-8 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
          {kriterien.map((k, i) => (
            <Reveal as="li" key={i} delay={i * 50} className="flex gap-4 border-t border-ink-200/70 py-6">
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200">
                <k.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-[17.5px] font-bold text-ink-900">{k.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{k.text}</p>
              </div>
            </Reveal>
          ))}
        </ul>

        {/* Ampel-Tafel */}
        <Reveal className="mt-8 overflow-hidden rounded-[1.75rem] bg-white shadow-e3 ring-1 ring-ink-200/70">
          <h3 className="sr-only">{w.ampelTitel}</h3>
          <div className="grid divide-y divide-ink-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {ampel.map((s, i) => (
              <div key={i}>
                <p className={cn("flex items-center gap-3 px-6 py-4 font-display text-[17px] font-bold text-ink-900 md:px-7", TON[s.ton].kopf)}>
                  <span aria-hidden="true" className={cn("h-3 w-3 rounded-full", TON[s.ton].leuchte)} />
                  {s.titel}
                </p>
                <ul className="space-y-2.5 px-6 py-5 md:px-7 md:py-6">
                  {s.punkte.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[14.5px] leading-snug text-ink-700">
                      {s.ton === "rot" ? (
                        <X aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                      ) : (
                        <Check aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", TON[s.ton].haken)} strokeWidth={3} />
                      )}
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
