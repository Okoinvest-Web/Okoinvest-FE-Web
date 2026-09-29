import { Building2, Sun } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { STANDORTE } from "@/data/referenzen";
import { KARTE_BOX, UMRISSE } from "./umrisse";

/**
 * DACH-Karte als Inline-SVG mit den Standorten der Gruppe.
 * Nummern in der Karte entsprechen der Legende daneben (Text bleibt auch
 * mobil lesbar, weil er nicht im SVG steht). Artern und Tilleda liegen nur
 * rund 10 km auseinander – deshalb Marker mit Hinweislinie versetzt.
 */

// Versatz der Nummernmarker gegenüber dem echten Punkt (viewBox-Einheiten)
const VERSATZ = { 1: [-34, 26], 2: [34, 26], 3: [40, 28], 4: [-40, -30] };

const LAENDER = [
  { id: "DE", d: UMRISSE.DE, klasse: "fill-ov-50 stroke-ov-300", label: "Deutschland", x: 198, y: 208 },
  { id: "AT", d: UMRISSE.AT, klasse: "fill-sand-100 stroke-ink-300", label: "Österreich", x: 470, y: 640 },
  { id: "CH", d: UMRISSE.CH, klasse: "fill-ink-50 stroke-ink-200", label: "Schweiz", x: 118, y: 690 },
];

export default function DachKarte({ className }) {
  return (
    <figure className={cn("grid items-center gap-8 rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-ink-200/70 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10", className)}>
      <svg
        viewBox={`0 0 ${KARTE_BOX.w} ${KARTE_BOX.h}`}
        role="img"
        aria-labelledby="dach-karte-titel"
        className="mx-auto h-auto w-full max-w-[460px]"
      >
        <title id="dach-karte-titel">Karte von Deutschland, Österreich und der Schweiz mit den Standorten der ÖKOVOLT Gruppe: Türkheim, Ostermiething sowie den Solarparks Irsingen, Artern und Tilleda</title>
        <g strokeWidth="1.6" strokeLinejoin="round">
          {LAENDER.map((l) => (
            <path key={l.id} d={l.d} className={l.klasse} />
          ))}
        </g>
        <g aria-hidden="true" className="fill-ink-400 font-display" fontSize="17" fontWeight="700" letterSpacing="2.5">
          {LAENDER.map((l) => (
            <text key={l.id} x={l.x} y={l.y} textAnchor="middle">{l.label.toUpperCase()}</text>
          ))}
        </g>
        <g aria-hidden="true">
          {STANDORTE.map((s) => {
            const [dx, dy] = VERSATZ[s.nr] || [0, 0];
            const park = s.art === "park";
            return (
              <g key={s.nr}>
                <line x1={s.x} y1={s.y} x2={s.x + dx} y2={s.y + dy} className={park ? "stroke-ov-600" : "stroke-navy-700"} strokeWidth="2" />
                <circle cx={s.x} cy={s.y} r="5.5" className={park ? "fill-ov-600" : "fill-navy-700"} />
                <circle cx={s.x} cy={s.y} r="11" className={park ? "fill-ov-500/25" : "fill-navy-500/20"} />
                <circle cx={s.x + dx} cy={s.y + dy} r="17" className={park ? "fill-ov-600" : "fill-navy-800"} stroke="white" strokeWidth="3" />
                <text x={s.x + dx} y={s.y + dy + 6.5} textAnchor="middle" className="fill-white font-display" fontSize="18" fontWeight="800">
                  {s.nr}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <figcaption className="min-w-0">
        <p className="font-display text-[20px] font-bold text-ink-900">Standorte der Gruppe</p>
        <ol className="mt-5 space-y-3">
          {STANDORTE.map((s) => {
            const park = s.art === "park";
            const Icon = park ? Sun : Building2;
            return (
              <li key={s.nr} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[14px] font-extrabold text-white", park ? "bg-ov-600" : "bg-navy-800")}
                >
                  {s.nr}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-display text-[16px] font-bold text-ink-900">
                    <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", park ? "text-ov-600" : "text-navy-700")} />
                    <span className="sr-only">{s.nr}. </span>
                    {s.name}
                  </span>
                  <span className="mt-0.5 block text-[14px] leading-snug text-ink-600">{s.text}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-100 pt-5 text-[13px] text-ink-500">
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-full bg-navy-800" /> Unternehmenssitz</span>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-full bg-ov-600" /> Solarpark in Eigenbetrieb</span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
          Die Schweiz ist Zielmarkt der Projektentwicklung von ÖkoInvest. Kartengrundlage: Natural Earth.
        </p>
      </figcaption>
    </figure>
  );
}
