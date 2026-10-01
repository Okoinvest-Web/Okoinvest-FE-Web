"use client";

// Gemeinsame Formular-Helfer der Projektentwicklung: Schnellformular aus einer Feldliste, Aktions-Hook (Fehler, Laden,
// Aktualisieren der Server-Seite), Upload an /api/portal/entwicklung/dokumente. Prüfungen passieren serverseitig.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { bestaetigen } from "@/components/ui/Rueckfrage";

export function useAktion() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  async function ausfuehren(fn, { meldung = "", aktualisieren = true } = {}) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      const r = await fn();
      if (meldung) setErfolg(typeof meldung === "function" ? meldung(r) : meldung);
      if (aktualisieren) router.refresh();
      return r;
    } catch (e) {
      setFehler(e.message);
      return null;
    } finally {
      setLaeuft(false);
    }
  }
  return { laeuft, fehler, erfolg, ausfuehren, setFehler, setErfolg, router };
}

export const eintragSenden = (projektId, art, daten, id = null) => senden(`/api/admin/entwicklung/${projektId}/eintraege`, { body: { art, id, daten } });

export async function dateiHochladen(datei, felder) {
  const fd = new FormData();
  fd.append("datei", datei);
  for (const [k, w] of Object.entries(felder)) if (w !== undefined && w !== null) fd.append(k, String(w));
  let res;
  try {
    res = await fetch("/api/portal/entwicklung/dokumente", { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
  } catch {
    throw new Error("Keine Verbindung – bitte prüfen Sie Ihre Internetverbindung.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Fehler ${res.status}`);
  return json;
}

export function Knopf({ laeuft, children, variante = "primaer", className, ...rest }) {
  return (
    <button
      type="submit"
      disabled={laeuft}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors disabled:opacity-60",
        variante === "primaer" ? "bg-ov-600 text-white hover:bg-ov-700" : variante === "navy" ? "bg-navy-700 text-white hover:bg-navy-800" : variante === "gefahr" ? "bg-white text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50" : "bg-white text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50",
        className
      )}
      {...rest}
    >
      {laeuft && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/**
 * Schnellformular: felder [{ name, label, typ: text|zahl|datum|monat|auswahl|mehrzeilig|check|mehrfach, optionen?: [{wert,label}],
 * breit?, hinweis?, pflicht? }], start = Anfangswerte. onSenden(daten) → Promise. Nach Erfolg optional zurücksetzen.
 */
export function SchnellFormular({ felder, start = {}, onSenden, knopf = "Speichern", meldung = "Gespeichert.", zuruecksetzen = false, spalten = 2, children, zusatz }) {
  const basis = useId().replace(/:/g, "");
  const [werte, setWerte] = useState(() => Object.fromEntries(felder.map((f) => [f.name, start[f.name] ?? (f.typ === "check" ? false : f.typ === "mehrfach" ? [] : "")])));
  const a = useAktion();
  const setze = (n, w) => setWerte((x) => ({ ...x, [n]: w }));
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const daten = {};
        for (const f of felder) {
          const w = werte[f.name];
          daten[f.name] = f.typ === "zahl" ? (w === "" ? null : Number(String(w).replace(",", "."))) : w;
        }
        const r = await a.ausfuehren(() => onSenden(daten), { meldung });
        if (r && zuruecksetzen) setWerte(Object.fromEntries(felder.map((f) => [f.name, f.typ === "check" ? false : f.typ === "mehrfach" ? [] : ""])));
      }}
      className="space-y-4"
    >
      <div className={cn("grid gap-4", spalten === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : spalten === 2 ? "sm:grid-cols-2" : "")}>
        {felder.map((f) => {
          const id = `${basis}-${f.name}`;
          const w = werte[f.name];
          if (f.typ === "check") {
            return (
              <label key={f.name} className={cn("flex items-start gap-2.5 text-[14px] text-ink-800", f.breit && "col-span-full")}>
                <input id={id} type="checkbox" checked={!!w} onChange={(e) => setze(f.name, e.target.checked)} className="mt-0.5 h-4 w-4 accent-ov-600" />
                <span>{f.label}{f.hinweis && <span className="block text-[12.5px] text-ink-500">{f.hinweis}</span>}</span>
              </label>
            );
          }
          return (
            <Feld key={f.name} id={id} label={f.label} hinweis={f.hinweis} pflicht={f.pflicht} className={f.breit ? "col-span-full" : ""}>
              {f.typ === "auswahl" ? (
                <select id={id} value={w} onChange={(e) => setze(f.name, e.target.value)} className={auswahlfeld}>
                  {f.leer !== false && <option value="">{f.leer || "– bitte wählen –"}</option>}
                  {f.optionen.map((o) => <option key={o.wert} value={o.wert}>{o.label}</option>)}
                </select>
              ) : f.typ === "mehrfach" ? (
                <select id={id} multiple value={w} onChange={(e) => setze(f.name, [...e.target.selectedOptions].map((o) => o.value))} className={cn(eingabe, "h-32 py-2")}>
                  {f.optionen.map((o) => <option key={o.wert} value={o.wert}>{o.label}</option>)}
                </select>
              ) : f.typ === "mehrzeilig" ? (
                <textarea id={id} value={w} onChange={(e) => setze(f.name, e.target.value)} className={cn(textbereich, "min-h-[88px]")} />
              ) : (
                <input id={id} type={f.typ === "datum" ? "date" : f.typ === "monat" ? "month" : "text"} inputMode={f.typ === "zahl" ? "decimal" : undefined} value={w ?? ""} onChange={(e) => setze(f.name, e.target.value)} className={eingabe} required={f.pflicht} />
              )}
            </Feld>
          );
        })}
      </div>
      {children}
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <div className="flex flex-wrap items-center gap-2">
        <Knopf laeuft={a.laeuft}>{knopf}</Knopf>
        {zusatz}
      </div>
    </form>
  );
}

/** Kleiner Knopf, der eine Aktion ausführt (z. B. Löschen, Übergabe) – optional mit Rückfrage */
export function AktionKnopf({ fn, children, meldung = "", frage = "", variante = "sekundaer", klein = false, className }) {
  const a = useAktion();
  return (
    <span className={cn("inline-flex flex-col gap-2", className)}>
      <button
        type="button"
        disabled={a.laeuft}
        onClick={async () => {
          if (frage && !(await bestaetigen({ titel: frage, bestaetigenText: typeof children === "string" ? children : undefined, gefahr: variante === "gefahr" }))) return;
          await a.ausfuehren(fn, { meldung });
        }}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors disabled:opacity-60",
          klein ? "h-8 px-3 text-[12.5px]" : "h-10 px-4 text-[14px]",
          variante === "primaer" ? "bg-ov-600 text-white hover:bg-ov-700" : variante === "navy" ? "bg-navy-700 text-white hover:bg-navy-800" : variante === "gefahr" ? "text-red-700 hover:bg-red-50" : "bg-white text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"
        )}
      >
        {a.laeuft && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
        {children}
      </button>
      {a.fehler && <span role="alert" className="max-w-xs text-[12.5px] font-medium text-red-700">{a.fehler}</span>}
      {a.erfolg && <span role="status" className="max-w-xs text-[12.5px] font-medium text-ov-800">{a.erfolg}</span>}
    </span>
  );
}

/** Datei-Upload an einen Meilenstein/ins Projekt */
export function Hochladen({ felder, label = "Dokument hochladen", pflichtOptionen = [], mitFreigabe = false }) {
  const a = useAktion();
  const [pflicht, setPflicht] = useState("");
  const [freigabe, setFreigabe] = useState(false);
  const [gutachter, setGutachter] = useState(false);
  const id = useId().replace(/:/g, "");
  return (
    <div className="space-y-2 rounded-2xl bg-sand-50 p-3 ring-1 ring-ink-200/70">
      <div className="flex flex-wrap items-end gap-2">
        {pflichtOptionen.length > 0 && (
          <Feld id={`${id}-p`} label="Dokumentenpflicht" className="min-w-[200px] flex-1">
            <select id={`${id}-p`} value={pflicht} onChange={(e) => setPflicht(e.target.value)} className={cn(auswahlfeld, "h-10")}>
              <option value="">– sonstiges Dokument –</option>
              {pflichtOptionen.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Feld>
        )}
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
          {a.laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
          {label}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="sr-only"
            disabled={a.laeuft}
            onChange={async (e) => {
              const datei = e.target.files?.[0];
              e.target.value = "";
              if (!datei) return;
              await a.ausfuehren(() => dateiHochladen(datei, { ...felder, pflicht, freigabeInvestor: freigabe ? "1" : "", fuerGutachter: gutachter ? "1" : "" }), { meldung: `„${datei.name}“ hochgeladen.` });
            }}
          />
        </label>
      </div>
      {mitFreigabe && (
        <div className="flex flex-wrap gap-4 text-[13px] text-ink-700">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={freigabe} onChange={(e) => setFreigabe(e.target.checked)} className="h-4 w-4 accent-ov-600" />für Co-Investoren freigeben</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={gutachter} onChange={(e) => setGutachter(e.target.checked)} className="h-4 w-4 accent-ov-600" />für zugewiesene Gutachter sichtbar</label>
        </div>
      )}
      <p className="text-[12px] text-ink-500">PDF, JPG oder PNG, höchstens 10 MB.</p>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}
