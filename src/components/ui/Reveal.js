import { cn } from "./cn";

/**
 * Einblenden beim Scrollen – ohne eigenen Client-Baustein.
 * Die Klasse `ov-reveal` wird global vom <RevealObserver/> beobachtet
 * (siehe LayoutWrapper). Ohne JavaScript bleibt der Inhalt sichtbar.
 *
 * dir: up (Standard) | left | right | scale
 */
export default function Reveal({ as: Tag = "div", delay = 0, dir, className, style, children, ...rest }) {
  return (
    <Tag
      className={cn("ov-reveal", className)}
      data-dir={dir}
      style={delay ? { "--ov-delay": `${delay}ms`, ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
