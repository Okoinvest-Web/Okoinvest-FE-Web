import { cn } from "@/components/ui/cn";

/**
 * Parallax – Inhalt verschiebt sich beim Scrollen leicht gegen die Seite.
 * Reines CSS (scroll-driven animation, `animation-timeline: view()`), kein JS,
 * läuft außerhalb des Hauptthreads. Browser ohne Unterstützung und reduzierte
 * Bewegung: steht still. Kein Layout-Einfluss (nur transform).
 *
 * Wann: dekorative Bilder/Illustrationen, Hintergrund-Formen, Bildausschnitte in SplitMedia.
 * Wann NICHT: Text, Formulare, Buttons, Inhalte mit sticky/fixed, das Hero-LCP-Bild.
 * Bild in einen Rahmen mit overflow-hidden legen und leicht vergrößern (z. B. `scale-110`),
 * damit beim Verschieben keine Kanten sichtbar werden.
 *
 * @param {object} p
 * @param {string|React.ElementType} [p.as="div"]
 * @param {number} [p.staerke=32]  Maximaler Versatz in px (nach oben und unten). Empfohlen 16–48.
 *
 * @example
 * <div className="overflow-hidden rounded-3xl">
 *   <Parallax staerke={24}><Image className="scale-110" … /></Parallax>
 * </div>
 */
export default function Parallax({ as: Tag = "div", staerke = 32, className, style, children, ...rest }) {
  return (
    <Tag className={cn("ov-parallax", className)} style={{ "--ov-parallax": `${staerke}px`, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
