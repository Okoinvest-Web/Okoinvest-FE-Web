import IllustrationRahmen from "@/components/ui/IllustrationRahmen";

/**
 * Illustrations-Ebene für dunkle Landingpage-Heros (`PageHero variant="dark"`).
 * Wird als `children` übergeben und schwebt ab 1280 px rechts neben dem Text –
 * darunter entfällt sie, damit Text und Aktionen mobil nicht nach unten rutschen.
 *
 *   <PageHero variant="dark" …><HeroSzene><Solarcarport ton="dunkel" animiert /></HeroSzene></PageHero>
 *
 * Dekorativ (aria-hidden über IllustrationRahmen ohne label). Fester 16:10-Rahmen →
 * kein Layout-Sprung. Schweben nur per transform, unter reduced-motion still.
 */
export default function HeroSzene({ children, delay = 320 }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden items-center xl:flex"
      style={{ paddingRight: "max(2rem, calc((100vw - 80rem) / 2 + 2rem))" }}
    >
      <div className="ov-hero-in relative w-[min(34vw,500px)]" style={{ "--ov-delay": `${delay}ms` }}>
        <div className="absolute -inset-10 -z-10 rounded-full bg-ov-500/15 blur-3xl" />
        <div className="motion-safe:animate-ov-float">
          <IllustrationRahmen ton="navy" format="16/10" className="shadow-e5">
            {children}
          </IllustrationRahmen>
        </div>
      </div>
    </div>
  );
}
