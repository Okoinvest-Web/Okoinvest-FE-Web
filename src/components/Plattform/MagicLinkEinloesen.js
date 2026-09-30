"use client";

// Anmelde-Link einlösen: bewusst per Klick (POST), damit Vorschau-Abrufe von Mailprogrammen das Token nicht verbrauchen.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { FehlerBox } from "@/components/Portal/felder";
import ZweiFaktorSchritt from "./ZweiFaktorSchritt";
import { weiterNachLogin } from "./LoginFormular";

export default function MagicLinkEinloesen({ token }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [zweiFaktor, setZweiFaktor] = useState(false);

  if (zweiFaktor) {
    return <ZweiFaktorSchritt onErfolg={(r) => weiterNachLogin(router, "", r.nutzer)} onAbbrechen={() => router.replace("/login?hinweis=zwei-faktor-abgelaufen")} />;
  }

  return (
    <div className="space-y-5">
      <FehlerBox>{fehler}</FehlerBox>
      <button
        type="button"
        autoFocus
        disabled={laeuft || !token}
        onClick={async () => {
          setLaeuft(true);
          setFehler("");
          try {
            const r = await senden("/api/auth/magic-link/einloesen", { body: { token } });
            if (r.zweiFaktor) {
              setZweiFaktor(true);
              setLaeuft(false);
              return;
            }
            weiterNachLogin(router, "", r.nutzer);
          } catch (e) {
            setFehler(e.message);
            setLaeuft(false);
          }
        }}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700 disabled:opacity-60"
      >
        {laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <LogIn aria-hidden="true" className="h-4 w-4" />}
        Jetzt anmelden
      </button>
      <p className="text-center text-[14px] text-ink-600">
        Link abgelaufen? <Link href="/login" className="font-semibold text-ov-700 hover:text-ov-800">Neuen Link anfordern</Link>
      </p>
    </div>
  );
}
