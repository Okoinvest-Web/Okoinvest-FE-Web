"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { herkunft } from "@/lib/herkunft";

/**
 * Englisches Anfrageformular – gleiche Optik und derselbe Endpunkt wie
 * Plattform/AnfrageFormular (POST /api/anfrage, Vertrag: docs/BRIEFING.md).
 *
 * Unterschiede:
 *  - Beschriftungen, Fehlermeldungen und Erfolgstext auf Englisch
 *    (Serverfehler kommen deutsch zurück – wir zeigen eine englische Meldung)
 *  - optional Themenauswahl (`themen`), die den `typ` der Anfrage bestimmt
 *  - Land: DE/AT/CH als Code, sonst Freitext in daten.landSonstiges
 *  - daten.sprache = "en", damit das Backoffice auf Englisch antwortet
 *
 * Props:
 *  typ        Standard-Anfragetyp (kontakt | investor | projekt | …)
 *  themen     [{ typ, label }] – blendet eine Auswahl ein, überschreibt `typ`
 *  daten      Zusatzdaten, werden mitgeschickt
 *  felder     zusätzliche Felder: firma, telefon, land, nachricht
 *  titel/text/button/erfolgText, dunkel, className
 */
export default function ContactForm({
  typ = "kontakt",
  themen,
  daten = {},
  felder = ["firma", "telefon", "land", "nachricht"],
  titel,
  text,
  button = "Send enquiry",
  erfolgText = "Thank you – your enquiry has been received. We usually reply within two working days.",
  dunkel = false,
  className,
}) {
  const id = useId();
  const [status, setStatus] = useState("offen"); // offen | sendet | fertig | fehler
  const [fehler, setFehler] = useState("");
  const [ergebnis, setErgebnis] = useState(null);
  const [land, setLand] = useState("DE");
  const [thema, setThema] = useState(themen?.[0]?.typ || typ);

  async function absenden(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("website")) return; // Honeypot
    const kontakt = {};
    for (const k of ["vorname", "nachname", "firma", "email", "telefon"]) {
      const v = fd.get(k);
      if (v) kontakt[k] = String(v).trim();
    }
    const zusatz = { sprache: "en" };
    if (felder.includes("land")) {
      if (["DE", "AT", "CH"].includes(land)) kontakt.land = land;
      else if (fd.get("landSonstiges")) zusatz.landSonstiges = String(fd.get("landSonstiges")).trim().slice(0, 80);
    }
    const nachricht = fd.get("nachricht");
    if (nachricht) zusatz.nachricht = String(nachricht);

    setStatus("sendet");
    setFehler("");
    try {
      const res = await fetch("/api/anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typ: themen ? thema : typ,
          kontakt,
          daten: { ...daten, ...zusatz },
          einwilligung: fd.get("einwilligung") === "on",
          herkunft: sichereHerkunft(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(res.status === 429 ? "zu-viele" : "fehler");
      setErgebnis(json);
      setStatus("fertig");
    } catch (err) {
      setFehler(
        err.message === "zu-viele"
          ? "Too many requests in a short time. Please try again in a few minutes."
          : "Your enquiry could not be sent. Please check your entries (name, valid e-mail, consent) and try again."
      );
      setStatus("fehler");
    }
  }

  const feld = cn(
    "block h-12 w-full rounded-xl px-4 text-[15px] outline-none transition-shadow placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-ov-500",
    dunkel ? "bg-white/[0.07] text-white ring-1 ring-white/15 placeholder:text-white/40" : "bg-white text-ink-900 ring-1 ring-ink-200"
  );
  const label = cn("mb-1.5 block text-[13.5px] font-semibold", dunkel ? "text-white/85" : "text-ink-700");
  const option = dunkel ? "text-ink-900" : undefined;

  if (status === "fertig") {
    const rolle = { investor: "investor", projekt: "anbieter" }[themen ? thema : typ] || "investor";
    const registrieren = `/registrieren?${new URLSearchParams({ rolle, vorgang: ergebnis?.id || "" })}`;
    return (
      <div role="status" className={cn("rounded-3xl p-7 md:p-9", dunkel ? "bg-white/[0.06] ring-1 ring-white/10" : "bg-ov-50 ring-1 ring-ov-200", className)}>
        <CheckCircle2 aria-hidden="true" className="h-9 w-9 text-ov-500" />
        <p className={cn("mt-4 font-display text-[22px] font-bold", dunkel ? "text-white" : "text-ink-900")}>Enquiry received</p>
        <p className={cn("mt-2 text-[15.5px] leading-relaxed", dunkel ? "text-white/75" : "text-ink-700")}>{erfolgText}</p>
        {ergebnis?.id && (
          <p className={cn("mt-3 text-[13.5px]", dunkel ? "text-white/55" : "text-ink-500")}>
            Reference number <span className="ov-num font-semibold">{ergebnis.id}</span>
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href={registrieren} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white hover:bg-ov-700">
            Track status in the portal <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <span className={cn("text-[13px]", dunkel ? "text-white/55" : "text-ink-500")}>Portal interface currently in German.</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={absenden} className={cn("space-y-4", className)} aria-describedby={titel ? `${id}-t` : undefined}>
      {titel && (
        <div>
          <p id={`${id}-t`} className={cn("font-display text-[22px] font-bold", dunkel ? "text-white" : "text-ink-900")}>{titel}</p>
          {text && <p className={cn("mt-1.5 text-[15px] leading-relaxed", dunkel ? "text-white/70" : "text-ink-600")}>{text}</p>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {themen && (
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-th`} className={label}>Your enquiry is about *</label>
            <select id={`${id}-th`} name="thema" value={thema} onChange={(e) => setThema(e.target.value)} className={feld}>
              {themen.map((t) => (
                <option key={t.typ} value={t.typ} className={option}>{t.label}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor={`${id}-vn`} className={label}>First name *</label>
          <input id={`${id}-vn`} name="vorname" required autoComplete="given-name" className={feld} />
        </div>
        <div>
          <label htmlFor={`${id}-nn`} className={label}>Last name *</label>
          <input id={`${id}-nn`} name="nachname" required autoComplete="family-name" className={feld} />
        </div>
        {felder.includes("firma") && (
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-fi`} className={label}>Company / organisation</label>
            <input id={`${id}-fi`} name="firma" autoComplete="organization" className={feld} />
          </div>
        )}
        <div className={felder.includes("telefon") ? "" : "sm:col-span-2"}>
          <label htmlFor={`${id}-em`} className={label}>E-mail *</label>
          <input id={`${id}-em`} name="email" type="email" required autoComplete="email" className={feld} />
        </div>
        {felder.includes("telefon") && (
          <div>
            <label htmlFor={`${id}-te`} className={label}>Phone (with country code)</label>
            <input id={`${id}-te`} name="telefon" type="tel" autoComplete="tel" placeholder="+44 …" className={feld} />
          </div>
        )}
        {felder.includes("land") && (
          <>
            <div className={land === "andere" ? "" : "sm:col-span-2"}>
              <label htmlFor={`${id}-la`} className={label}>Country</label>
              <select id={`${id}-la`} name="land" value={land} onChange={(e) => setLand(e.target.value)} className={feld} autoComplete="country">
                <option value="DE" className={option}>Germany</option>
                <option value="AT" className={option}>Austria</option>
                <option value="CH" className={option}>Switzerland</option>
                <option value="andere" className={option}>Other country</option>
              </select>
            </div>
            {land === "andere" && (
              <div>
                <label htmlFor={`${id}-ls`} className={label}>Which country?</label>
                <input id={`${id}-ls`} name="landSonstiges" autoComplete="country-name" className={feld} />
              </div>
            )}
          </>
        )}
        {felder.includes("nachricht") && (
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-na`} className={label}>Your message</label>
            <textarea id={`${id}-na`} name="nachricht" rows={4} className={cn(feld, "h-auto py-3")} />
          </div>
        )}
      </div>
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <label className={cn("flex items-start gap-3 text-[13.5px] leading-relaxed", dunkel ? "text-white/70" : "text-ink-600")}>
        <input type="checkbox" name="einwilligung" required className="mt-1 h-4 w-4 shrink-0 accent-[#558227]" />
        <span>
          I agree that ÖkoInvest processes my details to handle this enquiry. See the{" "}
          <Link href="/datenschutz" className="underline underline-offset-2">privacy policy</Link> (in German). *
        </span>
      </label>
      {status === "fehler" && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800 ring-1 ring-red-200">{fehler}</p>
      )}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === "sendet"}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-ov-600 px-7 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700 disabled:opacity-60"
        >
          {status === "sendet" ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
          {button}
          {status !== "sendet" && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
        </button>
        <p className={cn("flex items-center gap-1.5 text-[12.5px]", dunkel ? "text-white/50" : "text-ink-500")}>
          <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Encrypted transmission · free & non-binding
        </p>
      </div>
    </form>
  );
}

function sichereHerkunft() {
  try {
    return herkunft() || undefined;
  } catch {
    return undefined;
  }
}
