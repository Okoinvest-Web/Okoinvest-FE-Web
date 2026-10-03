// Schema „Eine Anlage, viele Nutzer – über das Netz“: Solarpark → öffentliches Netz (Zuordnung je Viertelstunde)
// → Mitglieder im Nahebereich; Reststrom weiter vom Lieferanten. Linien als SVG, Knoten als HTML (bleiben lesbar).
// dunkel: Hero-Bühne · hell: Abschnitt „Das Prinzip“
import { Factory, Home, Landmark, PlugZap, Sun, Waypoints } from "lucide-react";
import { cn } from "@/components/ui/cn";
import f from "@/components/Energie/fluss.module.css";

// bewegt: einmaliger Ablauf beim Laden (Hero) – Leitungen zeichnen sich vom Park aus, dann laufen drei Impulse
// Park → Netz → Mitglieder. Reststrom bleibt bewusst still (gestrichelt, Nebenweg). Reduziert: Endzustand sofort.

// Koordinaten im 500×400-Raster
const PARK = [80, 300];
const NETZ = [245, 205];
const MITGLIEDER = [
  { icon: Home, label: "Haushalte", pos: [250, 70] },
  { icon: Factory, label: "Betrieb", pos: [420, 150] },
  { icon: Landmark, label: "Gemeinde", pos: [370, 300] },
];
const LIEFERANT = [455, 350];

const pct = ([x, y]) => ({ left: `${(x / 500) * 100}%`, top: `${(y / 400) * 100}%` });

function Knoten({ pos, icon: Icon, label, sub, dunkel, art = "mitglied" }) {
  const gross = art === "park";
  return (
    <div className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center" style={pct(pos)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-2xl ring-1",
          gross ? "h-12 w-12 bg-sun-400 text-navy-950 ring-sun-300 shadow-[0_12px_32px_-10px_rgba(245,167,15,0.8)] sm:h-16 sm:w-16" : "h-9 w-9 sm:h-12 sm:w-12",
          !gross && art === "netz" && (dunkel ? "bg-navy-700 text-white ring-navy-400/60" : "bg-navy-700 text-white ring-navy-700"),
          !gross && art === "mitglied" && (dunkel ? "bg-white text-ov-700 ring-white/40" : "bg-white text-ov-700 ring-ink-200 shadow-e1"),
          !gross && art === "lieferant" && (dunkel ? "bg-white/[0.06] text-white/60 ring-white/20" : "bg-sand-100 text-ink-500 ring-ink-200")
        )}
      >
        <Icon className={gross ? "h-6 w-6 sm:h-7 sm:w-7" : "h-4 w-4 sm:h-5 sm:w-5"} />
      </span>
      <span className={cn("mt-1.5 flex flex-col items-center rounded-lg px-2 py-0.5", dunkel ? "bg-navy-950/85" : "bg-white/90")}>
        <span className={cn("whitespace-nowrap text-[12px] font-semibold leading-tight sm:text-[13.5px]", dunkel ? "text-white" : "text-ink-900")}>{label}</span>
        {sub && <span className={cn("whitespace-nowrap text-[11.5px] max-sm:hidden leading-tight sm:text-[12px]", dunkel ? "text-white/65" : "text-ink-500")}>{sub}</span>}
      </span>
    </div>
  );
}

export default function NetzSchema({ dunkel = false, bewegt = false, className }) {
  const dPark = `M${PARK[0]} ${PARK[1]} C ${(PARK[0] + NETZ[0]) / 2} ${PARK[1]}, ${(PARK[0] + NETZ[0]) / 2} ${NETZ[1]}, ${NETZ[0]} ${NETZ[1]}`;
  const dMitglied = (m) => `M${NETZ[0]} ${NETZ[1]} C ${(NETZ[0] + m.pos[0]) / 2} ${NETZ[1]}, ${(NETZ[0] + m.pos[0]) / 2} ${m.pos[1]}, ${m.pos[0]} ${m.pos[1]}`;
  const zeichnen = bewegt ? { pathLength: "1", className: "ov-linie" } : {};
  return (
    <div className={cn("relative aspect-[5/4] w-full", className)}>
      <svg aria-hidden="true" viewBox="0 0 500 400" preserveAspectRatio="none" fill="none" className="absolute inset-0 h-full w-full">
        {/* Nahebereich */}
        <ellipse cx="320" cy="200" rx="175" ry="175" stroke={dunkel ? "#aed083" : "#8cba58"} strokeOpacity={dunkel ? 0.35 : 0.7} strokeWidth="1.5" strokeDasharray="5 7" vectorEffect="non-scaling-stroke" fill={dunkel ? "#669933" : "#f4f9ee"} fillOpacity={dunkel ? 0.06 : 1} />
        {/* Park → Netz */}
        <g stroke={dunkel ? "#ffc53d" : "#f5a70f"} strokeWidth="3" strokeLinecap="round" className={cn(bewegt && "ov-sofort")} style={bewegt ? { "--ov-delay": "300ms" } : undefined}>
          <path d={dPark} {...zeichnen} />
        </g>
        {/* Netz → Mitglieder */}
        <g stroke={dunkel ? "#8cba58" : "#669933"} strokeWidth="2.5" strokeLinecap="round" className={cn(bewegt && "ov-sofort")} style={bewegt ? { "--ov-delay": "900ms" } : undefined}>
          {MITGLIEDER.map((m, i) => (
            <path key={i} d={dMitglied(m)} {...zeichnen} />
          ))}
        </g>
        {bewegt && (
          <>
            <g className="ov-sofort" style={{ "--fluss-start": "1500ms", "--fluss-dauer": "1400ms" }}>
              <path d={dPark} pathLength="1" className={f.impuls} stroke="#fff3c4" strokeWidth="5" />
            </g>
            <g className="ov-sofort" style={{ "--fluss-start": "2350ms", "--fluss-dauer": "1400ms", "--fluss-schritt": "0ms" }}>
              {MITGLIEDER.map((m, i) => (
                <path key={i} d={dMitglied(m)} pathLength="1" className={f.impuls} stroke="#e6f1d8" strokeWidth="4.5" />
              ))}
            </g>
          </>
        )}
        {/* Reststrom */}
        <path d={`M${LIEFERANT[0]} ${LIEFERANT[1]} C 430 330, 400 315, 370 300`} stroke={dunkel ? "#ffffff" : "#394050"} strokeOpacity={dunkel ? 0.3 : 0.35} strokeWidth="1.5" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
      </svg>

      <span className={cn("absolute right-[3%] top-[3%] text-[11px] font-bold uppercase tracking-[0.16em] sm:text-[12px]", dunkel ? "text-ov-300" : "text-ov-700")}>Nahebereich</span>

      <Knoten pos={PARK} icon={Sun} label="Solarpark" sub="erzeugt" art="park" dunkel={dunkel} />
      <Knoten pos={NETZ} icon={Waypoints} label="Öffentliches Netz" sub="je Viertelstunde zugeordnet" art="netz" dunkel={dunkel} />
      {MITGLIEDER.map((m) => (
        <Knoten key={m.label} pos={m.pos} icon={m.icon} label={m.label} dunkel={dunkel} />
      ))}
      <Knoten pos={LIEFERANT} icon={PlugZap} label="Reststrom" sub="vom Lieferanten" art="lieferant" dunkel={dunkel} />
    </div>
  );
}
