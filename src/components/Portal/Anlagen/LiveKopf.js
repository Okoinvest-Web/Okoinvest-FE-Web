"use client";

// Live-Kopf einer Anlage: Server-Sent Events von /api/portal/anlagen/[id]/live (Rechte prüft der Server),
// aktuelle Werte, Energiefluss PV → Verbrauch/Speicher/Netz, „Stand vor x s“ und deutliche Markierung
// veralteter Daten (> 90 s ohne neue Messung). Animation respektiert prefers-reduced-motion.

import { useEffect, useRef, useState } from "react";
import { BatteryCharging, Building2, CircleAlert, Sun, UtilityPole, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { GRENZWERTE, kw } from "@/lib/plattform/anlagen";
import { alterText } from "./teile";

const WR_TEXT = { ok: "Wechselrichter in Betrieb", warnung: "Wechselrichter meldet Warnung", stoerung: "Wechselrichter-Störung", aus: "Wechselrichter im Nachtbetrieb" };

export default function LiveKopf({ anlage, initial }) {
  const [live, setLive] = useState(initial || null);
  const [verbindung, setVerbindung] = useState("verbinde");
  const [jetzt, setJetzt] = useState(null); // erst nach dem Laden (sonst Hydration-Abweichung)
  const quelle = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("EventSource" in window)) return undefined;
    const es = new EventSource(`/api/portal/anlagen/${anlage.id}/live`);
    quelle.current = es;
    es.addEventListener("open", () => setVerbindung("live"));
    es.addEventListener("messwert", (e) => {
      try {
        const w = JSON.parse(e.data);
        if (w) setLive(w);
        setVerbindung("live");
      } catch {
        /* ungültiges Telegramm ignorieren */
      }
    });
    es.addEventListener("error", () => setVerbindung(es.readyState === 2 ? "getrennt" : "verbinde"));
    setJetzt(Date.now());
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => {
      es.close();
      clearInterval(t);
    };
  }, [anlage.id]);

  const alterS = live?.ts ? ((jetzt ?? new Date(live.ts).getTime()) - new Date(live.ts).getTime()) / 1000 : Infinity;
  const veraltet = alterS > GRENZWERTE.veraltetSekunden;
  const pv = Number(live?.pvKw) || 0;
  const last = Number(live?.verbrauchKw) || 0;
  const netz = Number(live?.netzKw) || 0;
  const sp = live?.speicherKw == null ? null : Number(live.speicherKw);
  const soc = live?.speicherSocPct;
  const mitSpeicher = anlage.speicherKwh > 0;
  const mitPv = anlage.kwp > 0;

  return (
    <section aria-label="Live-Werte" className="overflow-hidden rounded-3xl bg-navy-950 text-white ring-1 ring-navy-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5 md:px-6">
        <p className="flex items-center gap-2 text-[13px] font-semibold">
          {verbindung === "live" && !veraltet ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-ov-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ov-400" />
              </span>
              Live
            </>
          ) : verbindung === "getrennt" ? (
            <>
              <WifiOff aria-hidden="true" className="h-4 w-4 text-white/60" /> Live-Verbindung getrennt
            </>
          ) : (
            <>
              <Wifi aria-hidden="true" className="h-4 w-4 text-white/60" /> {verbindung === "live" ? "Verbunden" : "Verbinde …"}
            </>
          )}
        </p>
        <p className={cn("text-[13px]", veraltet ? "font-semibold text-sun-300" : "text-white/60")} aria-live="polite">
          {live?.ts ? (jetzt ? `Stand ${alterText(live.ts, jetzt)}` : "") : "Noch keine Messwerte"}
          {live?.quelle === "simulator" && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70">simuliert</span>}
        </p>
      </div>

      {veraltet && live?.ts && (
        <p role="alert" className="flex items-start gap-2 bg-sun-400/15 px-5 py-3 text-[13.5px] text-sun-300 ring-1 ring-inset ring-sun-400/30 md:px-6">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Daten veraltet – die letzte Messung ist {alterText(live.ts, jetzt).replace("vor ", "")} alt. Die Werte unten zeigen den letzten bekannten Stand.
        </p>
      )}

      <div className={cn("grid gap-px bg-white/10", mitSpeicher ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3")}>
        {mitPv && <LiveWert label="PV-Leistung" wert={kw(pv)} zusatz={anlage.kwp ? `${Math.round((pv / anlage.kwp) * 100)} % der Nennleistung` : ""} veraltet={veraltet} />}
        <LiveWert label="Verbrauch vor Ort" wert={kw(last)} zusatz={mitPv && last > 0 ? `${Math.round((Math.min(pv, last) / last) * 100)} % direkt aus PV` : ""} veraltet={veraltet} />
        <LiveWert label={netz >= 0 ? "Netzbezug" : "Einspeisung"} wert={kw(Math.abs(netz))} zusatz={netz >= 0 ? "aus dem Netz" : "ins Netz"} veraltet={veraltet} />
        {mitSpeicher && <LiveWert label="Speicher" wert={soc == null ? "–" : `${Math.round(soc)} %`} zusatz={sp == null ? "" : sp > 0.5 ? `lädt mit ${kw(sp)}` : sp < -0.5 ? `entlädt mit ${kw(-sp)}` : "Ruhe"} veraltet={veraltet} />}
      </div>

      <Energiefluss pv={mitPv ? pv : null} last={last} netz={netz} speicher={mitSpeicher ? sp : null} soc={soc} veraltet={veraltet} />

      {mitPv && live && (
        <p className={cn("border-t border-white/10 px-5 py-3 text-[12.5px] md:px-6", live.wechselrichterStatus === "stoerung" ? "text-sun-300" : "text-white/60")}>
          {WR_TEXT[live.wechselrichterStatus] || "Wechselrichter-Status unbekannt"}
          {live.fehlercode ? ` · Fehlercode ${live.fehlercode}` : ""}
          {live.erwartetKw != null && live.erwartetKw > 0 ? ` · Erwartung jetzt rund ${kw(live.erwartetKw)}` : ""}
        </p>
      )}
    </section>
  );
}

function LiveWert({ label, wert, zusatz, veraltet }) {
  return (
    <div className="min-w-0 bg-navy-950 px-5 py-4 md:px-6">
      <p className="text-[12.5px] font-medium text-white/60">{label}</p>
      <p className={cn("ov-num mt-1 truncate font-display text-[24px] font-extrabold leading-tight tracking-tight md:text-[28px]", veraltet ? "text-white/45" : "text-white")}>{wert}</p>
      {zusatz && <p className="mt-0.5 truncate text-[12px] text-white/55">{zusatz}</p>}
    </div>
  );
}

/** Energiefluss: Knoten PV, Speicher, Verbrauch, Netz um einen Mittelpunkt, Linienbreite ∝ Leistung, Laufrichtung = Flussrichtung */
function Energiefluss({ pv, last, netz, speicher, soc, veraltet }) {
  const max = Math.max(1, pv || 0, last || 0, Math.abs(netz || 0), Math.abs(speicher || 0));
  const breite = (w) => 2 + 8 * Math.sqrt(Math.min(1, Math.abs(w) / max));
  const P = { pv: [70, 60], speicher: [70, 220], last: [530, 60], netz: [530, 220], mitte: [300, 140] };
  const linie = (von, nach) => `M${von[0]},${von[1]} C${(von[0] + nach[0]) / 2},${von[1]} ${(von[0] + nach[0]) / 2},${nach[1]} ${nach[0]},${nach[1]}`;
  const fluesse = [
    pv != null && { id: "pv", d: linie(P.pv, P.mitte), w: pv, rueck: false },
    speicher != null && { id: "speicher", d: linie(P.speicher, P.mitte), w: speicher, rueck: speicher > 0 },
    { id: "last", d: linie(P.mitte, P.last), w: last, rueck: false },
    { id: "netz", d: linie(P.netz, P.mitte), w: netz, rueck: netz < 0 },
  ].filter(Boolean);
  const knoten = [
    pv != null && { id: "pv", xy: P.pv, icon: Sun, label: "PV", wert: kw(pv) },
    speicher != null && { id: "speicher", xy: P.speicher, icon: BatteryCharging, label: soc != null ? `Speicher ${Math.round(soc)} %` : "Speicher", wert: kw(Math.abs(speicher)) },
    { id: "last", xy: P.last, icon: Building2, label: "Verbrauch", wert: kw(last) },
    { id: "netz", xy: P.netz, icon: UtilityPole, label: netz >= 0 ? "Netzbezug" : "Einspeisung", wert: kw(Math.abs(netz)) },
  ].filter(Boolean);
  const text = `Energiefluss: ${pv != null ? `PV ${kw(pv)}, ` : ""}Verbrauch ${kw(last)}, ${netz >= 0 ? "Netzbezug" : "Einspeisung"} ${kw(Math.abs(netz))}${speicher != null ? `, Speicher ${speicher > 0 ? "lädt" : speicher < 0 ? "entlädt" : "ruht"}` : ""}.`;

  return (
    <figure className="mx-auto w-full max-w-[640px] px-8 py-8 sm:px-10" aria-label={text} role="img">
      <div className="relative">
      <style>{`
        @keyframes anl-fluss { to { stroke-dashoffset: -32; } }
        @keyframes anl-fluss-rueck { to { stroke-dashoffset: 32; } }
        .anl-fluss { animation: anl-fluss 1.1s linear infinite; }
        .anl-fluss-rueck { animation: anl-fluss-rueck 1.1s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .anl-fluss, .anl-fluss-rueck { animation: none; } }
      `}</style>
      <svg viewBox="0 0 600 280" className="block h-auto w-full" aria-hidden="true">
        {fluesse.map((f) => {
          const aktiv = Math.abs(f.w) > 0.05 && !veraltet;
          return (
            <g key={f.id}>
              <path d={f.d} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={breite(f.w) + 4} strokeLinecap="round" />
              <path
                d={f.d}
                fill="none"
                stroke={f.id === "netz" && f.w > 0 ? "#7fa7d6" : f.id === "speicher" ? "#ffc53d" : "#8cba58"}
                strokeWidth={aktiv ? breite(f.w) : 1.5}
                strokeLinecap="round"
                strokeDasharray={aktiv ? "10 6" : "2 6"}
                opacity={aktiv ? 0.95 : 0.35}
                className={aktiv ? (f.rueck ? "anl-fluss-rueck" : "anl-fluss") : ""}
              />
            </g>
          );
        })}
        <circle cx={P.mitte[0]} cy={P.mitte[1]} r="9" fill="#03122b" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      </svg>
      {knoten.map((k) => {
        const Icon = k.icon;
        return (
          <div
            key={k.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
            style={{ left: `${(k.xy[0] / 600) * 100}%`, top: `${(k.xy[1] / 280) * 100}%` }}
          >
            <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-white/15 md:h-12 md:w-12", k.id === "pv" ? "bg-ov-600" : k.id === "speicher" ? "bg-sun-400 text-navy-950" : "bg-white/10")}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="mt-1 whitespace-nowrap text-[11.5px] text-white/65">{k.label}</span>
            <span className={cn("ov-num whitespace-nowrap text-[13px] font-bold", veraltet ? "text-white/45" : "text-white")}>{k.wert}</span>
          </div>
        );
      })}
      </div>
    </figure>
  );
}
