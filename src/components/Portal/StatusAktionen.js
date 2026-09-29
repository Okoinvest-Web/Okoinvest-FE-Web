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

const NEGATIV = ["abgelehnt", "zurueckgezogen", "storniert"];

export default function StatusAktionen({ art, id, status, als = "admin", kontext = {}, className, leerText }) {
  const router = useRouter();
  const fid = useId();
  const uebergaenge = erlaubteUebergaenge(art, status, als);
  const [gewaehlt, setGewaehlt] = useState(null);
  const [werte, setWerte] = useState({});
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");

  if (!uebergaenge.length) return leerText ? <p className="text-[14px] text-ink-500">{leerText}</p> : null;

  const setze = (k, v) => setWerte((w) => ({ ...w, [k]: v }));

  function oeffnen(u) {
    setFehler("");
    setErfolg("");
    setGewaehlt(u);
    const start = {};
    if (u.pflicht?.includes("pachtangebot")) Object.assign(start, { euroProHaJahr: kontext.pachtVorschlag?.euroProHaJahr ?? "", laufzeitJahre: kontext.pachtVorschlag?.laufzeitJahre ?? "", verlaengerung: kontext.pachtVorschlag?.verlaengerung ?? "" });
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
    if (u.pflicht?.includes("pachtangebot")) extra.pachtangebot = { euroProHaJahr: werte.euroProHaJahr, laufzeitJahre: werte.laufzeitJahre, verlaengerung: werte.verlaengerung, text: werte.pachtText };
    if (u.pflicht?.includes("provisionSatz")) extra.provisionSatz = werte.provisionSatz;
    if (u.pflicht?.includes("interesseId")) extra.interesseId = werte.interesseId;
    if (u.pflicht?.includes("kaufpreis")) extra.kaufpreis = werte.kaufpreis;
    if (u.pflicht?.includes("loi")) extra.loi = { betrag: werte.loiBetrag, text: werte.loiText, bedingungen: werte.loiBedingungen, gueltigBis: werte.loiGueltig };
    try {
      await senden(als === "admin" ? "/api/admin/status" : "/api/portal/status", { body: { art, id, nach: u.nach, extra } });
      setErfolg(`Erledigt: ${u.aktion}.`);
      setGewaehlt(null);
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  const p = gewaehlt?.pflicht || [];

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
          <p className="text-[14px] font-semibold text-ink-900">{gewaehlt.aktion}</p>

          {p.includes("pachtangebot") && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Feld id={`${fid}-e`} label="Pacht €/ha und Jahr" pflicht>
                <input id={`${fid}-e`} inputMode="decimal" required className={eingabe} value={werte.euroProHaJahr ?? ""} onChange={(e) => setze("euroProHaJahr", e.target.value)} />
              </Feld>
              <Feld id={`${fid}-l`} label="Laufzeit (Jahre)" pflicht>
                <input id={`${fid}-l`} inputMode="numeric" required className={eingabe} value={werte.laufzeitJahre ?? ""} onChange={(e) => setze("laufzeitJahre", e.target.value)} />
              </Feld>
              <Feld id={`${fid}-v`} label="Verlängerung">
                <input id={`${fid}-v`} className={eingabe} value={werte.verlaengerung ?? ""} onChange={(e) => setze("verlaengerung", e.target.value)} />
              </Feld>
              <Feld id={`${fid}-pt`} label="Erläuterung zum Angebot" className="sm:col-span-3">
                <textarea id={`${fid}-pt`} rows={3} className={textbereich} value={werte.pachtText ?? ""} onChange={(e) => setze("pachtText", e.target.value)} />
              </Feld>
            </div>
          )}

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
              {laeuft ? "Wird gespeichert …" : "Bestätigen"}
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
