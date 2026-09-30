"use client";

// Anfrage-Zusammenfassung & Triage (Backoffice): Zusammenfassung, Typ-/Prioritätsvorschlag,
// fehlende Angaben, nächster Schritt und Antwortentwurf. Der Antwortentwurf lässt sich in das
// Antwortfeld des Nachrichtenverlaufs übernehmen (Ereignis „oi-ki-entwurf“) – gesendet wird nur per Klick.

import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { Badge } from "@/components/Portal/ui";
import { VORGANG_TYPEN } from "@/lib/plattform/konstanten";
import { KiDatenschutz, KiDrawer, KiFehler, KiKennzeichnung, KiKnopf, KiLaedt, KopierenKnopf } from "./KiBausteine";
import { useKi, useKiStatus } from "./useKi";

const PRIO_TON = { hoch: "warn", mittel: "info", niedrig: "neutral" };

export function entwurfUebergeben(bezugArt, bezugId, text) {
  window.dispatchEvent(new CustomEvent("oi-ki-entwurf", { detail: { bezugArt, bezugId, text } }));
}

export default function KiTriage({ vorgangId, typ }) {
  const [offen, setOffen] = useState(false);
  const [uebergeben, setUebergeben] = useState(false);
  const status = useKiStatus();
  const ki = useKi("triage");
  const e = ki.ergebnis;

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
      <h2 className="font-display text-[17px] font-bold text-ink-900">Assistent</h2>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">Zusammenfassung, Priorität, fehlende Angaben und ein Antwortentwurf – auf Knopfdruck.</p>
      <KiKnopf
        className="mt-4"
        onClick={() => {
          setOffen(true);
          setUebergeben(false);
          ki.starten({ vorgangId });
        }}
      >
        Zusammenfassen & einordnen
      </KiKnopf>
      <KiDrawer offen={offen} onSchliessen={() => setOffen(false)} titel="Anfrage-Triage" untertitel={`Vorgang ${vorgangId}`} fuss={<KiDatenschutz aktiv={status?.aktiv} />}>
        <div className="space-y-4">
          {ki.laeuft && <KiLaedt text="Vorgang wird ausgewertet …" />}
          <KiFehler>{ki.fehler}</KiFehler>
          {e && (
            <>
              <KiKennzeichnung modus={ki.modus} hinweis={ki.hinweis} />
              <p className="text-[14.5px] leading-relaxed text-ink-800">{e.zusammenfassung}</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-sand-50 p-3.5 ring-1 ring-inset ring-ink-200/70">
                  <dt className="text-[12px] font-medium text-ink-500">Priorität</dt>
                  <dd className="mt-1">
                    <Badge ton={PRIO_TON[e.prioritaet]}>{e.prioritaet === "hoch" ? "Hoch" : e.prioritaet === "niedrig" ? "Niedrig" : "Mittel"}</Badge>
                  </dd>
                  <dd className="mt-1.5 text-[13px] leading-snug text-ink-600">{e.begruendung}</dd>
                </div>
                <div className="rounded-2xl bg-sand-50 p-3.5 ring-1 ring-inset ring-ink-200/70">
                  <dt className="text-[12px] font-medium text-ink-500">Anfragetyp</dt>
                  <dd className="mt-1 text-[14px] font-semibold text-ink-900">{VORGANG_TYPEN[e.typVorschlag] || e.typVorschlag}</dd>
                  {typ && e.typVorschlag !== typ && <dd className="mt-1 text-[12.5px] text-ink-600">Abweichend vom erfassten Typ „{VORGANG_TYPEN[typ] || typ}“</dd>}
                </div>
              </dl>
              {e.fehlendeAngaben?.length > 0 && (
                <div>
                  <p className="text-[13px] font-semibold text-ink-900">Fehlende Angaben</p>
                  <ul className="mt-1.5 space-y-1 text-[14px] text-ink-700">
                    {e.fehlendeAngaben.map((f) => (
                      <li key={f}>– {f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {e.naechsterSchritt && (
                <p className="text-[14px] text-ink-700">
                  <span className="font-semibold text-ink-900">Nächster Schritt: </span>
                  {e.naechsterSchritt}
                </p>
              )}
              {e.antwortEntwurf && (
                <div className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200/70">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px] font-bold text-ink-900">Antwortentwurf</p>
                    <div className="flex flex-wrap gap-2">
                      <KopierenKnopf text={e.antwortEntwurf} />
                      <button
                        type="button"
                        onClick={() => {
                          entwurfUebergeben("vorgang", vorgangId, e.antwortEntwurf);
                          setUebergeben(true);
                          setOffen(false);
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ov-600 px-3.5 text-[13px] font-semibold text-white hover:bg-ov-700"
                      >
                        <ArrowDownToLine aria-hidden="true" className="h-4 w-4" />
                        In Antwortfeld übernehmen
                      </button>
                    </div>
                  </div>
                  <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-800">{e.antwortEntwurf}</p>
                </div>
              )}
              <p className="text-[12.5px] text-ink-500">Status, Typ und Zuständigkeit ändern Sie wie gewohnt über „Bearbeitung“ – der Assistent ändert nichts selbst.</p>
            </>
          )}
        </div>
      </KiDrawer>
      {uebergeben && <p className="mt-3 text-[13px] text-ov-800">Entwurf steht im Antwortfeld – bitte prüfen und senden.</p>}
    </div>
  );
}
