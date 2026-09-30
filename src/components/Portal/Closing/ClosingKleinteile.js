"use client";

// Kleine Client-Teile des Closings: Closing-Raum aus einem Kandidaten (Zuschlag/LOI) eröffnen (Backoffice) und
// Bedingung als erfüllt melden (Käufer/Verkäufer im Portal).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Stamp } from "lucide-react";
import Button from "@/components/ui/Button";
import { FehlerBox, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { CL_STRUKTUREN } from "@/lib/plattform/closing/closing";

export function ClosingEroeffnen({ kandidat }) {
  const router = useRouter();
  const [struktur, setStruktur] = useState(["asset", "share"].includes(kandidat.struktur) ? kandidat.struktur : "share");
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  async function los() {
    setFehler("");
    setLaeuft(true);
    try {
      const r = await senden("/api/admin/closing", { body: { projektId: kandidat.projektId, interesseId: kandidat.interesseId, struktur } });
      router.push(`/portal/admin/closing/${r.closing.id}`);
    } catch (x) {
      setFehler(x.message);
      setLaeuft(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`cl-k-${kandidat.interesseId}`}>Struktur</label>
      <select id={`cl-k-${kandidat.interesseId}`} value={struktur} onChange={(e) => setStruktur(e.target.value)} className={`${auswahlfeld} h-10 w-auto text-[14px]`}>
        {Object.entries(CL_STRUKTUREN).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
      </select>
      <Button type="button" size="sm" icon={Stamp} onClick={los} disabled={laeuft}>Closing-Raum eröffnen</Button>
      <div className="w-full"><FehlerBox>{fehler}</FehlerBox></div>
    </div>
  );
}

export function CpMelden({ closingId, schluessel }) {
  const router = useRouter();
  const [nachweis, setNachweis] = useState("");
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  async function los(ev) {
    ev.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      await senden(`/api/portal/closing/${closingId}`, { body: { aktion: "cp_melden", schluessel, nachweis } });
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <form onSubmit={los} className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <label className="sr-only" htmlFor={`cp-${schluessel}`}>Nachweis</label>
      <input id={`cp-${schluessel}`} value={nachweis} onChange={(e) => setNachweis(e.target.value)} placeholder="Nachweis, z. B. „Beschluss vom 12.10., liegt im Datenraum“" className={eingabe} />
      <Button type="submit" size="sm" variant="secondary" icon={Send} disabled={laeuft}>Als erfüllt melden</Button>
      <div className="sm:col-span-2"><FehlerBox>{fehler}</FehlerBox></div>
    </form>
  );
}
