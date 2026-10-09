"use client";

// src/components/Bericht/BerichtAnfordern.js – Bericht-Baustein Stufe 1 (Welle 2, Paket B4)
//
// Ruhiger Zusatz unter dem Rechner-Ergebnis: Wer einen Bericht möchte, gibt Name und E-Mail an (Telefon freiwillig)
// und bestätigt per Link (Double-Opt-in). Das Ergebnis selbst bleibt IMMER frei sichtbar – kein Sperren, kein
// Countdown, keine Vorbelegung. Der Server rechnet aus den Eingaben neu (src/lib/bericht/neuRechnen.js); es wird
// kein Ergebnis mitgeschickt.
//
// Vor dem Livegang: Ist kein Versand erlaubt (src/lib/bericht/versand.js), erscheint nur der ehrliche Satz
// „Berichtsversand startet mit dem Livegang.“ – ohne Formular, es werden keine Daten erhoben.
//
// Props: rechner (pacht | pachtangebot | flaechencheck | kommune), land (DE | AT | CH – ohne Angabe aus der Route
// /de|/at|/ch), eingaben (genau die Eingaben, mit denen das Ergebnis gerechnet wurde), className.

import { useEffect, useId, useState } from "react";
import Link from "@/components/Land/Link";
import { usePathname } from "next/navigation";
import { landAusPfad } from "@/lib/land";
import { FileText, Send } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import Textfeld from "@/components/formular/Textfeld";
import useFormular, { regel } from "@/components/formular/useFormular";
import { AbsendeKnopf, useAbsenden } from "@/components/formular/Absenden";
import { ErfolgsAnsicht, FormFehler } from "@/components/formular/Meldungen";
import { checkboxKlasse } from "@/components/formular/stil";
import { einwilligungenFuer } from "@/lib/anfrage/hinweise";
import { herkunft } from "@/lib/herkunft";
import { ANFORDERUNG, BERICHT_TEXT_VERSION } from "@/lib/bericht/texte";
import { useSprache } from "@/components/Sprache/SpracheKontext";

// Englisch (Sprachmodell): Bedienung englisch; Datenschutzhinweis und Einwilligungstexte bleiben
// in der geprüften deutschen Fassung (versioniert, BERICHT_TEXT_VERSION) – englische Fassung erst
// nach Freigabe der Rechtsabteilung.
const EN = {
  aus: "Report delivery starts when the site goes live.",
  titel: "Result as a report",
  text: "With the calculation method and all assumptions, including source and date – to print or save. Your result above stays visible without entering any details.",
  bestaetigen: "Please confirm your email address",
  spam: "No email received? Please also check your spam folder. Without confirmation, we delete your details after 48 hours.",
  anfordern: "Request report",
  vorname: "First name",
  nachname: "Last name",
  email: "Email",
  telefon: "Phone",
  telefonHinweis: "Only if you would like us to call you with questions.",
  rechtDe: "The following data protection notice and consent wording are legally binding in German:",
  freiwillig: "Voluntary – only if you wish",
  laedt: "Sending …",
  gesendet: "Sent",
  senden: "Send confirmation link",
  abbrechen: "Cancel",
  verbindung: "The connection is currently disrupted. Please try again in a moment.",
  fehlgeschlagen: "Sending failed. Please try again.",
};
const emailEn = (v) => {
  const s = String(v ?? "").trim();
  return !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? "" : "Please enter a valid email address.";
};
const SCHEMA_EN = {
  vorname: [regel.pflicht("Please enter your first name.")],
  nachname: [regel.pflicht("Please enter your last name.")],
  email: [regel.pflicht("Please enter your email address."), emailEn],
};

const AUS_TEXT = "Berichtsversand startet mit dem Livegang.";
const OPTIONEN = einwilligungenFuer({ mitTelefon: true });
const LEER = { vorname: "", nachname: "", email: "", telefon: "", website: "", ...Object.fromEntries(OPTIONEN.map((o) => [o.id, false])) };
const SCHEMA = {
  vorname: [regel.pflicht("Bitte geben Sie Ihren Vornamen an.")],
  nachname: [regel.pflicht("Bitte geben Sie Ihren Nachnamen an.")],
  email: [regel.pflicht("Bitte geben Sie Ihre E-Mail-Adresse an."), regel.email()],
};

let statusAnfrage = null; // ein Abruf je Seitenaufruf
function versandStatusLaden() {
  statusAnfrage ||= fetch("/api/rechner/bericht", { headers: { Accept: "application/json" } })
    .then((r) => r.json().catch(() => ({})))
    .then((j) => (j && j.ok && j.versand === true ? "an" : "aus"))
    .catch(() => {
      statusAnfrage = null;
      return "aus";
    });
  return statusAnfrage;
}

const herkunftSicher = () => {
  try {
    return herkunft() || undefined;
  } catch {
    return undefined;
  }
};

export default function BerichtAnfordern({ rechner, land: landProp, eingaben, className }) {
  // Rechenland kommt vom Rechner (Eingaben); ohne Angabe das Land der Route (Welle 2), sonst DE
  const routenLand = landAusPfad(usePathname() || "/").land;
  const land = landProp || routenLand || "DE";
  const en = useSprache() === "en";
  const id = useId();
  const [versand, setVersand] = useState("laedt"); // laedt | an | aus
  const [offen, setOffen] = useState(false);
  const [fertig, setFertig] = useState(null);
  const form = useFormular(LEER, en ? SCHEMA_EN : SCHEMA);
  const a = useAbsenden({ uebersetzen: (e) => (e instanceof TypeError || !e?.message ? (en ? EN.verbindung : "Die Verbindung ist gerade gestört. Bitte versuchen Sie es gleich noch einmal.") : en ? EN.fehlgeschlagen : e.message) });
  const w = form.werte;

  useEffect(() => {
    let aktiv = true;
    versandStatusLaden().then((s) => aktiv && setVersand(s));
    return () => {
      aktiv = false;
    };
  }, []);

  async function absenden(e) {
    e.preventDefault();
    if (a.status !== "bereit") return;
    if (w.website) return; // Honeypot
    if (!form.pruefeAlles()) return;
    const telefon = String(w.telefon || "").trim();
    const einwilligungen = Object.fromEntries(OPTIONEN.map((o) => [o.id, w[o.id] === true && (!o.nurMitTelefon || Boolean(telefon))]));
    await a.los(
      async () => {
        const res = await fetch("/api/rechner/bericht", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rechner,
            land,
            eingaben,
            kontakt: { vorname: w.vorname.trim(), nachname: w.nachname.trim(), email: w.email.trim(), ...(telefon ? { telefon } : {}) },
            einwilligungen,
            herkunft: herkunftSicher(),
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (json?.code === "versand_aus") setVersand("aus");
        if (!res.ok || !json.ok) throw new Error(json.error || "Senden fehlgeschlagen. Bitte versuchen Sie es erneut.");
        return json;
      },
      { haltezeit: 700, zuruecksetzen: false, danach: (json) => setFertig(json) }
    );
  }

  const kopf = (
    <div className="flex items-start gap-3.5">
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200">
        <FileText className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 id={`${id}-t`} className="font-display text-[17px] font-bold leading-snug text-ink-900">
          {en ? EN.titel : "Ergebnis als Bericht"}
        </h3>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-600">
          {versand === "aus"
            ? en ? EN.aus : AUS_TEXT
            : en ? EN.text : "Mit Rechenweg und allen Annahmen samt Quelle und Stand – zum Ausdrucken oder Speichern. Ihr Ergebnis oben bleibt ohne Angaben sichtbar."}
        </p>
      </div>
    </div>
  );

  return (
    <section
      aria-labelledby={`${id}-t`}
      data-bericht-anfordern={rechner}
      data-bericht-status={versand}
      className={cn("mt-5 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 print:hidden md:p-6", className)}
    >
      {fertig ? (
        <ErfolgsAnsicht titel={en ? EN.bestaetigen : "Bitte bestätigen Sie Ihre E-Mail-Adresse"} text={en ? undefined : fertig.hinweis}>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-600">{en ? EN.spam : "Keine E-Mail erhalten? Schauen Sie bitte auch im Spam-Ordner nach. Ohne Bestätigung löschen wir Ihre Angaben nach 48 Stunden."}</p>
        </ErfolgsAnsicht>
      ) : (
        <>
          {kopf}
          {versand === "an" && !offen && (
            <div className="mt-4 sm:pl-[3.375rem]">
              <Button variant="secondary" size="sm" icon={FileText} onClick={() => setOffen(true)} aria-expanded="false" aria-controls={`${id}-f`}>
                {en ? EN.anfordern : "Bericht anfordern"}
              </Button>
            </div>
          )}
          {versand === "an" && offen && (
            <form
              id={`${id}-f`}
              ref={form.formRef}
              onSubmit={absenden}
              noValidate
              className="ov-ein mt-5 space-y-5 border-t border-ink-100 pt-5"
              aria-labelledby={`${id}-t`}
              data-hinweis-version={BERICHT_TEXT_VERSION}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Textfeld id={`${id}-vn`} label={en ? EN.vorname : "Vorname"} pflicht autoComplete="given-name" maxLength={80} {...form.feld("vorname")} />
                <Textfeld id={`${id}-nn`} label={en ? EN.nachname : "Nachname"} pflicht autoComplete="family-name" maxLength={80} {...form.feld("nachname")} />
                <Textfeld id={`${id}-em`} label={en ? EN.email : "E-Mail"} pflicht type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={190} {...form.feld("email")} />
                <Textfeld id={`${id}-te`} label={en ? EN.telefon : "Telefon"} optional type="tel" inputMode="tel" autoComplete="tel" maxLength={40} hinweis={en ? EN.telefonHinweis : "Nur wenn Sie Rückfragen per Telefon möchten."} {...form.feld("telefon")} />
              </div>
              {/* Honeypot */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={w.website} onChange={(e) => form.setze("website", e.target.value)} />

              {en && <p className="text-[13px] font-semibold text-ink-700">{EN.rechtDe}</p>}
              <p className="text-[13.5px] leading-relaxed text-ink-600" lang={en ? "de" : undefined}>
                {ANFORDERUNG.hinweis} {ANFORDERUNG.verweisVor}{" "}
                <Link href="/datenschutz" className="font-medium text-ink-900 underline underline-offset-2">
                  {ANFORDERUNG.verweisLink}
                </Link>
                .
              </p>

              {OPTIONEN.length > 0 && (
                <fieldset className="space-y-2.5">
                  <legend className="mb-1 text-[13px] font-semibold text-ink-700">{en ? EN.freiwillig : "Freiwillig – nur wenn Sie möchten"}</legend>
                  {OPTIONEN.filter((o) => !o.nurMitTelefon || String(w.telefon || "").trim()).map((o) => (
                    <label key={o.id} className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed text-ink-700">
                      <input type="checkbox" name={o.id} data-einwilligung={o.id} checked={w[o.id] === true} onChange={(e) => form.setze(o.id, e.target.checked)} className={checkboxKlasse} />
                      <span lang={en ? "de" : undefined}>{o.text}</span>
                    </label>
                  ))}
                </fieldset>
              )}

              <FormFehler>{a.fehler}</FormFehler>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <AbsendeKnopf status={a.status} icon={Send} laedtText={en ? EN.laedt : "Wird gesendet …"} erfolgText={en ? EN.gesendet : "Gesendet"} className="shrink-0 px-6">
                  {en ? EN.senden : "Bestätigungslink senden"}
                </AbsendeKnopf>
                <button type="button" onClick={() => setOffen(false)} className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[14px] font-semibold text-ink-600 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                  {en ? EN.abbrechen : "Abbrechen"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
