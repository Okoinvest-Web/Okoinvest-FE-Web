// Plausibilisierung je Gerät (reine Funktionen). Vergleicht einen neuen Messwert mit dem letzten gespeicherten Stand.
//  - Zähler rückwärts  → Wert des Registers wird verworfen (nicht gespeichert), Befund „zaehler_rueckwaerts“
//  - Zählersprung      → Zuwachs > sprungFaktor × Nennleistung × Zeit (+ 1 kWh Toleranz) → verworfen, Befund „zaehler_sprung“
//  - Leistung > 130 % der Nennleistung → gekappt nicht, aber markiert (Messfehler oder falsche Stammdaten)
// Verworfene Werte werden mit `plausibel = false` und Hinweis protokolliert, damit Summen nie falsch werden.

const ZAEHLER = ["erzeugungKwh", "netzbezugKwh", "einspeisungKwh"];

/**
 * vorher: { ts, erzeugungKwh, netzbezugKwh, einspeisungKwh } | null
 * anlage: { kwp, speicherKw, anschlussKw? } (Stammdaten aus Frappe, darf fehlen)
 */
export function plausibilisieren(wert, vorher, anlage = {}, { sprungFaktor = 1.5 } = {}) {
  const neu = { ...wert };
  const befunde = [];
  const flags = [];
  const stunden = vorher?.ts ? (Date.parse(wert.ts) - Date.parse(vorher.ts)) / 3600e3 : null;
  if (stunden !== null && stunden <= 0) {
    // älter als der letzte Stand (Nachlieferung): speichern, aber Zähler nicht gegen den neueren Stand prüfen
    flags.push("nachlieferung");
    return { wert: neu, befunde, flags, plausibel: true };
  }
  const kwp = Number(anlage.kwp) || 0;
  const grenzeKw = Math.max(kwp, Number(anlage.speicherKw) || 0, Number(anlage.anschlussKw) || 0);
  for (const z of ZAEHLER) {
    if (neu[z] === undefined || vorher?.[z] === undefined || vorher[z] === null) continue;
    const delta = neu[z] - vorher[z];
    if (delta < -0.001) {
      befunde.push({ regel: "zaehler_rueckwaerts", text: `${z}: ${vorher[z]} → ${neu[z]} kWh` });
      flags.push(`${z}_rueckwaerts`);
      delete neu[z];
    } else if (grenzeKw > 0 && stunden !== null && delta > sprungFaktor * grenzeKw * stunden + 1) {
      // Bezug kann die PV-Leistung übersteigen (Last) – dort gilt die Anschlussleistung bzw. großzügig das Dreifache
      const erlaubt = z === "netzbezugKwh" && !anlage.anschlussKw ? 3 * sprungFaktor * grenzeKw * stunden + 1 : sprungFaktor * grenzeKw * stunden + 1;
      if (delta > erlaubt) {
        befunde.push({ regel: "zaehler_sprung", text: `${z}: +${Math.round(delta)} kWh in ${Math.round(stunden * 60)} min` });
        flags.push(`${z}_sprung`);
        delete neu[z];
      }
    }
  }
  if (kwp > 0 && neu.pvKw > kwp * 1.3) flags.push("pv_ueber_nennleistung");
  return { wert: neu, befunde, flags, plausibel: flags.every((f) => f === "nachlieferung" || f === "pv_ueber_nennleistung") };
}
