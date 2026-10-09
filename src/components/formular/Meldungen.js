"use client";

// src/components/formular/Meldungen.js
//
//  • FormFehler     – Fehler zum ganzen Formular (Server), role=alert, schüttelt beim Erscheinen
//  • FormErfolg     – kurze Bestätigung (role=status)
//  • ErfolgsAnsicht – Abschluss eines Formulars/Assistenten: ErfolgsHaken + Titel (fokussiert) + Text + Aktionen
//  • Zusammenfassung – Prüfansicht vor dem Absenden mit „Ändern“ je Abschnitt

import { useEffect, useRef } from "react";
import { CheckCircle2, PencilLine, TriangleAlert } from "lucide-react";
import ErfolgsHaken from "@/components/ui/ErfolgsHaken";
import { signal } from "@/components/ui/motion";
import { cn } from "@/components/ui/cn";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { meldungFuer } from "@/lib/sprache/meldungen";

export function FormFehler({ children, dunkel = false, className }) {
  const ref = useRef(null);
  const sprache = useSprache();
  const text = typeof children === "string" ? children : "";
  useEffect(() => {
    if (children) signal(ref.current, "schuetteln");
  }, [children, text]);
  if (!children) return null;
  return (
    <div ref={ref} role="alert" className={cn("flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[14px] leading-relaxed ring-1 ring-inset", dunkel ? "bg-danger-500/15 text-white ring-danger-300/40" : "bg-danger-50 text-danger-800 ring-danger-200", className)}>
      <TriangleAlert aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", dunkel ? "text-danger-300" : "text-danger-600")} />
      <span className="min-w-0">{text ? meldungFuer(text, sprache) : children}</span>
    </div>
  );
}

export function FormErfolg({ children, className }) {
  if (!children) return null;
  return (
    <div role="status" className={cn("flex items-start gap-2.5 rounded-2xl bg-ov-50 px-4 py-3 text-[14px] leading-relaxed text-ov-900 ring-1 ring-inset ring-ov-200 animate-ov-einblenden", className)}>
      <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function ErfolgsAnsicht({ titel, text, dunkel = false, fokus = true, className, children, icon }) {
  const kopf = useRef(null);
  useEffect(() => {
    if (fokus) kopf.current?.focus();
  }, [fokus]);
  return (
    <div role="status" className={cn("animate-ov-auftauchen", className)}>
      {icon || <ErfolgsHaken groesse={60} ton={dunkel ? "hell" : "marke"} />}
      <h2 ref={kopf} tabIndex={-1} className={cn("mt-5 font-display text-[22px] font-bold leading-tight tracking-tight outline-none md:text-[24px]", dunkel ? "text-white" : "text-ink-900")}>
        {titel}
      </h2>
      {text && <p className={cn("mt-2 text-[15.5px] leading-relaxed", dunkel ? "text-white/80" : "text-ink-700")}>{text}</p>}
      {children}
    </div>
  );
}

/**
 * abschnitte: [{ titel, schritt?, eintraege: [[label, wert], …] }]
 * onAendern(schritt): „Ändern“ springt zurück zum Schritt
 */
export function Zusammenfassung({ titel: titelProp, text, abschnitte = [], onAendern, className }) {
  const en = useSprache() === "en";
  const titel = titelProp === undefined ? (en ? "Please check your details" : "Bitte prüfen Sie Ihre Angaben") : titelProp;
  return (
    <section className={cn("min-w-0", className)} aria-label={titel}>
      {titel && <h3 className="font-display text-[17px] font-bold text-ink-900">{titel}</h3>}
      {text && <p className="mt-1 text-[14px] text-ink-600">{text}</p>}
      <div className="mt-4 space-y-3">
        {abschnitte.map((a, i) => (
          <div key={a.titel || i} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-sand-200 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-600">{a.titel}</p>
              {onAendern && a.schritt !== undefined && (
                <button type="button" onClick={() => onAendern(a.schritt)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold text-ov-700 hover:bg-white hover:text-ov-800" aria-label={en ? `Change ${a.titel}` : `${a.titel} ändern`}>
                  <PencilLine aria-hidden="true" className="h-3.5 w-3.5" /> {en ? "Change" : "Ändern"}
                </button>
              )}
            </div>
            <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {a.eintraege.filter(([, w]) => w !== undefined && w !== null && w !== "").map(([l, w]) => (
                <div key={l} className="min-w-0">
                  <dt className="text-[13px] text-ink-500">{l}</dt>
                  <dd className="break-words text-[15px] font-medium text-ink-900">{w}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
