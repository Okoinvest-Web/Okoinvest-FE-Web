"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { herkunft } from "@/lib/herkunft";

/**
 * Einheitliches Anfrageformular aller Zielgruppen.
 *
 * Schickt an POST /api/anfrage → Vorgang im Backoffice. Wer sich später
 * mit derselben E-Mail registriert, sieht den Vorgang samt Status im Portal.
 *
 * Props:
 *  typ        flaeche | agri | investor | projekt | reststrom | energiegemeinschaft | genossenschaft | kommune | carport | speicher | kontakt
 *  daten      fachliche Zusatzdaten (z. B. Ergebnis eines Rechners) – werden mitgeschickt
 *  felder     zusätzliche Kontaktfelder: firma, telefon, plz, ort, land, nachricht
 *  titel/text/button/erfolgText  Beschriftungen
 *  dunkel     für Navy-Flächen
 */
export default function AnfrageFormular({
  typ = "kontakt",
  daten = {},
  felder = ["telefon", "nachricht"],
  titel,
  text,
  button = "Anfrage senden",
  erfolgText = "Danke! Ihre Anfrage ist eingegangen. Wir melden uns in der Regel innerhalb von zwei Werktagen.",
  rolle,
  className,
  dunkel = false,
}) {
  const id = useId();
  const [status, setStatus] = useState("offen"); // offen | sendet | fertig | fehler
  const [fehler, setFehler] = useState("");
  const [ergebnis, setErgebnis] = useState(null);

  async function absenden(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("website")) return; // Honeypot
    const kontakt = {};
    for (const k of ["anrede", "vorname", "nachname", "firma", "email", "telefon", "plz", "ort", "land"]) {
      const v = fd.get(k);
      if (v) kontakt[k] = String(v).trim();
    }
    const nachricht = fd.get("nachricht");
    setStatus("sendet");
    setFehler("");
    try {
      const res = await fetch("/api/anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typ,
          kontakt,
          daten: { ...daten, ...(nachricht ? { nachricht: String(nachricht) } : {}) },
          einwilligung: fd.get("einwilligung") === "on",
          herkunft: safeHerkunft(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Senden fehlgeschlagen");
      setErgebnis(json);
      setStatus("fertig");
    } catch (err) {
      setFehler(err.message || "Senden fehlgeschlagen. Bitte versuchen Sie es erneut.");
      setStatus("fehler");
    }
  }

  const feld = cn(
    "block h-12 w-full rounded-xl px-4 text-[15px] outline-none transition-shadow placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-ov-500",
    dunkel ? "bg-white/[0.07] text-white ring-1 ring-white/15 placeholder:text-white/40" : "bg-white text-ink-900 ring-1 ring-ink-200"
  );
  const label = cn("mb-1.5 block text-[13.5px] font-semibold", dunkel ? "text-white/85" : "text-ink-700");

  if (status === "fertig") {
    const registrieren = `/registrieren?${new URLSearchParams({ rolle: rolle || rolleFuerTyp(typ), vorgang: ergebnis?.id || "" })}`;
    return (
      <div role="status" className={cn("rounded-3xl p-7 md:p-9", dunkel ? "bg-white/[0.06] ring-1 ring-white/10" : "bg-ov-50 ring-1 ring-ov-200", className)}>
        <CheckCircle2 aria-hidden="true" className="h-9 w-9 text-ov-500" />
        <p className={cn("mt-4 font-display text-[22px] font-bold", dunkel ? "text-white" : "text-ink-900")}>Anfrage eingegangen</p>
        <p className={cn("mt-2 text-[15.5px] leading-relaxed", dunkel ? "text-white/75" : "text-ink-700")}>{erfolgText}</p>
        {ergebnis?.id && (
          <p className={cn("mt-3 text-[13.5px]", dunkel ? "text-white/55" : "text-ink-500")}>
            Vorgangsnummer <span className="ov-num font-semibold">{ergebnis.id}</span>
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={registrieren} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white hover:bg-ov-700">
            Status im Portal verfolgen <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={absenden} noValidate={false} className={cn("space-y-4", className)} aria-describedby={titel ? `${id}-t` : undefined}>
      {titel && (
        <div>
          <p id={`${id}-t`} className={cn("font-display text-[22px] font-bold", dunkel ? "text-white" : "text-ink-900")}>{titel}</p>
          {text && <p className={cn("mt-1.5 text-[15px] leading-relaxed", dunkel ? "text-white/70" : "text-ink-600")}>{text}</p>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-vn`} className={label}>Vorname *</label>
          <input id={`${id}-vn`} name="vorname" required autoComplete="given-name" className={feld} />
        </div>
        <div>
          <label htmlFor={`${id}-nn`} className={label}>Nachname *</label>
          <input id={`${id}-nn`} name="nachname" required autoComplete="family-name" className={feld} />
        </div>
        {felder.includes("firma") && (
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-fi`} className={label}>Unternehmen / Betrieb</label>
            <input id={`${id}-fi`} name="firma" autoComplete="organization" className={feld} />
          </div>
        )}
        <div className={felder.includes("telefon") ? "" : "sm:col-span-2"}>
          <label htmlFor={`${id}-em`} className={label}>E-Mail *</label>
          <input id={`${id}-em`} name="email" type="email" required autoComplete="email" className={feld} />
        </div>
        {felder.includes("telefon") && (
          <div>
            <label htmlFor={`${id}-te`} className={label}>Telefon</label>
            <input id={`${id}-te`} name="telefon" type="tel" autoComplete="tel" className={feld} />
          </div>
        )}
        {felder.includes("plz") && (
          <div>
            <label htmlFor={`${id}-plz`} className={label}>PLZ</label>
            <input id={`${id}-plz`} name="plz" inputMode="numeric" autoComplete="postal-code" className={feld} />
          </div>
        )}
        {felder.includes("ort") && (
          <div>
            <label htmlFor={`${id}-ort`} className={label}>Ort</label>
            <input id={`${id}-ort`} name="ort" autoComplete="address-level2" className={feld} />
          </div>
        )}
        {felder.includes("land") && (
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-la`} className={label}>Land</label>
            <select id={`${id}-la`} name="land" className={feld} defaultValue="DE">
              <option value="DE">Deutschland</option>
              <option value="AT">Österreich</option>
              <option value="CH">Schweiz</option>
            </select>
          </div>
        )}
        {felder.includes("nachricht") && (
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-na`} className={label}>Ihre Nachricht</label>
            <textarea id={`${id}-na`} name="nachricht" rows={4} className={cn(feld, "h-auto py-3")} />
          </div>
        )}
      </div>
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <label className={cn("flex items-start gap-3 text-[13.5px] leading-relaxed", dunkel ? "text-white/70" : "text-ink-600")}>
        <input type="checkbox" name="einwilligung" required className="mt-1 h-4 w-4 shrink-0 accent-[#558227]" />
        <span>
          Ich bin einverstanden, dass ÖkoInvest meine Angaben zur Bearbeitung der Anfrage verarbeitet. Details in der{" "}
          <Link href="/datenschutz" className="underline underline-offset-2">Datenschutzerklärung</Link>. *
        </span>
      </label>
      {status === "fehler" && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800 ring-1 ring-red-200">{fehler}</p>
      )}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === "sendet"}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 px-7 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700 disabled:opacity-60"
        >
          {status === "sendet" ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
          {button}
          {status !== "sendet" && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
        </button>
        <p className={cn("flex items-center gap-1.5 text-[12.5px]", dunkel ? "text-white/50" : "text-ink-500")}>
          <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Verschlüsselt übertragen · kostenlos & unverbindlich
        </p>
      </div>
    </form>
  );
}

function rolleFuerTyp(typ) {
  return (
    {
      flaeche: "flaeche",
      agri: "landwirt",
      investor: "investor",
      projekt: "anbieter",
      reststrom: "unternehmen",
      carport: "unternehmen",
      speicher: "unternehmen",
      genossenschaft: "mitglied",
      energiegemeinschaft: "mitglied",
      kommune: "unternehmen",
    }[typ] || "flaeche"
  );
}

function safeHerkunft() {
  try {
    return herkunft() || undefined;
  } catch {
    return undefined;
  }
}
