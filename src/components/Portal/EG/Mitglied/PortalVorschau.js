// Statische Beispielansicht des Mitgliederportals (WP6) für die öffentliche Seite /energiegemeinschaften/software.
// Werte fiktiv und als Beispiel gekennzeichnet; Aufbau wie /portal/eg/[id] (Schrittfolge, Countdown, Gemeinschaftsstrom).

import { AlarmClock, Check, Leaf, PiggyBank, Sun } from "lucide-react";

const SCHRITTE = ["Antrag", "Aufnahme", "Anmeldung", "Zustimmung", "Aktivierung", "Strom"];

export default function PortalVorschau() {
  const r = 52;
  const u = 2 * Math.PI * r;
  return (
    <div className="relative" aria-label="Beispielansicht des Mitgliederportals mit fiktiven Werten" role="img">
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_80px_-40px_rgba(3,18,43,0.55)] ring-1 ring-ink-200/70">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">Mein Portal · Beispiel</p>
          <span className="rounded-full bg-ov-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-ov-800 ring-1 ring-ov-200">Mitglied: Aktiv</span>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-ink-700">Zweiter Zählpunkt · Erzeugung</p>
            <div className="flex gap-1">{SCHRITTE.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i < 3 ? "bg-ov-500" : i === 3 ? "bg-ov-300" : "bg-ink-100"}`} />)}</div>
            <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-400">{SCHRITTE.map((s) => <span key={s}>{s}</span>)}</div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-ov-50 p-3.5 ring-1 ring-ov-200">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-600 text-white"><AlarmClock aria-hidden="true" className="h-4 w-4" /></span>
            <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink-800"><strong>Jetzt beim Netzbetreiber zustimmen</strong><br />Anleitung in 5 Schritten für Ihr Netzportal</p>
            <span className="ov-num font-display text-[22px] font-extrabold text-ink-900">9<span className="ml-0.5 text-[11px] font-medium text-ink-500">Tage</span></span>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-3xl bg-navy-950 p-4 text-white">
            <svg viewBox="0 0 128 128" className="h-24 w-24" aria-hidden="true">
              <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-white/10" />
              <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" className="text-ov-400" strokeDasharray={u} strokeDashoffset={u * 0.62} transform="rotate(-90 64 64)" />
              <text x="64" y="70" textAnchor="middle" className="fill-white font-display text-[26px] font-extrabold">38%</text>
            </svg>
            <div className="grid gap-2">
              <p className="flex items-center gap-1.5 text-[12px] text-white/70"><PiggyBank aria-hidden="true" className="h-3.5 w-3.5" /> Ersparnis dieses Jahr <strong className="ml-auto ov-num text-[15px] text-white">71,40 €</strong></p>
              <p className="flex items-center gap-1.5 text-[12px] text-white/70"><Leaf aria-hidden="true" className="h-3.5 w-3.5" /> Gemeinschaftsstrom <strong className="ml-auto ov-num text-[15px] text-white">1.180 kWh</strong></p>
              <p className="flex items-center gap-1.5 text-[12px] text-white/70"><Check aria-hidden="true" className="h-3.5 w-3.5" /> Netzentgelt reduziert <strong className="ml-auto text-[13px] text-ov-300">−57 %</strong></p>
            </div>
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-700"><Sun aria-hidden="true" className="h-3.5 w-3.5 text-sun-500" /> Morgen viel Gemeinschaftsstrom: 10–15 Uhr</p>
            <div className="relative h-5 rounded-full bg-navy-950"><span className="absolute inset-y-1 rounded-full bg-ov-400" style={{ left: "41.6%", width: "20.8%" }} /></div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[12px] text-ink-500">Beispielansicht mit fiktiven Werten</p>
    </div>
  );
}
