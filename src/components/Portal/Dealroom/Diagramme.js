// src/components/Portal/Dealroom/Diagramme.js
//
// Schlanke Diagramme für Cockpit und Pipeline (Inline-SVG bzw. CSS, ohne Fremdpakete, server-tauglich).
// Farben nur aus dem Design-System (ov/navy/ink/sand). Jede Grafik hat eine Textalternative.

import { cn } from "@/components/ui/cn";
import { fmt } from "@/lib/rechner/annahmen";
import { KATEGORIE_HELL } from "@/components/ui/datenfarben";
import BalkenDiagramm from "@/components/diagramme/BalkenDiagramm";

/** Trichter (horizontal): Stufen mit Wert, Balkenbreite relativ zur ersten Stufe, Umwandlungsquote */
export function Trichter({ stufen = [] }) {
  const erste = Math.max(1, stufen[0]?.wert || 0);
  return (
    <ol className="space-y-2.5" aria-label="Trichter">
      {stufen.map((s, i) => {
        const breite = Math.max(4, Math.round(((s.wert || 0) / erste) * 100));
        const vor = i > 0 ? stufen[i - 1].wert : null;
        const quote = vor ? Math.round(((s.wert || 0) / vor) * 100) : null;
        return (
          <li key={s.id || s.label} className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[110px_minmax(0,1fr)_auto]">
            <span className="truncate text-[13px] font-medium text-ink-600">{s.label}</span>
            <span className="relative block h-8 rounded-xl bg-ink-50">
              <span className={cn("absolute inset-y-0 left-0 rounded-xl", i === 0 ? "bg-navy-700" : i === stufen.length - 1 ? "bg-ov-600" : "bg-ov-400")} style={{ width: `${breite}%` }} />
              <span className={cn("ov-num absolute inset-y-0 left-3 flex items-center text-[13.5px] font-bold", breite > 18 ? "text-white" : "text-ink-900")} style={breite <= 18 ? { left: `calc(${breite}% + 10px)` } : undefined}>
                {fmt(s.wert || 0)}
              </span>
            </span>
            <span className="ov-num w-14 text-right text-[12.5px] text-ink-500">{quote === null ? "" : `${quote} %`}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Säulen je Tag (Aufrufe über Zeit) mit 7-Tage-Mittel als Linie – über das Chart-System (BalkenDiagramm) */
export function Zeitverlauf({ punkte = [], label = "Aufrufe je Tag", hoehe = 160 }) {
  const n = punkte.length;
  if (!n) return <p className="text-[14px] text-ink-500">Noch keine Daten.</p>;
  const mittel = punkte.map((_, i) => {
    const f = punkte.slice(Math.max(0, i - 6), i + 1);
    return f.reduce((s, x) => s + x.aufrufe, 0) / f.length;
  });
  const summe = punkte.reduce((s, p) => s + p.aufrufe, 0);
  const max = Math.max(...punkte.map((p) => p.aufrufe));
  const tagLabel = (t) => t.slice(8, 10) + "." + t.slice(5, 7) + ".";
  return (
    <BalkenDiagramm
      kategorien={punkte.map((p) => tagLabel(p.tag))}
      reihen={[{ name: label, farbe: KATEGORIE_HELL[1], werte: punkte.map((p) => p.aufrufe), texte: punkte.map((p) => fmt(p.aufrufe)) }]}
      linie={{ name: "gleitendes 7-Tage-Mittel", farbe: KATEGORIE_HELL[0], gestrichelt: false, werte: mittel, texte: mittel.map((m) => fmt(m, 1)) }}
      werteZeigen={false}
      hoehe={Math.max(180, hoehe)}
      beschreibung={`${label}: ${summe} in ${n} Tagen, höchstens ${max} an einem Tag`}
    />
  );
}

/** Horizontale Verteilungsbalken (z. B. MWp je Land/Phase) */
export function Verteilung({ eintraege = [], einheit = "MWp", leer = "Keine Daten." }) {
  const liste = eintraege.filter((e) => e.wert > 0);
  if (!liste.length) return <p className="text-[14px] text-ink-500">{leer}</p>;
  const max = Math.max(...liste.map((e) => e.wert));
  const summe = liste.reduce((s, e) => s + e.wert, 0);
  return (
    <ul className="space-y-3">
      {liste.map((e, i) => (
        <li key={e.label} className="min-w-0">
          <div className="flex items-baseline justify-between gap-2 text-[13px]">
            <span className="truncate text-ink-700">{e.label}</span>
            <span className="ov-num shrink-0 text-ink-900"><span className="font-bold">{fmt(e.wert, e.wert < 10 ? 1 : 0)} {einheit}</span><span className="ml-1.5 text-ink-500">{Math.round((e.wert / summe) * 100)} %</span></span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-ink-100">
            <div className={cn("h-2.5 rounded-full", ["bg-ov-600", "bg-navy-700", "bg-ov-400", "bg-navy-400", "bg-ov-200", "bg-ink-400"][i % 6])} style={{ width: `${Math.max(3, (e.wert / max) * 100)}%` }} />
          </div>
          {e.text && <p className="mt-0.5 text-[11.5px] text-ink-500">{e.text}</p>}
        </li>
      ))}
    </ul>
  );
}
