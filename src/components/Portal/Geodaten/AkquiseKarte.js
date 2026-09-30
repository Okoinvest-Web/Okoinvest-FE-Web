"use client";

// Akquise-Cockpit mit Karte (Backoffice, Unterrollen Leitung/Akquise): basemap.at (Grau/Orthofoto) über Leaflet
// (nur clientseitig, dynamischer Import), Ebenen Kandidatenflächen (Score-Farbe, Heatmap-Punkte), Umspannwerke/
// Trafostationen nach Spannung, Schutzgebiete, OÖ-Prioritätsradien, Umkreis-Radius; Filter, Suche (Ort, KG,
// Grundstücksnummer, Umspannwerk), Steckbrief mit Score-Begründung, Übernahme als Akquise-Ziel, Anschreiben-Vorlage,
// Export CSV/GeoJSON, Messwerkzeug. Alle Daten über /api/admin/geodaten/** (Rechte serverseitig).
// Tastatur: „/“ Suche, „m“ Messen, „Esc“ schließt Steckbrief/Messen.
// Ausbaustufe A1b: Deutschland (TopPlusOpen des BKG als Grundkarte, Autobahn/Schiene als Ebene, EEG-Kulisse im Steckbrief),
// Sprung zwischen den Demo-Regionen, Filter „Land“, Kampagne aus der aktuellen Liste bilden.

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check, ClipboardCopy, Crosshair, Download, FileText, Filter, Layers, List, Loader2, Maximize2, Megaphone, Minimize2, Ruler, Search, Target, X, Zap,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { distanzM } from "@/lib/plattform/geodaten/geo";
import { KNOTEN_ARTEN } from "@/lib/plattform/geodaten/scoring";
import { auswahlfeld, eingabe, FehlerBox, ErfolgBox } from "@/components/Portal/felder";

const FARBE = { gruen: "#669933", gelb: "#f5a70f", rot: "#dc2626" };
const KNOTEN_STIL = {
  uew: { r: 9, farbe: "#03285a" },
  uw110: { r: 7, farbe: "#003473" },
  ms: { r: 5, farbe: "#1f5aa1" },
  trafo: { r: 3, farbe: "#6b7486" },
};
const SCHUTZ_FARBE = { nationalpark: "#436621", natura2000: "#436621", naturschutz: "#558227", landschaftsschutz: "#8cba58", wasserschutz: "#1f5aa1", sonstig: "#97a0b0" };
const BASEMAP = "https://mapsneu.wien.gv.at/basemap";
const ATTRIBUTION =
  'Grundkarte: <a href="https://basemap.at" target="_blank" rel="noopener">basemap.at</a> · Netz/Schutzgebiete: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap-Mitwirkende</a> (ODbL) · Kataster: BEV · Schläge: AMA';
// Deutschland: TopPlusOpen (BKG, dl-de/by-2-0, Web Mercator) – basemap.at deckt nur Österreich ab
const TOPPLUS = "https://sgx.geodatenzentrum.de/wmts_topplus_open/tile/1.0.0/web_grau/default/WEBMERCATOR/{z}/{y}/{x}.png";
const ATTRIBUTION_DE =
  'Grundkarte: © <a href="https://gdz.bkg.bund.de" target="_blank" rel="noopener">BKG</a> (2026) <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener">dl-de/by-2-0</a> (TopPlusOpen) · Netz/Verkehr/Schutzgebiete: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap-Mitwirkende</a> (ODbL) · Flurstücke: DEMO';
const AMPEL_TEXT = { gruen: "gut geeignet", gelb: "prüfen", rot: "kritisch" };
const WIDMUNG_TEXT = { zone: "in Zone / Priorität 1", angrenzend: "angrenzend / Priorität 2", ausserhalb: "außerhalb", unklar: "Einzelfall" };
const WIDMUNG_TEXT_DE = { zone: "privilegiert (§ 35 BauGB)", angrenzend: "teilweise privilegiert", ausserhalb: "außerhalb", unklar: "Bebauungsplan nötig" };
const pct = (x) => `${fmt((Number(x) || 0) * 100)} %`;

const km = (m) => fmt((m || 0) / 1000, 1);
const knotenName = (k) => k?.name || `${KNOTEN_ARTEN[k?.art]?.kurz || "Netzknoten"} (ohne Namen)`;

function bboxVonKarte(karte, puffer = 0.15) {
  const b = karte.getBounds().pad(puffer);
  const r = (x) => Math.round(x * 1e4) / 1e4;
  let [w, s, o, n] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  const cx = (w + o) / 2;
  const cy = (s + n) / 2;
  if (o - w > 5.8) [w, o] = [cx - 2.9, cx + 2.9];
  if (n - s > 5.8) [s, n] = [cy - 2.9, cy + 2.9];
  return [r(Math.max(4.1, w)), r(Math.max(44.1, s)), r(Math.min(17.9, o)), r(Math.min(55.9, n))].join(",");
}

async function holen(url, signal) {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store", signal });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw Object.assign(new Error(j.error || `Fehler ${res.status}`), { status: res.status });
  return j;
}

function Ampel({ ampel, score, gross = false }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-bold text-ink-900", gross ? "text-[20px]" : "text-[13.5px]")}>
      <span className={cn("shrink-0 rounded-full", gross ? "h-3.5 w-3.5" : "h-2.5 w-2.5")} style={{ background: FARBE[ampel] }} aria-hidden="true" />
      <span className="ov-num">{score}</span>
      <span className="sr-only">Punkte, {AMPEL_TEXT[ampel]}</span>
    </span>
  );
}

function Schalter({ an, onChange, children, farbe }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13.5px] text-ink-800 hover:bg-ink-50">
      <input type="checkbox" checked={an} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#558227]" />
      {farbe && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: farbe }} aria-hidden="true" />}
      {children}
    </label>
  );
}

// ------------------------------------------------------------------------------------------------ Steckbrief

function Zeile({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink-100 py-2 text-[13.5px] last:border-0">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-semibold text-ink-900">{children}</dd>
    </div>
  );
}

function Steckbrief({ k, darfSchreiben, onSchliessen, onUmkreis, onAnschreiben, uebernommen, onUebernommen }) {
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState(null);
  useEffect(() => {
    setFehler("");
    setErfolg(null);
  }, [k?.id]);
  if (!k) return null;
  const n = k.netz;
  const kz = k.kennzahlen || {};
  const uebernehmen = async () => {
    setLaeuft(true);
    setFehler("");
    try {
      const r = await senden("/api/admin/geodaten/ziele", { body: { kandidatId: k.id } });
      setErfolg(r);
      onUebernommen?.(r);
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  };
  const ziel = erfolg?.ziel || uebernommen;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-ink-100 p-4">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">
            Kandidatenfläche {k.demo && <span className="ml-1 rounded-full bg-sun-300/50 px-2 py-0.5 text-[11px] text-navy-900">DEMO</span>}
          </p>
          <h2 className="font-display text-[19px] font-bold leading-tight text-ink-900">{k.gemeinde || "–"}</h2>
          <p className="text-[13px] text-ink-500">{[k.bezirk, k.bundesland].filter(Boolean).join(" · ")} · {k.id}</p>
        </div>
        <button type="button" onClick={onSchliessen} className="rounded-full p-2 text-ink-500 hover:bg-ink-100" aria-label="Steckbrief schließen">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-sand-50 p-3 ring-1 ring-ink-100">
            <Ampel ampel={k.ampel} score={k.score} gross />
            <p className="mt-0.5 text-[11.5px] text-ink-500">Score · Prio {k.prioritaet}</p>
          </div>
          <div className="rounded-2xl bg-sand-50 p-3 ring-1 ring-ink-100">
            <p className="ov-num text-[20px] font-bold text-ink-900">{fmt(k.ha, 1)}</p>
            <p className="text-[11.5px] text-ink-500">Hektar</p>
          </div>
          <div className="rounded-2xl bg-sand-50 p-3 ring-1 ring-ink-100">
            <p className="ov-num text-[20px] font-bold text-ink-900">{fmt(k.mwp, 1)}</p>
            <p className="text-[11.5px] text-ink-500">MWp möglich</p>
          </div>
        </div>

        {k.ko?.length > 0 && (
          <div className="rounded-2xl bg-red-50 p-3 text-[13px] text-red-800 ring-1 ring-red-200">
            {k.ko.map((x) => <p key={x.id}>{x.text}</p>)}
          </div>
        )}

        <section aria-labelledby="sb-score">
          <h3 id="sb-score" className="mb-1.5 text-[13.5px] font-bold text-ink-900">Score-Begründung</h3>
          <ul className="space-y-1">
            {k.kriterien.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-[13px]">
                <span className={cn("ov-num w-[3.75rem] shrink-0 whitespace-nowrap text-right font-bold", c.art === "plus" ? "text-ov-700" : c.art === "neutral" ? "text-ink-700" : "text-red-700")}>
                  {c.punkte > 0 && c.max === 0 ? "+" : ""}{fmt(c.punkte, c.punkte % 1 ? 1 : 0)}{c.max ? `/${c.max}` : ""}
                </span>
                <span className="min-w-0 text-ink-700"><span className="font-semibold text-ink-900">{c.label}:</span> {c.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sb-netz">
          <h3 id="sb-netz" className="mb-1 text-[13.5px] font-bold text-ink-900">Netzanschluss</h3>
          {n ? (
            <dl>
              <Zeile label="Anschlusspunkt">{knotenName(n.knoten)} · {KNOTEN_ARTEN[n.knoten.art]?.kurz}</Zeile>
              <Zeile label="Luftlinie / Trasse">{km(n.luftlinieM)} / ≈ {km(n.trasseM)} km</Zeile>
              <Zeile label="Kosten (Spanne)">{fmtEur(n.kosten.min)} – {fmtEur(n.kosten.max)}</Zeile>
              <Zeile label="je kWp / Anteil">{fmt(n.kosten.proKwp)} € · {fmt(n.kosten.anteil * 100)} %</Zeile>
              <Zeile label="Kapazität">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: FARBE[n.kapazitaetAmpel] }} aria-hidden="true" />{n.knoten.kapazitaet}</span>
              </Zeile>
              <Zeile label="Zeitrahmen">{n.kosten.monate?.join("–")} Monate</Zeile>
              {k.umspannwerk && k.umspannwerk.id !== n.knoten.id && <Zeile label="Nächstes UW ≥ 110 kV">{knotenName(k.umspannwerk)} · {km(k.umspannwerk.luftlinieM)} km</Zeile>}
            </dl>
          ) : (
            <p className="text-[13px] text-ink-600">Kein geeigneter Netzknoten im Suchradius.</p>
          )}
          <p className="mt-1 text-[11.5px] text-ink-500">Trasse = Luftlinie × 1,25 + Zuschlag je Querung; Kosten nach Netzanschluss-Rechner. Maßgeblich ist die Auskunft des Netzbetreibers.</p>
        </section>

        <section aria-labelledby="sb-flaeche">
          <h3 id="sb-flaeche" className="mb-1 text-[13.5px] font-bold text-ink-900">Fläche & Lage</h3>
          <dl>
            <Zeile label="Nutzung">{k.merkmale?.hauptnutzung === "acker" ? "Acker" : "Grünland"} ({fmt(k.merkmale?.nutzung?.acker, 1)} / {fmt(k.merkmale?.nutzung?.gruenland, 1)} ha)</Zeile>
            <Zeile label="Neigung / Exposition">{fmt(k.merkmale?.neigungGrad, 1)}° · {k.merkmale?.exposition}</Zeile>
            <Zeile label="Kompaktheit">{fmt((k.merkmale?.kompaktheit || 0) * 100)} %</Zeile>
            <Zeile label="Siedlung">{k.merkmale?.siedlung ? `${fmt(k.merkmale.siedlung.abstandM)} m (${k.merkmale.siedlung.name})` : "–"}</Zeile>
            <Zeile label="Schutzgebiete">{k.merkmale?.schutz?.length ? k.merkmale.schutz.map((s) => `${s.name} (${s.anteil > 0 ? `${fmt(s.anteil * 100)} %` : `${fmt(s.abstandM)} m`})`).join(", ") : "keine im Umkreis von 300 m"}</Zeile>
            <Zeile label={k.land === "DE" ? "Planungsrecht" : "Widmung"}>{(k.land === "DE" ? WIDMUNG_TEXT_DE : WIDMUNG_TEXT)[k.widmung?.status] || "–"}</Zeile>
          </dl>
          {k.land === "DE" && k.merkmale?.kulisse && (
            <dl className="mt-2 rounded-2xl bg-ov-50/60 px-3 py-1 ring-1 ring-ov-100">
              <Zeile label="EEG-Randstreifen 500 m">{pct(k.merkmale.kulisse.randstreifenAnteil)}</Zeile>
              <Zeile label="Privilegiert 200 m (BauGB)">{pct(k.merkmale.kulisse.privilegiertAnteil)}</Zeile>
              <Zeile label="Benachteiligtes Gebiet">{pct(k.merkmale.kulisse.benachteiligtAnteil)}{k.merkmale.kulisse.demo ? " (Demo)" : ""}</Zeile>
              <Zeile label="Moorboden">{pct(k.merkmale.kulisse.moorAnteil)}</Zeile>
              <Zeile label="Abstand Autobahn / Schiene">{k.merkmale.kulisse.abstandAutobahnM != null ? `${fmt(k.merkmale.kulisse.abstandAutobahnM)} m` : "> 600 m"} / {k.merkmale.kulisse.abstandSchieneM != null ? `${fmt(k.merkmale.kulisse.abstandSchieneM)} m` : "> 600 m"}</Zeile>
            </dl>
          )}
          {k.widmung?.text && <p className="mt-1 text-[11.5px] text-ink-500">{k.widmung.text}</p>}
        </section>

        <section aria-labelledby="sb-wirtschaft">
          <h3 id="sb-wirtschaft" className="mb-1 text-[13.5px] font-bold text-ink-900">Wirtschaftlichkeit (Schätzung)</h3>
          <dl>
            <Zeile label="Ertrag">≈ {fmt(kz.ertragMwh)} MWh/Jahr</Zeile>
            <Zeile label="Pacht Freifläche">{fmtEur(kz.pachtJahr?.min)} – {fmtEur(kz.pachtJahr?.max)} / Jahr</Zeile>
            {k.kennzahlenAgri && <Zeile label="Pacht Agri-PV">{fmtEur(k.kennzahlenAgri.pachtJahr?.min)} – {fmtEur(k.kennzahlenAgri.pachtJahr?.max)} / Jahr</Zeile>}
            <Zeile label="Errichtung (ohne Netz)">{fmtEur(kz.capex?.min)} – {fmtEur(kz.capex?.max)}</Zeile>
          </dl>
        </section>

        {k.parzellen?.length > 0 && (
          <details className="rounded-2xl bg-sand-50 p-3 ring-1 ring-ink-100">
            <summary className="cursor-pointer text-[13.5px] font-bold text-ink-900">{k.parzellen.length} Grundstück{k.parzellen.length > 1 ? "e" : ""}</summary>
            <ul className="mt-2 space-y-1 text-[12.5px] text-ink-700">
              {k.parzellen.map((p) => (
                <li key={p.id} className="flex justify-between gap-2"><span>{p.kg} ({p.kgNr}) · Gst. {p.gstNr}</span><span className="ov-num shrink-0">{fmt(p.ha, 2)} ha · {p.nutzung}</span></li>
              ))}
            </ul>
            <p className="mt-2 text-[11.5px] text-ink-500">Eigentümer sind nicht hinterlegt – Ermittlung nur per Grundbuchabfrage (Aufgabe nach Übernahme).</p>
          </details>
        )}
      </div>
      <div className="space-y-2 border-t border-ink-100 p-4">
        {fehler && <FehlerBox>{fehler}</FehlerBox>}
        {ziel ? (
          <ErfolgBox>
            Als Akquise-Ziel übernommen.{" "}
            {(erfolg?.flaecheId || ziel.flaecheId) && <Link href={`/portal/flaechen/${erfolg?.flaecheId || ziel.flaecheId}`} className="font-semibold underline">Fläche öffnen</Link>}
            {" · "}<Link href="/portal/admin/aufgaben?ansicht=meine" className="font-semibold underline">Aufgabe „Eigentümer ermitteln“</Link>
          </ErfolgBox>
        ) : (
          darfSchreiben && (
            <button type="button" onClick={uebernehmen} disabled={laeuft} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white hover:bg-ov-700 disabled:opacity-60">
              {laeuft ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Target className="h-4 w-4" aria-hidden="true" />} Als Akquise-Ziel übernehmen
            </button>
          )
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onAnschreiben(k)} className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-[13.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
            <FileText className="h-4 w-4" aria-hidden="true" /> Anschreiben
          </button>
          <button type="button" disabled={!n} onClick={() => n && onUmkreis(n.knoten)} className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-[13.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 disabled:opacity-50">
            <Zap className="h-4 w-4" aria-hidden="true" /> Umkreis UW
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Knoten-Panel

function KnotenPanel({ knoten, darfSchreiben, umkreisKm, setUmkreisKm, onUmkreis, onSchliessen, onKapazitaet }) {
  const [form, setForm] = useState({ kapazitaet: knoten.kapazitaet || "unbekannt", freiMw: knoten.freiMw ?? "", quelle: knoten.kapazitaetQuelle || "", stand: knoten.kapazitaetStand || "" });
  const [status, setStatus] = useState({ laeuft: false, fehler: "", ok: false });
  const speichern = async (e) => {
    e.preventDefault();
    setStatus({ laeuft: true, fehler: "", ok: false });
    try {
      await senden("/api/admin/geodaten/kapazitaet", { body: { knotenId: knoten.id, ...form } });
      setStatus({ laeuft: false, fehler: "", ok: true });
      onKapazitaet?.();
    } catch (err) {
      setStatus({ laeuft: false, fehler: err.message, ok: false });
    }
  };
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">{KNOTEN_ARTEN[knoten.art]?.label}</p>
          <h2 className="font-display text-[18px] font-bold text-ink-900">{knotenName(knoten)}</h2>
          <p className="text-[13px] text-ink-500">{[knoten.spannungKv?.length ? `${knoten.spannungKv.join("/")} kV` : "", knoten.betreiber].filter(Boolean).join(" · ") || "Spannung unbekannt"} · Quelle OSM</p>
        </div>
        <button type="button" onClick={onSchliessen} className="rounded-full p-2 text-ink-500 hover:bg-ink-100" aria-label="Netzknoten schließen"><X className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-[12.5px] font-semibold text-ink-700">Umkreis (km)</span>
          <input type="number" min="0.5" max="30" step="0.5" value={umkreisKm} onChange={(e) => setUmkreisKm(e.target.value)} className={cn(eingabe, "h-10")} />
        </label>
        <button type="button" onClick={() => onUmkreis(knoten)} className="h-10 rounded-full bg-navy-700 px-4 text-[13.5px] font-semibold text-white hover:bg-navy-800">Beste Flächen</button>
      </div>
      <form onSubmit={speichern} className="space-y-2 rounded-2xl bg-sand-50 p-3 ring-1 ring-ink-100">
        <p className="text-[13px] font-bold text-ink-900">Netzkapazität {darfSchreiben ? "pflegen" : ""}</p>
        <p className="text-[11.5px] text-ink-500">Nur aus Veröffentlichung oder Auskunft des Netzbetreibers – immer mit Quelle und Stand.</p>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.kapazitaet} disabled={!darfSchreiben} onChange={(e) => setForm({ ...form, kapazitaet: e.target.value })} className={cn(auswahlfeld, "h-10")} aria-label="Kapazität">
            <option value="unbekannt">unbekannt</option>
            <option value="frei">frei</option>
            <option value="knapp">knapp</option>
          </select>
          <input value={form.freiMw} disabled={!darfSchreiben} onChange={(e) => setForm({ ...form, freiMw: e.target.value })} placeholder="frei MW" inputMode="decimal" className={cn(eingabe, "h-10")} aria-label="Freie Kapazität in MW" />
        </div>
        <input value={form.quelle} disabled={!darfSchreiben} onChange={(e) => setForm({ ...form, quelle: e.target.value })} placeholder="Quelle, z. B. Netz OÖ Auskunft" className={cn(eingabe, "h-10")} aria-label="Quelle" />
        <input type="date" value={form.stand} disabled={!darfSchreiben} onChange={(e) => setForm({ ...form, stand: e.target.value })} className={cn(eingabe, "h-10")} aria-label="Stand" />
        {status.fehler && <FehlerBox>{status.fehler}</FehlerBox>}
        {status.ok && <ErfolgBox>Gespeichert – Bewertungen werden neu berechnet.</ErfolgBox>}
        {darfSchreiben && <button type="submit" disabled={status.laeuft} className="h-10 w-full rounded-full bg-ov-600 text-[13.5px] font-semibold text-white hover:bg-ov-700 disabled:opacity-60">Speichern</button>}
      </form>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Anschreiben

function AnschreibenDialog({ kandidat, onSchliessen }) {
  const [vorlage, setVorlage] = useState(null);
  const [fehler, setFehler] = useState("");
  const [kopiert, setKopiert] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.showModal?.();
    holen(`/api/admin/geodaten/anschreiben?kandidat=${encodeURIComponent(kandidat.id)}`).then((r) => setVorlage(r.vorlage)).catch((e) => setFehler(e.message));
  }, [kandidat.id]);
  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(vorlage.text);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch {
      setFehler("Kopieren nicht möglich – bitte Text markieren.");
    }
  };
  return (
    <dialog ref={ref} onClose={onSchliessen} className="m-auto w-[min(760px,calc(100vw-24px))] rounded-3xl p-0 shadow-2xl backdrop:bg-navy-950/40" aria-labelledby="anschreiben-titel">
      <div className="flex items-center justify-between border-b border-ink-100 p-4">
        <h2 id="anschreiben-titel" className="font-display text-[18px] font-bold text-ink-900">Anschreiben-Vorlage (Serienbrief)</h2>
        <button type="button" onClick={() => ref.current?.close()} className="rounded-full p-2 text-ink-500 hover:bg-ink-100" aria-label="Schließen"><X className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
        {fehler && <FehlerBox>{fehler}</FehlerBox>}
        {vorlage ? (
          <>
            <div className="rounded-2xl bg-sun-300/20 p-3 text-[13px] text-navy-900 ring-1 ring-sun-300"><strong>Datenschutz & Direktwerbung:</strong> {vorlage.hinweis}</div>
            <textarea readOnly value={vorlage.text} className="h-[46vh] w-full rounded-xl bg-sand-50 p-3 font-mono text-[12.5px] leading-relaxed text-ink-800 ring-1 ring-ink-200" aria-label="Brieftext" />
          </>
        ) : !fehler && <p className="flex items-center gap-2 text-[14px] text-ink-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Vorlage wird erstellt …</p>}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 p-4">
        <button type="button" onClick={kopieren} disabled={!vorlage} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-navy-700 px-4 text-[13.5px] font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
          {kopiert ? <Check className="h-4 w-4" aria-hidden="true" /> : <ClipboardCopy className="h-4 w-4" aria-hidden="true" />} {kopiert ? "Kopiert" : "Text kopieren"}
        </button>
      </div>
    </dialog>
  );
}

// ------------------------------------------------------------------------------------------------ Hauptkomponente

const FILTER_START = { minHa: "2", maxTrasseKm: "", minScore: "", ampel: "", land: "", bundesland: "", bezirk: "", gemeinde: "" };

export default function AkquiseKarte({ darfSchreiben = false }) {
  const kartenRef = useRef(null);
  const rahmenRef = useRef(null);
  const suchRef = useRef(null);
  const L = useRef(null);
  const karte = useRef(null);
  const ebenenRef = useRef({});
  const [bereit, setBereit] = useState(false);
  const [info, setInfo] = useState(null);
  const [fehler, setFehler] = useState("");
  const [grund, setGrund] = useState("grau");
  const [sicht, setSicht] = useState({ kandidaten: true, heat: true, uw: true, trafo: true, schutz: true, zonen: false, radius: true, verkehr: true });
  const router = useRouter();
  const [kampagne, setKampagne] = useState({ offen: false, name: "", laeuft: false, fehler: "" });
  const [filter, setFilter] = useState(FILTER_START);
  const [liste, setListe] = useState([]);
  const [anzahl, setAnzahl] = useState(0);
  const [laedt, setLaedt] = useState(false);
  const [auswahl, setAuswahl] = useState(null);
  const [knoten, setKnoten] = useState(null);
  const [umkreis, setUmkreis] = useState(null);
  const [umkreisKm, setUmkreisKm] = useState("5");
  const [tab, setTab] = useState("filter");
  const [panelOffen, setPanelOffen] = useState(false);
  const [q, setQ] = useState("");
  const [treffer, setTreffer] = useState([]);
  const [messen, setMessen] = useState(false);
  const [messpunkte, setMesspunkte] = useState([]);
  const [anschreiben, setAnschreiben] = useState(null);
  const [vollbild, setVollbild] = useState(false);
  const [ziele, setZiele] = useState([]);
  const [zoom, setZoom] = useState(10);
  const [version, setVersion] = useState(0); // erhöht nach Kapazitätspflege → neu laden

  const filterQs = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filter)) if (v !== "" && v != null) p.set(k, String(v));
    return p.toString();
  }, [filter]);

  // ---------------------------------------------------------------- Karte initialisieren (nur Client)
  useEffect(() => {
    let aus = false;
    (async () => {
      const mod = await import("leaflet");
      if (aus || !kartenRef.current) return;
      const Lf = mod.default || mod;
      L.current = Lf;
      const m = Lf.map(kartenRef.current, { center: [48.17, 13.19], zoom: 10, minZoom: 6, maxZoom: 19, zoomControl: true, attributionControl: true, preferCanvas: true });
      m.attributionControl.setPrefix(false);
      const opt = { maxZoom: 19, attribution: ATTRIBUTION };
      ebenenRef.current.grau = Lf.tileLayer(`${BASEMAP}/bmapgrau/normal/google3857/{z}/{y}/{x}.png`, opt);
      ebenenRef.current.ortho = Lf.tileLayer(`${BASEMAP}/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg`, opt);
      ebenenRef.current.overlay = Lf.tileLayer(`${BASEMAP}/bmapoverlay/normal/google3857/{z}/{y}/{x}.png`, { maxZoom: 19 });
      ebenenRef.current.topplus = Lf.tileLayer(TOPPLUS, { maxZoom: 18, attribution: ATTRIBUTION_DE }); // Deutschland (A1b)
      ebenenRef.current.grau.addTo(m);
      for (const name of ["schutz", "zonen", "verkehr", "heat", "kandidaten", "netz", "radius", "mess"]) ebenenRef.current[name] = Lf.layerGroup().addTo(m);
      Lf.control.scale({ imperial: false }).addTo(m);
      m.on("zoomend", () => setZoom(m.getZoom()));
      karte.current = m;
      setBereit(true);
    })().catch((e) => setFehler(`Karte konnte nicht geladen werden: ${e.message}`));
    return () => {
      aus = true;
      karte.current?.remove();
      karte.current = null;
    };
  }, []);

  // Grundkarte umschalten
  useEffect(() => {
    const m = karte.current;
    const e = ebenenRef.current;
    if (!bereit || !m) return;
    for (const t of ["grau", "ortho", "overlay", "topplus"]) if (m.hasLayer(e[t])) m.removeLayer(e[t]);
    if (grund === "ortho") {
      e.ortho.addTo(m).bringToBack();
      e.overlay.addTo(m);
    } else if (grund === "topplus") e.topplus.addTo(m).bringToBack();
    else e.grau.addTo(m).bringToBack();
  }, [grund, bereit]);

  // Übersicht (Quellen, Kennzahlen, Gebiete, Ziele)
  const uebersichtLaden = useCallback(() => {
    holen("/api/admin/geodaten").then((r) => {
      setInfo(r);
      setZiele(r.ziele || []);
    }).catch((e) => setFehler(e.message));
  }, []);
  useEffect(uebersichtLaden, [uebersichtLaden]);

  // ---------------------------------------------------------------- Kandidaten laden (Filter)
  useEffect(() => {
    if (!bereit) return;
    const ac = new AbortController();
    const t = setTimeout(async () => {
      setLaedt(true);
      try {
        const r = await holen(`/api/admin/geodaten/kandidaten?${filterQs}&limit=1000`, ac.signal);
        setListe(r.kandidaten);
        setAnzahl(r.anzahl);
      } catch (e) {
        if (e.name !== "AbortError") setFehler(e.message);
      } finally {
        setLaedt(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [filterQs, bereit, version]);

  // Kandidaten zeichnen (Polygone mit Score-Farbe + Heatmap-Punkte bei kleinem Maßstab)
  const anzeige = umkreis ? umkreis.kandidaten : liste;
  useEffect(() => {
    const Lf = L.current;
    const e = ebenenRef.current;
    if (!bereit || !Lf) return;
    e.kandidaten.clearLayers();
    e.heat.clearLayers();
    for (const k of anzeige) {
      const gewaehlt = auswahl?.id === k.id;
      if (sicht.kandidaten) {
        const poly = Lf.geoJSON(k.geometrie, { style: { color: gewaehlt ? "#03285a" : FARBE[k.ampel], weight: gewaehlt ? 3 : 1.5, fillColor: FARBE[k.ampel], fillOpacity: gewaehlt ? 0.55 : 0.35 } });
        poly.on("click", () => kandidatWaehlen(k.id));
        poly.bindTooltip(`${k.gemeinde} · ${fmt(k.ha, 1)} ha · Score ${k.score}`, { sticky: true });
        poly.addTo(e.kandidaten);
      }
      if (sicht.heat && zoom < 13) {
        const c = Lf.circle([k.schwerpunkt[1], k.schwerpunkt[0]], { radius: 400 + Math.sqrt(k.ha) * 160, stroke: false, fillColor: FARBE[k.ampel], fillOpacity: 0.28, interactive: zoom < 12 });
        c.on("click", () => kandidatWaehlen(k.id));
        c.addTo(e.heat);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anzeige, sicht.kandidaten, sicht.heat, auswahl?.id, bereit, zoom]);

  // ---------------------------------------------------------------- Netzknoten + Ebenen je Kartenausschnitt
  const ausschnittLaden = useCallback(async () => {
    const m = karte.current;
    const Lf = L.current;
    const e = ebenenRef.current;
    if (!m || !Lf) return;
    const z = m.getZoom();
    const bbox = bboxVonKarte(m);
    const arten = ["uew", "uw110", "ms", ...(z >= 12 && sicht.trafo ? ["trafo"] : [])].filter((a) => a === "trafo" || sicht.uw);
    try {
      const [netz, schutz, zonen, verkehr] = await Promise.all([
        arten.length && z >= 7 ? holen(`/api/admin/geodaten/netz?bbox=${bbox}&arten=${arten.join(",")}`) : { features: [] },
        sicht.schutz && z >= 9 ? holen(`/api/admin/geodaten/ebenen/schutzgebiete?bbox=${bbox}`) : { features: [] },
        sicht.zonen && z >= 8 ? holen(`/api/admin/geodaten/ebenen/zonen?bbox=${bbox}`) : { features: [] },
        sicht.verkehr && z >= 10 ? holen(`/api/admin/geodaten/ebenen/verkehr?bbox=${bbox}`) : { features: [] },
      ]);
      e.verkehr.clearLayers();
      for (const f of verkehr.features || []) {
        const ab = f.properties.art === "autobahn";
        Lf.geoJSON(f, { style: { color: ab ? "#b45309" : "#394050", weight: ab ? 3 : Number(f.properties.gleise) >= 2 ? 2.5 : 1.5, dashArray: ab ? null : "5 4", opacity: 0.85 } })
          .bindTooltip(`${f.properties.name || (ab ? "Autobahn" : "Schiene")}${ab ? "" : ` · ${Number(f.properties.gleise) >= 2 ? "zweigleisig" : "eingleisig"} (geschätzt)`}`)
          .addTo(e.verkehr);
      }
      e.netz.clearLayers();
      for (const f of netz.features || []) {
        const p = f.properties;
        const s = KNOTEN_STIL[p.art];
        const ring = p.kapazitaet === "frei" ? FARBE.gruen : p.kapazitaet === "knapp" ? FARBE.rot : "#ffffff";
        const mk = Lf.circleMarker([f.geometry.coordinates[1], f.geometry.coordinates[0]], { radius: s.r, color: ring, weight: p.kapazitaet === "unbekannt" ? 1.5 : 3, fillColor: s.farbe, fillOpacity: 0.95 });
        mk.bindTooltip(`${knotenName(p)} · ${KNOTEN_ARTEN[p.art].kurz}${p.spannungKv?.length ? ` · ${p.spannungKv.join("/")} kV` : ""}`);
        mk.on("click", () => {
          setKnoten({ ...p, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] });
          setAuswahl(null);
          setPanelOffen(true);
        });
        mk.addTo(e.netz);
      }
      e.schutz.clearLayers();
      for (const f of schutz.features || []) {
        Lf.geoJSON(f, { style: { color: SCHUTZ_FARBE[f.properties.art] || "#436621", weight: 1, dashArray: "4 3", fillOpacity: 0.12 }, interactive: false }).addTo(e.schutz);
      }
      e.zonen.clearLayers();
      for (const f of zonen.features || []) {
        const p1 = /_1$/.test(f.properties.art);
        Lf.geoJSON(f, { style: { color: "#0b4488", weight: 1, dashArray: p1 ? null : "6 4", fillOpacity: p1 ? 0.05 : 0.02 }, interactive: false }).addTo(e.zonen);
      }
    } catch (err) {
      setFehler(err.message);
    }
  }, [sicht.uw, sicht.trafo, sicht.schutz, sicht.zonen, sicht.verkehr]);

  useEffect(() => {
    const m = karte.current;
    if (!bereit || !m) return;
    let t;
    const laden = () => {
      clearTimeout(t);
      t = setTimeout(ausschnittLaden, 300);
    };
    laden();
    m.on("moveend", laden);
    return () => {
      clearTimeout(t);
      m.off("moveend", laden);
    };
  }, [bereit, ausschnittLaden, version]);

  // Umkreis-Radius zeichnen
  useEffect(() => {
    const Lf = L.current;
    const e = ebenenRef.current;
    if (!bereit || !Lf) return;
    e.radius.clearLayers();
    if (umkreis && sicht.radius) {
      Lf.circle([umkreis.knoten.lat, umkreis.knoten.lon], { radius: umkreis.km * 1000, color: "#003473", weight: 2, dashArray: "6 6", fill: false, interactive: false }).addTo(e.radius);
    }
    if (auswahl?.netz && sicht.radius) {
      const kn = auswahl.netz.knoten;
      Lf.polyline([[auswahl.schwerpunkt[1], auswahl.schwerpunkt[0]], [kn.lat, kn.lon]], { color: "#003473", weight: 2, dashArray: "2 6", interactive: false }).addTo(e.radius);
    }
  }, [umkreis, auswahl, sicht.radius, bereit]);

  // ---------------------------------------------------------------- Auswahl / Steckbrief
  const kandidatWaehlen = useCallback(async (id, { zoomen = false } = {}) => {
    try {
      const r = await holen(`/api/admin/geodaten/kandidaten/${encodeURIComponent(id)}`);
      setAuswahl(r.kandidat);
      setKnoten(null);
      setPanelOffen(true);
      if (zoomen && karte.current) {
        const b = r.kandidat.bbox;
        karte.current.fitBounds([[b[1], b[0]], [b[3], b[2]]], { maxZoom: 15, padding: [40, 40] });
      }
    } catch (e) {
      setFehler(e.message);
    }
  }, []);

  const umkreisSuchen = useCallback(async (kn) => {
    try {
      const r = await holen(`/api/admin/geodaten/umkreis?knoten=${encodeURIComponent(kn.id)}&km=${encodeURIComponent(umkreisKm || "5")}`);
      setUmkreis({ ...r, knoten: { ...kn, ...r.knoten, lon: r.knoten?.lon ?? kn.lon, lat: r.knoten?.lat ?? kn.lat } });
      setTab("liste");
      setPanelOffen(true);
      karte.current?.fitBounds(L.current.latLng(kn.lat, kn.lon).toBounds(r.km * 2200), { maxZoom: 14 });
    } catch (e) {
      setFehler(e.message);
    }
  }, [umkreisKm]);

  // ---------------------------------------------------------------- Messwerkzeug
  useEffect(() => {
    const m = karte.current;
    if (!bereit || !m) return;
    const klick = (ev) => setMesspunkte((p) => [...p, [ev.latlng.lng, ev.latlng.lat]]);
    if (messen) {
      m.on("click", klick);
      m.getContainer().style.cursor = "crosshair";
    }
    return () => {
      m.off("click", klick);
      m.getContainer().style.cursor = "";
    };
  }, [messen, bereit]);
  const messStrecke = useMemo(() => messpunkte.slice(1).reduce((s, p, i) => s + distanzM(messpunkte[i], p), 0), [messpunkte]);
  useEffect(() => {
    const Lf = L.current;
    const e = ebenenRef.current;
    if (!bereit || !Lf) return;
    e.mess.clearLayers();
    if (!messpunkte.length) return;
    Lf.polyline(messpunkte.map((p) => [p[1], p[0]]), { color: "#f5a70f", weight: 3, interactive: false }).addTo(e.mess);
    for (const p of messpunkte) Lf.circleMarker([p[1], p[0]], { radius: 4, color: "#03285a", fillColor: "#ffc53d", fillOpacity: 1, weight: 2, interactive: false }).addTo(e.mess);
  }, [messpunkte, bereit]);

  // ---------------------------------------------------------------- Suche
  useEffect(() => {
    if (q.trim().length < 2) {
      setTreffer([]);
      return;
    }
    const ac = new AbortController();
    const t = setTimeout(() => holen(`/api/admin/geodaten/suche?q=${encodeURIComponent(q.trim())}`, ac.signal).then((r) => setTreffer(r.treffer || [])).catch(() => {}), 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q]);
  const trefferWaehlen = (t) => {
    setTreffer([]);
    setQ(t.label);
    if (t.bbox) karte.current?.fitBounds([[t.bbox[1], t.bbox[0]], [t.bbox[3], t.bbox[2]]]);
    else karte.current?.setView([t.lat, t.lon], t.typ === "grundstueck" ? 16 : t.typ === "ort" ? 13 : 14);
    if (t.kandidatId) kandidatWaehlen(t.kandidatId);
    if (t.knotenId) {
      setKnoten({ id: t.knotenId, name: t.label.replace(/ \(.*\)$/, ""), art: t.art || "uw110", lon: t.lon, lat: t.lat, kapazitaet: "unbekannt" });
      setAuswahl(null);
      setPanelOffen(true);
    }
  };

  // ---------------------------------------------------------------- Tastatur & Vollbild
  useEffect(() => {
    const taste = (e) => {
      const ziel = e.target;
      const eingabeAktiv = ziel && (ziel.tagName === "INPUT" || ziel.tagName === "TEXTAREA" || ziel.tagName === "SELECT" || ziel.isContentEditable);
      if (e.key === "Escape") {
        if (messen) setMessen(false);
        else if (auswahl || knoten) {
          setAuswahl(null);
          setKnoten(null);
        }
        return;
      }
      if (eingabeAktiv || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        suchRef.current?.focus();
      } else if (e.key === "m") {
        setMessen((x) => !x);
        setMesspunkte([]);
      }
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [messen, auswahl, knoten]);

  useEffect(() => {
    const aendern = () => {
      setVollbild(!!document.fullscreenElement);
      setTimeout(() => karte.current?.invalidateSize(), 150);
    };
    document.addEventListener("fullscreenchange", aendern);
    return () => document.removeEventListener("fullscreenchange", aendern);
  }, []);
  useEffect(() => {
    setTimeout(() => karte.current?.invalidateSize(), 200);
  }, [panelOffen, auswahl, knoten]);
  const vollbildUmschalten = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else rahmenRef.current?.requestFullscreen?.().catch(() => setVollbild((x) => !x));
  };

  const setF = (k, v) => {
    setUmkreis(null);
    setFilter((f) => ({ ...f, [k]: v, ...(k === "bundesland" ? { bezirk: "", gemeinde: "" } : k === "bezirk" ? { gemeinde: "" } : {}) }));
  };
  const zielVon = (id) => ziele.find((z) => z.kandidatId === id);
  const g = info?.gebiete || { bundeslaender: [], bezirke: [], gemeinden: [] };

  const seitenPanel = (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-ink-100" role="tablist" aria-label="Bereiche">
        {[["filter", "Filter", Filter], ["liste", `Liste (${umkreis ? umkreis.anzahl : anzahl})`, List], ["ebenen", "Ebenen", Layers]].map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn("flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-2 py-3 text-[13px] font-semibold", tab === id ? "border-b-2 border-ov-600 text-ov-700" : "text-ink-500 hover:text-ink-800")}>
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "filter" && (
          <div className="space-y-4">
            {info?.regionen?.length > 1 && (
              <div>
                <p className="mb-1 text-[13px] font-semibold text-ink-700">Gebiet</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {info.regionen.map((r) => (
                    <button key={r.id} type="button" onClick={() => { karte.current?.setView([r.mitte[1], r.mitte[0]], r.zoom); setGrund(r.land === "AT" ? "grau" : "topplus"); setF("land", r.land); }} className={cn("h-9 rounded-full px-2 text-[12.5px] font-semibold ring-1 ring-inset", filter.land === r.land ? "bg-navy-700 text-white ring-navy-700" : "bg-white text-ink-700 ring-ink-200")}>{r.label.split(" (")[0]}</button>
                  ))}
                </div>
              </div>
            )}
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-ink-700">Land</span>
              <select value={filter.land} onChange={(e) => setF("land", e.target.value)} className={cn(auswahlfeld, "h-10")}>
                <option value="">alle</option>
                {(g.laender || []).map((w) => <option key={w.name} value={w.name}>{{ AT: "Österreich", DE: "Deutschland", CH: "Schweiz" }[w.name] || w.name} ({w.anzahl})</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 flex justify-between text-[13px] font-semibold text-ink-700"><span>Mindestgröße</span><span className="ov-num">{filter.minHa || 0} ha</span></span>
              <input type="range" min="0" max="50" step="1" value={filter.minHa || 0} onChange={(e) => setF("minHa", e.target.value)} className="ov-range w-full" />
            </label>
            <label className="block">
              <span className="mb-1 flex justify-between text-[13px] font-semibold text-ink-700"><span>Max. Trassenlänge</span><span className="ov-num">{filter.maxTrasseKm ? `${filter.maxTrasseKm} km` : "alle"}</span></span>
              <input type="range" min="0" max="20" step="0.5" value={filter.maxTrasseKm || 0} onChange={(e) => setF("maxTrasseKm", e.target.value === "0" ? "" : e.target.value)} className="ov-range w-full" />
            </label>
            <label className="block">
              <span className="mb-1 flex justify-between text-[13px] font-semibold text-ink-700"><span>Mindest-Score</span><span className="ov-num">{filter.minScore || 0}</span></span>
              <input type="range" min="0" max="95" step="5" value={filter.minScore || 0} onChange={(e) => setF("minScore", e.target.value === "0" ? "" : e.target.value)} className="ov-range w-full" />
            </label>
            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Ampel">
              {[["", "alle"], ["gruen", "grün"], ["gelb", "gelb"], ["rot", "rot"]].slice(0, 4).map(([v, l]) => (
                <button key={v || "alle"} type="button" onClick={() => setF("ampel", v)} aria-pressed={filter.ampel === v} className={cn("h-9 rounded-full text-[12.5px] font-semibold ring-1 ring-inset", filter.ampel === v ? "bg-navy-700 text-white ring-navy-700" : "bg-white text-ink-700 ring-ink-200", !v && "col-span-3")}>{l}</button>
              ))}
            </div>
            {[["bundesland", "Bundesland", g.bundeslaender], ["bezirk", "Bezirk", g.bezirke], ["gemeinde", "Gemeinde", g.gemeinden]].map(([feld, label, werte]) => (
              <label key={feld} className="block">
                <span className="mb-1 block text-[13px] font-semibold text-ink-700">{label}</span>
                <select value={filter[feld]} onChange={(e) => setF(feld, e.target.value)} className={cn(auswahlfeld, "h-10")}>
                  <option value="">alle</option>
                  {werte.map((w) => <option key={w.name} value={w.name}>{w.name} ({w.anzahl})</option>)}
                </select>
              </label>
            ))}
            <button type="button" onClick={() => { setFilter(FILTER_START); setUmkreis(null); }} className="text-[13px] font-semibold text-ov-700">Filter zurücksetzen</button>
            <div className="rounded-2xl bg-sand-50 p-3 text-[12.5px] text-ink-600 ring-1 ring-ink-100">
              <p className="font-semibold text-ink-800">Umkreis-Suche</p>
              <p>Umspannwerk auf der Karte anklicken (oder suchen) → „Beste Flächen“ im gewählten Radius.</p>
            </div>
          </div>
        )}
        {tab === "liste" && (
          <div>
            {umkreis && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl bg-navy-50 p-3 text-[13px] text-navy-900 ring-1 ring-navy-100">
                <span>Umkreis {fmt(umkreis.km, 1)} km um <strong>{knotenName(umkreis.knoten)}</strong></span>
                <button type="button" onClick={() => setUmkreis(null)} className="rounded-full p-1 hover:bg-white" aria-label="Umkreis-Suche beenden"><X className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            )}
            {darfSchreiben && anzeige.length > 0 && (
              <div className="mb-3 rounded-2xl bg-sand-50 p-3 ring-1 ring-ink-100">
                {kampagne.offen ? (
                  <form className="space-y-2" onSubmit={async (e) => {
                    e.preventDefault();
                    setKampagne((x) => ({ ...x, laeuft: true, fehler: "" }));
                    try {
                      const ids = anzeige.filter((k) => k.ampel !== "rot").slice(0, 300).map((k) => k.id);
                      const r = await senden("/api/admin/geodaten/kampagnen", { body: { name: kampagne.name, kandidatIds: ids } });
                      router.push(`/portal/admin/akquise/kampagnen/${r.kampagne.id}`);
                    } catch (err) {
                      setKampagne((x) => ({ ...x, laeuft: false, fehler: err.message }));
                    }
                  }}>
                    <p className="text-[12.5px] text-ink-600">{anzeige.filter((k) => k.ampel !== "rot").length} Flächen (ohne rote, max. 300) – ein Land je Kampagne.</p>
                    <input required minLength={3} value={kampagne.name} onChange={(e) => setKampagne({ ...kampagne, name: e.target.value })} placeholder="Name der Kampagne" aria-label="Name der Kampagne" className={cn(eingabe, "h-10")} />
                    <div className="flex gap-2">
                      <button type="submit" disabled={kampagne.laeuft} className="h-9 flex-1 rounded-full bg-ov-600 text-[13px] font-semibold text-white hover:bg-ov-700 disabled:opacity-60">Anlegen</button>
                      <button type="button" onClick={() => setKampagne({ offen: false, name: "", laeuft: false, fehler: "" })} className="h-9 rounded-full bg-white px-3 text-[13px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200">Abbrechen</button>
                    </div>
                    <FehlerBox>{kampagne.fehler}</FehlerBox>
                  </form>
                ) : (
                  <button type="button" onClick={() => setKampagne({ ...kampagne, offen: true })} className="flex w-full items-center justify-center gap-1.5 text-[13px] font-semibold text-ov-700">
                    <Megaphone className="h-4 w-4" aria-hidden="true" /> Kampagne aus dieser Liste bilden
                  </button>
                )}
              </div>
            )}
            {laedt && <p className="flex items-center gap-2 text-[13px] text-ink-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> lädt …</p>}
            <ul className="divide-y divide-ink-100">
              {anzeige.map((k) => (
                <li key={k.id}>
                  <button type="button" onClick={() => kandidatWaehlen(k.id, { zoomen: true })} className={cn("flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-sand-50", auswahl?.id === k.id && "bg-ov-50")}>
                    <Ampel ampel={k.ampel} score={k.score} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink-900">{k.gemeinde}{k.demo ? " · DEMO" : ""}</span>
                      <span className="block truncate text-[12px] text-ink-500">{fmt(k.ha, 1)} ha · {fmt(k.mwp, 1)} MWp · {k.netz ? `${km(k.netz.trasseM)} km Trasse` : "kein Netz"}{k.abstandZumKnotenM != null ? ` · ${km(k.abstandZumKnotenM)} km zum UW` : ""}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[11.5px] font-bold text-ink-700">{zielVon(k.id) ? "Ziel" : k.prioritaet}</span>
                  </button>
                </li>
              ))}
            </ul>
            {!laedt && anzeige.length === 0 && <p className="text-[13px] text-ink-500">Keine Flächen für diese Filter.</p>}
          </div>
        )}
        {tab === "ebenen" && (
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-500">Grundkarte</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[["grau", "Grau (AT)"], ["ortho", "Orthofoto (AT)"], ["topplus", "TopPlus (DE)"]].map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={grund === v} onClick={() => setGrund(v)} className={cn("h-9 rounded-full text-[13px] font-semibold ring-1 ring-inset", grund === v ? "bg-navy-700 text-white ring-navy-700" : "bg-white text-ink-700 ring-ink-200")}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-500">Ebenen</p>
              <Schalter an={sicht.kandidaten} onChange={(v) => setSicht({ ...sicht, kandidaten: v })} farbe={FARBE.gruen}>Kandidatenflächen (Score-Farbe)</Schalter>
              <Schalter an={sicht.heat} onChange={(v) => setSicht({ ...sicht, heat: v })} farbe={FARBE.gelb}>Score-Heatmap (kleiner Maßstab)</Schalter>
              <Schalter an={sicht.uw} onChange={(v) => setSicht({ ...sicht, uw: v })} farbe={KNOTEN_STIL.uw110.farbe}>Umspannwerke (380/220/110 kV, MS)</Schalter>
              <Schalter an={sicht.trafo} onChange={(v) => setSicht({ ...sicht, trafo: v })} farbe={KNOTEN_STIL.trafo.farbe}>Trafostationen (ab Zoom 12)</Schalter>
              <Schalter an={sicht.schutz} onChange={(v) => setSicht({ ...sicht, schutz: v })} farbe={SCHUTZ_FARBE.natura2000}>Schutzgebiete</Schalter>
              <Schalter an={sicht.zonen} onChange={(v) => setSicht({ ...sicht, zonen: v })} farbe="#0b4488">Zonen / OÖ-Prioritätsradien</Schalter>
              <Schalter an={sicht.verkehr} onChange={(v) => setSicht({ ...sicht, verkehr: v })} farbe="#b45309">Autobahn / Schiene (DE, EEG-Randstreifen)</Schalter>
              <Schalter an={sicht.radius} onChange={(v) => setSicht({ ...sicht, radius: v })} farbe="#003473">Radien & Trassenlinie</Schalter>
            </div>
            <div className="rounded-2xl bg-sand-50 p-3 text-[12px] text-ink-600 ring-1 ring-ink-100">
              <p className="mb-1 font-semibold text-ink-800">Legende</p>
              <p><span className="font-semibold" style={{ color: FARBE.gruen }}>●</span> Score ≥ 65 · <span className="font-semibold" style={{ color: FARBE.gelb }}>●</span> 45–64 · <span className="font-semibold" style={{ color: FARBE.rot }}>●</span> &lt; 45</p>
              <p>Netzknoten: Größe nach Spannungsebene, Ring grün = Kapazität frei, rot = knapp, weiß = unbekannt.</p>
            </div>
            {info?.quellen && (
              <div className="text-[11.5px] text-ink-500">
                <p className="mb-1 font-semibold text-ink-700">Quellen & Lizenzen</p>
                <ul className="space-y-0.5">{info.quellen.map((qq) => <li key={qq.id}>{qq.titel} – {qq.lizenz}{qq.stand ? `, Stand ${String(qq.stand).slice(0, 10)}` : ""}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-ink-100 p-3">
        <a href={`/api/admin/geodaten/export?format=csv&${filterQs}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Download className="h-4 w-4" aria-hidden="true" /> CSV</a>
        <a href={`/api/admin/geodaten/export?format=geojson&${filterQs}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Download className="h-4 w-4" aria-hidden="true" /> GeoJSON</a>
      </div>
    </div>
  );

  const detail = auswahl ? (
    <Steckbrief k={auswahl} darfSchreiben={darfSchreiben} uebernommen={zielVon(auswahl.id)} onSchliessen={() => setAuswahl(null)} onUmkreis={(kn) => { setKnoten(null); umkreisSuchen(kn); }} onAnschreiben={setAnschreiben} onUebernommen={uebersichtLaden} />
  ) : knoten ? (
    <KnotenPanel key={knoten.id} knoten={knoten} darfSchreiben={darfSchreiben} umkreisKm={umkreisKm} setUmkreisKm={setUmkreisKm} onUmkreis={umkreisSuchen} onSchliessen={() => setKnoten(null)} onKapazitaet={() => setVersion((x) => x + 1)} />
  ) : null;

  return (
    <div ref={rahmenRef} className={cn("relative flex flex-col overflow-hidden bg-white ring-1 ring-ink-200/70", vollbild ? "fixed inset-0 z-[80] rounded-none" : "h-[calc(100dvh-150px)] min-h-[560px] rounded-3xl")}>
      {/* Kopfzeile */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 p-2.5 sm:flex-nowrap">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-ink-400" aria-hidden="true" />
          <input
            ref={suchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ort, KG, „KG-Nr Gst-Nr“, Umspannwerk … ( / )"
            className={cn(eingabe, "h-10 pl-10")}
            role="combobox"
            aria-expanded={treffer.length > 0}
            aria-controls="geo-treffer"
            aria-label="Suche nach Ort, Katastralgemeinde, Grundstücksnummer oder Umspannwerk"
          />
          {treffer.length > 0 && (
            <ul id="geo-treffer" role="listbox" className="absolute left-0 right-0 top-11 z-[60] max-h-72 overflow-y-auto rounded-2xl bg-white p-1 shadow-xl ring-1 ring-ink-200">
              {treffer.map((t, i) => (
                <li key={`${t.typ}-${i}`} role="option" aria-selected="false">
                  <button type="button" onClick={() => trefferWaehlen(t)} className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13.5px] hover:bg-sand-50">
                    <span className="truncate text-ink-900">{t.label}</span>
                    <span className="shrink-0 text-[11.5px] text-ink-500">{{ kandidat: "Fläche", grundstueck: "Grundstück", netzknoten: "Netz", ort: "Ort", gemeinde: "Gemeinde", bezirk: "Bezirk", kg: "KG" }[t.typ] || t.typ}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" onClick={() => { setMessen((x) => !x); setMesspunkte([]); }} aria-pressed={messen} className={cn("inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset", messen ? "bg-sun-400 text-navy-950 ring-sun-400" : "bg-white text-ink-800 ring-ink-200 hover:bg-ink-50")} title="Distanz messen (m)">
          <Ruler className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Messen</span>
        </button>
        <button type="button" onClick={() => setPanelOffen((x) => !x)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 lg:hidden" aria-expanded={panelOffen}>
          <Filter className="h-4 w-4" aria-hidden="true" /> Panel
        </button>
        <button type="button" onClick={vollbildUmschalten} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50" aria-label={vollbild ? "Vollbild verlassen" : "Vollbild"}>
          {vollbild ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {fehler && (
        <div className="flex items-center justify-between gap-2 bg-red-50 px-4 py-2 text-[13px] text-red-800">
          <span>{fehler}</span>
          <button type="button" onClick={() => setFehler("")} aria-label="Meldung schließen"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* Seitenpanel links (Desktop immer, mobil als Overlay) */}
        <aside className={cn("z-[40] w-full max-w-[340px] shrink-0 border-r border-ink-100 bg-white", "absolute inset-y-0 left-0 lg:static", panelOffen && !detail ? "block" : detail ? "hidden 2xl:block" : "hidden lg:block")} aria-label="Filter und Flächenliste">
          {seitenPanel}
        </aside>

        {/* Karte */}
        <div className="relative min-w-0 flex-1">
          <div ref={kartenRef} className="absolute inset-0 z-0 bg-sand-100" role="application" aria-label="Karte der Kandidatenflächen, Umspannwerke und Schutzgebiete" />
          {!bereit && <div className="absolute inset-0 flex items-center justify-center text-[14px] text-ink-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> Karte wird geladen …</div>}
          {info && (
            <div className="pointer-events-none absolute right-3 top-3 z-[30] hidden rounded-2xl bg-white/95 px-3 py-2 text-[12px] text-ink-700 shadow ring-1 ring-ink-200 sm:block">
              <strong className="text-ink-900">{fmt(anzahl)}</strong> Flächen · {fmt(liste.reduce((s, k) => s + k.ha, 0), 0)} ha · {fmt(liste.reduce((s, k) => s + k.mwp, 0), 0)} MWp
              {info.modus === "demo" && <span className="ml-2 rounded-full bg-sun-300/50 px-2 py-0.5 font-semibold text-navy-900">DEMO-Daten</span>}
            </div>
          )}
          {messen && (
            <div className="absolute bottom-8 left-1/2 z-[30] -translate-x-1/2 rounded-full bg-navy-900 px-4 py-2 text-[13px] font-semibold text-white shadow-lg" role="status" aria-live="polite">
              <Crosshair className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
              {messpunkte.length < 2 ? "Punkte in die Karte klicken" : `${fmt(messStrecke / 1000, 2)} km (${fmt(messStrecke)} m)`}
              <button type="button" onClick={() => setMesspunkte([])} className="ml-3 underline">neu</button>
              <button type="button" onClick={() => setMessen(false)} className="ml-2 underline">fertig</button>
            </div>
          )}
        </div>

        {/* Steckbrief / Netzknoten rechts (mobil als unteres Blatt) */}
        {detail && (
          <aside className="absolute inset-x-0 bottom-0 z-[45] max-h-[72%] overflow-hidden rounded-t-3xl border-t border-ink-200 bg-white shadow-2xl lg:static lg:inset-auto lg:max-h-none lg:w-[380px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none" aria-label="Steckbrief">
            <div className="h-full max-h-[72vh] overflow-y-auto lg:max-h-none">{detail}</div>
          </aside>
        )}
      </div>
      {anschreiben && <AnschreibenDialog kandidat={anschreiben} onSchliessen={() => setAnschreiben(null)} />}
    </div>
  );
}
