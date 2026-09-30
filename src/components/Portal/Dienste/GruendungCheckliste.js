"use client";

// Checkliste der Gründung (Backoffice): Schritt für Schritt mit Status, Datum, Pflichtwerten (Notartermin, Einzahlung,
// Registernummer, UID) und Notiz. Reihenfolge und Formate prüft der Server (409/422 mit Hinweis).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, CircleDashed, Loader2, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/Portal/ui";
import { FehlerBox, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { GRUENDUNG_SCHRITT_STATUS } from "@/lib/plattform/dienste/gesellschaft/rechtsformen";

const ICON = { erledigt: CheckCircle2, in_arbeit: Loader2, entfaellt: CircleDashed, offen: Circle };
const WERT_LABEL = { registernummer: "Registernummer (FN/HRB/HRA/CHE)", betrag: "Eingezahlter Betrag", uid: "UID / USt-IdNr." };

function terminAus(s) {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function Zeile({ id, s, schreiben, onGespeichert }) {
  const [offen, setOffen] = useState(false);
  const [status, setStatus] = useState(s.status);
  const [datum, setDatum] = useState(s.datum || new Date().toISOString().slice(0, 10));
  const [wert, setWert] = useState(s.feld === "termin" ? "" : s.wert || "");
  const t0 = terminAus(s.feld === "termin" ? s.wert : "");
  const [termin, setTermin] = useState({ datum: t0.datum || "", notariat: t0.notariat || "", art: t0.art || "praesenz", ort: t0.ort || "" });
  const [notiz, setNotiz] = useState(s.notiz || "");
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const Icon = ICON[s.status] || Circle;

  async function speichern(ev) {
    ev.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      const r = await senden(`/api/admin/gesellschaften/${id}/schritt`, { body: { schluessel: s.schluessel, status, datum, notiz, wert: s.feld === "termin" ? termin : wert } });
      onGespeichert(r.gesellschaft);
      setOffen(false);
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0", s.status === "erledigt" ? "text-ov-600" : s.status === "in_arbeit" ? "text-navy-600" : "text-ink-300")} />
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">{s.label}{!s.pflicht && <span className="font-normal text-ink-500"> (optional)</span>}</p>
            <p className="text-[12.5px] leading-snug text-ink-500">{s.text}</p>
            {(s.datum || s.wert || s.notiz) && (
              <p className="mt-1 text-[12.5px] text-ink-700">
                {s.datum && `${s.datum.split("-").reverse().join(".")}`}
                {s.wert && s.feld !== "termin" && ` · ${s.wert}`}
                {s.feld === "termin" && t0.datum && ` · Termin ${t0.datum.replace("T", " ")} · ${t0.notariat || ""} (${t0.art === "video" ? "Video" : "Präsenz"})`}
                {s.notiz && ` · ${s.notiz}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge ton={GRUENDUNG_SCHRITT_STATUS[s.status]?.ton}>{GRUENDUNG_SCHRITT_STATUS[s.status]?.label}</Badge>
          {schreiben && <Button type="button" size="sm" variant="ghost" onClick={() => setOffen((o) => !o)} aria-expanded={offen}>{offen ? "Schließen" : "Bearbeiten"}</Button>}
        </div>
      </div>
      {offen && (
        <form onSubmit={speichern} className="mt-3 grid gap-2 rounded-2xl bg-ink-50 p-3 sm:grid-cols-2">
          <label className="sr-only" htmlFor={`st-${s.schluessel}`}>Status</label>
          <select id={`st-${s.schluessel}`} value={status} onChange={(e) => setStatus(e.target.value)} className={auswahlfeld}>
            {Object.entries(GRUENDUNG_SCHRITT_STATUS).filter(([k]) => k !== "entfaellt" || !s.pflicht).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
          </select>
          <input aria-label="Datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={eingabe} />
          {s.feld && s.feld !== "termin" && <input aria-label={WERT_LABEL[s.feld]} value={wert} onChange={(e) => setWert(e.target.value)} placeholder={WERT_LABEL[s.feld]} className={cn(eingabe, "sm:col-span-2")} />}
          {s.feld === "termin" && (
            <>
              <input aria-label="Termin" type="datetime-local" value={termin.datum} onChange={(e) => setTermin((t) => ({ ...t, datum: e.target.value }))} className={eingabe} />
              <input aria-label="Notariat" value={termin.notariat} onChange={(e) => setTermin((t) => ({ ...t, notariat: e.target.value }))} placeholder="Notariat" className={eingabe} />
              <select aria-label="Art des Termins" value={termin.art} onChange={(e) => setTermin((t) => ({ ...t, art: e.target.value }))} className={auswahlfeld}><option value="praesenz">Präsenz</option><option value="video">Video-Beurkundung</option></select>
              <input aria-label="Ort" value={termin.ort} onChange={(e) => setTermin((t) => ({ ...t, ort: e.target.value }))} placeholder="Ort / Link" className={eingabe} />
            </>
          )}
          <input aria-label="Notiz" value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="Notiz / Nachweis" className={cn(eingabe, "sm:col-span-2")} />
          <div className="sm:col-span-2"><FehlerBox>{fehler}</FehlerBox></div>
          <Button type="submit" size="sm" variant="navy" icon={Save} disabled={laeuft} className="justify-self-start">Speichern</Button>
        </form>
      )}
    </li>
  );
}

export default function GruendungCheckliste({ gesellschaft, schreiben }) {
  const router = useRouter();
  const [g, setG] = useState(gesellschaft);
  const gruppen = [...new Set((g.schritte || []).map((s) => s.gruppe))];
  const neu = (x) => {
    setG(x);
    router.refresh();
  };
  return (
    <div className="space-y-5">
      {gruppen.map((gr) => (
        <section key={gr} aria-label={gr}>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">{gr}</h3>
          <ul className="divide-y divide-ink-100">
            {g.schritte.filter((s) => s.gruppe === gr).map((s) => <Zeile key={`${s.schluessel}-${s.status}-${s.datum}`} id={g.id} s={s} schreiben={schreiben && g.status !== "aufgeloest"} onGespeichert={neu} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
