import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Sichtbare Breadcrumb-Navigation.
 * Das passende BreadcrumbList-JSON-LD wird in der jeweiligen page.js gesetzt -
 * Google will beides: sichtbare Navigation UND strukturierte Daten.
 *
 * @param {{items: {name: string, href?: string}[]}} props
 *        Letztes Element ohne href = aktuelle Seite.
 */
export default function Breadcrumbs({ items, className = "" }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[13px] text-gray-500">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.name} className="flex items-center gap-x-1">
              {i > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-gray-400"
                />
              )}
              {last || !item.href ? (
                <span className="font-medium text-gray-700" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-[#669933] hover:underline"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
