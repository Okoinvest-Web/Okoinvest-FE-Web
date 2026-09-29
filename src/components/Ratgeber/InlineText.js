import Link from "next/link";

/**
 * Minimal-Markup für Ratgeber-Inhalte (bewusst kein Markdown-Parser, kein
 * dangerouslySetInnerHTML):
 *   **fett**
 *   [Linktext](/interner/pfad)   -> next/link
 *   [Linktext](https://…)        -> externer Link, neuer Tab, rel="noopener"
 */
const MUSTER = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

export default function InlineText({ text }) {
  if (text == null) return null;
  const teile = String(text).split(MUSTER).filter((t) => t !== "");

  return teile.map((teil, i) => {
    if (teil.startsWith("**") && teil.endsWith("**")) {
      const innen = teil.slice(2, -2);
      return <strong key={i}>{innen.includes("](") ? <InlineText text={innen} /> : innen}</strong>;
    }
    const link = teil.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href] = link;
      const klasse = "font-medium text-ov-700 underline decoration-ov-300 underline-offset-[3px] transition-colors hover:decoration-current";
      if (/^https?:\/\//.test(href)) {
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={klasse}>
            {label}
          </a>
        );
      }
      return (
        <Link key={i} href={href} className={klasse}>
          {label}
        </Link>
      );
    }
    return teil;
  });
}

/** Klartext ohne Markup – für Schema.org, Meta-Beschreibungen und Wortzählung. */
export function klartext(text) {
  return String(text ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1");
}
