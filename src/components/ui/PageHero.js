import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "./cn";
import Breadcrumbs from "./Breadcrumbs";
import Button from "./Button";
import CountUp from "./CountUp";
import { Eyebrow } from "./SectionHeading";

/**
 * Einheitlicher Seitenkopf für alle Unterseiten.
 *
 * variant:
 *  - "split"      Text links, großes Bild rechts mit schwebender Kennzahl (Standard)
 *  - "immersive"  Vollflächiges Bild, dunkler Verlauf, Text unten links
 *  - "dark"       Navy-Fläche mit Raster und Lichtschein, ohne Bild (Tools, Wissen)
 *
 * props:
 *  breadcrumbs  [{ name, href }]
 *  eyebrow, title (string oder JSX), lead
 *  image { src, alt }  – bei split/immersive
 *  actions      [{ label, href, variant, icon }]
 *  points       ["Kurzer Vorteil", ...]
 *  stats        [{ value: 5000, suffix: "+", label: "Anlagen" }]
 *  badge        JSX – schwebendes Element auf dem Bild (split)
 */
export default function PageHero({
  variant = "split",
  breadcrumbs,
  eyebrow,
  title,
  lead,
  image,
  actions = [],
  points = [],
  stats = [],
  badge,
  children,
  className,
}) {
  if (variant === "immersive") return <Immersive {...{ breadcrumbs, eyebrow, title, lead, image, actions, points, stats, children, className }} />;
  if (variant === "dark") return <Dark {...{ breadcrumbs, eyebrow, title, lead, actions, points, stats, children, className }} />;

  return (
    <section className={cn("relative overflow-hidden bg-sand-50", className)}>
      <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-ov-200/40 blur-3xl"
      />
      <div className="ov-container relative grid items-center gap-12 pb-16 pt-8 md:pb-24 md:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="ov-hero-in mb-8" />}
          {eyebrow && (
            <div className="ov-hero-in" style={{ "--ov-delay": "60ms" }}>
              <Eyebrow className="mb-5">{eyebrow}</Eyebrow>
            </div>
          )}
          <h1 className="ov-h1 ov-hero-in text-ink-900" style={{ "--ov-delay": "120ms" }}>
            {title}
          </h1>
          {lead && (
            <p
              className={cn("ov-hero-in mt-6 max-w-xl text-ink-600", typeof lead === "string" && lead.length > 260 ? "text-[16px] leading-relaxed" : "ov-lead")}
              style={{ "--ov-delay": "200ms" }}
            >
              {lead}
            </p>
          )}
          {points.length > 0 && (
            <ul className="ov-hero-in mt-7 grid gap-3 sm:grid-cols-2" style={{ "--ov-delay": "260ms" }}>
              {points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[15px] text-ink-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ov-500 text-white">
                    <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          )}
          {actions.length > 0 && (
            <div className="ov-hero-in mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--ov-delay": "320ms" }}>
              {actions.map((a, i) => (
                <Button key={a.label} href={a.href} variant={a.variant || (i === 0 ? "primary" : "secondary")} size="lg" pfeil={i === 0} icon={a.icon}>
                  {a.label}
                </Button>
              ))}
            </div>
          )}
          {stats.length > 0 && (
            <dl className="ov-hero-in mt-12 grid grid-cols-3 gap-4 border-t border-ink-200 pt-8" style={{ "--ov-delay": "380ms" }}>
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-display text-[clamp(1.5rem,1.1rem+1.4vw,2.25rem)] font-extrabold leading-none tracking-tight text-ink-900">
                    <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} prefix={s.prefix} />
                  </dd>
                  <dd className="mt-2 text-[13px] leading-snug text-ink-500">{s.label}</dd>
                </div>
              ))}
            </dl>
          )}
          {children}
        </div>

        {image?.src && (
          <div className="ov-hero-in relative" style={{ "--ov-delay": "180ms" }}>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-ink-100 shadow-2xl sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image
                src={image.src}
                alt={image.alt || ""}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/40 via-transparent to-transparent" />
            </div>
            {badge && (
              <div className="absolute -bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-xs md:-left-8 md:right-auto">
                <div className="animate-ov-float rounded-2xl bg-white/95 p-5 shadow-2xl ring-1 ring-ink-100 backdrop-blur">{badge}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Actions({ actions, dark = true }) {
  if (!actions.length) return null;
  return (
    <div className="ov-hero-in mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--ov-delay": "320ms" }}>
      {actions.map((a, i) => (
        <Button
          key={a.label}
          href={a.href}
          variant={a.variant || (i === 0 ? "primary" : dark ? "outlineLight" : "secondary")}
          size="lg"
          pfeil={i === 0}
          icon={a.icon}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}

function StatsDark({ stats }) {
  if (!stats.length) return null;
  return (
    <dl className="ov-hero-in mt-12 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/15 pt-8" style={{ "--ov-delay": "400ms" }}>
      {stats.map((s) => (
        <div key={s.label}>
          <dt className="sr-only">{s.label}</dt>
          <dd className="font-display text-[clamp(1.5rem,1.1rem+1.4vw,2.25rem)] font-extrabold leading-none tracking-tight text-white">
            <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} prefix={s.prefix} />
          </dd>
          <dd className="mt-2 text-[13px] leading-snug text-white/60">{s.label}</dd>
        </div>
      ))}
    </dl>
  );
}

function Immersive({ breadcrumbs, eyebrow, title, lead, image, actions, points, stats, children, className }) {
  return (
    <section className={cn("relative isolate overflow-hidden bg-navy-950 text-white", className)}>
      {image?.src && (
        <Image src={image.src} alt={image.alt || ""} fill priority sizes="100vw" className="-z-20 object-cover" style={image.position ? { objectPosition: image.position } : undefined} />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/95 via-navy-950/75 to-navy-950/20" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950 via-transparent to-transparent" />
      <div className="ov-container flex min-h-[560px] flex-col justify-end pb-16 pt-10 md:min-h-[640px] md:pb-20">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} dark className="ov-hero-in mb-auto pb-10" />}
        <div className="max-w-3xl">
          {eyebrow && (
            <div className="ov-hero-in" style={{ "--ov-delay": "60ms" }}>
              <Eyebrow dark className="mb-5">{eyebrow}</Eyebrow>
            </div>
          )}
          <h1 className="ov-h1 ov-hero-in" style={{ "--ov-delay": "120ms" }}>{title}</h1>
          {lead && <p className="ov-lead ov-hero-in mt-6 max-w-2xl text-white/75" style={{ "--ov-delay": "200ms" }}>{lead}</p>}
          {points.length > 0 && (
            <ul className="ov-hero-in mt-7 flex flex-wrap gap-2" style={{ "--ov-delay": "260ms" }}>
              {points.map((p) => (
                <li key={p} className="ov-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] text-white/90">
                  <Check aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" strokeWidth={3} />
                  {p}
                </li>
              ))}
            </ul>
          )}
          <Actions actions={actions} />
          <StatsDark stats={stats} />
          {children}
        </div>
      </div>
    </section>
  );
}

function Dark({ breadcrumbs, eyebrow, title, lead, actions, points, stats, children, className }) {
  return (
    <section className={cn("ov-noise relative isolate overflow-hidden bg-navy-950 text-white", className)}>
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10" />
      <div aria-hidden="true" className="absolute -left-32 top-1/3 -z-10 h-[420px] w-[420px] rounded-full bg-ov-500/25 blur-[120px]" />
      <div aria-hidden="true" className="absolute -right-20 -top-24 -z-10 h-[380px] w-[380px] rounded-full bg-navy-400/30 blur-[120px]" />
      <div className="ov-container pb-16 pt-8 md:pb-24 md:pt-12">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} dark className="ov-hero-in mb-10" />}
        <div className="max-w-3xl">
          {eyebrow && (
            <div className="ov-hero-in" style={{ "--ov-delay": "60ms" }}>
              <Eyebrow dark className="mb-5">{eyebrow}</Eyebrow>
            </div>
          )}
          <h1 className="ov-h1 ov-hero-in" style={{ "--ov-delay": "120ms" }}>{title}</h1>
          {lead && <p className="ov-lead ov-hero-in mt-6 max-w-2xl text-white/70" style={{ "--ov-delay": "200ms" }}>{lead}</p>}
          {points.length > 0 && (
            <ul className="ov-hero-in mt-7 flex flex-wrap gap-2" style={{ "--ov-delay": "260ms" }}>
              {points.map((p) => (
                <li key={p} className="ov-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] text-white/90">
                  <Check aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" strokeWidth={3} />
                  {p}
                </li>
              ))}
            </ul>
          )}
          <Actions actions={actions} />
          <StatsDark stats={stats} />
        </div>
        {children}
      </div>
    </section>
  );
}
