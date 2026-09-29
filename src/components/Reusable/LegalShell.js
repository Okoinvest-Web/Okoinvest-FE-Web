import Link from "next/link";
import { ArrowRight, FileText, Mail, Phone } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Eyebrow } from "@/components/ui/SectionHeading";
import { KONTAKT } from "@/data/site";

const RECHTLICHES = [
  { name: "Impressum", href: "/impressum" },
  { name: "Datenschutz", href: "/datenschutz" },
  { name: "Nutzungsbedingungen", href: "/nutzungsbedingungen" },
  { name: "Barrierefreiheit", href: "/barrierefreiheit" },
];

/**
 * Rahmen für Rechtstexte: kompakter dunkler Kopf, lesbare Spalte, Seitenleiste
 * mit Navigation zwischen den Rechtstexten und Kontakt. `.ov-legal`
 * vereinheitlicht die Typografie des Rechtstextes.
 *
 * Kontaktbox: Telefon und E-Mail erscheinen nur, wenn sie in
 * src/data/site.js (KONTAKT) freigegeben sind – sonst Verweis auf /kontakt.
 */
export default function LegalShell({ titel, pfad, lead, children }) {
  return (
    <div>
      <section className="ov-noise relative isolate overflow-hidden bg-navy-950 text-white">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10" />
        <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 h-[360px] w-[360px] rounded-full bg-ov-500/20 blur-[120px]" />
        <div className="ov-container pb-14 pt-8 md:pb-20 md:pt-12">
          <Breadcrumbs dark items={[{ name: titel }]} className="ov-hero-in mb-10" />
          <div className="ov-hero-in" style={{ "--ov-delay": "60ms" }}>
            <Eyebrow dark className="mb-4">Rechtliches</Eyebrow>
          </div>
          <h1 className="ov-h1 ov-hero-in" style={{ "--ov-delay": "120ms" }}>{titel}</h1>
          {lead && <p className="ov-lead ov-hero-in mt-5 max-w-2xl text-white/65" style={{ "--ov-delay": "180ms" }}>{lead}</p>}
        </div>
      </section>

      <div className="bg-sand-50">
        <div className="ov-container grid gap-10 py-12 md:py-16 lg:grid-cols-[1fr_280px] lg:gap-14">
          <article className="ov-legal min-w-0 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-ink-200/60 md:p-12">{children}</article>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <nav aria-label="Rechtstexte" className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/60">
              <p className="px-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">Rechtstexte</p>
              <ul className="mt-3 space-y-1">
                {RECHTLICHES.map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      aria-current={pfad === r.href ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${pfad === r.href ? "bg-ov-50 text-ov-800" : "text-ink-700 hover:bg-ink-50"}`}
                    >
                      <FileText aria-hidden="true" className="h-4 w-4" />
                      {r.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-4 rounded-3xl bg-navy-950 p-6 text-white">
              <p className="font-display text-[17px] font-bold">Fragen zu diesem Text?</p>
              {KONTAKT.telefon && (
                <a href={KONTAKT.telefonHref || `tel:${KONTAKT.telefon.replace(/[^+\d]/g, "")}`} className="mt-4 flex items-center gap-2.5 text-[14.5px] text-white/85 hover:text-white">
                  <Phone aria-hidden="true" className="h-4 w-4 text-ov-300" /> {KONTAKT.telefon}
                </a>
              )}
              {KONTAKT.email && (
                <a href={`mailto:${KONTAKT.email}`} className="mt-2 flex items-center gap-2.5 break-all text-[14.5px] text-white/85 hover:text-white">
                  <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-300" /> {KONTAKT.email}
                </a>
              )}
              {!KONTAKT.telefon && !KONTAKT.email && (
                <p className="mt-2 text-[14px] leading-relaxed text-white/65">Schreiben Sie uns über das Kontaktformular – wir antworten schriftlich.</p>
              )}
              <Link href="/kontakt" className="mt-4 inline-flex items-center gap-2 text-[14.5px] font-semibold text-ov-300 hover:text-white">
                Zum Kontaktformular <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
