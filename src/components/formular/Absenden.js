"use client";

// src/components/formular/Absenden.js
//
// Absende-Choreografie: Button-Ladezustand → Erfolgshäkchen im Button → (optional) Toast → weiter.
//   const a = useAbsenden();
//   a.los(() => senden(…), { erfolgText: "Gespeichert", toast: { titel: "Gespeichert" }, danach: () => router.push(…) })
//   <AbsendeKnopf status={a.status} erfolgText="Gespeichert">Speichern</AbsendeKnopf>
// Breite bleibt stabil (beide Beschriftungen liegen übereinander im selben Raster), Status per aria-live.

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { toast } from "@/components/ui/Toast";
import { bewegungReduziert } from "@/components/ui/motion";
import { cn } from "@/components/ui/cn";
import { fehlerText } from "@/components/Portal/Bedienung/pruefung";

/** Kleiner Haken für den Button (zeichnet sich einmal) */
function KnopfHaken() {
  return (
    <span aria-hidden="true" className="ov-erfolg flex h-[1.35em] w-[1.35em] shrink-0 items-center justify-center rounded-full bg-white text-ov-700">
      <svg viewBox="0 0 24 24" className="h-[0.85em] w-[0.85em]" fill="none">
        <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" className="ov-linie" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/**
 * status: "bereit" | "laedt" | "erfolg"
 * laedtText: Beschriftung während des Sendens (Standard: children)
 */
export function AbsendeKnopf({ status = "bereit", erfolgText: erfolgProp, laedtText, children, icon, pfeil = false, className, variant = "primary", ...rest }) {
  const en = useSprache() === "en";
  const erfolgText = erfolgProp ?? (en ? "Done" : "Erledigt");
  const laedt = status === "laedt";
  const erfolg = status === "erfolg";
  return (
    <>
      <Button
        type="submit"
        variant={variant}
        laedt={laedt}
        icon={erfolg ? undefined : icon}
        pfeil={pfeil && !laedt && !erfolg}
        aria-disabled={erfolg || undefined}
        className={cn(erfolg && "pointer-events-none", className)}
        {...rest}
      >
        <span className="grid">
          <span className={cn("col-start-1 row-start-1 inline-flex items-center justify-center gap-2", erfolg && "invisible")}>{laedt && laedtText ? laedtText : children}</span>
          <span className={cn("col-start-1 row-start-1 inline-flex items-center justify-center gap-2", !erfolg && "invisible")} aria-hidden={!erfolg}>
            {erfolg && <KnopfHaken />}
            {erfolgText}
          </span>
        </span>
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {laedt ? `${laedtText || (en ? "Sending" : "Wird gesendet")} …` : erfolg ? erfolgText : ""}
      </span>
    </>
  );
}

/**
 * Hook zur Absende-Choreografie.
 * Optionen: uebersetzen(e) → Fehlertext (Standard: fehlerText; für Anmeldung e.message, da 401 dort „falsches Passwort“ heißt)
 * los(fn, { erfolgText, toast: { titel, text } | false, danach(ergebnis), haltezeit })
 *  → Rückgabe: Ergebnis von fn oder null bei Fehler (fehler wird gesetzt, Klartext über fehlerText)
 */
export function useAbsenden({ uebersetzen = fehlerText } = {}) {
  const [status, setStatus] = useState("bereit");
  const [fehler, setFehler] = useState("");
  const aktiv = useRef(true);
  const laeuft = useRef(false); // Doppel-Absenden sperren, auch bevor der Button neu gerendert ist
  useEffect(() => {
    aktiv.current = true;
    return () => {
      aktiv.current = false;
    };
  }, []);

  const los = useCallback(async (fn, { toast: t = false, danach, haltezeit = 900, zuruecksetzen = true } = {}) => {
    if (laeuft.current) return null;
    laeuft.current = true;
    setStatus("laedt");
    setFehler("");
    let ergebnis;
    try {
      ergebnis = await fn();
    } catch (e) {
      laeuft.current = false;
      if (aktiv.current) {
        setFehler(uebersetzen(e));
        setStatus("bereit");
      }
      return null;
    }
    if (!aktiv.current) {
      laeuft.current = false;
      return ergebnis;
    }
    setStatus("erfolg");
    await new Promise((r) => setTimeout(r, bewegungReduziert() ? 250 : haltezeit));
    if (t) toast.erfolg(t.titel, t.text);
    try {
      if (danach) await danach(ergebnis);
    } finally {
      laeuft.current = false;
    }
    if (aktiv.current && zuruecksetzen) setStatus("bereit");
    return ergebnis;
  }, [uebersetzen]);

  return { status, fehler, setFehler, los, laedt: status === "laedt", erfolg: status === "erfolg" };
}
