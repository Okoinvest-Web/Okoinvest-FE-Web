"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { senden, sicheresZiel } from "@/lib/plattform/client";
import { eingabe, Feld, FehlerBox, ErfolgBox } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";

const HINWEISE = {
  abgemeldet: { ton: "ok", text: "Sie wurden abgemeldet." },
  "link-ungueltig": { ton: "fehler", text: "Der Link ist ungültig oder abgelaufen. Melden Sie sich an oder fordern Sie einen neuen Link an." },
  "passwort-gesetzt": { ton: "ok", text: "Ihr neues Passwort ist gespeichert." },
};

export default function LoginFormular({ weiter, hinweis, demoKonten = [] }) {
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [zeigen, setZeigen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const h = HINWEISE[hinweis];

  async function anmelden(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      const r = await senden("/api/auth/login", { body: { email, passwort } });
      const standard = r.nutzer?.rollen?.includes("admin") ? "/portal/admin" : "/portal";
      router.replace(sicheresZiel(weiter, standard));
      router.refresh();
    } catch (err) {
      setFehler(err.message);
      setLaeuft(false);
    }
  }

  const registrieren = `/registrieren${weiter ? `?weiter=${encodeURIComponent(weiter)}` : ""}`;

  return (
    <div className="space-y-6">
      {h && (h.ton === "ok" ? <ErfolgBox>{h.text}</ErfolgBox> : <FehlerBox>{h.text}</FehlerBox>)}
      <form onSubmit={anmelden} className="space-y-4" noValidate={false}>
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
        <button type="submit" disabled={laeuft} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700 disabled:opacity-60">
          {laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <LogIn aria-hidden="true" className="h-4 w-4" />}
          {laeuft ? "Anmeldung läuft …" : "Anmelden"}
        </button>
      </form>
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
