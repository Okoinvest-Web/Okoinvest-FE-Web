import { ArrowUpRight } from "lucide-react";
import { cn } from "@/components/ui/cn";

const host = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Quelle";
  }
};

/** Externer Quellenverweis (Host als Linktext, Titel als title-Attribut) */
export default function QuelleLink({ quelle, className }) {
  if (!quelle?.url) return null;
  return (
    <a
      href={quelle.url}
      target="_blank"
      rel="noopener noreferrer"
      title={quelle.titel}
      className={cn("inline-flex max-w-full items-center gap-1 text-[12.5px] font-medium text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current", className)}
    >
      <span className="truncate">Quelle: {host(quelle.url)}</span>
      <ArrowUpRight aria-hidden="true" className="h-3 w-3 shrink-0" />
      <span className="sr-only">(öffnet neues Fenster)</span>
    </a>
  );
}
