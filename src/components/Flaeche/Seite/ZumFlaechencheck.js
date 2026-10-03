"use client";

import Button from "@/components/ui/Button";
import { REGIONEN } from "@/lib/invest/markt";

const SCHLUESSEL = "ov-flaechencheck"; // Zwischenstand des FlaechenWizard (sessionStorage)

/**
 * Übergibt Werte aus einem Rechner an den Flächencheck, damit niemand dort
 * wieder bei null anfängt. Schreibt nur bekannte, harmlose Werte (Größe, Region)
 * in den Zwischenstand des Wizards; bereits vorhandene Angaben bleiben erhalten.
 * Der Wizard prüft alle Werte beim Lesen selbst.
 */
export function flaechencheckVorbelegen({ ha, regionId } = {}) {
  try {
    const alt = JSON.parse(window.sessionStorage.getItem(SCHLUESSEL) || "null") || {};
    const region = REGIONEN.find((r) => r.id === regionId);
    const neu = { ...alt };
    if (Number.isFinite(Number(ha)) && Number(ha) > 0) neu.ha = Math.round(Number(ha) * 100) / 100;
    if (region) {
      neu.land = region.land;
      neu.regionId = region.id;
    }
    // Mit Land und Region beginnt der Check direkt bei „Fläche“ – mit Ihrer Größe
    neu.schritt = Math.max(Number.isInteger(alt.schritt) ? alt.schritt : 0, region ? 1 : 0);
    window.sessionStorage.setItem(SCHLUESSEL, JSON.stringify(neu));
  } catch {
    /* Speicher gesperrt (privater Modus) – Link funktioniert trotzdem */
  }
}

/**
 * Crawlbarer Link (<a href="/flaechencheck">) als Button, der beim Klick die
 * Rechnerwerte übergibt. Ohne JS führt er ganz normal zum Flächencheck.
 */
export default function ZumFlaechencheck({ ha, regionId, children = "Fläche prüfen lassen", ...rest }) {
  return (
    <Button href="/flaechencheck#check" pfeil onClick={() => flaechencheckVorbelegen({ ha, regionId })} {...rest}>
      {children}
    </Button>
  );
}
