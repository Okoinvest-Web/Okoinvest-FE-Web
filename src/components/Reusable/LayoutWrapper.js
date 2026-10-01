"use client";
import Navbar from "@/components/Navbar/navbar";
import Footer from "@/components/Reusable/footer";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { herkunftErfassen } from "@/lib/herkunft";
import RevealObserver from "@/components/ui/RevealObserver";
import MobileCta from "@/components/Reusable/MobileCta";

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
      {/* Cookie-Banner vor dem Seitenkopf: in der Tab-Reihenfolge direkt nach dem Sprunglink erreichbar (fixiert positioniert) */}
      <CookieComponentLazy />
      <Navbar />
      <main id="main-content" ref={hauptRef}>{children}</main>
      <Footer />
      <aside aria-label="Schnellzugriff">
        <MobileCta />
        <ToTopButtonLazy />
      </aside>
    </>
  );
}
