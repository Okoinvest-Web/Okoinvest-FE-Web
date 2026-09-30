"use client";

import { Printer } from "lucide-react";

export default function DruckKnopf() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 print:hidden">
      <Printer aria-hidden="true" className="h-4 w-4" />
      Drucken / PDF
    </button>
  );
}
