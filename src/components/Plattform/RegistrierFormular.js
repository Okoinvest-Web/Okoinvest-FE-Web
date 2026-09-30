"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Factory, FolderKanban, LandPlot, Loader2, Tractor, TrendingUp, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden, sicheresZiel } from "@/lib/plattform/client";
import { ROLLEN } from "@/lib/plattform/konstanten";
import { passwortFehler } from "@/lib/plattform/validierung";
import { eingabe, Feld, FehlerBox } from "@/components/Portal/felder";

const ICONS = { flaeche: LandPlot, landwirt: Tractor, investor: TrendingUp, anbieter: FolderKanban, unternehmen: Factory, mitglied: Users };

function staerke(pw) {
  let s = 0;
  if (pw.length >= 10) s++;
  if (pw.length >= 14) s++;
  if (/[0-9]/.test(pw) && /[A-Za-zÄÖÜäöüß]/.test(pw)) s++;
  if (/[^A-Za-z0-9ÄÖÜäöüß]/.test(pw)) s++;
  return s;
}

export default function RegistrierFormular({ rolleStart, vorgang, weiter }) {
  const router = useRouter();
  const id = useId();
  const [rollen, setRollen] = useState(rolleStart ? [rolleStart] : []);
  const [f, setF] = useState({ vorname: "", nachname: "", firma: "", email: "", telefon: "", passwort: "", agb: false, website: "" });
  const [zeigen, setZeigen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const setze = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const umschalten = (r) => setRollen((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]));
  const pwHinweis = f.passwort ? passwortFehler(f.passwort) : "";
  const st = staerke(f.passwort);

  async function absenden(e) {
    e.preventDefault();
    setFehler("");
    if (!rollen.length) return setFehler("Bitte wählen Sie mindestens eine Rolle.");
    if (pwHinweis) return setFehler(pwHinweis);
    setLaeuft(true);
    try {
      await senden("/api/auth/registrieren", { body: { ...f, rollen, vorgang: vorgang || undefined } });
      router.replace(sicheresZiel(weiter, "/portal/willkommen")); // geführter Einstieg (Bedienung & Onboarding)
      router.refresh();
    } catch (err) {
      setFehler(err.message);
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={absenden} className="space-y-8">
      <fieldset>
        <legend className="font-display text-[17px] font-bold text-ink-900">1. Wofür möchten Sie das Portal nutzen?</legend>
        <p className="mt-1 text-[13.5px] text-ink-500">Mehrfachauswahl möglich – Rollen lassen sich später im Profil ergänzen.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ROLLEN.map((r) => {
            const Icon = ICONS[r.id];
            const aktiv = rollen.includes(r.id);
            return (
              <label
                key={r.id}
                className={cn(
                  "group relative flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 ring-inset transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                  aktiv ? "bg-ov-50 ring-ov-400 shadow-[0_10px_30px_-18px_rgba(85,130,39,0.6)]" : "bg-white ring-ink-200 hover:ring-ink-300"
                )}
              >
                <input type="checkbox" checked={aktiv} onChange={() => umschalten(r.id)} className="sr-only" />
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors", aktiv ? "bg-ov-600 text-white" : "bg-sand-100 text-ov-700")}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0 pr-5">
                  <span className="block text-[15px] font-semibold text-ink-900">{r.label}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-500">{r.text}</span>
                </span>
                <span aria-hidden="true" className={cn("absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full ring-1", aktiv ? "bg-ov-600 text-white ring-ov-600" : "ring-ink-300")}>
                  {aktiv && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-[17px] font-bold text-ink-900">2. Ihre Angaben</legend>
        {vorgang && (
          <p className="rounded-xl bg-ov-50 px-4 py-3 text-[13.5px] text-ov-900 ring-1 ring-ov-200">
            Ihre Anfrage <span className="ov-num font-semibold">{vorgang}</span> wird mit dem Konto verknüpft, wenn Sie dieselbe E-Mail-Adresse verwenden.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld id={`${id}-vn`} label="Vorname" pflicht>
            <input id={`${id}-vn`} required autoComplete="given-name" maxLength={80} className={eingabe} value={f.vorname} onChange={(e) => setze("vorname", e.target.value)} />
          </Feld>
          <Feld id={`${id}-nn`} label="Nachname" pflicht>
            <input id={`${id}-nn`} required autoComplete="family-name" maxLength={80} className={eingabe} value={f.nachname} onChange={(e) => setze("nachname", e.target.value)} />
          </Feld>
          <Feld id={`${id}-fi`} label="Unternehmen / Betrieb" className="sm:col-span-2">
            <input id={`${id}-fi`} autoComplete="organization" maxLength={120} className={eingabe} value={f.firma} onChange={(e) => setze("firma", e.target.value)} />
          </Feld>
          <Feld id={`${id}-em`} label="E-Mail-Adresse" pflicht>
            <input id={`${id}-em`} type="email" required autoComplete="email" maxLength={190} className={eingabe} value={f.email} onChange={(e) => setze("email", e.target.value)} />
          </Feld>
          <Feld id={`${id}-te`} label="Telefon">
            <input id={`${id}-te`} type="tel" autoComplete="tel" maxLength={40} className={eingabe} value={f.telefon} onChange={(e) => setze("telefon", e.target.value)} />
          </Feld>
          <Feld id={`${id}-pw`} label="Passwort" pflicht className="sm:col-span-2" hinweis={pwHinweis || "Mindestens 10 Zeichen, Buchstaben und eine Ziffer oder ein Sonderzeichen."}>
            <div className="relative">
              <input id={`${id}-pw`} type={zeigen ? "text" : "password"} required autoComplete="new-password" minLength={10} maxLength={200} aria-describedby={`${id}-pw-hinweis`} className={cn(eingabe, "pr-12")} value={f.passwort} onChange={(e) => setze("passwort", e.target.value)} />
              <button type="button" onClick={() => setZeigen((z) => !z)} className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100" aria-label={zeigen ? "Passwort verbergen" : "Passwort anzeigen"} aria-pressed={zeigen}>
                {zeigen ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
            {f.passwort && (
              <div className="mt-2 flex gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < st ? (st >= 3 ? "bg-ov-500" : "bg-sun-400") : "bg-ink-200")} />
                ))}
              </div>
            )}
          </Feld>
        </div>
      </fieldset>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={(e) => setze("website", e.target.value)} />

      <label className="flex items-start gap-3 text-[13.5px] leading-relaxed text-ink-600">
        <input type="checkbox" required checked={f.agb} onChange={(e) => setze("agb", e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#558227]" />
        <span>
          Ich akzeptiere die <Link href="/nutzungsbedingungen" className="underline underline-offset-2">Nutzungsbedingungen</Link> und habe die{" "}
          <Link href="/datenschutz" className="underline underline-offset-2">Datenschutzerklärung</Link> gelesen. *
        </span>
      </label>

      <FehlerBox>{fehler}</FehlerBox>
      <button type="submit" disabled={laeuft} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700 disabled:opacity-60">
        {laeuft && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
        {laeuft ? "Konto wird angelegt …" : "Kostenloses Konto anlegen"}
      </button>
      <p className="text-center text-[14.5px] text-ink-600">
        Bereits registriert?{" "}
        <Link href={`/login${weiter ? `?weiter=${encodeURIComponent(weiter)}` : ""}`} className="font-semibold text-ov-700 hover:text-ov-800">Anmelden</Link>
      </p>
    </form>
  );
}
