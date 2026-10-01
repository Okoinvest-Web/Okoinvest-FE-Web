"use client";

// Förder-Check (WP5): Anlagen und Eckdaten eingeben → Programme mit Ergebnis (geeignet / prüfen / nicht geeignet), Gründen,
// Bedingungen, Quelle und Stand. Regeln serverseitig (eg/foerder.js). Keine Förderzusage.

import { useId, useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { Feld, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { Badge } from "@/components/Portal/ui";
import { Knopf, Meldung } from "@/components/Portal/Mitglied/teile";
import { senden } from "@/lib/plattform/client";
import { EG_MODELLE } from "@/lib/plattform/eg/modell";
import { BUNDESLAENDER_GR } from "@/lib/plattform/eg/gruendung";
import { datumDe } from "./teile";

const ARTEN = { pv: "Photovoltaik", speicher: "Speicher", wind: "Wind", wasser: "Wasserkraft", biomasse: "Biomasse" };
const STATUS = { geplant: "geplant", in_bau: "in Bau", in_betrieb: "in Betrieb" };
const ANTRAG = { eg: "Gemeinschaft", privat: "Privatperson", landwirt: "Landwirt/in", unternehmen: "Unternehmen", gemeinde: "Gemeinde" };

export function FoerderCheck({ auftragId = "", gemeinschaftId = "", start = {}, speicherbar = false }) {
  const id = useId();
  const [d, setD] = useState({ modell: start.modell || "eeg", bundesland: start.bundesland || "", antragsteller: start.antragsteller || "eg", gemeindeBeteiligt: !!start.gemeindeBeteiligt, anlagen: start.anlagen?.length ? start.anlagen : [{ art: "pv", kwp: "", speicherKwh: "", status: "geplant", bezeichnung: "" }] });
  const [r, setR] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const setA = (i, k, v) => setD({ ...d, anlagen: d.anlagen.map((a, j) => (j === i ? { ...a, [k]: v } : a)) });
  async function pruefen(speichern) {
    setLaeuft(true);
    setFehler("");
    try {
      const anlagen = d.anlagen.filter((a) => Number(a.kwp) > 0 || Number(a.speicherKwh) > 0).map((a) => ({ ...a, kwp: Number(String(a.kwp).replace(",", ".")) || 0, speicherKwh: Number(String(a.speicherKwh).replace(",", ".")) || 0 }));
      const x = await senden("/api/portal/eg/foerdercheck", { body: { auftragId, gemeinschaftId, daten: { ...d, anlagen }, speichern } });
      setR(x.foerdercheck);
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Feld id={`${id}-m`} label="Modell"><select id={`${id}-m`} className={auswahlfeld} value={d.modell} onChange={(e) => setD({ ...d, modell: e.target.value })}>{Object.entries(EG_MODELLE).map(([k, m]) => <option key={k} value={k}>{m.kurz}</option>)}</select></Feld>
        <Feld id={`${id}-b`} label="Bundesland"><select id={`${id}-b`} className={auswahlfeld} value={d.bundesland} onChange={(e) => setD({ ...d, bundesland: e.target.value })}><option value="">– wählen –</option>{Object.entries(BUNDESLAENDER_GR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
        <Feld id={`${id}-a`} label="Antragsteller bzw. Eigentümer"><select id={`${id}-a`} className={auswahlfeld} value={d.antragsteller} onChange={(e) => setD({ ...d, antragsteller: e.target.value })}>{Object.entries(ANTRAG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
      </div>
      <label className="flex items-center gap-2 text-[14px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={d.gemeindeBeteiligt} onChange={(e) => setD({ ...d, gemeindeBeteiligt: e.target.checked })} />Gemeinde beteiligt bzw. investiert</label>
      <div className="space-y-2">
        {d.anlagen.map((a, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-2xl bg-ink-50 p-3 sm:grid-cols-6">
            <Feld id={`${id}-x${i}`} label="Art"><select id={`${id}-x${i}`} className={auswahlfeld} value={a.art} onChange={(e) => setA(i, "art", e.target.value)}>{Object.entries(ARTEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
            <Feld id={`${id}-k${i}`} label={a.art === "speicher" ? "kWh" : "kWp"}><input id={`${id}-k${i}`} className={eingabe} inputMode="decimal" value={a.art === "speicher" ? a.speicherKwh : a.kwp} onChange={(e) => setA(i, a.art === "speicher" ? "speicherKwh" : "kwp", e.target.value)} /></Feld>
            <Feld id={`${id}-s${i}`} label="Stand"><select id={`${id}-s${i}`} className={auswahlfeld} value={a.status} onChange={(e) => setA(i, "status", e.target.value)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
            <Feld id={`${id}-n${i}`} label="Bezeichnung" className="col-span-2"><input id={`${id}-n${i}`} className={eingabe} value={a.bezeichnung} onChange={(e) => setA(i, "bezeichnung", e.target.value)} /></Feld>
            <div className="flex items-end"><Knopf aria-label="Anlage entfernen" onClick={() => setD({ ...d, anlagen: d.anlagen.filter((_, j) => j !== i) })} className="w-full"><Trash2 aria-hidden="true" className="h-4 w-4" /></Knopf></div>
          </div>
        ))}
        <Knopf onClick={() => setD({ ...d, anlagen: [...d.anlagen, { art: "pv", kwp: "", speicherKwh: "", status: "geplant", bezeichnung: "" }] })}><Plus aria-hidden="true" className="h-4 w-4" />Anlage</Knopf>
      </div>
      <div className="flex flex-wrap gap-2">
        <Knopf variante="primary" onClick={() => pruefen(false)} disabled={laeuft}>{laeuft ? "Prüfe …" : "Förder-Check starten"}</Knopf>
        {speicherbar && <Knopf onClick={() => pruefen(true)} disabled={laeuft}>Prüfen und ablegen</Knopf>}
      </div>
      <Meldung fehler={fehler} />
      {r && (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-500">Stand {datumDe(r.stand)} · {r.kennzahlen.geeignet} geeignet · {r.kennzahlen.pruefen} zu prüfen{r.id ? ` · abgelegt (${r.id})` : ""}</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {r.treffer.map((t) => (
              <li key={t.id} className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink-200">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-display text-[15px] font-bold text-ink-900">{t.titel}</p>
                  <Badge ton={t.ton}>{t.ergebnisLabel}</Badge>
                </div>
                <p className="mt-0.5 text-[12.5px] text-ink-500">{t.traeger}{t.status === "zu_bestaetigen" ? " · (zu bestätigen)" : ""}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-700">{t.text}</p>
                {t.gruende?.length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px] text-ink-700">{t.gruende.map((g, i) => <li key={i}>{g}</li>)}</ul>}
                {t.bedingungen?.length > 0 && <p className="mt-2 text-[12.5px] text-ink-500">Bedingungen: {t.bedingungen.join(" · ")}</p>}
                {t.naechsterSchritt && <p className="mt-2 text-[13px] font-medium text-ov-800">{t.naechsterSchritt}</p>}
                <a href={t.quelleUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ov-700 hover:text-ov-800">Quelle: {t.quelle}<ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></a>
              </li>
            ))}
          </ul>
          <ul className="space-y-1 text-[13px] text-ink-600">{r.hinweise.map((h, i) => <li key={i}>– {h}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
