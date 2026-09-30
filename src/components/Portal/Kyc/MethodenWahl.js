"use client";

// Übersicht der Identifizierungswege mit Empfehlung (Reihenfolge eID → Upload + MRZ + Video → externer Anbieter).
// Verfügbarkeit und Zulässigkeit (je Risiko/Investorentyp) liefert der Server (kycMethodenFuer); gespeichert wird per
// PATCH /api/portal/kyc { abschnitt: "methode" } – der Server prüft erneut.

import { useEffect, useState } from "react";
import { BadgeCheck, Fingerprint, Globe2, Video } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import EidStart from "@/components/Portal/Dienste/EidStart"; // Team „eID“: Start-Schaltflächen (ID Austria / Online-Ausweis)

const ICON = { eid: Fingerprint, video_intern: Video, extern: Globe2 };
const DANACH = {
  eid: "Starten Sie die Anmeldung direkt hier. Nach der Rückkehr liegt der Nachweis bei Ihrer Verifizierung; die abschließende Prüfung erfolgt durch unsere Compliance.",
  video_intern: "Im nächsten Schritt laden Sie Ihren Ausweis hoch, tippen die maschinenlesbare Zone ab und buchen einen Videotermin.",
  extern: "Die Weiterleitung zum Anbieter starten Sie oben unter „Online identifizieren“. Das Ergebnis kommt automatisch zu uns.",
};

/** eID-Verfahren (tatsächlich startbar laut Team „eID“) und vorhandener Nachweis */
function EidBereich() {
  const [eid, setEid] = useState(null);
  useEffect(() => {
    let aktiv = true;
    senden("/api/portal/dienste/eid", { method: "GET" }).then((r) => aktiv && setEid(r)).catch(() => aktiv && setEid({ methoden: [] }));
    return () => {
      aktiv = false;
    };
  }, []);
  if (!eid) return <p className="mt-3 text-[13px] text-ink-500">eID-Verfahren werden geladen …</p>;
  return (
    <div className="mt-3 space-y-3">
      {eid.nachweis && (
        <p className="rounded-2xl bg-ov-50 px-4 py-3 text-[13.5px] text-ov-900 ring-1 ring-inset ring-ov-200" role="status">
          eID-Nachweis liegt vor ({eid.nachweis.vertrauensniveau ? `Vertrauensniveau ${eid.nachweis.vertrauensniveau}` : "Online-Ausweis"}{eid.nachweis.demo ? ", Demo" : ""}). Die abschließende Prüfung erfolgt durch unsere Compliance.
        </p>
      )}
      {(eid.methoden || []).length ? <EidStart methoden={eid.methoden} /> : <p className="text-[13px] text-ink-500">Derzeit ist kein eID-Verfahren startbar – bitte wählen Sie einen anderen Weg.</p>}
    </div>
  );
}

export default function MethodenWahl({ methoden = [], gewaehlt = "", bearbeitbar = true, onGespeichert }) {
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  async function waehlen(id) {
    setFehler("");
    setLaeuft(true);
    try {
      const r = await senden("/api/portal/kyc", { method: "PATCH", body: { abschnitt: "methode", daten: { methode: id } } });
      await onGespeichert?.(r);
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Identifizierungsweg" className="grid gap-3">
        {methoden.map((m) => {
          const Icon = ICON[m.id] || BadgeCheck;
          const aktiv = gewaehlt === m.id;
          const moeglich = m.verfuegbar && m.zulaessig;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={aktiv} disabled={!bearbeitbar || !moeglich || laeuft} onClick={() => waehlen(m.id)}
              className={cn("flex min-w-0 items-start gap-3 rounded-2xl p-4 text-left ring-1 ring-inset transition disabled:cursor-not-allowed", aktiv ? "bg-ov-50 ring-2 ring-ov-500" : moeglich ? "bg-white ring-ink-200 hover:ring-ov-300" : "bg-ink-50 ring-ink-200 opacity-70")}>
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", aktiv ? "bg-ov-600 text-white" : "bg-navy-50 text-navy-700")}><Icon aria-hidden="true" className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block font-display text-[15.5px] font-bold text-ink-900">
                  {m.label}
                  {m.empfohlen && moeglich && <span className="ml-2 align-middle text-[11.5px] font-semibold uppercase tracking-wide text-ov-700">Empfohlen</span>}
                </span>
                <span className="mt-1 block text-[13.5px] leading-snug text-ink-600">{m.text}</span>
                {!moeglich && <span className="mt-1 block text-[12.5px] font-medium text-ink-500">{m.grund ? `Nicht wählbar: ${m.grund}.` : "Nicht wählbar."}</span>}
                {aktiv && <span className="mt-2 block text-[13px] font-medium text-ov-800">{DANACH[m.id]}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {gewaehlt === "eid" && bearbeitbar && <EidBereich />}
      {!methoden.length && <p className="text-[14px] text-ink-500">Bitte wählen Sie zuerst den Kontotyp.</p>}
      {fehler && <p role="alert" className="mt-3 text-[13px] font-medium text-red-700">{fehler}</p>}
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">Welche Wege zulässig sind, richtet sich nach den Vorgaben unserer Compliance (z. B. Risiko, Art des Kontos). Ein zugelassener Weg kann bei der Prüfung nachgefordert werden.</p>
    </div>
  );
}
