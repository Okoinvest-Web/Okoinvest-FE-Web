"use client";

import Zaehler from "@/components/motion/Zaehler";

/**
 * Zählt eine Zahl hoch, sobald sie sichtbar wird.
 * Rückwärtskompatible Hülle um `@/components/motion/Zaehler` (dort die
 * vollständige Doku): Server-HTML enthält den Endwert, kein Layout-Sprung,
 * reduzierte Bewegung → sofort Endwert.
 *
 * Neue Stellen bitte direkt `<Zaehler wert … />` verwenden.
 */
export default function CountUp({ value, decimals = 0, duration = 1400, prefix = "", suffix = "", className, locale }) {
  return (
    <Zaehler
      wert={value}
      nachkomma={decimals}
      dauer={duration}
      vor={prefix || ""}
      nach={suffix || ""}
      sprache={locale}
      className={className}
    />
  );
}
