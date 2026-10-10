// src/app/(stamm)/newsroom/page.js – Newsroom: Pressemitteilungen, Fachbeiträge, Pressekontakt, Medienpaket (Welle 3, Paket NL)
//
// Meldungen aus src/content/newsroom über src/lib/newsroom.js – NUR freigegebene (status + freigabe); Entwürfe nie.
// Pressekontakt und Kurzprofil ausschließlich aus src/data/site.js. Medienpaket nur mit freigegebenem Material:
// Die Logodatei ist noch nicht freigegeben (src/components/ui/Logo.js), die Fotos haben noch keinen Lizenznachweis
// → Vorschau ohne Download, ehrlicher Hinweis.
// Ländermodell: /at, /ch, /de zeigen nur Meldungen des Landes. Englische Texte in TEXTE.en.
// Masterplan Abschnitt 7: keine Presse vor Freigabe durch den Inhaber → noindex (Register index: false und robots
// unten), nicht in Navigation und Sitemap.

import { Building2, FileText, ImageOff, Mail, Megaphone, Newspaper, Phone, Scale } from "lucide-react";
import Link from "@/components/Land/Link";
import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Reveal from "@/components/ui/Reveal";
import Logo from "@/components/ui/Logo";
import Querverweise from "@/components/Reusable/Querverweise";
import { GESELLSCHAFT, KONTAKT, SITE, abs } from "@/data/site";
import { kurzprofil, meldungPfad, meldungen, pressekontakt } from "@/lib/newsroom";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const metadata = {
  title: "Newsroom: Pressemitteilungen und Pressekontakt | ÖkoInvest",
  description: "Pressemitteilungen und Fachbeiträge von ÖkoInvest, Pressekontakt, Kurzprofil und Medienpaket für Redaktionen in Deutschland, Österreich und der Schweiz.",
  alternates: { canonical: abs("/newsroom") },
  // Keine Presse vor Freigabe durch den Inhaber (Masterplan Abschnitt 7) → nicht indexieren
  robots: { index: false, follow: true },
};

const metadataEn = {
  title: "Newsroom: press releases and press contact | ÖkoInvest",
  description: "Press releases and expert articles from ÖkoInvest, press contact, company profile and media kit for editors in Germany, Austria and Switzerland.",
};

const LAND_NAME = { de: { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" }, en: { DE: "Germany", AT: "Austria", CH: "Switzerland" } };

const datum = (iso, en) => {
  const [j, m, t] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t)).toLocaleDateString(en ? "en-GB" : "de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

const TEXTE = {
  de: {
    wissen: "Unternehmen",
    seite: "Newsroom",
    eyebrow: (l) => (l ? `Newsroom · ${LAND_NAME.de[l]}` : "Newsroom"),
    titel1: "Pressemitteilungen und ",
    titel2: "Fachbeiträge",
    lead: "Für Redaktionen: Meldungen, Pressekontakt und Kurzprofil an einem Ort. Zahlen nennen wir nur mit Quelle und Stand, je Land getrennt.",
    entwurf: "Entwurf · noch nicht freigegeben",
    meldungenEyebrow: "Meldungen",
    meldungenTitel: "Aktuelle Meldungen",
    leerTitel: "Noch keine Meldungen veröffentlicht",
    leerText: "Pressemitteilungen und Fachbeiträge erscheinen hier, sobald sie freigegeben sind. Für Anfragen erreichen Sie uns direkt über den Pressekontakt.",
    typ: { pressemitteilung: "Pressemitteilung", fachbeitrag: "Fachbeitrag" },
    lesen: "Weiterlesen",
    kontaktEyebrow: "Presse",
    kontaktTitel: "Pressekontakt und Kurzprofil",
    kontaktLead: "Anfragen von Redaktionen beantworten wir persönlich.",
    kontakt: "Pressekontakt",
    adresse: "Anschrift",
    profil: "Kurzprofil",
    profilHinweis: "Zur freien Verwendung in Berichten über ÖkoInvest.",
    firmendaten: "Firmendaten",
    daten: (g) => [
      ["Firma", g.name],
      ["Sitz", `${g.sitz}, ${g.plz} ${g.ort}, ${g.land}`],
      ["Firmenbuch", `${g.register}, ${g.gericht}`],
      ["UID", g.uid],
      ["Geschäftsführung", g.geschaeftsfuehrung.join(", ")],
      ["Gruppe", SITE.gruppe],
    ],
    medienEyebrow: "Medienpaket",
    medienTitel: "Logo und Bildmaterial",
    medienLead: "Wir stellen nur Material bereit, dessen Rechte geklärt und das freigegeben ist.",
    logo: "Wortmarke",
    logoHinweis: "Vorschau. Logodateien zum Herunterladen folgen, sobald die Logodatei freigegeben ist.",
    bilder: "Fotos",
    bilderHinweis: "Fotos von Projekten und Team stellen wir bereit, sobald die Bildrechte geklärt sind. Bis dahin auf Anfrage.",
    querverweise: [
      { href: "/unternehmen", titel: "Über ÖkoInvest", text: "Gruppe, Gesellschaften und Geschäftsführung." },
      { href: "/marktdaten", titel: "Marktdaten Solar", text: "Zuschläge, Marktwert Solar und Zubau – mit Quelle und Stand." },
      { href: "/ratgeber", titel: "Ratgeber", text: "Fachbeiträge zu Fläche, Pacht, Genehmigung und Strommarkt." },
    ],
  },
  en: {
    wissen: "Company",
    seite: "Newsroom",
    eyebrow: (l) => (l ? `Newsroom · ${LAND_NAME.en[l]}` : "Newsroom"),
    titel1: "Press releases and ",
    titel2: "expert articles",
    lead: "For editors: news, press contact and company profile in one place. We only quote figures with source and date, separately for each country.",
    entwurf: "Draft · not yet approved",
    meldungenEyebrow: "News",
    meldungenTitel: "Latest news",
    leerTitel: "No news published yet",
    leerText: "Press releases and expert articles will appear here as soon as they are approved. For enquiries, please contact us directly via the press contact.",
    typ: { pressemitteilung: "Press release", fachbeitrag: "Expert article" },
    lesen: "Read more",
    kontaktEyebrow: "Press",
    kontaktTitel: "Press contact and company profile",
    kontaktLead: "We answer enquiries from editors personally.",
    kontakt: "Press contact",
    adresse: "Address",
    profil: "Company profile",
    profilHinweis: "Free to use in reports about ÖkoInvest.",
    firmendaten: "Company details",
    daten: (g) => [
      ["Company", g.name],
      ["Registered office", `${g.sitz}, ${g.plz} ${g.ort}, Austria`],
      ["Company register", `${g.register}, ${g.gericht}`],
      ["VAT ID", g.uid],
      ["Managing directors", g.geschaeftsfuehrung.join(", ")],
      ["Group", SITE.gruppe.replace("Gruppe", "Group")],
    ],
    medienEyebrow: "Media kit",
    medienTitel: "Logo and images",
    medienLead: "We only provide material whose rights have been cleared and which has been approved.",
    logo: "Word mark",
    logoHinweis: "Preview. Logo files for download will follow as soon as the logo file has been approved.",
    bilder: "Photos",
    bilderHinweis: "We will provide photos of projects and the team as soon as the image rights have been cleared. Until then, on request.",
    querverweise: [
      { titel: "About ÖkoInvest", text: "Group, companies and management." },
      { titel: "Solar market data", text: "Awards, solar market value and additions – with source and date." },
      { titel: "Guides", text: "Articles on land, leases, permits and the power market." },
    ],
  },
};

export default async function NewsroomSeite({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const liste = meldungen({ land });
  const presse = pressekontakt();

  return (
    <>
      <Section tone="sand" space="none" className="pb-14 pt-6 sm:pt-8 md:pb-20 md:pt-10">
        <Breadcrumbs items={[{ name: t.wissen, href: "/unternehmen" }, { name: t.seite }]} className="mb-8 md:mb-12" />
        <div className="max-w-3xl">
          <Eyebrow>{t.eyebrow(land)}</Eyebrow>
          <h1 className="ov-h1 mt-4 text-balance text-ink-900">
            {t.titel1}
            <span className="ov-text-gradient">{t.titel2}</span>
          </h1>
          <p className="ov-lead mt-5 text-pretty text-ink-600">{t.lead}</p>
          <div className="mt-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-50 px-2.5 py-1 text-[12px] font-semibold text-sun-700 ring-1 ring-inset ring-sun-200">
              <Scale aria-hidden="true" className="h-3.5 w-3.5" />
              {t.entwurf}
            </span>
          </div>
        </div>
      </Section>

      <Section tone="white" space="lg" id="meldungen" className="scroll-mt-24">
        <SectionHeading eyebrow={t.meldungenEyebrow} title={t.meldungenTitel} className="mb-10 md:mb-12" />
        {liste.length === 0 ? (
          <Reveal className="flex flex-col gap-4 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 sm:flex-row sm:items-start md:p-8" data-newsroom-leer="">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-600 ring-1 ring-ov-200">
              <Newspaper className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-[18px] font-bold text-ink-900">{t.leerTitel}</h3>
              <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-600">{t.leerText}</p>
            </div>
          </Reveal>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {liste.map((m) => (
              <li key={m.slug}>
                <Link href={meldungPfad(m.slug)} className="group flex h-full flex-col rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 transition-shadow hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                  <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-500">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ov-50 px-2.5 py-0.5 text-ov-800 ring-1 ring-inset ring-ov-200">
                      {m.typ === "pressemitteilung" ? <Megaphone aria-hidden="true" className="h-3.5 w-3.5" /> : <FileText aria-hidden="true" className="h-3.5 w-3.5" />}
                      {t.typ[m.typ]}
                    </span>
                    <span>{[m.ort, datum(m.datum, en)].filter(Boolean).join(", ")}</span>
                  </p>
                  <h3 className="mt-3 font-display text-[18px] font-bold leading-snug text-ink-900 group-hover:text-ov-700">{m.title}</h3>
                  <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-ink-600">{m.excerpt}</p>
                  <span className="mt-4 text-[14px] font-semibold text-ov-700">{t.lesen}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section tone="sand" space="lg" id="presse" className="scroll-mt-24">
        <SectionHeading eyebrow={t.kontaktEyebrow} title={t.kontaktTitel} lead={t.kontaktLead} className="mb-10 md:mb-12" />
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-7">
            <h3 className="font-display text-[17px] font-bold text-ink-900">{t.kontakt}</h3>
            {presse.ansprechpartner && (
              <p className="mt-3 text-[15px] text-ink-800">
                <strong className="font-semibold">{presse.ansprechpartner}</strong>
                {presse.funktion ? `, ${presse.funktion}` : ""}
              </p>
            )}
            <ul className="mt-4 space-y-3 text-[15px]">
              {presse.email && (
                <li className="flex items-center gap-3">
                  <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600" />
                  <a href={`mailto:${presse.email}`} className="font-medium text-ink-900 underline decoration-ink-300 underline-offset-2 [overflow-wrap:anywhere] hover:text-ov-700">
                    {presse.email}
                  </a>
                </li>
              )}
              {presse.telefon && (
                <li className="flex items-center gap-3">
                  <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600" />
                  <a href={presse.telefonHref} className="font-medium text-ink-900 hover:text-ov-700">
                    {presse.telefon}
                  </a>
                </li>
              )}
            </ul>
            <div className="mt-5 flex items-start gap-3 border-t border-ink-100 pt-5">
              <Building2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
              <address className="text-[14.5px] not-italic leading-relaxed text-ink-600">
                <span className="sr-only">{t.adresse}: </span>
                {GESELLSCHAFT.name}
                <br />
                {KONTAKT.strasse}, {KONTAKT.ort}
                <br />
                {en ? "Austria" : KONTAKT.land}
              </address>
            </div>
          </Reveal>
          <Reveal delay={60} className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-7">
            <h3 className="font-display text-[17px] font-bold text-ink-900">{t.profil}</h3>
            <p className="mt-1 text-[13px] text-ink-500">{t.profilHinweis}</p>
            <p className="mt-3 rounded-2xl bg-sand-50 p-4 text-[14.5px] leading-relaxed text-ink-700 ring-1 ring-ink-200/60" data-kurzprofil="">
              {kurzprofil(sprache)}
            </p>
            <h4 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-500">{t.firmendaten}</h4>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-[auto_1fr]">
              {t.daten(GESELLSCHAFT).map(([k, w]) => (
                <div key={k} className="contents">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="font-medium text-ink-900 [overflow-wrap:anywhere]">{w}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg" id="medienpaket" className="scroll-mt-24">
        <SectionHeading eyebrow={t.medienEyebrow} title={t.medienTitel} lead={t.medienLead} className="mb-10 md:mb-12" />
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal className="min-w-0 rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-7">
            <h3 className="font-display text-[17px] font-bold text-ink-900">{t.logo}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex h-24 min-w-0 items-center justify-center rounded-2xl bg-white p-4 ring-1 ring-ink-200">
                <div className="h-12 min-w-0 max-w-full">
                  <Logo tone="light" unterzeile={false} sprache={sprache} className="max-w-full" />
                </div>
              </div>
              <div className="flex h-24 min-w-0 items-center justify-center rounded-2xl bg-navy-950 p-4">
                <div className="h-12 min-w-0 max-w-full">
                  <Logo tone="dark" unterzeile={false} sprache={sprache} className="max-w-full" />
                </div>
              </div>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-ink-600">{t.logoHinweis}</p>
          </Reveal>
          <Reveal delay={60} className="min-w-0 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
            <h3 className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
              <ImageOff aria-hidden="true" className="h-4 w-4 text-ink-500" />
              {t.bilder}
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-600">{t.bilderHinweis}</p>
          </Reveal>
        </div>
      </Section>

      <Querverweise items={TEXTE.de.querverweise.map((v, i) => (en ? { ...v, ...TEXTE.en.querverweise[i] } : v))} />
    </>
  );
}

export const generateMetadata = seitenMetadata("/newsroom", metadata, { en: metadataEn });
