import { notFound } from "next/navigation";
import { CalendarClock, Check, Coins, Gauge, Lock, MapPin, ShieldCheck, Zap } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import CtaBand from "@/components/ui/CtaBand";
import TypIllustration from "@/components/Boerse/TypIllustration";
import { PhaseBadge } from "@/components/Boerse/ProjektKarte";
import { abs, SITE } from "@/data/site";
import { PHASEN, PROVISION, phaseById } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { backend } from "@/lib/plattform/backend";
import { aktuellerNutzer } from "@/lib/plattform/server/seite";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { LAENDER, NETZANSCHLUSS, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { VERTRAULICH_FELDER } from "@/lib/plattform/oeffentlich";
import { mwp, preisGesamt, preisText } from "@/lib/plattform/format";
import { statusLabel } from "@/lib/plattform/prozesse";

export const dynamic = "force-dynamic";

async function holen(slug, nutzer, zaehlen) {
  try {
    return await backend().boerseDetail(nutzer, slug, { zaehlen });
  } catch (e) {
    if (e instanceof PlattformFehler && [403, 404].includes(e.status)) return null;
    throw e;
  }
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
  const phasenIndex = PHASEN.findIndex((x) => x.id === phase.id);
  const investor = nutzer?.rollen?.includes("investor");
  const portalLink = `/portal/boerse/${p.id}`;
  const freigegeben = d.zugriff !== "oeffentlich";
  const gesamt = preisGesamt(p);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.titel,
    description: p.beschreibung,
    category: PROJEKT_TYPEN[p.typ],
    url: abs(`/projektboerse/${p.slug}`),
    brand: { "@type": "Organization", name: SITE.name },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Leistung", value: p.mwp, unitText: p.typ === "speicher" ? "MW" : "MWp" },
      { "@type": "PropertyValue", name: "Entwicklungsphase", value: phase.label },
      { "@type": "PropertyValue", name: "Land", value: LAENDER[p.land] },
      { "@type": "PropertyValue", name: "Region", value: p.region },
    ],
    ...(gesamt ? { offers: { "@type": "Offer", price: Math.round(gesamt), priceCurrency: "EUR", availability: p.status === "reserviert" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock", seller: { "@type": "Organization", name: SITE.firma } } } : {}),
  };

  const eckdaten = [
    { icon: Gauge, label: "Leistung", wert: p.typ === "speicher" ? `${fmt(p.mwp, 1)} MW${p.mwhSpeicher ? ` / ${fmt(p.mwhSpeicher)} MWh` : ""}` : `${mwp(p.mwp)}${p.mwhSpeicher ? ` + ${fmt(p.mwhSpeicher)} MWh` : ""}` },
    { icon: ShieldCheck, label: "Phase", wert: phase.label },
    { icon: Zap, label: "Netzanschluss", wert: NETZANSCHLUSS[p.netzanschluss] },
    { icon: CalendarClock, label: "Inbetriebnahme geplant", wert: p.codGeplant || "offen" },
    { icon: Coins, label: "Preisindikation", wert: preisText(p) },
    { icon: MapPin, label: "Lage (grob)", wert: [p.region, p.bundesland, LAENDER[p.land]].filter(Boolean).join(", ") },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="relative overflow-hidden bg-sand-50">
        <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-0" />
        <div className="ov-container relative pb-14 pt-8 md:pb-20 md:pt-12">
          <Breadcrumbs items={[{ name: "Projektbörse", href: "/projektboerse" }, { name: p.titel }]} className="mb-8" />
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <PhaseBadge phase={p.phase} />
                <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink-700 ring-1 ring-ink-200/70">{PROJEKT_TYPEN[p.typ]}</span>
                {p.status === "reserviert" && <span className="rounded-full bg-navy-900 px-2.5 py-1 text-[12px] font-semibold text-white">{statusLabel("projekt", "reserviert")}</span>}
                {p.demo && <span className="rounded-full bg-sun-400 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide text-navy-950">Demo-Projekt · fiktiv</span>}
              </div>
              <h1 className="ov-h1 mt-5 text-ink-900">{p.titel}</h1>
              <p className="ov-lead mt-5 max-w-2xl whitespace-pre-line text-ink-600">{p.beschreibung}</p>
              {p.highlights?.length > 0 && (
                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-[15px] text-ink-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ov-500 text-white"><Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} /></span>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {freigegeben || investor ? (
                  <Button href={portalLink} size="lg" pfeil>{freigegeben ? "Zum Datenraum im Portal" : "Im Portal öffnen & NDA anfragen"}</Button>
                ) : (
                  <Button href={`/registrieren?rolle=investor&weiter=${encodeURIComponent(portalLink)}`} size="lg" pfeil>Als Investor anmelden & NDA anfragen</Button>
                )}
                {!nutzer && <Button href={`/login?weiter=${encodeURIComponent(portalLink)}`} size="lg" variant="secondary">Ich habe ein Konto</Button>}
              </div>
            </div>
            <div className="min-w-0">
              <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_80px_-40px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70">
                <TypIllustration typ={p.typ} className="h-44 w-full" />
                <dl className="grid gap-px bg-ink-100 sm:grid-cols-2">
                  {eckdaten.map((e) => {
                    const Icon = e.icon;
                    return (
                      <div key={e.label} className="bg-white p-4">
                        <dt className="flex items-center gap-1.5 text-[12px] font-medium text-ink-500"><Icon aria-hidden="true" className="h-3.5 w-3.5 text-ov-600" />{e.label}</dt>
                        <dd className="mt-1 text-[15px] font-semibold text-ink-900">{e.wert}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">Angaben des Anbieters, vom Backoffice auf Plausibilität geprüft. Keine Anlageberatung. Für Investoren kostenfrei.</p>
            </div>
          </div>
        </div>
      </section>

      <Section tone="white" space="md">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="relative min-w-0 overflow-hidden rounded-[2rem] bg-white ring-1 ring-ink-200/70">
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-6 py-4">
              <h2 className="font-display text-[18px] font-bold text-ink-900">Vertrauliche Angaben & Datenraum</h2>
              <Lock aria-hidden="true" className="h-5 w-5 text-ink-400" />
            </div>
            {/* Platzhalter – echte Werte werden NIE an nicht berechtigte Besucher ausgeliefert */}
            <dl aria-hidden="true" className="grid select-none gap-x-6 gap-y-4 p-6 blur-[3px] sm:grid-cols-2">
              {Object.values(VERTRAULICH_FELDER).slice(0, 8).map((label, i) => (
                <div key={label}>
                  <dt className="text-[12px] text-ink-500">{label}</dt>
                  <dd className="mt-1.5 h-3.5 rounded bg-ink-200" style={{ width: `${55 + ((i * 17) % 40)}%` }} />
                </div>
              ))}
            </dl>
            <div className="absolute inset-x-0 bottom-0 top-[57px] flex items-center justify-center bg-gradient-to-b from-white/70 via-white/95 to-white p-6">
              <div className="max-w-sm text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-950 text-ov-300"><Lock aria-hidden="true" className="h-5 w-5" /></span>
                <p className="mt-3 font-display text-[18px] font-bold text-ink-900">{freigegeben ? "Für Sie freigeschaltet" : "Nur nach NDA sichtbar"}</p>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">
                  {freigegeben ? "Gemeinde, Flurstücke, Netzbetreiber und alle Unterlagen finden Sie im Portal." : "Gemeinde, Flurstücke, Netzbetreiber, Ertragsgutachten und Unterlagen sehen registrierte Investoren nach Annahme der Vertraulichkeitsvereinbarung."}
                </p>
                <div className="mt-4 flex justify-center">
                  {freigegeben || investor ? (
                    <Button href={portalLink} size="sm" pfeil>Im Portal öffnen</Button>
                  ) : (
                    <Button href={`/registrieren?rolle=investor&weiter=${encodeURIComponent(portalLink)}`} size="sm" pfeil>Als Investor anmelden & NDA anfragen</Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-[2rem] bg-navy-950 p-7 text-white md:p-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">Einordnung der Phase</p>
            <p className="mt-3 font-display text-[22px] font-bold">{phase.label}</p>
            <ol className="mt-5 flex gap-1" aria-label="Entwicklungsphasen">
              {PHASEN.map((x, i) => (
                <li key={x.id} className="min-w-0 flex-1" aria-current={i === phasenIndex ? "step" : undefined}>
                  <span className={`block h-1.5 rounded-full ${i <= phasenIndex ? "bg-ov-400" : "bg-white/15"}`} />
                  <span className="sr-only">{x.label}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[12.5px] text-white/60">Stufe {phasenIndex + 1} von {PHASEN.length}: {PHASEN[0].kurz} → {PHASEN[PHASEN.length - 1].kurz}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
              <div>
                <dt className="text-[12px] text-white/55">Typisches Risiko</dt>
                <dd className="mt-1 font-semibold">{phase.risiko}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-white/55">Übliche Preise (Markt)</dt>
                <dd className="mt-1 font-semibold">{fmt(phase.preisProKwp.min)}–{fmt(phase.preisProKwp.max)} €/kWp</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[12px] text-white/55">Typischer Abstand bis Baureife</dt>
                <dd className="mt-1 font-semibold">{phase.monateBisRtb ? `rund ${phase.monateBisRtb} Monate` : "baureif bzw. in Betrieb"}</dd>
              </div>
            </dl>
            <p className="mt-5 text-[12.5px] leading-relaxed text-white/50">Marktspannen DACH als Orientierung – stark abhängig von Netzanschluss, Größe, Vergütung und Standort. Für Käufer kostenfrei; Anbieter zahlen {PROVISION.verkaeufer.text}.</p>
          </div>
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
