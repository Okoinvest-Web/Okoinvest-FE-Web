"use client";

// Backoffice-Kalender: Woche (Zeitraster) und Monat, Filter je Mitarbeiter, Termin-Details mit Aktionen
// (bestätigen, stattgefunden, nicht erschienen, zuweisen, absagen). Mobil: Agenda-Liste. Tasten: ← → blättern, t = heute.

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck2, ChevronLeft, ChevronRight, Download, UserRound, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";
import { FehlerBox, auswahlfeld } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { TERMIN_ARTEN, TERMIN_STATUS, TZ, heuteTag, tagPlus, wochentagVon } from "@/lib/plattform/termine";

const FARBE = {
  besichtigung: "bg-ov-100 text-ov-900 ring-ov-300",
  beratung_telefon: "bg-navy-50 text-navy-900 ring-navy-200",
  beratung_video: "bg-sand-100 text-ink-900 ring-ink-300",
  gemeinde: "bg-sun-300/30 text-ink-900 ring-sun-400/60",
  datenraum: "bg-navy-900 text-white ring-navy-800",
};
const START_H = 7;
const ENDE_H = 19;
const ZEILE = 44; // px je Stunde

const lokal = (iso) => {
  const d = new Date(iso);
  const tag = d.toLocaleDateString("sv-SE", { timeZone: TZ });
  const [h, m] = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).split(":").map(Number);
  return { tag, min: h * 60 + m, zeit: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
};
const montag = (tag) => tagPlus(tag, 1 - wochentagVon(tag));
const tagKurz = (tag) => new Date(`${tag}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
const monatText = (tag) => new Date(`${tag}T12:00:00Z`).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });

export default function Kalender({ mitarbeiter = [], darfBearbeiten = false, ichId }) {
  const [ansicht, setAnsicht] = useState("woche");
  const [bezug, setBezug] = useState(() => heuteTag());
  const [filter, setFilter] = useState("");
  const [termine, setTermine] = useState([]);
  const [laden, setLaden] = useState(true);
  const [auswahl, setAuswahl] = useState(null);
  const [fehler, setFehler] = useState("");

  const bereich = useMemo(() => {
    if (ansicht === "woche") {
      const von = montag(bezug);
      return { von, bis: tagPlus(von, 6), tage: Array.from({ length: 7 }, (_, i) => tagPlus(von, i)) };
    }
    const erster = `${bezug.slice(0, 7)}-01`;
    const von = montag(erster);
    return { von, bis: tagPlus(von, 41), tage: Array.from({ length: 42 }, (_, i) => tagPlus(von, i)) };
  }, [ansicht, bezug]);

  const neuLaden = useCallback(async () => {
    setLaden(true);
    try {
      const r = await fetch(`/api/admin/termine?von=${bereich.von}&bis=${bereich.bis}${filter ? `&mitarbeiter=${filter}` : ""}`, { credentials: "same-origin", cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Kalender konnte nicht geladen werden.");
      setTermine(j.termine || []);
      setFehler("");
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaden(false);
    }
  }, [bereich.von, bereich.bis, filter]);

  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  const blaettern = useCallback((richtung) => {
    setBezug((b) => {
      if (ansicht === "woche") return tagPlus(b, 7 * richtung);
      const d = new Date(`${b.slice(0, 7)}-15T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + richtung);
      return d.toISOString().slice(0, 10);
    });
  }, [ansicht]);

  useEffect(() => {
    const taste = (e) => {
      if (e.target.closest?.("input,textarea,select,[contenteditable]")) return;
      if (e.key === "ArrowLeft") blaettern(-1);
      else if (e.key === "ArrowRight") blaettern(1);
      else if (e.key === "t") setBezug(heuteTag());
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [blaettern]);

  const jeTag = useMemo(() => {
    const m = new Map(bereich.tage.map((t) => [t, []]));
    for (const t of termine) m.get(lokal(t.start).tag)?.push(t);
    return m;
  }, [termine, bereich.tage]);

  async function aktion(body) {
    try {
      const r = await senden(`/api/portal/termine/${auswahl.id}`, { method: "PATCH", body });
      setAuswahl(r.termin);
      neuLaden();
    } catch (e) {
      setFehler(e.message);
    }
  }

  const heute = heuteTag();
  const aktivTermine = termine.filter((t) => ["gebucht", "bestaetigt"].includes(t.status));

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => blaettern(-1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50" aria-label="Zurück"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => setBezug(heuteTag())} className="h-10 rounded-full px-4 text-[14px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Heute</button>
          <button type="button" onClick={() => blaettern(1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50" aria-label="Weiter"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <p className="min-w-0 flex-1 font-display text-[18px] font-bold text-ink-900" aria-live="polite">
          {ansicht === "woche" ? `${tagKurz(bereich.von)} – ${tagKurz(bereich.bis)}` : monatText(bezug)}
        </p>
        <div role="tablist" aria-label="Ansicht" className="flex rounded-full bg-ink-100 p-1">
          {["woche", "monat"].map((a) => (
            <button key={a} type="button" role="tab" aria-selected={ansicht === a} onClick={() => setAnsicht(a)} className={cn("rounded-full px-4 py-1.5 text-[13.5px] font-semibold", ansicht === a ? "bg-white text-ink-900 shadow-sm" : "text-ink-600")}>
              {a === "woche" ? "Woche" : "Monat"}
            </button>
          ))}
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={cn(auswahlfeld, "h-10 w-full sm:w-[220px]")} aria-label="Mitarbeiter filtern">
          <option value="">Alle Mitarbeiter</option>
          {mitarbeiter.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === ichId ? " (ich)" : ""}</option>)}
        </select>
      </div>
      <FehlerBox>{fehler}</FehlerBox>
      <p className="mb-3 text-[13px] text-ink-500">{laden ? "Lädt …" : `${aktivTermine.length} aktive Termine im Zeitraum`} · Tasten ← → blättern, „t“ heute</p>

      {ansicht === "woche" ? (
        <>
          {/* Desktop: Zeitraster */}
          <div className="hidden overflow-x-auto rounded-2xl ring-1 ring-ink-200 md:block">
            <div className="grid min-w-[760px] grid-cols-[52px_repeat(7,minmax(0,1fr))]">
              <div className="border-b border-ink-100 bg-ink-50" />
              {bereich.tage.map((t) => (
                <div key={t} className={cn("border-b border-l border-ink-100 px-2 py-2 text-center text-[12.5px] font-semibold", t === heute ? "bg-ov-50 text-ov-800" : "bg-ink-50 text-ink-600")}>{tagKurz(t)}</div>
              ))}
              <div className="relative" style={{ height: (ENDE_H - START_H) * ZEILE }}>
                {Array.from({ length: ENDE_H - START_H }, (_, i) => (
                  <span key={i} className="absolute right-2 text-[11px] text-ink-400" style={{ top: i * ZEILE - 6 }}>{String(START_H + i).padStart(2, "0")}:00</span>
                ))}
              </div>
              {bereich.tage.map((t) => (
                <div key={t} className="relative border-l border-ink-100" style={{ height: (ENDE_H - START_H) * ZEILE }}>
                  {Array.from({ length: ENDE_H - START_H }, (_, i) => <span key={i} aria-hidden="true" className="absolute inset-x-0 border-t border-ink-100" style={{ top: i * ZEILE }} />)}
                  {(jeTag.get(t) || []).map((x) => {
                    const s = lokal(x.start);
                    const e = lokal(x.ende);
                    const top = Math.max(0, ((s.min - START_H * 60) / 60) * ZEILE);
                    const hoehe = Math.max(22, ((e.min - s.min) / 60) * ZEILE - 2);
                    return (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => setAuswahl(x)}
                        className={cn("absolute inset-x-1 overflow-hidden rounded-lg px-1.5 py-1 text-left text-[11.5px] leading-tight ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500", FARBE[x.art], !["gebucht", "bestaetigt"].includes(x.status) && "opacity-45 line-through")}
                        style={{ top, height: hoehe }}
                        title={`${x.artLabel} · ${x.kunde?.name || ""}`}
                      >
                        <span className="block font-semibold">{s.zeit} {TERMIN_ARTEN[x.art]?.kurz}</span>
                        <span className="block truncate">{x.kunde?.name}</span>
                        <span className="block truncate opacity-75">{x.mitarbeiter?.name}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* Mobil: Agenda */}
          <ol className="space-y-3 md:hidden">
            {bereich.tage.map((t) => (
              <li key={t} className="rounded-2xl bg-white p-3 ring-1 ring-ink-200/70">
                <p className={cn("text-[13px] font-semibold", t === heute ? "text-ov-700" : "text-ink-600")}>{tagKurz(t)}</p>
                {(jeTag.get(t) || []).length ? (
                  <ul className="mt-2 space-y-1.5">
                    {jeTag.get(t).map((x) => (
                      <li key={x.id}>
                        <button type="button" onClick={() => setAuswahl(x)} className={cn("w-full rounded-lg px-3 py-2 text-left text-[13px] ring-1 ring-inset", FARBE[x.art], !["gebucht", "bestaetigt"].includes(x.status) && "opacity-45 line-through")}>
                          <span className="font-semibold">{lokal(x.start).zeit}</span> {x.artLabel} · {x.kunde?.name} · {x.mitarbeiter?.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-1 text-[12.5px] text-ink-400">keine Termine</p>}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className="overflow-x-auto rounded-2xl ring-1 ring-ink-200">
          <div className="grid min-w-[640px] grid-cols-7">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => <div key={w} className="border-b border-ink-100 bg-ink-50 px-2 py-2 text-center text-[12.5px] font-semibold text-ink-600">{w}</div>)}
            {bereich.tage.map((t) => {
              const liste = jeTag.get(t) || [];
              const imMonat = t.slice(0, 7) === bezug.slice(0, 7);
              return (
                <div key={t} className={cn("min-h-[96px] border-b border-l border-ink-100 p-1.5", !imMonat && "bg-ink-50/60")}>
                  <button type="button" onClick={() => { setBezug(t); setAnsicht("woche"); }} className={cn("mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-semibold", t === heute ? "bg-ov-600 text-white" : imMonat ? "text-ink-800 hover:bg-ink-100" : "text-ink-400")} aria-label={`Woche ab ${tagKurz(t)} anzeigen`}>
                    {Number(t.slice(8))}
                  </button>
                  <ul className="space-y-1">
                    {liste.slice(0, 3).map((x) => (
                      <li key={x.id}>
                        <button type="button" onClick={() => setAuswahl(x)} className={cn("block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11.5px] ring-1 ring-inset", FARBE[x.art], !["gebucht", "bestaetigt"].includes(x.status) && "opacity-45 line-through")}>
                          {lokal(x.start).zeit} {TERMIN_ARTEN[x.art]?.kurz}
                        </button>
                      </li>
                    ))}
                    {liste.length > 3 && <li className="px-1.5 text-[11.5px] text-ink-500">+ {liste.length - 3} weitere</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Legende">
        {Object.entries(TERMIN_ARTEN).map(([id, a]) => <li key={id} className={cn("rounded-full px-2.5 py-1 text-[12px] ring-1 ring-inset", FARBE[id])}>{a.label}</li>)}
      </ul>

      {auswahl && (
        <div className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6" role="region" aria-label="Termindetails">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">{auswahl.id}</p>
              <h3 className="font-display text-[19px] font-bold text-ink-900">{auswahl.artLabel}</h3>
              <p className="text-[14.5px] text-ink-700">{auswahl.zeitraum} · {auswahl.kanalLabel}{auswahl.ort ? ` · ${auswahl.ort}` : ""}</p>
            </div>
            <button type="button" onClick={() => setAuswahl(null)} className="rounded-full p-2 text-ink-500 hover:bg-ink-100" aria-label="Details schließen"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-3 grid gap-3 text-[14px] sm:grid-cols-2">
            <p><span className="text-ink-500">Kunde:</span> {auswahl.kunde?.name} {auswahl.kunde?.firma ? `(${auswahl.kunde.firma})` : ""}<br /><span className="break-all text-ink-600">{auswahl.kunde?.email}{auswahl.kunde?.telefon ? ` · ${auswahl.kunde.telefon}` : ""}</span></p>
            <p><span className="text-ink-500">Zuständig:</span> <UserRound aria-hidden="true" className="inline h-4 w-4" /> {auswahl.mitarbeiter?.name}{auswahl.vertretungFuer ? ` – Vertretung für ${auswahl.vertretungFuer.name}` : ""}<br /><Badge ton={TERMIN_STATUS[auswahl.status]?.ton}>{auswahl.statusLabel}</Badge> <span className="text-ink-500">Herkunft: {auswahl.herkunft}</span></p>
          </div>
          {auswahl.notiz && <p className="mt-3 whitespace-pre-line rounded-xl bg-ink-50 p-3 text-[14px] text-ink-700">{auswahl.notiz}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href={`/api/portal/termine/${auswahl.id}/ics`} prefetch={false} size="sm" variant="secondary" icon={Download}>ICS</Button>
            {darfBearbeiten && auswahl.status === "gebucht" && <Button type="button" size="sm" icon={CalendarCheck2} onClick={() => aktion({ aktion: "bestaetigen" })}>Bestätigen</Button>}
            {darfBearbeiten && ["gebucht", "bestaetigt"].includes(auswahl.status) && (
              <>
                <Button type="button" size="sm" variant="secondary" onClick={() => aktion({ aktion: "erledigt" })}>Stattgefunden</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => aktion({ aktion: "nicht_erschienen" })}>Nicht erschienen</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => aktion({ aktion: "stornieren" })}>Absagen</Button>
                <select defaultValue="" onChange={(e) => e.target.value && aktion({ aktion: "zuweisen", mitarbeiterId: e.target.value })} className={cn(auswahlfeld, "h-10 w-full sm:w-[220px]")} aria-label="Zuweisen an">
                  <option value="">Zuweisen an …</option>
                  {mitarbeiter.filter((m) => m.id !== auswahl.mitarbeiter?.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </>
            )}
          </div>
          {auswahl.verlauf?.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-ink-100 pt-3 text-[12.5px] text-ink-500">
              {auswahl.verlauf.slice(-5).map((v, i) => <li key={i}>{new Date(v.am).toLocaleString("de-DE", { timeZone: TZ, dateStyle: "short", timeStyle: "short" })} · {v.text}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
