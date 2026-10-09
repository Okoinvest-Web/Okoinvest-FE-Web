"use client";

import { useSyncExternalStore } from "react";
import CtaBand from "@/components/ui/CtaBand";
import { ROLLE_EREIGNIS, ROLLE_SPEICHER, gruppenFuer } from "./zielgruppen";
import { useSprache } from "@/components/Sprache/SpracheKontext";

/**
 * Abschluss der Startseite: greift die Zielgruppen-Wahl aus dem Hero auf
 * (sessionStorage + Ereignis) und zeigt den passenden Hauptweg.
 * Server-HTML und erster Client-Render = Standard-CtaBand (kein Hydration-Unterschied,
 * ohne JS vollständig). Der Abschnitt liegt am Seitenende – ein späterer Wechsel
 * der Beschriftung verschiebt nichts im sichtbaren Bereich.
 */
function abonnieren(cb) {
  window.addEventListener(ROLLE_EREIGNIS, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(ROLLE_EREIGNIS, cb);
    window.removeEventListener("storage", cb);
  };
}
function lesen() {
  try {
    return sessionStorage.getItem(ROLLE_SPEICHER);
  } catch {
    return null;
  }
}

export default function RollenCtaBand() {
  const rolle = useSyncExternalStore(abonnieren, lesen, () => null);
  const abschluss = gruppenFuer(useSprache()).find((g) => g.id === rolle)?.abschluss;
  return <CtaBand {...(abschluss || {})} />;
}
