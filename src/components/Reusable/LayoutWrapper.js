"use client";
import Navbar from "@/components/Navbar/navbar";
import Footer from "@/components/Reusable/footer";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { herkunftErfassen } from "@/lib/herkunft";
import RevealObserver from "@/components/ui/RevealObserver";
import MobileCta from "@/components/Reusable/MobileCta";
import MotionInteraktion from "@/components/motion/MotionInteraktion";
import ScrollFortschritt from "@/components/motion/ScrollFortschritt";
import Offenlegung from "@/components/Gruppe/Offenlegung";
import useLand from "@/components/Land/useLand";
import { landAusPfad } from "@/lib/land";
import NichtUebersetzt, { nichtUebersetzt } from "@/components/Sprache/NichtUebersetzt";
import { useSprache } from "@/components/Sprache/SpracheKontext";

// Lange Leseseiten: dünner Lesefortschritt oben (ScrollFortschritt) – geprüft am Pfad ohne
// Länderpräfix, gilt also gleich für die gemeinsame Seite und ihre Länderfassungen (Ländermodell)
const LESESEITEN = [/^\/ratgeber\/[^/]+/, /^\/wissen\//, /^\/faq$/, /^\/datenschutz$/, /^\/impressum$/, /^\/nutzungsbedingungen$/, /^\/bedingungen\//];

// const GoogleTagManager = dynamic(
//   (entfernt)
//   { ssr: false }
// );

const CookieComponentLazy = dynamic(() => import("@/components/Cookies/cookiecomponent"), { ssr: false });
const ToTopButtonLazy = dynamic(() => import("@/components/Home/BackToTop"), { ssr: false });

export default function LayoutWrapper({ children }) {
  // Kampagnen-Zuordnung beim ersten Laden im Arbeitsspeicher festhalten (keine Cookies)
  useEffect(() => herkunftErfassen(), []);

  // Info-Bildschirm (SCADA/TV): nur der Inhalt, ohne Kopf, Fuß, Banner und Widgets
  const pfad = usePathname() || "";
  const { land } = useLand();
  const sprache = useSprache();
  // Englische Seite ohne Übersetzung: Inhalt ist deutsch → <main lang="de"> (Screenreader, Silbentrennung)
  const inhaltDeutsch = nichtUebersetzt(pfad);
  const hauptRef = useRef(null);
  const ersterAufruf = useRef(true);

  // Seitenwechsel (Client-Navigation): Inhalt blendet sanft ein – nur opacity/transform,
  // ohne Füllmodus, damit danach kein transform am <main> hängen bleibt (fixierte Elemente).
  // Dokument-Navigation übernimmt @view-transition in globals.css.
  useEffect(() => {
    if (ersterAufruf.current) {
      ersterAufruf.current = false;
      return;
    }
    const el = hauptRef.current;
    if (!el?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anim = el.animate(
      [
        { opacity: 0, transform: "translate3d(0, 8px, 0)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
    return () => anim.cancel();
  }, [pfad]);

  if (pfad.startsWith("/portal")) return <main id="main-content">{children}</main>;

  return (
    <>
      {/* <GoogleTagManager gtmId="GTM-WR8PDT7V" /> */}
      <RevealObserver />
      <MotionInteraktion />
      {LESESEITEN.some((r) => r.test(landAusPfad(pfad).schluessel)) && <ScrollFortschritt key={pfad} />}
      {/* Cookie-Banner vor dem Seitenkopf: in der Tab-Reihenfolge direkt nach dem Sprunglink erreichbar (fixiert positioniert) */}
      <CookieComponentLazy />
      <Navbar />
      {/* Sprachmodell: dezenter Hinweis „not yet available in English“ auf noch nicht übersetzten Seiten */}
      <NichtUebersetzt />
      {/* GRP: Offenlegung „Teil der ÖKOVOLT Gruppe“ – erscheint nur nach Gruppen-/Partnerverweis */}
      <Offenlegung land={land} />
      <main id="main-content" ref={hauptRef} lang={inhaltDeutsch ? "de" : undefined}>{children}</main>
      <Footer />
      <aside aria-label={sprache === "en" ? "Quick access" : "Schnellzugriff"}>
        <MobileCta />
        <ToTopButtonLazy />
      </aside>
    </>
  );
}
