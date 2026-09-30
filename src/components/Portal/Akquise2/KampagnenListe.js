"use client";

// src/components/Portal/Akquise2/KampagnenListe.js – Übersicht der Akquise-Kampagnen + neue Kampagne aus Gemeinde oder Filter.
// (Aus der Kartenauswahl legt die Akquise-Karte Kampagnen direkt an.)

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Megaphone, Plus, RefreshCw, ShieldBan } from "lucide-react";
import { Badge, Karte, Leer } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { KAMPAGNE_STATUS } from "@/lib/plattform/akquise-kampagne";
import { eur, knopf, zahl } from "./teile";

const TON = { entwurf: "neutral", aktiv: "ok", abgeschlossen: "info" };

export default function KampagnenListe({ kampagnen = [], sperrlisteAnzahl = 0, gebiete = {}, darfSchreiben = false, leitung = false }) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [f, setF] = useState({ name: "", quelle: "gemeinde", gemeinde: "", land: "", minScore: "55", minHa: "5", maxTrasseKm: "", bundesland: "", test: false });
  const [status, setStatus] = useState({ laeuft: false, fehler: "", ok: "" });
  const gemeinden = gebiete.gemeinden || [];

  async function anlegen(e) {
    e.preventDefault();
    setStatus({ laeuft: true, fehler: "", ok: "" });
    try {
      const body = { name: f.name, test: leitung && f.test };
      if (f.quelle === "gemeinde") Object.assign(body, { gemeinde: f.gemeinde, land: f.land || undefined });
      else body.filter = { land: f.land || undefined, bundesland: f.bundesland || undefined, minScore: f.minScore, minHa: f.minHa, maxTrasseKm: f.maxTrasseKm || undefined };
      const r = await senden("/api/admin/geodaten/kampagnen", { body });
      router.push(`/portal/admin/akquise/kampagnen/${r.kampagne.id}`);
    } catch (err) {
      setStatus({ laeuft: false, fehler: err.message, ok: "" });
    }
  }

  async function nachfassen() {
    setStatus({ laeuft: true, fehler: "", ok: "" });
    try {
      const r = await senden("/api/admin/geodaten/kampagnen/nachfassen", { body: {} });
      setStatus({ laeuft: false, fehler: "", ok: r.ausgeloest ? `${r.ausgeloest} Nachfassstufe(n) ausgelöst.` : "Keine Nachfassstufe fällig." });
      router.refresh();
    } catch (err) {
      setStatus({ laeuft: false, fehler: err.message, ok: "" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {darfSchreiben && (
          <button type="button" className={knopf.primaer} onClick={() => setOffen((x) => !x)} aria-expanded={offen}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Neue Kampagne
          </button>
        )}
        {darfSchreiben && (
          <button type="button" className={knopf.sekundaer} onClick={nachfassen} disabled={status.laeuft}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Nachfassstufen prüfen
          </button>
        )}
        <Link href="/portal/admin/akquise/sperrliste" className={knopf.sekundaer}>
          <ShieldBan className="h-4 w-4" aria-hidden="true" /> Sperrliste ({zahl(sperrlisteAnzahl)})
        </Link>
      </div>
      <FehlerBox>{status.fehler}</FehlerBox>
      <ErfolgBox>{status.ok}</ErfolgBox>

      {offen && (
        <Karte titel="Neue Kampagne" untertitel="Aus einer Gemeinde oder einem Filter – für eine Auswahl einzelner Flächen die Akquise-Karte nutzen (Liste → „Kampagne“).">
          <form onSubmit={anlegen} className="grid gap-4 md:grid-cols-2">
            <Feld id="k-name" label="Name der Kampagne" pflicht className="md:col-span-2">
              <input id="k-name" required minLength={3} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={eingabe} placeholder="z. B. Unterallgäu A 96 – Herbst 2026" />
            </Feld>
            <fieldset className="md:col-span-2">
              <legend className="mb-1.5 text-[13.5px] font-semibold text-ink-700">Kandidatenmenge</legend>
              <div className="flex flex-wrap gap-2">
                {[["gemeinde", "Gemeinde"], ["filter", "Filter"]].map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={f.quelle === v} onClick={() => setF({ ...f, quelle: v })} className={f.quelle === v ? knopf.navy : knopf.sekundaer}>{l}</button>
                ))}
              </div>
            </fieldset>
            {f.quelle === "gemeinde" ? (
              <Feld id="k-gem" label="Gemeinde" pflicht hinweis="Alle Kandidatenflächen der Gemeinde mit Score ≥ 45." className="md:col-span-2">
                <select id="k-gem" required value={f.gemeinde} onChange={(e) => setF({ ...f, gemeinde: e.target.value })} className={auswahlfeld}>
                  <option value="">Bitte wählen</option>
                  {gemeinden.map((g) => <option key={g.name} value={g.name}>{g.name} ({g.anzahl})</option>)}
                </select>
              </Feld>
            ) : (
              <>
                <Feld id="k-land" label="Land">
                  <select id="k-land" value={f.land} onChange={(e) => setF({ ...f, land: e.target.value })} className={auswahlfeld}>
                    <option value="">Alle (eine Kampagne = ein Land)</option>
                    <option value="DE">Deutschland</option>
                    <option value="AT">Österreich</option>
                    <option value="CH">Schweiz</option>
                  </select>
                </Feld>
                <Feld id="k-bl" label="Bundesland / Kanton">
                  <select id="k-bl" value={f.bundesland} onChange={(e) => setF({ ...f, bundesland: e.target.value })} className={auswahlfeld}>
                    <option value="">Alle</option>
                    {(gebiete.bundeslaender || []).map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
                  </select>
                </Feld>
                <Feld id="k-score" label="Mindest-Score"><input id="k-score" inputMode="numeric" value={f.minScore} onChange={(e) => setF({ ...f, minScore: e.target.value })} className={eingabe} /></Feld>
                <Feld id="k-ha" label="Mindestgröße (ha)"><input id="k-ha" inputMode="decimal" value={f.minHa} onChange={(e) => setF({ ...f, minHa: e.target.value })} className={eingabe} /></Feld>
                <Feld id="k-tr" label="Max. Trasse (km)"><input id="k-tr" inputMode="decimal" value={f.maxTrasseKm} onChange={(e) => setF({ ...f, maxTrasseKm: e.target.value })} className={eingabe} /></Feld>
              </>
            )}
            {leitung && (
              <label className="flex items-center gap-2 text-[13.5px] text-ink-700 md:col-span-2">
                <input type="checkbox" checked={f.test} onChange={(e) => setF({ ...f, test: e.target.checked })} className="h-4 w-4 accent-[#558227]" />
                Testkampagne (vollständig löschbar inkl. Sperrvermerke und Rückläufer – nicht für echten Versand)
              </label>
            )}
            <div className="md:col-span-2">
              <button type="submit" className={knopf.primaer} disabled={status.laeuft}>Kampagne anlegen</button>
            </div>
          </form>
        </Karte>
      )}

      {kampagnen.length === 0 ? (
        <Leer icon={Megaphone} titel="Noch keine Kampagne" text="Kampagnen bündeln Zielflächen: Eigentümer ermitteln, Serienbrief mit persönlichem Link, Rücklauf und Nachfassen – mit Kennzahlen bis zu den Kosten je gesichertem Hektar." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {kampagnen.map((k) => {
            const z = k.kennzahlen;
            return (
              <Link key={k.id} href={`/portal/admin/akquise/kampagnen/${k.id}`} className="ov-card-hover block min-w-0 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-[17px] font-bold text-ink-900">{k.name}</p>
                    <p className="text-[12.5px] text-ink-500">{k.id} · {{ DE: "Deutschland", AT: "Österreich", CH: "Schweiz" }[k.land]} · {k.zustaendigName || k.erstelltVonName}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {k.test && <Badge ton="warn">Test</Badge>}
                    {k.demo && <Badge ton="warn">Demo-Daten</Badge>}
                    <Badge ton={TON[k.status]}>{KAMPAGNE_STATUS[k.status]}</Badge>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-[12.5px] sm:grid-cols-6">
                  {[["Ziele", zahl(z.ziele)], ["ha", zahl(z.ha, 1)], ["Briefe", zahl(z.briefe)], ["Aufrufe", zahl(z.aufrufe)], ["Anfragen", zahl(z.anfragen)], ["gesichert", `${zahl(z.gesichertHa, 1)} ha`]].map(([l, w]) => (
                    <div key={l} className="min-w-0"><dt className="text-ink-500">{l}</dt><dd className="ov-num font-bold text-ink-900">{w}</dd></div>
                  ))}
                </dl>
                <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-600">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Kosten {eur(z.kosten.summe, z.kosten.waehrung)}{z.kostenJeHa != null ? ` · ${eur(z.kostenJeHa, z.kosten.waehrung)} je gesichertem ha` : ""}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
