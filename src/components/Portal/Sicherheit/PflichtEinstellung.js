"use client";

// Backoffice: Zwei-Faktor-Pflicht je Rolle (zusätzlich wirkt die Umgebungsvariable PLATTFORM_2FA_PFLICHT).

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { senden } from "@/lib/plattform/client";
import { ALLE_ROLLEN_IDS, rolleLabel } from "@/lib/plattform/konstanten";
import { Chip, FehlerBox, ErfolgBox } from "@/components/Portal/felder";

export default function PflichtEinstellung({ pflicht }) {
  const router = useRouter();
  const [rollen, setRollen] = useState(pflicht.rollen || []);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLaeuft(true);
        setFehler("");
        setErfolg("");
        try {
          await senden("/api/portal/sicherheit/pflicht", { method: "PUT", body: { rollen } });
          setErfolg("Gespeichert. Betroffene Konten richten die Zwei-Faktor-Anmeldung bei der nächsten Aktion ein.");
          router.refresh();
        } catch (err) {
          setFehler(err.message);
        } finally {
          setLaeuft(false);
        }
      }}
    >
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Pflicht für Rollen</legend>
        <div className="flex flex-wrap gap-2">
          {ALLE_ROLLEN_IDS.map((r) => (
            <Chip key={r} value={r} checked={rollen.includes(r) || pflicht.umgebung?.includes(r)} onChange={() => !pflicht.umgebung?.includes(r) && setRollen((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]))}>
              {rolleLabel(r)}
              {pflicht.umgebung?.includes(r) ? " (fest)" : ""}
            </Chip>
          ))}
        </div>
      </fieldset>
      <p className="text-[13px] text-ink-500">
        {pflicht.kontenOhne2fa ? `${pflicht.kontenOhne2fa} aktive(s) Konto/Konten mit Pflicht haben die Zwei-Faktor-Anmeldung noch nicht eingerichtet.` : "Alle Konten mit Pflicht nutzen die Zwei-Faktor-Anmeldung."}
        {pflicht.umgebung?.length ? " „fest“ = über PLATTFORM_2FA_PFLICHT gesetzt." : ""}
      </p>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{erfolg}</ErfolgBox>
      <Button type="submit" size="sm" disabled={laeuft}>Speichern</Button>
    </form>
  );
}
