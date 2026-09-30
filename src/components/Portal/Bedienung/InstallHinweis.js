"use client";

// Hinweis „Als App installieren“ (PWA): nutzt beforeinstallprompt (Chrome/Edge/Android),
// auf iOS eine kurze Anleitung (Teilen → Zum Home-Bildschirm). Nur auf der Portal-Übersicht,
// nicht in der installierten App, schließbar (Vorliebe im Browser).

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { speicherLesen, speicherSchreiben } from "./speicher";

const AUS = "oi-install-aus";

/** Gemeinsamer Zustand für Hinweis und Hilfeseite */
export function useInstallation() {
  const [prompt, setPrompt] = useState(null);
  const [ios, setIos] = useState(false);
  const [installiert, setInstalliert] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
    setInstalliert(!!standalone);
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent) && !standalone);
    if (window.__oiInstallPrompt) setPrompt(window.__oiInstallPrompt);
    const vor = (e) => {
      e.preventDefault();
      window.__oiInstallPrompt = e;
      setPrompt(e);
    };
    const fertig = () => {
      setInstalliert(true);
      setPrompt(null);
      window.__oiInstallPrompt = null;
    };
    window.addEventListener("beforeinstallprompt", vor);
    window.addEventListener("appinstalled", fertig);
    return () => {
      window.removeEventListener("beforeinstallprompt", vor);
      window.removeEventListener("appinstalled", fertig);
    };
  }, []);
  async function installieren() {
    if (!prompt) return false;
    prompt.prompt();
    const wahl = await prompt.userChoice.catch(() => null);
    setPrompt(null);
    window.__oiInstallPrompt = null;
    return wahl?.outcome === "accepted";
  }
  return { moeglich: !!prompt, ios, installiert, installieren };
}

export default function InstallHinweis({ pfad }) {
  const { moeglich, ios, installiert, installieren } = useInstallation();
  const [aus, setAus] = useState(true);
  useEffect(() => setAus(!!speicherLesen(AUS, false)), []);
  if (aus || installiert || pfad !== "/portal" || (!moeglich && !ios)) return null;
  const schliessen = () => {
    speicherSchreiben(AUS, true);
    setAus(true);
  };
  return (
    <aside aria-label="Als App installieren" className="fixed inset-x-3 bottom-[76px] z-40 mx-auto max-w-[520px] rounded-3xl bg-navy-950 p-4 text-white shadow-[0_24px_60px_-20px_rgba(3,18,43,0.6)] ring-1 ring-navy-800 lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0 lg:w-[380px]">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-500/20 text-ov-300">
          <Smartphone aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Portal als App nutzen</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-white/70">
            {ios ? "Tippen Sie in Safari auf „Teilen“ und dann auf „Zum Home-Bildschirm“." : "Mit einem Klick auf Ihrem Startbildschirm – schneller Zugriff, eigenes Fenster."}
          </p>
          {moeglich && (
            <button type="button" onClick={async () => (await installieren()) && schliessen()} className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-ov-600 px-4 text-[13.5px] font-semibold text-white hover:bg-ov-500">
              <Download aria-hidden="true" className="h-4 w-4" /> Als App installieren
            </button>
          )}
        </div>
        <button type="button" onClick={schliessen} className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Hinweis schließen">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
