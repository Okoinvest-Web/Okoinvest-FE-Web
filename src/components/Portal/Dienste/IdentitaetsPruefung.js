"use client";

// Online-Identifizierung (Anbieter-neutral) und automatische MRZ-Vorprüfung auf der Seite „Verifizierung“.
// Die MRZ wird sofort im Browser geprüft (ICAO-9303-Prüfziffern) und erst auf Klick an den Server gesendet, der erneut
// prüft, mit den Angaben abgleicht und das Ergebnis als Hinweis an den KYC-Fall hängt. Gespeichert wird nur das Ergebnis.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, ScanLine, ShieldCheck, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Karte } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, Feld, textbereich } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { datumZeit } from "@/lib/plattform/format";
import { MRZ_BEISPIELE, mrzPruefen } from "@/lib/plattform/dienste/identitaet/mrz";

const TON = { ausstehend: "info", bestanden: "ok", pruefen: "warn", abgelehnt: "warn", abgebrochen: "neutral" };
const ERGEBNIS = {
  plausibel: { ton: "ok", label: "Automatisch plausibel" },
  auffaellig: { ton: "warn", label: "Abweichungen – manuelle Prüfung" },
  ungueltig: { ton: "warn", label: "Nicht stimmig" },
};

export default function IdentitaetsPruefung({ start }) {
  const router = useRouter();
  const [mrz, setMrz] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ergebnis, setErgebnis] = useState(null);
  const konfig = start?.konfig || {};
  const live = useMemo(() => (mrz.replace(/\s/g, "").length >= 60 ? mrzPruefen(mrz) : null), [mrz]);

  async function online() {
    setFehler("");
    setLaeuft(true);
    try {
      const r = await senden("/api/portal/dienste/identitaet", { body: {} });
      if (r.url?.startsWith("/")) router.push(r.url);
      else if (/^https:\/\//.test(r.url || "")) window.location.assign(r.url);
      else throw new Error("Der Anbieter hat keine gültige Adresse geliefert.");
    } catch (x) {
      setFehler(x.message);
      setLaeuft(false);
    }
  }

  async function vorpruefen(ev) {
    ev.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      const r = await senden("/api/portal/dienste/mrz", { body: { zeilen: mrz } });
      setErgebnis(r);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="mb-6 grid gap-6 xl:grid-cols-2">
      <Karte titel="Online identifizieren" untertitel={konfig.aktiv ? `Über ${konfig.label}${konfig.demo ? " (Simulation)" : ""} – in wenigen Minuten, per Smartphone` : "Derzeit nicht verfügbar – bitte Ausweiskopie hochladen"}>
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-ink-600">
            Statt Ausweiskopien hochzuladen, können Sie sich bei unserem Partner für Identitätsprüfung ausweisen{(konfig.verfahren || []).length ? ` (${konfig.verfahren.join(", ")})` : ""}. Das Ergebnis geht an unser Compliance-Team – die abschließende Prüfung erfolgt dort.
          </p>
          <Button type="button" size="sm" icon={ShieldCheck} onClick={online} disabled={!konfig.aktiv || laeuft}>
            {laeuft ? "Wird gestartet …" : "Online-Identifizierung starten"}
          </Button>
          {(start?.sitzungen || []).length > 0 && (
            <ul className="divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-200/70">
              {start.sitzungen.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13.5px]">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink-900">{s.anbieterLabel}</span>
                    <span className="block text-[12.5px] text-ink-500">{datumZeit(s.erstelltAm)}{s.verfahren ? ` · ${s.verfahren}` : ""}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge ton={TON[s.status] || "neutral"}>{s.statusLabel}</Badge>
                    {s.status === "ausstehend" && s.url && (
                      <a href={s.url} className="inline-flex items-center gap-1 text-[13px] font-semibold text-ov-700 hover:underline">
                        Fortsetzen <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Karte>

      <Karte titel="Ausweis automatisch vorprüfen" untertitel="Maschinenlesbare Zone (MRZ) – Prüfziffern nach ICAO 9303">
        <form onSubmit={vorpruefen} className="space-y-4">
          <Feld id="mrz" label="Zeilen der maschinenlesbaren Zone" hinweis="Die 2 bzw. 3 Zeilen mit „<<<“ unten auf der Pass-Datenseite bzw. auf der Rückseite des Personalausweises. Wir speichern nur das Prüfergebnis, nicht die Zeilen.">
            <textarea
              id="mrz"
              rows={3}
              value={mrz}
              onChange={(e) => setMrz(e.target.value.toUpperCase())}
              spellCheck={false}
              autoCapitalize="characters"
              autoComplete="off"
              className={cn(textbereich, "min-h-[96px] font-mono text-[13px] tracking-[0.06em]")}
              placeholder={MRZ_BEISPIELE.td1.join("\n")}
            />
          </Feld>
          {live && (
            <div aria-live="polite" className="rounded-2xl bg-ink-50 px-4 py-3 text-[13px]">
              <p className="font-semibold text-ink-900">{live.format ? `Format ${live.format} · ${live.felder.dokumentart}` : "Format nicht erkannt"}</p>
              <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                {live.pruefungen.map((p) => (
                  <li key={p.feld} className="flex items-center gap-1.5 text-ink-700">
                    {p.ok ? <Check aria-hidden="true" className="h-4 w-4 text-ov-600" /> : <X aria-hidden="true" className="h-4 w-4 text-sun-600" />}
                    {p.label}
                    <span className="sr-only">{p.ok ? "stimmt" : "stimmt nicht"}</span>
                  </li>
                ))}
              </ul>
              {!live.format && <p className="mt-1 text-ink-600">{live.fehler[0]}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="navy" icon={ScanLine} disabled={laeuft || !live}>Vorprüfung speichern</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMrz(MRZ_BEISPIELE.td3.join("\n"))}>Beispiel (ICAO) einsetzen</Button>
          </div>
          <FehlerBox>{fehler}</FehlerBox>
          {ergebnis && (
            <div className="space-y-2">
              <p className="flex flex-wrap items-center gap-2 text-[14px] text-ink-800">
                <Badge ton={ERGEBNIS[ergebnis.ergebnis]?.ton}>{ERGEBNIS[ergebnis.ergebnis]?.label}</Badge>
                {ergebnis.mrz?.felder?.gueltigBis && <span className="text-ink-500">gültig bis {ergebnis.mrz.felder.gueltigBis.split("-").reverse().join(".")}</span>}
              </p>
              {ergebnis.hinweise?.length > 0 && <ul className="list-disc space-y-1 pl-5 text-[13.5px] text-ink-700">{ergebnis.hinweise.map((h) => <li key={h}>{h}</li>)}</ul>}
              <ErfolgBox>{ergebnis.kycVerknuepft ? "Das Ergebnis liegt Ihrer Verifizierung als Hinweis bei. Die Entscheidung trifft unser Compliance-Team." : ergebnis.hinweisKyc || "Vorprüfung gespeichert."}</ErfolgBox>
            </div>
          )}
          {!ergebnis && start?.mrz && (
            <p className="text-[12.5px] text-ink-500">Letzte Vorprüfung: {datumZeit(start.mrz.am)} · {ERGEBNIS[start.mrz.ergebnis]?.label} · Nr. {start.mrz.nummer}</p>
          )}
          <p className="text-[12px] leading-snug text-ink-500">„Automatisch plausibel“ heißt nur: Die Zeilen sind in sich stimmig und passen zu Ihren Angaben. Es ersetzt keine Identifizierung.</p>
        </form>
      </Karte>
    </div>
  );
}
