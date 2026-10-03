"use client";

import { useEffect, useState } from "react";

// Bedienelemente, die eine feste Leiste unten nicht verdecken darf
const BEDIENELEMENTE =
  'main :is(form, button, [role="button"], input:not([type="hidden"]), select, textarea, summary, [data-ov-cta], a[class*="rounded-full"], a[class*="rounded-xl"][class*="bg-"], a[class*="rounded-2xl"][class*="bg-"], a.ov-press), footer :is(a, button)';
const BAND = 104; // px: Leiste (60) + Abstand (12) + sichere Zone + Luft
const FELD = 'input:not([type="checkbox"], [type="radio"], [type="range"], [type="button"], [type="submit"], [type="reset"], [type="hidden"]), select, textarea, [contenteditable="true"]';

/**
 * useFreieUnterkante – Entscheidungshilfe für feste Leisten am unteren Rand
 * (MobileCta, Nach-oben-Knopf). Liefert, ob die Leiste gerade zurücktreten soll.
 *
 * - feld:      ein Texteingabefeld hat den Fokus oder die Bildschirmtastatur ist offen
 * - konflikt:  nach dem Scrollen (Ruhe ≥ 220 ms) liegt ein Bedienelement im unteren
 *              Band (104 px), das die Leiste verdecken würde. Entschieden wird nur im
 *              Ruhezustand – kein Flackern während der Bewegung.
 * - optOut:    die Seite enthält ein Element mit `data-ov-keine-leiste`
 *
 * Seiten können ein Element ausdrücklich schützen: `data-ov-cta` setzen.
 *
 * @param {object} [o]
 * @param {boolean} [o.aktiv=true]  Beobachtung nur, wenn die Leiste überhaupt erscheinen kann.
 * @param {string}  [o.pfad]        Aktueller Pfad (für Neu-Erfassung bei Routenwechsel).
 * @param {number}  [o.breite]      Nur Elemente im rechten Streifen dieser Breite (px) zählen
 *                                  (z. B. 112 für einen runden Knopf rechts unten). Ohne: volle Breite.
 * @returns {{ feld: boolean, konflikt: boolean, optOut: boolean, zuruecktreten: boolean }}
 */
export default function useFreieUnterkante({ aktiv = true, pfad, breite } = {}) {
  const [feld, setFeld] = useState(false);
  const [konflikt, setKonflikt] = useState(false);
  const [optOut, setOptOut] = useState(false);

  // Fokus in Feldern / Bildschirmtastatur
  useEffect(() => {
    if (!aktiv) return undefined;
    const pruefen = () => {
      const a = document.activeElement;
      const imFeld = !!a && a instanceof Element && a.matches(FELD);
      const vv = window.visualViewport;
      const tastatur = !!vv && vv.height < window.innerHeight * 0.75;
      setFeld(imFeld || tastatur);
    };
    const spaeter = () => setTimeout(pruefen, 0);
    document.addEventListener("focusin", pruefen);
    document.addEventListener("focusout", spaeter);
    window.visualViewport?.addEventListener("resize", pruefen);
    pruefen();
    return () => {
      document.removeEventListener("focusin", pruefen);
      document.removeEventListener("focusout", spaeter);
      window.visualViewport?.removeEventListener("resize", pruefen);
    };
  }, [aktiv]);

  // Bedienelemente im unteren Band
  useEffect(() => {
    if (!aktiv || typeof IntersectionObserver === "undefined") return undefined;
    setOptOut(!!document.querySelector("[data-ov-keine-leiste]"));
    const imBand = new Set();
    let ruhe = 0;
    const beobachtet = new WeakSet();
    const io = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          if (e.isIntersecting) imBand.add(e.target);
          else imBand.delete(e.target);
        }
        // auch ohne Scrollen (Inhalt wächst, Karussell wechselt) neu entscheiden
        spaeterPruefen();
      },
      // nur das untere Band (Höhe der Leiste + Luft) zählt
      { rootMargin: `-${Math.max(0, window.innerHeight - BAND)}px 0px 0px 0px`, threshold: 0 }
    );
    const erfassen = () => {
      document.querySelectorAll(BEDIENELEMENTE).forEach((el) => {
        if (beobachtet.has(el)) return;
        beobachtet.add(el);
        io.observe(el);
      });
    };
    erfassen();

    // Nur im Ruhezustand neu entscheiden: kein Aufblitzen der Leiste bei kurzen Scrollschritten
    function spaeterPruefen() {
      clearTimeout(ruhe);
      ruhe = setTimeout(() => {
        for (const el of imBand) if (!el.isConnected) imBand.delete(el);
        let treffer = imBand.size > 0;
        if (treffer && breite) {
          // einmalig nach dem Scrollen messen – nur wenige Elemente liegen im Band
          const grenze = window.innerWidth - breite;
          treffer = [...imBand].some((el) => el.getBoundingClientRect().right > grenze);
        }
        setKonflikt(treffer);
      }, 220);
    }
    const onScroll = spaeterPruefen;
    window.addEventListener("scroll", onScroll, { passive: true });

    // Gedrosselt statt entprellt: Laufende Ticker ändern das DOM ständig und
    // würden eine Entprellung endlos aufschieben.
    let timer = 0;
    const mo = new MutationObserver(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = 0;
        erfassen();
        setOptOut(!!document.querySelector("[data-ov-keine-leiste]"));
      }, 500);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(ruhe);
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      setKonflikt(false);
    };
  }, [aktiv, pfad, breite]);

  return { feld, konflikt, optOut, zuruecktreten: feld || konflikt || optOut };
}
