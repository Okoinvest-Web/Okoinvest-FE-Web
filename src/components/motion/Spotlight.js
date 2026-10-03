import { cn } from "@/components/ui/cn";

/**
 * Spotlight – weicher Lichtkegel folgt dem Mauszeiger über einer Karte.
 * Server-Komponente; die Zeigerlogik steckt im global eingebundenen
 * <MotionInteraktion/> (ein delegierter Listener für die ganze Seite).
 * Nur bei Maus/Trackpad, nicht auf Touch, nicht bei reduzierter Bewegung.
 * Das Licht liegt mit sehr geringer Deckkraft über dem Inhalt, ist aria-hidden
 * und lässt alle Klicks durch. Bringt `position: relative` mit.
 *
 * Wann: hochwertige Karten (Leistungen, Produkte, Plattform-Features, dunkle Kacheln).
 * Wann NICHT: Fließtextflächen, Tabellen, Formulare, Raster mit mehr als ~8 Karten.
 *
 * @param {object} p
 * @param {string|React.ElementType} [p.as="div"]
 * @param {"hell"|"dunkel"} [p.ton="hell"]  Lichtfarbe passend zum Untergrund.
 * @param {number} [p.groesse=440]           Durchmesser des Lichtkegels in px.
 *
 * @example
 * <Spotlight as="article" ton="dunkel" className="ov-flaeche-dunkel ov-lift p-8">…</Spotlight>
 */
export default function Spotlight({ as: Tag = "div", ton = "hell", groesse, className, style, children, ...rest }) {
  return (
    <Tag
      className={cn("ov-spotlight", className)}
      data-ton={ton === "dunkel" ? "dunkel" : undefined}
      style={groesse ? { "--ov-spot-groesse": `${groesse}px`, ...style } : style}
      {...rest}
    >
      <span aria-hidden="true" className="ov-spot-licht" />
      {children}
    </Tag>
  );
}
