"use client";

// Gemeinsame Bausteine des Assistenten: Kennzeichnung, Text mit sicheren internen Links und
// Quellen-Kennungen, Quellenliste, Kopieren, Datenschutzhinweis, Drawer.
// Design-System: ov-*, navy-*, ink-*, sand-* – keine neuen Farben.

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, ShieldCheck, Sparkles, X } from "lucide-react";
import { cn } from "@/components/ui/cn";

/** Kennzeichnung jedes Ergebnisses */
export function KiKennzeichnung({ modus, hinweis, className }) {
  if (!modus) return null;
  const ki = modus === "ki";
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", ki ? "bg-ov-50 text-ov-800 ring-ov-200" : "bg-ink-100 text-ink-700 ring-ink-200")}>
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
        {ki ? "KI-Entwurf – bitte prüfen" : "Vorschlag – bitte prüfen"}
      </p>
      {hinweis && <p className="text-[12.5px] leading-snug text-ink-500">{hinweis}</p>}
    </div>
  );
}

/** Nur interne Pfade werden zu Links (kein javascript:, keine fremden Domains) */
function sichererPfad(href) {
  const h = String(href || "").trim();
  return /^\/(?!\/|\\)[A-Za-z0-9\-._~/#?=&%]*$/.test(h) ? h : null;
}

function inline(text, keyBase, zitiert) {
  const teile = [];
  const re = /\[([^\]]{1,120})\]\(([^)\s]{1,200})\)|\[(Q\d{1,3})\]|\*\*([^*]{1,200})\*\*/g;
  let letzte = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > letzte) teile.push(text.slice(letzte, m.index));
    if (m[1]) {
      const href = sichererPfad(m[2]);
      teile.push(
        href ? (
          <Link key={`${keyBase}-${i++}`} href={href} className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:text-ov-800">
            {m[1]}
          </Link>
        ) : (
          m[1]
        )
      );
    } else if (m[3]) {
      zitiert?.add(m[3]);
      teile.push(
        <a key={`${keyBase}-${i++}`} href={`#ki-quelle-${m[3]}`} className="mx-0.5 inline-flex h-[18px] items-center rounded-md bg-navy-50 px-1.5 align-[1px] text-[11px] font-bold text-navy-700 ring-1 ring-inset ring-navy-100 hover:bg-navy-100">
          {m[3]}
        </a>
      );
    } else if (m[4]) teile.push(<strong key={`${keyBase}-${i++}`}>{m[4]}</strong>);
    letzte = re.lastIndex;
  }
  if (letzte < text.length) teile.push(text.slice(letzte));
  return teile;
}

/** Text des Assistenten: Absätze, Aufzählungen, interne Links, [Q1]-Kennungen */
export function KiText({ text, laeuft, className }) {
  const bloecke = String(text || "").split(/\n{2,}/);
  return (
    <div className={cn("space-y-3 break-words text-[14.5px] leading-relaxed text-ink-800", className)} aria-live="polite" aria-busy={laeuft || undefined}>
      {bloecke.map((b, bi) => {
        const zeilen = b.split("\n");
        const liste = zeilen.filter((z) => /^\s*[-*•]\s+/.test(z));
        if (liste.length && liste.length >= zeilen.filter((z) => z.trim()).length - 1) {
          const kopf = zeilen.find((z) => z.trim() && !/^\s*[-*•]\s+/.test(z));
          return (
            <div key={bi}>
              {kopf && <p>{inline(kopf, `k${bi}`)}</p>}
              <ul className="mt-1 space-y-1 pl-1">
                {liste.map((z, zi) => (
                  <li key={zi} className="flex gap-2">
                    <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                    <span className="min-w-0">{inline(z.replace(/^\s*[-*•]\s+/, ""), `l${bi}-${zi}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return (
          <p key={bi} className="whitespace-pre-line">
            {inline(b, `p${bi}`)}
          </p>
        );
      })}
      {laeuft && <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-ov-500 align-middle" />}
    </div>
  );
}

/** Quellenliste: [{ id?, titel, text?, href? }] */
export function KiQuellen({ quellen = [], titel = "Quellen", zitierte }) {
  if (!quellen.length) return null;
  return (
    <div className="rounded-2xl bg-sand-50 p-3.5 ring-1 ring-inset ring-ink-200/70">
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-500">{titel}</p>
      <ul className="mt-2 space-y-1.5">
        {quellen.map((q, i) => (
          <li key={q.id || q.href || i} id={q.id ? `ki-quelle-${q.id}` : undefined} className={cn("text-[13px] leading-snug text-ink-700", zitierte && q.id && !zitierte.has(q.id) && "opacity-60")}>
            {q.id && <span className="mr-1.5 inline-flex h-[18px] items-center rounded-md bg-white px-1.5 text-[11px] font-bold text-navy-700 ring-1 ring-inset ring-navy-100">{q.id}</span>}
            {q.href && sichererPfad(q.href) ? (
              <Link href={q.href} className="font-semibold text-ov-700 hover:text-ov-800">
                {q.titel}
              </Link>
            ) : (
              <span className="font-medium">{q.titel}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KopierenKnopf({ text, label = "Kopieren", className }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(text || ""));
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        } catch {
          /* Zwischenablage nicht verfügbar */
        }
      }}
      className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50", className)}
    >
      {ok ? <Check aria-hidden="true" className="h-4 w-4 text-ov-600" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
      {ok ? "Kopiert" : label}
    </button>
  );
}

export function KiKnopf({ children, onClick, disabled, variante = "hell", className, type = "button", icon: Icon = Sparkles, ...rest }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors disabled:opacity-50",
        variante === "gruen" ? "bg-ov-600 text-white hover:bg-ov-700" : variante === "navy" ? "bg-navy-700 text-white hover:bg-navy-800" : "bg-white text-ov-800 ring-1 ring-inset ring-ov-200 hover:bg-ov-50",
        className
      )}
      {...rest}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      {children}
    </button>
  );
}

/** Datenschutzhinweis – je nach Modus */
export function KiDatenschutz({ aktiv, className }) {
  return (
    <p className={cn("flex gap-2 text-[12px] leading-snug text-ink-500", className)}>
      <ShieldCheck aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0 text-ink-400" />
      <span>
        {aktiv
          ? "Für diese Aufgabe werden nur die hier nötigen, für Sie freigegebenen Angaben an den KI-Dienst Claude (Anthropic) übermittelt. Gespeichert wird nur, dass Sie den Assistenten genutzt haben – nicht Ihre Eingaben oder die Antworten."
          : "Regelbasierte Vorschläge – Ihre Angaben verlassen die Plattform nicht. Gespeichert wird nur, dass Sie den Assistenten genutzt haben."}{" "}
        <Link href="/datenschutz" className="underline underline-offset-2 hover:text-ink-700">
          Datenschutz
        </Link>
      </span>
    </p>
  );
}

export function KiLaedt({ text = "Wird erstellt …" }) {
  return (
    <div className="space-y-2.5" role="status" aria-label={text}>
      <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink-600">
        <Sparkles aria-hidden="true" className="h-4 w-4 animate-pulse text-ov-600" />
        {text}
      </p>
      {[92, 78, 85].map((w) => (
        <span key={w} className="block h-3 animate-pulse rounded-full bg-ink-100" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

/**
 * Drawer (rechts, mobil als Vollbild). Esc schließt, Fokus springt in den Drawer und zurück.
 */
export function KiDrawer({ offen, onSchliessen, titel, untertitel, children, fuss }) {
  const id = useId();
  const ref = useRef(null);
  const vorher = useRef(null);
  useEffect(() => {
    if (!offen) return;
    vorher.current = document.activeElement;
    const t = setTimeout(() => ref.current?.querySelector("[data-autofocus], button, textarea, input")?.focus(), 30);
    const taste = (e) => {
      if (e.key === "Escape") onSchliessen();
      if (e.key === "Tab" && ref.current) {
        const f = [...ref.current.querySelectorAll("a[href], button:not([disabled]), textarea, input, select")];
        if (!f.length) return;
        const [erster, letzter] = [f[0], f[f.length - 1]];
        if (e.shiftKey && document.activeElement === erster) {
          e.preventDefault();
          letzter.focus();
        } else if (!e.shiftKey && document.activeElement === letzter) {
          e.preventDefault();
          erster.focus();
        }
      }
    };
    document.addEventListener("keydown", taste);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", taste);
      document.body.style.overflow = overflow;
      vorher.current?.focus?.();
    };
  }, [offen, onSchliessen]);

  return (
    <div className={cn("fixed inset-0 z-[60]", offen ? "" : "pointer-events-none")} aria-hidden={!offen}>
      <div className={cn("absolute inset-0 bg-navy-950/40 backdrop-blur-[2px] transition-opacity duration-200", offen ? "opacity-100" : "opacity-0")} onClick={onSchliessen} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titel`}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-[0_0_60px_-15px_rgba(3,18,43,0.45)] transition-transform duration-300 ease-out sm:max-w-[500px] sm:rounded-l-[2rem]",
          offen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ov-700">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Assistent
            </p>
            <h2 id={`${id}-titel`} className="mt-0.5 font-display text-[19px] font-bold leading-tight text-ink-900">
              {titel}
            </h2>
            {untertitel && <p className="mt-0.5 text-[13px] text-ink-500">{untertitel}</p>}
          </div>
          <button type="button" onClick={onSchliessen} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-800" aria-label="Assistent schließen">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{offen && children}</div>
        {fuss && <div className="border-t border-ink-100 px-5 py-3.5 sm:px-6">{fuss}</div>}
      </div>
    </div>
  );
}

export function KiFehler({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800 ring-1 ring-red-200">
      {children}
    </p>
  );
}
