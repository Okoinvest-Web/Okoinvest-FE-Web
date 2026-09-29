// src/components/Portal/felder.js
//
// Formularbausteine für Portal, Login und Registrierung (ohne Hooks).

import { cn } from "@/components/ui/cn";

export const eingabe =
  "block h-12 w-full min-w-0 rounded-xl bg-white px-4 text-[15px] text-ink-900 outline-none ring-1 ring-inset ring-ink-200 transition-shadow placeholder:text-ink-400 hover:ring-ink-300 focus-visible:ring-2 focus-visible:ring-ov-500 disabled:bg-ink-50 disabled:text-ink-500";
export const textbereich = cn(eingabe, "h-auto min-h-[112px] py-3 leading-relaxed");
export const auswahlfeld = cn(eingabe, "appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2020%2020%22%20fill=%22%236b7486%22%3E%3Cpath%20d=%22M5.3%207.3a1%201%200%200%201%201.4%200L10%2010.6l3.3-3.3a1%201%200%201%201%201.4%201.4l-4%204a1%201%200%200%201-1.4%200l-4-4a1%201%200%200%201%200-1.4z%22/%3E%3C/svg%3E')] bg-[length:18px] bg-[right_14px_center] bg-no-repeat pr-10");
export const labelKlasse = "mb-1.5 block text-[13.5px] font-semibold text-ink-700";

export function Feld({ id, label, hinweis, fehler, pflicht, children, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label htmlFor={id} className={labelKlasse}>
          {label}
          {pflicht && <span aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {hinweis && !fehler && <p id={id ? `${id}-hinweis` : undefined} className="mt-1.5 text-[12.5px] leading-snug text-ink-500">{hinweis}</p>}
      {fehler && <p className="mt-1.5 text-[12.5px] font-medium text-red-700">{fehler}</p>}
    </div>
  );
}

/** Auswahl-Chip (Checkbox/Radio im Kartenstil) */
export function Chip({ name, value, checked, onChange, type = "checkbox", children }) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-medium ring-1 ring-inset transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
        checked ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
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
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800 ring-1 ring-red-200">
      {children}
    </p>
  );
}

export function ErfolgBox({ children }) {
  if (!children) return null;
  return (
    <p role="status" className="rounded-xl bg-ov-50 px-4 py-3 text-[14px] text-ov-900 ring-1 ring-ov-200">
      {children}
    </p>
  );
}
