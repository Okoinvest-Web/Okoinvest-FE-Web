"use client";

// Gemeinsame Client-Bausteine für Mitgliederbereich, Backoffice Genossenschaft/Energiegemeinschaften und Gemeindecockpit:
// Aktion mit Ladezustand, Fehler- und Erfolgsmeldung (JSON + Origin über senden()), Download-Link für PDFs, kleines Formular-Klappfeld.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileDown } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";

/** Aktion ausführen und Seite neu laden. Liefert { laeuft, fehler, ok, ausfuehren(body, erfolgText) } */
export function useAktion(url, { methode = "POST" } = {}) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  async function ausfuehren(body, erfolgText = "Gespeichert.") {
    setLaeuft(true);
    setFehler("");
    setOk("");
    try {
      const r = await senden(url, { method: methode, body });
      setOk(erfolgText);
      router.refresh();
      return r;
    } catch (e) {
      setFehler(e.message);
      return null;
    } finally {
      setLaeuft(false);
    }
  }
  return { laeuft, fehler, ok, ausfuehren, setFehler, setOk };
}

const KNOPF = {
  primary: "bg-ov-600 text-white hover:bg-ov-700",
  secondary: "bg-white text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50",
  gefahr: "bg-white text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50",
  navy: "bg-navy-700 text-white hover:bg-navy-800",
};

/** Kompakter Knopf für Tabellen und Karten */
export function Knopf({ variante = "secondary", className, children, ...rest }) {
  return (
    <button type="button" className={cn("inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13.5px] font-semibold transition-colors disabled:opacity-50", KNOPF[variante], className)} {...rest}>
      {children}
    </button>
  );
}

/** Download-Link für ein PDF (kein Client-Routing auf /api) */
export function PdfLink({ href, children, className }) {
  return (
    <a href={href} className={cn("inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3.5 text-[13.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50", className)}>
      <FileDown aria-hidden="true" className="h-4 w-4 text-ov-700" />
      {children}
    </a>
  );
}

/** Aufklappbarer Bereich für seltenere Formulare */
export function Klappe({ titel, children, offen: start = false, className }) {
  const [offen, setOffen] = useState(start);
  return (
    <div className={cn("rounded-2xl ring-1 ring-inset ring-ink-200/80", className)}>
      <button type="button" aria-expanded={offen} onClick={() => setOffen(!offen)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[14px] font-semibold text-ink-900">
        {titel}
        <ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 text-ink-500 transition-transform", offen && "rotate-180")} />
      </button>
      {offen && <div className="border-t border-ink-100 px-4 py-4">{children}</div>}
    </div>
  );
}

/** Meldungen unter einem Formular */
export function Meldung({ fehler, ok }) {
  if (fehler) return <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800 ring-1 ring-red-200">{fehler}</p>;
  if (ok) return <p role="status" className="rounded-xl bg-ov-50 px-4 py-3 text-[14px] text-ov-900 ring-1 ring-ov-200">{ok}</p>;
  return null;
}
