"use client";

import { useEffect, useState } from "react";
import { GitCompareArrows, Info, Link2, Printer, RotateCcw, Share2, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { toast } from "@/components/ui/Toast";
import { mitUebergang } from "@/components/ui/motion";
import { useRahmen } from "./kontext";

/* ------------------------------------------------------------------
   Werkzeugleiste unter jedem Ergebnis: Szenario merken und nebeneinander
   vergleichen, Ergebnis als Link teilen (mit Eingaben), Druckansicht/PDF,
   Sprung zu den Annahmen. Erscheint nur, wenn der Rechner Kurzwerte meldet.
   ------------------------------------------------------------------ */

const knopf =
  "ov-press inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 transition-colors duration-150 hover:bg-ink-50 hover:ring-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500";

export default function ErgebnisWerkzeuge() {
  const rahmen = useRahmen();
  const [a, setA] = useState(null); // { werte, zustand }
  const [annahmen, setAnnahmen] = useState(false);
  const [teilbar, setTeilbar] = useState(true);
  const [nativ, setNativ] = useState(false);

  useEffect(() => {
    setAnnahmen(!!document.getElementById("annahmen"));
    // Im Portal (angemeldeter Bereich) keine öffentlichen Links teilen
    setTeilbar(!window.location.pathname.startsWith("/portal"));
    setNativ(typeof navigator.share === "function" && !!window.matchMedia?.("(pointer: coarse)").matches);
  }, []);

  const kurz = rahmen?.kurz;
  if (!kurz || !kurz.length) return null;

  const merken = () => {
    const zustand = rahmen.zustand.current?.lesen?.() || null;
    mitUebergang(() => setA({ werte: kurz, zustand }));
  };

  const wiederherstellen = () => {
    if (!a?.zustand || !rahmen.zustand.current) return;
    rahmen.zustand.current.setzen(a.zustand);
    toast.info("Szenario A wiederhergestellt", "Die Eingaben stehen wieder auf dem gemerkten Stand.");
  };

  const teilen = async () => {
    const url = window.location.href;
    const mobil = window.matchMedia?.("(pointer: coarse)").matches;
    if (mobil && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.erfolg("Link kopiert", "Der Link enthält Ihre Eingaben – wer ihn öffnet, sieht dasselbe Ergebnis.");
    } catch {
      toast.fehler("Kopieren nicht möglich", "Bitte kopieren Sie die Adresse aus der Adresszeile Ihres Browsers.");
    }
  };

  const geaendert = a ? kurz.some(([, v], i) => a.werte[i]?.[1] !== v) : false;

  return (
    <div className="mt-7 border-t border-ink-100 pt-5 print:hidden">
      {a && (
        <section aria-labelledby="szenario-vergleich" className="animate-ov-einblenden mb-4 overflow-hidden rounded-2xl ring-1 ring-ink-200/70" style={{ viewTransitionName: "ov-szenario" }}>
          <div className="flex items-center justify-between gap-3 bg-sand-50 py-2 pl-4 pr-2">
            <h3 id="szenario-vergleich" className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-900">
              <GitCompareArrows aria-hidden="true" className="h-4 w-4 text-ov-600" />
              Szenario-Vergleich
            </h3>
            <button type="button" onClick={() => mitUebergang(() => setA(null))} aria-label="Vergleich schließen" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-white hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <table className="w-full text-[13.5px]">
            <caption className="sr-only">Gemerktes Szenario A im Vergleich zum aktuellen Ergebnis</caption>
            <thead className="text-[11.5px] uppercase tracking-[0.1em] text-ink-500">
              <tr className="border-b border-ink-100">
                <th scope="col" className="px-4 py-2 text-left font-semibold">Kennzahl</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">A · gemerkt</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Aktuell</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {kurz.map(([label, v], i) => {
                const alt = a.werte[i]?.[1];
                const anders = alt !== v;
                return (
                  <tr key={i} className={cn("transition-colors duration-300", anders && "bg-ov-50/70")}>
                    <th scope="row" className="px-4 py-2.5 text-left font-medium text-ink-700">{label}</th>
                    <td className="ov-num px-4 py-2.5 text-right text-ink-600">{alt ?? "–"}</td>
                    <td className={cn("ov-num px-4 py-2.5 text-right", anders ? "font-bold text-ink-900" : "text-ink-600")}>
                      {v}
                      {anders && <span className="sr-only"> (geändert)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-4 py-2.5">
            <p className="text-[12.5px] leading-snug text-ink-500" aria-live="polite">
              {geaendert ? "Grün markiert: Werte, die sich gegenüber A verändert haben." : "Ändern Sie jetzt Eingaben – die rechte Spalte rechnet live mit."}
            </p>
            {a.zustand && rahmen.zustand.current && (
              <button type="button" onClick={wiederherstellen} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ov-700 transition-colors hover:bg-ov-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                A wiederherstellen
              </button>
            )}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={merken} className={knopf} aria-describedby={a ? "szenario-vergleich" : undefined}>
          <GitCompareArrows aria-hidden="true" className="h-4 w-4 text-ov-600" />
          {a ? "Aktuelles als A merken" : "Szenario merken & vergleichen"}
        </button>
        {teilbar && (
          <button type="button" onClick={teilen} className={knopf}>
            {nativ ? (
              <Share2 aria-hidden="true" className="h-4 w-4 text-ink-500" />
            ) : (
              <Link2 aria-hidden="true" className="h-4 w-4 text-ink-500" />
            )}
            Ergebnis teilen
          </button>
        )}
        <button type="button" onClick={() => window.print()} className={knopf}>
          <Printer aria-hidden="true" className="h-4 w-4 text-ink-500" />
          Drucken / PDF
        </button>
        {annahmen && (
          <a href="#annahmen" className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold text-ink-600 underline-offset-4 transition-colors hover:text-ink-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
            <Info aria-hidden="true" className="h-4 w-4" />
            Annahmen
          </a>
        )}
      </div>
    </div>
  );
}
