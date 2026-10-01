"use client";

// src/components/formular/PasswortFeld.js
//
// Passwortfeld mit Anzeigen/Verbergen, Feststelltaste-Hinweis und optionaler Stärkeanzeige
// (vier Segmente, laufen per scaleX ein; Text per aria-live). Verbindlich prüft der Server.
//   <PasswortFeld id="pw" label="Passwort" staerke email={email} personName={name} {...form.feld("passwort")} />

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { passwortStaerke } from "@/lib/plattform/passwortStaerke";
import Textfeld from "./Textfeld";

const SEGMENT = ["bg-ink-200", "bg-danger-500", "bg-sun-500", "bg-ov-500", "bg-ov-600"];
const TEXT = ["text-ink-600", "text-danger-700", "text-sun-700", "text-ov-700", "text-ov-700"];

export function StaerkeAnzeige({ id, passwort, email, name, dunkel = false }) {
  const s = passwortStaerke(passwort || "", { email, name });
  return (
    <div id={id} className="mt-2">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("relative h-1.5 flex-1 overflow-hidden rounded-full", dunkel ? "bg-white/15" : "bg-ink-100")}>
            <span
              className={cn("absolute inset-0 origin-left rounded-full transition-transform duration-300 ease-ov-out", SEGMENT[s.stufe] || SEGMENT[0])}
              style={{ transform: `scaleX(${passwort && i <= s.stufe ? 1 : 0})`, transitionDelay: `${(i - 1) * 40}ms` }}
            />
          </span>
        ))}
      </div>
      <p className={cn("mt-1.5 min-h-[1.25rem] text-[13px] leading-snug", dunkel ? "text-white/75" : "text-ink-600")} aria-live="polite">
        {passwort ? (
          <>
            Passwortstärke: <strong className={cn("font-semibold", dunkel ? "text-white" : TEXT[s.stufe])}>{s.label}</strong>
            {s.tipps.length > 0 && <span> · {s.tipps[0]}</span>}
          </>
        ) : (
          <span className={dunkel ? "text-white/65" : "text-ink-500"}>Tipp: Ein Satz aus vier Wörtern ist sicher und leicht zu merken.</span>
        )}
      </p>
    </div>
  );
}

export default function PasswortFeld({ id, staerke = false, email, personName, value, dunkel = false, autoComplete = "current-password", onKeyUp, hinweis, ...rest }) {
  const [zeigen, setZeigen] = useState(false);
  const [feststell, setFeststell] = useState(false);

  const knopf = (
    <button
      type="button"
      onClick={() => setZeigen((z) => !z)}
      className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-colors", dunkel ? "text-white/75 hover:bg-white/10 hover:text-white" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900")}
      aria-label={zeigen ? "Passwort verbergen" : "Passwort anzeigen"}
      aria-pressed={zeigen}
      aria-controls={id}
    >
      {zeigen ? <EyeOff aria-hidden="true" className="h-[18px] w-[18px]" /> : <Eye aria-hidden="true" className="h-[18px] w-[18px]" />}
    </button>
  );

  const pruefeFeststell = (e) => {
    if (typeof e.getModifierState === "function") setFeststell(e.getModifierState("CapsLock"));
    onKeyUp?.(e);
  };

  return (
    <div>
      <Textfeld
        id={id}
        type={zeigen ? "text" : "password"}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        rechts={knopf}
        dunkel={dunkel}
        hinweis={hinweis}
        onKeyUp={pruefeFeststell}
        aria-describedby={staerke ? `${id}-staerke` : undefined}
        {...rest}
      />
      {feststell && (
        <p className={cn("mt-1.5 text-[13px] font-medium animate-ov-einblenden", dunkel ? "text-sun-300" : "text-sun-700")} role="status">
          Die Feststelltaste ist aktiv.
        </p>
      )}
      {staerke && <StaerkeAnzeige id={`${id}-staerke`} passwort={value} email={email} name={personName} dunkel={dunkel} />}
    </div>
  );
}
