"use client";

// Konto-Komfort: Passwort ändern (mit Stärkeanzeige), Avatar/Sprache/Kanäle, E-Mail ändern,
// Datenexport (Art. 15/20 DSGVO) und Konto löschen (Art. 17 DSGVO).

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, EyeOff, Loader2, MailPlus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { senden } from "@/lib/plattform/client";
import { passwortFehler } from "@/lib/plattform/validierung";
import { AVATAR_FARBEN, SPRACHEN, avatarKlasse } from "@/lib/plattform/organisation";
import { initialen } from "@/lib/plattform/format";
import { auswahlfeld, eingabe, Feld, FehlerBox, ErfolgBox } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import PasswortStaerke from "./PasswortStaerke";

function useAktion() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  async function los(fn, text) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      const r = await fn();
      if (text) setErfolg(typeof text === "function" ? text(r) : text);
      router.refresh();
      return r;
    } catch (e) {
      setFehler(e.message);
      return null;
    } finally {
      setLaeuft(false);
    }
  }
  return { laeuft, fehler, erfolg, los, router };
}

export function PasswortAendern({ email, name }) {
  const id = useId();
  const a = useAktion();
  const [alt, setAlt] = useState("");
  const [neu, setNeu] = useState("");
  const [zeigen, setZeigen] = useState(false);
  const regel = neu ? passwortFehler(neu) : "";
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (regel) return;
        a.los(async () => {
          await senden("/api/portal/passwort", { body: { alt, neu } });
          setAlt("");
          setNeu("");
        }, "Passwort geändert. Andere Sitzungen wurden beendet.");
      }}
    >
      <Feld id={`${id}-a`} label="Bisheriges Passwort">
        <input id={`${id}-a`} type="password" required autoComplete="current-password" className={eingabe} value={alt} onChange={(e) => setAlt(e.target.value)} />
      </Feld>
      <Feld id={`${id}-n`} label="Neues Passwort" hinweis={regel || "Mindestens 10 Zeichen – am besten eine Passphrase aus mehreren Wörtern."}>
        <div className="relative">
          <input id={`${id}-n`} type={zeigen ? "text" : "password"} required minLength={10} autoComplete="new-password" aria-describedby={`${id}-s`} className={cn(eingabe, "pr-12")} value={neu} onChange={(e) => setNeu(e.target.value)} />
          <button type="button" onClick={() => setZeigen((z) => !z)} className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-800" aria-label={zeigen ? "Passwort verbergen" : "Passwort anzeigen"} aria-pressed={zeigen}>
            {zeigen ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
        <PasswortStaerke id={`${id}-s`} passwort={neu} email={email} name={name} />
      </Feld>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Button type="submit" variant="secondary" disabled={a.laeuft || !!regel || !alt}>Passwort ändern</Button>
    </form>
  );
}

export function KomfortFormular({ nutzer }) {
  const id = useId();
  const a = useAktion();
  const k = nutzer.komfort || {};
  const [farbe, setFarbe] = useState(k.farbe || "navy");
  const [sprache, setSprache] = useState(k.sprache || "de");
  const [email, setEmail] = useState(k.kanaele?.email !== false);
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        a.los(() => senden("/api/portal/konto/komfort", { method: "PATCH", body: { farbe, sprache, kanaele: { email } } }), "Gespeichert.");
      }}
    >
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Avatar</legend>
        <div className="flex flex-wrap items-center gap-3">
          <span aria-hidden="true" className={cn("flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-bold", avatarKlasse(farbe))}>{initialen(nutzer)}</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatarfarbe">
            {Object.entries(AVATAR_FARBEN).map(([key, f]) => (
              <label key={key} className={cn("flex h-9 w-9 cursor-pointer items-center justify-center rounded-full ring-offset-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500", f.klasse, farbe === key && "ring-2 ring-ov-500")} title={f.label}>
                <input type="radio" name={`${id}-farbe`} value={key} checked={farbe === key} onChange={() => setFarbe(key)} className="sr-only" />
                <span className="sr-only">{f.label}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>
      <Feld id={`${id}-s`} label="Sprache" hinweis="Die englische Oberfläche ist in Vorbereitung – Ihre Wahl wird bereits gespeichert.">
        <select id={`${id}-s`} className={auswahlfeld} value={sprache} onChange={(e) => setSprache(e.target.value)}>
          {Object.entries(SPRACHEN).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </Feld>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Benachrichtigungskanäle</legend>
        <ul className="space-y-2 text-[14px] text-ink-700">
          <li className="flex items-start gap-3 rounded-2xl bg-sand-50 p-3 ring-1 ring-inset ring-ink-200/70">
            <input type="checkbox" checked disabled className="mt-0.5 h-4 w-4 accent-[#558227]" aria-labelledby={`${id}-k1`} />
            <span id={`${id}-k1`}><strong className="font-semibold text-ink-900">Portal (Glocke)</strong> – immer aktiv</span>
          </li>
          <li>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sand-50 p-3 ring-1 ring-inset ring-ink-200/70 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
              <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#558227]" />
              <span><strong className="font-semibold text-ink-900">E-Mail</strong> – Hinweise laut Ihren <a href="/portal/benachrichtigungen" className="font-semibold text-ov-700 hover:text-ov-800">Benachrichtigungs-Einstellungen</a></span>
            </label>
          </li>
          <li className="flex items-start gap-3 rounded-2xl bg-sand-50 p-3 ring-1 ring-inset ring-ink-200/70">
            <input type="checkbox" checked disabled className="mt-0.5 h-4 w-4 accent-[#558227]" aria-labelledby={`${id}-k3`} />
            <span id={`${id}-k3`}><strong className="font-semibold text-ink-900">Sicherheitsmeldungen per E-Mail</strong> – neues Gerät, Zwei-Faktor, E-Mail-Änderung (nicht abschaltbar)</span>
          </li>
        </ul>
      </fieldset>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Button type="submit" disabled={a.laeuft}>Speichern</Button>
    </form>
  );
}

export function EmailAendern({ email }) {
  const id = useId();
  const a = useAktion();
  const [neu, setNeu] = useState("");
  const [passwort, setPasswort] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        a.los(async () => {
          const r = await senden("/api/portal/konto/email", { body: { neu, passwort } });
          setPasswort("");
          return r;
        }, (r) => `Wir haben einen Bestätigungslink an ${r?.an || neu} gesendet (24 Stunden gültig). Bis zur Bestätigung bleibt ${email} Ihre Anmeldeadresse.`);
      }}
    >
      <Feld id={`${id}-a`} label="Aktuelle Anmeldeadresse">
        <input id={`${id}-a`} disabled className={eingabe} value={email} />
      </Feld>
      <div className="grid gap-4 sm:grid-cols-2">
        <Feld id={`${id}-n`} label="Neue E-Mail-Adresse">
          <input id={`${id}-n`} type="email" required autoComplete="email" className={eingabe} value={neu} onChange={(e) => setNeu(e.target.value)} />
        </Feld>
        <Feld id={`${id}-p`} label="Passwort zur Bestätigung">
          <input id={`${id}-p`} type="password" required autoComplete="current-password" className={eingabe} value={passwort} onChange={(e) => setPasswort(e.target.value)} />
        </Feld>
      </div>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Button type="submit" variant="secondary" icon={a.laeuft ? Loader2 : MailPlus} disabled={a.laeuft}>Bestätigungslink senden</Button>
    </form>
  );
}

export function DatenUndLoeschung() {
  const id = useId();
  const a = useAktion();
  const [offen, setOffen] = useState(false);
  const [passwort, setPasswort] = useState("");
  const [wort, setWort] = useState("");
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[14px] leading-relaxed text-ink-700">
          Laden Sie alle Daten zu Ihrem Konto als JSON-Datei herunter (Auskunft nach Art. 15 und Datenübertragbarkeit nach Art. 20 DSGVO): Stammdaten, Anfragen, Flächen, Projekte, Interessen, Nachrichten, Dokument-Metadaten, Sitzungen und Protokoll.
        </p>
        <a href="/api/portal/konto/export" className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50 hover:ring-ink-300">
          <Download aria-hidden="true" className="h-4 w-4" /> Datenexport herunterladen
        </a>
      </div>
      <div className="border-t border-ink-100 pt-5">
        <p className="text-[14px] font-semibold text-ink-900">Konto löschen</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">
          Ihr Konto wird anonymisiert und gesperrt, Entwürfe werden gelöscht. Unterlagen mit gesetzlicher Aufbewahrungspflicht (z. B. Provisionsabrechnungen, NDA- und Einwilligungsnachweise) bleiben bis zum Ablauf der Fristen gesperrt erhalten. Sind Sie Inhaber einer Organisation mit weiteren Mitgliedern, übertragen Sie zuerst die Inhaberschaft.
        </p>
        {!offen ? (
          <Button type="button" size="sm" variant="ghost" icon={Trash2} className="mt-3 text-danger-700 hover:bg-danger-50" onClick={() => setOffen(true)}>
            Konto löschen …
          </Button>
        ) : (
          <form
            className="mt-4 space-y-3 rounded-2xl bg-danger-50/60 p-4 ring-1 ring-inset ring-danger-200"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await a.los(() => senden("/api/portal/konto/loeschen", { body: { passwort, bestaetigung: wort } }));
              if (r) {
                a.router.replace("/login?hinweis=konto-geloescht");
                a.router.refresh();
              }
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Feld id={`${id}-p`} label="Passwort">
                <input id={`${id}-p`} type="password" required autoComplete="current-password" className={eingabe} value={passwort} onChange={(e) => setPasswort(e.target.value)} />
              </Feld>
              <Feld id={`${id}-w`} label="Zur Bestätigung „LÖSCHEN“ eingeben">
                <input id={`${id}-w`} required autoComplete="off" className={eingabe} value={wort} onChange={(e) => setWort(e.target.value)} />
              </Feld>
            </div>
            <FehlerBox>{a.fehler}</FehlerBox>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={a.laeuft || wort.trim().toUpperCase() !== "LÖSCHEN"} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-danger-700 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-danger-800 disabled:opacity-50">
                <Trash2 aria-hidden="true" className="h-4 w-4" /> Endgültig löschen
              </button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
