"use client";

// Anmelde-Link einlösen: bewusst per Klick (POST), damit Vorschau-Abrufe von Mailprogrammen das Token nicht verbrauchen.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import Button from "@/components/ui/Button";
import { FormFehler } from "@/components/formular/Meldungen";
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
      <FormFehler>{fehler}</FormFehler>
      <Button
        block
        autoFocus
        icon={LogIn}
        laedt={laeuft}
        disabled={!token}
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
      >
        {laeuft ? "Anmeldung läuft …" : "Jetzt anmelden"}
      </Button>
      <p className="text-center text-[14px] text-ink-600">
        Link abgelaufen? <Link href="/login" className="font-semibold text-ov-700 hover:text-ov-800">Neuen Link anfordern</Link>
      </p>
    </div>
  );
}
