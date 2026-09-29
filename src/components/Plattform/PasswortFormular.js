"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { passwortFehler } from "@/lib/plattform/validierung";
import { eingabe, Feld, FehlerBox } from "@/components/Portal/felder";

const knopf =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700 disabled:opacity-60";

/** Link anfordern */
export function PasswortAnfordern({ demo = false }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("offen");
  const [fehler, setFehler] = useState("");

  async function absenden(e) {
    e.preventDefault();
    setStatus("sendet");
    setFehler("");
    try {
      await senden("/api/auth/passwort-vergessen", { body: { email } });
      setStatus("fertig");
    } catch (err) {
      setFehler(err.message);
      setStatus("offen");
    }
  }

  if (status === "fertig") {
    return (
      <div role="status" className="rounded-2xl bg-ov-50 p-6 ring-1 ring-ov-200">
        <MailCheck aria-hidden="true" className="h-8 w-8 text-ov-600" />
        <p className="mt-3 font-display text-[19px] font-bold text-ink-900">Bitte prüfen Sie Ihr Postfach</p>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-700">
          Wenn ein Konto mit dieser Adresse besteht, haben wir Ihnen einen Link zum Zurücksetzen gesendet. Er ist eine Stunde gültig.
        </p>
        {demo && <p className="mt-3 text-[13px] text-ink-600">Demo-Modus: Es wird keine E-Mail versendet. Der Link steht im Server-Log und im Backoffice unter „Nutzer & Protokoll“.</p>}
        <Link href="/login" className="mt-4 inline-block text-[14px] font-semibold text-ov-700 hover:text-ov-800">Zurück zur Anmeldung</Link>
      </div>
    );
  }

  return (
    <form onSubmit={absenden} className="space-y-4">
      <Feld id={`${id}-e`} label="E-Mail-Adresse Ihres Kontos">
        <input id={`${id}-e`} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={eingabe} />
      </Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <button type="submit" disabled={status === "sendet"} className={knopf}>
        {status === "sendet" && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
        Link zum Zurücksetzen senden
      </button>
      <p className="text-center text-[14.5px] text-ink-600">
        Doch wieder eingefallen? <Link href="/login" className="font-semibold text-ov-700 hover:text-ov-800">Anmelden</Link>
      </p>
    </form>
  );
}

/** Neues Passwort mit Token setzen */
export function PasswortSetzen({ token }) {
  const router = useRouter();
  const id = useId();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  async function absenden(e) {
    e.preventDefault();
    const f = passwortFehler(pw) || (pw !== pw2 ? "Die Passwörter stimmen nicht überein." : "");
    if (f) return setFehler(f);
    setLaeuft(true);
    setFehler("");
    try {
      await senden("/api/auth/passwort-setzen", { body: { token, passwort: pw } });
      router.replace("/portal");
      router.refresh();
    } catch (err) {
      setFehler(err.message);
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={absenden} className="space-y-4">
      <Feld id={`${id}-1`} label="Neues Passwort" hinweis="Mindestens 10 Zeichen, Buchstaben und eine Ziffer oder ein Sonderzeichen.">
        <input id={`${id}-1`} type="password" required minLength={10} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={eingabe} />
      </Feld>
      <Feld id={`${id}-2`} label="Passwort wiederholen">
        <input id={`${id}-2`} type="password" required minLength={10} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={eingabe} />
      </Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <button type="submit" disabled={laeuft} className={knopf}>
        {laeuft && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
        Passwort speichern & anmelden
      </button>
    </form>
  );
}
