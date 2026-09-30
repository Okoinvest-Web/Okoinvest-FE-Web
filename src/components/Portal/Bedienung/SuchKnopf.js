"use client";

// Suchknopf in der Kopfzeile: öffnet die Befehlspalette (zeigt Strg/⌘ + K an).
// Unter md übernimmt „Suche“ in der Bottom-Navigation (Platz in der Kopfzeile).

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { paletteOeffnen } from "./speicher";

export default function SuchKnopf() {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)), []);
  return (
    <button
      type="button"
      onClick={paletteOeffnen}
      aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
      aria-label="Suchen und Befehle (Strg + K)"
      className="hidden h-10 items-center gap-2 rounded-full text-ink-600 hover:bg-ink-100 md:flex md:w-[260px] md:bg-sand-50 md:px-3.5 md:text-[13.5px] md:ring-1 md:ring-inset md:ring-ink-200 md:hover:ring-ink-300 lg:w-[300px]"
    >
      <Search aria-hidden="true" className="h-[18px] w-[18px] shrink-0 md:h-4 md:w-4" />
      <span className="hidden flex-1 text-left text-ink-500 md:block">Suchen oder springen …</span>
      <kbd aria-hidden="true" className="hidden rounded-md bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-500 ring-1 ring-inset ring-ink-200 md:block">{mac ? "⌘ K" : "Strg K"}</kbd>
    </button>
  );
}
