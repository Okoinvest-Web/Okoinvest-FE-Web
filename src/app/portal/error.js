"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";

export default function PortalFehler({ error, reset }) {
  const konfig = /nicht konfiguriert/i.test(error?.message || "");
  return (
    <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center ring-1 ring-ink-200/70">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-300/30 text-ink-900">
        <AlertTriangle aria-hidden="true" className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-[22px] font-bold text-ink-900">{konfig ? "Portal nicht verfügbar" : "Da ist etwas schiefgelaufen"}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
        {konfig ? error.message : "Die Seite konnte nicht geladen werden. Bitte versuchen Sie es erneut – Ihre Daten sind sicher gespeichert."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={() => reset()} icon={RotateCcw}>Erneut versuchen</Button>
        <Button href="/portal" variant="secondary">Zur Übersicht</Button>
      </div>
    </div>
  );
}
