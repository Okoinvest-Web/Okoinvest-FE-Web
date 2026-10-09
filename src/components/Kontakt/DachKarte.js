/**
 * Stilisierte Lagekarte DACH (stark vereinfachte Umrisse) mit Standortpunkt.
 * Bewusst ohne Google Maps: keine Datenübertragung an Dritte.
 * Projektion: einfache Plattkarte mit Breitenkorrektur – für die Orientierung genügt das.
 */
import { spracheDerAnfrage } from "@/lib/land/seite";

const X = (lon) => (lon - 5.5) * 60;
const Y = (lat) => (55.2 - lat) * 90;
const pfad = (pts) => pts.map(([lon, lat], i) => `${i ? "L" : "M"}${X(lon).toFixed(1)} ${Y(lat).toFixed(1)}`).join(" ") + " Z";

const DE = [
  [7.0, 53.6], [8.6, 53.9], [8.9, 54.9], [9.9, 54.8], [11.0, 54.2], [12.5, 54.5], [14.2, 53.9], [14.4, 53.3], [14.1, 52.8], [14.7, 52.1],
  [14.6, 51.5], [15.0, 51.0], [14.3, 50.9], [12.9, 50.4], [12.1, 50.3], [12.5, 49.9], [13.8, 48.8], [13.4, 48.6], [13.0, 48.3], [12.9, 47.7],
  [13.0, 47.5], [12.2, 47.7], [11.1, 47.4], [10.2, 47.3], [9.6, 47.5], [8.6, 47.6], [7.6, 47.6], [7.6, 48.1], [8.2, 48.9], [6.4, 49.4],
  [6.1, 49.5], [6.4, 50.3], [6.0, 50.8], [5.9, 51.1], [6.2, 51.9], [6.8, 52.0], [7.1, 52.6], [7.2, 53.2],
];
const AT = [
  [9.6, 47.5], [9.5, 47.1], [10.2, 46.85], [11.0, 46.8], [12.1, 47.0], [12.4, 46.7], [13.7, 46.5], [14.9, 46.6], [16.0, 46.7], [16.1, 46.9],
  [16.5, 47.5], [16.9, 48.0], [16.9, 48.6], [15.0, 49.0], [14.0, 48.6], [13.4, 48.6], [13.0, 48.3], [12.9, 47.7], [13.0, 47.5], [12.2, 47.7],
  [11.1, 47.4], [10.2, 47.3],
];
const CH = [
  [6.1, 46.2], [7.0, 45.9], [7.9, 45.95], [8.4, 46.3], [9.0, 45.85], [9.3, 46.5], [10.1, 46.6], [10.45, 46.9], [9.5, 47.1], [9.6, 47.5],
  [8.6, 47.6], [7.6, 47.6], [6.9, 47.4], [6.1, 46.6],
];

const OSTERMIETHING = [12.83, 48.05];
const TUERKHEIM = [10.64, 48.06];

export default function DachKarte({ className }) {
  const [ox, oy] = [X(OSTERMIETHING[0]), Y(OSTERMIETHING[1])];
  const [tx, ty] = [X(TUERKHEIM[0]), Y(TUERKHEIM[1])];
  const en = spracheDerAnfrage() === "en";
  return (
    <svg viewBox="-20 -20 740 880" className={className} role="img" aria-labelledby="dach-karte-t">
      <title id="dach-karte-t">{en ? "Stylised map of Germany, Austria and Switzerland showing the Ostermiething location (Upper Austria)" : "Stilisierte Karte von Deutschland, Österreich und der Schweiz mit dem Standort Ostermiething (Oberösterreich)"}</title>
      <defs>
        <pattern id="dach-punkte" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.3" fill="#cde3b1" />
        </pattern>
        <radialGradient id="dach-glow">
          <stop offset="0" stopColor="#8cba58" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8cba58" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g strokeLinejoin="round">
        <path d={pfad(DE)} fill="#f4f9ee" stroke="#8cba58" strokeWidth="2.5" />
        <path d={pfad(DE)} fill="url(#dach-punkte)" />
        <path d={pfad(AT)} fill="#e6f1d8" stroke="#669933" strokeWidth="2.5" />
        <path d={pfad(CH)} fill="#f4f9ee" stroke="#8cba58" strokeWidth="2.5" />
        <path d={pfad(CH)} fill="url(#dach-punkte)" />
      </g>

      <g fontFamily="var(--font-display, sans-serif)" fontWeight="800" fill="#6b7486" fontSize="30" letterSpacing="3">
        <text x={X(9.6)} y={Y(51.3)} textAnchor="middle">DE</text>
        <text x={X(15.2)} y={Y(47.35)} textAnchor="middle">AT</text>
        <text x={X(7.9)} y={Y(46.55)} textAnchor="middle">CH</text>
      </g>

      {/* Verbindung innerhalb der Gruppe */}
      <path d={`M${tx} ${ty} Q${(tx + ox) / 2} ${ty - 70} ${ox} ${oy}`} fill="none" stroke="#003473" strokeOpacity="0.45" strokeWidth="2.5" strokeDasharray="2 8" strokeLinecap="round" />

      {/* Türkheim – Muttergesellschaft */}
      <circle cx={tx} cy={ty} r="8" fill="#ffffff" stroke="#003473" strokeWidth="3" />
      <text x={tx} y={ty + 34} textAnchor="middle" fontSize="19" fontWeight="700" fill="#262c38" paintOrder="stroke" stroke="#f4f9ee" strokeWidth="6">
        Türkheim
      </text>
      <text x={tx} y={ty + 56} textAnchor="middle" fontSize="15" fill="#5b6475" paintOrder="stroke" stroke="#f4f9ee" strokeWidth="6">
        {en ? "Parent company" : "Muttergesellschaft"}
      </text>

      {/* Ostermiething – ÖkoInvest */}
      <circle cx={ox} cy={oy} r="60" fill="url(#dach-glow)" />
      <circle cx={ox} cy={oy} r="13" fill="#558227" stroke="#ffffff" strokeWidth="4" />
      <path d={`M${ox + 8} ${oy - 10} L${ox + 30} ${oy - 52}`} stroke="#03122b" strokeWidth="3" />
      <g transform={`translate(${ox + 4} ${oy - 132})`}>
        <rect width="256" height="68" rx="16" fill="#03122b" />
        <text x="18" y="29" fontSize="19" fontWeight="800" fill="#ffffff" fontFamily="var(--font-display, sans-serif)">ÖkoInvest GmbH</text>
        <text x="18" y="52" fontSize="15" fill="#aed083">{en ? "Ostermiething · Upper Austria" : "Ostermiething · Oberösterreich"}</text>
      </g>
    </svg>
  );
}
