// src/components/Portal/Entwicklung/teile.js – kleine Bausteine der Projektentwicklung (Server- und Client-tauglich, ohne Hooks)

import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";
import { ENTWICKLUNG_STATUS, MEILENSTEIN_STATUS, PACHT_STATUS } from "@/lib/plattform/entwicklung";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

export const mwpText = (x) => (Number.isFinite(Number(x)) ? `${fmt(Number(x), Number(x) < 10 ? 1 : 0)} MWp` : "–");
export const eurKurz = (x) => {
  const n = Number(x) || 0;
  if (Math.abs(n) >= 1e6) return `${fmt(n / 1e6, 1)} Mio. €`;
  if (Math.abs(n) >= 1e3) return `${fmt(n / 1e3, 0)} Tsd. €`;
  return fmtEur(n);
};
export const datumKurz = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }) : "–");
export const monatText = (ym) => {
  if (!ym) return "–";
  const [j, m] = String(ym).split("-");
  return m ? `${m}/${j}` : j;
};

export function ProjektStatusBadge({ status }) {
  const s = ENTWICKLUNG_STATUS[status] || { label: status, ton: "neutral" };
  return <Badge ton={s.ton}>{s.label}</Badge>;
}

export function PhaseBadge({ label, phase }) {
  return <Badge ton={phase ? (["rtb", "cod"].includes(phase) ? "ok" : "info") : "neutral"}>{label || "Akquise"}</Badge>;
}

export function MeilensteinBadge({ m }) {
  if (m.ueberfaellig) return <Badge className="bg-danger-50 text-danger-800 ring-danger-200">Überfällig {m.verzugTage ? `(${m.verzugTage} T.)` : ""}</Badge>;
  const s = MEILENSTEIN_STATUS[m.status] || { label: m.status, ton: "neutral" };
  return <Badge ton={s.ton}>{s.label}</Badge>;
}

export function PachtBadge({ status }) {
  const s = PACHT_STATUS[status] || { label: status, ton: "neutral" };
  return <Badge ton={s.ton}>{s.label}</Badge>;
}

export function RisikoBadge({ score, ampel }) {
  const klasse = ampel?.id === "hoch" ? "bg-danger-50 text-danger-800 ring-danger-200" : ampel?.id === "mittel" ? "bg-sun-300/25 text-ink-900 ring-sun-400/50" : "bg-ov-50 text-ov-800 ring-ov-200";
  return <Badge className={klasse}><span className="ov-num">{score}</span> · {ampel?.label || ""}</Badge>;
}

/** Fortschrittsbalken 0–100 % */
export function Fortschritt({ wert, klein = false, label = "Fortschritt" }) {
  const w = Math.max(0, Math.min(100, Number(wert) || 0));
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className={cn("relative w-full overflow-hidden rounded-full bg-ink-100", klein ? "h-1.5" : "h-2.5")} role="progressbar" aria-valuenow={w} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-ov-500" style={{ width: `${w}%` }} />
      </div>
      <span className="ov-num shrink-0 text-[12.5px] font-semibold text-ink-700">{w} %</span>
    </div>
  );
}

/** Reiter als Links (?reiter=), mobil horizontal scrollbar */
export function Reiter({ basis, aktiv, reiter = [] }) {
  return (
    <nav aria-label="Bereiche des Projekts" className="-mx-4 mb-6 overflow-x-auto px-4 ov-no-scrollbar md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1.5 rounded-full bg-white p-1.5 ring-1 ring-ink-200/70 lg:min-w-0 lg:flex-wrap">
        {reiter.map((t) => {
          const an = t.id === aktiv;
          return (
            <li key={t.id}>
              <Link href={t.id === "uebersicht" ? basis : `${basis}?reiter=${t.id}`} aria-current={an ? "page" : undefined} scroll={false} className={cn("inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors", an ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-ink-50")}>
                {t.label}
                {t.zaehler ? <span className={cn("ov-num rounded-full px-1.5 text-[11.5px] font-bold", an ? "bg-white/20 text-white" : t.warn ? "bg-danger-600 text-white" : "bg-ink-100 text-ink-700")}>{t.zaehler}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Kompakte Kennzahl-Kachel (wie Anlagen) */
export function Wert({ label, wert, hinweis, ton }) {
  return (
    <div className={cn("min-w-0 rounded-3xl p-4 md:p-5", ton === "dunkel" ? "bg-navy-950 text-white ring-1 ring-navy-800" : ton === "warn" ? "bg-danger-50 ring-1 ring-danger-200" : "bg-white ring-1 ring-ink-200/70")}>
      <p className={cn("text-[12.5px] font-medium", ton === "dunkel" ? "text-white/70" : "text-ink-500")}>{label}</p>
      <p className={cn("ov-num mt-2 font-display text-[22px] font-extrabold leading-none tracking-tight md:text-[26px]", ton === "dunkel" ? "text-white" : ton === "warn" ? "text-danger-800" : "text-ink-900")}>{wert}</p>
      {hinweis && <p className={cn("mt-1.5 text-[12px]", ton === "dunkel" ? "text-white/60" : "text-ink-500")}>{hinweis}</p>}
    </div>
  );
}
