// src/components/Portal/Energie/teile.js – kleine Bausteine der Energiebeschaffung (ohne Hooks)

import Link from "next/link";
import { FileDown } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";
import { EMPFEHLUNGEN } from "@/lib/plattform/energie/beschaffung";
import { AUSSCHREIBUNG_STATUS } from "@/lib/plattform/energie/ausschreibung";

export const fmt = (x, s = 0) => (Number.isFinite(x) ? x.toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s }) : "–");
export const ct = (x, s = 2) => (Number.isFinite(x) ? `${fmt(x, s)} ct/kWh` : "–");
export const eurMwh = (x) => (Number.isFinite(x) ? `${fmt(x, 2)} €/MWh` : "–");
export const eur = (x) => (Number.isFinite(x) ? `${fmt(Math.round(x))} €` : "–");
export const mwh = (kwh) => (Number.isFinite(kwh) ? `${fmt(kwh / 1000, kwh < 100000 ? 1 : 0)} MWh` : "–");
export const prozent = (x, s = 1) => (Number.isFinite(x) ? `${fmt(x * 100, s)} %` : "–");
export const datum = (iso) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("de-DE", { timeZone: "Europe/Vienna" }) : "–");
export const datumZeit = (iso) => (iso ? new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Vienna", dateStyle: "short", timeStyle: "short" }) : "–");
export const monatText = (m) => (m ? `${m.slice(5)}/${m.slice(2, 4)}` : "–");

export function EmpfehlungBadge({ empfehlung, label }) {
  const e = EMPFEHLUNGEN[empfehlung];
  if (!e) return <Badge>–</Badge>;
  return <Badge ton={e.ton}>{label || e.label}</Badge>;
}

export function StatusBadgeEnergie({ status }) {
  const s = AUSSCHREIBUNG_STATUS[status];
  return <Badge ton={s?.ton || "neutral"}>{s?.label || status}</Badge>;
}

export function FristBadge({ tage }) {
  if (tage === null || tage === undefined) return <span className="text-ink-400">–</span>;
  const ton = tage < 0 ? "dunkel" : tage <= 30 ? "warn" : tage <= 90 ? "info" : "neutral";
  return <Badge ton={ton}>{tage < 0 ? `${-tage} Tage verstrichen` : `${tage} Tage`}</Badge>;
}

export function PdfLink({ href, children }) {
  return (
    <a href={href} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
      <FileDown aria-hidden="true" className="h-4 w-4" />
      {children}
    </a>
  );
}

/** Navigation des Handelsdesks */
export function DeskNavigation({ aktiv }) {
  const eintraege = [
    ["desk", "/portal/admin/energie", "Handelsdesk"],
    ["kunden", "/portal/admin/energie/kunden", "Kunden & Wechselanalyse"],
    ["ausschreibungen", "/portal/admin/energie/ausschreibungen", "Ausschreibungen"],
    ["lieferanten", "/portal/admin/energie/lieferanten", "Lieferanten"],
  ];
  return (
    <nav aria-label="Energiebeschaffung" className="-mx-4 mb-6 overflow-x-auto px-4 ov-no-scrollbar md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1.5 rounded-full bg-white p-1.5 ring-1 ring-ink-200/70 md:min-w-0 md:flex-wrap">
        {eintraege.map(([id, href, label]) => (
          <li key={id}>
            <Link href={href} aria-current={aktiv === id ? "page" : undefined} className={cn("inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors", aktiv === id ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-ink-50")}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Hinweisbox (Demo-Werte, Rechtliches) */
export function Hinweis({ children, ton = "info" }) {
  return <div className={cn("rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ring-1", ton === "warn" ? "bg-sun-300/20 text-ink-900 ring-sun-400/40" : "bg-navy-50 text-navy-900 ring-navy-100")}>{children}</div>;
}

/** Einfache responsive Tabelle */
export function Tabelle({ kopf = [], zeilen = [], rechts = [], leer = "Keine Einträge." }) {
  if (!zeilen.length) return <p className="text-[14px] text-ink-500">{leer}</p>;
  return (
    <div className="-mx-5 overflow-x-auto md:mx-0">
      <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b border-ink-100 text-left text-[12px] uppercase tracking-wide text-ink-500">
            {kopf.map((k, i) => <th key={k} scope="col" className={cn("whitespace-nowrap px-3 py-2 font-semibold first:pl-5 last:pr-5 md:first:pl-3 md:last:pr-3", rechts.includes(i) && "text-right")}>{k}</th>)}
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z, j) => (
            <tr key={j} className="border-b border-ink-100 last:border-0">
              {z.map((w, i) => <td key={i} className={cn("whitespace-nowrap px-3 py-2.5 align-top text-ink-800 first:pl-5 last:pr-5 md:first:pl-3 md:last:pr-3", rechts.includes(i) && "ov-num text-right")}>{w}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
