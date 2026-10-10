// Neutralitäts-Badges eines Inserats (Welle 3, Paket B10). Ohne Hooks – in Server- und Client-Komponenten
// nutzbar (Text über <T>). Kriterien: src/lib/boerse/neutralitaet.js; ohne ausdrückliche Angabe des
// Backends erscheint kein Badge. Erklärung der Kriterien: /projektboerse/neutralitaet#badges.

import { Building2, FileCheck2, Handshake, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";
import T from "@/components/Sprache/T";
import { BADGES, badgesFuer } from "@/lib/boerse/neutralitaet";

const ICON = { gruppenprojekt: Building2, fremdinserat: Handshake, gruppeBeteiligt: Users, vorgeprueft: FileCheck2 };

const TON = {
  gruppe: "bg-ov-600 text-white ring-ov-600",
  neutral: "bg-white/95 text-ink-800 ring-ink-200/70",
  hinweis: "bg-navy-900 text-white ring-navy-900",
  pruefung: "bg-ov-50 text-ov-800 ring-ov-200",
};

/** Ein Badge nach ID (auch für die Erklärseite, ohne Projekt). */
export function Badge({ id, className }) {
  const b = BADGES[id];
  if (!b) return null;
  const Icon = ICON[id];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold shadow-sm ring-1 ring-inset", TON[b.ton], className)}>
      {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
      <T de={b.de.label} en={b.en.label} />
    </span>
  );
}

/**
 * Alle zutreffenden Badges eines Projekts; nichts, wenn keines zutrifft.
 * ohneHuelle: Badges direkt in eine bestehende Flex-Zeile setzen (z. B. Exposé) – ohne eigene Hülle,
 * denn cn() führt Klassen nicht zusammen („flex“ und „contents“ würden kollidieren).
 */
export default function BoerseBadges({ projekt, className, ohneHuelle = false }) {
  const ids = badgesFuer(projekt);
  if (!ids.length) return null;
  if (ohneHuelle) return ids.map((id) => <Badge key={id} id={id} className={className} />);
  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {ids.map((id) => <Badge key={id} id={id} />)}
    </span>
  );
}
