import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/components/ui/cn";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";

/**
 * Englische Fassung von ui/CtaBand – gleiche Optik, englische Texte und
 * Wegweiser auf die EN-Seiten. (CtaBand selbst hat deutsche Festtexte.)
 */
export default function EnCta({
  eyebrow = "Free of charge for investors",
  title = "Projects, capital, partnership – let's talk.",
  text = "A group that has been building solar plants since 2010 and operating its own solar parks since 2012. Honest first assessment, one fixed contact person, transparent status in the portal.",
  primary = { label: "Contact us", href: "/en/contact" },
  secondary = { label: "Project exchange", href: "/en/project-exchange" },
  className,
}) {
  return (
    <section className={cn("relative px-4 py-16 md:px-8 md:py-24", className)}>
      <Reveal dir="scale" className="ov-noise relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-navy-950 px-6 py-14 text-white md:rounded-[2.5rem] md:px-16 md:py-20">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-24 -top-32 h-[460px] w-[460px] rounded-full bg-ov-500/35 blur-[110px]" />
        <div aria-hidden="true" className="absolute -bottom-40 left-1/4 h-[360px] w-[360px] rounded-full bg-sun-400/15 blur-[110px]" />

        <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300">{eyebrow}</p>
            <h2 className="ov-h2 mt-4 text-white">{title}</h2>
            <p className="ov-lead mt-5 max-w-2xl text-white/70">{text}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button href={primary.href} size="lg" pfeil>
                {primary.label}
              </Button>
              {secondary && (
                <Button href={secondary.href} size="lg" variant="outlineLight">
                  {secondary.label}
                </Button>
              )}
            </div>
          </div>

          <div className="ov-glass min-w-0 rounded-3xl p-6 md:p-8">
            <p className="text-[13px] font-medium text-white/60">Choose your route</p>
            <ul className="mt-3 grid gap-2">
              {[
                { label: "I want to buy projects", href: "/en/investors" },
                { label: "I want to sell a project", href: "/en/sell-your-project" },
                { label: "Browse the project exchange", href: "/en/project-exchange" },
                { label: "General enquiry", href: "/en/contact" },
              ].map((w) => (
                <li key={w.href}>
                  <Link href={w.href} className="group flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-[15px] font-semibold ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]">
                    {w.label}
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-ov-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-6 space-y-3 border-t border-white/10 pt-6 text-[14.5px] text-white/80">
              <li className="flex items-start gap-2.5"><BadgeCheck aria-hidden="true" className="mt-[3px] h-4 w-4 shrink-0 text-ov-300" /><span className="min-w-0">Part of the ÖKOVOLT Group – in solar since 2010</span></li>
              <li className="flex items-start gap-2.5"><ShieldCheck aria-hidden="true" className="mt-[3px] h-4 w-4 shrink-0 text-ov-300" /><span className="min-w-0">Development, construction and operation within one group</span></li>
              <li className="flex items-start gap-2.5"><Clock aria-hidden="true" className="mt-[3px] h-4 w-4 shrink-0 text-ov-300" /><span className="min-w-0">Status, documents and messages in the portal</span></li>
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
