import IllustrationRahmen from "@/components/ui/IllustrationRahmen";

/**
 * Illustration für den Slot `szene` von `PageHero variant="dark"`
 * (Position, Breite und Einstieg regelt PageHero; ab 1280 px sichtbar).
 *
 *   <PageHero variant="dark" … szene={<HeroSzene><Solarcarport ton="dunkel" animiert /></HeroSzene>} />
 *
 * Dekorativ (IllustrationRahmen ohne label → aria-hidden). Fester 16:10-Rahmen →
 * kein Layout-Sprung. Lichtschein dahinter, sanftes Schweben nur per transform,
 * unter reduced-motion still.
 */
export default function HeroSzene({ children }) {
  return (
    <div className="relative isolate">
      <div aria-hidden="true" className="absolute -inset-10 -z-10 rounded-full bg-ov-500/15 blur-3xl" />
      <div className="motion-safe:animate-ov-float">
        <IllustrationRahmen ton="navy" format="16/10" className="shadow-e5">
          {children}
        </IllustrationRahmen>
      </div>
    </div>
  );
}
