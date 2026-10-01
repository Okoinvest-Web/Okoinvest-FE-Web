"use client";

// Knöpfe für die erlaubten Statuswechsel eines Objekts – abgeleitet aus
// src/lib/plattform/prozesse.js. Pflichtangaben (Grund, Pachtangebot, Provisionssatz,
// Kaufpreis, LOI …) werden abgefragt. Entscheidend ist die Prüfung auf dem Server.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { erlaubteUebergaenge } from "@/lib/plattform/prozesse";
import { senden } from "@/lib/plattform/client";
import { PROVISION } from "@/lib/invest/markt";
import { eingabe, textbereich, auswahlfeld, Feld, FehlerBox, ErfolgBox } from "./felder";
import PachtangebotFelder from "./Flaeche/PachtangebotFelder"; // Fachprüfung Flächen: vollständiges Pachtangebot
import ErfolgsHaken from "@/components/ui/ErfolgsHaken"; // T3: Prüfschritt + Erfolgsmoment je Übergang
import { ArrowRight } from "lucide-react";

const NEGATIV = ["abgelehnt", "zurueckgezogen", "storniert"];

// T3 (nur Darstellung): `bestaetigung` je Zielstatus, z. B.
//   { vertrag: { titel, zusammenfassung: [[Label, Wert]…], pruefText, knopf, ton: "dunkel",
//                erfolg: { titel, text, aktion: "Status ansehen" } } }
// → Eckdaten + Pflicht-Häkchen vor dem Absenden, danach Erfolgsmoment mit genau einer nächsten Aktion.
export default function StatusAktionen({ art, id, status, als = "admin", kontext = {}, className, leerText, bestaetigung = {} }) {
  const router = useRouter();
  const fid = useId();
  const uebergaenge = erlaubteUebergaenge(art, status, als);
  const [gewaehlt, setGewaehlt] = useState(null);
  const [werte, setWerte] = useState({});
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [geprueft, setGeprueft] = useState(false);
  const [moment, setMoment] = useState(null); // Erfolgsmoment (bestaetigung.erfolg)

  if (moment) {
    const dunkel = moment.ton === "dunkel";
    return (
      <div role="status" className={cn("animate-ov-auftauchen flex flex-col items-start gap-3 rounded-2xl p-4 ring-1", dunkel ? "bg-white/[0.06] ring-white/15" : "bg-ov-50 ring-ov-200", className)}>
        <div className="flex items-center gap-3">
          <ErfolgsHaken groesse={44} ton={dunkel ? "hell" : "marke"} />
          <p className={cn("font-display text-[17px] font-bold", dunkel ? "text-white" : "text-ink-900")}>{moment.titel}</p>
        </div>
        {moment.text && <p className={cn("max-w-md text-[14px] leading-relaxed", dunkel ? "text-white/75" : "text-ink-700")}>{moment.text}</p>}
        <Button size="sm" onClick={() => router.refresh()}>
          {moment.aktion || "Weiter"} <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!uebergaenge.length) return leerText ? <p className="text-[14px] text-ink-500">{leerText}</p> : null;

  const setze = (k, v) => setWerte((w) => ({ ...w, [k]: v }));

  function oeffnen(u) {
    setFehler("");
    setErfolg("");
    setGewaehlt(u);
    setGeprueft(false);
    const start = {};
    if (u.pflicht?.includes("pachtangebot")) start.pa = { ...(kontext.pachtVorschlag || {}) };
    if (u.pflicht?.includes("provisionSatz")) start.provisionSatz = String(PROVISION.verkaeufer.min * 100).replace(".", ",");
    if (u.pflicht?.includes("interesseId")) start.interesseId = kontext.interessenten?.[0]?.id || "";
    setWerte(start);
  }

  async function ausfuehren(e) {
    e?.preventDefault();
    setLaeuft(true);
    setFehler("");
    const u = gewaehlt;
    const extra = {};
    if (werte.kommentar) extra.kommentar = werte.kommentar;
    if (u.pflicht?.includes("grund")) extra.grund = werte.grund || "";
    if (u.pflicht?.includes("pachtangebot")) extra.pachtangebot = { ...(werte.pa || {}) };
    if (u.pflicht?.includes("provisionSatz")) extra.provisionSatz = werte.provisionSatz;
    if (u.pflicht?.includes("interesseId")) extra.interesseId = werte.interesseId;
    if (u.pflicht?.includes("kaufpreis")) extra.kaufpreis = werte.kaufpreis;
    if (u.pflicht?.includes("loi")) extra.loi = { betrag: werte.loiBetrag, text: werte.loiText, bedingungen: werte.loiBedingungen, gueltigBis: werte.loiGueltig };
    try {
      await senden(als === "admin" ? "/api/admin/status" : "/api/portal/status", { body: { art, id, nach: u.nach, extra } });
      const b = bestaetigung[u.nach];
      setGewaehlt(null);
      if (b?.erfolg) {
        // Erfolgsmoment bleibt stehen, bis die nächste Aktion gewählt wird (die lädt die Seite neu)
        setMoment({ ...b.erfolg, ton: b.ton });
        return;
      }
      setErfolg(`Erledigt: ${u.aktion}.`);
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  const p = gewaehlt?.pflicht || [];
  const best = gewaehlt ? bestaetigung[gewaehlt.nach] : null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {uebergaenge.map((u, i) => {
          const neg = NEGATIV.includes(u.nach) || /zurück/i.test(u.aktion);
          return (
            <Button
              key={`${u.nach}-${i}`}
              size="sm"
              variant={gewaehlt === u ? "navy" : neg ? "secondary" : "primary"}
              onClick={() => (gewaehlt === u ? setGewaehlt(null) : oeffnen(u))}
              aria-expanded={gewaehlt === u}
              aria-controls={`${fid}-form`}
            >
              {u.aktion}
            </Button>
          );
        })}
      </div>

      {gewaehlt && (
        <form id={`${fid}-form`} onSubmit={ausfuehren} className="space-y-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/70">
          <p className="text-[14px] font-semibold text-ink-900">{best?.titel || gewaehlt.aktion}</p>

          {best?.zusammenfassung?.length > 0 && (
            <dl className="grid gap-x-5 gap-y-3 rounded-xl bg-white p-4 ring-1 ring-ink-200/70 sm:grid-cols-2">
              {best.zusammenfassung.map(([label, wert]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[12.5px] font-medium text-ink-500">{label}</dt>
                  <dd className="mt-0.5 text-[14.5px] font-semibold text-ink-900">{wert}</dd>
                </div>
              ))}
            </dl>
          )}
          {best?.pruefText && (
            <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug text-ink-800">
              <input type="checkbox" required checked={geprueft} onChange={(e) => setGeprueft(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded accent-ov-600" />
              <span>{best.pruefText}</span>
            </label>
          )}

          {p.includes("pachtangebot") && <PachtangebotFelder werte={werte.pa || {}} setze={(k, v) => setWerte((w) => ({ ...w, pa: { ...(w.pa || {}), [k]: v } }))} />}

          {p.includes("provisionSatz") && (
            <Feld id={`${fid}-ps`} label="Provisionssatz in %" pflicht hinweis={`Vereinbart: ${PROVISION.verkaeufer.text}. Erlaubt ${String(PROVISION.verkaeufer.min * 100).replace(".", ",")}–${PROVISION.verkaeufer.max * 100} %.`}>
              <input id={`${fid}-ps`} inputMode="decimal" required className={cn(eingabe, "max-w-[180px]")} value={werte.provisionSatz ?? ""} onChange={(e) => setze("provisionSatz", e.target.value)} />
            </Feld>
          )}

          {p.includes("interesseId") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Feld id={`${fid}-k`} label="Käufer (Interessent mit Datenraum)" pflicht>
                <select id={`${fid}-k`} required className={auswahlfeld} value={werte.interesseId ?? ""} onChange={(e) => setze("interesseId", e.target.value)}>
                  {!kontext.interessenten?.length && <option value="">Kein berechtigter Interessent</option>}
                  {kontext.interessenten?.map((i) => (
                    <option key={i.id} value={i.id}>{i.label}</option>
                  ))}
                </select>
              </Feld>
              <Feld id={`${fid}-kp`} label="Kaufpreis in €" pflicht>
                <input id={`${fid}-kp`} inputMode="decimal" required className={eingabe} value={werte.kaufpreis ?? ""} onChange={(e) => setze("kaufpreis", e.target.value)} />
              </Feld>
            </div>
          )}

          {p.includes("loi") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Feld id={`${fid}-lb`} label="Indikativer Kaufpreis in €" hinweis="Optional – unverbindlich">
                <input id={`${fid}-lb`} inputMode="decimal" className={eingabe} value={werte.loiBetrag ?? ""} onChange={(e) => setze("loiBetrag", e.target.value)} />
              </Feld>
              <Feld id={`${fid}-lg`} label="Gültig bis">
                <input id={`${fid}-lg`} type="date" className={eingabe} value={werte.loiGueltig ?? ""} onChange={(e) => setze("loiGueltig", e.target.value)} />
              </Feld>
              <Feld id={`${fid}-lt`} label="Absichtserklärung" pflicht className="sm:col-span-2" hinweis="Struktur (Share/Asset Deal), Zeitplan, Finanzierung">
                <textarea id={`${fid}-lt`} rows={4} required minLength={10} className={textbereich} value={werte.loiText ?? ""} onChange={(e) => setze("loiText", e.target.value)} />
              </Feld>
              <Feld id={`${fid}-lc`} label="Bedingungen" className="sm:col-span-2">
                <textarea id={`${fid}-lc`} rows={2} className={textbereich} value={werte.loiBedingungen ?? ""} onChange={(e) => setze("loiBedingungen", e.target.value)} />
              </Feld>
            </div>
          )}

          {p.includes("grund") ? (
            <Feld id={`${fid}-g`} label="Begründung (sieht der Nutzer)" pflicht>
              <textarea id={`${fid}-g`} rows={3} required className={textbereich} value={werte.grund ?? ""} onChange={(e) => setze("grund", e.target.value)} />
            </Feld>
          ) : (
            (als === "admin" || p.includes("kommentar")) && (
              <Feld id={`${fid}-c`} label={p.includes("kommentar") ? "Kommentar (sieht der Nutzer)" : "Kommentar an den Nutzer (optional)"} pflicht={p.includes("kommentar")}>
                <textarea id={`${fid}-c`} rows={2} required={p.includes("kommentar")} className={textbereich} value={werte.kommentar ?? ""} onChange={(e) => setze("kommentar", e.target.value)} />
              </Feld>
            )
          )}

          <FehlerBox>{fehler}</FehlerBox>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={laeuft} icon={laeuft ? Loader2 : undefined}>
              {laeuft ? "Wird gespeichert …" : best?.knopf || "Bestätigen"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setGewaehlt(null)}>
              Abbrechen
            </Button>
          </div>
        </form>
      )}
      {!gewaehlt && fehler && <FehlerBox>{fehler}</FehlerBox>}
      <ErfolgBox>{erfolg}</ErfolgBox>
    </div>
  );
}
