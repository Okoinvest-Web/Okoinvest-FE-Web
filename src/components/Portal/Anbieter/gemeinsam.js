"use client";

// Gemeinsame Helfer der Anbieter-Akte (Client): Aktion mit Fehler/Erfolg, kleine Anzeigen.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { senden } from "@/lib/plattform/client";
import { cn } from "@/components/ui/cn";

/** POST an die Anbieter-API; ruft `setAkte` mit der neuen Akte und aktualisiert die Seite (Nachrichten, Status) */
export function useAnbieterAktion(projektId, setAkte, { admin = false } = {}) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  async function los(body, text, { alsAdmin = admin } = {}) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      const url = alsAdmin ? `/api/admin/anbieter/${projektId}` : `/api/portal/anbieter/${projektId}`;
      const r = await senden(url, { body });
      if (r.akte) setAkte(r.akte);
      setErfolg(typeof text === "function" ? text(r.akte || {}) : text);
      router.refresh();
      return r.akte || true;
    } catch (e) {
      setFehler(e.message);
      return false;
    } finally {
      setLaeuft(false);
    }
  }
  return { laeuft, fehler, erfolg, los, setFehler };
}

export const tag = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join(".") : "");
export const zeit = (iso) => (iso ? new Date(iso).toLocaleString("de-AT", { timeZone: "Europe/Vienna", dateStyle: "medium", timeStyle: "short" }) : "");
export const eur = (x) => (x || x === 0 ? `${Math.round(x).toLocaleString("de-DE")} €` : "–");
export const pct = (x, st = 1) => (x === null || x === undefined ? "–" : `${(x * 100).toLocaleString("de-DE", { maximumFractionDigits: st })} %`);

const STUFE = { kritisch: "bg-danger-50 text-danger-800 ring-danger-200", fehler: "bg-danger-50 text-danger-800 ring-danger-200", warnung: "bg-sun-300/20 text-ink-900 ring-sun-400/40", info: "bg-navy-50 text-navy-900 ring-navy-100" };
const STUFE_LABEL = { kritisch: "Kritisch", fehler: "Fehler", warnung: "Hinweis", info: "Info" };

export function HinweisListe({ hinweise = [], leer = "" }) {
  if (!hinweise.length) return leer ? <p className="text-[14px] text-ink-500">{leer}</p> : null;
  return (
    <ul className="space-y-2">
      {hinweise.map((h, i) => (
        <li key={i} className={cn("rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ring-1 ring-inset", STUFE[h.stufe] || STUFE.info)}>
          <span className="font-semibold">{STUFE_LABEL[h.stufe] || "Info"}: </span>
          {h.text}
        </li>
      ))}
    </ul>
  );
}

export const knopfKlein =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors disabled:opacity-50";
export const knopfPrimaer = cn(knopfKlein, "bg-ov-600 text-white ring-ov-600 hover:bg-ov-700");
export const knopfSekundaer = cn(knopfKlein, "bg-white text-ink-800 ring-ink-200 hover:ring-ink-300");
export const knopfNavy = cn(knopfKlein, "bg-navy-900 text-white ring-navy-900 hover:bg-navy-800");
