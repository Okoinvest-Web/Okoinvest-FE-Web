"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { mitUebergang, bewegungReduziert } from "@/components/ui/motion";
import { RahmenKontext, useKurzwerteMelden, useRahmen } from "./kontext";
import ErgebnisWerkzeuge from "./Werkzeuge";
import { LaenderSperre } from "./LaenderSperre";
import "./rechner.css";

/* ------------------------------------------------------------------
   Ergänzende Bausteine für die Investoren-, Carport- und Kommunal-
   Rechner (Solarpark, Projektbewertung, Solarcarport, Kommune).
   Die Grundbausteine stehen in ./bausteine.js.
   ------------------------------------------------------------------ */

/**
 * Äußerer Rahmen: Eingaben links (Sand), Ergebnis rechts. Bei `mitlaufend`
 * bleibt das Ergebnis am Desktop sichtbar, während links gescrollt wird.
 * `unten`: volle Breite unter beiden Spalten (Matrix, Tabellen).
 * `werkzeuge`: Szenario-Vergleich, Teilen, Druck unter dem Ergebnis
 * (erscheint, sobald der Rechner Kurzwerte über <MobilKurz> meldet).
 */
export function RechnerRahmen({ eingaben, ergebnis, unten, breiteLinks = 410, mitlaufend = false, werkzeuge = true, sperre = null }) {
  // Länder-Sperre (Paket E): statt Ergebnis, Tabellen und Werkzeugen nur der Hinweis aus markt.js
  const ergebnisInhalt = sperre ? <LaenderSperre sperre={sperre} /> : ergebnis;
  const untenInhalt = sperre ? null : unten;
  const mitWerkzeugen = werkzeuge && !sperre;
  const [kurz, setKurz] = useState(null);
  const zustand = useRef(null);
  const eingabenRef = useRef(null);
  const ergebnisRef = useRef(null);
  const ergebnisId = useId();
  const wert = useMemo(() => ({ kurz, setKurz, zustand, eingabenRef, ergebnisRef, ergebnisId }), [kurz, ergebnisId]);

  return (
    <RahmenKontext.Provider value={wert}>
      <div data-rechner="" className="overflow-clip rounded-[2rem] bg-white shadow-[0_40px_80px_-40px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 print:shadow-none">
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,var(--links))_minmax(0,1fr)]" style={{ "--links": `${breiteLinks}px` }}>
          <div ref={eingabenRef} className="relative min-w-0 border-b border-ink-100 bg-sand-50 p-5 sm:p-6 md:p-8 lg:border-b-0 lg:border-r">
            {eingaben}
          </div>
          <div ref={ergebnisRef} id={ergebnisId} tabIndex={-1} className="min-w-0 scroll-mt-24 p-5 outline-none sm:p-6 md:p-8">
            <div className={mitlaufend ? "lg:sticky lg:top-24" : undefined}>
              {ergebnisInhalt}
              {mitWerkzeugen && <ErgebnisWerkzeuge />}
            </div>
          </div>
        </div>
        {untenInhalt && <div className="border-t border-ink-100 p-5 sm:p-6 md:p-8">{untenInhalt}</div>}
      </div>
    </RahmenKontext.Provider>
  );
}

/**
 * Kompakte Ergebnisleiste auf dem Handy – klebt am unteren Bildschirmrand,
 * solange die Eingaben im Bild sind und das volle Ergebnis noch nicht.
 * Der Pfeil springt zum Ergebnis. Ab lg ausgeblendet (dort läuft die
 * Ergebnisspalte mit). Meldet die Werte außerdem an den Rahmen
 * (Szenario-Vergleich).
 */
export function MobilKurz({ werte }) {
  const rahmen = useRahmen();
  useKurzwerteMelden(werte);
  const [bereit, setBereit] = useState(false);
  const [sichtbar, setSichtbar] = useState(false);

  const eingabenRef = rahmen?.eingabenRef;
  const ergebnisRef = rahmen?.ergebnisRef;
  useEffect(() => {
    setBereit(true);
    const eingaben = eingabenRef?.current;
    const ergebnis = ergebnisRef?.current;
    if (!eingaben || !ergebnis || typeof IntersectionObserver === "undefined") return undefined;
    let eingabenImBild = false;
    let ergebnisImBild = false;
    const aktualisieren = () => setSichtbar(eingabenImBild && !ergebnisImBild);
    const ioE = new IntersectionObserver(([e]) => {
      eingabenImBild = e.isIntersecting;
      aktualisieren();
    });
    // Ergebnis gilt als „im Bild“, sobald es über der Leiste auftaucht
    const ioR = new IntersectionObserver(
      ([e]) => {
        ergebnisImBild = e.isIntersecting;
        aktualisieren();
      },
      { rootMargin: "0px 0px -96px 0px" }
    );
    ioE.observe(eingaben);
    ioR.observe(ergebnis);
    return () => {
      ioE.disconnect();
      ioR.disconnect();
    };
  }, [eingabenRef, ergebnisRef]);

  // Die globale Handlungsleiste der Website weicht, solange die Ergebnisleiste steht
  useEffect(() => {
    document.body.classList.toggle("ov-rechner-leiste", sichtbar);
    return () => document.body.classList.remove("ov-rechner-leiste");
  }, [sichtbar]);

  const zumErgebnis = () => {
    const ziel = rahmen?.ergebnisRef?.current;
    if (!ziel) return;
    ziel.scrollIntoView({ behavior: bewegungReduziert() ? "auto" : "smooth", block: "start" });
    ziel.focus({ preventScroll: true });
  };

  // Ohne Rahmen (Altbestand): klassische Zeile über den Eingaben
  if (!rahmen) {
    return (
      <div className="sticky top-[76px] z-20 -mx-5 -mt-5 mb-6 border-b border-white/10 bg-navy-950/95 px-5 py-3 text-white backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 lg:hidden">
        <KurzListe werte={werte} />
      </div>
    );
  }

  if (!bereit) return null;
  return createPortal(
    <div
      aria-hidden={!sichtbar}
      inert={!sichtbar ? true : undefined}
      className={cn(
        "fixed inset-x-3 bottom-3 z-[9001] transition-[opacity,transform] duration-300 ease-ov-out print:hidden lg:hidden",
        sichtbar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[130%] opacity-0"
      )}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div role="region" aria-label="Ergebnis in Kürze" className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-navy-950/95 py-2.5 pl-4 pr-2.5 text-white shadow-e5 ring-1 ring-white/10 backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <KurzListe werte={werte} />
        </div>
        <button
          type="button"
          onClick={zumErgebnis}
          aria-controls={rahmen.ergebnisId}
          aria-label="Zum vollständigen Ergebnis"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ov-600 text-white transition-colors hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowDown aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>,
    document.body
  );
}

function KurzListe({ werte }) {
  return (
    <dl className={cn("grid gap-2", werte.length === 4 ? "grid-cols-4" : werte.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {werte.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="truncate text-[11px] text-white/75">{k}</dt>
          <dd className="ov-num truncate font-display text-[16px] font-extrabold leading-tight tracking-tight min-[400px]:text-[17px]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Überschrift des Ergebnisbereichs mit Status-Plakette */
export function ErgebnisKopf({ titel = "Ihr Ergebnis", plakette }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink-900 md:text-[26px]">{titel}</h2>
      {plakette && (
        <span className="inline-flex items-center gap-2 rounded-full bg-ov-50 px-3 py-1 text-[12.5px] font-semibold text-ov-800 ring-1 ring-ov-200">
          <span className="h-1.5 w-1.5 rounded-full bg-ov-500" aria-hidden="true" />
          {plakette}
        </span>
      )}
    </div>
  );
}

/** Hinweiszeile im Ergebnis (neutral | warnung | gut) – blendet beim Erscheinen sanft ein */
export function Hinweis({ ton = "neutral", icon: Icon, children, className }) {
  const toene = {
    neutral: "bg-ink-50 text-ink-700 ring-ink-200/70",
    warnung: "bg-warn-50 text-ink-800 ring-warn-200",
    gut: "bg-success-50 text-ink-800 ring-success-200",
  };
  return (
    <p className={cn("animate-ov-einblenden flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ring-1", toene[ton], className)}>
      {Icon && <Icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", ton === "warnung" ? "text-warn-600" : ton === "gut" ? "text-ov-600" : "text-ink-500")} />}
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Umschalter für Diagramm-Ansichten (echte Radio-Buttons, Wechsel mit weichem Übergang) */
export function Ansicht({ name, optionen, wert, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-ink-100 p-1">
      {optionen.map((o) => (
        <label
          key={o.id}
          className={cn(
            "min-h-8 cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-[color,background-color,box-shadow] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
            wert === o.id ? "bg-white text-ink-900 shadow-e2" : "text-ink-600 hover:text-ink-900"
          )}
        >
          <input type="radio" name={name} value={o.id} checked={wert === o.id} onChange={() => mitUebergang(() => onChange(o.id))} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** Legendenpunkt (Linien optional gestrichelt) */
export function Legende({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-600">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          {i.linie ? (
            <span
              className="h-[3px] w-5 rounded-full"
              style={i.gestrichelt ? { backgroundImage: `linear-gradient(90deg, ${i.farbe} 60%, transparent 60%)`, backgroundSize: "7px 3px" } : { background: i.farbe }}
              aria-hidden="true"
            />
          ) : (
            <span className="h-3 w-3 rounded-[3px]" style={{ background: i.farbe }} aria-hidden="true" />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}
