"use client";

// Anmeldung: Passwort oder passwortlos per E-Mail-Link; bei aktiver Zwei-Faktor-Anmeldung folgt der Code-Schritt.

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, LogIn, MailCheck, Wand2 } from "lucide-react";
import { senden, sicheresZiel } from "@/lib/plattform/client";
import { eingabe, Feld, FehlerBox, ErfolgBox } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import ZweiFaktorSchritt from "./ZweiFaktorSchritt";

const HINWEISE = {
  abgemeldet: { ton: "ok", text: "Sie wurden abgemeldet." },
  "link-ungueltig": { ton: "fehler", text: "Der Link ist ungültig oder abgelaufen. Melden Sie sich an oder fordern Sie einen neuen Link an." },
  "passwort-gesetzt": { ton: "ok", text: "Ihr neues Passwort ist gespeichert." },
  "konto-geloescht": { ton: "ok", text: "Ihr Konto wurde gelöscht. Vielen Dank für Ihr Vertrauen." },
  "zwei-faktor-abgelaufen": { ton: "fehler", text: "Die Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an." },
};

const knopf =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700 disabled:opacity-60";

/** Nach erfolgreicher Anmeldung weiterleiten */
export function weiterNachLogin(router, weiter, nutzer) {
  const standard = nutzer?.zweiFaktorPflichtOffen ? "/portal/sicherheit?pflicht=1" : nutzer?.rollen?.includes("admin") ? "/portal/admin" : "/portal";
  router.replace(nutzer?.zweiFaktorPflichtOffen ? standard : sicheresZiel(weiter, standard));
  router.refresh();
}

export default function LoginFormular({ weiter, hinweis, demoKonten = [], demo = false }) {
  const router = useRouter();
  const id = useId();
  const [modus, setModus] = useState("passwort"); // passwort | link | link-gesendet | zwei-faktor
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [zeigen, setZeigen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [meldung, setMeldung] = useState(HINWEISE[hinweis] || null);

  async function anmelden(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      const r = await senden("/api/auth/login", { body: { email, passwort } });
      if (r.zweiFaktor) {
        setModus("zwei-faktor");
        setLaeuft(false);
        return;
      }
      weiterNachLogin(router, weiter, r.nutzer);
    } catch (err) {
      setFehler(err.message);
      setLaeuft(false);
    }
  }

  async function linkAnfordern(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      await senden("/api/auth/magic-link", { body: { email } });
      setModus("link-gesendet");
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  const registrieren = `/registrieren${weiter ? `?weiter=${encodeURIComponent(weiter)}` : ""}`;

  if (modus === "zwei-faktor") {
    return (
      <ZweiFaktorSchritt
        onErfolg={(r) => weiterNachLogin(router, weiter, r.nutzer)}
        onAbbrechen={(text) => {
          setModus("passwort");
          setPasswort("");
          setMeldung(text ? { ton: "fehler", text } : null);
        }}
      />
    );
  }

  if (modus === "link-gesendet") {
    return (
      <div role="status" className="rounded-2xl bg-ov-50 p-6 ring-1 ring-ov-200">
        <MailCheck aria-hidden="true" className="h-8 w-8 text-ov-600" />
        <p className="mt-3 font-display text-[19px] font-bold text-ink-900">Bitte prüfen Sie Ihr Postfach</p>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-700">
          Wenn ein Konto mit {email || "dieser Adresse"} besteht, haben wir Ihnen einen Anmelde-Link gesendet. Er ist 15 Minuten gültig und funktioniert nur einmal.
        </p>
        {demo && <p className="mt-3 text-[13px] text-ink-600">Demo-Modus: Es wird keine E-Mail versendet. Der Link steht im Server-Log und im Backoffice unter „E-Mail-Postausgang“.</p>}
        <button type="button" onClick={() => setModus("passwort")} className="mt-4 text-[14px] font-semibold text-ov-700 hover:text-ov-800">Zurück zur Anmeldung mit Passwort</button>
      </div>
    );
  }

  const tab = (m, label, Icon) => (
    <button
      type="button"
      role="tab"
      aria-selected={modus === m}
      aria-controls={`${id}-panel`}
      onClick={() => {
        setModus(m);
        setFehler("");
      }}
      className={cn("flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors", modus === m ? "bg-white text-ink-900 shadow-sm ring-1 ring-ink-200" : "text-ink-600 hover:text-ink-900")}
    >
      <Icon aria-hidden="true" className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {meldung && (meldung.ton === "ok" ? <ErfolgBox>{meldung.text}</ErfolgBox> : <FehlerBox>{meldung.text}</FehlerBox>)}
      <div role="tablist" aria-label="Anmeldeweg" className="flex gap-1 rounded-full bg-sand-100 p-1">
        {tab("passwort", "Passwort", KeyRound)}
        {tab("link", "E-Mail-Link", Wand2)}
      </div>
      <div id={`${id}-panel`} role="tabpanel">
        {modus === "passwort" ? (
          <form onSubmit={anmelden} className="space-y-4">
            <Feld id={`${id}-e`} label="E-Mail-Adresse">
              <input id={`${id}-e`} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={eingabe} />
            </Feld>
            <Feld id={`${id}-p`} label="Passwort">
              <div className="relative">
                <input id={`${id}-p`} type={zeigen ? "text" : "password"} autoComplete="current-password" required value={passwort} onChange={(e) => setPasswort(e.target.value)} className={cn(eingabe, "pr-12")} />
                <button type="button" onClick={() => setZeigen((z) => !z)} className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-800" aria-label={zeigen ? "Passwort verbergen" : "Passwort anzeigen"} aria-pressed={zeigen}>
                  {zeigen ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                </button>
              </div>
            </Feld>
            <div className="flex justify-end">
              <Link href="/passwort-vergessen" className="text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">Passwort vergessen?</Link>
            </div>
            <FehlerBox>{fehler}</FehlerBox>
            <button type="submit" disabled={laeuft} className={knopf}>
              {laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <LogIn aria-hidden="true" className="h-4 w-4" />}
              {laeuft ? "Anmeldung läuft …" : "Anmelden"}
            </button>
          </form>
        ) : (
          <form onSubmit={linkAnfordern} className="space-y-4">
            <p className="text-[14px] leading-relaxed text-ink-600">Ohne Passwort: Wir senden Ihnen einen einmaligen Anmelde-Link (15 Minuten gültig). Mit aktiver Zwei-Faktor-Anmeldung fragen wir danach zusätzlich Ihren Code ab.</p>
            <Feld id={`${id}-m`} label="E-Mail-Adresse">
              <input id={`${id}-m`} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={eingabe} />
            </Feld>
            <FehlerBox>{fehler}</FehlerBox>
            <button type="submit" disabled={laeuft} className={knopf}>
              {laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Wand2 aria-hidden="true" className="h-4 w-4" />}
              Anmelde-Link senden
            </button>
          </form>
        )}
      </div>
      <p className="text-center text-[14.5px] text-ink-600">
        Noch kein Konto?{" "}
        <Link href={registrieren} className="font-semibold text-ov-700 hover:text-ov-800">Kostenlos registrieren</Link>
      </p>

      {demoKonten.length > 0 && (
        <div className="rounded-2xl bg-sun-300/20 p-4 ring-1 ring-inset ring-sun-400/40">
          <p className="text-[13px] font-semibold text-ink-900">Demo-Modus – fiktive Konten zum Ausprobieren</p>
          <p className="mt-0.5 text-[12.5px] text-ink-600">Passwort für alle: <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">{demoKonten[0].passwort}</code></p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {demoKonten.map((k) => (
              <button
                key={k.email}
                type="button"
                onClick={() => {
                  setModus("passwort");
                  setEmail(k.email);
                  setPasswort(k.passwort);
                }}
                className="rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:ring-ov-400"
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
