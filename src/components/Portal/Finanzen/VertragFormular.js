"use client";

// src/components/Portal/Finanzen/VertragFormular.js – Pachtvertrag anlegen/ändern (Backoffice, Bereich „finanzen“ schreiben)

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { eingabe, auswahlfeld, labelKlasse, FehlerBox, ErfolgBox } from "@/components/Portal/felder";
import { BEGINN_ARTEN, INDEX_REIHEN, PACHT_OBJEKTE, PACHTMODELLE, PACHTVERTRAG_STATUS, RHYTHMEN, ZAHLWEISEN } from "@/lib/plattform/finanzen/konstanten";
import { steuerVorschlag, STEUERVORLAGEN } from "@/lib/plattform/finanzen/steuer";

const leer = {
  eigentuemerId: "", bezeichnung: "", objektArt: "flaeche", land: "DE", flaecheHa: "", flaecheId: "", anlageId: "", gesellschaftId: "", modell: "indexiert",
  pachtJahr: "", index: { reihe: "VPI-DE-2020", basisJahr: new Date().getFullYear() - 1, schwellePct: 0, anteilPct: 100, nurErhoehung: false },
  umsatz: { anteil: 5, erloesCtKwh: "", mindestJahr: "" }, reservierungJahr: "", vertragsdatum: "", beginnArt: "inbetriebnahme", beginn: "", laufzeitJahre: 30,
  faelligkeit: "jaehrlich", zahlweise: "vorschuessig", zahlungszielTage: 14, steuervorlage: "", steuerOption: false, kleinunternehmer: false, status: "entwurf", bemerkung: "",
};

function Feld({ id, label, children, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className={labelKlasse}>{label}</label>
      {children}
    </div>
  );
}

export default function VertragFormular({ auswahl, vertrag = null, onFertig }) {
  const router = useRouter();
  const [d, setD] = useState(() => (vertrag ? { ...leer, ...vertrag, index: { ...leer.index, ...(vertrag.index || {}) }, umsatz: vertrag.umsatz ? { ...vertrag.umsatz, anteil: vertrag.umsatz.anteil * 100 } : leer.umsatz, flaecheId: vertrag.flaecheId || "", anlageId: vertrag.anlageId || "", gesellschaftId: vertrag.gesellschaftId || "" } : leer));
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [meldung, setMeldung] = useState("");
  const setze = (k, w) => setD((x) => ({ ...x, [k]: w }));
  const f = (k) => (e) => setze(k, e.target.type === "checkbox" ? e.target.checked : e.target.value);
  const fi = (k) => (e) => setD((x) => ({ ...x, index: { ...x.index, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value } }));
  const fu = (k) => (e) => setD((x) => ({ ...x, umsatz: { ...x.umsatz, [k]: e.target.value } }));
  const flaechen = useMemo(() => auswahl.flaechen.filter((x) => x.nutzerId === d.eigentuemerId), [auswahl.flaechen, d.eigentuemerId]);
  const vorschlag = steuerVorschlag("pacht", d.land, { option: d.steuerOption, kleinunternehmer: d.kleinunternehmer });

  async function speichern(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    setMeldung("");
    try {
      const daten = { ...d, flaecheId: d.flaecheId || null, anlageId: d.anlageId || null, index: d.modell === "indexiert" ? d.index : null, umsatz: d.modell === "umsatz" ? d.umsatz : null };
      if (vertrag) await senden(`/api/admin/finanzen/pachtvertraege/${vertrag.id}`, { method: "PATCH", body: { daten } });
      else await senden("/api/admin/finanzen/pachtvertraege", { body: { daten } });
      setMeldung(vertrag ? "Pachtvertrag gespeichert." : "Pachtvertrag angelegt.");
      if (!vertrag) setD(leer);
      router.refresh();
      onFertig?.();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-5">
      <fieldset className="grid gap-3 md:grid-cols-3">
        <legend className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">Vertragspartner und Objekt</legend>
        <Feld id="pv-eig" label="Eigentümer (Konto)">
          <select id="pv-eig" className={auswahlfeld} value={d.eigentuemerId} onChange={f("eigentuemerId")} required>
            <option value="">Bitte wählen</option>
            {auswahl.eigentuemer.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </Feld>
        <Feld id="pv-bez" label="Bezeichnung" className="md:col-span-2">
          <input id="pv-bez" className={eingabe} value={d.bezeichnung} onChange={f("bezeichnung")} required minLength={3} />
        </Feld>
        <Feld id="pv-obj" label="Objekt">
          <select id="pv-obj" className={auswahlfeld} value={d.objektArt} onChange={f("objektArt")}>
            {Object.entries(PACHT_OBJEKTE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Feld>
        <Feld id="pv-land" label="Land der Fläche">
          <select id="pv-land" className={auswahlfeld} value={d.land} onChange={(e) => setD((x) => ({ ...x, land: e.target.value, index: { ...x.index, reihe: e.target.value === "DE" ? "VPI-DE-2020" : e.target.value === "CH" ? "LIK-CH-2020" : "VPI-AT-2020" } }))}>
            <option value="DE">Deutschland</option><option value="AT">Österreich</option><option value="CH">Schweiz</option>
          </select>
        </Feld>
        <Feld id="pv-ha" label="Fläche (ha)">
          <input id="pv-ha" inputMode="decimal" className={eingabe} value={d.flaecheHa} onChange={f("flaecheHa")} />
        </Feld>
        <Feld id="pv-fl" label="Fläche im Portal (optional)">
          <select id="pv-fl" className={auswahlfeld} value={d.flaecheId} onChange={f("flaecheId")}>
            <option value="">– keine –</option>
            {flaechen.map((x) => <option key={x.id} value={x.id}>{x.bezeichnung}</option>)}
          </select>
        </Feld>
        <Feld id="pv-anl" label="Anlage (Umsatzbeteiligung)">
          <select id="pv-anl" className={auswahlfeld} value={d.anlageId} onChange={f("anlageId")}>
            <option value="">– keine –</option>
            {auswahl.anlagen.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Feld>
        <Feld id="pv-ges" label="Pächter (Gesellschaft)">
          <select id="pv-ges" className={auswahlfeld} value={d.gesellschaftId} onChange={f("gesellschaftId")}>
            <option value="">Standard (ÖkoInvest GmbH bzw. Eigentümergesellschaft der Anlage)</option>
            {(auswahl.gesellschaften || []).filter((g) => g.spv).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Feld>
      </fieldset>

      <fieldset className="grid gap-3 md:grid-cols-4">
        <legend className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">Pachtmodell</legend>
        <Feld id="pv-modell" label="Modell">
          <select id="pv-modell" className={auswahlfeld} value={d.modell} onChange={f("modell")}>
            {Object.entries(PACHTMODELLE).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </Feld>
        {d.modell !== "umsatz" && (
          <Feld id="pv-jahr" label="Jahrespacht (€)">
            <input id="pv-jahr" inputMode="decimal" className={eingabe} value={d.pachtJahr} onChange={f("pachtJahr")} required />
          </Feld>
        )}
        {d.modell === "indexiert" && (
          <>
            <Feld id="pv-reihe" label="Index">
              <select id="pv-reihe" className={auswahlfeld} value={d.index.reihe} onChange={fi("reihe")}>
                {Object.entries(INDEX_REIHEN).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
              </select>
            </Feld>
            <Feld id="pv-basis" label="Basisjahr">
              <input id="pv-basis" type="number" className={eingabe} value={d.index.basisJahr} onChange={fi("basisJahr")} required />
            </Feld>
            <Feld id="pv-schwelle" label="Schwelle (%)">
              <input id="pv-schwelle" inputMode="decimal" className={eingabe} value={d.index.schwellePct} onChange={fi("schwellePct")} />
            </Feld>
            <Feld id="pv-anteil" label="Weitergabe (%)">
              <input id="pv-anteil" inputMode="decimal" className={eingabe} value={d.index.anteilPct} onChange={fi("anteilPct")} />
            </Feld>
            <label className="flex items-center gap-2 self-end pb-3 text-[14px] text-ink-700 md:col-span-2">
              <input type="checkbox" checked={!!d.index.nurErhoehung} onChange={fi("nurErhoehung")} className="h-4 w-4 accent-ov-600" />
              nur Erhöhungen (in DE nach Preisklauselgesetz rechtlich prüfen)
            </label>
          </>
        )}
        {d.modell === "umsatz" && (
          <>
            <Feld id="pv-uanteil" label="Umsatzanteil (%)">
              <input id="pv-uanteil" inputMode="decimal" className={eingabe} value={d.umsatz.anteil} onChange={fu("anteil")} required />
            </Feld>
            <Feld id="pv-erloes" label="Erlös (ct/kWh)">
              <input id="pv-erloes" inputMode="decimal" className={eingabe} value={d.umsatz.erloesCtKwh} onChange={fu("erloesCtKwh")} required />
            </Feld>
            <Feld id="pv-mindest" label="Mindestpacht (€/Jahr)">
              <input id="pv-mindest" inputMode="decimal" className={eingabe} value={d.umsatz.mindestJahr} onChange={fu("mindestJahr")} />
            </Feld>
          </>
        )}
        <Feld id="pv-res" label="Reservierungsprämie (€/Jahr)">
          <input id="pv-res" inputMode="decimal" className={eingabe} value={d.reservierungJahr} onChange={f("reservierungJahr")} />
        </Feld>
      </fieldset>

      <fieldset className="grid gap-3 md:grid-cols-4">
        <legend className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">Laufzeit und Zahlung</legend>
        <Feld id="pv-vdat" label="Vertragsdatum"><input id="pv-vdat" type="date" className={eingabe} value={d.vertragsdatum} onChange={f("vertragsdatum")} required /></Feld>
        <Feld id="pv-bart" label="Pachtbeginn ab">
          <select id="pv-bart" className={auswahlfeld} value={d.beginnArt} onChange={f("beginnArt")}>
            {Object.entries(BEGINN_ARTEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Feld>
        <Feld id="pv-beginn" label="Beginn (sobald bekannt)"><input id="pv-beginn" type="date" className={eingabe} value={d.beginn} onChange={f("beginn")} /></Feld>
        <Feld id="pv-lz" label="Laufzeit (Jahre)"><input id="pv-lz" type="number" min="1" max="60" className={eingabe} value={d.laufzeitJahre} onChange={f("laufzeitJahre")} required /></Feld>
        <Feld id="pv-rh" label="Fälligkeit">
          <select id="pv-rh" className={auswahlfeld} value={d.faelligkeit} onChange={f("faelligkeit")}>
            {Object.entries(RHYTHMEN).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
          </select>
        </Feld>
        <Feld id="pv-zw" label="Zahlweise">
          <select id="pv-zw" className={auswahlfeld} value={d.zahlweise} onChange={f("zahlweise")}>
            {Object.entries(ZAHLWEISEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Feld>
        <Feld id="pv-ziel" label="Zahlungsziel (Tage)"><input id="pv-ziel" type="number" min="0" max="90" className={eingabe} value={d.zahlungszielTage} onChange={f("zahlungszielTage")} /></Feld>
        <Feld id="pv-status" label="Status">
          <select id="pv-status" className={auswahlfeld} value={d.status} onChange={f("status")}>
            {Object.entries(PACHTVERTRAG_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </Feld>
      </fieldset>

      <fieldset className="grid gap-3 md:grid-cols-3">
        <legend className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">Umsatzsteuer (Vorschlag – mit Steuerberatung abstimmen)</legend>
        <label className="flex items-center gap-2 text-[14px] text-ink-700"><input type="checkbox" checked={!!d.steuerOption} onChange={f("steuerOption")} className="h-4 w-4 accent-ov-600" />Eigentümer optiert zur Steuerpflicht</label>
        <label className="flex items-center gap-2 text-[14px] text-ink-700"><input type="checkbox" checked={!!d.kleinunternehmer} onChange={f("kleinunternehmer")} className="h-4 w-4 accent-ov-600" />Kleinunternehmer</label>
        <Feld id="pv-steuer" label="Steuervorlage">
          <select id="pv-steuer" className={auswahlfeld} value={d.steuervorlage} onChange={f("steuervorlage")}>
            <option value="">Vorschlag: {STEUERVORLAGEN[vorschlag.vorlage]?.label}</option>
            {Object.entries(STEUERVORLAGEN).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </Feld>
        <p className="text-[12.5px] leading-snug text-ink-500 md:col-span-3">{vorschlag.hinweise.join(" ")}</p>
      </fieldset>
      <Feld id="pv-bem" label="Bemerkung"><textarea id="pv-bem" rows={2} className={cn(eingabe, "h-auto py-3")} value={d.bemerkung} onChange={f("bemerkung")} /></Feld>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={laeuft} className="inline-flex h-11 items-center gap-2 rounded-full bg-ov-600 px-5 text-[14px] font-semibold text-white hover:bg-ov-700 disabled:opacity-50">
          {laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
          {vertrag ? "Änderungen speichern" : "Pachtvertrag anlegen"}
        </button>
      </div>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{meldung}</ErfolgBox>
    </form>
  );
}
