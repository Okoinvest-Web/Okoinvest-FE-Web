"use client";

// Inline-Validierung für Portal-Formulare: verständliche Meldungen direkt am Feld
// (nach dem Verlassen des Feldes bzw. beim Absenden), aria-invalid + aria-describedby.
// Die maßgebliche Prüfung bleibt serverseitig – das hier ist Nutzerführung.

import { useCallback, useState } from "react";

const zahlWert = (v) => {
  const s = String(v ?? "").trim().replace(/\s/g, "");
  if (!s) return null;
  // 1.234,5 oder 1234,5 oder 1234.5
  const norm = /,\d*$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(norm);
  return Number.isFinite(n) ? n : NaN;
};

/** Prüfregeln – jede liefert "" (ok) oder eine Meldung in Klartext */
export const regeln = {
  pflicht: (text = "Bitte ausfüllen.") => (v) => (String(v ?? "").trim() ? "" : text),
  laenge: (min, max, was = "Eingabe") => (v) => {
    const l = String(v ?? "").trim().length;
    if (!l) return "";
    if (l < min) return `${was} ist zu kurz (mindestens ${min} Zeichen).`;
    if (l > max) return `${was} ist zu lang (höchstens ${max} Zeichen).`;
    return "";
  },
  /**
   * PLZ je Land (DE 5, AT 4, CH 4 Ziffern).
   * landWaehlbar: Im Formular gibt es ein Land-Feld → bei falscher Länge auf das Land hinweisen (Paket C:
   * eine 4-stellige PLZ bei „Deutschland“ ist meist eine österreichische oder Schweizer PLZ).
   */
  plz: (land = "DE", { landWaehlbar = false } = {}) => (v) => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    if (land === "DE") return /^\d{5}$/.test(s) ? "" : `Deutsche Postleitzahlen haben 5 Ziffern, z. B. 86825.${landWaehlbar && /^\d{4}$/.test(s) ? " Liegt der Ort in Österreich oder der Schweiz? Dann bitte oben das Land ändern." : ""}`;
    if (land === "AT" || land === "CH") return /^\d{4}$/.test(s) ? "" : `Postleitzahlen in ${land === "AT" ? "Österreich" : "der Schweiz"} haben 4 Ziffern, z. B. ${land === "AT" ? "5020" : "8001"}.${landWaehlbar && /^\d{5}$/.test(s) ? " Liegt der Ort in Deutschland? Dann bitte oben das Land ändern." : ""}`;
    return /^[0-9A-Za-z -]{3,10}$/.test(s) ? "" : "Bitte eine gültige Postleitzahl angeben.";
  },
  zahl: ({ min = -Infinity, max = Infinity, einheit = "", was = "Wert" } = {}) => (v) => {
    const n = zahlWert(v);
    if (n === null) return "";
    if (Number.isNaN(n)) return `Bitte nur eine Zahl eingeben${einheit ? ` (in ${einheit})` : ""}, z. B. 12,5.`;
    if (n < min) return `${was} muss mindestens ${String(min).replace(".", ",")}${einheit ? ` ${einheit}` : ""} betragen.`;
    if (n > max) return `${was} darf höchstens ${String(max).replace(".", ",")}${einheit ? ` ${einheit}` : ""} betragen – bitte Eingabe prüfen.`;
    return "";
  },
  telefon: () => (v) => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    return /^[+0-9 ()/.-]{6,40}$/.test(s) && (s.match(/\d/g) || []).length >= 6 ? "" : "Bitte eine Telefonnummer mit Vorwahl angeben, z. B. +49 8245 123456.";
  },
  email: () => (v) => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? "" : "Das sieht nicht nach einer E-Mail-Adresse aus – bitte prüfen (z. B. name@firma.de).";
  },
  bereich: (vonFeld, was = "Minimum") => (v, alle) => {
    const a = zahlWert(alle?.[vonFeld]);
    const b = zahlWert(v);
    if (a === null || b === null || Number.isNaN(a) || Number.isNaN(b)) return "";
    return a <= b ? "" : `${was} ist größer als der Höchstwert – bitte tauschen.`;
  },
};

export { zahlWert };

/**
 * useFeldPruefung({ feld: [regel, …] })
 *  → { fehler, beruehrt, pruefe(feld, werte), alles(werte) → bool, feldProps(feld, werte) }
 * feldProps liefert onBlur, aria-invalid und aria-describedby (id `${id}-fehler`).
 */
export function useFeldPruefung(schema) {
  const [fehler, setFehler] = useState({});
  const [beruehrt, setBeruehrt] = useState({});

  const eins = useCallback((feld, werte) => {
    for (const r of schema[feld] || []) {
      const m = r(werte?.[feld], werte);
      if (m) return m;
    }
    return "";
  }, [schema]);

  const pruefe = useCallback((feld, werte) => {
    const m = eins(feld, werte);
    setFehler((f) => (f[feld] === m ? f : { ...f, [feld]: m }));
    return !m;
  }, [eins]);

  const alles = useCallback((werte) => {
    const neu = {};
    for (const feld of Object.keys(schema)) neu[feld] = eins(feld, werte);
    setFehler(neu);
    setBeruehrt(Object.fromEntries(Object.keys(schema).map((k) => [k, true])));
    const erster = Object.keys(neu).find((k) => neu[k]);
    if (erster && typeof document !== "undefined") {
      requestAnimationFrame(() => document.querySelector(`[data-feld="${erster}"]`)?.focus());
    }
    return !erster;
  }, [schema, eins]);

  /** Nach der ersten Berührung live nachprüfen, damit Meldungen beim Korrigieren verschwinden */
  const aendern = useCallback((feld, werte) => {
    if (beruehrt[feld]) pruefe(feld, werte);
  }, [beruehrt, pruefe]);

  const feldProps = (feld, id, werte) => ({
    "data-feld": feld,
    "aria-invalid": fehler[feld] ? true : undefined,
    "aria-describedby": fehler[feld] ? `${id}-fehler` : undefined,
    onBlur: () => {
      setBeruehrt((b) => ({ ...b, [feld]: true }));
      pruefe(feld, werte);
    },
  });

  return { fehler, beruehrt, pruefe, alles, aendern, feldProps };
}

/** Fehlertext am Feld (id passend zu aria-describedby) */
export function FeldFehler({ id, text }) {
  if (!text) return null;
  return (
    <p id={`${id}-fehler`} className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium leading-snug text-danger-700">
      <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-[1px] h-3.5 w-3.5 shrink-0 fill-current"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.2c.5 0 .8.4.8.8v3.6a.8.8 0 0 1-1.6 0V5c0-.4.3-.8.8-.8Zm0 6.2a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Z" /></svg>
      {text}
    </p>
  );
}

/** Fehlermeldungen des Servers in Klartext übersetzen (Status → verständliche Anleitung) */
export function fehlerText(e) {
  const s = e?.status;
  if (s === 401) return "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an – Ihre Eingaben bleiben in diesem Fenster erhalten.";
  if (s === 403) return e.message && !/^Fehler \d+$/.test(e.message) ? e.message : "Dafür fehlt Ihnen die Berechtigung.";
  if (s === 413) return "Die Eingabe ist zu umfangreich. Bitte kürzen Sie längere Texte.";
  if (s === 429) return "Zu viele Versuche in kurzer Zeit – bitte warten Sie einen Moment und versuchen Sie es erneut.";
  if (s >= 500) return "Der Server ist gerade nicht erreichbar. Bitte versuchen Sie es in einigen Minuten erneut.";
  return e?.message || "Das hat nicht geklappt. Bitte prüfen Sie Ihre Eingaben.";
}
