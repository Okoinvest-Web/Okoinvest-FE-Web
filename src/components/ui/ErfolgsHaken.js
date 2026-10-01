import { cn } from "./cn";

/**
 * Erfolgs-Feedback: Kreis federt auf, Haken zeichnet sich (einmalig beim
 * Erscheinen). Für Formular-Abschluss, gespeicherte Schritte, Zahlungen.
 * Immer mit Text daneben/darunter („Anfrage gesendet“) – das Icon ist Deko.
 *
 * groesse: px; ton: marke | hell (auf Dunkel)
 */
export default function ErfolgsHaken({ groesse = 56, ton = "marke", className }) {
  const hell = ton === "hell";
  return (
    <span
      aria-hidden="true"
      className={cn("ov-erfolg inline-flex shrink-0 items-center justify-center rounded-full", hell ? "bg-ov-300/15 ring-1 ring-ov-300/40" : "bg-ov-50 ring-1 ring-ov-200", className)}
      style={{ width: groesse, height: groesse }}
    >
      <span
        className={cn("flex items-center justify-center rounded-full", hell ? "bg-ov-300 text-navy-950" : "bg-ov-600 text-white")}
        style={{ width: groesse * 0.7, height: groesse * 0.7 }}
      >
        <svg viewBox="0 0 24 24" width={groesse * 0.38} height={groesse * 0.38} fill="none">
          <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" className="ov-linie" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}
