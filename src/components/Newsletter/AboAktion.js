"use client";

// src/components/Newsletter/AboAktion.js – Knöpfe der Seite /newsletter/abo/[token] (Welle 3, Paket NL)
//   art "bestaetigen"  Double-Opt-in per POST – nie per GET, damit Mail-Scanner nicht automatisch bestätigen
//   art "abmelden"     Abmeldung mit einem Klick (POST), wirkt sofort für alle Newsletter dieser Adresse

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MailCheck, MailX } from "lucide-react";
import Button from "@/components/ui/Button";
import { FormFehler } from "@/components/formular/Meldungen";

const TEXTE = {
  de: { laedt: "Wird gesendet …", fertig: "Erledigt", verbindung: "Die Verbindung ist gerade gestört. Bitte versuchen Sie es gleich noch einmal.", fehler: "Das hat nicht geklappt. Bitte versuchen Sie es erneut." },
  en: { laedt: "Sending …", fertig: "Done", verbindung: "The connection is currently disrupted. Please try again in a moment.", fehler: "That did not work. Please try again." },
};

export default function AboAktion({ token, art, sprache = "de", children }) {
  const router = useRouter();
  const t = TEXTE[sprache === "en" ? "en" : "de"];
  const [status, setStatus] = useState("bereit");
  const [fehler, setFehler] = useState("");

  async function los() {
    if (status !== "bereit") return;
    setStatus("laedt");
    setFehler("");
    try {
      const res = await fetch(`/api/newsletter/${art === "abmelden" ? "abmelden" : "bestaetigen"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || t.fehler);
      setStatus("erfolg");
      router.refresh();
    } catch (e) {
      setFehler(e instanceof TypeError ? t.verbindung : e.message);
      setStatus("bereit");
    }
  }

  const icon = status === "erfolg" ? Check : art === "abmelden" ? MailX : MailCheck;
  return (
    <div className="space-y-4">
      <Button type="button" size="lg" variant={art === "abmelden" ? "secondary" : "primary"} icon={icon} laedt={status === "laedt"} onClick={los} data-newsletter-aktion={art}>
        {status === "erfolg" ? t.fertig : children}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {status === "laedt" ? t.laedt : status === "erfolg" ? t.fertig : ""}
      </span>
      <FormFehler>{fehler}</FormFehler>
    </div>
  );
}
