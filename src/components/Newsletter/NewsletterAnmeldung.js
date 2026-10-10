"use client";

// src/components/Newsletter/NewsletterAnmeldung.js – Newsletter je Land, wiederverwendbarer Baustein (Welle 3, Paket NL)
//
// Anmeldung mit Double-Opt-in (POST /api/newsletter → Bestätigungslink per E-Mail; im Demo-Modus nur Postausgang).
//  - Themen frei wählbar, KEINES vorausgewählt; mindestens eines nötig.
//  - Land automatisch aus der Seite (/de, /at, /ch bzw. /en/<land>). Ohne Länderfassung wählt man das Land selbst
//    (die gespeicherte Länderwahl ist vorgeschlagen, aber änderbar).
//  - Der Wortlaut der Einwilligung steht sichtbar über dem Knopf – genau dieser Text wird gehasht protokolliert.
//  - Vor dem Livegang (kein Demo-Backend bzw. Produktion): nur der ehrliche Satz „Der Newsletter startet mit dem
//    Livegang.“, kein Formular, keine Datenerhebung.
//
// Props:
//   quelle     "newsletter" | "marktdaten" | "footer" | "ratgeber" | "newsroom" (nur Auswertung, keine Personendaten)
//   texte      { de: { titel, text }, en: { … } } ersetzt Überschrift und Satz
//   ebene      "h2" (Standard) | "h3" – Überschriftenebene im Baustein
//   className
// Abschnitt für Inhaltsseiten: <NewsletterBand quelle="marktdaten" /> – nur sichtbar, wenn der Newsletter aktiv ist.
// Fußbereich: <NewsletterFussleiste /> (unten) – kompakter Hinweis mit Link auf /newsletter, nur wenn aktiv.

import { useEffect, useId, useState } from "react";
import { ArrowUpRight, Mail, Send } from "lucide-react";
import Link from "@/components/Land/Link";
import { cn } from "@/components/ui/cn";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Textfeld from "@/components/formular/Textfeld";
import useFormular, { regel } from "@/components/formular/useFormular";
import { AbsendeKnopf, useAbsenden } from "@/components/formular/Absenden";
import { ErfolgsAnsicht, FormFehler } from "@/components/formular/Meldungen";
import { checkboxKlasse } from "@/components/formular/stil";
import useLand from "@/components/Land/useLand";
import { useSprache, useTexte } from "@/components/Sprache/SpracheKontext";
import { herkunft } from "@/lib/herkunft";
import { NEWSLETTER_LAENDER, THEMEN, themaIn } from "@/lib/newsletter/themen";
import { HINWEIS, NEWSLETTER_TEXT_VERSION, einwilligungsText } from "@/lib/newsletter/texte";

const TEXTE = {
  de: {
    titel: "Fristen und Marktdaten per E-Mail",
    text: "Der Newsletter für Ihr Land: nur die Themen, die Sie wählen – mit Quelle und Stand. Abmeldung jederzeit mit einem Klick.",
    aus: "Der Newsletter startet mit dem Livegang.",
    laedt: "Wird geladen …",
    fuer: (n) => `Newsletter für ${n}`,
    landWaehlen: "Für welches Land?",
    themen: "Themen",
    themenHinweis: "Bitte wählen Sie mindestens ein Thema.",
    email: "E-Mail",
    einwilligung: "Mit „Anmelden“ erklären Sie:",
    senden: "Anmelden",
    sendet: "Wird gesendet …",
    gesendet: "Gesendet",
    bestaetigen: "Bitte bestätigen Sie Ihre E-Mail-Adresse",
    spam: "Keine E-Mail erhalten? Schauen Sie bitte auch im Spam-Ordner nach. Ohne Bestätigung löschen wir Ihre Adresse nach 48 Stunden.",
    verbindung: "Die Verbindung ist gerade gestört. Bitte versuchen Sie es gleich noch einmal.",
    landFehlt: "Bitte wählen Sie Ihr Land.",
    entwurf: "Entwurf · Prüfung Rechtsabteilung",
    wortlautFehlt: "Wählen Sie Land und mindestens ein Thema – dann steht hier der genaue Wortlaut Ihrer Einwilligung.",
  },
  en: {
    titel: "Deadlines and market data by e-mail",
    text: "The newsletter for your country: only the topics you choose – with source and date. Unsubscribe at any time with one click.",
    aus: "The newsletter starts when the site goes live.",
    laedt: "Loading …",
    fuer: (n) => `Newsletter for ${n}`,
    landWaehlen: "For which country?",
    themen: "Topics",
    themenHinweis: "Please choose at least one topic.",
    email: "E-mail",
    einwilligung: "By clicking “Subscribe” you declare:",
    senden: "Subscribe",
    sendet: "Sending …",
    gesendet: "Sent",
    bestaetigen: "Please confirm your e-mail address",
    spam: "No e-mail received? Please also check your spam folder. Without confirmation, we delete your address after 48 hours.",
    verbindung: "The connection is currently disrupted. Please try again in a moment.",
    landFehlt: "Please choose your country.",
    entwurf: "Draft · legal review",
    wortlautFehlt: "Choose your country and at least one topic – the exact wording of your consent will then appear here.",
  },
};

const LAND_NAME = { de: { DE: "Deutschland", AT: "Österreich", CH: "die Schweiz" }, en: { DE: "Germany", AT: "Austria", CH: "Switzerland" } };
const LAND_KURZ = { de: { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" }, en: LAND_NAME.en };

let statusAnfrage = null; // ein Abruf je Seitenaufruf
export function newsletterStatusLaden() {
  statusAnfrage ||= fetch("/api/newsletter", { headers: { Accept: "application/json" } })
    .then((r) => r.json().catch(() => ({})))
    .then((j) => (j && j.ok && j.aktiv === true ? "an" : "aus"))
    .catch(() => {
      statusAnfrage = null;
      return "aus";
    });
  return statusAnfrage;
}

function useNewsletterStatus() {
  const [status, setStatus] = useState("laedt"); // laedt | an | aus
  useEffect(() => {
    let aktiv = true;
    newsletterStatusLaden().then((s) => aktiv && setStatus(s));
    return () => {
      aktiv = false;
    };
  }, []);
  return status;
}

const herkunftSicher = () => {
  try {
    return herkunft() || undefined;
  } catch {
    return undefined;
  }
};

const emailEn = (v) => {
  const s = String(v ?? "").trim();
  return !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? "" : "Please enter a valid e-mail address.";
};
const SCHEMA = { de: { email: [regel.pflicht("Bitte geben Sie Ihre E-Mail-Adresse an."), regel.email()] }, en: { email: [regel.pflicht("Please enter your e-mail address."), emailEn] } };

export default function NewsletterAnmeldung({ quelle = "newsletter", texte, ebene = "h2", className }) {
  const Titel = ebene === "h3" ? "h3" : "h2";
  const sprache = useSprache();
  const en = sprache === "en";
  const t = useTexte(TEXTE);
  const eigen = texte?.[en ? "en" : "de"] || null;
  const { land: seitenLand, gewaehlt } = useLand();
  const id = useId();
  const status = useNewsletterStatus();
  const form = useFormular({ email: "", website: "" }, SCHEMA[en ? "en" : "de"]);
  const [themen, setThemen] = useState([]); // nie vorausgewählt
  const [landWahl, setLandWahl] = useState("");
  const [themenFehler, setThemenFehler] = useState("");
  const [landFehler, setLandFehler] = useState("");
  const [fertig, setFertig] = useState(null);
  const a = useAbsenden({ uebersetzen: (e) => (e instanceof TypeError || !e?.message ? t.verbindung : e.message) });

  // Gespeicherte Länderwahl als Vorschlag (nur ohne Länderfassung der Seite)
  useEffect(() => {
    if (!seitenLand && gewaehlt && !landWahl) setLandWahl(gewaehlt);
  }, [seitenLand, gewaehlt, landWahl]);

  const land = seitenLand || landWahl;
  // Genau dieser Wortlaut wird beim Absenden gehasht protokolliert (Server rechnet ihn aus Land, Themen, Sprache nach)
  const wortlaut = themen.length && land ? einwilligungsText({ land, themen, sprache }) : null;

  function thema(idThema, an) {
    setThemen((alt) => {
      const neu = an ? [...new Set([...alt, idThema])] : alt.filter((x) => x !== idThema);
      if (neu.length) setThemenFehler("");
      return THEMEN.map((x) => x.id).filter((x) => neu.includes(x));
    });
  }

  async function absenden(e) {
    e.preventDefault();
    if (a.status !== "bereit") return;
    if (form.werte.website) return; // Honeypot
    const okEmail = form.pruefeAlles();
    const okThemen = themen.length > 0;
    const okLand = !!land;
    setThemenFehler(okThemen ? "" : t.themenHinweis);
    setLandFehler(okLand ? "" : t.landFehlt);
    if (!okEmail || !okThemen || !okLand) return;
    await a.los(
      async () => {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.werte.email.trim(), land, themen, sprache, quelle, herkunft: herkunftSicher() }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || (en ? "Sending failed. Please try again." : "Senden fehlgeschlagen. Bitte versuchen Sie es erneut."));
        return json;
      },
      { haltezeit: 600, zuruecksetzen: false, danach: (json) => setFertig(json) }
    );
  }

  return (
    <section
      aria-labelledby={`${id}-t`}
      data-newsletter={quelle}
      data-newsletter-status={status}
      className={cn("rounded-3xl bg-white p-5 shadow-e1 ring-1 ring-ink-200/70 print:hidden sm:p-6 md:p-8", className)}
    >
      {fertig ? (
        <ErfolgsAnsicht titel={t.bestaetigen} text={fertig.hinweis}>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-600">{t.spam}</p>
        </ErfolgsAnsicht>
      ) : (
        <>
          <div className="flex items-start gap-3.5">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200">
              <Mail className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <Titel id={`${id}-t`} className="font-display text-[19px] font-bold leading-snug text-ink-900 md:text-[21px]">
                {eigen?.titel || (seitenLand ? t.fuer(LAND_NAME[en ? "en" : "de"][seitenLand]) : t.titel)}
              </Titel>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{status === "aus" ? t.aus : eigen?.text || t.text}</p>
            </div>
          </div>

          {status === "laedt" && <p className="mt-5 text-[13.5px] text-ink-500 sm:pl-[3.375rem]">{t.laedt}</p>}

          {status === "an" && (
            <form ref={form.formRef} onSubmit={absenden} noValidate className="mt-6 space-y-5 border-t border-ink-100 pt-5" aria-labelledby={`${id}-t`} data-text-version={NEWSLETTER_TEXT_VERSION}>
              {!seitenLand && (
                <fieldset aria-describedby={landFehler ? `${id}-lf` : undefined}>
                  <legend className="mb-2 text-[14px] font-semibold text-ink-900">{t.landWaehlen}</legend>
                  <div className="flex flex-wrap gap-2">
                    {NEWSLETTER_LAENDER.map((l) => (
                      <label
                        key={l}
                        className={cn(
                          "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold ring-1 ring-inset transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                          landWahl === l ? "bg-ov-50 text-ov-800 ring-ov-300" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-400"
                        )}
                      >
                        <input
                          type="radio"
                          name={`${id}-land`}
                          value={l}
                          checked={landWahl === l}
                          onChange={() => {
                            setLandWahl(l);
                            setLandFehler("");
                          }}
                          className="h-4 w-4 accent-ov-600"
                        />
                        {LAND_KURZ[en ? "en" : "de"][l]}
                      </label>
                    ))}
                  </div>
                  {landFehler && (
                    <p id={`${id}-lf`} className="mt-1.5 text-[13px] font-medium text-danger-700">
                      {landFehler}
                    </p>
                  )}
                </fieldset>
              )}

              <fieldset aria-describedby={themenFehler ? `${id}-tf` : undefined}>
                <legend className="mb-2 text-[14px] font-semibold text-ink-900">{t.themen}</legend>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {THEMEN.map((x) => {
                    const th = themaIn(x, sprache);
                    const an = themen.includes(x.id);
                    return (
                      <label
                        key={x.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-2xl p-3.5 ring-1 ring-inset transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                          an ? "bg-ov-50/70 ring-ov-300" : "bg-white ring-ink-200 hover:ring-ink-400"
                        )}
                      >
                        <input type="checkbox" name="themen" value={x.id} data-thema={x.id} checked={an} onChange={(e) => thema(x.id, e.target.checked)} className={checkboxKlasse} />
                        <span className="min-w-0">
                          <span className="block text-[14.5px] font-semibold leading-snug text-ink-900">{th.titel}</span>
                          <span className="mt-0.5 block text-[13px] leading-snug text-ink-600">{th.text}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {themenFehler && (
                  <p id={`${id}-tf`} role="alert" className="mt-1.5 text-[13px] font-medium text-danger-700">
                    {themenFehler}
                  </p>
                )}
              </fieldset>

              <Textfeld id={`${id}-em`} label={t.email} pflicht type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={190} {...form.feld("email")} />
              {/* Honeypot */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.werte.website} onChange={(e) => form.setze("website", e.target.value)} />

              <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
                <p className="text-[13px] font-semibold text-ink-700">{t.einwilligung}</p>
                {wortlaut ? (
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700" data-einwilligung-text>
                    {wortlaut}
                  </p>
                ) : (
                  <p className="mt-1 text-[13.5px] italic leading-relaxed text-ink-500">{t.wortlautFehlt}</p>
                )}
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink-600">
                  {HINWEIS[en ? "en" : "de"].kern} {HINWEIS[en ? "en" : "de"].verweisVor}{" "}
                  <Link href="/datenschutz" className="font-medium text-ink-900 underline underline-offset-2">
                    {HINWEIS[en ? "en" : "de"].verweisLink}
                  </Link>
                  .
                </p>
                <p className="mt-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">{t.entwurf}</p>
              </div>

              <FormFehler>{a.fehler}</FormFehler>
              <AbsendeKnopf status={a.status} icon={Send} laedtText={t.sendet} erfolgText={t.gesendet} className="w-full px-6 sm:w-auto">
                {t.senden}
              </AbsendeKnopf>
            </form>
          )}
        </>
      )}
    </section>
  );
}

const FUSS = {
  de: { titel: "Newsletter für Ihr Land", text: "Fristen, Marktdaten, Flächen und Energiegemeinschaften – nur die Themen, die Sie wählen.", knopf: "Newsletter abonnieren" },
  en: { titel: "Newsletter for your country", text: "Deadlines, market data, land and energy communities – only the topics you choose.", knopf: "Subscribe to the newsletter" },
};

/** Kompakter Hinweis für den dunklen Fußbereich – erscheint nur, wenn der Newsletter Anmeldungen annimmt. */
export function NewsletterFussleiste({ className }) {
  const t = useTexte(FUSS);
  const status = useNewsletterStatus();
  if (status !== "an") return null;
  return (
    <div data-newsletter="footer" className={cn("mb-6 flex flex-col gap-4 rounded-2xl bg-white/[0.04] px-5 py-4 ring-1 ring-white/10 md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3">
        <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" />
        <div className="min-w-0">
          <p className="text-[14.5px] font-semibold text-white">{t.titel}</p>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-white/65">{t.text}</p>
        </div>
      </div>
      <Link href="/newsletter" className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
        {t.knopf}
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 ease-ov-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

const BAND = {
  de: {
    marktdaten: { eyebrow: "Newsletter", titel: "Marktdaten und Fristen per E-Mail", lead: "Neue Zuschlagswerte, Marktwerte und Gebotstermine für Ihr Land – sobald sie veröffentlicht sind, mit Quelle und Stand." },
    ratgeber: { eyebrow: "Newsletter", titel: "Neues aus Recht, Förderung und Markt", lead: "Wir melden uns, wenn sich für Ihr Land etwas ändert – nur zu den Themen, die Sie wählen." },
    standard: { eyebrow: "Newsletter", titel: "Fristen und Marktdaten per E-Mail", lead: "Der Newsletter für Ihr Land – nur zu den Themen, die Sie wählen." },
  },
  en: {
    marktdaten: { eyebrow: "Newsletter", titel: "Market data and deadlines by e-mail", lead: "New award values, market values and bidding dates for your country – as soon as they are published, with source and date." },
    ratgeber: { eyebrow: "Newsletter", titel: "News on law, funding and the market", lead: "We get in touch when something changes for your country – only on the topics you choose." },
    standard: { eyebrow: "Newsletter", titel: "Deadlines and market data by e-mail", lead: "The newsletter for your country – only on the topics you choose." },
  },
};

/** Abschnitt für Inhaltsseiten (Marktdaten, Ratgeber): erscheint nur, wenn der Newsletter Anmeldungen annimmt. */
export function NewsletterBand({ quelle = "sonstige", tone = "sand", id = "newsletter" }) {
  const t = useTexte(BAND);
  const status = useNewsletterStatus();
  if (status !== "an") return null;
  const b = t[quelle] || t.standard;
  return (
    <Section tone={tone} space="lg" id={id} className="scroll-mt-24">
      <div className="grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <SectionHeading eyebrow={b.eyebrow} title={b.titel} lead={b.lead} />
        <NewsletterAnmeldung quelle={quelle} ebene="h3" />
      </div>
    </Section>
  );
}
