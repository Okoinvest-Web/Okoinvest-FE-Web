"use client";

// src/components/Portal/Buchhaltung/Werkzeuge.js
//
// Interaktive Teile der Buchhaltung: Mahnlauf (Auswahl, Trockenlauf), Mahnwesen-Konfiguration, Storno und Mahnsperre
// je Beleg, Kontoauszug-Import mit Zuordnung, Export (DATEV/BMD/OP), Kontenzuordnung, Monatsabschluss.
// Geschäftsregeln prüft der Server (backend/demo/buchhaltung.js bzw. Frappe api/buchhaltung.py); die Oberfläche
// blendet Schreibaktionen ohne Recht nur aus.

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Ban, Check, CheckCheck, Download, FileUp, Loader2, Play, RotateCcw, Save, Undo2, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { eingabe, auswahlfeld, labelKlasse, FehlerBox, ErfolgBox } from "@/components/Portal/felder";
import { euro, tag } from "@/components/Portal/Finanzen/teile";
import { tabTasten } from "@/components/Portal/Bedienung/tabTasten"; // UIUX: Pfeiltasten in Tablisten (WAI-ARIA)

const knopf = "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-50";
const primaer = cn(knopf, "bg-ov-600 text-white hover:bg-ov-700");
const navy = cn(knopf, "bg-navy-700 text-white hover:bg-navy-800");
const hell = cn(knopf, "bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50");
const klein = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ring-1 ring-inset transition-colors disabled:opacity-50";

function useAktion() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [meldung, setMeldung] = useState("");
  async function ausfuehren(fn, erfolg) {
    setLaeuft(true);
    setFehler("");
    setMeldung("");
    try {
      const r = await fn();
      if (erfolg) setMeldung(typeof erfolg === "function" ? erfolg(r) : erfolg);
      router.refresh();
      return r;
    } catch (e) {
      setFehler(e.message);
      return null;
    } finally {
      setLaeuft(false);
    }
  }
  return { laeuft, fehler, meldung, ausfuehren };
}

const Spinner = ({ an, icon: Icon }) => (an ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null);

// ------------------------------------------------------------------ Mahnlauf

export function Mahnlauf({ vorschlaege = [], darf }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const faellige = vorschlaege.filter((v) => v.faellig);
  const [auswahl, setAuswahl] = useState(() => new Set(faellige.map((v) => v.belegId)));
  const [vorschau, setVorschau] = useState(null);
  const umschalten = (id) => setAuswahl((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const start = async (trockenlauf) => {
    const r = await ausfuehren(() => senden("/api/admin/finanzen/buchhaltung/mahnlauf", { body: { ids: [...auswahl], trockenlauf } }), (x) => (trockenlauf ? `Vorschau: ${x.anzahl} Mahnungen` : `${x.anzahl} Mahnungen erstellt – Empfänger wurden benachrichtigt.`));
    if (r) setVorschau(trockenlauf ? r : null);
  };
  if (!vorschlaege.length) return <p className="px-5 py-8 text-center text-[14px] text-ink-500 md:px-6">Keine überfälligen Rechnungen – nichts zu mahnen.</p>;
  return (
    <div>
      <ul className="divide-y divide-ink-100">
        {vorschlaege.map((v) => (
          <li key={v.belegId} className="flex items-start gap-3 px-5 py-3 md:px-6">
            {darf && v.faellig ? (
              <input type="checkbox" aria-label={`${v.nummer} mahnen`} checked={auswahl.has(v.belegId)} onChange={() => umschalten(v.belegId)} className="mt-1 h-4 w-4 accent-ov-600" />
            ) : <span className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                <span className="ov-num font-semibold text-ink-900">{v.nummer} <span className="font-normal text-ink-600">· {v.empfaenger}</span></span>
                <span className="ov-num font-semibold">{euro(v.offen)}</span>
              </p>
              <p className="text-[12.5px] text-ink-600">
                {v.tage} Tage überfällig · {v.faellig ? <>nächste Stufe <strong>{v.label}</strong>{v.gebuehr ? ` · Gebühr ${euro(v.gebuehr)}` : ""}{v.zinsen ? ` · Zinsen ${euro(v.zinsen)}` : ""}{v.pauschale ? ` · Pauschale ${euro(v.pauschale)}` : ""} · neue Frist {tag(v.frist)}</> : v.grund}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {darf && faellige.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 px-5 py-4 md:px-6">
          <button type="button" className={navy} disabled={laeuft || !auswahl.size} onClick={() => start(true)}><Spinner an={laeuft} icon={Play} />Vorschau</button>
          <button type="button" className={primaer} disabled={laeuft || !auswahl.size} onClick={() => start(false)}><Spinner an={laeuft} icon={Check} />{auswahl.size} Mahnungen erstellen</button>
          <span className="text-[12.5px] text-ink-500">Empfänger erhalten Glocke + E-Mail (ohne Beträge) und das PDF im Portal.</span>
        </div>
      )}
      {vorschau && <p className="px-5 pb-4 text-[13px] text-ink-600 md:px-6">Vorschau: {vorschau.erzeugt.map((m) => `${m.nummer} → ${m.label} ${euro(m.gesamt)}`).join(" · ") || "keine"}</p>}
      <div className="px-5 pb-4 md:px-6">{fehler && <FehlerBox>{fehler}</FehlerBox>}{meldung && <ErfolgBox>{meldung}</ErfolgBox>}</div>
    </div>
  );
}

// ------------------------------------------------------------------ Mahnwesen-Konfiguration

export function MahnKonfig({ konfig }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const [k, setK] = useState(() => JSON.parse(JSON.stringify(konfig)));
  const stufe = (i, feld, wert) => setK((x) => ({ ...x, stufen: x.stufen.map((s, j) => (j === i ? { ...s, [feld]: wert } : s)) }));
  const speichern = (e) => {
    e.preventDefault();
    ausfuehren(() => senden("/api/admin/finanzen/buchhaltung/einstellungen", { body: { mahnwesen: { ...k, stufen: k.stufen.map((s) => ({ ...s, abTagen: Number(s.abTagen), gebuehr: Number(s.gebuehr), fristTage: Number(s.fristTage) })), basiszinssatz: k.basiszinssatz === "" || k.basiszinssatz === null ? null : Number(k.basiszinssatz) } } }), "Mahnwesen gespeichert.");
  };
  return (
    <form onSubmit={speichern} className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13.5px]">
          <thead><tr className="text-left text-[12px] text-ink-500"><th className="py-1 pr-2">Stufe</th><th className="py-1 pr-2">Bezeichnung</th><th className="py-1 pr-2">ab Tagen überfällig</th><th className="py-1 pr-2">Gebühr €</th><th className="py-1">Frist Tage</th></tr></thead>
          <tbody>
            {k.stufen.map((s, i) => (
              <tr key={i}>
                <td className="py-1 pr-2 font-semibold">{i + 1}</td>
                <td className="py-1 pr-2"><input aria-label={`Bezeichnung Stufe ${i + 1}`} className={eingabe} value={s.label} onChange={(e) => stufe(i, "label", e.target.value)} /></td>
                <td className="py-1 pr-2"><input aria-label={`Tage Stufe ${i + 1}`} type="number" min="1" max="365" className={eingabe} value={s.abTagen} onChange={(e) => stufe(i, "abTagen", e.target.value)} /></td>
                <td className="py-1 pr-2"><input aria-label={`Gebühr Stufe ${i + 1}`} type="number" min="0" max="100" step="0.5" className={eingabe} value={s.gebuehr} onChange={(e) => stufe(i, "gebuehr", e.target.value)} /></td>
                <td className="py-1"><input aria-label={`Frist Stufe ${i + 1}`} type="number" min="3" max="60" className={eingabe} value={s.fristTage} onChange={(e) => stufe(i, "fristTage", e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        {k.stufen.length < 5 && <button type="button" className={hell} onClick={() => setK((x) => ({ ...x, stufen: [...x.stufen, { label: `${x.stufen.length}. Mahnung`, abTagen: Number(x.stufen.at(-1)?.abTagen || 0) + 14, gebuehr: 10, fristTage: 10 }] }))}>Stufe hinzufügen</button>}
        {k.stufen.length > 1 && <button type="button" className={hell} onClick={() => setK((x) => ({ ...x, stufen: x.stufen.slice(0, -1) }))}>Letzte Stufe entfernen</button>}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-[14px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={!!k.verzugszinsen} onChange={(e) => setK({ ...k, verzugszinsen: e.target.checked })} />Verzugszinsen berechnen</label>
        <div>
          <label htmlFor="mw-basis" className={labelKlasse}>Basiszinssatz % p. a. (amtlich)</label>
          <input id="mw-basis" type="number" step="0.01" className={eingabe} value={k.basiszinssatz ?? ""} onChange={(e) => setK({ ...k, basiszinssatz: e.target.value })} placeholder="z. B. laut Bundesbank/OeNB" />
        </div>
        <label className="flex items-center gap-2 text-[14px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={!!k.pauschaleB2b} onChange={(e) => setK({ ...k, pauschaleB2b: e.target.checked })} />40-€-Pauschale B2B (DE/AT)</label>
        <div>
          <label htmlFor="mw-min" className={labelKlasse}>Mindestbetrag €</label>
          <input id="mw-min" type="number" min="0" step="1" className={eingabe} value={k.mindestBetrag} onChange={(e) => setK({ ...k, mindestBetrag: e.target.value })} />
        </div>
      </div>
      <p className="text-[12.5px] leading-relaxed text-ink-500">Verzugszinsen B2B: DE 9 Prozentpunkte über dem Basiszinssatz (§ 288 Abs. 2 BGB), AT 9,2 Prozentpunkte (§ 456 UGB), CH 5 % (Art. 104 OR). Ohne Basiszinssatz werden in DE/AT keine Zinsen berechnet. Die erste Mahnung begründet häufig erst den Verzug – Gebühren daher erst ab Stufe 2 vorbelegt. Vor Einsatz mit Steuer-/Rechtsberatung abstimmen.</p>
      <button type="submit" className={primaer} disabled={laeuft}><Spinner an={laeuft} icon={Save} />Speichern</button>
      {fehler && <FehlerBox>{fehler}</FehlerBox>}
      {meldung && <ErfolgBox>{meldung}</ErfolgBox>}
    </form>
  );
}

// ------------------------------------------------------------------ Beleg-Aktionen (Storno, Mahnsperre)

export function BelegAktionen({ beleg, heute }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const [modus, setModus] = useState("");
  const [grund, setGrund] = useState("");
  const [bis, setBis] = useState("");
  const [pvStorno, setPvStorno] = useState(false);
  const url = `/api/admin/finanzen/buchhaltung/belege/${beleg.id}`;
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {beleg.status !== "angewiesen" && <button type="button" className={cn(klein, "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50")} onClick={() => setModus(modus === "storno" ? "" : "storno")}><Undo2 aria-hidden="true" className="h-3.5 w-3.5" />Stornieren</button>}
        {beleg.beleg === "rechnung" && <button type="button" className={cn(klein, "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50")} onClick={() => setModus(modus === "sperre" ? "" : "sperre")}><Ban aria-hidden="true" className="h-3.5 w-3.5" />Mahnsperre</button>}
      </div>
      {modus === "storno" && (
        <form className="mt-2 space-y-2 rounded-2xl bg-ink-50 p-3 ring-1 ring-ink-200" onSubmit={(e) => { e.preventDefault(); ausfuehren(() => senden(url, { body: { aktion: "storno", grund, provisionStornieren: pvStorno } }), (r) => `${r.storno.nummer} erstellt. ${r.hinweis || ""}`); }}>
          <label htmlFor={`st-${beleg.id}`} className={labelKlasse}>Grund (steht auf dem Stornobeleg)</label>
          <input id={`st-${beleg.id}`} className={eingabe} value={grund} onChange={(e) => setGrund(e.target.value)} minLength={10} required placeholder="z. B. Kaufpreis nachträglich angepasst" />
          {beleg.art === "provision" && <label className="flex items-center gap-2 text-[13px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={pvStorno} onChange={(e) => setPvStorno(e.target.checked)} />Provision ebenfalls stornieren (Rückabwicklung) – sonst entsteht eine korrigierte Rechnung</label>}
          <button type="submit" className={navy} disabled={laeuft}><Spinner an={laeuft} icon={Undo2} />Stornobeleg erstellen</button>
        </form>
      )}
      {modus === "sperre" && (
        <form className="mt-2 grid gap-2 rounded-2xl bg-ink-50 p-3 ring-1 ring-ink-200 sm:grid-cols-[160px_minmax(0,1fr)_auto]" onSubmit={(e) => { e.preventDefault(); ausfuehren(() => senden(url, { body: { aktion: "mahnsperre", bis, grund } }), bis ? "Mahnsperre gesetzt." : "Mahnsperre aufgehoben."); }}>
          <input aria-label="Mahnsperre bis" type="date" className={eingabe} value={bis} min={heute} onChange={(e) => setBis(e.target.value)} />
          <input aria-label="Grund der Mahnsperre" className={eingabe} value={grund} onChange={(e) => setGrund(e.target.value)} placeholder="Grund (leer lassen + ohne Datum = aufheben)" />
          <button type="submit" className={hell} disabled={laeuft}><Spinner an={laeuft} icon={Save} />{bis ? "Sperren" : "Aufheben"}</button>
        </form>
      )}
      {fehler && <div className="mt-2"><FehlerBox>{fehler}</FehlerBox></div>}
      {meldung && <div className="mt-2"><ErfolgBox>{meldung}</ErfolgBox></div>}
    </div>
  );
}

// ------------------------------------------------------------------ Kontoauszug-Import und Zuordnung

export function ZahlungImport() {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const [datei, setDatei] = useState(null);
  async function hochladen(e) {
    e.preventDefault();
    if (!datei) return;
    if (datei.size > 3_000_000) return ausfuehren(async () => { throw new Error("Die Datei ist zu groß (max. ca. 3 MB)."); });
    const puffer = await datei.arrayBuffer();
    let inhalt = new TextDecoder("utf-8", { fatal: false }).decode(puffer);
    if (inhalt.includes("�")) inhalt = new TextDecoder("windows-1252").decode(puffer); // CSV aus dem Online-Banking oft ANSI
    const format = /\.xml$/i.test(datei.name) ? "camt" : /\.(csv|txt)$/i.test(datei.name) ? "csv" : "";
    await ausfuehren(() => senden("/api/admin/finanzen/buchhaltung/zahlungen", { body: { inhalt, dateiname: datei.name, format } }), (r) => `${r.import.neu} neue Buchungen (${r.import.sicher} sichere Treffer, ${r.import.doppelt} Dubletten übersprungen).`);
  }
  return (
    <form onSubmit={hochladen} className="space-y-3">
      <label htmlFor="za-datei" className={labelKlasse}>Kontoauszug (CAMT.053/.054 als XML oder CSV aus dem Online-Banking)</label>
      <input id="za-datei" type="file" accept=".xml,.csv,.txt,text/xml,text/csv" onChange={(e) => setDatei(e.target.files?.[0] || null)} className="block w-full text-[14px] file:mr-3 file:rounded-full file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-white" />
      <button type="submit" className={primaer} disabled={laeuft || !datei}><Spinner an={laeuft} icon={FileUp} />Einlesen</button>
      <p className="text-[12.5px] text-ink-500">Dieselbe Datei wird nur einmal eingelesen; einzelne Buchungen werden über Datum, Betrag, Referenz und Zweck als Dubletten erkannt. Die Plattform bucht nichts automatisch – Treffer bestätigen Sie unten.</p>
      {fehler && <FehlerBox>{fehler}</FehlerBox>}
      {meldung && <ErfolgBox>{meldung}</ErfolgBox>}
    </form>
  );
}

export function ZahlungsListe({ eingaenge = [], offeneBelege = [], darf }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const [wahl, setWahl] = useState({});
  const [grund, setGrund] = useState({});
  const offen = eingaenge.filter((e) => e.status === "offen");
  const sicher = offen.filter((e) => e.vorschlag?.art === "sicher").length;
  const ton = { sicher: "text-ov-700", nummer: "text-ink-900", betrag: "text-navy-700", keiner: "text-ink-500" };
  const belegeFuer = (e) => offeneBelege.filter((b) => (e.richtung === "ausgang" ? b.beleg === "gutschrift" : b.beleg === "rechnung"));
  return (
    <div>
      {darf && sicher > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-5 py-3 md:px-6">
          <button type="button" className={primaer} disabled={laeuft} onClick={() => ausfuehren(() => senden("/api/admin/finanzen/buchhaltung/zahlungen/alle", { body: {} }), (r) => `${r.uebernommen} Zahlungen übernommen${r.fehler?.length ? ` · ${r.fehler.length} Fehler: ${r.fehler.join("; ")}` : ""}.`)}><Spinner an={laeuft} icon={CheckCheck} />{sicher} sichere Treffer übernehmen</button>
          <span className="text-[12.5px] text-ink-500">Belegnummer und Betrag stimmen überein.</span>
        </div>
      )}
      {eingaenge.length ? (
        <ul className="divide-y divide-ink-100">
          {eingaenge.slice(0, 100).map((e) => (
            <li key={e.id} className="px-5 py-3 md:px-6">
              <p className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                <span className="font-semibold text-ink-900">{tag(e.datum)} · {e.name || "ohne Namen"} <span className="font-normal text-ink-500">{e.iban}</span></span>
                <span className={cn("ov-num font-semibold", e.richtung === "ausgang" ? "text-ink-700" : "text-ov-700")}>{e.richtung === "ausgang" ? "−" : "+"}{euro(e.betrag)}</span>
              </p>
              <p className="line-clamp-2 text-[12.5px] text-ink-600">{e.zweck || e.referenz || "ohne Verwendungszweck"}</p>
              {e.status === "offen" ? (
                <>
                  <p className={cn("mt-1 text-[12.5px] font-semibold", ton[e.vorschlag?.art] || ton.keiner)}>{e.vorschlag?.text}</p>
                  {darf && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <select aria-label="Beleg zuordnen" className={auswahlfeld} value={wahl[e.id] ?? e.vorschlag?.belegId ?? ""} onChange={(x) => setWahl({ ...wahl, [e.id]: x.target.value })}>
                        <option value="">Beleg wählen …</option>
                        {belegeFuer(e).map((b) => <option key={b.id} value={b.id}>{b.nummer} · {b.empfaenger} · offen {euro(b.offen)}</option>)}
                      </select>
                      <button type="button" className={primaer} disabled={laeuft || !(wahl[e.id] ?? e.vorschlag?.belegId)} onClick={() => ausfuehren(() => senden(`/api/admin/finanzen/buchhaltung/zahlungen/${e.id}`, { body: { aktion: "zuordnen", belegId: wahl[e.id] ?? e.vorschlag?.belegId } }), (r) => `${r.beleg.nummer}: ${r.beleg.status === "bezahlt" ? "bezahlt" : `Teilzahlung, offen ${euro(r.beleg.offen)}`}.`)}><Check aria-hidden="true" className="h-4 w-4" />Zuordnen</button>
                      <div className="flex gap-1.5">
                        <input aria-label="Grund zum Ignorieren" className={cn(eingabe, "h-9 w-40")} placeholder="Grund" value={grund[e.id] || ""} onChange={(x) => setGrund({ ...grund, [e.id]: x.target.value })} />
                        <button type="button" className={hell} disabled={laeuft} onClick={() => ausfuehren(() => senden(`/api/admin/finanzen/buchhaltung/zahlungen/${e.id}`, { body: { aktion: "ignorieren", grund: grund[e.id] || "" } }), "Buchung ignoriert.")}><X aria-hidden="true" className="h-4 w-4" />Ignorieren</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-600">
                  {e.status === "zugeordnet" ? <>Zugeordnet zu <strong className="ov-num">{e.nummer}</strong>{e.teilzahlung ? " (Teilzahlung)" : ""}{e.differenz ? ` · Überzahlung ${euro(e.differenz)}` : ""}</> : <>Ignoriert: {e.grund}</>}
                  {darf && e.status === "ignoriert" && <button type="button" className={cn(klein, "bg-white text-ink-700 ring-ink-200")} onClick={() => ausfuehren(() => senden(`/api/admin/finanzen/buchhaltung/zahlungen/${e.id}`, { body: { aktion: "zuruecksetzen" } }))}><RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />Zurücksetzen</button>}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="px-5 py-8 text-center text-[14px] text-ink-500 md:px-6">Noch keine Buchungen importiert.</p>}
      <div className="px-5 pb-4 md:px-6">{fehler && <FehlerBox>{fehler}</FehlerBox>}{meldung && <ErfolgBox>{meldung}</ErfolgBox>}</div>
    </div>
  );
}

// ------------------------------------------------------------------ Export und Kontenzuordnung

export function ExportFormular({ vormonat }) {
  const [von, setVon] = useState(`${vormonat}-01`);
  const [bis, setBis] = useState(() => {
    const [j, m] = vormonat.split("-").map(Number);
    return new Date(Date.UTC(j, m, 0)).toISOString().slice(0, 10);
  });
  const link = (format) => `/api/admin/finanzen/buchhaltung/export?format=${format}&von=${von}&bis=${bis}`;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor="ex-von" className={labelKlasse}>von</label><input id="ex-von" type="date" className={eingabe} value={von} onChange={(e) => setVon(e.target.value)} /></div>
        <div><label htmlFor="ex-bis" className={labelKlasse}>bis</label><input id="ex-bis" type="date" className={eingabe} value={bis} onChange={(e) => setBis(e.target.value)} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={link("datev")} className={navy}><Download aria-hidden="true" className="h-4 w-4" />DATEV-Buchungsstapel</a>
        <a href={link("bmd")} className={navy}><Download aria-hidden="true" className="h-4 w-4" />BMD-Buchungsimport</a>
        <a href="/api/admin/finanzen/buchhaltung/export?format=op" className={hell}><Download aria-hidden="true" className="h-4 w-4" />OP-Liste (CSV)</a>
      </div>
      <p className="text-[12.5px] leading-relaxed text-ink-500">Enthalten: Rechnungen und Gutschriften nach Belegdatum, Stornobelege, Zahlungen (Bank an Debitor / Kreditor an Bank). Mit ERPNext kommen die Buchungen aus dem Hauptbuch. DATEV-Datei in ISO-8859-1; Feldumfang und Konten vor dem ersten Echtimport mit der Steuerberatung per Testimport prüfen.</p>
    </div>
  );
}

const KONTO_FELDER = [
  ["debitor", "Debitoren (Sammel-/Personenkonto)"], ["kreditor", "Kreditoren"], ["bank", "Bank"],
  ["erloes.provision", "Erlöse Provision"], ["erloes.provision_rc", "Erlöse Provision Reverse Charge/nicht steuerbar"], ["erloes.contracting", "Erlöse Contracting"], ["erloes.contracting_rc", "Erlöse Contracting Reverse Charge"], ["aufwand.pacht", "Pachtaufwand"],
];
const lesenPfad = (o, p) => p.split(".").reduce((x, k) => x?.[k], o) ?? "";
const setzenPfad = (o, p, w) => {
  const k = p.split(".");
  const n = JSON.parse(JSON.stringify(o));
  let x = n;
  for (const t of k.slice(0, -1)) x = x[t] ||= {};
  x[k.at(-1)] = w;
  return n;
};

export function KontenFormular({ konten }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const [k, setK] = useState(() => JSON.parse(JSON.stringify(konten)));
  const [sys, setSys] = useState("datev");
  return (
    <form onSubmit={(e) => { e.preventDefault(); ausfuehren(() => senden("/api/admin/finanzen/buchhaltung/einstellungen", { body: { konten: k } }), "Kontenzuordnung gespeichert."); }} className="space-y-3">
      <div className="flex gap-1.5" role="tablist" aria-label="System" onKeyDown={tabTasten}>
        {["datev", "bmd"].map((s) => <button key={s} type="button" role="tab" aria-selected={sys === s} className={cn(klein, sys === s ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200")} onClick={() => setSys(s)}>{s === "datev" ? "DATEV (DE, SKR-Beispiel)" : "BMD (AT, EKR-Beispiel)"}</button>)}
      </div>
      {sys === "datev" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label htmlFor="dv-b" className={labelKlasse}>Beraternummer</label><input id="dv-b" className={eingabe} value={k.datev.beraternummer} onChange={(e) => setK(setzenPfad(k, "datev.beraternummer", e.target.value))} inputMode="numeric" /></div>
          <div><label htmlFor="dv-m" className={labelKlasse}>Mandantennummer</label><input id="dv-m" className={eingabe} value={k.datev.mandantennummer} onChange={(e) => setK(setzenPfad(k, "datev.mandantennummer", e.target.value))} inputMode="numeric" /></div>
          <div><label htmlFor="dv-l" className={labelKlasse}>Sachkontenlänge</label><select id="dv-l" className={auswahlfeld} value={k.datev.sachkontenlaenge} onChange={(e) => setK(setzenPfad(k, "datev.sachkontenlaenge", Number(e.target.value)))}>{[4, 5, 6, 7, 8].map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {KONTO_FELDER.map(([p, l]) => (
          <div key={p}><label htmlFor={`kt-${sys}-${p}`} className={labelKlasse}>{l}</label><input id={`kt-${sys}-${p}`} className={eingabe} inputMode="numeric" value={lesenPfad(k[sys], p)} onChange={(e) => setK(setzenPfad(k, `${sys}.${p}`, e.target.value))} /></div>
        ))}
      </div>
      <p className="text-[12.5px] text-ink-500">Vorbelegung nur als Beispiel. BU-Schlüssel (DATEV) bzw. Steuercodes (BMD) je Steuervorlage legt die Steuerberatung fest.</p>
      <button type="submit" className={primaer} disabled={laeuft}><Spinner an={laeuft} icon={Save} />Speichern</button>
      {fehler && <FehlerBox>{fehler}</FehlerBox>}
      {meldung && <ErfolgBox>{meldung}</ErfolgBox>}
    </form>
  );
}

// ------------------------------------------------------------------ Monatsabschluss

export function AbschlussCheckliste({ abschluss, darf }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const [notiz, setNotiz] = useState({});
  const [grund, setGrund] = useState("");
  const url = `/api/admin/finanzen/buchhaltung/abschluss/${abschluss.monat}`;
  const fertig = abschluss.status === "abgeschlossen";
  const pflichtOffen = useMemo(() => abschluss.punkte.filter((p) => p.pflicht && !p.erledigt).length, [abschluss]);
  return (
    <div>
      <ul className="divide-y divide-ink-100">
        {abschluss.punkte.map((p) => (
          <li key={p.id} className="px-5 py-3 md:px-6">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", p.erledigt ? "bg-ov-600 text-white" : "bg-ink-100 text-ink-400")}>{p.erledigt ? <Check className="h-3.5 w-3.5" /> : null}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-ink-900">{p.titel}{p.pflicht ? "" : <span className="font-normal text-ink-500"> (optional)</span>}{p.uebersteuert && <span className="ml-2 text-[12px] font-semibold text-ink-900">manuell bestätigt</span>}</p>
                <p className="text-[12.5px] text-ink-600">{p.info ? `${p.info} · ` : ""}{p.text}</p>
                {p.notiz && <p className="text-[12.5px] text-ink-500">Notiz: {p.notiz}{p.vonName ? ` (${p.vonName})` : ""}</p>}
                {darf && !fertig && (p.auto ? !p.automatisch : true) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <input aria-label={`Notiz ${p.titel}`} className={cn(eingabe, "h-9 min-w-[200px] flex-1")} placeholder={p.auto ? "Begründung (Pflicht bei manueller Bestätigung)" : "Notiz (optional)"} value={notiz[p.id] || ""} onChange={(e) => setNotiz({ ...notiz, [p.id]: e.target.value })} />
                    <button type="button" className={hell} disabled={laeuft} onClick={() => ausfuehren(() => senden(url, { body: { aktion: "punkt", punkt: p.id, erledigt: !p.erledigt, notiz: notiz[p.id] || "" } }))}>{p.erledigt ? "Zurücknehmen" : "Als erledigt markieren"}</button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {darf && (
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 px-5 py-4 md:px-6">
          {fertig ? (
            <>
              <input aria-label="Grund der Wiedereröffnung" className={cn(eingabe, "h-9 min-w-[240px] flex-1")} placeholder="Grund der Wiedereröffnung" value={grund} onChange={(e) => setGrund(e.target.value)} />
              <button type="button" className={hell} disabled={laeuft} onClick={() => ausfuehren(() => senden(url, { body: { aktion: "wiedereroeffnen", grund } }), "Monat wiedereröffnet.")}><RotateCcw aria-hidden="true" className="h-4 w-4" />Wiedereröffnen</button>
            </>
          ) : (
            <>
              <button type="button" className={primaer} disabled={laeuft || pflichtOffen > 0} onClick={() => ausfuehren(() => senden(url, { body: { aktion: "abschliessen" } }), "Monat abgeschlossen.")}><Spinner an={laeuft} icon={CheckCheck} />Monat abschließen</button>
              <span className="text-[12.5px] text-ink-500">{pflichtOffen ? `${pflichtOffen} Pflichtpunkte offen` : "Alle Pflichtpunkte erfüllt"}</span>
            </>
          )}
        </div>
      )}
      <div className="px-5 pb-4 md:px-6">{fehler && <FehlerBox>{fehler}</FehlerBox>}{meldung && <ErfolgBox>{meldung}</ErfolgBox>}</div>
    </div>
  );
}

export function StornoFormular({ belege = [] }) {
  const [id, setId] = useState("");
  const [such, setSuch] = useState("");
  const treffer = belege.filter((b) => !such || `${b.nummer} ${b.empfaenger}`.toLowerCase().includes(such.toLowerCase())).slice(0, 60);
  const b = belege.find((x) => x.id === id);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor="sf-such" className={labelKlasse}>Suche (Nummer, Empfänger)</label><input id="sf-such" className={eingabe} value={such} onChange={(e) => setSuch(e.target.value)} /></div>
        <div><label htmlFor="sf-beleg" className={labelKlasse}>Beleg</label><select id="sf-beleg" className={auswahlfeld} value={id} onChange={(e) => setId(e.target.value)}><option value="">Beleg wählen …</option>{treffer.map((x) => <option key={x.id} value={x.id}>{x.nummer} · {x.empfaenger} · {euro(x.brutto)} · {x.status}</option>)}</select></div>
      </div>
      {b && <BelegAktionen beleg={b} heute={new Date().toISOString().slice(0, 10)} />}
      <p className="text-[12.5px] text-ink-500">Belege werden nie gelöscht. Der Stornobeleg erhält eine eigene Nummer (ST-…) und verweist auf den Ursprung; bereits gezahlte Beträge werden als Erstattung/Rückforderung zur Aufgabe.</p>
    </div>
  );
}

