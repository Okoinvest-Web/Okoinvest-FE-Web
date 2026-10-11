"use client";

// src/components/PartnerWidgets/EmbedCode.js – Einbettungs-Code zum Kopieren (Welle 4, Paket WIDGETS).
// Zeigt das iframe-Snippet eines Partner-Widgets und kopiert es per Knopf in die Zwischenablage.
// Ohne Clipboard-Zugriff (ältere Browser, eingeschränkte Kontexte) bleibt der Text markier- und
// damit von Hand kopierbar – der Knopf meldet dann einen Hinweis statt zu scheitern.

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function EmbedCode({ code, label = "Code kopieren", kopiert = "Kopiert", fehler = "Bitte den Code markieren und von Hand kopieren" }) {
  const [status, setStatus] = useState("");

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("ok");
    } catch {
      setStatus("fehler");
    }
    setTimeout(() => setStatus(""), 2500);
  }

  return (
    <div className="rounded-2xl bg-ink-900 p-4 ring-1 ring-ink-200/20">
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-[12.5px] leading-relaxed text-ink-100">
        <code>{code}</code>
      </pre>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={kopieren}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3.5 py-1.5 text-[13.5px] font-semibold text-ink-900 transition-colors hover:bg-ov-100"
        >
          {status === "ok" ? <Check aria-hidden="true" className="h-4 w-4 text-ov-600" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
          {status === "ok" ? kopiert : label}
        </button>
        <span aria-live="polite" className="text-[12.5px] text-ink-300">
          {status === "fehler" ? fehler : ""}
        </span>
      </div>
    </div>
  );
}
