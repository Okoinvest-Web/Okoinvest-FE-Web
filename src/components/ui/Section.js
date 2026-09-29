import { cn } from "./cn";

const TOENE = {
  white: "bg-white text-ink-900",
  sand: "bg-sand-50 text-ink-900",
  ink: "bg-ink-50 text-ink-900",
  green: "bg-ov-50 text-ink-900",
  navy: "bg-navy-950 text-white",
};

const ABSTAENDE = {
  none: "",
  sm: "py-12 md:py-16",
  md: "py-16 md:py-24",
  lg: "py-20 md:py-32",
};

/**
 * Seitenabschnitt mit einheitlichem Rhythmus.
 * tone: white | sand | ink | green | navy
 * space: none | sm | md | lg
 */
export default function Section({
  tone = "white",
  space = "md",
  id,
  className,
  containerClassName,
  bare = false,
  as: Tag = "section",
  children,
  ...rest
}) {
  return (
    <Tag
      id={id}
      className={cn("relative", TOENE[tone], ABSTAENDE[space], className)}
      {...rest}
    >
      {bare ? children : <div className={cn("ov-container relative", containerClassName)}>{children}</div>}
    </Tag>
  );
}

export function Container({ className, children }) {
  return <div className={cn("ov-container", className)}>{children}</div>;
}
