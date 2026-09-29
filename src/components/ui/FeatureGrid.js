import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "./cn";
import Reveal from "./Reveal";

/**
 * Raster aus Vorteils-/Leistungskarten.
 * items: [{ icon: LucideIcon, title, text, href?, tag? }]
 * cols: 2 | 3 | 4
 * tone: light | dark
 */
export default function FeatureGrid({ items = [], cols = 3, tone = "light", className }) {
  const spalten = cols === 2 ? "md:grid-cols-2" : cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={cn("grid gap-4 md:gap-5", spalten, className)}>
      {items.map((it, i) => (
        <Reveal key={it.title} delay={i * 70}>
          <FeatureCard {...it} tone={tone} />
        </Reveal>
      ))}
    </div>
  );
}

export function FeatureCard({ icon: Icon, title, text, href, tag, tone = "light", className }) {
  const dunkel = tone === "dark";
  const inhalt = (
    <>
      <div className="flex items-start justify-between gap-4">
        {Icon && (
          <span
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-300",
              dunkel ? "bg-white/10 text-ov-300 group-hover:bg-ov-500 group-hover:text-white" : "bg-ov-50 text-ov-600 group-hover:bg-ov-500 group-hover:text-white"
            )}
          >
            <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
          </span>
        )}
        {tag && (
          <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-wider", dunkel ? "bg-white/10 text-white/80" : "bg-ink-100 text-ink-600")}>
            {tag}
          </span>
        )}
        {href && !tag && (
          <ArrowUpRight
            aria-hidden="true"
            className={cn("h-5 w-5 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5", dunkel ? "text-white/40 group-hover:text-white" : "text-ink-300 group-hover:text-ov-600")}
          />
        )}
      </div>
      <h3 className={cn("ov-h3 mt-6", dunkel ? "text-white" : "text-ink-900")}>{title}</h3>
      {text && <p className={cn("mt-3 text-[15.5px] leading-relaxed", dunkel ? "text-white/65" : "text-ink-600")}>{text}</p>}
    </>
  );

  const basis = cn(
    "group ov-card-hover relative block h-full rounded-3xl p-7 md:p-8",
    dunkel ? "bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/[0.07]" : "bg-white ring-1 ring-ink-200/70 hover:ring-ov-200",
    className
  );

  return href ? (
    <Link href={href} className={basis}>
      {inhalt}
    </Link>
  ) : (
    <div className={basis}>{inhalt}</div>
  );
}
