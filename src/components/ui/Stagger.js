import { cn } from "./cn";

/**
 * Kinder erscheinen nacheinander, sobald der Block ins Bild scrollt.
 * Server-Komponente – der globale RevealObserver setzt `is-visible`.
 * Ohne JavaScript und bei reduzierter Bewegung ist alles sofort sichtbar.
 *
 *   <Stagger as="ul" className="grid gap-4 md:grid-cols-3">…<li/>…</Stagger>
 *
 * Mehr als 12 Kinder erscheinen ab dem 12. gemeinsam (kein endloses Warten).
 * delay: Startversatz in ms; schritt: Abstand je Kind in ms (Standard 60).
 */
export default function Stagger({ as: Tag = "div", delay = 0, schritt, className, style, children, ...rest }) {
  const stil = { ...(delay ? { "--ov-delay": `${delay}ms` } : {}), ...(schritt ? { "--ov-stagger": `${schritt}ms` } : {}), ...style };
  return (
    <Tag suppressHydrationWarning className={cn("ov-reveal ov-stagger", className)} style={stil} {...rest}>
      {children}
    </Tag>
  );
}
