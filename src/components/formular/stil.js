// src/components/formular/stil.js
//
// Klassen der gemeinsamen Formularbausteine (Team T5, DESIGN.md § 4 „Formulare“).
// Ohne Hooks – auch in Server-Komponenten nutzbar.

import { cn } from "@/components/ui/cn";

/** Eingabefeld hell: h-12, rounded-2xl, Fokus ov-500, Fehler danger-300, mobil 16 px (kein iOS-Zoom) */
export const feldHell =
  "block h-12 w-full min-w-0 rounded-2xl bg-white px-4 text-[16px] text-ink-900 outline-none ring-1 ring-inset ring-ink-400 transition-shadow duration-150 ease-ov-out placeholder:text-ink-500 hover:ring-ink-500 focus-visible:ring-2 focus-visible:ring-ov-500 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger-500 md:text-[15px]";

/** Eingabefeld auf Navy-Flächen */
export const feldDunkel =
  "block h-12 w-full min-w-0 rounded-2xl bg-white/[0.07] px-4 text-[16px] text-white outline-none ring-1 ring-inset ring-white/35 transition-shadow duration-150 ease-ov-out placeholder:text-white/55 hover:ring-white/55 focus-visible:ring-2 focus-visible:ring-ov-300 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger-300 md:text-[15px]";

export const feldKlasse = (dunkel) => (dunkel ? feldDunkel : feldHell);

/** Mehrzeilig */
export const textbereichKlasse = (dunkel) => cn(feldKlasse(dunkel), "h-auto min-h-[112px] py-3 leading-relaxed");

/** Auswahlliste mit eigenem Pfeil (Pfeil kommt als Icon aus Textfeld) */
export const auswahlKlasse = (dunkel) => cn(feldKlasse(dunkel), "appearance-none pr-11");

/** Label: immer sichtbar über dem Feld, 14 px/600 */
export const labelKlasse = (dunkel) => cn("mb-1.5 block text-[14px] font-semibold leading-snug", dunkel ? "text-white/90" : "text-ink-900");

/** Hilfetext 13 px */
export const hinweisKlasse = (dunkel) => cn("mt-1.5 text-[13px] leading-snug", dunkel ? "text-white/70" : "text-ink-500");

/** Fehlertext 13 px danger-700 (auf Dunkel danger-300) */
export const fehlerKlasse = (dunkel) => cn("mt-1.5 flex items-start gap-1.5 text-[13px] font-medium leading-snug", dunkel ? "text-danger-300" : "text-danger-700");

/** Checkbox im Markenstil (24 px Zielgröße über das Label) */
export const checkboxKlasse = "mt-0.5 h-5 w-5 shrink-0 rounded accent-ov-600";

/** aria-describedby aus Hinweis/Fehler zusammensetzen */
export function beschreibungIds(id, { hinweis, fehler, extra } = {}) {
  const ids = [];
  if (fehler) ids.push(`${id}-fehler`);
  else if (hinweis) ids.push(`${id}-hinweis`);
  if (extra) ids.push(extra);
  return ids.length ? ids.join(" ") : undefined;
}
