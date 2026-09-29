"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Ein einziger IntersectionObserver für alle `.ov-reveal`-Elemente der Seite.
 * Neue Elemente (Routenwechsel, nachgeladene Inhalte) erfasst ein
 * MutationObserver. Sicherheitsnetz: nach 4 s wird alles sichtbar.
 */
export default function RevealObserver() {
  const pfad = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-ready");

    const io = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    const erfassen = (knoten = document) => {
      knoten.querySelectorAll?.(".ov-reveal:not(.is-visible)").forEach((el) => io.observe(el));
    };
    erfassen();

    const mo = new MutationObserver((mutationen) => {
      for (const m of mutationen) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          if (n.classList?.contains("ov-reveal")) io.observe(n);
          erfassen(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const netz = setTimeout(() => {
      document.querySelectorAll(".ov-reveal:not(.is-visible)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight) el.classList.add("is-visible");
      });
    }, 4000);

    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(netz);
    };
  }, [pfad]);

  return null;
}
