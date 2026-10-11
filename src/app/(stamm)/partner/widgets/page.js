// /partner/widgets – Dokumentation der Partner-Widgets für Stadtwerke, Gemeindewerke und Verbände
// (Welle 4, Paket WIDGETS; Masterplan B5/B7/B11 „Widgets und White-Label für Stadtwerke“).
//
// Zeigt die einbettbaren Mini-Werkzeuge (EG-Spar-Kurzrechner, Fristen-Ticker) mit Live-Vorschau und
// Embed-Code zum Kopieren. Die Embed-Routen /widgets/<name> sind reines HTML ohne JavaScript, ohne
// Cookies und ohne Tracking (src/lib/widgets); die Partner-Kennung dient nur dem Lead-Herkunfts-
// nachweis über die bestehende Lead-Kette (utm_source → herkunftBereinigen, Kanal „Partner“).
// noindex bis zur Prüfung (E6; Rechtsabteilung: Einbettungsbedingungen), nicht in der Sitemap.

import { CalendarDays, Calculator, Code2, Cookie as CookieIcon, Handshake, ShieldCheck } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import CtaBand from "@/components/ui/CtaBand";
import Link from "@/components/Land/Link";
import EmbedCode from "@/components/PartnerWidgets/EmbedCode";
import { WIDGETS, embedSnippet } from "@/lib/widgets/register";
import { abs } from "@/data/site";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage, landDerAnfrage } from "@/lib/land/seite";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

const SCHLUESSEL = "/partner/widgets";
const PFAD = seitenPfad(SCHLUESSEL);

const TITEL = "Partner-Widgets: Rechner und Fristen zum Einbetten | ÖkoInvest";
const BESCHREIBUNG = "Einbettbare Mini-Werkzeuge für Stadtwerke, Gemeindewerke und Verbände: EG-Spar-Kurzrechner und Fristen-Ticker als iframe – ohne Cookies, ohne Tracking, mit Quelle und Stand.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: abs(PFAD) },
  robots: { index: false, follow: true }, // Prüfung E6/Rechtsabteilung offen (Register index: false)
  openGraph: { type: "website", url: abs(PFAD), siteName: "ÖkoInvest", title: TITEL, description: BESCHREIBUNG },
};

const metadataEn = {
  title: "Partner widgets: embeddable tools | ÖkoInvest",
  description: "Embeddable mini tools for municipal utilities and associations: energy community quick calculator and deadline ticker as an iframe – no cookies, no tracking, with source and date.",
  // openGraph auch hier englisch, sonst behielte die EN-Fassung die deutschen og:-Texte (uebersetze legt tief über die deutsche Basis)
  openGraph: {
    title: "Partner widgets: embeddable tools | ÖkoInvest",
    description: "Embeddable mini tools for municipal utilities and associations: energy community quick calculator and deadline ticker as an iframe – no cookies, no tracking, with source and date.",
  },
};

const TEXTE = {
  de: {
    eyebrow: "Für Stadtwerke, Gemeindewerke und Verbände",
    titel: "Partner-Widgets zum Einbetten",
    lead: "Zwei Mini-Werkzeuge für Ihre Website: ein Spar-Kurzrechner für Energiegemeinschaften und ein Fristen-Ticker mit den nächsten Förder- und Gebotsfristen. Code kopieren, einfügen – fertig. Ohne Cookies, ohne Tracking, mit Quelle und Stand zu jeder Zahl.",
    punkte: [
      { icon: Code2, t: "Eine Zeile Code", s: "Jedes Widget ist ein iframe: Snippet kopieren, in Ihr CMS einfügen. Keine Bibliothek, kein Script, keine Wartung." },
      { icon: CookieIcon, t: "Ohne Cookies und Tracking", s: "Die Widgets sind reines HTML – sie setzen keine Cookies, laden nichts von Dritten und bilden keine Besucherprofile." },
      { icon: Handshake, t: "Partner-Kennung", s: "Ihre Kennung hängt an allen Links aus dem Widget heraus – so sehen wir gemeinsam, welche Anfragen über Sie kommen. Mehr nicht." },
    ],
    vorschau: "Live-Vorschau",
    code: "Einbettungs-Code",
    kopieren: "Code kopieren",
    kopiert: "Kopiert",
    kopierFehler: "Bitte den Code markieren und von Hand kopieren",
    parameter: "Parameter",
    paramKopf: ["Parameter", "Werte", "Bedeutung"],
    widgets: {
      "eg-sparrechner": {
        icon: Calculator,
        hinweis: "Rechnet mit dem Rechenkern unseres Energiegemeinschafts-Rechners – derzeit nur mit geprüften Werten für Österreich (Jahres-Näherung 2026). Für andere Länder zeigt das Widget einen Hinweis statt Zahlen.",
        params: [
          ["land", "at", "Land der Rechenwerte (derzeit nur Österreich)"],
          ["sprache", "de · en", "Sprache der Texte (Standard: de)"],
          ["partner", "Ihre Kennung", "Herkunftsnachweis für Anfragen (optional)"],
        ],
      },
      fristen: {
        icon: CalendarDays,
        hinweis: "Zeigt die nächsten Fristen des Landes aus unserem Faktenregister – mit Quelle und Stand, wie auf der Seite „Fristen und Termine“. Abgelaufene Einträge verschwinden automatisch; Countdowns und Dringlichkeits-Floskeln gibt es bewusst nicht.",
        params: [
          ["land", "de · at · ch", "Land der Fristen (Standard: de)"],
          ["sprache", "de · en", "Sprache der Texte (Standard: de)"],
          ["partner", "Ihre Kennung", "Herkunftsnachweis für Anfragen (optional)"],
        ],
      },
    },
    regeln: {
      titel: "Spielregeln der Einbettung",
      liste: [
        { icon: ShieldCheck, t: "Einbettung", s: "Die Widgets dürfen derzeit auf jeder Website eingebettet werden (frame-ancestors *). Auf Wunsch stellen wir auf eine Positivliste Ihrer Domains um." },
        { icon: Handshake, t: "Partner-Kennung", s: "Kennungen vergeben wir nach schriftlicher Abstimmung – sie sind kurze, nicht personenbezogene Kürzel. Anfragen über Ihre Kennung ordnen wir dem Kanal „Partner“ zu; eine Provisions- oder Vergütungslogik gibt es nicht." },
        { icon: Code2, t: "Attribution", s: "Der Hinweis „bereitgestellt von ÖkoInvest“ ist fester Bestandteil jedes Widgets und darf nicht entfernt oder verdeckt werden." },
      ],
      datenschutz: "Datenschutz: Die Widgets setzen keine Cookies, verwenden kein Tracking und laden keine Ressourcen von Dritten. Beim Abruf fallen – wie bei jedem Webseitenaufruf – technisch notwendige Server-Protokolle an; Einzelheiten in unserer Datenschutzerklärung.",
    },
    cta: {
      eyebrow: "Partner werden",
      title: "Widget einbinden oder eigene Kennung erhalten?",
      text: "Schreiben Sie uns – wir richten Ihre Partner-Kennung ein und helfen bei der Einbettung. Für Stadtwerke gibt es die Energiegemeinschafts-Software auch als White-Label.",
      primary: { label: "Kontakt aufnehmen", href: "/kontakt" },
      secondary: { label: "White-Label ansehen", href: "/energiegemeinschaften/software/white-label" },
    },
  },
  en: {
    eyebrow: "For municipal utilities and associations",
    titel: "Embeddable partner widgets",
    lead: "Two mini tools for your website: a quick savings calculator for energy communities and a deadline ticker with upcoming funding and bidding deadlines. Copy the code, paste it – done. No cookies, no tracking, with source and date for every figure.",
    punkte: [
      { icon: Code2, t: "One line of code", s: "Each widget is an iframe: copy the snippet into your CMS. No library, no script, no maintenance." },
      { icon: CookieIcon, t: "No cookies, no tracking", s: "The widgets are plain HTML – they set no cookies, load nothing from third parties and build no visitor profiles." },
      { icon: Handshake, t: "Partner ID", s: "Your ID is attached to all links out of the widget – so we both can see which enquiries come via you. Nothing more." },
    ],
    vorschau: "Live preview",
    code: "Embed code",
    kopieren: "Copy code",
    kopiert: "Copied",
    kopierFehler: "Please select the code and copy it manually",
    parameter: "Parameters",
    paramKopf: ["Parameter", "Values", "Meaning"],
    widgets: {
      "eg-sparrechner": {
        icon: Calculator,
        hinweis: "Uses the engine of our energy community calculator – currently with verified values for Austria only (annual estimate 2026). For other countries the widget shows a notice instead of figures.",
        params: [
          ["land", "at", "Country of the calculation values (currently Austria only)"],
          ["sprache", "de · en", "Language of the texts (default: de)"],
          ["partner", "your ID", "Lead attribution for enquiries (optional)"],
        ],
      },
      fristen: {
        icon: CalendarDays,
        hinweis: "Shows the country's upcoming deadlines from our fact register – with source and date, as on the “Deadlines and dates” page. Expired items disappear automatically; there are deliberately no countdowns or urgency phrases.",
        params: [
          ["land", "de · at · ch", "Country of the deadlines (default: de)"],
          ["sprache", "de · en", "Language of the texts (default: de)"],
          ["partner", "your ID", "Lead attribution for enquiries (optional)"],
        ],
      },
    },
    regeln: {
      titel: "Rules of embedding",
      liste: [
        { icon: ShieldCheck, t: "Embedding", s: "The widgets may currently be embedded on any website (frame-ancestors *). On request we switch to an allow-list of your domains." },
        { icon: Handshake, t: "Partner ID", s: "IDs are assigned after written agreement – they are short, non-personal slugs. Enquiries via your ID are attributed to the “partner” channel; there is no commission or remuneration logic." },
        { icon: Code2, t: "Attribution", s: "The notice “provided by ÖkoInvest” is a fixed part of every widget and must not be removed or hidden." },
      ],
      datenschutz: "Privacy: the widgets set no cookies, use no tracking and load no third-party resources. Retrieving them produces the technically necessary server logs of any web request; details in our privacy policy.",
    },
    cta: {
      eyebrow: "Become a partner",
      title: "Embed a widget or get your own ID?",
      text: "Write to us – we will set up your partner ID and help with the embedding. For municipal utilities, our energy community software is also available as a white label.",
      primary: { label: "Contact us", href: "/kontakt" },
      secondary: { label: "See the white label", href: "/energiegemeinschaften/software/white-label" },
    },
  },
};

export default async function PartnerWidgets({ params }) {
  await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = TEXTE[en ? "en" : "de"];
  // Länderfassung (/at, /ch, …): Vorschau und Snippet zeigen das Land der Seite, wenn das Widget es kann
  const seitenLandKlein = (landDerAnfrage() || "").toLowerCase() || null;

  return chBaum(
    <>
      <Section tone="sand" space="none" className="pb-14 pt-10 md:pb-20 md:pt-14">
        <div className="max-w-3xl">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="ov-h1 mt-4 text-balance text-ink-900">{t.titel}</h1>
          <p className="ov-lead mt-5 text-pretty text-ink-600">{t.lead}</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {t.punkte.map((p) => (
            <Reveal key={p.t} className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70">
              <p.icon aria-hidden="true" className="h-6 w-6 text-ov-600" />
              <h2 className="mt-3 font-display text-[17px] font-bold text-ink-900">{p.t}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{p.s}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {Object.values(WIDGETS).map((w, i) => {
        const tw = t.widgets[w.id];
        const land = seitenLandKlein && w.laender.includes(seitenLandKlein) ? seitenLandKlein : w.laender[0];
        const snippet = embedSnippet({ widgetId: w.id, land, sprache: en ? "en" : "de", basis: abs("/") });
        const vorschau = `/widgets/${w.id}?land=${land}${en ? "&sprache=en" : ""}`;
        return (
          <Section key={w.id} tone={i % 2 === 0 ? "white" : "sand"} space="lg" id={w.id} className="scroll-mt-24">
            <SectionHeading eyebrow={en ? w.titelEn : w.titel} title={en ? w.titelEn : w.titel} lead={en ? w.beschreibungEn : w.beschreibung} className="mb-8" />
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
              <Reveal>
                <h3 className="mb-3 font-display text-[17px] font-bold text-ink-900">{t.vorschau}</h3>
                <iframe
                  src={vorschau}
                  title={`${en ? w.titelEn : w.titel} – ÖkoInvest`}
                  width="100%"
                  height={w.hoehe}
                  loading="lazy"
                  className="w-full rounded-2xl ring-1 ring-ink-200/70"
                  style={{ border: 0 }}
                />
              </Reveal>
              <Reveal>
                <h3 className="mb-3 font-display text-[17px] font-bold text-ink-900">{t.code}</h3>
                <EmbedCode code={snippet} label={t.kopieren} kopiert={t.kopiert} fehler={t.kopierFehler} />
                <p className="mt-4 text-[13.5px] leading-relaxed text-ink-600">{tw.hinweis}</p>
                <h4 className="mt-6 mb-2 font-display text-[15px] font-bold text-ink-900">{t.parameter}</h4>
                <table className="w-full text-left text-[13.5px]">
                  <thead>
                    <tr className="border-b border-ink-200/70 text-ink-500">
                      {t.paramKopf.map((k) => (
                        <th key={k} scope="col" className="py-2 pr-4 font-semibold">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tw.params.map((z) => (
                      <tr key={z[0]} className="border-b border-ink-100 align-top">
                        <td className="py-2 pr-4 font-mono text-[12.5px] text-navy-700">{z[0]}</td>
                        <td className="py-2 pr-4 text-ink-700">{z[1]}</td>
                        <td className="py-2 text-ink-600">{z[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Reveal>
            </div>
          </Section>
        );
      })}

      <Section tone="white" space="md">
        <SectionHeading title={t.regeln.titel} className="mb-8" />
        <div className="grid gap-4 sm:grid-cols-3">
          {t.regeln.liste.map((p) => (
            <Reveal key={p.t} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70">
              <p.icon aria-hidden="true" className="h-6 w-6 text-ov-600" />
              <h3 className="mt-3 font-display text-[16px] font-bold text-ink-900">{p.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{p.s}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-[13.5px] leading-relaxed text-ink-500">
          {t.regeln.datenschutz}{" "}
          <Link href="/datenschutz" className="font-semibold text-navy-700 underline decoration-navy-200 underline-offset-2 hover:decoration-current">
            {en ? "Privacy policy" : "Zur Datenschutzerklärung"}
          </Link>
        </p>
      </Section>

      <CtaBand {...t.cta} />
    </>
  );
}

export const generateMetadata = seitenMetadata(SCHLUESSEL, metadata, { en: metadataEn });
