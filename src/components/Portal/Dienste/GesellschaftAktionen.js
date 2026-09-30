"use client";

// Kleine Aktionen an einer Gesellschaft: Company in ERPNext anlegen (nur Frappe mit ERPNext), Bilanzstichtag/Steuernummer.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { ErfolgBox, FehlerBox, Feld, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";

export default function GesellschaftAktionen({ id, erpnext, bilanzstichtag, steuernummer, schreiben }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [bst, setBst] = useState(bilanzstichtag || "12-31");
  const [stnr, setStnr] = useState(steuernummer || "");

  async function erp() {
    setFehler("");
    setErfolg("");
    try {
      const r = await senden(`/api/admin/gesellschaften/${id}/erp`, { body: {} });
      setErfolg(r.hinweis || `Company „${r.company}“ angelegt.`);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }

  async function speichern(ev) {
    ev.preventDefault();
    setFehler("");
    setErfolg("");
    try {
      await senden(`/api/admin/gesellschaften/${id}`, { method: "PATCH", body: { bilanzstichtag: bst, steuernummer: stnr } });
      setErfolg("Gespeichert.");
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }

  if (!schreiben) return null;
  return (
    <div className="space-y-4">
      <form onSubmit={speichern} className="grid gap-3 sm:grid-cols-2">
        <Feld id="ga-bst2" label="Bilanzstichtag (MM-TT)"><input id="ga-bst2" value={bst} onChange={(e) => setBst(e.target.value)} className={eingabe} /></Feld>
        <Feld id="ga-stnr" label="Steuernummer"><input id="ga-stnr" value={stnr} onChange={(e) => setStnr(e.target.value)} className={eingabe} /></Feld>
        <Button type="submit" size="sm" variant="secondary" icon={Save} className="justify-self-start">Speichern</Button>
      </form>
      <div className="border-t border-ink-100 pt-4">
        <p className="mb-2 text-[13px] text-ink-600">{erpnext?.company ? `ERPNext-Company: ${erpnext.company}` : erpnext?.hinweis}</p>
        {!erpnext?.company && <Button type="button" size="sm" variant="secondary" icon={Database} onClick={erp}>In ERPNext anlegen</Button>}
      </div>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{erfolg}</ErfolgBox>
    </div>
  );
}
