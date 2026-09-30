"use client";

// Investoren-Finanzierungscockpit: Projektdaten (vorbelegt aus Börse/Datenraum oder frei), Rendite (Projekt/EK), NPV,
// Amortisation, LCOE, Finanzierungsvarianten nebeneinander, Liquiditätsverlauf, Stresstest, Förder-Check, Steuereffekt
// (Näherung), Szenarien speichern/vergleichen/PDF. Gerechnet wird mit denselben reinen Funktionen wie auf dem Server
// (src/lib/plattform/finanzierung/kern.js); beim Speichern rechnet der Server selbst nach.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Download, ExternalLink, Info, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";
import { rechneCockpit, cockpitStandard, COCKPIT_FELDER, VARIANTEN, VARIANTEN_IDS, TYPEN_FZ } from "@/lib/plattform/finanzierung/kern";
import { foerderCheck, PASSUNG, FOERDER_ARTEN, FOERDER_HINWEIS } from "@/lib/plattform/finanzierung/foerder";
import { senden } from "@/lib/plattform/client";
import { eingabe, auswahlfeld, FehlerBox, ErfolgBox } from "@/components/Portal/felder";
import { Badge } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import LiquiditaetChart from "./LiquiditaetChart";
import { teur, pct, fx, jahre, HINWEIS_BERATUNG } from "./teile";

const GRUPPEN = [
  ["projekt", "Projekt & Erlöse"],
  ["finanzierung", "Finanzierung (Profi-Parameter)"],
  ["steuer", "Steuern (Näherung)"],
];

function feldWert(f, w) {
  if (f.prozent) return Number.isFinite(w) ? Math.round(w * 10000) / 100 : "";
  return w ?? "";
}

function Feld({ f, wert, quelle, onChange }) {
  const id = `fz-${f.id}`;
  if (f.typ === "schalter") {
    return (
      <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2 text-[13.5px] ring-1 ring-inset ring-ink-200">
        <span className="font-medium text-ink-800">{f.label}</span>
        <input type="checkbox" checked={!!wert} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[var(--color-ov-600)]" />
      </label>
    );
  }
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 flex items-baseline justify-between gap-2 text-[12.5px] font-semibold text-ink-700">
        <span>{f.label}</span>
        {quelle && <span className="shrink-0 rounded-full bg-navy-50 px-1.5 text-[10.5px] font-semibold text-navy-700" title="Herkunft des Werts">{quelle}</span>}
      </label>
      {f.typ === "auswahl" ? (
        <select id={id} value={wert} onChange={(e) => onChange(e.target.value)} className={cn(auswahlfeld, "h-11 text-[14px]")}>
          {f.optionen.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      ) : (
        <div className="relative">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step={f.prozent ? f.schritt * 100 : f.schritt}
            min={f.prozent ? f.min * 100 : f.min}
            max={f.prozent ? f.max * 100 : f.max}
            value={feldWert(f, wert)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value === "" || !Number.isFinite(n)) return;
              onChange(f.prozent ? n / 100 : n);
            }}
            className={cn(eingabe, "h-11 pr-16 text-[14px]")}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-500">{f.einheit}</span>
        </div>
      )}
    </div>
  );
}

const ZEILEN = [
  ["Kapitalbedarf Eigenkapital", (v) => teur(v.kapitalbedarfEk)],
  ["Fremdkapital / Quote", (v) => (v.fremdkapital > 0 ? `${teur(v.fremdkapital)} · ${pct(v.fkQuote, 0)}` : v.leasing ? "Leasing" : "–")],
  ["Rate / Schuldendienst Jahr 1", (v) => teur(v.rateJahr1)],
  ["Ø Schuldendienst p. a.", (v) => teur(v.schuldendienstMittel)],
  ["DSCR min / Ø (P50)", (v) => (v.dscrMin != null ? `${fx(v.dscrMin)} / ${fx(v.dscrMittel)}` : "–")],
  ["DSCR min (P90)", (v) => fx(v.dscrMinP90)],
  ["LLCR", (v) => fx(v.llcr)],
  ["EK-IRR vor Steuern (P50)", (v) => pct(v.ekIrr)],
  ["EK-IRR im P90-Fall", (v) => pct(v.ekIrrP90)],
  ["EK-IRR nach Steuern (Näherung)", (v) => pct(v.ekIrrNachSteuer)],
  ["Kapitalwert EK (Diskont)", (v) => teur(v.npvEk)],
  ["Amortisation EK", (v) => jahre(v.amortisationEk)],
  ["ROI Eigenkapital (gesamt)", (v) => pct(v.roiEk, 0)],
  ["Finanzierungskosten gesamt", (v) => teur(v.gesamtkostenFinanzierung)],
  ["Größter Liquiditätsbedarf", (v) => teur(v.minLiquiditaet)],
];

export default function Cockpit({ start, quellen = {}, projekt = null, projekte = [], szenarien: szenarienStart = [], vbHinweise = [] }) {
  const router = useRouter();
  const [e, setE] = useState(start);
  const [offen, setOffen] = useState({ projekt: true, finanzierung: false, steuer: false });
  const [linien, setLinien] = useState(["ek", "skulptiert", "foerder"]);
  const [fokus, setFokus] = useState("skulptiert");
  const [name, setName] = useState(projekt ? `${projekt.titel.slice(0, 50)} – Szenario` : "Mein Szenario");
  const [szenarien, setSzenarien] = useState(szenarienStart);
  const [vergleich, setVergleich] = useState([]);
  const [status, setStatus] = useState({ laeuft: false, fehler: "", ok: "" });

  const r = useMemo(() => rechneCockpit(e, { stressVariante: fokus }), [e, fokus]);
  const setze = (id, w) => setE((x) => ({ ...x, [id]: w }));
  const foerder = useMemo(() => foerderCheck({ land: e.land, typ: e.typ, kwp: e.mwp * 1000, eigenverbrauch: e.modell === "contracting" }), [e.land, e.typ, e.mwp, e.modell]);

  const speichern = async () => {
    setStatus({ laeuft: true, fehler: "", ok: "" });
    try {
      const x = await senden("/api/portal/finanzierung", { body: { projektId: projekt?.id || "", name, eingaben: e, fokus } });
      setSzenarien((s) => [x.szenario, ...s]);
      setStatus({ laeuft: false, fehler: "", ok: "Szenario gespeichert – als PDF abrufbar und vergleichbar." });
      router.refresh();
    } catch (err) {
      setStatus({ laeuft: false, fehler: err.message, ok: "" });
    }
  };
  const loeschen = async (id) => {
    try {
      await senden(`/api/portal/finanzierung/szenarien/${id}`, { method: "DELETE" });
      setSzenarien((s) => s.filter((x) => x.id !== id));
      setVergleich((v) => v.filter((x) => x !== id));
    } catch (err) {
      setStatus({ laeuft: false, fehler: err.message, ok: "" });
    }
  };

  const liquiditaet = linien.filter((id) => VARIANTEN[id]).slice(0, 3).map((id) => {
    const v = r.varianten.find((x) => x.art === id);
    return { id, label: v.label, kurz: v.kurz, werte: v.reihen.liquiditaet };
  });
  const vergleichListe = szenarien.filter((s) => vergleich.includes(s.id));

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      {/* ------------------------------------------------ Eingaben */}
      <aside className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1" aria-label="Annahmen">
        <div className="grid grid-cols-2 gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink-200/70">
          <div>
            <label htmlFor="fz-land" className="mb-1 block text-[12.5px] font-semibold text-ink-700">Land</label>
            <select id="fz-land" value={e.land} onChange={(ev) => setE((x) => ({ ...x, land: ev.target.value, steuersatz: cockpitStandard({ land: ev.target.value }).steuersatz, foerderZins: cockpitStandard({ land: ev.target.value }).foerderZins, ifb: ev.target.value === "AT" }))} className={cn(auswahlfeld, "h-11 text-[14px]")}>
              <option value="DE">Deutschland</option>
              <option value="AT">Österreich</option>
              <option value="CH">Schweiz</option>
            </select>
          </div>
          <div>
            <label htmlFor="fz-typ" className="mb-1 block text-[12.5px] font-semibold text-ink-700">Anlagentyp</label>
            <select id="fz-typ" value={e.typ} onChange={(ev) => setze("typ", ev.target.value)} className={cn(auswahlfeld, "h-11 text-[14px]")}>
              {Object.entries(TYPEN_FZ).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => setE(start)} className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-full text-[13px] font-semibold text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
            <RotateCcw aria-hidden="true" className="h-4 w-4" /> {projekt ? "Werte aus dem Projekt wiederherstellen" : "Standardwerte wiederherstellen"}
          </button>
        </div>
        {GRUPPEN.map(([g, titel]) => (
          <section key={g} className="rounded-3xl bg-sand-50 ring-1 ring-ink-200/60">
            <h3>
              <button type="button" aria-expanded={offen[g]} onClick={() => setOffen((o) => ({ ...o, [g]: !o[g] }))} className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left font-display text-[15px] font-bold text-ink-900">
                {titel}
                <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition-transform", offen[g] && "rotate-180")} />
              </button>
            </h3>
            {offen[g] && (
              <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-1">
                {COCKPIT_FELDER.filter((f) => f.gruppe === g && (f.id !== "lieferAnteil" || e.modell === "contracting") && (f.id !== "ifb" || e.land === "AT")).map((f) => (
                  <Feld key={f.id} f={f} wert={e[f.id]} quelle={quellen[f.id]} onChange={(w) => setze(f.id, w)} />
                ))}
              </div>
            )}
          </section>
        ))}
        {vbHinweise.length > 0 && (
          <div className="rounded-2xl bg-navy-50 p-4 text-[13px] leading-relaxed text-navy-900 ring-1 ring-inset ring-navy-100">
            <p className="mb-1 flex items-center gap-1.5 font-semibold"><Info aria-hidden="true" className="h-4 w-4" /> Zur Vorbelegung</p>
            <ul className="list-disc space-y-1 pl-5">{vbHinweise.map((h, i) => <li key={i}>{h}</li>)}</ul>
          </div>
        )}
      </aside>

      {/* ------------------------------------------------ Ergebnisse */}
      <div className="min-w-0 space-y-6">
        <section aria-label="Projektkennzahlen" className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
          {[
            ["Investition", teur(e.capex), `${Math.round(r.projekt.capexProKwp).toLocaleString("de-DE")} €/kWp`],
            ["Projekt-IRR (P50)", pct(r.projekt.projektIrr), `P90: ${pct(r.projekt.projektIrrP90)}`],
            ["Kapitalwert (WACC)", teur(r.projekt.npv), `WACC ${pct(r.projekt.wacc, 2)}`],
            ["LCOE", `${(r.projekt.lcoeCt ?? 0).toLocaleString("de-DE", { maximumFractionDigits: 2 })} ct`, "Stromgestehungskosten je kWh"],
            ["Amortisation", jahre(r.projekt.amortisation), "unverschuldet, statisch"],
            ["ROI Projekt", pct(r.projekt.roi, 0), `über ${e.laufzeit} Jahre`],
          ].map(([l, w, h], i) => (
            <div key={l} className={cn("min-w-0 rounded-3xl p-4", i === 0 ? "bg-navy-950 text-white ring-1 ring-navy-800" : "bg-white ring-1 ring-ink-200/70")}>
              <p className={cn("text-[12px] font-medium", i === 0 ? "text-white/70" : "text-ink-500")}>{l}</p>
              <p className={cn("ov-num mt-1.5 truncate font-display text-[21px] font-extrabold", i === 0 ? "text-white" : "text-ink-900")}>{w}</p>
              <p className={cn("mt-0.5 truncate text-[11.5px]", i === 0 ? "text-white/60" : "text-ink-500")}>{h}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl bg-white ring-1 ring-ink-200/70">
          <div className="border-b border-ink-100 px-5 py-4 md:px-6">
            <h2 className="font-display text-[17px] font-bold text-ink-900">Finanzierungsvarianten nebeneinander</h2>
            <p className="mt-0.5 text-[13px] text-ink-500">Kredite auf die Mindest-DSCR bemessen ({e.dscrBasis.toUpperCase()}); gekürzte Varianten sind markiert. Für die Grafik bis zu drei Varianten wählen.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-ink-100">
                  <th scope="col" className="sticky left-0 bg-white px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">Kennzahl</th>
                  {r.varianten.map((v) => (
                    <th key={v.art} scope="col" className="px-3 py-3 align-bottom">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input type="checkbox" checked={linien.includes(v.art)} onChange={(ev) => setLinien((l) => (ev.target.checked ? [...l, v.art].slice(-3) : l.filter((x) => x !== v.art)))} className="mt-0.5 h-4 w-4 accent-[var(--color-ov-600)]" aria-label={`${v.label} in der Grafik zeigen`} />
                        <span className="text-[12.5px] font-bold leading-snug text-ink-900">{v.kurz}</span>
                      </label>
                      {v.fkBegrenzt && <Badge ton="warn" className="mt-1">auf DSCR gekürzt</Badge>}
                      {v.dscrMin != null && v.dscrMin < 1 && <Badge ton="warn" className="mt-1">Rate &gt; Cashflow</Badge>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {ZEILEN.map(([label, f]) => (
                  <tr key={label}>
                    <th scope="row" className="sticky left-0 bg-white px-4 py-2.5 text-[12.5px] font-medium text-ink-600">{label}</th>
                    {r.varianten.map((v) => <td key={v.art} className="ov-num whitespace-nowrap px-3 py-2.5 text-ink-900">{f(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
          <LiquiditaetChart reihen={liquiditaet} titel={`Liquiditätsverlauf – kumulierter EK-Cashflow${e.mitSteuern ? " nach Steuern (Näherung)" : ""}`} />
          <p className="mt-2 text-[12px] text-ink-500">Jahr 0 = Eigenkapitaleinsatz inkl. Gebühren und DSRA. Werte je Variante auch in der Tabelle oben.</p>
        </section>

        <div className="grid gap-6 2xl:grid-cols-2">
          <section className="rounded-3xl bg-white ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4 md:px-6">
              <h2 className="font-display text-[17px] font-bold text-ink-900">Stresstest</h2>
              <select aria-label="Variante für den Stresstest" value={fokus} onChange={(ev) => setFokus(ev.target.value)} className={cn(auswahlfeld, "h-10 w-auto text-[13px]")}>
                {VARIANTEN_IDS.map((id) => <option key={id} value={id}>{VARIANTEN[id].kurz}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-[13px]">
                <thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-500"><th className="px-5 py-2.5">Fall</th><th className="px-3 py-2.5 text-right">EK-Bedarf</th><th className="px-3 py-2.5 text-right">DSCR min</th><th className="px-3 py-2.5 text-right">EK-IRR</th><th className="px-5 py-2.5 text-right">NPV EK</th></tr></thead>
                <tbody className="divide-y divide-ink-100">
                  {r.szenarien.map((z) => (
                    <tr key={z.label}><th scope="row" className="px-5 py-2.5 text-left font-medium text-ink-700">{z.label}</th><td className="ov-num px-3 py-2.5 text-right">{teur(z.kapitalbedarfEk)}</td><td className="ov-num px-3 py-2.5 text-right">{fx(z.dscrMin)}</td><td className="ov-num px-3 py-2.5 text-right">{pct(z.ekIrr)}</td><td className="ov-num px-5 py-2.5 text-right">{teur(z.npvEk)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl bg-white ring-1 ring-ink-200/70">
            <div className="border-b border-ink-100 px-5 py-4 md:px-6">
              <h2 className="font-display text-[17px] font-bold text-ink-900">Förder-Check {e.land}</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-500">{TYPEN_FZ[e.typ]}, {(e.mwp * 1000).toLocaleString("de-DE")} kWp – Hinweise, keine Zusage.</p>
            </div>
            <ul className="divide-y divide-ink-100">
              {foerder.map((p) => (
                <li key={p.id} className="px-5 py-3.5 md:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-ink-900">{p.name}</p>
                    <Badge ton={PASSUNG[p.passung].ton}>{PASSUNG[p.passung].label}</Badge>
                    <span className="text-[11.5px] text-ink-500">{FOERDER_ARTEN[p.art]}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{p.grund ? `${p.grund} ` : ""}{p.kurz}</p>
                  {p.hinweise?.length > 0 && <ul className="mt-1 list-disc pl-5 text-[12.5px] text-ink-500">{p.hinweise.map((h, i) => <li key={i}>{h}</li>)}</ul>}
                  <a href={p.quelle.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ov-700 hover:text-ov-800">{p.quelle.titel}<ExternalLink aria-hidden="true" className="h-3 w-3" /></a>
                </li>
              ))}
            </ul>
            <p className="px-5 pb-4 text-[11.5px] text-ink-500 md:px-6">{FOERDER_HINWEIS}</p>
          </section>
        </div>

        {r.hinweise.length > 0 && (
          <div role="note" className="space-y-1 rounded-2xl bg-sun-300/20 p-4 text-[13.5px] text-ink-900 ring-1 ring-inset ring-sun-400/40">
            {r.hinweise.map((h, i) => <p key={i}>{h}</p>)}
          </div>
        )}

        <section className="rounded-3xl bg-white ring-1 ring-ink-200/70">
          <div className="border-b border-ink-100 px-5 py-4 md:px-6">
            <h2 className="font-display text-[17px] font-bold text-ink-900">Szenarien</h2>
            <p className="mt-0.5 text-[13px] text-ink-500">Speichern, als PDF exportieren und bis zu drei Szenarien vergleichen.</p>
          </div>
          <div className="space-y-4 p-5 md:p-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="fz-name" className="sr-only">Name des Szenarios</label>
              <input id="fz-name" value={name} maxLength={80} onChange={(ev) => setName(ev.target.value)} className={cn(eingabe, "h-11 flex-1 text-[14px]")} />
              <button type="button" onClick={speichern} disabled={status.laeuft} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ov-600 px-5 text-[14px] font-semibold text-white hover:bg-ov-700 disabled:opacity-60">
                {status.laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />} Szenario speichern
              </button>
            </div>
            <FehlerBox>{status.fehler}</FehlerBox>
            <ErfolgBox>{status.ok}</ErfolgBox>
            {szenarien.length === 0 ? (
              <p className="text-[13.5px] text-ink-500">Noch keine Szenarien gespeichert.</p>
            ) : (
              <ul className="divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-200/70">
                {szenarien.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <input type="checkbox" aria-label={`${s.name} vergleichen`} checked={vergleich.includes(s.id)} onChange={(ev) => setVergleich((v) => (ev.target.checked ? [...v, s.id].slice(-3) : v.filter((x) => x !== s.id)))} className="h-4 w-4 accent-[var(--color-ov-600)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink-900">{s.name}</p>
                      <p className="text-[12px] text-ink-500">{s.projektTitel || "Freies Werkzeug"} · {new Date(s.am).toLocaleDateString("de-DE")} · Schwerpunkt {VARIANTEN[s.fokus]?.kurz}</p>
                    </div>
                    <button type="button" onClick={() => setE({ ...s.eingaben })} className="h-9 rounded-full px-3 text-[12.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Laden</button>
                    <a href={`/api/portal/finanzierung/szenarien/${s.id}/pdf`} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-ov-700 ring-1 ring-inset ring-ov-200 hover:bg-ov-50"><Download aria-hidden="true" className="h-3.5 w-3.5" />PDF</a>
                    <button type="button" onClick={() => loeschen(s.id)} aria-label={`${s.name} löschen`} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-red-50 hover:text-red-700"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            {vergleichListe.length >= 2 && (
              <div className="overflow-x-auto rounded-2xl ring-1 ring-ink-200/70">
                <table className="w-full min-w-[560px] text-[13px]">
                  <caption className="px-4 pt-3 text-left text-[13px] font-semibold text-ink-700">Szenario-Vergleich (Projektfinanzierung skulptiert bzw. EK-Variante)</caption>
                  <thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-500"><th className="px-4 py-2">Kennzahl</th>{vergleichListe.map((s) => <th key={s.id} className="px-3 py-2">{s.name}</th>)}</tr></thead>
                  <tbody className="divide-y divide-ink-100">
                    {[
                      ["Projekt-IRR", (s) => pct(s.ergebnis.projekt.projektIrr)],
                      ["LCOE", (s) => `${(s.ergebnis.projekt.lcoeCt ?? 0).toLocaleString("de-DE", { maximumFractionDigits: 2 })} ct`],
                      ["NPV Projekt", (s) => teur(s.ergebnis.projekt.npv)],
                      ...["ek", "skulptiert", "foerder"].flatMap((art) => [
                        [`${VARIANTEN[art].kurz}: EK-Bedarf`, (s) => teur(s.ergebnis.varianten.find((v) => v.art === art)?.kapitalbedarfEk)],
                        [`${VARIANTEN[art].kurz}: EK-IRR`, (s) => pct(s.ergebnis.varianten.find((v) => v.art === art)?.ekIrr)],
                      ]),
                    ].map(([l, f]) => (
                      <tr key={l}><th scope="row" className="px-4 py-2 text-left font-medium text-ink-600">{l}</th>{vergleichListe.map((s) => <td key={s.id} className="ov-num px-3 py-2">{f(s)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {!projekt && projekte.length > 0 && (
          <section className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-6">
            <h2 className="font-display text-[16px] font-bold text-ink-900">Projekte mit freigegebenem Datenraum</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {projekte.map((p) => (
                <li key={p.id}><Link href={`/portal/finanzierung?projekt=${p.id}`} className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:ring-ov-300">{p.titel} · {String(p.mwp).replace(".", ",")} MWp</Link></li>
              ))}
            </ul>
          </section>
        )}

        <p className="rounded-2xl bg-ink-50 px-4 py-3 text-[12.5px] leading-relaxed text-ink-600 ring-1 ring-inset ring-ink-200">{HINWEIS_BERATUNG}</p>
      </div>
    </div>
  );
}
