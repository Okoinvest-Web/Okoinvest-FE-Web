"use client";

import { createContext, useContext, useEffect, useRef } from "react";

/* ------------------------------------------------------------------
   Gemeinsamer Zustand eines Rechner-Rahmens:
   – Kurzwerte (aus <MobilKurz>) für die klebende Leiste und den
     Szenario-Vergleich,
   – optional der Eingabezustand (useTeilbarerZustand) für teilbare Links
     und „Szenario wiederherstellen“.
   ------------------------------------------------------------------ */

export const RahmenKontext = createContext(null);

export const useRahmen = () => useContext(RahmenKontext);

const istZahl = (v) => typeof v === "number" && Number.isFinite(v);

/** Wert aus der Adresszeile prüfen – nur bekannte Schlüssel, passende Typen, plausible Größen. */
function lesenAusUrl(standard, { optionen = {}, grenzen = {} }) {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const neu = {};
  for (const [k, std] of Object.entries(standard)) {
    if (!p.has(k)) continue;
    const roh = p.get(k);
    if (typeof std === "number") {
      const n = Number(roh);
      if (!istZahl(n)) continue;
      if (grenzen[k]) {
        neu[k] = Math.min(grenzen[k][1], Math.max(grenzen[k][0], n));
      } else {
        // Ohne Grenzen nur plausible Werte (gleiches Vorzeichen, nicht absurd groß)
        const deckel = Math.max(Math.abs(std) * 50, 1000);
        if (Math.abs(n) > deckel || (std > 0 && n < 0) || (std < 0 && n > 0)) continue;
        neu[k] = n;
      }
    } else if (typeof std === "boolean") {
      if (roh === "1" || roh === "0") neu[k] = roh === "1";
    } else if (typeof std === "string") {
      if (optionen[k]?.includes(roh)) neu[k] = roh;
    }
  }
  return neu;
}

/**
 * Macht den Eingabezustand eines Rechners teilbar: Abweichungen vom
 * Standard landen (verzögert) in der Adresszeile, ein geteilter Link stellt
 * sie beim Öffnen wieder her. Registriert den Zustand außerdem beim
 * umgebenden <RechnerRahmen> (Szenario-Vergleich: „A wiederherstellen“).
 *
 *   const [e, setE] = useState(STANDARD);
 *   useTeilbarerZustand(e, (neu) => setE((a) => ({ ...a, ...neu })), {
 *     optionen: { profil: LASTPROFILE.map((p) => p.id) },
 *     grenzen: { laufzeit: [3, 20] },
 *     pruefen: (z) => rechnePpa(z),
 *   });
 *
 * optionen  erlaubte Texte je Schlüssel (andere Texte aus der URL werden ignoriert)
 * grenzen   [min, max] je Zahl (Werte werden begrenzt)
 * pruefen   optional: (zusammengeführt, nurAusUrl) => …; wirft die Funktion, bleibt der Standard
 */
export function useTeilbarerZustand(werte, uebernehmen, einstellungen = {}) {
  const rahmen = useRahmen();
  const standard = useRef(werte);
  const aktuell = useRef(werte);
  const uebernehmenRef = useRef(uebernehmen);
  const einstellungenRef = useRef(einstellungen);
  const bereit = useRef(false);
  aktuell.current = werte;
  uebernehmenRef.current = uebernehmen;
  einstellungenRef.current = einstellungen;

  // Beim Öffnen: Werte aus einem geteilten Link übernehmen
  useEffect(() => {
    const neu = lesenAusUrl(standard.current, einstellungenRef.current);
    if (Object.keys(neu).length) {
      let ok = true;
      if (einstellungenRef.current.pruefen) {
        try {
          einstellungenRef.current.pruefen({ ...standard.current, ...neu }, neu);
        } catch {
          ok = false;
        }
      }
      if (ok) uebernehmenRef.current(neu);
    }
    bereit.current = true;
  }, []);

  // Beim Rahmen anmelden (Szenario wiederherstellen)
  useEffect(() => {
    if (!rahmen?.zustand) return undefined;
    rahmen.zustand.current = {
      lesen: () => ({ ...aktuell.current }),
      setzen: (z) => uebernehmenRef.current(z),
    };
    return () => {
      rahmen.zustand.current = null;
    };
  }, [rahmen]);

  // Änderungen verzögert in die Adresszeile schreiben (ohne Verlaufseintrag)
  const schluessel = JSON.stringify(werte);
  useEffect(() => {
    if (!bereit.current || typeof window === "undefined") return undefined;
    const t = setTimeout(() => {
      const p = new URLSearchParams(window.location.search);
      for (const [k, std] of Object.entries(standard.current)) {
        const v = aktuell.current[k];
        if (typeof std === "object" || v === undefined) continue;
        if (v === std) p.delete(k);
        else if (typeof v === "boolean") p.set(k, v ? "1" : "0");
        else if (istZahl(v)) p.set(k, String(Math.round(v * 1e6) / 1e6));
        else if (typeof v === "string") p.set(k, v);
      }
      const q = p.toString();
      const url = `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`;
      if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        try {
          window.history.replaceState(null, "", url);
        } catch {
          /* z. B. in eingebetteten Ansichten nicht erlaubt */
        }
      }
    }, 400);
    return () => clearTimeout(t);
  }, [schluessel]);
}

/** Kurzwerte (Label/Wert-Paare aus <MobilKurz>) beim Rahmen melden. */
export function useKurzwerteMelden(werte) {
  const rahmen = useRahmen();
  const schluessel = werte.map(([k, v]) => `${k}\u0000${typeof v === "string" || typeof v === "number" ? v : ""}`).join("\u0001");
  useEffect(() => {
    rahmen?.setKurz(werte.map(([k, v]) => [String(k), typeof v === "string" || typeof v === "number" ? String(v) : ""]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel, rahmen]);
}
