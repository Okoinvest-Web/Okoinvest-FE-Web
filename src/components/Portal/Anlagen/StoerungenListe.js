"use client";

// Störungen einer Anlage bzw. aller Anlagen (Leitstand): Schwere, Status, Quittierung, Zuständiger, Kommentare.
// Kunde: ansehen und kommentieren (ohne interne Kommentare). Betrieb: quittieren, Status, Zuweisung, Schwere,
// interne Kommentare. Rechte prüft der Server (/api/portal/anlagen/stoerungen/[id]).

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck, CircleCheck, Hammer, Lock, MessageSquare, UserRound } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { datumZeit } from "@/lib/plattform/format";
import { STOERUNG_SCHWERE } from "@/lib/plattform/anlagen";
import { SchwereBadge, StoerungStatusBadge, alterText } from "./teile";

export default function StoerungenListe({ stoerungen = [], betrieb = [], mitAnlage = false, leer = "Keine Störungen." }) {
  const [filter, setFilter] = useState("offen");
  const liste = stoerungen.filter((s) => (filter === "alle" ? true : filter === "behoben" ? s.status === "behoben" : s.status !== "behoben"));
  const offen = stoerungen.filter((s) => s.status !== "behoben").length;
  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter" className="flex flex-wrap gap-2">
        {[
          ["offen", `Offen (${offen})`],
          ["behoben", `Behoben (${stoerungen.length - offen})`],
          ["alle", `Alle (${stoerungen.length})`],
        ].map(([id, label]) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={cn("h-9 rounded-full px-3.5 text-[13.5px] font-semibold ring-1 ring-inset", filter === id ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300")}>
            {label}
          </button>
        ))}
      </div>
      {liste.length ? (
        <ul className="space-y-3">
          {liste.map((s) => (
            <li key={s.id}>
              <Stoerung s={s} betrieb={betrieb} mitAnlage={mitAnlage} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-3xl border border-dashed border-ink-200 bg-white/60 p-6 text-center text-[14.5px] text-ink-600">{leer}</p>
      )}
    </div>
  );
}

function Stoerung({ s, betrieb, mitAnlage }) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [text, setText] = useState("");
  const [intern, setIntern] = useState(false);
  const [laeuft, setLaeuft] = useState("");
  const [fehler, setFehler] = useState("");

  async function aktion(body, key) {
    setLaeuft(key);
    setFehler("");
    try {
      await senden(`/api/portal/anlagen/stoerungen/${s.id}`, { body });
      if (body.aktion === "kommentar") {
        setText("");
        setIntern(false);
      }
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft("");
    }
  }

  const stufe = STOERUNG_SCHWERE[s.schwere]?.stufe ?? 0;
  return (
    <article className={cn("rounded-3xl bg-white ring-1", s.status !== "behoben" && stufe >= 3 ? "ring-danger-200" : "ring-ink-200/70")}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 md:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SchwereBadge schwere={s.schwere} />
            <StoerungStatusBadge status={s.status} />
            {s.quittiert ? (
              <span className="inline-flex items-center gap-1 text-[12px] text-ink-500"><CheckCheck aria-hidden="true" className="h-3.5 w-3.5" /> quittiert{s.quittiertVon ? ` von ${s.quittiertVon}` : ""}</span>
            ) : s.status !== "behoben" ? (
              <span className="text-[12px] font-semibold text-danger-700">unquittiert</span>
            ) : null}
            {s.darfBearbeiten && s.status !== "behoben" && <span className="ov-num rounded-full bg-ink-100 px-2 py-0.5 text-[11.5px] font-semibold text-ink-700" title="Priorität">P {s.prioritaet}</span>}
          </div>
          <h3 className="mt-2 font-display text-[16px] font-bold text-ink-900">{s.titel}</h3>
          {mitAnlage && s.anlage && (
            <Link href={`/portal/anlagen/${s.anlage.id}?tab=stoerungen`} className="text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">{s.anlage.name}</Link>
          )}
          {s.text && <p className="mt-1 text-[14px] leading-relaxed text-ink-700">{s.text}</p>}
          {s.darfBearbeiten && <Link href={`/portal/admin/anlagen/betrieb/stoerung/${s.id}`} className="mt-1 inline-block text-[13px] font-semibold text-ov-700 hover:text-ov-800">Ticket: SLA, Ursache, Ertragsausfall, Auftrag</Link>}
          <p className="mt-1.5 text-[12.5px] text-ink-500">
            {s.regelLabel} · erkannt {datumZeit(s.erkanntAm)} ({alterText(s.erkanntAm)}){s.anzahl > 1 ? ` · ${s.anzahl}× gemeldet, zuletzt ${alterText(s.zuletztAm)}` : ""}
            {s.behobenAm ? ` · behoben ${datumZeit(s.behobenAm)}` : ""}
            {s.zustaendig ? ` · zuständig: ${s.zustaendig.name}` : ""}
          </p>
        </div>
        <button type="button" onClick={() => setOffen(!offen)} aria-expanded={offen} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
          <MessageSquare aria-hidden="true" className="h-4 w-4" /> {s.kommentare.length ? `${s.kommentare.length} Kommentar${s.kommentare.length === 1 ? "" : "e"}` : "Details"}
        </button>
      </div>

      {s.darfBearbeiten && s.status !== "behoben" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 px-5 py-3 md:px-6">
          {!s.quittiert && (
            <button type="button" disabled={!!laeuft} onClick={() => aktion({ aktion: "quittieren" }, "q")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy-700 px-4 text-[13.5px] font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
              <CheckCheck aria-hidden="true" className="h-4 w-4" /> Quittieren
            </button>
          )}
          {s.status === "offen" && s.quittiert && (
            <button type="button" disabled={!!laeuft} onClick={() => aktion({ aktion: "status", status: "in_arbeit" }, "a")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 disabled:opacity-50">
              <Hammer aria-hidden="true" className="h-4 w-4" /> In Arbeit
            </button>
          )}
          <button type="button" disabled={!!laeuft} onClick={() => aktion({ aktion: "status", status: "behoben" }, "b")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ov-600 px-4 text-[13.5px] font-semibold text-white hover:bg-ov-700 disabled:opacity-50">
            <CircleCheck aria-hidden="true" className="h-4 w-4" /> Behoben
          </button>
          {betrieb.length > 0 && (
            <label className="inline-flex items-center gap-2 text-[13px] text-ink-600">
              <UserRound aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">Zuständig</span>
              <select value={s.zustaendig?.id || ""} disabled={!!laeuft} onChange={(e) => aktion({ aktion: "zuweisen", zustaendigId: e.target.value }, "z")} className="h-9 rounded-full bg-white px-3 text-[13px] ring-1 ring-inset ring-ink-200">
                <option value="">niemand zuständig</option>
                {betrieb.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="inline-flex items-center gap-2 text-[13px] text-ink-600">
            <span className="sr-only">Schwere</span>
            <select value={s.schwere} disabled={!!laeuft} onChange={(e) => aktion({ aktion: "schwere", schwere: e.target.value }, "s")} className="h-9 rounded-full bg-white px-3 text-[13px] ring-1 ring-inset ring-ink-200">
              {Object.entries(STOERUNG_SCHWERE).map(([id, x]) => (
                <option key={id} value={id}>Schwere: {x.label}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {s.darfBearbeiten && s.status === "behoben" && (
        <div className="border-t border-ink-100 px-5 py-3 md:px-6">
          <button type="button" disabled={!!laeuft} onClick={() => aktion({ aktion: "status", status: "offen" }, "o")} className="text-[13px] font-semibold text-ink-600 hover:text-ink-900">Wieder öffnen</button>
        </div>
      )}

      {offen && (
        <div className="space-y-3 border-t border-ink-100 px-5 py-4 md:px-6">
          {s.kommentare.length ? (
            <ul className="space-y-2.5">
              {s.kommentare.map((k) => (
                <li key={k.id} className={cn("rounded-2xl px-4 py-3 text-[14px]", k.intern ? "bg-sun-300/15 ring-1 ring-inset ring-sun-400/40" : k.backoffice ? "bg-navy-50" : "bg-sand-50")}>
                  <p className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink-500">
                    <span className="font-semibold text-ink-800">{k.vonName}</span> {datumZeit(k.am)}
                    {k.intern && <span className="inline-flex items-center gap-1 font-semibold text-ink-700"><Lock aria-hidden="true" className="h-3 w-3" /> intern</span>}
                  </p>
                  <p className="mt-1 whitespace-pre-line leading-relaxed text-ink-800">{k.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] text-ink-500">Noch keine Kommentare.</p>
          )}
          {s.verlauf?.length ? (
            <details className="text-[13px] text-ink-600">
              <summary className="cursor-pointer font-semibold">Verlauf ({s.verlauf.length})</summary>
              <ol className="mt-2 space-y-1">
                {s.verlauf.map((v, i) => (
                  <li key={i}>{datumZeit(v.am)} – {v.text}</li>
                ))}
              </ol>
            </details>
          ) : null}
          {s.darfKommentieren && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                aktion({ aktion: "kommentar", text, intern }, "k");
              }}
              className="space-y-2"
            >
              <label htmlFor={`k-${s.id}`} className="sr-only">Kommentar</label>
              <textarea id={`k-${s.id}`} value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder={s.darfBearbeiten ? "Kommentar (für den Kunden sichtbar, außer „intern“)" : "Ihre Nachricht an den Betrieb zu dieser Störung"} className="block w-full rounded-xl bg-white px-4 py-3 text-[14px] text-ink-900 outline-none ring-1 ring-inset ring-ink-200 focus-visible:ring-2 focus-visible:ring-ov-500" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                {s.darfBearbeiten ? (
                  <label className="inline-flex items-center gap-2 text-[13px] text-ink-700">
                    <input type="checkbox" checked={intern} onChange={(e) => setIntern(e.target.checked)} className="h-4 w-4 accent-ov-600" /> nur intern (Kunde sieht es nicht)
                  </label>
                ) : (
                  <span />
                )}
                <button type="submit" disabled={text.trim().length < 2 || !!laeuft} className="h-9 rounded-full bg-ov-600 px-4 text-[13.5px] font-semibold text-white hover:bg-ov-700 disabled:opacity-50">Kommentieren</button>
              </div>
            </form>
          )}
        </div>
      )}
      {fehler && <p role="alert" className="mx-5 mb-4 rounded-xl bg-danger-50 px-4 py-2.5 text-[13.5px] text-danger-800 ring-1 ring-danger-200 md:mx-6">{fehler}</p>}
    </article>
  );
}
