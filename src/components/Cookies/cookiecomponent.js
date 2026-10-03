"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { setCookie } from "cookies-next";
import CookieDetails from "./coookieItem";
import Link from "next/link";
import { Circle } from "lucide-react";
import useFokusFalle from "@/components/ui/useFokusFalle";
import {
  EINWILLIGUNG_COOKIE,
  EINWILLIGUNG_EREIGNIS,
  EINWILLIGUNG_LAUFZEIT_S,
  OHNE_EINWILLIGUNG,
  einwilligungErstellen,
  einwilligungLesen,
} from "@/lib/ereignis/einwilligung";

// TEXTE: Entwurf (Paket B, Welle 1) – Freigabe durch Strang R (Rechtstexte) steht aus.
// Fassung der Texte: EINWILLIGUNG_VERSION in src/lib/ereignis/einwilligung.js – bei jeder inhaltlichen Änderung
// hochzählen, dann werden alle Besucher neu gefragt.
//
// Es gibt nur zwei Kategorien: „Essenziell“ (ohne Einwilligung) und „Statistik“ (Google Analytics, nur mit
// Einwilligung). Funktionale Drittdienste (z. B. eingebettete Karten) nutzt die Website nicht – die frühere
// Kategorie „Google Maps“ ist entfernt.
export const cookieServices = {
  statistics: {
    googleAnalytics: {
      title: "Google Analytics",
      description: "Erstellt Statistiken darüber, wie unsere öffentlichen Seiten genutzt werden.",
      // Quelle zur IP-Verarbeitung: https://support.google.com/analytics/answer/12017362 (abgerufen 03.10.2026)
      purpose:
        "Google Analytics 4 erfasst, welche öffentlichen Seiten aufgerufen werden, über welche Quelle (z. B. Suchmaschine oder Kampagne) Besucher kommen sowie Gerät, Browser und ungefähren Standort (Land/Region). Zusätzlich können einzelne Aktionen ohne Inhalte gezählt werden, etwa dass eine Anfrage abgeschickt wurde – nie Namen, E-Mail-Adressen, Telefonnummern oder Formularinhalte. Nicht gemessen werden das Kundenportal, persönliche Einladungs- und Anmeldelinks sowie Angebotslinks mit Code. Wir nutzen die Daten nur, um die Website zu verbessern – ohne Werbefunktionen, ohne Google Signals und ohne Personalisierung. Ihre IP-Adresse wird technisch an Google übermittelt; nach Angaben von Google wird sie bei Zugriffen aus der EU und der Schweiz nur zur groben Standortbestimmung verwendet und danach verworfen.",
      provider: "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland",
      contact: {
        privacy: "https://policies.google.com/privacy",
      },
      // Laufzeiten laut https://support.google.com/analytics/answer/11397207 (abgerufen 03.10.2026)
      cookies: [
        { name: "_ga", type: "HTTP-Cookie", duration: "2 Jahre" },
        { name: "_ga_<ID>", type: "HTTP-Cookie", duration: "2 Jahre" },
      ],
      // ZU PRÜFEN vor Livegang (Strang R): aktive DPF-Zertifizierung von Google LLC auf dataprivacyframework.gov
      dataProcessing: {
        countries: [{ name: "Vereinigte Staaten" }],
        mechanisms: [{ name: "Angemessenheitsbeschluss der EU-Kommission (EU-US Data Privacy Framework, Art. 45 DSGVO)" }],
      },
    },
  },
};

function zeitText(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export default function CookieBanner({ forceShow = false, onClose }) {
  const router = useRouter();
  const [isShown, setIsShown] = useState(false);
  const [isCompact, setIsCompact] = useState(true);

  const [showBanner, setShowBanner] = useState(forceShow);
  const [expandedSections, setExpandedSections] = useState({ statistics: false });
  const [expandedServices, setExpandedServices] = useState({});
  const [consent, setConsent] = useState(OHNE_EINWILLIGUNG);
  const [gespeichert, setGespeichert] = useState(null);

  useEffect(() => {
    const vorhanden = einwilligungLesen();
    if (!vorhanden) {
      // Kein Cookie, ungültig oder alte Fassung: neu fragen, bis dahin gilt „keine Einwilligung“
      setShowBanner(true);
      return;
    }
    // Beim erneuten Öffnen die bisherige Auswahl anzeigen
    setConsent({ essential: true, statistics: vorhanden.statistics, googleAnalytics: vorhanden.googleAnalytics });
    setGespeichert(vorhanden);
  }, []);

  const saveConsent = (auswahl) => {
    const wert = einwilligungErstellen(auswahl);
    setCookie(EINWILLIGUNG_COOKIE, JSON.stringify(wert), {
      maxAge: EINWILLIGUNG_LAUFZEIT_S,
      path: "/",
      sameSite: "lax",
      secure: typeof location !== "undefined" && location.protocol === "https:",
    });
    setGespeichert(wert);
    // Google Analytics sofort (ohne Neuladen) starten bzw. stoppen
    window.dispatchEvent(new CustomEvent(EINWILLIGUNG_EREIGNIS, { detail: wert }));
    setShowBanner(false);
    if (onClose) onClose();
    router.refresh();
  };

  const handleAcceptAll = () => {
    const alle = { essential: true, statistics: true, googleAnalytics: true };
    setConsent(alle);
    saveConsent(alle);
  };

  /** Nur die ausdrücklich angehakten Kategorien */
  const handleAcceptSelected = () => saveConsent(consent);

  /** „Nur notwendige“ und „Weiter ohne Einwilligung“: lehnt alles Optionale ab – unabhängig von Häkchen */
  const handleRejectAll = () => {
    setConsent(OHNE_EINWILLIGUNG);
    saveConsent(OHNE_EINWILLIGUNG);
  };

  const toggleStatistik = () => {
    setConsent((prev) => {
      const neu = !prev.statistics;
      return { ...prev, statistics: neu, googleAnalytics: neu };
    });
  };

  const toggleCategoryDetails = (category) => setExpandedSections((prev) => ({ ...prev, [category]: !prev[category] }));
  const toggleServiceDetails = (service) => setExpandedServices((prev) => ({ ...prev, [service]: !prev[service] }));

  const toggleCompact = () => {
    setIsCompact(!isCompact);
    setIsShown(true);
  };

  // Tastatur & Screenreader: Detailansicht ist ein modaler Dialog
  const sichtbar = forceShow || showBanner;
  const kompaktTitel = useRef(null);
  const individuellKnopf = useRef(null);
  const detailDialog = useRef(null);
  const detailTitel = useRef(null);
  useFokusFalle(sichtbar && !isCompact, detailDialog, {
    beiEscape: () => setIsCompact(true),
    startRef: detailTitel,
    rueckgabeRef: individuellKnopf,
  });

  // Über „Privatsphäre-Einstellungen“ geöffnet: Fokus direkt in den Banner
  useEffect(() => {
    if (forceShow) kompaktTitel.current?.focus({ preventScroll: true });
  }, [forceShow]);

  if (!sichtbar) return null;
  if (isCompact) {
    return (
      <div
        role="region"
        aria-label="Cookie-Einstellungen"
        className="ov-hero-in fixed inset-x-3 bottom-3 z-[9600] md:inset-x-auto md:bottom-6 md:left-6 md:max-w-[440px]"
      >
        <div className="rounded-3xl bg-white p-5 shadow-[0_30px_70px_-20px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 md:p-6">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-[20px]">🍪</span>
            <div>
              <h2 ref={kompaktTitel} tabIndex={-1} className="font-display text-[16.5px] font-bold text-ink-900 focus:outline-none">Ihre Privatsphäre zählt</h2>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">
                Mit Ihrer Zustimmung nutzen wir Google Analytics für Besucherstatistiken auf unseren öffentlichen Seiten.
                Ohne Zustimmung wird Google Analytics nicht geladen und es werden keine Daten an Google übertragen.
                Sie können Ihre Wahl jederzeit unter „Privatsphäre-Einstellungen“ im Fußbereich ändern.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={handleRejectAll}
              className="h-11 cursor-pointer rounded-full bg-ink-900 px-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink-800"
            >
              Nur notwendige
            </button>
            <button
              onClick={handleAcceptAll}
              className="h-11 cursor-pointer rounded-full bg-ov-600 px-3 text-[14px] font-semibold text-white transition-colors hover:bg-ov-700"
            >
              Alle akzeptieren
            </button>
          </div>
          <button
            ref={individuellKnopf}
            onClick={toggleCompact}
            aria-haspopup="dialog"
            className="mt-3 w-full cursor-pointer text-center text-[13px] font-medium text-ink-600 underline-offset-2 transition-colors hover:text-ink-800 hover:underline"
          >
            Individuelle Einstellungen
          </button>
          <p className="mt-2 flex justify-center gap-3 text-[12.5px] text-ink-600">
            <Link href="/datenschutz" className="underline underline-offset-2 hover:text-ink-800">Datenschutzerklärung</Link>
            <Link href="/impressum" className="underline underline-offset-2 hover:text-ink-800">Impressum</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[9700] backdrop-blur-sm" />
      <div className={`fixed inset-0 flex items-center justify-center z-[9701] pointer-events-none`}>
        <div
          ref={detailDialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ov-cookie-detail-titel"
          tabIndex={-1}
          className="max-h-[100dvh] h-full lg:max-w-[800px] lg:max-h-[80vh] bg-white lg:rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto overflow-y-auto relative lg:h-auto focus:outline-none"
        >
          <h2 ref={detailTitel} id="ov-cookie-detail-titel" tabIndex={-1} className="text-2xl font-bold text-gray-800 p-6 sticky bg-white z-10 pb-4 top-0 md:relative focus:outline-none">
            Individuelle Privatsphäre-Präferenzen
          </h2>
          <div className="p-6 border-b border-gray-200 flex justify-between flex-col-reverse items-start md:flex-row relative">
            <div className="w-[100%] flex-1 md:w-[60%]">
              <p className="text-gray-600 text-sm">
                Technisch notwendige Cookies setzen wir ohne Einwilligung ein – etwa für die Anmeldung im Portal und um
                diese Auswahl zu speichern. Google Analytics laden wir nur, wenn Sie der Kategorie „Statistik“ zustimmen.
                Ihre Einwilligung ist freiwillig und für die Nutzung der Website nicht erforderlich. Sie können sie jederzeit
                über „Privatsphäre-Einstellungen“ im Fußbereich jeder Seite widerrufen; der Widerruf wirkt für die Zukunft.
              </p>
              {gespeichert && (
                <p className="mt-3 text-xs text-gray-600">
                  Ihre aktuelle Auswahl: Statistik {gespeichert.statistics ? "erlaubt" : "abgelehnt"}
                  {zeitText(gespeichert.zeit) ? `, gespeichert am ${zeitText(gespeichert.zeit)}` : ""} (Fassung {gespeichert.v}).
                </p>
              )}
            </div>
            <div className={`flex flex-col space-y-3 w-[100%] md:w-[40%] md:ml-4 transition-all duration-200 mb-4`}>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-white bg-[#4d7a1a] rounded-lg hover:bg-[#3f6515] transition-colors text-sm whitespace-nowrap cursor-pointer"
              >
                Alle akzeptieren
              </button>
              <button
                onClick={handleAcceptSelected}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap cursor-pointer"
              >
                Auswahl speichern
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap cursor-pointer"
              >
                Weiter ohne Einwilligung
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-1 p-6 pb-2 text-xs">
            Google Analytics wird von Google Ireland Limited betrieben. Dabei können Daten auch an Google LLC in den USA
            übermittelt werden. Die Übermittlung stützt sich auf den Angemessenheitsbeschluss der EU-Kommission zum
            EU-US Data Privacy Framework (Art. 45 DSGVO), unter dem Google LLC zertifiziert ist.
          </p>
          <div className="mt-3">
            <button
              type="button"
              className={`text-center text-sm text-[var(--secondry)]/80 ${isShown && `hidden`} md:hidden pb-4 cursor-pointer bg-transparent border-0 w-full`}
              onClick={() => setIsShown(!isShown)}
              aria-expanded={isShown}
            >
              Individuelle Privatsphäre-Präferenzen
            </button>
          </div>

          <div className={`flex-1 p-6 space-y-6 ${isShown ? "block" : "hidden"} md:block`}>
            {/* Essenzielle Cookies */}
            <div className="space-y-2 border border-[var(--secondary)]/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <label htmlFor="essential-cookies" className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="essential-cookies"
                      checked={consent.essential}
                      disabled
                      className="h-5 w-5 rounded border-gray-300 text-navy-700 focus:ring-ov-500 cursor-pointer"
                    />
                    <span className="font-medium text-gray-900">Essenziell</span>
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-500 ml-8">
                Essenzielle Cookies sind für die grundlegende Funktion der Website erforderlich (z. B. Anmeldung im Portal,
                Speichern dieser Auswahl im Cookie „cookieConsent“ für 12 Monate). Sie können nicht abgelehnt werden.
              </p>
            </div>

            {/* Statistik */}
            <div className="space-y-4 border border-[var(--secondary)]/20 p-6">
              <div className="flex items-center justify-start gap-2">
                <label htmlFor="statistics-cookies" className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="statistics-cookies"
                    checked={consent.statistics}
                    onChange={toggleStatistik}
                    className="h-5 w-5 rounded border-gray-300 text-navy-700 focus:ring-ov-500 cursor-pointer"
                  />
                  <span className="font-medium text-gray-900">Statistik (1)</span>
                </label>
              </div>
              <p className="text-sm text-gray-500 ml-8">
                Statistik-Dienste helfen uns zu verstehen, wie Besucher unsere Website nutzen, damit wir sie verbessern
                können. Sie werden erst nach Ihrer Zustimmung geladen. Details in der{" "}
                <Link href="/datenschutz#statistik" className="font-medium text-ov-700 underline">
                  Datenschutzerklärung
                </Link>
                .&nbsp;&nbsp;
                <button
                  type="button"
                  onClick={() => toggleCategoryDetails("statistics")}
                  aria-expanded={expandedSections.statistics}
                  className="text-sm font-medium text-navy-700 hover:text-navy-900 hover:underline cursor-pointer bg-transparent border-0 p-0"
                >
                  {expandedSections.statistics ? "Details ausblenden" : "Details anzeigen"}
                </button>
              </p>
              {expandedSections.statistics && (
                <div className="ml-8 space-y-2">
                  <label htmlFor="google-analytics" className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="google-analytics"
                      checked={consent.googleAnalytics}
                      onChange={toggleStatistik}
                      className="h-5 w-5 rounded border-gray-300 text-navy-700 focus:ring-ov-500 cursor-pointer"
                    />
                    <span className="font-medium text-black">{cookieServices.statistics.googleAnalytics.title}</span>
                  </label>
                  <p className="text-sm text-gray-500 ml-8">
                    {cookieServices.statistics.googleAnalytics.description}&nbsp;&nbsp;
                    <button
                      type="button"
                      onClick={() => toggleServiceDetails("googleAnalytics")}
                      aria-expanded={expandedServices.googleAnalytics}
                      className="text-sm font-medium text-navy-700 hover:text-navy-900 cursor-pointer bg-transparent border-0 p-0"
                    >
                      {expandedServices.googleAnalytics ? "Details ausblenden" : "Details anzeigen"}
                    </button>
                  </p>
                  {expandedServices.googleAnalytics && <CookieDetails service={cookieServices.statistics.googleAnalytics} />}
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-gray-200 bg-gray-50 p-2 sticky bottom-0">
            <p className="text-center text-sm text-gray-600 gap-1 flex justify-center items-center">
              <Link href={"/datenschutz"} className="cursor-pointer">Datenschutzerklärung</Link>
              <Circle aria-hidden="true" />
              <Link href={"/impressum"} className="cursor-pointer">Impressum</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
