// src/components/Portal/felder.js
//
// Formularbausteine für Portal, Login und Registrierung (ohne Hooks).
// Neue Formulare bitte mit den Bausteinen unter src/components/formular/** bauen (Textfeld, PasswortFeld,
// useFormular, AbsendeKnopf …). Diese Datei bleibt als kompatible Basis für bestehende Formulare.

import { Children, cloneElement, isValidElement } from "react";
import { cn } from "@/components/ui/cn";
import T from "@/components/Sprache/T";

export const eingabe =
  "block h-12 w-full min-w-0 rounded-xl bg-white px-4 text-[15px] text-ink-900 outline-none ring-1 ring-inset ring-ink-400 transition-shadow placeholder:text-ink-500 hover:ring-ink-500 focus-visible:ring-2 focus-visible:ring-ov-500 disabled:bg-ink-50 disabled:text-ink-500 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger-500";
export const textbereich = cn(eingabe, "h-auto min-h-[112px] py-3 leading-relaxed");
export const auswahlfeld = cn(eingabe, "appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2020%2020%22%20fill=%22%236b7486%22%3E%3Cpath%20d=%22M5.3%207.3a1%201%200%200%201%201.4%200L10%2010.6l3.3-3.3a1%201%200%201%201%201.4%201.4l-4%204a1%201%200%200%201-1.4%200l-4-4a1%201%200%200%201%200-1.4z%22/%3E%3C/svg%3E')] bg-[length:18px] bg-[right_14px_center] bg-no-repeat pr-10");
export const labelKlasse = "mb-1.5 block text-[13.5px] font-semibold text-ink-700";

const FELD_TYPEN = new Set(["input", "select", "textarea"]);

/** Hinweis/Fehler am direkten Eingabe-Kind verknüpfen (aria-describedby, aria-invalid) */
function verknuepfen(children, id, hinweis, fehler) {
  if (!id || (!hinweis && !fehler)) return children;
  const ziel = fehler ? `${id}-fehler` : `${id}-hinweis`;
  return Children.map(children, (kind) => {
    if (!isValidElement(kind) || !FELD_TYPEN.has(kind.type) || kind.props.id !== id) return kind;
    const bisher = String(kind.props["aria-describedby"] || "").split(" ").filter((x) => x && x !== `${id}-hinweis` && x !== `${id}-fehler`);
    return cloneElement(kind, {
      "aria-describedby": [ziel, ...bisher].join(" "),
      ...(fehler ? { "aria-invalid": true } : {}),
    });
  });
}

export function Feld({ id, label, hinweis, fehler, pflicht, children, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label htmlFor={id} className={labelKlasse}>
          {label}
          {pflicht && (
            <>
              <span aria-hidden="true"> *</span>
              <span className="sr-only"> <T de="(Pflichtfeld)" en="(required)" /></span>
            </>
          )}
        </label>
      )}
      {verknuepfen(children, id, hinweis, fehler)}
      {hinweis && !fehler && <p id={id ? `${id}-hinweis` : undefined} className="mt-1.5 text-[13px] leading-snug text-ink-500">{hinweis}</p>}
      {fehler && (
        <p id={id ? `${id}-fehler` : undefined} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium leading-snug text-danger-700">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-[1px] h-3.5 w-3.5 shrink-0 fill-current"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.2c.5 0 .8.4.8.8v3.6a.8.8 0 0 1-1.6 0V5c0-.4.3-.8.8-.8Zm0 6.2a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Z" /></svg>
          <span className="min-w-0">{fehler}</span>
        </p>
      )}
    </div>
  );
}

/** Auswahl-Chip (Checkbox/Radio im Kartenstil) */
export function Chip({ name, value, checked, onChange, type = "checkbox", children }) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-medium ring-1 ring-inset transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
        checked ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-300 hover:ring-ov-400"
      )}
    >
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

export function FehlerBox({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-2xl bg-danger-50 px-4 py-3 text-[14px] leading-relaxed text-danger-800 ring-1 ring-inset ring-danger-200">
      {children}
    </p>
  );
}

export function ErfolgBox({ children }) {
  if (!children) return null;
  return (
    <p role="status" className="rounded-2xl bg-ov-50 px-4 py-3 text-[14px] leading-relaxed text-ov-900 ring-1 ring-inset ring-ov-200">
      {children}
    </p>
  );
}
