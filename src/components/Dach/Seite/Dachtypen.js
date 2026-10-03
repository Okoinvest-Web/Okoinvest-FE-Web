// „Für welche Dächer“ – vier Gebäudetypen mit eigener Silhouette (Inline-SVG)
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { fmt } from "@/lib/rechner/annahmen";

/** Modulband auf einer geraden Dachlinie */
function Band({ x1, x2, y, n }) {
  const b = (x2 - x1) / n;
  return Array.from({ length: n }, (_, i) => <rect key={i} x={x1 + i * b + 1} y={y - 5} width={b - 2} height="5" rx="0.8" className="fill-navy-500" />);
}

const SILHOUETTE = {
  gewerbe: (
    <>
      {/* Sheddach-Fabrik mit Schornstein */}
      <rect x="150" y="18" width="10" height="44" className="fill-ink-300" />
      <rect x="30" y="44" width="140" height="34" className="fill-sand-200" />
      {[30, 65, 100, 135].map((x) => (
        <g key={x}>
          <polygon points={`${x},44 ${x + 35},28 ${x + 35},44`} className="fill-sand-200" />
          <line x1={x + 2} y1={42} x2={x + 33} y2={28} className="stroke-navy-500" strokeWidth="5" />
        </g>
      ))}
      <rect x="44" y="58" width="16" height="20" className="fill-ink-300" />
      <rect x="120" y="58" width="30" height="8" className="fill-navy-200" />
    </>
  ),
  logistik: (
    <>
      {/* lange, flache Halle mit Andockstellen */}
      <rect x="14" y="40" width="172" height="38" className="fill-sand-200" />
      <Band x1={18} x2={182} y={40} n={12} />
      {[28, 52, 76, 100, 124].map((x) => (
        <rect key={x} x={x} y="58" width="16" height="20" className="fill-ink-300" />
      ))}
      <rect x="150" y="52" width="26" height="6" className="fill-navy-200" />
    </>
  ),
  landwirtschaft: (
    <>
      {/* Maschinenhalle mit Satteldach */}
      <polygon points="40,46 100,20 160,46" className="fill-sand-200" />
      <line x1="104" y1="23" x2="156" y2="45" className="stroke-navy-500" strokeWidth="5" />
      <rect x="46" y="46" width="108" height="32" className="fill-sand-200" />
      <rect x="82" y="54" width="36" height="24" className="fill-ink-300" />
      <circle cx="176" cy="70" r="8" className="fill-ov-300" />
      <rect x="174" y="70" width="4" height="8" className="fill-ink-300" />
    </>
  ),
  handel: (
    <>
      {/* Markt / Sporthalle mit Flachdach, Ost/West aufgeständert */}
      <rect x="24" y="44" width="152" height="34" className="fill-sand-200" />
      {[30, 50, 70, 90, 110, 130, 150].map((x) => (
        <polygon key={x} points={`${x},44 ${x + 8},38 ${x + 16},44`} className="fill-navy-500" />
      ))}
      <rect x="40" y="56" width="120" height="8" className="fill-navy-200" />
      <rect x="88" y="66" width="24" height="12" className="fill-ink-300" />
    </>
  ),
};

const TYPEN = [
  { id: "gewerbe", title: "Gewerbe & Produktion", text: "Hoher Tagesverbrauch im Gebäude – ideal für günstigen Dachstrom zusätzlich zur Pacht.", tag: "Pacht + Dachstrom" },
  { id: "logistik", title: "Logistik & Lager", text: "Sehr große, zusammenhängende Flächen, oft neu gebaut und statisch gut dimensioniert.", tag: "große Flächen" },
  { id: "landwirtschaft", title: "Landwirtschaft", text: "Maschinenhallen, Ställe, Lagerhallen – Achtung bei alten Faserzement-Eindeckungen.", tag: "Eindeckung prüfen", warn: true },
  { id: "handel", title: "Handel & Hallen", text: "Märkte, Sporthallen, Werkstätten: Dachpacht ohne eigenes Kapital und ohne Betriebsaufwand.", tag: "ohne Kapital" },
];

export default function Dachtypen({ mindestM2 }) {
  return (
    <section data-abschnitt="dachtypen" aria-labelledby="dachtypen-titel" className="bg-white pb-20 pt-20 md:pb-28 md:pt-28">
      <div className="ov-container">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <SectionHeading
            eyebrow="Für welche Dächer"
            title={<span id="dachtypen-titel">Große Dächer, die sonst nur Regen abhalten.</span>}
            lead={`Entscheidend sind Größe, Tragreserve, Zustand und ein erreichbarer Netzanschluss. Ab rund ${fmt(mindestM2)} m² wird ein Dach für einen Betreiber interessant – mehrere Dächer an einem Standort zählen zusammen.`}
          />
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-12 lg:grid-cols-4">
          {TYPEN.map((t, i) => (
            <Reveal as="li" key={t.id} delay={i * 70} className="ov-lift flex overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70 sm:flex-col">
              <div className="relative flex w-28 shrink-0 items-stretch bg-gradient-to-b from-sand-50 to-sand-100/60 px-0 pt-6 sm:block sm:w-auto sm:px-4 sm:pt-4">
                <span className={`absolute left-4 top-4 hidden rounded-full sm:inline-block px-2.5 py-1 text-[11.5px] font-semibold ring-1 ${t.warn ? "bg-sun-50 text-sun-700 ring-sun-200" : "bg-white text-ov-700 ring-ov-200"}`}>{t.tag}</span>
                <svg viewBox="0 0 200 84" aria-hidden="true" preserveAspectRatio="xMidYMax slice" className="block h-full w-full sm:mt-6 sm:h-auto">
                  <circle cx="178" cy="14" r="8" className="fill-sun-300" opacity="0.7" />
                  {SILHOUETTE[t.id]}
                  <rect x="0" y="78" width="200" height="6" className="fill-ink-200" />
                </svg>
              </div>
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h3 className="font-display text-[17px] font-bold leading-snug text-ink-900 sm:text-[18px]">{t.title}</h3>
                <p className={`mt-1 text-[12.5px] font-semibold sm:hidden ${t.warn ? "text-sun-700" : "text-ov-700"}`}>{t.tag}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-600 sm:text-[14.5px]">{t.text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
