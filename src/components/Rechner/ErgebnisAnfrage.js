"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { msSeitEingabe } from "./bausteine";

/* ------------------------------------------------------------------
   Ergebnis → passende Anfrage. Steht am Ende jedes Rechner-Ergebnisses:
   die gerade berechnete Hauptzahl, ein Versprechen ohne Druck und EIN
   klarer nächster Schritt. Beim Klick wird die Anfrage vorbelegt
   (sessionStorage, gleiches Format wie formular/Entwurf) – Nachricht mit
   den Eingaben und dem Teilen-Link. Ohne JS bleibt es ein normaler Link.
   ------------------------------------------------------------------ */

const PRAEFIX = "ov-entwurf:";
const MARKE = "Aus dem "; // eigene Vorbelegungen erkennen: überschreiben ja, Nutzertext nie

/** Nachricht der Anfrage `anfrage-<typ>` vorbelegen (nur leer oder eigene frühere Vorbelegung). */
export function anfrageVorbelegen(typ, nachricht) {
  if (!typ || !nachricht) return;
  try {
    const schluessel = `${PRAEFIX}anfrage-${typ}`;
    const alt = JSON.parse(window.sessionStorage.getItem(schluessel) || "null")?.werte || {};
    if (alt.nachricht && !String(alt.nachricht).startsWith(MARKE)) return;
    const text = `${nachricht}\n\nMeine Eingaben: ${window.location.href}`.slice(0, 4800);
    window.sessionStorage.setItem(schluessel, JSON.stringify({ werte: { ...alt, nachricht: text }, zeit: Date.now() }));
  } catch {
    /* Speicher gesperrt (privater Modus) – der Link funktioniert trotzdem */
  }
}

const bewegungReduziert = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * typ        Anfrage-Typ (/kontakt?anliegen=<typ> bzw. Formular am Ziel), bestimmt den Entwurfsschlüssel
 * href       Ziel der Anfrage (crawlbarer Link)
 * kennzahl   die gerade berechnete Hauptzahl (ReactNode, z. B. <Zahl …/>)
 * satz       Text nach der Zahl, z. B. „Projekt-IRR – mit Ihren Projektdaten nachrechnen lassen“
 * nachricht  Text für die vorbelegte Anfrage (beginnt mit „Aus dem …“)
 * signal     Wert, dessen Änderung nach einer Eingabe die Karte kurz aufleuchten lässt
 * sekundaer  [{ href, label }] – leise Textlinks, kein zweiter lauter Knopf
 */
export default function ErgebnisAnfrage({
  typ,
  href,
  eyebrow = "Mit diesem Ergebnis weiter",
  kennzahl,
  satz,
  nachricht,
  label = "Mit diesem Ergebnis anfragen",
  versprechen = "Wir melden uns persönlich – kostenlos und unverbindlich.",
  signal,
  sekundaer = [],
  hinweis,
  className,
}) {
  const leuchten = useRef(null);
  const zuletzt = useRef(-1e9);
  const erst = useRef(true);

  // Feedback: Ergebnis hat sich durch eine Eingabe verändert → Karte leuchtet einmal leise auf
  // (nur opacity, höchstens alle 6 s, nur wenn die Karte im Bild ist, nie beim Laden).
  useEffect(() => {
    if (erst.current) {
      erst.current = false;
      return undefined;
    }
    if (msSeitEingabe() > 800 || bewegungReduziert()) return undefined;
    const t = setTimeout(() => {
      const el = leuchten.current;
      if (!el || typeof el.animate !== "function") return;
      const jetzt = performance.now();
      if (jetzt - zuletzt.current < 6000) return;
      const box = el.getBoundingClientRect();
      if (box.bottom < 60 || box.top > window.innerHeight - 60) return;
      zuletzt.current = jetzt;
      el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 1200, easing: "cubic-bezier(.2,.8,.2,1)" });
    }, 650);
    return () => clearTimeout(t);
  }, [signal]);

  return (
    <div className={cn("mt-7 border-t border-ink-100 pt-6", className)}>
      <div data-ergebnis-anfrage="" className="relative isolate overflow-hidden rounded-3xl bg-ov-50 p-5 ring-1 ring-ov-200 print:hidden md:p-6">
        {/* Aufleuchten (aria-hidden, lässt Klicks durch) */}
        <span
          ref={leuchten}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-3xl opacity-0 ring-2 ring-inset ring-ov-400"
          style={{ background: "radial-gradient(120% 140% at 0% 0%, rgba(174,208,131,0.45), transparent 60%)" }}
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ov-800">{eyebrow}</p>
            <p className="mt-1 font-display text-[19px] font-bold leading-snug text-ink-900">
              {kennzahl != null && (
                <>
                  ≈ <span className="ov-num whitespace-nowrap">{kennzahl}</span>{" "}
                </>
              )}
              {satz}
            </p>
            <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-ink-600">
              <Clock3 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ov-600" />
              {versprechen}
            </p>
          </div>
          <Button href={href} size="lg" pfeil className="w-full shrink-0 sm:w-auto" data-ov-cta onClick={() => anfrageVorbelegen(typ, nachricht)}>
            {label}
          </Button>
        </div>
        {sekundaer.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-ov-200/70 pt-3">
            {sekundaer.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="group inline-flex min-h-10 items-center gap-1 rounded-lg text-[14px] font-semibold text-ov-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                >
                  {s.label}
                  <ArrowUpRight aria-hidden="true" className="ov-pfeil h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {hinweis && <p className="mt-4 text-[13px] leading-relaxed text-ink-500">{hinweis}</p>}
    </div>
  );
}
