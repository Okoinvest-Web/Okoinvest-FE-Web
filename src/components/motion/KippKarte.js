import { cn } from "@/components/ui/cn";

/**
 * KippKarte – Karte neigt sich dezent (max. 3°) zum Mauszeiger.
 * Logik im globalen <MotionInteraktion/>; nur Maus/Trackpad, nicht bei
 * reduzierter Bewegung. Kombinierbar mit `ov-lift` / `ov-card-hover`
 * (das Anheben bleibt erhalten).
 *
 * Wann: einzelne Vorzeige-Objekte (Produkt-/App-Mockup, Zertifikat, große Kennzahl-Kachel).
 * Wann NICHT: Raster mit vielen Karten, Karten mit Formularen oder viel Text, Elemente
 * mit eigenem `transform`.
 *
 * @param {object} p
 * @param {string|React.ElementType} [p.as="div"]
 * @param {number} [p.grad=3]  Maximaler Kippwinkel in Grad (1–5).
 *
 * @example
 * <KippKarte className="ov-flaeche-erhaben ov-lift p-6">…</KippKarte>
 */
export default function KippKarte({ as: Tag = "div", grad, className, children, ...rest }) {
  return (
    <Tag className={cn("ov-kipp", className)} data-kipp={grad ? String(grad) : undefined} {...rest}>
      {children}
    </Tag>
  );
}
