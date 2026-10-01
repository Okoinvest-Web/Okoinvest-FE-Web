"use client";

// Registrierung: Rollenwahl (bei vorgewählter Rolle eingeklappt zu „Sie registrieren sich als … · ändern“),
// Angaben mit Inline-Prüfung beim Verlassen des Felds, Passwort mit Stärkeanzeige, Entwurf im Tab gesichert
// (ohne Passwort), Absende-Choreografie. Die maßgebliche Prüfung erfolgt serverseitig (/api/auth/registrieren).

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Factory, FolderKanban, Landmark, LandPlot, PencilLine, Tractor, TrendingUp, UserPlus, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden, sicheresZiel } from "@/lib/plattform/client";
import { ROLLEN } from "@/lib/plattform/konstanten";
import Textfeld from "@/components/formular/Textfeld";
import PasswortFeld from "@/components/formular/PasswortFeld";
import useFormular, { regel } from "@/components/formular/useFormular";
import { AbsendeKnopf, useAbsenden } from "@/components/formular/Absenden";
import { AutosaveHinweis, useEntwurf } from "@/components/formular/Entwurf";
import { FeldMeldung } from "@/components/formular/FeldRahmen";
import { FormFehler } from "@/components/formular/Meldungen";
import { checkboxKlasse } from "@/components/formular/stil";

const ICONS = { flaeche: LandPlot, landwirt: Tractor, investor: TrendingUp, anbieter: FolderKanban, unternehmen: Factory, mitglied: Users, kommune: Landmark };

const SCHEMA = {
  rollen: [regel.auswahl("Bitte wählen Sie mindestens eine Rolle – sie lässt sich später im Profil ergänzen.")],
  vorname: [regel.pflicht("Bitte geben Sie Ihren Vornamen an."), regel.laenge(1, 80, "Der Vorname")],
  nachname: [regel.pflicht("Bitte geben Sie Ihren Nachnamen an."), regel.laenge(1, 80, "Der Nachname")],
  firma: [regel.laenge(0, 120, "Der Name")],
  email: [regel.pflicht("Bitte geben Sie Ihre E-Mail-Adresse an, z. B. name@firma.de."), regel.email()],
  telefon: [regel.telefon()],
  passwort: [regel.pflicht("Bitte legen Sie ein Passwort fest."), regel.passwort()],
  agb: [regel.haken("Bitte akzeptieren Sie die Nutzungsbedingungen, um das Konto anzulegen.")],
};

const nachricht = (e) => e?.message || "Das Konto konnte nicht angelegt werden. Bitte versuchen Sie es erneut.";

export default function RegistrierFormular({ rolleStart, vorgang, weiter, vorbelegung = {} }) {
  const router = useRouter();
  const id = useId();
  const form = useFormular(
    {
      rollen: rolleStart ? [rolleStart] : [],
      vorname: vorbelegung.vorname || "",
      nachname: vorbelegung.nachname || "",
      firma: vorbelegung.firma || "",
      email: vorbelegung.email || "",
      telefon: vorbelegung.telefon || "",
      passwort: "",
      agb: false,
      website: "",
    },
    SCHEMA
  );
  const [rollenOffen, setRollenOffen] = useState(!rolleStart);
  const a = useAbsenden({ uebersetzen: nachricht });
  const entwurf = useEntwurf("registrierung", form.werte, { ohne: ["passwort", "agb", "website", "rollen"], wiederherstellen: form.setzeAlle, aktiv: a.status === "bereit" });
  const f = form.werte;

  const umschalten = (r) => {
    const neu = f.rollen.includes(r) ? f.rollen.filter((y) => y !== r) : [...f.rollen, r];
    form.setze("rollen", neu);
    form.verlassen("rollen");
  };

  async function absenden(e) {
    e.preventDefault();
    if (a.status !== "bereit") return;
    if (!form.pruefeAlles()) {
      if (form.fehler.rollen || !f.rollen.length) setRollenOffen(true);
      return;
    }
    await a.los(() => senden("/api/auth/registrieren", { body: { ...f, rollen: f.rollen, vorgang: vorgang || undefined } }), {
      haltezeit: 800,
      zuruecksetzen: false,
      danach: () => {
        entwurf.verwerfen();
        router.replace(sicheresZiel(weiter, "/portal/willkommen")); // geführter Einstieg (Bedienung & Onboarding)
        router.refresh();
      },
    });
  }

  const gewaehlt = ROLLEN.filter((r) => f.rollen.includes(r.id));
  const rollenFehler = form.beruehrt.rollen ? form.fehler.rollen : "";

  return (
    <form ref={form.formRef} onSubmit={absenden} noValidate className="space-y-8">
      <fieldset aria-describedby={rollenFehler ? `${id}-rollen-fehler` : undefined}>
        <legend className="font-display text-[17px] font-bold text-ink-900">1. Wofür möchten Sie das Portal nutzen?</legend>
        {!rollenOffen && gewaehlt.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-ov-50 px-4 py-3 ring-1 ring-inset ring-ov-200">
            <span className="text-[14px] text-ov-900">Sie registrieren sich als</span>
            {gewaehlt.map((r) => {
              const Icon = ICONS[r.id];
              return (
                <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ov-200">
                  <Icon aria-hidden="true" className="h-4 w-4 text-ov-700" /> {r.label}
                </span>
              );
            })}
            <button type="button" onClick={() => setRollenOffen(true)} className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-ov-700 hover:bg-white hover:text-ov-800">
              <PencilLine aria-hidden="true" className="h-4 w-4" /> ändern
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-[13.5px] text-ink-500">Mehrfachauswahl möglich – Rollen lassen sich später im Profil ergänzen.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2" data-feld="rollen" data-feld-huelle="">
              {ROLLEN.map((r) => {
                const Icon = ICONS[r.id];
                const aktiv = f.rollen.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={cn(
                      "group relative flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 ring-inset transition-[box-shadow,background-color] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                      aktiv ? "bg-ov-50 shadow-e2 ring-ov-400" : "bg-white ring-ink-300 hover:ring-ov-300",
                      rollenFehler && !aktiv && "ring-danger-300"
                    )}
                  >
                    <input type="checkbox" checked={aktiv} onChange={() => umschalten(r.id)} className="sr-only" />
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors", aktiv ? "bg-ov-600 text-white" : "bg-sand-100 text-ov-700")}>
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 pr-5">
                      <span className="block text-[15px] font-semibold text-ink-900">{r.label}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-ink-600">{r.text}</span>
                    </span>
                    <span aria-hidden="true" className={cn("absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full ring-1", aktiv ? "bg-ov-600 text-white ring-ov-600" : "ring-ink-400")}>
                      {aktiv && <Check className="ov-erfolg h-3 w-3" strokeWidth={3} />}
                    </span>
                  </label>
                );
              })}
            </div>
            <FeldMeldung id={`${id}-rollen`} fehler={rollenFehler} />
          </>
        )}
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-[17px] font-bold text-ink-900">2. Ihre Angaben</legend>
        {vorgang && (
          <p className="rounded-2xl bg-ov-50 px-4 py-3 text-[14px] text-ov-900 ring-1 ring-inset ring-ov-200">
            Ihre Anfrage <span className="ov-num font-semibold">{vorgang}</span> wird mit dem Konto verknüpft, wenn Sie dieselbe E-Mail-Adresse verwenden.
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Textfeld id={`${id}-vn`} label="Vorname" pflicht autoComplete="given-name" maxLength={80} {...form.feld("vorname")} />
          <Textfeld id={`${id}-nn`} label="Nachname" pflicht autoComplete="family-name" maxLength={80} {...form.feld("nachname")} />
          <Textfeld id={`${id}-fi`} label="Unternehmen / Betrieb" optional autoComplete="organization" maxLength={120} className="sm:col-span-2" {...form.feld("firma")} />
          <Textfeld id={`${id}-em`} label="E-Mail-Adresse" pflicht type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={190} hinweis="Ihre Anmeldung – wir geben sie nicht weiter." {...form.feld("email")} />
          <Textfeld id={`${id}-te`} label="Telefon" optional type="tel" inputMode="tel" autoComplete="tel" maxLength={40} hinweis="Für Rückfragen zu Ihrem Vorhaben." {...form.feld("telefon")} />
          <div className="sm:col-span-2">
            <PasswortFeld
              id={`${id}-pw`}
              label="Passwort"
              pflicht
              staerke
              email={f.email}
              personName={`${f.vorname} ${f.nachname}`}
              autoComplete="new-password"
              maxLength={200}
              hinweis="Mindestens 10 Zeichen, Buchstaben und eine Ziffer oder ein Sonderzeichen."
              {...form.feld("passwort")}
            />
          </div>
        </div>
      </fieldset>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={(e) => form.setze("website", e.target.value)} />

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-ink-700">
          <input
            type="checkbox"
            id={`${id}-agb`}
            className={checkboxKlasse}
            aria-invalid={form.beruehrt.agb && form.fehler.agb ? true : undefined}
            aria-describedby={form.beruehrt.agb && form.fehler.agb ? `${id}-agb-fehler` : undefined}
            name="agb"
            data-feld="agb"
            checked={f.agb}
            onChange={(e) => {
              form.setze("agb", e.target.checked);
              form.verlassen("agb");
            }}
          />
          <span>
            Ich akzeptiere die <Link href="/nutzungsbedingungen" className="font-medium text-ink-900 underline underline-offset-2">Nutzungsbedingungen</Link> und habe die{" "}
            <Link href="/datenschutz" className="font-medium text-ink-900 underline underline-offset-2">Datenschutzerklärung</Link> gelesen.
            <span aria-hidden="true" className="text-ov-700"> *</span>
          </span>
        </label>
        <FeldMeldung id={`${id}-agb`} fehler={form.beruehrt.agb ? form.fehler.agb : ""} />
      </div>

      <FormFehler>{a.fehler}</FormFehler>
      <div className="space-y-3">
        <AbsendeKnopf status={a.status} icon={UserPlus} block laedtText="Konto wird angelegt …" erfolgText="Konto angelegt">
          Kostenloses Konto anlegen
        </AbsendeKnopf>
        <AutosaveHinweis stand={entwurf.stand} zeit={entwurf.zeit} onVerwerfen={() => { entwurf.verwerfen(); form.setzeAlle({ vorname: "", nachname: "", firma: "", email: "", telefon: "" }); }} className="justify-center" />
      </div>
      <p className="text-center text-[14.5px] text-ink-600">
        Bereits registriert?{" "}
        <Link href={`/login${weiter ? `?weiter=${encodeURIComponent(weiter)}` : ""}`} className="font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline">Anmelden</Link>
      </p>
    </form>
  );
}
