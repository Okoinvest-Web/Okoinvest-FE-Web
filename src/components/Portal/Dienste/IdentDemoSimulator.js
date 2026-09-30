"use client";

// Demo-Simulator des Identitätsanbieters: steht im Demo-Betrieb an der Stelle der Anbieter-Seite (Redirect-URL).
// Das gewählte Ergebnis läuft als HMAC-signierter Webhook durch denselben Prüfpfad wie ein echter Anbieter.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleSlash, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import Button from "@/components/ui/Button";
import { Karte } from "@/components/Portal/ui";
import { FehlerBox } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";

const WAHL = [
  { e: "bestanden", label: "Identifizierung bestanden", icon: ShieldCheck, variant: "primary" },
  { e: "pruefen", label: "Manuelle Prüfung nötig", icon: ShieldAlert, variant: "secondary" },
  { e: "abgelehnt", label: "Nicht bestanden", icon: ShieldX, variant: "secondary" },
  { e: "abgebrochen", label: "Abbrechen", icon: CircleSlash, variant: "ghost" },
];

export default function IdentDemoSimulator({ sitzungId }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  async function waehlen(ergebnis) {
    setFehler("");
    setLaeuft(true);
    try {
      await senden("/api/portal/dienste/identitaet/demo", { body: { sitzungId, ergebnis } });
      router.push("/portal/verifizierung");
      router.refresh();
    } catch (x) {
      setFehler(x.message);
      setLaeuft(false);
    }
  }

  return (
    <Karte titel="Simulation des Identitätsanbieters" untertitel={`Sitzung ${sitzungId}`}>
      <p className="text-[14px] leading-relaxed text-ink-600">
        Im Demo-Betrieb ersetzt diese Seite die Oberfläche des Anbieters (Ausweis fotografieren, Selfie/Video, NFC-Chip). Wählen Sie das Ergebnis – es wird wie ein echter Anbieter-Webhook signiert übermittelt und dem KYC-Fall als Hinweis angehängt.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {WAHL.map((w) => (
          <Button key={w.e} type="button" size="sm" variant={w.variant} icon={w.icon} disabled={laeuft} onClick={() => waehlen(w.e)}>{w.label}</Button>
        ))}
      </div>
      <div className="mt-4"><FehlerBox>{fehler}</FehlerBox></div>
    </Karte>
  );
}
