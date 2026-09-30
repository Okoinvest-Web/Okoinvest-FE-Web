"use client";

// DEMO-Simulator des eID-Ausstellers (ID Austria / eID-Service Online-Ausweis). Stellt nach Wahl des Ergebnisses einen
// Autorisierungscode und ein signiertes ID-Token aus und springt wie der echte Dienst zur Rücksprung-Route zurück.

import { useState } from "react";
import { CircleSlash, ShieldAlert, ShieldCheck, UserX } from "lucide-react";
import Button from "@/components/ui/Button";
import { Hinweis, Karte } from "@/components/Portal/ui";
import { FehlerBox } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";

const WAHL = [
  { a: "hoch", label: "Bestätigen (Vertrauensniveau hoch)", icon: ShieldCheck, variant: "primary" },
  { a: "substanziell", label: "Bestätigen (substanziell)", icon: ShieldAlert, variant: "secondary" },
  { a: "abweichend", label: "Andere Person (Abweichung)", icon: UserX, variant: "secondary" },
  { a: "abbrechen", label: "Abbrechen", icon: CircleSlash, variant: "ghost" },
];

export default function EidDemoAussteller({ methode, label, state, nonce, codeChallenge }) {
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  async function waehlen(auswahl) {
    setFehler("");
    setLaeuft(true);
    try {
      const r = await senden("/api/portal/dienste/eid/demo", { body: { state, nonce, codeChallenge, auswahl } });
      window.location.assign(r.url);
    } catch (x) {
      setFehler(x.message);
      setLaeuft(false);
    }
  }

  return (
    <Karte titel={`${label} (DEMO)`} untertitel={methode === "id_austria" ? "Simulierte Anmeldung mit der App „Digitales Amt“" : "Simulierte Anmeldung mit Ausweis und AusweisApp"}>
      <Hinweis ton="warn" titel="Demo-Modus – keine echte Identifizierung">
        Diese Seite ersetzt im Vorführbetrieb die Anmeldeseite des staatlichen eID-Systems. Der Nachweis wird als „DEMO“ gekennzeichnet an Ihren Verifizierungsfall gehängt.
      </Hinweis>
      <div className="mt-5 flex flex-wrap gap-2">
        {WAHL.map((w) => (
          <Button key={w.a} type="button" size="sm" variant={w.variant} icon={w.icon} disabled={laeuft} onClick={() => waehlen(w.a)}>{w.label}</Button>
        ))}
      </div>
      <div className="mt-4"><FehlerBox>{fehler}</FehlerBox></div>
    </Karte>
  );
}
