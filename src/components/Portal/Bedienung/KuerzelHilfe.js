"use client";

// Hilfe-Übersicht der Tastenkürzel („?“) – modaler Dialog mit Schalter zum Abschalten
// der Einzeltasten-Kürzel (Strg/⌘+K bleibt immer aktiv).

import { useRef } from "react";
import Link from "next/link";
import { Keyboard, X } from "lucide-react";
import useFokusFalle from "@/components/ui/useFokusFalle";
import { kuerzelListe } from "./befehle";
import { KuerzelSchalter, Tasten } from "./KuerzelTeile";

export default function KuerzelHilfe({ offen, setOffen, rollen, kuerzelAn, setKuerzelAn }) {
  const ref = useRef(null);
  useFokusFalle(offen, ref, { beiEscape: () => setOffen(false) });
  if (!offen) return null;
  const gruppen = kuerzelListe(rollen);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-navy-950/55 backdrop-blur-sm" onClick={() => setOffen(false)} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="kuerzel-titel" className="relative max-h-[88vh] w-full max-w-[720px] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl ring-1 ring-ink-200 sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-700">
              <Keyboard aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="kuerzel-titel" className="font-display text-[20px] font-extrabold text-ink-900">Tastenkürzel</h2>
              <p className="text-[13.5px] text-ink-500">Schneller arbeiten ohne Maus.</p>
            </div>
          </div>
          <button type="button" onClick={() => setOffen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100" aria-label="Tastenkürzel schließen">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {gruppen.map((g) => (
            <section key={g.gruppe} aria-labelledby={`kz-${g.gruppe}`} className={g.eintraege.length > 6 ? "md:row-span-2" : ""}>
              <h3 id={`kz-${g.gruppe}`} className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">{g.gruppe}</h3>
              <dl className="mt-2 divide-y divide-ink-100">
                {g.eintraege.map((e) => (
                  <div key={e.text + e.tasten.join()} className="flex items-center justify-between gap-3 py-2">
                    <dt className="min-w-0 text-[14px] text-ink-700">{e.text}</dt>
                    <dd className="shrink-0"><Tasten tasten={e.tasten} folge={e.folge} /></dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60 sm:flex-row sm:items-center sm:justify-between">
          <KuerzelSchalter an={kuerzelAn} setAn={setKuerzelAn} />
          <Link href="/portal/hilfe" onClick={() => setOffen(false)} className="text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">Alle Hilfen ansehen</Link>
        </div>
      </div>
    </div>
  );
}
