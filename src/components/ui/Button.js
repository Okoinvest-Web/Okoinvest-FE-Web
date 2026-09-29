import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "./cn";

const VARIANTEN = {
  primary:
    "bg-ov-600 text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] hover:bg-ov-700 hover:shadow-[0_12px_32px_-8px_rgba(102,153,51,0.75)]",
  navy: "bg-navy-700 text-white hover:bg-navy-800 shadow-[0_8px_24px_-10px_rgba(0,52,115,0.6)]",
  secondary:
    "bg-white text-ink-900 ring-1 ring-inset ring-ink-200 hover:ring-ink-300 hover:bg-ink-50",
  ghost: "text-ink-800 hover:bg-ink-100",
  white: "bg-white text-navy-900 hover:bg-ov-50 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.4)]",
  outlineLight:
    "text-white ring-1 ring-inset ring-white/35 hover:bg-white/10 hover:ring-white/60 backdrop-blur-sm",
  sun: "bg-sun-400 text-navy-950 hover:bg-sun-300 shadow-[0_10px_30px_-10px_rgba(245,167,15,0.7)]",
};

const GROESSEN = {
  sm: "h-10 px-4 text-[14px] gap-1.5 rounded-full",
  md: "h-12 px-6 text-[15px] gap-2 rounded-full",
  lg: "h-14 px-8 text-[16px] gap-2.5 rounded-full",
};

/**
 * Einheitlicher Button. Mit `href` wird ein Link gerendert (intern via
 * next/link, extern/tel/mailto als <a>), sonst ein <button>.
 */
export default function Button({
  href,
  variant = "primary",
  size = "md",
  pfeil = false,
  icon: Icon,
  className,
  children,
  ...rest
}) {
  const klassen = cn(
    "group relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold tracking-[-0.005em] transition-all duration-300 active:scale-[0.98] disabled:opacity-50",
    VARIANTEN[variant],
    GROESSEN[size],
    className
  );

  const inhalt = (
    <>
      {Icon && <Icon aria-hidden="true" className="h-[1.1em] w-[1.1em] shrink-0" />}
      <span>{children}</span>
      {pfeil && (
        <ArrowRight
          aria-hidden="true"
          className="h-[1.05em] w-[1.05em] shrink-0 transition-transform duration-300 group-hover:translate-x-1"
        />
      )}
    </>
  );

  if (href) {
    const extern = /^(https?:|tel:|mailto:)/.test(href);
    if (extern) {
      return (
        <a
          href={href}
          className={klassen}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          {...rest}
        >
          {inhalt}
        </a>
      );
    }
    return (
      <Link href={href} className={klassen} {...rest}>
        {inhalt}
      </Link>
    );
  }

  return (
    <button type="button" className={klassen} {...rest}>
      {inhalt}
    </button>
  );
}
