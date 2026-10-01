"use client";

// Diagramme Tag / Woche / Monat / Jahr (eigenes SVG, Tooltip per Zeiger und Tastatur) mit Soll-Ist.
//   Tag   – 15-Minuten-Werte: PV-Leistung (Fläche), Verbrauch (Linie), Speicher-Ladestand (gestrichelt, rechte Achse)
//   Woche – Stundenwerte, gleiche Darstellung
//   Monat – Tageswerte, Jahr – Monatswerte: Erzeugung als Säule (dunkel = vor Ort genutzt, hell = eingespeist),
//           Erwartung (Soll aus Region/kWp/Bauart) als Strich, Summe Ist/Soll
// Daten: /api/portal/anlagen/[id]/messdaten (Rechte prüft der Server). CSV-Export des gewählten Zeitraums.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { ENERGIE } from "@/components/ui/datenfarben";
import BalkenDiagramm from "@/components/diagramme/BalkenDiagramm";
import LinienDiagramm from "@/components/diagramme/LinienDiagramm";
import { kw, kwh } from "@/lib/plattform/anlagen";
import { pct } from "./teile";

const BEREICHE = [
  { id: "tag", label: "Tag", aufloesung: "15min" },
  { id: "woche", label: "Woche", aufloesung: "1h" },
  { id: "monat", label: "Monat", aufloesung: "1d" },
  { id: "jahr", label: "Jahr", aufloesung: "1mon" },
];
const TZ = "Europe/Vienna";

function zeitraum(bereich, anker) {
  const d = new Date(anker);
  if (bereich === "tag") {
    const v = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return [v, new Date(v.getFullYear(), v.getMonth(), v.getDate() + 1)];
  }
  if (bereich === "woche") {
    const wt = (d.getDay() + 6) % 7;
    const v = new Date(d.getFullYear(), d.getMonth(), d.getDate() - wt);
    return [v, new Date(v.getFullYear(), v.getMonth(), v.getDate() + 7)];
  }
  if (bereich === "monat") {
    const v = new Date(d.getFullYear(), d.getMonth(), 1);
    return [v, new Date(v.getFullYear(), v.getMonth() + 1, 1)];
  }
  const v = new Date(d.getFullYear(), 0, 1);
  return [v, new Date(v.getFullYear() + 1, 0, 1)];
}

function verschieben(bereich, anker, r) {
  const d = new Date(anker);
  if (bereich === "tag") d.setDate(d.getDate() + r);
  else if (bereich === "woche") d.setDate(d.getDate() + 7 * r);
  else if (bereich === "monat") d.setMonth(d.getMonth() + r, 1);
  else d.setFullYear(d.getFullYear() + r, 0, 1);
  return d.getTime();
}

function titelText(bereich, von, bis) {
  const f = (d, o) => d.toLocaleDateString("de-DE", { timeZone: TZ, ...o });
  if (bereich === "tag") return f(von, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  if (bereich === "woche") return `${f(von, { day: "2-digit", month: "2-digit" })} – ${f(new Date(bis.getTime() - 1), { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  if (bereich === "monat") return f(von, { month: "long", year: "numeric" });
  return String(von.getFullYear());
}

export default function Verlauf({ anlage }) {
  const [bereich, setBereich] = useState("tag");
  const [anker, setAnker] = useState(null); // erst im Browser (Zeitzone des Nutzers, keine Hydration-Abweichung)
  const [daten, setDaten] = useState(null);
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(false);
  const def = BEREICHE.find((b) => b.id === bereich);
  useEffect(() => setAnker(Date.now()), []);
  const [von, bis] = useMemo(() => zeitraum(bereich, anker ?? 0), [bereich, anker]);
  const zukunft = von.getTime() > Date.now();
  const url = `/api/portal/anlagen/${anlage.id}/messdaten?von=${von.toISOString()}&bis=${bis.toISOString()}&aufloesung=${def.aufloesung}`;

  const holen = useCallback(async () => {
    if (anker == null) return;
    setLaedt(true);
    setFehler("");
    try {
      const r = await fetch(url, { cache: "no-store", credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Fehler ${r.status}`);
      setDaten(j);
    } catch (e) {
      setFehler(e.message);
      setDaten(null);
    } finally {
      setLaedt(false);
    }
  }, [url, anker]);

  useEffect(() => {
    holen();
  }, [holen]);

  const punkte = useMemo(() => daten?.punkte || [], [daten]);
  const summe = useMemo(() => {
    const s = { erzeugung: 0, verbrauch: 0, netzbezug: 0, einspeisung: 0, eigen: 0, soll: 0 };
    for (const p of punkte) {
      s.erzeugung += p.erzeugungKwh || 0;
      s.verbrauch += p.verbrauchKwh || 0;
      s.netzbezug += p.netzbezugKwh || 0;
      s.einspeisung += p.einspeisungKwh || 0;
      s.eigen += p.eigenverbrauchKwh ?? Math.max(0, (p.verbrauchKwh || 0) - (p.netzbezugKwh || 0));
      s.soll += p.erwartetKwh || 0;
    }
    return s;
  }, [punkte]);
  const energie = bereich === "monat" || bereich === "jahr";

  return (
    <section aria-label="Verlauf" className="min-w-0 rounded-3xl bg-white ring-1 ring-ink-200/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4 md:px-6">
        <div role="group" aria-label="Zeitraum" className="flex rounded-full bg-sand-50 p-1 ring-1 ring-inset ring-ink-200">
          {BEREICHE.map((b) => (
            <button key={b.id} type="button" aria-pressed={bereich === b.id} onClick={() => setBereich(b.id)} className={cn("h-9 rounded-full px-3.5 text-[13.5px] font-semibold", bereich === b.id ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-white")}>
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setAnker(verschieben(bereich, anker, -1))} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100" aria-label="Zurück">
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <p className="min-w-[9rem] text-center text-[14px] font-semibold text-ink-900" aria-live="polite">{anker == null ? "" : titelText(bereich, von, bis)}</p>
          <button type="button" disabled={anker == null || bis.getTime() > Date.now()} onClick={() => setAnker(verschieben(bereich, anker, 1))} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 disabled:opacity-30" aria-label="Weiter">
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setAnker(Date.now())} className="ml-1 h-9 rounded-full px-3 text-[13px] font-semibold text-ov-700 hover:bg-ov-50">Heute</button>
        </div>
      </div>
      <div className="px-2 pb-2 pt-3 md:px-3">
        {anker == null ? (
          <div className="m-3 h-[230px] animate-pulse rounded-2xl bg-ink-50 md:h-[280px]" aria-hidden="true" />
        ) : fehler ? (
          <p role="alert" className="m-3 rounded-xl bg-danger-50 px-4 py-3 text-[14px] text-danger-800 ring-1 ring-danger-200">{fehler}</p>
        ) : zukunft ? (
          <p className="m-3 text-[14px] text-ink-500">Für diesen Zeitraum gibt es noch keine Werte.</p>
        ) : !punkte.length && !laedt ? (
          <p className="m-3 text-[14px] text-ink-500">Keine Messwerte in diesem Zeitraum.</p>
        ) : energie ? (
          <Saeulen punkte={punkte} bereich={bereich} laedt={laedt} mitPv={anlage.kwp > 0} />
        ) : (
          <Linien punkte={punkte} bereich={bereich} laedt={laedt} mitPv={anlage.kwp > 0} mitSpeicher={anlage.speicherKwh > 0} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-ink-100 bg-ink-100 sm:grid-cols-3 lg:grid-cols-6">
        {anlage.kwp > 0 && <Summe label="Erzeugung" wert={kwh(summe.erzeugung)} />}
        <Summe label="Verbrauch" wert={kwh(summe.verbrauch)} />
        {anlage.kwp > 0 && <Summe label="Eigenverbrauchsquote" wert={pct(summe.erzeugung ? summe.eigen / summe.erzeugung : null)} />}
        {anlage.kwp > 0 && <Summe label="Autarkie" wert={pct(summe.verbrauch ? summe.eigen / summe.verbrauch : null)} />}
        <Summe label="Netzbezug" wert={kwh(summe.netzbezug)} />
        <Summe label="Einspeisung" wert={kwh(summe.einspeisung)} />
      </div>
      {energie && anlage.kwp > 0 && summe.soll > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-4 md:px-6">
          <p className="text-[14px] text-ink-700">
            <span className="font-semibold text-ink-900">Soll-Ist:</span> Ist {kwh(summe.erzeugung)} · Soll {kwh(summe.soll)} ·{" "}
            <span className={cn("font-bold", summe.erzeugung / summe.soll < 0.9 ? "text-danger-700" : "text-ov-700")}>{pct(summe.erzeugung / summe.soll)}</span>
            <span className="text-ink-500"> (Soll aus Region, kWp und Bauart, Monatsverteilung nach PVGIS; wetterbedingte Abweichungen von ± 10 % sind normal)</span>
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-5 py-3 text-[12.5px] text-ink-500 md:px-6">
        <span>Monitoring-Werte (MQTT) – nicht abrechnungsrelevant. Maßgeblich sind die geeichten Zähler.</span>
        <a href={`${url}&format=csv`} className="inline-flex items-center gap-1.5 font-semibold text-ov-700 hover:text-ov-800">
          <Download aria-hidden="true" className="h-4 w-4" /> CSV
        </a>
      </div>
    </section>
  );
}

function Summe({ label, wert }) {
  return (
    <div className="min-w-0 bg-white px-5 py-3">
      <p className="text-[12px] text-ink-500">{label}</p>
      <p className="ov-num truncate text-[15.5px] font-bold text-ink-900">{wert}</p>
    </div>
  );
}

const zeitLabel = (iso, bereich) => {
  const d = new Date(iso);
  if (bereich === "tag") return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  if (bereich === "woche") return d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ });
  if (bereich === "monat") return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: TZ });
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
};

// Diagramme über das Chart-System (src/components/diagramme): Fadenkreuz, Tastatur, Tabelle, CSV/PNG, Einlauf.
// Farben nach festen Energie-Bedeutungen (ui/datenfarben ENERGIE): Erzeugung Sonne, Verbrauch Navy,
// vor Ort genutzt Grün, Einspeisung Hellgrün, Speicher Blau (gestrichelt, rechte Achse).

function Linien({ punkte, bereich, laedt, mitPv, mitSpeicher }) {
  const maxP = punkte.reduce((m, p, i) => ((p.pvKw || 0) > (punkte[m]?.pvKw || 0) ? i : m), 0);
  const tag = bereich === "tag";
  const beschriftung = punkte.map((p, i) => {
    const text = tag ? zeitLabel(p.ts, "tag") : new Date(p.ts).toLocaleDateString("de-DE", { weekday: "short", timeZone: TZ });
    const vorher = i && !tag ? new Date(punkte[i - 1].ts).toLocaleDateString("de-DE", { weekday: "short", timeZone: TZ }) : null;
    return { x: i, text: tag || text !== vorher ? text : "" };
  });
  const einheitMw = Math.max(0, ...punkte.map((p) => Math.max(p.pvKw || 0, p.verbrauchKw || 0))) >= 5000;
  return (
    <div className={cn("transition-opacity", laedt && "opacity-60")}>
      <LinienDiagramm
        reihen={[
          mitPv && { name: "PV-Leistung", farbe: ENERGIE.erzeugung, flaeche: true, deckkraft: 0.28, werte: punkte.map((p) => (einheitMw ? (p.pvKw || 0) / 1000 : p.pvKw || 0)), texte: punkte.map((p) => kw(p.pvKw)) },
          { name: "Verbrauch", farbe: ENERGIE.verbrauch, werte: punkte.map((p) => (einheitMw ? (p.verbrauchKw || 0) / 1000 : p.verbrauchKw || 0)), texte: punkte.map((p) => kw(p.verbrauchKw)) },
          mitSpeicher && { name: "Speicher-Ladestand", farbe: ENERGIE.speicherLaden, gestrichelt: true, achse: "rechts", werte: punkte.map((p) => p.speicherSocPct || 0), texte: punkte.map((p) => `${Math.round(p.speicherSocPct || 0)} %`) },
        ].filter(Boolean)}
        rechts={mitSpeicher ? { einheit: "%", von: 0, bis: 100, farbe: ENERGIE.speicherLaden } : undefined}
        xBeschriftung={beschriftung}
        xTitel={punkte.map((p) => zeitLabel(p.ts, bereich))}
        zusatz={punkte.map((p) => ({
          zeilen: [(p.netzbezugKw || 0) > 0.05 ? { name: "Netzbezug", wert: kw(p.netzbezugKw), farbe: ENERGIE.netzbezug } : { name: "Einspeisung", wert: kw(p.einspeisungKw), farbe: ENERGIE.einspeisung }],
          fuss: p.fehlercode || undefined,
        }))}
        yEinheit={einheitMw ? "MW" : "kW"}
        hoehe={280}
        beschreibung={`Leistungsverlauf (${tag ? "15 Minuten" : "Stunden"})${mitPv && punkte[maxP] ? `: höchste PV-Leistung ${kw(punkte[maxP].pvKw)} um ${zeitLabel(punkte[maxP].ts, bereich)}` : ""}`}
        className="px-3"
      />
    </div>
  );
}

function Saeulen({ punkte, bereich, laedt, mitPv }) {
  const eigen = (p) => p.eigenverbrauchKwh ?? Math.max(0, (p.verbrauchKwh || 0) - (p.netzbezugKwh || 0));
  const jahr = bereich === "jahr";
  const vorOrt = (p) => Math.min(p.erzeugungKwh || 0, eigen(p));
  const mitSoll = mitPv && punkte.some((p) => p.erwartetKwh > 0);
  const summeIst = punkte.reduce((s, p) => s + (mitPv ? p.erzeugungKwh || 0 : p.verbrauchKwh || 0), 0);
  return (
    <div className={cn("transition-opacity", laedt && "opacity-60")}>
      <BalkenDiagramm
        kategorien={punkte.map((p) => (jahr ? new Date(p.ts).toLocaleDateString("de-DE", { month: "short", timeZone: "UTC" }) : new Date(p.ts).toLocaleDateString("de-DE", { day: "numeric", timeZone: "UTC" })))}
        kategorienTitel={punkte.map((p) => zeitLabel(p.ts, bereich))}
        gestapelt
        reihen={
          mitPv
            ? [
                { name: "Erzeugung vor Ort genutzt", farbe: ENERGIE.eigenverbrauch, werte: punkte.map(vorOrt), texte: punkte.map((p) => kwh(vorOrt(p))) },
                { name: "eingespeist", farbe: ENERGIE.einspeisung, werte: punkte.map((p) => Math.max(0, (p.erzeugungKwh || 0) - vorOrt(p))), texte: punkte.map((p) => kwh(Math.max(0, (p.erzeugungKwh || 0) - vorOrt(p)))) },
              ]
            : [{ name: "Verbrauch", farbe: ENERGIE.verbrauch, werte: punkte.map((p) => p.verbrauchKwh || 0), texte: punkte.map((p) => kwh(p.verbrauchKwh)) }]
        }
        soll={mitSoll ? { name: "Erwartung (Soll)", werte: punkte.map((p) => (p.erwartetKwh > 0 ? p.erwartetKwh : null)), texte: punkte.map((p) => (p.erwartetKwh > 0 ? kwh(p.erwartetKwh) : "–")) } : null}
        zusatz={punkte.map((p) => ({
          zeilen: [
            ...(mitPv ? [{ name: "Verbrauch", wert: kwh(p.verbrauchKwh), farbe: ENERGIE.verbrauch }] : []),
            { name: "Netzbezug", wert: kwh(p.netzbezugKwh), farbe: ENERGIE.netzbezug },
            ...(mitPv ? [] : [{ name: "Einspeisung", wert: kwh(p.einspeisungKwh), farbe: ENERGIE.einspeisung }]),
          ],
          fuss: mitPv ? `Erzeugung ${kwh(p.erzeugungKwh)}${p.erwartetKwh > 0 ? ` · Ist/Soll ${pct((p.erzeugungKwh || 0) / p.erwartetKwh)}` : ""}` : undefined,
        }))}
        yEinheit="kWh"
        werteZeigen={jahr ? "auto" : false}
        summeZeigen={false}
        hoehe={280}
        beschreibung={`${mitPv ? "Erzeugung" : "Verbrauch"} je ${jahr ? "Monat" : "Tag"}${mitSoll ? " mit Erwartung (Soll)" : ""}, Summe ${kwh(summeIst)}`}
        className="px-3"
      />
    </div>
  );
}
