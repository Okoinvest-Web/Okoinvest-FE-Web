"use client";

// Toasts: kurze Rückmeldungen nach einer Aktion („Gespeichert“, „Link kopiert“).
// Aufruf von überall im Client-Code, ohne Provider:
//
//   import { toast } from "@/components/ui/Toast";
//   toast({ titel: "Gespeichert", text: "Ihre Änderungen sind übernommen.", ton: "success" });
//   toast.fehler("Upload fehlgeschlagen");
//
// Beim ersten Aufruf hängt sich ein einziger <Toaster/> selbst an <body>.
// Barrierefrei: aria-live (polite; Fehler assertive), Esc schließt den
// neuesten Toast, Pause bei Hover/Fokus, nie die einzige Fehlermeldung
// für Formulare (Feldfehler gehören ans Feld).

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "./cn";

let liste = [];
let naechsteId = 1;
const hoerer = new Set();
let eingehaengt = false;
let aktiveToaster = 0;

function melden() {
  hoerer.forEach((h) => h());
}

function einhaengen() {
  if (eingehaengt || aktiveToaster > 0 || typeof document === "undefined") return;
  eingehaengt = true;
  const host = document.createElement("div");
  host.setAttribute("data-ov-toaster", "");
  document.body.appendChild(host);
  createRoot(host).render(<Toaster />);
}

/**
 * Zeigt einen Toast. Rückgabe: id (für schliessen).
 * ton: success | info | warn | danger | neutral
 * dauer: ms (Standard 5000, Fehler 8000; 0 = bleibt bis geschlossen)
 * aktion: { label, onClick } – z. B. „Rückgängig“
 */
export function toast({ titel, text, ton = "success", dauer, aktion } = {}) {
  const id = naechsteId++;
  const d = dauer ?? (ton === "danger" ? 8000 : 5000);
  const hinzufuegen = () => {
    liste = [...liste, { id, titel, text, ton, dauer: d, aktion, raus: false }].slice(-4);
    melden();
  };
  // Live-Regionen müssen schon im DOM stehen, bevor Inhalt erscheint –
  // beim allerersten Toast daher kurz nach dem Einhängen hinzufügen.
  if (!eingehaengt && aktiveToaster === 0 && typeof document !== "undefined") {
    einhaengen();
    setTimeout(hinzufuegen, 60);
  } else {
    hinzufuegen();
  }
  return id;
}
toast.erfolg = (titel, text, opt) => toast({ titel, text, ton: "success", ...opt });
toast.info = (titel, text, opt) => toast({ titel, text, ton: "info", ...opt });
toast.warnung = (titel, text, opt) => toast({ titel, text, ton: "warn", ...opt });
toast.fehler = (titel, text, opt) => toast({ titel, text, ton: "danger", ...opt });

export function toastSchliessen(id) {
  liste = liste.map((t) => (t.id === id ? { ...t, raus: true } : t));
  melden();
  setTimeout(() => {
    liste = liste.filter((t) => t.id !== id);
    melden();
  }, 200);
}

const abonnieren = (h) => {
  hoerer.add(h);
  return () => hoerer.delete(h);
};
const leer = [];

const TON = {
  success: { icon: CheckCircle2, farbe: "text-ov-600", leiste: "bg-ov-500" },
  info: { icon: Info, farbe: "text-navy-500", leiste: "bg-navy-500" },
  warn: { icon: AlertTriangle, farbe: "text-sun-600", leiste: "bg-sun-500" },
  danger: { icon: XCircle, farbe: "text-danger-600", leiste: "bg-danger-500" },
  neutral: { icon: Info, farbe: "text-ink-500", leiste: "bg-ink-400" },
};

/**
 * Optional selbst platzieren (z. B. im Layout). Sonst hängt toast() ihn an.
 * position: unten-rechts (Standard) | unten-mitte | oben-rechts
 */
export function Toaster({ position = "unten-rechts" }) {
  const toasts = useSyncExternalStore(abonnieren, () => liste, () => leer);

  useEffect(() => {
    aktiveToaster++;
    const esc = (e) => {
      if (e.key === "Escape" && liste.length) toastSchliessen(liste[liste.length - 1].id);
    };
    window.addEventListener("keydown", esc);
    return () => {
      aktiveToaster--;
      window.removeEventListener("keydown", esc);
    };
  }, []);

  const pos = {
    "unten-rechts": "bottom-4 right-4 left-4 items-end sm:left-auto",
    "unten-mitte": "bottom-4 left-4 right-4 items-center",
    "oben-rechts": "top-4 right-4 left-4 items-end sm:left-auto",
  }[position];
  const innen = position === "unten-mitte" ? "items-center" : "items-end";

  return (
    <div className={cn("pointer-events-none fixed z-[90] flex flex-col gap-2.5", pos)}>
      <div aria-live="polite" aria-atomic="false" className={cn("flex w-full flex-col gap-2.5", innen)}>
        {toasts.filter((t) => t.ton !== "danger").map((t) => <ToastKarte key={t.id} t={t} />)}
      </div>
      <div aria-live="assertive" aria-atomic="false" className={cn("flex w-full flex-col gap-2.5", innen)}>
        {toasts.filter((t) => t.ton === "danger").map((t) => <ToastKarte key={t.id} t={t} />)}
      </div>
    </div>
  );
}

function ToastKarte({ t }) {
  const { icon: Icon, farbe, leiste } = TON[t.ton] || TON.neutral;
  const [pause, setPause] = useState(false);
  const rest = useRef(t.dauer);
  const start = useRef(0);

  useEffect(() => {
    if (!t.dauer || pause || t.raus) return;
    start.current = Date.now();
    const timer = setTimeout(() => toastSchliessen(t.id), rest.current);
    return () => {
      clearTimeout(timer);
      rest.current -= Date.now() - start.current;
    };
  }, [pause, t.dauer, t.id, t.raus]);

  return (
    <div
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onFocus={() => setPause(true)}
      onBlur={() => setPause(false)}
      className={cn(
        "pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl bg-white py-3.5 pl-4 pr-3 shadow-e4 ring-1 ring-ink-200/80",
        t.raus ? "ov-toast-aus" : "ov-toast-ein"
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", leiste)} />
      <Icon aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0", farbe)} />
      <div className="min-w-0 flex-1">
        {t.titel && <p className="text-[14.5px] font-semibold text-ink-900">{t.titel}</p>}
        {t.text && <p className={cn("text-[13.5px] leading-snug text-ink-600", t.titel && "mt-0.5")}>{t.text}</p>}
        {t.aktion && (
          <button
            type="button"
            onClick={() => {
              t.aktion.onClick?.();
              toastSchliessen(t.id);
            }}
            className="mt-2 text-[13.5px] font-semibold text-ov-700 underline-offset-2 hover:underline"
          >
            {t.aktion.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => toastSchliessen(t.id)}
        aria-label="Meldung schließen"
        className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
