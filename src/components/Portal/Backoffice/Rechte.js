"use client";

// Rechteverwaltung (Client): Unterrollen je Backoffice-Konto setzen; erneute Prüfung der Hash-Kette.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { senden } from "@/lib/plattform/client";
import { Chip, ErfolgBox, FehlerBox } from "@/components/Portal/felder";

export function RollenSetzen({ konto, rollen, eigenes, darfSchreiben }) {
  const router = useRouter();
  const [auswahl, setAuswahl] = useState(konto.backofficeRollen);
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const geaendert = [...auswahl].sort().join() !== [...konto.backofficeRollen].sort().join();
  async function speichern() {
    setFehler("");
    setOk("");
    try {
      await senden(`/api/admin/rechte/${konto.id}`, { method: "PATCH", body: { backofficeRollen: auswahl } });
      setOk("Gespeichert – wirkt ab der nächsten Anfrage.");
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Backoffice-Rollen ${konto.name}`}>
        {Object.entries(rollen).map(([k, r]) => (
          <Chip key={k} name={`rolle-${konto.id}`} value={k} checked={auswahl.includes(k)} onChange={() => darfSchreiben && setAuswahl(auswahl.includes(k) ? auswahl.filter((x) => x !== k) : [...auswahl, k])}>
            {r.label}
          </Chip>
        ))}
      </div>
      {eigenes && <p className="text-[12px] text-ink-500">Eigenes Konto: Die Leitungsrolle bleibt erhalten.</p>}
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{ok}</ErfolgBox>
      {darfSchreiben && geaendert && <Button type="button" size="sm" icon={Save} onClick={speichern} disabled={!auswahl.length}>Rollen speichern</Button>}
    </div>
  );
}

export function KetteNeuPruefen() {
  const router = useRouter();
  return (
    <Button type="button" size="sm" variant="secondary" icon={RefreshCcw} onClick={() => router.refresh()}>
      Erneut prüfen
    </Button>
  );
}
