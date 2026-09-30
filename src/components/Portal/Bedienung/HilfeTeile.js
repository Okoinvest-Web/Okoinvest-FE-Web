"use client";

// Interaktive Teile der Hilfeseite: Tastenkürzel-Übersicht mit Schalter, Palette öffnen,
// App-Installation.

import { Download, Search, Smartphone } from "lucide-react";
import { kuerzelListe } from "./befehle";
import { KuerzelSchalter, Tasten } from "./KuerzelTeile";
import { paletteOeffnen } from "./speicher";
import { useInstallation } from "./InstallHinweis";

export function KuerzelUebersicht({ rollen }) {
  const gruppen = kuerzelListe(rollen);
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-3">
        {gruppen.map((g) => (
          <section key={g.gruppe} aria-labelledby={`hk-${g.gruppe}`}>
            <h3 id={`hk-${g.gruppe}`} className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">{g.gruppe}</h3>
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
      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60 sm:flex-row sm:items-center sm:justify-between">
        <KuerzelSchalter />
        <button type="button" onClick={paletteOeffnen} className="inline-flex h-10 items-center gap-2 self-start rounded-full bg-navy-700 px-4 text-[14px] font-semibold text-white hover:bg-navy-800 sm:self-auto">
          <Search aria-hidden="true" className="h-4 w-4" /> Befehlspalette öffnen
        </button>
      </div>
    </div>
  );
}

export function AppInstallation() {
  const { moeglich, ios, installiert, installieren } = useInstallation();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700">
        <Smartphone aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0 text-[14.5px] leading-relaxed text-ink-600">
        {installiert ? (
          <p className="font-semibold text-ov-800">Das Portal läuft bereits als App auf diesem Gerät.</p>
        ) : (
          <>
            <p>Installieren Sie das Portal auf Handy oder Rechner – es öffnet sich dann im eigenen Fenster, direkt vom Startbildschirm.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Chrome, Edge, Android: Knopf unten oder Symbol „Installieren“ in der Adressleiste.</li>
              <li>iPhone/iPad (Safari): „Teilen“ → „Zum Home-Bildschirm“.</li>
            </ul>
            <p className="mt-2 text-[13px] text-ink-500">Aus Sicherheitsgründen speichert die App keine vertraulichen Inhalte offline – ohne Verbindung erscheint nur ein Hinweis.</p>
            {moeglich && (
              <button type="button" onClick={installieren} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white hover:bg-ov-700">
                <Download aria-hidden="true" className="h-4 w-4" /> Als App installieren
              </button>
            )}
            {!moeglich && !ios && <p className="mt-2 text-[13px] text-ink-500">Ihr Browser bietet die Installation gerade nicht an (z. B. bereits installiert oder Firefox am Desktop).</p>}
          </>
        )}
      </div>
    </div>
  );
}
