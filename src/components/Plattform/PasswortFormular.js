"use client";

// Passwort vergessen (Link anfordern) und neues Passwort mit Token setzen – gemeinsame Formularbausteine,
// Inline-Prüfung beim Verlassen, Stärkeanzeige, Übereinstimmung mit Häkchen. Verbindlich prüft der Server.

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, MailCheck, Send } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { mitUebergang } from "@/components/ui/motion";
import Textfeld from "@/components/formular/Textfeld";
import PasswortFeld from "@/components/formular/PasswortFeld";
import useFormular, { regel } from "@/components/formular/useFormular";
import { AbsendeKnopf, useAbsenden } from "@/components/formular/Absenden";
import { ErfolgsAnsicht, FormErfolg, FormFehler } from "@/components/formular/Meldungen";
import ZweiFaktorSchritt from "./ZweiFaktorSchritt";

const nachricht = (e) => e?.message || "Das hat nicht geklappt. Bitte versuchen Sie es erneut.";

const SCHEMA_ANFORDERN = { email: [regel.pflicht("Bitte geben Sie die E-Mail-Adresse Ihres Kontos an, z. B. name@firma.de."), regel.email()] };
const SCHEMA_SETZEN = {
  pw: [regel.pflicht("Bitte legen Sie ein neues Passwort fest."), regel.passwort()],
  pw2: [regel.pflicht("Bitte wiederholen Sie das Passwort."), regel.gleich("pw", "Die Passwörter stimmen nicht überein.")],
};

/** Link anfordern */
export function PasswortAnfordern({ demo = false }) {
  const id = useId();
  const form = useFormular({ email: "" }, SCHEMA_ANFORDERN);
  const a = useAbsenden({ uebersetzen: nachricht });
  const [fertig, setFertig] = useState(false);

  async function absenden(e) {
    e.preventDefault();
    if (a.status !== "bereit" || !form.pruefeAlles()) return;
    await a.los(() => senden("/api/auth/passwort-vergessen", { body: { email: form.werte.email } }), {
      haltezeit: 500,
      zuruecksetzen: false,
      danach: () => mitUebergang(() => setFertig(true)),
    });
  }

  if (fertig) {
    return (
      <ErfolgsAnsicht
        titel="Bitte prüfen Sie Ihr Postfach"
        text="Wenn ein Konto mit dieser Adresse besteht, haben wir Ihnen einen Link zum Zurücksetzen gesendet. Er ist eine Stunde gültig."
        icon={
          <span aria-hidden="true" className="ov-erfolg flex h-14 w-14 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
            <MailCheck className="h-7 w-7" />
          </span>
        }
      >
        {demo && <p className="mt-3 text-[13px] text-ink-600">Demo-Modus: Es wird keine E-Mail versendet. Der Link steht im Server-Log und im Backoffice unter „Nutzer & Protokoll“.</p>}
        <Link href="/login" className="mt-5 inline-flex h-10 items-center text-[14px] font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline">Zurück zur Anmeldung</Link>
      </ErfolgsAnsicht>
    );
  }

  return (
    <form ref={form.formRef} onSubmit={absenden} noValidate className="space-y-5">
      <Textfeld id={`${id}-e`} label="E-Mail-Adresse Ihres Kontos" pflicht type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} {...form.feld("email")} />
      <FormFehler>{a.fehler}</FormFehler>
      <AbsendeKnopf status={a.status} icon={Send} block laedtText="Wird gesendet …" erfolgText="Link gesendet">
        Link zum Zurücksetzen senden
      </AbsendeKnopf>
      <p className="text-center text-[14.5px] text-ink-600">
        Doch wieder eingefallen? <Link href="/login" className="font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline">Anmelden</Link>
      </p>
    </form>
  );
}

/** Neues Passwort mit Token setzen */
export function PasswortSetzen({ token }) {
  const router = useRouter();
  const id = useId();
  const form = useFormular({ pw: "", pw2: "" }, SCHEMA_SETZEN);
  const a = useAbsenden({ uebersetzen: nachricht });
  const [zweiFaktor, setZweiFaktor] = useState(false);

  async function absenden(e) {
    e.preventDefault();
    if (a.status !== "bereit" || !form.pruefeAlles()) return;
    let mitFaktor = false;
    await a.los(
      async () => {
        const r = await senden("/api/auth/passwort-setzen", { body: { token, passwort: form.werte.pw } });
        mitFaktor = !!r.zweiFaktor;
        return r;
      },
      {
        haltezeit: 700,
        zuruecksetzen: false,
        danach: () => {
          if (mitFaktor) return mitUebergang(() => setZweiFaktor(true)); // Passwort ist gespeichert – Anmeldung erst nach dem zweiten Faktor
          router.replace("/portal");
          router.refresh();
        },
      }
    );
  }

  if (zweiFaktor) {
    return (
      <div className="space-y-4">
        <FormErfolg>Ihr neues Passwort ist gespeichert. Bitte bestätigen Sie die Anmeldung mit Ihrem zweiten Faktor.</FormErfolg>
        <ZweiFaktorSchritt onErfolg={() => { router.replace("/portal"); router.refresh(); }} onAbbrechen={() => router.replace("/login?hinweis=passwort-gesetzt")} />
      </div>
    );
  }

  return (
    <form ref={form.formRef} onSubmit={absenden} noValidate className="space-y-5">
      <PasswortFeld id={`${id}-1`} label="Neues Passwort" pflicht staerke autoComplete="new-password" maxLength={200} hinweis="Mindestens 10 Zeichen, Buchstaben und eine Ziffer oder ein Sonderzeichen." {...form.feld("pw")} />
      <PasswortFeld id={`${id}-2`} label="Passwort wiederholen" pflicht autoComplete="new-password" maxLength={200} {...form.feld("pw2")} />
      <FormFehler>{a.fehler}</FormFehler>
      <AbsendeKnopf status={a.status} icon={KeyRound} block laedtText="Wird gespeichert …" erfolgText="Passwort gespeichert">
        Passwort speichern & anmelden
      </AbsendeKnopf>
    </form>
  );
}
