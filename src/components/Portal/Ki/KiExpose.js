"use client";

// Exposé-Assistent (Anbieter/Backoffice): Entwurf für Beschreibung, Highlights und Risiken aus den
// gespeicherten Projektdaten. Übernahme nur per Klick in das Formular – nie automatisch gespeichert
// oder veröffentlicht. Ohne `onUebernehmen` (z. B. Backoffice-Ansicht) nur Kopieren.

import { useState } from "react";
import { ArrowDownToLine, TriangleAlert, ListChecks } from "lucide-react";
import { KiDatenschutz, KiDrawer, KiFehler, KiKennzeichnung, KiKnopf, KiLaedt, KopierenKnopf } from "./KiBausteine";
import { useKi, useKiStatus } from "./useKi";

function Abschnitt({ titel, icon: Icon, aktion, children }) {
  return (
    <section className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200/70">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink-900">
          {Icon && <Icon aria-hidden="true" className="h-4 w-4 text-ov-600" />}
          {titel}
        </h3>
        {aktion}
      </div>
      {children}
    </section>
  );
}

export default function KiExpose({ projektId, onUebernehmen, knopfText = "Exposé-Entwurf erstellen", hinweisGespeichert = true, className }) {
  const [offen, setOffen] = useState(false);
  const [uebernommen, setUebernommen] = useState({});
  const status = useKiStatus();
  const ki = useKi("expose");
  const e = ki.ergebnis;

  function oeffnen() {
    setOffen(true);
    setUebernommen({});
    ki.starten({ projektId });
  }

  function uebernehmen(teil) {
    onUebernehmen?.(teil === "beschreibung" ? { beschreibung: e.beschreibung } : { highlights: e.highlights });
    setUebernommen((u) => ({ ...u, [teil]: true }));
  }

  const UebernehmenKnopf = ({ teil }) =>
    onUebernehmen ? (
      <button type="button" onClick={() => uebernehmen(teil)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ov-600 px-3.5 text-[13px] font-semibold text-white hover:bg-ov-700">
        <ArrowDownToLine aria-hidden="true" className="h-4 w-4" />
        {uebernommen[teil] ? "Übernommen" : "Ins Formular übernehmen"}
      </button>
    ) : null;

  return (
    <div className={className}>
      <KiKnopf onClick={oeffnen}>{knopfText}</KiKnopf>
      <KiDrawer
        offen={offen}
        onSchliessen={() => setOffen(false)}
        titel="Exposé-Assistent"
        untertitel={hinweisGespeichert ? "Grundlage: zuletzt gespeicherter Stand des Projekts" : "Grundlage: gespeicherte Projektdaten"}
        fuss={<KiDatenschutz aktiv={status?.aktiv} />}
      >
        <div className="space-y-4">
          {ki.laeuft && <KiLaedt text="Exposé-Entwurf wird erstellt …" />}
          <KiFehler>{ki.fehler}</KiFehler>
          {e && (
            <>
              <KiKennzeichnung modus={ki.modus} hinweis={ki.hinweis} />
              <Abschnitt titel="Beschreibung" aktion={<div className="flex flex-wrap gap-2"><KopierenKnopf text={e.beschreibung} /><UebernehmenKnopf teil="beschreibung" /></div>}>
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-800">{e.beschreibung}</p>
                <p className="mt-2 text-[12px] text-ink-400">{e.beschreibung.length} Zeichen</p>
              </Abschnitt>
              {e.highlights?.length > 0 && (
                <Abschnitt titel="Highlights" aktion={<div className="flex flex-wrap gap-2"><KopierenKnopf text={e.highlights.join("\n")} /><UebernehmenKnopf teil="highlights" /></div>}>
                  <ul className="space-y-1.5">
                    {e.highlights.map((h) => (
                      <li key={h} className="flex gap-2 text-[14px] text-ink-800">
                        <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </Abschnitt>
              )}
              {e.risiken?.length > 0 && (
                <Abschnitt titel="Risiken & offene Punkte" icon={TriangleAlert} aktion={<KopierenKnopf text={e.risiken.map((r) => `- ${r}`).join("\n")} />}>
                  <ul className="space-y-1.5 text-[14px] text-ink-700">
                    {e.risiken.map((r) => (
                      <li key={r}>– {r}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[12px] text-ink-500">Transparente Risiken schaffen Vertrauen – bei Bedarf in die Beschreibung aufnehmen.</p>
                </Abschnitt>
              )}
              {e.fehlendeAngaben?.length > 0 && (
                <Abschnitt titel="Das würde das Exposé verbessern" icon={ListChecks}>
                  <ul className="space-y-1 text-[14px] text-ink-700">
                    {e.fehlendeAngaben.map((f) => (
                      <li key={f}>– {f}</li>
                    ))}
                  </ul>
                </Abschnitt>
              )}
              <p className="text-[12.5px] leading-relaxed text-ink-500">
                Übernommene Texte stehen erst nach „Speichern“ im Projekt. Veröffentlicht wird erst nach Einreichung und Freigabe durch das Backoffice. Bitte prüfen Sie, dass der Text keine genaue Lage verrät.
              </p>
              <KiKnopf onClick={() => ki.starten({ projektId })} disabled={ki.laeuft}>
                Neuen Entwurf erstellen
              </KiKnopf>
            </>
          )}
        </div>
      </KiDrawer>
    </div>
  );
}
