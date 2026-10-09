// src/components/Rechner/LaenderSperre.js
//
// Länder-Sperre (Masterplan S1, Welle 1 Paket E): Für Österreich und die Schweiz
// zeigen die Rechner keine Euro-, EEG-, GAP- oder Pachtwerte, solange die
// Länderlogik nicht fachlich geprüft ist. Text und Titel kommen aus markt.js
// (laenderSperre), damit alle Rechner dieselbe Aussage machen.
//
// <LaenderSperre sperre={laenderSperre(land)} />            – Ergebnisbereich
// <SperrEingaben sperre={…}>{Länder-/Regionswahl}</SperrEingaben> – Eingabespalte

"use client";

import { Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { laenderSperreEn } from "@/lib/sprache/begriffe";

export function LaenderSperre({ sperre: roh, kontaktHref = "/kontakt" }) {
  const en = useSprache() === "en";
  const sperre = en ? laenderSperreEn(roh) : roh;
  if (!sperre) return null;
  return (
    <div role="status" className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70 md:p-8" data-laender-sperre={sperre.land}>
      <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">
        <Clock aria-hidden="true" className="h-4 w-4 text-navy-500" /> {sperre.land === "AT" ? (en ? "Austria" : "Österreich") : en ? "Switzerland" : "Schweiz"}
      </p>
      <h3 className="mt-3 font-display text-[clamp(1.25rem,1.1rem+0.6vw,1.6rem)] font-extrabold leading-tight tracking-tight text-ink-900">{sperre.titel}</h3>
      <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-700">{sperre.text}</p>
      <div className="mt-5">
        <Button href={kontaktHref} pfeil>
          {en ? "Discuss your project with us" : "Vorhaben persönlich besprechen"}
        </Button>
      </div>
    </div>
  );
}

/** Eingabespalte bei gesperrtem Land: nur die Länder-/Regionswahl, damit man zurück nach Deutschland wechseln kann */
export function SperrEingaben({ children }) {
  const en = useSprache() === "en";
  return (
    <div className="space-y-4">
      {children}
      <p className="text-[13px] leading-relaxed text-ink-500">{en ? "Choose a region in Germany to see the calculation." : "Wählen Sie eine Region in Deutschland, um die Rechnung zu sehen."}</p>
    </div>
  );
}
