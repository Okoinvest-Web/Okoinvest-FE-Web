import { cn } from "./cn";

/**
 * Fortschrittsring (Quote, Auslastung, Profil-Vollständigkeit).
 * Server-Komponente; der Ring läuft beim Einscrollen ein.
 *
 * wert, max (Standard 100); groesse in px; staerke = Linienbreite
 * ton: marke | navy | warn | danger | auto (≥ 80 grün, ≥ 50 hellgrün, sonst Sonne)
 * dunkel: auf Navy-Flächen
 * label: Zugänglicher Name (Pflicht, wenn kein sichtbarer Kontext)
 * children: eigener Inhalt in der Mitte (sonst Prozentwert)
 */
const TON = { marke: "#669933", navy: "#003473", warn: "#c98500", danger: "#b8352a", hell: "#aed083" };

export default function FortschrittsRing({ wert = 0, max = 100, groesse = 72, staerke = 7, ton = "auto", dunkel = false, label = "Fortschritt", sofort = false, className, children }) {
  const anteil = Math.max(0, Math.min(1, (Number(wert) || 0) / (max || 100)));
  const prozent = Math.round(anteil * 100);
  const farbe =
    ton === "auto" ? (prozent >= 80 ? (dunkel ? TON.hell : TON.marke) : prozent >= 50 ? "#8cba58" : "#f5a70f") : TON[ton] || TON.marke;
  const r = (groesse - staerke) / 2;
  const c = groesse / 2;
  return (
    <span
      suppressHydrationWarning
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Number(wert) || 0}
      aria-label={label}
      className={cn("relative inline-flex shrink-0 items-center justify-center", sofort ? "ov-sofort" : "ov-reveal", className)}
      data-dir={sofort ? undefined : "ohne"}
      style={{ width: groesse, height: groesse }}
    >
      <svg width={groesse} height={groesse} viewBox={`0 0 ${groesse} ${groesse}`} aria-hidden="true" className="-rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke={dunkel ? "rgba(255,255,255,0.12)" : "#eef0f4"} strokeWidth={staerke} />
        {anteil > 0 && (
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={farbe}
            strokeWidth={staerke}
            strokeLinecap="round"
            pathLength="1"
            className="ov-ring-wert"
            style={{ "--ov-p": anteil }}
          />
        )}
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center text-center", dunkel ? "text-white" : "text-ink-900")}>
        {children ?? (
          <span className="ov-num font-display font-extrabold tracking-tight" style={{ fontSize: Math.max(11, groesse * 0.24) }}>
            {prozent}
            <span className="text-[0.6em] font-bold opacity-70">%</span>
          </span>
        )}
      </span>
    </span>
  );
}
