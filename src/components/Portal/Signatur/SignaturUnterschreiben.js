"use client";

// Unterschreiben in drei Schritten: 1. Dokument ansehen · 2. Bestätigungscode per E-Mail · 3. zeichnen oder tippen + Zustimmung.
// Kennzeichnung als einfache elektronische Signatur (EES). Ablehnen mit Begründung.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, KeyRound, PenLine, Type } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Chip, ErfolgBox, FehlerBox, Feld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { getippterNameGueltig } from "@/lib/plattform/signatur";
import SignaturPad from "./SignaturPad";

export default function SignaturUnterschreiben({ vorgang, meinName = "" }) {
  const router = useRouter();
  const pad = useRef(null);
  const [gesehen, setGesehen] = useState(false);
  const [code, setCode] = useState("");
  const [codeInfo, setCodeInfo] = useState(null);
  const [art, setArt] = useState("gezeichnet");
  const [name, setName] = useState(meinName);
  const [padLeer, setPadLeer] = useState(true);
  const [zustimmung, setZustimmung] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [ablehnen, setAblehnen] = useState(false);
  const [grund, setGrund] = useState("");
  const url = `/api/portal/signatur/${vorgang.id}`;

  async function codeAnfordern() {
    setFehler("");
    setLaeuft(true);
    try {
      const r = await senden(url, { body: { aktion: "code" } });
      setCodeInfo(r);
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  async function unterschreiben(e) {
    e.preventDefault();
    setFehler("");
    const bild = art === "gezeichnet" ? pad.current?.alsPng() : undefined;
    if (art === "gezeichnet" && !bild) return setFehler("Bitte zeichnen Sie Ihre Unterschrift in das Feld.");
    if (art === "getippt" && !getippterNameGueltig(name)) return setFehler("Bitte tippen Sie Ihren vollständigen Namen.");
    setLaeuft(true);
    try {
      const r = await senden(url, { body: { aktion: "unterschreiben", code: code.replace(/\s/g, ""), art, bild, name, zustimmung } });
      setErfolg(r.vorgang?.status === "abgeschlossen" ? "Vielen Dank – das Dokument ist vollständig unterschrieben. Das signierte PDF mit Prüfseite steht bereit." : "Vielen Dank – Ihre Unterschrift ist gespeichert. Die nächste Person wird benachrichtigt.");
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  async function ablehnenSenden(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      await senden(url, { body: { aktion: "ablehnen", grund } });
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  if (erfolg) return <ErfolgBox>{erfolg}</ErfolgBox>;

  const schritt = (nr, titel, aktiv, fertig) => (
    <p className={cn("flex items-center gap-2 text-[14px] font-semibold", aktiv ? "text-ink-900" : "text-ink-400")}>
      <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[12px]", fertig ? "bg-ov-500 text-white" : aktiv ? "bg-navy-700 text-white" : "bg-ink-100 text-ink-500")}>{nr}</span>
      {titel}
    </p>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {schritt(1, "Dokument lesen", true, gesehen)}
        <div className="flex flex-wrap gap-2 pl-8">
          <Button href={`${url}/pdf?anzeigen=1`} prefetch={false} target="_blank" rel="noopener" size="sm" variant="secondary" icon={FileText} onClick={() => setGesehen(true)}>
            Dokument öffnen
          </Button>
          <label className="inline-flex items-center gap-2 text-[14px] text-ink-700">
            <input type="checkbox" checked={gesehen} onChange={(e) => setGesehen(e.target.checked)} className="h-4 w-4 accent-ov-600" />
            Ich habe das Dokument gelesen
          </label>
        </div>
      </div>

      <div className="space-y-3">
        {schritt(2, "Bestätigungscode per E-Mail", gesehen, !!codeInfo)}
        <div className="grid gap-3 pl-8 sm:grid-cols-[auto_minmax(0,220px)] sm:items-end">
          <Button type="button" size="sm" variant={codeInfo ? "secondary" : "navy"} icon={KeyRound} onClick={codeAnfordern} disabled={!gesehen || laeuft} className="justify-self-start">
            {codeInfo ? "Neuen Code senden" : "Code anfordern"}
          </Button>
          <Feld id="sig-code" label="6-stelliger Code" className={codeInfo ? "" : "opacity-50"}>
            <input id="sig-code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} disabled={!codeInfo} className={cn(eingabe, "ov-num tracking-[0.3em]")} placeholder="000000" />
          </Feld>
        </div>
        {codeInfo && <p className="pl-8 text-[13px] text-ink-500">Gesendet an {codeInfo.gesendetAn} · gültig 10 Minuten.</p>}
      </div>

      <form onSubmit={unterschreiben} className="space-y-4">
        {schritt(3, "Unterschreiben", !!codeInfo, false)}
        <fieldset className="space-y-4 pl-8" disabled={!codeInfo}>
          <legend className="sr-only">Art der Unterschrift</legend>
          <div className="flex flex-wrap gap-2">
            <Chip type="radio" name="sig-art" value="gezeichnet" checked={art === "gezeichnet"} onChange={() => setArt("gezeichnet")}>
              <PenLine aria-hidden="true" className="h-4 w-4" /> Zeichnen
            </Chip>
            <Chip type="radio" name="sig-art" value="getippt" checked={art === "getippt"} onChange={() => setArt("getippt")}>
              <Type aria-hidden="true" className="h-4 w-4" /> Namen tippen
            </Chip>
          </div>
          {art === "gezeichnet" ? (
            <SignaturPad ref={pad} onAenderung={setPadLeer} />
          ) : (
            <Feld id="sig-name" label="Vollständiger Name" hinweis="Wird auf der Prüfseite als Ihre Unterschrift gezeigt.">
              <input id="sig-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className={cn(eingabe, "font-display text-[18px] font-bold text-navy-900")} />
            </Feld>
          )}
          <label className="flex gap-3 rounded-2xl bg-ink-50 p-4 text-[13.5px] leading-relaxed text-ink-700 ring-1 ring-inset ring-ink-200">
            <input type="checkbox" checked={zustimmung} onChange={(e) => setZustimmung(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-ov-600" />
            <span>{vorgang.zustimmungText}</span>
          </label>
          <FehlerBox>{fehler}</FehlerBox>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" icon={PenLine} disabled={laeuft || !zustimmung || code.replace(/\s/g, "").length !== 6 || (art === "gezeichnet" && padLeer)}>
              {laeuft ? "Wird gespeichert …" : "Jetzt elektronisch unterschreiben"}
            </Button>
            <button type="button" onClick={() => setAblehnen((x) => !x)} className="text-[14px] font-semibold text-ink-600 underline-offset-2 hover:underline">
              Nicht unterschreiben
            </button>
          </div>
        </fieldset>
        {!codeInfo && <FehlerBox>{fehler}</FehlerBox>}
      </form>

      {ablehnen && (
        <form onSubmit={ablehnenSenden} className="space-y-3 rounded-2xl bg-sand-100 p-4">
          <Feld id="sig-grund" label="Warum unterschreiben Sie nicht?" pflicht>
            <textarea id="sig-grund" value={grund} onChange={(e) => setGrund(e.target.value)} className={textbereich} maxLength={1000} required minLength={3} />
          </Feld>
          <Button type="submit" size="sm" variant="secondary" disabled={laeuft || grund.trim().length < 3}>
            Unterschrift ablehnen
          </Button>
        </form>
      )}
    </div>
  );
}
