"use client";

// src/components/Projekte/ParkLiveDemo.js – Demo-Live-Ansicht des Gläsernen Solarparks (Welle 4)
//
// Zeigt die DEMO-Erzeugung des Beispielparks: aktuelle Leistung, Tagessumme und Tagesverlauf
// aus dem deterministischen Demo-Modell (src/lib/projekte/glaesernerPark.js). KEINE echten
// Messdaten – deshalb überall das Entwurfs-Badge „Beispieldaten – echte Parkdaten folgen“
// und die Beschriftung „Demo“ statt „Live“. Erst nach Mount wird die Uhrzeit gelesen
// (kein Hydration-Versatz), danach Aktualisierung jede Minute.

import { useEffect, useState } from "react";
import { Clock, Sun, Zap } from "lucide-react";
import Sparkline from "@/components/ui/Sparkline";
import Badge from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { fmtZahl } from "@/lib/sprache/format";
import { demoLeistungKw, demoTagesMwh, demoTagesverlauf } from "@/lib/projekte/glaesernerPark";

const TEXTE = {
  de: {
    sprache: "de",
    badge: "Beispieldaten – echte Parkdaten folgen",
    titel: "Erzeugung heute · Demo-Modell",
    jetzt: "Leistung jetzt",
    heute: "heute bisher",
    anteil: (p) => `${p} % der Parkleistung`,
    verlauf: "Tagesverlauf im Demo-Modell",
    verlaufLabel: "Demo-Tagesverlauf der Erzeugung von 0 bis 24 Uhr",
    stand: (u) => `Demo-Modell · Stand ${u} Uhr`,
    laedt: "Demo-Ansicht wird geladen …",
    nacht: "Nacht – der Park erzeugt gerade keinen Strom.",
  },
  en: {
    sprache: "en",
    badge: "Example data – real park data to follow",
    titel: "Generation today · demo model",
    jetzt: "Output now",
    heute: "so far today",
    anteil: (p) => `${p} % of park capacity`,
    verlauf: "Daily curve, demo model",
    verlaufLabel: "Demo daily generation curve from midnight to midnight",
    stand: (u) => `Demo model · as of ${u}`,
    laedt: "Loading the demo view …",
    nacht: "Night – the park is not generating right now.",
  },
};

export default function ParkLiveDemo({ park, dunkel = true, className }) {
  const w = useTexte(TEXTE);
  const [jetzt, setJetzt] = useState(null);

  useEffect(() => {
    setJetzt(new Date());
    const t = setInterval(() => setJetzt(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const rahmen = cn(
    "rounded-[2rem] p-6 ring-1 sm:p-7",
    dunkel ? "ov-glass text-white ring-white/15" : "bg-white text-ink-900 ring-ink-200/70 shadow-e2",
    className
  );

  if (!jetzt) {
    return (
      <div className={rahmen} role="status" aria-live="polite">
        <Badge ton={dunkel ? "dunkel" : "warn"}>{w.badge}</Badge>
        <p className={cn("mt-6 text-[15px]", dunkel ? "text-white/70" : "text-ink-600")}>{w.laedt}</p>
        <div aria-hidden="true" className="mt-6 h-24 animate-pulse rounded-2xl bg-current opacity-[0.07]" />
      </div>
    );
  }

  const kw = demoLeistungKw(park, jetzt);
  const mwhHeute = demoTagesMwh(park, jetzt);
  const anteil = Math.round((kw / park.kennzahlen.kwp) * 100);
  const verlauf = demoTagesverlauf(park, jetzt).map((p) => p.kw);
  const en = w.sprache === "en";
  const uhr = jetzt.toLocaleTimeString(en ? "en-GB" : "de-DE", { hour: "2-digit", minute: "2-digit" });
  const z = (n, s = 0) => fmtZahl(n, s, w.sprache);
  const dim = dunkel ? "text-white/60" : "text-ink-500";

  return (
    <div className={rahmen}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[17px] font-bold">{w.titel}</p>
        <Badge ton={dunkel ? "dunkel" : "warn"}>{w.badge}</Badge>
      </div>

      <dl className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <dt className={cn("flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.08em]", dim)}>
            <Zap aria-hidden="true" className="h-3.5 w-3.5" /> {w.jetzt}
          </dt>
          <dd className="mt-1.5">
            <span className="font-display text-[34px] font-bold leading-none tabular-nums">{z(kw)}</span>
            <span className={cn("ml-1.5 text-[15px] font-semibold", dim)}>kW</span>
            <p className={cn("mt-1 text-[13px]", dim)}>{kw > 0 ? w.anteil(z(anteil)) : w.nacht}</p>
          </dd>
        </div>
        <div>
          <dt className={cn("flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.08em]", dim)}>
            <Sun aria-hidden="true" className="h-3.5 w-3.5" /> {w.heute}
          </dt>
          <dd className="mt-1.5">
            <span className="font-display text-[34px] font-bold leading-none tabular-nums">{z(mwhHeute, 1)}</span>
            <span className={cn("ml-1.5 text-[15px] font-semibold", dim)}>MWh</span>
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <p className={cn("mb-2 text-[13px] font-semibold", dim)}>{w.verlauf}</p>
        <Sparkline werte={verlauf} breite={320} hoehe={64} ton={dunkel ? "hell" : "marke"} label={w.verlaufLabel} className="w-full" />
      </div>

      <p className={cn("mt-4 flex items-center gap-1.5 text-[12.5px]", dim)}>
        <Clock aria-hidden="true" className="h-3.5 w-3.5" /> {w.stand(uhr)}
      </p>
    </div>
  );
}
