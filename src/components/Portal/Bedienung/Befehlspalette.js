"use client";

// Befehlspalette (Strg/⌘+K): Suche über eigene Flächen, Projekte, Vorgänge, Nachrichten
// und – je Rolle – Börse und Nutzer (serverseitig rechtegeprüft über /api/portal/suche),
// dazu Aktionen und Navigation (lokal, unscharf gefiltert) und „Zuletzt verwendet“.
//
// ARIA: Dialog (modal) mit Combobox-Eingabe (aria-activedescendant) und gruppierter Listbox
// (WAI-ARIA APG „Combobox with Listbox Popup“). Vollständig per Tastatur bedienbar:
// ↑/↓/Pos1/Ende wählen, Enter öffnet, Strg+Enter öffnet in neuem Tab, Esc schließt.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft, FileText, FolderKanban, History, Inbox, LandPlot, Loader2, MessagesSquare, Search, TrendingUp, UserRound, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import useFokusFalle from "@/components/ui/useFokusFalle";
import { rangieren, SUCH_GRUPPEN, SUCHE_MIN, istPortalPfad } from "@/lib/plattform/suche";
import { aktionen, navigationsZiele } from "./befehle";
import { speicherLesen, speicherSchreiben } from "./speicher";
import { SucheOhneTreffer } from "@/components/illustrationen"; // T7: Leerzustand
import { CalendarDays, Contact, HardHat, LifeBuoy, ListTodo, SunMedium } from "lucide-react"; // Querschnitt: Icons der erweiterten Suche

const ART_ICON = { flaeche: LandPlot, projekt: FolderKanban, vorgang: Inbox, nachricht: MessagesSquare, boerse: TrendingUp, nutzer: UserRound };
const MAX_ZULETZT = 6;
const GRUPPEN_REIHENFOLGE = ["zuletzt", "flaeche", "projekt", "vorgang", "nachricht", "boerse", "nutzer", "dokument", "aufgabe", "anlage", "entwicklung", "kontakt", "termin", "ticket", "aktion", "navigation"]; // Querschnitt: erweiterte Suche
Object.assign(ART_ICON, { dokument: FileText, aufgabe: ListTodo, anlage: SunMedium, entwicklung: HardHat, kontakt: Contact, termin: CalendarDays, ticket: LifeBuoy }); // Querschnitt

export default function Befehlspalette({ nutzer, offen, setOffen, beiAktion }) {
  const router = useRouter();
  const basisId = useId().replace(/:/g, "");
  const dialogRef = useRef(null);
  const eingabeRef = useRef(null);
  const listeRef = useRef(null);
  const [q, setQ] = useState("");
  const [treffer, setTreffer] = useState([]);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");
  const [aktivIdx, setAktivIdx] = useState(0);
  const [zuletzt, setZuletzt] = useState([]);
  const rollen = useMemo(() => nutzer?.rollen || [], [nutzer?.rollen]);
  const schluessel = `oi-palette-zuletzt:${nutzer?.id || "?"}`;

  useFokusFalle(offen, dialogRef, { beiEscape: () => setOffen(false), startRef: eingabeRef });

  // Beim Öffnen: zurücksetzen, „Zuletzt“ laden
  useEffect(() => {
    if (!offen) return;
    setQ("");
    setTreffer([]);
    setFehler("");
    setAktivIdx(0);
    const z = speicherLesen(schluessel, []);
    setZuletzt(Array.isArray(z) ? z.filter((e) => e && typeof e.titel === "string" && (istPortalPfad(e.href) || e.href === "/")).slice(0, MAX_ZULETZT) : []);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [offen, schluessel]);

  // Serverseitige Suche (entprellt, abbrechbar)
  useEffect(() => {
    if (!offen) return undefined;
    const text = q.trim();
    if (text.length < SUCHE_MIN) {
      setTreffer([]);
      setLaedt(false);
      return undefined;
    }
    const ctrl = new AbortController();
    setLaedt(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/portal/suche?q=${encodeURIComponent(text)}&limit=6`, { signal: ctrl.signal, credentials: "same-origin", cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) throw new Error(json.error || "Die Suche ist gerade nicht erreichbar.");
        setTreffer((json.treffer || []).filter((x) => istPortalPfad(x.href)));
        setFehler("");
      } catch (e) {
        if (e.name !== "AbortError") setFehler(e.message || "Die Suche ist gerade nicht erreichbar.");
      } finally {
        if (!ctrl.signal.aborted) setLaedt(false);
      }
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, offen]);

  // Einträge zusammenstellen (Gruppen in fester Reihenfolge)
  const gruppen = useMemo(() => {
    const text = q.trim();
    const lokal = [
      ...aktionen(rollen).map((a) => ({ ...a, art: "aktion", gruppe: "aktion" })),
      ...navigationsZiele(rollen).map((n) => ({ ...n, art: "navigation", gruppe: "navigation", untertitel: n.href === "/" ? "Öffentliche Website" : undefined })),
    ];
    const felder = (e) => [e.titel, e.stichworte, e.untertitel];
    let eintraege;
    if (!text) {
      eintraege = [
        ...zuletzt.map((z) => ({ ...z, gruppe: "zuletzt", id: `z-${z.id}` })),
        ...lokal.filter((e) => e.gruppe === "aktion"),
        ...lokal.filter((e) => e.gruppe === "navigation"),
      ];
    } else {
      eintraege = [
        ...treffer.map((t) => ({ ...t, gruppe: t.art, id: `s-${t.art}-${t.id}` })),
        ...rangieren(lokal.filter((e) => e.gruppe === "aktion"), text, felder, { limit: 6, mindestens: 0.35 }),
        ...rangieren(lokal.filter((e) => e.gruppe === "navigation"), text, felder, { limit: 6, mindestens: 0.35 }),
      ];
    }
    const map = new Map();
    for (const e of eintraege) {
      if (!map.has(e.gruppe)) map.set(e.gruppe, []);
      map.get(e.gruppe).push(e);
    }
    return GRUPPEN_REIHENFOLGE.filter((g) => map.has(g)).map((g) => ({ id: g, titel: SUCH_GRUPPEN[g] || g, eintraege: map.get(g) }));
  }, [q, treffer, zuletzt, rollen]);

  const flach = useMemo(() => gruppen.flatMap((g) => g.eintraege), [gruppen]);
  const optionId = (i) => `${basisId}-opt-${i}`;

  useEffect(() => {
    setAktivIdx((i) => (flach.length ? Math.min(i, flach.length - 1) : 0));
  }, [flach.length]);
  useEffect(() => setAktivIdx(0), [q]);

  // aktiven Eintrag sichtbar halten
  useEffect(() => {
    if (!offen) return;
    document.getElementById(optionId(aktivIdx))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktivIdx, offen]);

  const merken = useCallback(
    (e) => {
      if (!e.href) return;
      const eintrag = { id: e.id.replace(/^[zs]-/, ""), art: e.art, titel: e.titel, untertitel: e.untertitel || "", href: e.href };
      const alt = speicherLesen(schluessel, []);
      const neu = [eintrag, ...(Array.isArray(alt) ? alt : []).filter((x) => x?.href !== e.href)].slice(0, MAX_ZULETZT);
      speicherSchreiben(schluessel, neu);
    },
    [schluessel]
  );

  const ausfuehren = useCallback(
    (e, { neuerTab = false } = {}) => {
      if (!e) return;
      if (e.aktion) {
        setOffen(false);
        beiAktion?.(e.aktion);
        return;
      }
      if (!e.href) return;
      merken(e);
      if (neuerTab) {
        window.open(e.href, "_blank", "noopener");
        return;
      }
      setOffen(false);
      if (e.href === "/") window.location.assign("/");
      else router.push(e.href);
    },
    [beiAktion, merken, router, setOffen]
  );

  function taste(ev) {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setAktivIdx((i) => (flach.length ? (i + 1) % flach.length : 0));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setAktivIdx((i) => (flach.length ? (i - 1 + flach.length) % flach.length : 0));
    } else if (ev.key === "Home" && ev.ctrlKey) {
      ev.preventDefault();
      setAktivIdx(0);
    } else if (ev.key === "End" && ev.ctrlKey) {
      ev.preventDefault();
      setAktivIdx(Math.max(0, flach.length - 1));
    } else if (ev.key === "PageDown") {
      ev.preventDefault();
      setAktivIdx((i) => Math.min(flach.length - 1, i + 5));
    } else if (ev.key === "PageUp") {
      ev.preventDefault();
      setAktivIdx((i) => Math.max(0, i - 5));
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      ausfuehren(flach[aktivIdx], { neuerTab: ev.ctrlKey || ev.metaKey });
    }
  }

  if (!offen) return null;

  const text = q.trim();
  const anzahlServer = treffer.length;
  let idx = -1;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[8vh] sm:px-6 sm:pt-[12vh]">
      <div className="pr-schleier absolute inset-0 bg-navy-950/55 backdrop-blur-sm" onClick={() => setOffen(false)} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Befehlspalette – suchen und ausführen"
        className="pr-palette relative flex max-h-[80vh] w-full max-w-[640px] flex-col overflow-hidden rounded-3xl bg-white shadow-e5 ring-1 ring-ink-200/80"
      >
        <div className="flex items-center gap-3 border-b border-ink-100 px-4 sm:px-5">
          {laedt ? <Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin text-ov-600" /> : <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-400" />}
          <input
            ref={eingabeRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${basisId}-liste`}
            aria-activedescendant={flach.length ? optionId(aktivIdx) : undefined}
            aria-autocomplete="list"
            aria-label="Suchen oder Befehl eingeben"
            aria-describedby={`${basisId}-hilfe`}
            autoComplete="off"
            spellCheck={false}
            value={q}
            maxLength={80}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={taste}
            placeholder="Fläche, Projekt, Vorgang oder Befehl suchen …"
            className="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-ink-900 outline-none placeholder:text-ink-500 focus-visible:outline-none"
            style={{ outline: "none", boxShadow: "none" }}
          />
          <button type="button" onClick={() => setOffen(false)} className="flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-ink-500 ring-1 ring-inset ring-ink-200 hover:bg-ink-50" aria-label="Befehlspalette schließen">
            <span className="hidden sm:inline">Esc</span>
            <X aria-hidden="true" className="h-4 w-4 sm:hidden" />
          </button>
        </div>

        <p id={`${basisId}-hilfe`} className="sr-only">Pfeiltasten wählen, Enter öffnet, Strg und Enter öffnet in neuem Tab, Escape schließt.</p>
        <p className="sr-only" role="status" aria-live="polite">
          {text.length >= SUCHE_MIN && !laedt ? `${flach.length} Ergebnisse` : ""}
        </p>

        <div ref={listeRef} id={`${basisId}-liste`} role="listbox" aria-label="Ergebnisse" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {fehler && <p className="mx-2 my-2 rounded-xl bg-danger-50 px-3 py-2 text-[13.5px] text-danger-700 ring-1 ring-danger-200">{fehler}</p>}
          {gruppen.map((g) => (
            <div key={g.id} role="group" aria-labelledby={`${basisId}-g-${g.id}`} className="mb-1">
              <p id={`${basisId}-g-${g.id}`} role="presentation" className="px-3 pb-1.5 pt-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                {g.titel}
              </p>
              {g.eintraege.map((e) => {
                idx++;
                const i = idx;
                const aktiv = i === aktivIdx;
                const Icon = g.id === "zuletzt" ? ART_ICON[e.art] || History : e.icon || ART_ICON[e.art] || FileText;
                return (
                  <div
                    key={e.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={aktiv}
                    onMouseMove={() => !aktiv && setAktivIdx(i)}
                    onClick={(ev) => ausfuehren(e, { neuerTab: ev.ctrlKey || ev.metaKey })}
                    className={cn("flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-100", aktiv ? "bg-ov-50 ring-1 ring-inset ring-ov-200" : "hover:bg-sand-50")}
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-100", aktiv ? "bg-ov-600 text-white shadow-e2" : "bg-sand-100 text-ink-600")}>
                      <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-ink-900">{e.titel}</span>
                      {e.untertitel && <span className="block truncate text-[12.5px] text-ink-500">{e.untertitel}</span>}
                    </span>
                    {e.kuerzel && (
                      <span className="hidden shrink-0 gap-1 sm:flex" aria-hidden="true">
                        {e.kuerzel.split(" ").map((k) => (
                          <kbd key={k} className="rounded-md bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-500 ring-1 ring-inset ring-ink-200">{k}</kbd>
                        ))}
                      </span>
                    )}
                    {aktiv && <CornerDownLeft aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-ov-700 sm:block" />}
                  </div>
                );
              })}
            </div>
          ))}
          {!flach.length && !laedt && (
            <div className="px-4 py-8 text-center">
              <SucheOhneTreffer className="mx-auto mb-2 h-[88px] w-[110px]" />
              <p className="font-display text-[16px] font-bold text-ink-900">Nichts gefunden</p>
              <p className="mt-1 text-[13.5px] text-ink-500">
                {text.length < SUCHE_MIN ? "Bitte mindestens zwei Zeichen eingeben." : "Versuchen Sie einen anderen Begriff, eine Kennung (z. B. F-26-…) oder einen Ort."}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 bg-sand-50/70 px-4 py-2.5 text-[12px] text-ink-500 sm:px-5">
          <span className="hidden items-center gap-3 sm:flex" aria-hidden="true">
            <span><kbd className="rounded bg-white px-1 ring-1 ring-ink-200">↑</kbd> <kbd className="rounded bg-white px-1 ring-1 ring-ink-200">↓</kbd> wählen</span>
            <span><kbd className="rounded bg-white px-1 ring-1 ring-ink-200">Enter</kbd> öffnen</span>
            <span><kbd className="rounded bg-white px-1 ring-1 ring-ink-200">?</kbd> Tastenkürzel</span>
          </span>
          <span>{text.length >= SUCHE_MIN ? `${anzahlServer} Treffer in Ihren Daten` : "Nur Inhalte, auf die Sie Zugriff haben"}</span>
          <button type="button" onClick={() => ausfuehren({ id: "hilfe", href: "/portal/hilfe", titel: "Hilfe & Tastenkürzel", art: "navigation" })} className="inline-flex items-center gap-1 font-semibold text-ov-700 hover:text-ov-800">
            Hilfe <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
