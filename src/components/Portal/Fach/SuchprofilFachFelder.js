"use client";

// Fachliche Erweiterung des Investoren-Suchprofils (Fachprüfung Kapitalseite): Investorentyp, Regionen, Rendite-Ziel,
// Deal-Struktur, Co-Development, ESG/Taxonomie, Finanzierungsweise, Mindest-Datenraumqualität.
// Eingebunden in ProfilFormulare.js → SuchprofilFormular; Bereinigung serverseitig (fach/suchprofil.js).

import { useId } from "react";
import { Chip, Feld, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { BUNDESLAENDER, LAENDER } from "@/lib/plattform/konstanten";
import { CO_DEVELOPMENT, DEAL_STRUKTUREN, ESG_ANFORDERUNGEN, FINANZIERUNGSWEISEN, INVESTOR_TYPEN } from "@/lib/plattform/fach/suchprofil";

/** Startwerte aus dem gespeicherten Profil */
export function suchprofilFachStart(profil) {
  return {
    investorTyp: profil?.investorTyp || "",
    regionen: profil?.regionen || [],
    renditeZielPct: profil?.renditeZielPct ?? "",
    renditeBasis: profil?.renditeBasis || "ek",
    dealStrukturen: profil?.dealStrukturen || [],
    coDevelopment: profil?.coDevelopment || "egal",
    esg: profil?.esg || [],
    finanzierung: profil?.finanzierung || "",
    datenraumMin: profil?.datenraumMin ?? "",
  };
}

export default function SuchprofilFachFelder({ p, setze, umschalten }) {
  const id = useId();
  const laender = p.laender?.length ? p.laender : Object.keys(LAENDER);
  return (
    <div className="space-y-5 rounded-3xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/60 sm:p-5">
      <p className="text-[13.5px] font-semibold text-ink-900">Investorenprofil & Anforderungen</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Feld id={`${id}-it`} label="Investorentyp" hinweis="Grundlage für Ansprache und KYC-Prüfung (Unternehmen/Fonds: KYB).">
          <select id={`${id}-it`} className={auswahlfeld} value={p.investorTyp} onChange={(e) => setze("investorTyp", e.target.value)}>
            <option value="">– bitte wählen –</option>
            {Object.entries(INVESTOR_TYPEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-fi`} label="Finanzierungsweise">
          <select id={`${id}-fi`} className={auswahlfeld} value={p.finanzierung} onChange={(e) => setze("finanzierung", e.target.value)}>
            <option value="">– bitte wählen –</option>
            {Object.entries(FINANZIERUNGSWEISEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-rz`} label="Rendite-Ziel (% p. a.)" hinweis="Wird im Bewertungswerkzeug als Ziel-Rendite vorbelegt.">
          <input id={`${id}-rz`} inputMode="decimal" className={eingabe} value={p.renditeZielPct} onChange={(e) => setze("renditeZielPct", e.target.value)} />
        </Feld>
        <Feld id={`${id}-rb`} label="Rendite-Basis">
          <select id={`${id}-rb`} className={auswahlfeld} value={p.renditeBasis} onChange={(e) => setze("renditeBasis", e.target.value)}>
            <option value="ek">Eigenkapital-IRR (levered)</option>
            <option value="projekt">Projekt-IRR (unlevered)</option>
          </select>
        </Feld>
        <Feld id={`${id}-cd`} label="Co-Development">
          <select id={`${id}-cd`} className={auswahlfeld} value={p.coDevelopment} onChange={(e) => setze("coDevelopment", e.target.value)}>
            {Object.entries(CO_DEVELOPMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-dm`} label="Mindest-Datenraumqualität (%)" hinweis="Projekte darunter werden als „prüfen“ markiert.">
          <input id={`${id}-dm`} inputMode="numeric" className={eingabe} value={p.datenraumMin} onChange={(e) => setze("datenraumMin", e.target.value)} />
        </Feld>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Deal-Struktur</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(DEAL_STRUKTUREN).map(([k, v]) => <Chip key={k} value={k} checked={p.dealStrukturen.includes(k)} onChange={() => umschalten("dealStrukturen", k)}>{v}</Chip>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">ESG- und Taxonomie-Anforderungen</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ESG_ANFORDERUNGEN).map(([k, v]) => <Chip key={k} value={k} checked={p.esg.includes(k)} onChange={() => umschalten("esg", k)}>{v}</Chip>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Regionen (optional)</legend>
        <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
          {laender.flatMap((l) => BUNDESLAENDER[l] || []).map((b) => <Chip key={b} value={b} checked={p.regionen.includes(b)} onChange={() => umschalten("regionen", b)}>{b}</Chip>)}
        </div>
      </fieldset>
    </div>
  );
}
