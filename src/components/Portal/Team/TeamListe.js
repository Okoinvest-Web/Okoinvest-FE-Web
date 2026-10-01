"use client";

// Team-Übersicht: Mitarbeiter (Backoffice-Konten ↔ HRMS-Employee), Funktion, Gebiete aus der Akquise, Abwesenheiten mit
// Vertretung, Auslastung (Termine, Aufgaben, Tickets, Signaturen). Leitung pflegt Funktion, Employee-ID, Vertretung, Kapazität.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPinned, Pencil, Plane } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";
import { FehlerBox, Feld, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { BACKOFFICE_ROLLEN } from "@/lib/plattform/rechte";

const datumKurz = (t) => String(t || "").split("-").reverse().join(".");

function Auslastung({ a }) {
  const p = Math.min(100, a.prozent);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between text-[12px] text-ink-500">
        <span>Auslastung 7 Tage</span>
        <span className={cn("ov-num font-semibold", a.ampel === "hoch" ? "text-danger-700" : "text-ink-900")}>{a.prozent} %</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={150} aria-valuenow={a.prozent} aria-label="Auslastung">
        <div className={cn("h-2 rounded-full", a.ampel === "hoch" ? "bg-sun-500" : a.ampel === "mittel" ? "bg-ov-400" : "bg-ov-500")} style={{ width: `${Math.max(3, p)}%` }} />
      </div>
      <p className="mt-1 text-[11.5px] text-ink-400">{a.stundenLast} von {a.stundenKapazitaet} Std.</p>
    </div>
  );
}

function Bearbeiten({ m, konten, onFertig }) {
  const router = useRouter();
  const [w, setW] = useState({ funktion: m.funktion, employeeId: m.employeeId, vertretungId: m.vertretung?.id || "", kapazitaetStunden: m.kapazitaetStunden });
  const [fehler, setFehler] = useState("");
  async function speichern(e) {
    e.preventDefault();
    try {
      await senden(`/api/admin/hr/mitarbeiter/${m.id}`, { method: "PATCH", body: { ...w, kapazitaetStunden: Number(w.kapazitaetStunden) } });
      onFertig();
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    }
  }
  const s = (f) => (e) => setW((x) => ({ ...x, [f]: e.target.value }));
  return (
    <form onSubmit={speichern} className="mt-3 grid gap-3 rounded-2xl bg-ink-50 p-3 sm:grid-cols-2">
      <Feld id={`f-${m.id}`} label="Funktion"><input id={`f-${m.id}`} value={w.funktion} onChange={s("funktion")} className={cn(eingabe, "h-10")} maxLength={80} /></Feld>
      <Feld id={`e-${m.id}`} label="Employee-ID (HRMS)" hinweis="z. B. HR-EMP-00001"><input id={`e-${m.id}`} value={w.employeeId} onChange={s("employeeId")} className={cn(eingabe, "h-10")} maxLength={40} /></Feld>
      <Feld id={`v-${m.id}`} label="Standard-Vertretung">
        <select id={`v-${m.id}`} value={w.vertretungId} onChange={s("vertretungId")} className={cn(auswahlfeld, "h-10")}>
          <option value="">– keine –</option>
          {konten.filter((k) => k.id !== m.id).map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
      </Feld>
      <Feld id={`k-${m.id}`} label="Wochenstunden"><input id={`k-${m.id}`} type="number" min={0} max={60} step={0.5} value={w.kapazitaetStunden} onChange={s("kapazitaetStunden")} className={cn(eingabe, "h-10")} /></Feld>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm">Speichern</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onFertig}>Abbrechen</Button>
      </div>
      <div className="sm:col-span-2"><FehlerBox>{fehler}</FehlerBox></div>
    </form>
  );
}

export default function TeamListe({ mitarbeiter = [], darfBearbeiten = false }) {
  const [edit, setEdit] = useState(null);
  const konten = mitarbeiter.map((m) => ({ id: m.id, name: m.name }));
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {mitarbeiter.map((m) => (
        <li key={m.id} className="min-w-0 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                {m.name}
                {m.ich && <Badge ton="info">Sie</Badge>}
                {m.abwesendHeute && <Badge ton="warn"><Plane aria-hidden="true" className="h-3 w-3" /> abwesend</Badge>}
              </p>
              <p className="truncate text-[13px] text-ink-500">{m.funktion || "–"} · {m.backofficeRollen.map((r) => BACKOFFICE_ROLLEN[r]?.label || r).join(", ")}</p>
              <p className="truncate text-[12.5px] text-ink-400">{m.email}{m.employeeId ? ` · ${m.employeeId}` : ""}</p>
            </div>
            {darfBearbeiten && (
              <button type="button" onClick={() => setEdit(edit === m.id ? null : m.id)} className="rounded-full p-2 text-ink-500 hover:bg-ink-100" aria-label={`${m.name} bearbeiten`}>
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Auslastung a={m.auslastung} />
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
              <dt className="text-ink-500">Termine</dt><dd className="ov-num text-ink-900">{m.last.termine}</dd>
              <dt className="text-ink-500">Aufgaben</dt><dd className="ov-num text-ink-900">{m.last.aufgabenOffen}</dd>
              <dt className="text-ink-500">Tickets</dt><dd className="ov-num text-ink-900">{m.last.ticketsOffen}</dd>
              <dt className="text-ink-500">Std. Monat</dt><dd className="ov-num text-ink-900">{String(m.stundenMonat).replace(".", ",")}</dd>
            </dl>
          </div>
          {m.gebiete.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-600">
              <MapPinned aria-hidden="true" className="h-3.5 w-3.5 text-ov-600" />
              {m.gebiete.map((g) => <span key={g.id} className="rounded-full bg-ov-50 px-2 py-0.5 text-ov-800">{g.name}</span>)}
            </p>
          )}
          <p className="mt-2 text-[12.5px] text-ink-600">Vertretung: {m.vertretung?.name || "–"}</p>
          {m.abwesenheiten.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[12.5px] text-ink-600">
              {m.abwesenheiten.map((a) => <li key={a.id}>{a.artLabel} {datumKurz(a.von)}–{datumKurz(a.bis)}{a.vertretung ? ` · vertreten durch ${a.vertretung.name}` : ""}</li>)}
            </ul>
          )}
          {edit === m.id && <Bearbeiten m={m} konten={konten} onFertig={() => setEdit(null)} />}
        </li>
      ))}
    </ul>
  );
}
