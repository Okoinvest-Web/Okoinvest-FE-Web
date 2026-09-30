"use client";

// Client-Hook für den Assistenten: ruft POST /api/portal/ki/[fall] auf (JSON + Origin wie alle
// Mutationen) und liest – falls der Server streamt – die NDJSON-Zeilen mit.
// Zustand: laeuft, text (Textfälle, wächst beim Streamen), ergebnis (strukturierte Fälle),
// modus ("ki" | "regel"), hinweis, quellen, fehler, kontingent.

import { useCallback, useEffect, useRef, useState } from "react";

let statusPromise = null;

/** Status des Assistenten (einmal je Seitenaufruf geladen) */
export function useKiStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let aktiv = true;
    statusPromise ||= fetch("/api/portal/ki", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    statusPromise.then((s) => aktiv && setStatus(s));
    return () => {
      aktiv = false;
    };
  }, []);
  return status;
}

export function kiStatusNeuLaden() {
  statusPromise = null;
}

const LEER = { laeuft: false, text: "", ergebnis: null, modus: null, hinweis: "", quellen: [], fehler: "", kontingent: null, fertig: false };

export function useKi(fall, { onText } = {}) {
  const [z, setZ] = useState(LEER);
  const abbruch = useRef(null);
  const textRef = useRef(onText);
  textRef.current = onText;

  useEffect(() => () => abbruch.current?.abort(), []);

  const zuruecksetzen = useCallback(() => {
    abbruch.current?.abort();
    setZ(LEER);
  }, []);

  const abbrechen = useCallback(() => {
    abbruch.current?.abort();
    setZ((x) => ({ ...x, laeuft: false, fertig: true }));
  }, []);

  const starten = useCallback(
    async (body) => {
      abbruch.current?.abort();
      const ac = new AbortController();
      abbruch.current = ac;
      setZ({ ...LEER, laeuft: true });
      let text = "";
      const setzeText = (t) => {
        text = t;
        textRef.current?.(t);
      };
      try {
        const res = await fetch(`/api/portal/ki/${fall}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body || {}),
          credentials: "same-origin",
          cache: "no-store",
          signal: ac.signal,
        });
        const typ = res.headers.get("content-type") || "";
        if (res.ok && typ.includes("ndjson") && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let puffer = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            puffer += decoder.decode(value, { stream: true });
            let i;
            while ((i = puffer.indexOf("\n")) >= 0) {
              const zeile = puffer.slice(0, i).trim();
              puffer = puffer.slice(i + 1);
              if (!zeile) continue;
              let e;
              try {
                e = JSON.parse(zeile);
              } catch {
                continue;
              }
              if (e.t === "start") setZ((x) => ({ ...x, modus: e.modus, quellen: e.quellen || [], kontingent: e.kontingent || null, hinweis: e.hinweis || "" }));
              else if (e.t === "text") {
                setzeText(text + e.text);
                setZ((x) => ({ ...x, text }));
              } else if (e.t === "ersetzen") {
                setzeText(e.ergebnis?.text || "");
                setZ((x) => ({ ...x, text, ergebnis: e.ergebnis, modus: e.modus, hinweis: e.hinweis || "" }));
              } else if (e.t === "hinweis") setZ((x) => ({ ...x, hinweis: e.hinweis }));
            }
          }
          setZ((x) => ({ ...x, laeuft: false, fertig: true }));
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) {
          setZ({ ...LEER, fehler: json.error || `Fehler ${res.status}`, fertig: true });
          return;
        }
        if (typeof json.ergebnis?.text === "string") setzeText(json.ergebnis.text);
        setZ({ laeuft: false, fertig: true, text, ergebnis: json.ergebnis || null, modus: json.modus, hinweis: json.hinweis || "", quellen: json.quellen || [], fehler: "", kontingent: json.kontingent || null });
      } catch (err) {
        if (err?.name === "AbortError") return;
        setZ((x) => ({ ...x, laeuft: false, fertig: true, fehler: "Keine Verbindung – bitte versuchen Sie es erneut." }));
      }
    },
    [fall]
  );

  return { ...z, starten, abbrechen, zuruecksetzen };
}
