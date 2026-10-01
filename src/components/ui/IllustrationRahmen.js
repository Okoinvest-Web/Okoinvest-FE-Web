import { cn } from "./cn";

/**
 * Rahmen für Marken-Illustrationen (SVG von T7 unter src/components/illustrationen).
 * Liefert Fläche, Raster, Lichtschein und feste Seitenverhältnisse, damit
 * nichts springt. Die Illustration selbst füllt den Rahmen (width/height 100 %).
 *
 * ton:    sand (Standard) | gruen | navy | weiss
 * format: "16/10" | "4/3" | "1/1" | "4/5" | "21/9" (CSS aspect-ratio)
 * raster: feines Hilfsraster im Hintergrund
 * schein: weicher Lichtfleck (Markengrün)
 * unterschrift: optionale Bildunterschrift (figcaption)
 * label:  Alternativtext, wenn die Illustration Inhalt trägt; sonst dekorativ
 */
const TOENE = {
  sand: "bg-sand-50 ring-1 ring-sand-200",
  gruen: "bg-ov-50 ring-1 ring-ov-100",
  navy: "ov-verlauf-nacht ring-1 ring-white/10 text-white",
  weiss: "bg-white ring-1 ring-ink-200/70",
};

export default function IllustrationRahmen({ ton = "sand", format = "16/10", raster = true, schein = true, unterschrift, label, className, innenClassName, children }) {
  const dunkel = ton === "navy";
  return (
    <figure className={cn("relative", className)}>
      <div
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn("relative isolate overflow-hidden rounded-[2rem]", TOENE[ton] || TOENE.sand)}
        style={{ aspectRatio: format }}
      >
        {raster && <div aria-hidden="true" className={cn("absolute inset-0 -z-10", dunkel ? "ov-grid-bg" : "ov-grid-bg-light")} />}
        {schein && (
          <div
            aria-hidden="true"
            className={cn("absolute -right-1/4 -top-1/3 -z-10 h-[90%] w-[70%] rounded-full blur-3xl", dunkel ? "bg-ov-500/25" : "bg-ov-200/50")}
          />
        )}
        <div className={cn("absolute inset-0 flex items-center justify-center p-[6%]", innenClassName)}>{children}</div>
      </div>
      {unterschrift && <figcaption className="mt-3 text-[13px] leading-snug text-ink-500">{unterschrift}</figcaption>}
    </figure>
  );
}
