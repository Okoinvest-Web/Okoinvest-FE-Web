"use client";

// src/components/Portal/Akquise2/GemeindenScreening.js – Ranking der Gemeinden für die Akquise-Strategie: Potenzial
// (Kandidaten-ha/MWp, beste Flächen, UW-Kapazität), Bauleitplanung/Kriterienkatalog, Konkurrenz, Kampagnen-Stand;
// Pflege je Gemeinde, Kampagne für die Gemeinde anlegen, Übergabe an die Kommune-Ansprache (CRM).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Handshake, Megaphone, Plus, Trash2 } from "lucide-react";
import { Badge, Karte, Leer } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { Ampel, holen, knopf, zahl, datum } from "./teile";

const STUFE_TON = { A: "ok", B: "info", C: "neutral" };
const NETZ = { frei: "frei", unbekannt: "unbekannt", knapp: "knapp", keiner: "kein Knoten" };

function Balken({ teil }) {
  const q = teil.max ? Math.max(0, Math.min(1, teil.punkte / teil.max)) : 0;
  return (
    <div className="min-w-0">
      <div className="flex justify-between gap-2 text-[12.5px]"><span className="font-semibold text-ink-800">{teil.label}</span><span className="ov-num text-ink-600">{zahl(teil.punkte, 1)} / {teil.max}</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-ink-100"><div className="h-1.5 rounded-full bg-ov-500" style={{ width: `${q * 100}%` }} /></div>
      <p className="mt-0.5 text-[11.5px] text-ink-500">{teil.text}</p>
    </div>
  );
}

function GemeindeDetail({ g, labels, darfSchreiben, leitung, onNeu }) {
  const router = useRouter();
  const [f, setF] = useState({ bauleitplanung: g.bauleitplanungQuelle === "manuell" ? g.bauleitplanung : "", kriterienkatalog: g.kriterienkatalog || "", notiz: g.notiz || "" });
  const [k, setK] = useState({ entwickler: "", projekt: "", mw: "", status: "geruecht", quelle: "" });
  const [u, setU] = useState({ terminAm: "", notiz: "" });
  const [status, setStatus] = useState({ laeuft: false, fehler: "", ok: "" });
  const basis = { schluessel: g.schluessel, name: g.name, land: g.land, bundesland: g.bundesland };
  async function los(fn, ok) {
    setStatus({ laeuft: true, fehler: "", ok: "" });
    try {
      const r = await fn();
      setStatus({ laeuft: false, fehler: "", ok });
      onNeu();
      return r;
    } catch (e) {
      setStatus({ laeuft: false, fehler: e.message, ok: "" });
      return null;
    }
  }
  return (
    <div className="grid gap-5 border-t border-ink-100 px-4 py-4 lg:grid-cols-2">
      <div className="space-y-3">
        {g.ranking.teile.map((t) => <Balken key={t.id} teil={t} />)}
        <p className="text-[12.5px] text-ink-600">Beste Flächen: {g.beste.map((b) => `${zahl(b.ha, 1)} ha (Score ${b.score})`).join(" · ")}</p>
        {g.netz?.knoten?.length > 0 && <p className="text-[12.5px] text-ink-600">Netzknoten: {g.netz.knoten.map((x) => `${x.name || x.art} (${NETZ[x.kapazitaet] || x.kapazitaet}${x.freiMw ? `, ${x.freiMw} MW` : ""})`).join(" · ")}</p>}
        {g.anliegen && <p className="text-[12.5px] text-ink-600">Kommunales Anliegen: <Link href={`/portal/admin/vorgaenge/${g.anliegen.vorgangId}`} className="font-semibold text-ov-700">{g.anliegen.vorgangId}</Link> vom {datum(g.anliegen.am)}</p>}
        {g.crm && <p className="text-[12.5px] text-ink-600">CRM: {g.crm.name} · {g.crm.aktivitaeten} Aktivitäten</p>}
      </div>
      <div className="space-y-4">
        {darfSchreiben && (
          <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); los(() => senden("/api/admin/geodaten/gemeinden", { method: "PATCH", body: { ...basis, ...f } }), "Gespeichert."); }}>
            <label className="text-[12.5px] font-semibold text-ink-700">Bauleitplanung
              <select value={f.bauleitplanung} onChange={(e) => setF({ ...f, bauleitplanung: e.target.value })} className={cn(auswahlfeld, "mt-1 h-10")}>
                <option value="">{g.bauleitplanungQuelle === "anliegen" ? `aus Anliegen: ${labels.bauleitplanung[g.bauleitplanung] || "–"}` : "unbekannt"}</option>
                {Object.entries(labels.bauleitplanung).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
              </select>
            </label>
            <label className="text-[12.5px] font-semibold text-ink-700">Kriterienkatalog
              <select value={f.kriterienkatalog} onChange={(e) => setF({ ...f, kriterienkatalog: e.target.value })} className={cn(auswahlfeld, "mt-1 h-10")}>
                <option value="">unbekannt</option>
                {Object.entries(labels.kriterienkatalog).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
              </select>
            </label>
            <input aria-label="Notiz" placeholder="Notiz (Haltung Gemeinderat, Ansprechpartner-Funktion …)" value={f.notiz} onChange={(e) => setF({ ...f, notiz: e.target.value })} className={cn(eingabe, "h-10 sm:col-span-2")} />
            <button type="submit" className={cn(knopf.primaer, "sm:col-span-2 sm:justify-self-start")} disabled={status.laeuft}>Stand speichern</button>
          </form>
        )}
        <div>
          <p className="text-[13px] font-semibold text-ink-800">Konkurrenzhinweise ({g.konkurrenz.length})</p>
          <ul className="mt-1 space-y-1 text-[12.5px] text-ink-700">
            {g.konkurrenz.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1">{[x.entwickler, x.projekt].filter(Boolean).join(" – ")}{x.mw ? ` · ${zahl(x.mw, 1)} MW` : ""} · {labels.konkurrenz[x.status]} <span className="text-ink-500">(Quelle: {x.quelle})</span></span>
                {darfSchreiben && <button type="button" className={knopf.klein} aria-label="Hinweis entfernen" onClick={() => los(() => senden("/api/admin/geodaten/gemeinden/konkurrenz", { method: "DELETE", body: { schluessel: g.schluessel, id: x.id } }), "Entfernt.")}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>}
              </li>
            ))}
          </ul>
          {darfSchreiben && (
            <form className="mt-2 grid gap-2 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); los(() => senden("/api/admin/geodaten/gemeinden/konkurrenz", { body: { ...basis, ...k } }), "Hinweis erfasst.").then((r) => r && setK({ entwickler: "", projekt: "", mw: "", status: "geruecht", quelle: "" })); }}>
              <input aria-label="Entwickler" placeholder="Entwickler" value={k.entwickler} onChange={(e) => setK({ ...k, entwickler: e.target.value })} className={cn(eingabe, "h-9")} />
              <input aria-label="Projekt" placeholder="Projekt/Ort" value={k.projekt} onChange={(e) => setK({ ...k, projekt: e.target.value })} className={cn(eingabe, "h-9")} />
              <input aria-label="MW" placeholder="MW" inputMode="decimal" value={k.mw} onChange={(e) => setK({ ...k, mw: e.target.value })} className={cn(eingabe, "h-9")} />
              <select aria-label="Stand" value={k.status} onChange={(e) => setK({ ...k, status: e.target.value })} className={cn(auswahlfeld, "h-9")}>{Object.entries(labels.konkurrenz).map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
              <input aria-label="Quelle" required placeholder="Quelle (Pflicht): Protokoll, Presse …" value={k.quelle} onChange={(e) => setK({ ...k, quelle: e.target.value })} className={cn(eingabe, "h-9 sm:col-span-3")} />
              <button type="submit" className={knopf.klein} disabled={status.laeuft}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Erfassen</button>
            </form>
          )}
        </div>
        {darfSchreiben && (
          <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-3">
            <button type="button" className={knopf.sekundaer} disabled={status.laeuft} onClick={async () => { const r = await los(() => senden("/api/admin/geodaten/kampagnen", { body: { name: `Gemeinde ${g.name} – ${new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`, gemeinde: g.name, land: g.land } }), "Kampagne angelegt."); if (r) router.push(`/portal/admin/akquise/kampagnen/${r.kampagne.id}`); }}>
              <Megaphone className="h-4 w-4" aria-hidden="true" /> Kampagne für die Gemeinde
            </button>
          </div>
        )}
        {g.uebergabe ? (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-ov-50 px-3 py-2 text-[12.5px] text-ov-900 ring-1 ring-ov-200">
            <Handshake className="h-4 w-4" aria-hidden="true" /> An die Kommune-Ansprache übergeben am {datum(g.uebergabe.am)}{g.uebergabe.terminAm ? ` · Termin ${datum(g.uebergabe.terminAm)}` : ""}
            <Link href="/portal/admin/crm" className="font-semibold text-ov-800">CRM</Link>
            {leitung && darfSchreiben && <button type="button" className={knopf.klein} onClick={() => los(() => senden("/api/admin/geodaten/gemeinden/uebergabe", { method: "DELETE", body: { schluessel: g.schluessel } }), "Übergabe zurückgenommen.")}>Zurücknehmen</button>}
          </div>
        ) : darfSchreiben && (
          <form className="grid gap-2 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); los(() => senden("/api/admin/geodaten/gemeinden/uebergabe", { body: { ...basis, ...u, punkte: g.ranking.punkte } }), "Übergeben: CRM-Aktivität und Aufgabe angelegt."); }}>
            <label className="text-[12.5px] font-semibold text-ink-700 sm:col-span-2">Termin (optional)<input type="datetime-local" value={u.terminAm} onChange={(e) => setU({ ...u, terminAm: e.target.value })} className={cn(eingabe, "mt-1 h-10")} /></label>
            <input aria-label="Notiz zur Übergabe" placeholder="Kurz: warum jetzt, welche Flächen" value={u.notiz} onChange={(e) => setU({ ...u, notiz: e.target.value })} className={cn(eingabe, "h-10 self-end sm:col-span-2")} />
            <button type="submit" className={cn(knopf.navy, "sm:col-span-2 sm:justify-self-start")} disabled={status.laeuft}><Handshake className="h-4 w-4" aria-hidden="true" /> An Kommune-Ansprache übergeben</button>
          </form>
        )}
        <FehlerBox>{status.fehler}</FehlerBox>
        <ErfolgBox>{status.ok}</ErfolgBox>
      </div>
    </div>
  );
}

export default function GemeindenScreening({ start, gebiete = {}, darfSchreiben = false, leitung = false }) {
  const [daten, setDaten] = useState(start);
  const [filter, setFilter] = useState({ land: "", bundesland: "", minPunkte: "" });
  const [offen, setOffen] = useState(null);
  const [fehler, setFehler] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!version && !filter.land && !filter.bundesland && !filter.minPunkte) return;
    const qs = new URLSearchParams(Object.entries(filter).filter(([, x]) => x));
    holen(`/api/admin/geodaten/gemeinden?${qs}`).then(setDaten).catch((e) => setFehler(e.message));
  }, [filter, version]);
  const liste = daten?.gemeinden || [];
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <select aria-label="Land" value={filter.land} onChange={(e) => setFilter({ ...filter, land: e.target.value, bundesland: "" })} className={cn(auswahlfeld, "h-10")}>
          <option value="">Alle Länder</option><option value="DE">Deutschland</option><option value="AT">Österreich</option><option value="CH">Schweiz</option>
        </select>
        <select aria-label="Bundesland" value={filter.bundesland} onChange={(e) => setFilter({ ...filter, bundesland: e.target.value })} className={cn(auswahlfeld, "h-10")}>
          <option value="">Alle Bundesländer/Kantone</option>
          {(gebiete.bundeslaender || []).map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
        </select>
        <select aria-label="Mindestpunkte" value={filter.minPunkte} onChange={(e) => setFilter({ ...filter, minPunkte: e.target.value })} className={cn(auswahlfeld, "h-10")}>
          <option value="">Alle Punkte</option><option value="45">ab 45 (B)</option><option value="65">ab 65 (A)</option>
        </select>
        <p className="self-center text-[12.5px] text-ink-500">{liste.length} Gemeinden</p>
      </div>
      <FehlerBox>{fehler}</FehlerBox>
      {liste.length === 0 ? <Leer icon={Megaphone} titel="Keine Gemeinden" text="Für diese Auswahl gibt es keine Kandidatenflächen." /> : (
        <Karte innen="p-0">
          <ul className="divide-y divide-ink-100">
            {liste.map((g) => (
              <li key={g.schluessel}>
                <button type="button" onClick={() => setOffen(offen === g.schluessel ? null : g.schluessel)} aria-expanded={offen === g.schluessel} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-sand-50 md:flex-nowrap">
                  <span className="ov-num w-8 shrink-0 text-[13px] font-bold text-ink-500">#{g.rang}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold text-ink-900">{g.name}</span>
                    <span className="block truncate text-[12px] text-ink-500">{[g.bezirk, g.bundesland].filter(Boolean).join(" · ")} · {g.kandidaten} Flächen · {zahl(g.haGeeignet, 1)} von {zahl(g.ha, 1)} ha geeignet · {zahl(g.mwp, 1)} MWp</span>
                  </span>
                  <span className="hidden text-[12px] text-ink-600 lg:block">Netz {NETZ[g.netz?.status]}</span>
                  <span className="hidden text-[12px] text-ink-600 lg:block">{g.bauleitplanung ? daten.labels.bauleitplanung[g.bauleitplanung] : "Planung ?"}</span>
                  {g.konkurrenz.length > 0 && <Badge ton="warn">{g.konkurrenz.length} Konkurrenz</Badge>}
                  {g.kampagnen.ziele > 0 && <Badge ton="info">{g.kampagnen.ziele} in Kampagnen</Badge>}
                  {g.uebergabe && <Badge ton="ok">übergeben</Badge>}
                  <Ampel ampel={g.ranking.punkte >= 65 ? "gruen" : g.ranking.punkte >= 45 ? "gelb" : "rot"} wert={g.ranking.punkte} />
                  <Badge ton={STUFE_TON[g.ranking.stufe]}>{g.ranking.stufe}</Badge>
                  <ChevronDown className={cn("h-4 w-4 text-ink-400 transition-transform", offen === g.schluessel && "rotate-180")} aria-hidden="true" />
                </button>
                {offen === g.schluessel && <GemeindeDetail g={g} labels={daten.labels} darfSchreiben={darfSchreiben} leitung={leitung} onNeu={() => setVersion((x) => x + 1)} />}
              </li>
            ))}
          </ul>
        </Karte>
      )}
    </div>
  );
}
