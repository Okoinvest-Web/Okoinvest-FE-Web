import { Plus } from "lucide-react";
import { cn } from "./cn";

/**
 * FAQ-Akkordeon auf Basis von <details> – funktioniert ohne JavaScript,
 * ist per Tastatur bedienbar und liefert optional FAQPage-Schema.
 * items: [{ q, a }]  (a: String oder JSX; für Schema wird `aText` oder a als String genutzt)
 */
export default function Faq({ items = [], schema = true, className, tone = "light" }) {
  const dunkel = tone === "dark";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.aText || (typeof it.a === "string" ? it.a : "") },
    })),
  };

  return (
    <div className={cn("divide-y", dunkel ? "divide-white/10" : "divide-ink-200", className)}>
      {schema && items.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      {items.map((it, i) => (
        <details key={it.q} className="group py-1" open={i === 0 ? undefined : undefined}>
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-display text-[17px] font-bold leading-snug transition-colors md:text-[18.5px] [&::-webkit-details-marker]:hidden",
              dunkel ? "text-white hover:text-ov-300" : "text-ink-900 hover:text-ov-700"
            )}
          >
            {it.q}
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 group-open:rotate-45",
                dunkel ? "bg-white/10 text-white group-open:bg-ov-500" : "bg-ink-100 text-ink-700 group-open:bg-ov-500 group-open:text-white"
              )}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </span>
          </summary>
          <div className={cn("-mt-1 pb-6 pr-12 text-[16px] leading-relaxed", dunkel ? "text-white/70" : "text-ink-600")}>
            {it.a}
          </div>
        </details>
      ))}
    </div>
  );
}
