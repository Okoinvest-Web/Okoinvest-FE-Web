// Bausteine der EDA-Seiten (WP2) – Server- und Client-tauglich, ohne Hooks. Nur Design-Tokens (ov-*, navy-*, ink-*, sun-*).

import Link from "next/link";
import { cn } from "@/components/ui/cn";

const AMPEL = {
  rot: { punkt: "bg-red-500", text: "text-red-800", label: "Handeln" },
  gelb: { punkt: "bg-sun-500", text: "text-ink-900", label: "Beobachten" },
  gruen: { punkt: "bg-ov-500", text: "text-ov-800", label: "Läuft" },
  grau: { punkt: "bg-ink-300", text: "text-ink-500", label: "Erledigt" },
};

/** Ampelpunkt mit Text (Fristen-Ampel je Prozess) */
export function Ampel({ ampel, kompakt = false }) {
  const a = AMPEL[ampel?.ampel] || AMPEL.grau;
  return (
    <span className={cn("inline-flex items-center gap-2 text-[13px] font-medium", a.text)}>
      <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-full", a.punkt)} />
      <span className={kompakt ? "sr-only" : ""}>{ampel?.text || a.label}</span>
    </span>
  );
}

/** Unternavigation innerhalb des EDA-Reiters */
export function EdaUnterNav({ gemeinschaftId, aktiv }) {
  const basis = `/portal/admin/eg/${gemeinschaftId}/eda`;
  const punkte = [
    { id: "uebersicht", label: "Prozesse & Fristen", href: basis },
    { id: "journal", label: "Nachrichtenjournal", href: `${basis}/journal` },
    { id: "reklamation", label: "Datenqualität & Reklamation", href: `${basis}/reklamation` },
  ];
  return (
    <nav aria-label="EDA-Bereiche" className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1 px-1">
        {punkte.map((p) => (
          <li key={p.id}>
            <Link href={p.href} aria-current={p.id === aktiv ? "page" : undefined} className={cn("inline-flex rounded-xl px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset transition", p.id === aktiv ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50")}>
              {p.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Zählpunktnummer lesbar (AT 003000 04910 … letzte 6) */
export function Zp({ nr }) {
  const s = String(nr || "");
  if (s.length !== 33) return <span className="font-mono text-[12.5px]">{s || "–"}</span>;
  return (
    <span className="font-mono text-[12.5px] text-ink-700" title={s}>
      {s.slice(0, 2)} {s.slice(2, 8)} {s.slice(8, 13)} …{s.slice(-6)}
    </span>
  );
}

export const zeit = (iso) => (iso ? new Date(iso).toLocaleString("de-AT", { timeZone: "Europe/Vienna", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–");
export const tag = (t) => (t ? String(t).slice(0, 10).split("-").reverse().join(".") : "–");
export const kurzHash = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "–");
