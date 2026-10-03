"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { EINWILLIGUNG_EREIGNIS, statistikErlaubt as erlaubtLesen } from "@/lib/ereignis/einwilligung";
import { oeffentlicherPfad } from "@/lib/ereignis/pfade";

/**
 * Google Analytics 4 – wird erst nach Einwilligung („Statistik“ im Cookie-Banner) geladen.
 *
 * Umgebungsvariable: NEXT_PUBLIC_GA_ID (Mess-ID, z. B. G-XXXXXXXXXX)
 *
 * - Vor der Einwilligung: kein Skript, keine Verbindung zu Google, keine Cookies.
 * - POSITIVLISTE (src/lib/ereignis/pfade.js): Nur öffentliche Seiten werden gemessen. Auf allen anderen Seiten
 *   (Portal, Einladungen mit Token, Anmelde-Links, /angebot/<code>, Styleguide …) wird das Skript nicht geladen;
 *   wurde es auf einer öffentlichen Seite schon geladen, ist die Messung dort per ga-disable abgeschaltet –
 *   damit senden auch automatische Ereignisse keine Token-Pfade.
 * - Google Consent Mode v2: Standard „denied“, nach Einwilligung nur analytics_storage „granted“
 *   (keine Werbe-/Personalisierungsfreigaben).
 * - Widerruf/Ablehnen: Messung wird sofort gestoppt und die _ga-Cookies werden gelöscht.
 * - Von URL-Parametern werden nur utm_* übertragen; page_location wird für alle Ereignisse bereinigt gesetzt.
 */
// Eigene GA4-Property für ÖkoInvest – ohne Mess-ID wird nichts geladen (nie die ID der DE-Seite)
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || null;

/** Altexport – bitte künftig `statistikErlaubt` aus `@/lib/ereignis` verwenden */
export function statistikErlaubt() {
  return erlaubtLesen();
}

function gtagVorbereiten() {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }
}

function bereinigteUrl(pfad) {
  const url = new URL(window.location.href);
  const utm = new URLSearchParams();
  url.searchParams.forEach((w, k) => {
    if (/^utm_(source|medium|campaign|term|content)$/.test(k)) utm.set(k, w.slice(0, 100));
  });
  const q = utm.toString();
  return `${url.origin}${pfad}${q ? `?${q}` : ""}`;
}

function laden(pfad) {
  window[`ga-disable-${GA_ID}`] = false;
  gtagVorbereiten();
  window.gtag("consent", "update", { analytics_storage: "granted" });
  // Auch automatische Ereignisse (z. B. user_engagement) nur mit bereinigter Adresse
  window.gtag("set", { page_location: bereinigteUrl(pfad), page_path: pfad, page_referrer: "" });
  window.ovMessungAktiv = true;
  if (window.ovGaGeladen) return;
  window.ovGaGeladen = true;
  window.gtag("js", new Date());
  // Seitenaufrufe senden wir selbst (bereinigte URL, Positivliste) – daher send_page_view: false
  window.gtag("config", GA_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: bereinigteUrl(pfad),
  });
  const s = document.createElement("script");
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  s.async = true;
  document.head.appendChild(s);
}

/** Nicht-öffentliche Seite: nichts senden, Cookies aber behalten (Einwilligung besteht weiter) */
function pausieren() {
  window.ovMessungAktiv = false;
  if (GA_ID) window[`ga-disable-${GA_ID}`] = true;
}

function stoppen() {
  window.ovMessungAktiv = false;
  window[`ga-disable-${GA_ID}`] = true;
  if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
  // _ga und _ga_<ID> auf allen passenden Domain-Ebenen löschen
  const teile = location.hostname.split(".");
  const domains = ["", ...teile.map((_, i) => "." + teile.slice(i).join("."))];
  document.cookie.split("; ").forEach((c) => {
    const name = c.split("=")[0];
    if (!/^_ga(_|$)/.test(name)) return;
    domains.forEach((d) => {
      document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
    });
  });
}

function seitenaufruf(pfad) {
  if (!window.ovGaGeladen || !window.ovMessungAktiv || window[`ga-disable-${GA_ID}`] || !oeffentlicherPfad(pfad)) return;
  window.gtag("event", "page_view", {
    page_location: bereinigteUrl(pfad),
    page_path: pfad,
    page_title: document.title,
  });
}

export default function GoogleAnalytics() {
  const pfad = usePathname();
  const [erlaubt, setErlaubt] = useState(null); // null = noch nicht geprüft

  useEffect(() => {
    const pruefen = () => setErlaubt(erlaubtLesen());
    pruefen();
    window.addEventListener(EINWILLIGUNG_EREIGNIS, pruefen);
    return () => window.removeEventListener(EINWILLIGUNG_EREIGNIS, pruefen);
  }, []);

  useEffect(() => {
    if (!GA_ID || erlaubt === null) return;
    if (!erlaubt) {
      stoppen(); // auch alte _ga-Cookies nach einem Widerruf bzw. bei abgelaufener Fassung entfernen
      return;
    }
    if (!oeffentlicherPfad(pfad)) {
      pausieren();
      return;
    }
    laden(pfad);
    seitenaufruf(pfad);
  }, [erlaubt, pfad]);

  return null;
}
