"use client";

// Deal-Kanban des Investors über alle Interessen: Beobachten → NDA → Datenraum → Angebot → Verhandlung →
// Gewonnen/Verloren. Die Spalte ergibt sich aus dem Status (Server); eine eigene Einordnung ist möglich
// (Ziehen & Ablegen oder Auswahlfeld – tastaturbedienbar) und bleibt privat. Filter: Suche, Tag, Land.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, GripVertical, Search, StickyNote } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { eur, mwp, relativ } from "@/lib/plattform/format";
import { LAENDER, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { PIPELINE_SPALTEN } from "@/lib/plattform/dealroom";
import { phaseById } from "@/lib/invest/markt";
import { eingabe, auswahlfeld } from "@/components/Portal/felder";
import NotizEditor from "./NotizEditor";

const SPALTEN_TON = {
  beobachten: "bg-ink-300",
  nda: "bg-sun-400",
  datenraum: "bg-navy-500",
  angebot: "bg-ov-400",
  verhandlung: "bg-ov-600",
  gewonnen: "bg-ov-800",
  verloren: "bg-ink-400",
};

function Karte({ k, tags, verschieben, ziehen }) {
  const [offen, setOffen] = useState(false);
  const p = k.projekt;
  const phase = p.phase ? phaseById(p.phase) : null;
  const ziel = k.dealroom ? `/portal/dealroom/${p.id}` : `/portal/boerse/${p.id}`;
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", p.id);
        e.dataTransfer.effectAllowed = "move";
        ziehen(p.id);
      }}
      onDragEnd={() => ziehen("")}
      className="group rounded-2xl bg-white p-3.5 ring-1 ring-ink-200/70 transition-shadow hover:shadow-[0_10px_28px_-18px_rgba(3,18,43,0.45)]"
    >
      <div className="flex items-start gap-2">
        <GripVertical aria-hidden="true" className="mt-0.5 hidden h-4 w-4 shrink-0 cursor-grab text-ink-300 md:block" />
        <div className="min-w-0 flex-1">
          <Link href={ziel} className="group/link inline-flex items-start gap-1 font-display text-[14.5px] font-bold leading-snug text-ink-900 hover:text-ov-700">
            <span className="min-w-0 break-words">{p.titel}</span>
            <ArrowUpRight aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60 group-hover/link:opacity-100" />
          </Link>
          <p className="mt-1 text-[12.5px] text-ink-500">{[mwp(p.mwp), phase?.kurz, LAENDER[p.land]].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 text-[12px] text-ink-500">{PROJEKT_TYPEN[p.typ]} · {k.statusLabel}{k.manuell ? " · eigene Einordnung" : ""}</p>
          {k.letztesGebot && <p className="ov-num mt-1.5 text-[12.5px] font-semibold text-ink-800">Gebot {k.letztesGebot.preisGesamt ? eur(k.letztesGebot.preisGesamt) : "–"} · Runde {k.letztesGebot.runde}</p>}
          {k.notiz?.tags?.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1">
              {k.notiz.tags.map((t) => <span key={t} className="rounded-full bg-navy-50 px-2 py-0.5 text-[11.5px] font-semibold text-navy-800">#{t}</span>)}
            </p>
          )}
          {k.notiz?.text && !offen && <p className="mt-2 line-clamp-2 text-[12.5px] text-ink-600">{k.notiz.text}</p>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-2.5">
        <label className="sr-only" htmlFor={`spalte-${p.id}`}>Spalte für {p.titel}</label>
        <select id={`spalte-${p.id}`} className={cn(auswahlfeld, "h-8 min-w-0 flex-1 rounded-lg bg-[length:14px] pl-2.5 pr-7 text-[12.5px]")} value={k.spalte} onChange={(e) => verschieben(p.id, e.target.value)}>
          {PIPELINE_SPALTEN.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button type="button" onClick={() => setOffen((x) => !x)} aria-expanded={offen} className={cn("inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-semibold ring-1 ring-inset", offen ? "bg-navy-900 text-white ring-navy-900" : "text-ink-700 ring-ink-200 hover:bg-ink-50")}>
          <StickyNote aria-hidden="true" className="h-3.5 w-3.5" /> Notiz
        </button>
      </div>
      {offen && (
        <div className="mt-3">
          <NotizEditor projektId={p.id} notiz={k.notiz} vorschlaege={tags} kompakt />
        </div>
      )}
    </li>
  );
}

export default function Kanban({ karten = [], tags = [] }) {
  const router = useRouter();
  const [lokal, setLokal] = useState({});
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [land, setLand] = useState("");
  const [gezogen, setGezogen] = useState("");
  const [ueber, setUeber] = useState("");
  const [fehler, setFehler] = useState("");

  const liste = useMemo(() => {
    const t = q.trim().toLowerCase();
    return karten
      .map((k) => (lokal[k.projekt.id] ? { ...k, spalte: lokal[k.projekt.id], manuell: lokal[k.projekt.id] !== k.spalteAuto } : k))
      .filter((k) => (!tag || k.notiz?.tags?.includes(tag)) && (!land || k.projekt.land === land) && (!t || `${k.projekt.titel} ${k.projekt.region} ${k.notiz?.text || ""}`.toLowerCase().includes(t)));
  }, [karten, lokal, q, tag, land]);

  async function verschieben(projektId, spalte) {
    const k = karten.find((x) => x.projekt.id === projektId);
    if (!k) return;
    setLokal((x) => ({ ...x, [projektId]: spalte }));
    setFehler("");
    try {
      await senden("/api/portal/pipeline", { method: "PUT", body: { projektId, spalte: spalte === k.spalteAuto ? "" : spalte } });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
      setLokal((x) => {
        const y = { ...x };
        delete y[projektId];
        return y;
      });
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative block w-full md:w-64">
          <span className="sr-only">Pipeline durchsuchen</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className={cn(eingabe, "h-10 pl-9 text-[14px]")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Projekt, Region, Notiz …" />
        </label>
        <div className="flex flex-wrap gap-2 md:flex-nowrap">
          <label className="sr-only" htmlFor="kb-land">Land</label>
          <select id="kb-land" className={cn(auswahlfeld, "h-10 w-auto text-[13.5px]")} value={land} onChange={(e) => setLand(e.target.value)}>
            <option value="">Alle Länder</option>
            {Object.entries(LAENDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {tags.length > 0 && (
            <>
              <label className="sr-only" htmlFor="kb-tag">Tag</label>
              <select id="kb-tag" className={cn(auswahlfeld, "h-10 w-auto text-[13.5px]")} value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">Alle Tags</option>
                {tags.map((t) => <option key={t} value={t}>#{t}</option>)}
              </select>
            </>
          )}
        </div>
        <p className="text-[13px] text-ink-500 md:ml-auto">Karten ziehen oder per Auswahlfeld einordnen – nur für Sie sichtbar.</p>
      </div>
      {fehler && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13.5px] text-red-800 ring-1 ring-red-200">{fehler}</p>}
      <div className="relative -mx-4 overflow-x-auto px-4 pb-3 [contain:inline-size] md:-mx-0 md:px-0">
        <ol className="flex min-w-max gap-3.5">
          {PIPELINE_SPALTEN.map((s) => {
            const inhalt = liste.filter((k) => k.spalte === s.id);
            const summe = Math.round(inhalt.reduce((x, k) => x + (Number(k.projekt.mwp) || 0), 0) * 10) / 10;
            return (
              <li
                key={s.id}
                onDragOver={(e) => {
                  if (!gezogen) return;
                  e.preventDefault();
                  setUeber(s.id);
                }}
                onDragLeave={() => setUeber((u) => (u === s.id ? "" : u))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || gezogen;
                  setUeber("");
                  if (id) verschieben(id, s.id);
                }}
                className={cn("flex w-[272px] shrink-0 flex-col rounded-3xl bg-sand-50 p-2.5 ring-1 ring-inset transition-colors", ueber === s.id ? "ring-2 ring-ov-500" : "ring-ink-200/70")}
                aria-label={`${s.label}: ${inhalt.length} Projekte`}
              >
                <div className="px-2 pb-2.5 pt-1.5">
                  <p className="flex items-center gap-2 font-display text-[14.5px] font-bold text-ink-900">
                    <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", SPALTEN_TON[s.id])} />
                    {s.label}
                    <span className="ov-num ml-auto rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-ink-600 ring-1 ring-inset ring-ink-200">{inhalt.length}</span>
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-ink-500">{summe ? `${mwp(summe)} · ` : ""}{s.text}</p>
                </div>
                <ul className="flex min-h-[84px] flex-col gap-2.5">
                  {inhalt.map((k) => <Karte key={k.projekt.id} k={k} tags={tags} verschieben={verschieben} ziehen={setGezogen} />)}
                  {!inhalt.length && <li className="rounded-2xl border border-dashed border-ink-200 px-3 py-5 text-center text-[12.5px] text-ink-400">leer</li>}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
      {karten.length > 0 && <p className="mt-2 text-[12px] text-ink-500">Zuletzt geändert {relativ(karten[0].geaendertAm)}.</p>}
    </div>
  );
}
