// Bauarten: drei Querschnitt-Skizzen (Einzel, Reihe, Schmetterling) + Material Stahl/Holz
import { TreePine, Wrench } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import Kopf from "@/components/Energie/Seite/Kopf";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const STUETZE = "#394050";

function Modul({ d }) {
  return <path d={d} fill="#1f5aa1" stroke="#4a7cbd" strokeWidth="1" />;
}
function Auto({ x, farbe = "#97a0b0", w = 56 }) {
  return (
    <g>
      <rect x={x} y="88" width={w} height="16" rx="7" fill={farbe} />
      <path d={`M${x + 10} 88 q 6 -12 18 -12 h ${w - 36} q 8 0 12 12 Z`} fill={farbe} opacity="0.85" />
      <circle cx={x + 12} cy="104" r="5" fill="#2a3140" />
      <circle cx={x + w - 12} cy="104" r="5" fill="#2a3140" />
    </g>
  );
}
function Boden() {
  return (
    <>
      <rect x="0" y="108" width="260" height="4" rx="2" fill="#dfe3ea" />
      <ellipse cx="130" cy="110" rx="110" ry="5" fill="#03122b" opacity="0.06" />
    </>
  );
}
function Sonne() {
  return (
    <g>
      <circle cx="230" cy="20" r="9" fill="#ffc53d" />
      <circle cx="230" cy="20" r="16" fill="#ffc53d" opacity="0.2" />
    </g>
  );
}

function Einzel() {
  return (
    <svg viewBox="0 0 260 120" className="h-auto w-full" aria-hidden="true">
      <Sonne />
      <Boden />
      <rect x="66" y="44" width="6" height="64" fill={STUETZE} />
      <rect x="182" y="34" width="6" height="74" fill={STUETZE} />
      <Modul d="M42 50 L214 34 L214 41 L42 57 Z" />
      <Auto x={98} farbe="#669933" />
    </svg>
  );
}
function Reihe() {
  return (
    <svg viewBox="0 0 260 120" className="h-auto w-full" aria-hidden="true">
      <Sonne />
      <Boden />
      {[24, 130, 236].map((x) => (
        <rect key={x} x={x - 3} y="40" width="6" height="68" fill={STUETZE} />
      ))}
      <Modul d="M10 48 L250 30 L250 37 L10 55 Z" />
      <Auto x={30} w={52} />
      <Auto x={104} w={52} farbe="#669933" />
      <Auto x={178} w={52} farbe="#c4cad5" />
    </svg>
  );
}
function Schmetterling() {
  return (
    <svg viewBox="0 0 260 120" className="h-auto w-full" aria-hidden="true">
      <Sonne />
      <Boden />
      <rect x="127" y="48" width="6" height="60" fill={STUETZE} />
      <Modul d="M12 30 L130 48 L130 55 L12 37 Z" />
      <path d="M248 30 L130 48 L130 55 L248 37 Z" fill="#0b4488" stroke="#4a7cbd" strokeWidth="1" />
      <path d="M130 56 v8" stroke="#7fa7d6" strokeWidth="2" strokeDasharray="2 3" />
      <Auto x={36} w={58} />
      <Auto x={166} w={58} farbe="#669933" />
    </svg>
  );
}

const ARTEN = [
  { titel: "Einzel- und Doppelcarport", tag: "kleine Flächen", text: "Für kleine Flächen, Besucherplätze und Dienstwagen. Schnell montiert, flexibel erweiterbar.", Svg: Einzel },
  { titel: "Reihencarport", tag: "Stellplatzreihen", text: "Die wirtschaftliche Lösung für lange Stellplatzreihen: einseitig geneigt, Stützen im Raster der Stellplätze.", Svg: Reihe },
  { titel: "Schmetterlingsdach", tag: "Doppelreihen", text: "Zwei Reihen unter einem V-förmigen Dach – deckt beidseitig ab, Wasser läuft in der Mitte ab.", Svg: Schmetterling },
];

/** Sprachmodell: Texte (en nur Texte, Listen je Index). */
const W = {
  de: {
    arten: ARTEN,
    material: [
      { titel: "Stahl", text: "Schlank, vorgefertigt, wirtschaftlich bei großen Spannweiten. Feuerverzinkt oder beschichtet, mit Anprallschutz an den Stützen." },
      { titel: "Holz", text: "Brettschichtholz mit konstruktivem Holzschutz: bindet CO₂ und passt zu Kommunen, Handel und Standorten mit Gestaltungsanspruch." },
    ],
    eyebrow: "Bauarten",
    titel: "Vom Einzelplatz bis zur Parkplatzreihe.",
    lead: "Die Bauart folgt dem Parkplatz: Anordnung, Fahrgassen, Schneelast, Entwässerung und Gestaltungswünsche entscheiden.",
  },
  en: {
    arten: [
      { titel: "Single and double carport", tag: "small areas", text: "For small areas, visitor spaces and company cars. Quick to install, flexible to extend." },
      { titel: "Row carport", tag: "rows of spaces", text: "The economical solution for long rows of parking spaces: tilted to one side, with supports in the grid of the spaces." },
      { titel: "Butterfly roof", tag: "double rows", text: "Two rows under a V-shaped roof – covers both sides, with water draining off in the middle." },
    ],
    material: [
      { titel: "Steel", text: "Slim, prefabricated, economical for large spans. Hot-dip galvanised or coated, with impact protection on the supports." },
      { titel: "Timber", text: "Glued laminated timber with structural wood protection: stores CO₂ and suits municipalities, retail and sites with design ambitions." },
    ],
    eyebrow: "Designs",
    titel: "From single spaces to rows of parking spaces.",
    lead: "The design follows the car park: layout, driving lanes, snow load, drainage and design preferences decide.",
  },
};

export default function Bauarten() {
  const w = uebersetze(W, spracheDerAnfrage());
  return (
    <Section tone="white" space="lg" data-abschnitt="bauarten" aria-labelledby="bauarten-titel">
      <Kopf
        id="bauarten-titel"
        eyebrow={w.eyebrow}
        titel={w.titel}
        lead={w.lead}
        className="mb-12 md:mb-14"
      />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {w.arten.map(({ titel, tag, text, Svg }, i) => (
          <Reveal as="li" key={i} delay={i * 70} className="ov-card-hover group flex flex-col overflow-hidden rounded-[2rem] bg-sand-50 ring-1 ring-ink-200/70">
            <div className="relative bg-gradient-to-b from-navy-50 to-white px-6 pb-4 pt-8">
              <span className="absolute left-5 top-4 rounded-full bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-600 shadow-e1 ring-1 ring-ink-200/70">{tag}</span>
              <Svg />
            </div>
            <div className="flex-1 p-6 pt-5">
              <h3 className="font-display text-[19px] font-bold text-ink-900">{titel}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{text}</p>
            </div>
          </Reveal>
        ))}
      </ul>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {[
          { icon: Wrench, ...w.material[0], ton: "bg-ink-50 text-ink-700 ring-ink-200" },
          { icon: TreePine, ...w.material[1], ton: "bg-ov-50 text-ov-700 ring-ov-200" },
        ].map((m, i) => (
          <Reveal key={i} delay={i * 60} className="flex gap-4 rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-7">
            <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${m.ton}`}>
              <m.icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-[18px] font-bold text-ink-900">{m.titel}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{m.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
