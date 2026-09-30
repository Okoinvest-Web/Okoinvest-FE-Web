// Download-Link im Button-Stil (natives <a>, damit Datei-Routen wie PDF/CSV nicht über den
// Client-Router laufen). Server- und Client-tauglich.

import { cn } from "@/components/ui/cn";

const STIL = {
  primary: "bg-ov-600 text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] hover:bg-ov-700",
  secondary: "bg-white text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300",
  ghost: "text-ink-800 hover:bg-ink-100",
  white: "bg-white text-navy-900 hover:bg-ov-50",
};

export default function DateiLink({ href, children, icon: Icon, variant = "secondary", size = "sm", neuesFenster = false, className, ...rest }) {
  return (
    <a
      href={href}
      {...(neuesFenster ? { target: "_blank", rel: "noopener" } : { download: true })}
      className={cn(
        "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors",
        size === "sm" ? "h-10 px-4 text-[14px]" : size === "xs" ? "h-8 px-3 text-[12.5px]" : "h-12 px-6 text-[15px]",
        STIL[variant] || STIL.secondary,
        className
      )}
      {...rest}
    >
      {Icon && <Icon aria-hidden="true" className="h-[1.1em] w-[1.1em] shrink-0" />}
      <span>{children}</span>
    </a>
  );
}
