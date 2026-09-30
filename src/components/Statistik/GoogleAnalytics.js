"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Google Analytics 4 – wird erst nach Einwilligung („Statistik“ im Cookie-Banner) geladen.
 *
 * Umgebungsvariable: NEXT_PUBLIC_GA_ID (Mess-ID, z. B. G-XXXXXXXXXX)
 *
 * - Vor der Einwilligung: kein Skript, keine Verbindung zu Google, keine Cookies.
 * - Google Consent Mode v2: Standard „denied“, nach Einwilligung nur analytics_storage „granted“
 *   (keine Werbe-/Personalisierungsfreigaben).
 * - Widerruf: Messung wird sofort gestoppt und die _ga-Cookies werden gelöscht.
 * - Seiten mit Einmal-Tokens (/scan, /fortsetzen, /angebot) und die Info-Bildschirme (/tv) werden nie gemessen;
 *   von URL-Parametern werden nur utm_* übertragen.
 */
// Eigene GA4-Property für ÖkoInvest – ohne Mess-ID wird nichts geladen (nie die ID der DE-Seite)
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || null;
const AUSGENOMMEN = /^\/(scan|fortsetzen|tv|angebot)(\/|$)/; // angebot: persönliche Einmalcodes der Akquise-Kampagnen

export function statistikErlaubt() {
  if (typeof document === "undefined") return false;
  try {
    const roh = document.cookie.split("; ").find((c) => c.startsWith("cookieConsent="));
    if (!roh) return false;
    return JSON.parse(decodeURIComponent(roh.slice("cookieConsent=".length))).googleAnalytics === true;
  } catch {
    return false;
  }
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

function laden() {
  window[`ga-disable-${GA_ID}`] = false;
  gtagVorbereiten();
  window.gtag("consent", "update", { analytics_storage: "granted" });
  if (window.ovGaGeladen) return;
  window.ovGaGeladen = true;
  window.gtag("js", new Date());
  // Seitenaufrufe senden wir selbst (bereinigte URL, Ausnahmen) – daher send_page_view: false
  window.gtag("config", GA_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement("script");
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  s.async = true;
  document.head.appendChild(s);
}

function stoppen() {
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
  if (!window.ovGaGeladen || window[`ga-disable-${GA_ID}`] || AUSGENOMMEN.test(pfad)) return;
  const url = new URL(window.location.href);
  const utm = new URLSearchParams();
  url.searchParams.forEach((w, k) => {
    if (/^utm_(source|medium|campaign|term|content)$/.test(k)) utm.set(k, w.slice(0, 100));
  });
  const q = utm.toString();
  window.gtag("event", "page_view", {
    page_location: `${url.origin}${pfad}${q ? `?${q}` : ""}`,
    page_path: pfad,
    page_title: document.title,
  });
}

export default function GoogleAnalytics() {
  const pfad = usePathname();
  const [erlaubt, setErlaubt] = useState(null); // null = noch nicht geprüft

  useEffect(() => {
    const pruefen = () => setErlaubt(statistikErlaubt());
    pruefen();
    window.addEventListener("ov-consent", pruefen);
    return () => window.removeEventListener("ov-consent", pruefen);
  }, []);

  useEffect(() => {
    if (!GA_ID) return;
    if (erlaubt) laden();
    else if (erlaubt === false) stoppen(); // auch alte _ga-Cookies nach einem Widerruf entfernen
  }, [erlaubt]);

  useEffect(() => {
    if (GA_ID && erlaubt) seitenaufruf(pfad);
  }, [erlaubt, pfad]);

  return null;
}
