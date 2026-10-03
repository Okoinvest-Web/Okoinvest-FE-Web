"use client";

// Länderhinweis (Welle 2, Masterplan Abschnitt 4): schließbares Banner mit einem Vorschlag aus
// /api/land. Keine Weiterleitung, keine Pflichtentscheidung, kein Dark Pattern.
//  - erscheint nur auf der Startseite und in den Länderzonen, und nur wenn der Vorschlag vom
//    Land der Seite abweicht und noch keine Länderwahl getroffen ist
//  - „Zur Fassung für …“ und „Bei … bleiben“ sind aktive Wahlen → Cookie „land“
//  - Schließen (X oder Esc) ist keine Wahl → nur sessionStorage, kein Cookie
//  - erst nach der Entscheidung im Cookie-Banner (keine zwei Abfragen übereinander)
//  - Bots sehen ihn praktisch nie (eigene Anfrage nach dem Laden, kein Inhalt im HTML)

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, X } from "lucide-react";
import { HINWEIS_ZU, LAENDER, entsprechung, landAusCookie } from "@/lib/land";
import { EINWILLIGUNG_EREIGNIS, einwilligungLesen } from "@/lib/ereignis/einwilligung";
import useLand from "./useLand";

function sitzungLesen() {
  try {
    return window.sessionStorage.getItem(HINWEIS_ZU) === "1";
  } catch {
    return false;
  }
}

function sitzungMerken() {
  try {
    window.sessionStorage.setItem(HINWEIS_ZU, "1");
  } catch {
    /* Speicher gesperrt – Hinweis erscheint dann beim nächsten Laden erneut */
  }
}

export default function LaenderHinweis() {
  const { pfad, routenLand, waehlen } = useLand();
  const [vorschlag, setVorschlag] = useState(null);
  const [offen, setOffen] = useState(false);
  const regionRef = useRef(null);
  const passendeSeite = pfad === "/" || !!routenLand;

  function schliessen() {
    sitzungMerken();
    setOffen(false);
  }

  function bleiben() {
    if (routenLand) waehlen(routenLand);
    setOffen(false);
  }

  useEffect(() => {
    if (!passendeSeite || landAusCookie(document.cookie) || sitzungLesen()) return undefined;
    const abbruch = new AbortController();
    const laden = () =>
      fetch("/api/land", { cache: "no-store", signal: abbruch.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const v = d?.vorschlag;
          if (v && LAENDER[v] && v !== routenLand) {
            setVorschlag(v);
            setOffen(true);
          }
        })
        .catch(() => {});
    // Nie zwei Abfragen gleichzeitig: erst nach der Entscheidung im Cookie-Banner
    if (einwilligungLesen()) {
      laden();
      return () => abbruch.abort();
    }
    const nachEinwilligung = () => laden();
    window.addEventListener(EINWILLIGUNG_EREIGNIS, nachEinwilligung, { once: true });
    return () => {
      window.removeEventListener(EINWILLIGUNG_EREIGNIS, nachEinwilligung);
      abbruch.abort();
    };
  }, [passendeSeite, routenLand]);

  useEffect(() => {
    if (!offen) return undefined;
    const taste = (e) => {
      if (e.key === "Escape" && regionRef.current?.contains(document.activeElement)) schliessen();
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  });

  if (!offen || !vorschlag) return null;

  const ziel = LAENDER[vorschlag];
  const hier = routenLand ? LAENDER[routenLand] : null;
  const z = entsprechung(pfad, vorschlag);

  return (
    <div
      ref={regionRef}
      role="region"
      aria-label="Ländervorschlag"
      className="ov-hero-in fixed inset-x-3 top-[92px] z-[9550] md:inset-x-auto md:right-6 md:top-[140px] md:max-w-[400px]"
    >
      <div className="relative rounded-3xl bg-white p-5 pr-12 shadow-e4 ring-1 ring-ink-200/80">
        <button
          type="button"
          onClick={schliessen}
          aria-label="Hinweis schließen"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
          Vorschlag
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-800">
          {hier ? (
            <>
              Sie sehen die Seiten <strong className="font-semibold text-ink-900">{hier.fuerLand}</strong>. Möchten Sie zu den Seiten {ziel.fuerLand} wechseln?
            </>
          ) : (
            <>
              Es gibt eigene Seiten <strong className="font-semibold text-ink-900">{ziel.fuerLand}</strong> mit dem dort geltenden Recht.
            </>
          )}
          {z.art === "einstieg" && hier && <span className="mt-1 block text-[13.5px] text-ink-600">Diese Seite gibt es dort noch nicht – Sie kommen zur Übersicht.</span>}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={z.href}
            hrefLang={ziel.lang}
            onClick={() => waehlen(vorschlag)}
            className="ov-press inline-flex min-h-[40px] items-center justify-center rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2"
          >
            Zu den Seiten {ziel.fuerLand}
          </Link>
          {hier && (
            <button
              type="button"
              onClick={bleiben}
              className="inline-flex min-h-[40px] items-center justify-center rounded-full px-4 text-[14px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
            >
              Bei {hier.name} bleiben
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
