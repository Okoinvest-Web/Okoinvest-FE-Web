"use client";

// Backoffice-Aufgaben & Wiedervorlagen: Liste (erledigen, verschieben) und Formular zum Anlegen –
// allgemein oder an einem Vorgang, einer Fläche, einem Projekt oder Interesse.

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarPlus, Check, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { relativ } from "@/lib/plattform/format";
import { auswahlfeld, eingabe, Feld, FehlerBox, textbereich } from "./felder";

const tagDe = (t) => (t ? t.split("-").reverse().join(".") : "–");
function tagPlus(tage) {
  return new Date(Date.now() + tage * 86400e3).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
}
function verschoben(tag, tage) {
  const basis = tag && tag > tagPlus(0) ? new Date(`${tag}T12:00:00Z`) : new Date(`${tagPlus(0)}T12:00:00Z`);
  return new Date(basis.getTime() + tage * 86400e3).toISOString().slice(0, 10);
}

export function AufgabenListe({ aufgaben = [], zeigeBezug = true, leerText = "Keine Aufgaben." }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(null);

  async function aendern(a, daten) {
    setFehler("");
    setLaeuft(a.id);
    try {
      await senden(`/api/admin/aufgaben/${a.id}`, { method: "PATCH", body: daten });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(null);
    }
  }

  if (!aufgaben.length) return <p className="text-[14px] text-ink-500">{leerText}</p>;
  return (
    <div className="space-y-2">
      <FehlerBox>{fehler}</FehlerBox>
      <ul className="divide-y divide-ink-100">
        {aufgaben.map((a) => {
          const erledigt = a.status === "erledigt";
          return (
            <li key={a.id} className={cn("flex gap-3 py-3.5 first:pt-0 last:pb-0", laeuft === a.id && "opacity-60")}>
              <button
                type="button"
                onClick={() => aendern(a, { status: erledigt ? "offen" : "erledigt" })}
                disabled={laeuft === a.id}
                aria-label={erledigt ? `„${a.titel}“ wieder öffnen` : `„${a.titel}“ als erledigt markieren`}
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-colors",
                  erledigt ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-transparent ring-ink-300 hover:text-ov-600 hover:ring-ov-500"
                )}
              >
                <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} />
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[14.5px] font-semibold leading-snug", erledigt ? "text-ink-400 line-through" : "text-ink-900")}>{a.titel}</p>
                {a.beschreibung && !erledigt && <p className="mt-0.5 whitespace-pre-line text-[13.5px] leading-snug text-ink-600">{a.beschreibung}</p>}
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-500">
                  {erledigt ? (
                    <span suppressHydrationWarning>Erledigt {relativ(a.erledigtAm)}</span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset",
                        a.ueberfaellig ? "bg-sun-300/40 text-ink-900 ring-sun-500/60" : a.heuteFaellig ? "bg-sun-300/20 text-ink-900 ring-sun-400/50" : "bg-ink-50 text-ink-600 ring-ink-200"
                      )}
                    >
                      <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
                      {a.ueberfaellig ? `Überfällig seit ${tagDe(a.faelligAm)}` : a.heuteFaellig ? "Heute fällig" : `Fällig ${tagDe(a.faelligAm)}`}
                    </span>
                  )}
                  {a.zustaendig && <span>· {[a.zustaendig.vorname, a.zustaendig.nachname].filter(Boolean).join(" ")}</span>}
                  {zeigeBezug && a.bezugLink && (
                    <>
                      <span>·</span>
                      <Link href={a.bezugLink} className="min-w-0 truncate font-medium text-ov-700 underline-offset-2 hover:underline">{a.bezugTitel}</Link>
                    </>
                  )}
                </p>
              </div>
              {!erledigt ? (
                <button type="button" onClick={() => aendern(a, { faelligAm: verschoben(a.faelligAm, 7) })} disabled={laeuft === a.id} className="h-8 shrink-0 self-start rounded-full px-2.5 text-[12.5px] font-semibold text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:text-ink-900" title="Um eine Woche verschieben">
                  +7 Tg.
                </button>
              ) : (
                <RotateCcw aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-300" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AufgabeFormular({ konten = [], nutzerId, bezugArt, bezugId, kompakt = false }) {
  const id = useId();
  const router = useRouter();
  const [offen, setOffen] = useState(!kompakt);
  const [d, setD] = useState({ titel: "", beschreibung: "", faelligAm: tagPlus(3), zustaendigId: nutzerId || konten[0]?.id || "" });
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  async function anlegen(e) {
    e.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      await senden("/api/admin/aufgaben", { body: { ...d, ...(bezugArt ? { bezugArt, bezugId } : {}) } });
      setD((x) => ({ ...x, titel: "", beschreibung: "" }));
      if (kompakt) setOffen(false);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }

  if (!offen) {
    return (
      <Button type="button" size="sm" variant="secondary" icon={CalendarPlus} onClick={() => setOffen(true)}>
        Aufgabe / Wiedervorlage
      </Button>
    );
  }
  return (
    <form onSubmit={anlegen} className="space-y-3">
      <Feld id={`${id}-t`} label="Aufgabe" pflicht>
        <input id={`${id}-t`} required minLength={3} maxLength={160} className={eingabe} placeholder="z. B. Netzzusage nachfordern" value={d.titel} onChange={(e) => setD({ ...d, titel: e.target.value })} />
      </Feld>
      {!kompakt && (
        <Feld id={`${id}-b`} label="Notiz">
          <textarea id={`${id}-b`} maxLength={2000} className={cn(textbereich, "min-h-[80px]")} value={d.beschreibung} onChange={(e) => setD({ ...d, beschreibung: e.target.value })} />
        </Feld>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld id={`${id}-f`} label="Fällig am" pflicht>
          <input id={`${id}-f`} type="date" required className={eingabe} value={d.faelligAm} onChange={(e) => setD({ ...d, faelligAm: e.target.value })} />
        </Feld>
        <Feld id={`${id}-z`} label="Zuständig">
          <select id={`${id}-z`} className={auswahlfeld} value={d.zustaendigId} onChange={(e) => setD({ ...d, zustaendigId: e.target.value })}>
            {konten.map((k) => (
              <option key={k.id} value={k.id}>{[k.vorname, k.nachname].filter(Boolean).join(" ")}</option>
            ))}
          </select>
        </Feld>
      </div>
      <FehlerBox>{fehler}</FehlerBox>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" icon={CalendarPlus} disabled={laeuft}>{laeuft ? "Wird angelegt …" : "Aufgabe anlegen"}</Button>
        {kompakt && <Button type="button" size="sm" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>}
      </div>
    </form>
  );
}
