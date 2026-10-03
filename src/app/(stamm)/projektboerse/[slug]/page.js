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

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const d = await holen(slug, null, false).catch(() => null);
  if (!d) return { title: "Projekt nicht gefunden | ÖkoInvest", robots: { index: false } };
  const p = d.projekt;
  const pfad = `/projektboerse/${p.slug}`;
  const titel = `${p.titel}`.length > 46 ? `${p.titel.slice(0, 45)}… | ÖkoInvest` : `${p.titel} | ÖkoInvest`;
  const beschreibung = `${PROJEKT_TYPEN[p.typ]} mit ${mwp(p.mwp)} in ${p.region} (${LAENDER[p.land]}), Phase: ${phaseById(p.phase).label}. Exposé ansehen, NDA per Klick, Datenraum im Portal.`.slice(0, 160);
  return {
    title: titel,
    description: beschreibung,
    alternates: { canonical: abs(pfad) },
    robots: p.demo ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { type: "website", url: abs(pfad), siteName: "ÖkoInvest", title: titel, description: beschreibung, images: [{ url: abs("/img/solarpark-himmel.jpg"), width: 1280, height: 852, alt: "Solarpark unter blauem Himmel" }] },
  };
}

export default async function Expose({ params }) {
  const { slug } = await params;
  const nutzer = await aktuellerNutzer().catch(() => null);
  const d = await holen(slug, nutzer, true);
  if (!d) notFound();
  const p = d.projekt;
  const phase = phaseById(p.phase);
  const investor = nutzer?.rollen?.includes("investor");
  const portalLink = `/portal/boerse/${p.id}`;
  const freigegeben = d.zugriff !== "oeffentlich";

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
    keywords: [PROJEKT_TYPEN[p.typ], phase.label, LAENDER[p.land], p.region].filter(Boolean).join(", "),
    isPartOf: { "@type": "CollectionPage", name: "Projektbörse ÖkoInvest", url: abs("/projektboerse") },
    ...(eigen ? { sourceOrganization: { "@type": "Organization", name: SITE.firma, url: SITE.url } } : {}),
  };

  const eckdaten = [
    { icon: Gauge, label: "Leistung", wert: p.typ === "speicher" ? `${fmt(p.mwp, 1)} MW${p.mwhSpeicher ? ` / ${fmt(p.mwhSpeicher)} MWh` : ""}` : `${mwp(p.mwp)}${p.mwhSpeicher ? ` + ${fmt(p.mwhSpeicher)} MWh` : ""}` },
    { icon: ShieldCheck, label: "Phase", wert: phase.label },
    { icon: Zap, label: "Netzanschluss", wert: NETZANSCHLUSS[p.netzanschluss] },
    { icon: CalendarClock, label: "Inbetriebnahme geplant", wert: p.codGeplant || "offen" },
    { icon: Coins, label: "Preisindikation", wert: preisText(p) },
    { icon: MapPin, label: "Lage (grob)", wert: [p.region, p.bundesland, LAENDER[p.land]].filter(Boolean).join(", ") },
  ];

  const leistungGross = p.typ === "speicher" ? `${fmt(p.mwp, p.mwp < 10 ? 1 : 0)} MW` : mwp(p.mwp);
  const leistungZusatz = p.mwhSpeicher ? `${p.typ === "speicher" ? "/" : "+"} ${fmt(p.mwhSpeicher)} MWh Speicher` : null;
  const hauptAktion = freigegeben || investor
    ? { href: portalLink, label: freigegeben ? "Zum Datenraum im Portal" : "Im Portal öffnen & NDA anfragen" }
    : { href: `/registrieren?rolle=investor&weiter=${encodeURIComponent(portalLink)}`, label: "Als Investor anmelden & NDA anfragen" };
  const schritt = freigegeben ? 3 : investor ? 1 : 0;

  return (
    <>
      <JsonLd daten={jsonLd} />
      <section aria-labelledby="expose-titel" className="relative isolate overflow-hidden bg-sand-50">
        <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-200/40 blur-[120px]" />
        <div className="ov-container relative pb-16 pt-6 sm:pt-8 md:pb-24 md:pt-10">
          <Breadcrumbs items={[{ name: "Projektbörse", href: "/projektboerse" }, { name: p.titel }]} className="ov-hero-in mb-8 md:mb-12" />
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
            <div className="min-w-0">
              <div className="ov-hero-in flex flex-wrap items-center gap-2" style={{ "--ov-delay": "40ms" }}>
                <PhaseBadge phase={p.phase} />
                <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink-700 ring-1 ring-ink-200/70">{PROJEKT_TYPEN[p.typ]}</span>
                {p.status === "reserviert" && <span className="rounded-full bg-navy-900 px-2.5 py-1 text-[12px] font-semibold text-white">{statusLabel("projekt", "reserviert")}</span>}
                {eigen && <span className="rounded-full bg-ov-600 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide text-white" title="Projekt aus der eigenen Entwicklung der ÖKOVOLT Gruppe – wir sind hier selbst Verkäufer">Eigenprojekt</span>}
                {p.demo && <span className="rounded-full bg-sun-400 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide text-navy-950">Demo-Projekt · fiktiv</span>}
              </div>
              <h1 id="expose-titel" className="ov-h1 ov-hero-in mt-5 text-balance text-ink-900" style={{ "--ov-delay": "100ms" }}>{p.titel}</h1>
              <p className="ov-hero-in mt-4 flex items-center gap-2 text-[15px] font-medium text-ink-600" style={{ "--ov-delay": "140ms" }}>
                <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600" />
                {[p.region, p.bundesland, LAENDER[p.land]].filter(Boolean).join(" · ")}
              </p>
              <p className="ov-lead ov-hero-in mt-5 max-w-2xl whitespace-pre-line text-pretty text-ink-600" style={{ "--ov-delay": "180ms" }}>{p.beschreibung}</p>
              {p.highlights?.length > 0 && (
                <ul className="ov-hero-in mt-6 grid gap-2.5 sm:grid-cols-2" style={{ "--ov-delay": "220ms" }}>
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
                {!nutzer && <Button href={`/login?weiter=${encodeURIComponent(portalLink)}`} size="lg" variant="secondary" className="w-full sm:w-auto">Ich habe ein Konto</Button>}
              </div>
              <p className="ov-hero-in mt-4 flex items-start gap-2 text-[14px] text-ink-600" style={{ "--ov-delay": "300ms" }}>
                <FileDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
                <span>
                  <a href={`/api/boerse/${p.slug}/teaser`} target="_blank" rel="noopener" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-4 hover:text-ov-800">
                    Teaser als PDF
                  </a>{" "}
                  – öffentliche Eckdaten zum Weitergeben, ohne vertrauliche Angaben.
                </span>
              </p>
            </div>

            <div className="ov-hero-in min-w-0" style={{ "--ov-delay": "200ms" }}>
              <div className="overflow-hidden rounded-[2rem] bg-white shadow-e4 ring-1 ring-ink-200/70">
                <div className="relative">
                  <TypIllustration typ={p.typ} variante={varianteAus(p.id || p.slug)} className="h-36 w-full sm:h-44" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-semibold text-ink-700 shadow-sm ring-1 ring-ink-200/70">Exposé · öffentliche Eckdaten</span>
                </div>
                <dl className="grid grid-cols-2 border-b border-ink-100">
                  <div className="min-w-0 px-5 py-5 md:px-6">
                    <dt className="text-[12px] font-medium text-ink-500">Leistung</dt>
                    <dd className="ov-num mt-1 font-display text-[28px] font-extrabold leading-none tracking-tight text-ink-900 md:text-[32px]">{leistungGross}</dd>
                    {leistungZusatz && <dd className="mt-1.5 text-[12.5px] font-medium text-ink-500">{leistungZusatz}</dd>}
                  </div>
                  <div className="min-w-0 border-l border-ink-100 px-5 py-5 md:px-6">
                    <dt className="text-[12px] font-medium text-ink-500">Preisindikation</dt>
                    <dd className="ov-num mt-1 font-display text-[28px] font-extrabold leading-none tracking-tight text-ink-900 md:text-[32px]">{preisText(p)}</dd>
                  </div>
                </dl>
                <dl className="grid grid-cols-2 gap-px bg-ink-100">
                  {eckdaten.filter((e) => !["Leistung", "Preisindikation"].includes(e.label)).map((e) => {
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
                Angaben des Anbieters, vom Backoffice auf Vollständigkeit und Plausibilität geprüft – keine Due Diligence. Keine Anlageberatung.
                {eigen ? " Eigenprojekt: Verkäufer ist ein Unternehmen der ÖKOVOLT Gruppe." : " Verkäufer ist der jeweilige Anbieter."} Für
                Investoren kostenfrei; der Verkäufer zahlt bei Abschluss eine Provision.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Section tone="white" space="md">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
          <Vertraulich freigegeben={freigegeben} aktion={freigegeben || investor ? { href: portalLink, label: "Im Portal öffnen" } : hauptAktion} schritt={schritt} />
          <PhasenEinordnung phase={phase} preisProKwp={p.preisModus === "proKwp" ? p.preisProKwp : null} />
        </div>
      </Section>

      <CtaBand
        eyebrow="Projektbörse"
        title="Weitere Projekte in allen Phasen"
        text="Freiflächen-PV, Agri-PV, Parkplatz-PV und Speicher in Deutschland, Österreich und der Schweiz."
        primary={{ label: "Zur Projektbörse", href: "/projektboerse" }}
        secondary={{ label: "Projekt anbieten", href: "/projektboerse/anbieten" }}
      />
    </>
  );
}
