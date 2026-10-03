import { Children, Fragment, cloneElement, isValidElement } from "react";
import TextEnthuellung from "@/components/motion/TextEnthuellung";

/**
 * Hero-Überschrift der Vertrauens- und Wissensseiten: baut sich Wort für Wort
 * auf (reines CSS, läuft ohne JS, erstes Wort nach ~100 ms sichtbar → LCP-sicher).
 *
 * - Ein Fragment wird aufgelöst.
 * - Ein Span mit reinem Text (z. B. der Verlaufs-Span) wird in Wort-Spans mit
 *   derselben Klasse zerlegt – so bricht die Zeile wie vorher um und auch der
 *   Verlaufsteil erscheint Wort für Wort.
 * - Reduzierte Bewegung / ohne JS: sofort sichtbar (TextEnthuellung).
 */
const NBSP = " ";

export default function HeroTitel({ children, verzoegerung = 60, schritt }) {
  const roh = isValidElement(children) && children.type === Fragment ? children.props.children : children;
  const teile = [];
  Children.toArray(roh).forEach((kind, k) => {
    // Geschützte Leerzeichen (&nbsp;) halten Wortpaare zusammen – als ein Block weitergeben
    if (typeof kind === "string" && kind.includes(NBSP)) {
      kind.split(/([^\s]+ [^\s]+)/).forEach((teil, t) => {
        if (!teil) return;
        teile.push(teil.includes(NBSP) ? <span key={`${k}-nb${t}`}>{teil}</span> : teil);
      });
      return;
    }
    if (isValidElement(kind) && kind.type === "span" && typeof kind.props.children === "string") {
      kind.props.children
        .split(/\s+/)
        .filter(Boolean)
        .forEach((wort, w, alle) => {
          teile.push(cloneElement(kind, { key: `${k}-${w}` }, wort));
          if (w < alle.length - 1) teile.push(" ");
        });
    } else teile.push(kind);
  });
  // Nachbar-Strings zusammenführen, damit TextEnthuellung sie an Leerzeichen teilt
  const flach = teile.reduce((acc, t) => {
    if (typeof t === "string" && typeof acc[acc.length - 1] === "string") acc[acc.length - 1] += t;
    else acc.push(t);
    return acc;
  }, []);
  return (
    <TextEnthuellung verzoegerung={verzoegerung} schritt={schritt}>
      {flach}
    </TextEnthuellung>
  );
}
