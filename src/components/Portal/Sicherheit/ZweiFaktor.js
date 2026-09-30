"use client";

// Zwei-Faktor-Anmeldung (TOTP) einrichten, verwalten, abschalten. Ablauf:
// Starten → QR-Code scannen bzw. Schlüssel eintippen → ersten Code bestätigen → 10 Wiederherstellungscodes sichern.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, KeyRound, Loader2, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import Button from "@/components/ui/Button";
import { senden } from "@/lib/plattform/client";
import { eingabe, Feld, FehlerBox, ErfolgBox } from "@/components/Portal/felder";
import { Badge, Hinweis } from "@/components/Portal/ui";
import { datum } from "@/lib/plattform/format";
import QrCode from "./QrCode";

const codeFeld = `${eingabe} max-w-[220px] text-center font-mono text-[20px] tracking-[0.3em]`;

function gruppen(s) {
  return String(s || "").match(/.{1,4}/g)?.join(" ") || "";
}

function Codes({ codes }) {
  const [kopiert, setKopiert] = useState(false);
  const text = `Wiederherstellungscodes ÖkoInvest (je Code einmal verwendbar)\n\n${codes.join("\n")}\n`;
  return (
    <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70 sm:p-5">
      <p className="text-[14px] font-semibold text-ink-900">Ihre Wiederherstellungscodes</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">
        Bewahren Sie diese Codes sicher auf (z. B. im Passwort-Manager). Jeder Code funktioniert genau einmal, falls Ihr Telefon nicht zur Hand ist. Wir zeigen sie nur jetzt an.
      </p>
      <ol className="mt-4 grid grid-cols-1 gap-2 font-mono text-[15px] text-ink-900 min-[420px]:grid-cols-2">
        {codes.map((c, i) => (
          <li key={c} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-inset ring-ink-200">
            <span className="ov-num w-5 text-[12px] text-ink-400">{i + 1}.</span>
            <span className="tracking-wider">{c}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={kopiert ? Check : Copy}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setKopiert(true);
            } catch {
              setKopiert(false);
            }
          }}
        >
          {kopiert ? "Kopiert" : "Kopieren"}
        </Button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
          download="oekoinvest-wiederherstellungscodes.txt"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50 hover:ring-ink-300"
        >
          <Download aria-hidden="true" className="h-4 w-4" /> Als Datei speichern
        </a>
      </div>
    </div>
  );
}

export default function ZweiFaktor({ status, email, pflicht = false }) {
  const router = useRouter();
  const id = useId();
  const [schritt, setSchritt] = useState(status.aktiv ? "aktiv" : "aus");
  const [einrichtung, setEinrichtung] = useState(null);
  const [code, setCode] = useState("");
  const [passwort, setPasswort] = useState("");
  const [codes, setCodes] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [modus, setModus] = useState(""); // "" | "codes" | "aus"

  async function los(aktion, extra = {}) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      const r = await senden("/api/portal/sicherheit/zwei-faktor", { body: { aktion, ...extra } });
      return r;
    } catch (e) {
      setFehler(e.message);
      return null;
    } finally {
      setLaeuft(false);
    }
  }

  async function starten() {
    const r = await los("starten");
    if (r) {
      setEinrichtung(r);
      setSchritt("scannen");
    }
  }

  async function bestaetigen(e) {
    e.preventDefault();
    const r = await los("bestaetigen", { code });
    if (r) {
      setCodes(r.codes);
      setCode("");
      setSchritt("codes");
      router.refresh();
    }
  }

  async function neueCodes(e) {
    e.preventDefault();
    const r = await los("codes", { code });
    if (r) {
      setCodes(r.codes);
      setCode("");
      setModus("");
      router.refresh();
    }
  }

  async function abschalten(e) {
    e.preventDefault();
    const r = await los("deaktivieren", { code, passwort });
    if (r) {
      setSchritt("aus");
      setCode("");
      setPasswort("");
      setModus("");
      setErfolg("Die Zwei-Faktor-Anmeldung ist abgeschaltet.");
      router.refresh();
    }
  }

  if (schritt === "aus") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sun-300/25 text-ink-900">
            <ShieldOff aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">Nicht aktiv</p>
            <p className="mt-0.5 text-[14px] leading-relaxed text-ink-600">
              Schützen Sie Ihr Konto mit einem zweiten Faktor: Nach dem Passwort bzw. E-Mail-Link fragen wir einen 6-stelligen Code aus einer Authenticator-App ab (z. B. Microsoft Authenticator, Google Authenticator, 1Password).
            </p>
          </div>
        </div>
        {pflicht && <Hinweis ton="warn" titel="Für Ihr Konto Pflicht">Bitte richten Sie die Zwei-Faktor-Anmeldung jetzt ein – erst danach sind die übrigen Bereiche des Portals verfügbar.</Hinweis>}
        <ErfolgBox>{erfolg}</ErfolgBox>
        <FehlerBox>{fehler}</FehlerBox>
        <Button type="button" icon={laeuft ? Loader2 : ShieldCheck} onClick={starten} disabled={laeuft}>
          Zwei-Faktor einrichten
        </Button>
      </div>
    );
  }

  if (schritt === "scannen" && einrichtung) {
    return (
      <form onSubmit={bestaetigen} className="space-y-6">
        <ol className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
          <li className="mx-auto w-full max-w-[220px] md:mx-0">
            <QrCode text={einrichtung.uri} label="QR-Code für die Authenticator-App" className="ring-1 ring-ink-200" />
          </li>
          <li className="min-w-0 space-y-3 text-[14px] leading-relaxed text-ink-700">
            <p>
              <strong className="text-ink-900">1. Scannen</strong> Sie den QR-Code mit Ihrer Authenticator-App.
            </p>
            <div>
              <p>Kein Scan möglich? Geben Sie diesen Schlüssel ein (Konto: {email}, zeitbasiert):</p>
              <p className="mt-2 break-all rounded-xl bg-sand-50 px-3 py-2 font-mono text-[15px] tracking-wider text-ink-900 ring-1 ring-inset ring-ink-200" aria-label="Geheimer Schlüssel">
                {gruppen(einrichtung.geheimnis)}
              </p>
              <a href={einrichtung.uri} className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800 md:hidden">
                <Smartphone aria-hidden="true" className="h-4 w-4" /> In der App auf diesem Gerät öffnen
              </a>
            </div>
            <p>
              <strong className="text-ink-900">2. Bestätigen</strong> Sie mit dem 6-stelligen Code aus der App.
            </p>
          </li>
        </ol>
        <Feld id={`${id}-c`} label="Code aus der App">
          <input id={`${id}-c`} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))} className={codeFeld} />
        </Feld>
        <FehlerBox>{fehler}</FehlerBox>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" icon={laeuft ? Loader2 : Check} disabled={laeuft || code.length !== 6}>Aktivieren</Button>
          <Button type="button" variant="ghost" onClick={() => setSchritt("aus")}>Abbrechen</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-700">
          <ShieldCheck aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
            Aktiv <Badge ton="ok">Authenticator-App</Badge>
          </p>
          <p className="mt-0.5 text-[14px] text-ink-600">
            {status.aktiviertAm ? `Seit ${datum(status.aktiviertAm)} · ` : ""}
            {codes ? codes.length : status.codesUebrig} Wiederherstellungscode(s) übrig
            {status.vertrauteGeraete ? ` · ${status.vertrauteGeraete} gemerkte(s) Gerät(e)` : ""}
          </p>
        </div>
      </div>
      {codes && <Codes codes={codes} />}
      {!codes && status.codesUebrig <= 3 && <Hinweis ton="warn">Nur noch wenige Wiederherstellungscodes – erzeugen Sie neue.</Hinweis>}

      {modus === "codes" && (
        <form onSubmit={neueCodes} className="space-y-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70">
          <Feld id={`${id}-n`} label="Aktueller Code aus der App" hinweis="Die bisherigen Wiederherstellungscodes werden ungültig.">
            <input id={`${id}-n`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))} className={codeFeld} />
          </Feld>
          <FehlerBox>{fehler}</FehlerBox>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" icon={KeyRound} disabled={laeuft || code.length !== 6}>Neue Codes erzeugen</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setModus("")}>Abbrechen</Button>
          </div>
        </form>
      )}
      {modus === "aus" && (
        <form onSubmit={abschalten} className="space-y-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70">
          <div className="grid gap-3 sm:grid-cols-2">
            <Feld id={`${id}-p`} label="Passwort">
              <input id={`${id}-p`} type="password" autoComplete="current-password" required value={passwort} onChange={(e) => setPasswort(e.target.value)} className={eingabe} />
            </Feld>
            <Feld id={`${id}-a`} label="Code aus der App oder Wiederherstellungscode">
              <input id={`${id}-a`} autoComplete="one-time-code" required maxLength={11} value={code} onChange={(e) => setCode(e.target.value.trim())} className={`${eingabe} font-mono tracking-wider`} />
            </Feld>
          </div>
          <FehlerBox>{fehler}</FehlerBox>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="navy" icon={ShieldOff} disabled={laeuft}>Endgültig abschalten</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setModus("")}>Abbrechen</Button>
          </div>
        </form>
      )}
      {!modus && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" icon={KeyRound} onClick={() => { setModus("codes"); setFehler(""); setCode(""); }}>
            Neue Wiederherstellungscodes
          </Button>
          {!pflicht && !status.pflicht && (
            <Button type="button" size="sm" variant="ghost" icon={ShieldOff} onClick={() => { setModus("aus"); setFehler(""); setCode(""); }}>
              Abschalten
            </Button>
          )}
        </div>
      )}
      {(pflicht || status.pflicht) && <p className="text-[12.5px] text-ink-500">Für Ihre Rolle ist die Zwei-Faktor-Anmeldung Pflicht und kann nicht abgeschaltet werden.</p>}
    </div>
  );
}
