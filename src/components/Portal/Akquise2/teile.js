"use client";

// src/components/Portal/Akquise2/teile.js – kleine gemeinsame Bausteine der Akquise-Kampagnen und des Gemeinde-Screenings

import { cn } from "@/components/ui/cn";

export const knopf = {
  primaer: "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-ov-600 px-4 text-[13.5px] font-semibold text-white hover:bg-ov-700 disabled:opacity-60",
  navy: "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-navy-700 px-4 text-[13.5px] font-semibold text-white hover:bg-navy-800 disabled:opacity-60",
  sekundaer: "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 disabled:opacity-60",
  klein: "inline-flex h-8 items-center justify-center gap-1 rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 disabled:opacity-60",
  gefahr: "inline-flex h-8 items-center justify-center gap-1 rounded-full bg-white px-3 text-[12.5px] font-semibold text-danger-700 ring-1 ring-inset ring-danger-200 hover:bg-danger-50 disabled:opacity-60",
};

export const FARBE = { gruen: "#558227", gelb: "#f5a70f", rot: "#b42318" };

export function Ampel({ ampel, wert }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-bold text-ink-900">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: FARBE[ampel] || "#97a0b0" }} aria-hidden="true" />
      <span className="ov-num">{wert}</span>
    </span>
  );
}

export function Mini({ label, wert, hinweis, className }) {
  return (
    <div className={cn("min-w-0 rounded-2xl bg-sand-50 px-3.5 py-3 ring-1 ring-ink-100", className)}>
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="ov-num mt-1 font-display text-[20px] font-extrabold leading-none text-ink-900">{wert}</p>
      {hinweis && <p className="mt-1 text-[11.5px] text-ink-500">{hinweis}</p>}
    </div>
  );
}

export async function holen(url) {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw Object.assign(new Error(j.error || `Fehler ${res.status}`), { status: res.status });
  return j;
}

export const eur = (x, waehrung = "EUR") => (x == null ? "–" : `${Number(x).toLocaleString("de-DE", { maximumFractionDigits: 0 })} ${waehrung === "CHF" ? "CHF" : "€"}`);
export const zahl = (x, st = 0) => (x == null ? "–" : Number(x).toLocaleString("de-DE", { minimumFractionDigits: st, maximumFractionDigits: st }));
export const datum = (s) => (s ? new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Vienna" }) : "–");
