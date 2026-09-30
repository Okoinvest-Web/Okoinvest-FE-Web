"use client";

// Nachrichten-Entwurf für jeden Nachrichtenverlauf. Steht bereits Text im Antwortfeld, wird er als
// Stichpunkte verwendet. Der Entwurf läuft live ins Antwortfeld – gesendet wird nur per Klick.
// Nimmt außerdem Entwürfe anderer Assistenten entgegen (Ereignis „oi-ki-entwurf“, z. B. aus der Triage).

import { useEffect, useRef } from "react";
import { Sparkles, Square } from "lucide-react";
import { useKi, useKiStatus } from "./useKi";

export default function KiNachrichtEntwurf({ bezugArt, bezugId, text, setText, onKennzeichnung }) {
  const status = useKiStatus();
  const vorher = useRef("");
  const ki = useKi("nachricht", { onText: (t) => setText(t) });

  useEffect(() => {
    const annehmen = (e) => {
      const d = e.detail || {};
      if (d.bezugArt === bezugArt && d.bezugId === bezugId && typeof d.text === "string") {
        setText(d.text);
        onKennzeichnung?.({ modus: "ki", hinweis: "" });
      }
    };
    window.addEventListener("oi-ki-entwurf", annehmen);
    return () => window.removeEventListener("oi-ki-entwurf", annehmen);
  }, [bezugArt, bezugId, setText, onKennzeichnung]);

  useEffect(() => {
    if (ki.fertig) {
      if (ki.fehler) setText(vorher.current);
      onKennzeichnung?.(ki.fehler ? { fehler: ki.fehler } : { modus: ki.modus, hinweis: ki.hinweis });
    }
  }, [ki.fertig, ki.fehler, ki.modus, ki.hinweis, onKennzeichnung, setText]);

  if (!status?.faelle?.includes("nachricht")) return null;

  const stichpunkte = text.trim();
  return ki.laeuft ? (
    <button type="button" onClick={ki.abbrechen} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
      <Square aria-hidden="true" className="h-3.5 w-3.5" /> Stopp
    </button>
  ) : (
    <button
      type="button"
      onClick={() => {
        vorher.current = text;
        onKennzeichnung?.(null);
        ki.starten({ bezugArt, bezugId, stichpunkte, stream: true });
      }}
      title={stichpunkte ? "Ihr Text wird als Stichpunkte in einen Entwurf eingearbeitet" : "Antwort auf Basis des Verlaufs entwerfen"}
      className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold text-ov-800 ring-1 ring-inset ring-ov-200 transition-colors hover:bg-ov-50"
    >
      <Sparkles aria-hidden="true" className="h-4 w-4" />
      {stichpunkte ? "Ausformulieren" : status?.aktiv ? "KI-Entwurf" : "Entwurf"}
    </button>
  );
}
