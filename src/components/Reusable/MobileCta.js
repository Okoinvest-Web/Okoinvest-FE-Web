"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowUp, LineChart } from "lucide-react";
import useFreieUnterkante from "@/components/motion/useFreieUnterkante";

// Auf diesen Seiten ist die Leiste überflüssig oder stört den Ablauf.
const AUSGENOMMEN = ["/flaechencheck", "/kontakt", "/impressum", "/datenschutz", "/nutzungsbedingungen", "/login", "/registrieren", "/portal", "/en"];

// Ziel der Hauptaktion je Thema (Conversion-Plan): erster passender Präfix gewinnt, sonst „Fläche prüfen“.
// Nur bestehende Ziele/Anker; Texte kurz genug für 390 px neben „Börse“.
const ZIEL_JE_PFAD = [
  ["/investoren", { href: "/registrieren?rolle=investor", label: "Suchprofil anlegen" }],
  ["/projektboerse/anbieten", { href: "/registrieren?rolle=anbieter", label: "Projekt anbieten" }],
  ["/projektboerse", { href: "/registrieren?rolle=investor", label: "Suchprofil anlegen" }],
  ["/marktdaten", { href: "/registrieren?rolle=investor", label: "Suchprofil anlegen" }],
  ["/rechner/reststrom", { href: "/kontakt?anliegen=reststrom", label: "Anfrage stellen" }],
  ["/rechner/ppa", { href: "/kontakt?anliegen=reststrom", label: "PPA anfragen" }],
  ["/reststrom", { href: "/rechner/reststrom", label: "Ersparnis berechnen" }],
  ["/energie-live", { href: "/rechner/reststrom", label: "Ersparnis berechnen" }],
  ["/rechner/grossspeicher", { href: "/kontakt?anliegen=speicher", label: "Speicher anfragen" }],
  ["/grossspeicher", { href: "#anfrage", label: "Speicher anfragen" }],
  ["/rechner/solarcarport", { href: "/kontakt?anliegen=carport", label: "Carport anfragen" }],
  ["/solarcarport", { href: "#anfrage", label: "Carport anfragen" }],
  ["/virtuelles-kraftwerk", { href: "#anfrage", label: "Verbund anfragen" }],
  ["/energiegemeinschaften/rechner", { href: "#interesse", label: "Interesse vormerken" }],
  ["/energiegemeinschaften/software", { href: "#anfrage", label: "Software anfragen" }],
  ["/energiegemeinschaften", { href: "#anfrage", label: "Gemeinschaft anfragen" }],
  ["/genossenschaft", { href: "#interesse", label: "Interesse vormerken" }],
  ["/kommunen", { href: "#anfrage", label: "Gespräch anfragen" }],
  ["/rechner/kommune", { href: "/kontakt?anliegen=kommune", label: "Gespräch anfragen" }],
];
const zielFuer = (pfad) => ZIEL_JE_PFAD.find(([p]) => pfad === p || pfad.startsWith(p + "/"))?.[1];

/**
 * Feste Handlungsleiste am unteren Rand – nur auf Handy/Tablet (< 1024 px), global.
 *
 * Erscheint erst, wenn der Hero verlassen ist, und verschwindet, sobald der
 * Footer mit seinen eigenen Kontaktdaten ins Bild kommt. Sie tritt zurück, solange
 * - ein Eingabefeld den Fokus hat bzw. die Bildschirmtastatur offen ist,
 * - nach dem Scrollen ein Bedienelement unter ihr liegt (useFreieUnterkante),
 * - die Seite `data-ov-keine-leiste` trägt.
 * Sie enthält den Nach-oben-Knopf selbst; der schwebende Knopf tritt solange zurück
 * (Klasse `ov-cta-sichtbar` an <body>, siehe globals.css), damit unten nur EIN
 * schwebendes Objekt liegt. Mit `ov-cta-sichtbar` hält globals.css außerdem
 * scroll-padding-bottom frei, damit Fokus-/Sprungziele nicht darunter landen.
 */
export default function MobileCta({ href: hrefStandard = "/flaechencheck", label: labelStandard = "Fläche prüfen" }) {
  const pfad = usePathname();
  const { href, label } = zielFuer(pfad) || { href: hrefStandard, label: labelStandard };
  const [imBereich, setImBereich] = useState(false);
  const aus = AUSGENOMMEN.some((p) => pfad === p || pfad.startsWith(p + "/"));
  const { zuruecktreten } = useFreieUnterkante({ aktiv: !aus, pfad });
  const sichtbar = imBereich && !zuruecktreten;

  useEffect(() => {
    if (aus) {
      setImBereich(false);
      return undefined;
    }
    let footerSichtbar = false;
    let raf = 0;
    const aktualisieren = () => {
      raf = 0;
      setImBereich(window.scrollY > 640 && !footerSichtbar);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(aktualisieren);
    };

    const footer = document.querySelector("footer");
    const io = footer
      ? new IntersectionObserver(([e]) => {
          footerSichtbar = e.isIntersecting;
          aktualisieren();
        })
      : null;
    if (footer) io.observe(footer);

    window.addEventListener("scroll", onScroll, { passive: true });
    aktualisieren();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
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
      inert={!sichtbar}
      aria-hidden={!sichtbar}
      className={`ov-mobile-cta fixed inset-x-3 bottom-3 z-[9000] transition-[transform,opacity] lg:hidden ${
        sichtbar ? "translate-y-0 opacity-100 duration-500 ease-ov-out" : "pointer-events-none translate-y-[130%] opacity-0 duration-300 ease-ov-in"
      }`}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-center gap-1.5 rounded-full bg-navy-950/95 p-1.5 shadow-[0_20px_40px_-12px_rgba(3,18,43,0.6)] ring-1 ring-white/10 backdrop-blur-xl">
        <Link
          href="/projektboerse"
          className="ov-press flex h-12 shrink-0 items-center gap-2 rounded-full bg-white/10 pl-3.5 pr-4 text-[14px] font-semibold text-white"
        >
          <LineChart aria-hidden="true" className="h-[18px] w-[18px]" />
          Börse
        </Link>
        <Link
          href={href}
          className="ov-press group flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ov-600 text-[15px] font-semibold text-white"
        >
          {label}
          <ArrowRight aria-hidden="true" className="ov-pfeil h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
          aria-label="Nach oben"
          className="ov-press flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white/80 hover:text-white"
        >
          <ArrowUp aria-hidden="true" className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}
