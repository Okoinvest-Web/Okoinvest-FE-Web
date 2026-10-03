import Link from "next/link";
import { ArrowUpRight, Phone, Calculator, ShieldCheck, Clock, BadgeCheck } from "lucide-react";
import { KONTAKT } from "@/data/site";
import { cn } from "./cn";
import Button from "./Button";
import Reveal from "./Reveal";
import Stagger from "./Stagger";
import Spotlight from "@/components/motion/Spotlight";
import TextEnthuellung from "@/components/motion/TextEnthuellung";

/**
 * Ziele je Zielgruppe (Conversion-Plan): Seiten übergeben `zielgruppe`, eigene `primary`/`secondary` haben Vorrang.
 * Ohne Angabe bleibt alles wie bisher (Fläche prüfen + Projektbörse).
 */
const ZIELE = {
  flaeche: { primary: { label: "Fläche prüfen lassen", href: "/flaechencheck" }, secondary: { label: "Pacht berechnen", href: "/rechner/pacht" } },
  investor: { primary: { label: "Suchprofil anlegen", href: "/registrieren?rolle=investor" }, secondary: { label: "Zur Projektbörse", href: "/projektboerse" } },
  reststrom: { primary: { label: "Ersparnis berechnen", href: "/rechner/reststrom" }, secondary: { label: "Anfrage stellen", href: "/kontakt?anliegen=reststrom" } },
  energiegemeinschaft: { primary: { label: "Anfrage Energiegemeinschaft", href: "/energiegemeinschaften#anfrage" }, secondary: { label: "Software ansehen", href: "/energiegemeinschaften/software" } },
  kommune: { primary: { label: "Gespräch anfragen", href: "/kontakt?anliegen=kommune" }, secondary: { label: "Für Kommunen", href: "/kommunen" } },
};

/**
 * Abschluss-Handlungsaufruf für jede Seite. Dunkle, leuchtende Fläche mit
 * zwei Wegen und einer Wegweiser-Box für die Zielgruppen. Telefon erscheint
 * nur, wenn in src/data/site.js eine Nummer hinterlegt ist.
 */
export default function CtaBand({
  eyebrow = "Kostenlos & unverbindlich",
  title = "Ihre Fläche, Ihr Projekt, Ihr Kapital – wir machen daraus ein Kraftwerk.",
  text = "Ein Team, das seit 2010 Solarkraftwerke plant, baut und selbst betreibt. Mit ehrlicher Ersteinschätzung, festem Ansprechpartner und transparentem Status im Portal.",
  primary: primaryProp,
  secondary: secondaryProp,
  zielgruppe,
  className,
}) {
  const ziel = ZIELE[zielgruppe];
  const primary = primaryProp || ziel?.primary || { label: "Fläche prüfen lassen", href: "/flaechencheck" };
  // secondary={null} blendet den zweiten Weg weiterhin aus
  const secondary = secondaryProp !== undefined ? secondaryProp : ziel?.secondary || { label: "Zur Projektbörse", href: "/projektboerse" };
  return (
    <section className={cn("relative px-4 py-16 md:px-8 md:py-24", className)}>
      {/* Ein ruhiger Moment: Fläche skaliert ein, Überschrift baut sich Wort für Wort auf, Wegweiser folgen
          gestaffelt; bei Maus folgt ein weicher Lichtkegel, der Haupt-CTA ist magnetisch. Reduzierte Bewegung: alles sofort. */}
      <Reveal as={Spotlight} ton="dunkel" groesse={560} dir="scale" className="ov-noise relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-navy-950 px-6 py-14 text-white md:rounded-[2.5rem] md:px-16 md:py-20">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-24 -top-32 h-[460px] w-[460px] rounded-full bg-ov-500/35 blur-[110px]" />
        <div aria-hidden="true" className="absolute -bottom-40 left-1/4 h-[360px] w-[360px] rounded-full bg-sun-400/15 blur-[110px]" />

        {/* minmax(0, …): Spalten dürfen nicht über ihren Anteil wachsen – sonst schieben breite Buttons
            die rechte Box in den Innenabstand und overflow-hidden schneidet sie ab */}
        <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300">{eyebrow}</p>
            <h2 className="ov-h2 mt-4 text-white">{typeof title === "string" ? <TextEnthuellung ausloeser="scrollen" verzoegerung={120}>{title}</TextEnthuellung> : title}</h2>
            <p className="ov-lead mt-5 max-w-2xl text-white/70">{text}</p>
            {/* flex-wrap: bei wenig Platz rutscht der zweite Button in die nächste Zeile */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button href={primary.href} size="lg" pfeil magnetisch>
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
                <Stagger as="ul" schritt={70} delay={250} className="mt-3 grid gap-2">
                  {[
                    { label: "Ich habe eine Fläche", href: "/flaeche-verpachten" },
                    { label: "Ich bin Landwirt", href: "/landwirte" },
                    { label: "Ich möchte investieren", href: "/investoren" },
                    { label: "Ich brauche günstigen Strom", href: "/reststrom" },
                  ].map((w) => (
                    <li key={w.href}>
                      <Link href={w.href} className="group flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-[15px] font-semibold ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]">
                        {w.label}
                        <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-300 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </Stagger>
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
