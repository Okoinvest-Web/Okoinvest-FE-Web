import { notFound } from "next/navigation";
import { CalendarClock, Check, Coins, FileDown, Gauge, MapPin, ShieldCheck, Zap } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import CtaBand from "@/components/ui/CtaBand";
import JsonLd from "@/components/JsonLd";
import TypIllustration, { varianteAus } from "@/components/Boerse/TypIllustration";
import Vertraulich from "@/components/Boerse/Expose/Vertraulich";
import PhasenEinordnung from "@/components/Boerse/Expose/PhasenEinordnung";
import { PhaseBadge } from "@/components/Boerse/ProjektKarte";
import { abs, SITE } from "@/data/site";
import { phaseById } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { backend, istDemo } from "@/lib/plattform/backend";
import { istEigenprojekt, istOeffentlichSichtbar } from "@/lib/boerse/sichtbarkeit";
import { aktuellerNutzer } from "@/lib/plattform/server/seite";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { LAENDER, NETZANSCHLUSS, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { mwp, preisText } from "@/lib/plattform/format";
import { statusLabel } from "@/lib/plattform/prozesse";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";
import { BEGRIFFE_EN, mwpEn, preisTextEn } from "@/lib/sprache/begriffe";

// Sprachmodell: Seitenrahmen englisch; Titel, Beschreibung und Highlights sind Angaben des Anbieters
// und bleiben in ihrer Sprache (auf /en mit lang="de" ausgezeichnet).
const TEXTE = {
  de: {
    nichtGefunden: "Projekt nicht gefunden | ÖkoInvest",
    beschreibung: (typ, leistung, region, land, phase) => `${typ} mit ${leistung} in ${region} (${land}), Phase: ${phase}. Exposé ansehen, NDA per Klick, Datenraum im Portal.`,
    bildAlt: "Solarpark unter blauem Himmel",
    boerse: "Projektbörse",
    schemaBoerse: "Projektbörse ÖkoInvest",
    leistung: "Leistung",
    phase: "Phase",
    netz: "Netzanschluss",
    cod: "Inbetriebnahme geplant",
    offen: "offen",
    preis: "Preisindikation",
    lage: "Lage (grob)",
    speicher: "MWh Speicher",
    zumDatenraum: "Zum Datenraum im Portal",
    imPortal: "Im Portal öffnen & NDA anfragen",
    anmelden: "Als Investor anmelden & NDA anfragen",
    eigenTitel: "Projekt aus der eigenen Entwicklung der ÖKOVOLT Gruppe – wir sind hier selbst Verkäufer",
    eigen: "Eigenprojekt",
    demo: "Demo-Projekt · fiktiv",
    konto: "Ich habe ein Konto",
    teaserPdf: "Teaser als PDF",
    teaserText: " – öffentliche Eckdaten zum Weitergeben, ohne vertrauliche Angaben.",
    eckdaten: "Exposé · öffentliche Eckdaten",
    fuss1: "Angaben des Anbieters, vom Backoffice auf Vollständigkeit und Plausibilität geprüft – keine Due Diligence. Keine Anlageberatung.",
    fussEigen: " Eigenprojekt: Verkäufer ist ein Unternehmen der ÖKOVOLT Gruppe.",
    fussDritt: " Verkäufer ist der jeweilige Anbieter.",
    fuss2: " Für Investoren kostenfrei; der Verkäufer zahlt bei Abschluss eine Provision.",
    portalOeffnen: "Im Portal öffnen",
    ctaTitel: "Weitere Projekte in allen Phasen",
    ctaText: "Freiflächen-PV, Agri-PV, Parkplatz-PV und Speicher in Deutschland, Österreich und der Schweiz.",
    zurBoerse: "Zur Projektbörse",
    anbieten: "Projekt anbieten",
  },
  en: {
    nichtGefunden: "Project not found | ÖkoInvest",
    beschreibung: (typ, leistung, region, land, phase) => `${typ} with ${leistung} in ${region} (${land}), stage: ${phase}. View the exposé, NDA in one click, data room in the portal.`,
    bildAlt: "Solar park under a blue sky",
    boerse: "Project exchange",
    schemaBoerse: "ÖkoInvest project exchange",
    leistung: "Capacity",
    phase: "Stage",
    netz: "Grid connection",
    cod: "Planned commissioning",
    offen: "open",
    preis: "Price indication",
    lage: "Location (approx.)",
    speicher: "MWh storage",
    zumDatenraum: "Go to the data room in the portal",
    imPortal: "Open in the portal & request NDA",
    anmelden: "Sign in as an investor & request NDA",
    eigenTitel: "Project from the ÖKOVOLT Group's own development – we are the seller here ourselves",
    eigen: "Own project",
    demo: "Demo project · fictitious",
    konto: "I have an account",
    teaserPdf: "Teaser as PDF",
    teaserText: " – public key data for sharing, without confidential details (in German).",
    eckdaten: "Exposé · public key data",
    fuss1: "Information provided by the seller, checked by the back office for completeness and plausibility – not due diligence. Not investment advice.",
    fussEigen: " Own project: the seller is a company of the ÖKOVOLT Group.",
    fussDritt: " The seller is the respective provider.",
    fuss2: " Free of charge for investors; the seller pays a commission on closing.",
    portalOeffnen: "Open in the portal",
    ctaTitel: "More projects at every stage",
    ctaText: "Ground-mounted PV, agrivoltaics, car park PV and storage in Germany, Austria and Switzerland.",
    zurBoerse: "Go to the project exchange",
    anbieten: "Offer a project",
  },
};

export const dynamic = "force-dynamic";

async function holen(slug, nutzer, zaehlen) {
  let d;
  try {
    d = await backend().boerseDetail(nutzer, slug, { zaehlen });
  } catch (e) {
    if (e instanceof PlattformFehler && [403, 404].includes(e.status)) return null;
    throw e;
  }
  // Paket D: Testprojekte nie und Demo-Projekte nur im Demo-Modus öffentlich zeigen.
  // Anbieter und Admin (zugriff eigentuemer/admin) sehen ihr Projekt weiterhin.
  const sonderrecht = d && ["eigentuemer", "admin"].includes(d.zugriff);
  if (d && !sonderrecht && !istOeffentlichSichtbar(d.projekt, { demo: istDemo() })) return null;
  return d;
}

async function basisMetadata({ params }) {
  const { slug, sprache } = await params;
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const d = await holen(slug, null, false).catch(() => null);
  if (!d) return { title: t.nichtGefunden, robots: { index: false } };
  const p = d.projekt;
  const pfad = `/projektboerse/${p.slug}`;
  const titel = `${p.titel}`.length > 46 ? `${p.titel.slice(0, 45)}… | ÖkoInvest` : `${p.titel} | ÖkoInvest`;
  const beschreibung = (en
    ? t.beschreibung(BEGRIFFE_EN.projektTyp[p.typ] ?? PROJEKT_TYPEN[p.typ], mwpEn(p.mwp), p.region, BEGRIFFE_EN.land[p.land] ?? LAENDER[p.land], BEGRIFFE_EN.phase[p.phase] ?? phaseById(p.phase).label)
    : t.beschreibung(PROJEKT_TYPEN[p.typ], mwp(p.mwp), p.region, LAENDER[p.land], phaseById(p.phase).label)
  ).slice(0, 160);
  return {
    title: titel,
    description: beschreibung,
    alternates: { canonical: abs(pfad) },
    robots: p.demo ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { type: "website", url: abs(pfad), siteName: "ÖkoInvest", title: titel, description: beschreibung, images: [{ url: abs("/img/solarpark-himmel.jpg"), width: 1280, height: 852, alt: t.bildAlt }] },
  };
}

export const generateMetadata = seitenMetadata(({ slug }) => `/projektboerse/${slug}`, (land, p) => basisMetadata({ params: p }));

export default async function Expose({ params }) {
  await seitenLand(params);
  const { slug } = await params;
  const nutzer = await aktuellerNutzer().catch(() => null);
  const d = await holen(slug, nutzer, true);
  if (!d) notFound();
  const p = d.projekt;
  const phase = phaseById(p.phase);
  const investor = nutzer?.rollen?.includes("investor");
  const portalLink = `/portal/boerse/${p.id}`;
  const freigegeben = d.zugriff !== "oeffentlich";
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const z = (n, s = 0) => (en ? fmtZahl(n, s, "en") : fmt(n, s));
  const typName = en ? BEGRIFFE_EN.projektTyp[p.typ] ?? PROJEKT_TYPEN[p.typ] : PROJEKT_TYPEN[p.typ];
  const phaseName = en ? BEGRIFFE_EN.phase[phase.id] ?? phase.label : phase.label;
  const landName = en ? BEGRIFFE_EN.land[p.land] ?? LAENDER[p.land] : LAENDER[p.land];
  const leistungText = en ? mwpEn : mwp;
  const preis = en ? preisTextEn(p) : preisText(p);
  // Angaben des Anbieters (Titel, Beschreibung, Highlights) bleiben in ihrer Sprache
  const datenLang = en ? "de" : undefined;

  const eigen = istEigenprojekt(p);
  // Paket D: Ein Projekt ist keine lagernde Ware – kein Product/Offer/InStock, kein Preis
  // (CH wäre ohnehin nicht EUR). ÖkoInvest erscheint nur bei Eigenprojekten der Gruppe als Quelle,
  // bei Drittprojekten ist ÖkoInvest weder Verkäufer noch Marke.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: p.titel,
    description: p.beschreibung,
    url: abs(`/projektboerse/${p.slug}`),
    inLanguage: "de",
    keywords: [typName, phaseName, landName, p.region].filter(Boolean).join(", "),
    isPartOf: { "@type": "CollectionPage", name: t.schemaBoerse, url: abs("/projektboerse") },
    ...(eigen ? { sourceOrganization: { "@type": "Organization", name: SITE.firma, url: SITE.url } } : {}),
  };

  const eckdaten = [
    { id: "leistung", icon: Gauge, label: t.leistung, wert: p.typ === "speicher" ? `${z(p.mwp, 1)} MW${p.mwhSpeicher ? ` / ${z(p.mwhSpeicher)} MWh` : ""}` : `${leistungText(p.mwp)}${p.mwhSpeicher ? ` + ${z(p.mwhSpeicher)} MWh` : ""}` },
    { id: "phase", icon: ShieldCheck, label: t.phase, wert: phaseName },
    { id: "netz", icon: Zap, label: t.netz, wert: en ? BEGRIFFE_EN.netzanschluss[p.netzanschluss] ?? NETZANSCHLUSS[p.netzanschluss] : NETZANSCHLUSS[p.netzanschluss] },
    { id: "cod", icon: CalendarClock, label: t.cod, wert: p.codGeplant || t.offen },
    { id: "preis", icon: Coins, label: t.preis, wert: preis },
    { id: "lage", icon: MapPin, label: t.lage, wert: [p.region, p.bundesland, landName].filter(Boolean).join(", ") },
  ];

  const leistungGross = p.typ === "speicher" ? `${z(p.mwp, p.mwp < 10 ? 1 : 0)} MW` : leistungText(p.mwp);
  const leistungZusatz = p.mwhSpeicher ? `${p.typ === "speicher" ? "/" : "+"} ${z(p.mwhSpeicher)} ${t.speicher}` : null;
  const hauptAktion = freigegeben || investor
    ? { href: portalLink, label: freigegeben ? t.zumDatenraum : t.imPortal }
    : { href: `/registrieren?rolle=investor&weiter=${encodeURIComponent(portalLink)}`, label: t.anmelden };
  const schritt = freigegeben ? 3 : investor ? 1 : 0;

  return (
    <>
      <JsonLd daten={jsonLd} />
      <section aria-labelledby="expose-titel" className="relative isolate overflow-hidden bg-sand-50">
        <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-200/40 blur-[120px]" />
        <div className="ov-container relative pb-16 pt-6 sm:pt-8 md:pb-24 md:pt-10">
          <Breadcrumbs items={[{ name: t.boerse, href: "/projektboerse" }, { name: p.titel }]} className="ov-hero-in mb-8 md:mb-12" />
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
            <div className="min-w-0">
              <div className="ov-hero-in flex flex-wrap items-center gap-2" style={{ "--ov-delay": "40ms" }}>
                <PhaseBadge phase={p.phase} />
                <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink-700 ring-1 ring-ink-200/70">{typName}</span>
                {p.status === "reserviert" && <span className="rounded-full bg-navy-900 px-2.5 py-1 text-[12px] font-semibold text-white">{en ? BEGRIFFE_EN.projektStatus.reserviert : statusLabel("projekt", "reserviert")}</span>}
                {eigen && <span className="rounded-full bg-ov-600 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide text-white" title={t.eigenTitel}>{t.eigen}</span>}
                {p.demo && <span className="rounded-full bg-sun-400 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide text-navy-950">{t.demo}</span>}
              </div>
              <h1 id="expose-titel" lang={datenLang} className="ov-h1 ov-hero-in mt-5 text-balance text-ink-900" style={{ "--ov-delay": "100ms" }}>{p.titel}</h1>
              <p className="ov-hero-in mt-4 flex items-center gap-2 text-[15px] font-medium text-ink-600" style={{ "--ov-delay": "140ms" }}>
                <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600" />
                {[p.region, p.bundesland, landName].filter(Boolean).join(" · ")}
              </p>
              <p lang={datenLang} className="ov-lead ov-hero-in mt-5 max-w-2xl whitespace-pre-line text-pretty text-ink-600" style={{ "--ov-delay": "180ms" }}>{p.beschreibung}</p>
              {p.highlights?.length > 0 && (
                <ul lang={datenLang} className="ov-hero-in mt-6 grid gap-2.5 sm:grid-cols-2" style={{ "--ov-delay": "220ms" }}>
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-[15px] text-ink-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ov-500 text-white"><Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} /></span>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
              <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ "--ov-delay": "260ms" }}>
                <Button href={hauptAktion.href} size="lg" pfeil className="w-full sm:w-auto">{hauptAktion.label}</Button>
                {!nutzer && <Button href={`/login?weiter=${encodeURIComponent(portalLink)}`} size="lg" variant="secondary" className="w-full sm:w-auto">{t.konto}</Button>}
              </div>
              <p className="ov-hero-in mt-4 flex items-start gap-2 text-[14px] text-ink-600" style={{ "--ov-delay": "300ms" }}>
                <FileDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
                <span>
                  <a href={`/api/boerse/${p.slug}/teaser`} target="_blank" rel="noopener" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-4 hover:text-ov-800">
                    {t.teaserPdf}
                  </a>
                  {t.teaserText}
                </span>
              </p>
            </div>

            <div className="ov-hero-in min-w-0" style={{ "--ov-delay": "200ms" }}>
              <div className="overflow-hidden rounded-[2rem] bg-white shadow-e4 ring-1 ring-ink-200/70">
                <div className="relative">
                  <TypIllustration typ={p.typ} variante={varianteAus(p.id || p.slug)} className="h-36 w-full sm:h-44" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-semibold text-ink-700 shadow-sm ring-1 ring-ink-200/70">{t.eckdaten}</span>
                </div>
                <dl className="grid grid-cols-2 border-b border-ink-100">
                  <div className="min-w-0 px-5 py-5 md:px-6">
                    <dt className="text-[12px] font-medium text-ink-500">{t.leistung}</dt>
                    <dd className="ov-num mt-1 font-display text-[28px] font-extrabold leading-none tracking-tight text-ink-900 md:text-[32px]">{leistungGross}</dd>
                    {leistungZusatz && <dd className="mt-1.5 text-[12.5px] font-medium text-ink-500">{leistungZusatz}</dd>}
                  </div>
                  <div className="min-w-0 border-l border-ink-100 px-5 py-5 md:px-6">
                    <dt className="text-[12px] font-medium text-ink-500">{t.preis}</dt>
                    <dd className="ov-num mt-1 font-display text-[28px] font-extrabold leading-none tracking-tight text-ink-900 md:text-[32px]">{preis}</dd>
                  </div>
                </dl>
                <dl className="grid grid-cols-2 gap-px bg-ink-100">
                  {eckdaten.filter((e) => !["leistung", "preis"].includes(e.id)).map((e) => {
                    const Icon = e.icon;
                    return (
                      <div key={e.label} className="min-w-0 bg-white px-5 py-4 md:px-6">
                        <dt className="flex items-center gap-1.5 text-[12px] font-medium text-ink-500"><Icon aria-hidden="true" className="h-3.5 w-3.5 text-ov-600" />{e.label}</dt>
                        <dd className="mt-1 text-[15px] font-semibold text-ink-900">{e.wert}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
                {t.fuss1}
                {eigen ? t.fussEigen : t.fussDritt}
                {t.fuss2}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Section tone="white" space="md">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
          <Vertraulich freigegeben={freigegeben} aktion={freigegeben || investor ? { href: portalLink, label: t.portalOeffnen } : hauptAktion} schritt={schritt} />
          <PhasenEinordnung phase={phase} preisProKwp={p.preisModus === "proKwp" ? p.preisProKwp : null} />
        </div>
      </Section>

      <CtaBand
        eyebrow={t.boerse}
        title={t.ctaTitel}
        text={t.ctaText}
        primary={{ label: t.zurBoerse, href: "/projektboerse" }}
        secondary={{ label: t.anbieten, href: "/projektboerse/anbieten" }}
      />
    </>
  );
}
