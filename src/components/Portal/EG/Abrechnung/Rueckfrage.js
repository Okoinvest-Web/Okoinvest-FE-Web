"use client";

// Bestätigungsdialog für folgenreiche Abrechnungs-Aktionen (UX-Audit P0-3, Weg 10): Belege versenden, Periode abschließen,
// Vier-Augen-Freigabe, Periode bzw. Zahlungslauf verwerfen. Zeigt Periode, Anzahl, Summe und Folgen, bevor etwas passiert.
// Baut auf dem nativen Dialog des Design-Systems auf (Fokusfalle, Esc, Bottom-Sheet mobil). Keine Fachlogik.

import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

/**
 * offen, onSchliessen, onBestaetigen
 * titel        Frage oder Handlung („31 Belege versenden?“)
 * text         Konsequenz in einem Satz
 * fakten       [{ label, wert }] – Periode, Anzahl, Summe …
 * folgen       [string] – was danach passiert / was sich nicht rückgängig machen lässt
 * knopf        Beschriftung der Bestätigung („Ja, versenden“)
 * ton          neutral | danger
 * icon         Lucide-Icon im Kopf
 * laeuft       Bestätigung läuft (Spinner, gesperrt)
 * children     Zusatzinhalt (z. B. Vier-Augen-Hinweis)
 */
export default function Rueckfrage({ offen, onSchliessen, onBestaetigen, titel, text, fakten = [], folgen = [], knopf = "Bestätigen", ton = "neutral", icon, laeuft = false, children }) {
  return (
    <Dialog
      offen={offen}
      onSchliessen={() => !laeuft && onSchliessen?.()}
      titel={titel}
      text={text}
      icon={icon}
      ton={ton}
      groesse="md"
      aktionen={
        <>
          <Button variant="secondary" size="md" onClick={onSchliessen} disabled={laeuft}>Abbrechen</Button>
          <Button variant={ton === "danger" ? "danger" : "primary"} size="md" laedt={laeuft} onClick={onBestaetigen}>{knopf}</Button>
        </>
      }
    >
      {fakten.length > 0 && (
        <dl className="grid grid-cols-2 gap-2.5 rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
          {fakten.map((f) => (
            <div key={f.label} className={f.breit ? "col-span-2" : undefined}>
              <dt className="text-[12.5px] text-ink-500">{f.label}</dt>
              <dd className="ov-num mt-0.5 text-[15px] font-bold text-ink-900">{f.wert}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
      {folgen.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-[13.5px] leading-relaxed text-ink-700">
          {folgen.map((f) => (
            <li key={f} className="flex gap-2"><span aria-hidden="true" className={ton === "danger" ? "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-danger-500" : "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500"} />{f}</li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
