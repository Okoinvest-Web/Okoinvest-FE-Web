"use client";

// Bewertungswerkzeug im Portal: Projekt aus der Börse in die Renditerechnung übernehmen (vorbelegt aus Datenblatt und
// Exposé), Annahmen überschreiben, Szenarien speichern und vergleichen. Rechenkern: fach/bewertung.js (identisch zum
// Server, der gespeicherte Szenarien neu rechnet).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, Feld, FehlerBox, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { BEWERTUNG_FELDER, bewertungRechnen } from "@/lib/plattform/fach/bewertung";

const pct = (x, s = 1) => (x === null || x === undefined || !Number.isFinite(x) ? "–" : `${(x * 100).toLocaleString("de-DE", { maximumFractionDigits: s, minimumFractionDigits: s })} %`);
const eur = (x) => (x === null || x === undefined || !Number.isFinite(x) ? "–" : Math.abs(x) >= 1e6 ? `${(x / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Mio. €` : `${Math.round(x).toLocaleString("de-DE")} €`);
const zahl = (x) => (x === null || x === undefined || !Number.isFinite(x) ? "–" : x.toLocaleString("de-DE", { maximumFractionDigits: 2 }));
const QUELLE_TON = { Datenblatt: "bg-ov-50 text-ov-800 ring-ov-200", Exposé: "bg-navy-50 text-navy-800 ring-navy-100", Suchprofil: "bg-navy-50 text-navy-800 ring-navy-100", Markt: "bg-ink-50 text-ink-600 ring-ink-200", geändert: "bg-sun-300/25 text-ink-900 ring-sun-400/50" };

function Kennzahl({ label, wert, hinweis, stark }) {
  return (
    <div className={cn("rounded-2xl px-4 py-3 ring-1 ring-inset", stark ? "bg-navy-950 text-white ring-navy-900" : "bg-white ring-ink-200/70")}>
      <p className={cn("text-[12px]", stark ? "text-white/60" : "text-ink-500")}>{label}</p>
      <p className={cn("ov-num font-display text-[22px] font-extrabold leading-tight", stark ? "text-white" : "text-ink-900")}>{wert}</p>
      {hinweis && <p className={cn("text-[12px]", stark ? "text-white/60" : "text-ink-500")}>{hinweis}</p>}
    </div>
  );
}

export default function BewertungWerkzeug({ projektId, vorbelegung, szenarien: start = [] }) {
  const router = useRouter();
  const { modus, quellen, hinweise } = vorbelegung;
  const [e, setE] = useState(() => ({ ...vorbelegung.eingaben }));
  const [geaendert, setGeaendert] = useState(() => new Set());
  const [name, setName] = useState("");
  const [szenarien, setSzenarien] = useState(start);
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const felder = BEWERTUNG_FELDER.filter((f) => f.modus === "beide" || f.modus === modus);
  const r = useMemo(() => {
    try {
      return bewertungRechnen(modus, e);
    } catch {
      return null;
    }
  }, [modus, e]);

  const setze = (id, wert) => {
    setE((x) => ({ ...x, [id]: wert }));
    setGeaendert((s) => new Set(s).add(id));
  };
  const zahlSetzen = (f, s) => {
    const n = Number(String(s).replace(",", "."));
    if (s === "" || !Number.isFinite(n)) return setE((x) => ({ ...x, [f.id]: s }));
    setze(f.id, n);
  };

  async function speichern(ev) {
    ev.preventDefault();
    setFehler("");
    setOk("");
    try {
      const res = await senden(`/api/portal/fach/bewertung/${projektId}`, { body: { name, eingaben: e } });
      setSzenarien((s) => [res.szenario, ...s]);
      setName("");
      setOk("Szenario gespeichert.");
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    }
  }
  async function loeschen(id) {
    try {
      await senden(`/api/portal/fach/szenarien/${id}`, { method: "DELETE" });
      setSzenarien((s) => s.filter((x) => x.id !== id));
    } catch (err) {
      setFehler(err.message);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <section aria-label="Annahmen" className="min-w-0 space-y-4 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[17px] font-bold text-ink-900">Annahmen</h2>
          <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => { setE({ ...vorbelegung.eingaben }); setGeaendert(new Set()); }}>Vorbelegung</Button>
        </div>
        {hinweise?.length > 0 && (
          <ul className="space-y-1 rounded-2xl bg-sand-50 px-4 py-3 text-[13px] leading-relaxed text-ink-700 ring-1 ring-inset ring-ink-200/60">
            {hinweise.map((h) => <li key={h}>· {h}</li>)}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {felder.map((f) => {
            const q = geaendert.has(f.id) ? "geändert" : quellen[f.id] || "Markt";
            const fid = `bw-${f.id}`;
            return (
              <Feld key={f.id} id={fid} label={<span className="flex flex-wrap items-center gap-1.5">{f.label}{f.einheit ? ` (${f.einheit})` : ""}<span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", QUELLE_TON[q])}>{q}</span></span>}>
                {f.typ === "auswahl" ? (
                  <select id={fid} className={auswahlfeld} value={e[f.id] ?? ""} onChange={(ev) => setze(f.id, ev.target.value)}>
                    {f.optionen.map(([o, l]) => <option key={o} value={o}>{l}</option>)}
                  </select>
                ) : (
                  <input id={fid} inputMode="decimal" className={eingabe} value={e[f.id] ?? ""} onChange={(ev) => zahlSetzen(f, ev.target.value)} />
                )}
              </Feld>
            );
          })}
        </div>
        <form onSubmit={speichern} className="flex flex-col gap-2 border-t border-ink-100 pt-4 sm:flex-row">
          <label htmlFor="bw-name" className="sr-only">Name des Szenarios</label>
          <input id="bw-name" required minLength={2} maxLength={80} placeholder="Name des Szenarios, z. B. „Basis P50, 4,9 ct“" className={eingabe} value={name} onChange={(ev) => setName(ev.target.value)} />
          <Button type="submit" icon={Save} className="shrink-0">Speichern</Button>
        </form>
        <FehlerBox>{fehler}</FehlerBox>
        <ErfolgBox>{ok}</ErfolgBox>
      </section>

      <section aria-label="Ergebnis" className="min-w-0 space-y-4">
        {!r ? (
          <p className="rounded-3xl bg-white p-6 text-[14px] text-ink-500 ring-1 ring-ink-200/70">Bitte Annahmen prüfen – mit diesen Werten lässt sich nicht rechnen.</p>
        ) : modus === "bestand" ? (
          <div className="grid grid-cols-2 gap-3">
            <Kennzahl stark label="Ertragswert beim Ziel-Diskontsatz" wert={eur(r.wert)} hinweis={`${zahl(r.wertProKwp)} €/kWp · Spanne ${eur(r.spanne.min)}–${eur(r.spanne.max)}`} />
            <Kennzahl label="IRR zum Kaufpreis" wert={pct(r.kaufIrr)} hinweis="unverschuldet, vor Steuern" />
            <Kennzahl label="Restlaufzeit" wert={`${r.restJahre} Jahre`} hinweis={`davon ${r.foerderRest} mit Förderung`} />
            <Kennzahl label="Cashflow Jahr 1" wert={eur(r.cfJahr1)} hinweis={r.performance ? `Performance ggü. Region ${pct(r.performance, 0)}` : undefined} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Kennzahl stark label="Max. Kaufpreis für Ziel-Rendite" wert={r.maxKaufpreisKwp !== null ? `${zahl(r.maxKaufpreisKwp)} €/kWp` : "nicht erreichbar"} hinweis={r.maxKaufpreis !== null ? `${eur(r.maxKaufpreis)} · EK-IRR ≥ ${zahl(e.zielRenditePct)} % (P50)` : `Ziel ${zahl(e.zielRenditePct)} % auch ohne Kaufpreis nicht erreichbar`} />
              <Kennzahl label="Kaufpreis laut Annahme" wert={eur(r.kaufpreis)} hinweis={`${zahl(e.kaufpreisKwp)} €/kWp`} />
            </div>
            <div className="overflow-x-auto rounded-3xl bg-white ring-1 ring-ink-200/70">
              <table className="w-full min-w-[420px] text-[14px]">
                <caption className="sr-only">Kennzahlen im P50- und P90-Fall</caption>
                <thead>
                  <tr className="border-b border-ink-100 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                    <th scope="col" className="px-5 py-3">Kennzahl</th>
                    <th scope="col" className="px-3 py-3 text-right">P50</th>
                    <th scope="col" className="px-5 py-3 text-right">P90</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {[
                    ["Eigenkapital-IRR (vor Steuern)", pct(r.p50.ekIrr), pct(r.p90.ekIrr)],
                    ["Projekt-IRR", pct(r.p50.projektIrr), pct(r.p90.projektIrr)],
                    ["DSCR minimal", zahl(r.p50.dscrMin), zahl(r.p90.dscrMin)],
                    ["LCOE (ct/kWh)", zahl(r.p50.lcoeCt), zahl(r.p90.lcoeCt)],
                    ["Ertrag Jahr 1 (MWh)", zahl(r.p50.ertragJahr1Mwh), zahl(r.p90.ertragJahr1Mwh)],
                    ["Investition gesamt", eur(r.p50.investition), eur(r.p90.investition)],
                    ["Fremdkapital", eur(r.p50.fk), eur(r.p90.fk)],
                    ["Amortisation (Jahre)", zahl(r.p50.amortisation), zahl(r.p90.amortisation)],
                  ].map(([l, a, b]) => (
                    <tr key={l}>
                      <th scope="row" className="px-5 py-2.5 text-left font-medium text-ink-700">{l}</th>
                      <td className="ov-num px-3 py-2.5 text-right text-ink-900">{a}</td>
                      <td className="ov-num px-5 py-2.5 text-right text-ink-900">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              Fremdkapital nach Bankpraxis auf P90 bemessen (Mindest-DSCR); effektive FK-Quote {zahl(r.fkQuoteEff)} %{r.fkGekuerzt ? " – die gewünschte Quote wurde auf die Schuldendienstfähigkeit gekürzt" : ""}. Eigenkapitalrendite im P50-Fall mit diesem Darlehen. Investition = Capex + Netzanschluss + Kaufpreis + Restentwicklung.
            </p>
          </>
        )}

        {szenarien.length > 0 && (
          <div className="overflow-x-auto rounded-3xl bg-white ring-1 ring-ink-200/70">
            <table className="w-full min-w-[520px] text-[14px]">
              <caption className="px-5 pt-4 text-left font-display text-[16px] font-bold text-ink-900">Gespeicherte Szenarien</caption>
              <thead>
                <tr className="border-b border-ink-100 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                  <th scope="col" className="px-5 py-3">Szenario</th>
                  <th scope="col" className="px-3 py-3 text-right">{modus === "bestand" ? "Wert" : "EK-IRR P50"}</th>
                  <th scope="col" className="px-3 py-3 text-right">{modus === "bestand" ? "IRR" : "DSCR P90"}</th>
                  <th scope="col" className="px-3 py-3 text-right">Max. Preis</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Aktionen</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {szenarien.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-2.5">
                      <button type="button" className="text-left font-semibold text-ink-900 hover:text-ov-700" onClick={() => { setE({ ...vorbelegung.eingaben, ...s.eingaben }); setGeaendert(new Set(Object.keys(s.eingaben).filter((k) => s.eingaben[k] !== vorbelegung.eingaben[k]))); }}>{s.name}</button>
                      <span className="block text-[12px] text-ink-500">{new Date(s.am).toLocaleDateString("de-DE")} · laden per Klick</span>
                    </td>
                    <td className="ov-num px-3 py-2.5 text-right">{s.modus === "bestand" ? eur(s.ergebnis?.wert) : pct(s.ergebnis?.p50?.ekIrr)}</td>
                    <td className="ov-num px-3 py-2.5 text-right">{s.modus === "bestand" ? pct(s.ergebnis?.kaufIrr) : zahl(s.ergebnis?.p90?.dscrMin)}</td>
                    <td className="ov-num px-3 py-2.5 text-right">{s.modus === "bestand" ? eur(s.ergebnis?.maxKaufpreis) : s.ergebnis?.maxKaufpreisKwp != null ? `${zahl(s.ergebnis.maxKaufpreisKwp)} €/kWp` : "–"}</td>
                    <td className="px-5 py-2.5 text-right">
                      <button type="button" onClick={() => loeschen(s.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 ring-1 ring-inset ring-ink-200 hover:bg-ink-50" aria-label={`Szenario „${s.name}“ löschen`}>
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[12.5px] leading-relaxed text-ink-500">Orientierungsrechnung vor Steuern auf Basis der Angaben im Datenraum und der Marktannahmen von ÖkoInvest (Stand markt.js). Keine Anlageberatung – maßgeblich sind Due Diligence, Finanzierungszusage und Kaufvertrag.</p>
      </section>
    </div>
  );
}
