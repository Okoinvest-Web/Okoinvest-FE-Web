"use client";

// Abwesenheit eintragen (→ automatische Vertretung) und Zeiterfassung auf Projekte (Schnittstelle Projektentwicklung/Finanzen).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plane, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { ABWESENHEIT_ARTEN, TAETIGKEITEN } from "@/lib/plattform/hr";

const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });

export function AbwesenheitFormular({ konten = [], ichId, darfAndere = false }) {
  const router = useRouter();
  const [w, setW] = useState({ mitarbeiterId: ichId, von: heute(), bis: heute(), art: "urlaub", vertretungId: "" });
  const [fehler, setFehler] = useState("");
  const [info, setInfo] = useState("");
  const s = (f) => (e) => setW((x) => ({ ...x, [f]: e.target.value }));
  async function speichern(e) {
    e.preventDefault();
    setFehler("");
    setInfo("");
    try {
      const r = await senden("/api/admin/hr/abwesenheiten", { body: { ...w, vertretungId: w.vertretungId || undefined } });
      const v = r.vertretung || {};
      setInfo(`Eingetragen. Vertretung übernommen: ${v.termine || 0} Termine, ${v.aufgaben || 0} Aufgaben, ${v.tickets || 0} Tickets${v.hinweis ? " – Hinweis-Aufgabe für offene Zuweisungen angelegt" : ""}.`);
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    }
  }
  return (
    <form onSubmit={speichern} className="space-y-3">
      {darfAndere && (
        <Feld id="ab-ma" label="Mitarbeiter">
          <select id="ab-ma" value={w.mitarbeiterId} onChange={s("mitarbeiterId")} className={auswahlfeld}>
            {konten.map((k) => <option key={k.id} value={k.id}>{k.name}{k.id === ichId ? " (ich)" : ""}</option>)}
          </select>
        </Feld>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Feld id="ab-von" label="Von"><input id="ab-von" type="date" value={w.von} onChange={s("von")} className={eingabe} required /></Feld>
        <Feld id="ab-bis" label="Bis"><input id="ab-bis" type="date" value={w.bis} min={w.von} onChange={s("bis")} className={eingabe} required /></Feld>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld id="ab-art" label="Art">
          <select id="ab-art" value={w.art} onChange={s("art")} className={auswahlfeld}>
            {Object.entries(ABWESENHEIT_ARTEN).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
        </Feld>
        <Feld id="ab-vt" label="Vertretung" hinweis="leer = Standard-Vertretung">
          <select id="ab-vt" value={w.vertretungId} onChange={s("vertretungId")} className={auswahlfeld}>
            <option value="">Standard</option>
            {konten.filter((k) => k.id !== w.mitarbeiterId).map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </Feld>
      </div>
      <Button type="submit" size="sm" icon={Plane}>Abwesenheit eintragen</Button>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{info}</ErfolgBox>
    </form>
  );
}

export function Zeiterfassung({ projekte = [], eintraege = [], summe = 0, monat }) {
  const router = useRouter();
  const [w, setW] = useState({ datum: heute(), stunden: "1", projektId: projekte[0]?.id || "", taetigkeit: "planung", text: "" });
  const [fehler, setFehler] = useState("");
  const s = (f) => (e) => setW((x) => ({ ...x, [f]: e.target.value }));
  async function speichern(e) {
    e.preventDefault();
    setFehler("");
    try {
      await senden("/api/admin/hr/zeiten", { body: { ...w, stunden: Number(String(w.stunden).replace(",", ".")) } });
      setW((x) => ({ ...x, text: "" }));
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    }
  }
  async function loeschen(id) {
    try {
      await senden(`/api/admin/hr/zeiten/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    }
  }
  return (
    <div className="space-y-5">
      <form onSubmit={speichern} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[140px_100px_minmax(0,1fr)_minmax(0,1fr)]">
        <Feld id="ze-d" label="Datum"><input id="ze-d" type="date" value={w.datum} max={heute()} onChange={s("datum")} className={cn(eingabe, "h-11")} required /></Feld>
        <Feld id="ze-h" label="Stunden"><input id="ze-h" inputMode="decimal" value={w.stunden} onChange={s("stunden")} className={cn(eingabe, "h-11")} required /></Feld>
        <Feld id="ze-p" label="Projekt">
          <select id="ze-p" value={w.projektId} onChange={s("projektId")} className={cn(auswahlfeld, "h-11")} required>
            {projekte.map((p) => <option key={p.id} value={p.id}>{p.titel}</option>)}
          </select>
        </Feld>
        <Feld id="ze-t" label="Tätigkeit">
          <select id="ze-t" value={w.taetigkeit} onChange={s("taetigkeit")} className={cn(auswahlfeld, "h-11")}>
            {Object.entries(TAETIGKEITEN).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
        </Feld>
        <Feld id="ze-x" label="Notiz (optional)" className="sm:col-span-2 xl:col-span-3"><input id="ze-x" value={w.text} onChange={s("text")} className={cn(eingabe, "h-11")} maxLength={200} /></Feld>
        <div className="flex items-end"><Button type="submit" size="sm" icon={Clock} className="w-full">Erfassen</Button></div>
      </form>
      <FehlerBox>{fehler}</FehlerBox>
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Meine Einträge {monat} · <span className="ov-num">{String(summe).replace(".", ",")} Std.</span></p>
        {eintraege.length ? (
          <ul className="divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-100">
            {eintraege.slice(0, 12).map((z) => (
              <li key={z.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[13.5px]">
                <span className="min-w-0">
                  <span className="ov-num font-semibold text-ink-900">{String(z.stunden).replace(".", ",")} h</span> · {z.datum.split("-").reverse().join(".")} · <span className="text-ink-600">{z.projektTitel}</span>
                  <span className="block truncate text-[12px] text-ink-500">{z.taetigkeitLabel}{z.text ? ` · ${z.text}` : ""}</span>
                </span>
                {!z.timesheet && <button type="button" onClick={() => loeschen(z.id)} className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Eintrag löschen"><Trash2 className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        ) : <p className="text-[13px] text-ink-500">Noch keine Einträge in diesem Monat.</p>}
      </div>
    </div>
  );
}
