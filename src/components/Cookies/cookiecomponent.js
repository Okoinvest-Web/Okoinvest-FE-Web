"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { setCookie, getCookie } from "cookies-next";
import CookieDetails from "./coookieItem";
import Link from "next/link";
import { Circle } from "lucide-react";
import useFokusFalle from "@/components/ui/useFokusFalle";


// cookieData.js
export const cookieServices = {
  functional: {
    googleMaps: {
      title: "Google Maps",
      description: "Ermöglicht das Einbetten interaktiver Karten auf unserer Website.",
      purpose:
        "Google Maps ermöglicht das Einbetten von Karten direkt in Websites zur Verbesserung der Website. Dies erfordert die Verarbeitung der IP-Adresse und Metadaten des Nutzers. Cookies oder cookie-ähnliche Technologien können gespeichert und gelesen werden. Diese können personenbezogene Daten und technische Daten wie Benutzer-ID, Zustimmung, Einstellungen des Kartenbetrachters und Sicherheitstokens enthalten. Diese Daten können verwendet werden, um besuchte Websites zu erfassen, detaillierte Statistiken über das Nutzerverhalten zu erstellen und die Dienste von Google zu verbessern. Diese Daten können von Google mit den Daten von Nutzern verknüpft werden, die auf den Websites von Google eingeloggt sind (z.B. google.com und youtube.com). Google gibt personenbezogene Informationen an verbundene Unternehmen und andere vertrauenswürdige Unternehmen oder Personen weiter, um diese für sie zu verarbeiten, basierend auf den Anweisungen von Google und in Übereinstimmung mit der Datenschutzrichtlinie von Google.",
      provider: "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland",
      contact: {
        phone: "+1 650 253 0000",
        email: "dpo-google@google.com",
        privacy: "https://policies.google.com/privacy",
      },
      cookies: [
        { name: "NID", type: "HTTP Cookie", duration: "6 Monate" },
        { name: "__Secure-3PSIDCC", type: "HTTP Cookie", duration: "1 Jahr" },
        { name: "__Secure-1PSIDCC", type: "HTTP Cookie", duration: "1 Jahr" },
        { name: "SIDCC", type: "HTTP Cookie", duration: "1 Jahr" },
        { name: "__Secure-3PAPISID", type: "HTTP Cookie", duration: "13 Monate" },
        { name: "SSID", type: "HTTP Cookie", duration: "13 Monate" },
        { name: "__Secure-1PAPISID", type: "HTTP Cookie", duration: "13 Monate" },
        { name: "__Secure-3PSID", type: "HTTP Cookie", duration: "13 Monate" },
        { name: "__Secure-1PSID", type: "HTTP Cookie", duration: "13 Monate" },
        { name: "SID", type: "HTTP Cookie", duration: "13 Monate" },
        { name: "SAPISID", type: "HTTP Cookie", duration: "13 Monate" },
        { name: "APISID", type: "HTTP Cookie", duration: "13 Monate" },
        { name: "CONSENT", type: "HTTP Cookie", duration: "13 Monate" },
        { name: "__Secure-ENID", type: "HTTP Cookie", duration: "13 Monate" },
        { name: "_c;;i", type: "Local Storage", duration: "Kein Ablauf" },
        { name: "LH;;s-*", type: "Local Storage", duration: "Kein Ablauf" },
        { name: "sb_wiz.zpc.gws-wiz.", type: "Local Storage", duration: "Kein Ablauf" },
        { name: "sb_wiz.ueh", type: "Local Storage", duration: "Kein Ablauf" },
      ],
      dataProcessing: {
        countries: [
          { name: "Vereinigte Staaten", sub: "A" },
          { name: "Australien" },
          { name: "Brasilien" },
          { name: "KanadaA", sub: "A" },
          { name: "Chile" },
          { name: "Hong Kong" },
          { name: "Indien" },
          { name: "Indonesien" },
          { name: "Israel", sub: "A" },
          { name: "Japan", sub: "A" },
          { name: "Korea", sub: "A" },
          { name: "Katar" },
          { name: "Singapur" },
          { name: "Schweiz", sub: "A" },
          { name: "Taiwan" },
          { name: "Vereinigtes Königreich", sub: "A" },
        ],
        mechanisms: [{ name: "Angemessenheitsbeschluss", sub: "A" }],
      },
    },
  },
  statistics: {
    googleAnalytics: {
      title: "Google Analytics",
      description: "Erstellt Statistiken darüber, wie unsere Website genutzt wird.",
      purpose:
        "Google Analytics 4 erfasst, welche Seiten aufgerufen werden, wie lange Besucher bleiben, über welche Quelle (z. B. Suchmaschine oder Kampagne) sie kommen sowie Gerät, Browser und ungefähren Standort (Land/Region). Außerdem zählen wir Aktionen wie gesendete Formulare. Wir nutzen die Daten ausschließlich, um unsere Website zu verbessern – ohne Werbefunktionen, ohne Google Signals und ohne Personalisierung. Google speichert keine IP-Adressen in Analytics.",
      provider: "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland",
      contact: {
        phone: "+353 1 543 1000",
        email: "dpo-google@google.com",
        privacy: "https://policies.google.com/privacy",
      },
      cookies: [
        { name: "_ga", type: "HTTP Cookie", duration: "2 Jahre" },
        { name: "_ga_*", type: "HTTP Cookie", duration: "2 Jahre" },
      ],
      dataProcessing: {
        countries: [{ name: "Vereinigte Staaten", sub: "A" }],
        mechanisms: [{ name: "Angemessenheitsbeschluss (EU-US Data Privacy Framework)", sub: "A" }],
      },
    },
  },
};

const OHNE = { essential: true, functional: false, googleMaps: false, statistics: false, googleAnalytics: false };

export default function CookieBanner({ forceShow = false, onClose }) {
  const router = useRouter();
  const [isShown, setIsShown] = useState(false);
  const [isCompact, setIsCompact] = useState(true);

  const [showBanner, setShowBanner] = useState(forceShow);
  const [expandedSections, setExpandedSections] = useState({
    functional: false,
    statistics: false,
  });
  const [expandedServices, setExpandedServices] = useState({});
  const [consent, setConsent] = useState(OHNE);

  useEffect(() => {
    const gespeichert = getCookie("cookieConsent");
    if (!gespeichert) {
      setShowBanner(true);
      return;
    }
    // Beim erneuten Öffnen die bisherige Auswahl anzeigen
    try {
      setConsent({ ...OHNE, ...JSON.parse(gespeichert), essential: true });
    } catch {
      /* ungültig -> Standard */
    }
  }, []);

  useEffect(() => {
    setConsent((prev) => ({ ...prev, functional: prev.googleMaps, statistics: prev.googleAnalytics }));
  }, [consent.googleMaps, consent.googleAnalytics]);

  const handleAcceptAll = () => {
    const newConsent = { essential: true, functional: true, googleMaps: true, statistics: true, googleAnalytics: true };
    setConsent(newConsent);
    saveConsent(newConsent);
    router.refresh();
  };

  const handleAcceptSelected = () => {
    saveConsent(consent);
    router.refresh();
  };

  const handleRejectAll = () => {
    const newConsent = OHNE;
    setConsent(newConsent);
    saveConsent(newConsent);
    router.refresh();
  };

  const handleClose = () => {
    setShowBanner(false);
    if (onClose) onClose();
  };

  const saveConsent = (consentState) => {
    setCookie("cookieConsent", JSON.stringify(consentState), {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
    // Google Analytics sofort (ohne Neuladen) starten bzw. stoppen
    window.dispatchEvent(new CustomEvent("ov-consent", { detail: consentState }));

    // Close banner last
    setShowBanner(false);
    if (onClose) onClose();
  };

  const toggleConsent = (category) => {
    setConsent((prev) => {
      const newConsent = { ...prev };

      if (category === "functional") {
        const newValue = !prev.functional;
        newConsent.functional = newValue;
        newConsent.googleMaps = newValue;
      } else if (category === "statistics") {
        const newValue = !prev.statistics;
        newConsent.statistics = newValue;
        newConsent.googleAnalytics = newValue;
      } else {
        newConsent[category] = !prev[category];
      }

      return newConsent;
    });
  };

  const toggleCategoryDetails = (category) => {
    setExpandedSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const toggleServiceDetails = (service) => {
    setExpandedServices((prev) => ({
      ...prev,
      [service]: !prev[service],
    }));
  };

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
                Mit Ihrer Zustimmung nutzen wir Google Analytics für Besucherstatistiken und laden Karten von Google Maps.
                Ohne Zustimmung werden keine Daten an Google übertragen.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={handleRejectAll}
              className="h-11 rounded-full px-3 text-[14px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50 cursor-pointer"
            >
              Nur notwendige
            </button>
            <button
              onClick={handleAcceptAll}
              className="h-11 rounded-full bg-ov-600 px-3 text-[14px] font-semibold text-white transition-colors hover:bg-ov-700 cursor-pointer"
            >
              Alle akzeptieren
            </button>
          </div>
          <button
            ref={individuellKnopf}
            onClick={toggleCompact}
            aria-haspopup="dialog"
            className="mt-3 w-full text-center text-[13px] font-medium text-ink-500 underline-offset-2 transition-colors hover:text-ink-800 hover:underline cursor-pointer"
          >
            Individuelle Einstellungen
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-60 backdrop-blur-sm" />
      <div className={`fixed inset-0 flex items-center justify-center z-60 pointer-events-none`}>
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
                Wir verwenden Cookies und ähnliche Technologien auf unserer Website und verarbeiten personenbezogene
                Daten über Sie, wie Ihre IP-Adresse. Nur mit Ihrer Einwilligung werden Google Analytics und Inhalte von Drittanbietern (Google Maps) geladen. Die Datenverarbeitung kann
                mit Ihrer Einwilligung oder auf der Grundlage eines berechtigten Interesses erfolgen, dem Sie
                widersprechen können. Sie haben das Recht, nur in essenzielle Services einzuwilligen und Ihre
                Einwilligung zu einem späteren Zeitpunkt in der Datenschutzerklärung zu ändern oder zu widerrufen.
                Nachfolgend finden Sie eine Übersicht über alle Services, die von dieser Website genutzt werden. Sie
                können detaillierte Informationen zu jedem Service einsehen und diesen einzeln zustimmen oder von Ihrem
                Widerspruchsrecht Gebrauch machen.
              </p>
            </div>
            <div className={`flex flex-col space-y-3 w-[100%] md:w-[40%] md:ml-4 transition-all duration-200 mb-4`}>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-white bg-[#4d7a1a] rounded-lg hover:bg-[#4d7a1a] transition-colors text-sm whitespace-nowrap cursor-pointer"
              >
                Alle akzeptieren
              </button>
              <button
                onClick={handleAcceptSelected}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap cursor-pointer"
              >
                Weiter ohne Einwilligung
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap cursor-pointer"
              >
                Alle ablehnen
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-1 p-6 pb-2 text-xs">
            Google Analytics und Google Maps können personenbezogene Daten in Drittländern (u. a. USA) verarbeiten. Indem Sie in die Nutzung
            dieser Services einwilligen, erklären Sie sich auch mit der Verarbeitung Ihrer Daten in diesen unsicheren
            Drittländern gemäß Art. 49 Abs. 1 lit. a DSGVO einverstanden. Dies birgt das Risiko, dass Ihre Daten von
            Behörden zu Kontroll- und Überwachungszwecken verarbeitet werden, möglicherweise ohne die Möglichkeit eines
            Rechtsbehelfs.
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
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-medium text-gray-900">Essenziell</span>
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-500 ml-8">
                Essenzielle Dienste sind für die grundlegende Funktionalität der Website erforderlich. Sie enthalten nur
                technisch notwendige Services. Diese Dienste können nicht abgelehnt werden.
              </p>
            </div>

            {/* Funktionale Cookies */}
            <div className="space-y-4 border border-[var(--secondary)]/20 p-6">
              <div className="flex items-center justify-start gap-2 ">
                <div className="flex items-center space-x-3">
                  <label htmlFor="functional-cookies" className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="functional-cookies"
                      checked={consent.functional}
                      onChange={() => toggleConsent("functional")}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-medium text-gray-900">Funktional (1)</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-start gap-2">
                <p className="text-sm text-gray-500 ml-8">
                  Funktionale Dienste sind notwendig, um Funktionen über die grundlegende Funktionalität hinaus
                  bereitzustellen, wie schönere Schriftarten, Videowiedergabe oder interaktive Web 2.0-Funktionen.
                  Inhalte von z.B. Videoplattformen und Social-Media-Plattformen sind standardmäßig blockiert und können
                  zugestimmt werden. Wenn dem Dienst zugestimmt wird, werden diese Inhalte automatisch ohne weitere
                  manuelle Zustimmung geladen.&nbsp;&nbsp;
                  <button
                    type="button"
                    onClick={() => toggleCategoryDetails("functional")}
                    aria-expanded={expandedSections.functional}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    {expandedSections.functional ? "Details ausblenden" : "Details anzeigen"}
                  </button>
                </p>
              </div>
              {expandedSections.functional && (
                <>
                  {/* Google Maps */}
                  <div className="ml-8 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <label htmlFor="google-maps" className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            id="google-maps"
                            checked={consent.googleMaps}
                            onChange={() => toggleConsent("googleMaps")}
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-medium text-black">{cookieServices.functional.googleMaps.title}</span>
                        </label>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 ml-8">
                      {cookieServices.functional.googleMaps.description}&nbsp;&nbsp;
                      <button
                        type="button"
                        onClick={() => toggleServiceDetails("googleMaps")}
                        aria-expanded={expandedServices.googleMaps}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer bg-transparent border-0 p-0"
                      >
                        {expandedServices.googleMaps ? "Details ausblenden" : "Details anzeigen"}
                      </button>
                    </p>
                    {expandedServices.googleMaps && <CookieDetails service={cookieServices.functional.googleMaps} />}
                  </div>

                </>
              )}
            </div>

            {/* Statistik */}
            <div className="space-y-4 border border-[var(--secondary)]/20 p-6">
              <div className="flex items-center justify-start gap-2">
                <label htmlFor="statistics-cookies" className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="statistics-cookies"
                    checked={consent.statistics}
                    onChange={() => toggleConsent("statistics")}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-0 p-0"
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
                      onChange={() => toggleConsent("googleAnalytics")}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-medium text-black">{cookieServices.statistics.googleAnalytics.title}</span>
                  </label>
                  <p className="text-sm text-gray-500 ml-8">
                    {cookieServices.statistics.googleAnalytics.description}&nbsp;&nbsp;
                    <button
                      type="button"
                      onClick={() => toggleServiceDetails("googleAnalytics")}
                      aria-expanded={expandedServices.googleAnalytics}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer bg-transparent border-0 p-0"
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