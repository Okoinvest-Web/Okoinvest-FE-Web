"use client";

// Termin per Link aus der Bestätigungs-E-Mail verwalten (ohne Konto). Das Token wird nur per POST übertragen.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { FehlerBox } from "@/components/Portal/felder";
import { TerminKarte } from "./TerminListe";

export default function TerminVerwalten({ token }) {
  const [termin, setTermin] = useState(null);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    if (!token) {
      setFehler("Der Link ist unvollständig. Bitte öffnen Sie ihn direkt aus der Bestätigungs-E-Mail.");
      return;
    }
    fetch("/api/portal/termine/oeffentlich/verwalten", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), credentials: "same-origin" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => (ok ? setTermin(j.termin) : setFehler(j.error || "Der Termin konnte nicht geladen werden.")))
      .catch(() => setFehler("Keine Verbindung."));
  }, [token]);

  if (fehler) {
    return (
      <div className="space-y-4">
        <FehlerBox>{fehler}</FehlerBox>
        <Button href="/termin" variant="secondary">Neuen Termin buchen</Button>
      </div>
    );
  }
  if (!termin) return <Loader2 aria-label="Termin wird geladen" className="h-7 w-7 animate-spin text-ov-600" />;
  return <TerminKarte t={termin} token={token} onGeaendert={setTermin} />;
}
