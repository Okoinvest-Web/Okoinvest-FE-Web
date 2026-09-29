"use client";

import { useEffect, useRef } from "react";

const FOKUSSIERBAR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Sichtbare, per Tab erreichbare Elemente innerhalb eines Containers */
function fokusElemente(container) {
  return Array.from(container.querySelectorAll(FOKUSSIERBAR)).filter((el) => {
    if (el.closest("[inert]")) return false;
    const stil = window.getComputedStyle(el);
    if (stil.visibility === "hidden" || stil.display === "none") return false;
    return el.getClientRects().length > 0;
  });
}

/**
 * Fokusfalle für modale Dialoge (WCAG 2.1.2, 2.4.3):
 *  - beim Öffnen: merkt sich das zuvor fokussierte Element und setzt den Fokus
 *    auf `startRef` bzw. das erste fokussierbare Element im Dialog
 *  - solange aktiv: Tab/Umschalt+Tab bleiben im Dialog, Escape ruft `beiEscape`
 *  - beim Schließen: Fokus zurück auf das gemerkte Element (bzw. `rueckgabeRef`)
 *
 * @param {boolean} aktiv
 * @param {{ current: HTMLElement|null }} containerRef
 * @param {{ beiEscape?: () => void, startRef?: { current: HTMLElement|null }, rueckgabeRef?: { current: HTMLElement|null } }} [optionen]
 */
export default function useFokusFalle(aktiv, containerRef, { beiEscape, startRef, rueckgabeRef } = {}) {
  const escapeRef = useRef(beiEscape);
  escapeRef.current = beiEscape;
  const startElRef = useRef(startRef);
  startElRef.current = startRef;
  const rueckgabeElRef = useRef(rueckgabeRef);
  rueckgabeElRef.current = rueckgabeRef;

  useEffect(() => {
    if (!aktiv) return undefined;
    const vorher = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const knoten = containerRef.current;

    // Einen Frame warten, damit Sichtbarkeits-Klassen bereits greifen
    const raf = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container || container.contains(document.activeElement)) return;
      const ziel = startElRef.current?.current || fokusElemente(container)[0] || container;
      ziel.focus({ preventScroll: true });
    });

    const taste = (e) => {
      const container = containerRef.current;
      if (!container) return;
      if (e.key === "Escape" && escapeRef.current) {
        e.stopPropagation();
        escapeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const elemente = fokusElemente(container);
      if (elemente.length === 0) {
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const erstes = elemente[0];
      const letztes = elemente[elemente.length - 1];
      const aktuell = document.activeElement;
      if (!container.contains(aktuell)) {
        e.preventDefault();
        (e.shiftKey ? letztes : erstes).focus();
      } else if (e.shiftKey && (aktuell === erstes || aktuell === container)) {
        e.preventDefault();
        letztes.focus();
      } else if (!e.shiftKey && aktuell === letztes) {
        e.preventDefault();
        erstes.focus();
      }
    };
    document.addEventListener("keydown", taste);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", taste);
      const ziel = rueckgabeElRef.current?.current || vorher;
      const fokusImDialog = !document.activeElement || document.activeElement === document.body || knoten?.contains(document.activeElement);
      // Nur zurückgeben, wenn der Fokus nicht bereits bewusst woanders hin gesetzt wurde
      if (ziel && ziel.isConnected && fokusImDialog) {
        requestAnimationFrame(() => {
          if (ziel.getClientRects().length > 0) ziel.focus({ preventScroll: true });
        });
      }
    };
  }, [aktiv, containerRef]);
}
