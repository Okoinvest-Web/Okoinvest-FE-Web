"use client";

// Bedien-Schicht des Portals (einmal im PortalRahmen eingebunden):
//  - Befehlspalette (Strg/⌘+K, „/“, Suchknopf) und Tastenkürzel (g d, g b, n, ? …; abschaltbar)
//  - Fokusführung bei Seitenwechsel (Fokus auf die Überschrift, Ansage des Seitentitels)
//  - mobile Bottom-Navigation, Hinweis „Als App installieren“, Service Worker (nur Offline-Shell)

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Befehlspalette from "./Befehlspalette";
import KuerzelHilfe from "./KuerzelHilfe";
import BottomNav from "./BottomNav";
import InstallHinweis from "./InstallHinweis";
import { navigationsZiele, neuZiel } from "./befehle";
import { EREIGNIS_KUERZEL, EREIGNIS_KUERZEL_EINSTELLUNG, EREIGNIS_PALETTE, KUERZEL_AUS, speicherLesen, speicherSchreiben } from "./speicher";
import { seitenleisteUmschalten } from "./speicher"; // T3: Seitenleiste ein-/ausklappen

function tipptGerade(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return !["checkbox", "radio", "button", "submit", "reset", "range"].includes(el.type);
  return !!el.closest("[role=dialog][aria-modal=true]");
}

export default function Bedienung({ nutzer, ungelesen = 0 }) {
  const router = useRouter();
  const pfad = usePathname() || "/portal";
  const [palette, setPalette] = useState(false);
  const [hilfe, setHilfe] = useState(false);
  const [kuerzelAn, setKuerzelAn] = useState(true);
  const [folge, setFolge] = useState(""); // „g“ gedrückt, wartet auf zweite Taste
  const [ansage, setAnsage] = useState("");
  const folgeTimer = useRef(null);
  const ersterPfad = useRef(true);
  const rollen = nutzer?.rollen || [];

  useEffect(() => {
    setKuerzelAn(!speicherLesen(KUERZEL_AUS, false));
    const neu = () => setKuerzelAn(!speicherLesen(KUERZEL_AUS, false));
    window.addEventListener(EREIGNIS_KUERZEL_EINSTELLUNG, neu);
    return () => window.removeEventListener(EREIGNIS_KUERZEL_EINSTELLUNG, neu);
  }, []);

  const kuerzelSetzen = useCallback((an) => {
    speicherSchreiben(KUERZEL_AUS, an ? null : true);
    setKuerzelAn(an);
    window.dispatchEvent(new CustomEvent(EREIGNIS_KUERZEL_EINSTELLUNG));
  }, []);

  // Onboarding-Merker „Schnellsuche ausprobiert“ (einmal je Browser)
  const paletteAuf = useCallback(() => {
    setHilfe(false);
    setPalette(true);
    const merker = `oi-palette-probiert:${nutzer?.id}`;
    if (!speicherLesen(merker, false)) {
      speicherSchreiben(merker, true);
      fetch("/api/portal/onboarding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erledigt: ["bedienung"] }), credentials: "same-origin" }).catch(() => {});
    }
  }, [nutzer?.id]);

  const abmelden = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    router.replace("/login?hinweis=abgemeldet");
    router.refresh();
  }, [router]);

  const beiAktion = useCallback(
    (a) => {
      if (a === "abmelden") abmelden();
      else if (a === "kuerzel") setHilfe(true);
      else if (a === "seitenleiste") seitenleisteUmschalten(); // T3
    },
    [abmelden]
  );

  // Globale Tasten
  useEffect(() => {
    const ziele = navigationsZiele(rollen);
    const gehe = Object.fromEntries(ziele.filter((z) => z.kuerzel?.startsWith("g ")).map((z) => [z.kuerzel.slice(2), z.href]));
    const neu = neuZiel(rollen);

    const taste = (e) => {
      // Strg/⌘+K immer (auch in Eingabefeldern)
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (palette) setPalette(false);
        else paletteAuf();
        return;
      }
      if (palette || hilfe || e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (tipptGerade(document.activeElement)) return;
      if (!kuerzelAn) return;

      if (folge === "g") {
        const ziel = gehe[e.key.toLowerCase()];
        setFolge("");
        clearTimeout(folgeTimer.current);
        if (ziel) {
          e.preventDefault();
          router.push(ziel);
        }
        return;
      }
      if (e.key === "?" ) {
        e.preventDefault();
        setHilfe(true);
      } else if (e.key === "[") {
        // T3: Seitenleiste ein-/ausklappen (Desktop)
        e.preventDefault();
        seitenleisteUmschalten();
      } else if (e.key === "/") {
        e.preventDefault();
        paletteAuf();
      } else if (e.key === "g") {
        setFolge("g");
        clearTimeout(folgeTimer.current);
        folgeTimer.current = setTimeout(() => setFolge(""), 1500);
      } else if (e.key === "n" && neu) {
        e.preventDefault();
        router.push(neu);
      }
    };
    document.addEventListener("keydown", taste);
    const auf = () => paletteAuf();
    const kz = () => setHilfe(true);
    window.addEventListener(EREIGNIS_PALETTE, auf);
    window.addEventListener(EREIGNIS_KUERZEL, kz);
    return () => {
      document.removeEventListener("keydown", taste);
      window.removeEventListener(EREIGNIS_PALETTE, auf);
      window.removeEventListener(EREIGNIS_KUERZEL, kz);
    };
    // rollen als Schlüssel, damit sich die Liste nur bei Rollenwechsel neu baut
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, hilfe, kuerzelAn, folge, router, paletteAuf, rollen.join(",")]);

  // Fokusführung bei Seitenwechsel (WCAG 2.4.3): Fokus auf die Hauptüberschrift, Titel ansagen
  useEffect(() => {
    if (ersterPfad.current) {
      ersterPfad.current = false;
      return undefined;
    }
    const t = setTimeout(() => {
      if (window.location.hash) return; // Sprungmarke (#suchprofil) nicht überschreiben
      const inhalt = document.getElementById("portal-inhalt");
      if (!inhalt) return;
      const h1 = inhalt.querySelector("h1");
      const ziel = h1 || inhalt;
      if (h1 && !h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
      if (h1) h1.classList.add("outline-none");
      ziel.focus({ preventScroll: true });
      setAnsage(`${(h1?.textContent || document.title || "Seite").trim()} – Seite geladen`);
    }, 120);
    return () => clearTimeout(t);
  }, [pfad]);

  // Service Worker nur für die Offline-Shell des Portals (keine Daten im Cache)
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register("/sw-portal.js", { scope: "/portal" }).catch(() => {});
  }, []);

  return (
    <>
      <p className="sr-only" aria-live="polite" role="status">{ansage}</p>
      <Befehlspalette nutzer={nutzer} offen={palette} setOffen={setPalette} beiAktion={beiAktion} />
      <KuerzelHilfe offen={hilfe} setOffen={setHilfe} rollen={rollen} kuerzelAn={kuerzelAn} setKuerzelAn={kuerzelSetzen} />
      {folge === "g" && (
        <div aria-live="polite" className="pointer-events-none fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-navy-950 px-4 py-2 text-[13px] font-semibold text-white shadow-lg lg:bottom-8">
          Gehe zu … <kbd className="ml-1 rounded bg-white/15 px-1.5">g</kbd> + Taste
        </div>
      )}
      <InstallHinweis pfad={pfad} />
      <BottomNav rollen={rollen} nutzer={nutzer} pfad={pfad} ungelesen={ungelesen} onSuche={paletteAuf} />
    </>
  );
}
