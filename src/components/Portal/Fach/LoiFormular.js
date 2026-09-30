"use client";

// Strukturierte Absichtserklärung (LOI) des Investors – Preisbasis (Gesamt, €/kWp, Enterprise Value mit Überleitung
// zum Eigenkapitalwert), Transaktions- und Zahlungsstruktur, Bedingungen, Finanzierung, Exklusivität, Gültigkeit.
// Übergang interesse → loi_abgegeben über /api/portal/status; Prüfung serverseitig (fach/loi.js).

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSignature } from "lucide-react";
import Button from "@/components/ui/Button";
import { Chip, ErfolgBox, Feld, FehlerBox, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { LOI_BEDINGUNGEN, LOI_FINANZIERUNG, LOI_MAX_MONATE, LOI_PREISBASIS, LOI_STRUKTUR, LOI_ZAHLUNG } from "@/lib/plattform/fach/loi";

const zahl = (x) => Number(String(x ?? "").replace(/\s/g, "").replace(",", "."));
const eur = (x) => (Number.isFinite(x) && x > 0 ? `${Math.round(x).toLocaleString("de-DE")} €` : "–");

export default function LoiFormular({ interesseId, mwp = 0, vorschlag = null }) {
  const id = useId();
  const router = useRouter();
  const inDreissig = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const max = new Date();
  max.setMonth(max.getMonth() + LOI_MAX_MONATE);
  const [l, setL] = useState({
    preisbasis: vorschlag?.preisProKwp ? "proKwp" : "gesamt",
    betrag: vorschlag?.betrag ? String(vorschlag.betrag) : "",
    preisProKwp: vorschlag?.preisProKwp ? String(vorschlag.preisProKwp) : "",
    enterpriseValue: "",
    nettoschulden: "",
    transaktion: "",
    zahlung: "einmal",
    zahlungDetails: "",
    bedingungenListe: ["dd", "gremien"],
    finanzierung: "",
    exklusivitaetWochen: "8",
    gueltigBis: inDreissig,
    text: "",
    bedingungen: "",
  });
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const setze = (k, v) => setL((x) => ({ ...x, [k]: v }));
  const kwp = (Number(mwp) || 0) * 1000;
  const eigenkapital = useMemo(() => {
    if (l.preisbasis === "proKwp") return zahl(l.preisProKwp) * kwp;
    if (l.preisbasis === "ev") return zahl(l.enterpriseValue) - (zahl(l.nettoschulden) || 0);
    return zahl(l.betrag);
  }, [l, kwp]);

  async function absenden(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      await senden("/api/portal/status", { body: { art: "interesse", id: interesseId, nach: "loi_abgegeben", extra: { loi: { ...l, struktur: true } } } });
      setOk("Ihre Absichtserklärung ist abgegeben. Das Backoffice meldet sich mit der Rückmeldung des Anbieters.");
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  const umschalten = (b) =>
    setL((x) => {
      let liste = x.bedingungenListe.includes(b) ? x.bedingungenListe.filter((y) => y !== b) : [...x.bedingungenListe, b];
      if (b === "keine" && liste.includes("keine")) liste = ["keine"];
      else liste = liste.filter((y) => y !== "keine" || b === "keine");
      return { ...x, bedingungenListe: liste };
    });

  return (
    <form onSubmit={absenden} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Preisbasis *</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(LOI_PREISBASIS).map(([k, v]) => (
            <Chip key={k} type="radio" name={`${id}-pb`} value={k} checked={l.preisbasis === k} onChange={() => setze("preisbasis", k)}>{v.replace(/ \(.*\)$/, "")}</Chip>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        {l.preisbasis === "gesamt" && (
          <Feld id={`${id}-b`} label="Kaufpreis gesamt (€)" pflicht>
            <input id={`${id}-b`} inputMode="decimal" required className={eingabe} value={l.betrag} onChange={(e) => setze("betrag", e.target.value)} />
          </Feld>
        )}
        {l.preisbasis === "proKwp" && (
          <Feld id={`${id}-k`} label="Preis je kWp (€/kWp)" pflicht hinweis={kwp ? `entspricht ${eur(eigenkapital)} bei ${mwp.toLocaleString("de-DE")} MWp` : undefined}>
            <input id={`${id}-k`} inputMode="decimal" required className={eingabe} value={l.preisProKwp} onChange={(e) => setze("preisProKwp", e.target.value)} />
          </Feld>
        )}
        {l.preisbasis === "ev" && (
          <>
            <Feld id={`${id}-ev`} label="Enterprise Value (€)" pflicht hinweis="Unternehmenswert der Projektgesellschaft, cash-/debt-free">
              <input id={`${id}-ev`} inputMode="decimal" required className={eingabe} value={l.enterpriseValue} onChange={(e) => setze("enterpriseValue", e.target.value)} />
            </Feld>
            <Feld id={`${id}-ns`} label="Nettofinanzverbindlichkeiten (€)" hinweis={`Eigenkapitalwert (Kaufpreis Anteile): ${eur(eigenkapital)}`}>
              <input id={`${id}-ns`} inputMode="decimal" className={eingabe} value={l.nettoschulden} onChange={(e) => setze("nettoschulden", e.target.value)} />
            </Feld>
          </>
        )}
        <Feld id={`${id}-tr`} label="Transaktionsstruktur" pflicht>
          <select id={`${id}-tr`} required className={auswahlfeld} value={l.transaktion} onChange={(e) => setze("transaktion", e.target.value)}>
            <option value="">– bitte wählen –</option>
            {Object.entries(LOI_STRUKTUR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-za`} label="Zahlungsstruktur" pflicht>
          <select id={`${id}-za`} className={auswahlfeld} value={l.zahlung} onChange={(e) => setze("zahlung", e.target.value)}>
            {Object.entries(LOI_ZAHLUNG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        {l.zahlung !== "einmal" && (
          <Feld id={`${id}-zd`} label="Meilensteine bzw. Earn-out" pflicht className="sm:col-span-2">
            <input id={`${id}-zd`} required minLength={10} className={eingabe} placeholder="z. B. 30 % bei Signing, 70 % bei RTB" value={l.zahlungDetails} onChange={(e) => setze("zahlungDetails", e.target.value)} />
          </Feld>
        )}
        <Feld id={`${id}-fi`} label="Finanzierung des Kaufs" pflicht>
          <select id={`${id}-fi`} required className={auswahlfeld} value={l.finanzierung} onChange={(e) => setze("finanzierung", e.target.value)}>
            <option value="">– bitte wählen –</option>
            {Object.entries(LOI_FINANZIERUNG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-ex`} label="Exklusivität (Wochen)" hinweis="Üblich 6–12 Wochen für die Due Diligence">
          <input id={`${id}-ex`} inputMode="numeric" className={eingabe} value={l.exklusivitaetWochen} onChange={(e) => setze("exklusivitaetWochen", e.target.value)} />
        </Feld>
        <Feld id={`${id}-gb`} label="Gültig bis" pflicht hinweis={`höchstens ${LOI_MAX_MONATE} Monate`}>
          <input id={`${id}-gb`} type="date" required min={new Date().toISOString().slice(0, 10)} max={max.toISOString().slice(0, 10)} className={eingabe} value={l.gueltigBis} onChange={(e) => setze("gueltigBis", e.target.value)} />
        </Feld>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Aufschiebende Bedingungen *</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(LOI_BEDINGUNGEN).map(([k, v]) => (
            <Chip key={k} value={k} checked={l.bedingungenListe.includes(k)} onChange={() => umschalten(k)}>{v}</Chip>
          ))}
        </div>
      </fieldset>
      <Feld id={`${id}-t`} label="Inhalt der Absichtserklärung" pflicht hinweis="Kurz: Interesse, Annahmen, nächste Schritte. Unverbindlich bis zum Kaufvertrag (SPA).">
        <textarea id={`${id}-t`} rows={4} required minLength={10} maxLength={3000} className={textbereich} value={l.text} onChange={(e) => setze("text", e.target.value)} />
      </Feld>
      <Feld id={`${id}-bd`} label="Weitere Bedingungen (optional)">
        <textarea id={`${id}-bd`} rows={2} maxLength={2000} className={textbereich} value={l.bedingungen} onChange={(e) => setze("bedingungen", e.target.value)} />
      </Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{ok}</ErfolgBox>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-ink-500">Indikativer Eigenkapitalwert: <span className="ov-num font-semibold text-ink-900">{eur(eigenkapital)}</span>{kwp && eigenkapital > 0 ? ` · ${Math.round(eigenkapital / kwp).toLocaleString("de-DE")} €/kWp` : ""}</p>
        <Button type="submit" disabled={laeuft || !!ok} icon={FileSignature}>{laeuft ? "Wird abgegeben …" : "LOI abgeben"}</Button>
      </div>
    </form>
  );
}
