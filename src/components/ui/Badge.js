import { cn } from "./cn";

/**
 * Badge / Status-Chip des Design-Systems 2.0.
 *
 * ton:   neutral | info | success (= ok) | warn | danger | marke | navy | dunkel | glas
 * groesse: sm | md
 * punkt:   farbiger Statuspunkt davor; live = pulsierender Punkt (Live-Daten)
 * icon:    Lucide-Icon statt Punkt
 *
 * Text immer ≥ 4.5:1 auf dem Hintergrund (geprüft, siehe DESIGN.md).
 * Status nie nur über Farbe: Beschriftung ist Pflicht.
 */
export const BADGE_TOENE = {
  neutral: { flaeche: "bg-ink-100 text-ink-700 ring-ink-200", punkt: "bg-ink-400" },
  info: { flaeche: "bg-navy-50 text-navy-700 ring-navy-100", punkt: "bg-navy-500" },
  success: { flaeche: "bg-ov-50 text-ov-800 ring-ov-200", punkt: "bg-ov-500" },
  ok: { flaeche: "bg-ov-50 text-ov-800 ring-ov-200", punkt: "bg-ov-500" },
  warn: { flaeche: "bg-sun-50 text-sun-700 ring-sun-200", punkt: "bg-sun-500" },
  danger: { flaeche: "bg-danger-50 text-danger-700 ring-danger-200", punkt: "bg-danger-500" },
  marke: { flaeche: "bg-ov-600 text-white ring-ov-700/40", punkt: "bg-white" },
  navy: { flaeche: "bg-navy-700 text-white ring-navy-800", punkt: "bg-ov-300" },
  dunkel: { flaeche: "bg-white/10 text-white ring-white/15", punkt: "bg-ov-300" },
  glas: { flaeche: "ov-glass text-white ring-transparent", punkt: "bg-ov-300" },
};

export default function Badge({ ton = "neutral", groesse = "md", punkt = false, live = false, icon: Icon, className, children, ...rest }) {
  const t = BADGE_TOENE[ton] || BADGE_TOENE.neutral;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1 ring-inset",
        groesse === "sm" ? "gap-1 px-2 py-0.5 text-[11.5px]" : "gap-1.5 px-2.5 py-1 text-[12px]",
        t.flaeche,
        className
      )}
      {...rest}
    >
      {Icon ? (
        <Icon aria-hidden="true" className={groesse === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      ) : live ? (
        <span aria-hidden="true" className={cn("ov-live-punkt h-1.5 w-1.5", t.punkt)} />
      ) : punkt ? (
        <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", t.punkt)} />
      ) : null}
      {children}
    </span>
  );
}
