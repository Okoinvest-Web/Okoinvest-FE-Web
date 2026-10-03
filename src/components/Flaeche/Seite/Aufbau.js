import { cn } from "@/components/ui/cn";
import s from "./aufbau.module.css";

/** Rollen-Klassen für Teile einer Schemagrafik: fallen, heben, pop, wachsen, ein, zeichnen */
export const aufbau = s;

/**
 * Aufbau – Container, der die Teile einer Schemagrafik nacheinander einsetzt
 * (Server-Komponente, Logik über den globalen RevealObserver bzw. reines CSS).
 *
 * @param {boolean} [sofort=false]   beim Laden starten (Hero) statt beim Hineinscrollen
 * @param {number}  [verzoegerung]   Startversatz in ms
 * @param {number}  [schritt]        Abstand je `--i` in ms (Standard 55)
 */
export default function Aufbau({ as: Tag = "div", sofort = false, verzoegerung, schritt, className, style, children, ...rest }) {
  const stil = {
    ...(verzoegerung ? { "--ov-delay": `${verzoegerung}ms` } : {}),
    ...(schritt ? { "--schritt": `${schritt}ms` } : {}),
    ...style,
  };
  return (
    <Tag
      suppressHydrationWarning={!sofort || undefined}
      data-dir={sofort ? undefined : "ohne"}
      className={cn(s.buehne, sofort ? s.sofort : "ov-reveal", className)}
      style={stil}
      {...rest}
    >
      {children}
    </Tag>
  );
}
