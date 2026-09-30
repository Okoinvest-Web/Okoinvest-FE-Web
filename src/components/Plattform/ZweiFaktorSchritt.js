"use client";

// Zweiter Schritt der Anmeldung: 6-stelliger Code aus der Authenticator-App oder Wiederherstellungscode,
// optional „Gerät 30 Tage merken“. Wird nach Passwort, E-Mail-Link und Passwort-Reset eingeblendet.

import { useId, useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { eingabe, Feld, FehlerBox } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";

const knopf =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700 disabled:opacity-60";

export default function ZweiFaktorSchritt({ onErfolg, onAbbrechen }) {
  const id = useId();
  const [code, setCode] = useState("");
  const [wiederherstellung, setWiederherstellung] = useState(false);
  const [merken, setMerken] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  async function pruefen(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      const r = await senden("/api/auth/zwei-faktor", { body: { code, merken } });
      onErfolg?.(r);
    } catch (err) {
      setFehler(err.message);
      setCode("");
      setLaeuft(false);
      if (err.status === 401 && /abgelaufen/.test(err.message)) onAbbrechen?.(err.message);
    }
  }

  return (
    <form onSubmit={pruefen} className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-ov-50 p-4 ring-1 ring-inset ring-ov-200">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-700" />
        <p className="text-[14px] leading-relaxed text-ov-900">
          {wiederherstellung
            ? "Geben Sie einen Ihrer Wiederherstellungscodes ein (Format XXXXX-XXXXX). Jeder Code funktioniert nur einmal."
            : "Ihr Konto ist mit einem zweiten Faktor geschützt. Geben Sie den aktuellen 6-stelligen Code aus Ihrer Authenticator-App ein."}
        </p>
      </div>
      <Feld id={`${id}-c`} label={wiederherstellung ? "Wiederherstellungscode" : "Code aus der App"}>
        <input
          id={`${id}-c`}
          key={wiederherstellung ? "w" : "t"}
          autoFocus
          required
          autoComplete="one-time-code"
          inputMode={wiederherstellung ? "text" : "numeric"}
          maxLength={wiederherstellung ? 11 : 6}
          value={code}
          onChange={(e) => setCode(wiederherstellung ? e.target.value.toUpperCase() : e.target.value.replace(/[^0-9]/g, ""))}
          className={cn(eingabe, "text-center font-mono text-[20px] tracking-[0.3em]", wiederherstellung && "text-[17px] tracking-[0.12em]")}
        />
      </Feld>
      <label className="flex cursor-pointer items-start gap-3 text-[14px] text-ink-700">
        <input type="checkbox" checked={merken} onChange={(e) => setMerken(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#558227]" />
        Dieses Gerät 30 Tage merken (nur auf eigenen, nicht geteilten Geräten)
      </label>
      <FehlerBox>{fehler}</FehlerBox>
      <button type="submit" disabled={laeuft || (!wiederherstellung && code.length !== 6) || (wiederherstellung && code.replace(/[^0-9A-Z]/g, "").length !== 10)} className={knopf}>
        {laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <KeyRound aria-hidden="true" className="h-4 w-4" />}
        {laeuft ? "Wird geprüft …" : "Bestätigen & anmelden"}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
        <button type="button" onClick={() => { setWiederherstellung((w) => !w); setCode(""); setFehler(""); }} className="font-semibold text-ov-700 hover:text-ov-800">
          {wiederherstellung ? "Code aus der App verwenden" : "Telefon nicht zur Hand? Wiederherstellungscode"}
        </button>
        {onAbbrechen && (
          <button type="button" onClick={() => onAbbrechen()} className="text-ink-500 hover:text-ink-800">
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}
