import Link from "@/components/Land/Link";
import { ArrowRight, CalendarCheck2, CalendarClock, Check, Clock, Landmark, MapPin, MessageSquareText, Phone, RefreshCcw, Video } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Section from "@/components/ui/Section";
import Faq from "@/components/ui/Faq";
import { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import TerminOeffentlich from "@/components/Portal/Termine/TerminOeffentlich";
import { TERMIN_ARTEN, TERMIN_ART_IDS } from "@/lib/plattform/termine";
import { abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { terminArt } from "@/lib/sprache/termine";

const PFAD = "/termin";

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Termin vereinbaren: Beratung & Besichtigung | ÖkoInvest",
  description: "Freien Termin direkt online buchen: Flächenbesichtigung, Beratung am Telefon oder per Video, Gemeindetermin – mit Bestätigung und Kalenderdatei per E-Mail.",
  keywords: ["Termin ÖkoInvest", "Flächenbesichtigung Solarpark", "Beratung Freiflächen-PV", "Gemeinde Solarpark Termin"],
});

const HERKUNFT = ["kontakt", "flaechencheck", "website"];

const FAQ = [
  { q: "Was kostet ein Beratungstermin?", a: "Für Flächeneigentümer, Landwirte und Gemeinden sind Beratung und Besichtigung kostenfrei und unverbindlich." },
  { q: "Wie verschiebe oder storniere ich einen Termin?", a: "In der Bestätigungs-E-Mail finden Sie einen persönlichen Link. Darüber können Sie den Termin bis zum Beginn verschieben oder absagen. Mit einem Portal-Konto sehen Sie Ihre Termine zusätzlich unter „Termine“." },
  { q: "Was sollte ich für eine Flächenbesichtigung vorbereiten?", a: "Hilfreich sind Flurstücksnummern oder ein Lageplan, bekannte Leitungen oder Dienstbarkeiten und – falls vorhanden – Angaben zum Pachtstatus. Eine erste Einschätzung erhalten Sie in der Regel schon vorab über den Flächencheck." },
];

const PUNKTE = ["Kostenfrei und unverbindlich", "Persönliche Ansprechperson aus Ihrer Region", "Umbuchen oder absagen per Link", "Deutschland, Österreich, Schweiz"];

/** Symbol je Terminart (über den Kanal bzw. die Art) */
function artIcon(id, kanal) {
  if (id === "gemeinde") return Landmark;
  if (kanal === "telefon") return Phone;
  if (kanal === "video") return Video;
  return MapPin;
}

const ABLAUF = [
  { icon: MessageSquareText, t: "Worum geht es?", s: "Terminart wählen" },
  { icon: CalendarClock, t: "Freien Termin wählen", s: "Zeiten in MEZ (Wien/Berlin)" },
  { icon: CalendarCheck2, t: "Angaben und Bestätigung", s: "E-Mail mit Kalenderdatei" },
];

// Englisch (Sprachmodell)
const metadataEn = rechnerMetadataEn({
  title: "Book an appointment: advice & site visit | ÖkoInvest",
  description: "Book a free slot directly online: site visit, advice by phone or video, municipal meeting – with confirmation and calendar file by e-mail.",
  keywords: ["ÖkoInvest appointment", "solar park site visit", "ground-mounted PV advice", "municipality solar park meeting"],
});

const TEXTE = {
  de: {
    schemaName: "Terminbuchung ÖkoInvest",
    brotkrumen: "Termin vereinbaren",
    pill: "Termin online buchen",
    titel1: "Sprechen wir über Ihre ",
    titel2: "Fläche oder Ihr Projekt.",
    lead: "Wählen Sie einen freien Termin: Besichtigung vor Ort, Beratung am Telefon oder per Video, Termin mit Ihrer Gemeinde. Sie erhalten sofort eine Bestätigung mit Kalenderdatei.",
    waehlen: "Freien Termin wählen",
    flaeche: "Erst Fläche prüfen lassen",
    punkte: PUNKTE,
    artenAria: "Terminart direkt wählen",
    arten: "Terminarten",
    dauer: "Dauer",
    min: "Min.",
    buchenAria: "Termin buchen",
    ablaufAria: "Ablauf der Buchung",
    ablauf: ABLAUF,
    hinweiseAria: "Hinweise zur Buchung",
    nach: "Nach der Buchung",
    nachPunkte: [
      { t: "Sofort bestätigt", s: "E-Mail mit Kalenderdatei (ICS)" },
      { t: "Flexibel bleiben", s: "Verschieben oder absagen per persönlichem Link" },
      { t: "Mit Konto noch einfacher", s: "Ihre Termine im Portal unter „Termine“" },
    ],
    keiner: "Kein passender Termin?",
    keinerText: "Schreiben Sie uns – wir melden uns mit einem Vorschlag.",
    kontakt: "Zum Kontaktformular",
    vorbereitet: "Gut vorbereitet",
    faqTitel: "Häufige Fragen zur Terminbuchung",
    faqLead: "Noch unsicher, ob sich ein Gespräch lohnt? Der Flächencheck gibt Ihnen vorab eine erste Einschätzung.",
    zumCheck: "Zum Flächencheck",
    faq: FAQ,
  },
  en: {
    schemaName: "ÖkoInvest appointment booking",
    brotkrumen: "Book an appointment",
    pill: "Book an appointment online",
    titel1: "Let's talk about your ",
    titel2: "land or your project.",
    lead: "Choose a free slot: an on-site visit, advice by phone or video, or a meeting with your municipality. You will receive an immediate confirmation with a calendar file.",
    waehlen: "Choose a free slot",
    flaeche: "Have your land checked first",
    punkte: ["Free of charge and without obligation", "Personal contact person from your region", "Reschedule or cancel via a link", "Germany, Austria, Switzerland"],
    artenAria: "Choose the appointment type directly",
    arten: "Appointment types",
    dauer: "Duration",
    min: "min",
    buchenAria: "Book an appointment",
    ablaufAria: "Booking steps",
    ablauf: [
      { t: "What is it about?", s: "Choose the appointment type" },
      { t: "Choose a free slot", s: "Times in CET (Vienna/Berlin)" },
      { t: "Details and confirmation", s: "E-mail with calendar file" },
    ],
    hinweiseAria: "Notes on booking",
    nach: "After booking",
    nachPunkte: [
      { t: "Confirmed immediately", s: "E-mail with calendar file (ICS)" },
      { t: "Stay flexible", s: "Reschedule or cancel via your personal link" },
      { t: "Even easier with an account", s: "Your appointments in the portal under “Appointments”" },
    ],
    keiner: "No suitable slot?",
    keinerText: "Write to us – we will get back to you with a suggestion.",
    kontakt: "Go to the contact form",
    vorbereitet: "Well prepared",
    faqTitel: "Frequently asked questions about booking",
    faqLead: "Still unsure whether a conversation is worthwhile? The land check gives you an initial assessment in advance.",
    zumCheck: "Go to the land check",
    faq: [
      { q: "What does an advisory appointment cost?", a: "For landowners, farmers and municipalities, advice and site visits are free of charge and without obligation." },
      { q: "How do I reschedule or cancel an appointment?", a: "You will find a personal link in the confirmation e-mail. You can use it to reschedule or cancel the appointment up until it starts. With a portal account, you can also see your appointments under “Appointments”." },
      { q: "What should I prepare for a site visit?", a: "Useful are plot numbers or a site plan, known cables, pipelines or easements and – if available – information on the lease status. As a rule, you can get an initial assessment in advance via the land check." },
    ],
  },
};

export default async function TerminSeite({ params, searchParams }) {
  await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const t = uebersetze(TEXTE, sprache);
  const sp = await searchParams;
  const arten = TERMIN_ART_IDS.filter((a) => TERMIN_ARTEN[a].oeffentlich);
  const herkunft = HERKUNFT.includes(sp?.herkunft) ? sp.herkunft : "website";
  const startArt = TERMIN_ARTEN[sp?.art]?.oeffentlich ? sp.art : undefined;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: t.schemaName,
    url: abs(PFAD),
    provider: { "@id": `${abs("/")}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    availableChannel: { "@type": "ServiceChannel", serviceUrl: abs(PFAD) },
  };
  return (
    <div>
      <JsonLd daten={schema} />

      {/* ---------- Hero ---------- */}
      <section aria-labelledby="termin-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

        <div className="ov-container pb-28 pt-6 sm:pt-8 md:pb-36 md:pt-10">
          <Breadcrumbs dark items={[{ name: t.brotkrumen }]} className="ov-hero-in mb-8 md:mb-12" />

          <div className="grid items-center gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-x-14 xl:gap-x-20">
            <div className="max-w-[38rem]">
              <p className="ov-hero-in inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15" style={{ "--ov-delay": "40ms" }}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ov-300 text-navy-950">
                  <CalendarCheck2 aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                {t.pill}
              </p>
              <h1 id="termin-titel" className="ov-h1 ov-hero-in mt-6 text-balance md:mt-8" style={{ "--ov-delay": "100ms" }}>
                {t.titel1}<span className="ov-text-gradient-light">{t.titel2}</span>
              </h1>
              <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
                {t.lead}
              </p>
              <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
                <a
                  href="#buchung"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-ov-300 px-7 text-[16px] font-bold text-navy-950 shadow-e3 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
                >
                  {t.waehlen} <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </a>
                <Link
                  href={seitenPfad("/flaechencheck")}
                  className="inline-flex h-14 items-center justify-center rounded-full px-7 text-[16px] font-semibold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                >
                  {t.flaeche}
                </Link>
              </div>
              <ul className="ov-hero-in mt-9 grid gap-x-6 gap-y-3 border-t border-white/10 pt-7 sm:grid-cols-2 md:mt-10" style={{ "--ov-delay": "340ms" }}>
                {t.punkte.map((x) => (
                  <li key={x} className="flex items-start gap-2.5 text-[14px] leading-snug text-white/85">
                    <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                      <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            {/* Terminarten als Auswahlkarte – Daten aus der Terminkonfiguration */}
            <div className="relative mx-auto w-full max-w-[540px] lg:mx-0">
              <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.24),transparent_70%)] blur-2xl" />
              <nav aria-label={t.artenAria} className="ov-hero-in ov-glass rounded-[1.75rem] p-3 shadow-e5 sm:p-4" style={{ "--ov-delay": "220ms" }}>
                <p className="flex items-center justify-between px-3 pb-2 pt-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/65">
                  <span>{t.arten}</span>
                  <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-white/60">
                    <Clock aria-hidden="true" className="h-3.5 w-3.5" /> {t.dauer}
                  </span>
                </p>
                <ul className="space-y-1.5">
                  {arten.map((id, i) => {
                    const a = terminArt(TERMIN_ARTEN[id], id, sprache);
                    const Icon = artIcon(id, a.kanal);
                    const aktiv = startArt ? startArt === id : i === 0;
                    return (
                      <li key={id}>
                        <Link
                          href={`/termin?art=${id}${herkunft !== "website" ? `&herkunft=${herkunft}` : ""}#buchung`}
                          className={`group flex items-center gap-3.5 rounded-2xl p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300 sm:p-3.5 ${
                            aktiv ? "bg-white/[0.1] ring-1 ring-inset ring-ov-300/40" : "hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${aktiv ? "bg-ov-300 text-navy-950 ring-ov-300" : "bg-white/[0.06] text-ov-300 ring-white/15"}`}>
                            <Icon aria-hidden="true" className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-white">{a.label}</span>
                            <span className="line-clamp-1 block text-[13px] text-white/65 max-sm:line-clamp-2">{a.text}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-white/[0.08] px-2.5 py-1 text-[12.5px] font-semibold text-white/85 [font-variant-numeric:tabular-nums]">{a.dauer} {t.min}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Buchung ---------- */}
      <section id="buchung" aria-label={t.buchenAria} className="relative scroll-mt-24 bg-sand-50 pb-16 md:pb-24">
        <div className="ov-container">
          <div className="relative -mt-16 grid gap-6 md:-mt-20 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
            <div className="min-w-0 rounded-[1.75rem] bg-white p-5 shadow-e4 ring-1 ring-ink-200/70 sm:p-8 md:rounded-[2rem] md:p-10">
              <ol aria-label={t.ablaufAria} className="mb-8 grid gap-2 border-b border-ink-100 pb-7 sm:grid-cols-3 md:mb-10">
                {t.ablauf.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <li key={s.t} className="flex items-center gap-3 rounded-2xl bg-sand-50 px-3.5 py-3 ring-1 ring-inset ring-ink-200/60">
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ov-700 shadow-e1 ring-1 ring-inset ring-ink-200/70">
                        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                        <span className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-navy-950 text-[10.5px] font-bold text-white">{i + 1}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold leading-tight text-ink-900">{s.t}</span>
                        <span className="block text-[12.5px] leading-snug text-ink-600">{s.s}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <TerminOeffentlich key={startArt || "standard"} arten={arten} startArt={startArt} herkunft={herkunft} flaeche={sp?.plz ? { plz: String(sp.plz).slice(0, 10), ort: String(sp.ort || "").slice(0, 80) } : null} />
            </div>

            <aside aria-label={t.hinweiseAria} className="space-y-4 lg:sticky lg:top-28 lg:self-start">
              <div className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden rounded-[1.75rem] p-6 text-white">
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 h-48 w-48 rounded-full bg-ov-500/25 blur-3xl" />
                <p className="ov-overline text-ov-300">{t.nach}</p>
                <ul className="mt-4 space-y-4">
                  {[CalendarCheck2, RefreshCcw, MessageSquareText].map((icon, i) => ({ icon, ...t.nachPunkte[i] })).map((p) => {
                    const Icon = p.icon;
                    return (
                      <li key={p.t} className="flex gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] ring-1 ring-inset ring-white/15">
                          <Icon aria-hidden="true" className="h-[18px] w-[18px] text-ov-300" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14.5px] font-semibold">{p.t}</span>
                          <span className="block text-[13px] leading-snug text-white/70">{p.s}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-ink-200/70">
                <p className="font-display text-[16px] font-bold text-ink-900">{t.keiner}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">{t.keinerText}</p>
                <Link href="/kontakt" className="mt-3 inline-flex items-center gap-1.5 rounded text-[14.5px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                  {t.kontakt} <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Section tone="white" space="md">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <p className="ov-overline text-ov-700">{t.vorbereitet}</p>
            <h2 className="ov-h2 mt-3 text-balance text-ink-900">{t.faqTitel}</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink-600">{t.faqLead}</p>
            <Link href={seitenPfad("/flaechencheck")} className="mt-5 inline-flex items-center gap-2 rounded-full bg-navy-950 px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
              {t.zumCheck} <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <Faq items={t.faq} />
        </div>
      </Section>
    </div>
  );
}

export const generateMetadata = seitenMetadata("/termin", metadata, { en: metadataEn });
