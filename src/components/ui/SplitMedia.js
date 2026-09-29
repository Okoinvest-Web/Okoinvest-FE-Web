import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "./cn";
import Reveal from "./Reveal";
import Button from "./Button";
import { Eyebrow } from "./SectionHeading";

/**
 * Bild + Text nebeneinander. Das Arbeitspferd für erklärende Abschnitte.
 * image { src, alt }, reverse (Bild rechts), points [..], action { label, href }
 * aside: JSX statt Bild (z. B. Kennzahlkarte, Rechner-Vorschau)
 */
export default function SplitMedia({
  eyebrow,
  title,
  text,
  points = [],
  action,
  image,
  aside,
  reverse = false,
  dark = false,
  headingAs: H = "h2",
  children,
  className,
}) {
  return (
    <div className={cn("grid items-center gap-10 md:gap-14 lg:grid-cols-2 lg:gap-20", className)}>
      <Reveal dir={reverse ? "right" : "left"} className={cn("relative", reverse && "lg:order-2")}>
        {aside ? (
          aside
        ) : image?.src ? (
          <div className="relative">
            <div aria-hidden="true" className={cn("absolute -inset-3 -z-0 rounded-[2.25rem] md:-inset-4", dark ? "bg-white/5" : "bg-ov-100/60", reverse ? "rotate-2" : "-rotate-2")} />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-ink-100 shadow-xl">
              <Image src={image.src} alt={image.alt || ""} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition-transform duration-[1200ms] hover:scale-[1.03]" />
            </div>
          </div>
        ) : null}
      </Reveal>

      <Reveal delay={120} className={reverse ? "lg:order-1" : undefined}>
        {eyebrow && <Eyebrow dark={dark} className="mb-4">{eyebrow}</Eyebrow>}
        {title && <H className={cn("ov-h2", dark ? "text-white" : "text-ink-900")}>{title}</H>}
        {text && (
          <div className={cn("mt-5 space-y-4 text-[16.5px] leading-relaxed", dark ? "text-white/70" : "text-ink-600")}>
            {Array.isArray(text) ? text.map((t, i) => <p key={i}>{t}</p>) : <p>{text}</p>}
          </div>
        )}
        {points.length > 0 && (
          <ul className="mt-7 space-y-3.5">
            {points.map((p) => (
              <li key={typeof p === "string" ? p : p.title} className="flex gap-3">
                <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", dark ? "bg-ov-500/20 text-ov-300" : "bg-ov-100 text-ov-700")}>
                  <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className={cn("text-[16px] leading-relaxed", dark ? "text-white/80" : "text-ink-700")}>
                  {typeof p === "string" ? p : (<><strong className={dark ? "text-white" : "text-ink-900"}>{p.title}</strong>{p.text ? ` – ${p.text}` : ""}</>)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {children}
        {action && (
          <div className="mt-9">
            <Button href={action.href} variant={action.variant || "primary"} pfeil>
              {action.label}
            </Button>
          </div>
        )}
      </Reveal>
    </div>
  );
}
