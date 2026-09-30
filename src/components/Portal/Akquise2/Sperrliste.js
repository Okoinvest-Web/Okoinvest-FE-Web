"use client";

// src/components/Portal/Akquise2/Sperrliste.js – Sperrliste der Flächenakquise (Widerspruch → nie wieder anschreiben).
// Gespeichert sind nur Abgleichswerte (Hash aus Name + PLZ bzw. Flurstück) und eine maskierte Anzeige.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Karte, Leer, Tabelle, zelle } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { SPERR_GRUENDE, SPERR_QUELLEN } from "@/lib/plattform/akquise-kampagne";
import { datum, knopf } from "./teile";
import { ShieldBan } from "lucide-react";

export default function Sperrliste({ eintraege = [], darfSchreiben = false, leitung = false }) {
  const router = useRouter();
  const [f, setF] = useState({ vorname: "", nachname: "", firma: "", plz: "", land: "DE", grund: "widerspruch", quelle: "brief", notiz: "" });
  const [status, setStatus] = useState({ fehler: "", ok: "", laeuft: false });
  async function los(fn, ok) {
    setStatus({ fehler: "", ok: "", laeuft: true });
    try {
      await fn();
      setStatus({ fehler: "", ok, laeuft: false });
      router.refresh();
    } catch (e) {
      setStatus({ fehler: e.message, ok: "", laeuft: false });
    }
  }
  return (
    <div className="space-y-5">
      {darfSchreiben && (
        <Karte titel="Widerspruch erfassen" untertitel="Für Widersprüche per Brief, Telefon oder E-Mail von Personen, die (noch) keiner Kampagne zugeordnet sind. Abgleich über Vor- und Nachname (bzw. Firma) + PLZ.">
          <form className="grid gap-2 sm:grid-cols-6" onSubmit={(e) => { e.preventDefault(); los(() => senden("/api/admin/geodaten/sperrliste", { body: { person: { vorname: f.vorname, nachname: f.nachname, firma: f.firma, plz: f.plz }, land: f.land, grund: f.grund, quelle: f.quelle, notiz: f.notiz } }), "Gesperrt – gilt sofort für alle Kampagnen."); }}>
            <input aria-label="Vorname" placeholder="Vorname" value={f.vorname} onChange={(e) => setF({ ...f, vorname: e.target.value })} className={cn(eingabe, "h-10 sm:col-span-2")} />
            <input aria-label="Nachname" placeholder="Nachname" value={f.nachname} onChange={(e) => setF({ ...f, nachname: e.target.value })} className={cn(eingabe, "h-10 sm:col-span-2")} />
            <input aria-label="PLZ" placeholder="PLZ" required value={f.plz} onChange={(e) => setF({ ...f, plz: e.target.value })} className={cn(eingabe, "h-10 sm:col-span-2")} />
            <input aria-label="Firma" placeholder="oder Firma" value={f.firma} onChange={(e) => setF({ ...f, firma: e.target.value })} className={cn(eingabe, "h-10 sm:col-span-2")} />
            <select aria-label="Grund" value={f.grund} onChange={(e) => setF({ ...f, grund: e.target.value })} className={cn(auswahlfeld, "h-10 sm:col-span-2")}>{Object.entries(SPERR_GRUENDE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <select aria-label="Eingang" value={f.quelle} onChange={(e) => setF({ ...f, quelle: e.target.value })} className={cn(auswahlfeld, "h-10 sm:col-span-2")}>{Object.entries(SPERR_QUELLEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <input aria-label="Notiz" placeholder="Notiz (ohne weitere Personendaten)" value={f.notiz} onChange={(e) => setF({ ...f, notiz: e.target.value })} className={cn(eingabe, "h-10 sm:col-span-4")} />
            <button type="submit" className={cn(knopf.gefahr, "h-10 sm:col-span-2")} disabled={status.laeuft}><ShieldBan className="h-4 w-4" aria-hidden="true" /> Sperren</button>
          </form>
        </Karte>
      )}
      <FehlerBox>{status.fehler}</FehlerBox>
      <ErfolgBox>{status.ok}</ErfolgBox>
      {eintraege.length === 0 ? (
        <Leer icon={ShieldBan} titel="Keine Sperrvermerke" text="Widersprüche aus Kampagnen, von der Angebotsseite oder manuell erfasst erscheinen hier." />
      ) : (
        <Karte titel={`Sperrvermerke (${eintraege.filter((x) => x.aktiv).length} aktiv)`} innen="px-5 pb-2 md:px-6">
          <Tabelle kopf={["Person", "Grund", "Eingang", "Flurstücke", "Datum", ""]}>
            {eintraege.map((s) => (
              <tr key={s.id} className={s.aktiv ? "" : "opacity-50"}>
                <td className={zelle}><span className="font-semibold text-ink-900">{s.anzeige}</span><span className="block text-[12px] text-ink-500">{s.id}{s.kampagneId ? ` · ${s.kampagneId}` : ""}</span></td>
                <td className={zelle}>{s.grundLabel}{s.notiz ? <span className="block text-[12px] text-ink-500">{s.notiz}</span> : null}</td>
                <td className={zelle}>{s.quelleLabel}<span className="block text-[12px] text-ink-500">{s.von}</span></td>
                <td className={zelle}>{s.flurstuecke}</td>
                <td className={zelle}>{datum(s.am)}</td>
                <td className={zelle}>
                  {!s.aktiv ? <Badge>aufgehoben</Badge> : leitung && darfSchreiben ? (
                    <button type="button" className={knopf.klein} onClick={() => { const b = window.prompt("Nur bei irrtümlicher Erfassung aufheben. Begründung (mind. 10 Zeichen):"); if (b) los(() => senden(`/api/admin/geodaten/sperrliste/${s.id}`, { method: "DELETE", body: { begruendung: b } }), "Sperre aufgehoben."); }}>Aufheben</button>
                  ) : <Badge ton="warn">aktiv</Badge>}
                </td>
              </tr>
            ))}
          </Tabelle>
        </Karte>
      )}
    </div>
  );
}
