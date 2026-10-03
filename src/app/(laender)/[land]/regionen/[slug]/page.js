// src/app/regionen/[slug]/page.js – Regionalseite „Solarpark & Agri-PV in <Region>“
//
// Inhalte je Region: src/data/regionen/<slug>.js (recherchiert, mit Quellen).
// Kennzahlen: src/components/Region/rechnung.js auf Basis von src/lib/invest/markt.js.

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle, ArrowRight, Building2, CheckCircle2, Compass, Landmark, LayoutDashboard, MapPinned, Mountain, PlugZap, Sprout, XCircle,
} from "lucide-react";

import Hero from "@/components/Boerse/Seite/Hero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import RegionKarte from "@/components/Region/RegionKarte";
import RegionKennzahlen from "@/components/Region/RegionKennzahlen";
import RegionBuehne from "@/components/Region/RegionBuehne";
import RegionSchritte from "@/components/Region/RegionSchritte";
import QuelleLink from "@/components/Region/QuelleLink";
import Fett, { ohneFett } from "@/components/Region/Fett";
import { LAND } from "@/components/Region/laender";
import { BEISPIEL_HA, kennzahlen } from "@/components/Region/rechnung";
import { nachbarnVon, regionFuer } from "@/data/regionen";
import { abs } from "@/data/site";
import { PACHT, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { grundstueck } from "@/lib/anfrage/laender";
import JsonLd from "@/components/JsonLd";
import { LAENDER, landAusPraefix, linkFuer, pfad as seitenPfad, regionSchluessel, regionenSlugs } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

export const dynamicParams = false;

// Je Land nur die Regionen dieses Landes, die im gestuften Start freigegeben sind (stufen.js)
export async function generateStaticParams({ params }) {
  const land = landAusPraefix((await params)?.land);
  return land ? regionenSlugs(land).map((slug) => ({ slug })) : [];
}

const schluesselAus = ({ slug }) => regionSchluessel(slug);

async function basisMetadata(land, { slug }) {
  const r = regionFuer(slug);
  if (!r) return {};
  return {
    title: r.seoTitel,
    description: r.beschreibung,
    openGraph: {
      type: "website",
      siteName: "ÖkoInvest",
      title: r.seoTitel,
      description: r.beschreibung,
      images: [{ url: abs(r.bild), width: 1280, height: 852, alt: `Solarpark und Agri-PV ${r.inName}` }],
    },
  };
}

export const generateMetadata = landMetadata(schluesselAus, basisMetadata);

const zahl = (n) => (typeof n === "number" ? fmt(n) : n);

export default async function RegionSeite({ params }) {
  const { slug } = await params;
  const r = regionFuer(slug);
  if (!r) notFound();
  const { land: zonenLand, schluessel } = await landDerSeite(params, schluesselAus);
  const lp = (k) => seitenPfad(k, zonenLand);
  const link = (k, label) => linkFuer(k, zonenLand, label);

  const land = LAND[r.land];
  const k = kennzahlen(r, r);
  const umgebung = nachbarnVon(r);
  const url = abs(seitenPfad(schluessel, zonenLand));
  const e = r.eckdaten || {};
  const titelZeile = `Solarpark & Agri-PV ${r.inName}`;

  const areaServed =
    r.land === "CH"
      ? { "@type": "Country", name: "Schweiz" }
      : { "@type": "State", name: r.name, containedInPlace: { "@type": "Country", name: land.name } };

  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: titelZeile,
          serviceType: "Projektentwicklung und Flächenpacht für Freiflächen-Photovoltaik und Agri-PV",
          provider: { "@id": `${abs("/")}/#organization` },
          areaServed,
          audience: { "@type": "Audience", audienceType: "Flächeneigentümer und Landwirte" },
          url,
          description: r.beschreibung,
        }}
      />

      <Hero
        breadcrumbs={[{ name: "Regionen", href: lp("/regionen") }, { name: r.name }]}
        pill={{ marke: r.land === "CH" ? "CH" : r.land, text: r.land === "CH" ? "Schweiz · Bund und Kantone" : `${land.name} · ${r.name} · Stand ${STAND}`, href: "#ausgangslage" }}
        titel={
          <>
            Solarpark & <span className="whitespace-nowrap">Agri-PV</span> {r.inName}
            {/^(mit|zwischen|vom|nur|im|in)\b/.test(r.akzent || "") ? " " : ": "}
            <span className="ov-text-gradient-light">{r.akzent}</span>
          </>
        }
        lead={r.lead}
        aktionen={[
          { label: "Fläche prüfen lassen", href: "#anfrage" },
          zonenLand === "DE" ? link("/rechner/pacht", "Pacht berechnen") : { label: `Regionen ${LAENDER[zonenLand].inLand}`, href: lp("/regionen") },
        ]}
        hinweis="Prüfung und Vertrag kostenfrei · persönliche Rückmeldung"
        versprechen={[
          `Ertrag rund ${fmt(k.ertrag)} kWh/kWp`,
          r.netz?.uenb?.length ? `Übertragungsnetz: ${r.netz.uenb.join(", ")}` : `${land.name}`,
          "Prüfung & Vertrag kostenfrei",
          "Status jederzeit im Portal",
        ]}
        buehne={<RegionBuehne region={r} k={k} />}
        bildunterschrift={`Orientierungswerte: PVGIS und Marktannahmen, Stand ${STAND}`}
      />

      {/* Kennzahlen */}
      <section aria-label={`Kennzahlen ${r.inName}`} className="relative z-10 -mt-12 bg-transparent md:-mt-16">
        <div className="ov-container">
          <h2 className="sr-only">Kennzahlen {r.inName}</h2>
          <RegionKennzahlen region={r} k={k} />
        </div>
      </section>

      {/* Ausgangslage */}
      <Section tone="white" space="md" id="ausgangslage" className="scroll-mt-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="Ausgangslage" title={`Freiflächen-PV ${r.inName}`} />
            <div className="mt-6 space-y-4 text-[16.5px] leading-relaxed text-ink-700">
              {r.einleitung?.map((p) => (
                <p key={p.slice(0, 48)}>
                  <Fett>{p}</Fett>
                </p>
              ))}
            </div>
          </div>
          <Reveal as="aside" className="self-start rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7" aria-label={`Eckdaten ${r.name}`}>
            <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">
              <MapPinned aria-hidden="true" className="h-4 w-4" />
              {r.name} in Zahlen
            </p>
            <dl className="mt-4 divide-y divide-ink-200/70 text-[15px]">
              {e.hauptstadt && !["berlin", "hamburg", "bremen", "wien"].includes(r.slug) && <Zeile l={r.land === "CH" ? "Bundesstadt" : "Landeshauptstadt"} v={e.hauptstadt} />}
              {e.flaecheKm2 && <Zeile l="Fläche" v={`${zahl(e.flaecheKm2)} km²`} />}
              {e.lfHa && <Zeile l={`Landwirtschaftlich genutzt${e.lfJahr ? ` (${e.lfJahr})` : ""}`} v={`${zahl(e.lfHa)} ha`} />}
              {e.ackerHa && <Zeile l="davon Ackerland" v={`${zahl(e.ackerHa)} ha`} />}
              {e.einwohner && <Zeile l="Einwohner" v={zahl(e.einwohner)} />}
              <Zeile l="Solarertrag" v={`${fmt(k.ertrag)} kWh/kWp`} />
            </dl>
            {e.quelle && <QuelleLink quelle={e.quelle} className="mt-4" />}
            {r.ertrag?.hinweis && <p className="mt-4 border-t border-ink-200/70 pt-4 text-[13.5px] leading-relaxed text-ink-600">{r.ertrag.hinweis}</p>}
          </Reveal>
        </div>
      </Section>

      {/* Recht & Planung */}
      {r.recht?.length > 0 && (
        <Section tone="sand" space="lg">
          <SectionHeading
            eyebrow="Recht & Planung"
            title={`Was ${r.inName} gilt`}
            lead={`Die wichtigsten Regeln für Solarparks und Agri-PV ${r.inName} – recherchiert mit Quellen, Stand ${STAND}. Maßgeblich ist immer die aktuelle Fassung; wir prüfen Ihre Fläche im Einzelfall.`}
            className="mb-12"
          />
          <ul className="grid gap-4 md:grid-cols-2">
            {r.recht.map((p, i) => (
              <Reveal as="li" key={p.titel} delay={(i % 4) * 60} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-ink-200/60 md:p-7">
                <div className="flex items-start gap-3">
                  <Landmark aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                  <h3 className="font-display text-[17.5px] font-bold leading-snug text-ink-900">{p.titel}</h3>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
                  <Fett>{p.text}</Fett>
                </p>
                {p.quelle && <QuelleLink quelle={p.quelle} className="mt-auto pt-4" />}
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      {/* Flächenkulisse */}
      {r.kulisse && (
        <Section tone="white" space="lg">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <SectionHeading eyebrow="Flächenkulisse" title={`Welche Flächen ${r.inName} infrage kommen`}>
              {r.kulisse.text && (
                <p className="mt-5 text-[16.5px] leading-relaxed text-ink-700">
                  <Fett>{r.kulisse.text}</Fett>
                </p>
              )}
            </SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              <Liste titel="Eher gut geeignet" icon={CheckCircle2} ton="gut" punkte={r.kulisse.gut} />
              <Liste titel="Eher schwierig" icon={XCircle} ton="schwierig" punkte={r.kulisse.schwierig} />
            </div>
          </div>
        </Section>
      )}

      {/* Ablauf & Behörden */}
      <Section tone="green" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="Ablauf vor Ort" title={`Vom Acker zum Solarpark ${r.inName}`} />
            {r.ablauf?.text && (
              <p className="mt-6 text-[16.5px] leading-relaxed text-ink-700">
                <Fett>{r.ablauf.text}</Fett>
              </p>
            )}
            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-600">{land.schritteHinweis}</p>
          </div>
          {r.ablauf?.behoerden?.length > 0 && (
            <Reveal className="self-start rounded-3xl bg-white p-6 ring-1 ring-ov-100 md:p-7">
              <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">
                <Building2 aria-hidden="true" className="h-4 w-4" />
                Wer entscheidet
              </p>
              <ul className="mt-4 space-y-4">
                {r.ablauf.behoerden.map((b) => (
                  <li key={b.name}>
                    <p className="font-semibold text-ink-900">{b.name}</p>
                    <p className="mt-0.5 text-[14.5px] leading-relaxed text-ink-600">{b.rolle}</p>
                    {b.url && <QuelleLink quelle={{ url: b.url, titel: b.name }} className="mt-1" />}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>
        <div className="mt-16">
          <RegionSchritte items={land.schritte} />
        </div>
      </Section>

      {/* Agri-PV */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="Agri-PV" title={`Agri-PV ${r.inName}: Strom und Landwirtschaft auf einer Fläche`} />
            <div className="mt-6 space-y-4 text-[16.5px] leading-relaxed text-ink-700">
              {r.agri?.map((p) => (
                <p key={p.slice(0, 48)}>
                  <Fett>{p}</Fett>
                </p>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
              <Link href={lp("/agri-pv")} className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ov-700 hover:text-ov-800">
                {link("/agri-pv", "Agri-PV im Überblick").label} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link href={lp("/rechner/agri-pv")} className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ov-700 hover:text-ov-800">
                {link("/rechner/agri-pv", "Agri-PV-Rechner").label} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="grid content-start gap-4">
            {land.agri.map((a, i) => (
              <Reveal key={a.t} delay={i * 60} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60">
                <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">
                  <Sprout aria-hidden="true" className="h-4 w-4" />
                  {a.t} · {land.name}
                </p>
                <p className="ov-num mt-2 font-display text-[22px] font-extrabold tracking-tight text-ink-900">{a.k}</p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-ink-600">{a.x}</p>
              </Reveal>
            ))}
            <p className="text-[13px] leading-relaxed text-ink-500">
              Agri-PV-Pacht liegt meist niedriger als bei Freiflächen-PV, dafür bleibt die Bewirtschaftung beim Landwirt{k.pachtGesperrt ? "." : <>: bei {BEISPIEL_HA} ha etwa {fmtEur(k.agriPacht.min)}–{fmtEur(k.agriPacht.max)} im Jahr (Orientierung).</>}
            </p>
          </div>
        </div>
      </Section>

      {/* Besonderheiten & Netz */}
      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="Vor Ort" title={`Netz und Besonderheiten ${r.inName}`} className="mb-12" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {r.netz && (
            <Reveal className="flex flex-col rounded-3xl bg-navy-950 p-6 text-white md:p-7 xl:row-span-2">
              <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-300">
                <PlugZap aria-hidden="true" className="h-4 w-4" />
                Stromnetz
              </p>
              {r.netz.uenb?.length > 0 && (
                <>
                  <p className="mt-4 text-[13px] text-white/60">Übertragungsnetz</p>
                  <p className="font-display text-[18px] font-bold">{r.netz.uenb.join(", ")}</p>
                </>
              )}
              {r.netz.vnb?.length > 0 && (
                <>
                  <p className="mt-4 text-[13px] text-white/60">Große Verteilnetzbetreiber</p>
                  <ul className="mt-1 space-y-1 text-[15px] text-white/90">
                    {r.netz.vnb.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </>
              )}
              {r.netz.hinweis && <p className="mt-5 text-[14.5px] leading-relaxed text-white/70">{r.netz.hinweis}</p>}
              <p className="mt-5 text-[14px] leading-relaxed text-white/60">
                Welcher Netzbetreiber für Ihre Fläche zuständig ist und wo Kapazität frei ist, klären wir mit der Netzanfrage – oft entscheidet sie über die Parkgröße.
              </p>
              {r.netz.quelle?.url && (
                <a href={r.netz.quelle.url} target="_blank" rel="noopener noreferrer" className="mt-auto pt-5 text-[12.5px] font-medium text-ov-300 underline decoration-ov-300/50 underline-offset-2 hover:text-white">
                  Quelle: {r.netz.quelle.titel}
                  <span className="sr-only"> (öffnet neues Fenster)</span>
                </a>
              )}
            </Reveal>
          )}
          {r.besonderheiten?.map((b, i) => (
            <Reveal key={b.titel} delay={i * 60} className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/60 md:p-7">
              <p className="flex items-center gap-2 font-display text-[17.5px] font-bold text-ink-900">
                <Mountain aria-hidden="true" className="h-5 w-5 shrink-0 text-ov-600" />
                {b.titel}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                <Fett>{b.text}</Fett>
              </p>
            </Reveal>
          ))}
          {r.pacht?.begruendung && (
            <Reveal className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/60 md:p-7">
              <p className="flex items-center gap-2 font-display text-[17.5px] font-bold text-ink-900">
                <Compass aria-hidden="true" className="h-5 w-5 shrink-0 text-ov-600" />
                Pacht {r.inName}
              </p>
              {k.pachtGesperrt ? (
                <p className="mt-2 text-[15px] font-semibold text-ov-700">Pachtwerte: Rechenlogik für {k.land === "CH" ? "die Schweiz" : "Österreich"} in Vorbereitung</p>
              ) : (
              <>
              <p className="ov-num mt-2 font-display text-[20px] font-extrabold text-ov-700">
                {fmt(k.spanne.min)}–{fmt(k.spanne.max)} €/ha·a
              </p>
              <div className="mt-3" role="img" aria-label={`Spanne ${fmt(k.spanne.min)} bis ${fmt(k.spanne.max)} Euro innerhalb der DACH-Spanne ${fmt(PACHT.freiflaecheProHa.min)} bis ${fmt(PACHT.freiflaecheProHa.max)} Euro`}>
                <div className="relative h-2 rounded-full bg-ink-100">
                  <span
                    className="absolute inset-y-0 rounded-full bg-ov-500"
                    style={{
                      left: `${((k.spanne.min - PACHT.freiflaecheProHa.min) / (PACHT.freiflaecheProHa.max - PACHT.freiflaecheProHa.min)) * 100}%`,
                      width: `${((k.spanne.max - k.spanne.min) / (PACHT.freiflaecheProHa.max - PACHT.freiflaecheProHa.min)) * 100}%`,
                    }}
                  />
                </div>
                <div aria-hidden="true" className="ov-num mt-1 flex justify-between text-[11px] text-ink-500"><span>{fmt(PACHT.freiflaecheProHa.min)} €</span><span>DACH-Spanne</span><span>{fmt(PACHT.freiflaecheProHa.max)} €</span></div>
              </div>
              </>
              )}
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                <Fett>{r.pacht.begruendung}</Fett>
              </p>
            </Reveal>
          )}
        </div>
      </Section>

      {/* Kantone (nur Schweiz) */}
      {r.kantone?.length > 0 && (
        <Section tone="white" space="lg">
          <SectionHeading eyebrow="Kantone" title="Wie die Kantone Freiflächen-PV handhaben" lead="Raumplanung und Bewilligung liegen in der Schweiz weitgehend bei den Kantonen. Eine grobe Übersicht – ohne Anspruch auf Vollständigkeit." className="mb-12" />
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {r.kantone.map((c, i) => (
              <Reveal as="li" key={c.name} delay={(i % 3) * 60} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60">
                <p className="font-display text-[17.5px] font-bold text-ink-900">{c.name}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                  <Fett>{c.text}</Fett>
                </p>
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      {/* FAQ */}
      {r.faq?.length > 0 && (
        <Section tone={r.kantone?.length ? "sand" : "white"} space="lg">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <SectionHeading eyebrow="Häufige Fragen" title={`Solarpark ${r.inName}: Fragen von Flächeneigentümern`} lead="Ihre Frage ist nicht dabei? Stellen Sie sie im Formular – wir antworten persönlich." />
            <Faq items={r.faq.map((f) => ({ q: f.q, a: <Fett>{f.a}</Fett>, aText: ohneFett(f.a) }))} />
          </div>
        </Section>
      )}

      {/* Anfrage */}
      <Section tone={r.kantone?.length ? "white" : "sand"} space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Kostenlos & unverbindlich"
              title={`Fläche ${r.inName} melden`}
              lead={`Nennen Sie uns Gemeinde, Größe und – wenn zur Hand – die ${grundstueck(r.land).mehrzahl}. Wir prüfen Planungsrecht, Netz und Einstrahlung Ihrer Fläche ${r.inName} am Kartentisch und melden uns persönlich.`}
            />
            <Reveal className="ov-noise relative mt-8 overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8">
              <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
              <div className="relative">
                <LayoutDashboard aria-hidden="true" className="h-7 w-7 text-ov-300" />
                <p className="mt-4 font-display text-[20px] font-bold">Status Ihrer Fläche im Portal</p>
                <p className="mt-2 text-[15px] leading-relaxed text-white/70">
                  Prüfergebnis, Angebot, Vertragsentwürfe und Meilensteine an einem Ort. Registrieren Sie sich mit derselben E-Mail, dann erscheint Ihre Anfrage automatisch.
                </p>
                <Link href="/registrieren?rolle=flaeche" className="mt-5 inline-flex items-center gap-2 text-[15px] font-semibold text-ov-300 hover:text-white">
                  Zugang anlegen <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-[0_40px_80px_-50px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 md:p-9">
            <AnfrageFormular
              typ="flaeche"
              daten={{ region: r.slug, regionName: r.name, land: r.land, quelle: `regionen/${r.slug}` }}
              felder={["telefon", "plz", "ort", "nachricht"]}
              titel={`Ihre Fläche ${r.inName}`}
              text="Bitte in der Nachricht ungefähre Größe, aktuelle Nutzung und – falls zur Hand – Gemarkung und Flurstücke angeben."
              button="Fläche melden"
            />
          </Reveal>
        </div>
      </Section>

      {/* Quellen */}
      {r.quellen?.length > 0 && (
        <Section tone="white" space="sm">
          <details className="group rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-8">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[18px] font-bold text-ink-900 [&::-webkit-details-marker]:hidden">
              Quellen und Stand der Recherche ({r.quellen.length})
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600 transition-transform group-open:rotate-90" />
            </summary>
            <ul className="mt-5 grid gap-2.5 text-[14px] leading-relaxed text-ink-600 md:grid-cols-2">
              {r.quellen.map((q) => (
                <li key={q.url} className="min-w-0">
                  <a href={q.url} target="_blank" rel="noopener noreferrer" className="break-words text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
                    {q.titel}
                    <span className="sr-only"> (öffnet neues Fenster)</span>
                  </a>
                  {q.stand && <span className="text-ink-500"> · Stand {q.stand}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-5 flex items-start gap-2 text-[13px] leading-relaxed text-ink-500">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              Alle Angaben ohne Gewähr und ohne Rechtsberatung. Gesetze, Verordnungen und Pläne ändern sich; maßgeblich ist die jeweils geltende Fassung.
            </p>
          </details>
        </Section>
      )}

      {/* Nachbarregionen */}
      <Section tone="sand" space="md">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <SectionHeading eyebrow="Weitere Regionen" title={r.land === "CH" ? "Rund um die Schweiz" : `Rund um ${r.name}`} className="mb-8" />
            <ul className="grid gap-3 sm:grid-cols-2">
              {umgebung.map((n) => (
                <li key={n.slug}>
                  <Link href={lp(regionSchluessel(n.slug))} className="group flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink-200/70 hover:ring-ov-400">
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink-900">Solarpark {n.name}</span>
                      <span className="text-[13px] text-ink-600">{LAND[n.land].name}{n.ertrag?.kwhProKwp ? ` · ${fmt(n.ertrag.kwhProKwp)} kWh/kWp` : ""}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={lp("/regionen")} className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-ov-700 underline decoration-ov-300 underline-offset-4 hover:decoration-current">
              <Compass aria-hidden="true" className="h-4 w-4" />
              Alle Regionen in Deutschland, Österreich und der Schweiz
            </Link>
          </div>
          <div className="rounded-[2rem] bg-white p-5 ring-1 ring-ink-200/70 md:p-8">
            <RegionKarte aktiv={r.slug} nachbarn={r.nachbarn} titel={`Karte: ${r.name} und Nachbarregionen`} />
          </div>
        </div>
      </Section>

      <Querverweise
        items={[
          { href: lp("/flaechencheck"), titel: "Flächencheck", text: `Ampel, Leistung und Pachtspanne Ihrer Fläche ${r.inName} in zwei Minuten.` },
          { href: lp("/rechner/pacht"), titel: link("/rechner/pacht", "Pachtrechner").label, text: "Festpacht, indexiert oder Umsatzbeteiligung über 30 Jahre im Vergleich." },
          ...land.ratgeber.slice(0, r.land === "DE" ? 2 : 1),
          ...(r.land === "DE" ? [] : [{ href: lp("/flaeche-verpachten"), titel: link("/flaeche-verpachten", "Fläche verpachten").label, text: "Pachtmodelle, Vertrag, Rückbausicherheit und der Weg zur ersten Pacht." }]),
        ]}
      />

      <CtaBand
        eyebrow="Für Flächeneigentümer kostenfrei"
        title={`Was ist Ihre Fläche ${r.inName} als Solarpark wert?`}
        text="Zwei Minuten im Flächencheck – mit Ampel, möglicher Leistung und Pachtspanne. Das Ergebnis landet auf Wunsch direkt bei unserem Flächenteam."
        primary={{ label: "Zum Flächencheck", href: lp("/flaechencheck") }}
        secondary={link("/rechner/pacht", "Pachtrechner")}
      />
    </div>
  );
}

function Zeile({ l, v }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-ink-600">{l}</dt>
      <dd className="ov-num text-right font-semibold text-ink-900">{v}</dd>
    </div>
  );
}

function Liste({ titel, icon: Icon, ton, punkte = [] }) {
  if (!punkte?.length) return null;
  const gut = ton === "gut";
  return (
    <Reveal className={gut ? "rounded-3xl bg-ov-50 p-6 ring-1 ring-ov-100" : "rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60"}>
      <p className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
        <Icon aria-hidden="true" className={gut ? "h-5 w-5 text-ov-600" : "h-5 w-5 text-ink-500"} />
        {titel}
      </p>
      <ul className="mt-4 space-y-2.5">
        {punkte.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink-700">
            <span aria-hidden="true" className={gut ? "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" : "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400"} />
            <span>
              <Fett>{p}</Fett>
            </span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
