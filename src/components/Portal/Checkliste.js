"use client";

// Dokumenten-Checkliste je Projektphase bzw. Fläche: erwartete Unterlagen mit Status
// hochgeladen / fehlt / später, Vollständigkeitsgrad und Upload direkt am Punkt.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleDashed, Clock, Upload } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { hochladen } from "@/lib/plattform/client";
import { UPLOAD } from "@/lib/plattform/konstanten";
import { phaseById } from "@/lib/invest/markt";
import { FehlerBox } from "./felder";
import { QualitaetsBalken } from "./ui";

export { QualitaetsBalken };

function Punkt({ p, darfHochladen, laden, laeuft }) {
  const ref = useRef(null);
  const status = p.vorhanden ? "ok" : p.erwartet ? "fehlt" : "spaeter";
  const Icon = status === "ok" ? CircleCheck : status === "fehlt" ? CircleDashed : Clock;
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <Icon aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0", status === "ok" ? "text-ov-600" : status === "fehlt" ? (p.pflicht ? "text-sun-500" : "text-ink-400") : "text-ink-300")} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("text-[14px] font-semibold leading-snug", status === "spaeter" ? "text-ink-500" : "text-ink-900")}>{p.label}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
              status === "ok" ? "bg-ov-50 text-ov-800 ring-ov-200" : status === "fehlt" ? (p.pflicht ? "bg-sun-300/25 text-ink-900 ring-sun-400/50" : "bg-ink-50 text-ink-600 ring-ink-200") : "bg-ink-50 text-ink-500 ring-ink-200"
            )}
          >
            {status === "ok" ? "hochgeladen" : status === "fehlt" ? (p.pflicht ? "fehlt" : "optional") : p.ab ? `ab ${phaseById(p.ab).kurz}` : "nicht erforderlich"}
          </span>
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-500">{p.text}</p>
        {p.dokumente?.length > 0 && (
          <p className="mt-1 text-[12.5px] text-ink-600">
            {p.dokumente.map((d, i) => (
              <span key={d.id}>
                {i > 0 && " · "}
                <a href={`/api/portal/dokumente/${d.id}?anzeigen=1`} target="_blank" rel="noopener" className="underline-offset-2 hover:text-ov-700 hover:underline">{d.name}</a>
              </span>
            ))}
          </p>
        )}
      </div>
      {darfHochladen && status !== "spaeter" && (
        <>
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={laeuft}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-full px-3 text-[12.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:text-ink-900 disabled:opacity-50"
            aria-label={`${p.label} hochladen`}
          >
            <Upload aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{p.vorhanden ? "Weitere" : "Hochladen"}</span>
          </button>
          <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" tabIndex={-1} onChange={(e) => laden(p, e.target.files?.[0], e.target)} />
        </>
      )}
    </li>
  );
}

export default function Checkliste({ checkliste, bezugArt, bezugId, kategorie = "allgemein", kategorieJePunkt = {}, darfHochladen = false, hinweis }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  if (!checkliste) return null;
  const aktuell = checkliste.punkte.filter((p) => p.erwartet);
  const spaeter = checkliste.punkte.filter((p) => !p.erwartet);

  async function laden(p, datei, input) {
    if (!datei) return;
    setFehler("");
    if (!UPLOAD.typen[datei.type]) return setFehler(`„${datei.name}“: erlaubt sind PDF, JPG und PNG.`);
    if (datei.size > UPLOAD.maxBytes) return setFehler(`„${datei.name}“ ist größer als 10 MB.`);
    setLaeuft(true);
    try {
      await hochladen(datei, { bezugArt, bezugId, kategorie: kategorieJePunkt[p.id] || kategorie, checkliste: p.id });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
      if (input) input.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <QualitaetsBalken quote={checkliste.quote} label={bezugArt === "projekt" ? "Datenraum-Qualität" : "Unterlagen vollständig"} />
      <p className="text-[12.5px] text-ink-500">
        {checkliste.erfuellt} von {checkliste.erwartet} Pflichtunterlagen für den aktuellen Stand{hinweis ? ` · ${hinweis}` : ""}
      </p>
      <FehlerBox>{fehler}</FehlerBox>
      <ul className="divide-y divide-ink-100">
        {aktuell.map((p) => (
          <Punkt key={p.id} p={p} darfHochladen={darfHochladen} laden={laden} laeuft={laeuft} />
        ))}
      </ul>
      {spaeter.length > 0 && (
        <details className="group rounded-2xl bg-sand-50 ring-1 ring-inset ring-ink-200/70">
          <summary className="cursor-pointer list-none px-4 py-2.5 text-[13.5px] font-semibold text-ink-700 [&::-webkit-details-marker]:hidden">
            {bezugArt === "projekt" ? "Später erwartet" : "Derzeit nicht erforderlich"} ({spaeter.length})
          </summary>
          <ul className="divide-y divide-ink-100 border-t border-ink-200/70 px-4 py-3">
            {spaeter.map((p) => (
              <Punkt key={p.id} p={p} darfHochladen={false} laden={laden} laeuft={laeuft} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
