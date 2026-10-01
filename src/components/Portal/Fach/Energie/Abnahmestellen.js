"use client";

// Abnahmestellen (Energie-Stammdaten) des Unternehmens: MaLo-/MeLo-ID (DE) bzw. Zählpunktnummer (AT) / Messpunkt (CH)
// mit Live-Prüfung, Messart, Netzbetreiber, Spannungsebene, Verbrauch, Liefervertrag, Entlastungen.
// Maßgeblich ist die Prüfung auf dem Server (fach/energie.js).

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, Feld, FehlerBox, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { LAENDER } from "@/lib/plattform/konstanten";
import { MESSARTEN, NETZEBENEN_AT, PAR19, PREISSTRUKTUREN, SPANNUNGSEBENEN, maloPruefen, zaehlpunktFormatiert, zaehlpunktPruefen } from "@/lib/plattform/fach/energie";
import { PruefHinweise } from "../DatenblattFormular";
import { bestaetigen } from "@/components/ui/Rueckfrage";

const LEER = { bezeichnung: "", land: "DE", plz: "", ort: "", maloId: "", meloId: "", zaehlpunkt: "", messart: "rlm", netzbetreiber: "", spannungsebene: "ms", netzebeneAt: "", jahresverbrauchKwh: "", spitzeKw: "", lieferant: "", vertragEnde: "", kuendigungsfristMonate: "3", preisstruktur: "", arbeitspreisCt: "", leistungspreisEurKwJahr: "", grundpreisEurMonat: "", netzentgeltCt: "", stromsteuerEntlastung: "", par19: "keine", eigenerzeugungKwp: "", bemerkung: "" };

function IdPruefung({ ergebnis }) {
  if (!ergebnis) return null;
  const Icon = ergebnis.ok ? CheckCircle2 : XCircle;
  return (
    <p className={cn("mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium", ergebnis.ok ? "text-ov-700" : "text-danger-700")}>
      <Icon aria-hidden="true" className="h-4 w-4" /> {ergebnis.ok ? "Format und Prüfziffer gültig" : ergebnis.fehler}
    </p>
  );
}

function Formular({ start, onFertig, onAbbrechen }) {
  const id = useId();
  const router = useRouter();
  const [f, setF] = useState(() => ({ ...LEER, ...Object.fromEntries(Object.entries(start || {}).map(([k, v]) => [k, v === null || v === undefined ? "" : v === true ? "ja" : v === false ? "nein" : String(v)])) }));
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const setze = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const malo = f.land === "DE" && f.maloId ? maloPruefen(f.maloId) : null;
  const melo = f.land === "DE" && f.meloId ? { ...zaehlpunktPruefen(f.meloId, "DE"), fehler: zaehlpunktPruefen(f.meloId, "DE").fehler } : null;
  const zp = f.land !== "DE" && f.zaehlpunkt ? zaehlpunktPruefen(f.zaehlpunkt, f.land) : null;

  async function speichern(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      const daten = { ...f, stromsteuerEntlastung: f.stromsteuerEntlastung === "" ? null : f.stromsteuerEntlastung };
      await senden("/api/portal/fach/energie/abnahmestellen", { body: { id: start?.id || null, daten } });
      onFertig?.();
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-4 rounded-3xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/60 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Feld id={`${id}-bz`} label="Bezeichnung" pflicht hinweis="z. B. „Werk Nord“ oder „Kühlhaus Linz“">
          <input id={`${id}-bz`} required maxLength={80} className={eingabe} value={f.bezeichnung} onChange={(e) => setze("bezeichnung", e.target.value)} />
        </Feld>
        <Feld id={`${id}-la`} label="Land" pflicht>
          <select id={`${id}-la`} className={auswahlfeld} value={f.land} onChange={(e) => setze("land", e.target.value)}>
            {Object.entries(LAENDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        {f.land === "DE" ? (
          <>
            <Feld id={`${id}-malo`} label="Marktlokations-ID (MaLo)" pflicht hinweis={!malo ? "11 Ziffern, steht auf der Stromrechnung bzw. im Netznutzungsvertrag" : undefined}>
              <input id={`${id}-malo`} required inputMode="numeric" maxLength={14} className={eingabe} value={f.maloId} onChange={(e) => setze("maloId", e.target.value)} />
              <IdPruefung ergebnis={malo} />
            </Feld>
            <Feld id={`${id}-melo`} label="Messlokations-ID (MeLo, optional)" hinweis={!melo ? "33 Zeichen, beginnt mit DE" : undefined}>
              <input id={`${id}-melo`} maxLength={45} className={eingabe} value={f.meloId} onChange={(e) => setze("meloId", e.target.value)} />
              {melo && <IdPruefung ergebnis={{ ok: melo.ok, fehler: melo.fehler }} />}
            </Feld>
          </>
        ) : (
          <Feld id={`${id}-zp`} label={f.land === "AT" ? "Zählpunktnummer" : "Messpunktbezeichnung"} pflicht className="sm:col-span-2" hinweis={!zp ? `33 Zeichen, beginnt mit ${f.land} – auf der Netzrechnung${f.land === "AT" ? " bzw. im Smart-Meter-Portal des Netzbetreibers" : ""}` : undefined}>
            <input id={`${id}-zp`} required maxLength={45} className={eingabe} value={f.zaehlpunkt} onChange={(e) => setze("zaehlpunkt", e.target.value)} />
            <IdPruefung ergebnis={zp && { ok: zp.ok, fehler: zp.fehler }} />
          </Feld>
        )}
        <Feld id={`${id}-ma`} label="Messart" pflicht>
          <select id={`${id}-ma`} className={auswahlfeld} value={f.messart} onChange={(e) => setze("messart", e.target.value)}>
            {Object.entries(MESSARTEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-nb`} label="Netzbetreiber">
          <input id={`${id}-nb`} maxLength={120} className={eingabe} value={f.netzbetreiber} onChange={(e) => setze("netzbetreiber", e.target.value)} />
        </Feld>
        {f.land === "AT" ? (
          <Feld id={`${id}-ne`} label="Netzebene">
            <select id={`${id}-ne`} className={auswahlfeld} value={f.netzebeneAt} onChange={(e) => setze("netzebeneAt", e.target.value)}>
              <option value="">– bitte wählen –</option>
              {Object.entries(NETZEBENEN_AT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Feld>
        ) : (
          <Feld id={`${id}-sp`} label="Spannungsebene (Entnahme)">
            <select id={`${id}-sp`} className={auswahlfeld} value={f.spannungsebene} onChange={(e) => setze("spannungsebene", e.target.value)}>
              <option value="">– bitte wählen –</option>
              {Object.entries(SPANNUNGSEBENEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Feld>
        )}
        <Feld id={`${id}-jv`} label="Jahresverbrauch (kWh)" pflicht>
          <input id={`${id}-jv`} required inputMode="decimal" className={eingabe} value={f.jahresverbrauchKwh} onChange={(e) => setze("jahresverbrauchKwh", e.target.value)} />
        </Feld>
        <Feld id={`${id}-sk`} label="Leistungsspitze (kW)" hinweis="Jahreshöchstleistung laut Netzrechnung">
          <input id={`${id}-sk`} inputMode="decimal" className={eingabe} value={f.spitzeKw} onChange={(e) => setze("spitzeKw", e.target.value)} />
        </Feld>
        <Feld id={`${id}-ek`} label="Eigene PV bereits vorhanden (kWp)" hinweis="Dann ist der Lastgang bereits Reststrom.">
          <input id={`${id}-ek`} inputMode="decimal" className={eingabe} value={f.eigenerzeugungKwp} onChange={(e) => setze("eigenerzeugungKwp", e.target.value)} />
        </Feld>
      </div>
      <fieldset className="space-y-4">
        <legend className="text-[13.5px] font-semibold text-ink-900">Aktueller Liefervertrag</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld id={`${id}-li`} label="Lieferant"><input id={`${id}-li`} maxLength={120} className={eingabe} value={f.lieferant} onChange={(e) => setze("lieferant", e.target.value)} /></Feld>
          <Feld id={`${id}-ps`} label="Preisstruktur">
            <select id={`${id}-ps`} className={auswahlfeld} value={f.preisstruktur} onChange={(e) => setze("preisstruktur", e.target.value)}>
              <option value="">– bitte wählen –</option>
              {Object.entries(PREISSTRUKTUREN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Feld>
          <Feld id={`${id}-ve`} label="Vertragsende"><input id={`${id}-ve`} type="date" className={eingabe} value={f.vertragEnde} onChange={(e) => setze("vertragEnde", e.target.value)} /></Feld>
          <Feld id={`${id}-kf`} label="Kündigungsfrist (Monate)"><input id={`${id}-kf`} inputMode="numeric" className={eingabe} value={f.kuendigungsfristMonate} onChange={(e) => setze("kuendigungsfristMonate", e.target.value)} /></Feld>
          <Feld id={`${id}-ap`} label="Arbeitspreis gesamt (ct/kWh netto)" hinweis="inkl. Netzentgelte, Umlagen, Stromsteuer">
            <input id={`${id}-ap`} inputMode="decimal" className={eingabe} value={f.arbeitspreisCt} onChange={(e) => setze("arbeitspreisCt", e.target.value)} />
          </Feld>
          <Feld id={`${id}-ne2`} label="davon Netzentgelt Arbeit (ct/kWh)"><input id={`${id}-ne2`} inputMode="decimal" className={eingabe} value={f.netzentgeltCt} onChange={(e) => setze("netzentgeltCt", e.target.value)} /></Feld>
          <Feld id={`${id}-lp`} label="Leistungspreis (€/kW·a)"><input id={`${id}-lp`} inputMode="decimal" className={eingabe} value={f.leistungspreisEurKwJahr} onChange={(e) => setze("leistungspreisEurKwJahr", e.target.value)} /></Feld>
          <Feld id={`${id}-gp`} label="Grundpreis (€/Monat)"><input id={`${id}-gp`} inputMode="decimal" className={eingabe} value={f.grundpreisEurMonat} onChange={(e) => setze("grundpreisEurMonat", e.target.value)} /></Feld>
          {f.land === "DE" && (
            <>
              <Feld id={`${id}-st`} label="Stromsteuer-Entlastung (produzierendes Gewerbe)">
                <select id={`${id}-st`} className={auswahlfeld} value={f.stromsteuerEntlastung} onChange={(e) => setze("stromsteuerEntlastung", e.target.value)}>
                  <option value="">Nicht bekannt</option>
                  <option value="ja">Ja, beantragt bzw. berechtigt</option>
                  <option value="nein">Nein</option>
                </select>
              </Feld>
              <Feld id={`${id}-19`} label="Individuelles Netzentgelt (§ 19 StromNEV)">
                <select id={`${id}-19`} className={auswahlfeld} value={f.par19} onChange={(e) => setze("par19", e.target.value)}>
                  {Object.entries(PAR19).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Feld>
            </>
          )}
        </div>
      </fieldset>
      <FehlerBox>{fehler}</FehlerBox>
      <div className="flex flex-wrap justify-end gap-2">
        {onAbbrechen && <Button variant="ghost" size="sm" onClick={onAbbrechen}>Abbrechen</Button>}
        <Button type="submit" size="sm" disabled={laeuft}>{laeuft ? "Wird gespeichert …" : "Abnahmestelle speichern"}</Button>
      </div>
    </form>
  );
}

export default function Abnahmestellen({ liste = [] }) {
  const router = useRouter();
  const [bearbeiten, setBearbeiten] = useState(liste.length ? null : "neu");
  const [ok, setOk] = useState("");
  async function loeschen(s) {
    if (!(await bestaetigen({ titel: `Abnahmestelle „${s.bezeichnung}“ löschen?`, text: "Die Abnahmestelle wird dauerhaft entfernt.", bestaetigenText: "Abnahmestelle löschen", gefahr: true }))) return;
    await senden("/api/portal/fach/energie/abnahmestellen", { method: "DELETE", body: { id: s.id } });
    router.refresh();
  }
  return (
    <div className="space-y-4">
      {liste.map((s) =>
        bearbeiten === s.id ? (
          <Formular key={s.id} start={s} onFertig={() => { setBearbeiten(null); setOk("Gespeichert."); }} onAbbrechen={() => setBearbeiten(null)} />
        ) : (
          <article key={s.id} className="rounded-3xl bg-white p-4 ring-1 ring-ink-200/70 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-[16px] font-bold text-ink-900">{s.bezeichnung}</h3>
                <p className="break-all text-[13px] text-ink-600">{s.maloId ? `MaLo ${s.maloId}` : `${s.land === "AT" ? "Zählpunkt" : "Messpunkt"} ${zaehlpunktFormatiert(s.zaehlpunkt)}`}{s.meloId ? ` · MeLo ${zaehlpunktFormatiert(s.meloId)}` : ""}</p>
                <p className="text-[13px] text-ink-500">{MESSARTEN[s.messart]?.kurz} · {Number(s.jahresverbrauchKwh || 0).toLocaleString("de-DE")} kWh/a{s.spitzeKw ? ` · Spitze ${s.spitzeKw.toLocaleString("de-DE")} kW` : ""}{s.netzbetreiber ? ` · ${s.netzbetreiber}` : ""}{s.lieferant ? ` · Lieferant ${s.lieferant}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setBearbeiten(s.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50" aria-label={`${s.bezeichnung} bearbeiten`}><Pencil aria-hidden="true" className="h-4 w-4" /></button>
                <button type="button" onClick={() => loeschen(s)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50" aria-label={`${s.bezeichnung} löschen`}><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
              </div>
            </div>
            {s.hinweise?.length > 0 && <div className="mt-3"><PruefHinweise hinweise={s.hinweise} /></div>}
          </article>
        )
      )}
      {bearbeiten === "neu" ? (
        <Formular onFertig={() => { setBearbeiten(null); setOk("Abnahmestelle angelegt."); }} onAbbrechen={liste.length ? () => setBearbeiten(null) : undefined} />
      ) : (
        <Button size="sm" variant="secondary" icon={Plus} onClick={() => setBearbeiten("neu")}>Abnahmestelle hinzufügen</Button>
      )}
      <ErfolgBox>{ok}</ErfolgBox>
    </div>
  );
}
