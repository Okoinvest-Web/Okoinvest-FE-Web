import { Children, Fragment, cloneElement, isValidElement } from "react";
import Link from "next/link";
import { Accessibility, ArrowRight, ArrowUpRight, Building2, FileSignature, Mail, Phone, Scale, ShieldCheck } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { KONTAKT } from "@/data/site";
import { LegalDruck, LegalInhalt, LegalMobilInhalt } from "./LegalShellInhalt";

const RECHTLICHES = [
  { name: "Impressum", href: "/impressum", icon: Building2, text: "Anbieter, Firmenbuch, Offenlegung" },
  { name: "Datenschutz", href: "/datenschutz", icon: ShieldCheck, text: "Welche Daten wir wozu verarbeiten" },
  { name: "Nutzungsbedingungen", href: "/nutzungsbedingungen", icon: Scale, text: "Regeln für Website, Portal und Börse" },
  { name: "Barrierefreiheit", href: "/barrierefreiheit", icon: Accessibility, text: "Stand, Einschränkungen, Feedback" },
];

/* ------------------------------------------------------------------
   Serverseitige Aufbereitung der Kinder: Jede direkte <h2> erhält eine
   stabile id (falls nicht vorhanden), ihre Gliederungsnummer („§ 3“,
   „6a.“) wird typografisch abgesetzt, und aus allen <h2> entsteht das
   Inhaltsverzeichnis. Der Wortlaut bleibt unverändert.
   ------------------------------------------------------------------ */

function textVon(knoten) {
  if (knoten == null || typeof knoten === "boolean") return "";
  if (typeof knoten === "string" || typeof knoten === "number") return String(knoten);
  if (Array.isArray(knoten)) return knoten.map(textVon).join("");
  if (isValidElement(knoten)) return textVon(knoten.props.children);
  return "";
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/§/g, "p")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const NUMMER = /^(§\s*\d+[a-z]?|\d+[a-z]?\.)\s+(.+)$/;

function aufbereiten(children) {
  const eintraege = [];
  const vergeben = new Set();
  let woerter = 0;

  const zaehlen = (k) => {
    const t = textVon(k);
    if (t) woerter += t.trim().split(/\s+/).filter(Boolean).length;
  };

  const gehe = (knoten) =>
    Children.map(knoten, (kind) => {
      if (!isValidElement(kind)) {
        zaehlen(kind);
        return kind;
      }
      if (kind.type === Fragment) return <Fragment key={kind.key}>{gehe(kind.props.children)}</Fragment>;
      // Container (div, section …) durchsuchen, damit auch verschachtelte <h2> ins Inhaltsverzeichnis kommen
      if (typeof kind.type === "string" && kind.type !== "h2" && kind.props.children != null && ["div", "section"].includes(kind.type)) {
        return cloneElement(kind, undefined, gehe(kind.props.children));
      }
      zaehlen(kind);
      if (kind.type !== "h2") return kind;

      const titel = textVon(kind.props.children).trim();
      let id = kind.props.id || slug(titel) || `abschnitt-${eintraege.length + 1}`;
      while (vergeben.has(id)) id += "-x";
      vergeben.add(id);
      const m = typeof kind.props.children === "string" ? kind.props.children.match(NUMMER) : null;
      eintraege.push({ id, nummer: m ? m[1].replace(/\.$/, "") : null, titel: m ? m[2] : titel });

      const inhalt = m ? (
        <>
          <span className="mr-1 font-display text-ov-600 [font-variant-numeric:tabular-nums]">{`${m[1]} `}</span>
          {m[2]}
        </>
      ) : (
        kind.props.children
      );
      return cloneElement(kind, { id }, inhalt);
    });

  const inhalt = gehe(children);
  return { inhalt, eintraege, minuten: Math.max(1, Math.round(woerter / 200)) };
}

/* Dekor im Kopf: gestapelte Dokumentblätter mit Siegel und Seiten-Symbol */
function DokumentBuehne({ icon: Icon, titel, abschnitte }) {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[300px] w-full max-w-[400px] select-none">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_72%)] blur-2xl" />
      {/* hinteres Blatt */}
      <div className="absolute left-[14%] top-[6%] h-[78%] w-[62%] -rotate-[7deg] rounded-2xl bg-white/[0.05] ring-1 ring-inset ring-white/10" />
      {/* mittleres Blatt */}
      <div className="absolute left-[22%] top-[3%] h-[80%] w-[62%] rotate-[4deg] rounded-2xl bg-white/[0.07] ring-1 ring-inset ring-white/15 backdrop-blur-sm" />
      {/* vorderes Blatt */}
      <div className="ov-glass absolute left-[17%] top-[8%] flex h-[82%] w-[64%] flex-col rounded-2xl p-5 shadow-e4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ov-300/15 ring-1 ring-inset ring-ov-300/35">
            <Icon className="h-4 w-4 text-ov-300" />
          </span>
          <span className="min-w-0 truncate font-display text-[13px] font-bold text-white/90">{titel}</span>
        </div>
        <div className="mt-5 space-y-2">
          {[92, 78, 86, 64].map((b, i) => (
            <div key={i} className="h-1.5 rounded-full bg-white/15" style={{ width: `${b}%` }} />
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2">
          <span className="font-display text-[15px] font-extrabold text-ov-300">§</span>
          <div className="h-1.5 w-[46%] rounded-full bg-ov-300/45" />
        </div>
        <div className="mt-3 space-y-2">
          {[88, 70, 80].map((b, i) => (
            <div key={i} className="h-1.5 rounded-full bg-white/12" style={{ width: `${b}%` }} />
          ))}
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div className="space-y-1.5">
            <div className="h-1.5 w-16 rounded-full bg-white/15" />
            <div className="h-1.5 w-10 rounded-full bg-white/10" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">{abschnitte} Abschnitte</span>
        </div>
      </div>
      {/* Siegel */}
      <div className="absolute bottom-[4%] right-[8%] flex h-[92px] w-[92px] items-center justify-center rounded-full bg-navy-950/80 shadow-e4 ring-1 ring-ov-300/30 backdrop-blur">
        <svg viewBox="0 0 92 92" className="absolute inset-0 h-full w-full">
          <defs>
            <path id="ov-siegel-kreis" d="M46 46 m-33 0 a33 33 0 1 1 66 0 a33 33 0 1 1 -66 0" />
          </defs>
          <circle cx="46" cy="46" r="41" fill="none" stroke="rgba(166,206,120,0.35)" strokeDasharray="2 4" />
          <text fill="rgba(255,255,255,0.6)" fontSize="8.5" fontWeight="700" letterSpacing="2.6">
            <textPath href="#ov-siegel-kreis">RECHTLICHES · ÖKOINVEST ·</textPath>
          </text>
        </svg>
        <span className="font-display text-[26px] font-extrabold text-ov-300">§</span>
      </div>
    </div>
  );
}

/**
 * Rahmen für Rechtstexte: dunkler Kopf mit Dokument-Bühne und Reitern
 * zwischen den Rechtstexten, darunter lesbare Spalte mit automatischem
 * Inhaltsverzeichnis (Scroll-Spy, mobil als klebende Leiste), Seitenende
 * mit Kontakt und Querverweisen. `.ov-legal` vereinheitlicht die Typografie.
 *
 * Kontaktbox: Telefon und E-Mail erscheinen nur, wenn sie in
 * src/data/site.js (KONTAKT) freigegeben sind – sonst Verweis auf /kontakt.
 *
 * Props (alle bisherigen bleiben gültig): titel, pfad, lead, children,
 * optional stand (Text, z. B. Datum der letzten Überarbeitung).
 */
export default function LegalShell({ titel, pfad, lead, stand, children }) {
  const { inhalt, eintraege, minuten } = aufbereiten(children);
  const besondere = pfad?.startsWith("/bedingungen/");
  const reiter = besondere
    ? [...RECHTLICHES, { name: "Besondere Bedingungen", href: pfad, icon: FileSignature }]
    : RECHTLICHES;
  const aktuell = reiter.find((r) => r.href === pfad);
  const Icon = aktuell?.icon || FileSignature;
  const weitere = RECHTLICHES.filter((r) => r.href !== pfad);

  return (
    <div>
      {/* ---------- Kopf ---------- */}
      <section aria-labelledby="legal-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white print:bg-none print:text-ink-900">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50 print:hidden" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[480px] w-[480px] rounded-full bg-ov-500/20 blur-[120px] print:hidden" />

        <div className="ov-container pt-6 sm:pt-8 md:pt-10">
          <Breadcrumbs dark items={[{ name: titel }]} className="ov-hero-in mb-8 md:mb-12 print:hidden" />

          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-16">
            <div className="max-w-[44rem]">
              <p className="ov-hero-in inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15" style={{ "--ov-delay": "40ms" }}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ov-300 text-navy-950">
                  <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                {besondere ? "Besondere Bedingungen" : "Rechtliches"}
              </p>
              <h1 id="legal-titel" className="ov-h1 ov-hero-in mt-6 text-balance" style={{ "--ov-delay": "100ms" }}>
                {titel}
              </h1>
              {lead && (
                <p className="ov-lead ov-hero-in mt-5 max-w-2xl text-pretty text-white/75" style={{ "--ov-delay": "180ms" }}>
                  {lead}
                </p>
              )}
              <dl className="ov-hero-in mt-8 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-6 text-[13.5px]" style={{ "--ov-delay": "260ms" }}>
                {eintraege.length > 1 && (
                  <div>
                    <dt className="text-white/60">Abschnitte</dt>
                    <dd className="mt-0.5 font-display text-[17px] font-bold [font-variant-numeric:tabular-nums]">{eintraege.length}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-white/60">Lesezeit</dt>
                  <dd className="mt-0.5 font-display text-[17px] font-bold">ca. {minuten} Min.</dd>
                </div>
                {stand && (
                  <div>
                    <dt className="text-white/60">Stand</dt>
                    <dd className="mt-0.5 font-display text-[17px] font-bold">{stand}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="hidden lg:block print:hidden">
              <DokumentBuehne icon={Icon} titel={titel} abschnitte={eintraege.length} />
            </div>
          </div>

          {/* Reiter zwischen den Rechtstexten */}
          <nav aria-label="Rechtstexte" className="ov-hero-in -mx-4 mt-10 overflow-x-auto px-4 pb-px [scrollbar-width:none] md:mt-14 print:hidden" style={{ "--ov-delay": "320ms" }}>
            <ul className="flex min-w-max gap-1 border-b border-white/10">
              {reiter.map((r) => {
                const aktiv = r.href === pfad;
                const RIcon = r.icon;
                return (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      aria-current={aktiv ? "page" : undefined}
                      className={`relative -mb-px flex items-center gap-2 whitespace-nowrap rounded-t-xl border-b-2 px-3.5 py-3 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ov-300 sm:px-4 ${
                        aktiv ? "border-ov-300 bg-white/[0.06] text-white" : "border-transparent text-white/65 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <RIcon aria-hidden="true" className={`h-4 w-4 ${aktiv ? "text-ov-300" : ""}`} />
                      {r.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </section>

      {/* ---------- Mobil: klebende Inhaltsleiste ---------- */}
      {eintraege.length > 2 && <LegalMobilInhalt eintraege={eintraege} />}

      {/* ---------- Text ---------- */}
      <div className="relative bg-sand-50">
        <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)] print:hidden" />
        <div className="ov-container relative grid gap-10 py-10 md:py-16 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[288px_minmax(0,1fr)] xl:gap-16">
          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-28">
              {eintraege.length > 1 && <LegalInhalt eintraege={eintraege} />}
              <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-ink-200/70">
                <p className="font-display text-[15px] font-bold text-ink-900">Fragen zu diesem Text?</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">Wir antworten schriftlich und verständlich.</p>
                <Link href="/kontakt" className="mt-3 inline-flex items-center gap-1.5 rounded text-[14px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                  Kontakt aufnehmen <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <article
              className="ov-legal min-w-0 rounded-[1.75rem] bg-white px-5 py-8 shadow-e2 ring-1 ring-ink-200/60 sm:px-8 md:rounded-[2rem] md:px-12 md:py-14 xl:px-16 print:p-0 print:shadow-none print:ring-0
                [&>h2]:scroll-mt-36 [&>h2]:text-balance [&>h2:not(:first-of-type)]:border-t [&>h2:not(:first-of-type)]:border-ink-100 [&>h2:not(:first-of-type)]:pt-[1.6em]
                [&>p]:max-w-[72ch] [&>ul]:max-w-[72ch] [&>ol]:max-w-[72ch] [&_li+li]:mt-1.5 [&_li::marker]:text-ov-500
                [&_a:focus-visible]:rounded-sm [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-ov-500 [&_a:hover]:decoration-ov-600"
            >
              {inhalt}
            </article>

            {/* Seitenende: Aktionen, Kontakt, Querverweise */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1 print:hidden">
              <p className="text-[13.5px] text-ink-600">
                {stand ? <>Stand: {stand}</> : <>Rechtstext der ÖkoInvest GmbH</>}
              </p>
              <div className="flex flex-wrap gap-2">
                <LegalDruck />
                <a href="#legal-titel" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-ink-800 ring-1 ring-ink-200 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                  Nach oben
                </a>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] print:hidden">
              <div className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden rounded-[1.75rem] p-6 text-white md:p-8">
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-ov-500/25 blur-3xl" />
                <p className="ov-overline text-ov-300">Kontakt</p>
                <p className="mt-2 font-display text-[22px] font-extrabold leading-tight md:text-[26px]">Fragen zu diesem Text?</p>
                <p className="mt-2 text-[15px] leading-relaxed text-white/75">Wir erklären Ihnen gern, was eine Regelung für Ihren Fall bedeutet.</p>
                <div className="mt-5 space-y-2">
                  {KONTAKT.telefon && (
                    <a href={KONTAKT.telefonHref || `tel:${KONTAKT.telefon.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2.5 text-[14.5px] text-white/85 hover:text-white">
                      <Phone aria-hidden="true" className="h-4 w-4 text-ov-300" /> {KONTAKT.telefon}
                    </a>
                  )}
                  {KONTAKT.email && (
                    <a href={`mailto:${KONTAKT.email}`} className="flex items-center gap-2.5 break-all text-[14.5px] text-white/85 hover:text-white">
                      <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-300" /> {KONTAKT.email}
                    </a>
                  )}
                  {!KONTAKT.telefon && !KONTAKT.email && (
                    <p className="text-[14px] leading-relaxed text-white/70">Schreiben Sie uns über das Kontaktformular – wir antworten schriftlich.</p>
                  )}
                </div>
                <Link
                  href="/kontakt"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-ov-300 px-5 py-2.5 text-[14.5px] font-bold text-navy-950 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
                >
                  Zum Kontaktformular <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>

              <nav aria-label="Weitere Rechtstexte" className="rounded-[1.75rem] bg-white p-3 ring-1 ring-ink-200/70">
                <p className="px-3 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">Weitere Rechtstexte</p>
                <ul>
                  {weitere.map((r) => {
                    const RIcon = r.icon;
                    return (
                      <li key={r.href}>
                        <Link href={r.href} className="group flex items-center gap-3.5 rounded-2xl px-3 py-3 transition-colors hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200/70">
                            <RIcon aria-hidden="true" className="h-[18px] w-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-ink-900">{r.name}</span>
                            <span className="block truncate text-[13px] text-ink-600">{r.text}</span>
                          </span>
                          <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ov-700 motion-reduce:transition-none" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
