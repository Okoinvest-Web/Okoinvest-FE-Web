"use client";

// Inhaltsverzeichnis für LegalShell: Scroll-Spy (aktiver Abschnitt), Lesefortschritt,
// mobil als klebende Leiste unter dem Seitenkopf mit aufklappbarer Liste.
// Einträge kommen serverseitig aus den <h2> des Rechtstextes (siehe LegalShell.js).

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ListOrdered, Printer } from "lucide-react";
import { useSprache } from "@/components/Sprache/SpracheKontext";

/** Liefert den Index des aktuell gelesenen Abschnitts und den Lesefortschritt (0–1). */
function useAbschnitt(eintraege) {
  const [aktiv, setAktiv] = useState(-1);
  const [fortschritt, setFortschritt] = useState(0);

  useEffect(() => {
    let rahmen = 0;
    const messen = () => {
      rahmen = 0;
      const grenze = 160;
      let index = -1;
      for (let i = 0; i < eintraege.length; i++) {
        const el = document.getElementById(eintraege[i].id);
        if (el && el.getBoundingClientRect().top <= grenze) index = i;
      }
      setAktiv(index);
      const artikel = document.querySelector(".ov-legal");
      if (artikel) {
        const r = artikel.getBoundingClientRect();
        const gesamt = r.height - window.innerHeight * 0.6;
        setFortschritt(Math.min(1, Math.max(0, (grenze - r.top) / Math.max(1, gesamt))));
      }
    };
    const planen = () => {
      if (!rahmen) rahmen = requestAnimationFrame(messen);
    };
    messen();
    window.addEventListener("scroll", planen, { passive: true });
    window.addEventListener("resize", planen);
    return () => {
      window.removeEventListener("scroll", planen);
      window.removeEventListener("resize", planen);
      if (rahmen) cancelAnimationFrame(rahmen);
    };
  }, [eintraege]);

  return { aktiv, fortschritt };
}

function Eintrag({ e, i, aktiv, onWahl }) {
  const ist = i === aktiv;
  return (
    <li>
      <a
        href={`#${e.id}`}
        onClick={onWahl}
        aria-current={ist ? "location" : undefined}
        className={`group relative flex gap-2.5 rounded-lg py-1.5 pl-4 pr-2 text-[13.5px] leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 ${
          ist ? "bg-ov-50 font-semibold text-ov-800" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
        }`}
      >
        <span aria-hidden="true" className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors ${ist ? "bg-ov-500" : "bg-transparent"}`} />
        {e.nummer && (
          <span className={`w-7 shrink-0 font-display font-bold [font-variant-numeric:tabular-nums] ${ist ? "text-ov-700" : "text-ink-400 group-hover:text-ink-600"}`}>{e.nummer}</span>
        )}
        <span className="min-w-0">{e.titel}</span>
      </a>
    </li>
  );
}

/** Desktop: Inhaltsverzeichnis in der Seitenleiste */
export function LegalInhalt({ eintraege }) {
  const en = useSprache() === "en";
  const { aktiv, fortschritt } = useAbschnitt(eintraege);
  const liste = useRef(null);

  // aktiven Eintrag in der (scrollbaren) Liste sichtbar halten
  useEffect(() => {
    const ul = liste.current;
    const el = ul?.querySelector('[aria-current="location"]');
    if (!ul || !el) return;
    const o = el.offsetTop - ul.offsetTop;
    if (o < ul.scrollTop + 24 || o > ul.scrollTop + ul.clientHeight - 48) ul.scrollTo({ top: o - ul.clientHeight / 3 });
  }, [aktiv]);

  return (
    <nav aria-label={en ? "Contents of this page" : "Inhalt dieser Seite"} className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          <ListOrdered aria-hidden="true" className="h-3.5 w-3.5" /> {en ? "On this page" : "Auf dieser Seite"}
        </p>
        <span className="text-[12px] font-semibold text-ink-500 [font-variant-numeric:tabular-nums]">{Math.round(fortschritt * 100)} %</span>
      </div>
      <div aria-hidden="true" className="mx-1 mt-3 h-1 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full origin-left rounded-full bg-gradient-to-r from-ov-500 to-ov-300" style={{ transform: `scaleX(${fortschritt})` }} />
      </div>
      <ul ref={liste} className="relative mt-3 max-h-[calc(100vh-22rem)] space-y-0.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
        {eintraege.map((e, i) => (
          <Eintrag key={e.id} e={e} i={i} aktiv={aktiv} />
        ))}
      </ul>
    </nav>
  );
}

/** Mobil/Tablet: klebende Leiste mit aktuellem Abschnitt und aufklappbarer Liste */
export function LegalMobilInhalt({ eintraege }) {
  const en = useSprache() === "en";
  const { aktiv, fortschritt } = useAbschnitt(eintraege);
  const [offen, setOffen] = useState(false);
  const knopf = useRef(null);
  const aktuell = eintraege[aktiv];

  useEffect(() => {
    if (!offen) return;
    const taste = (ev) => {
      if (ev.key === "Escape") {
        setOffen(false);
        knopf.current?.focus();
      }
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [offen]);

  return (
    <div className="sticky top-[68px] z-30 border-b border-ink-200/70 bg-white/90 backdrop-blur-xl lg:hidden print:hidden">
      <div className="ov-container">
        <button
          ref={knopf}
          type="button"
          aria-expanded={offen}
          aria-controls="legal-mobil-inhalt"
          onClick={() => setOffen((o) => !o)}
          className="flex w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ov-500"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200/70">
            <ListOrdered aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              {en ? "Contents" : "Inhalt"} · {aktiv + 1 > 0 ? (en ? `${aktiv + 1} of ${eintraege.length}` : `${aktiv + 1} von ${eintraege.length}`) : en ? `${eintraege.length} sections` : `${eintraege.length} Abschnitte`}
            </span>
            <span className="block truncate text-[14.5px] font-semibold text-ink-900">
              {aktuell ? `${aktuell.nummer ? `${aktuell.nummer} ` : ""}${aktuell.titel}` : en ? "Choose a section" : "Abschnitt wählen"}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-ink-500 transition-transform motion-reduce:transition-none ${offen ? "rotate-180" : ""}`} />
        </button>
      </div>
      <div aria-hidden="true" className="h-[2px] bg-ink-100">
        <div className="h-full origin-left bg-gradient-to-r from-ov-500 to-ov-300" style={{ transform: `scaleX(${fortschritt})` }} />
      </div>
      <div id="legal-mobil-inhalt" hidden={!offen} className="absolute inset-x-0 top-full border-b border-ink-200 bg-white shadow-e4">
        <nav aria-label={en ? "Contents of this page" : "Inhalt dieser Seite"} className="ov-container max-h-[60vh] overflow-y-auto overscroll-contain py-3">
          <ul className="space-y-0.5">
            {eintraege.map((e, i) => (
              <Eintrag key={e.id} e={e} i={i} aktiv={aktiv} onWahl={() => setOffen(false)} />
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

/** Knopf „Drucken / als PDF sichern“ */
export function LegalDruck() {
  const en = useSprache() === "en";
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-ink-800 ring-1 ring-ink-200 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
    >
      <Printer aria-hidden="true" className="h-4 w-4" /> {en ? "Print or save as PDF" : "Drucken oder als PDF sichern"}
    </button>
  );
}
