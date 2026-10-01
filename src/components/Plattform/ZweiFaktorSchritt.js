"use client";

// Zweiter Schritt der Anmeldung: 6-stelliger Code aus der Authenticator-App (sechs Einzelfelder, Einfügen und
// Autofill, automatisches Absenden bei vollständigem Code) oder Wiederherstellungscode, optional „Gerät 30 Tage
// merken“. Wird nach Passwort, E-Mail-Link und Passwort-Reset eingeblendet.

import { useId, useRef, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import CodeEingabe from "@/components/formular/CodeEingabe";
import Textfeld from "@/components/formular/Textfeld";
import { AbsendeKnopf, useAbsenden } from "@/components/formular/Absenden";
import { checkboxKlasse } from "@/components/formular/stil";

export default function ZweiFaktorSchritt({ onErfolg, onAbbrechen }) {
  const id = useId();
  const [code, setCode] = useState("");
  const [wiederherstellung, setWiederherstellung] = useState(false);
  const [merken, setMerken] = useState(false);
  const [versuch, setVersuch] = useState(0);
  const laeuft = useRef(false);
  const a = useAbsenden({
    uebersetzen: (e) => {
      // Anmeldung abgelaufen → zurück zum ersten Schritt (wie bisher)
      if (e?.status === 401 && /abgelaufen/.test(e.message || "")) setTimeout(() => onAbbrechen?.(e.message), 0);
      return e?.message || "Der Code konnte nicht geprüft werden. Bitte versuchen Sie es erneut.";
    },
  });

  const gueltig = wiederherstellung ? code.replace(/[^0-9A-Z]/g, "").length === 10 : code.length === 6;

  async function pruefen(wert = code) {
    if (laeuft.current) return;
    laeuft.current = true;
    const r = await a.los(() => senden("/api/auth/zwei-faktor", { body: { code: wert, merken } }), {
      haltezeit: 600,
      zuruecksetzen: false,
      danach: (erg) => onErfolg?.(erg),
    });
    if (r === null) {
      setCode("");
      setVersuch((n) => n + 1);
    }
    laeuft.current = false;
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (gueltig) pruefen();
      }}
      className="ov-step-vor space-y-6"
    >
      <div className="flex items-start gap-3 rounded-2xl bg-ov-50 p-4 ring-1 ring-inset ring-ov-200">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-700" />
        <p className="text-[14px] leading-relaxed text-ov-900">
          {wiederherstellung
            ? "Geben Sie einen Ihrer Wiederherstellungscodes ein (Format XXXXX-XXXXX). Jeder Code funktioniert nur einmal."
            : "Ihr Konto ist mit einem zweiten Faktor geschützt. Geben Sie den aktuellen 6-stelligen Code aus Ihrer Authenticator-App ein – nach der letzten Ziffer prüfen wir automatisch."}
        </p>
      </div>

      {wiederherstellung ? (
        <Textfeld
          key="w"
          id={`${id}-w`}
          label="Wiederherstellungscode"
          autoFocus
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={11}
          value={code}
          fehler={a.fehler}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          feldClassName="text-center font-mono text-[18px] tracking-[0.14em]"
        />
      ) : (
        <CodeEingabe
          id={`${id}-c`}
          label="Code aus der App"
          wert={code}
          onChange={(w) => {
            setCode(w);
            if (a.fehler) a.setFehler("");
          }}
          onKomplett={(w) => pruefen(w)}
          fehler={a.fehler ? `${a.fehler}${versuch > 1 ? ` (Versuch ${versuch})` : ""}` : ""}
          deaktiviert={a.status !== "bereit"}
          autoFocus
        />
      )}

      <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-ink-700">
        <input type="checkbox" checked={merken} onChange={(e) => setMerken(e.target.checked)} className={checkboxKlasse} />
        Dieses Gerät 30 Tage merken (nur auf eigenen, nicht geteilten Geräten)
      </label>

      <AbsendeKnopf status={a.status} icon={KeyRound} block disabled={!gueltig} laedtText="Wird geprüft …" erfolgText="Bestätigt">
        Bestätigen & anmelden
      </AbsendeKnopf>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
        <button
          type="button"
          onClick={() => {
            setWiederherstellung((w) => !w);
            setCode("");
            a.setFehler("");
          }}
          className="inline-flex min-h-10 items-center font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline"
        >
          {wiederherstellung ? "Code aus der App verwenden" : "Telefon nicht zur Hand? Wiederherstellungscode"}
        </button>
        {onAbbrechen && (
          <button type="button" onClick={() => onAbbrechen()} className="inline-flex min-h-10 items-center text-ink-600 hover:text-ink-900">
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}
