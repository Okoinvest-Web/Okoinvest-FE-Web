"use client";

// Standard-Projektdatenblatt (Anbieter → Börse): phasenabhängige Felder aus fach/datenblatt-schema.js,
// Vollständigkeit und Plausibilitätsprüfung live. Gespeichert wird mit dem Projekt (PATCH /api/portal/projekte/[id]).
// Maßgeblich sind die Prüfungen auf dem Server (Bereinigung, Datenraum-Qualität).

import { useId, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Info, Plus, Trash2, XCircle } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Feld, auswahlfeld, eingabe } from "@/components/Portal/felder";
import {
  DATENBLATT_BEREICHE, datenblattKennzahlen, datenblattPruefen, datenblattVollstaendigkeit, feldErwartet, feldRelevant,
} from "@/lib/plattform/fach/datenblatt";
import { PHASEN } from "@/lib/invest/markt";

const PHASE_LABEL = Object.fromEntries(PHASEN.map((p) => [p.id, p.kurz]));
const STUFE = {
  fehler: { icon: XCircle, klasse: "bg-red-50 text-red-900 ring-red-200" },
  warnung: { icon: AlertTriangle, klasse: "bg-sun-300/20 text-ink-900 ring-sun-400/40" },
  info: { icon: Info, klasse: "bg-navy-50 text-navy-900 ring-navy-100" },
};

/** Hinweise der Plausibilitätsprüfung */
export function PruefHinweise({ hinweise, leer = null }) {
  if (!hinweise?.length) return leer;
  return (
    <ul className="space-y-2">
      {hinweise.map((h, i) => {
        const s = STUFE[h.stufe] || STUFE.info;
        const Icon = s.icon;
        return (
          <li key={`${h.feld}-${i}`} className={cn("flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ring-1 ring-inset", s.klasse)}>
            <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{h.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Tabelle({ wert, setzen, spalten, id }) {
  const zeilen = Array.isArray(wert) && wert.length ? wert : [{}];
  const aendern = (i, k, v) => setzen(zeilen.map((z, j) => (j === i ? { ...z, [k]: v } : z)));
  return (
    <div className="space-y-2">
      {zeilen.map((z, i) => (
        <div key={i} className="grid grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-2">
          {spalten.map(([k, label]) => (
            <input key={k} aria-label={`${label} Zeile ${i + 1}`} placeholder={label} inputMode="decimal" className={eingabe} value={z[k] ?? ""} onChange={(e) => aendern(i, k, e.target.value)} id={i === 0 && k === spalten[0][0] ? id : undefined} />
          ))}
          <button type="button" onClick={() => setzen(zeilen.length > 1 ? zeilen.filter((_, j) => j !== i) : [])} className="flex h-12 w-12 items-center justify-center rounded-xl text-ink-500 ring-1 ring-inset ring-ink-200 hover:bg-ink-50" aria-label={`Zeile ${i + 1} entfernen`}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ))}
      {zeilen.length < 30 && (
        <button type="button" onClick={() => setzen([...zeilen, {}])} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
          <Plus aria-hidden="true" className="h-4 w-4" /> Jahr hinzufügen
        </button>
      )}
    </div>
  );
}

/**
 * @param p          Projektzustand aus dem Formular ({typ, land, bundesland, phase, mwp, flaecheHa, netzanschluss, codGeplant, vertraulich, datenblatt})
 * @param setzeDb    (feld, wert) → Datenblatt
 * @param setzeV     (feld, wert) → vertraulich
 */
export default function DatenblattFormular({ p, setzeDb, setzeV }) {
  const id = useId();
  const [offen, setOffen] = useState(() => new Set(["technik", "ertrag", "netz"]));
  // Zahlen aus Texteingaben für die Live-Prüfung
  const pz = useMemo(() => {
    const zahl = (x) => (x === "" || x === null || x === undefined ? undefined : Number(String(x).replace(",", ".")));
    const db = {};
    for (const [k, v] of Object.entries(p.datenblatt || {})) db[k] = typeof v === "string" && /^-?[\d.,]+$/.test(v.trim()) ? zahl(v) : v;
    const vt = { ...(p.vertraulich || {}) };
    for (const k of ["ertragKwhKwp", "entfernungNetzKm"]) if (vt[k] !== undefined && vt[k] !== "") vt[k] = zahl(vt[k]);
    return { ...p, mwp: zahl(p.mwp), flaecheHa: zahl(p.flaecheHa), datenblatt: db, vertraulich: vt };
  }, [p]);
  const voll = datenblattVollstaendigkeit(pz);
  const pruef = datenblattPruefen(pz);
  const kz = datenblattKennzahlen(pz);
  const phase = PHASEN.findIndex((x) => x.id === p.phase);

  const wertVon = (f) => (f.pfad === "vertraulich" ? p.vertraulich?.[f.id] : p.datenblatt?.[f.id]) ?? (f.typ === "tabelle" ? [] : "");
  const setze = (f, w) => (f.pfad === "vertraulich" ? setzeV(f.id, w) : setzeDb(f.id, w));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-3xl bg-navy-950 p-5 text-white sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">Standard-Projektdatenblatt</p>
          <p className="mt-1 text-[14px] leading-relaxed text-white/75">
            Vertraulich – sichtbar erst nach NDA-Freigabe. Pflichtfelder richten sich nach der Phase{p.phase ? ` (${PHASE_LABEL[p.phase]})` : ""}; die Vollständigkeit fließt zu 30 % in die Datenraum-Qualität ein.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="ov-num font-display text-[34px] font-extrabold leading-none text-white">{voll.quote} %</p>
          <p className="text-[12.5px] text-white/60">{voll.erfuellt} von {voll.erwartet} Pflichtangaben</p>
        </div>
      </div>

      {(kz.dcAc || kz.mwpProHa || kz.p90ZuP50 || kz.ertragRichtwert) && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["DC/AC-Verhältnis", kz.dcAc ? kz.dcAc.toLocaleString("de-DE") : "–"],
            ["Belegung", kz.mwpProHa ? `${kz.mwpProHa.toLocaleString("de-DE")} MWp/ha` : "–"],
            ["P90 / P50", kz.p90ZuP50 ? `${(kz.p90ZuP50 * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %` : "–"],
            ["Richtwert Region", kz.ertragRichtwert ? `${kz.ertragRichtwert} kWh/kWp` : "–"],
          ].map(([l, w]) => (
            <div key={l} className="rounded-2xl bg-sand-50 px-3.5 py-2.5 ring-1 ring-inset ring-ink-200/60">
              <dt className="text-[12px] text-ink-500">{l}</dt>
              <dd className="ov-num text-[15px] font-semibold text-ink-900">{w}</dd>
            </div>
          ))}
        </dl>
      )}

      {pruef.length > 0 && (
        <section aria-label="Plausibilitätsprüfung" className="space-y-2">
          <p className="text-[13.5px] font-semibold text-ink-700">Plausibilitätsprüfung</p>
          <PruefHinweise hinweise={pruef} />
        </section>
      )}

      {DATENBLATT_BEREICHE.map((b) => {
        const felder = b.felder.filter((f) => feldRelevant(pz, f));
        if (!felder.length) return null;
        const bv = voll.bereiche.find((x) => x.id === b.id);
        const auf = offen.has(b.id);
        return (
          <section key={b.id} className="rounded-3xl bg-white ring-1 ring-ink-200/70">
            <h3>
              <button
                type="button"
                aria-expanded={auf}
                aria-controls={`${id}-${b.id}`}
                onClick={() => setOffen((s) => {
                  const n = new Set(s);
                  if (n.has(b.id)) n.delete(b.id);
                  else n.add(b.id);
                  return n;
                })}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span className="min-w-0">
                  <span className="block font-display text-[16px] font-bold text-ink-900">{b.titel}</span>
                  <span className="block text-[12.5px] text-ink-500">{bv?.erwartet ? `${bv.erfuellt}/${bv.erwartet} Pflichtangaben in dieser Phase` : "in dieser Phase optional"}</span>
                </span>
                <ChevronDown aria-hidden="true" className={cn("h-5 w-5 shrink-0 text-ink-400 transition-transform", auf && "rotate-180")} />
              </button>
            </h3>
            {auf && (
              <div id={`${id}-${b.id}`} className="border-t border-ink-100 px-5 pb-5 pt-4">
                <p className="mb-4 text-[13.5px] leading-relaxed text-ink-600">{b.text}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {felder.map((f) => {
                    const fid = `${id}-${f.id}`;
                    const erwartet = feldErwartet(pz, f);
                    const spaeter = f.pflicht && !erwartet && f.ab && PHASEN.findIndex((x) => x.id === f.ab) > phase;
                    const hinweis = [f.hilfe, spaeter ? `Pflicht ab Phase „${PHASE_LABEL[f.ab]}“.` : null].filter(Boolean).join(" ");
                    const w = wertVon(f);
                    const text = `${f.label}${f.einheit ? ` (${f.einheit})` : ""}`;
                    // Kontexthilfe: Verweis ins Lexikon (neuer Tab), damit das Formular nicht verlassen wird
                    const label = f.lex ? (
                      <span className="inline-flex items-baseline gap-1">
                        {text}
                        <a href={`/wissen/lexikon#${f.lex}`} target="_blank" rel="noopener" className="text-[12px] font-semibold text-ov-700 hover:text-ov-800" aria-label={`Begriff „${f.label}“ im Lexikon erklären (neuer Tab)`}>?</a>
                      </span>
                    ) : text;
                    return (
                      <Feld key={f.id} id={fid} label={label} pflicht={erwartet} hinweis={hinweis || undefined} className={f.typ === "tabelle" || (f.typ === "text" && (f.laenge || 0) > 160) ? "sm:col-span-2" : ""}>
                        {f.typ === "auswahl" ? (
                          <select id={fid} className={auswahlfeld} value={w} onChange={(e) => setze(f, e.target.value)}>
                            <option value="">– bitte wählen –</option>
                            {f.optionen.map(([o, l]) => <option key={o} value={o}>{l}</option>)}
                          </select>
                        ) : f.typ === "datum" ? (
                          <input id={fid} type="date" className={eingabe} value={w} onChange={(e) => setze(f, e.target.value)} />
                        ) : f.typ === "tabelle" ? (
                          <Tabelle id={fid} wert={w} spalten={f.spalten} setzen={(x) => setze(f, x)} />
                        ) : (
                          <input id={fid} inputMode={f.typ === "zahl" ? "decimal" : undefined} maxLength={f.laenge || 200} className={eingabe} value={w} onChange={(e) => setze(f, e.target.value)} />
                        )}
                      </Feld>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}
      <p className="text-[12.5px] leading-relaxed text-ink-500">Angaben zur Wirtschaftlichkeit sind Anbieterangaben und werden Investoren ausdrücklich als ungeprüft angezeigt. Bitte keine Firmennamen, Gemeinden oder Personen in Freitextfeldern, solange die Anonymität gewahrt bleiben soll.</p>
    </div>
  );
}
