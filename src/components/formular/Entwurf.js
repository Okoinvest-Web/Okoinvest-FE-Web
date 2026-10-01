"use client";

// src/components/formular/Entwurf.js
//
// Automatisches Zwischenspeichern von Formulareingaben im Browser-Tab (sessionStorage – endet mit dem Tab,
// nichts landet auf dem Server). Passwörter und andere sensible Felder per `ohne` ausschließen.
//   const entwurf = useEntwurf("anfrage-flaeche", form.werte, { ohne: ["passwort"], wiederherstellen: form.setzeAlle });
//   <AutosaveHinweis stand={entwurf.stand} onVerwerfen={entwurf.verwerfen} />

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, RotateCcw } from "lucide-react";
import { cn } from "@/components/ui/cn";

const PRAEFIX = "ov-entwurf:";

function lesen(schluessel) {
  try {
    const roh = window.sessionStorage.getItem(PRAEFIX + schluessel);
    return roh ? JSON.parse(roh) : null;
  } catch {
    return null;
  }
}

/**
 * Entwurf für ein anderes Formular vorbelegen (z. B. Anfrage → Registrierung), ohne Daten in die URL zu schreiben.
 * Bestehende Werte bleiben erhalten, leere werden ergänzt.
 */
export function entwurfVorbelegen(schluessel, werte) {
  try {
    const alt = lesen(schluessel)?.werte || {};
    const neu = { ...alt };
    for (const [k, v] of Object.entries(werte || {})) if (v && !alt[k]) neu[k] = v;
    window.sessionStorage.setItem(PRAEFIX + schluessel, JSON.stringify({ werte: neu, zeit: Date.now() }));
  } catch {
    /* ignorieren */
  }
}

/**
 * stand: "leer" | "gespeichert" | "wiederhergestellt"
 * aktiv=false schaltet ab (z. B. nach erfolgreichem Absenden)
 */
export function useEntwurf(schluessel, werte, { ohne = [], wiederherstellen, aktiv = true, verzoegerung = 700 } = {}) {
  const [stand, setStand] = useState("leer");
  const [zeit, setZeit] = useState(null);
  const geladen = useRef(false);
  const ohneText = ohne.join("|");

  // Einmal beim Mounten wiederherstellen
  useEffect(() => {
    if (geladen.current) return;
    geladen.current = true;
    const e = lesen(schluessel);
    if (e?.werte && Object.values(e.werte).some((v) => v !== "" && v !== false && v != null && !(Array.isArray(v) && !v.length))) {
      wiederherstellen?.(e.werte);
      setStand("wiederhergestellt");
      setZeit(e.zeit || Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);

  // Entprellt speichern
  useEffect(() => {
    if (!aktiv || !geladen.current) return;
    const t = setTimeout(() => {
      const gefiltert = {};
      const aus = ohneText ? ohneText.split("|") : [];
      for (const [k, v] of Object.entries(werte || {})) if (!aus.includes(k)) gefiltert[k] = v;
      const hatInhalt = Object.values(gefiltert).some((v) => v !== "" && v !== false && v != null && !(Array.isArray(v) && !v.length));
      try {
        if (hatInhalt) {
          const jetzt = Date.now();
          window.sessionStorage.setItem(PRAEFIX + schluessel, JSON.stringify({ werte: gefiltert, zeit: jetzt }));
          setZeit(jetzt);
          setStand((s) => (s === "wiederhergestellt" ? s : "gespeichert"));
        } else {
          window.sessionStorage.removeItem(PRAEFIX + schluessel);
          setStand("leer");
        }
      } catch {
        /* Speicher nicht verfügbar (privates Fenster) – still ignorieren */
      }
    }, verzoegerung);
    return () => clearTimeout(t);
  }, [werte, schluessel, aktiv, ohneText, verzoegerung]);

  const verwerfen = useCallback(() => {
    try {
      window.sessionStorage.removeItem(PRAEFIX + schluessel);
    } catch {
      /* ignorieren */
    }
    setStand("leer");
    setZeit(null);
  }, [schluessel]);

  return { stand, zeit, verwerfen };
}

const uhrzeit = (t) => (t ? new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "");

/** Dezenter Hinweis „Entwurf gesichert“; bei wiederhergestelltem Entwurf mit „Verwerfen“ */
export function AutosaveHinweis({ stand, zeit, onVerwerfen, dunkel = false, className }) {
  return (
    <div className={cn("flex min-h-[1.5rem] flex-wrap items-center gap-x-3 gap-y-1 text-[13px]", dunkel ? "text-white/70" : "text-ink-500", className)}>
      <span role="status" className={cn("inline-flex items-center gap-1.5 transition-opacity duration-300", stand === "leer" ? "opacity-0" : "opacity-100")}>
        <CircleCheck aria-hidden="true" className={cn("h-4 w-4", dunkel ? "text-ov-300" : "text-ov-600")} />
        {stand === "wiederhergestellt" ? "Ihr Entwurf wurde wiederhergestellt" : stand === "gespeichert" ? "Entwurf in diesem Tab gesichert" : ""}
        {stand !== "leer" && zeit ? <span className="ov-num"> · {uhrzeit(zeit)} Uhr</span> : null}
      </span>
      {stand === "wiederhergestellt" && onVerwerfen && (
        <button type="button" onClick={onVerwerfen} className={cn("inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline", dunkel ? "text-white/85" : "text-ink-700")}>
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Verwerfen
        </button>
      )}
    </div>
  );
}
