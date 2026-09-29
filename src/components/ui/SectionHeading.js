import { cn } from "./cn";
import Reveal from "./Reveal";

/**
 * Kleine Überzeile über Headlines.
 * Der Punkt sitzt in einer Box mit genau einer Zeilenhöhe – einzeilig mittig zum Text,
 * bei Umbruch mittig zur ersten Zeile.
 */
export function Eyebrow({ children, dark = false, className }) {
  return (
    <p
      className={cn(
        "inline-flex items-start gap-2 text-[12.5px] font-semibold uppercase leading-[1.5] tracking-[0.16em]",
        dark ? "text-ov-300" : "text-ov-700",
        className
      )}
    >
      <span aria-hidden="true" className="flex h-[1.5em] shrink-0 items-center">
        <span className={cn("h-1.5 w-1.5 rounded-full", dark ? "bg-ov-300" : "bg-ov-500")} />
      </span>
      <span>{children}</span>
    </p>
  );
}

/**
 * Überschriftenblock eines Abschnitts.
 * as: h1 | h2 | h3 – semantische Ebene; die Optik bleibt über `size` steuerbar.
 */
export default function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  dark = false,
  as: Tag = "h2",
  size = "h2",
  className,
  children,
}) {
  const zentriert = align === "center";
  return (
    <Reveal
      className={cn(
        "max-w-3xl",
        zentriert && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <Eyebrow dark={dark} className={cn("mb-4", zentriert && "justify-center")}>
          {eyebrow}
        </Eyebrow>
      )}
      <Tag
        className={cn(
          size === "display" ? "ov-display" : size === "h1" ? "ov-h1" : size === "h3" ? "ov-h3" : "ov-h2",
          dark ? "text-white" : "text-ink-900"
        )}
      >
        {title}
      </Tag>
      {lead && (
        <p className={cn("ov-lead mt-5", dark ? "text-white/70" : "text-ink-600", zentriert && "mx-auto max-w-2xl")}>
          {lead}
        </p>
      )}
      {children}
    </Reveal>
  );
}
