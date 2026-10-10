"use client";

import { useSeitenLand } from "@/components/Land/LandKontext";
import { useEffect, useId, useState } from "react";
import Link from "@/components/Land/Link";
import { usePathname } from "next/navigation";
import { ArrowRight, CalendarDays, Clock, LockKeyhole, Send } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { herkunft } from "@/lib/herkunft";
import { useEreignis } from "@/lib/ereignis";
import { landAusDaten, landNormal } from "@/lib/anfrage/laender";
import { landAusPfad } from "@/lib/land";
import { HINWEIS, RUECKRUF, einwilligungenFuer } from "@/lib/anfrage/hinweise";
import Textfeld from "@/components/formular/Textfeld";
import useFormular, { regel } from "@/components/formular/useFormular";
import { AbsendeKnopf, useAbsenden } from "@/components/formular/Absenden";
import { AutosaveHinweis, entwurfVorbelegen, useEntwurf } from "@/components/formular/Entwurf";
import { FeldMeldung } from "@/components/formular/FeldRahmen";
import { ErfolgsAnsicht, FormFehler } from "@/components/formular/Meldungen";
import { checkboxKlasse } from "@/components/formular/stil";
import AusfuellFortschritt, { pflichtErfuellt } from "@/components/formular/AusfuellFortschritt";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const PFLICHT = ["vorname", "nachname", "email"];
const NIE_AUS_ENTWURF = new Set(["land", "rueckruf", "website", "einwilligung"]);
const LAENDER_OPTIONEN = [
  ["DE", "Deutschland"],
  ["AT", "Österreich"],
  ["CH", "Schweiz"],
];

/* Nächste Schritte nach dem Absenden – nur Aussagen, die die Website ohnehin macht (keine neuen Versprechen) */
const NAECHSTE = [
  "Ihre Anfrage liegt als Vorgang bei uns vor.",
  "Unser Team prüft sie und meldet sich bei Ihnen.",
  "Status, Dokumente und Nachrichten sehen Sie im Portal.",
];

/** Beschriftungen (Sprachmodell): Props titel/text/button/erfolgText übersetzt die aufrufende Seite. */
const TEXTE = {
  de: {
    button: "Anfrage senden",
    erfolgText: "Danke! Ihre Anfrage ist eingegangen. Wir melden uns bei Ihnen.",
    eingegangen: "Anfrage eingegangen",
    vorgang: "Vorgangsnummer",
    portal: "Status im Portal verfolgen",
    portalText: "Name und E-Mail-Adresse übernehmen wir – Sie vergeben nur noch ein Passwort.",
    termin: "Termin buchen",
    jetzt: "Was jetzt passiert",
    naechste: NAECHSTE,
    vorname: "Vorname",
    nachname: "Nachname",
    firma: "Unternehmen / Betrieb",
    email: "E-Mail",
    telefon: "Telefon",
    land: "Land",
    laender: LAENDER_OPTIONEN.map(([, l]) => l),
    plz: "PLZ",
    ort: "Ort",
    nachricht: "Ihre Nachricht",
    freiwillig: "Freiwillig – nur wenn Sie möchten",
    laedt: "Wird gesendet …",
    gesendet: "Gesendet",
    sicher: "Verschlüsselt übertragen · kostenlos & unverbindlich",
  },
  en: {
    button: "Send enquiry",
    erfolgText: "Thank you! Your enquiry has been received. We will get back to you.",
    eingegangen: "Enquiry received",
    vorgang: "Reference number",
    portal: "Track the status in the portal",
    portalText: "We will carry over your name and e-mail address – you only need to choose a password.",
    termin: "Book an appointment",
    jetzt: "What happens next",
    naechste: ["Your enquiry is now on file with us.", "Our team will review it and get back to you.", "You can see status, documents and messages in the portal."],
    vorname: "First name",
    nachname: "Last name",
    firma: "Company / business",
    email: "E-mail",
    telefon: "Phone",
    land: "Country",
    laender: ["Germany", "Austria", "Switzerland"],
    plz: "Postcode",
    ort: "Town / city",
    nachricht: "Your message",
    freiwillig: "Optional – only if you wish",
    laedt: "Sending …",
    gesendet: "Sent",
    sicher: "Encrypted transmission · free of charge & without obligation",
  },
};

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
 *  land       Land aus dem Kontext der Seite (DE | AT | CH). Ohne Angabe gilt daten.land bzw. daten.eingaben.land.
 *             Ist ein Land bekannt, prüft die PLZ nach diesem Land (DE 5, AT/CH 4 Ziffern) und das Land geht als
 *             kontakt.land mit. Ist keines bekannt, das Formular hat aber ein PLZ-Feld, erscheint die Länderwahl.
 *             Welle 2 (Länderrouting): Das Land der Route (/de, /at, /ch) belegt die Länderwahl vor und geht als
 *             daten.land mit, wenn die Seite selbst keins setzt. Besucher können das Land weiter wählen – die
 *             PLZ-Regel gilt für das gewählte Land (wichtig für AT/CH-Besucher auf Seiten, die nur für DE gelten).
 *  titel/text/button/erfolgText  Beschriftungen
 *  dunkel     für Navy-Flächen
 *
 * Paket C (Welle 1):
 *  - kein Pflicht-Häkchen mehr: Hinweis nach Art. 6 Abs. 1 lit. b + optionale, getrennte, nie vorbelegte Häkchen
 *    (Texte: src/lib/anfrage/hinweise.js – ENTWURF, finaler Wortlaut aus Strang R)
 *  - Telefon ist nur Pflicht, wenn ausdrücklich ein Rückruf gewünscht wird
 *  - Messung nach erfolgreichem Absenden über den Hook aus Paket B (nur mit Einwilligung, siehe src/lib/ereignis)
 *
 * Darstellung (T5): eigene Inline-Prüfung beim Verlassen des Felds statt nativer Browser-Blasen, Fokus auf das
 * erste fehlerhafte Feld, Absende-Choreografie, Entwurf im Tab gesichert, Erfolg mit Fokus und Übergabe von
 * Name/E-Mail an die Registrierung (über sessionStorage, nicht über die URL). Server prüft verbindlich.
 */

// Schema je Feldliste/Land-Situation nur einmal bauen (stabile Referenz für useFormular).
// Die Regeln lesen Land und Rückrufwunsch aus den aktuellen Werten (alle.land, alle.rueckruf).
const SCHEMAS = new Map();
function schemaFuer(felder, { landFeld, kontextLand }) {
  const k = `${felder.join(",")}|${landFeld ? "wahl" : kontextLand || "-"}`;
  if (!SCHEMAS.has(k)) {
    SCHEMAS.set(k, {
      vorname: [regel.pflicht("Bitte geben Sie Ihren Vornamen an."), regel.laenge(1, 80, "Der Vorname")],
      nachname: [regel.pflicht("Bitte geben Sie Ihren Nachnamen an."), regel.laenge(1, 80, "Der Nachname")],
      email: [regel.pflicht("Bitte geben Sie Ihre E-Mail-Adresse an, z. B. name@firma.de."), regel.email()],
      ...(felder.includes("telefon")
        ? { telefon: [(v, alle) => (alle?.rueckruf && !String(v ?? "").trim() ? "Für den gewünschten Rückruf brauchen wir Ihre Telefonnummer." : ""), regel.telefon()] }
        : {}),
      ...(felder.includes("plz") ? { plz: [(v, alle) => regel.plz(landFeld ? alle?.land || "DE" : kontextLand || "DE", { landWaehlbar: landFeld })(v)] } : {}),
      ...(felder.includes("nachricht") ? { nachricht: [regel.laenge(0, 5000, "Die Nachricht")] } : {}),
    });
  }
  return SCHEMAS.get(k);
}

export default function AnfrageFormular({
  typ = "kontakt",
  daten = {},
  felder = ["telefon", "nachricht"],
  land: landProp,
  titel,
  text,
  button: buttonProp,
  erfolgText: erfolgProp,
  rolle,
  className,
  dunkel = false,
  versprechen = "",
}) {
  const id = useId();
  const sprache = useSprache();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache, useSeitenLand()); // Schweiz: ohne „ß“
  const button = buttonProp ?? t.button;
  const erfolgText = erfolgProp ?? t.erfolgText;
  const melden = useEreignis();
  const kontextLand = landNormal(landProp) || landAusDaten(daten);
  const routenLand = landAusPfad(usePathname() || "/").land;
  // Länderwahl zeigen, wenn bestellt – oder wenn eine PLZ abgefragt wird, das Land aber unbekannt ist
  const landFeld = felder.includes("land") || (felder.includes("plz") && !kontextLand);
  const mitTelefon = felder.includes("telefon");
  const optionen = einwilligungenFuer({ mitTelefon });
  const optionenLeer = Object.fromEntries(optionen.map((o) => [o.id, false]));
  const schema = schemaFuer(felder, { landFeld, kontextLand });
  const form = useFormular(
    { vorname: "", nachname: "", firma: "", email: "", telefon: "", plz: "", ort: "", land: kontextLand || routenLand || "DE", nachricht: "", rueckruf: false, ...optionenLeer, website: "" },
    schema
  );
  const a = useAbsenden({ uebersetzen: fehlerUebersetzen });
  const [ergebnis, setErgebnis] = useState(null);
  const entwurf = useEntwurf(`anfrage-${typ}`, form.werte, {
    // Land kommt aus dem Kontext bzw. der Auswahl, Häkchen werden nie aus einem Entwurf übernommen
    ohne: ["land", "rueckruf", "website", "einwilligung", ...optionen.map((o) => o.id)],
    wiederherstellen: (gespeichert) => form.setzeAlle(Object.fromEntries(Object.entries(gespeichert || {}).filter(([k]) => !NIE_AUS_ENTWURF.has(k) && !(k in optionenLeer)))),
    aktiv: !ergebnis && a.status === "bereit",
  });
  const w = form.werte;
  const setzeLand = form.setze;

  // Land der Seite ändert sich (z. B. Länder-Chip auf /kommunen) → Formular und PLZ-Prüfung nachziehen
  useEffect(() => {
    if (kontextLand) setzeLand("land", kontextLand);
  }, [kontextLand, setzeLand]);

  const pflicht = [...PFLICHT, ...(w.rueckruf && mitTelefon ? ["telefon"] : [])];
  const erfuellt = pflichtErfuellt(schema, w, pflicht);
  const landGesendet = landFeld ? w.land : kontextLand;

  async function absenden(e) {
    e.preventDefault();
    if (a.status !== "bereit") return; // Doppelabsendung verhindern
    if (w.website) return; // Honeypot
    if (!form.pruefeAlles()) return;
    const kontakt = {};
    const erlaubt = ["vorname", "nachname", "email", ...["anrede", "firma", "telefon", "plz", "ort"].filter((k) => felder.includes(k))];
    for (const k of erlaubt) {
      const v = w[k];
      if (v) kontakt[k] = String(v).trim();
    }
    if (landGesendet) kontakt.land = landGesendet;
    const nachricht = felder.includes("nachricht") ? w.nachricht : "";
    const einwilligungen = Object.fromEntries(optionen.map((o) => [o.id, w[o.id] === true]));
    const rueckruf = mitTelefon && w.rueckruf === true;
    const antwort = await a.los(
      async () => {
        const res = await fetch("/api/anfrage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typ,
            kontakt,
            daten: { ...(routenLand && !landAusDaten(daten) ? { land: routenLand } : {}), ...daten, ...(nachricht ? { nachricht: String(nachricht) } : {}), ...(en ? { sprache: "en" } : {}) },
            rueckruf,
            einwilligungen,
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
          // Messung (Paket B): feuert nur mit Statistik-Einwilligung und nur auf öffentlichen Seiten – ohne Personendaten
          melden("generate_lead", {
            lead_typ: typ,
            markt: landGesendet || undefined,
            quelle_formular: typeof daten?.quelle === "string" ? daten.quelle : undefined,
            rolle: rolle || rolleFuerTyp(typ),
            art: rueckruf ? "rueckruf" : "email",
          });
          setErgebnis(json);
        },
      }
    );
    // Netz-/Serverfehler: Der Knopf war während des Sendens deaktiviert, der Fokus ging verloren – zurück auf „Senden“,
    // damit ein erneuter Versuch per Enter/Leertaste möglich ist (die Meldung selbst sagt role="alert" an).
    if (!antwort) requestAnimationFrame(() => form.formRef.current?.querySelector('button[type="submit"]')?.focus());
  }

  const feldProps = (k) => ({ ...form.feld(k), dunkel });

  if (ergebnis) {
    const registrieren = `/registrieren?${new URLSearchParams({ rolle: rolle || rolleFuerTyp(typ), vorgang: ergebnis?.id || "" })}`;
    return (
      <div className={cn("rounded-3xl p-7 md:p-9", dunkel ? "bg-white/[0.06] ring-1 ring-white/10" : "bg-ov-50 ring-1 ring-ov-200", className)}>
        <ErfolgsAnsicht titel={t.eingegangen} text={erfolgText} dunkel={dunkel}>
          {ergebnis?.id && (
            <p className={cn("mt-3 text-[13.5px]", dunkel ? "text-white/75" : "text-ink-600")}>
              {t.vorgang} <span className="ov-num font-semibold">{ergebnis.id}</span>
            </p>
          )}
          {/* Erfolgs-Choreografie: Haken zeichnet sich (ErfolgsAnsicht), danach erscheinen die nächsten Schritte
              nacheinander (nur opacity/transform über .ov-ein; reduzierte Bewegung: sofort sichtbar). */}
          <div className="mt-6 grid items-start gap-3 sm:grid-cols-2">
            <Link
              href={registrieren}
              className="ov-ein group flex flex-col justify-between gap-3 rounded-2xl bg-ov-600 p-4 text-white shadow-gruen transition-colors hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300 focus-visible:ring-offset-2 sm:col-span-2 sm:flex-row sm:items-center sm:p-5"
              style={{ "--ov-delay": "420ms" }}
            >
              <span className="min-w-0">
                <span className="block text-[15.5px] font-semibold">{t.portal}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-white">{t.portalText}</span>
              </span>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-full bg-white/15 sm:self-auto">
                <ArrowRight aria-hidden="true" className="ov-pfeil h-4 w-4" />
              </span>
            </Link>
            <Link
              href={`/termin${typ === "flaeche" ? "?herkunft=flaechencheck&art=beratung_video" : typ === "kontakt" ? "?herkunft=kontakt" : ""}`}
              className={cn(
                "ov-ein group flex items-center gap-3 rounded-2xl p-4 ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500",
                dunkel ? "bg-white/[0.06] text-white ring-white/15 hover:bg-white/[0.1]" : "bg-white text-ink-900 ring-ink-200 hover:ring-ov-300"
              )}
              style={{ "--ov-delay": "520ms" }}
            >
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", dunkel ? "bg-ov-300/15 text-ov-300" : "bg-ov-50 text-ov-700")}>
                <CalendarDays aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-[14.5px] font-semibold">{t.termin}</span>
              <ArrowRight aria-hidden="true" className={cn("ov-pfeil h-4 w-4 shrink-0", dunkel ? "text-ov-300" : "text-ov-700")} />
            </Link>
            <div
              className={cn("ov-ein rounded-2xl p-4 ring-1 ring-inset", dunkel ? "bg-white/[0.04] ring-white/10" : "bg-white/70 ring-ink-200/80")}
              style={{ "--ov-delay": "620ms" }}
            >
              <p className={cn("text-[12px] font-bold uppercase tracking-[0.12em]", dunkel ? "text-ov-300" : "text-ov-700")}>{t.jetzt}</p>
              <ol className={cn("mt-2 space-y-1.5 text-[13.5px] leading-snug", dunkel ? "text-white/80" : "text-ink-700")}>
                {t.naechste.map((schritt, i) => (
                  <li key={schritt} className="flex gap-2">
                    <span aria-hidden="true" className={cn("ov-num font-bold", dunkel ? "text-ov-300" : "text-ov-700")}>{i + 1}</span>
                    <span className="min-w-0">{schritt}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </ErfolgsAnsicht>
      </div>
    );
  }

  const textFarbe = dunkel ? "text-white/80" : "text-ink-700";
  const linkFarbe = dunkel ? "text-white" : "text-ink-900";

  return (
    <form ref={form.formRef} onSubmit={absenden} noValidate className={cn("space-y-5", className)} aria-labelledby={titel ? `${id}-t` : undefined}>
      {titel && (
        <div>
          <p id={`${id}-t`} className={cn("font-display text-[22px] font-bold", dunkel ? "text-white" : "text-ink-900")}>{titel}</p>
          {text && <p className={cn("mt-1.5 text-[15px] leading-relaxed", dunkel ? "text-white/75" : "text-ink-600")}>{text}</p>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Textfeld id={`${id}-vn`} label={t.vorname} pflicht autoComplete="given-name" maxLength={80} {...feldProps("vorname")} />
        <Textfeld id={`${id}-nn`} label={t.nachname} pflicht autoComplete="family-name" maxLength={80} {...feldProps("nachname")} />
        {felder.includes("firma") && <Textfeld id={`${id}-fi`} label={t.firma} optional autoComplete="organization" maxLength={120} className="sm:col-span-2" {...feldProps("firma")} />}
        <Textfeld id={`${id}-em`} label={t.email} pflicht type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={190} className={mitTelefon ? "" : "sm:col-span-2"} {...feldProps("email")} />
        {mitTelefon && (
          <Textfeld
            id={`${id}-te`}
            label={t.telefon}
            pflicht={!!w.rueckruf}
            optional={!w.rueckruf}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={40}
            {...feldProps("telefon")}
          />
        )}
        {landFeld && (
          <Textfeld id={`${id}-la`} als="select" label={t.land} className="sm:col-span-2" autoComplete="country" {...feldProps("land")}>
            {LAENDER_OPTIONEN.map(([k], i) => (
              <option key={k} value={k}>{t.laender[i]}</option>
            ))}
          </Textfeld>
        )}
        {felder.includes("plz") && <Textfeld id={`${id}-plz`} label={t.plz} optional inputMode="numeric" autoComplete="postal-code" maxLength={10} {...feldProps("plz")} />}
        {felder.includes("ort") && <Textfeld id={`${id}-ort`} label={t.ort} optional autoComplete="address-level2" maxLength={80} {...feldProps("ort")} />}
        {felder.includes("nachricht") && <Textfeld id={`${id}-na`} als="textarea" label={t.nachricht} optional rows={4} maxLength={5000} className="sm:col-span-2" {...feldProps("nachricht")} />}
      </div>
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={w.website} onChange={(e) => form.setze("website", e.target.value)} />

      {mitTelefon && (
        <div>
          <label className={cn("flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed", textFarbe)}>
            <input
              type="checkbox"
              name="rueckruf"
              id={`${id}-rr`}
              data-feld="rueckruf"
              checked={!!w.rueckruf}
              onChange={(e) => form.setze("rueckruf", e.target.checked)}
              aria-describedby={`${id}-rr-hinweis`}
              className={checkboxKlasse}
            />
            <span>{en ? RUECKRUF.en.text : RUECKRUF.text}</span>
          </label>
          <FeldMeldung id={`${id}-rr`} hinweis={en ? RUECKRUF.en.zusatz : RUECKRUF.zusatz} dunkel={dunkel} />
        </div>
      )}

      {/* Paket C: Hinweis statt Pflicht-Einwilligung (Art. 6 Abs. 1 lit. b DSGVO). ENTWURF – Text aus Strang R folgt. */}
      <p className={cn("text-[13.5px] leading-relaxed", dunkel ? "text-white/75" : "text-ink-600")} data-hinweis-version={HINWEIS.version}>
        {(en ? HINWEIS.en : HINWEIS).kern} {(en ? HINWEIS.en : HINWEIS).verweisVor}{" "}
        <Link href="/datenschutz" className={cn("font-medium underline underline-offset-2", linkFarbe)}>{(en ? HINWEIS.en : HINWEIS).verweisLink}</Link>.
      </p>

      {optionen.length > 0 && (
        <fieldset className="space-y-2.5" data-einwilligung-version={optionen[0].version}>
          <legend className={cn("mb-1 text-[13px] font-semibold", dunkel ? "text-white/85" : "text-ink-700")}>{t.freiwillig}</legend>
          {optionen.map((o) => (
            <label key={o.id} className={cn("flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed", textFarbe)}>
              <input type="checkbox" name={o.id} data-feld={o.id} data-einwilligung={o.id} checked={w[o.id] === true} onChange={(e) => form.setze(o.id, e.target.checked)} className={checkboxKlasse} />
              <span>{en && o.textEn ? o.textEn : o.text}</span>
            </label>
          ))}
        </fieldset>
      )}

      <FormFehler dunkel={dunkel}>{a.fehler}</FormFehler>
      <AusfuellFortschritt erfuellt={erfuellt} gesamt={pflicht.length} dunkel={dunkel} />
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AbsendeKnopf status={a.status} icon={Send} laedtText={t.laedt} erfolgText={t.gesendet} className="shrink-0 px-7" data-ov-cta="">
          {button}
        </AbsendeKnopf>
        <div className={cn("space-y-1 text-[13px]", dunkel ? "text-white/75" : "text-ink-600")}>
          {versprechen && (
            <p className="flex items-start gap-1.5">
              <Clock aria-hidden="true" className={cn("mt-[3px] h-3.5 w-3.5 shrink-0", dunkel ? "text-ov-300" : "text-ov-600")} /> <span className="min-w-0">{versprechen}</span>
            </p>
          )}
          <p className="flex items-start gap-1.5">
            <LockKeyhole aria-hidden="true" className="mt-[3px] h-3.5 w-3.5 shrink-0" /> <span className="min-w-0">{t.sicher}</span>
          </p>
        </div>
      </div>
      <AutosaveHinweis stand={entwurf.stand} zeit={entwurf.zeit} dunkel={dunkel} onVerwerfen={() => { entwurf.verwerfen(); form.setzeAlle({ vorname: "", nachname: "", firma: "", email: "", telefon: "", plz: "", ort: "", nachricht: "" }); }} />
    </form>
  );
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
      kommune: "kommune", // eigene Rolle Kommune (konstanten.js) – vorher fälschlich „unternehmen“
    }[typ] || "flaeche"
  );
}

/** Fehlertexte: Serverantwort durchreichen; Netzwerkfehler und leere Antworten in verständliches Deutsch */
function fehlerUebersetzen(e) {
  if (e instanceof TypeError || !e?.message) return "Die Verbindung ist gerade gestört. Ihre Angaben bleiben erhalten – bitte versuchen Sie es gleich noch einmal.";
  if (e.message === "Senden fehlgeschlagen") return "Senden fehlgeschlagen. Ihre Angaben bleiben erhalten – bitte versuchen Sie es erneut.";
  return e.message;
}

function safeHerkunft() {
  try {
    return herkunft() || undefined;
  } catch {
    return undefined;
  }
}
