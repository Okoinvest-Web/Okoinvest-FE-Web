"use client";

// Anmeldung: Passwort oder passwortlos per E-Mail-Link; bei aktiver Zwei-Faktor-Anmeldung folgt der Code-Schritt.

import { useId, useRef, useState } from "react";
import Link from "@/components/Land/Link";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, MailCheck, Wand2 } from "lucide-react";
import { senden, sicheresZiel } from "@/lib/plattform/client";
import { cn } from "@/components/ui/cn";
import { mitUebergang } from "@/components/ui/motion";
import Textfeld from "@/components/formular/Textfeld";
import PasswortFeld from "@/components/formular/PasswortFeld";
import useFormular, { regel } from "@/components/formular/useFormular";
import { AbsendeKnopf, useAbsenden } from "@/components/formular/Absenden";
import { ErfolgsAnsicht, FormErfolg, FormFehler } from "@/components/formular/Meldungen";
import ZweiFaktorSchritt from "./ZweiFaktorSchritt";

const HINWEISE = {
  abgemeldet: { ton: "ok", text: "Sie wurden abgemeldet." },
  "link-ungueltig": { ton: "fehler", text: "Der Link ist ungültig oder abgelaufen. Melden Sie sich an oder fordern Sie einen neuen Link an." },
  "passwort-gesetzt": { ton: "ok", text: "Ihr neues Passwort ist gespeichert." },
  "konto-geloescht": { ton: "ok", text: "Ihr Konto wurde gelöscht. Vielen Dank für Ihr Vertrauen." },
  "zwei-faktor-abgelaufen": { ton: "fehler", text: "Die Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an." },
};

const nachricht = (e) => e?.message || "Die Anmeldung hat nicht geklappt. Bitte versuchen Sie es erneut.";

const SCHEMA_PASSWORT = {
  email: [regel.pflicht("Bitte geben Sie Ihre E-Mail-Adresse an, z. B. name@firma.de."), regel.email()],
  passwort: [regel.pflicht("Bitte geben Sie Ihr Passwort ein.")],
};
const SCHEMA_LINK = { email: SCHEMA_PASSWORT.email };

const MODI = [
  { id: "passwort", label: "Passwort", icon: KeyRound },
  { id: "link", label: "E-Mail-Link", icon: Wand2 },
];

/** Nach erfolgreicher Anmeldung weiterleiten */
export function weiterNachLogin(router, weiter, nutzer) {
  const standard = nutzer?.zweiFaktorPflichtOffen ? "/portal/sicherheit?pflicht=1" : nutzer?.rollen?.includes("admin") ? "/portal/admin" : "/portal";
  router.replace(nutzer?.zweiFaktorPflichtOffen ? standard : sicheresZiel(weiter, standard));
  router.refresh();
}

export default function LoginFormular({ weiter, hinweis, demoKonten = [], demo = false }) {
  const router = useRouter();
  const id = useId();
  const [modus, setModus] = useState("passwort"); // passwort | link | link-gesendet | zwei-faktor
  const [meldung, setMeldung] = useState(HINWEISE[hinweis] || null);
  const pw = useFormular({ email: "", passwort: "" }, SCHEMA_PASSWORT);
  const ln = useFormular({ email: "" }, SCHEMA_LINK);
  const anmeldung = useAbsenden({ uebersetzen: nachricht });
  const linkSenden = useAbsenden({ uebersetzen: nachricht });
  const tabs = useRef([]);

  async function anmelden(e) {
    e.preventDefault();
    if (anmeldung.status !== "bereit" || !pw.pruefeAlles()) return;
    setMeldung(null);
    let zweiterFaktor = false;
    await anmeldung.los(
      async () => {
        const r = await senden("/api/auth/login", { body: { email: pw.werte.email, passwort: pw.werte.passwort } });
        if (r.zweiFaktor) zweiterFaktor = true;
        return r;
      },
      {
        haltezeit: 650,
        zuruecksetzen: false,
        danach: (r) => {
          if (zweiterFaktor) return mitUebergang(() => setModus("zwei-faktor"));
          weiterNachLogin(router, weiter, r.nutzer);
        },
      }
    );
  }

  async function linkAnfordern(e) {
    e.preventDefault();
    if (linkSenden.status !== "bereit" || !ln.pruefeAlles()) return;
    await linkSenden.los(() => senden("/api/auth/magic-link", { body: { email: ln.werte.email } }), {
      haltezeit: 500,
      danach: () => mitUebergang(() => setModus("link-gesendet")),
    });
  }

  const registrieren = `/registrieren${weiter ? `?weiter=${encodeURIComponent(weiter)}` : ""}`;

  if (modus === "zwei-faktor") {
    return (
      <ZweiFaktorSchritt
        onErfolg={(r) => weiterNachLogin(router, weiter, r.nutzer)}
        onAbbrechen={(text) => {
          mitUebergang(() => {
            setModus("passwort");
            pw.setzeAlle({ passwort: "" });
            setMeldung(text ? { ton: "fehler", text } : null);
          });
        }}
      />
    );
  }

  if (modus === "link-gesendet") {
    return (
      <ErfolgsAnsicht
        titel="Bitte prüfen Sie Ihr Postfach"
        text={`Wenn ein Konto mit ${ln.werte.email || "dieser Adresse"} besteht, haben wir Ihnen einen Anmelde-Link gesendet. Er ist 15 Minuten gültig und funktioniert nur einmal.`}
        icon={
          <span aria-hidden="true" className="ov-erfolg flex h-14 w-14 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
            <MailCheck className="h-7 w-7" />
          </span>
        }
      >
        {demo && <p className="mt-3 text-[13px] text-ink-600">Demo-Modus: Es wird keine E-Mail versendet. Der Link steht im Server-Log und im Backoffice unter „E-Mail-Postausgang“.</p>}
        <button type="button" onClick={() => mitUebergang(() => setModus("passwort"))} className="mt-5 inline-flex h-10 items-center text-[14px] font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline">
          Zurück zur Anmeldung mit Passwort
        </button>
      </ErfolgsAnsicht>
    );
  }

  /** WAI-ARIA-Tabs: Pfeiltasten, Pos1/Ende, automatische Aktivierung */
  const wechsel = (m) => {
    if (m === modus) return;
    setModus(m);
    // E-Mail mitnehmen, damit nichts doppelt getippt wird
    if (m === "link" && pw.werte.email && !ln.werte.email) ln.setzeAlle({ email: pw.werte.email });
    if (m === "passwort" && ln.werte.email && !pw.werte.email) pw.setzeAlle({ email: ln.werte.email });
    anmeldung.setFehler("");
    linkSenden.setFehler("");
  };
  const tabTaste = (e, i) => {
    const n = MODI.length;
    const ziel = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (ziel < 0) return;
    e.preventDefault();
    wechsel(MODI[ziel].id);
    tabs.current[ziel]?.focus();
  };

  return (
    <div className="space-y-6">
      {meldung && (meldung.ton === "ok" ? <FormErfolg>{meldung.text}</FormErfolg> : <FormFehler>{meldung.text}</FormFehler>)}
      <div role="tablist" aria-label="Anmeldeweg" className="relative grid grid-cols-2 rounded-full bg-sand-100 p-1 ring-1 ring-inset ring-sand-200">
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-e2 ring-1 ring-ink-200/70 transition-transform duration-300 ease-ov-out"
          style={{ transform: `translateX(${modus === "link" ? "100%" : "0"})` }}
        />
        {MODI.map((m, i) => {
          const Icon = m.icon;
          const aktiv = modus === m.id;
          return (
            <button
              key={m.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${m.id}`}
              aria-selected={aktiv}
              aria-controls={`${id}-panel`}
              tabIndex={aktiv ? 0 : -1}
              onClick={() => wechsel(m.id)}
              onKeyDown={(e) => tabTaste(e, i)}
              className={cn("relative z-10 flex h-10 items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors duration-200", aktiv ? "text-ink-900" : "text-ink-600 hover:text-ink-900")}
            >
              <Icon aria-hidden="true" className={cn("h-4 w-4", aktiv && "text-ov-600")} /> {m.label}
            </button>
          );
        })}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${modus}`}>
        {modus === "passwort" ? (
          <form key="passwort" ref={pw.formRef} onSubmit={anmelden} noValidate className="ov-step-zurueck space-y-5">
            <Textfeld id={`${id}-e`} label="E-Mail-Adresse" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} pflicht {...pw.feld("email")} />
            <PasswortFeld
              id={`${id}-p`}
              label="Passwort"
              pflicht
              autoComplete="current-password"
              zusatz={<Link href="/passwort-vergessen" className="font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline">Passwort vergessen?</Link>}
              {...pw.feld("passwort")}
              gueltig={false}
            />
            <FormFehler>{anmeldung.fehler}</FormFehler>
            <AbsendeKnopf status={anmeldung.status} icon={LogIn} block laedtText="Anmeldung läuft …" erfolgText="Angemeldet">
              Anmelden
            </AbsendeKnopf>
          </form>
        ) : (
          <form key="link" ref={ln.formRef} onSubmit={linkAnfordern} noValidate className="ov-step-vor space-y-5">
            <p className="text-[14.5px] leading-relaxed text-ink-600">Ohne Passwort: Wir senden Ihnen einen einmaligen Anmelde-Link (15 Minuten gültig). Mit aktiver Zwei-Faktor-Anmeldung fragen wir danach zusätzlich Ihren Code ab.</p>
            <Textfeld id={`${id}-m`} label="E-Mail-Adresse" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} pflicht {...ln.feld("email")} />
            <FormFehler>{linkSenden.fehler}</FormFehler>
            <AbsendeKnopf status={linkSenden.status} icon={Wand2} block laedtText="Link wird gesendet …" erfolgText="Link gesendet">
              Anmelde-Link senden
            </AbsendeKnopf>
          </form>
        )}
      </div>
      <p className="text-center text-[14.5px] text-ink-600">
        Noch kein Konto?{" "}
        <Link href={registrieren} className="font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline">Kostenlos registrieren</Link>
      </p>

      {demoKonten.length > 0 && (
        <div className="rounded-2xl bg-sun-300/20 p-4 ring-1 ring-inset ring-sun-400/40">
          <p className="text-[13px] font-semibold text-ink-900">Demo-Modus – fiktive Konten zum Ausprobieren</p>
          <p className="mt-0.5 text-[12.5px] text-ink-600">Passwort für alle: <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">{demoKonten[0].passwort}</code></p>
          {["Kunden & Partner", "Energiegemeinschaft", "Backoffice"].filter((gruppe) => demoKonten.some((k) => (k.gruppe || "Kunden & Partner") === gruppe)).map((gruppe) => (
          <div key={gruppe} className="mt-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">{gruppe}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {demoKonten.filter((k) => (k.gruppe || "Kunden & Partner") === gruppe).map((k) => (
              <button
                key={k.email}
                type="button"
                onClick={() => {
                  setModus("passwort");
                  pw.setzeAlle({ email: k.email, passwort: k.passwort });
                }}
                className="rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:ring-ov-400"
              >
                {k.label}
              </button>
            ))}
          </div>
          </div>
          ))}
        </div>
      )}
    </div>
  );
}
