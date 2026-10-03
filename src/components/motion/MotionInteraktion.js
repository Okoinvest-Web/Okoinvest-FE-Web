"use client";

import { useEffect } from "react";

const ZEIGER = ".ov-spotlight, .ov-magnet, .ov-kipp";
const ENDLOS = '.ov-endlos, .ov-live-punkt, [class*="animate-ov-float"], [class*="animate-ov-ping"], [class*="animate-ov-marquee"]';

/**
 * Globale Interaktions-Schicht (einmal im LayoutWrapper eingebunden, rendert nichts).
 *
 * 1. Zeiger-Effekte per Event-Delegation – EIN passiver pointermove-Listener für
 *    die ganze Seite, Schreiben gebündelt per requestAnimationFrame, nur CSS-
 *    Variablen auf transform (kein Layout). Rechtecke werden beim Betreten
 *    gemessen und bei Scroll/Resize verworfen (kein Layout-Thrashing).
 *      .ov-spotlight → --ov-mx/--ov-my (Lichtkegel)
 *      .ov-magnet    → --ov-mag-x/--ov-mag-y (max. 8 px), Stärke per data-magnet
 *      .ov-kipp      → --ov-kx/--ov-ky (max. 3°), Winkel per data-kipp
 *    Aktiv nur bei (hover: hover) and (pointer: fine) und ohne reduzierte Bewegung.
 *
 * 2. Endlos-Animationen außerhalb des Viewports anhalten: .ov-endlos und bekannte
 *    Endlos-Klassen bekommen .ov-aus (animation-play-state: paused), solange sie
 *    nicht sichtbar sind. Neue Elemente werden per MutationObserver erfasst.
 */
export default function MotionInteraktion() {
  // ---------- 1. Zeiger ----------
  useEffect(() => {
    const fein = window.matchMedia("(hover: hover) and (pointer: fine)");
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    const rechtecke = new WeakMap();
    let aktiv = []; // Elemente unter dem Zeiger
    let raf = 0;
    let x = 0;
    let y = 0;

    const rect = (el) => {
      let r = rechtecke.get(el);
      if (!r) {
        r = el.getBoundingClientRect();
        rechtecke.set(el, r);
      }
      return r;
    };

    const zuruecksetzen = (el) => {
      el.classList.remove("ov-zeiger-an");
      if (el.classList.contains("ov-magnet")) {
        el.style.removeProperty("--ov-mag-x");
        el.style.removeProperty("--ov-mag-y");
      }
      if (el.classList.contains("ov-kipp")) {
        el.style.removeProperty("--ov-kx");
        el.style.removeProperty("--ov-ky");
      }
      // Spotlight behält seine Position und blendet nur aus (wirkt ruhiger)
    };

    const zeichnen = () => {
      raf = 0;
      for (const el of aktiv) {
        const r = rect(el);
        const lx = x - r.left;
        const ly = y - r.top;
        if (el.classList.contains("ov-spotlight")) {
          el.style.setProperty("--ov-mx", `${lx.toFixed(1)}px`);
          el.style.setProperty("--ov-my", `${ly.toFixed(1)}px`);
        }
        if (el.classList.contains("ov-magnet")) {
          const k = Math.min(Number(el.dataset.magnet) || 0.25, 0.4);
          const dx = Math.max(-8, Math.min(8, (lx - r.width / 2) * k));
          const dy = Math.max(-6, Math.min(6, (ly - r.height / 2) * k));
          el.style.setProperty("--ov-mag-x", `${dx.toFixed(2)}px`);
          el.style.setProperty("--ov-mag-y", `${dy.toFixed(2)}px`);
        }
        if (el.classList.contains("ov-kipp")) {
          const g = Math.min(Number(el.dataset.kipp) || 3, 5);
          const nx = (lx / r.width - 0.5) * 2; // -1 … 1
          const ny = (ly / r.height - 0.5) * 2;
          el.style.setProperty("--ov-ky", `${(nx * g).toFixed(2)}deg`);
          el.style.setProperty("--ov-kx", `${(-ny * g).toFixed(2)}deg`);
        }
      }
    };

    const bewegen = (e) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      x = e.clientX;
      y = e.clientY;
      const ziel = e.target instanceof Element ? e.target : null;
      const neu = [];
      let n = ziel?.closest(ZEIGER);
      while (n) {
        neu.push(n);
        n = n.parentElement?.closest(ZEIGER);
      }
      for (const el of aktiv) if (!neu.includes(el)) zuruecksetzen(el);
      for (const el of neu) {
        if (!aktiv.includes(el)) {
          rechtecke.delete(el);
          el.classList.add("ov-zeiger-an");
        }
      }
      aktiv = neu;
      if (aktiv.length && !raf) raf = requestAnimationFrame(zeichnen);
    };

    const verlassen = () => {
      for (const el of aktiv) zuruecksetzen(el);
      aktiv = [];
    };
    // Rechtecke ändern sich beim Scrollen – beim nächsten Frame neu messen
    const verwerfen = () => {
      for (const el of aktiv) rechtecke.delete(el);
    };

    let an = false;
    const schalten = () => {
      const soll = fein.matches && !ruhig.matches;
      if (soll === an) return;
      an = soll;
      if (an) {
        document.addEventListener("pointermove", bewegen, { passive: true });
        document.documentElement.addEventListener("pointerleave", verlassen);
        window.addEventListener("scroll", verwerfen, { passive: true });
        window.addEventListener("resize", verwerfen, { passive: true });
      } else {
        document.removeEventListener("pointermove", bewegen);
        document.documentElement.removeEventListener("pointerleave", verlassen);
        window.removeEventListener("scroll", verwerfen);
        window.removeEventListener("resize", verwerfen);
        verlassen();
      }
    };
    schalten();
    fein.addEventListener?.("change", schalten);
    ruhig.addEventListener?.("change", schalten);
    return () => {
      fein.removeEventListener?.("change", schalten);
      ruhig.removeEventListener?.("change", schalten);
      document.removeEventListener("pointermove", bewegen);
      document.documentElement.removeEventListener("pointerleave", verlassen);
      window.removeEventListener("scroll", verwerfen);
      window.removeEventListener("resize", verwerfen);
      cancelAnimationFrame(raf);
      verlassen();
    };
  }, []);

  // ---------- 2. Endlos-Animationen außerhalb des Viewports anhalten ----------
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const beobachtet = new WeakSet();
    const io = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) e.target.classList.toggle("ov-aus", !e.isIntersecting);
      },
      { rootMargin: "100px 0px" }
    );
    const erfassen = () => {
      document.querySelectorAll(ENDLOS).forEach((el) => {
        if (beobachtet.has(el)) return;
        beobachtet.add(el);
        io.observe(el);
      });
    };
    erfassen();
    // gedrosselt (nicht entprellt) – Ticker ändern das DOM ständig
    let timer = 0;
    const mo = new MutationObserver(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = 0;
        erfassen();
      }, 400);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return null;
}
