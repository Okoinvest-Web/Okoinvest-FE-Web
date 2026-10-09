"use client";

// „Energie heute“ – Energiefluss Sonne → Gemeinschaft → Zuhause (T6, Design-System 2.0).
// Reines HTML/CSS (keine Messlogik): Knoten mit Lucide-Icons, Verbindungen als gestrichelte Leitung, über die kleine
// Stromteilchen per transform wandern. Aktiv nur, solange laut Prognose gerade viel Gemeinschaftsstrom fließt
// („jetzt“-Zustand clientseitig nach dem Mounten, damit Server-HTML und Hydration übereinstimmen).
// prefers-reduced-motion: Teilchen ausgeblendet, Leitung bleibt stehen.

import { useEffect, useState } from "react";
import { House, Sun, UsersRound } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useSprache } from "@/components/Sprache/SpracheKontext";

const minuten = (hhmm) => {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const uhr = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * Zustand „jetzt“ aus den grünen Stunden von heute.
 * @returns {{status:"gruen"|"bald"|"ruhe"|"unbekannt", fenster?:object, minuteJetzt?:number}}
 */
export function useJetzt(stunden, heute) {
  const [jetzt, setJetzt] = useState({ status: "unbekannt" });
  useEffect(() => {
    const tag = stunden?.tage?.find((t) => t.datum === heute) || null;
    const berechne = () => {
      const d = new Date();
      const lokal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const m = d.getHours() * 60 + d.getMinutes();
      if (!tag || lokal !== heute) return { status: "unbekannt", minuteJetzt: m };
      const aktiv = tag.fenster.find((f) => m >= minuten(f.von) && m < minuten(f.bis));
      if (aktiv) return { status: "gruen", fenster: aktiv, minuteJetzt: m };
      const naechstes = tag.fenster.filter((f) => minuten(f.von) > m).sort((a, b) => minuten(a.von) - minuten(b.von))[0];
      return naechstes ? { status: "bald", fenster: naechstes, minuteJetzt: m } : { status: "ruhe", minuteJetzt: m };
    };
    setJetzt(berechne());
    const t = setInterval(() => setJetzt(berechne()), 60000);
    return () => clearInterval(t);
  }, [stunden, heute]);
  return jetzt;
}

export function jetztText(j) {
  if (j.status === "gruen") return { titel: "Jetzt viel Gemeinschaftsstrom", text: `laut Prognose bis ${j.fenster.bis} Uhr – ein guter Moment für Waschmaschine, Geschirrspüler oder E-Auto.` };
  if (j.status === "bald") return { titel: `Nächste grüne Stunde ab ${j.fenster.von} Uhr`, text: `laut Prognose bis ${j.fenster.bis} Uhr – große Verbraucher am besten dann starten.` };
  if (j.status === "ruhe") return { titel: "Heute keine grüne Stunde mehr", text: "Die Anlagen der Gemeinschaft ruhen – morgen geht es weiter." };
  return { titel: "Ihr Strom aus der Region", text: "Sonnenstrom der Gemeinschaft fließt über das öffentliche Netz direkt zu Ihnen." };
}

function Knoten({ icon: Icon, titel, wert, ton = "hell", aktiv, kompakt }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <span
        className={cn(
          kompakt ? "relative flex h-10 w-10 items-center justify-center rounded-xl ring-1" : "relative flex h-14 w-14 items-center justify-center rounded-2xl ring-1 md:h-16 md:w-16",
          ton === "sonne" && "bg-sun-300/15 text-sun-300 ring-sun-300/30",
          ton === "marke" && "bg-ov-600 text-white ring-ov-400/40",
          ton === "hell" && "bg-white/10 text-white ring-white/15"
        )}
      >
        {aktiv && ton === "sonne" && <span aria-hidden="true" className="absolute inset-0 rounded-2xl bg-sun-300/20 motion-safe:animate-[ov-ping_2.4s_var(--ov-ease-out)_infinite]" />}
        <Icon aria-hidden="true" className={kompakt ? "relative h-5 w-5" : "relative h-6 w-6 md:h-7 md:w-7"} strokeWidth={1.8} />
      </span>
      <span className={kompakt ? "mt-1.5 max-w-[5.5rem] truncate text-[10.5px] font-semibold text-white" : "mt-2 max-w-[8.5rem] truncate text-[12.5px] font-semibold text-white"}>{titel}</span>
      {wert && <span className={kompakt ? "ov-num max-w-[5.5rem] truncate text-[10px] text-white/75" : "ov-num max-w-[8.5rem] truncate text-[12px] text-white/75"}>{wert}</span>}
    </div>
  );
}

/** Leitung mit wandernden Teilchen (nur transform/opacity). */
function Leitung({ aktiv, label, kompakt }) {
  return (
    <div className={kompakt ? "relative mx-0.5 mt-2 h-6 min-w-[1.5rem] flex-1 overflow-hidden" : "relative mx-1 mt-4 h-6 min-w-[2rem] flex-1 overflow-hidden md:mx-3 md:mt-5"} aria-hidden="true" title={label}>
      <span className="absolute inset-x-0 top-1/2 h-0 -translate-y-1/2 border-t-2 border-dashed border-ov-300/45" />
      {aktiv &&
        [0, 1, 2].map((i) => (
          <span key={i} className="eg-fluss-teilchen absolute inset-0" style={{ animationDelay: `${i * 0.6}s` }}>
            <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-full -translate-y-1/2 rounded-full bg-ov-300 shadow-[0_0_10px_2px_rgba(174,208,131,0.55)]" />
          </span>
        ))}
    </div>
  );
}

/**
 * gemeinschaftName  Name der Gemeinschaft
 * ausGemeinschaft   kWh aus der Gemeinschaft (gewählter Zeitraum)
 * eingebracht       kWh eigener Erzeugung in die Gemeinschaft (nur bei Erzeugern)
 * aktiv             Teilchen laufen (jetzt grüne Stunde oder Werte vorhanden)
 */
export default function EnergieFluss({ gemeinschaftName: nameProp, ausGemeinschaft, eingebracht, aktiv = true, zeitraumText = "", kompakt = false }) {
  // Sprachmodell: im Portal immer Deutsch; auf der öffentlichen Produktseite (/en/…) englisch
  const en = useSprache() === "en";
  const gemeinschaftName = nameProp ?? (en ? "Community" : "Gemeinschaft");
  const aria = en
    ? `Energy flow${zeitraumText ? ` ${zeitraumText}` : ""}: solar power from the installations flows via ${gemeinschaftName} to you${ausGemeinschaft ? `, ${ausGemeinschaft} from the community` : ""}${eingebracht ? `; you contributed ${eingebracht}` : ""}.`
    : `Energiefluss${zeitraumText ? ` ${zeitraumText}` : ""}: Sonnenstrom der Anlagen fließt über ${gemeinschaftName} zu Ihnen${ausGemeinschaft ? `, ${ausGemeinschaft} aus der Gemeinschaft` : ""}${eingebracht ? `; Sie haben ${eingebracht} eingebracht` : ""}.`;
  return (
    <figure className="m-0" aria-label={aria} role="img">
      <div className="flex items-start justify-between">
        <Knoten icon={Sun} titel={kompakt ? "Region" : en ? "Installations in the region" : "Anlagen der Region"} wert={eingebracht ? (en ? `incl. your ${eingebracht}` : `inkl. Ihrer ${eingebracht}`) : en ? "Solar power" : "Sonnenstrom"} ton="sonne" aktiv={aktiv} kompakt={kompakt} />
        <Leitung aktiv={aktiv} label={en ? "Generation to the community" : "Erzeugung zur Gemeinschaft"} kompakt={kompakt} />
        <Knoten icon={UsersRound} titel={gemeinschaftName} wert={en ? "shares fairly" : "verteilt fair"} ton="marke" kompakt={kompakt} />
        <Leitung aktiv={aktiv} label={en ? "Community to you" : "Gemeinschaft zu Ihnen"} kompakt={kompakt} />
        <Knoten icon={House} titel={en ? "Your home" : "Ihr Zuhause"} wert={ausGemeinschaft || "–"} kompakt={kompakt} />
      </div>
      <style>{`
        @keyframes eg-fluss { 0% { transform: translate3d(0,0,0); opacity: 0; } 12% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translate3d(100%,0,0); opacity: 0; } }
        .eg-fluss-teilchen { opacity: 0; animation: eg-fluss 1.8s cubic-bezier(.65,0,.35,1) infinite; }
        @media (prefers-reduced-motion: reduce) { .eg-fluss-teilchen { animation: none !important; opacity: 0 !important; } }
      `}</style>
    </figure>
  );
}

/** „Jetzt“-Marke auf dem Zeitstrahl der grünen Stunden – erst nach dem Mounten (lokale Uhrzeit), blendet weich ein. */
export function JetztMarke({ datum }) {
  const [m, setM] = useState(null);
  useEffect(() => {
    const lese = () => {
      const d = new Date();
      const lokal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setM(lokal === datum ? d.getHours() * 60 + d.getMinutes() : null);
    };
    lese();
    const t = setInterval(lese, 60000);
    return () => clearInterval(t);
  }, [datum]);
  if (m === null) return null;
  return (
    <span aria-hidden="true" className="animate-ov-einblenden absolute -inset-y-1 w-0" style={{ left: `${(m / 1440) * 100}%` }}>
      <span className="absolute inset-y-0 -left-px w-0.5 rounded-full bg-navy-700" />
      <span className="absolute -top-5 left-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy-700 px-1.5 py-px text-[11px] font-semibold text-white">jetzt {uhr(m)}</span>
    </span>
  );
}

export { uhr, minuten };
