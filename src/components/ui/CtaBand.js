import Link from "next/link";
import { ArrowUpRight, Phone, Calculator, ShieldCheck, Clock, BadgeCheck } from "lucide-react";
import { KONTAKT } from "@/data/site";
import { cn } from "./cn";
import Button from "./Button";
import Reveal from "./Reveal";

/**
 * Abschluss-Handlungsaufruf für jede Seite. Dunkle, leuchtende Fläche mit
 * zwei Wegen und einer Wegweiser-Box für die Zielgruppen. Telefon erscheint
 * nur, wenn in src/data/site.js eine Nummer hinterlegt ist.
 */
export default function CtaBand({
  eyebrow = "Kostenlos & unverbindlich",
  title = "Ihre Fläche, Ihr Projekt, Ihr Kapital – wir machen daraus ein Kraftwerk.",
  text = "Ein Team, das seit 2010 Solarkraftwerke plant, baut und selbst betreibt. Mit ehrlicher Ersteinschätzung, festem Ansprechpartner und transparentem Status im Portal.",
  primary = { label: "Fläche prüfen lassen", href: "/flaechencheck" },
  secondary = { label: "Zur Projektbörse", href: "/projektboerse" },
  className,
}) {
  return (
    <section className={cn("relative px-4 py-16 md:px-8 md:py-24", className)}>
      <Reveal dir="scale" className="ov-noise relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-navy-950 px-6 py-14 text-white md:rounded-[2.5rem] md:px-16 md:py-20">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-24 -top-32 h-[460px] w-[460px] rounded-full bg-ov-500/35 blur-[110px]" />
        <div aria-hidden="true" className="absolute -bottom-40 left-1/4 h-[360px] w-[360px] rounded-full bg-sun-400/15 blur-[110px]" />

        {/* minmax(0, …): Spalten dürfen nicht über ihren Anteil wachsen – sonst schieben breite Buttons
            die rechte Box in den Innenabstand und overflow-hidden schneidet sie ab */}
        <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300">{eyebrow}</p>
            <h2 className="ov-h2 mt-4 text-white">{title}</h2>
            <p className="ov-lead mt-5 max-w-2xl text-white/70">{text}</p>
            {/* flex-wrap: bei wenig Platz rutscht der zweite Button in die nächste Zeile */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button href={primary.href} size="lg" pfeil>
                {primary.label}
              </Button>
              {secondary && (
                <Button href={secondary.href} size="lg" variant="outlineLight" icon={secondary.icon === undefined ? undefined : secondary.icon}>
                  {secondary.label}
                </Button>
              )}
            </div>
          </div>

          <div className="ov-glass min-w-0 rounded-3xl p-6 md:p-8">
            {KONTAKT.telefon ? (
              <>
                <p className="text-[13px] font-medium text-white/60">Lieber direkt sprechen?</p>
                <a href={KONTAKT.telefonHref} className="group mt-2 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ov-500 transition-transform group-hover:scale-110">
                    <Phone aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 font-display text-[22px] font-extrabold tracking-tight md:text-[26px]">{KONTAKT.telefon}</span>
                </a>
              </>
            ) : (
              <>
                <p className="text-[13px] font-medium text-white/60">Direkt zum passenden Weg</p>
                <ul className="mt-3 grid gap-2">
                  {[
                    { label: "Ich habe eine Fläche", href: "/flaeche-verpachten" },
                    { label: "Ich bin Landwirt", href: "/landwirte" },
                    { label: "Ich möchte investieren", href: "/investoren" },
                    { label: "Ich brauche günstigen Strom", href: "/reststrom" },
                  ].map((w) => (
                    <li key={w.href}>
                      <Link href={w.href} className="group flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-[15px] font-semibold ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]">
                        {w.label}
                        <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-ov-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <ul className="mt-6 space-y-3 border-t border-white/10 pt-6 text-[14.5px] text-white/80">
              <li className="flex items-start gap-2.5"><BadgeCheck aria-hidden="true" className="mt-[3px] h-4 w-4 shrink-0 text-ov-300" /><span className="min-w-0">Teil der ÖKOVOLT Gruppe – seit 2010 im Solargeschäft</span></li>
              <li className="flex items-start gap-2.5"><ShieldCheck aria-hidden="true" className="mt-[3px] h-4 w-4 shrink-0 text-ov-300" /><span className="min-w-0">Entwicklung, Bau und Betrieb aus einer Gruppe</span></li>
              <li className="flex items-start gap-2.5"><Clock aria-hidden="true" className="mt-[3px] h-4 w-4 shrink-0 text-ov-300" /><span className="min-w-0">Status, Dokumente und Nachrichten im Portal</span></li>
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
