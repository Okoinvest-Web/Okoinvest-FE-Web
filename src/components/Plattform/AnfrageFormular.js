"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Send } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { herkunft } from "@/lib/herkunft";
import Textfeld from "@/components/formular/Textfeld";
import useFormular, { regel } from "@/components/formular/useFormular";
import { AbsendeKnopf, useAbsenden } from "@/components/formular/Absenden";
import { AutosaveHinweis, entwurfVorbelegen, useEntwurf } from "@/components/formular/Entwurf";
import { FeldMeldung } from "@/components/formular/FeldRahmen";
import { ErfolgsAnsicht, FormFehler } from "@/components/formular/Meldungen";
import { checkboxKlasse } from "@/components/formular/stil";

/**
 * Einheitliches Anfrageformular aller Zielgruppen.
 *
 * Schickt an POST /api/anfrage → Vorgang im Backoffice. Wer sich später
 * mit derselben E-Mail registriert, sieht den Vorgang samt Status im Portal.
 *
 * Props:
 *  typ        flaeche | agri | investor | projekt | reststrom | energiegemeinschaft | genossenschaft | kommune | carport | speicher | kontakt
 *  daten      fachliche Zusatzdaten (z. B. Ergebnis eines Rechners) – werden mitgeschickt
 *  felder     zusätzliche Kontaktfelder: firma, telefon, plz, ort, land, nachricht
 *  titel/text/button/erfolgText  Beschriftungen
 *  dunkel     für Navy-Flächen
 *
 * Darstellung (T5): eigene Inline-Prüfung beim Verlassen des Felds statt nativer Browser-Blasen, Fokus auf das
 * erste fehlerhafte Feld, Absende-Choreografie, Entwurf im Tab gesichert, Erfolg mit Fokus und Übergabe von
 * Name/E-Mail an die Registrierung (über sessionStorage, nicht über die URL). Server prüft verbindlich.
 */

const SCHEMA = (felder, land) => ({
  vorname: [regel.pflicht("Bitte geben Sie Ihren Vornamen an."), regel.laenge(1, 80, "Der Vorname")],
  nachname: [regel.pflicht("Bitte geben Sie Ihren Nachnamen an."), regel.laenge(1, 80, "Der Nachname")],
  email: [regel.pflicht("Bitte geben Sie Ihre E-Mail-Adresse an, z. B. name@firma.de."), regel.email()],
  ...(felder.includes("telefon") ? { telefon: [regel.telefon()] } : {}),
  ...(felder.includes("plz") ? { plz: [regel.plz(land)] } : {}),
  ...(felder.includes("nachricht") ? { nachricht: [regel.laenge(0, 5000, "Die Nachricht")] } : {}),
  einwilligung: [regel.haken("Bitte stimmen Sie der Verarbeitung zu, damit wir Ihre Anfrage bearbeiten dürfen.")],
});

export default function AnfrageFormular({
  typ = "kontakt",
  daten = {},
  felder = ["telefon", "nachricht"],
  titel,
  text,
  button = "Anfrage senden",
  erfolgText = "Danke! Ihre Anfrage ist eingegangen. Wir melden uns in der Regel innerhalb von zwei Werktagen.",
  rolle,
  className,
  dunkel = false,
}) {
  const id = useId();
  const [land, setLand] = useState("DE");
  const form = useFormular(
    { vorname: "", nachname: "", firma: "", email: "", telefon: "", plz: "", ort: "", land: "DE", nachricht: "", einwilligung: false, website: "" },
    // Schema hängt vom Land ab (PLZ-Länge) – neu bauen, wenn das Land wechselt
    SCHEMA_CACHE(felder.join(","), land)
  );
  const a = useAbsenden({ uebersetzen: (e) => e?.message || "Senden fehlgeschlagen. Bitte versuchen Sie es erneut." });
  const [ergebnis, setErgebnis] = useState(null);
  const entwurf = useEntwurf(`anfrage-${typ}`, form.werte, { ohne: ["einwilligung", "website"], wiederherstellen: form.setzeAlle, aktiv: !ergebnis && a.status === "bereit" });
  const w = form.werte;

  async function absenden(e) {
    e.preventDefault();
    if (a.status !== "bereit") return; // Doppelabsendung verhindern
    if (w.website) return; // Honeypot
    if (!form.pruefeAlles()) return;
    const kontakt = {};
    const erlaubt = ["vorname", "nachname", "email", ...["anrede", "firma", "telefon", "plz", "ort", "land"].filter((k) => felder.includes(k))];
    for (const k of erlaubt) {
      const v = w[k];
      if (v) kontakt[k] = String(v).trim();
    }
    const nachricht = felder.includes("nachricht") ? w.nachricht : "";
    await a.los(
      async () => {
        const res = await fetch("/api/anfrage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typ,
            kontakt,
            daten: { ...daten, ...(nachricht ? { nachricht: String(nachricht) } : {}) },
            einwilligung: !!w.einwilligung,
            herkunft: safeHerkunft(),
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || "Senden fehlgeschlagen");
        return json;
      },
      {
        haltezeit: 800,
        zuruecksetzen: false,
        danach: (json) => {
          entwurf.verwerfen();
          // Name/E-Mail für die Registrierung bereitlegen (nur in diesem Tab)
          entwurfVorbelegen("registrierung", { vorname: kontakt.vorname, nachname: kontakt.nachname, email: kontakt.email, firma: kontakt.firma, telefon: kontakt.telefon });
          setErgebnis(json);
        },
      }
    );
  }

  const feldProps = (k) => ({ ...form.feld(k), dunkel });

  if (ergebnis) {
    const registrieren = `/registrieren?${new URLSearchParams({ rolle: rolle || rolleFuerTyp(typ), vorgang: ergebnis?.id || "" })}`;
    return (
      <div className={cn("rounded-3xl p-7 md:p-9", dunkel ? "bg-white/[0.06] ring-1 ring-white/10" : "bg-ov-50 ring-1 ring-ov-200", className)}>
        <ErfolgsAnsicht titel="Anfrage eingegangen" text={erfolgText} dunkel={dunkel}>
          {ergebnis?.id && (
            <p className={cn("mt-3 text-[13.5px]", dunkel ? "text-white/75" : "text-ink-600")}>
              Vorgangsnummer <span className="ov-num font-semibold">{ergebnis.id}</span>
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={registrieren} className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-gruen transition-colors hover:bg-ov-700">
              Status im Portal verfolgen <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
          <p className={cn("mt-3 text-[13px]", dunkel ? "text-white/70" : "text-ink-600")}>Name und E-Mail-Adresse übernehmen wir in die Registrierung – Sie vergeben nur noch ein Passwort.</p>
        </ErfolgsAnsicht>
      </div>
    );
  }

  const einwFehler = form.beruehrt.einwilligung ? form.fehler.einwilligung : "";

  return (
    <form ref={form.formRef} onSubmit={absenden} noValidate className={cn("space-y-5", className)} aria-labelledby={titel ? `${id}-t` : undefined}>
      {titel && (
        <div>
          <p id={`${id}-t`} className={cn("font-display text-[22px] font-bold", dunkel ? "text-white" : "text-ink-900")}>{titel}</p>
          {text && <p className={cn("mt-1.5 text-[15px] leading-relaxed", dunkel ? "text-white/75" : "text-ink-600")}>{text}</p>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Textfeld id={`${id}-vn`} label="Vorname" pflicht autoComplete="given-name" maxLength={80} {...feldProps("vorname")} />
        <Textfeld id={`${id}-nn`} label="Nachname" pflicht autoComplete="family-name" maxLength={80} {...feldProps("nachname")} />
        {felder.includes("firma") && <Textfeld id={`${id}-fi`} label="Unternehmen / Betrieb" optional autoComplete="organization" maxLength={120} className="sm:col-span-2" {...feldProps("firma")} />}
        <Textfeld id={`${id}-em`} label="E-Mail" pflicht type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={190} className={felder.includes("telefon") ? "" : "sm:col-span-2"} {...feldProps("email")} />
        {felder.includes("telefon") && <Textfeld id={`${id}-te`} label="Telefon" optional type="tel" inputMode="tel" autoComplete="tel" maxLength={40} {...feldProps("telefon")} />}
        {felder.includes("plz") && <Textfeld id={`${id}-plz`} label="PLZ" optional inputMode="numeric" autoComplete="postal-code" maxLength={10} {...feldProps("plz")} />}
        {felder.includes("ort") && <Textfeld id={`${id}-ort`} label="Ort" optional autoComplete="address-level2" maxLength={80} {...feldProps("ort")} />}
        {felder.includes("land") && (
          <Textfeld
            id={`${id}-la`}
            als="select"
            label="Land"
            className="sm:col-span-2"
            {...feldProps("land")}
            onChange={(e) => {
              form.setze("land", e.target.value);
              setLand(e.target.value);
            }}
          >
            <option value="DE">Deutschland</option>
            <option value="AT">Österreich</option>
            <option value="CH">Schweiz</option>
          </Textfeld>
        )}
        {felder.includes("nachricht") && <Textfeld id={`${id}-na`} als="textarea" label="Ihre Nachricht" optional rows={4} maxLength={5000} className="sm:col-span-2" {...feldProps("nachricht")} />}
      </div>
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={w.website} onChange={(e) => form.setze("website", e.target.value)} />
      <div>
        <label className={cn("flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed", dunkel ? "text-white/80" : "text-ink-700")}>
          <input
            type="checkbox"
            name="einwilligung"
            id={`${id}-ew`}
            data-feld="einwilligung"
            checked={!!w.einwilligung}
            onChange={(e) => {
              form.setze("einwilligung", e.target.checked);
              form.verlassen("einwilligung");
            }}
            aria-invalid={einwFehler ? true : undefined}
            aria-describedby={einwFehler ? `${id}-ew-fehler` : undefined}
            className={checkboxKlasse}
          />
          <span>
            Ich bin einverstanden, dass ÖkoInvest meine Angaben zur Bearbeitung der Anfrage verarbeitet. Details in der{" "}
            <Link href="/datenschutz" className={cn("font-medium underline underline-offset-2", dunkel ? "text-white" : "text-ink-900")}>Datenschutzerklärung</Link>.
            <span aria-hidden="true" className={dunkel ? "text-ov-300" : "text-ov-700"}> *</span>
          </span>
        </label>
        <FeldMeldung id={`${id}-ew`} fehler={einwFehler} dunkel={dunkel} />
      </div>
      <FormFehler dunkel={dunkel}>{a.fehler}</FormFehler>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AbsendeKnopf status={a.status} icon={Send} laedtText="Wird gesendet …" erfolgText="Gesendet" className="shrink-0 px-7">
          {button}
        </AbsendeKnopf>
        <p className={cn("flex items-center gap-1.5 text-[13px]", dunkel ? "text-white/70" : "text-ink-500")}>
          <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Verschlüsselt übertragen · kostenlos & unverbindlich
        </p>
      </div>
      <AutosaveHinweis stand={entwurf.stand} zeit={entwurf.zeit} dunkel={dunkel} onVerwerfen={() => { entwurf.verwerfen(); form.setzeAlle({ vorname: "", nachname: "", firma: "", email: "", telefon: "", plz: "", ort: "", nachricht: "" }); }} />
    </form>
  );
}

// Schema je Feldliste und Land nur einmal bauen (stabile Referenz für useFormular)
const SCHEMAS = new Map();
function SCHEMA_CACHE(felderSchluessel, land) {
  const k = `${felderSchluessel}|${land}`;
  if (!SCHEMAS.has(k)) SCHEMAS.set(k, SCHEMA(felderSchluessel.split(","), land));
  return SCHEMAS.get(k);
}

function rolleFuerTyp(typ) {
  return (
    {
      flaeche: "flaeche",
      agri: "landwirt",
      investor: "investor",
      projekt: "anbieter",
      reststrom: "unternehmen",
      carport: "unternehmen",
      speicher: "unternehmen",
      genossenschaft: "mitglied",
      energiegemeinschaft: "mitglied",
      kommune: "unternehmen",
    }[typ] || "flaeche"
  );
}

function safeHerkunft() {
  try {
    return herkunft() || undefined;
  } catch {
    return undefined;
  }
}
