import { Children, isValidElement } from "react";
import { cn } from "@/components/ui/cn";

const MAX_INDEX = 14; // ab hier erscheinen Wörter gemeinsam – kein endloses Warten

/**
 * TextEnthuellung – Headline erscheint Wort für Wort (oder Zeile für Zeile).
 * Server-Komponente, kein Client-JS.
 *
 * - ausloeser="laden" (Standard, für Hero-H1): reine CSS-Animation, läuft auch ohne JS
 *   und endet sichtbar. Erstes Wort ist nach ~100 ms sichtbar (LCP-sicher: Start bei
 *   opacity 0.001 statt 0).
 * - ausloeser="scrollen" (für H2 weiter unten): startet über den globalen RevealObserver.
 * - modus="woerter" (Standard): Strings werden an Leerzeichen geteilt; Elemente
 *   (z. B. <span className="ov-text-gradient">) bleiben ein Block.
 * - modus="zeilen": Jedes Kind ist eine Zeile (Strings oder <span>s). Jede Zeile gleitet
 *   aus einer Maske nach oben. Nur mit festen, kurzen Zeilen verwenden (auch mobil eine Zeile!).
 * - Reduzierte Bewegung: sofort sichtbar.
 *
 * Wann NICHT: Fließtext, Labels, Texte > ~14 Wörter, Überschriften in Formularen/Rechnern.
 * Nicht zusätzlich `ov-hero-in` auf dieselbe Überschrift setzen.
 *
 * @param {object} p
 * @param {string|React.ElementType} [p.as="span"]
 * @param {"woerter"|"zeilen"} [p.modus="woerter"]
 * @param {"laden"|"scrollen"} [p.ausloeser="laden"]
 * @param {number} [p.verzoegerung=0]  Startversatz in ms (Hero: max. 150).
 * @param {number} [p.schritt]          Abstand je Wort/Zeile in ms (Standard 40 / 90).
 *
 * @example
 * <h1 className="ov-h1">
 *   <TextEnthuellung>Ihre Fläche. <span className="ov-text-gradient">Unser Kraftwerk.</span></TextEnthuellung>
 * </h1>
 * <h2 className="ov-h2"><TextEnthuellung ausloeser="scrollen">So läuft die Zusammenarbeit</TextEnthuellung></h2>
 */
export default function TextEnthuellung({
  as: Tag = "span",
  modus = "woerter",
  ausloeser = "laden",
  verzoegerung = 0,
  schritt,
  className,
  style,
  children,
  ...rest
}) {
  const scroll = ausloeser === "scrollen";
  const stil = {
    ...(verzoegerung ? { "--ov-delay": `${verzoegerung}ms` } : {}),
    ...(schritt ? { "--ov-te-schritt": `${schritt}ms` } : {}),
    ...style,
  };

  let inhalt;
  if (modus === "zeilen") {
    inhalt = Children.toArray(children).map((zeile, i) => (
      <span key={i} className="ov-te-zeile">
        <span className="ov-te-zeile-innen" style={{ "--i": Math.min(i, MAX_INDEX) }}>
          {zeile}
        </span>
      </span>
    ));
  } else {
    let i = 0;
    inhalt = [];
    Children.toArray(children).forEach((kind, k) => {
      if (typeof kind === "string" || typeof kind === "number") {
        String(kind)
          .split(/(\s+)/)
          .forEach((teil, t) => {
            if (!teil) return;
            if (/^\s+$/.test(teil)) inhalt.push(" ");
            else
              inhalt.push(
                <span key={`${k}-${t}`} className="ov-te-wort" style={{ "--i": Math.min(i++, MAX_INDEX) }}>
                  {teil}
                </span>
              );
          });
      } else if (isValidElement(kind)) {
        inhalt.push(
          <span key={`${k}-e`} className="ov-te-wort" style={{ "--i": Math.min(i++, MAX_INDEX) }}>
            {kind}
          </span>
        );
      }
    });
  }

  return (
    <Tag
      suppressHydrationWarning={scroll || undefined}
      data-dir={scroll ? "ohne" : undefined}
      className={cn(scroll ? "ov-reveal ov-te-scroll" : "ov-te-laden", modus === "zeilen" && "block", className)}
      style={stil}
      {...rest}
    >
      {inhalt}
    </Tag>
  );
}
