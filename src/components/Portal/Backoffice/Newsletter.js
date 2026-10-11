"use client";

// src/components/Portal/Backoffice/Newsletter.js
//
// Aktionen je Newsletter-Empfänger (Plattform-Armee, Paket MARKETING): Datenexport (Art. 15/20) als JSON-Abruf
// und Löschung (Art. 17) mit Bestätigungsdialog. Alle Prüfungen (Rechte, Zustand) laufen serverseitig
// (/api/admin/newsletter); nach Erfolg lädt die Seite neu (router.refresh). Nur Demo-Backend.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { senden } from "@/lib/plattform/client";

export function EmpfaengerAktionen({ aboId, email, darfSchreiben = true }) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");
  const [meldung, setMeldung] = useState("");

  const loeschen = async () => {
    setLaedt(true);
    setFehler("");
    try {
      await senden("/api/admin/newsletter", { body: { aktion: "loeschen", aboId } });
      setMeldung("Empfänger gelöscht (Art. 17).");
      setOffen(false);
      router.refresh();
    } catch (e) {
      setFehler(e.message || "Das hat nicht geklappt.");
    } finally {
      setLaedt(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="xs" variant="secondary" icon={FileDown} href={`/api/admin/newsletter?export=${encodeURIComponent(aboId)}`}>
        Export
      </Button>
      {darfSchreiben && (
        <Button size="xs" variant="dangerLeise" icon={Trash2} onClick={() => setOffen(true)}>
          Art. 17
        </Button>
      )}
      <span aria-live="polite" className="sr-only">{meldung}</span>

      <Dialog
        offen={offen}
        onSchliessen={() => { setOffen(false); setFehler(""); }}
        icon={Trash2}
        titel="Empfänger löschen (Art. 17)"
        text={`Abo ${aboId}${email ? ` · ${email}` : ""}. Die Löschung trägt einen Widerruf in die Einwilligungskette ein, entfernt die E-Mail-Adresse und beendet alle Abos dieser Adresse. Das lässt sich nicht rückgängig machen.`}
        aktionen={
          <>
            <Button variant="secondary" onClick={() => setOffen(false)}>Abbrechen</Button>
            <Button variant="navy" laedt={laedt} onClick={loeschen}>Endgültig löschen</Button>
          </>
        }
      >
        {fehler && (
          <p role="alert" className="rounded-xl bg-danger-50 px-3 py-2 text-[13.5px] text-danger-800 ring-1 ring-inset ring-danger-200">
            {fehler}
          </p>
        )}
      </Dialog>
    </div>
  );
}
