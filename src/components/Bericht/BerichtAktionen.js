"use client";

// src/components/Bericht/BerichtAktionen.js – kleine Client-Teile der Berichtsseite (Welle 2, Paket B4)
//   DruckKnopf          window.print() (Druck-CSS: bericht-druck.css)
//   BestaetigenKnopf    Double-Opt-in per POST – nie per GET, damit Mail-Scanner nicht automatisch bestätigen

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Printer } from "lucide-react";
import Button from "@/components/ui/Button";
import { FormFehler } from "@/components/formular/Meldungen";

export function DruckKnopf({ className }) {
  return (
    <Button type="button" variant="secondary" size="sm" icon={Printer} className={className} onClick={() => window.print()}>
      Drucken oder als PDF speichern
    </Button>
  );
}

export function BestaetigenKnopf({ token, children = "Bestätigen und Bericht öffnen" }) {
  const router = useRouter();
  const [status, setStatus] = useState("bereit");
  const [fehler, setFehler] = useState("");

  async function bestaetigen() {
    if (status !== "bereit") return;
    setStatus("laedt");
    setFehler("");
    try {
      const res = await fetch("/api/rechner/bericht/bestaetigen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Die Bestätigung hat nicht geklappt. Bitte versuchen Sie es erneut.");
      setStatus("erfolg");
      router.refresh();
    } catch (e) {
      setFehler(e instanceof TypeError ? "Die Verbindung ist gerade gestört. Bitte versuchen Sie es gleich noch einmal." : e.message);
      setStatus("bereit");
    }
  }

  return (
    <div className="space-y-4">
      <Button type="button" size="lg" icon={status === "erfolg" ? Check : undefined} laedt={status === "laedt"} onClick={bestaetigen} data-bericht-bestaetigen="">
        {status === "erfolg" ? "Bestätigt – Bericht wird geladen" : children}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {status === "laedt" ? "Wird bestätigt …" : status === "erfolg" ? "Bestätigt. Der Bericht wird geladen." : ""}
      </span>
      <FormFehler>{fehler}</FormFehler>
    </div>
  );
}
