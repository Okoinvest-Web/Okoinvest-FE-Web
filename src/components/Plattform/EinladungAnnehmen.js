"use client";

// Einladung in eine Organisation annehmen (angemeldet mit der eingeladenen E-Mail-Adresse).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import Button from "@/components/ui/Button";
import { FormFehler } from "@/components/formular/Meldungen";

export default function EinladungAnnehmen({ token }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  return (
    <div className="space-y-4">
      <FormFehler>{fehler}</FormFehler>
      <Button
        block
        icon={Check}
        laedt={laeuft}
        onClick={async () => {
          setLaeuft(true);
          setFehler("");
          try {
            const r = await senden("/api/portal/organisation/einladung", { body: { token } });
            router.replace(`/portal/organisation?id=${r.organisationId}`);
            router.refresh();
          } catch (e) {
            setFehler(e.message);
            setLaeuft(false);
          }
        }}
      >
        {laeuft ? "Wird angenommen …" : "Einladung annehmen"}
      </Button>
    </div>
  );
}
