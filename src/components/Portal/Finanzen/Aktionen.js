"use client";

// src/components/Portal/Finanzen/Aktionen.js
//
// Interaktive Teile des Finanz-Backoffice: Abrechnungslauf, Beleg-Aktionen, Klärfälle, Zahlungsvorschlag mit
// SEPA-Export, Zahlungsläufe, VPI-Pflege, Anlagen-Aktivierung (AfA) und Kostenbuchung. Rechte prüft der Server;
// die Oberfläche blendet Schreibaktionen ohne Recht nur aus.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Download, Loader2, Play, RotateCcw, Send, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { eingabe, auswahlfeld, labelKlasse, FehlerBox, ErfolgBox } from "@/components/Portal/felder";
import { BelegListe, euro, tag, zeitraum } from "./teile";

const knopf = "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-50";
const knopfPrimaer = cn(knopf, "bg-ov-600 text-white hover:bg-ov-700");
const knopfNavy = cn(knopf, "bg-navy-700 text-white hover:bg-navy-800");
const knopfHell = cn(knopf, "bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50");
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
  return { laeuft, fehler, meldung, ausfuehren, setFehler };
}

// ------------------------------------------------------------------ Abrechnungslauf

export function LaufStarten({ heute, vormonat }) {
  const { laeuft, fehler, ausfuehren } = useAktion();
  const [art, setArt] = useState("alle");
  const [stichtag, setStichtag] = useState(heute);
  const [monat, setMonat] = useState(vormonat);
  const [trocken, setTrocken] = useState(true);
  const [ergebnis, setErgebnis] = useState(null);
  async function start(e) {
    e.preventDefault();
    const r = await ausfuehren(() => senden("/api/admin/finanzen/lauf", { body: { art, stichtag, monat, trockenlauf: trocken } }));
    if (r) setErgebnis(r.lauf);
  }
  return (
    <form onSubmit={start} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="lauf-art" className={labelKlasse}>Art</label>
          <select id="lauf-art" className={auswahlfeld} value={art} onChange={(e) => setArt(e.target.value)}>
            <option value="alle">Alle Abrechnungen</option>
            <option value="pacht">Pacht (fällige Perioden)</option>
            <option value="contracting">Contracting (Monat)</option>
            <option value="provision">Provisionen</option>
          </select>
        </div>
        <div>
          <label htmlFor="lauf-stichtag" className={labelKlasse}>Stichtag</label>
          <input id="lauf-stichtag" type="date" className={eingabe} value={stichtag} onChange={(e) => setStichtag(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="lauf-monat" className={labelKlasse}>Contracting-Monat</label>
          <input id="lauf-monat" type="month" className={eingabe} value={monat} onChange={(e) => setMonat(e.target.value)} disabled={art === "pacht" || art === "provision"} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[14px] text-ink-700">
        <input type="checkbox" checked={trocken} onChange={(e) => setTrocken(e.target.checked)} className="h-4 w-4 accent-ov-600" />
        Nur prüfen (Trockenlauf – es entstehen keine Belege)
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={laeuft} className={trocken ? knopfNavy : knopfPrimaer}>
          {laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Play aria-hidden="true" className="h-4 w-4" />}
          {trocken ? "Trockenlauf starten" : "Lauf ausführen"}
        </button>
      </div>
      <FehlerBox>{fehler}</FehlerBox>
      {ergebnis && (
        <div role="status" className="rounded-2xl bg-ink-50 p-4 text-[13.5px] ring-1 ring-ink-200">
          <p className="font-semibold text-ink-900">
            {ergebnis.trockenlauf ? "Vorschau: " : "Ergebnis: "}
            {ergebnis.erzeugt.length} Belege ({euro(ergebnis.erzeugt.reduce((s, b) => s + b.brutto, 0))}), {ergebnis.klaerfaelle.length} Klärfälle, {ergebnis.vorhanden} bereits abgerechnet
          </p>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-ink-700">
            {ergebnis.erzeugt.slice(0, 40).map((b, i) => <li key={b.id || i}>{b.nummer} · {b.empfaenger} · {zeitraum(b.zeitraum)} · <span className="ov-num font-semibold">{euro(b.brutto)}</span></li>)}
            {ergebnis.klaerfaelle.slice(0, 20).map((k, i) => <li key={`k${i}`} className="text-ink-900">Klärfall: {k.bezugText} – {k.gruende[0]}</li>)}
          </ul>
        </div>
      )}
    </form>
  );
}

// ------------------------------------------------------------------ Belege

export function BelegAktionen({ beleg: b }) {
  const { laeuft, fehler, ausfuehren } = useAktion();
  const [storno, setStorno] = useState(false);
  const [grund, setGrund] = useState("");
  const post = (body) => ausfuehren(() => senden(`/api/admin/finanzen/abrechnungen/${b.id}`, { body }));
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      {["offen", "angewiesen"].includes(b.status) && (!b.auszahlung || b.auszahlung.ok) && (
        <button type="button" disabled={laeuft} onClick={() => post({ aktion: "bezahlt" })} className={cn(klein, "text-ov-800 ring-ov-200 hover:bg-ov-50")}>
          <Check aria-hidden="true" className="h-3.5 w-3.5" />
          {b.beleg === "gutschrift" ? "ausgezahlt" : "bezahlt"}
        </button>
      )}
      {b.mahnhinweis?.faellig && (
        <button type="button" disabled={laeuft} onClick={() => post({ aktion: "mahnen" })} title={b.mahnhinweis.text} className={cn(klein, "text-ink-900 ring-sun-400/60 hover:bg-sun-300/20")}>
          <Send aria-hidden="true" className="h-3.5 w-3.5" />
          erinnern
        </button>
      )}
      {b.status === "angewiesen" && (
        <button type="button" disabled={laeuft} onClick={() => post({ aktion: "offen" })} className={cn(klein, "text-ink-700 ring-ink-200 hover:bg-ink-50")}>
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          zurücksetzen
        </button>
      )}
      {b.status === "offen" && !storno && (
        <button type="button" onClick={() => setStorno(true)} className={cn(klein, "text-ink-600 ring-ink-200 hover:bg-ink-50")}>
          <X aria-hidden="true" className="h-3.5 w-3.5" />
          storno
        </button>
      )}
      {storno && (
        <span className="inline-flex items-center gap-1">
          <label className="sr-only" htmlFor={`storno-${b.id}`}>Grund der Stornierung</label>
          <input id={`storno-${b.id}`} value={grund} onChange={(e) => setGrund(e.target.value)} placeholder="Grund" className="h-8 w-36 rounded-full px-3 text-[12.5px] ring-1 ring-inset ring-ink-200 focus-visible:ring-2 focus-visible:ring-ov-500" />
          <button type="button" disabled={laeuft} onClick={() => post({ aktion: "storno", grund })} className={cn(klein, "text-red-800 ring-red-200 hover:bg-red-50")}>bestätigen</button>
        </span>
      )}
      {fehler && <span role="alert" className="basis-full text-right text-[12px] text-red-700">{fehler}</span>}
    </span>
  );
}

export function BelegTabelle({ belege, leer, darf }) {
  return <BelegListe belege={belege} leer={leer} mitEmpfaenger aktionen={darf ? (b) => <BelegAktionen beleg={b} /> : null} />;
}

// ------------------------------------------------------------------ Klärfälle

export function KlaerfallAktionen({ klaerfall: k }) {
  const { laeuft, fehler, ausfuehren } = useAktion();
  const [kommentar, setKommentar] = useState("");
  const post = (aktion) => ausfuehren(() => senden(`/api/admin/finanzen/klaerfaelle/${k.id}`, { body: { aktion, kommentar } }));
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="sr-only" htmlFor={`kf-${k.id}`}>Kommentar</label>
      <input id={`kf-${k.id}`} value={kommentar} onChange={(e) => setKommentar(e.target.value)} placeholder="Kommentar, z. B. „Monatswert nachgetragen“" className={cn(eingabe, "h-10 text-[14px]")} />
      <div className="flex shrink-0 gap-1.5">
        <button type="button" disabled={laeuft} onClick={() => post("erledigt")} className={knopfPrimaer}>Erledigt</button>
        <button type="button" disabled={laeuft} onClick={() => post("verworfen")} className={knopfHell}>Verwerfen</button>
      </div>
      {fehler && <p role="alert" className="text-[12.5px] text-red-700">{fehler}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ Zahlungsvorschlag und SEPA

export function Zahlungsvorschlag({ daten, darf, heute }) {
  const router = useRouter();
  // Vorauswahl: freie Gutschriften der ersten Gesellschaft mit gültigem Auftraggeberkonto (eine SEPA-Datei je Gesellschaft)
  const ersteGes = (daten.auftraggeber || []).find((a) => a.ibanOk !== false && daten.eintraege.some((e) => e.ok && e.gesellschaftId === a.gesellschaftId))?.gesellschaftId;
  const frei = daten.eintraege.filter((e) => e.ok && e.gesellschaftId === ersteGes);
  const [auswahl, setAuswahl] = useState(() => new Set(frei.flatMap((e) => e.belege.map((b) => b.id))));
  const [datum, setDatum] = useState(heute);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [meldung, setMeldung] = useState("");
  const umschalten = (id) => setAuswahl((a) => {
    const n = new Set(a);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  async function exportieren() {
    setLaeuft(true);
    setFehler("");
    setMeldung("");
    try {
      const res = await fetch("/api/admin/finanzen/zahlungen/sepa", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ ids: [...auswahl], ausfuehrungAm: datum }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Fehler ${res.status}`);
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") || "")?.[1] || "sepa.xml";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMeldung(`SEPA-Datei ${name} erzeugt – bitte im Online-Banking einreichen und danach den Zahlungslauf bestätigen.`);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }
  const summe = daten.eintraege.flatMap((e) => e.belege).filter((b) => auswahl.has(b.id)).reduce((s, b) => s + b.brutto, 0);
  if (!daten.eintraege.length) return <p className="text-[14px] text-ink-500">Keine offenen Gutschriften bis {tag(daten.bis)}.</p>;
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {daten.eintraege.map((e) => (
          <li key={`${e.gesellschaftId}-${e.kontoId}`} className={cn("rounded-2xl p-4 ring-1", e.ok ? "bg-white ring-ink-200/70" : "bg-sun-300/15 ring-sun-400/50")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{e.empfaenger}</p>
                <p className="text-[12.5px] text-ink-500">{e.ibanMaskiert || "keine IBAN"} · KYC: {e.kycStatus} · zahlt: {e.gesellschaft}</p>
              </div>
              <p className="ov-num font-display text-[17px] font-bold text-ink-900">{euro(e.summe)}</p>
            </div>
            {!e.ok && <p className="mt-2 text-[13px] text-ink-900"><strong>Auszahlung gesperrt:</strong> {e.gruende.join(" ")}</p>}
            <ul className="mt-2 space-y-1">
              {e.belege.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13.5px] text-ink-700">
                  {e.ok && darf ? (
                    <input type="checkbox" aria-label={`${b.nummer} auswählen`} checked={auswahl.has(b.id)} onChange={() => umschalten(b.id)} className="h-4 w-4 accent-ov-600" />
                  ) : (
                    <span aria-hidden="true" className="inline-block h-4 w-4 rounded border border-ink-300 bg-ink-100" />
                  )}
                  <span className="ov-num whitespace-nowrap font-semibold">{b.nummer}</span>
                  <span className="ov-num ml-auto whitespace-nowrap font-semibold sm:order-last">{euro(b.brutto)}</span>
                  <span className="min-w-0 basis-full pl-6 text-[12.5px] text-ink-500 sm:basis-auto sm:pl-0 sm:text-[13.5px] sm:text-ink-700">{zeitraum(b.zeitraum)} · fällig {tag(b.faelligAm)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {darf && (
        <div className="flex flex-col gap-3 rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-200 sm:flex-row sm:items-end">
          <div className="sm:w-48">
            <label htmlFor="sepa-datum" className={labelKlasse}>Ausführung am</label>
            <input id="sepa-datum" type="date" min={heute} className={eingabe} value={datum} onChange={(e) => setDatum(e.target.value)} />
          </div>
          <p className="text-[13.5px] text-ink-700 sm:flex-1">{auswahl.size} Gutschriften · <span className="ov-num font-semibold">{euro(summe)}</span><br />Auftraggeber: {daten.auftraggeber.map((a) => `${a.name} ${a.ibanMaskiert}${a.beispiel ? " (Beispiel-IBAN, Demo)" : ""}`).join(" · ")}</p>
          <button type="button" disabled={laeuft || !auswahl.size} onClick={exportieren} className={knopfPrimaer}>
            {laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}
            SEPA-Datei (pain.001)
          </button>
        </div>
      )}
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{meldung}</ErfolgBox>
    </div>
  );
}

export function ZahlungslaufAktionen({ lauf }) {
  const { laeuft, fehler, ausfuehren } = useAktion();
  if (lauf.status !== "erstellt") return null;
  const post = (aktion) => ausfuehren(() => senden(`/api/admin/finanzen/zahlungen/${lauf.id}`, { body: { aktion } }));
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <button type="button" disabled={laeuft} onClick={() => post("bestaetigen")} className={cn(klein, "text-ov-800 ring-ov-200 hover:bg-ov-50")}>ausgeführt</button>
      <button type="button" disabled={laeuft} onClick={() => post("verwerfen")} className={cn(klein, "text-ink-700 ring-ink-200 hover:bg-ink-50")}>verwerfen</button>
      {fehler && <span role="alert" className="text-[12px] text-red-700">{fehler}</span>}
    </span>
  );
}

// ------------------------------------------------------------------ Index (VPI)

export function VpiFormular({ reihen }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const ids = Object.keys(reihen);
  const [reihe, setReihe] = useState(ids[0]);
  const [jahr, setJahr] = useState(new Date().getFullYear() - 1);
  const [wert, setWert] = useState("");
  const [quelle, setQuelle] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ausfuehren(() => senden("/api/admin/finanzen/vpi", { method: "PUT", body: { reihe, jahr, wert, quelle } }), "Indexwert gespeichert.");
      }}
      className="grid gap-3 sm:grid-cols-[1.4fr_0.7fr_0.8fr_1.4fr_auto] sm:items-end"
    >
      <div>
        <label htmlFor="vpi-reihe" className={labelKlasse}>Reihe</label>
        <select id="vpi-reihe" className={auswahlfeld} value={reihe} onChange={(e) => setReihe(e.target.value)}>
          {ids.map((id) => <option key={id} value={id}>{reihen[id].label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="vpi-jahr" className={labelKlasse}>Jahr</label>
        <input id="vpi-jahr" type="number" min="1990" max="2100" className={eingabe} value={jahr} onChange={(e) => setJahr(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="vpi-wert" className={labelKlasse}>Jahresdurchschnitt</label>
        <input id="vpi-wert" inputMode="decimal" className={eingabe} value={wert} onChange={(e) => setWert(e.target.value)} placeholder="z. B. 127,5" required />
      </div>
      <div>
        <label htmlFor="vpi-quelle" className={labelKlasse}>Quelle</label>
        <input id="vpi-quelle" className={eingabe} value={quelle} onChange={(e) => setQuelle(e.target.value)} placeholder="Veröffentlichung, Datum" />
      </div>
      <button type="submit" disabled={laeuft} className={cn(knopfPrimaer, "h-12")}>Speichern</button>
      <div className="sm:col-span-5"><FehlerBox>{fehler}</FehlerBox><ErfolgBox>{meldung}</ErfolgBox></div>
    </form>
  );
}

// ------------------------------------------------------------------ Anlagenbuchhaltung, Projektkosten

export function AnlageAktivieren({ anlage: a }) {
  const { laeuft, fehler, ausfuehren } = useAktion();
  const [offen, setOffen] = useState(false);
  const [w, setW] = useState(a.asset?.anschaffungswert ?? "");
  const [nd, setNd] = useState(a.asset?.nutzungsdauerJahre ?? a.vorschlag.nutzungsdauerJahre);
  const [ib, setIb] = useState(a.asset?.inbetriebnahme || a.inbetriebnahme || "");
  const [regel, setRegel] = useState(a.regel);
  if (!offen) return <button type="button" onClick={() => setOffen(true)} className={cn(klein, "text-ov-800 ring-ov-200 hover:bg-ov-50")}>{a.aktiviert ? "ändern" : "aktivieren"}</button>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ausfuehren(() => senden(`/api/admin/finanzen/anlagen/${a.anlageId}`, { method: "PUT", body: { anschaffungswert: w, nutzungsdauerJahre: nd, inbetriebnahme: ib, regel } })).then((r) => r && setOffen(false));
      }}
      className="mt-2 grid gap-2 sm:grid-cols-5 sm:items-end"
    >
      <input aria-label="Anschaffungswert in Euro" inputMode="decimal" className={cn(eingabe, "h-10 text-[14px]")} value={w} onChange={(e) => setW(e.target.value)} placeholder="Anschaffung €" required />
      <input aria-label="Nutzungsdauer in Jahren" type="number" min="1" max="50" className={cn(eingabe, "h-10 text-[14px]")} value={nd} onChange={(e) => setNd(e.target.value)} required />
      <input aria-label="Inbetriebnahme" type="date" className={cn(eingabe, "h-10 text-[14px]")} value={ib} onChange={(e) => setIb(e.target.value)} required />
      <select aria-label="AfA-Regel" className={cn(auswahlfeld, "h-10 text-[14px]")} value={regel} onChange={(e) => setRegel(e.target.value)}>
        <option value="AT">AT (Halbjahr)</option>
        <option value="DE">DE (monatsgenau)</option>
        <option value="CH">CH (monatsgenau)</option>
      </select>
      <button type="submit" disabled={laeuft} className={knopfPrimaer}>Speichern</button>
      {fehler && <p role="alert" className="text-[12.5px] text-red-700 sm:col-span-5">{fehler}</p>}
    </form>
  );
}

export function KostenBuchen({ projekte, kostenarten }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const [d, setD] = useState({ projektId: projekte[0]?.projektId || "", kostenart: "planung", betrag: "", datum: new Date().toISOString().slice(0, 10), beleg: "", beschreibung: "" });
  const feld = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ausfuehren(() => senden("/api/admin/finanzen/entwicklung", { body: d }), "Kosten gebucht.");
      }}
      className="grid gap-3 md:grid-cols-3"
    >
      <div className="md:col-span-2">
        <label htmlFor="pk-projekt" className={labelKlasse}>Entwicklungsprojekt / Kostenträger</label>
        <select id="pk-projekt" className={auswahlfeld} value={d.projektId} onChange={feld("projektId")}>
          {projekte.map((p) => <option key={p.projektId} value={p.projektId}>{p.bezeichnung}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="pk-art" className={labelKlasse}>Kostenart</label>
        <select id="pk-art" className={auswahlfeld} value={d.kostenart} onChange={feld("kostenart")}>
          {Object.entries(kostenarten).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="pk-betrag" className={labelKlasse}>Betrag (€, netto)</label>
        <input id="pk-betrag" inputMode="decimal" className={eingabe} value={d.betrag} onChange={feld("betrag")} required />
      </div>
      <div>
        <label htmlFor="pk-datum" className={labelKlasse}>Datum</label>
        <input id="pk-datum" type="date" className={eingabe} value={d.datum} onChange={feld("datum")} required />
      </div>
      <div>
        <label htmlFor="pk-beleg" className={labelKlasse}>Beleg</label>
        <input id="pk-beleg" className={eingabe} value={d.beleg} onChange={feld("beleg")} placeholder="z. B. ER-2026-118" />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="pk-text" className={labelKlasse}>Beschreibung</label>
        <input id="pk-text" className={eingabe} value={d.beschreibung} onChange={feld("beschreibung")} />
      </div>
      <div className="flex items-end"><button type="submit" disabled={laeuft} className={cn(knopfPrimaer, "h-12 w-full")}>Buchen</button></div>
      <div className="md:col-span-3"><FehlerBox>{fehler}</FehlerBox><ErfolgBox>{meldung}</ErfolgBox></div>
    </form>
  );
}
