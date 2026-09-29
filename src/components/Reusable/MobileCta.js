"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LineChart } from "lucide-react";

// Auf diesen Seiten ist die Leiste überflüssig oder stört den Ablauf.
const AUSGENOMMEN = ["/flaechencheck", "/kontakt", "/impressum", "/datenschutz", "/nutzungsbedingungen", "/login", "/registrieren", "/portal"];

/**
 * Feste Handlungsleiste am unteren Rand – nur auf Mobilgeräten, global.
 *
 * Erscheint erst, wenn der Hero verlassen ist, und verschwindet, sobald der
 * Footer mit seinen eigenen Kontaktdaten ins Bild kommt. Solange sie sichtbar
 * ist, bekommt <body> eine Klasse, über die globals.css den
 * Zurück-nach-oben-Button anhebt.
 */
export default function MobileCta({ href = "/flaechencheck", label = "Fläche prüfen" }) {
  const pfad = usePathname();
  const [sichtbar, setSichtbar] = useState(false);
  const aus = AUSGENOMMEN.some((p) => pfad === p || pfad.startsWith(p + "/"));

  useEffect(() => {
    if (aus) {
      setSichtbar(false);
      return undefined;
    }
    let footerSichtbar = false;
    const aktualisieren = () => setSichtbar(window.scrollY > 640 && !footerSichtbar);

    const footer = document.querySelector("footer");
    const io = footer
      ? new IntersectionObserver(([e]) => {
          footerSichtbar = e.isIntersecting;
          aktualisieren();
        })
      : null;
    if (footer) io.observe(footer);

    window.addEventListener("scroll", aktualisieren, { passive: true });
    aktualisieren();
    return () => {
      window.removeEventListener("scroll", aktualisieren);
      io?.disconnect();
      document.body.classList.remove("ov-cta-sichtbar");
    };
  }, [aus, pfad]);

  useEffect(() => {
    document.body.classList.toggle("ov-cta-sichtbar", sichtbar);
  }, [sichtbar]);

  if (aus) return null;

  return (
    <div
      aria-hidden={!sichtbar}
      className={`ov-mobile-cta fixed inset-x-3 bottom-3 z-[9000] transition-all duration-500 lg:hidden ${
        sichtbar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[130%] opacity-0"
      }`}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-full bg-navy-950/95 p-1.5 shadow-[0_20px_40px_-12px_rgba(3,18,43,0.6)] ring-1 ring-white/10 backdrop-blur-xl">
        <Link
          href="/projektboerse"
          tabIndex={sichtbar ? 0 : -1}
          className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-white/10 pl-3.5 pr-4 text-[14px] font-semibold text-white"
        >
          <LineChart aria-hidden="true" className="h-[18px] w-[18px]" />
          Börse
        </Link>
        <Link
          href={href}
          tabIndex={sichtbar ? 0 : -1}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ov-600 text-[15px] font-semibold text-white"
        >
          {label}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
