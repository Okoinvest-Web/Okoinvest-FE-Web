// Sprungnavigation der Startseite (UX-Audit P2-7): kompakte Chips direkt unter dem Hero.
// Mobil klebt die Leiste beim Scrollen unter dem Seitenkopf (68 px), ab md steht sie normal im Fluss.
// Server-Komponente, reine Anker-Links – funktioniert ohne JavaScript.

import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const TEXTE = {
  de: {
    aria: "Auf dieser Seite",
    ziele: [
      { id: "loesungen", label: "Lösungen" },
      { id: "boerse", label: "Börse" },
      { id: "energie", label: "Energie" },
      { id: "tools", label: "Tools" },
      { id: "faq", label: "FAQ" },
    ],
  },
  en: { aria: "On this page", ziele: [{ label: "Solutions" }, { label: "Exchange" }, { label: "Energy" }, { label: "Tools" }, { label: "FAQ" }] },
};

export default function Sprungnavigation() {
  const t = uebersetze(TEXTE, spracheDerAnfrage());
  const ZIELE = t.ziele;
  return (
    <nav
      aria-label={t.aria}
      className="sticky top-[68px] z-30 border-b border-ink-200/70 bg-white/90 backdrop-blur-xl backdrop-saturate-150 md:static md:bg-white md:backdrop-blur-none"
    >
      <ul className="ov-container flex gap-2 overflow-x-auto py-2.5 [scrollbar-width:none] md:justify-center md:py-3">
        {ZIELE.map((z) => (
          <li key={z.id} className="shrink-0">
            <a
              href={`#${z.id}`}
              className="flex min-h-10 items-center rounded-full bg-sand-50 px-4 text-[14px] font-semibold text-ink-800 ring-1 ring-ink-200/70 transition-colors hover:bg-ov-50 hover:text-ov-800 hover:ring-ov-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ov-500"
            >
              {z.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
