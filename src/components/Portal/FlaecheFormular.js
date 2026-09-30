"use client";

// Fläche anlegen oder bearbeiten – inkl. Flurstücken. Speichern als Entwurf oder direkt einreichen.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { senden } from "@/lib/plattform/client";
import { BUNDESLAENDER, FLAECHE_NUTZUNG, LAENDER } from "@/lib/plattform/konstanten";
import { FREIFLAECHE } from "@/lib/invest/markt";
import { eingabe, textbereich, auswahlfeld, Feld, FehlerBox } from "./felder";
import { FeldFehler, fehlerText, regeln, useFeldPruefung } from "./Bedienung/pruefung";
// Fachprüfung Flächen: Flurstücke je Land, strukturierte Fachangaben, Pflichtangaben je Nutzung
import FlurstueckeEditor, { leeresFlurstueck } from "./Flaeche/FlurstueckeEditor";
import FachFormular from "./Flaeche/FachFormular";
import { EIGENTUM_FORMEN, NUTZUNG_REIHENFOLGE, fachPflichtFehlt, flurstueckePruefen } from "@/lib/plattform/flaecheFach";

// Inline-Validierung (Bedienung & Onboarding): verständliche Meldungen direkt am Feld
const PRUEFUNG = {
  bezeichnung: [regeln.pflicht("Bitte geben Sie der Fläche einen Namen, z. B. „Acker am Mühlweg“."), regeln.laenge(3, 120, "Die Bezeichnung")],
  plz: [regeln.pflicht("Bitte die Postleitzahl angeben – wir brauchen sie für die Vorprüfung."), (v, alle) => regeln.plz(alle?.land)(v)],
  ort: [regeln.pflicht("Bitte Ort oder Gemeinde angeben.")],
  ha: [regeln.pflicht("Bitte eine ungefähre Größe angeben – eine Schätzung genügt."), regeln.zahl({ min: 0.01, max: 100000, einheit: "ha", was: "Die Größe" })],
};

export default function FlaecheFormular({ flaeche, agriStandard = false, begriffe = {} }) {
  const router = useRouter();
  const id = useId();
  const neu = !flaeche;
  const [f, setF] = useState(() => ({
    bezeichnung: flaeche?.bezeichnung || "",
    land: flaeche?.land || "DE",
    bundesland: flaeche?.bundesland || "",
    plz: flaeche?.plz || "",
    ort: flaeche?.ort || "",
    ha: flaeche?.ha ?? "",
    nutzung: flaeche?.nutzung || "acker",
    agri: flaeche?.agri ?? agriStandard,
    eigentum: flaeche?.eigentum || "eigentum",
    gemarkung: flaeche?.gemarkung || "",
    flurstuecke: flaeche?.flurstuecke?.length ? flaeche.flurstuecke.map((s) => ({ ...leeresFlurstueck(), ...s, m2: s.m2 ?? "" })) : [leeresFlurstueck()],
    fach: flaeche?.fach || {},
    hinweise: flaeche?.hinweise || "",
  }));
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const pruef = useFeldPruefung(PRUEFUNG);

  const setze = (k, v) => {
    const neu = { ...f, [k]: v };
    setF(neu);
    pruef.aendern(k, neu);
  };
  const setzeFach = (bereich, feld, wert) => setF((x) => ({ ...x, fach: { ...x.fach, [bereich]: { ...(x.fach?.[bereich] || {}), [feld]: wert } } }));

  async function speichern(einreichen) {
    // Einreichen braucht alle Pflichtangaben, ein Entwurf nur die Bezeichnung
    if (einreichen ? !pruef.alles(f) : !pruef.pruefe("bezeichnung", f)) {
      setFehler(einreichen ? "Bitte ergänzen Sie die markierten Angaben – dann können wir die Fläche prüfen." : "");
      return;
    }
    // Flurstücksformate je Land und Pflichtangaben je Nutzung schon im Browser prüfen (Server prüft erneut)
    const fs = flurstueckePruefen(f.flurstuecke, f.land);
    if (fs.fehler.length) {
      setFehler(`Flurstück ${fs.fehler[0].index + 1}: ${fs.fehler[0].text}.`);
      return;
    }
    if (einreichen) {
      const fehlt = fachPflichtFehlt({ ...f, flurstuecke: fs.flurstuecke, ha: Number(String(f.ha).replace(",", ".")) });
      if (fehlt.length) {
        setFehler(`Bitte ergänzen: ${fehlt.join(", ")}.`);
        return;
      }
    }
    setLaeuft(true);
    setFehler("");
    try {
      const daten = { ...f, agri: f.nutzung === "dach" ? false : f.agri, flurstuecke: f.flurstuecke };
      if (neu) {
        const r = await senden("/api/portal/flaechen", { body: { ...daten, einreichen } });
        router.push(`/portal/flaechen/${r.flaeche.id}`);
      } else {
        await senden(`/api/portal/flaechen/${flaeche.id}`, { method: "PATCH", body: daten });
        if (einreichen && flaeche.status === "entwurf") await senden("/api/portal/status", { body: { art: "flaeche", id: flaeche.id, nach: "eingegangen" } });
        router.refresh();
      }
    } catch (e) {
      setFehler(fehlerText(e));
    } finally {
      setLaeuft(false);
    }
  }

  const klein = Number(String(f.ha).replace(",", ".")) > 0 && Number(String(f.ha).replace(",", ".")) < FREIFLAECHE.mindestHa && !f.agri;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        speichern(true);
      }}
      className="space-y-6"
    >
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-[16px] font-bold text-ink-900">Lage & Größe</legend>
        <Feld id={`${id}-b`} label="Bezeichnung" pflicht className="sm:col-span-2" hinweis="z. B. „Acker am Mühlweg“ – nur für Sie und uns sichtbar">
          <input id={`${id}-b`} required maxLength={120} className={eingabe} value={f.bezeichnung} onChange={(e) => setze("bezeichnung", e.target.value)} {...pruef.feldProps("bezeichnung", `${id}-b`, f)} />
          <FeldFehler id={`${id}-b`} text={pruef.fehler.bezeichnung} />
        </Feld>
        <Feld id={`${id}-l`} label="Land" pflicht>
          <select id={`${id}-l`} className={auswahlfeld} value={f.land} onChange={(e) => { const neu = { ...f, land: e.target.value, bundesland: "" }; setF(neu); pruef.aendern("plz", neu); }}>
            {Object.entries(LAENDER).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Feld>
        <Feld id={`${id}-bl`} label={f.land === "CH" ? "Kanton" : "Bundesland"}>
          <select id={`${id}-bl`} className={auswahlfeld} value={f.bundesland} onChange={(e) => setze("bundesland", e.target.value)}>
            <option value="">Bitte wählen</option>
            {BUNDESLAENDER[f.land].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </Feld>
        <Feld id={`${id}-p`} label="PLZ" pflicht>
          <input id={`${id}-p`} inputMode="numeric" autoComplete="postal-code" required maxLength={10} className={eingabe} value={f.plz} onChange={(e) => setze("plz", e.target.value)} {...pruef.feldProps("plz", `${id}-p`, f)} />
          <FeldFehler id={`${id}-p`} text={pruef.fehler.plz} />
        </Feld>
        <Feld id={`${id}-o`} label="Ort / Gemeinde" pflicht>
          <input id={`${id}-o`} required maxLength={80} className={eingabe} value={f.ort} onChange={(e) => setze("ort", e.target.value)} {...pruef.feldProps("ort", `${id}-o`, f)} />
          <FeldFehler id={`${id}-o`} text={pruef.fehler.ort} />
        </Feld>
        <Feld id={`${id}-h`} label="Größe in Hektar" pflicht hinweis={klein ? `Für Freiflächen-PV sind in der Regel mindestens ${FREIFLAECHE.mindestHa} ha sinnvoll – mehrere Flächen lassen sich bündeln.` : "Grobe Angabe genügt"}>
          <input id={`${id}-h`} inputMode="decimal" required className={eingabe} value={f.ha} onChange={(e) => setze("ha", e.target.value)} {...pruef.feldProps("ha", `${id}-h`, f)} />
          <FeldFehler id={`${id}-h`} text={pruef.fehler.ha} />
        </Feld>
        <Feld id={`${id}-n`} label="Aktuelle Nutzung">
          <select id={`${id}-n`} className={auswahlfeld} value={f.nutzung} onChange={(e) => setze("nutzung", e.target.value)}>
            {NUTZUNG_REIHENFOLGE.filter((k) => FLAECHE_NUTZUNG[k]).map((k) => (
              <option key={k} value={k}>{FLAECHE_NUTZUNG[k]}</option>
            ))}
          </select>
        </Feld>
        <Feld id={`${id}-e`} label="Eigentumsverhältnis">
          <select id={`${id}-e`} className={auswahlfeld} value={f.eigentum} onChange={(e) => setze("eigentum", e.target.value)}>
            {Object.entries(EIGENTUM_FORMEN).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Feld>
        {f.nutzung !== "dach" && <label className="flex items-start gap-3 self-end rounded-xl bg-sand-50 px-4 py-3 text-[14px] text-ink-700 ring-1 ring-inset ring-ink-200">
          <input type="checkbox" checked={f.agri} onChange={(e) => setze("agri", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#558227]" />
          <span>Landwirtschaftliche Nutzung soll bleiben (Agri-PV)</span>
        </label>}
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-display text-[16px] font-bold text-ink-900">{f.land === "AT" ? "Grundstücke" : f.land === "CH" ? "Parzellen" : "Flurstücke"}</legend>
        <FlurstueckeEditor land={f.land} liste={f.flurstuecke} onChange={(liste) => setF((x) => ({ ...x, flurstuecke: liste }))} ha={f.ha} />
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-display text-[16px] font-bold text-ink-900">Fachangaben</legend>
        <p className="mb-3 text-[13.5px] leading-relaxed text-ink-500">Je vollständiger, desto verbindlicher unsere Vorprüfung. Mit * markierte Angaben brauchen wir zum Einreichen; alles andere können Sie später ergänzen.</p>
        <FachFormular f={f} setze={setzeFach} begriffe={begriffe} />
      </fieldset>

      <Feld id={`${id}-hi`} label="Hinweise" hinweis="z. B. Hofstelle, Leitungen, Wege, Pachtverhältnisse, Wünsche">
        <textarea id={`${id}-hi`} rows={4} maxLength={3000} className={textbereich} value={f.hinweise} onChange={(e) => setze("hinweise", e.target.value)} />
      </Feld>

      <FehlerBox>{fehler}</FehlerBox>
      <div className="flex flex-col gap-3 sm:flex-row">
        {(neu || flaeche.status === "entwurf") && (
          <Button type="submit" disabled={laeuft} pfeil>
            {laeuft ? "Wird gespeichert …" : "Speichern & zur Prüfung einreichen"}
          </Button>
        )}
        <Button variant={neu || flaeche.status === "entwurf" ? "secondary" : "primary"} disabled={laeuft} onClick={() => speichern(false)}>
          {neu ? "Als Entwurf speichern" : "Änderungen speichern"}
        </Button>
      </div>
    </form>
  );
}
