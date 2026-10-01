"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

/**
 * Modaler Dialog auf Basis des nativen <dialog> (Fokusfalle, Esc, Top-Layer
 * und inert-Hintergrund liefert der Browser). Fokus kehrt nach dem
 * Schließen zum Auslöser zurück.
 *
 *   const [offen, setOffen] = useState(false);
 *   <Dialog offen={offen} onSchliessen={() => setOffen(false)} titel="Projekt löschen?"
 *     text="Das kann nicht rückgängig gemacht werden."
 *     aktionen={<><Button variant="secondary" onClick={…}>Abbrechen</Button><Button variant="danger">Löschen</Button></>} />
 *
 * groesse: sm | md | lg | xl; blatt: auf dem Handy als Bottom-Sheet
 * ton: neutral | danger (Kopf-Icon rot für destruktive Aktionen)
 * icon: Lucide-Icon im Kopf
 */
export default function Dialog({
  offen,
  onSchliessen,
  titel,
  text,
  icon: Icon,
  ton = "neutral",
  aktionen,
  groesse = "md",
  blatt = true,
  schliessenKnopf = true,
  className,
  children,
}) {
  const ref = useRef(null);
  const titelId = useId();
  const textId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (offen && !d.open) d.showModal();
    if (!offen && d.open) d.close();
  }, [offen]);

  const breite = { sm: "28rem", md: "36rem", lg: "48rem", xl: "64rem" }[groesse] || "36rem";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titel ? titelId : undefined}
      aria-describedby={text ? textId : undefined}
      onClose={() => onSchliessen?.()}
      onCancel={(e) => {
        e.preventDefault();
        onSchliessen?.();
      }}
      onClick={(e) => {
        // Klick auf den abgedunkelten Hintergrund schließt
        if (e.target === ref.current) onSchliessen?.();
      }}
      className={cn("ov-dialog", blatt && "ov-dialog-blatt")}
      style={{ "--ov-dialog-breite": breite }}
    >
      {offen && (
        <div
          className={cn(
            "relative max-h-[88vh] overflow-y-auto bg-white p-5 text-ink-900 shadow-e5 ring-1 ring-ink-200/70 sm:rounded-3xl sm:p-7",
            blatt ? "rounded-t-3xl" : "rounded-3xl",
            className
          )}
        >
          {blatt && <span aria-hidden="true" className="mx-auto -mt-1 mb-4 block h-1 w-10 rounded-full bg-ink-200 sm:hidden" />}
          <div className="flex items-start gap-4">
            {Icon && (
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  ton === "danger" ? "bg-danger-50 text-danger-600" : "bg-ov-50 text-ov-600"
                )}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1 pr-8">
              {titel && (
                <h2 id={titelId} className="font-display text-[20px] font-extrabold leading-tight tracking-tight">
                  {titel}
                </h2>
              )}
              {text && (
                <p id={textId} className="mt-1.5 text-[15px] leading-relaxed text-ink-600">
                  {text}
                </p>
              )}
            </div>
          </div>
          {schliessenKnopf && (
            <button
              type="button"
              onClick={() => onSchliessen?.()}
              aria-label="Dialog schließen"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 sm:right-4 sm:top-4"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          )}
          {children && <div className={cn(titel || text ? "mt-5" : "")}>{children}</div>}
          {aktionen && <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">{aktionen}</div>}
        </div>
      )}
    </dialog>
  );
}
