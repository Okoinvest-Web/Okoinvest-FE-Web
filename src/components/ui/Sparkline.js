import { cn } from "./cn";
import { fmtZahl } from "./datenfarben";

/**
 * Kleine Verlaufslinie ohne Achsen (KPI-Kacheln, Tabellenzellen).
 * Server-Komponente. Läuft beim Einscrollen ein (Linie zeichnet sich,
 * Fläche blendet nach), bei reduzierter Bewegung sofort fertig.
 *
 * werte:   Zahlenliste (mind. 2)
 * ton:     marke (grün) | navy | hell (auf Dunkel) | warn | danger
 * flaeche: Verlaufsfläche unter der Linie
 * label:   Kurzbeschreibung für Screenreader, z. B. „Erzeugung der letzten 12 Monate“
 * sofort:  ohne Scroll-Auslöser animieren (z. B. in Dialogen)
 */
const FARBE = {
  marke: "#558227",
  navy: "#003473",
  hell: "#aed083",
  warn: "#c98500",
  danger: "#b8352a",
};

export default function Sparkline({ werte = [], breite = 120, hoehe = 36, ton = "marke", flaeche = true, punkt = true, label, sofort = false, className }) {
  const zahlen = werte.map(Number).filter((v) => Number.isFinite(v));
  if (zahlen.length < 2) return null;
  const min = Math.min(...zahlen);
  const max = Math.max(...zahlen);
  const spanne = max - min || 1;
  const rand = 3;
  const pkt = zahlen.map((v, i) => [
    rand + (i / (zahlen.length - 1)) * (breite - rand * 2),
    rand + (1 - (v - min) / spanne) * (hoehe - rand * 2),
  ]);
  const d = pkt.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const fl = `${d} L${pkt[pkt.length - 1][0].toFixed(1)} ${hoehe} L${pkt[0][0].toFixed(1)} ${hoehe} Z`;
  const farbe = FARBE[ton] || FARBE.marke;
  const gid = `sp-${ton}-${zahlen.length}-${Math.round(zahlen[0] * 100)}-${Math.round(zahlen[zahlen.length - 1] * 100)}`;
  const [lx, ly] = pkt[pkt.length - 1];
  const beschreibung =
    label ?? `Verlauf von ${fmtZahl(zahlen[0])} auf ${fmtZahl(zahlen[zahlen.length - 1])}, Tiefstwert ${fmtZahl(min)}, Höchstwert ${fmtZahl(max)}`;

  return (
    <span
      suppressHydrationWarning
      className={cn("inline-block align-middle", sofort ? "ov-sofort" : "ov-reveal", className)}
      data-dir={sofort ? undefined : "ohne"}
    >
      <svg width={breite} height={hoehe} viewBox={`0 0 ${breite} ${hoehe}`} role="img" aria-label={beschreibung} className="block overflow-visible">
        {flaeche && (
          <>
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={farbe} stopOpacity="0.22" />
                <stop offset="100%" stopColor={farbe} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={fl} fill={`url(#${gid})`} className="ov-flaeche-ein" />
          </>
        )}
        <path d={d} pathLength="1" fill="none" stroke={farbe} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ov-linie" />
        {punkt && <circle cx={lx} cy={ly} r="3" fill={farbe} stroke={ton === "hell" ? "#03122b" : "#fff"} strokeWidth="1.5" className="ov-flaeche-ein" />}
      </svg>
    </span>
  );
}
