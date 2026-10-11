import { cn } from "./cn";

/**
 * ÖKOINVEST-Wortmarke im Corporate Design der ÖKOVOLT Gruppe:
 * „ÖKO“ in Markengrün, zweiter Wortteil in Markenblau, rechts die
 * Symbolkachel (grünes Feld, blauer Rahmen) – hier mit Solarpark-Reihen
 * und steigender Linie statt Blitz.
 *
 * Solange keine freigegebene Logodatei vorliegt, ist das die einzige
 * Stelle, an der das Logo entsteht. Später einfach durch <Image> ersetzen.
 *
 * tone: "light" (auf hellem Grund) | "dark" (auf Navy/Bild)
 */
export default function Logo({ tone = "light", unterzeile = true, className, title = "ÖkoInvest – Teil der ÖKOVOLT Gruppe" }) {
  const blau = tone === "dark" ? "#ffffff" : "#003473";
  const gruen = "#669933";
  const sub = tone === "dark" ? "rgba(255,255,255,0.75)" : "#003473";
  return (
    <svg
      viewBox={unterzeile ? "0 0 330 74" : "0 0 330 52"}
      role="img"
      aria-label={title}
      className={cn("block h-full w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <text
        x="0"
        y="42"
        fontFamily="var(--font-manrope), Manrope, 'Arial Black', sans-serif"
        fontWeight="800"
        fontSize="46"
        letterSpacing="-1.5"
      >
        <tspan fill={gruen}>ÖKO</tspan>
        <tspan fill={blau}>INVEST</tspan>
      </text>
      {/* Symbolkachel */}
      <g transform="translate(272 2)">
        <rect x="2" y="2" width="50" height="46" rx="9" fill={gruen} stroke={blau} strokeWidth="4" />
        <path d="M11 38 L22 31 L22 38 Z M24 38 L35 29 L35 38 Z" fill="#ffffff" opacity="0.55" />
        <path d="M10 33 L22 24 L31 28 L43 13" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 12 L44 12 L44 20" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {unterzeile && (
        <text
          x="1"
          y="68"
          fontFamily="var(--font-inter), Inter, Arial, sans-serif"
          fontWeight="700"
          fontSize="15.5"
          fill={sub}
          letterSpacing="0.2"
        >
          Projektentwicklung · ÖKOVOLT Gruppe
        </text>
      )}
    </svg>
  );
}
