// Abschnitte der Ratgeber-Übersicht (/ratgeber). Server-Komponenten.
import Link from "@/components/Land/Link";
import { ArrowRight, ArrowUpRight, BookOpen, Calculator, Clock, HelpCircle, LandPlot, Landmark, Tractor, TrendingUp } from "lucide-react";

import { cn } from "@/components/ui/cn";
import Reveal from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/SectionHeading";
import { artikelPfad, kategorieName } from "@/lib/ratgeber";
import { TON, thema, themaAnker, themaText } from "./themen";
import { pfad } from "@/lib/land";
import { spracheDerAnfrage } from "@/lib/land/seite";

// Sprachmodell: feste Texte der Übersichts-Abschnitte (Server-Komponenten, Sprache aus der Anfrage)
const TEXTE = {
  de: {
    themenEyebrow: "Themenbereiche",
    themenTitel: (
      <>
        Fünf Themen, <span className="ov-text-gradient">ein Weg zum Projekt.</span>
      </>
    ),
    themenText: "Wählen Sie Ihr Thema – oder springen Sie direkt in einen ausgewählten Artikel.",
    artikelMin: (m) => `Artikel · ${m} Min.`,
    alleAnzeigen: (n) => `Alle ${n} Artikel anzeigen`,
    pfadeEyebrow: "Lesepfade",
    pfadeTitel: "In vier Artikeln sicher entscheiden.",
    pfadeText: "Je nach Rolle eine Reihenfolge, die aufeinander aufbaut – vom Überblick bis zum Detail.",
    pfadMeta: (n, m) => `${n} Artikel · rund ${m} Min.`,
    faktenEyebrow: "Auf einen Blick",
    faktenTitel: (
      <>
        Zahlen, die Sie <span className="ov-text-gradient-light">kennen sollten.</span>
      </>
    ),
    faktenText: (s) => `Richtwerte aus Ratgebern und Rechnern, Stand ${s} – jeweils mit der ausführlichen Erklärung verlinkt.`,
    erklaerung: "Erklärung lesen",
    weiterEyebrow: "Mehr Wissen",
    weiterTitel: "Kurz nachschlagen oder selbst rechnen.",
    wege: (n) => [
      { titel: "Lexikon", text: `${n} Fachbegriffe von Aufstellungsbeschluss bis Zuschlagswert – jeweils mit Definition in einem Satz.` },
      { titel: "Rechner", text: "Pacht, Agri-PV, Solarpark, Projektbewertung und Reststrom – mit denselben Marktannahmen wie in den Artikeln." },
      { titel: "Häufige Fragen", text: "Kurze Antworten zu Flächencheck, Projektbörse, Portal, Provision und Ablauf." },
    ],
  },
  en: {
    themenEyebrow: "Topic areas",
    themenTitel: (
      <>
        Five topics, <span className="ov-text-gradient">one path to your project.</span>
      </>
    ),
    themenText: "Choose your topic – or jump straight into a selected article.",
    artikelMin: (m) => `articles · ${m} min`,
    alleAnzeigen: (n) => `Show all ${n} articles`,
    pfadeEyebrow: "Reading paths",
    pfadeTitel: "Decide with confidence in four articles.",
    pfadeText: "A sequence for each role that builds step by step – from the overview to the detail.",
    pfadMeta: (n, m) => `${n} articles · around ${m} min`,
    faktenEyebrow: "At a glance",
    faktenTitel: (
      <>
        Figures you <span className="ov-text-gradient-light">should know.</span>
      </>
    ),
    faktenText: (s) => `Indicative values from guides and calculators, as of ${s} – each linked to the detailed explanation.`,
    erklaerung: "Read the explanation",
    weiterEyebrow: "More knowledge",
    weiterTitel: "Look it up quickly or calculate it yourself.",
    wege: (n) => [
      { titel: "Glossary", text: `${n} technical terms from the decision to draw up a development plan to the award value – each with a one-sentence definition.` },
      { titel: "Calculators", text: "Lease, agri-PV, solar park, project valuation and residual power – with the same market assumptions as in the articles." },
      { titel: "Frequently asked questions", text: "Short answers on the land check, project exchange, portal, commission and process." },
    ],
  },
};
const texte = () => TEXTE[spracheDerAnfrage()] || TEXTE.de;

/* ------------------------------------------------------------------ */
/* Themenbereiche als Bento-Raster                                     */
/* ------------------------------------------------------------------ */

/**
 * props: themen [{ name, artikel: [...] }], gesamt
 * Die Karte „Alle … anzeigen“ setzt über #thema-… den Filter der Artikelliste.
 */
export function ThemenRaster({ themen, gesamt }) {
  const sprache = spracheDerAnfrage();
  const t = texte();
  return (
    <section aria-labelledby="themen-titel" className="bg-sand-50 py-16 md:py-24">
      <div className="ov-container">
        <Reveal className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="max-w-2xl">
            <Eyebrow className="mb-3">{t.themenEyebrow}</Eyebrow>
            <h2 id="themen-titel" className="ov-h2 text-balance text-ink-900">
              {t.themenTitel}
            </h2>
          </div>
          <p className="max-w-sm text-[15.5px] leading-relaxed text-ink-600">{t.themenText}</p>
        </Reveal>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-12 lg:grid-cols-6 lg:gap-5">
          {themen.map((th, i) => {
            const meta = thema(th.name);
            const ton = TON[meta.ton];
            const Icon = meta.icon;
            const breit = i < 2;
            const minuten = th.artikel.reduce((s, a) => s + (a.lesezeit || 0), 0);
            return (
              <Reveal as="li" key={th.name} delay={i * 60} className={cn("flex", breit ? "lg:col-span-3" : "lg:col-span-2", i === 4 && "sm:col-span-2 lg:col-span-2")}>
                <div className="relative isolate flex w-full flex-col overflow-hidden rounded-3xl bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 md:p-7">
                  <span aria-hidden="true" className={cn("pointer-events-none absolute -right-20 -top-20 -z-10 h-52 w-52 rounded-full opacity-70 blur-3xl", ton.licht)} />
                  <div className="flex items-start justify-between gap-4">
                    <span aria-hidden="true" className={cn("flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset", ton.icon)}>
                      <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
                    </span>
                    <span className="text-right">
                      <span className="ov-kpi block text-ink-900">{th.artikel.length}</span>
                      <span className="mt-1 block text-[12px] text-ink-500">{t.artikelMin(minuten)}</span>
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-[19px] font-bold leading-snug tracking-[-0.01em] text-ink-900 md:text-[20px]">{kategorieName(th.name, sprache)}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{themaText(th.name, sprache)}</p>

                  {/* Anteil am gesamten Ratgeber */}
                  <div className="mt-4 flex items-center gap-3" aria-hidden="true">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <span className={cn("block h-full rounded-full", ton.balken)} style={{ width: `${(th.artikel.length / gesamt) * 100}%` }} />
                    </span>
                    <span className="ov-num text-[12px] text-ink-500">{Math.round((th.artikel.length / gesamt) * 100)}{sprache === "en" ? "%" : " %"}</span>
                  </div>

                  <ul className={cn("mt-5 grid gap-x-6 border-t border-ink-100 pt-4 text-[14.5px]", breit && "md:grid-cols-2")}>
                    {th.artikel.slice(0, breit ? 4 : 3).map((a) => (
                      <li key={a.slug}>
                        <Link
                          href={artikelPfad(a.slug)}
                          className="group flex min-h-[40px] items-center justify-between gap-3 rounded-lg py-1.5 font-medium text-ink-800 transition-colors hover:text-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                        >
                          <span className="min-w-0">{a.kurzTitel || a.title}</span>
                          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:text-ov-600 motion-reduce:transition-none" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`#${themaAnker(th.name)}`}
                    className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full pt-5 text-[14px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                  >
                    {t.alleAnzeigen(th.artikel.length)}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </a>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Lesepfade nach Rolle                                                */
/* ------------------------------------------------------------------ */

const ROLLEN_EN = [
  { rolle: "Landowners", frage: "What is my land worth – and what is in the contract?", weiter: "Lease your land" },
  { rolle: "Farmers", frage: "How do harvest, support and solar power fit together?", weiter: "For farmers" },
  { rolle: "Investors", frage: "What is a project worth in which phase?", weiter: "For investors" },
  { rolle: "Municipalities & businesses", frage: "How do the site, citizens and power supply benefit?", weiter: "For municipalities" },
];

const ROLLEN = [
  {
    icon: LandPlot,
    rolle: "Flächeneigentümer",
    frage: "Was ist meine Fläche wert – und was steht im Vertrag?",
    slugs: ["solarpark-pacht-pro-hektar", "pachtvertrag-solarpark", "dienstbarkeit-grundbuch-pv-pacht", "pv-pacht-erbschaftsteuer-grundsteuer"],
    weiter: { href: pfad("/flaeche-verpachten"), label: "Fläche verpachten" },
    ton: "gruen",
  },
  {
    icon: Tractor,
    rolle: "Landwirte",
    frage: "Wie passen Ernte, Förderung und Solarstrom zusammen?",
    slugs: ["agri-pv-wirtschaftlichkeit", "agri-pv-din-spec-91434", "agri-pv-foerderung-gap", "photovoltaik-landwirt-steuern"],
    weiter: { href: pfad("/landwirte"), label: "Für Landwirte" },
    ton: "sonne",
  },
  {
    icon: TrendingUp,
    rolle: "Investoren",
    frage: "Was ist ein Projekt in welcher Phase wert?",
    slugs: ["projektrechte-kaufen-due-diligence", "solarpark-investment-rendite", "ertragsgutachten-p50-p90", "solarpark-bestandsanlage-wert"],
    weiter: { href: "/investoren", label: "Für Investoren" },
    ton: "navy",
  },
  {
    icon: Landmark,
    rolle: "Gemeinden & Unternehmen",
    frage: "Wie profitieren Standort, Bürger und Strombezug?",
    slugs: ["kommunale-beteiligung-6-eeg", "solarpark-genehmigung-bebauungsplan", "ppa-fuer-unternehmen", "energy-sharing-energiegemeinschaften"],
    weiter: { href: pfad("/kommunen"), label: "Für Kommunen" },
    ton: "sand",
  },
];

/** props: artikel – alle Artikel (für Titel, Lesezeit) */
export function Lesepfade({ artikel }) {
  const en = spracheDerAnfrage() === "en";
  const t = texte();
  const nachSlug = new Map(artikel.map((a) => [a.slug, a]));
  const rollen = en ? ROLLEN.map((r, i) => ({ ...r, rolle: ROLLEN_EN[i].rolle, frage: ROLLEN_EN[i].frage, weiter: { ...r.weiter, label: ROLLEN_EN[i].weiter } })) : ROLLEN;
  const pfade = rollen.map((r) => ({ ...r, liste: r.slugs.map((s) => nachSlug.get(s)).filter(Boolean) })).filter((r) => r.liste.length >= 2);
  if (!pfade.length) return null;

  return (
    <section aria-labelledby="pfade-titel" className="bg-white py-16 md:py-24">
      <div className="ov-container">
        <Reveal className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="max-w-2xl">
            <Eyebrow className="mb-3">{t.pfadeEyebrow}</Eyebrow>
            <h2 id="pfade-titel" className="ov-h2 text-balance text-ink-900">{t.pfadeTitel}</h2>
          </div>
          <p className="max-w-sm text-[15.5px] leading-relaxed text-ink-600">{t.pfadeText}</p>
        </Reveal>

        <ol className="mt-10 grid gap-4 md:mt-12 md:grid-cols-2 lg:gap-5 xl:grid-cols-4">
          {pfade.map((p, i) => {
            const ton = TON[p.ton];
            const minuten = p.liste.reduce((s, a) => s + (a.lesezeit || 0), 0);
            return (
              <Reveal as="li" key={p.rolle} delay={i * 70} className="flex">
                <div className="relative isolate flex w-full flex-col overflow-hidden rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
                  <span aria-hidden="true" className={cn("pointer-events-none absolute -right-16 -top-16 -z-10 h-44 w-44 rounded-full opacity-60 blur-3xl", ton.licht)} />
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className={cn("flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-inset", ton.icon)}>
                      <p.icon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-[18px] font-bold leading-snug text-ink-900">{p.rolle}</h3>
                      <p className="flex items-center gap-1.5 text-[12.5px] text-ink-500">
                        <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                        {t.pfadMeta(p.liste.length, minuten)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-[15px] font-medium leading-snug text-ink-800">{p.frage}</p>

                  <ol className="relative mt-5 space-y-1 before:absolute before:bottom-5 before:left-[13px] before:top-5 before:w-px before:bg-ink-200">
                    {p.liste.map((a, j) => (
                      <li key={a.slug} className="relative">
                        <Link
                          href={artikelPfad(a.slug)}
                          className="group flex items-start gap-3 rounded-xl py-2 pr-2 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                        >
                          <span className="ov-num relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-bold text-ink-700 ring-1 ring-ink-200 transition-colors group-hover:bg-ov-600 group-hover:text-white group-hover:ring-ov-600">
                            {j + 1}
                          </span>
                          <span className="min-w-0 pt-[3px] text-[14.5px] font-medium leading-snug text-ink-800 group-hover:text-ov-700">{a.kurzTitel || a.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>

                  <Link
                    href={p.weiter.href}
                    className="group mt-auto inline-flex items-center gap-1.5 self-start pt-6 text-[14px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                  >
                    {p.weiter.label}
                    <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Kennzahlen (dunkles Band)                                           */
/* ------------------------------------------------------------------ */

/**
 * props: fakten [{ wert, text, href, anteil? }] – anteil (0..1) zeichnet einen Ring
 *        stand  Text
 */
export function FaktenBand({ fakten, stand }) {
  const t = texte();
  return (
    <section aria-labelledby="fakten-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden py-16 text-white md:py-24">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-40" />
      <div className="ov-container">
        <Reveal className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="max-w-2xl">
            <Eyebrow dark className="mb-3">{t.faktenEyebrow}</Eyebrow>
            <h2 id="fakten-titel" className="ov-h2 text-balance">
              {t.faktenTitel}
            </h2>
          </div>
          <p className="max-w-sm text-[15.5px] leading-relaxed text-white/70">{t.faktenText(stand)}</p>
        </Reveal>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-12 lg:grid-cols-4 lg:gap-5">
          {fakten.map((f, i) => (
            <Reveal as="li" key={f.text} delay={i * 70} className="flex">
              <Link
                href={f.href}
                className="group relative flex w-full flex-col rounded-3xl bg-white/[0.05] p-6 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300 md:p-7"
              >
                <div className="flex items-start justify-between gap-3">
                  {typeof f.anteil === "number" ? <Ring anteil={f.anteil} /> : <span aria-hidden="true" className="h-1 w-10 rounded-full bg-ov-400" />}
                  <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-white/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ov-300 motion-reduce:transition-none" />
                </div>
                <span className="ov-kpi-l mt-6 text-white">{f.wert}</span>
                <span className="mt-3 text-[15px] leading-relaxed text-white/70">{f.text}</span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[13.5px] font-semibold text-ov-300">
                  {t.erklaerung}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Ring({ anteil }) {
  const r = 18;
  const u = 2 * Math.PI * r;
  return (
    <svg aria-hidden="true" viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
      <circle cx="22" cy="22" r={r} fill="none" stroke="#8cba58" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${u * anteil} ${u}`} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Weiter: Lexikon, Rechner, FAQ                                        */
/* ------------------------------------------------------------------ */

/**
 * props: begriffe – Anzahl Lexikonbegriffe
 *        eyebrow, titel, hinweis (JSX unter den Karten), wege [{ href, icon, titel, text }] – optional überschreibbar
 */
export function WeiterWissen({ begriffe, eyebrow, titel, hinweis, wege: eigeneWege }) {
  const t = texte();
  const standard = t.wege(begriffe);
  eyebrow = eyebrow || t.weiterEyebrow;
  titel = titel || t.weiterTitel;
  const wege = eigeneWege || [
    { href: "/wissen/lexikon", icon: BookOpen, ...standard[0] },
    { href: pfad("/rechner"), icon: Calculator, ...standard[1] },
    { href: pfad("/faq"), icon: HelpCircle, ...standard[2] },
  ];
  return (
    <section aria-labelledby="weiter-titel" className="bg-white pt-16 md:pt-24">
      <div className="ov-container">
        <Reveal className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="max-w-2xl">
            <Eyebrow className="mb-3">{eyebrow}</Eyebrow>
            <h2 id="weiter-titel" className="ov-h3 text-ink-900 md:text-[30px]">{titel}</h2>
          </div>
        </Reveal>
        <ul className="mt-8 grid gap-4 md:mt-10 lg:grid-cols-3 lg:gap-5">
          {wege.map(({ href, icon: Icon, titel, text }, i) => (
            <Reveal as="li" key={href} delay={i * 70} className="flex">
              <article className="group ov-card-hover relative flex w-full items-start gap-4 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 transition-colors focus-within:ring-2 focus-within:ring-ov-500 hover:bg-white sm:p-6 md:gap-5 md:p-7">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200/70 transition-colors duration-300 group-hover:bg-ov-600 group-hover:text-white group-hover:ring-ov-600">
                  <Icon className="h-[22px] w-[22px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[18px] font-bold leading-snug text-ink-900 md:text-[19px]">
                    <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']">
                      {titel}
                    </Link>
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{text}</p>
                </div>
                <ArrowUpRight aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-ink-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ov-600 motion-reduce:transition-none" />
              </article>
            </Reveal>
          ))}
        </ul>
        {hinweis && <div className="mt-8 text-[14px] leading-relaxed text-ink-500">{hinweis}</div>}
      </div>
    </section>
  );
}
