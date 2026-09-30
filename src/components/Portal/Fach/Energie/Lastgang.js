"use client";

// Lastgang-Import (CSV, 15 min bzw. Stundenwerte) und Analyse: Jahresverbrauch, Spitze, Benutzungsstunden,
// Grund-/Mittagslast, Wochenprofil, Monate, Lastdauerlinie, PV-Deckungspotenzial je Anlagengröße, Pool-Ersparnis →
// Angebotsanfrage. Der Browser liest die Datei nur ein (Zeichensatz) und zeigt eine Vorschau; geparst und analysiert
// wird maßgeblich auf dem Server (fach/lastgang.js).

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Send, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, Feld, FehlerBox, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { lastgangParsen } from "@/lib/plattform/fach/lastgang";
import { PruefHinweise } from "../DatenblattFormular";

const kwh = (x) => (!Number.isFinite(x) ? "–" : x >= 1e6 ? `${(x / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 2 })} GWh` : x >= 1e4 ? `${(x / 1e3).toLocaleString("de-DE", { maximumFractionDigits: 0 })} MWh` : `${Math.round(x).toLocaleString("de-DE")} kWh`);
const kw = (x) => (!Number.isFinite(x) ? "–" : `${x.toLocaleString("de-DE", { maximumFractionDigits: x < 10 ? 1 : 0 })} kW`);
const pct = (x) => (!Number.isFinite(x) ? "–" : `${Math.round(x * 100)} %`);
const eur = (x) => (!Number.isFinite(x) ? "–" : `${Math.round(x).toLocaleString("de-DE")} €`);
const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Datei als Text lesen: UTF-8, bei Ersatzzeichen Windows-1252 (Excel-Export) */
async function dateiText(datei) {
  const puffer = await datei.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(puffer);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(puffer) : utf8;
}

function Kachel({ label, wert, hinweis }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-ink-200/70">
      <p className="text-[12px] text-ink-500">{label}</p>
      <p className="ov-num font-display text-[20px] font-extrabold leading-tight text-ink-900">{wert}</p>
      {hinweis && <p className="text-[12px] text-ink-500">{hinweis}</p>}
    </div>
  );
}

function Wochenprofil({ matrix }) {
  const max = Math.max(1, ...matrix.flat());
  return (
    <figure>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-[2px] text-[11px]">
          <caption className="sr-only">Mittlere Last je Wochentag und Stunde (kW)</caption>
          <thead>
            <tr>
              <th scope="col" className="w-8" />
              {Array.from({ length: 24 }, (_, h) => <th key={h} scope="col" className="font-normal text-ink-500">{h % 3 === 0 ? h : ""}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.map((zeile, t) => (
              <tr key={t}>
                <th scope="row" className="pr-1 text-left font-semibold text-ink-600">{TAGE[t]}</th>
                {zeile.map((w, h) => (
                  <td key={h} title={`${TAGE[t]} ${h}–${h + 1} Uhr: ${kw(w)}`} className="h-5 rounded-[3px] bg-ov-600" style={{ opacity: 0.08 + 0.92 * (w / max) }}>
                    <span className="sr-only">{kw(w)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-1.5 text-[12px] text-ink-500">Mittlere Last je Wochentag und Stunde (Ortszeit) – dunkler = höher, Maximum {kw(max)}.</figcaption>
    </figure>
  );
}

function Balken({ werte, labels, einheit = "kWh", titel }) {
  const max = Math.max(1, ...werte);
  return (
    <figure>
      <div className="flex h-32 items-end gap-1" role="img" aria-label={`${titel}: ${werte.map((w, i) => `${labels[i]} ${Math.round(w).toLocaleString("de-DE")} ${einheit}`).join(", ")}`}>
        {werte.map((w, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-md bg-ov-500" style={{ height: `${Math.max(2, (w / max) * 100)}%` }} />
            <span className="text-[10.5px] text-ink-500">{labels[i]}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-1 text-[12px] text-ink-500">{titel}</figcaption>
    </figure>
  );
}

function Dauerlinie({ werte }) {
  const max = Math.max(1, ...werte);
  const pts = werte.map((w, i) => `${(i / (werte.length - 1)) * 100},${40 - (w / max) * 38}`).join(" ");
  return (
    <figure>
      <svg viewBox="0 0 100 40" className="h-32 w-full" preserveAspectRatio="none" role="img" aria-label={`Lastdauerlinie von ${kw(werte[0])} bis ${kw(werte[werte.length - 1])}`}>
        <polyline points={`0,40 ${pts} 100,40`} className="fill-ov-100 stroke-ov-600" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-1 text-[12px] text-ink-500">Lastdauerlinie: Last sortiert über das Jahr ({kw(werte[0])} → {kw(werte[werte.length - 1])}).</figcaption>
    </figure>
  );
}

function Analyse({ l, unternehmen }) {
  const router = useRouter();
  const a = l.analyse;
  const [pvKwp, setPvKwp] = useState(String(l.parameter?.pvKwp || a.pv.gewaehltKwp || ""));
  const [preisCt, setPreisCt] = useState(String(l.parameter?.preisCt ?? a.pool.preisCt));
  const [nachricht, setNachricht] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState(l.vorgangId ? `Angebotsanfrage gestellt (Vorgang ${l.vorgangId}).` : "");
  const gewaehlt = a.pv.varianten.find((x) => x.kwp === a.pv.gewaehltKwp);

  async function neu(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      await senden(`/api/portal/fach/energie/lastgang/${l.id}`, { method: "PATCH", body: { pvKwp, preisCt } });
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }
  async function anfrage() {
    setLaeuft(true);
    setFehler("");
    try {
      const r = await senden(`/api/portal/fach/energie/lastgang/${l.id}`, { body: { nachricht } });
      setOk(`Angebotsanfrage gestellt – Vorgang ${r.vorgangId}. Sie finden ihn unter „Meine Anfragen“.`);
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }
  async function loeschen() {
    if (!window.confirm(`Lastgang „${l.name}“ löschen?`)) return;
    await senden(`/api/portal/fach/energie/lastgang/${l.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <article className="space-y-5 rounded-3xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/60 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-all font-display text-[16px] font-bold text-ink-900">{l.name}</h3>
          <p className="text-[12.5px] text-ink-500">
            {new Date(a.zeitraum.von).toLocaleDateString("de-DE")} – {new Date(new Date(a.zeitraum.bis).getTime() - 1).toLocaleDateString("de-DE")} · {a.zeitraum.tage.toLocaleString("de-DE")} Tage · Einheit {l.einheit} ({l.einheitQuelle === "datei" ? "aus Datei" : l.einheitQuelle === "vorgabe" ? "gewählt" : "angenommen"}) · Abdeckung {pct(a.zeitraum.abdeckung)}
          </p>
        </div>
        {unternehmen && <button type="button" onClick={loeschen} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-white" aria-label="Lastgang löschen"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>}
      </header>
      {l.hinweise?.length > 0 && <PruefHinweise hinweise={l.hinweise} />}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kachel label={a.zeitraum.hochgerechnet ? "Jahresverbrauch (hochgerechnet)" : "Jahresverbrauch"} wert={kwh(a.jahresverbrauchKwh)} />
        <Kachel label="Leistungsspitze" wert={kw(a.spitzeKw)} hinweis={a.spitzeOrtszeit} />
        <Kachel label="Benutzungsstunden" wert={`${a.benutzungsstunden.toLocaleString("de-DE")} h`} hinweis={`DE-Netzentgelt: Tarifgruppe ${a.benutzungsstunden >= 2500 ? "≥" : "<"} 2.500 h`} />
        <Kachel label="Grundlast / Mittagslast" wert={`${kw(a.grundlastKw)} / ${kw(a.mittagslastKw)}`} hinweis={`Anteil 8–17 Uhr ${pct(a.tagAnteil)} · Profil ${a.lastprofil.label}`} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink-200/70"><Wochenprofil matrix={a.wochenprofil} /></div>
        <div className="grid gap-4 rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink-200/70 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Balken werte={a.monate.map((m) => m.kwh)} labels={MONATE} titel="Verbrauch je Monat" />
          <Dauerlinie werte={a.lastdauerlinie} />
        </div>
      </div>

      <section aria-label="PV-Deckungspotenzial" className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink-200/70">
        <h4 className="font-display text-[15px] font-bold text-ink-900">PV-Deckungspotenzial</h4>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-600">Viertelstunden-Simulation einer Dach-PV (Regionsertrag und Monatsverteilung wie im Anlagen-Monitoring) gegen Ihren Lastgang. Empfehlung: größte Anlage mit mindestens 70 % Eigenverbrauch.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-[13.5px]">
            <thead>
              <tr className="border-b border-ink-100 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                <th scope="col" className="py-2 pr-3">PV-Leistung</th>
                <th scope="col" className="px-3 py-2 text-right">Erzeugung</th>
                <th scope="col" className="px-3 py-2 text-right">Eigenverbrauch</th>
                <th scope="col" className="px-3 py-2 text-right">EV-Quote</th>
                <th scope="col" className="py-2 pl-3 text-right">Deckung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {a.pv.varianten.map((v) => (
                <tr key={v.kwp} className={cn(v.kwp === a.pv.gewaehltKwp && "bg-ov-50")}>
                  <td className="py-2 pr-3 font-semibold text-ink-900">{v.kwp.toLocaleString("de-DE")} kWp{v.kwp === a.pv.empfehlungKwp ? " · Empfehlung" : ""}</td>
                  <td className="ov-num px-3 py-2 text-right">{kwh(v.erzeugungKwh)}</td>
                  <td className="ov-num px-3 py-2 text-right">{kwh(v.eigenverbrauchKwh)}</td>
                  <td className="ov-num px-3 py-2 text-right">{pct(v.evQuote)}</td>
                  <td className="ov-num py-2 pl-3 text-right">{pct(v.autarkie)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {a.pv.bestandKwp > 0 && <p className="mt-2 text-[12.5px] text-ink-500">Hinweis: An dieser Abnahmestelle laufen bereits {a.pv.bestandKwp.toLocaleString("de-DE")} kWp – der Lastgang ist dann schon Reststrom.</p>}
      </section>

      <section aria-label="Pool-Ersparnis" className="rounded-2xl bg-navy-950 p-4 text-white sm:p-5">
        <h4 className="font-display text-[15px] font-bold">Reststrom-Pool: Ersparnis-Schätzung</h4>
        <p className="mt-1 text-[13px] leading-relaxed text-white/70">Reststrom nach {gewaehlt ? `${gewaehlt.kwp.toLocaleString("de-DE")} kWp PV` : "PV"}: {kwh(a.pool.reststromKwh)} · Arbeitspreis heute {a.pool.preisCt.toLocaleString("de-DE")} ct/kWh · Profil {a.lastprofil.label}</p>
        <p className="ov-num mt-3 font-display text-[28px] font-extrabold leading-none">{eur(a.pool.ersparnisEurMin)} – {eur(a.pool.ersparnisEurMax)} <span className="text-[14px] font-semibold text-white/60">pro Jahr</span></p>
        <p className="mt-1 text-[12.5px] text-white/60">{a.pool.ctMin.toLocaleString("de-DE")}–{a.pool.ctMax.toLocaleString("de-DE")} ct/kWh auf die Beschaffungskomponente (Bündelung, Solar-PPA, Flexibilität){a.pool.stromsteuerEur ? ` · zusätzlich Stromsteuer-Entlastung rund ${eur(a.pool.stromsteuerEur)}` : ""}.{a.pool.preisUnplausibel ? " Achtung: Der Arbeitspreis wirkt zu niedrig für einen Gesamtpreis – bitte inkl. Netzentgelten und Umlagen angeben." : ""}</p>
        {unternehmen && (
          <form onSubmit={neu} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Feld id={`pv-${l.id}`} label={<span className="text-white/80">PV-Leistung prüfen (kWp)</span>}>
              <input id={`pv-${l.id}`} inputMode="numeric" className={eingabe} value={pvKwp} onChange={(e) => setPvKwp(e.target.value)} />
            </Feld>
            <Feld id={`ap-${l.id}`} label={<span className="text-white/80">Arbeitspreis gesamt (ct/kWh)</span>}>
              <input id={`ap-${l.id}`} inputMode="decimal" className={eingabe} value={preisCt} onChange={(e) => setPreisCt(e.target.value)} />
            </Feld>
            <Button type="submit" variant="white" size="sm" disabled={laeuft}>Neu rechnen</Button>
          </form>
        )}
      </section>

      {unternehmen && (
        <section aria-label="Angebot anfragen" className="space-y-3">
          <Feld id={`na-${l.id}`} label="Nachricht zur Angebotsanfrage (optional)">
            <textarea id={`na-${l.id}`} rows={2} maxLength={1500} className={textbereich} value={nachricht} onChange={(e) => setNachricht(e.target.value)} placeholder="z. B. Lieferbeginn, weitere Standorte, Interesse an PV-Contracting" />
          </Feld>
          <FehlerBox>{fehler}</FehlerBox>
          <ErfolgBox>{ok}</ErfolgBox>
          <Button icon={Send} disabled={laeuft || !!l.vorgangId} onClick={anfrage}>{l.vorgangId ? "Angebot angefragt" : "Angebot für Reststrom und PV anfragen"}</Button>
          <p className="text-[12.5px] text-ink-500">Übermittelt werden nur die Kennzahlen der Analyse und die Stammdaten der Abnahmestelle – nicht die Zeitreihe. Unverbindlich und kostenfrei.</p>
        </section>
      )}
    </article>
  );
}

export default function Lastgang({ lastgaenge = [], abnahmestellen = [], unternehmen = true }) {
  const router = useRouter();
  const eingabeRef = useRef(null);
  const [datei, setDatei] = useState(null);
  const [text, setText] = useState("");
  const [einheit, setEinheit] = useState("");
  const [stelle, setStelle] = useState(abnahmestellen[0]?.id || "");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const vorschau = useMemo(() => (text ? lastgangParsen(text, { einheit: einheit || null }) : null), [text, einheit]);

  async function waehlen(e) {
    const f = e.target.files?.[0];
    setFehler("");
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      setFehler("Die Datei ist zu groß (höchstens 4 MB).");
      return;
    }
    setDatei(f);
    setText(await dateiText(f));
  }
  async function hochladen() {
    setLaeuft(true);
    setFehler("");
    try {
      await senden("/api/portal/fach/energie/lastgang", { body: { name: datei.name, inhalt: text, einheit: einheit || null, abnahmestelleId: stelle || null } });
      setDatei(null);
      setText("");
      if (eingabeRef.current) eingabeRef.current.value = "";
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-5">
      {unternehmen && (
        <div className="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-ink-200/70 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Feld id="lg-datei" label="Lastgang-Datei (CSV)" className="sm:col-span-3" hinweis="Export Ihres Netzbetreibers bzw. Messstellenbetreibers: Viertelstunden- oder Stundenwerte, Datum/Uhrzeit und Wert je Zeile (Semikolon, Komma oder Tab; Dezimalkomma möglich). Zeitumstellung wird erkannt.">
              <input ref={eingabeRef} id="lg-datei" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={waehlen} className="block w-full text-[14px] text-ink-700 file:mr-3 file:rounded-xl file:border-0 file:bg-ov-50 file:px-4 file:py-2.5 file:font-semibold file:text-ov-800 hover:file:bg-ov-100" />
            </Feld>
            <Feld id="lg-einheit" label="Einheit der Werte">
              <select id="lg-einheit" className={auswahlfeld} value={einheit} onChange={(e) => setEinheit(e.target.value)}>
                <option value="">Automatisch erkennen</option>
                <option value="kW">kW (Leistungsmittelwert)</option>
                <option value="kWh">kWh je Intervall</option>
                <option value="W">W</option>
                <option value="Wh">Wh je Intervall</option>
                <option value="MW">MW</option>
                <option value="MWh">MWh je Intervall</option>
              </select>
            </Feld>
            <Feld id="lg-stelle" label="Abnahmestelle" className="sm:col-span-2">
              <select id="lg-stelle" className={auswahlfeld} value={stelle} onChange={(e) => setStelle(e.target.value)}>
                <option value="">– ohne Zuordnung –</option>
                {abnahmestellen.map((s) => <option key={s.id} value={s.id}>{s.bezeichnung}</option>)}
              </select>
            </Feld>
          </div>
          {vorschau && (
            vorschau.ok ? (
              <p className="rounded-2xl bg-ov-50 px-4 py-3 text-[13.5px] text-ov-900 ring-1 ring-inset ring-ov-200">
                Vorschau: {vorschau.statistik.zeilen.toLocaleString("de-DE")} Werte im {vorschau.intervallMin}-Minuten-Raster, Einheit {vorschau.einheit}{vorschau.einheitQuelle === "annahme" ? " (angenommen)" : ""}, {vorschau.statistik.luecken} Lücken, Zeitbasis {vorschau.zeitbasis === "mez" ? "MEZ durchgehend" : vorschau.zeitbasis === "offset" ? "mit Zeitzone" : "MEZ/MESZ"}.
              </p>
            ) : (
              <FehlerBox>{vorschau.fehler}</FehlerBox>
            )
          )}
          <FehlerBox>{fehler}</FehlerBox>
          <Button icon={FileUp} disabled={!datei || laeuft || (vorschau && !vorschau.ok)} onClick={hochladen}>{laeuft ? "Wird analysiert …" : "Hochladen und analysieren"}</Button>
        </div>
      )}
      {lastgaenge.map((l) => <Analyse key={l.id} l={l} unternehmen={unternehmen} />)}
    </div>
  );
}
