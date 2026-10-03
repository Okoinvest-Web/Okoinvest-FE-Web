import { Children, cloneElement, isValidElement } from "react";
import { cn } from "@/components/ui/cn";

/**
 * Magnetisch – der Primär-CTA folgt dem Mauszeiger um wenige Pixel und federt
 * beim Verlassen zurück. Logik im globalen <MotionInteraktion/>; nur Maus/Trackpad,
 * nicht bei reduzierter Bewegung. Reichweite = Element selbst (kein Fangradius).
 *
 * Setzt die Klasse `ov-magnet` auf das EINZIGE Kind (kein zusätzlicher Wrapper).
 * Alternativ `<Button magnetisch>` oder direkt `className="ov-magnet"`.
 *
 * Wann: EIN Haupt-CTA pro Ansicht (Hero, CtaBand).
 * Wann NICHT: Navigation, Listen von Buttons, Formular-Absenden, Elemente mit
 * eigenem `transform` (.ov-press, .ov-lift, .ov-kipp).
 *
 * @param {object} p
 * @param {number} [p.staerke=0.25]  Anteil des Zeigerabstands (0.15–0.35); Versatz max. 8 px.
 *
 * @example
 * <Magnetisch><Button href="/flaechencheck" size="lg" pfeil>Fläche prüfen</Button></Magnetisch>
 */
export default function Magnetisch({ staerke, children }) {
  const kind = Children.only(children);
  if (!isValidElement(kind)) return kind;
  return cloneElement(kind, {
    className: cn(kind.props.className, "ov-magnet"),
    ...(staerke ? { "data-magnet": String(staerke) } : {}),
  });
}
