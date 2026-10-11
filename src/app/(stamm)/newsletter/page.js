// src/app/(stamm)/newsletter/page.js – Newsletter je Land (Welle 3, Paket NL)
//
// Anmeldeseite mit dem wiederverwendbaren Baustein (src/components/Newsletter/NewsletterAnmeldung.js). Das Land kommt
// aus der Länderfassung (/de, /at, /ch, /en/<land>); auf der gemeinsamen Seite wählt man es im Formular.
// Keine Zahlen, kein Recht – nur Ablauf und Themen. Englische Texte in TEXTE.en.
// noindex, bis Strang R die Einwilligungs- und Datenschutztexte freigibt und der Versand (B0) steht:
// Register src/lib/land/seiten.js (index: false) und robots unten; nicht in Navigation und Sitemap.

import { CalendarClock, LineChart, MailCheck, MailX, MousePointerClick, Scale, Send, ShieldCheck } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Reveal from "@/components/ui/Reveal";
import Steps from "@/components/ui/Steps";
import Querverweise from "@/components/Reusable/Querverweise";
import NewsletterAnmeldung from "@/components/Newsletter/NewsletterAnmeldung";
import { abs } from "@/data/site";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const metadata = {
  title: "Newsletter: Fristen und Marktdaten für Ihr Land | ÖkoInvest",
  description: "Fristen, Förderung, Marktdaten und Pacht für Ihr Land: der ÖkoInvest-Newsletter für DE, AT oder CH. Themen frei wählbar, Abmeldung mit einem Klick.",
  alternates: { canonical: abs("/newsletter") },
  // Texte in Prüfung (Strang R), Versand erst nach B0 → nicht indexieren
  robots: { index: false, follow: true },
};

const metadataEn = {
  title: "Newsletter: PV deadlines & market data | ÖkoInvest",
  description: "Deadlines, funding, market data and leases for your country: the ÖkoInvest newsletter for DE, AT or CH. Choose your topics, unsubscribe in one click.",
};

const LAND_NAME = { de: { DE: "Deutschland", AT: "Österreich", CH: "die Schweiz" }, en: { DE: "Germany", AT: "Austria", CH: "Switzerland" } };

const TEXTE = {
  de: {
    wissen: "Wissen",
    seite: "Newsletter",
    eyebrow: "Newsletter je Land",
    titel: (l) =>
      l ? (
        <>
          Der Newsletter für <span className="ov-text-gradient">{LAND_NAME.de[l]}</span>
        </>
      ) : (
        <>
          Fristen und Marktdaten <span className="ov-text-gradient">für Ihr Land</span>
        </>
      ),
    lead: "Deutschland, Österreich und die Schweiz haben eigene Fristen, eigene Förderung und eigenes Recht. Darum gibt es den Newsletter je Land – und nur mit den Themen, die Sie auswählen.",
    entwurf: "Entwurf · Prüfung Rechtsabteilung",
    punkte: [
      { icon: CalendarClock, titel: "Nur amtlich Bekanntes", text: "Fristen und Termine, sobald sie veröffentlicht sind – mit Quelle und Stand." },
      { icon: LineChart, titel: "Je Land getrennt", text: "Zahlen und Recht nur für Ihr Land, nichts vermischt." },
      { icon: MailX, titel: "Abmelden mit einem Klick", text: "In jeder E-Mail, sofort wirksam und kostenlos." },
      { icon: ShieldCheck, titel: "Keine Weitergabe", text: "Ihre Adresse nutzen wir nur für diesen Newsletter." },
    ],
    ablaufEyebrow: "Ablauf",
    ablaufTitel: "In vier Schritten",
    ablaufLead: "Die Anmeldung gilt erst, wenn Sie sie per E-Mail bestätigen (Double-Opt-in). So kann niemand Sie ohne Ihr Wissen eintragen.",
    ablauf: [
      { icon: MousePointerClick, title: "Themen wählen", text: "Kein Thema ist vorausgewählt. Das Land kommt aus Ihrer Länderwahl." },
      { icon: Send, title: "Anmelden", text: "Nur Ihre E-Mail-Adresse – kein Name, keine Telefonnummer." },
      { icon: MailCheck, title: "Bestätigen", text: "Über den Link in unserer E-Mail, innerhalb von 48 Stunden." },
      { icon: MailX, title: "Jederzeit abmelden", text: "Ein Klick auf den Link in jeder E-Mail genügt." },
    ],
    querverweise: [
      { href: "/marktdaten", titel: "Marktdaten Solar", text: "Zuschläge, Marktwert Solar und Zubau – je Land gekennzeichnet." },
      { href: "/marktdaten/fristen", titel: "Fristen und Termine", text: "Förder- und Gebotsfristen je Land im Überblick." },
      { href: "/ratgeber", titel: "Ratgeber", text: "Fachbeiträge zu Fläche, Pacht, Genehmigung und Strommarkt." },
    ],
  },
  en: {
    wissen: "Knowledge",
    seite: "Newsletter",
    eyebrow: "Newsletter per country",
    titel: (l) =>
      l ? (
        <>
          The newsletter for <span className="ov-text-gradient">{LAND_NAME.en[l]}</span>
        </>
      ) : (
        <>
          Deadlines and market data <span className="ov-text-gradient">for your country</span>
        </>
      ),
    lead: "Germany, Austria and Switzerland each have their own deadlines, funding and law. That is why there is a newsletter per country – and only with the topics you choose.",
    entwurf: "Draft · legal review",
    punkte: [
      { titel: "Only what is officially known", text: "Deadlines and dates as soon as they are published – with source and date." },
      { titel: "Separate per country", text: "Figures and law only for your country, nothing mixed." },
      { titel: "Unsubscribe with one click", text: "In every e-mail, effective immediately and free of charge." },
      { titel: "No disclosure", text: "We only use your address for this newsletter." },
    ],
    ablaufEyebrow: "How it works",
    ablaufTitel: "In four steps",
    ablaufLead: "Your subscription only becomes active once you confirm it by e-mail (double opt-in). This way, nobody can sign you up without your knowledge.",
    ablauf: [
      { title: "Choose topics", text: "No topic is preselected. The country comes from your country selection." },
      { title: "Subscribe", text: "Only your e-mail address – no name, no phone number." },
      { title: "Confirm", text: "Via the link in our e-mail, within 48 hours." },
      { title: "Unsubscribe at any time", text: "One click on the link in every e-mail is enough." },
    ],
    querverweise: [
      { titel: "Solar market data", text: "Awards, solar market value and additions – labelled per country." },
      { titel: "Deadlines and dates", text: "Funding and bidding deadlines per country at a glance." },
      { titel: "Guides", text: "Articles on land, leases, permits and the power market." },
    ],
  },
};

export default async function NewsletterSeite({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const t = uebersetze(TEXTE, sprache);

  return (
    <>
      <Section tone="sand" space="none" className="pb-14 pt-6 sm:pt-8 md:pb-20 md:pt-10">
        <Breadcrumbs items={[{ name: t.wissen, href: "/ratgeber" }, { name: t.seite }]} className="mb-8 md:mb-12" />
        <div className="grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div className="max-w-xl">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h1 className="ov-h1 mt-4 text-balance text-ink-900">{t.titel(land)}</h1>
            <p className="ov-lead mt-5 text-pretty text-ink-600">{t.lead}</p>
            <div className="mt-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-50 px-2.5 py-1 text-[12px] font-semibold text-sun-700 ring-1 ring-inset ring-sun-200">
                <Scale aria-hidden="true" className="h-3.5 w-3.5" />
                {t.entwurf}
              </span>
            </div>
            <ul className="mt-8 space-y-4">
              {t.punkte.map((p, i) => {
                const Icon = TEXTE.de.punkte[i].icon;
                return (
                  <li key={p.titel} className="flex gap-3.5">
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ov-600 shadow-e1 ring-1 ring-ov-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[15.5px] font-bold leading-snug text-ink-900">{p.titel}</p>
                      <p className="mt-0.5 text-[14px] leading-snug text-ink-600">{p.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <Reveal>
            <NewsletterAnmeldung quelle="newsletter" />
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <SectionHeading eyebrow={t.ablaufEyebrow} title={t.ablaufTitel} lead={t.ablaufLead} className="mb-10 md:mb-12" />
        <Steps items={t.ablauf.map((s, i) => ({ ...s, icon: TEXTE.de.ablauf[i].icon }))} cols={4} />
      </Section>

      <Querverweise items={TEXTE.de.querverweise.map((v, i) => (sprache === "en" ? { ...v, ...TEXTE.en.querverweise[i] } : v))} />
    </>
  );
}

export const generateMetadata = seitenMetadata("/newsletter", metadata, { en: metadataEn });
