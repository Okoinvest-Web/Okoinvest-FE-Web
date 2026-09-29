"use client";

// Projekt anlegen/bearbeiten in fünf Schritten – jeder Schritt speichert.
// Letzter Schritt: Provisionsvereinbarung (protokolliert) und Einreichung zur Prüfung.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { BUNDESLAENDER, LAENDER, NETZANSCHLUSS, PREIS_MODUS, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { BEDINGUNGEN } from "@/lib/plattform/prozesse";
import { VERTRAULICH_FELDER } from "@/lib/plattform/oeffentlich";
import { PHASEN, PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { eingabe, textbereich, auswahlfeld, Feld, FehlerBox, ErfolgBox } from "./felder";

const SCHRITTE = ["Grunddaten", "Entwicklungsstand", "Preis & Exposé", "Vertrauliches", "Provision & Einreichen"];

function start(p) {
  return {
    titel: p?.titel || "",
    typ: p?.typ || "freiflaeche",
    land: p?.land || "DE",
    bundesland: p?.bundesland || "",
    region: p?.region || "",
    mwp: p?.mwp ?? "",
    mwhSpeicher: p?.mwhSpeicher ?? "",
    flaecheHa: p?.flaecheHa ?? "",
    phase: p?.phase || "",
    netzanschluss: p?.netzanschluss || "offen",
    codGeplant: p?.codGeplant || "",
    preisModus: p?.preisModus || "anfrage",
    preis: p?.preis ?? "",
    preisProKwp: p?.preisProKwp ?? "",
    beschreibung: p?.beschreibung || "",
    highlights: p?.highlights?.length ? p.highlights : [""],
    vertraulich: { ...(p?.vertraulich || {}) },
  };
}

export default function ProjektFormular({ projekt, schrittStart = 0 }) {
  const router = useRouter();
  const id = useId();
  const [p, setP] = useState(() => start(projekt));
  const [schritt, setSchritt] = useState(Math.min(Math.max(0, schrittStart), SCHRITTE.length - 1));
  const [akzeptiert, setAkzeptiert] = useState(!!projekt?.provisionAkzeptiert);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");

  const setze = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const setzeV = (k, v) => setP((x) => ({ ...x, vertraulich: { ...x.vertraulich, [k]: v } }));
  const phase = PHASEN.find((x) => x.id === p.phase);

  async function speichern() {
    const daten = { ...p, highlights: p.highlights.filter(Boolean) };
    if (!projekt) {
      const r = await senden("/api/portal/projekte", { body: daten });
      return r.projekt;
    }
    const r = await senden(`/api/portal/projekte/${projekt.id}`, { method: "PATCH", body: daten });
    return r.projekt;
  }

  async function weiter(e) {
    e?.preventDefault();
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      const gespeichert = await speichern();
      if (!projekt) {
        router.replace(`/portal/projekte/${gespeichert.id}?schritt=1`);
        return;
      }
      setSchritt((s) => Math.min(s + 1, SCHRITTE.length - 1));
      setErfolg("Gespeichert.");
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  async function einreichen() {
    setLaeuft(true);
    setFehler("");
    try {
      await speichern();
      if (!projekt.provisionAkzeptiert) await senden(`/api/portal/projekte/${projekt.id}/provision`, { body: { akzeptiert: true } });
      await senden("/api/portal/status", { body: { art: "projekt", id: projekt.id, nach: "pruefung" } });
      router.replace(`/portal/projekte/${projekt.id}?eingereicht=1`);
      router.refresh();
    } catch (err) {
      setFehler(err.message);
      setLaeuft(false);
    }
  }

  const fehlt = projekt ? BEDINGUNGEN.projektEinreichbar({ ...p, mwp: Number(String(p.mwp).replace(",", ".")), provisionAkzeptiert: akzeptiert ? { am: "x" } : null }) : [];

  return (
    <div className="space-y-6">
      {/* Schrittanzeige */}
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Schritte">
        {SCHRITTE.map((s, i) => {
          const erreichbar = !!projekt || i === 0;
          return (
            <li key={s} className="min-w-0">
              <button
                type="button"
                disabled={!erreichbar}
                onClick={() => erreichbar && setSchritt(i)}
                aria-current={i === schritt ? "step" : undefined}
                className="group block w-full text-left disabled:cursor-not-allowed"
              >
                <span className={cn("block h-1.5 rounded-full transition-colors", i <= schritt ? "bg-ov-500" : "bg-ink-200 group-hover:bg-ink-300")} />
                <span className={cn("mt-2 hidden text-[12.5px] leading-tight sm:block", i === schritt ? "font-semibold text-ink-900" : "text-ink-500")}>{s}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="text-[13px] font-semibold text-ink-500 sm:hidden">Schritt {schritt + 1} von {SCHRITTE.length}: {SCHRITTE[schritt]}</p>

      <form onSubmit={weiter} className="space-y-5">
        {schritt === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld id={`${id}-t`} label="Projekttitel (öffentlich)" pflicht className="sm:col-span-2" hinweis="Anonym formulieren, z. B. „Freiflächen-PV 12 MWp in Niederbayern“ – keine Gemeinde, keine Flurstücke.">
              <input id={`${id}-t`} required maxLength={120} className={eingabe} value={p.titel} onChange={(e) => setze("titel", e.target.value)} />
            </Feld>
            <Feld id={`${id}-ty`} label="Projekttyp" pflicht>
              <select id={`${id}-ty`} className={auswahlfeld} value={p.typ} onChange={(e) => setze("typ", e.target.value)}>
                {Object.entries(PROJEKT_TYPEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Feld>
            <Feld id={`${id}-la`} label="Land" pflicht>
              <select id={`${id}-la`} className={auswahlfeld} value={p.land} onChange={(e) => setP((x) => ({ ...x, land: e.target.value, bundesland: "" }))}>
                {Object.entries(LAENDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Feld>
            <Feld id={`${id}-bl`} label={p.land === "CH" ? "Kanton" : "Bundesland"} pflicht>
              <select id={`${id}-bl`} className={auswahlfeld} value={p.bundesland} onChange={(e) => setze("bundesland", e.target.value)}>
                <option value="">Bitte wählen</option>
                {BUNDESLAENDER[p.land].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Feld>
            <Feld id={`${id}-r`} label="Region (grob, öffentlich)" pflicht hinweis="z. B. „Uckermark“ oder „Innviertel“ – nie die genaue Lage.">
              <input id={`${id}-r`} maxLength={80} className={eingabe} value={p.region} onChange={(e) => setze("region", e.target.value)} />
            </Feld>
            <Feld id={`${id}-m`} label={p.typ === "speicher" ? "Leistung in MW" : "Leistung in MWp"} pflicht>
              <input id={`${id}-m`} inputMode="decimal" className={eingabe} value={p.mwp} onChange={(e) => setze("mwp", e.target.value)} />
            </Feld>
            {(p.typ === "speicher" || p.typ === "hybrid") && (
              <Feld id={`${id}-s`} label="Speicherkapazität in MWh">
                <input id={`${id}-s`} inputMode="decimal" className={eingabe} value={p.mwhSpeicher} onChange={(e) => setze("mwhSpeicher", e.target.value)} />
              </Feld>
            )}
            {p.typ !== "carport" && p.typ !== "speicher" && (
              <Feld id={`${id}-f`} label="Fläche in ha">
                <input id={`${id}-f`} inputMode="decimal" className={eingabe} value={p.flaecheHa} onChange={(e) => setze("flaecheHa", e.target.value)} />
              </Feld>
            )}
          </div>
        )}

        {schritt === 1 && (
          <div className="space-y-5">
            <fieldset>
              <legend className="mb-3 text-[13.5px] font-semibold text-ink-700">Entwicklungsphase *</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {PHASEN.map((ph) => (
                  <label key={ph.id} className={cn("flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 ring-inset transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500", p.phase === ph.id ? "bg-ov-50 ring-ov-400" : "bg-white ring-ink-200 hover:ring-ink-300")}>
                    <input type="radio" name="phase" value={ph.id} checked={p.phase === ph.id} onChange={() => setze("phase", ph.id)} className="sr-only" />
                    <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1", p.phase === ph.id ? "bg-ov-600 text-white ring-ov-600" : "ring-ink-300")}>
                      {p.phase === ph.id && <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14.5px] font-semibold text-ink-900">{ph.label}</span>
                      <span className="block text-[12.5px] text-ink-500">Risiko {ph.risiko} · übliche Preise {fmt(ph.preisProKwp.min)}–{fmt(ph.preisProKwp.max)} €/kWp</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Feld id={`${id}-n`} label="Netzanschluss">
                <select id={`${id}-n`} className={auswahlfeld} value={p.netzanschluss} onChange={(e) => setze("netzanschluss", e.target.value)}>
                  {Object.entries(NETZANSCHLUSS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Feld>
              <Feld id={`${id}-c`} label="Geplante Inbetriebnahme (COD)" hinweis="Jahr oder Jahr-Monat, z. B. 2028 oder 2028-06">
                <input id={`${id}-c`} placeholder="JJJJ-MM" maxLength={7} className={eingabe} value={p.codGeplant} onChange={(e) => setze("codGeplant", e.target.value)} />
              </Feld>
            </div>
          </div>
        )}

        {schritt === 2 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Feld id={`${id}-pm`} label="Preisangabe">
                <select id={`${id}-pm`} className={auswahlfeld} value={p.preisModus} onChange={(e) => setze("preisModus", e.target.value)}>
                  {Object.entries(PREIS_MODUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Feld>
              {p.preisModus === "gesamt" && (
                <Feld id={`${id}-pg`} label="Kaufpreis gesamt in €">
                  <input id={`${id}-pg`} inputMode="decimal" className={eingabe} value={p.preis} onChange={(e) => setze("preis", e.target.value)} />
                </Feld>
              )}
              {p.preisModus === "proKwp" && (
                <Feld id={`${id}-pk`} label="Preis in €/kWp" hinweis={phase ? `Übliche Spanne in dieser Phase: ${fmt(phase.preisProKwp.min)}–${fmt(phase.preisProKwp.max)} €/kWp` : undefined}>
                  <input id={`${id}-pk`} inputMode="decimal" className={eingabe} value={p.preisProKwp} onChange={(e) => setze("preisProKwp", e.target.value)} />
                </Feld>
              )}
            </div>
            <Feld id={`${id}-d`} label="Beschreibung (öffentlich)" pflicht hinweis={`Mindestens 80 Zeichen – bisher ${p.beschreibung.length}. Stand, Besonderheiten, Zielgruppe. Keine genaue Lage.`}>
              <textarea id={`${id}-d`} rows={6} maxLength={4000} className={textbereich} value={p.beschreibung} onChange={(e) => setze("beschreibung", e.target.value)} />
            </Feld>
            <fieldset>
              <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Highlights (bis zu 6, öffentlich)</legend>
              <div className="space-y-2">
                {p.highlights.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <input aria-label={`Highlight ${i + 1}`} maxLength={90} className={eingabe} value={h} onChange={(e) => setP((x) => ({ ...x, highlights: x.highlights.map((y, j) => (j === i ? e.target.value : y)) }))} />
                    <button type="button" onClick={() => setP((x) => ({ ...x, highlights: x.highlights.length > 1 ? x.highlights.filter((_, j) => j !== i) : [""] }))} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-ink-500 ring-1 ring-inset ring-ink-200 hover:bg-ink-50" aria-label={`Highlight ${i + 1} entfernen`}>
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {p.highlights.length < 6 && (
                <button type="button" onClick={() => setP((x) => ({ ...x, highlights: [...x.highlights, ""] }))} className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
                  <Plus aria-hidden="true" className="h-4 w-4" /> Highlight hinzufügen
                </button>
              )}
            </fieldset>
          </div>
        )}

        {schritt === 3 && (
          <div className="space-y-4">
            <p className="flex items-start gap-2 rounded-2xl bg-navy-50 px-4 py-3 text-[14px] leading-relaxed text-navy-900 ring-1 ring-inset ring-navy-100">
              <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              Diese Angaben sehen nur das Backoffice und Investoren, deren NDA freigegeben wurde. Unterlagen für den Datenraum laden Sie nach dem Speichern in der Projektansicht hoch.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(VERTRAULICH_FELDER).map(([k, label]) =>
                k === "details" ? (
                  <Feld key={k} id={`${id}-v-${k}`} label={label} className="sm:col-span-2">
                    <textarea id={`${id}-v-${k}`} rows={4} maxLength={3000} className={textbereich} value={p.vertraulich[k] ?? ""} onChange={(e) => setzeV(k, e.target.value)} />
                  </Feld>
                ) : (
                  <Feld key={k} id={`${id}-v-${k}`} label={label}>
                    <input id={`${id}-v-${k}`} inputMode={["entfernungNetzKm", "ertragKwhKwp"].includes(k) ? "decimal" : undefined} maxLength={300} className={eingabe} value={p.vertraulich[k] ?? ""} onChange={(e) => setzeV(k, e.target.value)} />
                  </Feld>
                )
              )}
            </div>
          </div>
        )}

        {schritt === 4 && (
          <div className="space-y-5">
            <div className="rounded-3xl bg-navy-950 p-6 text-white">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">Provisionsvereinbarung</p>
              <p className="mt-3 font-display text-[22px] font-bold">Erfolgsprovision {PROVISION.verkaeufer.text}</p>
              <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-white/75">
                <li>· Die Provision fällt nur an, wenn ein über die Projektbörse vermittelter Investor das Projekt erwirbt.</li>
                <li>· Der konkrete Satz innerhalb der Spanne wird mit der Freigabe festgelegt und Ihnen im Portal angezeigt.</li>
                <li>· Keine Einstell- oder Listungsgebühren. {PROVISION.kaeufer.text.charAt(0).toUpperCase() + PROVISION.kaeufer.text.slice(1)}.</li>
              </ul>
              <label className="mt-5 flex items-start gap-3 rounded-2xl bg-white/[0.06] p-4 text-[14px] ring-1 ring-white/10">
                <input type="checkbox" checked={akzeptiert} disabled={!!projekt?.provisionAkzeptiert} onChange={(e) => setAkzeptiert(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#669933]" />
                <span>
                  Ich akzeptiere die Provisionsvereinbarung für dieses Projekt. Zeitpunkt und IP-Adresse werden protokolliert.
                  {projekt?.provisionAkzeptiert && <span className="mt-1 block text-[12.5px] text-ov-300">Bereits akzeptiert.</span>}
                </span>
              </label>
            </div>
            {fehlt.length > 0 && (
              <div className="rounded-2xl bg-sun-300/20 px-4 py-3 text-[14px] text-ink-900 ring-1 ring-inset ring-sun-400/40">
                <p className="font-semibold">Vor dem Einreichen noch ergänzen:</p>
                <p className="mt-1">{fehlt.join(" · ")}</p>
              </div>
            )}
          </div>
        )}

        <FehlerBox>{fehler}</FehlerBox>
        <ErfolgBox>{erfolg}</ErfolgBox>

        <div className="flex flex-col-reverse gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:justify-between">
          <Button variant="ghost" disabled={schritt === 0 || laeuft} onClick={() => setSchritt((s) => Math.max(0, s - 1))}>
            Zurück
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            {schritt < SCHRITTE.length - 1 ? (
              <Button type="submit" disabled={laeuft} pfeil>
                {laeuft ? "Wird gespeichert …" : projekt ? "Speichern & weiter" : "Entwurf anlegen & weiter"}
              </Button>
            ) : (
              <>
                <Button variant="secondary" disabled={laeuft} onClick={() => weiter()}>Entwurf speichern</Button>
                <Button disabled={laeuft || fehlt.length > 0} onClick={einreichen} pfeil>
                  {laeuft ? "Wird eingereicht …" : "Zur Prüfung einreichen"}
                </Button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
