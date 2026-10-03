import { cn } from "@/components/ui/cn";

/**
 * PfadZeichnen – SVG-Linien zeichnen sich, sobald der Block ins Bild scrollt.
 * Server-Komponente; ausgelöst vom globalen RevealObserver.
 *
 * Gezeichnet werden alle <path|line|polyline|polygon|circle|ellipse|rect> mit
 * `pathLength="1"` im Inneren (bestehende `.ov-linie`-Pfade funktionieren ebenso).
 * Für gestaffelte Linien `style={{ "--i": n }}` am Pfad setzen.
 * Ohne JS / reduzierte Bewegung: Linien stehen sofort vollständig.
 *
 * Wann: Verbindungslinien, Energiefluss-Skizzen, Diagramm-Kurven, Icon-Konturen.
 * Wann NICHT: gestrichelte Linien (stroke-dasharray wird überschrieben), Text-Pfade,
 * flächige Illustrationen.
 *
 * @param {object} p
 * @param {string|React.ElementType} [p.as="div"]
 * @param {number} [p.dauer=1100]      Zeichendauer in ms.
 * @param {number} [p.verzoegerung=0]  Startversatz in ms.
 * @param {number} [p.schritt=0]       Versatz je `--i` in ms.
 * @param {boolean} [p.sofort=false]   Sofort beim Laden zeichnen (Hero), ohne Scroll-Auslöser.
 *
 * @example
 * <PfadZeichnen schritt={120}>
 *   <svg viewBox="0 0 400 120" aria-hidden="true">
 *     <path pathLength="1" d="M0 100 C 120 10, 280 10, 400 100" stroke="currentColor" fill="none" />
 *   </svg>
 * </PfadZeichnen>
 */
export default function PfadZeichnen({ as: Tag = "div", dauer, verzoegerung = 0, schritt, sofort = false, className, style, children, ...rest }) {
  const stil = {
    ...(dauer ? { "--ov-pfad-dauer": `${dauer}ms` } : {}),
    ...(verzoegerung ? { "--ov-delay": `${verzoegerung}ms` } : {}),
    ...(schritt ? { "--ov-pfad-schritt": `${schritt}ms` } : {}),
    ...style,
  };
  return (
    <Tag
      suppressHydrationWarning={!sofort || undefined}
      data-dir={sofort ? undefined : "ohne"}
      className={cn("ov-pfad", sofort ? "ov-sofort" : "ov-reveal", className)}
      style={stil}
      {...rest}
    >
      {children}
    </Tag>
  );
}
